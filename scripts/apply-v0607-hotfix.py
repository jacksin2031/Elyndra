from pathlib import Path
import json

ROOT=Path('.')

def replace_once(path, old, new):
    p=ROOT/path
    text=p.read_text(encoding='utf-8')
    if new in text:
        return False
    if old not in text:
        raise SystemExit(f'ANCHOR_NOT_FOUND:{path}:{old[:100]!r}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')
    return True

pkg=ROOT/'package.json'
data=json.loads(pkg.read_text(encoding='utf-8'))
if data.get('version')!='0.60.7':
    data['version']='0.60.7'
    pkg.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
replace_once('src/version.js','export const APP_VERSION="0.60.6";','export const APP_VERSION="0.60.7";')
replace_once('index.html','app.js?v=60006','app.js?v=60007')

replace_once('app.js','import {APP_VERSION} from "./src/version.js?v=60006";','import {APP_VERSION} from "./src/version.js?v=60007";')
replace_once('app.js','import {SUPPORTED_LOCALES,loadLocale,saveLocale,normalizeLocale,uiText,uiFormat,applyDocumentLocale,ensureWorldLocale,translatedText,missingVisibleTranslations,applyTranslationBundle,applyWorldLocaleToDocument,applySessionTranslationBundle,applySessionLocaleToDocument,documentTranslationCandidates} from "./src/locale-runtime.js?v=59010";','import {SUPPORTED_LOCALES,loadLocale,saveLocale,normalizeLocale,uiText,uiFormat,applyDocumentLocale,ensureWorldLocale,translatedText,sessionTranslatedText,hasLocaleLeak,missingVisibleTranslations,applyTranslationBundle,applyWorldLocaleToDocument,applySessionTranslationBundle,applySessionLocaleToDocument,documentTranslationCandidates} from "./src/locale-runtime.js?v=59010";')
replace_once('app.js','let activeLocale=saveLocale(loadLocale()),localeTransitionBusy=false;globalThis.ELYNDRA_LOCALE=activeLocale;const lt=value=>localizedStaticText(gameState?translatedText(gameState,value,activeLocale):String(value??""),activeLocale);','let activeLocale=saveLocale(loadLocale()),localeTransitionBusy=false;globalThis.ELYNDRA_LOCALE=activeLocale;const lt=value=>{const raw=gameState?translatedText(gameState,value,activeLocale):String(value??"");return localizedStaticText(sessionTranslatedText(raw,activeLocale),activeLocale)};\nconst ACTION_LOCALE_FALLBACK=Object.freeze({\n ja:{OBSERVE:"目の前の状況を詳しく確認する",SOCIAL:"近くで確認できる相手に話しかける",TRAVEL:"確認できる安全な経路を進む",RISKY:"危険を確認しながら慎重に行動する",GENERAL:"目の前で確認できることを一つ試す"},\n en:{OBSERVE:"Inspect the situation in front of you carefully",SOCIAL:"Talk to someone you can identify nearby",TRAVEL:"Follow a known safe route",RISKY:"Act carefully while checking the risk",GENERAL:"Try one concrete action you can verify here"},\n "zh-Hans":{OBSERVE:"仔细确认眼前的情况",SOCIAL:"向附近能确认身份的人询问",TRAVEL:"沿已确认的安全路线前进",RISKY:"确认风险后谨慎行动",GENERAL:"尝试一个眼前可验证的具体行动"}\n});\nfunction localizedActionText(value,kind="GENERAL"){const source=String(value??"").trim(),translated=String(lt(source)||"").trim();if(activeLocale==="zh-Hant"||translated&&translated!==source&&!hasLocaleLeak(translated,activeLocale))return translated||source;if(translated&&!hasLocaleLeak(translated,activeLocale))return translated;const table=ACTION_LOCALE_FALLBACK[activeLocale];return table?.[String(kind||"GENERAL").toUpperCase()]||table?.GENERAL||translated||source}')
replace_once('app.js','async function refresh({skipLocale=false}={}){','async function refresh({skipLocale=false,skipRenderedLocale=false}={}){')
replace_once('app.js','applyDocumentLocale(activeLocale);applyWorldLocaleToDocument(gameState,activeLocale);await ensureRenderedLocale("refresh",document.querySelector(".screen.active")||document.body);return true}','applyDocumentLocale(activeLocale);applyWorldLocaleToDocument(gameState,activeLocale);if(!skipRenderedLocale)await ensureRenderedLocale("refresh",document.querySelector(".screen.active")||document.body);return true}')
replace_once('app.js','const card=x=>{const p=suggestionPresentation(gameState,x),classes=["context-action",x.progression?"progression-action":"",["HIGH","EXTREME"].includes(x.risk)?"danger-action":""].filter(Boolean).join(" ");return `<button type="button" class="${classes}" data-suggestion-index="${set.all.indexOf(x)}"><span class="action-label">${esc(localizedStaticText(lt(p.label),activeLocale))}</span>${p.meta?`<small class="action-meta">${esc(localizedStaticText(lt(p.meta),activeLocale))}</small>`:""}${p.approach?`<span class="action-approach">${esc(localizedStaticText(lt(p.approach),activeLocale))}</span>`:""}</button>`};','const card=x=>{const p=suggestionPresentation(gameState,x),classes=["context-action",x.progression?"progression-action":"",["HIGH","EXTREME"].includes(x.risk)?"danger-action":""].filter(Boolean).join(" "),label=localizedActionText(p.label,x.kind);return `<button type="button" class="${classes}" data-suggestion-index="${set.all.indexOf(x)}"><span class="action-label">${esc(label)}</span>${p.meta?`<small class="action-meta">${esc(lt(p.meta))}</small>`:""}${p.approach?`<span class="action-approach">${esc(lt(p.approach))}</span>`:""}</button>`};')
replace_once('app.js','box.querySelectorAll("[data-suggestion-index]").forEach(b=>b.onclick=()=>{const x=set.all[Number(b.dataset.suggestionIndex)];if(x)runAction("free",x.action,{suggestion:x})});','box.querySelectorAll("[data-suggestion-index]").forEach(b=>b.onclick=()=>{const x=set.all[Number(b.dataset.suggestionIndex)];if(x)runAction("free",localizedActionText(x.action,x.kind),{suggestion:x})});')
replace_once('app.js','const requested=String(customText||action||"").trim()||"觀察目前環境",debugTurnStarted=Date.now(),prevalidatedAssessment=options?.suggestion?trustedSuggestionAssessment(actionState,options.suggestion):null;','const rawRequested=String(customText||action||"").trim()||"觀察目前環境",requested=options?.suggestion?localizedActionText(rawRequested,options.suggestion?.kind):rawRequested,debugTurnStarted=Date.now(),prevalidatedAssessment=options?.suggestion?trustedSuggestionAssessment(actionState,options.suggestion):null;')
replace_once('app.js','let foregroundSceneCtrl=null,pendingPlayerActionResult=null,pendingSceneTransport="",pendingSceneRevision=baseRevision,pendingEvidenceOperations=[];','let foregroundSceneCtrl=null,pendingPlayerActionResult=null,pendingSceneTransport="",pendingSceneRevision=baseRevision,pendingEvidenceOperations=[],rateLimitFastFallback=false;')
replace_once('app.js','  if(stateResult.status!=="fulfilled"){\n   recordDebug("STATE_SYNC_AI_FAILED",{action:effective,mode:syncPlan.mode,error:stateResult.reason?.message||String(stateResult.reason),elapsedMs:Date.now()-debugTurnStarted});\n   if(syncPlan.mode==="DEEP")throw stateResult.reason;','  if(stateResult.status!=="fulfilled"){\n   const stateSyncError=stateResult.reason?.message||String(stateResult.reason);recordDebug("STATE_SYNC_AI_FAILED",{action:effective,mode:syncPlan.mode,error:stateSyncError,elapsedMs:Date.now()-debugTurnStarted});\n   if(/AI_HTTP_429|AI_RATE_LIMIT_BACKPRESSURE/i.test(stateSyncError)&&foregroundSceneCtrl&&!foregroundSceneCtrl.signal.aborted){rateLimitFastFallback=true;foregroundSceneCtrl.abort();recordDebug("TURN_RATE_LIMIT_FAST_FALLBACK",{action:effective,mode:syncPlan.mode,elapsedMs:Date.now()-debugTurnStarted});showActionRecoveryNotice(uiText("AI 服務目前限流；已保留 Engine 結果並立即恢復操作。",activeLocale))}\n   if(syncPlan.mode==="DEEP"&&!rateLimitFastFallback)throw stateResult.reason;')
replace_once('app.js',' }else{finishPlayerActionFlight(effective,"scene_unavailable");await refresh()}',' }else{finishPlayerActionFlight(effective,rateLimitFastFallback?"rate_limit_fallback":"scene_unavailable");await refresh()}')
replace_once('app.js',' if(pendingPlayerActionResult&&foregroundSceneCtrl&&!foregroundSceneCtrl.signal.aborted){\n  const ctrl=foregroundSceneCtrl,expectedRevision=pendingSceneRevision,transport=pendingSceneTransport;\n  void pendingPlayerActionResult.then(async playerResult=>{',' if(pendingPlayerActionResult&&foregroundSceneCtrl&&!foregroundSceneCtrl.signal.aborted){\n  const ctrl=foregroundSceneCtrl,expectedRevision=pendingSceneRevision,transport=pendingSceneTransport,sceneDeadlineMs=Math.max(1200,18000-(Date.now()-debugTurnStarted));\n  const sceneDeadline=setTimeout(()=>{if(!ctrl.signal.aborted&&isCurrentStateSession(actionSession)){ctrl.abort();recordDebug("PLAYER_ACTION_SCENE_DEADLINE_FALLBACK",{action:effective,elapsedMs:Date.now()-debugTurnStarted,deadlineMs:18000});finishPlayerActionFlight(effective,"scene_deadline_fallback");showActionRecoveryNotice(uiText("AI 場景敘述較慢；已先保留 Engine 結果並恢復操作。",activeLocale));void refresh()}},sceneDeadlineMs);\n  void pendingPlayerActionResult.then(async playerResult=>{')
replace_once('app.js','  }).finally(()=>{if(nonblockingScene.controller===ctrl){nonblockingScene.controller=null;nonblockingScene.worldId=null;nonblockingScene.revision=null}finishPlayerActionFlight(effective,ctrl.signal.aborted?"scene_aborted":"scene_settled");updateAIStatusBadge();if(actionState)void refresh()})','  }).finally(()=>{clearTimeout(sceneDeadline);if(nonblockingScene.controller===ctrl){nonblockingScene.controller=null;nonblockingScene.worldId=null;nonblockingScene.revision=null}finishPlayerActionFlight(effective,ctrl.signal.aborted?"scene_aborted":"scene_settled");updateAIStatusBadge();if(actionState)void refresh()})')
replace_once('app.js','await persist();worldProgress(98,"正在準備冒險介面","載入第一個場景");const refreshed=await refresh();if(!refreshed)throw new Error(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));const gameLocaleReady=activeLocale==="zh-Hant"||await ensureRenderedLocale("post_creation_game",$("#game"));if(!gameLocaleReady)throw new Error(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));worldProgress(100,"準備完成","正在穿越…");await new Promise(r=>setTimeout(r,250));show("game");scheduleWorldQualityCritic("post_creation",1000);scheduleHistoryDeepening("post_creation",1500)','await persist();worldProgress(98,"正在準備冒險介面","載入第一個場景");const refreshed=await refresh({skipRenderedLocale:true});if(!refreshed)throw new Error(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));worldProgress(100,"準備完成","正在穿越…");show("game");recordDebug("INITIAL_SCENE_PRESENTED",{locale:activeLocale,nonBlockingLocaleRepair:activeLocale!=="zh-Hant"});if(activeLocale!=="zh-Hant")void ensureRenderedLocale("post_creation_game",$("#game"));scheduleWorldQualityCritic("post_creation",1000);scheduleHistoryDeepening("post_creation",1500)')

