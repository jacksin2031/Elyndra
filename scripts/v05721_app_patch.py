from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding="utf-8")
def write(p,s): (ROOT/p).write_text(s,encoding="utf-8")

p=Path("app.js"); s=read(p)
# New provenance + agent export bridges.
needle='import {buildAutotestDownloadPayload,createAutotestDownloadLease,verifyAutotestDownloadedFile,ensureAutotestDownloadBridge} from "./src/autotest-download.js?v=57021";'
add=needle+'\nimport {validateSceneProvenance,filterSuggestionProvenance} from "./src/scene-provenance.js?v=57021";\nimport {installAutotestCodexBridge} from "./src/autotest-codex-bridge.js?v=57021";'
if needle not in s: raise SystemExit("download import not found")
s=s.replace(needle,add,1)

old='const autotestRuntimeExpansion={running:false,controller:null,reason:"",turn:0,cooldownUntil:0};'
new='const autotestRuntimeExpansion={running:false,controller:null,reason:"",turn:0,cooldownUntil:0,lastStartedTurn:0,lastCompletedTurn:0};'
if old not in s: raise SystemExit("runtime expansion state not found")
s=s.replace(old,new,1)

# Install a machine-readable bridge over the retained snapshot. It never invokes a picker/download/clipboard.
needle='const developerAutotestDownload={kind:"",payload:null,lease:null,request:null,verification:null};'
add=needle+'\nconst autotestCodexBridge=installAutotestCodexBridge(async kind=>{if(!developerAutotest.exportSnapshot){const snapshot=await loadLastAutotestExportSnapshot();if(snapshot)developerAutotest.exportSnapshot=snapshot}return developerAutotestArtifact(kind)});'
if needle not in s: raise SystemExit("download state not found")
s=s.replace(needle,add,1)

# Visible elapsed progress and recovery notice.
start=s.index('function setAIThinking(on,label="AI 正在思考…")')
end=s.index('\nconst esc=',start)
block='''let aiThinkingTimer=0,aiThinkingStartedAt=0,aiThinkingLabel="";\nfunction renderAIThinkingProgress(){if(!aiBusy)return;const elapsed=Math.max(0,Math.floor((Date.now()-aiThinkingStartedAt)/1000)),hint=elapsed>=20?" · AI 回應較慢，必要時會自動切換 Engine 備援":elapsed>=8?" · 仍在等待 AI 回應":"",message=`${aiThinkingLabel} · ${elapsed}s${hint}`;updateAIStatusBadge(message);const n=$("#narrative");if(n)n.dataset.thinking=message}\nfunction clearActionRecoveryNotice(){const n=$("#narrative");if(n)delete n.dataset.recovery}\nfunction showActionRecoveryNotice(message){const text=String(message||"").trim();if(!text)return;const n=$("#narrative");if(n)n.dataset.recovery=text;const badge=$("#aiBadge");if(badge)badge.title=text}\nfunction setAIThinking(on,label="AI 正在思考…"){\n if(on){preemptBackgroundAI();if(!aiBusy)aiThinkingStartedAt=Date.now();aiThinkingLabel=label;aiBusy=true;if(aiThinkingTimer)clearInterval(aiThinkingTimer);renderAIThinkingProgress();aiThinkingTimer=setInterval(renderAIThinkingProgress,1000)}\n else{aiBusy=false;if(aiThinkingTimer){clearInterval(aiThinkingTimer);aiThinkingTimer=0}aiThinkingStartedAt=0;aiThinkingLabel="";const n=$("#narrative");if(n)delete n.dataset.thinking;updateAIStatusBadge()}\n setPlayerActionControlsLocked(on||turnSyncBusy||playerActionFlight.active,on?"AI 正在處理你的行動…":turnSyncBusy?"STATE SYNC：完成後即可繼續行動":playerActionFlight.active?"正在處理已選行動…":"");qsa("[data-action],.suggestion,#helperForm button,#npcChatForm button").forEach(b=>b.disabled=on);const helperInput=$("#helperInput");if(helperInput)helperInput.disabled=on\n}\n'''
s=s[:start]+block+s[end:]

# Clear old recovery banner on a fresh action.
needle='if(!gameState)return;const actionState=gameState,actionSession=captureStateSession();markForegroundActivity();preemptBackgroundAI();suggestionRefresh.exclude=[];suggestionRefresh.message="";suggestionRefresh.error=false;'
if needle not in s: raise SystemExit("runAction prelude not found")
s=s.replace(needle,needle+'clearActionRecoveryNotice();',1)

