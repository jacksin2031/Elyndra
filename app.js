window.__ELYNDRA_BOOTED__=true;
import {APP_VERSION} from "./src/version.js?v=59005";
import {createDiceFeedback} from "./src/dice-feedback.js?v=59004";
import {SUPPORTED_LOCALES,loadLocale,saveLocale,normalizeLocale,uiText,uiFormat,applyDocumentLocale,ensureWorldLocale,translatedText,missingVisibleTranslations,applyTranslationBundle,applyWorldLocaleToDocument,applySessionTranslationBundle,applySessionLocaleToDocument,documentTranslationCandidates} from "./src/locale-runtime.js?v=59005";
import {localizedStaticText} from "./src/v0594-static-i18n.js?v=59004";
import {loadAISettings,saveAISettings,selectAIProvider,clearAISettings,testDirectAI,setDirectAIRuntimeControl,clearDirectAIRuntimeControl,PROVIDERS} from "./src/ai-settings.js?v=59005";
import {newGame,validateWorld,applyWorldCandidate,WORLD_CONSTITUTION} from "./src/world-engine.js?v=57029";
import {aiHealth,generateWorldCandidate,talkToDynamicNpc,startTurnAIJobs,generateStatePatch,generateRegionExpansion,runWorldQualityCritic,generateHistoryDeepening,askTravelHelper,assessPlayerAction,fastLocalActionAssessment,translateVisibleWorld} from "./src/ai-client.js?v=59005";
import {sceneTurnPreview} from "./src/turn-compiler.js?v=57029";
import {buildSnapshot,applyTurnCandidate} from "./src/adventure-engine.js?v=57029";
import {maintainSession} from "./src/session-maintenance.js?v=57025";
import {performAction} from "./src/game-engine.js?v=57029";
import {saveWorld,loadWorld,hasWorld,deleteWorld,exportWorld,importWorld,saveWorldSlot,loadWorldSlot,listWorldSaves,deleteWorldSlot} from "./src/storage.js?v=57025";
import {ensureClock,formatWorldTime} from "./src/world-clock.js?v=57025";
import {ensureWorldSimulation} from "./src/world-simulation.js?v=57028";
import {ensureWorldRegistry,canonizeGeneration,enrichGeneratedLocations,canInteractWithNpc,npcInteractionMode,isNpcPresent,repairPlayerLocation} from "./src/world-registry.js?v=57025";
import {playerVisibleLocationName} from "./src/player-location-visibility.js?v=57025";
import {playerVisibleNpcName} from "./src/player-entity-visibility.js?v=58000";
import {bootstrapKnowledgeGraph,needsExpansion,recordExpansion} from "./src/knowledge-graph.js?v=57025";
import {ensureNpcRuntime,findNpc,inviteCompanion,acceptCompanionOffer,dismissCompanion} from "./src/npc-engine.js?v=57028";
import {applyNpcConversationTurn} from "./src/npc-conversation.js?v=57029";
import {ensureFactionRuntime} from "./src/faction-engine.js?v=57025";
import {ensureCharacter,combatAction,recoverFromDefeat,xpNeeded} from "./src/combat-engine.js?v=57029";
import {ensureQuestProgress,ensureMainQuest,questSnapshot,evaluateQuestState} from "./src/quest-engine.js?v=57025";
import {ensureCrisis} from "./src/crisis-engine.js?v=57025";
import {visibleLore,resolveLocalLoreAction} from "./src/lore-engine.js?v=57025";
import {playerVisibleEvents} from "./src/event-visibility.js?v=57025";
import {loadJevSettings,saveJevSettings,clearJevSettings,testJev,routeAction} from "./src/jev-router.js?v=57025";
import {getWorldStylePreset} from "./src/world-style-presets.js?v=57025";
import {randomWorldSettings} from "./src/world-randomizer.js?v=57025";
import {createWorldCreationDraft,compileWorldCreation,validateWorldCreationCandidate,applyWorldCreationState,buildWorldContract,worldContractHtml,DIFFICULTY_PRESETS} from "./src/world-creation.js?v=59003";
import {currentTradeProfile,walletSummary} from "./src/world-locality.js?v=57025";
import {ensureWorldImpact,impactCapability,impactSnapshot,playerImpactRecords} from "./src/world-impact.js?v=57025";
import {ensureRecognition,recognitionSnapshot} from "./src/recognition-engine.js?v=57025";
import {ensureCheckProfile,checkProfileSnapshot} from "./src/check-engine.js?v=57025";
import {deriveSceneTitle} from "./src/runtime-guard.js?v=57029";
import {worldCommunication} from "./src/communication-engine.js?v=57025";
import {initializeWeather,weatherUiSnapshot} from "./src/weather-engine.js?v=57025";
import {ensureSurvival,survivalSnapshot} from "./src/survival-engine.js?v=57025";
import {ensureMagicRuntime} from "./src/magic-engine.js?v=57025";
import {ensureTravelNetwork,travelSnapshot} from "./src/travel-engine.js?v=57025";
import {ensureDungeonSites,dungeonSnapshot} from "./src/dungeon-engine.js?v=57025";
import {ensureTalents,talentSnapshot,learnTalent} from "./src/talent-engine.js?v=57025";
import {marketSnapshot} from "./src/economy-engine.js?v=57025";
import {cultureSnapshot} from "./src/culture-engine.js?v=57025";
import {worldEvolutionNeed,markWorldEvolution,worldHealthSnapshot,backgroundQualityNeed,applyUnseenWorldRepair,recordBackgroundQualityReview} from "./src/world-quality.js?v=57025";
import {ensureItemRuntime,itemCategoryLabel,itemEffectText,canUseItem,presentItemToNpc,craftingSnapshot} from "./src/item-engine.js?v=57025";
import {ensureNotes,addNote,updateNote,deleteNote,notesSnapshot} from "./src/notes-engine.js?v=57025";
import {worldMapSnapshot} from "./src/world-map.js?v=57025";
import {ensurePlayerOrigin,playerOriginSnapshot} from "./src/player-origin.js?v=57025";
import {openJournalUI,openInventoryUI,openSaveManagerUI} from "./src/progression-ui.js?v=57025";
import {recordDebug,telemetryEntries,telemetrySummary,debugBundle,debugBundleText,clearDebugTelemetry,installDebugConsoleCapture} from "./src/debug-telemetry.js?v=57025";
import {notifyGameplayAcquisitions} from "./src/acquisition-notifier.js?v=58000";
import {ensurePlayerExperience,markOpeningEngaged,projectObservableWorldChanges,roleplayFallbackSuggestions} from "./src/player-experience.js?v=57028";
import {maybeJourneyCheckpoint,recentJourneyCheckpoints} from "./src/journey-closure.js?v=57028";
import {buildContextualActionSet,regenerateContextualActionSet,trustedSuggestionAssessment,suggestionPresentation,groundedSuggestionFailForward,groundedTravelDestination} from "./src/contextual-actions.js?v=57029";
import {planStateSync,deferredPlanFrom,ensureStateSyncRuntime,currentStateRevision,bumpStateRevision,validateStatePatch,groundStatePatch,projectDeferredSceneEvidence,groundedPickupItemFromAction,statePatchToCandidate,assessPatchRevision} from "./src/state-sync.js?v=57025";
import {createStateSessionGuard} from "./src/state-session.js?v=57025";
import {planLazyGeneration,validateLazyGenerationCandidate,commitLazyGeneration,abortLazyGeneration,recordLazyGenerationCheckpoint,hasLazyGenerationCheckpoint} from "./src/lazy-generation.js?v=57025";
import {applyOriginRuntime} from "./src/origin-runtime.js?v=57025";
import {historyDeepeningNeed,planHistoryDeepening,validateHistoryDeepeningCandidate,commitHistoryDeepening,abortHistoryDeepening} from "./src/history-depth.js?v=57025";
import {registerHistoryDeepeningDocuments} from "./src/document-engine.js?v=57025";
import {registerHistoryRelicSeeds} from "./src/item-heritage.js?v=57025";
import {randomAutotestWorldRaw,decideAutotestAction,autotestStopReason,autotestStateFingerprint,autotestWorldSummary,buildAutotestReport,autotestExportSelection,autotestPlayStrategy,autotestDifficultyPlan} from "./src/ai-autotest.js?v=59005";
import {buildAutotestExportSnapshot,buildAutotestExportArtifacts,saveLastAutotestExportSnapshot,loadLastAutotestExportSnapshot,archiveAutotestExportSnapshot,listAutotestExportSnapshots,loadAutotestExportSnapshot} from "./src/autotest-export.js?v=57025";
import {autotestSaveCapability,saveAutotestArtifactWithPicker,saveAutotestArtifactsToDirectory,shareAutotestArtifact} from "./src/autotest-save.js?v=57025";
import {copyAutotestText} from "./src/autotest-copy.js?v=57025";
import {buildAutotestTextTransfer,reconstructAutotestTextTransfer,autotestTransferManifest} from "./src/autotest-transfer.js?v=57025";
import {buildAutotestDragPayload,applyAutotestDragPayload,verifyAutotestDragFile} from "./src/autotest-drag-export.js?v=57025";
import {buildAutotestDownloadPayload,createAutotestDownloadLease,verifyAutotestDownloadedFile,ensureAutotestDownloadBridge} from "./src/autotest-download.js?v=57025";
import {validateSceneProvenance,filterSuggestionProvenance} from "./src/scene-provenance.js?v=57025";
const $=s=>document.querySelector(s),qsa=s=>Array.from(document.querySelectorAll(s));let gameState=null,aiStatus={ok:false,aiConfigured:false},aiBusy=false,turnSyncBusy=false,turnSyncLabel="",helperHistory=[],npcChatHistory=new Map();
let activeLocale=saveLocale(loadLocale()),localeTransitionBusy=false;globalThis.ELYNDRA_LOCALE=activeLocale;const lt=value=>gameState?translatedText(gameState,value,activeLocale):String(value??"");
const ALL_RULE_TAGS="__all__";
const staticText=value=>localizedStaticText(value,activeLocale);
const ruleCategoryText=value=>value===ALL_RULE_TAGS?(activeLocale==="en"?"All":activeLocale==="ja"?"すべて":"全部"):localizedStaticText(value,activeLocale);
const ruleTagCountText=count=>activeLocale==="en"?`${count} tags`:activeLocale==="ja"?`${count}件のタグ`:activeLocale==="zh-Hans"?`${count} 个标签`:`${count} 個標籤`;
const diceFeedback=createDiceFeedback({box:$("#diceBox"),value:$("#d20")});
const stateSession=createStateSessionGuard(null);
function captureStateSession(){return stateSession.capture(gameState)}
function isCurrentStateSession(token){return stateSession.isCurrent(token,gameState)}
installDebugConsoleCapture();
recordDebug("APP_BOOT",{version:APP_VERSION,href:location.href,locale:activeLocale});
applyDocumentLocale(activeLocale);
let localeMutationTimer=0;
const localeObserver=new MutationObserver(()=>{clearTimeout(localeMutationTimer);localeMutationTimer=setTimeout(()=>{const modal=$("#modal"),root=modal&&!modal.classList.contains("hidden")?modal:(document.querySelector(".screen.active")||document.body);applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);void ensureRenderedLocale("mutation",root)},90)});
localeObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["placeholder","aria-label","title"]});
window.addEventListener("error",e=>recordDebug("WINDOW_ERROR",{message:e.message,filename:e.filename,line:e.lineno,column:e.colno}));
window.addEventListener("unhandledrejection",e=>recordDebug("UNHANDLED_REJECTION",{message:String(e.reason?.message||e.reason||"Promise failed")}));
const deferredDirector={timer:0,running:false,controller:null,queue:[]};
const nonblockingScene={controller:null,revision:null,worldId:null};
const playerActionFlight={active:false,label:"",startedAt:0};
const suggestionRefresh={message:"",error:false,rejected:[],exclude:[]};
const worldBackground={timer:0,running:false,controller:null,lastReason:"background_gameplay",queued:false,failures:0,cooldownUntil:0};
const worldQualityBackground={timer:0,running:false,controller:null,lastReason:"background_quality",failures:0};
const historyBackground={timer:0,running:false,controller:null,lastReason:"history_research",plan:null,failures:0};
let developerAutotestActive=false;
const developerAutotest={running:false,stopRequested:false,worldIndex:0,turn:0,results:[],startedAt:0,endedAt:0,config:null,controller:null,batchController:null,lastReport:null,lastMessage:"",logs:[],hiddenAt:0,lastVisibleAt:0,backgroundInterruptions:0,backgroundDurationMs:0,exportSnapshot:null,exportPersistence:null,retainedRuns:[]};
const developerAutotestTransfer={kind:"",transfer:null,index:0,full:false};
const developerAutotestDrag={kind:"",payload:null,selfTest:null,lastDrag:null};
const developerAutotestDownload={kind:"",payload:null,lease:null,request:null,verification:null};
void loadLastAutotestExportSnapshot().then(async snapshot=>{
 if(!snapshot){developerAutotest.retainedRuns=await listAutotestExportSnapshots();return}
 developerAutotest.exportSnapshot=snapshot;developerAutotest.exportPersistence={backend:"indexeddb-or-fallback",persisted:true,restored:true};if(!developerAutotest.lastReport&&snapshot.debugPayload?.summary)developerAutotest.lastReport=snapshot.debugPayload;recordDebug("AUTOTEST_EXPORT_CACHE_RESTORED",{createdAt:snapshot.createdAt,worlds:snapshot.worlds?.length||0});
 try{const archived=await archiveAutotestExportSnapshot(snapshot);recordDebug("AUTOTEST_EXPORT_ARCHIVE_PRESERVED",archived)}catch(error){recordDebug("AUTOTEST_EXPORT_ARCHIVE_PRESERVE_FAILED",{error:error?.message||String(error)})}
 developerAutotest.retainedRuns=await listAutotestExportSnapshots()
}).catch(error=>recordDebug("AUTOTEST_EXPORT_CACHE_RESTORE_FAILED",{error:error?.message||String(error)}));
const autotestRuntimeExpansion={running:false,controller:null,reason:"",turn:0,cooldownUntil:0,lastStartedTurn:0,lastCompletedTurn:0};
const AUTOTEST_BACKGROUND_GRACE_MS=15000;
function autotestNetworkError(error){return /Failed to fetch|fetch failed|NetworkError|ERR_NETWORK|Load failed|network request failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|connection (?:reset|closed|refused)|AI_TIMEOUT/i.test(String(error?.message||error||""))}
function autotestBackgroundAffected(error){return developerAutotest.running&&autotestNetworkError(error)&&(document.hidden||developerAutotest.hiddenAt>0||(developerAutotest.lastVisibleAt&&Date.now()-developerAutotest.lastVisibleAt<=AUTOTEST_BACKGROUND_GRACE_MS))}
function waitForAutotestVisible(){
 if(!document.hidden)return Promise.resolve();
 return new Promise(resolve=>{const done=()=>{if(document.hidden)return;document.removeEventListener("visibilitychange",done);resolve()};document.addEventListener("visibilitychange",done)})
}
document.addEventListener("visibilitychange",()=>{
 if(!developerAutotest.running)return;
 const now=Date.now();
 if(document.hidden){
  developerAutotest.hiddenAt=now;
  recordDebug("AUTOTEST_VISIBILITY_HIDDEN",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn});
  appendDeveloperAutotestLog("視窗已切到背景；測試會繼續，若瀏覽器暫停網絡則回到前景後自動恢復。")
 }else{
  const hiddenDurationMs=developerAutotest.hiddenAt?Math.max(0,now-developerAutotest.hiddenAt):0;
  developerAutotest.backgroundDurationMs+=hiddenDurationMs;developerAutotest.hiddenAt=0;developerAutotest.lastVisibleAt=now;
  recordDebug("AUTOTEST_VISIBILITY_VISIBLE",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn,hiddenDurationMs});
  appendDeveloperAutotestLog("視窗已回到前景；如有背景中斷會從安全點繼續。")
 }
});
let gameplayDebugSnapshot=null;
const BACKGROUND_IDLE_GRACE_MS=10000;let lastForegroundActionAt=0;
function markForegroundActivity(){lastForegroundActionAt=Date.now()}
function backgroundIdleRemaining(){return Math.max(0,BACKGROUND_IDLE_GRACE_MS-(Date.now()-lastForegroundActionAt))}
function gameplayDebugClock(state){
 const clock=state?.world?.state?.clock||{};
 return {day:Number(state?.world?.state?.day||clock.day)||1,time:String(clock.hour??0).padStart(2,"0")+":"+String(clock.minute??0).padStart(2,"0"),totalMinutes:Number(clock.totalMinutes)||0}
}
function captureGameplayDebugState(state){
 if(!state)return null;
 const registry=state.world?.registry||{},inventory=Array.isArray(state.inventory)?state.inventory:[],knowledge=Array.isArray(state.knowledge)?state.knowledge:[],sideQuests=Array.isArray(registry.sideQuests)?registry.sideQuests:[],npcs=Array.isArray(registry.npcs)?registry.npcs:[],locations=Array.isArray(registry.locations)?registry.locations:[];
 const map=(rows,project)=>Object.fromEntries(rows.filter(Boolean).map(row=>[String(row.id||row.name||row.title||""),project(row)]).filter(([id])=>id));
 return {
  worldId:state.world?.id||null,clock:gameplayDebugClock(state),location:String(state.player?.location||state.world?.state?.location||""),
  inventory:map(inventory,x=>({id:x.id||"",name:x.name||"",quantity:Math.max(0,Number(x.quantity)||1),category:x.category||"",equipped:Boolean(x.equipped)})),
  knowledge:map(knowledge,x=>({id:x.id||"",title:x.title||"",status:x.status||"",score:Number(x.score)||0,factId:x.factId||null,historyId:x.historyId||null,sources:Array.isArray(x.sources)?x.sources.slice(0,6):[]})),
  sideQuests:map(sideQuests,x=>({id:x.id||"",title:x.title||"",objective:x.objective||"",known:x.known===true,status:x.status||"",progress:Number(x.progress)||0,target:Number(x.target)||0})),
  npcs:map(npcs,x=>({id:x.id||"",name:x.name||"",role:x.role||"",known:x.known===true,encountered:x.encountered===true,trust:Number(x.trust)||0,locationId:x.locationId||null,companionStatus:x.companion?.status||"NONE"})),
  locations:map(locations,x=>({id:x.id||"",name:x.name||"",region:x.region||"",known:x.known===true})),
  mainQuest:{id:state.quests?.main?.id||"Q-main",title:state.quests?.main?.title||"",stage:Number(state.quests?.main?.stage)||0,status:state.quests?.main?.status||"",objective:state.quests?.main?.objectives?.[0]||""},
  combat:state.combat?.active?{active:true,enemyId:state.combat.enemy?.id||null,enemyName:state.combat.enemy?.name||"未知敵人",enemyHp:Number(state.combat.enemy?.hp)||0}:{active:false,enemyId:null,enemyName:"",enemyHp:0}
 }
}
function recordGameplayStateChanges(state,reason="refresh"){
 const next=captureGameplayDebugState(state);if(!next)return;
 const prev=gameplayDebugSnapshot;
 if(!prev||prev.worldId!==next.worldId){gameplayDebugSnapshot=next;recordDebug("GAME_STATE_BASELINE",{worldId:next.worldId,location:next.location,clock:next.clock,reason});return}
 const latestEvent=Array.isArray(state.events)&&state.events.length?state.events[state.events.length-1]:null,meta={clock:next.clock,reason,sourceEventType:latestEvent?.type||"",sourceEventId:latestEvent?.id||null};
 if(prev.location!==next.location)recordDebug("GAME_LOCATION_CHANGED",{...meta,from:prev.location,to:next.location});
 for(const [id,loc] of Object.entries(next.locations)){const before=prev.locations[id];if(loc.known&&(!before||!before.known))recordDebug("GAME_LOCATION_DISCOVERED",{...meta,locationId:id,name:loc.name,region:loc.region})}
 for(const [id,item] of Object.entries(next.inventory)){
  const before=prev.inventory[id],delta=item.quantity-(before?.quantity||0);
  if(delta>0)recordDebug("GAME_ITEM_GAINED",{...meta,itemId:id,name:item.name,category:item.category,quantityDelta:delta,totalQuantity:item.quantity});
  else if(delta<0)recordDebug("GAME_ITEM_LOST",{...meta,itemId:id,name:item.name,category:item.category,quantityDelta:delta,totalQuantity:item.quantity})
 }
 for(const [id,item] of Object.entries(prev.inventory))if(!next.inventory[id]&&item.quantity>0)recordDebug("GAME_ITEM_LOST",{...meta,itemId:id,name:item.name,category:item.category,quantityDelta:-item.quantity,totalQuantity:0});
 for(const [id,k] of Object.entries(next.knowledge)){
  const before=prev.knowledge[id];
  if(!before)recordDebug("GAME_KNOWLEDGE_GAINED",{...meta,knowledgeId:id,title:k.title,status:k.status,score:k.score,factId:k.factId,historyId:k.historyId,sources:k.sources});
  else if(before.status!==k.status||before.score!==k.score)recordDebug("GAME_KNOWLEDGE_UPDATED",{...meta,knowledgeId:id,title:k.title,fromStatus:before.status,toStatus:k.status,fromScore:before.score,toScore:k.score,factId:k.factId})
 }
 for(const [id,q] of Object.entries(next.sideQuests)){
  const before=prev.sideQuests[id];
  if(q.known&&(!before||!before.known))recordDebug("GAME_SIDE_QUEST_ACQUIRED",{...meta,questId:id,title:q.title,objective:q.objective,status:q.status,target:q.target});
  if(before&&q.progress!==before.progress)recordDebug("GAME_SIDE_QUEST_PROGRESS",{...meta,questId:id,title:q.title,from:before.progress,to:q.progress,target:q.target,status:q.status});
  if(before&&before.status!=="COMPLETED"&&q.status==="COMPLETED")recordDebug("GAME_SIDE_QUEST_COMPLETED",{...meta,questId:id,title:q.title,progress:q.progress,target:q.target})
 }
 for(const [id,npc] of Object.entries(next.npcs)){
  const before=prev.npcs[id];
  if(npc.known&&(!before||!before.known))recordDebug("GAME_NPC_DISCOVERED",{...meta,npcId:id,name:npc.name,role:npc.role,locationId:npc.locationId});
  if(npc.encountered&&(!before||!before.encountered))recordDebug("GAME_NPC_ENCOUNTERED",{...meta,npcId:id,name:npc.name,role:npc.role,locationId:npc.locationId,trust:npc.trust});
  if(before&&before.trust!==npc.trust)recordDebug("GAME_NPC_TRUST_CHANGED",{...meta,npcId:id,name:npc.name,from:before.trust,to:npc.trust,delta:npc.trust-before.trust});
  if(before&&before.companionStatus!==npc.companionStatus)recordDebug("GAME_COMPANION_STATUS_CHANGED",{...meta,npcId:id,name:npc.name,from:before.companionStatus,to:npc.companionStatus})
 }
 if(prev.mainQuest.stage!==next.mainQuest.stage||prev.mainQuest.status!==next.mainQuest.status||prev.mainQuest.objective!==next.mainQuest.objective)recordDebug("GAME_MAIN_QUEST_UPDATED",{...meta,questId:next.mainQuest.id,title:next.mainQuest.title,fromStage:prev.mainQuest.stage,toStage:next.mainQuest.stage,fromStatus:prev.mainQuest.status,toStatus:next.mainQuest.status,objective:next.mainQuest.objective});
 if(!prev.combat.active&&next.combat.active)recordDebug("GAME_COMBAT_STARTED",{...meta,enemyId:next.combat.enemyId,enemyName:next.combat.enemyName,enemyHp:next.combat.enemyHp});
 else if(prev.combat.active&&!next.combat.active)recordDebug("GAME_COMBAT_ENDED",{...meta,enemyId:prev.combat.enemyId,enemyName:prev.combat.enemyName});
 notifyGameplayAcquisitions(prev,next);
 gameplayDebugSnapshot=next
}
function preemptBackgroundWorldEvolution(){
 const ctrl=worldBackground.controller;if(ctrl&&!ctrl.signal.aborted)ctrl.abort(new DOMException("Higher-priority gameplay has priority","AbortError"))
}
function preemptBackgroundWorldQuality(){
 const ctrl=worldQualityBackground.controller;if(ctrl&&!ctrl.signal.aborted)ctrl.abort(new DOMException("Higher-priority gameplay has priority","AbortError"))
}
function preemptBackgroundHistory(){
 const ctrl=historyBackground.controller;if(ctrl&&!ctrl.signal.aborted)ctrl.abort(new DOMException("Higher-priority gameplay has priority","AbortError"))
}
function preemptDeferredDirector(){
 const ctrl=deferredDirector.controller;if(ctrl&&!ctrl.signal.aborted)ctrl.abort(new DOMException("Foreground gameplay has priority","AbortError"))
}
function preemptNonblockingScene(){
 const ctrl=nonblockingScene.controller;if(ctrl&&!ctrl.signal.aborted)ctrl.abort(new DOMException("Newer player action has priority","AbortError"));
 nonblockingScene.controller=null;nonblockingScene.revision=null;nonblockingScene.worldId=null
}
function preemptBackgroundAI(){preemptNonblockingScene();preemptBackgroundWorldEvolution();preemptBackgroundWorldQuality();preemptBackgroundHistory();preemptDeferredDirector()}
function cancelStateBoundWork(reason="STATE_REPLACED"){
 if(deferredDirector.timer){clearTimeout(deferredDirector.timer);deferredDirector.timer=0}
 if(worldBackground.timer){clearTimeout(worldBackground.timer);worldBackground.timer=0}
 if(worldQualityBackground.timer){clearTimeout(worldQualityBackground.timer);worldQualityBackground.timer=0}
 if(historyBackground.timer){clearTimeout(historyBackground.timer);historyBackground.timer=0}
 preemptBackgroundAI();deferredDirector.queue.length=0;
 if(playerActionFlight.active)finishPlayerActionFlight(playerActionFlight.label||"state","state_replaced");
 recordDebug("STATE_BOUND_WORK_CANCELLED",{reason})
}
function replaceGameState(next,reason="STATE_REPLACED"){diceFeedback.reset();$("#rollLabel").textContent=uiText("等待你的行動",activeLocale);$("#rollResult").textContent=uiText("世界會記住重要結果。",activeLocale);cancelStateBoundWork(reason);const cacheBefore={helperHistory:helperHistory.length,rejected:suggestionRefresh.rejected.length,excluded:suggestionRefresh.exclude.length,npcChats:npcChatHistory.size};gameState=next??null;stateSession.replace(gameState);gameplayDebugSnapshot=null;helperHistory=[];npcChatHistory=new Map();suggestionRefresh.message="";suggestionRefresh.error=false;suggestionRefresh.rejected=[];suggestionRefresh.exclude=[];recordDebug("STATE_BOUND_UI_CACHE_RESET",{reason,...cacheBefore});recordDebug("STATE_SESSION_REPLACED",{reason,epoch:stateSession.epoch,worldId:gameState?.world?.id||null});return gameState}
function commitStatePatch(state,patch,plan,context={}){
 const grounded=groundStatePatch(state,patch,context),effectivePatch=grounded.patch;
 if(grounded.rejected.length)recordDebug("STATE_PATCH_GROUNDING_REJECTED",{mode:plan?.mode||"",action:String(context?.action||"").slice(0,180),rejected:grounded.rejected});
 const valid=validateStatePatch(effectivePatch,plan);if(!valid.valid)throw new Error("STATE_PATCH_INVALID:"+valid.errors.join(","));
 if(!Array.isArray(effectivePatch.operations)||!effectivePatch.operations.length)return {applied:false,empty:true,rejected:grounded.rejected.length,deferredEvidence:grounded.deferredEvidence||[],revision:currentStateRevision(state)};
 const revision=assessPatchRevision(state,effectivePatch,plan); if(!revision.ok)return {applied:false,stale:true,rejected:grounded.rejected.length,deferredEvidence:grounded.deferredEvidence||[],...revision};
 const candidate=statePatchToCandidate(effectivePatch,state);applyTurnCandidate(state,candidate,{...context,directorMode:plan.mode});
 const next=bumpStateRevision(state,"STATE_PATCH_"+plan.mode);
 return {applied:true,rebased:revision.rebased===true,rebasedFrom:revision.rebasedFrom??null,rejected:grounded.rejected.length,deferredEvidence:grounded.deferredEvidence||[],revision:next,operations:effectivePatch.operations.length}
}
function commitSceneGroundedEvidence(state,operations,plan,context={}){
 const rows=[],seen=new Set();for(const raw of Array.isArray(operations)?operations:[]){const type=String(raw?.op||"").toUpperCase(),key=type+":"+String(raw?.item?.name||raw?.title||raw?.location||raw?.sourceId||"");if(!type||seen.has(key))continue;seen.add(key);rows.push(structuredClone(raw))}
 const projected=projectDeferredSceneEvidence(rows,context?.observableText);
 if(!projected.length)return {applied:false,empty:true};const capabilities=[...new Set([...(plan?.capabilities||[]),...projected.map(x=>String(x?.op||"").toUpperCase())])],evidencePlan={...plan,mode:"FAST",baseRevision:currentStateRevision(state),capabilities},patch={baseRevision:currentStateRevision(state),operations:projected};return commitStatePatch(state,patch,evidencePlan,context)
}
function commitGroundedProgressionFallback(state,discovery,plan,context={}){
 if(!discovery||context.roll?.success!==true||!(plan?.capabilities||[]).includes("DISCOVER_FACT"))return {applied:false};
 const duplicate=(state.knowledge||[]).some(k=>k?.sourceRef?.kind===discovery.sourceKind&&String(k?.sourceRef?.id||"")===String(discovery.sourceId||"")&&String(k?.text||"")===String(discovery.text||""));
 if(duplicate){state.narrative=discovery.text;recordDebug("ENGINE_GROUNDED_FAIL_FORWARD_REUSED",{action:String(context.action||"").slice(0,180),sourceKind:discovery.sourceKind,sourceId:discovery.sourceId});return {applied:false,reused:true}}
 const patch={baseRevision:Number(plan.baseRevision)||0,operations:[{op:"DISCOVER_FACT",...discovery}]},committed=commitStatePatch(state,patch,plan,context);
 if(committed.applied){state.narrative=discovery.text;recordDebug("ENGINE_GROUNDED_FAIL_FORWARD_APPLIED",{action:String(context.action||"").slice(0,180),sourceKind:discovery.sourceKind,sourceId:discovery.sourceId,revision:committed.revision})}
 return committed
}
function commitGroundedTravelFallback(state,plan,context={}){
 if(context.roll?.success!==true||!(plan?.capabilities||[]).includes("MOVE_PLAYER"))return {applied:false};
 const current=String(state?.player?.location||state?.world?.state?.location||"");if(context.fromLocation&&current!==String(context.fromLocation))return {applied:false};
 const target=groundedTravelDestination(state,context.action,context.roll,context.intent||{});if(!target)return {applied:false};
 const operations=[];if((plan?.capabilities||[]).includes("REVEAL_ENTITY")&&target.id)operations.push({op:"REVEAL_ENTITY",kind:"location",id:String(target.id)});operations.push({op:"MOVE_PLAYER",location:String(target.name)});
 const effectivePlan={...plan,baseRevision:currentStateRevision(state)},patch={baseRevision:currentStateRevision(state),operations},committed=commitStatePatch(state,patch,effectivePlan,context);
 if(committed.applied)recordDebug("ENGINE_GROUNDED_TRAVEL_APPLIED",{action:String(context.action||"").slice(0,180),from:current,to:String(target.name),revision:committed.revision});
 return committed
}
function commitGroundedPickupFallback(state,plan,context={}){
 if(context.roll?.success!==true||!(plan?.capabilities||[]).includes("ACQUIRE_ITEM"))return {applied:false};
 const item=groundedPickupItemFromAction(context.action,context.roll,context.observableText);if(!item)return {applied:false};
 if((state.inventory||[]).some(x=>String(x?.name||"")===item.name)){recordDebug("ENGINE_PICKUP_FAIL_FORWARD_REUSED",{action:String(context.action||"").slice(0,180),itemName:item.name});return {applied:false,reused:true}}
 const patch={baseRevision:Number(plan.baseRevision)||0,operations:[{op:"ACQUIRE_ITEM",item}]},committed=commitStatePatch(state,patch,plan,context);
 if(committed.applied)recordDebug("ENGINE_PICKUP_FAIL_FORWARD_APPLIED",{action:String(context.action||"").slice(0,180),itemName:item.name,revision:committed.revision});
 return committed
}
function playerSceneProvenanceScope(state){
 const registry=state?.world?.registry||{},locations=Array.isArray(registry.locations)?registry.locations:[],npcs=Array.isArray(registry.npcs)?registry.npcs:[],rawLocation=String(state?.player?.location||state?.world?.state?.location||""),location=locations.find(x=>String(x?.id||"")===rawLocation||String(x?.name||"")===rawLocation)||null,locationId=String(location?.id||""),present=npcs.filter(n=>n?.alive!==false&&(n?.companion?.status==="ACTIVE"||(locationId&&String(n?.locationId||"")===locationId))),worldId=String(state?.world?.id||""),allowedLocations=new Set([rawLocation,locationId,String(location?.name||"")].filter(Boolean));
 const visibleEventTexts=(state?.events||[]).filter(e=>e?.visibility!=="INTERNAL"&&(!e?.worldId||String(e.worldId)===worldId)&&(!e?.locationId&&!e?.location||allowedLocations.has(String(e.locationId||e.location)))).slice(-8).map(e=>String(e?.playerSummary||e?.visibleSummary||e?.summary||e?.text||"")).filter(Boolean);
 return {worldId,currentLocation:String(playerVisibleLocationName(state)||rawLocation||""),locationDescription:String(location?.description||""),presentNpcNames:present.map(n=>String(playerVisibleNpcName(state,n)||"")).filter(Boolean),allNpcNames:npcs.map(n=>String(n?.name||"")).filter(Boolean),knownLocations:locations.filter(x=>x?.known===true||x===location).map(x=>String(x?.name||"")).filter(Boolean),visibleEventTexts}
}
function applyPlayerActionScene(scene,{worldId,baseRevision,expectedRevision,roll,action,previousSuggestions=[],previousSuggestionIntents=[],state=gameState,sessionToken=null}={}){
 const revision=Number.isFinite(Number(expectedRevision))?Number(expectedRevision):Number(baseRevision);
 if(!scene||!state||(sessionToken&&!isCurrentStateSession(sessionToken))||state.world?.id!==worldId||currentStateRevision(state)!==revision)return false;
 const preview=sceneTurnPreview(scene,roll,{action,priorSuggestions:previousSuggestions,priorSuggestionIntents:previousSuggestionIntents}),scope=playerSceneProvenanceScope(state),sceneCheck=validateSceneProvenance(preview,scope);
 if(!sceneCheck.valid){const safe=buildContextualActionSet(state,[]);state.suggestionIntents=safe.all;state.suggestions=safe.all.map(x=>x.label);recordDebug("SCENE_PROVENANCE_REJECTED",{action:String(action||"").slice(0,180),worldId,currentLocation:scope.currentLocation,issues:sceneCheck.issues,narrative:String(preview.narrative||"").slice(0,500),sceneTitle:String(preview.sceneTitle||"")});showActionRecoveryNotice("AI 場景內容與目前地點／人物狀態不一致；已保留 Engine 結果並重新建立當前場景建議。");return false}
 if(preview.narrative)state.narrative=preview.narrative;if(preview.sceneTitle)state.sceneTitle=preview.sceneTitle;
 const source=preview.suggestionIntents?.length?preview.suggestionIntents:(preview.suggestions||[]),checked=filterSuggestionProvenance(source,scope);if(checked.rejected.length)recordDebug("SUGGESTION_PROVENANCE_REJECTED",{action:String(action||"").slice(0,180),worldId,currentLocation:scope.currentLocation,rejected:checked.rejected.map(x=>({action:String(x.row?.action||x.row?.label||x.row||"").slice(0,220),issues:x.issues}))});
 if(source.length){const contextual=buildContextualActionSet(state,checked.accepted);state.suggestionIntents=contextual.all;state.suggestions=contextual.all.map(x=>x.label)}
 return true
}

