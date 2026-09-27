const JA=new Map([
 ["主要建議","主な提案"],["高風險行動","高リスク行動"],["自由行動","自由行動"],["重新產生建議行動","提案を再生成"],["我想做其他事情…","別の行動をする…"],
 ["建議只是可行方向，不是允許行動的封閉清單；你可以自己描述任何其他動作。","提案は可能な方向性の例です。ここにない行動も自由に入力できます。"],
 ["已選行動 · AI 處理中","選択済みの行動 · AI処理中"],["正在鎖定這次行動，完成後才會更新下一批可選行動","この行動の処理が完了すると、次の選択肢が更新されます"],
 ["資產","所持資産"],["穩定","安定"],["以物易物","物々交換"],["目前沒有可用的聯絡方式。","現在利用できる連絡手段はありません。"],["對話","会話"],["邀請同行","同行を誘う"],["接受同行","同行を受け入れる"],["請求暫時離隊","一時離脱を頼む"],
 ["附近","近く"],["遠距","遠隔"],["就在附近","すぐ近く"],["人物","人物"],["對方正等待你開口。","相手はあなたが話し始めるのを待っています。"],["送出","送信"],
 ["地方","ローカル"],["區域","地域圏"],["勢力","勢力"],["世界","世界"],["無名","無名"],["地方知名","地域で知られている"],["區域人物","地域圏の人物"],["重要人物","重要人物"],["傳奇","伝説"],
 ["安全：","安全："],["供應：","供給："],["景氣：","景気："],["設施：","施設："],["穩定：","安定："],["危險","危険"],["不穩","不安定"],["短缺","不足"],["正常","通常"],["充足","十分"],["蕭條","低迷"],["普通","通常"],["繁榮","繁栄"],["破損","損傷"],["可用","使用可能"],["完善","良好"],["動盪","動揺"],
 ["WORLD ECHOES","世界の残響"],["WORLD HISTORY ECHOES","世界史の残響"],["TRAVELER","旅人"],["TRAVELER PROFILE","旅人プロフィール"],["WORLD","世界"],["CHARACTER","キャラクター"],["HELPER","助手"],["INVENTORY","持ち物"],["JOURNAL","手帳"],
 ["CURRENT WEATHER","現在の天候"],["WEATHER","天候"],["UNKNOWN","不明"],["SUCCESS","成功"],["FAILURE","失敗"],["CRITICAL SUCCESS","大成功"],["CRITICAL FAILURE","大失敗"]
]);
const WORDS=[
 [/累積影響/g,"累積影響"],[/名聲/g,"名声"],[/惡名／戒心/g,"悪名／警戒"],[/信任/g,"信頼"],[/尊重/g,"尊重"],[/畏懼/g,"恐れ"],[/義務/g,"義務"],
 [/觀察/g,"観察"],[/交涉/g,"交渉"],[/應變/g,"対応"],[/體能/g,"体力"],[/裝備/g,"装備"],[/夥伴/g,"仲間"],[/關係修正/g,"関係補正"],[/情境/g,"状況"],[/天氣/g,"天候"],[/難度/g,"難易度"],[/互動後/g,"交流後"]
];
let actionEpoch=0;
function locale(){return String(globalThis.ELYNDRA_LOCALE||document.querySelector("#languageSelect")?.value||"")}
function translate(raw){let text=String(raw??"");const trim=text.trim();if(!trim)return text;const exact=JA.get(trim);if(exact)return text.replace(trim,exact);for(const [re,to] of WORDS)text=text.replace(re,to);return text}
function translateTree(root=document.body){if(locale()!=="ja"||!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){if(node.parentElement?.closest("script,style,textarea"))continue;const next=translate(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next}for(const el of root.querySelectorAll?.("[placeholder],[title],[aria-label]")||[])for(const attr of ["placeholder","title","aria-label"]){const value=el.getAttribute(attr);if(!value)continue;const next=translate(value);if(next!==value)el.setAttribute(attr,next)}}
function clearPreviousRoll(reason="action"){
 if(locale()!=="ja")return;actionEpoch+=1;const d20=document.querySelector("#d20"),label=document.querySelector("#rollLabel"),result=document.querySelector("#rollResult");if(d20)d20.textContent="—";if(label){label.textContent="今回の判定を処理中";label.dataset.actionEpoch=String(actionEpoch)}if(result){result.textContent="前の行動の判定結果は引き継ぎません。";result.dataset.actionEpoch=String(actionEpoch)}document.documentElement.dataset.elyndraActionEpoch=String(actionEpoch);document.documentElement.dataset.elyndraActionReason=reason
}
function actionableClick(target){if(!(target instanceof Element))return false;const button=target.closest("button");if(!button||button.disabled)return false;return Boolean(button.matches("[data-suggestion-index],[data-combat-action],#otherActionBtn")||button.closest("#choices")?.querySelector?.("[data-suggestion-index]")===button)}
document.addEventListener("submit",event=>{if(event.target?.matches?.("#freeActionForm"))clearPreviousRoll("freeform")},true);
document.addEventListener("click",event=>{const target=event.target;if(target instanceof Element&&target.closest("[data-suggestion-index],[data-combat-action]"))clearPreviousRoll("button")},true);
let queued=false;const queue=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;translateTree(document.body)})};new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["placeholder","title","aria-label"]});document.addEventListener("DOMContentLoaded",queue,{once:true});queue();
