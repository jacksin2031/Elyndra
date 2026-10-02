import {
  WORLD_STYLE_CUSTOM_CANONICAL_NAME,
  WORLD_STYLE_LIBRARY_ARTS,
  getWorldStyleArt,
  getTemplateStyleLabel,
  worldStyleArtUrl
} from "./world-style-art.js?v=61002";

const COPY = Object.freeze({
  "zh-Hant": {
    railCaption: "世界設定導覽", railArea: "世界設定導覽", railFooter: "世界細節將在生成後確定", stepperLabel: "世界生成步驟", previewArea: "設定預覽與世界風格參考",
    briefKicker: "設定預覽", artTag: "示意插畫 · 非生成結果", briefTitle: "目前風格", briefNote: "示意插畫；實際世界生成後才確定。",
    summaryTitle: "目前設定", scale: "世界大小", difficulty: "遊戲挑戰", origin: "角色來歷", shape: "地勢輪廓", danger: "危險度", magic: "魔法普及", crisis: "危機輪廓", hours: "預計時數",
    disclaimer: "摘要反映目前表單選項；地圖與世界內容尚未生成。", styleValue: "依世界風格", randomValue: "隨機決定", lockedSuffix: "已鎖定", hoursUnit: "小時",
    steps: { world: "世界設定", character: "角色起源", story: "故事偏好", advanced: "進階參數", review: "生成確認" },
    groups: { geography: "地理與疆域", civilization: "文明與社會", survival: "資源與生存", history: "歷史與危機" },
    groupNotes: { geography: "TERRAIN", civilization: "CIVILIZATION", survival: "SURVIVAL", history: "HISTORY" }
  },
  "zh-Hans": {
    railCaption: "世界设定导览", railArea: "世界设定导览", railFooter: "世界细节将在生成后确定", stepperLabel: "世界生成步骤", previewArea: "设定预览与世界风格参考",
    briefKicker: "设定预览", artTag: "示意插画 · 非生成结果", briefTitle: "当前风格", briefNote: "示意插画；实际世界生成后才确定。",
    summaryTitle: "当前设定", scale: "世界大小", difficulty: "游戏挑战", origin: "角色来历", shape: "地势轮廓", danger: "危险度", magic: "魔法普及", crisis: "危机轮廓", hours: "预计时数",
    disclaimer: "摘要反映当前表单选项；地图与世界内容尚未生成。", styleValue: "依世界风格", randomValue: "随机决定", lockedSuffix: "已锁定", hoursUnit: "小时",
    steps: { world: "世界设定", character: "角色起源", story: "故事偏好", advanced: "进阶参数", review: "生成确认" },
    groups: { geography: "地理与疆域", civilization: "文明与社会", survival: "资源与生存", history: "历史与危机" },
    groupNotes: { geography: "TERRAIN", civilization: "CIVILIZATION", survival: "SURVIVAL", history: "HISTORY" }
  },
  ja: {
    railCaption: "世界設定の案内", railArea: "世界設定の案内", railFooter: "世界の詳細は生成後に決まります", stepperLabel: "世界生成の手順", previewArea: "設定プレビューと世界風景の参考",
    briefKicker: "設定プレビュー", artTag: "イメージ画像 · 生成結果ではありません", briefTitle: "現在のスタイル", briefNote: "イメージ画像です。実際の世界は生成後に決まります。",
    summaryTitle: "現在の設定", scale: "世界の大きさ", difficulty: "ゲームの挑戦度", origin: "旅人の来歴", shape: "地形の輪郭", danger: "危険度", magic: "魔法の普及度", crisis: "危機の様相", hours: "予定時間",
    disclaimer: "現在の入力内容を表示しています。地図や世界の内容はまだ生成されていません。", styleValue: "世界のスタイルに準拠", randomValue: "ランダム", lockedSuffix: "固定済み", hoursUnit: "時間",
    steps: { world: "世界設定", character: "キャラクターの出自", story: "物語の好み", advanced: "詳細パラメーター", review: "生成内容の確認" },
    groups: { geography: "地形と領域", civilization: "文明と社会", survival: "資源と生存", history: "歴史と危機" },
    groupNotes: { geography: "TERRAIN", civilization: "CIVILIZATION", survival: "SURVIVAL", history: "HISTORY" }
  },
  en: {
    railCaption: "World settings guide", railArea: "World settings guide", railFooter: "World details are set during generation", stepperLabel: "World generation steps", previewArea: "Settings preview and world style reference",
    briefKicker: "Settings preview", artTag: "Illustrative art · Not a generated result", briefTitle: "Current style", briefNote: "Illustrative art only; the actual world takes shape during generation.",
    summaryTitle: "Current settings", scale: "World size", difficulty: "Challenge level", origin: "Character background", shape: "Terrain outline", danger: "Risk level", magic: "Magic prevalence", crisis: "Crisis profile", hours: "Planned duration",
    disclaimer: "This summary reflects the current form; the map and world content have not been generated.", styleValue: "Based on world style", randomValue: "Randomized", lockedSuffix: "locked", hoursUnit: "hours",
    steps: { world: "World Settings", character: "Character Origin", story: "Story Preferences", advanced: "Advanced Parameters", review: "Confirm Generation" },
    groups: { geography: "Geography & Reach", civilization: "Civilization & Society", survival: "Resources & Survival", history: "History & Crises" },
    groupNotes: { geography: "TERRAIN", civilization: "CIVILIZATION", survival: "SURVIVAL", history: "HISTORY" }
  }
});