function startNonblockingPlayerNarration({action,roll,snapshot,plan,intent,previousSuggestions,previousSuggestionIntents,startedAt,state=gameState,sessionToken=captureStateSession()}){
 preemptNonblockingScene();const ctrl=new AbortController(),worldId=state?.world?.id,baseRevision=Number(plan?.baseRevision)||currentStateRevision(state);
 nonblockingScene.controller=ctrl;nonblockingScene.worldId=worldId;nonblockingScene.revision=baseRevision;updateAIStatusBadge("Player Action AI 正在背景生成玩家可見結果");
 const jobs=startTurnAIJobs(action,roll,snapshot,{intent,stateSyncPlan:plan,baseRevision,signal:ctrl.signal});
 jobs.playerAction.then(async scene=>{
  if(ctrl.signal.aborted||!isCurrentStateSession(sessionToken))return;const applied=applyPlayerActionScene(scene,{worldId,baseRevision,roll,action,previousSuggestions,previousSuggestionIntents,state,sessionToken});
  recordDebug(applied?"PLAYER_ACTION_AI_COMPLETED":"PLAYER_ACTION_AI_STALE_DISCARDED",{action,mode:plan.mode,baseRevision,currentRevision:isCurrentStateSession(sessionToken)?currentStateRevision(state):null,elapsedMs:Date.now()-startedAt});
  if(applied){await persist(state,sessionToken);if(isCurrentStateSession(sessionToken))await refresh()}
 }).catch(e=>{if(!ctrl.signal.aborted)recordDebug("PLAYER_ACTION_AI_FAILED",{action,mode:plan.mode,error:e?.message||String(e),elapsedMs:Date.now()-startedAt})}).finally(()=>{if(nonblockingScene.controller===ctrl){nonblockingScene.controller=null;nonblockingScene.worldId=null;nonblockingScene.revision=null}finishPlayerActionFlight(action,ctrl.signal.aborted?"scene_aborted":"scene_settled");updateAIStatusBadge();if(gameState)void refresh()});
 return jobs
}
function removePersistedDeferredTurn(taskId){
 if(!gameState?.world?.deferredTurns||!taskId)return;
 gameState.world.deferredTurns=gameState.world.deferredTurns.filter(x=>x.id!==taskId)
}
function scheduleDeferredDirector(task,delay=900,{persistTask=true}={}){
 if(!task||!gameState||!aiStatus.aiConfigured)return;
 const queued={...task,id:task.id||crypto.randomUUID?.()||Math.random().toString(36).slice(2),attempts:Number(task.attempts)||0,queuedAt:task.queuedAt||Date.now()};
 if(!deferredDirector.queue.some(x=>x.id===queued.id))deferredDirector.queue.push(queued);
 if(persistTask){gameState.world.deferredTurns??=[];if(!gameState.world.deferredTurns.some(x=>x.id===queued.id))gameState.world.deferredTurns.push(structuredClone(queued))}
 if(persistTask){gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"DEFERRED_TURN_QUEUED",visibility:"INTERNAL",action:queued.action,taskId:queued.id,day:gameState.world?.state?.day||1,at:Date.now()})}
 if(deferredDirector.timer)clearTimeout(deferredDirector.timer);
 deferredDirector.timer=setTimeout(()=>{deferredDirector.timer=0;void runDeferredDirector()},Math.max(250,Number(delay)||900))
}
function resumeDeferredDirectorQueue(){
 if(!gameState||!aiStatus.aiConfigured)return;
 for(const task of gameState.world?.deferredTurns||[])scheduleDeferredDirector(task,500,{persistTask:false})
}
async function runDeferredDirector(){
 if(!gameState||!aiStatus.aiConfigured||deferredDirector.running||!deferredDirector.queue.length)return;
 if(aiBusy||turnSyncBusy||nonblockingScene.controller||document.hidden){if(deferredDirector.timer)clearTimeout(deferredDirector.timer);deferredDirector.timer=setTimeout(()=>{deferredDirector.timer=0;void runDeferredDirector()},1500);return}
 if(historyBackground.running){preemptBackgroundHistory();if(deferredDirector.timer)clearTimeout(deferredDirector.timer);deferredDirector.timer=setTimeout(()=>{deferredDirector.timer=0;void runDeferredDirector()},350);return}
 if(worldQualityBackground.running){preemptBackgroundWorldQuality();if(deferredDirector.timer)clearTimeout(deferredDirector.timer);deferredDirector.timer=setTimeout(()=>{deferredDirector.timer=0;void runDeferredDirector()},350);return}
 if(worldBackground.running){preemptBackgroundWorldEvolution();if(deferredDirector.timer)clearTimeout(deferredDirector.timer);deferredDirector.timer=setTimeout(()=>{deferredDirector.timer=0;void runDeferredDirector()},350);return}
 const task=deferredDirector.queue[0],state=gameState,sessionToken=captureStateSession(),worldId=gameState.world?.id,ctrl=new AbortController(),debugStarted=Date.now();
 deferredDirector.running=true;deferredDirector.controller=ctrl;
 gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"DEFERRED_TURN_STARTED",visibility:"INTERNAL",action:task.action,day:gameState.world?.state?.day||1,at:Date.now()});recordDebug("DEFERRED_TURN_STARTED",{action:task.action,queued:deferredDirector.queue.length});
 try{
  const snapshot=buildSnapshot(state),basePlan=task.plan||planStateSync({action:task.action,intent:task.intent||{},roll:task.roll||{},snapshot}),plan=deferredPlanFrom(basePlan,currentStateRevision(state));
  const patch=await generateStatePatch(task.action,task.roll,snapshot,plan,{signal:ctrl.signal,intent:task.intent});
  if(ctrl.signal.aborted||!isCurrentStateSession(sessionToken)||state.world?.id!==worldId)return;
  const committed=patch?commitStatePatch(state,patch,plan,{action:task.action,roll:task.roll}):{applied:false,empty:true};
  if(committed.stale)throw new Error("STATE_PATCH_STALE");
  deferredDirector.queue.shift();removePersistedDeferredTurn(task.id);recordDebug("DEFERRED_TURN_APPLIED",{action:task.action,elapsedMs:Date.now()-debugStarted,remaining:deferredDirector.queue.length,operations:patch?.operations?.length||0,revision:currentStateRevision(state),rebased:committed.rebased===true});await persist(state,sessionToken);await refresh()
 }catch(e){
  if(!ctrl.signal.aborted){
   task.attempts=(Number(task.attempts)||0)+1;
   state?.events?.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"DEFERRED_TURN_FAILED",visibility:"INTERNAL",action:task.action,reason:e?.message||String(e),attempt:task.attempts,day:gameState?.world?.state?.day||1,at:Date.now()});recordDebug("DEFERRED_TURN_FAILED",{action:task.action,attempt:task.attempts,elapsedMs:Date.now()-debugStarted,error:e?.message||String(e)});
   if(task.attempts>=2){deferredDirector.queue.shift();removePersistedDeferredTurn(task.id)}else{const saved=state?.world?.deferredTurns?.find(x=>x.id===task.id);if(saved)saved.attempts=task.attempts}
   await persist(state,sessionToken).catch(()=>{})
  }
 }finally{
  if(deferredDirector.controller===ctrl)deferredDirector.controller=null;deferredDirector.running=false;
  if(deferredDirector.queue.length){if(deferredDirector.timer)clearTimeout(deferredDirector.timer);deferredDirector.timer=setTimeout(()=>{deferredDirector.timer=0;void runDeferredDirector()},ctrl.signal.aborted?900:500)}
  else scheduleWorldEvolution("post_deferred_turn",5000)
 }
}
function scheduleHistoryDeepening(reason="history_research",delay=1800){
 if(developerAutotestActive||!gameState||!aiStatus.aiConfigured)return;const need=historyDeepeningNeed(gameState);if(!need.required)return;
 historyBackground.lastReason=String(reason||need.reasons?.[0]||"history_research").slice(0,180);
 if(historyBackground.timer)clearTimeout(historyBackground.timer);
 historyBackground.timer=setTimeout(()=>{historyBackground.timer=0;void runBackgroundHistoryDeepening()},Math.max(450,Number(delay)||1800))
}
async function runBackgroundHistoryDeepening(){
 if(developerAutotestActive||!gameState||!aiStatus.aiConfigured||historyBackground.running)return;
 const need=historyDeepeningNeed(gameState);if(!need.required)return;
 if(aiBusy||turnSyncBusy||nonblockingScene.controller||deferredDirector.running||deferredDirector.queue.length||worldBackground.running||worldQualityBackground.running||gameState.combat?.active||document.hidden){scheduleHistoryDeepening(historyBackground.lastReason,2600);return}
 const plan=planHistoryDeepening(gameState,need.historyId);if(!plan)return;
 const state=gameState,sessionToken=captureStateSession(),worldId=gameState.world?.id,ctrl=new AbortController(),startedAt=Date.now();historyBackground.running=true;historyBackground.controller=ctrl;historyBackground.plan=plan;
 gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"HISTORY_DEEPENING_BACKGROUND_STARTED",visibility:"INTERNAL",historyId:plan.historyId,targetDepth:plan.targetDepth,planId:plan.id,day:gameState.world?.state?.day||1,at:Date.now()});recordDebug("HISTORY_DEEPENING_BACKGROUND_STARTED",{historyId:plan.historyId,targetDepth:plan.targetDepth,planId:plan.id});
 try{
  const candidate=await generateHistoryDeepening(state,plan,{signal:ctrl.signal});
  if(ctrl.signal.aborted||!isCurrentStateSession(sessionToken)||state.world?.id!==worldId){abortHistoryDeepening(state||{world:{}},plan,"HISTORY_BACKGROUND_PREEMPTED");return}
  if(!candidate)throw new Error("HISTORY_DEEPENING_EMPTY");
  const valid=validateHistoryDeepeningCandidate(state,plan,candidate);if(!valid.valid)throw new Error("HISTORY_DEEPENING_INVALID:"+valid.errors.join(","));
  const committed=commitHistoryDeepening(state,plan,candidate);if(!committed.ok)throw new Error("HISTORY_DEEPENING_COMMIT_FAILED:"+committed.errors.join(","));
  const documentIds=registerHistoryDeepeningDocuments(state,plan.historyId,committed.added.documents),relicSeedIds=registerHistoryRelicSeeds(state,plan.historyId,committed.added.relics);
  bumpStateRevision(state,"HISTORY_DEEPENING");historyBackground.failures=0;
  recordDebug("HISTORY_DEEPENING_BACKGROUND_COMPLETED",{historyId:plan.historyId,depth:committed.depth,documents:documentIds.length,relicSeeds:relicSeedIds.length,elapsedMs:Date.now()-startedAt});
  await persist(state,sessionToken);scheduleWorldQualityCritic("post_history_deepening",2200)
 }catch(e){
  if(plan&&gameState)abortHistoryDeepening(state,plan,e?.message||"HISTORY_DEEPENING_FAILED");
  if(!ctrl.signal.aborted){historyBackground.failures=Math.min(4,(Number(historyBackground.failures)||0)+1);gameState?.events?.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"HISTORY_DEEPENING_BACKGROUND_FAILED",visibility:"INTERNAL",historyId:plan?.historyId,reason:e?.message||String(e),day:gameState?.world?.state?.day||1,at:Date.now()});recordDebug("HISTORY_DEEPENING_BACKGROUND_FAILED",{historyId:plan?.historyId,error:e?.message||String(e),elapsedMs:Date.now()-startedAt})}
 }finally{
  if(historyBackground.controller===ctrl)historyBackground.controller=null;historyBackground.running=false;historyBackground.plan=null
 }
}
function scheduleWorldQualityCritic(reason="background_quality",delay=1400){
 if(developerAutotestActive||!gameState||!aiStatus.aiConfigured)return;const need=backgroundQualityNeed(gameState);if(!need.required)return;
 worldQualityBackground.lastReason=String(reason||need.reason||"background_quality").slice(0,180);
 if(worldQualityBackground.timer)clearTimeout(worldQualityBackground.timer);
 worldQualityBackground.timer=setTimeout(()=>{worldQualityBackground.timer=0;void runBackgroundWorldQualityCritic()},Math.max(350,Number(delay)||1400))
}
async function runBackgroundWorldQualityCritic(options={}){
 const allowAutotest=options?.allowAutotest===true;
 if((developerAutotestActive&&!allowAutotest)||!gameState||!aiStatus.aiConfigured||worldQualityBackground.running)return;
 const need=backgroundQualityNeed(gameState);if(!need.required)return;
 if(aiBusy||turnSyncBusy||nonblockingScene.controller||deferredDirector.running||deferredDirector.queue.length||worldBackground.running||historyBackground.running||gameState.combat?.active||document.hidden){scheduleWorldQualityCritic(need.reason,2600);return}
 const state=gameState,sessionToken=captureStateSession(),worldId=gameState.world?.id,baseVersion=Number(gameState.world?.version)||1,ctrl=new AbortController(),startedAt=Date.now();
 worldQualityBackground.running=true;worldQualityBackground.controller=ctrl;
 gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"BACKGROUND_QUALITY_CRITIC_STARTED",visibility:"INTERNAL",reason:need.reason,worldVersion:baseVersion,day:gameState.world?.state?.day||1,at:Date.now()});
 recordDebug("BACKGROUND_QUALITY_CRITIC_STARTED",{reason:need.reason,worldVersion:baseVersion});
 try{
  const result=await runWorldQualityCritic(state,{signal:ctrl.signal});
  if(ctrl.signal.aborted||!isCurrentStateSession(sessionToken)||state.world?.id!==worldId)return;
  if(!result){recordBackgroundQualityReview(state,{error:"BACKGROUND_CRITIC_UNAVAILABLE"});return}
  if(Number(state.world?.version)!==baseVersion){recordDebug("BACKGROUND_QUALITY_CRITIC_STALE_DISCARDED",{baseVersion,currentVersion:state.world?.version});scheduleWorldQualityCritic("stale_retry",1800);return}
  const repair=result.repairPatch?applyUnseenWorldRepair(state,result.repairPatch):{applied:false,modified:[]};
  recordBackgroundQualityReview(state,{evaluation:result.evaluation,repair});
  if(repair.applied)bumpStateRevision(state,"BACKGROUND_QUALITY_REPAIR");
  worldQualityBackground.failures=0;
  state.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"BACKGROUND_QUALITY_CRITIC_COMPLETED",visibility:"INTERNAL",overall:result.evaluation?.overall??null,repairCount:repair.modified?.length||0,day:gameState.world?.state?.day||1,at:Date.now()});
  recordDebug("BACKGROUND_QUALITY_CRITIC_COMPLETED",{overall:result.evaluation?.overall??null,repairCount:repair.modified?.length||0,elapsedMs:Date.now()-startedAt});
  await persist(state,sessionToken);if(repair.applied)await refresh()
 }catch(e){
  if(!ctrl.signal.aborted){worldQualityBackground.failures=Math.min(4,(Number(worldQualityBackground.failures)||0)+1);recordBackgroundQualityReview(state,{error:e?.message||String(e)});recordDebug("BACKGROUND_QUALITY_CRITIC_FAILED",{error:e?.message||String(e),elapsedMs:Date.now()-startedAt})}
 }finally{
  if(worldQualityBackground.controller===ctrl)worldQualityBackground.controller=null;worldQualityBackground.running=false
 }
}
function pendingRuntimeGenerationPlan(state=gameState){
 return state?.world?.lazyGeneration?.plans?.find(x=>x?.status==="PLANNED"&&x?.checkpoint?.stage)||null
}
function runtimeStageDelta(stage,generation){
 const empty={locations:[],npcs:[],factions:[],sideQuests:[],definitions:[]};
 if(stage==="RUNTIME_GEOGRAPHY")return {...empty,locations:generation?.locations||[],definitions:generation?.definitions||[]};
 if(stage==="RUNTIME_SOCIETY")return {...empty,factions:generation?.factions||[]};
 if(stage==="RUNTIME_CAST")return {...empty,npcs:generation?.npcs||[]};
 if(stage==="RUNTIME_QUESTS")return {...empty,sideQuests:generation?.sideQuests||[]};
 return empty
}
async function commitRuntimeStageCheckpoint(plan,{stage,generation,region="",reason=""}={},sessionToken=captureStateSession(),state=gameState){
 if(!state||!plan||!stage)return null;if(!isCurrentStateSession(sessionToken))throw new DOMException("State session replaced","AbortError");
 if(stage==="RUNTIME_SOCIETY")enrichGeneratedLocations(state,generation?.locations||[]);
 const delta=runtimeStageDelta(stage,generation),added=canonizeGeneration(state,delta),checkpoint=recordLazyGenerationCheckpoint(state,plan,{stage,generation,added});
 if(!checkpoint.ok)throw new Error(checkpoint.error||"LAZY_CHECKPOINT_FAILED");
 bumpStateRevision(state,"RUNTIME_WORLD_CHECKPOINT_"+stage);
 state.events??=[];state.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_STAGE_COMMITTED",visibility:"INTERNAL",stage,planId:plan.id,region:region||plan.region||"",reason:reason||plan.reason||"",added:Object.fromEntries(Object.entries(added).map(([k,v])=>[k,v.length])),day:state.world?.state?.day||1,at:Date.now()});
 recordDebug("WORLD_EVOLUTION_STAGE_COMMITTED",{stage,planId:plan.id,worldVersion:state.world?.version,added:Object.fromEntries(Object.entries(added).map(([k,v])=>[k,v.length]))});
 await persist(state,sessionToken);return checkpoint.checkpoint
}
function scheduleWorldEvolution(reason="background_gameplay",delay=1600){
 if(developerAutotestActive||!gameState||!aiStatus.aiConfigured)return;worldBackground.lastReason=String(reason||"background_gameplay").slice(0,180);worldBackground.queued=true;
 if(worldBackground.timer)clearTimeout(worldBackground.timer);
 const cooldown=Math.max(0,Number(worldBackground.cooldownUntil||0)-Date.now()),wait=Math.max(250,Number(delay)||1600,cooldown);
 worldBackground.timer=setTimeout(()=>{worldBackground.timer=0;void runBackgroundWorldEvolution()},wait)
}
async function runBackgroundWorldEvolution(){
 if(developerAutotestActive||!gameState||!aiStatus.aiConfigured||worldBackground.running)return;
 const idleRemaining=backgroundIdleRemaining();if(idleRemaining>0){scheduleWorldEvolution(worldBackground.lastReason,Math.max(1000,idleRemaining));return}
 if(aiBusy||turnSyncBusy||nonblockingScene.controller||deferredDirector.running||deferredDirector.queue.length||worldQualityBackground.running||historyBackground.running||gameState.combat?.active||document.hidden){scheduleWorldEvolution(worldBackground.lastReason,2400);return}
 const evolution=worldEvolutionNeed(gameState),expand=needsExpansion(gameState),pendingPlan=pendingRuntimeGenerationPlan(gameState);
 if(!expand&&!evolution.required&&!pendingPlan){worldBackground.queued=false;return}
 const state=gameState,sessionToken=captureStateSession(),worldId=gameState.world?.id,reason=pendingPlan?.reason||(evolution.required?evolution.reason:(worldBackground.lastReason||"background_gameplay")),plan=pendingPlan||planLazyGeneration(gameState,{reason}),ctrl=new AbortController(),debugStarted=Date.now();
 worldBackground.running=true;worldBackground.queued=false;worldBackground.controller=ctrl;
 gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_BACKGROUND_STARTED",visibility:"INTERNAL",reason,planId:plan.id,day:gameState.world?.state?.day||1,at:Date.now()});recordDebug("WORLD_EVOLUTION_BACKGROUND_STARTED",{reason,planId:plan.id});
 try{
  const ex=await generateRegionExpansion(state,reason,{signal:ctrl.signal,plan,onStage:stage=>commitRuntimeStageCheckpoint(plan,stage,sessionToken,state)});
  if(ctrl.signal.aborted||!isCurrentStateSession(sessionToken)||state.world?.id!==worldId){if(!hasLazyGenerationCheckpoint(plan))abortLazyGeneration(state||{world:{}},plan,"BACKGROUND_PREEMPTED");return}
  if(!ex?.generation)throw new Error("RUNTIME_EXPANSION_EMPTY");
  const lazyValidation=validateLazyGenerationCandidate(state,ex.generation,plan,{added:plan.checkpoint?.added});if(!lazyValidation.valid)throw new Error("LAZY_GENERATION_CONTRACT_FAILED:"+lazyValidation.errors.join(","));
  const added=plan.checkpoint?.added||canonizeGeneration(state,ex.generation),committed=commitLazyGeneration(state,plan,ex.generation,added,{sourceProvider:ex.generationSource?.provider,sourceModel:ex.generationSource?.model});if(!committed.ok)throw new Error("LAZY_GENERATION_COMMIT_FAILED:"+committed.errors.join(","));
  recordExpansion(state,ex.region||plan.region||"未知邊境",ex.reason||reason);state.world.state.flags.requestExpansion=false;if(ex.quality)state.world.quality={...(state.world.quality||{}),runtimeLastExpansion:ex.quality};markWorldEvolution(state,{reason});bumpStateRevision(state,"BACKGROUND_WORLD_EVOLUTION");worldBackground.failures=0;worldBackground.cooldownUntil=0;state.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_BACKGROUND_APPLIED",visibility:"INTERNAL",reason,planId:plan.id,claimIds:committed.claimIds,day:state.world?.state?.day||1,at:Date.now()});recordDebug("WORLD_EVOLUTION_BACKGROUND_APPLIED",{reason,planId:plan.id,elapsedMs:Date.now()-debugStarted,quality:ex.quality?.overall??null});await persist(state,sessionToken);scheduleWorldQualityCritic("post_world_evolution",1800)
 }catch(e){
  const checkpointed=hasLazyGenerationCheckpoint(plan);if(plan.status==="PLANNED"&&!checkpointed)abortLazyGeneration(state,plan,e?.message||"BACKGROUND_FAILED");
  if(!ctrl.signal.aborted){
   const error=e?.message||String(e),timedOut=/AI_TIMEOUT/.test(error);worldBackground.failures=Math.min(6,(Number(worldBackground.failures)||0)+1);
   const cooldownMs=checkpointed?12000:(timedOut?Math.min(15*60*1000,2*60*1000*(2**(worldBackground.failures-1))):60*1000);worldBackground.cooldownUntil=Date.now()+cooldownMs;
   console.warn("background world evolution fallback",e);state?.events?.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_BACKGROUND_FAILED",visibility:"INTERNAL",reason:error,planId:plan.id,cooldownMs,day:state?.world?.state?.day||1,at:Date.now()});recordDebug("WORLD_EVOLUTION_BACKGROUND_FAILED",{reason,planId:plan.id,error,elapsedMs:Date.now()-debugStarted,cooldownMs,failures:worldBackground.failures})
  }
 }finally{
  if(worldBackground.controller===ctrl)worldBackground.controller=null;worldBackground.running=false;
  if(isCurrentStateSession(sessionToken)&&state&&aiStatus.aiConfigured){const next=worldEvolutionNeed(state),pending=pendingRuntimeGenerationPlan(state);if(pending||needsExpansion(state)||next.required)scheduleWorldEvolution(pending?.reason||next.reason||reason,ctrl.signal.aborted?BACKGROUND_IDLE_GRACE_MS:9000)}
 }
}
function beginPlayerActionFlight(label){
 playerActionFlight.active=true;playerActionFlight.label=String(label||"").trim().slice(0,240)||"處理目前行動";playerActionFlight.startedAt=Date.now();
 recordDebug("PLAYER_ACTION_UI_LOCKED",{action:playerActionFlight.label});renderSuggestions();setPlayerActionControlsLocked(true,"正在處理已選行動…");updateAIStatusBadge()
}
function finishPlayerActionFlight(action="",reason="completed"){
 if(!playerActionFlight.active)return;
 const label=playerActionFlight.label,elapsedMs=Date.now()-playerActionFlight.startedAt;playerActionFlight.active=false;playerActionFlight.label="";playerActionFlight.startedAt=0;
 recordDebug("PLAYER_ACTION_UI_UNLOCKED",{action:String(action||label).slice(0,240),reason,elapsedMs});
 setPlayerActionControlsLocked(aiBusy||turnSyncBusy,aiBusy?"AI 正在處理你的行動…":turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"");updateAIStatusBadge()
}
function setPlayerActionControlsLocked(locked,reason=""){
 const on=Boolean(locked);
 qsa("#choices button,#freeActionForm button,#freeAction,#otherActionBtn,[data-combat-action]").forEach(el=>{el.disabled=on;el.setAttribute("aria-disabled",String(on))});
 const choices=$("#choices"),form=$("#freeActionForm");if(choices)choices.dataset.locked=on?"true":"false";if(form)form.dataset.locked=on?"true":"false";
 const free=$("#freeAction");if(free&&on&&reason)free.placeholder=reason;else if(free&&!on&&!gameState?.combat?.active)free.placeholder=uiText("自由行動：描述你想做的事……",activeLocale)
}
function renderActivityStatus(){
 const panel=$("#activityStatus");if(!panel)return;
 const busy=aiBusy||turnSyncBusy||playerActionFlight.active;
 panel.hidden=!busy;
 const text=busy?uiText(aiBusy?"AI 正在思考…":"正在處理已選行動…",activeLocale):"";
 const label=$("#activityLabel");if(label.textContent!==text)label.textContent=text;
 const started=aiBusy?aiThinkingStartedAt:0;
 $("#activityElapsed").textContent=busy&&started?Math.max(0,Math.floor((Date.now()-started)/1000))+"s":"";
}
function updateAIStatusBadge(label=""){
 renderActivityStatus();
 const badge=$("#aiBadge");if(!badge)return;
 if(aiBusy&&turnSyncBusy){badge.textContent="PLAYER ACTION";badge.classList.add("thinking");badge.title=label||"Player Action AI 正在優先處理玩家可見結果"}
 else if(aiBusy){badge.textContent="AI THINKING";badge.classList.add("thinking");badge.title=label||"AI 正在處理目前行動…"}
 else if(turnSyncBusy){badge.textContent="STATE SYNC";badge.classList.add("thinking");badge.title=turnSyncLabel||"State Sync AI 正在提交必要 Canon；完成後立即交還玩家控制"}
 else if(playerActionFlight.active||nonblockingScene.controller){badge.textContent="PLAYER ACTION";badge.classList.add("thinking");badge.title=label||"已鎖定目前行動，等待 Player Action AI 完成後才會提供下一批行動"}
 else{badge.textContent=aiStatus.aiConfigured?"AI ONLINE":"LOCAL";badge.classList.remove("thinking");badge.title=""}
}
function setTurnSyncing(on,label="AI 正在同步必要世界狀態…"){
 turnSyncBusy=Boolean(on);turnSyncLabel=turnSyncBusy?label:"";
 if(turnSyncBusy){preemptBackgroundAI();setPlayerActionControlsLocked(true,"STATE SYNC：完成後即可繼續行動")}
 else setPlayerActionControlsLocked(aiBusy||playerActionFlight.active,playerActionFlight.active?"正在處理已選行動…":"自由行動：描述你想做的事……");
 const n=$("#narrative");if(turnSyncBusy&&n)n.dataset.syncing=turnSyncLabel;else if(n)delete n.dataset.syncing;
 updateAIStatusBadge()
}
let aiThinkingTimer=0,aiThinkingStartedAt=0,aiThinkingLabel="";
function renderAIThinkingProgress(){if(!aiBusy)return;const elapsed=Math.max(0,Math.floor((Date.now()-aiThinkingStartedAt)/1000)),hint=elapsed>=20?` · ${uiText("AI 回應較慢，必要時會自動切換 Engine 備援",activeLocale)}`:elapsed>=8?` · ${uiText("仍在等待 AI 回應",activeLocale)}`:"",message=`${aiThinkingLabel} · ${elapsed}s${hint}`;updateAIStatusBadge(message);const n=$("#narrative");if(n)n.dataset.thinking=message}
function clearActionRecoveryNotice(){const n=$("#narrative");if(n)delete n.dataset.recovery}
function showActionRecoveryNotice(message){const text=uiText(String(message||"").trim(),activeLocale);if(!text)return;const n=$("#narrative");if(n)n.dataset.recovery=text;const badge=$("#aiBadge");if(badge)badge.title=text}
function setAIThinking(on,label=uiText("AI 正在思考…",activeLocale)){
 if(on){preemptBackgroundAI();if(!aiBusy)aiThinkingStartedAt=Date.now();aiThinkingLabel=label;aiBusy=true;if(aiThinkingTimer)clearInterval(aiThinkingTimer);renderAIThinkingProgress();aiThinkingTimer=setInterval(renderAIThinkingProgress,1000)}
 else{aiBusy=false;if(aiThinkingTimer){clearInterval(aiThinkingTimer);aiThinkingTimer=0}aiThinkingStartedAt=0;aiThinkingLabel="";const n=$("#narrative");if(n)delete n.dataset.thinking;updateAIStatusBadge()}
 setPlayerActionControlsLocked(on||turnSyncBusy||playerActionFlight.active,on?uiText("AI 正在處理你的行動…",activeLocale):turnSyncBusy?uiText("STATE SYNC：完成後即可繼續行動",activeLocale):playerActionFlight.active?uiText("正在處理已選行動…",activeLocale):"");qsa("[data-action],.suggestion,#helperForm button,#npcChatForm button").forEach(b=>b.disabled=on);const helperInput=$("#helperInput");if(helperInput)helperInput.disabled=on
}

