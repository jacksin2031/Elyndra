from pathlib import Path


def replace(path, old, new):
    p=Path(path); s=p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'anchor missing: {path}: {old[:120]!r}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# contextual-actions: locale-aware Engine metadata/presentation and Engine source localization.
p='src/contextual-actions.js'
replace(p,
'const RISK_LABEL=Object.freeze({LOW:"低風險",MEDIUM:"有風險",HIGH:"危險",EXTREME:"極高風險",UNKNOWN:""});\nconst APPROACH_LABEL=Object.freeze({STEADY:"穩健",SOCIAL:"社交",BOLD:"冒險",CREATIVE:"創意"});',
'''const PRESENTATION_LABELS=Object.freeze({\n "zh-Hant":{risk:{LOW:"低風險",MEDIUM:"有風險",HIGH:"危險",EXTREME:"極高風險",UNKNOWN:""},approach:{STEADY:"穩健",SOCIAL:"社交",BOLD:"冒險",CREATIVE:"創意"},skill:{"感知 / 觀察":"感知 / 觀察","交涉":"交涉","應變":"應變","敏捷 / 體能":"敏捷 / 體能","生存 / 移動":"生存 / 移動","魔法":"魔法"}},\n "zh-Hans":{risk:{LOW:"低风险",MEDIUM:"有风险",HIGH:"危险",EXTREME:"极高风险",UNKNOWN:""},approach:{STEADY:"稳健",SOCIAL:"社交",BOLD:"冒险",CREATIVE:"创意"},skill:{"感知 / 觀察":"感知 / 观察","交涉":"交涉","應變":"应变","敏捷 / 體能":"敏捷 / 体能","生存 / 移動":"生存 / 移动","魔法":"魔法"}},\n en:{risk:{LOW:"Low risk",MEDIUM:"Risky",HIGH:"Dangerous",EXTREME:"Extreme risk",UNKNOWN:""},approach:{STEADY:"Steady",SOCIAL:"Social",BOLD:"Bold",CREATIVE:"Creative"},skill:{"感知 / 觀察":"Perception / Observation","交涉":"Social","應變":"Adaptation","敏捷 / 體能":"Agility / Athletics","生存 / 移動":"Survival / Travel","魔法":"Magic"}},\n ja:{risk:{LOW:"低リスク",MEDIUM:"リスクあり",HIGH:"危険",EXTREME:"極めて危険",UNKNOWN:""},approach:{STEADY:"堅実",SOCIAL:"対話",BOLD:"大胆",CREATIVE:"創意"},skill:{"感知 / 觀察":"知覚 / 観察","交涉":"交渉","應變":"対応力","敏捷 / 體能":"敏捷 / 体力","生存 / 移動":"生存 / 移動","魔法":"魔法"}}\n});\nfunction presentationLabels(state){return PRESENTATION_LABELS[contextualLocale(state)]||PRESENTATION_LABELS["zh-Hant"]}\nfunction presentationSkill(state,value){const raw=clean(value,70);if(!raw)return "";return presentationLabels(state).skill[raw]||raw}''')

replace(p,
'''export function suggestionPresentation(state,row){\n const x=canonicalSuggestion(state,row);if(!x)return {label:"",meta:""};\n const difficulty=String(state.player?.difficulty||state.world?.creation?.blueprint?.difficulty||"normal");\n if(difficulty==="realistic")return {label:x.label,meta:""};\n if(difficulty==="hard")return {label:x.label,meta:RISK_LABEL[x.risk]||""};\n const parts=[x.skillHint,RISK_LABEL[x.risk],x.consequenceHint].filter(Boolean);\n return {label:x.label,meta:parts.join(" · "),approach:APPROACH_LABEL[x.approach]||""}\n}''',
'''export function suggestionPresentation(state,row){\n const x=canonicalSuggestion(state,row);if(!x)return {label:"",meta:""};\n const difficulty=String(state.player?.difficulty||state.world?.creation?.blueprint?.difficulty||"normal"),labels=presentationLabels(state),risk=labels.risk[x.risk]||"",skill=presentationSkill(state,x.skillHint);\n if(difficulty==="realistic")return {label:x.label,meta:"",approach:labels.approach[x.approach]||""};\n if(difficulty==="hard")return {label:x.label,meta:risk,approach:labels.approach[x.approach]||""};\n const parts=[skill,risk,x.consequenceHint].filter(Boolean);\n return {label:x.label,meta:parts.join(" · "),approach:labels.approach[x.approach]||""}\n}''')

