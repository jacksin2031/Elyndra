import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { WORLD_STYLE_LIBRARY_SCHEMA_VERSION, WORLD_STYLE_LIBRARY_SETTING_FIELDS } from "../src/world-style-library-store.js";
import { WORLD_STYLE_ART_CATALOG, WORLD_STYLE_CUSTOM_CANONICAL_NAME, WORLD_STYLE_LIBRARY_TEMPLATE_ARTS, getTemplateStyleLabel, worldStyleArtUrl } from "../src/world-style-art.js";

const CREATOR_FIELD_IDS = [
  "genre", "worldStyleLocked", "scale", "worldScaleLocked", "playHours", "difficulty", "customWorldStyle",
  "playerName", "originType", "playerRole", "originCustom", "roleCustom", "prompt", "storyPreferences",
  "ruleTagCategory", "ruleTagSearch", "requiredTagInput", "requiredElements", "allowedTagInput", "allowedElements",
  "forbiddenTagInput", "forbiddenElements", "civilizationLevel", "civilizationLevelMode", "civilizationLevelLocked",
  "technologyLevel", "technologyLevelMode", "technologyLevelLocked", "magicLevel", "magicLevelMode", "magicLevelLocked",
  "civilizationCount", "civilizationCountMode", "civilizationCountLocked", "speciesCount", "speciesCountMode", "speciesCountLocked",
  "languageCount", "languageCountMode", "languageCountLocked", "politicalUnity", "politicalUnityMode", "politicalUnityLocked",
  "religionInfluence", "religionInfluenceMode", "religionInfluenceLocked", "resourceAbundance", "resourceAbundanceMode",
  "resourceAbundanceLocked", "worldDanger", "worldDangerMode", "worldDangerLocked", "unknownRatio", "unknownRatioMode",
  "unknownRatioLocked", "survivalIntensity", "survivalIntensityMode", "survivalIntensityLocked", "warState", "warStateMode",
  "warStateLocked", "worldShape", "routeDensity", "historicalDepth", "worldVolatility", "ancientPowerCount",
  "nomadicPowerCount", "independentInstitutionCount", "lostCivilizationCount", "mysteryDensity", "crisisIntensity", "playerCentrality",
];
const GENESIS_ENUMS = {
  worldShape: ["AUTO", "CONTINENTAL", "INNER_SEA", "ARCHIPELAGO", "FRACTURED", "LAYERED", "WILD_FRONTIER"],
  routeDensity: ["SPARSE", "NORMAL", "DENSE"],
  historicalDepth: ["YOUNG", "ESTABLISHED", "ANCIENT", "DEEP_TIME"],
  worldVolatility: ["STABLE", "DYNAMIC", "UNSTABLE", "CHAOTIC"],
  mysteryDensity: ["LOW", "STANDARD", "HIGH", "EXTREME"],
  crisisIntensity: ["OFF", "LOW", "STANDARD", "HIGH", "CATACLYSMIC"],
  playerCentrality: ["NONE", "LOW", "NARRATIVE"],
};
function creatorControls(html) {
  const start = html.indexOf('<section id="creator"');
  const end = html.indexOf('<section id="game"');
  assert.ok(start >= 0 && end > start, "creator section boundaries exist");
  const section = html.slice(start, end);
  return [...section.matchAll(/<(input|textarea|select)\b([^>]*)(?:>([\s\S]*?)<\/\1>)?/g)].flatMap(([, tag, attrs, body]) => {
    const id = attrs.match(/\bid="([^"]+)"/)?.[1];
    if (!id) return [];
    const field = { id, tag, attrs, body: body ?? "" };
    if (tag === "select") field.options = [...field.body.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map(([, optionAttrs, text]) => ({
      value: optionAttrs.match(/\bvalue="([^"]*)"/)?.[1] ?? text,
      selected: /\bselected\b/.test(optionAttrs),
    }));
    return [field];
  });
}