async function ensureGameplayLocale(reason="runtime"){
 if(!gameState)return true;const pending=missingVisibleTranslations(gameState,activeLocale),loc=ensureWorldLocale(gameState,activeLocale);if(!pending.strings.length){loc.displayLocale=activeLocale;return true}
 if(localeTransitionBusy)return false;if(!aiStatus.aiConfigured){recordDebug("LOCALE_TRANSLATION_BLOCKED",{reason,targetLocale:activeLocale,sourceLocale:loc.sourceLocale,pending:pending.strings.length});return false}
 localeTransitionBusy=true;document.body.classList.add("locale-transition");setAIThinking(true,uiText("正在翻譯世界…",activeLocale));
 try{const bundle=await translateVisibleWorld(pending,activeLocale);applyTranslationBundle(gameState,activeLocale,bundle);const left=missingVisibleTranslations(gameState,activeLocale);if(left.strings.length)throw new Error("TRANSLATION_INCOMPLETE:"+left.strings.length);await saveWorld(gameState);recordDebug("LOCALE_TRANSLATION_READY",{reason,targetLocale:activeLocale,sourceLocale:loc.sourceLocale,count:bundle.translations?.length||0});return true}
 catch(error){recordDebug("LOCALE_TRANSLATION_FAILED",{reason,targetLocale:activeLocale,sourceLocale:loc.sourceLocale,error:error?.message||String(error)});return false}
 finally{localeTransitionBusy=false;document.body.classList.remove("locale-transition");setAIThinking(false)}
}
let renderedLocaleBusy=false;
async function ensureRenderedLocale(reason="render",root=document){
 applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);if(activeLocale==="zh-Hant")return true;const pending=documentTranslationCandidates(gameState,activeLocale,root);if(!pending.strings.length)return true;if(!aiStatus.aiConfigured){recordDebug("UI_TRANSLATION_DEFERRED",{reason,targetLocale:activeLocale,pending:pending.strings.length});return false}if(renderedLocaleBusy)return true;renderedLocaleBusy=true;try{const bundle=await translateVisibleWorld(pending,activeLocale);applySessionTranslationBundle(activeLocale,bundle);if(gameState)applyTranslationBundle(gameState,activeLocale,bundle);applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);if(gameState)await saveWorld(gameState);recordDebug("UI_TRANSLATION_READY",{reason,targetLocale:activeLocale,count:bundle.translations?.length||0});return true}catch(error){recordDebug("UI_TRANSLATION_FAILED",{reason,targetLocale:activeLocale,error:error?.message||String(error)});return false}finally{renderedLocaleBusy=false}}
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
function tradeLabel(entity){const t=entity?.trade;if(!t)return "";if(t.mode==="barter")return "以物易物"+(t.commonBarter?.length?" · "+t.commonBarter.slice(0,3).join("、"):"");const names=(t.currencies||[]).map(x=>x.name).filter(Boolean).join("、");return (names||"地方交易制度")+(t.mode&&t.mode!=="currency"?" · "+t.mode:"")}
function worldStateLabel(entity){const s=entity?.worldState;if(!s)return "";const level=(v,low,mid,high)=>Number(v)<35?low:Number(v)<65?mid:high,parts=[];if(Number.isFinite(s.safety))parts.push("安全："+level(s.safety,"危險","不穩","穩定"));if(Number.isFinite(s.supply))parts.push("供應："+level(s.supply,"短缺","正常","充足"));if(Number.isFinite(s.prosperity))parts.push("景氣："+level(s.prosperity,"蕭條","普通","繁榮"));if(Number.isFinite(s.infrastructure))parts.push("設施："+level(s.infrastructure,"破損","可用","完善"));if(Number.isFinite(s.stability)&&!Number.isFinite(s.safety))parts.push("穩定："+level(s.stability,"動盪","不穩","穩定"));if(s.statusTags?.length)parts.push(s.statusTags.slice(-3).join("、"));return parts.join(" · ")}
function companionLabel(npc){const s=npc?.companion?.status||"NONE";return s==="ACTIVE"?"同行中":s==="OFFERED"?"提出同行":s==="LEFT"?"已離隊":""}
const IMPACT_LABEL={PERSONAL:"個人",LOCAL:"地方",REGIONAL:"區域",FACTION:"勢力",WORLD:"世界"};
const RENOWN_LABEL={UNKNOWN:"無名",LOCAL_NAME:"地方知名",REGIONAL_FIGURE:"區域人物",MAJOR_FIGURE:"重要人物",LEGEND:"傳奇"};
function impactLabel(scope){return IMPACT_LABEL[scope]||scope||"地方"}
function renownLabel(tier){return RENOWN_LABEL[tier]||tier||"無名"}
let gameStageFitFrame=0;
function fitGameStage(){
 const game=$("#game"),shell=$("#game .game-shell");
 if(!game||!shell)return;
 const desktop=window.matchMedia("(min-width: 901px)").matches;
 if(!desktop){game.style.removeProperty("--ely-game-scale");return}
 const topbarHeight=$(".topbar")?.getBoundingClientRect().height||58;
 const viewportHeight=window.visualViewport?.height||window.innerHeight;
 const availableWidth=Math.max(1,window.innerWidth-24);
 const availableHeight=Math.max(1,viewportHeight-topbarHeight-24);
 const scale=Math.min(availableWidth/1720,availableHeight/860);
 game.style.setProperty("--ely-game-scale",String(Math.max(.25,Math.min(scale,1.25))))
}
function scheduleGameStageFit(){
 cancelAnimationFrame(gameStageFitFrame);
 gameStageFitFrame=requestAnimationFrame(fitGameStage)
}
function show(id){qsa(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");document.body.dataset.screen=id;void ensureRenderedLocale("screen:"+id,$("#"+id));if(id==="game"){scheduleGameStageFit();requestAnimationFrame(()=>$(".scene")?.scrollIntoView({block:"start"}));resumeDeferredDirectorQueue();scheduleWorldEvolution("gameplay_idle",1800)}}
function migrate(s){ensureWorldLocale(s,activeLocale);ensureStateSyncRuntime(s);ensureClock(s);ensureWorldSimulation(s);ensureWorldRegistry(s);ensureNpcRuntime(s);ensureFactionRuntime(s);bootstrapKnowledgeGraph(s);ensureCharacter(s);ensureTalents(s);ensureQuestProgress(s);ensureMainQuest(s);ensureCrisis(s);ensureWorldImpact(s);ensureRecognition(s);ensureCheckProfile(s);ensurePlayerOrigin(s.player);ensureItemRuntime(s);ensureNotes(s);repairPlayerLocation(s);initializeWeather(s);ensureSurvival(s);ensureMagicRuntime(s);ensureTravelNetwork(s);ensureDungeonSites(s);ensurePlayerExperience(s);s.player.wallet??={};s.player.calendarKnown??=false;s.world.deferredTurns??=[];s.quests??={main:{id:"Q-main",title:"在陌生世界活下來",stage:0,status:"ACTIVE",objectives:["理解自己身處何地","尋找安全的落腳處","找到第一個可以交流的人"]}};s.discoveries??=0;if(!s.sceneTitle||s.sceneTitle==="陌生世界的第一天")s.sceneTitle=deriveSceneTitle(s);return s}
async function refresh({skipLocale=false}={}){const exists=await hasWorld().catch(()=>false);$("#continueBtn").disabled=!exists;updateAIStatusBadge();if(!gameState){applyDocumentLocale(activeLocale);await ensureRenderedLocale("refresh_no_world",document.querySelector(".screen.active")||document.body);return true}migrate(gameState);if(!skipLocale){const ready=await ensureGameplayLocale("refresh");if(!ready)return false}recordGameplayStateChanges(gameState);document.body.dataset.worldGenre=gameState.world?.seedContract?.genre||"";$("#worldName").textContent=gameState.player?.worldNameKnown?lt(gameState.world.name):uiText("未知世界",activeLocale);$("#worldMeta").textContent=formatWorldTime(gameState);if($("#topLocation"))$("#topLocation").textContent=lt(playerVisibleLocationName(gameState));if($("#topTime"))$("#topTime").textContent=formatWorldTime(gameState);$("#knowledgePct").textContent=`${gameState.player.knowledgeScore}%`;const impactCap=impactCapability(gameState),recognition=recognitionSnapshot(gameState);if($("#impactStat"))$("#impactStat").textContent=impactLabel(impactCap.maxScope);if($("#renownStat"))$("#renownStat").textContent=`${renownLabel(recognition.tier)} · ${recognition.renown}`;$("#hpStat").textContent=`${gameState.player.hp} / ${gameState.player.maxHp}`;const trade=currentTradeProfile(gameState),balances=walletSummary(gameState);$("#currencyLabel").textContent=uiText("資產",activeLocale);if(balances.length)$("#goldStat").textContent=balances.slice(0,3).map(x=>`${x.currency?.symbol||""}${x.amount} ${x.currency?.name||x.id}`).join(" · ");else if(trade?.currencies?.length){const cur=trade.currencies[0];$("#goldStat").textContent=`${cur.symbol||""}${gameState.player.wallet?.[cur.id]||0} ${cur.name}`}else if(trade?.mode==="barter")$("#goldStat").textContent="以物易物";else $("#goldStat").textContent="—";$("#playerNameStat").textContent=gameState.player.name||"無名者";if($("#playerInitial"))$("#playerInitial").textContent=(gameState.player.name||"?").trim().slice(0,1)||"?";const talentInfo=talentSnapshot(gameState),survivalInfo=survivalSnapshot(gameState);$("#levelStat").textContent=`Lv.${gameState.player.level} · XP ${gameState.player.xp}/${xpNeeded(gameState.player.level)}${talentInfo.points?` · TP ${talentInfo.points}`:""}`;
 if($("#conditionStat"))$("#conditionStat").textContent=survivalInfo.conditions.length?survivalInfo.conditions.join("、"):"穩定";
 if($("#satietyStat"))$("#satietyStat").textContent=`${Math.round(survivalInfo.satiety)} / 100`;
 if($("#fatigueStat"))$("#fatigueStat").textContent=`${Math.round(survivalInfo.fatigue)} / 100`;
 if($("#magicStat"))$("#magicStat").textContent=gameState.player.magic?`${Math.round(gameState.player.magic.strain||0)} / ${gameState.player.magic.capacity||100}`:"—";$("#location").textContent=lt(playerVisibleLocationName(gameState));const weather=weatherUiSnapshot(gameState),weatherEl=$("#weather");if(weatherEl){weatherEl.textContent=weather.observableName;weatherEl.title=weather.sensoryCue||weather.observableName;weatherEl.dataset.danger=String(weather.danger||0)}document.body.dataset.weatherDanger=String(weather.danger||0);$("#sceneTitle").textContent=lt(gameState.sceneTitle||deriveSceneTitle(gameState));$("#narrative").textContent=lt(gameState.narrative);$("#questTitle").textContent=lt(gameState.quests.main.title);$("#questText").textContent=lt(gameState.quests.main.objectives[0]||"");renderKnownNpcs();renderSuggestions();const free=$("#freeAction");if(free){free.disabled=aiBusy||turnSyncBusy||playerActionFlight.active||Boolean(gameState.combat?.active);free.placeholder=gameState.combat?.active?"戰鬥中請使用下方戰鬥行動按鈕":playerActionFlight.active?"正在處理：「"+playerActionFlight.label+"」":turnSyncBusy?"STATE SYNC：同步完成後即可繼續行動":"自由行動：例如「我想仔細檢查眼前可見的物件」"}if(document.body.dataset.screen==="game"&&!aiBusy&&!turnSyncBusy){scheduleWorldEvolution("gameplay_idle",1600);scheduleHistoryDeepening("knowledge_refresh",2100)}applyDocumentLocale(activeLocale);applyWorldLocaleToDocument(gameState,activeLocale);await ensureRenderedLocale("refresh",document.querySelector(".screen.active")||document.body);return true}
async function persist(state=gameState,sessionToken=null){if(state){
 if(sessionToken&&!isCurrentStateSession(sessionToken))return false;
 const day=Number(state.world?.state?.day)||1;ensurePlayerExperience(state);
 const projected=projectObservableWorldChanges(state,state.narrative);if(projected.projected.length){state.narrative=projected.narrative;recordDebug("WORLD_IMPACT_PROJECTED",{events:projected.projected,day,location:state.player?.location||""})}
 const recap=maybeJourneyCheckpoint(state);if(recap){
  recordDebug("SESSION_CHECKPOINT",{reason:recap.reason,day:recap.day,location:recap.location,worldChanges:recap.worldChanges,discoveries:recap.discoveries,unresolved:recap.unresolved})
 }
 maintainSession(state);if(!developerAutotestActive)await saveWorld(state)

 if(sessionToken&&!isCurrentStateSession(sessionToken))return false;return true
}return false}
function fallbackActionButtons(action=""){const contextual=roleplayFallbackSuggestions(gameState||{},{action});if(contextual.length)return contextual.slice(0,4);return ["檢查地面與附近物件上最新留下的痕跡","找一個正在避開人群的人，問他剛才看見了甚麼","沿著最明顯的新鮮痕跡走一小段，確認它通往哪裡","找一個能看見出入口的位置觀察人流"]}
function rememberRejectedSuggestion(action){
 const value=String(action||"").trim();if(!value)return;
 suggestionRefresh.rejected=[...suggestionRefresh.rejected.filter(x=>x!==value),value].slice(-8)
}
function refreshSuggestedActions(){
 if(!gameState||gameState.combat?.active||aiBusy||turnSyncBusy||playerActionFlight.active)return;
 const previousIntents=structuredClone(gameState.suggestionIntents||[]),previousSuggestions=[...(gameState.suggestions||[])],exclude=[...previousIntents,...previousSuggestions.map(x=>({label:String(x||""),action:String(x||"")})),...suggestionRefresh.rejected.map(x=>({label:x,action:x}))];
 try{
  const set=regenerateContextualActionSet(gameState,{exclude});
  if(set.primary.length!==3)throw new Error("SUGGESTION_REFRESH_INSUFFICIENT");
  gameState.suggestionIntents=set.all;gameState.suggestions=set.all.map(x=>x.label);suggestionRefresh.exclude=exclude;suggestionRefresh.error=false;suggestionRefresh.message="已重新產生 3 個新的可執行建議。";
  recordDebug("SUGGESTIONS_REFRESHED",{count:set.primary.length,excluded:exclude.length,location:gameState.player?.location||""})
 }catch(error){
  gameState.suggestionIntents=previousIntents;gameState.suggestions=previousSuggestions;suggestionRefresh.exclude=[];suggestionRefresh.error=true;suggestionRefresh.message="未能產生 3 個新的可執行建議；已保留原本建議。";
  recordDebug("SUGGESTIONS_REFRESH_FAILED",{error:error?.message||String(error),preserved:previousSuggestions.length})
 }
 renderSuggestions()
}
function renderSuggestions(){
 const box=$("#choices");if(!box)return;
 if(playerActionFlight.active&&!gameState?.combat?.active){
  box.innerHTML=`<div class="action-group main-actions pending-action-group"><div class="action-group-title">已選行動 · AI 處理中</div><div class="action-grid"><button type="button" class="context-action pending-action" disabled aria-disabled="true"><span class="action-label">${esc(playerActionFlight.label)}</span><small class="action-meta">正在鎖定這次行動，完成後才會更新下一批可選行動</small></button></div></div>`;
  setPlayerActionControlsLocked(true,uiText("正在處理已選行動…",activeLocale));return
 }
 if(gameState?.combat?.active){box.innerHTML=`<div class="action-group main-actions"><div class="action-group-title">${esc(localizedStaticText("戰鬥行動",activeLocale))}</div><div class="action-grid"><button type="button" data-combat-action="attack">${esc(localizedStaticText("攻擊",activeLocale))}</button><button type="button" data-combat-action="defend">${esc(localizedStaticText("防禦",activeLocale))}</button><button type="button" data-combat-action="retreat">${esc(localizedStaticText("撤退",activeLocale))}</button></div></div>`;box.querySelectorAll("[data-combat-action]").forEach(b=>b.onclick=()=>runCombatAction(b.dataset.combatAction));setPlayerActionControlsLocked(aiBusy||turnSyncBusy||playerActionFlight.active,playerActionFlight.active?"正在處理已選行動…":turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"");return}
 const source=(gameState?.suggestionIntents?.length?gameState.suggestionIntents:(gameState?.suggestions?.length?gameState.suggestions:fallbackActionButtons())),set=buildContextualActionSet(gameState,source,{exclude:suggestionRefresh.exclude});
 gameState.suggestionIntents=set.all;gameState.suggestions=set.all.map(x=>x.label);
 const card=x=>{const p=suggestionPresentation(gameState,x),classes=["context-action",x.progression?"progression-action":"",["HIGH","EXTREME"].includes(x.risk)?"danger-action":""].filter(Boolean).join(" ");return `<button type="button" class="${classes}" data-suggestion-index="${set.all.indexOf(x)}"><span class="action-label">${esc(localizedStaticText(lt(p.label),activeLocale))}</span>${p.meta?`<small class="action-meta">${esc(localizedStaticText(lt(p.meta),activeLocale))}</small>`:""}${p.approach?`<span class="action-approach">${esc(localizedStaticText(lt(p.approach),activeLocale))}</span>`:""}</button>`};
 box.innerHTML=`<div class="action-group main-actions"><div class="action-group-title">主要建議</div><div class="action-grid">${set.primary.map(card).join("")}</div><div class="settings-actions"><button type="button" id="refreshSuggestionsBtn" class="secondary">↻ 重新產生建議行動</button><small id="suggestionRefreshStatus" class="muted" role="${suggestionRefresh.error?"alert":"status"}" aria-live="polite">${esc(suggestionRefresh.message)}</small></div></div>${set.highRisk.length?`<div class="action-group risk-actions"><div class="action-group-title">高風險行動</div><div class="action-grid risk-grid">${set.highRisk.map(card).join("")}</div></div>`:""}<div class="action-group free-choice"><div class="action-group-title">自由行動</div><small class="muted">建議只是可行方向，不是允許行動的封閉清單；你可以自己描述任何其他動作。</small><button type="button" id="otherActionBtn" class="other-action-btn">我想做其他事情…</button></div>`;
 box.querySelectorAll("[data-suggestion-index]").forEach(b=>b.onclick=()=>{const x=set.all[Number(b.dataset.suggestionIndex)];if(x)runAction("free",x.action,{suggestion:x})});
 $("#refreshSuggestionsBtn")?.addEventListener("click",refreshSuggestedActions);
 $("#otherActionBtn")?.addEventListener("click",()=>{const form=$("#freeActionForm");form?.classList.toggle("hidden");if(form&&!form.classList.contains("hidden"))$("#freeAction")?.focus()});setPlayerActionControlsLocked(aiBusy||turnSyncBusy,turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"")
}
function renderKnownNpcs(){const dock=$("#npcDock"),box=$("#knownNpcList");if(!dock||!box||!gameState)return;const npcs=ensureWorldRegistry(gameState).npcs.filter(x=>canInteractWithNpc(gameState,x)).slice(-6),comm=worldCommunication(gameState);dock.classList.toggle("hidden",!npcs.length);box.innerHTML=npcs.map(n=>{const tag=companionLabel(n),mode=npcInteractionMode(gameState,n),where=mode==="REMOTE"?`遠距 · ${comm.name}`:"附近",visibleName=lt(playerVisibleNpcName(gameState,n));return `<button type="button" class="npc-mini" data-npc-id="${esc(n.id)}"><span>${esc((visibleName||"?").slice(0,1))}</span><div><strong>${esc(visibleName)}</strong><small>${esc(lt(n.role||""))} · ${esc(where)}${tag?` · ${esc(tag)}`:""}</small></div></button>`}).join("");box.querySelectorAll("[data-npc-id]").forEach(b=>b.onclick=()=>openNpcPanel(b.dataset.npcId))}
function openNpcPanel(npcId,answer=""){const npc=findNpc(gameState,npcId);if(!npc||npc.known!==true)return;const visibleName=lt(playerVisibleNpcName(gameState,npc)),status=npc.companion?.status||"NONE",mode=npcInteractionMode(gameState,npc),interactive=Boolean(mode),local=isNpcPresent(gameState,npc),comm=worldCommunication(gameState),actions=interactive?[`<button class="primary" data-npc-chat="${esc(npc.id)}">${mode==="REMOTE"?`透過 ${esc(comm.name)} 聯絡`:"對話"}</button>`]:[`<span class="muted">目前沒有可用的聯絡方式。</span>`];if(local&&status==="OFFERED")actions.push(`<button class="secondary" data-companion="accept" data-npc-id="${esc(npc.id)}">接受同行</button>`);else if(local&&status==="ACTIVE")actions.push(`<button class="ghost" data-companion="leave" data-npc-id="${esc(npc.id)}">請求暫時離隊</button>`);else if(local)actions.push(`<button class="secondary" data-companion="invite" data-npc-id="${esc(npc.id)}">邀請同行</button>`);openModal(`<div class="eyebrow">NPC · ${esc(companionLabel(npc)||"未同行")}</div><h2>${esc(visibleName)}</h2><p>${esc(lt(answer||npc.description||npc.role||""))}</p><div class="settings-actions">${actions.join("")}</div>`);$("#modalContent [data-npc-chat]")?.addEventListener("click",()=>openNpcConversation(npc.id));$("#modalContent [data-companion]")?.addEventListener("click",async e=>{const action=e.currentTarget.dataset.companion;let message="";if(action==="invite"){const r=inviteCompanion(gameState,npc.id);message=r.accepted?visibleName+" 接受了同行邀請。":visibleName+" 暫時沒有接受同行邀請。"}else if(action==="accept"){message=acceptCompanionOffer(gameState,npc.id)?visibleName+" 正式加入旅程。":"這個同行提議已經失效。"}else if(action==="leave"){message=dismissCompanion(gameState,npc.id)?visibleName+" 暫時離開了隊伍。":"目前無法離隊。"}bumpStateRevision(gameState,"COMPANION_ACTION");await persist();await refresh();openNpcPanel(npc.id,message)})}
function npcConversationMessages(npcId){if(!npcChatHistory.has(npcId))npcChatHistory.set(npcId,[]);return npcChatHistory.get(npcId)}
function openNpcConversation(npcId){if(!gameState)return;const npc=findNpc(gameState,npcId),mode=npcInteractionMode(gameState,npc);if(!npc||!mode)return;const visibleName=lt(playerVisibleNpcName(gameState,npc)),messages=npcConversationMessages(npcId),comm=worldCommunication(gameState),where=mode==="REMOTE"?uiText("遠距",activeLocale)+" · "+lt(comm.name):uiText("就在附近",activeLocale);openModal(`<div class="npc-chat"><div class="npc-chat-head"><div class="npc-chat-avatar">${esc((visibleName||"?").slice(0,1))}</div><div><strong>${esc(visibleName)}</strong><small>${esc(lt(npc.role||uiText("人物",activeLocale)))} · ${esc(where)}</small></div></div><div id="npcChatLog" class="npc-chat-log">${messages.length?messages.map(m=>`<div class="chat-bubble ${m.role==="player"?"player":"npc"}">${esc(m.text)}</div>`).join(""):`<div class="chat-bubble npc">${esc(lt(npc.description||npc.role||uiText("對方正等待你開口。",activeLocale)))}</div>`}</div><div><p id="npcChatStatus" class="muted"></p><form id="npcChatForm" class="npc-chat-form"><input id="npcChatInput" maxlength="240" autocomplete="off" placeholder="${esc(uiFormat("npcSay",{name:visibleName},activeLocale))}"><button class="primary" type="submit" aria-label="${esc(uiText("送出",activeLocale))}">➤</button></form></div></div>`);const log=$("#npcChatLog");if(log)log.scrollTop=log.scrollHeight;$("#npcChatInput")?.focus();$("#npcChatForm")?.addEventListener("submit",async e=>{e.preventDefault();const input=$("#npcChatInput"),q=input?.value.trim();if(q)await submitNpcConversation(npcId,q)})}
async function submitNpcConversation(npcId,q){markForegroundActivity();preemptBackgroundAI();if(!gameState||!q)return;if(turnSyncBusy){recordDebug("PLAYER_NPC_ACTION_BLOCKED_STATE_SYNC",{npcId,q:String(q||"").slice(0,180)});return}if(aiBusy)return;const conversationState=gameState,conversationSession=captureStateSession(),npc=findNpc(conversationState,npcId),mode=npcInteractionMode(conversationState,npc);if(!npc||!mode)return;const messages=npcConversationMessages(npcId);messages.push({role:"player",text:q});openNpcConversation(npcId);const visibleName=playerVisibleNpcName(conversationState,npc);setAIThinking(true,mode==="REMOTE"?uiFormat("npcRemoteContact",{name:visibleName},activeLocale):uiFormat("npcWait",{name:visibleName},activeLocale));const status=$("#npcChatStatus");if(status)status.textContent=uiText("對方正在回應……",activeLocale);let answer=uiFormat("npcNoInfo",{name:visibleName},activeLocale);try{if(aiStatus.aiConfigured)answer=await talkToDynamicNpc(conversationState,npc,q,{mode,communication:worldCommunication(conversationState)});if(!isCurrentStateSession(conversationSession)){recordDebug("NPC_CONVERSATION_STALE_DISCARDED",{npcId,worldId:conversationState.world?.id||null});return}const turn=applyNpcConversationTurn(conversationState,npc,q,answer);bumpStateRevision(conversationState,"NPC_CONVERSATION");const suffix=turn.progressed?.length?"\n\n"+uiText("你從這段對話中確認到可推進任務的新線索。",activeLocale):"";messages.push({role:"npc",text:answer+suffix});await persist(conversationState,conversationSession);if(isCurrentStateSession(conversationSession))await refresh()}catch(e){console.warn("NPC fallback",e);if(isCurrentStateSession(conversationSession))messages.push({role:"npc",text:answer})}finally{setAIThinking(false);if(isCurrentStateSession(conversationSession))openNpcConversation(npcId)}}
function bindNpcLinks(){document.querySelectorAll("#modalContent .npc-link[data-npc-id]").forEach(b=>b.onclick=()=>openNpcPanel(b.dataset.npcId))}
async function runCombatAction(action){markForegroundActivity();preemptBackgroundAI();if(!gameState?.combat?.active)return;if(turnSyncBusy){recordDebug("PLAYER_COMBAT_ACTION_BLOCKED_STATE_SYNC",{action});return}if(aiBusy)return;const r=combatAction(gameState,action);bumpStateRevision(gameState,"COMBAT_ACTION");gameState.narrative=r.summary||uiText("戰鬥局勢發生了變化。",activeLocale);gameState.sceneTitle=deriveSceneTitle(gameState,action);renderRoll(r.roll);if(!gameState.combat?.active){gameState.suggestions=fallbackActionButtons(uiText("戰鬥結束",activeLocale))}await persist();await refresh()}
function signed(n){const x=Number(n)||0;return x>0?`+${x}`:String(x)}
function renderRoll(roll,relationshipOutcome=null){$("#d20").textContent=roll.natural;const m=roll.modifiers||{},parts=[[uiText("能力",activeLocale),m.attribute],[uiText("技能",activeLocale),m.skill],[uiText("裝備",activeLocale),m.equipment],[uiText("夥伴",activeLocale),m.companion],[uiText("關係修正",activeLocale),m.relationship],[uiText("情境",activeLocale),m.situation],[uiText("天氣",activeLocale),m.weather]].filter(([,v])=>Number(v));const detail=parts.map(([k,v])=>`${k} ${signed(v)}`).join(" · ");$("#rollLabel").textContent=`D20 ${roll.natural} ${roll.bonus>=0?"+":"-"} ${Math.abs(roll.bonus)} = ${roll.total} / DC ${roll.dc}`;const relationChanges=relationshipOutcome?.changes||{},relationDetail=[[uiText("信任",activeLocale),relationChanges.trust],[uiText("尊重",activeLocale),relationChanges.respect],[uiText("畏懼",activeLocale),relationChanges.fear],[uiText("義務",activeLocale),relationChanges.obligation]].filter(([,v])=>Number(v)).map(([k,v])=>`${k} ${signed(v)}`).join(" · ");$("#rollResult").textContent=`${roll.grade.replaceAll("_"," ")}${roll.profile?.skillLabel?` · ${roll.profile.skillLabel}`:""}${detail?` · ${detail}`:""}${Number(roll.difficulty)?` · ${uiText("難度",activeLocale)} ${signed(roll.difficulty)}`:""}${relationDetail?` · ${uiText("互動後",activeLocale)}：${relationDetail}`:""}${roll.skillUp?` · ${uiText("技能提升至",activeLocale)} ${roll.skillUp.after}`:""}`;diceFeedback.play(roll)}
async function runAction(action,customText="",options={}){
 if(!gameState)return;const actionState=gameState,actionSession=captureStateSession();markForegroundActivity();preemptBackgroundAI();suggestionRefresh.exclude=[];suggestionRefresh.message="";suggestionRefresh.error=false;clearActionRecoveryNotice();
 if(turnSyncBusy){recordDebug("PLAYER_ACTION_BLOCKED_STATE_SYNC",{action:String(customText||action||"").slice(0,180)});return}
 if(aiBusy||playerActionFlight.active){recordDebug("PLAYER_ACTION_BLOCKED_SINGLE_FLIGHT",{action:String(customText||action||"").slice(0,180),pending:playerActionFlight.label});return}
 if(actionState.combat?.active){actionState.narrative="敵人仍在眼前。請使用攻擊、防禦或撤退來處理這場戰鬥。";await refresh();return}
 if(actionState.player.status==="DOWNED"){recoverFromDefeat(actionState);bumpStateRevision(actionState,"DEFEAT_RECOVERY");actionState.narrative="你在失去意識後醒來。傷勢尚未痊癒，但你仍保留已確認的世界知識。";actionState.sceneTitle=deriveSceneTitle(actionState,"醒來");actionState.suggestions=fallbackActionButtons("醒來");await persist(actionState,actionSession);return refresh()}
 const requested=String(customText||action||"").trim()||"觀察目前環境",debugTurnStarted=Date.now(),prevalidatedAssessment=options?.suggestion?trustedSuggestionAssessment(actionState,options.suggestion):null;beginPlayerActionFlight(requested);recordDebug("PLAYER_ACTION_START",{action,customText,requested,day:actionState.world?.state?.day||1,location:actionState.player?.location||""});if(markOpeningEngaged(actionState,requested))recordDebug("OPENING_HOOK_ENGAGED",{action:requested,day:actionState.world?.state?.day||1,location:actionState.player?.location||""});
 let assessment=prevalidatedAssessment;if(assessment)recordDebug("SUGGESTED_ACTION_PREVALIDATED",{action:requested,kind:assessment.kind,progression:options.suggestion?.progression===true,risk:options.suggestion?.risk,approach:options.suggestion?.approach,source:assessment.source});if(!assessment)assessment=fastLocalActionAssessment(actionState,requested);
 if(!assessment){
  if(!aiStatus.aiConfigured){actionState.narrative="這個行動需要語義判斷，但目前沒有可用的 AI Provider。基本觀察、查看背包、休息、使用明確物品與前往已知地點仍可由 Engine 直接處理。";finishPlayerActionFlight(requested,"no_provider");await refresh();return}
  setAIThinking(true,"AI 正在解析 Action Intent 並判斷必要前提…");
  try{assessment=await assessPlayerAction(actionState,requested);if(!isCurrentStateSession(actionSession))return}
  catch(e){
   console.warn("action feasibility failed",e);
   actionState.narrative="行動可行性判定暫時失敗，因此這次行動沒有執行，也沒有消耗時間。";
   actionState.events??=[];actionState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"ACTION_ASSESSMENT_FAILED",visibility:"INTERNAL",action:requested,reason:e?.message||String(e),day:actionState.world?.state?.day||1,at:Date.now()});
   finishPlayerActionFlight(requested,"assessment_failed");await persist(actionState,actionSession);await refresh();return
  }finally{setAIThinking(false)}
 }
 recordDebug("ACTION_ASSESSMENT",{action:requested,verdict:assessment?.verdict,kind:assessment?.kind,intent:assessment?.actionIntent?.intent,targetId:assessment?.actionIntent?.targetId,source:assessment?.source,confidence:assessment?.confidence,reason:assessment?.reason,latencyFromTurnStartMs:Date.now()-debugTurnStarted});
 if(assessment?.source==="ENGINE_DEGRADED"){actionState.events??=[];actionState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"ACTION_ASSESSMENT_DEGRADED",visibility:"INTERNAL",action:requested,reason:assessment.aiError||assessment.reason,day:actionState.world?.state?.day||1,at:Date.now()});showActionRecoveryNotice("AI 行動判定暫時不可用；已切換 Engine 備援並繼續本回合。");recordDebug("ACTION_ASSESSMENT_DEGRADED_VISIBLE",{action:requested,error:assessment.aiError||assessment.reason})}
  const effective=assessment?.verdict==="ADJUST"&&assessment.normalizedAction?assessment.normalizedAction:requested;
 const preboundFailForward=options?.suggestion?groundedSuggestionFailForward(actionState,options.suggestion,{success:true}):null;
 const previousSuggestions=[...(actionState.suggestions||[])],previousSuggestionIntents=[...(actionState.suggestionIntents||[])],impactBefore=ensureWorldImpact(actionState).records.length;
 if(assessment?.verdict!=="BLOCK"){
  const socialAction=assessment?.intent==="TALK"||assessment?.kind==="SOCIAL"||/(詢問|請教|交談|對話|攀談|問(?:他|她|對方|.+?怎樣|.+?如何)|告訴|回答|talk|ask|speak|tell)/i.test(effective);
  if(!socialAction){
   const localLore=resolveLocalLoreAction(actionState,effective);
   if(localLore){actionState.narrative=localLore.text;actionState.sceneTitle=deriveSceneTitle(actionState,effective);actionState.suggestions=fallbackActionButtons(effective);actionState.suggestionIntents=[];actionState.events??=[];actionState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"PLAYER_ACTION_ASSESSED",visibility:"INTERNAL",action:requested,normalizedAction:effective,assessment,day:actionState.world?.state?.day||1,at:Date.now()});bumpStateRevision(actionState,"LOCAL_LORE_ACTION");finishPlayerActionFlight(effective,"local_engine");await persist(actionState,actionSession);await refresh();return}
  }
 }
 const actionResult=performAction(actionState,action,customText,assessment),{roll,text:localText}=actionResult;actionState.narrative=localText;
 if(!actionResult.blocked)bumpStateRevision(actionState,actionResult.deterministic?"ENGINE_DETERMINISTIC_ACTION":"ENGINE_ACTION");
 recordDebug("ENGINE_ACTION_RESULT",{action:effective,blocked:Boolean(actionResult.blocked),deterministic:Boolean(actionResult.deterministic),revision:currentStateRevision(actionState),roll:roll?{natural:roll.natural,total:roll.total,dc:roll.dc,grade:roll.grade,success:roll.success,kind:roll.profile?.kind,modifiers:roll.modifiers,difficulty:roll.difficulty}:null,npcRelationship:actionResult.ruleEffects?.npcRelationship||null,elapsedMs:Date.now()-debugTurnStarted});
 if(actionResult.blocked)rememberRejectedSuggestion(effective);
 if(actionResult.blocked||actionResult.deterministic){
  const itemResult=actionResult.ruleEffects?.item;
  if(actionResult.deterministic&&itemResult?.ok&&["ITEM_SHOWN","ITEM_GIVEN"].includes(itemResult.action)&&itemResult.npcId&&aiStatus.aiConfigured){
   const npc=findNpc(actionState,itemResult.npcId);
   if(npc){
    setAIThinking(true,`${playerVisibleNpcName(actionState,npc)} 正在對你展示的物品作出反應…`);
    try{
     const message=itemResult.action==="ITEM_GIVEN"?`我把「${itemResult.itemName}」交給你。`:`我向你展示「${itemResult.itemName}」。`;
     const answer=await talkToDynamicNpc(actionState,npc,message,{mode:"LOCAL",communication:worldCommunication(actionState)});
     if(answer)actionState.narrative+=(actionState.narrative?"\n\n":"")+answer
    }catch(e){console.warn("item npc reaction fallback",e)}finally{setAIThinking(false)}
   }
  }
  actionState.sceneTitle=deriveSceneTitle(actionState,effective);actionState.suggestions=fallbackActionButtons(effective);actionState.suggestionIntents=[];finishPlayerActionFlight(effective,actionResult.blocked?"blocked":"deterministic");await persist(actionState,actionSession);await refresh();return
 }
 renderRoll(roll,actionResult.ruleEffects?.npcRelationship||null);
 actionState.sceneTitle=deriveSceneTitle(actionState,effective);actionState.suggestions=fallbackActionButtons(effective);actionState.suggestionIntents=[];
 const turnWorldId=actionState.world?.id,turnSnapshot=buildSnapshot(actionState),baseRevision=currentStateRevision(actionState);
 const syncPlan={...planStateSync({action:effective,intent:assessment?.actionIntent||{},roll,snapshot:turnSnapshot,ruleEffects:actionResult.ruleEffects}),baseRevision};
 if(syncPlan.mode==="ENGINE_ONLY"&&roll?.success===true&&preboundFailForward){
  const groundedPlan={...syncPlan,capabilities:["DISCOVER_FACT"],immediateCapabilities:["DISCOVER_FACT"],baseRevision:currentStateRevision(actionState)},grounded=commitGroundedProgressionFallback(actionState,preboundFailForward,groundedPlan,{action:effective,roll});
  recordDebug("STATE_SYNC_ENGINE_ONLY_GROUNDED",{action:effective,applied:Boolean(grounded.applied),reused:Boolean(grounded.reused),revision:currentStateRevision(actionState)})
 }
 recordDebug("STATE_SYNC_PLAN",{action:effective,mode:syncPlan.mode,baseRevision,dirtyFlags:syncPlan.dirtyFlags,immediateCapabilities:syncPlan.immediateCapabilities,deferredCapabilities:syncPlan.deferredCapabilities,blocking:syncPlan.blocking});
 actionState.events??=[];actionState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"TURN_DIRECTOR_MODE",visibility:"INTERNAL",action:effective,mode:syncPlan.mode,dirty:syncPlan.dirty,revision:baseRevision,day:actionState.world?.state?.day||1,at:Date.now()});
 await refresh();

 if(!aiStatus.aiConfigured){
  recordDebug("STATE_SYNC_SKIPPED_NO_PROVIDER",{action:effective,mode:syncPlan.mode,revision:baseRevision});finishPlayerActionFlight(effective,"no_provider_scene");await persist(actionState,actionSession);await refresh();scheduleWorldEvolution(effective||"player_exploration",BACKGROUND_IDLE_GRACE_MS);return
 }
 if(syncPlan.mode==="ENGINE_ONLY"){
  recordDebug("STATE_SYNC_ENGINE_ONLY",{action:effective,revision:baseRevision,dirtyFlags:syncPlan.dirtyFlags});
  startNonblockingPlayerNarration({action:effective,roll,snapshot:turnSnapshot,plan:syncPlan,intent:assessment?.actionIntent,previousSuggestions,previousSuggestionIntents,startedAt:debugTurnStarted,state:actionState,sessionToken:actionSession});
  await persist(actionState,actionSession);await refresh();scheduleWorldEvolution(effective||"player_exploration",BACKGROUND_IDLE_GRACE_MS);return
 }
 if(syncPlan.mode==="DEFERRED"){
  startNonblockingPlayerNarration({action:effective,roll,snapshot:turnSnapshot,plan:syncPlan,intent:assessment?.actionIntent,previousSuggestions,previousSuggestionIntents,startedAt:debugTurnStarted,state:actionState,sessionToken:actionSession});
  scheduleDeferredDirector({action:effective,roll,intent:assessment?.actionIntent,plan:syncPlan,queuedAt:Date.now()},1200);
  recordDebug("STATE_SYNC_DEFERRED",{action:effective,revision:baseRevision,capabilities:syncPlan.capabilities});
  await persist(actionState,actionSession);await refresh();scheduleWorldEvolution(effective||"player_exploration",BACKGROUND_IDLE_GRACE_MS);return
 }

 let foregroundSceneCtrl=null,pendingPlayerActionResult=null,pendingSceneTransport="",pendingSceneRevision=baseRevision,pendingEvidenceOperations=[];
 try{
  setTurnSyncing(true,`State Sync ${syncPlan.mode} · ${syncPlan.dirty.join(" / ")||"minimal"}`);
  foregroundSceneCtrl=new AbortController();nonblockingScene.controller=foregroundSceneCtrl;nonblockingScene.worldId=turnWorldId;nonblockingScene.revision=baseRevision;
  const jobs=startTurnAIJobs(effective,roll,turnSnapshot,{intent:assessment?.actionIntent,stateSyncPlan:syncPlan,baseRevision,signal:foregroundSceneCtrl.signal});
  const playerActionResult=jobs.playerAction.then(value=>({status:"fulfilled",value}),reason=>({status:"rejected",reason}));
  const stateSyncResult=jobs.stateSync.then(value=>({status:"fulfilled",value}),reason=>({status:"rejected",reason}));pendingPlayerActionResult=playerActionResult;pendingSceneTransport=jobs.transport;
  recordDebug("TURN_DUAL_AI_STARTED",{action:effective,directorMode:syncPlan.mode,transport:jobs.transport,playerActionTask:"scene_nonblocking",stateSyncTask:syncPlan.mode,baseRevision});
  const locationBeforeSync=String(actionState.player?.location||actionState.world?.state?.location||"");
  const stateResult=await stateSyncResult;
  if(!isCurrentStateSession(actionSession)){recordDebug("STALE_STATE_SESSION_DISCARDED",{scope:"STATE_SYNC",action:effective});return}
  if(stateResult.status!=="fulfilled"){
   recordDebug("STATE_SYNC_AI_FAILED",{action:effective,mode:syncPlan.mode,error:stateResult.reason?.message||String(stateResult.reason),elapsedMs:Date.now()-debugTurnStarted});
   if(syncPlan.mode==="DEEP")throw stateResult.reason;
   const travel=commitGroundedTravelFallback(actionState,syncPlan,{action:effective,roll,intent:assessment?.actionIntent,fromLocation:locationBeforeSync}),pickup=commitGroundedPickupFallback(actionState,syncPlan,{action:effective,roll}),fallback=commitGroundedProgressionFallback(actionState,roll?.success===true?preboundFailForward:null,{...syncPlan,baseRevision:currentStateRevision(actionState)},{action:effective,roll});pendingEvidenceOperations=[...(pickup.deferredEvidence||[]),...(fallback.deferredEvidence||[])];
   recordDebug("STATE_SYNC_FAST_EMPTY_FALLBACK",{action:effective,revision:currentStateRevision(actionState),groundedProgress:Boolean(fallback.applied||fallback.reused),groundedPickup:Boolean(pickup.applied||pickup.reused),groundedTravel:Boolean(travel.applied)})
  }else if(stateResult.value){
   const committed=commitStatePatch(actionState,stateResult.value,syncPlan,{action:effective,roll,evidencePhase:"STATE_PENDING"});pendingEvidenceOperations=[...(committed.deferredEvidence||[])];
   if(committed.stale){recordDebug("STATE_PATCH_STALE_DISCARDED",{action:effective,mode:syncPlan.mode,baseRevision,currentRevision:committed.currentRevision});if(syncPlan.mode==="DEEP")throw new Error("STATE_PATCH_STALE")}
   else{
    const travel=roll?.success===true?commitGroundedTravelFallback(actionState,syncPlan,{action:effective,roll,intent:assessment?.actionIntent,fromLocation:locationBeforeSync}):{applied:false},pickup=!committed.applied&&roll?.success===true?commitGroundedPickupFallback(actionState,{...syncPlan,baseRevision:currentStateRevision(actionState)},{action:effective,roll}):{applied:false},fallback=!committed.applied&&roll?.success===true?commitGroundedProgressionFallback(actionState,preboundFailForward,{...syncPlan,baseRevision:currentStateRevision(actionState)},{action:effective,roll}):{applied:false};pendingEvidenceOperations=[...pendingEvidenceOperations,...(pickup.deferredEvidence||[]),...(fallback.deferredEvidence||[])];
    recordDebug("STATE_SYNC_AI_COMPLETED",{action:effective,directorMode:syncPlan.mode,elapsedMs:Date.now()-debugTurnStarted,transport:jobs.transport,operations:committed.operations??0,rejectedGrounding:committed.rejected??0,groundedProgress:Boolean(fallback.applied||fallback.reused),groundedPickup:Boolean(pickup.applied||pickup.reused),groundedTravel:Boolean(travel.applied),revision:currentStateRevision(actionState),rebased:committed.rebased===true})
   }
  }
  if(syncPlan.hasDeferredConsequences)scheduleDeferredDirector({action:effective,roll,intent:assessment?.actionIntent,plan:syncPlan,queuedAt:Date.now()},1200);
  pendingSceneRevision=currentStateRevision(actionState);nonblockingScene.revision=pendingSceneRevision;
  recordDebug("TURN_COMMIT",{action:effective,directorMode:syncPlan.mode,elapsedMs:Date.now()-debugTurnStarted,deferredQueue:deferredDirector.queue.length,revision:pendingSceneRevision,sceneNonblocking:true});
  if(turnSyncBusy)setTurnSyncing(false);
 }catch(e){
  if(foregroundSceneCtrl&&!foregroundSceneCtrl.signal.aborted)foregroundSceneCtrl.abort(new DOMException("State Sync failed","AbortError"));
  console.warn("AI turn state fallback",e);recordDebug("TURN_SYNC_DEGRADED",{action:effective,mode:syncPlan.mode,error:e?.message||String(e),elapsedMs:Date.now()-debugTurnStarted});showActionRecoveryNotice("AI 世界狀態同步暫時失敗；已保留 Engine 結果並恢復控制。");
  if(!String(actionState.narrative||"").trim())actionState.narrative=localText;if(!String(actionState.sceneTitle||"").trim())actionState.sceneTitle=deriveSceneTitle(actionState,effective);if(JSON.stringify(actionState.suggestions||[])===JSON.stringify(previousSuggestions))actionState.suggestions=fallbackActionButtons(effective)
 }finally{
  if(aiBusy)setAIThinking(false);if(turnSyncBusy)setTurnSyncing(false)
 }
 try{await persist(actionState,actionSession);await refresh()}
 finally{scheduleWorldEvolution(effective||"player_exploration",BACKGROUND_IDLE_GRACE_MS);scheduleWorldQualityCritic("post_player_action",9000);scheduleHistoryDeepening("post_player_action",11000)}
 if(pendingPlayerActionResult&&foregroundSceneCtrl&&!foregroundSceneCtrl.signal.aborted){
  const ctrl=foregroundSceneCtrl,expectedRevision=pendingSceneRevision,transport=pendingSceneTransport;
  void pendingPlayerActionResult.then(async playerResult=>{
   if(ctrl.signal.aborted||!isCurrentStateSession(actionSession))return;
   if(playerResult.status==="fulfilled"){
    const applied=applyPlayerActionScene(playerResult.value,{worldId:turnWorldId,baseRevision,expectedRevision,roll,action:effective,previousSuggestions,previousSuggestionIntents,state:actionState,sessionToken:actionSession});
    recordDebug(applied?"PLAYER_ACTION_AI_COMPLETED":"PLAYER_ACTION_AI_STALE_DISCARDED",{action:effective,mode:syncPlan.mode,baseRevision,expectedRevision,currentRevision:currentStateRevision(actionState),elapsedMs:Date.now()-debugTurnStarted,transport});
    if(applied){const observableText=String(playerResult.value?.narrative||actionState.narrative||"");const evidence=commitSceneGroundedEvidence(actionState,pendingEvidenceOperations,syncPlan,{action:effective,roll,observableText,evidencePhase:"SCENE"});const pickup=commitGroundedPickupFallback(actionState,{...syncPlan,baseRevision:currentStateRevision(actionState)},{action:effective,roll,observableText});recordDebug("SCENE_GROUNDED_ACQUISITIONS",{action:effective,evidenceApplied:evidence.applied===true,evidenceOperations:evidence.operations||0,evidenceRejected:evidence.rejected||0,pickupApplied:pickup.applied===true});await persist(actionState,actionSession);await refresh()}
   }else{recordDebug("PLAYER_ACTION_AI_FAILED",{action:effective,mode:syncPlan.mode,error:playerResult.reason?.message||String(playerResult.reason),elapsedMs:Date.now()-debugTurnStarted});showActionRecoveryNotice("AI 場景敘述未完成；已保留 Engine 的可見結果。");await refresh()}
  }).finally(()=>{if(nonblockingScene.controller===ctrl){nonblockingScene.controller=null;nonblockingScene.worldId=null;nonblockingScene.revision=null}finishPlayerActionFlight(effective,ctrl.signal.aborted?"scene_aborted":"scene_settled");updateAIStatusBadge();if(actionState)void refresh()})
 }else{finishPlayerActionFlight(effective,"scene_unavailable");await refresh()}
}
$("#newWorldBtn").onclick=()=>{renderRuleTagBuilder();show("creator")};$("#continueBtn").onclick=async()=>{replaceGameState(migrate(await loadWorld()),"CONTINUE_AUTOSAVE");if(!gameState)return;const report=validateWorld(gameState.world);if(!report.valid)return alert(uiFormat("validationFailed",{error:report.errors.join(", ")},activeLocale));aiStatus=await aiHealth();const ready=await refresh();if(!ready)return alert(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));const gameLocaleReady=activeLocale==="zh-Hant"||await ensureRenderedLocale("continue_game",$("#game"));if(!gameLocaleReady)return alert(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));show("game");scheduleWorldQualityCritic("continue_world",1200);scheduleHistoryDeepening("continue_world",1500)};qsa("[data-go]").forEach(b=>b.onclick=()=>{if(b.dataset.go==="creator")renderRuleTagBuilder();show(b.dataset.go)});
const languageSelect=$("#languageSelect");if(languageSelect){languageSelect.value=activeLocale;languageSelect.onchange=async()=>{const previous=activeLocale,next=normalizeLocale(languageSelect.value);if(next===previous)return;activeLocale=saveLocale(next);applyDocumentLocale(activeLocale);if(document.body.dataset.screen==="creator"){initRuleTagBuilder();renderCreatorReview()}helperHistory=[];npcChatHistory.clear();closeModal();recordDebug("LOCALE_SWITCH_REQUESTED",{from:previous,to:next,worldId:gameState?.world?.id||null});if(!gameState){applyDocumentLocale(activeLocale);return}aiStatus=await aiHealth();const ready=await ensureGameplayLocale("language_switch");if(!ready){activeLocale=saveLocale(previous);languageSelect.value=previous;applyDocumentLocale(previous);if(document.body.dataset.screen==="creator"){initRuleTagBuilder();renderCreatorReview()}await refresh({skipLocale:true});alert(uiText("需要 AI 才能把目前世界切換到所選語言。",previous));return}await saveWorld(gameState);await refresh({skipLocale:true});recordDebug("LOCALE_SWITCH_APPLIED",{from:previous,to:next})}}
function worldProgress(value,label,detail=""){const box=$("#worldGenProgress"),bar=$("#worldGenBar"),pct=$("#worldGenPct"),text=$("#worldGenText"),sub=$("#worldGenDetail");box.classList.remove("hidden");$("#worldGenTrack").setAttribute("aria-valuenow",String(value));bar.style.width=value+"%";pct.textContent=value+"%";text.textContent=uiText(label,activeLocale);sub.textContent=uiText(detail,activeLocale)}
function requestWorldReadyNotificationPermission(){
 if(!("Notification" in window)||Notification.permission!=="default")return;
 try{void Notification.requestPermission().then(permission=>recordDebug("WORLD_NOTIFICATION_PERMISSION",{permission})).catch(()=>{})}catch{}
}
function notifyWorldReady(){
 const message="你的異世界已完成編譯，請先確認世界契約，再決定是否穿越。",existing=$("#worldReadyNotice");if(existing)existing.remove();
 const toast=document.createElement("div");toast.id="worldReadyNotice";toast.className="world-ready-notice";toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");toast.innerHTML='<strong>世界生成完成</strong><span>'+message+"</span>";document.body.appendChild(toast);requestAnimationFrame(()=>toast.classList.add("show"));setTimeout(()=>{toast.classList.remove("show");setTimeout(()=>toast.remove(),250)},7000);
 let systemShown=false;
 try{if("Notification" in window&&Notification.permission==="granted"){new Notification("Elyndra · 世界生成完成",{body:message,tag:"elyndra-world-ready"});systemShown=true}}catch{}
 recordDebug("WORLD_CREATION_NOTIFICATION",{phase:"CONTRACT_READY",inPage:true,systemShown,documentHidden:document.hidden===true})
}
function creatorField(id){return document.getElementById(id)}
const DEGREE_FIELDS=["civilizationLevel","technologyLevel","magicLevel","politicalUnity","religionInfluence","resourceAbundance","worldDanger","survivalIntensity"];
const RULE_TAG_LIBRARY={
 "魔法與超自然":["魔法學院","魔法公會","元素魔法","召喚術","治癒魔法","禁忌魔法","魔法契約","魔導科技","魔法災害","神術","詛咒","煉金術","超能力","靈魂魔法"],
 "文明與制度":["冒險者公會","商人公會","多王國","帝國","城邦聯盟","部落聯盟","貴族制度","騎士團","宗教國家","學術機構","民主議會","傭兵制度","奴隸制度","地下組織"],
 "種族與生物":["龍","精靈","矮人","獸人","亞人","魔族","不死族","巨人","妖精","智慧魔物","人造生命","神祇","惡魔","天使","海族"],
 "地理與探索":["天空群島","漂浮大陸","地下世界","海洋文明","世界樹","巨型迷宮","古代遺跡","禁地","未知大陸","移動城市","荒野邊境","異常天候","巨大生物棲地","多層世界"],
 "科技與交通":["蒸汽機械","魔導機械","飛行船","鐵路","火器","槍械","電力","現代工業","網絡通訊","機器人","人工智慧","生物科技","太空文明","傳送門"],
 "衝突與劇情":["魔王","古代威脅","王國戰爭","宗教戰爭","政變","世界末日","災難循環","預言","勇者召喚","英雄制度","學院篇","競技場","商業戰","遠征","革命"],
 "氛圍與限制":["黑暗殘酷","輕鬆日常","戀愛要素","恐怖要素","政治陰謀","慢速成長","開局無敵","後宮","永久死亡","時間旅行","平行世界","現代地球直接介入","科幻文明","全知主角","固定救世主劇情"]
};
let activeRuleTarget="required";
const ruleValues={required:[],allowed:[],forbidden:[]};
function cleanRuleTag(v){return String(v||"").trim().replace(/[\n,，;；]+/g," ").slice(0,60)}
function syncRuleHidden(){creatorField("requiredElements").value=ruleValues.required.join("\n");creatorField("allowedElements").value=ruleValues.allowed.join("\n");creatorField("forbiddenElements").value=ruleValues.forbidden.join("\n")}
function renderSelectedRuleTags(){
 for(const target of ["required","allowed","forbidden"]){
  const box=creatorField(target+"TagCloud");if(!box)continue;
  box.innerHTML=ruleValues[target].map(tag=>{const label=localizedStaticText(tag,activeLocale);return `<span class="world-tag selected-${target}">${esc(label)}<button type="button" data-remove-rule-tag="${target}" data-tag="${esc(tag)}" aria-label="${esc(staticText("移除"))} ${esc(label)}">×</button></span>`}).join("")||`<span class="muted">${esc(staticText("尚未加入標籤"))}</span>`
 }
 qsa("[data-remove-rule-tag]").forEach(b=>b.onclick=()=>{const t=b.dataset.removeRuleTag,tag=b.dataset.tag;ruleValues[t]=ruleValues[t].filter(x=>x!==tag);syncRuleHidden();renderRuleTagBuilder();renderCreatorReview()})
}
function addRuleTag(target,raw){
 const tag=cleanRuleTag(raw);if(!tag||!ruleValues[target])return;
 for(const key of Object.keys(ruleValues))ruleValues[key]=ruleValues[key].filter(x=>x!==tag);
 ruleValues[target].push(tag);syncRuleHidden();renderRuleTagBuilder();renderCreatorReview()
}
function renderRuleTagPresets(){
 const box=creatorField("ruleTagPresets"),category=creatorField("ruleTagCategory")?.value||ALL_RULE_TAGS,query=String(creatorField("ruleTagSearch")?.value||"").trim().toLowerCase();if(!box)return;
 const entries=Object.entries(RULE_TAG_LIBRARY).filter(([name])=>category===ALL_RULE_TAGS||name===category).flatMap(([,tags])=>tags),unique=[...new Set(entries)].filter(tag=>{if(!query)return true;const localized=localizedStaticText(tag,activeLocale).toLowerCase();return tag.toLowerCase().includes(query)||localized.includes(query)});
 box.innerHTML=unique.map(tag=>{const owner=Object.keys(ruleValues).find(k=>ruleValues[k].includes(tag)),label=localizedStaticText(tag,activeLocale);return `<button type="button" class="world-tag ${owner?"selected-"+owner:""}" data-preset-rule-tag="${esc(tag)}">${esc(label)}</button>`}).join("")||`<span class="muted">${esc(staticText("沒有符合的預設標籤"))}</span>`;
 const count=creatorField("ruleTagCount");if(count)count.textContent=ruleTagCountText(unique.length);
 qsa("[data-preset-rule-tag]").forEach(b=>b.onclick=()=>addRuleTag(activeRuleTarget,b.dataset.presetRuleTag))
}
function renderRuleTagBuilder(){renderSelectedRuleTags();renderRuleTagPresets();qsa("[data-rule-target]").forEach(b=>b.classList.toggle("active",b.dataset.ruleTarget===activeRuleTarget));qsa("[data-rule-bucket]").forEach(b=>b.classList.toggle("active",b.dataset.ruleBucket===activeRuleTarget))}
function initRuleTagBuilder(){
 const category=creatorField("ruleTagCategory");if(category){const current=category.value||ALL_RULE_TAGS;category.innerHTML=[{value:ALL_RULE_TAGS,label:ALL_RULE_TAGS},...Object.keys(RULE_TAG_LIBRARY).map(value=>({value,label:value}))].map(({value,label})=>`<option value="${esc(value)}">${esc(ruleCategoryText(label))}</option>`).join("");category.value=[ALL_RULE_TAGS,...Object.keys(RULE_TAG_LIBRARY)].includes(current)?current:ALL_RULE_TAGS;category.onchange=renderRuleTagPresets}
 creatorField("ruleTagSearch")?.addEventListener("input",renderRuleTagPresets);
 qsa("[data-rule-target]").forEach(b=>b.onclick=()=>{activeRuleTarget=b.dataset.ruleTarget;renderRuleTagBuilder()});
 qsa("[data-rule-bucket]").forEach(b=>b.onclick=e=>{if(e.target.closest("button,input"))return;activeRuleTarget=b.dataset.ruleBucket;renderRuleTagBuilder()});
 qsa("[data-add-custom-tag]").forEach(b=>b.onclick=()=>{const target=b.dataset.addCustomTag,input=creatorField(target+"TagInput");addRuleTag(target,input?.value);if(input)input.value=""});
 for(const target of ["required","allowed","forbidden"])creatorField(target+"TagInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addRuleTag(target,e.currentTarget.value);e.currentTarget.value=""}});
 renderRuleTagBuilder()
}
function syncDegreeOutputs(){for(const id of DEGREE_FIELDS){const input=creatorField(id),out=creatorField(id+"Value");if(input&&out)out.value=input.value}}
function syncCustomWorldStyle(){const custom=creatorField("genre")?.value==="自訂世界";creatorField("customWorldStyleWrap")?.classList.toggle("hidden",!custom);const hint=creatorField("styleHint");if(custom&&hint)hint.textContent="自訂世界會以你的風格描述作為 Blueprint 基礎；進階設定仍可獨立指定。"}

function creatorRaw(){
 const n=id=>Number(creatorField(id)?.value),v=id=>String(creatorField(id)?.value||""),checked=id=>creatorField(id)?.checked===true,mode=id=>v(id+"Mode")||"style";
 const out={
  playerName:v("playerName").trim(),worldStyle:v("genre"),customWorldStyle:v("customWorldStyle"),worldStyleMode:"fixed",worldStyleLocked:checked("worldStyleLocked"),worldScale:v("scale"),worldScaleMode:"fixed",worldScaleLocked:checked("worldScaleLocked"),
  targetPlayHours:Math.max(2,Math.min(100,Math.round(n("playHours")||15))),difficulty:v("difficulty"),originType:v("originType"),originCustom:v("originCustom"),playerRole:v("playerRole"),roleCustom:v("roleCustom"),
  customWorldDescription:v("prompt"),storyPreferences:v("storyPreferences"),requiredElements:v("requiredElements"),allowedElements:v("allowedElements"),forbiddenElements:v("forbiddenElements")
 };
 for(const id of ["civilizationLevel","technologyLevel","magicLevel","civilizationCount","speciesCount","languageCount","politicalUnity","religionInfluence","resourceAbundance","worldDanger","unknownRatio","survivalIntensity"]){out[id]=n(id);out[id+"Mode"]=mode(id);out[id+"Locked"]=checked(id+"Locked")}
 out.warState=v("warState");out.warStateMode=mode("warState");out.warStateLocked=checked("warStateLocked");
 return out
}
function setCreatorStep(step){
 const n=Math.max(1,Math.min(5,Number(step)||1));
 qsa("[data-creator-step]").forEach(x=>x.classList.toggle("active",Number(x.dataset.creatorStep)===n));
 qsa("[data-step-target]").forEach(x=>x.classList.toggle("active",Number(x.dataset.stepTarget)===n));
 if(n===5)renderCreatorReview();
 const creator=$("#creator");if(creator)creator.scrollTop=0
}
function renderCreatorReview(){
 const raw=creatorRaw(),req=raw.requiredElements.split(/[\n,，;；]+/).filter(Boolean),forbid=raw.forbiddenElements.split(/[\n,，;；]+/).filter(Boolean),story=raw.storyPreferences.split(/[\n,，;；]+/).filter(Boolean),el=$("#creatorReview");if(!el)return;
 const label=id=>creatorField(id)?.selectedOptions?.[0]?.textContent||creatorField(id)?.value||"—";
 el.innerHTML=`<div class="creator-review-card"><small>WORLD</small><strong>${esc(raw.worldStyle)} · ${esc(raw.worldScale)}</strong><span>${raw.targetPlayHours} 小時 · ${esc(label("difficulty"))}</span></div>
 <div class="creator-review-card"><small>PLAYER</small><strong>${esc(raw.playerName||"由 AI 決定名稱")}</strong><span>${esc(label("originType"))} · ${esc(label("playerRole"))}</span></div>
 <div class="creator-review-card"><small>DESTINY TENDENCIES</small><strong>${story.length?story.length+" 項":"沒有指定"}</strong><span>只影響事件機會，不鎖死劇情</span></div>
 <div class="creator-review-card"><small>CONSTITUTION</small><strong>必須 ${req.length} · 禁止 ${forbid.length}</strong><span>生成後會先顯示完整世界契約</span></div>`
}
function syncAdvancedCreatorModes(){
 for(const id of ["civilizationLevel","technologyLevel","magicLevel","civilizationCount","speciesCount","languageCount","politicalUnity","religionInfluence","resourceAbundance","worldDanger","unknownRatio","survivalIntensity","warState"]){
  const input=creatorField(id),m=creatorField(id+"Mode");if(input&&m)input.disabled=m.value!=="fixed"
 }
}
function randomizeUnlockedCreator(){
 const genre=creatorField("genre"),scale=creatorField("scale"),settings=randomWorldSettings({genres:Array.from(genre.options,x=>x.value).filter(x=>x!=="自訂世界"),scales:Array.from(scale.options,x=>x.value)});
 if(!creatorField("worldStyleLocked")?.checked)genre.value=settings.genre;
 if(!creatorField("worldScaleLocked")?.checked)scale.value=settings.scale;
 const ranges={civilizationLevel:[1,10],technologyLevel:[1,10],magicLevel:[1,10],civilizationCount:[1,12],speciesCount:[1,12],languageCount:[1,16],politicalUnity:[1,10],religionInfluence:[1,10],resourceAbundance:[1,10],worldDanger:[1,10],unknownRatio:[10,95],survivalIntensity:[1,10]};
 for(const [id,[min,max]] of Object.entries(ranges)){if(creatorField(id+"Locked")?.checked||creatorField(id+"Mode")?.value!=="random")continue;creatorField(id).value=Math.round(min+Math.random()*(max-min))}syncDegreeOutputs()
 if(!creatorField("warStateLocked")?.checked&&creatorField("warStateMode")?.value==="random")creatorField("warState").value=["PEACE","TENSION","WAR"][Math.floor(Math.random()*3)];
 const hint=$("#styleHint"),p=getWorldStylePreset(genre.value);if(hint)hint.textContent=`已重抽未鎖定設定。世界風格：${genre.value}。 ${p?.foundation||""}`;
 renderCreatorReview()
}
function confirmWorldContract(contract){
 return new Promise(resolve=>{
  const modal=$("#modal"),close=$("#closeModal"),oldClose=close.onclick,oldModal=modal.onclick,finish=value=>{close.onclick=oldClose;modal.onclick=oldModal;modal.classList.add("hidden");resolve(value)};
  openModal(worldContractHtml(contract));
  $("#editWorldContract").onclick=()=>finish(false);$("#acceptWorldContract").onclick=()=>finish(true);
  close.onclick=()=>finish(false);modal.onclick=e=>{if(e.target===modal)finish(false)}
 })
}
qsa("[data-step-next]").forEach(b=>b.onclick=()=>setCreatorStep(b.dataset.stepNext));
qsa("[data-step-prev]").forEach(b=>b.onclick=()=>setCreatorStep(b.dataset.stepPrev));
qsa("[data-step-target]").forEach(b=>b.onclick=()=>setCreatorStep(b.dataset.stepTarget));
$("#randomWorldBtn")?.addEventListener("click",randomizeUnlockedCreator);
$("#genre")?.addEventListener("change",()=>{syncCustomWorldStyle();const p=getWorldStylePreset($("#genre").value),hint=$("#styleHint");if($("#genre").value!=="自訂世界"&&hint)hint.textContent=(p?.foundation||"")+" 未指定的進階欄位會以這個風格作基礎。";renderCreatorReview()});
qsa(".advanced-setting select[id$='Mode']").forEach(x=>x.addEventListener("change",syncAdvancedCreatorModes));
qsa("#creator input,#creator select,#creator textarea").forEach(x=>x.addEventListener("change",()=>{if(x.id!=="genre")renderCreatorReview()}));
for(const id of DEGREE_FIELDS)creatorField(id)?.addEventListener("input",()=>{syncDegreeOutputs();renderCreatorReview()});
initRuleTagBuilder();syncDegreeOutputs();syncCustomWorldStyle();syncAdvancedCreatorModes();setCreatorStep(1);
$("#generateBtn").onclick=async()=>{
 requestWorldReadyNotificationPermission();
 const btn=$("#generateBtn"),draft=createWorldCreationDraft(creatorRaw()),seed=compileWorldCreation(draft);btn.disabled=true;$("#worldGenProgress").dataset.loading="true";
 try{
  if(!aiStatus.aiConfigured)throw new Error("建立新世界需要先在 AI 設定連接 Provider，因為世界主題與開局行動會由 AI 生成");
  worldProgress(6,"正在建立 World Blueprint","解析玩家設定、起源、定位、故事傾向與世界約束");
  await new Promise(r=>setTimeout(r,60));
  worldProgress(15,"正在建立 World Constitution","把必須／可以／禁止與難度、起源規則編譯成持久約束");
  replaceGameState(newGame(seed),"NEW_WORLD");applyWorldCreationState(gameState,seed);ensureWorldLocale(gameState,activeLocale);gameState.localization.sourceLocale=activeLocale;gameState.localization.displayLocale=activeLocale;gameState.world.language=activeLocale;
  recordDebug("WORLD_CREATION_V2_COMPILED",{schemaVersion:2,masterSeed:seed.worldCreationSeed,difficulty:seed.creationV2.difficultyRules.id,origin:seed.creationV2.originProfile.id,role:seed.creationV2.role.id,required:seed.creationV2.blueprint.rules.required,forbidden:seed.creationV2.blueprint.rules.forbidden});
  worldProgress(26,"World Seed 已鎖定","同一份 Blueprint、Constitution 與 Seed 會成為後續世界生成的根");
  setAIThinking(true,"AI World Compiler 正在分段建立世界…");
  try{
   const candidate=await generateWorldCandidate(seed,gameState.world.constitution,p=>worldProgress(Math.max(28,p.progress),p.label,p.detail));
   worldProgress(86,"正在驗證 AI 世界","Engine 正在檢查 Seed、Canon、World Constitution、曆法、Timeline 與跨階段引用");
   const creationValidation=validateWorldCreationCandidate(seed,candidate);
   if(!creationValidation.valid)throw new Error("WORLD_CREATION_CONSTITUTION_FAILED:"+creationValidation.errors.join(","));
   applyWorldCandidate(gameState,candidate);
   worldProgress(90,"正在 Canonize 開局內容","只建立世界骨架、出生區域與最小可玩內容；其他地區延遲生成");
   canonizeGeneration(gameState,candidate.generation);applyOriginRuntime(gameState,{phase:"POST_CANON"})
  }catch(e){console.error("AI world generation failed",e);worldProgress(0,"AI 世界生成失敗",e.message);throw e}
  finally{setAIThinking(false)}
  const contract=buildWorldContract(gameState);gameState.world.creation.contract=structuredClone(contract);
  worldProgress(93,"世界生成完成","世界已編譯完成；請先確認世界契約，再決定是否穿越。");notifyWorldReady();
  $("#worldGenProgress").dataset.loading="false";
  const accepted=await confirmWorldContract(contract);
  if(!accepted){replaceGameState(null,"WORLD_CREATION_CANCELLED");worldProgress(0,"已返回修改","這次編譯結果尚未建立正式存檔；修改設定後可重新生成。");return}
  $("#worldGenProgress").dataset.loading="true";
  worldProgress(96,"正在建立正式存檔","保存 Blueprint、Constitution、Origin、Difficulty 與世界 Canon");
  await persist();worldProgress(98,"正在準備冒險介面","載入第一個場景");const refreshed=await refresh();if(!refreshed)throw new Error(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));const gameLocaleReady=activeLocale==="zh-Hant"||await ensureRenderedLocale("post_creation_game",$("#game"));if(!gameLocaleReady)throw new Error(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));worldProgress(100,"準備完成","正在穿越…");await new Promise(r=>setTimeout(r,250));show("game");scheduleWorldQualityCritic("post_creation",1000);scheduleHistoryDeepening("post_creation",1500)
 }catch(e){$("#worldGenProgress").dataset.loading="false";worldProgress(0,"世界生成失敗",e.message);alert(uiFormat("worldCompileFailed",{error:e.message},activeLocale))}
 finally{btn.disabled=false;$("#worldGenProgress").dataset.loading="false"}
};
$("#freeActionForm").onsubmit=async e=>{e.preventDefault();const input=$("#freeAction"),value=input.value.trim();if(!value)return;input.value="";await runAction("free",value)};
function debugRuntimeSnapshot(){
 return {screen:document.body.dataset.screen||"",aiBusy,turnSyncBusy,turnSyncLabel,stateRevision:gameState?currentStateRevision(gameState):null,nonblockingPlayerAction:Boolean(nonblockingScene.controller),deferredDirector:{running:deferredDirector.running,queued:deferredDirector.queue.length},worldBackground:{running:worldBackground.running,queued:worldBackground.queued,lastReason:worldBackground.lastReason,failures:worldBackground.failures,cooldownRemainingMs:Math.max(0,Number(worldBackground.cooldownUntil||0)-Date.now())},autotest:{running:developerAutotest.running,worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn,stopRequested:developerAutotest.stopRequested},combatActive:Boolean(gameState?.combat?.active),worldId:gameState?.world?.id||null,worldDay:gameState?.world?.state?.day||null}
}
function currentDebugBundle(){const ai=loadAISettings(),endpoint=String(ai.endpoint||"").replace(/([?&](?:key|api_key|token|access_token)=)[^&]+/gi,"$1[REDACTED]");return debugBundle({appVersion:APP_VERSION,gameState,aiSettings:{provider:ai.provider,model:ai.model,endpoint,optimization:ai.optimization,apiKey:ai.apiKey},runtime:debugRuntimeSnapshot()})}
function downloadDebugFile(kind="json"){
 const bundle=currentDebugBundle(),json=kind==="json",body=json?JSON.stringify(bundle,null,2):debugBundleText(bundle),blob=new Blob([body],{type:json?"application/json;charset=utf-8":"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a"),stamp=new Date().toISOString().replace(/[:.]/g,"-");
 a.href=url;a.download="Elyndra-debug-v"+APP_VERSION+"-"+stamp+(json?".json":".txt");document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);recordDebug("DEBUG_EXPORTED",{format:kind,entries:bundle.summary?.entryCount||0,tokens:bundle.summary?.tokenTotals?.total||0})
}
function gameplayDebugDetail(entry){
 const d=entry?.data||{};
 if(entry.type==="GAME_ITEM_GAINED"||entry.type==="GAME_ITEM_LOST")return (d.name||d.itemId||"?")+" · "+(d.quantityDelta>0?"+":"")+String(d.quantityDelta??0)+" → "+String(d.totalQuantity??0);
 if(entry.type==="GAME_KNOWLEDGE_GAINED"||entry.type==="GAME_KNOWLEDGE_UPDATED")return (d.title||d.knowledgeId||"?")+" · "+(d.status||d.toStatus||"");
 if(entry.type.startsWith("GAME_SIDE_QUEST_"))return (d.title||d.questId||"?")+(d.to!=null?" · "+d.to+"/"+(d.target||"?"):"");
 if(entry.type.startsWith("GAME_NPC_")||entry.type==="GAME_COMPANION_STATUS_CHANGED")return (d.name||d.npcId||"?")+(d.delta!=null?" · trust "+(d.delta>0?"+":"")+d.delta:"");
 if(entry.type.startsWith("GAME_LOCATION_"))return d.name||d.to||d.locationId||"?";
 if(entry.type.startsWith("GAME_COMBAT_"))return d.enemyName||d.enemyId||"combat";
 if(entry.type==="GAME_MAIN_QUEST_UPDATED")return (d.title||"main")+" · stage "+d.fromStage+"→"+d.toStage;
 if(entry.type==="GAME_STATE_BASELINE")return (d.location||"?")+" · baseline";
 return d.reason||d.sourceEventType||d.action||d.summary||""
}
function openDebugPanel(){
 const entries=telemetryEntries(),summary=telemetrySummary(entries),tokens=summary.tokenTotals||{},ai=loadAISettings(),runtime=debugRuntimeSnapshot(),recentAI=entries.filter(x=>x.type==="AI_REQUEST").slice(-30).reverse(),recentGameplay=entries.filter(x=>x.type.startsWith("GAME_")).slice(-60).reverse(),recentEvents=(gameState?.events||[]).slice(-35).reverse();
 const usageLabel=(tokens.api||0)+" API / "+(tokens.estimated||0)+" estimated";
 const aiRows=recentAI.map(x=>{const d=x.data||{},u=d.usage||{};return "<tr><td>"+esc(new Date(x.at).toLocaleTimeString())+"</td><td>"+esc(d.task||"?")+"</td><td>"+esc(d.tier||"?")+"</td><td>"+esc(d.provider||"?")+"</td><td>"+esc(d.status||"?")+"</td><td>"+Number(d.latencyMs||0)+"ms</td><td>"+Number(u.input||0)+" / "+Number(u.output||0)+" / "+Number(u.reasoning||0)+" / "+Number(u.total||0)+"</td><td>"+esc(u.source||"?")+"</td></tr>"}).join("");
 const gameplayRows=recentGameplay.map(x=>{const d=x.data||{},clock=d.clock||{};return "<tr><td>"+esc(new Date(x.at).toLocaleTimeString())+"</td><td>"+esc(clock.day?"D"+clock.day+" "+(clock.time||""):"")+"</td><td>"+esc(x.type||"?")+"</td><td>"+esc(gameplayDebugDetail(x))+"</td></tr>"}).join("");
 const eventRows=recentEvents.map(e=>"<tr><td>"+esc(e.at?new Date(e.at).toLocaleTimeString():"")+"</td><td>"+esc(e.type||"?")+"</td><td>"+esc(e.action||e.reason||e.summary||e.mode||"")+"</td></tr>").join("");
 openModal("<div class=\"eyebrow\">ELYNDRA DEBUG</div><h2>遊玩診斷</h2><p class=\"muted\">持續收集本機遊玩、AI、排隊、背景處理、角色狀態變化與錯誤資訊。取得物品、知識、支線、NPC 遭遇、地點、信任、戰鬥等會以 GAME_* telemetry 記錄。匯出時會包含目前完整遊戲狀態；API Key、Authorization、Password 等敏感欄位會自動遮罩。</p>"+
 "<div class=\"debug-card-grid\"><div class=\"debug-stat\"><small>VERSION</small><strong>v"+esc(APP_VERSION)+"</strong><span>"+esc(gameState?.world?.name||"No world")+"</span></div>"+
 "<div class=\"debug-stat\"><small>AI</small><strong>"+esc(ai.provider||"?")+" · "+esc(ai.model||"?")+"</strong><span>"+esc(ai.optimization||"standard")+"</span></div>"+
 "<div class=\"debug-stat\"><small>TOKENS</small><strong>"+Number(tokens.total||0).toLocaleString()+"</strong><span>In "+Number(tokens.input||0).toLocaleString()+" · Out "+Number(tokens.output||0).toLocaleString()+" · Think "+Number(tokens.reasoning||0).toLocaleString()+"</span></div>"+
 "<div class=\"debug-stat\"><small>USAGE SOURCE</small><strong>"+esc(usageLabel)+"</strong><span>Cached "+Number(tokens.cached||0).toLocaleString()+"</span></div>"+
 "<div class=\"debug-stat\"><small>AI LATENCY</small><strong>"+Number(summary.aiLatencyMsAverage||0).toLocaleString()+" ms</strong><span>"+Number(summary.aiRequests||0)+" requests · "+Number(summary.errorCount||0)+" errors</span></div>"+
 "<div class=\"debug-stat\"><small>RUNTIME</small><strong>"+(runtime.turnSyncBusy?"STATE SYNC":runtime.aiBusy?"AI BUSY":"READY")+"</strong><span>Deferred "+runtime.deferredDirector.queued+" · World "+(runtime.worldBackground.running?"RUN":"IDLE")+"</span></div></div>"+
 "<div class=\"settings-actions debug-actions\"><button id=\"debugExportJson\" class=\"primary\">匯出 Debug JSON</button><button id=\"debugExportTxt\" class=\"secondary\">匯出摘要 TXT</button><button id=\"debugRefresh\" class=\"ghost\">重新整理</button><button id=\"debugClear\" class=\"ghost danger-ghost\">清除 Debug 紀錄</button></div>"+
 "<p class=\"muted\">Token 顯示次序：Input / Output / Reasoning-Thinking / Total。API response 有 usage 時使用實際數字；沒有 usage 才標示 ESTIMATED。</p>"+
 "<div class=\"debug-section\"><h3>最近 AI Requests</h3><div class=\"debug-table-wrap\"><table class=\"debug-table\"><thead><tr><th>Time</th><th>Task</th><th>Tier</th><th>Provider</th><th>Status</th><th>Latency</th><th>Token I/O/R/T</th><th>Source</th></tr></thead><tbody>"+(aiRows||"<tr><td colspan=\"8\">尚未有 AI request telemetry</td></tr>")+"</tbody></table></div></div>"+
 "<div class=\"debug-section\"><h3>Gameplay State Changes</h3><div class=\"debug-table-wrap\"><table class=\"debug-table\"><thead><tr><th>Recorded</th><th>World Time</th><th>Type</th><th>Detail</th></tr></thead><tbody>"+(gameplayRows||"<tr><td colspan=\"4\">尚未有 gameplay state telemetry</td></tr>")+"</tbody></table></div></div>"+
 "<div class=\"debug-section\"><h3>最近遊戲事件</h3><div class=\"debug-table-wrap\"><table class=\"debug-table\"><thead><tr><th>Time</th><th>Event</th><th>Detail</th></tr></thead><tbody>"+(eventRows||"<tr><td colspan=\"3\">尚未有事件</td></tr>")+"</tbody></table></div></div>");
 $("#debugExportJson").onclick=()=>downloadDebugFile("json");$("#debugExportTxt").onclick=()=>downloadDebugFile("txt");$("#debugRefresh").onclick=openDebugPanel;$("#debugClear").onclick=()=>{if(confirm("清除目前瀏覽器內的 Debug telemetry？遊戲存檔不會被刪除。")){clearDebugTelemetry();openDebugPanel()}}
}
$("#debugBtn")?.addEventListener("click",openDebugPanel);
let modalRestoreFocus=null;function closeModal(){const modal=$("#modal");if(!modal||modal.classList.contains("hidden"))return;modal.classList.add("hidden");const target=modalRestoreFocus;modalRestoreFocus=null;if(target&&document.contains(target)&&typeof target.focus==="function")target.focus()}function modalFocusables(){return qsa("#modal button:not([disabled]),#modal input:not([disabled]),#modal select:not([disabled]),#modal textarea:not([disabled]),#modal [href],#modal [tabindex]:not([tabindex=\"-1\"])")}function openModal(html){modalRestoreFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden");applyDocumentLocale(activeLocale,$("#modal"));if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,$("#modal"));void ensureRenderedLocale("modal",$("#modal"));requestAnimationFrame(()=>{(modalFocusables()[0]||$("#closeModal"))?.focus()})}$("#closeModal").onclick=closeModal;$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};document.addEventListener("keydown",e=>{const modal=$("#modal");if(!modal||modal.classList.contains("hidden"))return;if(e.key==="Escape"){e.preventDefault();closeModal();return}if(e.key!=="Tab")return;const items=modalFocusables();if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});
function openWorldMap(){
 const r=ensureWorldRegistry(gameState),map=worldMapSnapshot(gameState),npcs=r.npcs.filter(x=>x.known===true),factions=r.factions.filter(x=>x.known===true),weather=weatherUiSnapshot(gameState);
 const routeByRegion=map.routes.map(x=>`${esc(x.fromName)} ↔ ${esc(x.toName)} · ${Math.round(x.distanceKm)}km · ${esc(x.terrain)}`);
 const regionHtml=map.regions.map(region=>`<div class="lore-item"><small>REGION</small><h3>${esc(region.region)}</h3><div class="world-map-region">${region.locations.map(loc=>{const full=r.locations.find(x=>x.id===loc.id),access=loc.access||{allowed:true,missing:[]},missing=access.missing||[];return `<div class="faction-row"><strong>${loc.current?"◆ ":""}${esc(loc.name)}</strong><small>${esc(loc.type||"未知地點")}${loc.current?" · CURRENT":""}</small>${full?.description?`<span>${esc(full.description)}</span>`:""}${missing.length?`<small>🔒 需要：${missing.map(x=>esc(x.hint||x.id||x.type)).join(" · ")}</small>`:`<small>可進入條件：已滿足</small>`}</div>`}).join("")}</div></div>`).join("");
 openModal(`<div class="eyebrow">KNOWN WORLD MAP</div><h2>世界地圖</h2><p class="muted">只顯示你已經知道的地點與已確認路線；未知區域不會出現在地圖上。</p><div class="lore-list">
 <div class="lore-item"><small>CURRENT WEATHER</small><h3>${esc(weather.observableName)}</h3><p>${esc(weather.sensoryCue||"")}</p></div>
 ${regionHtml||'<div class="lore-item"><p>尚未掌握任何可定位的地點。</p></div>'}
 <div class="lore-item"><small>KNOWN ROUTES</small><p>${routeByRegion.length?routeByRegion.join("<br>"):"尚未確認地點之間的路線"}</p></div>
 <div class="lore-item"><small>KNOWN NPCS</small><p>${npcs.map(x=>`<button class="npc-link" data-npc-id="${esc(x.id)}">${esc(playerVisibleNpcName(gameState,x))} · ${esc(x.role)}</button>`).join("")||"尚未遇到人物"}</p></div>
 <div class="lore-item"><small>KNOWN FACTIONS</small><p>${factions.map(x=>`<strong>${esc(x.name)}</strong> · 關係 ${x.playerReputation??0}<br><small>${esc(x.goal||"")}</small>`).join("<br><br>")||"尚未確認勢力"}</p></div>
 </div>`);bindNpcLinks()
}
$("#worldBtn")?.addEventListener("click",openWorldMap);
function helperModalHtml(){const presets=["我現在在哪裏？","現在天氣如何？","四周圍有什麼？","附近有誰可以對話？","我目前知道什麼？","下一步可以做什麼？"];return `<div class="eyebrow">TRAVEL HELPER · READ ONLY</div><h2>旅途助手</h2><p class="muted">只會整理你已經知道或目前可以直接感知的情報，不會推進時間或改變劇情。</p><div class="settings-actions">${presets.map(q=>`<button type="button" class="ghost" data-helper-preset="${esc(q)}">${esc(q)}</button>`).join("")}</div><div class="lore-list">${helperHistory.slice(-6).map(m=>`<div class="lore-item"><small>${m.role==="user"?"YOU":"HELPER"}</small><p>${esc(m.text)}</p></div>`).join("")||'<div class="lore-item"><p class="muted">你可以先問「我現在在哪裏？」或「四周圍有什麼？」。</p></div>'}</div><form id="helperForm" class="free-action"><input id="helperInput" maxlength="240" placeholder="向旅途助手提問"><button class="primary" type="submit">詢問</button></form>`}
function bindHelperModal(){document.querySelectorAll("#modalContent [data-helper-preset]").forEach(b=>b.onclick=async()=>{const input=$("#helperInput");if(input)input.value=b.dataset.helperPreset;await submitHelperQuestion(b.dataset.helperPreset)});$("#helperForm")?.addEventListener("submit",async e=>{e.preventDefault();const q=$("#helperInput")?.value.trim();if(q)await submitHelperQuestion(q)})}
function openHelperModal(){openModal(helperModalHtml());bindHelperModal()}
async function submitHelperQuestion(question){if(!gameState||aiBusy||!question)return;helperHistory.push({role:"user",text:question});openHelperModal();setAIThinking(true,"旅途助手正在整理你已知的情報…");try{let answer="目前沒有足夠情報確認。";if(aiStatus.aiConfigured)answer=await askTravelHelper(gameState,question);else answer="旅途助手需要先連接 AI Provider 才能回答。";helperHistory.push({role:"assistant",text:answer})}catch(e){console.warn("travel helper fallback",e);helperHistory.push({role:"assistant",text:"目前沒有足夠情報確認。"})}finally{setAIThinking(false);openHelperModal()}}
$("#helperBtn")?.addEventListener("click",openHelperModal);
const STAT_LABEL={strength:"力量",agility:"敏捷",mind:"心智",presence:"魅力",instinct:"直覺"},SKILL_LABEL={OBSERVE:"觀察",SOCIAL:"交涉",TRAVEL:"旅行",RISKY:"冒險",GENERAL:"應變"};
function bonusText(b={}){const rows=Object.entries(b).filter(([,v])=>Number(v));return rows.length?rows.map(([k,v])=>`${SKILL_LABEL[k]||k} ${signed(v)}`).join(" · "):"沒有判定加成"}
$("#characterBtn")?.addEventListener("click",()=>{
 const p=checkProfileSnapshot(gameState),survival=survivalSnapshot(gameState),origin=playerOriginSnapshot(gameState.player),magic=gameState.player.magic||{strain:0,capacity:100},active=ensureWorldRegistry(gameState).npcs.filter(x=>x.known===true&&x.alive!==false&&x.companion?.status==="ACTIVE"),talentInfo=talentSnapshot(gameState),identity=talentInfo.identity;
 openModal(`<div class="eyebrow">CHARACTER STATUS</div><h2>${esc(gameState.player.name)}</h2><p class="muted">${esc(origin.label)} · 起源決定你一開始能知道甚麼；長期選擇則會形成你自己的做事方式。</p><div class="lore-list">
 <div class="lore-item"><small>身體狀況</small><p><strong>生命</strong> ${gameState.player.hp}/${gameState.player.maxHp}<br><strong>飽食度</strong> ${Math.round(survival.satiety)}/100<br><strong>疲勞</strong> ${Math.round(survival.fatigue)}/100<br><strong>環境暴露</strong> ${Math.round(survival.exposure)}/100<br><strong>傷勢</strong> ${Math.round(survival.injury)}/100<br><strong>魔法負荷</strong> ${Math.round(magic.strain||0)}/${magic.capacity||100}</p></div>
 <div class="lore-item"><small>起源記憶</small><p>${(origin.commonKnowledge||[]).map(x=>esc(x)).join("<br>")||"沒有可直接帶入這個世界的既有常識。"}</p>${origin.defaultValues?.length?`<small>原有價值觀</small><p>${origin.defaultValues.map(x=>esc(x)).join("<br>")}</p>`:""}</div>
 <div class="lore-item"><small>成長路線</small><h3>${identity.committed?esc(identity.path.name):"尚未定型"}</h3><p>${esc(identity.description)}${identity.committed?`<br><small>較容易成長：${identity.focusedKinds.map(k=>esc(SKILL_LABEL[k]||k)).join("、")}；其他方向需要更大投入。</small>`:""}</p></div>
 <div class="lore-item"><small>能力基礎</small><p>${Object.entries(p.stats).map(([k,v])=>`<strong>${esc(STAT_LABEL[k]||k)}</strong> ${v}`).join(" · ")}</p></div>
 <div class="lore-item"><small>累積經驗</small>${Object.entries(p.skills).map(([k,v])=>`<p><strong>${esc(SKILL_LABEL[k]||k)}</strong> Lv.${v} · 熟練 ${p.skillProgress[k]||0}${v<5?` / ${4+v*3}`:" · MAX"}</p>`).join("")}</div>
 <div class="lore-item"><small>已裝備工具</small><p>${p.equipped.length?p.equipped.map(x=>`${esc(x.name)} · ${esc(bonusText(x.checkBonuses))}`).join("<br>"):"目前沒有具判定加成的裝備"}</p></div>
 <div class="lore-item"><small>同行者</small><p>${active.length?active.map(x=>`${esc(x.name)} · ${esc(x.role||"")} · ${esc(companionLabel(x)||"同行中")}`).join("<br>"):"目前沒有同行夥伴"}</p></div>
 </div>`)
});
$("#runtimeBtn")?.addEventListener("click",()=>{
 const survival=survivalSnapshot(gameState),magic=gameState.player.magic||{strain:0,capacity:100,knownSpells:[]},talents=talentSnapshot(gameState),travel=travelSnapshot(gameState,{director:false}),market=marketSnapshot(gameState),dungeon=dungeonSnapshot(gameState,{director:false}),culture=cultureSnapshot(gameState),registry=ensureWorldRegistry(gameState),locNames=new Map(registry.locations.map(x=>[x.id,x.name])),companions=ensureNpcRuntime(gameState).filter(x=>x.companion?.status==="ACTIVE");
 const routeText=travel.routes.length?travel.routes.map(r=>`${esc(locNames.get(r.fromId)||"?")} ↔ ${esc(locNames.get(r.toId)||"?")} · 約 ${r.baseMinutes} 分 · ${esc(r.terrain)}`).join("<br>"):"尚未掌握可確認路線";
 const marketText=market?.goods?.length?market.goods.map(g=>`${esc(g.name)} · ${g.price} · ${g.stock>0?"仍有存貨":"暫時缺貨"}`).join("<br>"):"目前沒有可確認的地方市場商品";
 const dungeonText=dungeon?.rooms?.length?dungeon.rooms.map(r=>`${esc(r.name)} · ${r.cleared?"已走過":"仍待探索"}`).join("<br>"):"目前沒有已探索的遺構空間";
 const lockedReason=x=>({OTHER_PATH_LOCKED:"其他成長路線的進階能力已鎖定",PREVIOUS_TIER_REQUIRED:"要先走完前一階段",NO_TALENT_POINT:"目前天賦點不足"})[x.reason]||"暫時無法選擇";
 const talentRows=talents.available.map(x=>`<div class="lore-item"><small>${esc(x.pathName)} · 第 ${x.tier} 階${x.cost<99?` · 需要 ${x.cost} 點`:""}</small><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p><button class="${x.available?"secondary":"ghost"}" data-learn-talent="${esc(x.id)}" ${x.available?"":"disabled"}>${x.available?"選擇這項能力":esc(lockedReason(x))}</button></div>`).join("");
 openModal(`<div class="eyebrow">TRAVELLER STATUS</div><h2>旅人狀態</h2><p class="muted">只顯示你能理解並用來作決定的狀態；世界完整性、AI 與生成診斷仍保留在 Debug。</p><div class="lore-list">
 <div class="lore-item"><small>身體狀況</small><p>飽食度 ${Math.round(survival.satiety)} · 疲勞 ${Math.round(survival.fatigue)} · 環境暴露 ${Math.round(survival.exposure)} · 傷勢 ${Math.round(survival.injury)}<br>${survival.conditions.length?survival.conditions.map(esc).join(" · "):"目前狀態穩定"}</p></div>
 <div class="lore-item"><small>魔法負荷</small><p>${Math.round(magic.strain||0)} / ${magic.capacity||100}<br>${(magic.knownSpells||[]).length?(magic.knownSpells||[]).map(x=>`${esc(x.name)} · 消耗 ${x.cost}`).join("<br>"):"尚未掌握有可靠證據支持的術式"}</p></div>
 <div class="lore-item"><small>你的路線</small><h3>${talents.identity.committed?esc(talents.identity.path.name):"尚未定型"}</h3><p>${esc(talents.identity.description)}<br><small>可用天賦點：${talents.points}</small></p></div>
 <div class="lore-item"><small>當地生活</small><p>${culture?esc(culture.identity||"當地文化仍待理解")+"<br>"+esc(culture.standing):"目前沒有足夠資料"}</p></div>
 <div class="lore-item"><small>已知路線</small><p>${routeText}</p></div>
 <div class="lore-item"><small>附近補給</small><p>${marketText}</p></div>
 <div class="lore-item"><small>遺構記錄</small><p>${dungeonText}</p></div>
 <div class="lore-item"><small>同行者</small><p>${companions.length?companions.map(x=>`${esc(x.name)} · ${esc(x.role||"")} · ${esc(companionLabel(x)||"同行中")}`).join("<br>"):"目前沒有同行夥伴"}</p></div>
 ${talents.owned.length?`<div class="lore-item"><small>已形成的能力</small><p>${talents.owned.map(x=>`${esc(x.pathName||"")} · ${esc(x.name)}`).join("<br>")}</p></div>`:""}
 ${talentRows||'<div class="lore-item"><p>目前沒有新的成長選擇。</p></div>'}
 </div>`);
 qsa("#modalContent [data-learn-talent]").forEach(b=>b.onclick=async()=>{const result=learnTalent(gameState,b.dataset.learnTalent);if(result.ok){await persist();await refresh();$("#runtimeBtn").click()}});
});
$("#impactBtn")?.addEventListener("click",()=>{const snap=impactSnapshot(gameState),recognition=recognitionSnapshot(gameState),records=playerImpactRecords(gameState,50).reverse(),total=Object.values(snap.influence).reduce((a,b)=>a+(Number(b)||0),0);openModal(`<div class="eyebrow">WORLD IMPACT & REPUTATION</div><h2>我改變過的世界</h2><p class="muted">世界會記住你做過的事，但不同地方、人物與勢力只會知道真正傳到他們耳中的部分。</p><div class="lore-list"><div class="lore-item"><small>CURRENT REACH</small><h3>${esc(impactLabel(snap.capability.maxScope))}級影響 · ${esc(renownLabel(recognition.tier))}</h3><p>累積影響 ${total} · 名聲 ${recognition.renown} · 惡名／戒心 ${recognition.notoriety}</p></div>${recognition.titles.length?`<div class="lore-item"><small>HOW THE WORLD NAMES YOU</small><h3>${recognition.titles.map(x=>esc(x.label)).join(" · ")}</h3></div>`:""}${recognition.activeRumors.length?`<div class="lore-item"><small>ACTIVE RUMORS</small><p>${recognition.activeRumors.slice().reverse().map(x=>`${esc(x.targetName||"世界")}：${esc(x.text)}`).join("<br><br>")}</p></div>`:""}${recognition.marks.length?`<div class="lore-item"><small>LEGACY MARKS</small><p>${recognition.marks.slice().reverse().map(x=>`${esc(x.targetName||"世界")} · ${esc(x.label)}`).join("<br>")}</p></div>`:""}${recognition.reactions.length?`<div class="lore-item"><small>WORLD REACTIONS</small><p>${recognition.reactions.slice().reverse().map(x=>esc(x.summary)).join("<br><br>")}</p></div>`:""}${records.map(x=>`<div class="lore-item"><small>DAY ${x.day} · ${esc(impactLabel(x.scope))} · ${esc(x.targetName||"世界")}</small><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p></div>`).join("")||"<div class=\"lore-item\"><p>你尚未對世界造成持久改變。繼續探索、建立關係並介入真正重要的事件。</p></div>"}</div>`)});
$("#journalBtn").onclick=()=>openJournalUI(gameState,openModal,persist,"quests");
$("#inventoryBtn").onclick=()=>openInventoryUI(gameState,openModal,persist,runAction);
$("#historyBtn").onclick=()=>{
 const recaps=recentJourneyCheckpoints(gameState,12).slice().reverse(),events=playerVisibleEvents(gameState,18).filter(e=>e.type!=="SESSION_CHECKPOINT").reverse();
 const recapCards=recaps.map(r=>`<div class="lore-item"><small>DAY ${r.day} · ${esc(r.reason)} · ${esc(r.location||"旅途中")}</small><h3>這段旅程發生了甚麼</h3><p>${esc(r.summary)}</p>${r.discoveries?.length?`<small>記住的線索</small><p>${r.discoveries.map(esc).join("<br>")}</p>`:""}${r.worldChanges?.length?`<small>世界留下的變化</small><p>${r.worldChanges.map(esc).join("<br>")}</p>`:""}${r.unresolved?.length?`<small>仍未放下</small><p>${r.unresolved.map(esc).join("<br>")}</p>`:""}</div>`).join("");
 const recentCards=events.slice(0,8).map(e=>`<div class="lore-item"><small>DAY ${e.day}${e.time?` · ${esc(e.time)}`:""}</small><p>${e.summary?esc(e.summary):e.action?esc(e.customText||e.action):"你繼續走在這個陌生世界裡。"}</p></div>`).join("");
 openModal(`<div class="eyebrow">JOURNEY MEMORY</div><h2>旅程回顧</h2><p class="muted">以自然停頓點整理旅程，而不是把每個 Engine event 當成日誌。</p><div class="lore-list">${recapCards||recentCards||'<div class="lore-item"><p>旅程才剛開始。</p></div>'}</div>`)
};

const autotestDownloadLeases=new Set();
function autotestDownload(filename,body,type="application/json;charset=utf-8"){
 const blob=new Blob([body],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.style.display="none";a.rel="noopener";document.body.appendChild(a);
 const lease={url,a},cleanup=()=>{if(!autotestDownloadLeases.delete(lease))return;try{a.remove()}catch{}try{URL.revokeObjectURL(url)}catch{}};autotestDownloadLeases.add(lease);const timer=setTimeout(cleanup,120000);lease.timer=timer;
 try{a.click();recordDebug("AUTOTEST_EXPORT_DOWNLOAD_TRIGGERED",{filename,bytes:blob.size,userActivation:Boolean(navigator.userActivation?.isActive)});return {filename,bytes:blob.size}}catch(error){clearTimeout(timer);cleanup();throw error}
}
function autotestStamp(){return new Date().toISOString().replace(/[:.]/g,"-")}
function autotestTelemetryErrors(since=0){return telemetryEntries().filter(e=>Number(e.at)>=since&&(/ERROR|FAILED/.test(String(e.type||""))||e.data?.status==="ERROR")).length}
function appendDeveloperAutotestLog(message){
 const line=String(message||"").slice(0,500);developerAutotest.lastMessage=line;developerAutotest.logs.push({at:Date.now(),message:line});developerAutotest.logs=developerAutotest.logs.slice(-80);
 const status=$("#autotestLiveStatus");if(status)status.textContent=line;
 const log=$("#autotestLiveLog");if(log)log.textContent=developerAutotest.logs.slice(-12).map(x=>new Date(x.at).toLocaleTimeString()+" · "+x.message).join("\n");
 const progress=$("#autotestProgressText");if(progress){const total=Number(developerAutotest.config?.totalWorldCount||developerAutotest.config?.worldCount)||0,maxTurns=Number(developerAutotest.config?.maxTurns)||0;progress.textContent=developerAutotest.running?`世界 ${developerAutotest.worldIndex}/${total} · 回合 ${developerAutotest.turn}/${maxTurns}`:"未執行"}
}
function developerAutotestPanelHtml(){
 const c=developerAutotest.config||{mode:"play",worldCount:1,maxTurns:30,stopCondition:"TURN_LIMIT",conditionTarget:10,customCondition:"",exportMode:"both",disableTimeout:false,difficultyMode:"CURRENT"};
 const running=developerAutotest.running,report=developerAutotest.lastReport,summary=report?.summary,exportSnapshot=developerAutotest.exportSnapshot,exportArtifacts=exportSnapshot?buildAutotestExportArtifacts(exportSnapshot):{},saveCapability=autotestSaveCapability(window),difficultyRows=summary?.byDifficulty?Object.entries(summary.byDifficulty).map(([id,row])=>`<div><strong>${esc(DIFFICULTY_PRESETS[id]?.label||id)}</strong> · ${row.worldsCompleted} 完成 / ${row.worldsFailed} 失敗 · ${row.turns} 回合 · ${row.issues} Issues</div>`).join(""):"";
 const retainedRuns=Array.isArray(developerAutotest.retainedRuns)?developerAutotest.retainedRuns:[],retainedOptions=retainedRuns.map(row=>`<option value="${esc(row.slot)}">v${esc(row.appVersion||"?")} · ${esc(row.createdAt||"")} · ${Number(row.worlds)||0} worlds</option>`).join("");
 const nativeUnavailable=!saveCapability.filePicker&&!saveCapability.fileShare,nativeButtons=`${saveCapability.filePicker&&exportArtifacts.debug?'<button id="autotestSaveDebug" class="primary">原生另存 Debug JSON</button>':""}${saveCapability.fileShare&&exportArtifacts.debug?'<button id="autotestShareDebug" class="primary">原生分享 Debug JSON</button>':""}${saveCapability.filePicker&&exportArtifacts.world?'<button id="autotestSaveWorld" class="primary">原生另存世界檔</button>':""}${saveCapability.fileShare&&exportArtifacts.world?'<button id="autotestShareWorld" class="primary">原生分享世界檔</button>':""}${saveCapability.filePicker&&exportArtifacts.recovery?'<button id="autotestSaveRecovery" class="secondary">原生另存 Recovery</button>':""}${saveCapability.fileShare&&exportArtifacts.recovery?'<button id="autotestShareRecovery" class="secondary">原生分享 Recovery</button>':""}${saveCapability.directoryPicker?'<button id="autotestSaveAll" class="secondary">原生另存全部檔案</button>':""}`;
 const retainedControl=retainedOptions?`<div class="lore-item"><small>RETAINED RUNS</small><p>部署與載入新版不會改寫已封存的 run。可在此切回舊 snapshot，再用上方正式原生檔案 API 匯出。</p><div class="settings-actions"><select id="autotestRetainedRun">${retainedOptions}</select><button id="autotestLoadRetainedRun" class="secondary">載入保留 Run</button></div></div>`:"";
 const exportPanel=exportSnapshot?`<div class="lore-item"><small>EXPORT READY · ${esc(exportSnapshot.createdAt||"")} · v${esc(exportSnapshot.appVersion||"?")}</small><h3>AutoTest snapshot 已保存，不需重跑</h3><p>${developerAutotest.exportPersistence?.persisted?"結果已保存於瀏覽器 IndexedDB，並以獨立 run slot 封存；新 run 不會覆蓋這份封存副本。":"結果目前保留在本頁記憶體。"}</p><p><strong>正式匯出：</strong>只使用瀏覽器正式檔案 API。File System Access 可用時直接另存；Web Share File 可用時建立原檔名、原 UTF-8 bytes 的 File 交給系統分享目標。兩者都不可用時只顯示 unsupported，不會自動改走 clipboard、DOM 搬運或間接橋接。</p>${nativeUnavailable?'<p class="error"><strong>目前瀏覽器未提供可用的原生檔案保存／分享 API。</strong> snapshot 仍安全保留，可在支援的同源瀏覽器載入後匯出。</p>':""}<div class="settings-actions">${nativeButtons}<button id="autotestReloadExport" class="secondary">重新載入目前保存結果</button></div><details><summary>標準瀏覽器下載（相容性）</summary><p class="muted">此路徑保留給一般瀏覽器；不會被當成原生保存成功，也不會在 unsupported 時自動觸發。</p><div class="settings-actions">${exportArtifacts.debug?'<button id="autotestDownloadDebug" class="ghost">標準下載 Debug</button>':""}${exportArtifacts.world?'<button id="autotestDownloadWorld" class="ghost">標準下載世界檔</button>':""}${exportArtifacts.recovery?'<button id="autotestDownloadRecovery" class="ghost">標準下載 Recovery</button>':""}</div></details></div>${retainedControl}`:`<div class="lore-item"><small>EXPORT RECOVERY</small><p>若之前已完成測試，可直接載入瀏覽器保存的 snapshot；不需要重跑 AutoTest。</p><button id="autotestReloadExport" class="secondary">載入上次匯出資料</button></div>${retainedControl}`;
 return `<div class="eyebrow">DEVELOPER · AI AUTOTEST</div><h2>AI 自動測試</h2><p class="muted">使用目前已設定的 Elyndra AI Provider/API。測試世界不會覆蓋正式存檔；AI 玩家只會收到真實玩家此刻能看見或已知的情報，不會取得 hidden Canon。</p>
 <div class="settings-grid">
 <label>測試模式<select id="autotestMode" ${running?"disabled":""}><option value="play">AI 遊玩測試</option><option value="worlds">隨機世界生成測試</option></select></label>
 <label>隨機世界數量<input id="autotestWorldCount" type="number" min="1" max="20" value="${Math.max(1,Number(c.worldsPerDifficulty||c.worldCount)||1)}" ${running?"disabled":""}></label>
 <label>遊玩難度<select id="autotestDifficultyMode" ${running?"disabled":""}><option value="CURRENT">維持目前難度</option><option value="easy">簡單</option><option value="normal">普通</option><option value="hard">困難</option><option value="realistic">現實</option><option value="ALL">難度矩陣：全部逐一測試</option></select></label>
 <label>每個世界最多回合<input id="autotestMaxTurns" type="number" min="1" max="500" value="${Math.max(1,Number(c.maxTurns)||30)}" ${running?"disabled":""}></label>
 <label>停止條件<select id="autotestStopCondition" ${running?"disabled":""}><option value="TURN_LIMIT">只按回合上限</option><option value="PLAYER_DOWNED">玩家倒下</option><option value="MAIN_QUEST_COMPLETE">主線完成</option><option value="KNOWLEDGE_SCORE">知識分數達標</option><option value="PLAYER_LEVEL">玩家等級達標</option><option value="DISCOVERIES">發現數達標</option><option value="ERROR_COUNT">錯誤數達標</option><option value="CUSTOM_AI">自訂可觀察條件</option></select></label>
 <label>條件目標值<input id="autotestConditionTarget" type="number" min="1" max="9999" value="${Math.max(1,Number(c.conditionTarget)||10)}" ${running?"disabled":""}></label>
 <label>輸出內容<select id="autotestExportMode" ${running?"disabled":""}><option value="both">Debug + 世界</option><option value="debug">只傳出 Debug</option><option value="world">只傳出世界</option></select></label>
 <label>AI Timeout<span><input id="autotestDisableTimeout" type="checkbox" ${c.disableTimeout?"checked":""} ${running?"disabled":""}> 取消 AI Timeout</span></label>
 </div>
 <label class="full">自訂停止條件<input id="autotestCustomCondition" maxlength="500" value="${esc(c.customCondition||"")}" placeholder="例如：加入任一勢力並取得一項新知識" ${running?"disabled":""}></label>
 <p class="muted">AI 每回合可以直接選擇現有行動按鈕，亦可以自行輸入自由行動。無論設定任何停止條件，回合上限仍會作為安全上限。「取消 AI Timeout」只移除 Provider request 的時間上限；仍可隨時按「停止測試」Abort 當前請求。</p>
 <div class="settings-actions"><button id="autotestStart" class="primary" ${running?"disabled":""}>開始自動測試</button><button id="autotestStop" class="secondary" ${running?"":"disabled"}>停止測試</button></div>
 <div class="lore-list"><div class="lore-item"><small>PROGRESS</small><h3 id="autotestProgressText">${running?`世界 ${developerAutotest.worldIndex}/${c.totalWorldCount||c.worldCount} · 回合 ${developerAutotest.turn}/${c.maxTurns}`:"未執行"}</h3><p id="autotestLiveStatus">${esc(developerAutotest.lastMessage||"設定完成後按「開始自動測試」。")}</p><pre id="autotestLiveLog" class="debug-log">${esc(developerAutotest.logs.slice(-12).map(x=>new Date(x.at).toLocaleTimeString()+" · "+x.message).join("\n"))}</pre></div>
 ${summary?`<div class="lore-item"><small>LAST REPORT</small><h3>${summary.worldsCompleted} 完成 · ${summary.worldsFailed} 失敗 · ${summary.totalTurns} 回合</h3><p>Issues ${summary.issues} · AI Requests ${summary.aiRequests} · Tokens ${Number(summary.tokenTotals?.total||0).toLocaleString()} · 平均 AI latency ${summary.aiLatencyAverageMs}ms</p>${difficultyRows?`<div class="autotest-difficulty-summary">${difficultyRows}</div>`:""}</div>`:""}${exportPanel}</div>
 <p class="muted">AutoTest 完成後先把結果保存到瀏覽器，再由你按按鈕下載；不再於背景連續觸發多檔自動下載。單一世界為 .elyndra，多世界為 JSON bundle；「單一復原包」同時包含 Debug 與全部世界。</p>`;
}
function readDeveloperAutotestConfig(){
 return {
  mode:$("#autotestMode")?.value==="worlds"?"worlds":"play",
  worldCount:Math.max(1,Math.min(20,Math.round(Number($("#autotestWorldCount")?.value)||1))),
  maxTurns:Math.max(1,Math.min(500,Math.round(Number($("#autotestMaxTurns")?.value)||30))),
  stopCondition:String($("#autotestStopCondition")?.value||"TURN_LIMIT"),
  conditionTarget:Math.max(1,Math.round(Number($("#autotestConditionTarget")?.value)||10)),
  customCondition:String($("#autotestCustomCondition")?.value||"").trim().slice(0,500),
  exportMode:["debug","world"].includes($("#autotestExportMode")?.value)?$("#autotestExportMode").value:"both",
  disableTimeout:$("#autotestDisableTimeout")?.checked===true,
  difficultyMode:String($("#autotestDifficultyMode")?.value||"CURRENT"),
  playStrategy:autotestPlayStrategy()
 }
}
function bindDeveloperAutotestPanel(){
 const c=developerAutotest.config||{mode:"play",stopCondition:"TURN_LIMIT",exportMode:"both"};if($("#autotestMode"))$("#autotestMode").value=c.mode||"play";if($("#autotestDifficultyMode"))$("#autotestDifficultyMode").value=c.difficultyMode||"CURRENT";if($("#autotestStopCondition"))$("#autotestStopCondition").value=c.stopCondition||"TURN_LIMIT";if($("#autotestExportMode"))$("#autotestExportMode").value=["debug","world"].includes(c.exportMode)?c.exportMode:"both";
 $("#autotestStart")?.addEventListener("click",()=>{if(developerAutotest.running)return;developerAutotest.config=readDeveloperAutotestConfig();void startDeveloperAutotest(developerAutotest.config)});
 $("#autotestStop")?.addEventListener("click",()=>{developerAutotest.stopRequested=true;const reason=new DOMException("Developer autotest stopped","AbortError");developerAutotest.controller?.abort(reason);developerAutotest.batchController?.abort(reason);appendDeveloperAutotestLog("已要求停止；正在 Abort 當前 AI request，之後於安全點結束。");recordDebug("AUTOTEST_STOP_REQUESTED",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn})});
 $("#autotestDownloadDebug")?.addEventListener("click",()=>void openDeveloperAutotestDownload("debug"));$("#autotestDownloadWorld")?.addEventListener("click",()=>void openDeveloperAutotestDownload("world"));$("#autotestDownloadRecovery")?.addEventListener("click",()=>void openDeveloperAutotestDownload("recovery"));
 $("#autotestSaveDebug")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("debug"));$("#autotestSaveWorld")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("world"));$("#autotestSaveRecovery")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("recovery"));$("#autotestSaveAll")?.addEventListener("click",()=>void saveAllDeveloperAutotestArtifacts());
 $("#autotestShareDebug")?.addEventListener("click",()=>void shareDeveloperAutotestArtifact("debug"));$("#autotestShareWorld")?.addEventListener("click",()=>void shareDeveloperAutotestArtifact("world"));$("#autotestShareRecovery")?.addEventListener("click",()=>void shareDeveloperAutotestArtifact("recovery"));
 $("#autotestLoadRetainedRun")?.addEventListener("click",()=>void loadDeveloperAutotestRetainedRun(String($("#autotestRetainedRun")?.value||"")));
