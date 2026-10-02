import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { WORLD_STYLE_NAMES } from "../src/world-style-presets.js";
import {
  WORLD_STYLE_LIBRARY_ADVANCED_FIELDS,
  WORLD_STYLE_LIBRARY_ARTS,
  WORLD_STYLE_LIBRARY_SCHEMA_VERSION,
  WORLD_STYLE_LIBRARY_SETTING_FIELDS,
  WORLD_STYLE_LIBRARY_STORAGE_KEY,
  deleteWorldStyle,
  loadWorldStyleLibrary,
  saveWorldStyle,
  validateWorldStyle
} from "../src/world-style-library-store.js";
import {
  WORLD_STYLE_ART_CATALOG,
  WORLD_STYLE_CUSTOM_CANONICAL_NAME,
  WORLD_STYLE_LIBRARY_LEGACY_ARTS,
  WORLD_STYLE_LIBRARY_TEMPLATE_ARTS
} from "../src/world-style-art.js";
import { createWorldCreationDraft, resolveWorldBlueprint } from "../src/world-creation.js";

class MemoryStorage {
  values = new Map();
  failGet = null;
  failSet = null;
  getItem(key) {
    if (this.failGet) throw this.failGet;
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    if (this.failSet) throw this.failSet;
    this.values.set(key, String(value));
  }
}

function validSettings(overrides = {}) {
  const settings = {
    scale: "中型",
    customWorldStyle: "沿海城邦以古老契約共享航路。",
    prompt: "世界保留尚未解答的歷史。",
    storyPreferences: "後期可能爆發戰爭\n希望有學院篇",
    requiredElements: ["魔法學院"],
    allowedElements: ["浮空大陸"],
    forbiddenElements: ["時間旅行"]
  };
  for (const [key, spec] of Object.entries(WORLD_STYLE_LIBRARY_ADVANCED_FIELDS)) {
    settings[key] = spec.type === "number" ? spec.min : spec.values[0];
    if (spec.mode) {
      settings[key + "Mode"] = "style";
      settings[key + "Locked"] = false;
    }
  }
  return { ...settings, ...overrides };
}

function style(overrides = {}) {
  return {
    id: "wsl-test-1",
    name: "暮霧城邦",
    art: WORLD_STYLE_LIBRARY_ARTS[0],
    settings: validSettings(),
    updatedAt: "2026-09-30T00:00:00.000Z",
    ...overrides
  };
}

function deterministicOptions() {
  return {
    now: () => new Date("2026-09-30T12:00:00.000Z"),
    createId: () => "wsl-generated-1"
  };
}

test("world style library validates the allowlisted v1 snapshot", () => {
  const valid = validateWorldStyle(style());
  assert.equal(valid.ok, true);
  assert.equal(WORLD_STYLE_LIBRARY_SCHEMA_VERSION, 1);
  assert.equal(WORLD_STYLE_LIBRARY_STORAGE_KEY, "elyndra.world-style-library.v1");
  assert.equal(Object.keys(WORLD_STYLE_ART_CATALOG).length, 11);
  assert.deepEqual(Object.keys(WORLD_STYLE_ART_CATALOG), WORLD_STYLE_NAMES.filter((name) => name !== WORLD_STYLE_CUSTOM_CANONICAL_NAME));
  assert.equal(new Set(Object.values(WORLD_STYLE_ART_CATALOG)).size, 11);
  assert.equal(Object.hasOwn(WORLD_STYLE_ART_CATALOG, WORLD_STYLE_CUSTOM_CANONICAL_NAME), false);
  for (const art of WORLD_STYLE_LIBRARY_ARTS) assert.equal(existsSync(new URL(`../${art}`, import.meta.url)), true, art);
  assert.deepEqual(WORLD_STYLE_LIBRARY_ARTS.slice(0, 5), WORLD_STYLE_LIBRARY_LEGACY_ARTS);
  assert.deepEqual(WORLD_STYLE_LIBRARY_ARTS.slice(5), WORLD_STYLE_LIBRARY_TEMPLATE_ARTS);
  assert.equal(Object.keys(WORLD_STYLE_LIBRARY_ADVANCED_FIELDS).length, 24);
  assert.ok(WORLD_STYLE_LIBRARY_SETTING_FIELDS.includes("worldDangerMode"));
  assert.ok(WORLD_STYLE_LIBRARY_SETTING_FIELDS.includes("worldDangerLocked"));
  assert.deepEqual(valid.style.settings.requiredElements, ["魔法學院"]);

  const withCredential = style({ settings: { ...validSettings(), apiKey: "do-not-save" } });
  assert.equal(validateWorldStyle(withCredential).ok, false);
  assert.equal(validateWorldStyle(style({ name: "太長".repeat(31) })).error, "invalid_name");
  const invalidRange = style({ settings: validSettings({ worldDanger: 11 }) });
  assert.equal(validateWorldStyle(invalidRange).ok, false);
  const conflictingTags = style({ settings: validSettings({ allowedElements: ["魔法學院"] }) });
  assert.equal(validateWorldStyle(conflictingTags).error, "conflicting_tags");
});

