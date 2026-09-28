import * as base from "./v06015-ja-visible-text.js?v=60018&base=1";
export * from "./v06015-ja-visible-text.js?v=60018&base=1";

const EXACT_JA=new Map([
 ["光線、聲音或空氣質感出現不尋常變化。","光や音、空気の質感に異常な変化が現れる。"],
 ["周圍沒有明顯的天候異常。","周囲に目立った天候異常はない。"],
 ["空氣與遠方景象變得不穩定。","空気と遠景が不安定に揺らいでいる。"],
 ["遠處輪廓逐漸變得模糊。","遠くの輪郭が徐々にぼやけていく。"],
 ["皮膚のピリピリ感と金屬的な匂い","皮膚のピリピリ感と金属のような匂い"],
 ["現時點では確認できる情報が不足しています。","現時点では確認できる情報が不足しています。"]
]);

export function localizeV06015JapaneseVisibleText(value){
 let text=base.localizeV06015JapaneseVisibleText(value);if(!text)return text;
 const trimmed=String(text).trim(),exact=EXACT_JA.get(trimmed);if(exact)text=String(text).replace(trimmed,exact);
 return String(text)
  .replaceAll("現時點","現時点")
  .replaceAll("金屬的な匂い","金属のような匂い")
  .replaceAll("金屬","金属")
  .replaceAll("霧狀","霧状")
}

export const __v06023={EXACT_JA};