# Stronger JA leak detector catches reported Traditional-Chinese tokens.
replace('src/locale-runtime.js',
'|世界真正|主要勢力真正|未知區域|故事傾向|文明程度|科技\\s*\\d|智慧種族約|政治統一|宗教影響|世界危險|生存強度|可自由存檔|飢餓系統|疲勞系統|負面狀態|標準語言障礙|玩家選擇|不包含|穿越到這個世界|返回修改)',
'|世界真正|主要勢力真正|未知區域|故事傾向|文明程度|科技\\s*\\d|智慧種族約|政治統一|宗教影響|世界危險|生存強度|可自由存檔|飢餓系統|疲勞系統|負面狀態|標準語言障礙|玩家選擇|不包含|穿越到這個世界|返回修改|狀態|判斷|感知|觀察|低風險|有風險|穩健|應變|利用現場|製造一個|冒險靠近|最明顯的危險源|敏捷\\s*\\/\\s*體能|荷降し場)')

# app: locale-safe creator review, robust turn lease, export feedback.
p='app.js'
replace(p,
'const ACTION_RECOVERY_TEXT=Object.freeze({',
'''const CREATOR_REVIEW_TEXT=Object.freeze({\n "zh-Hant":{hours:"小時",aiName:"由 AI 決定名稱",items:"項",none:"沒有指定",tendency:"只影響事件機會，不鎖死劇情",must:"必須",forbid:"禁止",contract:"生成後會先顯示完整世界契約"},\n "zh-Hans":{hours:"小时",aiName:"由 AI 决定名称",items:"项",none:"没有指定",tendency:"只影响事件机会，不锁死剧情",must:"必须",forbid:"禁止",contract:"生成后会先显示完整世界契约"},\n en:{hours:"hours",aiName:"Name decided by AI",items:"items",none:"None specified",tendency:"Affects event opportunities only; it does not lock the plot",must:"Required",forbid:"Forbidden",contract:"The full World Contract is shown before entering"},\n ja:{hours:"時間",aiName:"名前はAIに任せる",items:"件",none:"指定なし",tendency:"イベントの発生機会にのみ影響し、物語を固定しません",must:"必須",forbid:"禁止",contract:"生成後、世界契約の全文を確認してから入ります"}\n});\nfunction creatorReviewText(){return CREATOR_REVIEW_TEXT[activeLocale]||CREATOR_REVIEW_TEXT["zh-Hant"]}\nconst ACTION_RECOVERY_TEXT=Object.freeze({''')

replace(p,
'let activeLocale=saveLocale(loadLocale()),localeTransitionBusy=false;globalThis.ELYNDRA_LOCALE=activeLocale;',
'let activeLocale=saveLocale(loadLocale()),localeTransitionBusy=false;globalThis.ELYNDRA_LOCALE=activeLocale;let foregroundAiLease=0;')

replace(p,
'''function setAIThinking(on,label=uiText("AI 正在思考…",activeLocale)){\n if(on){preemptBackgroundAI();if(!aiBusy)aiThinkingStartedAt=Date.now();aiThinkingLabel=label;aiBusy=true;if(aiThinkingTimer)clearInterval(aiThinkingTimer);renderAIThinkingProgress();aiThinkingTimer=setInterval(renderAIThinkingProgress,1000)}\n else{aiBusy=false;if(aiThinkingTimer){clearInterval(aiThinkingTimer);aiThinkingTimer=0}aiThinkingStartedAt=0;aiThinkingLabel="";const n=$("#narrative");if(n)delete n.dataset.thinking;updateAIStatusBadge()}\n setPlayerActionControlsLocked(on||turnSyncBusy||playerActionFlight.active,on?uiText("AI 正在處理你的行動…",activeLocale):turnSyncBusy?uiText("STATE SYNC：完成後即可繼續行動",activeLocale):playerActionFlight.active?uiText("正在處理已選行動…",activeLocale):"");qsa("[data-action],.suggestion,#helperForm button,#npcChatForm button").forEach(b=>b.disabled=on);const helperInput=$("#helperInput");if(helperInput)helperInput.disabled=on\n}''',
'''function setAIThinking(on,label=uiText("AI 正在思考…",activeLocale),lease=null){\n if(on){if(lease!=null&&lease!==foregroundAiLease)return false;preemptBackgroundAI();if(!aiBusy)aiThinkingStartedAt=Date.now();aiThinkingLabel=label;aiBusy=true;if(aiThinkingTimer)clearInterval(aiThinkingTimer);renderAIThinkingProgress();aiThinkingTimer=setInterval(renderAIThinkingProgress,1000)}\n else{if(lease!=null&&lease!==foregroundAiLease)return false;aiBusy=false;if(aiThinkingTimer){clearInterval(aiThinkingTimer);aiThinkingTimer=0}aiThinkingStartedAt=0;aiThinkingLabel="";const n=$("#narrative");if(n)delete n.dataset.thinking;updateAIStatusBadge()}\n setPlayerActionControlsLocked(on||turnSyncBusy||playerActionFlight.active,on?uiText("AI 正在處理你的行動…",activeLocale):turnSyncBusy?uiText("STATE SYNC：完成後即可繼續行動",activeLocale):playerActionFlight.active?uiText("正在處理已選行動…",activeLocale):"");qsa("[data-action],.suggestion,#helperForm button,#npcChatForm button").forEach(b=>b.disabled=on);const helperInput=$("#helperInput");if(helperInput)helperInput.disabled=on;return true\n}''')