test("existing v1 templates remain loadable and writable after adding six template covers", () => {
  const storage = new MemoryStorage();
  const existing = style({ id: "legacy-style", art: WORLD_STYLE_LIBRARY_LEGACY_ARTS[4] });
  storage.setItem(WORLD_STYLE_LIBRARY_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, styles: [existing] }));

  const loaded = loadWorldStyleLibrary({ storage });
  assert.equal(loaded.ok, true);
  assert.equal(loaded.styles[0].name, existing.name);
  assert.equal(loaded.styles[0].art, existing.art);

  const added = saveWorldStyle({ name: "浮島新模板", art: WORLD_STYLE_LIBRARY_TEMPLATE_ARTS[2], settings: validSettings() }, { ...deterministicOptions(), storage });
  assert.equal(added.ok, true);
  const after = loadWorldStyleLibrary({ storage });
  assert.equal(after.styles.length, 2);
  assert.equal(after.styles[0].id, existing.id);
  assert.equal(after.styles[0].art, existing.art);
  assert.equal(after.styles[1].art, WORLD_STYLE_LIBRARY_TEMPLATE_ARTS[2]);
});

test("save creates a named style and update replaces its existing record", () => {
  const storage = new MemoryStorage();
  const created = saveWorldStyle({ name: "暮霧城邦", art: WORLD_STYLE_LIBRARY_ARTS[1], settings: validSettings() }, { ...deterministicOptions(), storage });
  assert.equal(created.ok, true);
  assert.equal(created.style.id, "wsl-generated-1");
  assert.equal(created.styles.length, 1);
  assert.equal(created.style.art, WORLD_STYLE_LIBRARY_ARTS[1]);

  const updated = saveWorldStyle({ id: created.style.id, name: "暮霧城邦・修訂", art: WORLD_STYLE_LIBRARY_ARTS[2], settings: validSettings({ scale: "大型" }) }, { storage, now: () => new Date("2026-10-01T00:00:00.000Z") });
  assert.equal(updated.ok, true);
  assert.equal(updated.styles.length, 1);
  assert.equal(updated.style.name, "暮霧城邦・修訂");
  assert.equal(updated.style.settings.scale, "大型");
  assert.equal(loadWorldStyleLibrary({ storage }).styles.length, 1);
});

test("duplicate names, missing ids, and conflicting tags return useful validation errors", () => {
  const storage = new MemoryStorage();
  const first = saveWorldStyle({ name: "暮霧城邦", art: WORLD_STYLE_LIBRARY_ARTS[0], settings: validSettings() }, { ...deterministicOptions(), storage });
  assert.equal(first.ok, true);
  assert.equal(saveWorldStyle({ name: "暮霧城邦", art: WORLD_STYLE_LIBRARY_ARTS[0], settings: validSettings() }, { storage }).error, "duplicate_name");
  assert.equal(saveWorldStyle({ id: "missing", name: "不存在", art: WORLD_STYLE_LIBRARY_ARTS[0], settings: validSettings() }, { storage }).error, "style_not_found");
  assert.equal(saveWorldStyle({ name: "衝突標籤", art: WORLD_STYLE_LIBRARY_ARTS[0], settings: validSettings({ requiredElements: ["漂浮大陸"], forbiddenElements: ["漂浮大陸"] }) }, { storage }).error, "conflicting_tags");
});

test("delete removes an existing style and does not report a missing style as success", () => {
  const storage = new MemoryStorage();
  const created = saveWorldStyle({ name: "暮霧城邦", art: WORLD_STYLE_LIBRARY_ARTS[0], settings: validSettings() }, { ...deterministicOptions(), storage });
  assert.equal(created.ok, true);
  assert.equal(deleteWorldStyle("missing", { storage }).error, "style_not_found");
  const removed = deleteWorldStyle(created.style.id, { storage });
  assert.equal(removed.ok, true);
  assert.deepEqual(removed.styles, []);
  assert.deepEqual(loadWorldStyleLibrary({ storage }).styles, []);
});

