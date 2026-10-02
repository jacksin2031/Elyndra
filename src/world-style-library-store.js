import { WORLD_STYLE_LIBRARY_ARTS } from "./world-style-art.js?v=61002";

export { WORLD_STYLE_LIBRARY_ARTS } from "./world-style-art.js?v=61002";

export const WORLD_STYLE_LIBRARY_STORAGE_KEY = "elyndra.world-style-library.v1";
export const WORLD_STYLE_LIBRARY_SCHEMA_VERSION = 1;
export const WORLD_STYLE_LIBRARY_MAX_STYLES = 60;

const MODES = Object.freeze(["style", "fixed", "random"]);
const MODE_FIELDS = Object.freeze([
  "civilizationLevel", "technologyLevel", "magicLevel", "civilizationCount",
  "speciesCount", "languageCount", "politicalUnity", "religionInfluence",
  "resourceAbundance", "worldDanger", "unknownRatio", "survivalIntensity", "warState"
]);

export const WORLD_STYLE_LIBRARY_ADVANCED_FIELDS = Object.freeze({
  civilizationLevel: Object.freeze({ type: "number", min: 1, max: 10, mode: true }),
  technologyLevel: Object.freeze({ type: "number", min: 1, max: 10, mode: true }),
  magicLevel: Object.freeze({ type: "number", min: 1, max: 10, mode: true }),
  civilizationCount: Object.freeze({ type: "number", min: 1, max: 12, mode: true }),
  speciesCount: Object.freeze({ type: "number", min: 1, max: 12, mode: true }),
  languageCount: Object.freeze({ type: "number", min: 1, max: 16, mode: true }),
  politicalUnity: Object.freeze({ type: "number", min: 1, max: 10, mode: true }),
  religionInfluence: Object.freeze({ type: "number", min: 1, max: 10, mode: true }),
  resourceAbundance: Object.freeze({ type: "number", min: 1, max: 10, mode: true }),
  worldDanger: Object.freeze({ type: "number", min: 1, max: 10, mode: true }),
  unknownRatio: Object.freeze({ type: "number", min: 10, max: 95, mode: true }),
  survivalIntensity: Object.freeze({ type: "number", min: 1, max: 10, mode: true }),
  warState: Object.freeze({ type: "enum", values: Object.freeze(["PEACE", "TENSION", "WAR"]), mode: true }),
  worldShape: Object.freeze({ type: "enum", values: Object.freeze(["AUTO", "CONTINENTAL", "INNER_SEA", "ARCHIPELAGO", "FRACTURED", "LAYERED", "WILD_FRONTIER"]) }),
  routeDensity: Object.freeze({ type: "enum", values: Object.freeze(["SPARSE", "NORMAL", "DENSE"]) }),
  historicalDepth: Object.freeze({ type: "enum", values: Object.freeze(["YOUNG", "ESTABLISHED", "ANCIENT", "DEEP_TIME"]) }),
  worldVolatility: Object.freeze({ type: "enum", values: Object.freeze(["STABLE", "DYNAMIC", "UNSTABLE", "CHAOTIC"]) }),
  ancientPowerCount: Object.freeze({ type: "number", min: 0, max: 4 }),
  nomadicPowerCount: Object.freeze({ type: "number", min: 0, max: 5 }),
  independentInstitutionCount: Object.freeze({ type: "number", min: 0, max: 12 }),
  lostCivilizationCount: Object.freeze({ type: "number", min: 0, max: 5 }),
  mysteryDensity: Object.freeze({ type: "enum", values: Object.freeze(["LOW", "STANDARD", "HIGH", "EXTREME"]) }),
  crisisIntensity: Object.freeze({ type: "enum", values: Object.freeze(["OFF", "LOW", "STANDARD", "HIGH", "CATACLYSMIC"]) }),
  playerCentrality: Object.freeze({ type: "enum", values: Object.freeze(["NONE", "LOW", "NARRATIVE"]) })
});

export const WORLD_STYLE_LIBRARY_SETTING_FIELDS = Object.freeze([
  "scale", "customWorldStyle", "prompt", "storyPreferences",
  "requiredElements", "allowedElements", "forbiddenElements",
  ...Object.keys(WORLD_STYLE_LIBRARY_ADVANCED_FIELDS),
  ...MODE_FIELDS.flatMap((field) => [field + "Mode", field + "Locked"])
]);