replace(p,
'''function beginPlayerActionFlight(label){\n clearTimeout(playerActionFlight.watchdog);playerActionFlight.epoch+=1;const epoch=playerActionFlight.epoch;''',
'''function beginPlayerActionFlight(label){\n clearTimeout(playerActionFlight.watchdog);playerActionFlight.epoch+=1;foregroundAiLease+=1;const epoch=playerActionFlight.epoch,aiLease=foregroundAiLease;''')
replace(p,
''' playerActionFlight.watchdog=setTimeout(()=>{if(!playerActionFlight.active||playerActionFlight.epoch!==epoch)return;playerActionFlight.timedOut=true;preemptNonblockingScene();setTurnSyncing(false);setAIThinking(false);recordDebug("PLAYER_ACTION_GLOBAL_WATCHDOG",{action:playerActionFlight.label,deadlineMs:PLAYER_ACTION_HARD_DEADLINE_MS,elapsedMs:Date.now()-playerActionFlight.startedAt});''',
''' playerActionFlight.watchdog=setTimeout(()=>{if(!playerActionFlight.active||playerActionFlight.epoch!==epoch)return;playerActionFlight.timedOut=true;foregroundAiLease+=1;preemptNonblockingScene();setTurnSyncing(false);setAIThinking(false);recordDebug("PLAYER_ACTION_GLOBAL_WATCHDOG",{action:playerActionFlight.label,deadlineMs:PLAYER_ACTION_HARD_DEADLINE_MS,elapsedMs:Date.now()-playerActionFlight.startedAt,expiredAiLease:aiLease});''')
replace(p,
'updateAIStatusBadge();return epoch\n}',
'updateAIStatusBadge();return {epoch,aiLease}\n}')
replace(p,
'const rawRequested=String(customText||action||"").trim()||"觀察目前環境",requested=options?.suggestion?localizedActionText(rawRequested,options.suggestion?.kind):rawRequested,debugTurnStarted=Date.now(),prevalidatedAssessment=options?.suggestion?trustedSuggestionAssessment(actionState,options.suggestion):null;const actionFlightEpoch=beginPlayerActionFlight(options?.suggestion?.label||requested);',
'const rawRequested=String(customText||action||"").trim()||"觀察目前環境",requested=options?.suggestion?localizedActionText(rawRequested,options.suggestion?.kind):rawRequested,debugTurnStarted=Date.now(),prevalidatedAssessment=options?.suggestion?trustedSuggestionAssessment(actionState,options.suggestion):null;const actionFlight=beginPlayerActionFlight(options?.suggestion?.label||requested),actionFlightEpoch=actionFlight.epoch,actionAiLease=actionFlight.aiLease;')
replace(p,
'setAIThinking(true,"AI 正在解析 Action Intent 並判斷必要前提…");',
'setAIThinking(true,"AI 正在解析 Action Intent 並判斷必要前提…",actionAiLease);')
replace(p,
'}finally{setAIThinking(false)}\n }\n recordDebug("ACTION_ASSESSMENT",',
'}finally{setAIThinking(false,"",actionAiLease)}\n }\n if(playerActionFlight.epoch!==actionFlightEpoch||playerActionFlight.timedOut||actionAiLease!==foregroundAiLease){recordDebug("PLAYER_ACTION_STALE_CONTINUATION_DISCARDED",{action:requested,phase:"post_assessment"});return}\n recordDebug("ACTION_ASSESSMENT",')
replace(p,
'''  const stateResult=await stateSyncResult;\n  if(!isCurrentStateSession(actionSession)){''',
'''  const stateResult=await stateSyncResult;\n  if(playerActionFlight.epoch!==actionFlightEpoch||playerActionFlight.timedOut||actionAiLease!==foregroundAiLease){recordDebug("PLAYER_ACTION_STALE_CONTINUATION_DISCARDED",{action:effective,phase:"state_sync",elapsedMs:Date.now()-debugTurnStarted});return}\n  if(!isCurrentStateSession(actionSession)){''')
replace(p,
'if(aiBusy)setAIThinking(false);if(turnSyncBusy)setTurnSyncing(false)',
'if(aiBusy)setAIThinking(false,"",actionAiLease);if(turnSyncBusy&&actionAiLease===foregroundAiLease)setTurnSyncing(false)')

