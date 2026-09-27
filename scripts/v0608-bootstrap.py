from pathlib import Path
import re


def read(path): return Path(path).read_text(encoding="utf-8")
def write(path,text): Path(path).write_text(text,encoding="utf-8")
def replace_once(text,old,new,label):
    if text.count(old)!=1: raise SystemExit(f"{label}: expected exactly one anchor, found {text.count(old)}")
    return text.replace(old,new,1)

# release metadata
pkg=read("package.json")
pkg=replace_once(pkg,'"version": "0.60.7"','"version": "0.60.8"',"package version")
write("package.json",pkg)
write("src/version.js",'export const APP_VERSION="0.60.8";')

html=read("index.html")
html,n=re.subn(r'app\.js\?v=\d+', 'app.js?v=60008', html, count=1)
if n!=1: raise SystemExit("index app token anchor failed")
write("index.html",html)

app=read("app.js")
app=replace_once(app,'import {APP_VERSION} from "./src/version.js?v=60007";','import {APP_VERSION} from "./src/version.js?v=60008";',"version import")
app=replace_once(app,'import {auditStateTransition,restoreStateSnapshot} from "./src/runtime-integrity.js?v=59013";','import {auditStateTransition,restoreStateSnapshot} from "./src/runtime-integrity.js?v=59013";\nimport {repairRuntimeState} from "./src/runtime-self-repair.js?v=60008";',"self repair import")

old='''const ACTION_LOCALE_FALLBACK=Object.freeze({
 ja:{OBSERVE:"目の前の状況を詳しく確認する",SOCIAL:"近くで確認できる相手に話しかける",TRAVEL:"確認できる安全な経路を進む",RISKY:"危険を確認しながら慎重に行動する",GENERAL:"目の前で確認できることを一つ試す"},
 en:{OBSERVE:"Inspect the situation in front of you carefully",SOCIAL:"Talk to someone you can identify nearby",TRAVEL:"Follow a known safe route",RISKY:"Act carefully while checking the risk",GENERAL:"Try one concrete action you can verify here"},
 "zh-Hans":{OBSERVE:"仔细确认眼前的情况",SOCIAL:"向附近能确认身份的人询问",TRAVEL:"沿已确认的安全路线前进",RISKY:"确认风险后谨慎行动",GENERAL:"尝试一个眼前可验证的具体行动"}
});
function localizedActionText(value,kind="GENERAL"){const source=String(value??"").trim(),translated=String(lt(source)||"").trim();if(activeLocale==="zh-Hant"||translated&&translated!==source&&!hasLocaleLeak(translated,activeLocale))return translated||source;if(translated&&!hasLocaleLeak(translated,activeLocale))return translated;const table=ACTION_LOCALE_FALLBACK[activeLocale];return table?.[String(kind||"GENERAL").toUpperCase()]||table?.GENERAL||translated||source}
'''
new='''const ACTION_LOCALE_FALLBACK=Object.freeze({
 ja:{OBSERVE:"目の前の状況を詳しく確認する",SOCIAL:"近くで確認できる相手に話しかける",TRAVEL:"確認できる安全な経路を進む",RISKY:"危険を確認しながら慎重に行動する",GENERAL:"目の前で確認できることを一つ試す"},
 en:{OBSERVE:"Inspect the situation in front of you carefully",SOCIAL:"Talk to someone you can identify nearby",TRAVEL:"Follow a known safe route",RISKY:"Act carefully while checking the risk",GENERAL:"Try one concrete action you can verify here"},
 "zh-Hans":{OBSERVE:"仔细确认眼前的情况",SOCIAL:"向附近能确认身份的人询问",TRAVEL:"沿已确认的安全路线前进",RISKY:"确认风险后谨慎行动",GENERAL:"尝试一个眼前可验证的具体行动"}
});
const JA_ACTION_LEAK=/(?:尋找|一項|可以|直接驗證|驗證|並能|指出|下一步|去向|完成了|檢查剛才|行動涉及|可見位置|確認現場|有沒有|新的具體變化|恢復操作|場景敘述|保留\\s*Engine\\s*結果)/u;
const ACTION_RECOVERY_TEXT=Object.freeze({
 sceneSlow:{"zh-Hant":"AI 場景敘述較慢；已先保留 Engine 結果並恢復操作。","zh-Hans":"AI 场景叙述较慢；已先保留 Engine 结果并恢复操作。",en:"AI scene narration is taking longer; the confirmed Engine result was kept and controls were restored.",ja:"AIの場面描写が遅いため、Engineの確定結果を保持したまま操作を再開しました。"},
 rateLimit:{"zh-Hant":"AI 服務目前限流；已保留 Engine 結果並立即恢復操作。","zh-Hans":"AI 服务目前限流；已保留 Engine 结果并立即恢复操作。",en:"The AI service is rate-limited; the confirmed Engine result was kept and controls were restored immediately.",ja:"AIサービスがレート制限中です。Engineの確定結果を保持し、すぐに操作を再開しました。"},
 watchdog:{"zh-Hant":"AI 處理時間過長；已保留 Engine 結果並解除操作鎖定。","zh-Hans":"AI 处理时间过长；已保留 Engine 结果并解除操作锁定。",en:"AI processing exceeded the gameplay deadline; the confirmed Engine result was kept and controls were unlocked.",ja:"AI処理が長引いたため、Engineの確定結果を保持し、操作ロックを解除しました。"}
});
function actionRecoveryText(kind){return ACTION_RECOVERY_TEXT[kind]?.[activeLocale]||ACTION_RECOVERY_TEXT[kind]?.["zh-Hant"]||""}
function actionLocaleLeak(value){const text=String(value??"");return hasLocaleLeak(text,activeLocale)||(activeLocale==="ja"&&JA_ACTION_LEAK.test(text))}
function localizedActionText(value,kind="GENERAL"){const source=String(value??"").trim(),translated=String(lt(source)||"").trim();if(activeLocale==="zh-Hant"||translated&&translated!==source&&!actionLocaleLeak(translated))return translated||source;if(translated&&!actionLocaleLeak(translated))return translated;const table=ACTION_LOCALE_FALLBACK[activeLocale];return table?.[String(kind||"GENERAL").toUpperCase()]||table?.GENERAL||translated||source}
'''
app=replace_once(app,old,new,"localized action guard")