const TEXT_LIMITS = Object.freeze({ customWorldStyle: 600, prompt: 1200, storyPreferences: 900 });
const TAG_FIELDS = Object.freeze(["requiredElements", "allowedElements", "forbiddenElements"]);
const SCALE_VALUES = Object.freeze(["小型", "中型", "大型"]);
const STYLE_KEYS = Object.freeze(["id", "name", "art", "settings", "updatedAt"]);
const DOCUMENT_KEYS = Object.freeze(["schemaVersion", "styles"]);
const SETTINGS_KEYS = new Set(WORLD_STYLE_LIBRARY_SETTING_FIELDS);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, allowed) {
  return isRecord(value) && Object.keys(value).every((key) => allowed.includes(key));
}

function storageFor(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function readDocument(storage) {
  const target = storageFor(storage);
  if (!target || typeof target.getItem !== "function") return { ok: false, error: "storage_unavailable" };
  let raw;
  try {
    raw = target.getItem(WORLD_STYLE_LIBRARY_STORAGE_KEY);
  } catch {
    return { ok: false, error: "storage_unavailable" };
  }
  if (raw == null || raw === "") return { ok: true, styles: [], target };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "corrupt_json" };
  }
  if (!isRecord(parsed) || !hasOnlyKeys(parsed, DOCUMENT_KEYS) || parsed.schemaVersion !== WORLD_STYLE_LIBRARY_SCHEMA_VERSION || !Array.isArray(parsed.styles) || parsed.styles.length > WORLD_STYLE_LIBRARY_MAX_STYLES) {
    return { ok: false, error: "corrupt_schema" };
  }
  const styles = [];
  const ids = new Set();
  const names = new Set();
  for (const style of parsed.styles) {
    const checked = validateWorldStyle(style);
    if (!checked.ok || ids.has(checked.style.id) || names.has(checked.style.name.toLocaleLowerCase())) return { ok: false, error: "corrupt_schema" };
    ids.add(checked.style.id);
    names.add(checked.style.name.toLocaleLowerCase());
    styles.push(checked.style);
  }
  return { ok: true, styles, target };
}

function cleanString(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
}

function normalizeTags(value) {
  if (!Array.isArray(value) || value.length > 20) return null;
  const result = [];
  const seen = new Set();
  for (const raw of value) {
    if (typeof raw !== "string") return null;
    const tag = raw.trim().replace(/\s+/gu, " ");
    if (!tag || tag.length > 60 || /[\u0000-\u001f\u007f]/u.test(tag)) return null;
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) return null;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

function validateSettings(settings) {
  if (!hasOnlyKeys(settings, WORLD_STYLE_LIBRARY_SETTING_FIELDS)) return null;
  if (!SCALE_VALUES.includes(settings.scale)) return null;
  for (const [key, max] of Object.entries(TEXT_LIMITS)) if (!cleanString(settings[key], max)) return null;
  for (const key of TAG_FIELDS) if (!normalizeTags(settings[key])) return null;
  for (const [key, spec] of Object.entries(WORLD_STYLE_LIBRARY_ADVANCED_FIELDS)) {
    const value = settings[key];
    if (spec.type === "number") {
      if (!Number.isInteger(value) || value < spec.min || value > spec.max) return null;
    } else if (!spec.values.includes(value)) return null;
    if (spec.mode) {
      if (!MODES.includes(settings[key + "Mode"]) || typeof settings[key + "Locked"] !== "boolean") return null;
    }
  }
  if (Object.keys(settings).length !== WORLD_STYLE_LIBRARY_SETTING_FIELDS.length) return null;
  const normalized = Object.fromEntries(WORLD_STYLE_LIBRARY_SETTING_FIELDS.map((key) => [key, TAG_FIELDS.includes(key) ? normalizeTags(settings[key]) : settings[key]]));
  const ownedTags = new Set();
  for (const key of TAG_FIELDS) {
    for (const tag of normalized[key]) {
      const tagKey = tag.toLocaleLowerCase();
      if (ownedTags.has(tagKey)) return null;
      ownedTags.add(tagKey);
    }
  }
  return normalized;
}

export function validateWorldStyle(style) {
  if (!isRecord(style) || !hasOnlyKeys(style, STYLE_KEYS) || Object.keys(style).length !== STYLE_KEYS.length) return { ok: false, error: "invalid_style" };
  if (typeof style.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/u.test(style.id)) return { ok: false, error: "invalid_id" };
  if (typeof style.name !== "string" || style.name.length > 60 || !style.name.trim() || style.name.trim().length > 60 || /[\u0000-\u001f\u007f]/u.test(style.name)) return { ok: false, error: "invalid_name" };
  if (!WORLD_STYLE_LIBRARY_ARTS.includes(style.art)) return { ok: false, error: "invalid_art" };
  if (typeof style.updatedAt !== "string" || !Number.isFinite(Date.parse(style.updatedAt))) return { ok: false, error: "invalid_timestamp" };
  const settings = validateSettings(style.settings);
  if (!settings) {
    const buckets = TAG_FIELDS.map((key) => Array.isArray(style.settings?.[key]) ? style.settings[key].map((tag) => typeof tag === "string" ? tag.trim().toLocaleLowerCase() : "") : []);
    const tags = new Set();
    for (const bucket of buckets) for (const tag of bucket) {
      if (tag && tags.has(tag)) return { ok: false, error: "conflicting_tags" };
      if (tag) tags.add(tag);
    }
    return { ok: false, error: "invalid_settings" };
  }
  return { ok: true, style: { id: style.id, name: style.name.trim(), art: style.art, settings, updatedAt: style.updatedAt } };
}

function newId() {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return "wsl-" + globalThis.crypto.randomUUID();
  } catch {
    // Fall through to a local non-secret identifier.
  }
  return "wsl-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
}