replace(p,
''' const label=id=>creatorField(id)?.selectedOptions?.[0]?.textContent||creatorField(id)?.value||"—";\n el.innerHTML=`<div class="creator-review-card"><small>WORLD</small><strong>${esc(raw.worldStyle)} · ${esc(raw.worldScale)}</strong><span>${raw.targetPlayHours} 小時 · ${esc(label("difficulty"))}</span></div>\n <div class="creator-review-card"><small>PLAYER</small><strong>${esc(raw.playerName||"由 AI 決定名稱")}</strong><span>${esc(label("originType"))} · ${esc(label("playerRole"))}</span></div>\n <div class="creator-review-card"><small>DESTINY TENDENCIES</small><strong>${story.length?story.length+" 項":"沒有指定"}</strong><span>只影響事件機會，不鎖死劇情</span></div>\n <div class="creator-review-card"><small>CONSTITUTION</small><strong>必須 ${req.length} · 禁止 ${forbid.length}</strong><span>生成後會先顯示完整世界契約</span></div>`''',
''' const label=id=>creatorField(id)?.selectedOptions?.[0]?.textContent||creatorField(id)?.value||"—",t=creatorReviewText(),localizedLabel=id=>localizedStaticText(label(id),activeLocale);\n el.innerHTML=`<div class="creator-review-card"><small>WORLD</small><strong>${esc(localizedStaticText(raw.worldStyle,activeLocale))} · ${esc(localizedStaticText(raw.worldScale,activeLocale))}</strong><span>${raw.targetPlayHours} ${esc(t.hours)} · ${esc(localizedLabel("difficulty"))}</span></div>\n <div class="creator-review-card"><small>PLAYER</small><strong>${esc(raw.playerName||t.aiName)}</strong><span>${esc(localizedLabel("originType"))} · ${esc(localizedLabel("playerRole"))}</span></div>\n <div class="creator-review-card"><small>DESTINY TENDENCIES</small><strong>${story.length?story.length+" "+t.items:t.none}</strong><span>${esc(t.tendency)}</span></div>\n <div class="creator-review-card"><small>CONSTITUTION</small><strong>${esc(t.must)} ${req.length} · ${esc(t.forbid)} ${forbid.length}</strong><span>${esc(t.contract)}</span></div>`''')