# Surface Engine fallback instead of leaving the player with an unexplained spinner.
old='if(assessment?.source==="ENGINE_DEGRADED"){actionState.events??=[];actionState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"ACTION_ASSESSMENT_DEGRADED",visibility:"INTERNAL",action:requested,reason:assessment.aiError||assessment.reason,day:actionState.world?.state?.day||1,at:Date.now()})}'
new='if(assessment?.source==="ENGINE_DEGRADED"){actionState.events??=[];actionState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"ACTION_ASSESSMENT_DEGRADED",visibility:"INTERNAL",action:requested,reason:assessment.aiError||assessment.reason,day:actionState.world?.state?.day||1,at:Date.now()});showActionRecoveryNotice("AI 行動判定暫時不可用；已切換 Engine 備援並繼續本回合。");recordDebug("ACTION_ASSESSMENT_DEGRADED_VISIBLE",{action:requested,error:assessment.aiError||assessment.reason})}'
if old not in s: raise SystemExit("degraded event block not found")
s=s.replace(old,new,1)

old='console.warn("AI turn state fallback",e);recordDebug("TURN_SYNC_DEGRADED",{action:effective,mode:syncPlan.mode,error:e?.message||String(e),elapsedMs:Date.now()-debugTurnStarted});'
new=old+'showActionRecoveryNotice("AI 世界狀態同步暫時失敗；已保留 Engine 結果並恢復控制。");'
if old not in s: raise SystemExit("turn sync fallback not found")
s=s.replace(old,new,1)

old='}else recordDebug("PLAYER_ACTION_AI_FAILED",{action:effective,mode:syncPlan.mode,error:playerResult.reason?.message||String(playerResult.reason),elapsedMs:Date.now()-debugTurnStarted})'
new='}else{recordDebug("PLAYER_ACTION_AI_FAILED",{action:effective,mode:syncPlan.mode,error:playerResult.reason?.message||String(playerResult.reason),elapsedMs:Date.now()-debugTurnStarted});showActionRecoveryNotice("AI 場景敘述未完成；已保留 Engine 的可見結果。");await refresh()}'
if old not in s: raise SystemExit("player scene failure branch not found")
s=s.replace(old,new,1)

# Scene/NPC/suggestion provenance guard before AI output reaches player-visible UI.
start=s.index('function applyPlayerActionScene(scene,')
end=s.index('\nfunction startNonblockingPlayerNarration',start)
block='''function playerSceneProvenanceScope(state){\n const registry=state?.world?.registry||{},locations=Array.isArray(registry.locations)?registry.locations:[],npcs=Array.isArray(registry.npcs)?registry.npcs:[],rawLocation=String(state?.player?.location||state?.world?.state?.location||""),location=locations.find(x=>String(x?.id||"")===rawLocation||String(x?.name||"")===rawLocation)||null,locationId=String(location?.id||""),present=npcs.filter(n=>n?.alive!==false&&(n?.companion?.status==="ACTIVE"||(locationId&&String(n?.locationId||"")===locationId))),worldId=String(state?.world?.id||""),allowedLocations=new Set([rawLocation,locationId,String(location?.name||"")].filter(Boolean));\n const visibleEventTexts=(state?.events||[]).filter(e=>e?.visibility!=="INTERNAL"&&(!e?.worldId||String(e.worldId)===worldId)&&(!e?.locationId&&!e?.location||allowedLocations.has(String(e.locationId||e.location)))).slice(-8).map(e=>String(e?.playerSummary||e?.visibleSummary||e?.summary||e?.text||"")).filter(Boolean);\n return {worldId,currentLocation:String(playerVisibleLocationName(state)||rawLocation||""),locationDescription:String(location?.description||""),presentNpcNames:present.map(n=>String(playerVisibleNpcName(state,n)||"")).filter(Boolean),allNpcNames:npcs.map(n=>String(n?.name||"")).filter(Boolean),knownLocations:locations.filter(x=>x?.known===true||x===location).map(x=>String(x?.name||"")).filter(Boolean),visibleEventTexts}\n}\nfunction applyPlayerActionScene(scene,{worldId,baseRevision,expectedRevision,roll,action,previousSuggestions=[],previousSuggestionIntents=[],state=gameState,sessionToken=null}={}){\n const revision=Number.isFinite(Number(expectedRevision))?Number(expectedRevision):Number(baseRevision);\n if(!scene||!state||(sessionToken&&!isCurrentStateSession(sessionToken))||state.world?.id!==worldId||currentStateRevision(state)!==revision)return false;\n const preview=sceneTurnPreview(scene,roll,{action,priorSuggestions:previousSuggestions,priorSuggestionIntents:previousSuggestionIntents}),scope=playerSceneProvenanceScope(state),sceneCheck=validateSceneProvenance(preview,scope);\n if(!sceneCheck.valid){const safe=buildContextualActionSet(state,[]);state.suggestionIntents=safe.all;state.suggestions=safe.all.map(x=>x.label);recordDebug("SCENE_PROVENANCE_REJECTED",{action:String(action||"").slice(0,180),worldId,currentLocation:scope.currentLocation,issues:sceneCheck.issues,narrative:String(preview.narrative||"").slice(0,500),sceneTitle:String(preview.sceneTitle||"")});showActionRecoveryNotice("AI 場景內容與目前地點／人物狀態不一致；已保留 Engine 結果並重新建立當前場景建議。");return false}\n if(preview.narrative)state.narrative=preview.narrative;if(preview.sceneTitle)state.sceneTitle=preview.sceneTitle;\n const source=preview.suggestionIntents?.length?preview.suggestionIntents:(preview.suggestions||[]),checked=filterSuggestionProvenance(source,scope);if(checked.rejected.length)recordDebug("SUGGESTION_PROVENANCE_REJECTED",{action:String(action||"").slice(0,180),worldId,currentLocation:scope.currentLocation,rejected:checked.rejected.map(x=>({action:String(x.row?.action||x.row?.label||x.row||"").slice(0,220),issues:x.issues}))});\n if(source.length){const contextual=buildContextualActionSet(state,checked.accepted);state.suggestionIntents=contextual.all;state.suggestions=contextual.all.map(x=>x.label)}\n return true\n}\n'''
s=s[:start]+block+s[end:]

