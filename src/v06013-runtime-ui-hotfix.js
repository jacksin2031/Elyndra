const GENERIC_JA_FALLBACK="日本語表示を準備できなかったため、確定済みのゲーム結果のみ保持しています。";
const nativeSetTimeout=globalThis.setTimeout.bind(globalThis);

// Keep the global action watchdog behind the existing scene fallback.
globalThis.setTimeout=function(fn,delay,...args){
 const source=typeof fn==="function"?Function.prototype.toString.call(fn):"";
 const effective=Number(delay)===12000&&source.includes("PLAYER_ACTION_GLOBAL_WATCHDOG")?19500:delay;
 return nativeSetTimeout(fn,effective,...args)
};

const JA=new Map([
 ["KNOWN WORLD MAP","既知の世界地図"],["世界地圖","世界地図"],["CURRENT WEATHER","現在の天候"],["WEATHER","天候"],["REGION","地域"],["CURRENT","現在地"],
 ["可進入條件：已滿足","進入条件：満たしています"],["KNOWN ROUTES","既知の経路"],["KNOWN NPCS","既知の人物"],["KNOWN FACTIONS","既知の勢力"],
 ["只顯示你已經知道的地點與已確認路線；未知區域不會出現在地圖上。","既知の場所と確認済みの経路だけを表示します。未知の地域は地図には表示されません。"],
 ["尚未掌握任何可定位的地點。","位置を特定できる場所はまだ把握していません。"],["尚未確認地點之間的路線","地点間の経路はまだ確認できていません"],["尚未遇到人物","まだ人物に出会っていません"],["尚未確認勢力","勢力はまだ確認できていません"],["關係","関係"],
 ["CHARACTER STATUS","キャラクター状態"],["CHARACTER","キャラクター"],["身體狀況","身体状態"],["生命","HP"],["飽食度","満腹度"],["疲勞","疲労"],["環境暴露","環境曝露"],["傷勢","負傷"],["魔法負荷","魔法負荷"],
 ["起源記憶","起源の記憶"],["沒有可直接帶入這個世界的既有常識。","この世界へ直接持ち込める既存の常識はありません。"],["原有價值觀","元の価値観"],["成長路線","成長ルート"],["能力基礎","基礎能力"],["累積經驗","蓄積経験"],["已裝備工具","装備中の道具"],["同行者","同行者"],["較容易成長：","成長しやすい分野："],["；其他方向需要更大投入。","。他の分野にはより大きな努力が必要です。"],
 ["INVENTORY & CRAFTING","持ち物・クラフト"],["INVENTORY","持ち物"],["背包","持ち物"],["關鍵物品","重要アイテム"],["所有使用、製作、展示與交付都會先經 AI 行動合理性判定，再由 Engine 驗證。","使用・製作・提示・受け渡しは、まず行動の意味を確認し、その後Engineが最終検証します。"],
 ["TRAVEL JOURNAL","旅の手帳"],["JOURNAL","手帳"],["旅途手帳","旅の手帳"],["旅途","旅路"],["未解之謎","未解決の謎"],["線索","手掛かり"],["傳聞與徵兆","噂と兆候"],["我的筆記","自分のメモ"],["這裡只保留你能知道、聽到、親眼看見或自己推理出的內容；世界內部數值與隱藏狀態不會出現在手帳。","ここには、あなたが知ったこと・聞いたこと・実際に見たこと・自分で推理したことだけを記録します。世界内部の数値や隠し状態は表示しません。"],
 ["牽掛類型","長期目標の種類"],["你想追求甚麼","何を追い求めたいか"],["為甚麼／要怎樣才算有進展","理由／何をもって進展とするか"],["加入我的牽掛","長期目標に追加"],
 ["TRAVEL HELPER · READ ONLY","旅の助手 · 読み取り専用"],["HELPER","助手"],["旅途助手","旅の助手"],["只會整理你已經知道或目前可以直接感知的情報，不會推進時間或改變劇情。","すでに知っていること、または今直接感じ取れる情報だけを整理します。時間や物語は進めません。"],["我現在在哪裏？","今どこにいる？"],["現在天氣如何？","今の天気は？"],["四周圍有什麼？","周囲には何がある？"],["附近有誰可以對話？","近くに話せる相手はいる？"],["我目前知道什麼？","今わかっていることは？"],["下一步可以做什麼？","次に何ができる？"],["你可以先問「我現在在哪裏？」或「四周圍有什麼？」。","「今どこにいる？」や「周囲には何がある？」と聞いてみてください。"],["向旅途助手提問","旅の助手に質問"],["詢問","質問"],["YOU","あなた"],
 ["WORLD IMPACT & REPUTATION","世界への影響と評判"],["我改變過的世界","自分が変えた世界"],["CURRENT REACH","現在の影響範囲"],["HOW THE WORLD NAMES YOU","世界からの呼ばれ方"],["ACTIVE RUMORS","広まっている噂"],["LEGACY MARKS","残した痕跡"],["WORLD REACTIONS","世界の反応"],["WORLD ECHOES","世界の残響"],["WORLD HISTORY ECHOES","世界史の残響"],
 ["世界會記住你做過的事，但不同地方、人物與勢力只會知道真正傳到他們耳中的部分。","世界はあなたの行動を記憶します。ただし、各地・人物・勢力が知るのは実際に伝わった部分だけです。"],["你尚未對世界造成持久改變。繼續探索、建立關係並介入真正重要的事件。","世界に持続的な変化はまだ残していません。探索し、関係を築き、重要な出来事へ関わることで変化が生まれます。"],
 ["主要建議","主な提案"],["高風險行動","高リスク行動"],["自由行動","自由行動"],["重新產生建議行動","提案を再生成"],["我想做其他事情…","別の行動をする…"],["建議只是可行方向，不是允許行動的封閉清單；你可以自己描述任何其他動作。","提案は可能な方向性の例です。ここにない行動も自由に入力できます。"],["已選行動 · AI 處理中","選択済みの行動 · AI処理中"],["正在鎖定這次行動，完成後才會更新下一批可選行動","この行動の処理が完了すると、次の選択肢が更新されます"],["已重新產生 3 個新的可執行建議。","新しい実行可能な提案を3件生成しました。"],
 ["資產","所持資産"],["以物易物","物々交換"],["穩定","安定"],["附近","近く"],["遠距","遠隔"],["就在附近","すぐ近く"],["目前沒有可用的聯絡方式。","現在利用できる連絡手段はありません。"],["對話","会話"],["邀請同行","同行を誘う"],["接受同行","同行を受け入れる"],["請求暫時離隊","一時離脱を頼む"],["人物","人物"],["對方正等待你開口。","相手はあなたが話し始めるのを待っています。"],["送出","送信"],
 ["視野被流動介質遮蔽","流動する霧や粒子によって視界が遮られている"],["天空與環境出現不尋常異象","空と周囲に異常な現象が現れている"]
]);