replace(p,
'''function downloadDebugFile(kind="json"){\n const bundle=currentDebugBundle(),json=kind==="json",body=json?JSON.stringify(bundle,null,2):debugBundleText(bundle),blob=new Blob([body],{type:json?"application/json;charset=utf-8":"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a"),stamp=new Date().toISOString().replace(/[:.]/g,"-");\n a.href=url;a.download="Elyndra-debug-v"+APP_VERSION+"-"+stamp+(json?".json":".txt");document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);recordDebug("DEBUG_EXPORTED",{format:kind,entries:bundle.summary?.entryCount||0,tokens:bundle.summary?.tokenTotals?.total||0})\n}''',
'''function debugExportFeedback(message,ok=true){const id="debugExportFeedback";let el=$("#"+id);if(!el){el=document.createElement("p");el.id=id;el.className="muted";el.setAttribute("role",ok?"status":"alert");$("#modalContent .debug-actions")?.insertAdjacentElement("afterend",el)}if(el){el.textContent=message;el.dataset.ok=ok?"true":"false"}}\nfunction downloadDebugFile(kind="json"){\n try{const bundle=currentDebugBundle(),json=kind==="json",body=json?JSON.stringify(bundle,null,2):debugBundleText(bundle),blob=new Blob([body],{type:json?"application/json;charset=utf-8":"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a"),stamp=new Date().toISOString().replace(/[:.]/g,"-"),filename="Elyndra-debug-v"+APP_VERSION+"-"+stamp+(json?".json":".txt");\n  a.href=url;a.download=filename;a.style.display="none";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);const msg=activeLocale==="ja"?`ダウンロードを要求しました：${filename}。見つからない場合はブラウザのダウンロード一覧を確認してください。`:activeLocale==="en"?`Download requested: ${filename}. If it is not visible, check the browser downloads list.`:activeLocale==="zh-Hans"?`已请求下载：${filename}。如果未显示，请检查浏览器下载列表。`:`已要求下載：${filename}。若沒有顯示，請檢查瀏覽器下載清單。`;debugExportFeedback(msg,true);recordDebug("DEBUG_EXPORT_REQUESTED",{format:kind,filename,bytes:blob.size,entries:bundle.summary?.entryCount||0,tokens:bundle.summary?.tokenTotals?.total||0,userActivation:Boolean(navigator.userActivation?.isActive)})\n }catch(error){const msg=activeLocale==="ja"?`Debug の書き出しに失敗しました：${error?.message||error}`:`Debug export failed: ${error?.message||error}`;debugExportFeedback(msg,false);recordDebug("DEBUG_EXPORT_FAILED",{format:kind,error:error?.message||String(error)})}\n}''')

# version + cache imports.
replace('src/version.js','0.60.8','0.60.9')
for path in ['app.js','index.html','.github/workflows/pages.yml']:
    pp=Path(path); s=pp.read_text(encoding='utf-8'); s=s.replace('60008','60009').replace('0.60.8','0.60.9'); pp.write_text(s,encoding='utf-8')

# Regression test.
Path('test/v0609-ja-turn-export-regression.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeContextualSuggestion,suggestionPresentation} from "../src/contextual-actions.js?v=60009";
import {hasLocaleLeak} from "../src/locale-runtime.js?v=59010";

function state(){return {localization:{displayLocale:"ja"},player:{difficulty:"normal",location:"未知"},world:{id:"W",state:{day:1},registry:{locations:[],npcs:[]}},events:[]}}

test("ja suggestion presentation localizes Engine metadata",()=>{
 globalThis.ELYNDRA_LOCALE="ja";
 const s=state(),row=normalizeContextualSuggestion({label:"調べる",action:"調べる",kind:"OBSERVE",risk:"LOW",skillHint:"感知 / 觀察",approach:"STEADY",source:"ENGINE"},{state:s,locale:"ja"});
 const p=suggestionPresentation(s,row);assert.equal(p.meta,"知覚 / 観察 · 低リスク");assert.equal(p.approach,"堅実");assert.equal(hasLocaleLeak(p.meta,"ja"),false)
});

test("reported Traditional Chinese tokens are rejected in ja",()=>{
 for(const text of ["狀態","判斷","感知 / 觀察","低風險","穩健","應變","有風險","敏捷 / 體能","荷降し場"])assert.equal(hasLocaleLeak(text,"ja"),true,text)
});

test("creator review and debug export have locale-safe visible feedback",()=>{
 const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/イベントの発生機会にのみ影響し、物語を固定しません/);
 assert.match(app,/ダウンロードを要求しました/);
 assert.match(app,/DEBUG_EXPORT_REQUESTED/);
 assert.match(app,/PLAYER_ACTION_STALE_CONTINUATION_DISCARDED/);
 assert.match(app,/foregroundAiLease\+=1/)
});
''',encoding='utf-8')

# Add permanent gate after v0608 regression if present.
pages=Path('.github/workflows/pages.yml'); s=pages.read_text(encoding='utf-8')
needle='node --test test/v0608-runtime-recovery.test.js'
if needle in s and 'v0609-ja-turn-export-regression' not in s:
    s=s.replace(needle,needle+'\n          node --test test/v0609-ja-turn-export-regression.test.js')
pages.write_text(s,encoding='utf-8')
