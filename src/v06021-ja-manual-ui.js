import {localizeV06020JapaneseVisibleText,v06020JapaneseDebugEventDetail} from "./v06020-ja-manual-ui.js?v=60020";

const CAMPAIGN_FULL="理解自己身處何地，先確保能夠行動。這不是你的強制主線；你可以介入、忽略、延後或以其他目標生活。";
const CAMPAIGN_JA="自分がどこにいるかを理解し、まず行動できる状態を確保します。これは強制的なメインストーリーではありません。介入する、無視する、後回しにする、別の目標で生きることもできます。";
const CAMPAIGN_PARTS=new Map([
 ["理解自己身處何地，先確保能夠行動。","自分がどこにいるかを理解し、まず行動できる状態を確保します。"],
 ["這不是你的強制主線；你可以介入、忽略、延後或以其他目標生活。","これは強制的なメインストーリーではありません。介入する、無視する、後回しにする、別の目標で生きることもできます。"],
 ["理解自己身處何地","自分がどこにいるかを理解し"],
 ["先確保能夠行動","まず行動できる状態を確保します"],
 ["這不是你的強制主線","これは強制的なメインストーリーではありません"],
 ["你可以介入、忽略、延後或以其他目標生活","介入する、無視する、後回しにする、別の目標で生きることもできます"]
]);
const FACTION_IDLE=/^(.+?)\s*維持現有勢力範圍[，,]\s*等待更合適的時機[。.]?$/u;

export function localizeV06021JapaneseVisibleText(value){
 let text=localizeV06020JapaneseVisibleText(value);
 if(!text)return text;
 if(text.includes(CAMPAIGN_FULL))text=text.replaceAll(CAMPAIGN_FULL,CAMPAIGN_JA);
 for(const [from,to] of CAMPAIGN_PARTS)if(text.includes(from))text=text.replaceAll(from,to);
 return text
}

export function v06021JapaneseDebugEventDetail(type,raw=""){
 const key=String(type||""),text=String(raw||"").trim();
 if(key==="FACTION_ACTION"){
  const localized=localizeV06021JapaneseVisibleText(text),m=localized.match(FACTION_IDLE)||text.match(FACTION_IDLE);
  if(m){const faction=localizeV06021JapaneseVisibleText(m[1]).trim();return `${faction} は現在の勢力範囲を維持し、より適切な機会を待っています。`}
 }
 return v06020JapaneseDebugEventDetail(key,text)
}