for path in ['test/version-0551-release.test.js','test/version-ui.test.js']:
    p=ROOT/path
    text=p.read_text(encoding='utf-8').replace('0.60.6','0.60.7').replace('0\\.60\\.6','0\\.60\\.7').replace('app\\.js\\?v=60006','app\\.js\\?v=60007').replace('version\\.js\\?v=60006','version\\.js\\?v=60007')
    if path.endswith('version-0551-release.test.js'):
        text=text.replace('"60006"].includes(x)','"60006","60007"].includes(x)')
    p.write_text(text,encoding='utf-8')

(ROOT/'test/v0607-i18n-turn-recovery.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("v0.60.7 suggestion execution uses the same localized action players see",async()=>{
 const app=await read("../app.js");
 assert.match(app,/sessionTranslatedText/);
 assert.match(app,/function localizedActionText/);
 assert.match(app,/runAction\("free",localizedActionText\(x\.action,x\.kind\),\{suggestion:x\}\)/);
 assert.match(app,/requested=options\?\.suggestion\?localizedActionText\(rawRequested,options\.suggestion\?\.kind\):rawRequested/);
});

test("v0.60.7 first game reveal no longer blocks on a second DOM translation call",async()=>{
 const app=await read("../app.js");
 assert.match(app,/refresh\(\{skipRenderedLocale:true\}\)/);
 assert.match(app,/INITIAL_SCENE_PRESENTED/);
 assert.match(app,/void ensureRenderedLocale\("post_creation_game",\$\("#game"\)\)/);
 assert.doesNotMatch(app,/activeLocale==="zh-Hant"\|\|await ensureRenderedLocale\("post_creation_game"/);
});

test("v0.60.7 rate limit and slow scene paths release player control deterministically",async()=>{
 const app=await read("../app.js");
 assert.match(app,/TURN_RATE_LIMIT_FAST_FALLBACK/);
 assert.match(app,/foregroundSceneCtrl\.abort\(\)/);
 assert.match(app,/PLAYER_ACTION_SCENE_DEADLINE_FALLBACK/);
 assert.match(app,/deadlineMs:18000/);
 assert.match(app,/rate_limit_fallback/);
});
''',encoding='utf-8')
print('v0.60.7 hotfix applied')