app=replace_once(app,'const playerActionFlight={active:false,label:"",startedAt:0};','const PLAYER_ACTION_HARD_DEADLINE_MS=12000;\nconst playerActionFlight={active:false,label:"",startedAt:0,watchdog:0,timedOut:false,epoch:0};',"action flight state")
app=replace_once(app,'void ensureRenderedLocale("mutation",root)','if(playerActionFlight.active)recordDebug("UI_TRANSLATION_DEFERRED_FOR_ACTION",{reason:"mutation",targetLocale:activeLocale});else void ensureRenderedLocale("mutation",root)',"mutation locale defer")
app=replace_once(app,'async function ensureGameplayLocale(reason="runtime"){\n if(!gameState)return true;','async function ensureGameplayLocale(reason="runtime"){\n if(!gameState)return true;if(playerActionFlight.active){recordDebug("LOCALE_REPAIR_DEFERRED_FOR_ACTION",{reason,targetLocale:activeLocale});return true}',"gameplay locale defer")
app=replace_once(app,'async function ensureRenderedLocale(reason="render",root=document){\n applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);if(activeLocale==="zh-Hant")return true;','async function ensureRenderedLocale(reason="render",root=document){\n applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);if(activeLocale==="zh-Hant")return true;if(playerActionFlight.active){recordDebug("UI_TRANSLATION_DEFERRED_FOR_ACTION",{reason,targetLocale:activeLocale});return true}',"render locale defer")

old='''function beginPlayerActionFlight(label){
 playerActionFlight.active=true;playerActionFlight.label=localizedStaticText(lt(String(label||"").trim().slice(0,240)),activeLocale)||uiText("處理目前行動",activeLocale);playerActionFlight.startedAt=Date.now();
 recordDebug("PLAYER_ACTION_UI_LOCKED",{action:playerActionFlight.label});renderSuggestions();setPlayerActionControlsLocked(true,"正在處理已選行動…");updateAIStatusBadge()
}
function finishPlayerActionFlight(action="",reason="completed"){
 if(!playerActionFlight.active)return;
 const label=playerActionFlight.label,elapsedMs=Date.now()-playerActionFlight.startedAt;playerActionFlight.active=false;playerActionFlight.label="";playerActionFlight.startedAt=0;
 recordDebug("PLAYER_ACTION_UI_UNLOCKED",{action:String(action||label).slice(0,240),reason,elapsedMs});
 setPlayerActionControlsLocked(aiBusy||turnSyncBusy,aiBusy?"AI 正在處理你的行動…":turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"");updateAIStatusBadge()
}
'''
new='''function beginPlayerActionFlight(label){
 clearTimeout(playerActionFlight.watchdog);playerActionFlight.epoch+=1;const epoch=playerActionFlight.epoch;
 playerActionFlight.active=true;playerActionFlight.timedOut=false;playerActionFlight.label=localizedStaticText(lt(String(label||"").trim().slice(0,240)),activeLocale)||uiText("處理目前行動",activeLocale);playerActionFlight.startedAt=Date.now();
 playerActionFlight.watchdog=setTimeout(()=>{if(!playerActionFlight.active||playerActionFlight.epoch!==epoch)return;playerActionFlight.timedOut=true;preemptNonblockingScene();setTurnSyncing(false);setAIThinking(false);recordDebug("PLAYER_ACTION_GLOBAL_WATCHDOG",{action:playerActionFlight.label,deadlineMs:PLAYER_ACTION_HARD_DEADLINE_MS,elapsedMs:Date.now()-playerActionFlight.startedAt});showActionRecoveryNotice(actionRecoveryText("watchdog"));const state=gameState,sessionToken=captureStateSession();finishPlayerActionFlight(playerActionFlight.label,"global_watchdog");if(state)void persist(state,sessionToken).catch(error=>recordDebug("PLAYER_ACTION_WATCHDOG_PERSIST_FAILED",{error:error?.message||String(error)})).finally(()=>{if(isCurrentStateSession(sessionToken))void refresh({skipLocale:true,skipRenderedLocale:true})})},PLAYER_ACTION_HARD_DEADLINE_MS);
 recordDebug("PLAYER_ACTION_UI_LOCKED",{action:playerActionFlight.label,deadlineMs:PLAYER_ACTION_HARD_DEADLINE_MS});renderSuggestions();setPlayerActionControlsLocked(true,"正在處理已選行動…");updateAIStatusBadge();return epoch
}
function finishPlayerActionFlight(action="",reason="completed"){
 if(!playerActionFlight.active)return;clearTimeout(playerActionFlight.watchdog);playerActionFlight.watchdog=0;
 const label=playerActionFlight.label,elapsedMs=Date.now()-playerActionFlight.startedAt;playerActionFlight.active=false;playerActionFlight.label="";playerActionFlight.startedAt=0;
 recordDebug("PLAYER_ACTION_UI_UNLOCKED",{action:String(action||label).slice(0,240),reason,elapsedMs});
 setPlayerActionControlsLocked(aiBusy||turnSyncBusy,aiBusy?"AI 正在處理你的行動…":turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"");updateAIStatusBadge()
}
'''
app=replace_once(app,old,new,"global action watchdog")

