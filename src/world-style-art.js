export const WORLD_STYLE_CUSTOM_CANONICAL_NAME = "自訂世界";

export const WORLD_STYLE_LIBRARY_LEGACY_ARTS = Object.freeze([
  "assets/ui/backgrounds/royal-fantasy-2560x1440.avif",
  "assets/ui/backgrounds/dark-fantasy-2560x1440.avif",
  "assets/ui/backgrounds/eastern-fantasy-2560x1440.avif",
  "assets/ui/backgrounds/steam-magic-2560x1440.avif",
  "assets/ui/backgrounds/apocalypse-2560x1440.avif"
]);

export const WORLD_STYLE_LIBRARY_TEMPLATE_ARTS = Object.freeze([
  "assets/ui/backgrounds/low-magic-politics-v1.webp",
  "assets/ui/backgrounds/mythic-primordial-v1.webp",
  "assets/ui/backgrounds/floating-islands-v1.webp",
  "assets/ui/backgrounds/arcane-metropolis-v1.webp",
  "assets/ui/backgrounds/beast-symbiosis-v1.webp",
  "assets/ui/backgrounds/endless-winter-v1.webp"
]);

export const WORLD_STYLE_LIBRARY_ARTS = Object.freeze([
  ...WORLD_STYLE_LIBRARY_LEGACY_ARTS,
  ...WORLD_STYLE_LIBRARY_TEMPLATE_ARTS
]);

export const WORLD_STYLE_ART_CATALOG = Object.freeze({
  "王道奇幻": WORLD_STYLE_LIBRARY_LEGACY_ARTS[0],
  "黑暗奇幻": WORLD_STYLE_LIBRARY_LEGACY_ARTS[1],
  "東方幻想": WORLD_STYLE_LIBRARY_LEGACY_ARTS[2],
  "蒸汽魔法": WORLD_STYLE_LIBRARY_LEGACY_ARTS[3],
  "低魔政治奇幻": WORLD_STYLE_LIBRARY_TEMPLATE_ARTS[0],
  "神話洪荒": WORLD_STYLE_LIBRARY_TEMPLATE_ARTS[1],
  "浮空群島": WORLD_STYLE_LIBRARY_TEMPLATE_ARTS[2],
  "魔導都市": WORLD_STYLE_LIBRARY_TEMPLATE_ARTS[3],
  "巨獸共生": WORLD_STYLE_LIBRARY_TEMPLATE_ARTS[4],
  "永夜寒境": WORLD_STYLE_LIBRARY_TEMPLATE_ARTS[5],
  "末日異世界": WORLD_STYLE_LIBRARY_LEGACY_ARTS[4]
});

export const WORLD_STYLE_ART_CACHE_VERSION = "61008";

export function worldStyleArtUrl(asset) {
  const value = String(asset ?? "").trim();
  if (!value) return "";
  return `${value}${value.includes("?") ? "&" : "?"}v=${WORLD_STYLE_ART_CACHE_VERSION}`;
}

export function getWorldStyleArt(genre) {
  return WORLD_STYLE_ART_CATALOG[genre] || WORLD_STYLE_ART_CATALOG["王道奇幻"];
}

// A localized marker keeps literal player names distinct from translatable UI keys.
export function getTemplateStyleLabel(name, locale = "zh-Hant") {
  const labels = {"zh-Hant": "樣板", "zh-Hans": "样板", en: "Template", ja: "テンプレート"};
  return `${labels[locale] || labels["zh-Hant"]} · ${name}`;
}