function writeDocument(target, styles) {
  if (typeof target.setItem !== "function") return { ok: false, error: "storage_unavailable" };
  const payload = JSON.stringify({ schemaVersion: WORLD_STYLE_LIBRARY_SCHEMA_VERSION, styles });
  try {
    target.setItem(WORLD_STYLE_LIBRARY_STORAGE_KEY, payload);
    return { ok: true, styles };
  } catch (error) {
    const quota = error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
    return { ok: false, error: quota ? "quota_exceeded" : "storage_write_failed" };
  }
}

export function loadWorldStyleLibrary({ storage } = {}) {
  const result = readDocument(storage);
  return result.ok ? { ok: true, styles: result.styles.map((style) => ({ ...style, settings: { ...style.settings, requiredElements: [...style.settings.requiredElements], allowedElements: [...style.settings.allowedElements], forbiddenElements: [...style.settings.forbiddenElements] } })) } : { ok: false, styles: [], error: result.error };
}

export function saveWorldStyle(input, { storage, now = () => new Date(), createId = newId } = {}) {
  const current = readDocument(storage);
  if (!current.ok) return { ok: false, styles: [], error: current.error };
  if (current.styles.length >= WORLD_STYLE_LIBRARY_MAX_STYLES && !input?.id) return { ok: false, styles: current.styles, error: "library_full" };
  const id = input?.id || createId();
  const existingIndex = current.styles.findIndex((style) => style.id === id);
  if (input?.id && existingIndex < 0) return { ok: false, styles: current.styles, error: "style_not_found" };
  let timestamp;
  try {
    timestamp = now().toISOString();
  } catch {
    return { ok: false, styles: current.styles, error: "invalid_timestamp" };
  }
  const candidate = { id, name: input?.name, art: input?.art, settings: input?.settings, updatedAt: timestamp };
  const checked = validateWorldStyle(candidate);
  if (!checked.ok) return { ok: false, styles: current.styles, error: checked.error };
  const duplicate = current.styles.some((style, index) => index !== existingIndex && style.name.toLocaleLowerCase() === checked.style.name.toLocaleLowerCase());
  if (duplicate) return { ok: false, styles: current.styles, error: "duplicate_name" };
  const next = [...current.styles];
  if (existingIndex >= 0) next[existingIndex] = checked.style;
  else next.push(checked.style);
  const written = writeDocument(current.target, next);
  return written.ok ? { ok: true, style: checked.style, styles: next } : { ok: false, styles: current.styles, error: written.error };
}

export function deleteWorldStyle(id, { storage } = {}) {
  const current = readDocument(storage);
  if (!current.ok) return { ok: false, styles: [], error: current.error };
  const index = current.styles.findIndex((style) => style.id === id);
  if (index < 0) return { ok: false, styles: current.styles, error: "style_not_found" };
  const next = current.styles.filter((style) => style.id !== id);
  const written = writeDocument(current.target, next);
  return written.ok ? { ok: true, styles: next } : { ok: false, styles: current.styles, error: written.error };
}