app=replace_once(app,'repairPlayerLocation(s);initializeWeather(s);','repairPlayerLocation(s);const selfRepair=repairRuntimeState(s,{phase:"MIGRATE"});if(selfRepair.changed||selfRepair.rolledBack||selfRepair.issues.length)recordDebug("RUNTIME_SELF_REPAIR_APPLIED",{changed:selfRepair.changed,rolledBack:selfRepair.rolledBack,repaired:selfRepair.repaired,issues:selfRepair.issues.map(x=>x.code)});initializeWeather(s);',"migrate self repair")
app=replace_once(app,'prevalidatedAssessment=options?.suggestion?trustedSuggestionAssessment(actionState,options.suggestion):null;beginPlayerActionFlight(options?.suggestion?.label||requested);recordDebug','prevalidatedAssessment=options?.suggestion?trustedSuggestionAssessment(actionState,options.suggestion):null;const actionFlightEpoch=beginPlayerActionFlight(options?.suggestion?.label||requested);recordDebug',"capture action epoch")
app=replace_once(app,'try{assessment=await assessPlayerAction(actionState,requested);if(!isCurrentStateSession(actionSession))return}\n  catch(e){','try{assessment=await assessPlayerAction(actionState,requested);if(!isCurrentStateSession(actionSession)||playerActionFlight.epoch!==actionFlightEpoch||playerActionFlight.timedOut)return}\n  catch(e){if(playerActionFlight.epoch!==actionFlightEpoch||playerActionFlight.timedOut){recordDebug("PLAYER_ACTION_LATE_ASSESSMENT_DISCARDED",{action:requested,error:e?.message||String(e)});return}',"late assessment discard")
app=replace_once(app,' await refresh();\n\n if(!aiStatus.aiConfigured){',' await refresh();\n if(playerActionFlight.epoch!==actionFlightEpoch||playerActionFlight.timedOut){recordDebug("PLAYER_ACTION_WATCHDOG_RETURN",{action:effective,elapsedMs:Date.now()-debugTurnStarted});await persist(actionState,actionSession);return}\n\n if(!aiStatus.aiConfigured){',"post-refresh watchdog return")
app=app.replace('showActionRecoveryNotice(uiText("AI 場景敘述較慢；已先保留 Engine 結果並恢復操作。",activeLocale))','showActionRecoveryNotice(actionRecoveryText("sceneSlow"))')
app=app.replace('showActionRecoveryNotice(uiText("AI 服務目前限流；已保留 Engine 結果並立即恢復操作。",activeLocale))','showActionRecoveryNotice(actionRecoveryText("rateLimit"))')
write("app.js",app)

# release assertions
v=read("test/version-ui.test.js")
v=v.replace("// v0.60.7 release contract","// v0.60.8 release contract").replace('pkg.version,"0.60.7"','pkg.version,"0.60.8"').replace('app\\.js\\?v=60007','app\\.js\\?v=60008').replace('version\\.js\\?v=60007','version\\.js\\?v=60008')
write("test/version-ui.test.js",v)

print("v0.60.8 bootstrap patch applied")
