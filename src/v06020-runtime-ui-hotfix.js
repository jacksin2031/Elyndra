import "./v06019-runtime-ui-hotfix.js?v=60019";
import {hasV06020JapaneseLeak,localizeV06020JapaneseVisibleText,sanitizeV06020JapaneseSceneTitle,v06020JapaneseDebugEventDetail,v06020RestNoRollState} from "./v06020-ja-manual-ui.js?v=60020";

let queued=false,latchedPresentedAction="";
const DEBUG_EXACT=new Map([
 ["持續收集本機遊玩、AI、排隊、背景處理、角色狀態變化與錯誤資訊。取得物品、知識、支線、NPC 遭遇、地點、信任、戰鬥等會以 GAME_* telemetry 記錄。匯出時會包含目前完整遊戲狀態；API Key、Authorization、Password 等敏感欄位會自動遮罩。","ローカルのプレイ、AI、キュー、バックグラウンド処理、キャラクター状態の変化、エラーを継続的に記録します。アイテム、知識、サブクエスト、NPC遭遇、地点、信頼、戦闘などは GAME_* テレメトリとして記録されます。書き出しには現在の完全なゲーム状態が含まれ、API Key、Authorization、Password などの機密項目は自動的にマスクされます。"],
 ["Token 顯示次序：Input / Output / Reasoning-Thinking / Total。API response 有 usage 時使用實際數字；沒有 usage 才標示 ESTIMATED。","Token 表示順：Input / Output / Reasoning-Thinking / Total。API response に usage がある場合は実測値を使い、ない場合のみ ESTIMATED と表示します。"],
 ["最近 AI Requests","最近の AI リクエスト"],["Gameplay State Changes","ゲーム状態の変化"],["最近遊戲事件","最近のゲームイベント"],
 ["Time","時刻"],["Task","タスク"],["Tier","Tier"],["Provider","Provider"],["Status","状態"],["Latency","レイテンシ"],["Source","ソース"],
 ["Recorded","記録時刻"],["World Time","世界時刻"],["Type","種別"],["Detail","詳細"],["Event","イベント"],
 ["TOKENS","トークン"],["USAGE SOURCE","使用量ソース"],["AI LATENCY","AIレイテンシ"],["RUNTIME","ランタイム"]
]);
function japanese(){return String(globalThis.ELYNDRA_LOCALE||document.querySelector("#languageSelect")?.value||"")==="ja"}
function normalizeText(raw){const source=String(raw??""),trimmed=source.trim(),exact=DEBUG_EXACT.get(trimmed);let text=exact?source.replace(trimmed,exact):localizeV06020JapaneseVisibleText(source);return text
 .replace(/\bCached\b/g,"キャッシュ")
 .replace(/\brequests\b/g,"リクエスト")
 .replace(/\berrors\b/g,"エラー")
 .replace(/\bDeferred\b/g,"遅延")
 .replace(/\bWorld\b/g,"世界")
 .replace(/\bREADY\b/g,"準備完了")
 .replace(/\bAI BUSY\b/g,"AI処理中")
 .replace(/\bRUN\b/g,"実行中")
 .replace(/\bIDLE\b/g,"待機")}
function repairTextNodes(root=document.body){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const parent=node.parentElement;if(!parent||parent.closest("script,style,textarea"))continue;const next=normalizeText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next}
 for(const el of root.querySelectorAll?.("[placeholder],[title],[aria-label],[data-thinking],[data-syncing],[data-recovery]")||[])for(const attr of ["placeholder","title","aria-label","data-thinking","data-syncing","data-recovery"]){const before=el.getAttribute(attr);if(!before)continue;const next=normalizeText(before);if(next!==before)el.setAttribute(attr,next)}
}
function repairPresentedAction(){
 const pending=document.querySelector(".pending-action .action-label");if(pending&&latchedPresentedAction&&String(pending.textContent||"").trim()!==latchedPresentedAction)pending.textContent=latchedPresentedAction;
 const root=document.documentElement;if(latchedPresentedAction)root.dataset.elyndraPresentedAction=latchedPresentedAction
}
function repairRestNoRoll(){
 const label=document.querySelector("#rollLabel"),result=document.querySelector("#rollResult"),d20=document.querySelector("#d20"),narrative=document.querySelector("#narrative");if(!label||!result||!narrative)return;
 const settled=v06020RestNoRollState(narrative.textContent,label.textContent);if(!settled)return;if(d20)d20.textContent=settled.d20;label.textContent=settled.label;result.textContent=settled.result
}
function repairSceneTitle(){const title=document.querySelector("#sceneTitle");if(!title)return;const before=String(title.textContent||"").trim(),next=sanitizeV06020JapaneseSceneTitle(before);if(next&&next!==before)title.textContent=next}
function repairDebug(){
 const modal=document.querySelector("#modalContent");if(!modal||!String(modal.textContent||"").includes("ELYNDRA DEBUG"))return;
 for(const row of modal.querySelectorAll("tr")){const cells=row.querySelectorAll("td");if(cells.length<2)continue;const type=String(cells[1].textContent||"").trim(),detail=cells[cells.length-1];if(!detail)continue;if(["NPC_AUTONOMOUS_ACTION","NPC_MOVED","FACTION_ACTION","WORLD_EVENT"].includes(type)){const next=v06020JapaneseDebugEventDetail(type,detail.textContent);if(next!==detail.textContent)detail.textContent=next}}
 for(const small of modal.querySelectorAll(".lore-item small")){const text=String(small.textContent||"").trim();if(/^\d+\/\d+$/.test(text))small.textContent="関連する経験 "+text}
}
function repairAiBadge(){const badge=document.querySelector("#aiBadge");if(!badge)return;const text=String(badge.textContent||"").trim(),next=normalizeText(text);if(next!==text)badge.textContent=next}
function repair(){if(!japanese())return;repairTextNodes(document.body);repairPresentedAction();repairRestNoRoll();repairSceneTitle();repairDebug();repairAiBadge()}
function queue(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;repair()})}
document.addEventListener("click",event=>{const button=event.target instanceof Element?event.target.closest("[data-suggestion-index]"):null;if(!button||!japanese())return;const shown=normalizeText(button.querySelector(".action-label")?.textContent||"").trim();if(shown&&!hasV06020JapaneseLeak(shown)){latchedPresentedAction=shown;document.documentElement.dataset.elyndraPresentedAction=shown}},true);
document.addEventListener("submit",event=>{if(!japanese()||!event.target?.matches?.("#freeActionForm"))return;const shown=normalizeText(document.querySelector("#freeAction")?.value||"").trim();if(shown&&!hasV06020JapaneseLeak(shown)){latchedPresentedAction=shown;document.documentElement.dataset.elyndraPresentedAction=shown}},true);
new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["data-thinking","data-syncing","data-recovery","placeholder","title","aria-label"]});
document.addEventListener("DOMContentLoaded",queue,{once:true});queue();