$("#autotestReloadExport")?.addEventListener("click",()=>void reloadDeveloperAutotestExport())
}
function openDeveloperAutotestPanel(){openModal(developerAutotestPanelHtml());bindDeveloperAutotestPanel()}
$("#developerBtn")?.addEventListener("click",openDeveloperAutotestPanel);

function autotestForegroundIdle(){return !aiBusy&&!turnSyncBusy&&!nonblockingScene.controller&&!deferredDirector.running}
async function waitForAutotestIdle(timeoutMs=12000){
 const started=Date.now();
 while(Date.now()-started<timeoutMs){
  if(autotestForegroundIdle())return true;
  await new Promise(r=>setTimeout(r,80))
 }
 if(autotestForegroundIdle())return true;
 recordDebug("AUTOTEST_IDLE_TIMEOUT",{timeoutMs,aiBusy,turnSyncBusy,nonblocking:Boolean(nonblockingScene.controller),deferred:deferredDirector.running});
 return false
}
async function finalizeDeveloperAutotestWorld(config={}){
 if(!gameState||developerAutotest.stopRequested||developerAutotest.batchController?.signal?.aborted)return false;
 const fastTransition=developerAutotest.worldIndex<Math.max(1,Number(config.totalWorldCount||config.worldCount)||1),transitionFrom=developerAutotest.worldIndex,transitionTo=transitionFrom+1;
 if(fastTransition){
  recordDebug("AUTOTEST_WORLD_TRANSITION_STARTED",{fromIndex:transitionFrom,toIndex:transitionTo,turn:developerAutotest.turn});
  const qualityWaitStarted=Date.now();while((worldQualityBackground.running||worldQualityBackground.timer)&&Date.now()-qualityWaitStarted<20000){await new Promise(r=>setTimeout(r,120))}
  cancelAutotestBackgroundWork({transition:true})
 }
 const timeoutMs=fastTransition?2500:(config.disableTimeout===true?180000:90000),started=Date.now();
 while(Date.now()-started<timeoutMs){
  const settled=(fastTransition||!document.hidden)&&autotestForegroundIdle()&&!autotestRuntimeExpansion.running&&!worldBackground.running&&!historyBackground.running&&!worldQualityBackground.running;
  if(settled)break;
  if(document.hidden&&!fastTransition)await waitForAutotestVisible();else await new Promise(r=>setTimeout(r,120))
 }
 const runtimeSettled=(fastTransition||!document.hidden)&&autotestForegroundIdle()&&!autotestRuntimeExpansion.running&&!worldBackground.running&&!historyBackground.running&&!worldQualityBackground.running;
 if(!runtimeSettled){
  recordDebug("AUTOTEST_FINAL_SETTLE_TIMEOUT",{timeoutMs,fastTransition,foregroundIdle:autotestForegroundIdle(),runtimeExpansion:autotestRuntimeExpansion.running,worldBackground:worldBackground.running,historyBackground:historyBackground.running,worldQualityBackground:worldQualityBackground.running});
  if(!fastTransition)return false
 }
 if(fastTransition){
  const finalQuality=gameState?.world?.quality||{},qualityPending=backgroundQualityNeed(gameState).required||finalQuality.pending===true||finalQuality.backgroundPending===true||String(finalQuality.status||"").toUpperCase()==="PENDING";
  if(qualityPending)recordDebug("AUTOTEST_FINAL_QUALITY_DEFERRED",{worldIndex:transitionFrom,turn:developerAutotest.turn,reason:"WORLD_TRANSITION"});
  recordDebug("AUTOTEST_WORLD_TRANSITION_READY",{fromIndex:transitionFrom,toIndex:transitionTo,turn:developerAutotest.turn,runtimeSettled,qualityPending,elapsedMs:Date.now()-started});
  return runtimeSettled&&!qualityPending
 }
 if(backgroundQualityNeed(gameState).required){
  recordDebug("AUTOTEST_FINAL_QUALITY_STARTED",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn});
  await runBackgroundWorldQualityCritic({allowAutotest:true})
 }
 const finalQuality=gameState?.world?.quality||{},qualityStatus=String(finalQuality.status||"").toUpperCase(),qualityUnavailable=qualityStatus==="UNAVAILABLE",qualitySettled=!backgroundQualityNeed(gameState).required&&finalQuality.pending!==true&&finalQuality.backgroundPending!==true&&qualityStatus!=="PENDING"&&!qualityUnavailable,qualityTerminal=qualitySettled||qualityUnavailable;
 const finalQualitySettleKey=[gameState?.world?.id||"",developerAutotest.turn,qualitySettled,qualityUnavailable].join(":");if(developerAutotest.finalQualitySettleKey!==finalQualitySettleKey){developerAutotest.finalQualitySettleKey=finalQualitySettleKey;recordDebug("AUTOTEST_FINAL_QUALITY_SETTLED",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn,qualitySettled,qualityUnavailable})}
 return qualityTerminal
}
async function waitForAutotestActionReady(timeoutMs=38000){
 const started=Date.now();
 while(Date.now()-started<timeoutMs){
  if(!playerActionFlight.active)return true;
  await new Promise(r=>setTimeout(r,25))
 }
 if(!playerActionFlight.active)return true;
 recordDebug("AUTOTEST_ACTION_READY_TIMEOUT",{timeoutMs,active:playerActionFlight.active,label:playerActionFlight.label,nonblocking:Boolean(nonblockingScene.controller),aiBusy,turnSyncBusy});
 return false
}
function cancelAutotestBackgroundWork(options={}){
 const transition=options?.transition===true;
 if(deferredDirector.timer){clearTimeout(deferredDirector.timer);deferredDirector.timer=0}
 if(worldBackground.timer){clearTimeout(worldBackground.timer);worldBackground.timer=0}
 if(worldQualityBackground.timer){clearTimeout(worldQualityBackground.timer);worldQualityBackground.timer=0}
 if(historyBackground.timer){clearTimeout(historyBackground.timer);historyBackground.timer=0}
 const expansionCtrl=autotestRuntimeExpansion.controller;
 if(expansionCtrl&&!expansionCtrl.signal.aborted)expansionCtrl.abort(new DOMException(transition?"AutoTest world transition":"AutoTest stopping","AbortError"));
 if(transition&&autotestRuntimeExpansion.controller===expansionCtrl){
  autotestRuntimeExpansion.controller=null;autotestRuntimeExpansion.running=false;autotestRuntimeExpansion.reason="";autotestRuntimeExpansion.turn=0;autotestRuntimeExpansion.cooldownUntil=0;autotestRuntimeExpansion.lastStartedTurn=0;autotestRuntimeExpansion.lastCompletedTurn=0
 }
 preemptBackgroundAI();
 if(transition)recordDebug("AUTOTEST_WORLD_BACKGROUND_CANCELLED",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn,runtimeExpansion:Boolean(expansionCtrl),foregroundIdle:autotestForegroundIdle()})
}
async function createDeveloperAutotestWorld(raw,index){
 const draft=createWorldCreationDraft(raw),seed=compileWorldCreation(draft),state=newGame(seed);applyWorldCreationState(state,seed);
 recordDebug("AUTOTEST_WORLD_GENERATION_STARTED",{index,masterSeed:seed.worldCreationSeed||draft.masterSeed,genre:seed.genre||raw.worldStyle,scale:seed.scale||raw.worldScale,difficulty:raw.difficulty});
 const candidate=await generateWorldCandidate(seed,state.world.constitution,p=>appendDeveloperAutotestLog(`世界 ${index} · ${p.label||"World Compiler"} ${p.progress||0}%`));
 const creationValidation=validateWorldCreationCandidate(seed,candidate);if(!creationValidation.valid)throw new Error("AUTOTEST_WORLD_CONSTITUTION_FAILED:"+creationValidation.errors.join(","));
 applyWorldCandidate(state,candidate);canonizeGeneration(state,candidate.generation);applyOriginRuntime(state,{phase:"POST_CANON"});
 const migrated=migrate(state),validation=validateWorld(migrated.world);if(!validation.valid)throw new Error("AUTOTEST_WORLD_INVALID:"+validation.errors.join(","));
 recordDebug("AUTOTEST_WORLD_GENERATION_COMPLETED",{index,worldId:migrated.world?.id,name:migrated.world?.name,genre:migrated.world?.seedContract?.genre||raw.worldStyle});
 return {state:migrated,raw,seed:{masterSeed:seed.worldCreationSeed||draft.masterSeed,genre:seed.genre||raw.worldStyle,scale:seed.scale||raw.worldScale,difficulty:raw.difficulty},validation,generationDiagnostics:structuredClone(candidate?.generationDiagnostics||migrated.world?.generationDiagnostics||null)}
}
async function expandDeveloperAutotestWorld(reason="WORLD_EDGE_UNDERDEFINED",options={}){
 const state=gameState,sessionToken=captureStateSession(),pending=pendingRuntimeGenerationPlan(state),force=options?.force===true;if(!developerAutotestActive||!state||!aiStatus.aiConfigured||(!force&&!needsExpansion(state)&&!pending))return false;
 const background=options?.background===true,signal=options?.signal||developerAutotest.batchController?.signal,plan=pending||planLazyGeneration(state,{reason}),startedAt=Date.now();recordDebug("AUTOTEST_RUNTIME_EXPANSION_STARTED",{reason,planId:plan.id,resumeStage:plan.checkpoint?.stage||null,background,force});
 try{
  const ex=await generateRegionExpansion(state,reason,{signal,plan,onStage:background?undefined:stage=>commitRuntimeStageCheckpoint(plan,stage,sessionToken,state)});if(signal?.aborted||!isCurrentStateSession(sessionToken))throw signal?.reason||new DOMException("AutoTest expansion stale","AbortError");if(!ex?.generation)throw new Error("AUTOTEST_RUNTIME_EXPANSION_EMPTY");
  const valid=validateLazyGenerationCandidate(state,ex.generation,plan,{added:plan.checkpoint?.added});if(!valid.valid)throw new Error("AUTOTEST_LAZY_GENERATION_CONTRACT_FAILED:"+valid.errors.join(","));
  const added=plan.checkpoint?.added||canonizeGeneration(state,ex.generation),committed=commitLazyGeneration(state,plan,ex.generation,added,{sourceProvider:ex.generationSource?.provider,sourceModel:ex.generationSource?.model});if(!committed.ok)throw new Error("AUTOTEST_LAZY_GENERATION_COMMIT_FAILED:"+committed.errors.join(","));
  recordExpansion(state,ex.region||plan.region||"未知邊境",ex.reason||reason);state.world.state.flags.requestExpansion=false;markWorldEvolution(state,{reason});bumpStateRevision(state,"AUTOTEST_RUNTIME_EXPANSION");
  await persist(state,sessionToken);if(!background&&isCurrentStateSession(sessionToken))await refresh();recordDebug("AUTOTEST_RUNTIME_EXPANSION_COMPLETED",{reason,planId:plan.id,elapsedMs:Date.now()-startedAt,locations:added.locations?.length||0,npcs:added.npcs?.length||0,factions:added.factions?.length||0,sideQuests:added.sideQuests?.length||0,background});return true
 }catch(e){const checkpointed=hasLazyGenerationCheckpoint(plan);if(plan.status==="PLANNED"&&!checkpointed)abortLazyGeneration(state,plan,e?.message||"AUTOTEST_RUNTIME_EXPANSION_FAILED");recordDebug("AUTOTEST_RUNTIME_EXPANSION_FAILED",{reason,planId:plan.id,error:e?.message||String(e),checkpointed,resumeStage:plan.checkpoint?.stage||null,elapsedMs:Date.now()-startedAt,background});return false}
}
function autotestRecentStallCount(rows=[]){let count=0;for(const row of rows.slice().reverse()){if(row?.progressed!==false)break;count++}return count}
function scheduleDeveloperAutotestExpansion(reason="FIRST_BUTTON_STALL_RECOVERY",turn=0){
 const forcedRecovery=/STALL_RECOVERY/.test(String(reason||"")),turnNo=Math.max(0,Number(turn)||0),lastTurn=Math.max(0,Number(autotestRuntimeExpansion.lastStartedTurn)||0);
 if(turnNo&&lastTurn&&turnNo-lastTurn<3){recordDebug("AUTOTEST_RUNTIME_EXPANSION_THROTTLED",{reason,turn:turnNo,lastStartedTurn:lastTurn,minTurnGap:3});return false}
 if(!developerAutotestActive||!developerAutotest.running||!gameState||!aiStatus.aiConfigured||autotestRuntimeExpansion.running||Date.now()<Number(autotestRuntimeExpansion.cooldownUntil||0)||(!forcedRecovery&&!needsExpansion(gameState)))return false;
 const stateToken=captureStateSession(),batchSignal=developerAutotest.batchController?.signal;if(batchSignal?.aborted)return false;
 const ctrl=new AbortController(),worldId=gameState.world?.id,relay=()=>{if(!ctrl.signal.aborted)ctrl.abort(batchSignal?.reason||new DOMException("AutoTest batch stopped","AbortError"))};if(batchSignal)batchSignal.addEventListener("abort",relay,{once:true});
 autotestRuntimeExpansion.running=true;autotestRuntimeExpansion.controller=ctrl;autotestRuntimeExpansion.reason=reason;autotestRuntimeExpansion.turn=turnNo;autotestRuntimeExpansion.lastStartedTurn=turnNo;recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_STARTED",{reason,turn:turnNo,worldId,forcedRecovery});
 void expandDeveloperAutotestWorld(reason,{background:true,signal:ctrl.signal,force:forcedRecovery}).then(ok=>{autotestRuntimeExpansion.cooldownUntil=Date.now()+(ok?20000:15000);if(ok)autotestRuntimeExpansion.lastCompletedTurn=turnNo;if(isCurrentStateSession(stateToken))recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_COMPLETED",{reason,turn:turnNo,worldId,ok,cooldownUntil:autotestRuntimeExpansion.cooldownUntil,lastCompletedTurn:autotestRuntimeExpansion.lastCompletedTurn})}).finally(()=>{if(batchSignal)batchSignal.removeEventListener("abort",relay);if(autotestRuntimeExpansion.controller===ctrl){autotestRuntimeExpansion.controller=null;autotestRuntimeExpansion.running=false;autotestRuntimeExpansion.reason="";autotestRuntimeExpansion.turn=0}});
 return true
}

async function executeDeveloperAutotestDecision(decision){
 if(decision.mode==="combat"){await runCombatAction(decision.combatAction||"attack");return}
 if(decision.mode==="suggestion"){
  const source=gameState?.suggestionIntents?.length?gameState.suggestionIntents:(gameState?.suggestions||[]),chosen=source[Math.max(0,Math.min(source.length-1,Number(decision.suggestionIndex)||0))];
  if(chosen&&typeof chosen==="object"){await runAction("free",chosen.action||chosen.label||decision.action,{suggestion:chosen});return}
  if(typeof chosen==="string"){await runAction("free",chosen);return}
 }
 await runAction("free",decision.action||"觀察四周並確認目前最明顯的變化")
}
async function exportDeveloperAutotestResults(report,results){
 const snapshot=buildAutotestExportSnapshot({appVersion:APP_VERSION,report,results,telemetry:telemetryEntries(),startedAt:developerAutotest.startedAt,exportMode:developerAutotest.config?.exportMode||"both"});developerAutotest.exportSnapshot=snapshot;
 try{developerAutotest.exportPersistence=await saveLastAutotestExportSnapshot(snapshot);await refreshDeveloperAutotestRetainedRuns();recordDebug("AUTOTEST_EXPORT_PERSISTED",{backend:developerAutotest.exportPersistence.backend,worlds:snapshot.worlds.length,archiveSlot:developerAutotest.exportPersistence.archiveSlot||null})}
 catch(error){developerAutotest.exportPersistence={backend:"memory",persisted:false,error:error?.message||String(error)};recordDebug("AUTOTEST_EXPORT_PERSIST_FAILED",{error:developerAutotest.exportPersistence.error})}
 const artifacts=buildAutotestExportArtifacts(snapshot),sizes=Object.fromEntries(Object.entries(artifacts).filter(([,a])=>a).map(([k,a])=>[k,new Blob([a.body],{type:a.mime}).size]));recordDebug("AUTOTEST_EXPORT_READY",{artifacts:Object.keys(sizes),sizes,persisted:developerAutotest.exportPersistence?.persisted===true,backend:developerAutotest.exportPersistence?.backend||"memory"});
 appendDeveloperAutotestLog(`匯出資料已準備${developerAutotest.exportPersistence?.persisted?"並保存到瀏覽器":"於本頁記憶體"}；請用下方正式原生檔案按鈕匯出，無需重跑測試。`);return snapshot
}
function developerAutotestArtifact(kind){const snapshot=developerAutotest.exportSnapshot;if(!snapshot)return null;return buildAutotestExportArtifacts(snapshot)[kind]||null}
function developerAutotestDragLabel(kind){return kind==="debug"?"Debug JSON":kind==="world"?"世界檔":"Recovery JSON"}
function developerAutotestDragHtml(){
 const p=developerAutotestDrag.payload;if(!p)return `<div class="eyebrow">AUTOTEST · NATIVE DRAG</div><h2>沒有可拖出資料</h2><button id="autotestDragBack" class="secondary">返回 AutoTest</button>`;
 const label=developerAutotestDragLabel(developerAutotestDrag.kind),test=developerAutotestDrag.selfTest,testHtml=test?(test.ok?`<p class="success"><strong>PASS · IAB File payload 已在頁內 drop 自測驗證</strong><br>${esc(test.filename)} · ${Number(test.bytes).toLocaleString()} bytes<br>SHA-256 <code>${esc(test.sha256)}</code></p>`:`<p class="error"><strong>FAIL · drop payload 不完整</strong><br>${esc(test.filename||"")} · ${Number(test.bytes||0).toLocaleString()} bytes<br>SHA-256 <code>${esc(test.sha256||"")}</code></p>`):`<p class="muted">尚未做頁內 drop 自測。先把上方檔案卡拖到此區，可驗證 IAB drag data store 中的 File 是否 byte-for-byte 正確。</p>`;
 return `<div class="eyebrow">AUTOTEST · IAB NATIVE FILE DRAG</div><h2>${esc(label)} 原生檔案交付</h2><div class="lore-item"><p><strong>檔名：</strong><code>${esc(p.filename)}</code></p><p><strong>大小：</strong>${Number(p.bytes).toLocaleString()} bytes · ${Number(p.chars).toLocaleString()} 字元</p><p><strong>SHA-256：</strong><code>${esc(p.sha256)}</code></p><p class="muted">此卡在 dragstart 同時嘗試發布原生 File item 與 Chromium DownloadURL；IAB/自動化層可能不支援 native drag。dropEffect=none 或 items.add(File) 回傳 null 時，請改用標準下載。Elyndra 不會把「開始拖曳」誤報為已保存或已上傳。</p></div><div id="autotestDragFile" draggable="true" tabindex="0" style="border:2px dashed currentColor;border-radius:14px;padding:28px;margin:18px 0;text-align:center;cursor:grab;user-select:none"><strong>⬇ 拖曳 ${esc(p.filename)}</strong><br><small>${Number(p.bytes).toLocaleString()} bytes · SHA-256 ${esc(p.sha256)}</small><br><span>拖到 Explorer / ChatGPT Web</span></div><div id="autotestDragSelfTest" style="border:1px dashed currentColor;border-radius:12px;padding:20px;margin:14px 0;text-align:center"><strong>頁內 IAB File 自測區</strong>${testHtml}</div><div class="settings-actions"><button id="autotestDragTextRescue" class="secondary">文字分段救援</button><button id="autotestDragBack" class="ghost">返回 AutoTest</button></div><p id="autotestDragStatus" class="muted">尚未向外部目的地交付。只有目的地實際接受 drop 後，才可在目的地驗證檔名與大小；Windows/ChatGPT 的最終保存狀態無法由來源頁面自行證明。</p>`
}
function bindDeveloperAutotestDrag(){
 const source=$("#autotestDragFile"),zone=$("#autotestDragSelfTest"),status=$("#autotestDragStatus");
 source?.addEventListener("dragstart",event=>{try{const info=applyAutotestDragPayload(event.dataTransfer,developerAutotestDrag.payload);developerAutotestDrag.lastDrag={startedAt:Date.now(),info};if(status)status.textContent=`Drag payload 已建立：File item=${info.fileItem?"YES":"NO"} · DownloadURL=${info.downloadURL?"YES":"NO"}。尚未證明目的地已保存/上傳。`;recordDebug("AUTOTEST_NATIVE_DRAG_STARTED",{kind:developerAutotestDrag.kind,filename:info.filename,bytes:info.bytes,sha256:info.sha256,fileItem:info.fileItem,downloadURL:info.downloadURL})}catch(error){if(status)status.textContent=`建立 drag payload 失敗：${error?.message||error}`;recordDebug("AUTOTEST_NATIVE_DRAG_FAILED",{kind:developerAutotestDrag.kind,error:error?.message||String(error)});event.preventDefault()}});
 source?.addEventListener("dragend",event=>{const effect=String(event.dataTransfer?.dropEffect||"none");if(status)status.textContent=effect!=="none"?`目的地回報接受 drag（dropEffect=${effect}）。這不是保存/上傳完成證明；請在 Explorer 或 ChatGPT Web 以檔名/大小驗證。`:`未收到外部目的地接受信號（dropEffect=${effect}）。`;recordDebug("AUTOTEST_NATIVE_DRAG_ENDED",{kind:developerAutotestDrag.kind,dropEffect:effect,filename:developerAutotestDrag.payload?.filename||""})});
 zone?.addEventListener("dragover",event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect="copy"});
 zone?.addEventListener("drop",event=>{event.preventDefault();const file=event.dataTransfer?.files?.[0]||Array.from(event.dataTransfer?.items||[]).map(item=>item?.kind==="file"?item.getAsFile?.():null).find(Boolean);void verifyAutotestDragFile(file,developerAutotestDrag.payload).then(result=>{developerAutotestDrag.selfTest=result;recordDebug(result.ok?"AUTOTEST_NATIVE_DRAG_SELFTEST_PASS":"AUTOTEST_NATIVE_DRAG_SELFTEST_FAIL",result);openModal(developerAutotestDragHtml());bindDeveloperAutotestDrag()}).catch(error=>{developerAutotestDrag.selfTest={ok:false,filename:file?.name||"",bytes:file?.size||0,sha256:"",error:error?.message||String(error)};recordDebug("AUTOTEST_NATIVE_DRAG_SELFTEST_FAIL",developerAutotestDrag.selfTest);openModal(developerAutotestDragHtml());bindDeveloperAutotestDrag()})});
 $("#autotestDragTextRescue")?.addEventListener("click",()=>void openDeveloperAutotestTextTransfer(developerAutotestDrag.kind));$("#autotestDragBack")?.addEventListener("click",openDeveloperAutotestPanel)
}
async function openDeveloperAutotestDragExport(kind){const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可拖出的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}try{const payload=await buildAutotestDragPayload(artifact);developerAutotestDrag.kind=kind;developerAutotestDrag.payload=payload;developerAutotestDrag.selfTest=null;developerAutotestDrag.lastDrag=null;recordDebug("AUTOTEST_NATIVE_DRAG_READY",{kind,filename:payload.filename,bytes:payload.bytes,chars:payload.chars,sha256:payload.sha256});openModal(developerAutotestDragHtml());bindDeveloperAutotestDrag()}catch(error){appendDeveloperAutotestLog(`原生拖出資料建立失敗：${error?.message||error}`);recordDebug("AUTOTEST_NATIVE_DRAG_PREPARE_FAILED",{kind,error:error?.message||String(error)});openDeveloperAutotestPanel()}}
function releaseDeveloperAutotestDownloadLease(){try{developerAutotestDownload.lease?.revoke?.()}catch{}developerAutotestDownload.lease=null}
function developerAutotestDownloadLabel(kind){return kind==="debug"?"Debug JSON":kind==="world"?"世界檔":"Recovery JSON"}
function developerAutotestDownloadHtml(){
 const p=developerAutotestDownload.payload;if(!p)return `<div class="eyebrow">AUTOTEST · VERIFIED DOWNLOAD</div><h2>沒有可下載資料</h2><button id="autotestDownloadBack" class="secondary">返回 AutoTest</button>`;
 const label=developerAutotestDownloadLabel(developerAutotestDownload.kind),request=developerAutotestDownload.request,verification=developerAutotestDownload.verification;
 const proof=verification?(verification.ok?`<p class="success"><strong>PASS · 實際檔案已驗證</strong><br>${esc(verification.filename)} · ${Number(verification.bytes).toLocaleString()} bytes<br>SHA-256 <code>${esc(verification.sha256)}</code></p>`:`<p class="error"><strong>FAIL · 實際檔案不一致</strong><br>實際：${esc(verification.filename||"")} · ${Number(verification.bytes||0).toLocaleString()} bytes · <code>${esc(verification.sha256||"")}</code><br>預期：${esc(p.filename)} · ${Number(p.bytes).toLocaleString()} bytes · <code>${esc(p.sha256)}</code></p>`):request?.status==="requested"?`<p class="muted"><strong>DOWNLOAD REQUESTED · NOT VERIFIED</strong><br>瀏覽器已收到標準下載點擊，但 Elyndra 不會把這一步當成保存成功。請在下載完成後用下方檔案選擇器重新選回檔案。</p>`:`<p class="muted"><strong>尚未要求下載。</strong> 點擊後仍不會宣稱成功，直到實際檔案通過驗證。</p>`;
 return `<div class="eyebrow">AUTOTEST · VERIFIED DOWNLOAD</div><h2>${esc(label)} 標準下載</h2><div class="lore-item"><p><strong>檔名：</strong><code>${esc(p.filename)}</code></p><p><strong>大小：</strong>${Number(p.bytes).toLocaleString()} bytes · ${Number(p.chars).toLocaleString()} 字元</p><p><strong>SHA-256：</strong><code>${esc(p.sha256)}</code></p><p class="muted">開啟此驗證頁不會自動觸發下載。請在頁內明確按一次「下載檔案」；受控環境使用同源 Service Worker HTTP attachment + 原生 download 連結，未受控時才退回 Blob。只有把實際檔案重新選回並通過驗證才算完成。</p></div>${proof}<div class="settings-actions"><a id="autotestDownloadAnchor" class="primary" href="#">${request?.status==="requested"?"重新下載檔案":"下載檔案"}</a><label class="secondary" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer">驗證已下載檔案<input id="autotestDownloadVerifyFile" type="file" style="display:none"></label><button id="autotestDownloadCodex" class="secondary">Codex 無下載取回</button><button id="autotestDownloadBack" class="ghost">返回 AutoTest</button></div><p id="autotestDownloadStatus" class="muted">若此 IAB 點擊後沒有產生可保存的下載檔，停止重試 drag；唯一有效驗證是取得實際檔案後在此選回，並讓檔名、bytes、SHA-256 全部一致。</p>`
}
function bindDeveloperAutotestDownload(){
 const p=developerAutotestDownload.payload,lease=developerAutotestDownload.lease,anchor=$("#autotestDownloadAnchor"),input=$("#autotestDownloadVerifyFile"),status=$("#autotestDownloadStatus");
 if(anchor&&p&&lease){anchor.href=lease.url;if(lease.method==="service-worker-http"){anchor.removeAttribute?.("download");anchor.target="_blank";anchor.rel="noopener";anchor.dataset.elyndraNativeDownload="service-worker-http-isolated-navigation"}else{anchor.download=p.filename;anchor.removeAttribute?.("target");anchor.rel="noopener"}anchor.addEventListener("click",()=>{developerAutotestDownload.request={status:"requested",requestedAt:Date.now(),filename:p.filename,bytes:p.bytes,sha256:p.sha256};developerAutotestDownload.verification=null;if(status)status.textContent=`DOWNLOAD REQUESTED · NOT VERIFIED · ${p.filename} · ${Number(p.bytes).toLocaleString()} bytes · SHA-256 ${p.sha256}`;recordDebug("AUTOTEST_DOWNLOAD_REQUESTED",{kind:developerAutotestDownload.kind,filename:p.filename,bytes:p.bytes,sha256:p.sha256,userActivation:Boolean(navigator.userActivation?.isActive)})})}
 $("#autotestDownloadCodex")?.addEventListener("click",()=>void openDeveloperAutotestTextTransfer(developerAutotestDownload.kind));
 input?.addEventListener("change",()=>{const file=input.files?.[0]||null;void verifyAutotestDownloadedFile(file,p).then(result=>{developerAutotestDownload.verification=result;recordDebug(result.ok?"AUTOTEST_DOWNLOAD_VERIFIED":"AUTOTEST_DOWNLOAD_VERIFY_FAILED",{kind:developerAutotestDownload.kind,...result});openModal(developerAutotestDownloadHtml());bindDeveloperAutotestDownload()}).catch(error=>{developerAutotestDownload.verification={ok:false,filename:file?.name||"",bytes:file?.size||0,sha256:"",error:error?.message||String(error)};recordDebug("AUTOTEST_DOWNLOAD_VERIFY_FAILED",{kind:developerAutotestDownload.kind,error:error?.message||String(error)});openModal(developerAutotestDownloadHtml());bindDeveloperAutotestDownload()})});
 $("#autotestDownloadBack")?.addEventListener("click",()=>{releaseDeveloperAutotestDownloadLease();openDeveloperAutotestPanel()})
}
async function openDeveloperAutotestDownload(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可下載的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 releaseDeveloperAutotestDownloadLease();
 try{const payload=await buildAutotestDownloadPayload(artifact),bridge=await ensureAutotestDownloadBridge({scriptUrl:"./autotest-export-sw.js?v=57025",scope:"./",timeoutMs:8000}),lease=createAutotestDownloadLease(payload);developerAutotestDownload.kind=kind;developerAutotestDownload.payload=payload;developerAutotestDownload.lease=lease;developerAutotestDownload.request=null;developerAutotestDownload.verification=null;recordDebug("AUTOTEST_DOWNLOAD_READY",{kind,filename:payload.filename,bytes:payload.bytes,chars:payload.chars,sha256:payload.sha256,immediateRequested:false,bridgeStatus:bridge.status,bridgeControlled:bridge.controlled,leaseMethod:lease.method});openModal(developerAutotestDownloadHtml());bindDeveloperAutotestDownload()}
 catch(error){appendDeveloperAutotestLog(`標準下載資料建立失敗：${error?.message||error}`);recordDebug("AUTOTEST_DOWNLOAD_PREPARE_FAILED",{kind,error:error?.message||String(error)});openDeveloperAutotestPanel()}
}
function developerAutotestTransferLabel(kind){return kind==="debug"?"Debug JSON":kind==="world"?"世界檔":"Recovery JSON"}
function developerAutotestTransferHtml(){
 const t=developerAutotestTransfer.transfer;if(!t)return `<div class="eyebrow">AUTOTEST · IAB TRANSFER</div><h2>沒有可顯示資料</h2><button id="autotestTransferBack" class="secondary">返回 AutoTest</button>`;
 const full=developerAutotestTransfer.full,index=Math.max(0,Math.min(t.chunks.length-1,developerAutotestTransfer.index)),chunk=t.chunks[index]||{text:"",index:0,chars:0,bytes:0,sha256:""},payload=full?reconstructAutotestTextTransfer(t):chunk.text,manifest=JSON.stringify(autotestTransferManifest(t),null,2),label=developerAutotestTransferLabel(developerAutotestTransfer.kind);
 return `<div class="eyebrow" data-autotest-codex-kind="${esc(developerAutotestTransfer.kind)}" data-autotest-codex-filename="${esc(t.filename)}" data-autotest-codex-sha256="${esc(t.sha256)}" data-autotest-codex-bytes="${Number(t.bytes)}" data-autotest-codex-chunks="${Number(t.totalChunks)}">AUTOTEST · IAB TEXT TRANSFER</div><h2>${esc(label)} 頁面取回</h2><div class="lore-item"><p><strong>檔名：</strong><code>${esc(t.filename)}</code></p><p><strong>完整 SHA-256：</strong><code>${esc(t.sha256)}</code></p><p>${Number(t.bytes).toLocaleString()} bytes · ${Number(t.chars).toLocaleString()} 字元 · ${t.totalChunks} 段 · encoding = utf-8-raw-concat</p><p class="muted">此路徑不呼叫 File Picker、navigator.clipboard 或下載管理器。分段模式請依 1 → ${t.totalChunks} 原樣串接，不要加入額外換行或標記；重組後 SHA-256 必須等於上方值。</p></div><div class="settings-actions"><button id="autotestTransferSelect" class="primary">${full?"選取完整 JSON":"選取本段"}</button><button id="autotestTransferPrev" class="secondary" ${full||index<=0?"disabled":""}>上一段</button><button id="autotestTransferNext" class="secondary" ${full||index>=t.chunks.length-1?"disabled":""}>下一段</button><button id="autotestTransferToggleFull" class="secondary">${full?"返回分段模式":"完整 JSON 單頁模式"}</button><button id="autotestTransferBack" class="ghost">返回 AutoTest</button></div><p><strong>${full?"完整檔案":`第 ${chunk.index} / ${t.totalChunks} 段`}</strong>${full?` · SHA-256 ${esc(t.sha256)}`:` · ${Number(chunk.bytes).toLocaleString()} bytes · ${Number(chunk.chars).toLocaleString()} 字元 · SHA-256 ${esc(chunk.sha256)}`}</p><textarea id="autotestTransferText" readonly spellcheck="false" wrap="off" rows="18" style="width:100%;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre;overflow:auto">${esc(payload)}</textarea><p class="muted">按「選取」只建立原生文字選取，不宣稱已寫入剪貼簿；之後的 Ctrl+C 由瀏覽器原生選取機制處理。</p><details open><summary>Codex 無下載 Bridge</summary><p class="muted">不使用下載管理器、File Picker 或剪貼簿。Codex 可在本頁執行 <code>await window.__ELYNDRA_AUTOTEST_CODEX__.manifest("${esc(developerAutotestTransfer.kind)}")</code>，再依 1..totalChunks 呼叫 <code>read(kind,index)</code>，原樣串接 text、以 UTF-8 寫檔，最後用本機 SHA-256 對照 manifest.sha256。來源頁只提供 bytes，不會把它誤報成已保存。</p></details><details><summary>完整性 Manifest</summary><textarea readonly spellcheck="false" wrap="off" rows="10" style="width:100%;font-family:ui-monospace,SFMono-Regular,Consolas,monospace">${esc(manifest)}</textarea></details>`
}
function bindDeveloperAutotestTransfer(){
 $("#autotestTransferSelect")?.addEventListener("click",()=>{const area=$("#autotestTransferText");if(!area)return;area.focus();area.select();area.setSelectionRange?.(0,area.value.length);recordDebug("AUTOTEST_TEXT_TRANSFER_SELECTED",{kind:developerAutotestTransfer.kind,index:developerAutotestTransfer.full?0:developerAutotestTransfer.index+1,full:developerAutotestTransfer.full,chars:area.value.length})});
 $("#autotestTransferPrev")?.addEventListener("click",()=>{developerAutotestTransfer.index=Math.max(0,developerAutotestTransfer.index-1);openModal(developerAutotestTransferHtml());bindDeveloperAutotestTransfer()});
 $("#autotestTransferNext")?.addEventListener("click",()=>{developerAutotestTransfer.index=Math.min((developerAutotestTransfer.transfer?.totalChunks||1)-1,developerAutotestTransfer.index+1);openModal(developerAutotestTransferHtml());bindDeveloperAutotestTransfer()});
 $("#autotestTransferToggleFull")?.addEventListener("click",()=>{developerAutotestTransfer.full=!developerAutotestTransfer.full;openModal(developerAutotestTransferHtml());bindDeveloperAutotestTransfer()});
 $("#autotestTransferBack")?.addEventListener("click",openDeveloperAutotestPanel)
}
async function openDeveloperAutotestTextTransfer(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可頁面取回的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 try{const transfer=await buildAutotestTextTransfer(artifact);developerAutotestTransfer.kind=kind;developerAutotestTransfer.transfer=transfer;developerAutotestTransfer.index=0;developerAutotestTransfer.full=false;recordDebug("AUTOTEST_TEXT_TRANSFER_READY",{kind,filename:transfer.filename,bytes:transfer.bytes,chars:transfer.chars,totalChunks:transfer.totalChunks,sha256:transfer.sha256});openModal(developerAutotestTransferHtml());bindDeveloperAutotestTransfer()}
 catch(error){appendDeveloperAutotestLog(`頁面取回資料建立失敗：${error?.message||error}`);recordDebug("AUTOTEST_TEXT_TRANSFER_FAILED",{kind,error:error?.message||String(error)});openDeveloperAutotestPanel()}
}
function downloadDeveloperAutotestArtifact(kind){void openDeveloperAutotestDownload(kind)}
async function copyDeveloperAutotestArtifact(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可複製的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 try{const result=await copyAutotestText(artifact.body);if(result.status==="copied"){appendDeveloperAutotestLog(`已複製 ${kind==="debug"?"Debug JSON":"世界 JSON"}（${Number(result.chars||0).toLocaleString()} 字元，${result.method}）。`);recordDebug("AUTOTEST_EXPORT_COPY_COMPLETED",{kind,filename:artifact.filename,chars:result.chars,method:result.method});return}appendDeveloperAutotestLog("此內置瀏覽器不允許直接寫入剪貼簿；請使用「儲存到…」取回檔案。");recordDebug("AUTOTEST_EXPORT_COPY_UNSUPPORTED",{kind,filename:artifact.filename,chars:result.chars,clipboardError:result.clipboardError||null})}
 catch(error){appendDeveloperAutotestLog(`複製失敗：${error?.message||error}`);recordDebug("AUTOTEST_EXPORT_COPY_FAILED",{kind,error:error?.message||String(error),name:error?.name||"Error"})}
}
async function saveDeveloperAutotestArtifact(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可儲存的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 const capability=autotestSaveCapability(window);recordDebug("AUTOTEST_EXPORT_SAVE_CAPABILITY",{...capability,kind,userActivation:Boolean(navigator.userActivation?.isActive)});
 if(!capability.filePicker){appendDeveloperAutotestLog("此瀏覽器未提供 File System Access 另存 API；不會自動轉用下載或其他繞過路徑。");recordDebug("AUTOTEST_EXPORT_SAVE_UNSUPPORTED",{kind,filename:artifact.filename});return}
 try{
  const result=await saveAutotestArtifactWithPicker(artifact);
  if(result.status==="cancelled"){appendDeveloperAutotestLog("已取消另存；snapshot 與封存 run 仍保留。");recordDebug("AUTOTEST_EXPORT_SAVE_CANCELLED",{kind,filename:artifact.filename});return}
  if(result.status!=="saved"){appendDeveloperAutotestLog("此瀏覽器不支援正式另存 API；未觸發任何 fallback。");recordDebug("AUTOTEST_EXPORT_SAVE_UNSUPPORTED",{kind,filename:artifact.filename});return}
  appendDeveloperAutotestLog(`原生另存完成：${result.filename}（${Number(result.bytes||0).toLocaleString()} bytes）。`);recordDebug("AUTOTEST_EXPORT_SAVE_COMPLETED",{kind,filename:result.filename,bytes:result.bytes,method:result.method})
 }catch(error){appendDeveloperAutotestLog(`原生另存失敗（${error?.name||"Error"}）：${error?.message||error}。snapshot 仍保留，未觸發 fallback。`);recordDebug("AUTOTEST_EXPORT_SAVE_FAILED",{kind,error:error?.message||String(error),name:error?.name||"Error"})}
}
async function shareDeveloperAutotestArtifact(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可分享的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 const capability=autotestSaveCapability(window);recordDebug("AUTOTEST_EXPORT_SHARE_CAPABILITY",{...capability,kind,userActivation:Boolean(navigator.userActivation?.isActive)});
 if(!capability.fileShare){appendDeveloperAutotestLog("此瀏覽器未提供 Web Share File API；不會自動轉用下載、clipboard 或其他橋接。");recordDebug("AUTOTEST_EXPORT_SHARE_UNSUPPORTED",{kind,filename:artifact.filename});return}
 try{const result=await shareAutotestArtifact(artifact);if(result.status==="cancelled"){appendDeveloperAutotestLog("已取消原生分享；snapshot 與封存 run 仍保留。");recordDebug("AUTOTEST_EXPORT_SHARE_CANCELLED",{kind,filename:artifact.filename});return}if(result.status!=="shared"){appendDeveloperAutotestLog("此瀏覽器不接受檔案型 Web Share；未觸發 fallback。");recordDebug("AUTOTEST_EXPORT_SHARE_UNSUPPORTED",{kind,filename:artifact.filename});return}appendDeveloperAutotestLog(`原生分享已由系統目標接收：${result.filename} · ${Number(result.bytes||0).toLocaleString()} bytes · SHA-256 ${result.sha256}`);recordDebug("AUTOTEST_EXPORT_SHARE_COMPLETED",{kind,filename:result.filename,bytes:result.bytes,sha256:result.sha256,method:result.method})}
 catch(error){appendDeveloperAutotestLog(`原生分享失敗（${error?.name||"Error"}）：${error?.message||error}。snapshot 仍保留，未觸發 fallback。`);recordDebug("AUTOTEST_EXPORT_SHARE_FAILED",{kind,error:error?.message||String(error),name:error?.name||"Error"})}
}
async function saveAllDeveloperAutotestArtifacts(){
 const snapshot=developerAutotest.exportSnapshot;if(!snapshot){appendDeveloperAutotestLog("找不到可儲存的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 const artifacts=buildAutotestExportArtifacts(snapshot),selected={debug:artifacts.debug,world:artifacts.world,recovery:artifacts.recovery},capability=autotestSaveCapability(window);recordDebug("AUTOTEST_EXPORT_DIRECTORY_CAPABILITY",{...capability,userActivation:Boolean(navigator.userActivation?.isActive)});
 if(!capability.directoryPicker){appendDeveloperAutotestLog("此內置瀏覽器未提供資料夾 Picker；請使用上方各檔案的「儲存到…」按鈕。");return}
 try{const savePromise=saveAutotestArtifactsToDirectory(selected),result=await savePromise;if(result.status==="cancelled"){appendDeveloperAutotestLog("已取消選擇資料夾；snapshot 仍保留。");return}if(result.status!=="saved"){appendDeveloperAutotestLog("資料夾直接儲存不可用；請改用逐檔「儲存到…」。");return}const total=result.files.reduce((n,x)=>n+Number(x.bytes||0),0);appendDeveloperAutotestLog(`已直接儲存 ${result.files.length} 個檔案，共 ${total.toLocaleString()} bytes。`);recordDebug("AUTOTEST_EXPORT_DIRECTORY_SAVE_COMPLETED",{files:result.files,totalBytes:total})}catch(error){appendDeveloperAutotestLog(`資料夾儲存失敗：${error?.message||error}`);recordDebug("AUTOTEST_EXPORT_DIRECTORY_SAVE_FAILED",{error:error?.message||String(error),name:error?.name||"Error"})}
}
async function refreshDeveloperAutotestRetainedRuns(){try{developerAutotest.retainedRuns=await listAutotestExportSnapshots()}catch{developerAutotest.retainedRuns=[]}return developerAutotest.retainedRuns}
async function loadDeveloperAutotestRetainedRun(slot){
 try{const snapshot=await loadAutotestExportSnapshot(slot);if(!snapshot){appendDeveloperAutotestLog("找不到指定的保留 run。");return}developerAutotest.exportSnapshot=snapshot;developerAutotest.exportPersistence={backend:"indexeddb",persisted:true,restored:true,archiveSlot:slot};if(snapshot.debugPayload?.summary)developerAutotest.lastReport=snapshot.debugPayload;appendDeveloperAutotestLog(`已載入保留 run：v${snapshot.appVersion} · ${snapshot.createdAt}；不會覆蓋其他 run。`);recordDebug("AUTOTEST_EXPORT_ARCHIVE_LOADED",{slot,appVersion:snapshot.appVersion,createdAt:snapshot.createdAt,worlds:snapshot.worlds?.length||0})}catch(error){appendDeveloperAutotestLog(`載入保留 run 失敗：${error?.message||error}`)}openDeveloperAutotestPanel()
}
async function reloadDeveloperAutotestExport(){
 try{const snapshot=await loadLastAutotestExportSnapshot();if(!snapshot){appendDeveloperAutotestLog("瀏覽器內沒有已保存的 AutoTest 匯出資料。");await refreshDeveloperAutotestRetainedRuns();openDeveloperAutotestPanel();return}developerAutotest.exportSnapshot=snapshot;developerAutotest.exportPersistence={backend:"indexeddb-or-fallback",persisted:true,restored:true};if(snapshot.debugPayload?.summary)developerAutotest.lastReport=snapshot.debugPayload;try{await archiveAutotestExportSnapshot(snapshot)}catch{}await refreshDeveloperAutotestRetainedRuns();appendDeveloperAutotestLog(`已載入 ${snapshot.createdAt} 的匯出資料，並保留為獨立 run，可直接使用原生檔案 API 匯出。`)}catch(error){appendDeveloperAutotestLog(`載入上次匯出資料失敗：${error?.message||error}`)}openDeveloperAutotestPanel()
}
async function startDeveloperAutotest(config){
 if(developerAutotest.running)return;
 aiStatus=await aiHealth();if(!aiStatus.aiConfigured){appendDeveloperAutotestLog("需要先在 AI 設定連接 Provider/API。");openDeveloperAutotestPanel();return}
 const originalState=gameState?structuredClone(gameState):null,originalScreen=document.body.dataset.screen||"landing",currentDifficulty=String(originalState?.player?.difficulty||originalState?.world?.creation?.blueprint?.difficulty||originalState?.world?.creation?.difficultyRules?.id||"normal"),difficultyPlan=autotestDifficultyPlan({worldCount:config.worldCount,difficultyMode:config.difficultyMode,currentDifficulty});
 config={...config,worldsPerDifficulty:config.worldCount,totalWorldCount:difficultyPlan.length,difficulties:[...new Set(difficultyPlan.map(x=>x.difficulty))]};
 developerAutotest.running=true;developerAutotestActive=true;developerAutotest.stopRequested=false;developerAutotest.results=[];developerAutotest.startedAt=Date.now();developerAutotest.endedAt=0;developerAutotest.worldIndex=0;developerAutotest.turn=0;developerAutotest.logs=[];developerAutotest.lastReport=null;developerAutotest.hiddenAt=document.hidden?Date.now():0;developerAutotest.lastVisibleAt=document.hidden?0:Date.now();developerAutotest.backgroundInterruptions=0;developerAutotest.backgroundDurationMs=0;developerAutotest.config=structuredClone(config);developerAutotest.batchController=new AbortController();setDirectAIRuntimeControl({disableTimeout:config.disableTimeout===true,signal:developerAutotest.batchController.signal});
 cancelAutotestBackgroundWork();recordDebug("AUTOTEST_BATCH_STARTED",{config});openDeveloperAutotestPanel();appendDeveloperAutotestLog(`開始 ${config.totalWorldCount} 個世界的 ${config.mode==="worlds"?"World Fuzz":"AI Playthrough"} 測試；難度 ${config.difficulties.map(x=>DIFFICULTY_PRESETS[x]?.label||x).join(" / ")}。`);
 try{
  for(const planned of difficultyPlan){
   const i=planned.index,difficulty=planned.difficulty;if(developerAutotest.stopRequested)break;
   if(i>1)recordDebug("AUTOTEST_NEXT_WORLD_STARTED",{index:i,worldsRequested:config.totalWorldCount,difficulty});
   developerAutotest.worldIndex=i;developerAutotest.turn=0;cancelAutotestBackgroundWork();replaceGameState(null,"AUTOTEST_WORLD_RESET");
   const worldStartedAt=Date.now(),result={index:i,difficulty,status:"RUNNING",phase:"GENERATION",turns:0,stopReason:"",error:"",actions:[],generation:null,summary:null,world:null};
   try{
    appendDeveloperAutotestLog(`世界 ${i}/${config.totalWorldCount} · ${DIFFICULTY_PRESETS[difficulty]?.label||difficulty}：隨機設定並開始生成。`);
    const raw=randomAutotestWorldRaw(Math.random,i);raw.difficulty=difficulty;const generated=await createDeveloperAutotestWorld(raw,i);
    result.generation={durationMs:Date.now()-worldStartedAt,seed:generated.seed,validation:generated.validation,diagnostics:generated.generationDiagnostics};
    replaceGameState(generated.state,"AUTOTEST_WORLD_READY");recordDebug("AUTOTEST_WORLD_SCOPE_READY",{index:i,worldId:gameState?.world?.id||null,eventCount:gameState?.events?.length||0,suggestionCount:gameState?.suggestions?.length||0,location:gameState?.player?.location||null});const firstButtonFast=config.playStrategy==="FIRST_BUTTON";if(config.mode!=="worlds"&&!firstButtonFast&&needsExpansion(gameState))await expandDeveloperAutotestWorld("WORLD_EDGE_UNDERDEFINED");else if(config.mode!=="worlds"&&firstButtonFast&&needsExpansion(gameState))recordDebug("AUTOTEST_RUNTIME_EXPANSION_SKIPPED",{reason:"FIRST_BUTTON_FAST_PATH",phase:"INITIAL"});await refresh();show("game");if(firstButtonFast)await waitForAutotestActionReady(3000);else await waitForAutotestIdle(3000);
    if(config.mode==="worlds"){
     await finalizeDeveloperAutotestWorld(config);
     result.status="COMPLETED";result.phase="GENERATION";result.stopReason="WORLD_GENERATED";result.summary=autotestWorldSummary(gameState);result.world=structuredClone(gameState);developerAutotest.results.push(result);
     appendDeveloperAutotestLog(`世界 ${i} 生成驗證完成。`);continue
    }
    result.phase="PLAY";const recentActions=[];
    for(let turn=1;turn<=config.maxTurns;turn++){
     if(developerAutotest.stopRequested){result.stopReason="MANUAL_STOP";break}
     developerAutotest.turn=turn;const firstButtonFast=config.playStrategy==="FIRST_BUTTON",stall=autotestRecentStallCount(recentActions),expansionNeeded=needsExpansion(gameState),sparseWorld=(gameState.world?.registry?.locations||[]).length<=1&&turn>=5;let expansionReason="";
     if(stall>=3)expansionReason=firstButtonFast?"FIRST_BUTTON_STALL_RECOVERY":"AUTOTEST_STALL_RECOVERY";else if(expansionNeeded&&(firstButtonFast?sparseWorld:true))expansionReason=firstButtonFast?"FIRST_BUTTON_SPARSE_WORLD":"WORLD_EDGE_UNDERDEFINED";
     if(expansionReason){if(firstButtonFast&&sparseWorld){const last=Number(autotestRuntimeExpansion.lastStartedTurn)||0;if(!autotestRuntimeExpansion.running&&(!last||turn-last>=3)){autotestRuntimeExpansion.lastStartedTurn=turn;const expanded=await expandDeveloperAutotestWorld(expansionReason,{force:true});if(expanded)autotestRuntimeExpansion.lastCompletedTurn=turn;recordDebug("AUTOTEST_RUNTIME_EXPANSION_STALL_SETTLED",{reason:expansionReason,turn,expanded,stall})}else recordDebug("AUTOTEST_RUNTIME_EXPANSION_THROTTLED",{reason:expansionReason,turn,lastStartedTurn:last,minTurnGap:3})}else{const scheduled=scheduleDeveloperAutotestExpansion(expansionReason,turn);recordDebug("AUTOTEST_RUNTIME_EXPANSION_DEFERRED",{reason:expansionReason,turn,scheduled,stall,expansionNeeded})}}else recordDebug("AUTOTEST_RUNTIME_EXPANSION_SKIPPED",{reason:firstButtonFast?"FIRST_BUTTON_FAST_PATH":"AI_DECISION_NO_EXPANSION",phase:"TURN",turn,stall,expansionNeeded});
     if(firstButtonFast)await waitForAutotestActionReady(3000);else await waitForAutotestIdle();
     const beforeFingerprint=autotestStateFingerprint(gameState),turnStartedAt=Date.now(),row={worldIndex:i,turn,beforeFingerprint,afterFingerprint:"",decision:null,error:"",durationMs:0};
     try{
      const ctrl=new AbortController();developerAutotest.controller=ctrl;
      const decision=await decideAutotestAction(gameState,{recentActions,customCondition:config.stopCondition==="CUSTOM_AI"?config.customCondition:"",signal:ctrl.signal,disableTimeout:config.disableTimeout===true,playStrategy:config.playStrategy});developerAutotest.controller=null;row.decision=decision;
      appendDeveloperAutotestLog(`世界 ${i} · Turn ${turn}: ${decision.mode==="suggestion"?"[按鈕] ":decision.mode==="combat"?"[戰鬥] ":"[自由] "}${decision.action||decision.combatAction}`);
      recordDebug("AUTOTEST_TURN_STARTED",{worldIndex:i,turn,decision});
      if(config.stopCondition==="CUSTOM_AI"&&decision.goalReached===true){result.stopReason="CUSTOM_AI";row.afterFingerprint=beforeFingerprint;row.durationMs=Date.now()-turnStartedAt;result.actions.push(row);result.turns=turn;break}
      await executeDeveloperAutotestDecision(decision);if(firstButtonFast)await waitForAutotestActionReady(config.disableTimeout===true?90000:38000);else await waitForAutotestIdle(config.disableTimeout===true?90000:38000);
      row.afterFingerprint=autotestStateFingerprint(gameState);row.durationMs=Date.now()-turnStartedAt;result.actions.push(row);result.turns=turn;recentActions.push({action:decision.action||decision.combatAction||"",mode:decision.mode,kind:decision.kind||"",progression:decision.progression===true,targetId:decision.targetId||null,progressed:row.beforeFingerprint!==row.afterFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0});if(recentActions.length>12)recentActions.shift();
      recordDebug("AUTOTEST_TURN_COMPLETED",{worldIndex:i,turn,durationMs:row.durationMs,stateChanged:row.beforeFingerprint!==row.afterFingerprint,action:decision.action||decision.combatAction});
      const stop=autotestStopReason(gameState,{turns:turn,errorCount:autotestTelemetryErrors(worldStartedAt),stopRequested:developerAutotest.stopRequested},config,decision);if(stop){result.stopReason=stop;break}
     }catch(e){
      developerAutotest.controller=null;
      if(developerAutotest.stopRequested){result.stopReason="MANUAL_STOP";break}
      if(!row.decision&&autotestBackgroundAffected(e)){
       developerAutotest.backgroundInterruptions++;
       recordDebug("AUTOTEST_EXTERNAL_BACKGROUND_INTERRUPTION",{worldIndex:i,turn,error:e?.message||String(e),phase:"DECISION",retry:true});
       appendDeveloperAutotestLog(`世界 ${i} · Turn ${turn} 因背景切換中斷 AI 決策；回到前景後重試同一回合。`);
       await waitForAutotestVisible();turn--;continue
      }
      row.error=e?.message||String(e);row.durationMs=Date.now()-turnStartedAt;row.afterFingerprint=autotestStateFingerprint(gameState);result.actions.push(row);result.turns=turn;recentActions.push({action:row.decision?.action||row.decision?.combatAction||"",mode:row.decision?.mode||"",kind:row.decision?.kind||"",progression:row.decision?.progression===true,targetId:row.decision?.targetId||null,progressed:row.beforeFingerprint!==row.afterFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0});if(recentActions.length>12)recentActions.shift();
      recordDebug("AUTOTEST_TURN_FAILED",{worldIndex:i,turn,error:row.error,durationMs:row.durationMs});appendDeveloperAutotestLog(`世界 ${i} · Turn ${turn} 發生錯誤：${row.error}`);
      const stop=autotestStopReason(gameState,{turns:turn,errorCount:autotestTelemetryErrors(worldStartedAt),stopRequested:false},config,{});if(stop){result.stopReason=stop;break}
     }
    }
    await finalizeDeveloperAutotestWorld(config);
    result.stopReason=result.stopReason||"TURN_LIMIT";result.status="COMPLETED";result.summary=autotestWorldSummary(gameState);result.world=structuredClone(gameState);developerAutotest.results.push(result);
    recordDebug("AUTOTEST_WORLD_PLAY_COMPLETED",{index:i,turns:result.turns,stopReason:result.stopReason,summary:result.summary});appendDeveloperAutotestLog(`世界 ${i} 遊玩測試完成：${result.turns} 回合 · ${result.stopReason}`)
   }catch(e){
    result.status="FAILED";result.error=e?.message||String(e);result.summary=gameState?autotestWorldSummary(gameState):null;if(gameState)result.world=structuredClone(gameState);developerAutotest.results.push(result);
    recordDebug("AUTOTEST_WORLD_FAILED",{index:i,phase:result.phase,error:result.error});appendDeveloperAutotestLog(`世界 ${i} 失敗：${result.error}`)
   }
  }
 }finally{
  developerAutotest.controller=null;developerAutotest.endedAt=Date.now();cancelAutotestBackgroundWork();clearDirectAIRuntimeControl();developerAutotest.batchController=null;
  const runTelemetry=telemetryEntries().filter(e=>Number(e.at)>=developerAutotest.startedAt),report=buildAutotestReport({config,worlds:developerAutotest.results,telemetry:runTelemetry,startedAt:developerAutotest.startedAt,endedAt:developerAutotest.endedAt});
  developerAutotest.lastReport=report;recordDebug("AUTOTEST_BATCH_COMPLETED",{summary:report.summary,stopRequested:developerAutotest.stopRequested,backgroundInterruptions:developerAutotest.backgroundInterruptions,backgroundDurationMs:developerAutotest.backgroundDurationMs});
  try{await exportDeveloperAutotestResults(report,developerAutotest.results)}catch(e){recordDebug("AUTOTEST_EXPORT_FAILED",{error:e?.message||String(e)})}
  developerAutotest.running=false;developerAutotestActive=false;developerAutotest.stopRequested=false;replaceGameState(originalState,"AUTOTEST_RESTORE");
  await refresh();if(originalState&&aiStatus.aiConfigured){scheduleWorldQualityCritic("post_autotest_restore",1800);scheduleWorldEvolution("post_autotest_restore",BACKGROUND_IDLE_GRACE_MS);scheduleHistoryDeepening("post_autotest_restore",2400)}if(originalState&&originalScreen==="game")show("game");else if(originalScreen==="creator")show("creator");else show("landing");
  appendDeveloperAutotestLog(`測試完成：${report.summary.worldsCompleted} 個完成、${report.summary.worldsFailed} 個失敗、${report.summary.totalTurns} 回合、${report.summary.issues} 個問題。`);openDeveloperAutotestPanel()
 }
}

$("#aiSettingsBtn").onclick=()=>{const s=loadAISettings(),j=loadJevSettings();openModal(`<div class="eyebrow">LOCAL AI CONFIG</div><h2>AI 設定</h2><p class="muted">API Key 只保存在這個瀏覽器。模型由 Elyndra 按 Provider 固定管理，用戶不需要輸入模型名稱。</p><div class="settings-grid"><label>Provider<select id="aiProvider"><option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="agnes">Agnes 3.0 Flash</option></select></label><label>API Endpoint<input id="aiEndpoint" type="url" value="${esc(s.endpoint)}"></label><label>目前模型<input id="aiModelDisplay" value="${esc(PROVIDERS[s.provider]?.model||s.model)}" readonly></label><label>AI 優化模式<select id="aiOptimization"><option value="standard">標準</option><option value="adaptive">Elyndra 自適應優化</option></select></label><label>API Key<input id="aiKey" type="password" autocomplete="new-password" value="" placeholder="${s.apiKey?"已保存 · 輸入新 Key 才會取代":"尚未設定"}"></label></div><p id="aiProviderHint" class="muted"></p><p id="aiOptimizationHint" class="muted"></p><hr><div class="eyebrow">JEV DECISION ROUTER · OPTIONAL</div><p class="muted">只負責低成本 routing；失敗會自動回本地規則。Jev Key 亦只保存在本瀏覽器。</p><div class="settings-grid"><label>啟用 Jev<input id="jevEnabled" type="checkbox" ${j.enabled?"checked":""}></label><label>Jev Endpoint<input id="jevEndpoint" type="url" value="${esc(j.endpoint)}"></label><label>Jev Model<input id="jevModel" value="${esc(j.model)}"></label><label>Jev API Key<input id="jevKey" type="password" autocomplete="off" value="${esc(j.apiKey)}"></label><label>Confidence Threshold<input id="jevThreshold" type="number" min=".5" max=".95" step=".01" value="${j.threshold}"></label></div><div class="settings-actions"><button id="jevSave" class="secondary">儲存並測試 Jev</button><button id="jevClear" class="ghost">清除 Jev</button></div><p id="jevResult" class="muted"></p><div class="settings-actions"><button id="aiSave" class="primary">儲存並測試</button><button id="aiClear" class="secondary">清除本地 Key</button></div><p id="aiTestResult" class="muted"></p>`);
const provider=$("#aiProvider"),endpoint=$("#aiEndpoint"),modelDisplay=$("#aiModelDisplay"),optimization=$("#aiOptimization"),key=$("#aiKey"),providerHint=$("#aiProviderHint"),optimizationHint=$("#aiOptimizationHint");
const syncProviderHint=()=>{const p=PROVIDERS[provider.value];if(!p)return;if(modelDisplay)modelDisplay.value=p.model;if(providerHint)providerHint.textContent=uiFormat("providerFixedModel",{provider:p.label,model:p.model},activeLocale);if(optimizationHint)optimizationHint.textContent=optimization.value==="adaptive"?uiText("自適應優化會按任務重要性分配思考：行動／敘事較快，核心規則／歷史／Timeline 更深入，Critic／Recovery 使用最高保護。",activeLocale):uiText("標準模式不主動指定 Provider 思考強度，使用模型預設行為。",activeLocale)};
provider.value=s.provider;optimization.value=s.optimization==="adaptive"?"adaptive":"standard";syncProviderHint();optimization.onchange=syncProviderHint;provider.onchange=()=>{saveAISettings({provider:s.provider,endpoint:endpoint.value,apiKey:key.value,optimization:optimization.value});key.value="";const next=selectAIProvider(provider.value),p=PROVIDERS[provider.value];endpoint.value=next.endpoint||p.endpoint;optimization.value=next.optimization==="adaptive"?"adaptive":"standard";key.placeholder=next.apiKey?"已保存 · 輸入新 Key 才會取代":"尚未設定";s.provider=provider.value;syncProviderHint()};
$("#aiSave").onclick=async()=>{const btn=$("#aiSave"),out=$("#aiTestResult");saveAISettings({provider:provider.value,endpoint:endpoint.value,apiKey:$("#aiKey").value,optimization:optimization.value});btn.disabled=true;out.textContent=uiText("正在測試連線…",activeLocale);try{await testDirectAI();aiStatus=await aiHealth();out.textContent=uiText("連線成功。AI ONLINE 已啟用。",activeLocale);await refresh()}catch(e){aiStatus=await aiHealth();out.textContent=uiText("設定已保存在本地，但連線失敗：",activeLocale)+e.message;await refresh()}finally{btn.disabled=false}};
$("#jevSave").onclick=async()=>{saveJevSettings({enabled:$("#jevEnabled").checked,endpoint:$("#jevEndpoint").value,model:$("#jevModel").value,apiKey:$("#jevKey").value,threshold:$("#jevThreshold").value});const out=$("#jevResult");out.textContent=uiText("正在測試 Jev…",activeLocale);try{const r=await testJev();out.textContent=`Jev OK · ${r.route} · confidence ${r.confidence.toFixed(2)}`}catch(e){out.textContent=uiText("Jev 連線失敗：",activeLocale)+e.message}};$("#jevClear").onclick=()=>{clearJevSettings();$("#jevResult").textContent=uiText("Jev 本地設定已清除。",activeLocale)};
$("#aiClear").onclick=async()=>{clearAISettings(provider.value);const fresh=loadAISettings(provider.value);endpoint.value=fresh.endpoint;optimization.value=fresh.optimization==="adaptive"?"adaptive":"standard";key.value="";key.placeholder=uiText("尚未設定",activeLocale);syncProviderHint();aiStatus=await aiHealth();$("#aiTestResult").textContent=`${PROVIDERS[provider.value].label} 的本地 API 設定已清除。`;await refresh()}};
$("#saveToolsBtn").onclick=()=>openSaveManagerUI(gameState,openModal,{onLoad:async loaded=>{replaceGameState(migrate(loaded),"LOAD_SLOT");aiStatus=await aiHealth();const ready=await refresh();if(!ready){alert(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));return}$("#modal").classList.add("hidden");show("game")},onImport:()=>$("#importFile").click()});
$("#importFile").onchange=async e=>{try{replaceGameState(migrate(await importWorld(e.target.files[0])),"IMPORT_WORLD");aiStatus=await aiHealth();const ready=await refresh();if(!ready){alert(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));return}$("#modal").classList.add("hidden");show("game")}catch(err){alert(err.message)}finally{e.target.value=""}};
$("#resetBtn").onclick=async()=>{if(confirm(uiText("確定要刪除目前的本地世界嗎？",activeLocale))){await deleteWorld();replaceGameState(null,"RESET_WORLD");await refresh();show("landing")}};
$("#gameMenuBtn")?.addEventListener("click",()=>openModal(`<div class="eyebrow">選單</div><h2>旅程設定</h2><p class="muted">一般冒險期間把系統設定收起，避免打斷場景。</p><div class="lore-list"><button class="secondary" data-system-open="aiSettingsBtn">AI 設定</button><button class="secondary" data-system-open="saveToolsBtn">存檔管理</button><button class="ghost" data-system-open="helperBtn">旅途助手</button><button class="ghost" data-system-open="runtimeBtn">異界狀態</button><button class="ghost" data-system-open="historyBtn">旅程紀錄</button><button class="ghost" data-system-open="debugBtn">Debug 診斷</button><button class="ghost" data-system-open="developerBtn">開發者 · AI 自動測試</button><button class="ghost" data-system-open="impactBtn">世界留下的痕跡</button><button class="ghost danger-ghost" data-system-open="resetBtn">重置世界</button></div>`));
$("#modalContent")?.addEventListener("click",e=>{const id=e.target.closest("[data-system-open]")?.dataset.systemOpen;if(id)document.getElementById(id)?.click()});
$("#moreBtn")?.addEventListener("click",()=>$("#gameMenuBtn")?.click());
qsa("[data-nav-home]").forEach(b=>b.addEventListener("click",()=>{$("#modal")?.classList.add("hidden");$(".scene")?.scrollIntoView({behavior:"smooth",block:"start"})}));
qsa("[data-mobile-target]").forEach(b=>b.addEventListener("click",()=>{qsa("[data-mobile-target]").forEach(x=>x.classList.toggle("active",x===b));const target=b.dataset.mobileTarget;if(target==="home"){$("#modal")?.classList.add("hidden");$(".scene")?.scrollIntoView({behavior:"smooth",block:"start"});return}document.getElementById(target)?.click()}));
window.addEventListener("resize",scheduleGameStageFit,{passive:true});
window.visualViewport?.addEventListener("resize",scheduleGameStageFit,{passive:true});
scheduleGameStageFit();
const versionBadge=$("#versionBadge");if(versionBadge)versionBadge.textContent=`v${APP_VERSION}`;
aiStatus=await aiHealth();await refresh();