const CHINESE_HINT=/(?:這|这|們|们|為|为|與|与|從|从|讓|让|對|对|說|说|處|处|覺|觉|應|应|還|还|暫|暂|無法|无法|目前|尚未|已經|已经|場景|场景|敘述|叙述|選擇|选择|建議|建议|觀察|观察|交涉|冒險|冒险|狀況|状况|條件|条件|世界會|世界会|可進入|可进入|情報確認|信息确认|資產|资产|飽食|疲勞|疲劳|傷勢|伤势|背包|旅途|線索|线索|傳聞|传闻)/u;
let lastGoodNarrative="",lastGoodSceneTitle="",lastRollSignature="",turnInitialNarrative="",turnInitialSceneTitle="",actionEpoch=0;

function locale(){return String(globalThis.ELYNDRA_LOCALE||document.querySelector("#languageSelect")?.value||"")}
function dynamicJa(text){return String(text||"")
 .replace(/\bCRITICAL SUCCESS\b/g,"大成功").replace(/\bCRITICAL FAILURE\b/g,"大失敗").replace(/\bSUCCESS\b/g,"成功").replace(/\bFAILURE\b/g,"失敗")
 .replace(/觀察/g,"観察").replace(/交涉/g,"交渉").replace(/冒險/g,"冒険").replace(/應變/g,"対応").replace(/體能/g,"体力").replace(/裝備/g,"装備").replace(/夥伴/g,"仲間").replace(/關係修正/g,"関係補正").replace(/情境/g,"状況").replace(/天氣/g,"天候").replace(/難度/g,"難易度").replace(/互動後/g,"交流後")
 .replace(/地方級影響/g,"地域級の影響").replace(/區域級影響/g,"地域圏級の影響").replace(/世界級影響/g,"世界級の影響").replace(/累積影響\s*(\d+)/g,"累積影響 $1").replace(/名聲\s*(\d+)/g,"名声 $1").replace(/惡名／戒心\s*(\d+)/g,"悪名／警戒 $1")
 .replace(/安全：危險/g,"安全：危険").replace(/供應：短缺/g,"供給：不足").replace(/供應：正常/g,"供給：通常").replace(/供應：充足/g,"供給：十分").replace(/景氣：蕭條/g,"景気：低迷").replace(/景氣：普通/g,"景気：通常").replace(/景氣：繁榮/g,"景気：繁栄").replace(/設施：破損/g,"施設：損傷").replace(/設施：可用/g,"施設：使用可能").replace(/設施：完善/g,"施設：良好").replace(/穩定：動盪/g,"安定：動揺").replace(/穩定：不穩/g,"安定：不安定").replace(/穩定：穩定/g,"安定：安定")}