# Throttle AutoTest expansion and make it non-blocking inside turn loops.
start=s.index('function scheduleDeveloperAutotestExpansion(')
end=s.index('\nasync function executeDeveloperAutotestDecision',start)
block='''function scheduleDeveloperAutotestExpansion(reason="FIRST_BUTTON_STALL_RECOVERY",turn=0){\n const forcedRecovery=/STALL_RECOVERY/.test(String(reason||"")),turnNo=Math.max(0,Number(turn)||0),lastTurn=Math.max(0,Number(autotestRuntimeExpansion.lastStartedTurn)||0);\n if(turnNo&&lastTurn&&turnNo-lastTurn<3){recordDebug("AUTOTEST_RUNTIME_EXPANSION_THROTTLED",{reason,turn:turnNo,lastStartedTurn:lastTurn,minTurnGap:3});return false}\n if(!developerAutotestActive||!developerAutotest.running||!gameState||!aiStatus.aiConfigured||autotestRuntimeExpansion.running||Date.now()<Number(autotestRuntimeExpansion.cooldownUntil||0)||(!forcedRecovery&&!needsExpansion(gameState)))return false;\n const stateToken=captureStateSession(),batchSignal=developerAutotest.batchController?.signal;if(batchSignal?.aborted)return false;\n const ctrl=new AbortController(),worldId=gameState.world?.id,relay=()=>{if(!ctrl.signal.aborted)ctrl.abort(batchSignal?.reason||new DOMException("AutoTest batch stopped","AbortError"))};if(batchSignal)batchSignal.addEventListener("abort",relay,{once:true});\n autotestRuntimeExpansion.running=true;autotestRuntimeExpansion.controller=ctrl;autotestRuntimeExpansion.reason=reason;autotestRuntimeExpansion.turn=turnNo;autotestRuntimeExpansion.lastStartedTurn=turnNo;recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_STARTED",{reason,turn:turnNo,worldId,forcedRecovery});\n void expandDeveloperAutotestWorld(reason,{background:true,signal:ctrl.signal,force:forcedRecovery}).then(ok=>{autotestRuntimeExpansion.cooldownUntil=Date.now()+(ok?20000:15000);if(ok)autotestRuntimeExpansion.lastCompletedTurn=turnNo;if(isCurrentStateSession(stateToken))recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_COMPLETED",{reason,turn:turnNo,worldId,ok,cooldownUntil:autotestRuntimeExpansion.cooldownUntil,lastCompletedTurn:autotestRuntimeExpansion.lastCompletedTurn})}).finally(()=>{if(batchSignal)batchSignal.removeEventListener("abort",relay);if(autotestRuntimeExpansion.controller===ctrl){autotestRuntimeExpansion.controller=null;autotestRuntimeExpansion.running=false;autotestRuntimeExpansion.reason="";autotestRuntimeExpansion.turn=0}});\n return true\n}\n'''
s=s[:start]+block+s[end:]