test("parse and schema errors preserve corrupt bytes and block subsequent writes", () => {
  const storage = new MemoryStorage();
  const malformed = "{not-json";
  storage.setItem(WORLD_STYLE_LIBRARY_STORAGE_KEY, malformed);
  assert.equal(loadWorldStyleLibrary({ storage }).error, "corrupt_json");
  const blockedSave = saveWorldStyle({ name: "不應寫入", art: WORLD_STYLE_LIBRARY_ARTS[0], settings: validSettings() }, { storage });
  assert.equal(blockedSave.error, "corrupt_json");
  assert.equal(storage.getItem(WORLD_STYLE_LIBRARY_STORAGE_KEY), malformed);

  const invalid = JSON.stringify({ schemaVersion: 99, styles: [] });
  storage.setItem(WORLD_STYLE_LIBRARY_STORAGE_KEY, invalid);
  assert.equal(loadWorldStyleLibrary({ storage }).error, "corrupt_schema");
  assert.equal(storage.getItem(WORLD_STYLE_LIBRARY_STORAGE_KEY), invalid);
});

test("quota failures leave the previous snapshot unchanged and a later retry can recover", () => {
  const storage = new MemoryStorage();
  const created = saveWorldStyle({ name: "暮霧城邦", art: WORLD_STYLE_LIBRARY_ARTS[0], settings: validSettings() }, { ...deterministicOptions(), storage });
  assert.equal(created.ok, true);
  const before = storage.getItem(WORLD_STYLE_LIBRARY_STORAGE_KEY);
  storage.failSet = Object.assign(new Error("quota"), { name: "QuotaExceededError" });
  const failed = saveWorldStyle({ id: created.style.id, name: "暮霧城邦更新", art: WORLD_STYLE_LIBRARY_ARTS[1], settings: validSettings({ scale: "大型" }) }, { storage });
  assert.equal(failed.ok, false);
  assert.equal(failed.error, "quota_exceeded");
  assert.equal(storage.getItem(WORLD_STYLE_LIBRARY_STORAGE_KEY), before);
  assert.equal(loadWorldStyleLibrary({ storage }).styles[0].name, "暮霧城邦");

  storage.failSet = null;
  const retry = saveWorldStyle({ id: created.style.id, name: "暮霧城邦更新", art: WORLD_STYLE_LIBRARY_ARTS[1], settings: validSettings({ scale: "大型" }) }, { storage });
  assert.equal(retry.ok, true);
  assert.equal(retry.styles[0].name, "暮霧城邦更新");
});

test("storage access exceptions are reported without pretending the library is empty", () => {
  const storage = new MemoryStorage();
  storage.failGet = new Error("blocked");
  assert.equal(loadWorldStyleLibrary({ storage }).error, "storage_unavailable");
  const result = saveWorldStyle({ name: "無法保存", art: WORLD_STYLE_LIBRARY_ARTS[0], settings: validSettings() }, { storage });
  assert.equal(result.ok, false);
  assert.equal(result.error, "storage_unavailable");
});