function leak(text){const s=String(text||"").trim();return s===GENERIC_JA_FALLBACK||CHINESE_HINT.test(s)}
function mapText(raw){const text=String(raw??""),trimmed=text.trim();if(!trimmed)return text;const exact=JA.get(trimmed);if(exact)return text.replace(trimmed,exact);return dynamicJa(text)}
function fixTextNodes(root=document.body){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const parent=node.parentElement;if(!parent||parent.closest("script,style,textarea"))continue;const next=mapText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next}
 for(const el of root.querySelectorAll?.("[placeholder],[title],[aria-label]")||[])for(const attr of ["placeholder","title","aria-label"]){const value=el.getAttribute(attr);if(!value)continue;const next=mapText(value);if(next!==value)el.setAttribute(attr,next)}
}
function safeNarrativeFallback(){const loc=document.querySelector("#topLocation")?.textContent?.trim()||document.querySelector("#location")?.textContent?.trim()||"現在地";return `Engineで確定した結果を反映しました。${loc}での状況を保ったまま、次の行動を選べます。`}
function refreshTurnBoundary(narrative,title){
 const label=document.querySelector("#rollLabel")?.textContent?.trim()||"",result=document.querySelector("#rollResult")?.textContent?.trim()||"",signature=label+"|"+result;if(!signature||signature===lastRollSignature)return;
 lastRollSignature=signature;turnInitialNarrative=narrative?.textContent?.trim()||"";turnInitialSceneTitle=title?.textContent?.trim()||"";lastGoodNarrative="";lastGoodSceneTitle=""
}
function clearPreviousRoll(reason="action"){
 if(locale()!=="ja")return;actionEpoch+=1;const d20=document.querySelector("#d20"),label=document.querySelector("#rollLabel"),result=document.querySelector("#rollResult");if(d20)d20.textContent="—";if(label){label.textContent="今回の判定を処理中";label.dataset.actionEpoch=String(actionEpoch)}if(result){result.textContent="前の行動の判定結果は引き継ぎません。";result.dataset.actionEpoch=String(actionEpoch)}lastRollSignature="";lastGoodNarrative="";lastGoodSceneTitle="";document.documentElement.dataset.elyndraActionEpoch=String(actionEpoch);document.documentElement.dataset.elyndraActionReason=reason
}
function fixGameplaySurface(){
 const narrative=document.querySelector("#narrative"),title=document.querySelector("#sceneTitle");refreshTurnBoundary(narrative,title);
 if(narrative){const text=narrative.textContent.trim();if(text&&!leak(text)&&text!==turnInitialNarrative)lastGoodNarrative=text;else if(text&&leak(text)){const replacement=lastGoodNarrative||safeNarrativeFallback();if(text!==replacement)narrative.textContent=replacement}}
 if(title){const text=title.textContent.trim();if(text&&!leak(text)&&text!==turnInitialSceneTitle)lastGoodSceneTitle=text;else if(text&&leak(text))title.textContent=lastGoodSceneTitle||"現在の状況"}
 const weather=document.querySelector("#weather");if(weather){const next=mapText(weather.textContent);if(next!==weather.textContent)weather.textContent=next}
 document.querySelectorAll(".context-action .action-label").forEach((el,index)=>{if(el.textContent.trim()===GENERIC_JA_FALLBACK){const high=el.closest(".danger-action,.risk-actions");el.textContent=high?"危険源を遠くから確認する":index===0?"周囲の状況を詳しく観察する":index===1?"近くの手掛かりを確認する":"安全を確かめながら進む"}})
}
function helperGrounding(){
 const modal=document.querySelector("#modal:not(.hidden) #modalContent");if(!modal)return;const heading=modal.querySelector("h2")?.textContent||"";if(!/旅の助手|旅途助手/.test(heading))return;
 const rows=[...modal.querySelectorAll(".lore-item")],users=rows.filter(x=>/^(?:あなた|YOU)$/.test(x.querySelector("small")?.textContent?.trim()||"")),helpers=rows.filter(x=>/^(?:助手|HELPER)$/.test(x.querySelector("small")?.textContent?.trim()||""));
 const q=users.at(-1)?.querySelector("p")?.textContent?.trim()||"",answer=helpers.at(-1)?.querySelector("p");if(!answer||!/情報.*(?:不足|確認でき)|十分な情報|足夠情報/.test(answer.textContent))return;
 if(/天気|天候|天氣/.test(q)){const weather=document.querySelector("#weather")?.textContent?.trim();if(weather&&!/不明|未知/.test(weather))answer.textContent=`現在の天候は「${weather}」です。`}
 else if(/どこ|在哪|位置/.test(q)){const loc=document.querySelector("#topLocation")?.textContent?.trim()||document.querySelector("#location")?.textContent?.trim();if(loc&&!/不明|未知/.test(loc))answer.textContent=`現在地は「${loc}」です。`}
}
function apply(){if(locale()!=="ja")return;fixTextNodes(document.body);fixGameplaySurface();helperGrounding()}
document.addEventListener("submit",event=>{if(event.target?.matches?.("#freeActionForm"))clearPreviousRoll("freeform")},true);
document.addEventListener("click",event=>{const target=event.target;if(target instanceof Element&&target.closest("[data-suggestion-index],[data-combat-action]"))clearPreviousRoll("button")},true);
let queued=false;const queue=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply()})};new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["placeholder","title","aria-label"]});document.addEventListener("DOMContentLoaded",queue,{once:true});queue();