old='autotestRuntimeExpansion.controller=null;autotestRuntimeExpansion.running=false;autotestRuntimeExpansion.reason="";autotestRuntimeExpansion.turn=0'
new=old+';autotestRuntimeExpansion.cooldownUntil=0;autotestRuntimeExpansion.lastStartedTurn=0;autotestRuntimeExpansion.lastCompletedTurn=0'
if old not in s: raise SystemExit("world transition expansion reset not found")
s=s.replace(old,new,1)

# Replace per-turn synchronous runtime expansion with a throttled background request.
start=s.index('developerAutotest.turn=turn;const firstButtonFast=config.playStrategy==="FIRST_BUTTON";',s.index('for(let turn=1;turn<=config.maxTurns;turn++'))
end=s.index('     const beforeFingerprint=',start)
block='''developerAutotest.turn=turn;const firstButtonFast=config.playStrategy==="FIRST_BUTTON",stall=autotestRecentStallCount(recentActions),expansionNeeded=needsExpansion(gameState),sparseWorld=(gameState.world?.registry?.locations||[]).length<=1&&turn>=5;let expansionReason="";\n     if(stall>=3)expansionReason=firstButtonFast?"FIRST_BUTTON_STALL_RECOVERY":"AUTOTEST_STALL_RECOVERY";else if(expansionNeeded&&(firstButtonFast?sparseWorld:true))expansionReason=firstButtonFast?"FIRST_BUTTON_SPARSE_WORLD":"WORLD_EDGE_UNDERDEFINED";\n     if(expansionReason){const scheduled=scheduleDeveloperAutotestExpansion(expansionReason,turn);recordDebug("AUTOTEST_RUNTIME_EXPANSION_DEFERRED",{reason:expansionReason,turn,scheduled,stall,expansionNeeded})}else recordDebug("AUTOTEST_RUNTIME_EXPANSION_SKIPPED",{reason:firstButtonFast?"FIRST_BUTTON_FAST_PATH":"AI_DECISION_NO_EXPANSION",phase:"TURN",turn,stall,expansionNeeded});\n     if(firstButtonFast)await waitForAutotestActionReady(3000);else await waitForAutotestIdle();\n'''
s=s[:start]+block+s[end:]

# Add no-picker/no-download Codex retrieval entry point to the standard download page.
old='<label class="secondary" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer">驗證已下載檔案<input id="autotestDownloadVerifyFile" type="file" style="display:none"></label><button id="autotestDownloadBack" class="ghost">返回 AutoTest</button>'
new='<label class="secondary" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer">驗證已下載檔案<input id="autotestDownloadVerifyFile" type="file" style="display:none"></label><button id="autotestDownloadCodex" class="secondary">Codex 無下載取回</button><button id="autotestDownloadBack" class="ghost">返回 AutoTest</button>'
if old not in s: raise SystemExit("download page controls not found")
s=s.replace(old,new,1)
needle='input?.addEventListener("change",()=>{const file=input.files?.[0]||null;'
idx=s.index(needle)
# Add handler before file chooser binding.
insert='$("#autotestDownloadCodex")?.addEventListener("click",()=>void openDeveloperAutotestTextTransfer(developerAutotestDownload.kind));\n '
s=s[:idx]+insert+s[idx:]

# Make text-transfer page explicitly machine-readable through the bridge.
needle='<div class="eyebrow">AUTOTEST · IAB TEXT TRANSFER</div><h2>${esc(label)} 頁面取回</h2>'
replace='<div class="eyebrow" data-autotest-codex-kind="${esc(developerAutotestTransfer.kind)}" data-autotest-codex-filename="${esc(t.filename)}" data-autotest-codex-sha256="${esc(t.sha256)}" data-autotest-codex-bytes="${Number(t.bytes)}" data-autotest-codex-chunks="${Number(t.totalChunks)}">AUTOTEST · IAB TEXT TRANSFER</div><h2>${esc(label)} 頁面取回</h2>'
if needle not in s: raise SystemExit("transfer header not found")
s=s.replace(needle,replace,1)
needle='<p class="muted">按「選取」只建立原生文字選取，不宣稱已寫入剪貼簿；之後的 Ctrl+C 由瀏覽器原生選取機制處理。</p><details><summary>完整性 Manifest</summary>'
replace='<p class="muted">按「選取」只建立原生文字選取，不宣稱已寫入剪貼簿；之後的 Ctrl+C 由瀏覽器原生選取機制處理。</p><details open><summary>Codex 無下載 Bridge</summary><p class="muted">不使用下載管理器、File Picker 或剪貼簿。Codex 可在本頁執行 <code>await window.__ELYNDRA_AUTOTEST_CODEX__.manifest("${esc(developerAutotestTransfer.kind)}")</code>，再依 1..totalChunks 呼叫 <code>read(kind,index)</code>，原樣串接 text、以 UTF-8 寫檔，最後用本機 SHA-256 對照 manifest.sha256。來源頁只提供 bytes，不會把它誤報成已保存。</p></details><details><summary>完整性 Manifest</summary>'
if needle not in s: raise SystemExit("transfer manifest block not found")
s=s.replace(needle,replace,1)

