import "./v06015-runtime-ui-hotfix.js?v=60018";
import {hasLocaleLeak} from "./locale-runtime.js?v=60010";

let queued=false,lastSafeNarrative="";
function japanese(){return String(globalThis.ELYNDRA_LOCALE||document.querySelector("#languageSelect")?.value||"")==="ja"}
function repairNarrative(){
 if(!japanese())return;const node=document.querySelector("#narrative");if(!node)return;const text=String(node.textContent||"").trim();if(!text)return;
 if(!hasLocaleLeak(text,"ja")){lastSafeNarrative=text;return}
 node.textContent=lastSafeNarrative||"Engineで確定した結果は保持されています。次の行動を選べます。"
}
function repairDebugRows(){
 if(!japanese())return;const labels={NPC_AUTONOMOUS_ACTION:"NPCの自律行動（内部テレメトリ）",FACTION_ACTION:"勢力の自律行動（内部テレメトリ）",WORLD_EVENT:"世界イベント（内部テレメトリ）"};
 for(const row of document.querySelectorAll("#modalContent tr")){const cells=row.querySelectorAll("td");if(cells.length<2)continue;const type=String(cells[1].textContent||"").trim(),detail=cells[cells.length-1];if(!labels[type]||!detail)continue;const text=String(detail.textContent||"").trim();if(text&&hasLocaleLeak(text,"ja"))detail.textContent=labels[type]}
}
function repair(){if(!japanese())return;repairNarrative();repairDebugRows()}
function queue(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;repair()})}
new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["data-thinking","data-syncing","data-recovery","placeholder","title","aria-label"]});
document.addEventListener("DOMContentLoaded",queue,{once:true});queue();