test("creator preserves the 72-control schema and captures all Genesis fields", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const controls = creatorControls(html);
  assert.equal(controls.length, 72);
  assert.deepEqual(controls.map(({ id }) => id).sort(), [...CREATOR_FIELD_IDS].sort());

  const byId = new Map(controls.map((control) => [control.id, control]));
  assert.deepEqual(byId.get("customWorldStyle").attrs.match(/\btype="([^"]+)"/)?.[1], "hidden");
  const genre = byId.get("genre");
  const builtinNames = ["王道奇幻", "黑暗奇幻", "東方幻想", "蒸汽魔法", "低魔政治奇幻", "神話洪荒", "浮空群島", "魔導都市", "巨獸共生", "永夜寒境", "末日異世界"];
  assert.deepEqual(genre.options.map(({ value }) => value), builtinNames);
  assert.ok(genre.options.every(({ value, text }) => value === text || builtinNames.includes(value)));

  for (const [id, options] of Object.entries(GENESIS_ENUMS)) {
    assert.equal(byId.get(id).tag, "select", `${id} is selectable`);
    assert.deepEqual(byId.get(id).options.map(({ value }) => value), options, `${id} canonical values`);
    assert.ok(WORLD_STYLE_LIBRARY_SETTING_FIELDS.includes(id), `${id} persists in style schema`);
  }
  assert.equal(byId.get("historicalDepth").options.find(option => option.selected)?.value, "ANCIENT", "original pre-redesign historical depth default");
  for (const [id, min, max] of [["ancientPowerCount", 0, 4], ["nomadicPowerCount", 0, 5], ["independentInstitutionCount", 0, 12], ["lostCivilizationCount", 0, 5]]) {
    const field = byId.get(id);
    assert.equal(field.tag, "input");
    assert.match(field.attrs, /\btype="number"/);
    assert.equal(field.attrs.match(/\bmin="([^"]+)"/)?.[1], String(min));
    assert.equal(field.attrs.match(/\bmax="([^"]+)"/)?.[1], String(max));
    assert.ok(WORLD_STYLE_LIBRARY_SETTING_FIELDS.includes(id), `${id} persists in style schema`);
    const originalDefaults = {ancientPowerCount: 2, nomadicPowerCount: 2, independentInstitutionCount: 4, lostCivilizationCount: 2};
    assert.equal(Number(field.attrs.match(/\bvalue="([^"]+)"/)?.[1]), originalDefaults[id], `${id} original pre-redesign default`);
  }
  assert.match(app, /const GENESIS_ENUM_FIELDS=\["worldShape","routeDensity","historicalDepth","worldVolatility","mysteryDensity","crisisIntensity","playerCentrality"\]/);
  assert.match(app, /const GENESIS_COUNT_FIELDS=\["ancientPowerCount","nomadicPowerCount","independentInstitutionCount","lostCivilizationCount"\]/);
  assert.match(app, /for\(const id of GENESIS_ENUM_FIELDS\)out\[id\]=v\(id\)/);
  assert.match(app, /for\(const id of GENESIS_COUNT_FIELDS\)out\[id\]=n\(id\)/);
});

test("creator styles, gallery, ambience, and cache-busted game art are wired without changing v1 template URLs", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const creatorCss = readFileSync(new URL("../creator.css", import.meta.url), "utf8");
  const libraryJs = readFileSync(new URL("../src/world-style-library.js", import.meta.url), "utf8");
  const consoleJs = readFileSync(new URL("../src/creator-console.js", import.meta.url), "utf8");
  const gameCss = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /world-style-library\.css\?v=61007/);
  assert.match(html, /world-ambience\.css\?v=61007/);
  assert.match(creatorCss, /\.creator-console\{[\s\S]*?display:grid;grid-template-columns:190px minmax\(0,1fr\) 282px;/);
  assert.match(app, /initCreatorConsole\(\);initWorldStyleLibrary\(\{onApply:applyCreatorWorldStyle\}\);initWorldAmbience\(\)/);
  assert.match(app, /function clearCreatorStyleTemplate\(\)/);
  assert.match(app, /option\?\.remove\(\)/);
  assert.match(app, /function applyCreatorWorldStyle\(selection\)/);
  assert.match(app, /genre\.value=WORLD_STYLE_CUSTOM_CANONICAL_NAME/);
  assert.match(libraryJs, /getTemplateStyleLabel\(name, normalizeLocale\(loadLocale\(\)\)\)/);
  assert.match(consoleJs, /worldStyleArtUrl\(customArt \|\| getWorldStyleArt\(genreValue\)\)/);
  assert.equal(WORLD_STYLE_LIBRARY_SCHEMA_VERSION, 1);

  for (const [index, art] of WORLD_STYLE_LIBRARY_TEMPLATE_ARTS.entries()) {
    assert.equal(art.includes("?"), false, "localStorage v1 retains its existing canonical art path");
    const shown = worldStyleArtUrl(art);
    const url = new URL(shown, "https://elyndra.invalid/");
    assert.equal(url.searchParams.get("v"), "61007");
    const localAsset = new URL(`../${decodeURIComponent(url.pathname.slice(1))}`, import.meta.url);
    assert.equal(existsSync(localAsset), true, `${art} exists`);
    const digest = createHash("sha256").update(readFileSync(localAsset)).digest("hex");
    assert.ok(digest.length === 64);
    const genre = ["低魔政治奇幻", "神話洪荒", "浮空群島", "魔導都市", "巨獸共生", "永夜寒境"][index];
    assert.equal(WORLD_STYLE_ART_CATALOG[genre], art);
    assert.ok(gameCss.includes(`${art}?v=61007`), `${genre} maps to its game background`);
  }
  const digests = WORLD_STYLE_LIBRARY_TEMPLATE_ARTS.map((art) => {
    const url = new URL(worldStyleArtUrl(art), "https://elyndra.invalid/");
    const localAsset = new URL(`../${decodeURIComponent(url.pathname.slice(1))}`, import.meta.url);
    return createHash("sha256").update(readFileSync(localAsset)).digest("hex");
  });
  assert.equal(new Set(digests).size, 6, "the six restored artwork sources are distinct");
  assert.equal(getTemplateStyleLabel("玩家樣板名", "ja"), "テンプレート · 玩家樣板名");
});