test("named custom templates round-trip into the existing canonical World Blueprint contract", () => {
  const settings = validSettings({
    scale: "大型",
    customWorldStyle: "暮霧沿岸由城邦以古老契約治理。",
    prompt: "保留被海霧掩蓋的航路歷史。",
    storyPreferences: "後期可能爆發戰爭\n希望有學院篇",
    requiredElements: ["魔法學院", "飛行船"],
    allowedElements: ["古代遺跡"],
    forbiddenElements: ["時間旅行"],
    civilizationLevel: 9,
    civilizationLevelMode: "style",
    civilizationLevelLocked: false,
    technologyLevel: 8,
    technologyLevelMode: "random",
    technologyLevelLocked: false,
    magicLevel: 9,
    magicLevelMode: "random",
    magicLevelLocked: true,
    politicalUnity: 7,
    politicalUnityMode: "fixed",
    politicalUnityLocked: false,
    worldDanger: 6,
    worldDangerMode: "fixed",
    worldDangerLocked: true,
    warState: "WAR",
    warStateMode: "random",
    warStateLocked: true,
    worldShape: "ARCHIPELAGO",
    routeDensity: "SPARSE",
    historicalDepth: "DEEP_TIME",
    worldVolatility: "UNSTABLE",
    ancientPowerCount: 4,
    nomadicPowerCount: 3,
    independentInstitutionCount: 8,
    lostCivilizationCount: 5,
    mysteryDensity: "EXTREME",
    crisisIntensity: "HIGH",
    playerCentrality: "NONE"
  });
  const storage = new MemoryStorage();
  const saved = saveWorldStyle({ name: "暮霧城邦", art: WORLD_STYLE_LIBRARY_TEMPLATE_ARTS[0], settings }, { ...deterministicOptions(), storage });
  assert.equal(saved.ok, true);
  const restored = loadWorldStyleLibrary({ storage }).styles[0];
  assert.equal(restored.name, "暮霧城邦");
  assert.equal(restored.art, WORLD_STYLE_LIBRARY_TEMPLATE_ARTS[0]);
  assert.deepEqual(restored.settings, settings, "every saved v1 field survives the storage round trip");

  const raw = {
    worldStyle: WORLD_STYLE_CUSTOM_CANONICAL_NAME,
    worldScale: settings.scale,
    customWorldStyle: restored.settings.customWorldStyle,
    customWorldDescription: restored.settings.prompt,
    storyPreferences: restored.settings.storyPreferences,
    requiredElements: restored.settings.requiredElements.join("\n"),
    allowedElements: restored.settings.allowedElements.join("\n"),
    forbiddenElements: restored.settings.forbiddenElements.join("\n"),
    masterSeed: "world-style-library-roundtrip"
  };
  for (const key of WORLD_STYLE_LIBRARY_SETTING_FIELDS) {
    if (["scale", "customWorldStyle", "prompt", "storyPreferences", "requiredElements", "allowedElements", "forbiddenElements"].includes(key)) continue;
    raw[key] = settings[key];
  }

  const draft = createWorldCreationDraft(raw);
  for (const [key, spec] of Object.entries(WORLD_STYLE_LIBRARY_ADVANCED_FIELDS)) {
    if (spec.mode) {
      assert.equal(draft.advanced[key].value, settings[key], `${key} raw value`);
      assert.equal(draft.advanced[key].mode, settings[key + "Mode"], `${key} mode`);
      assert.equal(draft.advanced[key].locked, settings[key + "Locked"], `${key} lock`);
    } else assert.equal(draft.genesis[key], settings[key], `${key} Genesis value`);
  }
  const blueprint = resolveWorldBlueprint(draft);
  assert.equal(blueprint.style.value, WORLD_STYLE_CUSTOM_CANONICAL_NAME);
  assert.equal(blueprint.scale.value, "大型");
  assert.equal(blueprint.customStyleDescription, settings.customWorldStyle);
  assert.equal(blueprint.customWorldDescription, settings.prompt);
  assert.deepEqual(blueprint.storyPreferences, ["後期可能爆發戰爭", "希望有學院篇"]);
  assert.deepEqual(blueprint.rules.required, settings.requiredElements);
  assert.deepEqual(blueprint.rules.allowed, settings.allowedElements);
  assert.deepEqual(blueprint.rules.forbidden, settings.forbiddenElements);
  assert.equal(blueprint.advanced.civilizationLevel.value, 5);
  assert.equal(blueprint.advanced.civilizationLevel.source, "STYLE");
  assert.equal(blueprint.advanced.technologyLevel.source, "RANDOM");
  assert.equal(blueprint.advanced.magicLevel.value, 9);
  assert.equal(blueprint.advanced.magicLevel.source, "USER");
  assert.equal(blueprint.advanced.politicalUnity.value, 7);
  assert.equal(blueprint.advanced.worldDanger.value, 6);
  assert.equal(blueprint.advanced.warState.value, "WAR");
  assert.equal(blueprint.advanced.warState.source, "USER");
  assert.equal(blueprint.genesis.worldShape, "ARCHIPELAGO");
  assert.equal(blueprint.genesis.routeDensity, "SPARSE");
  assert.equal(blueprint.genesis.historicalDepth, "DEEP_TIME");
  assert.equal(blueprint.genesis.volatility, "UNSTABLE");
  assert.equal(blueprint.genesis.lostCivilizations, 5);
  for (const [field, key] of Object.entries({ancientPowerCount:"ancientPowers",nomadicPowerCount:"nomadicPowers",independentInstitutionCount:"independentInstitutions",mysteryDensity:"mysteryDensity",crisisIntensity:"crisisIntensity",playerCentrality:"playerCentrality"})) {
    assert.equal(blueprint.genesis[key], settings[field], `${field} reaches the resolved Blueprint`);
  }
});
