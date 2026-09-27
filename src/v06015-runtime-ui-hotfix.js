import "./v06013-runtime-ui-hotfix.js?v=60014";
import {localizeV06015JapaneseVisibleText,isV06015JapaneseSceneFallback,v06015JapaneseFallbackNarrative} from "./v06015-ja-visible-text.js?v=60018";

const JA_LEAK=/(?:這|这|們|们|為|为|與|与|從|从|讓|让|對|对|說|说|處|处|覺|觉|應|应|還|还|暫|暂|無法|无法|目前|尚未|已經|已经|場景|场景|敘述|叙述|選擇|选择|建議|建议|觀察|观察|交涉|冒險|冒险|狀況|状况|條件|条件|世界會|世界会|區域|区域|霧狀|人物關係|具判定加成|行動|事件|勢力|势力)/u;
const VISIBLE_JA_ATTRIBUTES=["placeholder","title","aria-label","data-thinking","data-syncing","data-recovery"];
const VISIBLE_JA_SELECTOR=VISIBLE_JA_ATTRIBUTES.map(attr=>`[${attr}]`).join(",");
const DEBUG_EVENT_JA=Object.freeze({NPC_AUTONOMOUS_ACTION:"NPCの自律行動（内部テレメトリ）",FACTION_ACTION:"勢力の行動（内部テレメトリ）",WORLD_EVENT:"世界イベント（内部テレメトリ）"});
let lastStableNarrative="";
let queued=false;

function locale(){return String(globalThis.ELYNDRA_LOCALE||document.querySelector("#languageSelect")?.value||"")}
function safeStableNarrative(text){const s=String(text||"").trim();return Boolean(s&&!isV06015JapaneseSceneFallback(s)&&!JA_LEAK.test(s))}
function localizeNodeText(node){const before=node.nodeValue,next=localizeV06015JapaneseVisibleText(before);if(next!==before)node.nodeValue=next}
function localizeAttributes(root){for(const el of root.querySelectorAll?.(VISIBLE_JA_SELECTOR)||[])for(const attr of VISIBLE_JA_ATTRIBUTES){const before=el.getAttribute(attr);if(!before)continue;const next=localizeV06015JapaneseVisibleText(before);if(next!==before)el.setAttribute(attr,next)}}
function repairNarrative(){
 const narrative=document.querySelector("#narrative");if(!narrative)return;
 const before=String(narrative.textContent||"").trim();
 if(isV06015JapaneseSceneFallback(before)){
  const next=lastStableNarrative||v06015JapaneseFallbackNarrative();if(next&&next!==before)narrative.textContent=next;return
 }
 const localized=localizeV06015JapaneseVisibleText(before);if(localized!==before)narrative.textContent=localized;
 if(safeStableNarrative(localized))lastStableNarrative=localized
}
function repairDebugTelemetry(){
 for(const row of document.querySelectorAll("#modalContent tr")){
  const rowText=String(row.textContent||""),eventType=Object.keys(DEBUG_EVENT_JA).find(type=>rowText.includes(type));if(!eventType)continue;
  const cells=row.querySelectorAll("td"),detail=cells[cells.length-1];if(!detail)continue;
  const before=String(detail.textContent||"").trim(),localized=localizeV06015JapaneseVisibleText(before);if(localized!==before)detail.textContent=localized;
  const current=String(detail.textContent||"").trim();if(current&&JA_LEAK.test(current))detail.textContent=DEBUG_EVENT_JA[eventType]
 }
}
function repairJapaneseVisibleUi(root=document.body){
 if(locale()!=="ja"||!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const parent=node.parentElement;if(!parent||parent.closest("script,style,textarea"))continue;localizeNodeText(node)}
 localizeAttributes(root);repairNarrative();repairDebugTelemetry();
 const region=document.querySelector("#worldMeta");if(region){const next=localizeV06015JapaneseVisibleText(region.textContent);if(next!==region.textContent)region.textContent=next}
 const weather=document.querySelector("#weather");if(weather){const next=localizeV06015JapaneseVisibleText(weather.textContent);if(next!==weather.textContent)weather.textContent=next}
}
function queue(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;repairJapaneseVisibleUi()})}

new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:VISIBLE_JA_ATTRIBUTES});
document.addEventListener("DOMContentLoaded",queue,{once:true});
document.addEventListener("click",event=>{const target=event.target;if(target instanceof Element&&target.closest("[data-suggestion-index],[data-combat-action]"))lastStableNarrative=""},true);
document.addEventListener("submit",event=>{if(event.target?.matches?.("#freeActionForm"))lastStableNarrative=""},true);
queue();