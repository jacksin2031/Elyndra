import "./v06020-runtime-ui-hotfix.js?v=60020";
import {localizeV06021JapaneseVisibleText,v06021JapaneseDebugEventDetail} from "./v06021-ja-manual-ui.js?v=60021";

let queued=false;
const EVENT_TYPES=new Set(["NPC_AUTONOMOUS_ACTION","NPC_MOVED","FACTION_ACTION","WORLD_EVENT"]);
function japanese(){return String(globalThis.ELYNDRA_LOCALE||document.querySelector("#languageSelect")?.value||"")==="ja"}
function repairText(root=document.body){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const parent=node.parentElement;if(!parent||parent.closest("script,style,textarea"))continue;const next=localizeV06021JapaneseVisibleText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next}
}
function repairDebugFaction(){
 const modal=document.querySelector("#modalContent");if(!modal||!String(modal.textContent||"").includes("ELYNDRA DEBUG"))return;
 for(const row of modal.querySelectorAll("tr")){
  const cells=[...row.querySelectorAll("td")];if(cells.length<2)continue;
  const typeCell=cells.find(cell=>EVENT_TYPES.has(String(cell.textContent||"").trim()));if(!typeCell)continue;
  const type=String(typeCell.textContent||"").trim(),detail=cells[cells.length-1];if(!detail||detail===typeCell)continue;
  const next=v06021JapaneseDebugEventDetail(type,detail.textContent);if(next!==detail.textContent)detail.textContent=next
 }
}
function repair(){if(!japanese())return;repairText(document.body);repairDebugFaction()}
function queue(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;repair()})}
new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
document.addEventListener("DOMContentLoaded",queue,{once:true});queue();