const GROUPS = Object.freeze([
  { key: "geography", fields: ["worldShape", "routeDensity", "unknownRatio"] },
  { key: "civilization", fields: ["civilizationLevel", "technologyLevel", "magicLevel", "civilizationCount", "speciesCount", "languageCount", "politicalUnity", "religionInfluence", "warState", "playerCentrality"] },
  { key: "survival", fields: ["resourceAbundance", "worldDanger", "survivalIntensity"] },
  { key: "history", fields: ["historicalDepth", "worldVolatility", "ancientPowerCount", "nomadicPowerCount", "independentInstitutionCount", "lostCivilizationCount", "mysteryDensity", "crisisIntensity"] }
]);

let initialized = false;
let currentLocale = "zh-Hant";

function localeCopy(locale = currentLocale) {
  const key = Object.hasOwn(COPY, locale) ? locale : "zh-Hant";
  return COPY[key];
}

function readLocale() {
  const value = document.getElementById("languageSelect")?.value || document.documentElement.lang;
  return Object.hasOwn(COPY, value) ? value : "zh-Hant";
}

function field(id) {
  return document.getElementById(id);
}

function setTextIfChanged(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function selectedLabel(id) {
  const control = field(id);
  if (!control) return "—";
  if (control.selectedOptions?.length) return String(control.selectedOptions[0].textContent || "").trim() || "—";
  return String(control.value || "").trim() || "—";
}

function settingValue(id, copy) {
  const control = field(id);
  if (!control) return "—";
  if (field(`${id}Locked`)?.checked) return `${selectedLabel(id)} · ${copy.lockedSuffix}`;
  const mode = field(`${id}Mode`);
  if (mode?.value === "style") return copy.styleValue;
  if (mode?.value === "random") return copy.randomValue;
  return selectedLabel(id);
}

function applyChromeCopy(copy) {
  const root = field("creator");
  if (!root) return;
  root.querySelectorAll("[data-console-i18n]").forEach(node => {
    const text = copy[node.dataset.consoleI18n];
    if (text) setTextIfChanged(node, text);
  });
  root.querySelectorAll("[data-console-step-label]").forEach(node => {
    const text = copy.steps[node.dataset.consoleStepLabel];
    if (text) setTextIfChanged(node, text);
  });
  root.querySelectorAll("[data-console-group-label]").forEach(node => {
    const text = copy.groups[node.dataset.consoleGroupLabel];
    if (text) setTextIfChanged(node, text);
  });
  root.querySelectorAll("[data-console-group-note]").forEach(node => {
    const text = copy.groupNotes[node.dataset.consoleGroupNote];
    if (text) setTextIfChanged(node, text);
  });
  const stepper = root.querySelector(".creator-stepper");
  if (stepper?.getAttribute("aria-label") !== copy.stepperLabel) stepper?.setAttribute("aria-label", copy.stepperLabel);
  const rail = root.querySelector(".creator-rail");
  if (rail?.getAttribute("aria-label") !== copy.railArea) rail?.setAttribute("aria-label", copy.railArea);
  const preview = root.querySelector(".creator-brief");
  if (preview?.getAttribute("aria-label") !== copy.previewArea) preview?.setAttribute("aria-label", copy.previewArea);
}

function groupAdvancedSettings(copy) {
  const grid = document.querySelector("#creator [data-creator-step='4'] .advanced-world-grid");
  if (!grid || grid.dataset.consoleGrouped === "true") return;
  const settings = Array.from(grid.querySelectorAll(":scope > .advanced-setting"));
  if (!settings.length) return;
  const byField = new Map(GROUPS.flatMap(group => group.fields.map(id => [id, group.key])));
  const sections = new Map(GROUPS.map(group => {
    const section = document.createElement("section");
    section.className = "creator-setting-group";
    section.dataset.settingGroup = group.key;
    const header = document.createElement("header");
    const title = document.createElement("h4");
    title.dataset.consoleGroupLabel = group.key;
    title.textContent = copy.groups[group.key];
    const note = document.createElement("small");
    note.dataset.consoleGroupNote = group.key;
    note.textContent = copy.groupNotes[group.key];
    header.append(title, note);
    section.append(header);
    return [group.key, section];
  }));
  const fallback = sections.get("history");
  settings.forEach(row => {
    const primary = row.querySelector("input[id],select[id],textarea[id]")?.id?.replace(/Mode$/, "").replace(/Locked$/, "");
    const group = byField.get(primary) || "history";
    (sections.get(group) || fallback).append(row);
  });
  grid.replaceChildren(...GROUPS.map(group => sections.get(group.key)));
  grid.dataset.consoleGrouped = "true";
}

function summaryText(id, copy) {
  const value = selectedLabel(id);
  return id === "playHours" ? `${value} ${copy.hoursUnit}` : value;
}

export function syncCreatorConsolePreview(locale) {
  currentLocale = Object.hasOwn(COPY, locale) ? locale : readLocale();
  const copy = localeCopy(currentLocale);
  applyChromeCopy(copy);

  const genre = field("genre");
  const genreValue = genre?.value || "王道奇幻";
  const image = field("creatorConsoleArtwork");
  const creator = field("creator");
  if (genreValue !== WORLD_STYLE_CUSTOM_CANONICAL_NAME) {
    delete creator.dataset.styleTemplateName;
    delete creator.dataset.styleTemplateArt;
    delete creator.dataset.styleTemplateId;
  }
  const storedArt = creator.dataset.styleTemplateArt;
  const customArt = genreValue === WORLD_STYLE_CUSTOM_CANONICAL_NAME && WORLD_STYLE_LIBRARY_ARTS.includes(storedArt) ? storedArt : null;
  const asset = worldStyleArtUrl(customArt || getWorldStyleArt(genreValue));
  const artVariable = `url("${asset}")`;
  if (creator.style.getPropertyValue("--creator-style-art") !== artVariable) creator.style.setProperty("--creator-style-art", artVariable);
  if (image && image.getAttribute("src") !== asset) image.setAttribute("src", asset);
  const genreName = field("creatorConsoleGenre");
  const templateName = genreValue === WORLD_STYLE_CUSTOM_CANONICAL_NAME ? creator.dataset.styleTemplateName : "";
  const templateLabel = templateName ? getTemplateStyleLabel(templateName, currentLocale) : "";
  if (templateLabel && genre?.selectedOptions?.[0]) genre.selectedOptions[0].textContent = templateLabel;
  setTextIfChanged(genreName, templateLabel || selectedLabel("genre") || WORLD_STYLE_CUSTOM_CANONICAL_NAME);

  const values = {
    scale: summaryText("scale", copy),
    difficulty: summaryText("difficulty", copy),
    origin: `${selectedLabel("originType")} · ${selectedLabel("playerRole")}`,
    shape: settingValue("worldShape", copy),
    danger: settingValue("worldDanger", copy),
    magic: settingValue("magicLevel", copy),
    crisis: summaryText("crisisIntensity", copy),
    hours: summaryText("playHours", copy)
  };
  Object.entries(values).forEach(([key, value]) => {
    const target = document.querySelector(`[data-summary="${key}"]`);
    setTextIfChanged(target, value || "—");
  });
}

export function setCreatorConsoleStep(step) {
  const root = document.querySelector("#creator .creator-console");
  if (!root) return;
  const current = Math.max(1, Math.min(5, Number(step) || 1));
  root.dataset.creatorCurrentStep = String(current);
  root.querySelectorAll("[data-step-target]").forEach(button => {
    if (Number(button.dataset.stepTarget) === current) {
      if (button.getAttribute("aria-current") !== "step") button.setAttribute("aria-current", "step");
    } else if (button.hasAttribute("aria-current")) button.removeAttribute("aria-current");
  });
  const index = root.querySelector(".creator-brief-index");
  setTextIfChanged(index, `${String(current).padStart(2, "0")} / 05`);
  if (document.body.dataset.screen !== "creator" || !root.isConnected) return;
  const heading = root.querySelector(`[data-creator-step="${current}"] .creator-step-head h3`);
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: "start", behavior: "auto" });
}

export function initCreatorConsole() {
  if (initialized || !field("creator")) return;
  initialized = true;
  currentLocale = readLocale();
  const copy = localeCopy();
  groupAdvancedSettings(copy);
  applyChromeCopy(copy);
  setCreatorConsoleStep(1);
  syncCreatorConsolePreview(currentLocale);

  const creator = field("creator");
  const refresh = event => {
    if (event.target instanceof Element && event.target.matches("input,select,textarea")) {
      syncCreatorConsolePreview(readLocale());
    }
  };
  creator.addEventListener("input", refresh);
  creator.addEventListener("change", refresh);
  field("languageSelect")?.addEventListener("change", () => {
    currentLocale = readLocale();
    const nextCopy = localeCopy(currentLocale);
    applyChromeCopy(nextCopy);
    syncCreatorConsolePreview(currentLocale);
  });
}