write(p,s)

# Always reject stale AI suggestions at contextual render time, not only when scene AI is applied.
p=Path("src/contextual-actions.js"); s=read(p)
needle='import {sanitizePlayerText} from "./runtime-guard.js?v=57021";'
if needle not in s: raise SystemExit("contextual import marker not found")
s=s.replace(needle,needle+'\nimport {validateSuggestionProvenance} from "./scene-provenance.js?v=57021";',1)
marker='export function buildContextualActionSet(state,input=[],options={}){\n'
idx=s.index(marker)
helper='''function contextualSuggestionProvenanceScope(state){const registry=state?.world?.registry||{},locations=Array.isArray(registry.locations)?registry.locations:[],npcs=Array.isArray(registry.npcs)?registry.npcs:[],raw=String(state?.player?.location||state?.world?.state?.location||""),location=locations.find(x=>String(x?.id||"")===raw||String(x?.name||"")===raw)||null,locId=String(location?.id||""),present=npcs.filter(n=>n?.alive!==false&&(n?.companion?.status==="ACTIVE"||(locId&&String(n?.locationId||"")===locId))),worldId=String(state?.world?.id||""),allowed=new Set([raw,locId,String(location?.name||"")].filter(Boolean));return {worldId,currentLocation:String(playerVisibleLocationName(state)||raw||""),locationDescription:String(location?.description||""),presentNpcNames:present.map(n=>String(playerVisibleNpcName(state,n)||"")).filter(Boolean),allNpcNames:npcs.map(n=>String(n?.name||"")).filter(Boolean),knownLocations:locations.filter(x=>x?.known===true||x===location).map(x=>String(x?.name||"")).filter(Boolean),visibleEventTexts:(state?.events||[]).filter(e=>e?.visibility!=="INTERNAL"&&(!e?.worldId||String(e.worldId)===worldId)&&(!e?.locationId&&!e?.location||allowed.has(String(e.locationId||e.location)))).slice(-8).map(e=>String(e?.playerSummary||e?.visibleSummary||e?.summary||e?.text||"")).filter(Boolean)}}\nfunction suggestionMatchesCurrentScene(state,row){return validateSuggestionProvenance(row,contextualSuggestionProvenanceScope(state)).valid}\n'''
s=s[:idx]+helper+s[idx:]
old='const raw=uniq((Array.isArray(input)?input:[]).map(x=>canonicalSuggestion(state,x)).filter(x=>x&&isFresh(x)&&x.requirementsSatisfied===true'
new='const raw=uniq((Array.isArray(input)?input:[]).map(x=>canonicalSuggestion(state,x)).filter(x=>x&&suggestionMatchesCurrentScene(state,x)&&isFresh(x)&&x.requirementsSatisfied===true'
if old not in s: raise SystemExit("contextual raw filter not found")
s=s.replace(old,new,1)
write(p,s)

# Player-visible recovery status styling.
p=Path("styles.css"); s=read(p)
needle='.status.thinking{color:var(--gold);border-color:var(--gold);animation:aiPulse 1.15s ease-in-out infinite}.scene-copy p[data-thinking]:after{content:"\\A\\A" attr(data-thinking);white-space:pre;color:var(--gold);font-size:12px;letter-spacing:.04em;animation:aiPulse 1.15s ease-in-out infinite}'
replace='.status.thinking{color:var(--gold);border-color:var(--gold);animation:aiPulse 1.15s ease-in-out infinite}.scene-copy p[data-recovery]:after{content:"\\A\\A" attr(data-recovery);white-space:pre-wrap;color:var(--gold);font-size:12px;letter-spacing:.02em}.scene-copy p[data-thinking]:after{content:"\\A\\A" attr(data-thinking);white-space:pre-wrap;color:var(--gold);font-size:12px;letter-spacing:.04em;animation:aiPulse 1.15s ease-in-out infinite}'
if needle not in s: raise SystemExit("thinking css not found")
s=s.replace(needle,replace,1)
write(p,s)
