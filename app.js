window.__ELYNDRA_BOOTED__=true;
import {APP_VERSION} from "./src/version.js?v=42000";
import {loadAISettings,saveAISettings,selectAIProvider,clearAISettings,testDirectAI,PROVIDERS} from "./src/ai-settings.js?v=340";
import {newGame,validateWorld,applyWorldCandidate,WORLD_CONSTITUTION} from "./src/world-engine.js?v=40000";
import {aiHealth,generateWorldCandidate,talkToDynamicNpc,startTurnAIJobs,generateStatePatch,generateRegionExpansion,askTravelHelper,assessPlayerAction,fastLocalActionAssessment} from "./src/ai-client.js?v=41000";
import {sceneTurnPreview} from "./src/turn-compiler.js?v=41000";
import {buildSnapshot,applyTurnCandidate} from "./src/adventure-engine.js?v=42000";
import {maintainSession} from "./src/session-maintenance.js?v=276";
import {performAction} from "./src/game-engine.js?v=42000";
import {saveWorld,loadWorld,hasWorld,deleteWorld,exportWorld,importWorld,saveWorldSlot,loadWorldSlot,listWorldSaves,deleteWorldSlot} from "./src/storage.js?v=41000";
import {ensureClock,formatWorldTime} from "./src/world-clock.js?v=276";
import {ensureWorldSimulation} from "./src/world-simulation.js?v=42000";
import {ensureWorldRegistry,canonizeGeneration,canInteractWithNpc,npcInteractionMode,isNpcPresent,repairPlayerLocation} from "./src/world-registry.js?v=337";
import {bootstrapKnowledgeGraph,needsExpansion,recordExpansion} from "./src/knowledge-graph.js?v=276";
import {ensureNpcRuntime,findNpc,inviteCompanion,acceptCompanionOffer,dismissCompanion} from "./src/npc-engine.js?v=35000";
import {applyNpcConversationTurn} from "./src/npc-conversation.js?v=42000";
import {ensureFactionRuntime} from "./src/faction-engine.js?v=276";
import {ensureCharacter,combatAction,recoverFromDefeat,xpNeeded} from "./src/combat-engine.js?v=42000";
import {ensureQuestProgress,ensureMainQuest,questSnapshot,evaluateQuestState} from "./src/quest-engine.js?v=320";
import {ensureCrisis} from "./src/crisis-engine.js?v=276";
import {visibleLore,resolveLocalLoreAction} from "./src/lore-engine.js?v=276";
import {playerVisibleEvents} from "./src/event-visibility.js?v=276";
import {loadJevSettings,saveJevSettings,clearJevSettings,testJev,routeAction} from "./src/jev-router.js?v=276";
import {getWorldStylePreset} from "./src/world-style-presets.js?v=37000";
import {randomWorldSettings} from "./src/world-randomizer.js?v=290";
import {createWorldCreationDraft,compileWorldCreation,validateWorldCreationCandidate,applyWorldCreationState,buildWorldContract,worldContractHtml} from "./src/world-creation.js?v=37001";
import {currentTradeProfile,walletSummary} from "./src/world-locality.js?v=276";
import {ensureWorldImpact,impactCapability,impactSnapshot,playerImpactRecords} from "./src/world-impact.js?v=39000";
import {ensureRecognition,recognitionSnapshot} from "./src/recognition-engine.js?v=276";
import {ensureCheckProfile,checkProfileSnapshot} from "./src/check-engine.js?v=320";
import {deriveSceneTitle} from "./src/runtime-guard.js?v=35000";
import {worldCommunication} from "./src/communication-engine.js?v=276";
import {initializeWeather,weatherUiSnapshot} from "./src/weather-engine.js?v=276";
import {ensureSurvival,survivalSnapshot} from "./src/survival-engine.js?v=320";
import {ensureMagicRuntime} from "./src/magic-engine.js?v=276";
import {ensureTravelNetwork,travelSnapshot} from "./src/travel-engine.js?v=320";
import {ensureDungeonSites,dungeonSnapshot} from "./src/dungeon-engine.js?v=276";
import {ensureTalents,talentSnapshot,learnTalent} from "./src/talent-engine.js?v=276";
import {marketSnapshot} from "./src/economy-engine.js?v=276";
import {cultureSnapshot} from "./src/culture-engine.js?v=276";
import {worldEvolutionNeed,markWorldEvolution,worldHealthSnapshot} from "./src/world-quality.js?v=337";
import {ensureItemRuntime,itemCategoryLabel,itemEffectText,canUseItem,presentItemToNpc,craftingSnapshot} from "./src/item-engine.js?v=39000";
import {ensureNotes,addNote,updateNote,deleteNote,notesSnapshot} from "./src/notes-engine.js?v=320";
import {worldMapSnapshot} from "./src/world-map.js?v=320";
import {ensurePlayerOrigin,playerOriginSnapshot} from "./src/player-origin.js?v=320";
import {openJournalUI,openInventoryUI,openSaveManagerUI} from "./src/progression-ui.js?v=41000";
import {recordDebug,telemetryEntries,telemetrySummary,debugBundle,debugBundleText,clearDebugTelemetry,installDebugConsoleCapture} from "./src/debug-telemetry.js?v=340";
import {ensurePlayerExperience,markOpeningEngaged,projectObservableWorldChanges,roleplayFallbackSuggestions,sessionCheckpoint} from "./src/player-experience.js?v=35000";
import {buildContextualActionSet,trustedSuggestionAssessment,suggestionPresentation} from "./src/contextual-actions.js?v=38003";
import {planStateSync,deferredPlanFrom,ensureStateSyncRuntime,currentStateRevision,bumpStateRevision,validateStatePatch,statePatchToCandidate,assessPatchRevision} from "./src/state-sync.js?v=41000";
const $=s=>document.querySelector(s),qsa=s=>Array.from(document.querySelectorAll(s));let gameState=null,aiStatus={ok:false,aiConfigured:false},aiBusy=false,turnSyncBusy=false,turnSyncLabel="",helperHistory=[],npcChatHistory=new Map();
installDebugConsoleCapture();
recordDebug("APP_BOOT",{version:APP_VERSION,href:location.href});
window.addEventListener("error",e=>recordDebug("WINDOW_ERROR",{message:e.message,filename:e.filename,line:e.lineno,column:e.colno}));
window.addEventListener("unhandledrejection",e=>recordDebug("UNHANDLED_REJECTION",{message:String(e.reason?.message||e.reason||"Promise failed")}));
const deferredDirector={timer:0,running:false,controller:null,queue:[]};
const nonblockingScene={controller:null,revision:null,worldId:null};
const worldBackground={timer:0,running:false,controller:null,lastReason:"background_gameplay",queued:false,failures:0,cooldownUntil:0};
let gameplayDebugSnapshot=null;
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
 gameplayDebugSnapshot=next
}
function preemptBackgroundWorldEvolution(){
 const ctrl=worldBackground.controller;if(ctrl&&!ctrl.signal.aborted)ctrl.abort(new DOMException("Higher-priority gameplay has priority","AbortError"))
}
function preemptDeferredDirector(){
 const ctrl=deferredDirector.controller;if(ctrl&&!ctrl.signal.aborted)ctrl.abort(new DOMException("Foreground gameplay has priority","AbortError"))
}
function preemptNonblockingScene(){
 const ctrl=nonblockingScene.controller;if(ctrl&&!ctrl.signal.aborted)ctrl.abort(new DOMException("Newer player action has priority","AbortError"));
 nonblockingScene.controller=null;nonblockingScene.revision=null;nonblockingScene.worldId=null
}
function preemptBackgroundAI(){preemptNonblockingScene();preemptBackgroundWorldEvolution();preemptDeferredDirector()}
function commitStatePatch(state,patch,plan,context={}){
 const valid=validateStatePatch(patch,plan);if(!valid.valid)throw new Error("STATE_PATCH_INVALID:"+valid.errors.join(","));
 if(!Array.isArray(patch.operations)||!patch.operations.length)return {applied:false,empty:true,revision:currentStateRevision(state)};
 const revision=assessPatchRevision(state,patch,plan);if(!revision.ok)return {applied:false,stale:true,...revision};
 const candidate=statePatchToCandidate(patch,state);applyTurnCandidate(state,candidate,{...context,directorMode:plan.mode});
 const next=bumpStateRevision(state,"STATE_PATCH_"+plan.mode);
 return {applied:true,rebased:revision.rebased===true,rebasedFrom:revision.rebasedFrom??null,revision:next,operations:patch.operations.length}
}
function applyPlayerActionScene(scene,{worldId,baseRevision,roll,action,previousSuggestions=[],previousSuggestionIntents=[]}={}){
 if(!scene||!gameState||gameState.world?.id!==worldId||currentStateRevision(gameState)!==baseRevision)return false;
 const preview=sceneTurnPreview(scene,roll,{action,priorSuggestions:previousSuggestions,priorSuggestionIntents:previousSuggestionIntents});
 if(preview.narrative)gameState.narrative=preview.narrative;if(preview.sceneTitle)gameState.sceneTitle=preview.sceneTitle;
 if(preview.suggestionIntents?.length){const contextual=buildContextualActionSet(gameState,preview.suggestionIntents);gameState.suggestionIntents=contextual.all;gameState.suggestions=contextual.all.map(x=>x.label)}
 else if(preview.suggestions?.length){const contextual=buildContextualActionSet(gameState,preview.suggestions);gameState.suggestionIntents=contextual.all;gameState.suggestions=contextual.all.map(x=>x.label)}
 return true
}
function startNonblockingPlayerNarration({action,roll,snapshot,plan,intent,previousSuggestions,previousSuggestionIntents,startedAt}){
 preemptNonblockingScene();const ctrl=new AbortController(),worldId=gameState?.world?.id,baseRevision=Number(plan?.baseRevision)||currentStateRevision(gameState);
 nonblockingScene.controller=ctrl;nonblockingScene.worldId=worldId;nonblockingScene.revision=baseRevision;updateAIStatusBadge("Player Action AI 正在背景生成玩家可見結果");
 const jobs=startTurnAIJobs(action,roll,snapshot,{intent,stateSyncPlan:plan,baseRevision,signal:ctrl.signal});
 jobs.playerAction.then(async scene=>{
  if(ctrl.signal.aborted)return;const applied=applyPlayerActionScene(scene,{worldId,baseRevision,roll,action,previousSuggestions,previousSuggestionIntents});
  recordDebug(applied?"PLAYER_ACTION_AI_COMPLETED":"PLAYER_ACTION_AI_STALE_DISCARDED",{action,mode:plan.mode,baseRevision,currentRevision:gameState?currentStateRevision(gameState):null,elapsedMs:Date.now()-startedAt});
  if(applied){await persist();await refresh()}
 }).catch(e=>{if(!ctrl.signal.aborted)recordDebug("PLAYER_ACTION_AI_FAILED",{action,mode:plan.mode,error:e?.message||String(e),elapsedMs:Date.now()-startedAt})}).finally(()=>{if(nonblockingScene.controller===ctrl){nonblockingScene.controller=null;nonblockingScene.worldId=null;nonblockingScene.revision=null;updateAIStatusBadge()}});
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
 if(worldBackground.running){preemptBackgroundWorldEvolution();if(deferredDirector.timer)clearTimeout(deferredDirector.timer);deferredDirector.timer=setTimeout(()=>{deferredDirector.timer=0;void runDeferredDirector()},350);return}
 const task=deferredDirector.queue[0],worldId=gameState.world?.id,ctrl=new AbortController(),debugStarted=Date.now();
 deferredDirector.running=true;deferredDirector.controller=ctrl;
 gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"DEFERRED_TURN_STARTED",visibility:"INTERNAL",action:task.action,day:gameState.world?.state?.day||1,at:Date.now()});recordDebug("DEFERRED_TURN_STARTED",{action:task.action,queued:deferredDirector.queue.length});
 try{
  const snapshot=buildSnapshot(gameState),basePlan=task.plan||planStateSync({action:task.action,intent:task.intent||{},roll:task.roll||{},snapshot}),plan=deferredPlanFrom(basePlan,currentStateRevision(gameState));
  const patch=await generateStatePatch(task.action,task.roll,snapshot,plan,{signal:ctrl.signal,intent:task.intent});
  if(ctrl.signal.aborted||!gameState||gameState.world?.id!==worldId)return;
  const committed=patch?commitStatePatch(gameState,patch,plan,{action:task.action,roll:task.roll}):{applied:false,empty:true};
  if(committed.stale)throw new Error("STATE_PATCH_STALE");
  deferredDirector.queue.shift();removePersistedDeferredTurn(task.id);recordDebug("DEFERRED_TURN_APPLIED",{action:task.action,elapsedMs:Date.now()-debugStarted,remaining:deferredDirector.queue.length,operations:patch?.operations?.length||0,revision:currentStateRevision(gameState),rebased:committed.rebased===true});await persist();await refresh()
 }catch(e){
  if(!ctrl.signal.aborted){
   task.attempts=(Number(task.attempts)||0)+1;
   gameState?.events?.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"DEFERRED_TURN_FAILED",visibility:"INTERNAL",action:task.action,reason:e?.message||String(e),attempt:task.attempts,day:gameState?.world?.state?.day||1,at:Date.now()});recordDebug("DEFERRED_TURN_FAILED",{action:task.action,attempt:task.attempts,elapsedMs:Date.now()-debugStarted,error:e?.message||String(e)});
   if(task.attempts>=2){deferredDirector.queue.shift();removePersistedDeferredTurn(task.id)}else{const saved=gameState?.world?.deferredTurns?.find(x=>x.id===task.id);if(saved)saved.attempts=task.attempts}
   await persist().catch(()=>{})
  }
 }finally{
  if(deferredDirector.controller===ctrl)deferredDirector.controller=null;deferredDirector.running=false;
  if(deferredDirector.queue.length){if(deferredDirector.timer)clearTimeout(deferredDirector.timer);deferredDirector.timer=setTimeout(()=>{deferredDirector.timer=0;void runDeferredDirector()},ctrl.signal.aborted?900:500)}
  else scheduleWorldEvolution("post_deferred_turn",5000)
 }
}
function scheduleWorldEvolution(reason="background_gameplay",delay=1600){
 if(!gameState||!aiStatus.aiConfigured)return;worldBackground.lastReason=String(reason||"background_gameplay").slice(0,180);worldBackground.queued=true;
 if(worldBackground.timer)clearTimeout(worldBackground.timer);
 const cooldown=Math.max(0,Number(worldBackground.cooldownUntil||0)-Date.now()),wait=Math.max(250,Number(delay)||1600,cooldown);
 worldBackground.timer=setTimeout(()=>{worldBackground.timer=0;void runBackgroundWorldEvolution()},wait)
}
async function runBackgroundWorldEvolution(){
 if(!gameState||!aiStatus.aiConfigured||worldBackground.running)return;
 if(aiBusy||turnSyncBusy||nonblockingScene.controller||deferredDirector.running||deferredDirector.queue.length||gameState.combat?.active||document.hidden){scheduleWorldEvolution(worldBackground.lastReason,2400);return}
 const evolution=worldEvolutionNeed(gameState),expand=needsExpansion(gameState);
 if(!expand&&!evolution.required){worldBackground.queued=false;return}
 const worldId=gameState.world?.id,reason=evolution.required?evolution.reason:(worldBackground.lastReason||"background_gameplay"),ctrl=new AbortController(),debugStarted=Date.now();
 worldBackground.running=true;worldBackground.queued=false;worldBackground.controller=ctrl;
 gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_BACKGROUND_STARTED",visibility:"INTERNAL",reason,day:gameState.world?.state?.day||1,at:Date.now()});recordDebug("WORLD_EVOLUTION_BACKGROUND_STARTED",{reason});
 try{
  const ex=await generateRegionExpansion(gameState,reason,{signal:ctrl.signal});
  if(ctrl.signal.aborted||!gameState||gameState.world?.id!==worldId)return;
  if(ex?.generation){canonizeGeneration(gameState,ex.generation);recordExpansion(gameState,ex.region||"未知邊境",ex.reason||reason);gameState.world.state.flags.requestExpansion=false;if(ex.quality)gameState.world.quality={...(gameState.world.quality||{}),runtimeLastExpansion:ex.quality};markWorldEvolution(gameState,{reason});bumpStateRevision(gameState,"BACKGROUND_WORLD_EVOLUTION");worldBackground.failures=0;worldBackground.cooldownUntil=0;gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_BACKGROUND_APPLIED",visibility:"INTERNAL",reason,day:gameState.world?.state?.day||1,at:Date.now()});recordDebug("WORLD_EVOLUTION_BACKGROUND_APPLIED",{reason,elapsedMs:Date.now()-debugStarted,quality:ex.quality?.overall??null});await persist()}
 }catch(e){
  if(!ctrl.signal.aborted){
   const error=e?.message||String(e),timedOut=/AI_TIMEOUT/.test(error);worldBackground.failures=Math.min(6,(Number(worldBackground.failures)||0)+1);
   const cooldownMs=timedOut?Math.min(15*60*1000,2*60*1000*(2**(worldBackground.failures-1))):60*1000;worldBackground.cooldownUntil=Date.now()+cooldownMs;
   console.warn("background world evolution fallback",e);gameState?.events?.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_BACKGROUND_FAILED",visibility:"INTERNAL",reason:error,cooldownMs,day:gameState?.world?.state?.day||1,at:Date.now()});recordDebug("WORLD_EVOLUTION_BACKGROUND_FAILED",{reason,error,elapsedMs:Date.now()-debugStarted,cooldownMs,failures:worldBackground.failures})
  }
 }finally{
  if(worldBackground.controller===ctrl)worldBackground.controller=null;worldBackground.running=false;
  if(gameState&&aiStatus.aiConfigured){const next=worldEvolutionNeed(gameState);if(needsExpansion(gameState)||next.required)scheduleWorldEvolution(next.reason||reason,ctrl.signal.aborted?5000:9000)}
 }
}
function setPlayerActionControlsLocked(locked,reason=""){
 const on=Boolean(locked);
 qsa("#choices button,#freeActionForm button,#freeAction,#otherActionBtn,[data-combat-action]").forEach(el=>{el.disabled=on;el.setAttribute("aria-disabled",String(on))});
 const choices=$("#choices"),form=$("#freeActionForm");if(choices)choices.dataset.locked=on?"true":"false";if(form)form.dataset.locked=on?"true":"false";
 const free=$("#freeAction");if(free&&on&&reason)free.placeholder=reason;else if(free&&!on&&!gameState?.combat?.active)free.placeholder="自由行動：描述你想做的事……"
}
function updateAIStatusBadge(label=""){
 const badge=$("#aiBadge");if(!badge)return;
 if(aiBusy&&turnSyncBusy){badge.textContent="PLAYER ACTION";badge.classList.add("thinking");badge.title=label||"Player Action AI 正在優先處理玩家可見結果"}
 else if(aiBusy){badge.textContent="AI THINKING";badge.classList.add("thinking");badge.title=label||"AI 正在處理目前行動…"}
 else if(turnSyncBusy){badge.textContent="STATE SYNC";badge.classList.add("thinking");badge.title=turnSyncLabel||"State Sync AI 正在提交必要 Canon；完成後立即交還玩家控制"}
 else if(nonblockingScene.controller){badge.textContent="PLAYER ACTION";badge.classList.add("thinking");badge.title=label||"Player Action AI 正在背景補充敘事，不會鎖定玩家操作"}
 else{badge.textContent=aiStatus.aiConfigured?"AI ONLINE":"LOCAL";badge.classList.remove("thinking");badge.title=""}
}
function setTurnSyncing(on,label="AI 正在同步必要世界狀態…"){
 turnSyncBusy=Boolean(on);turnSyncLabel=turnSyncBusy?label:"";
 if(turnSyncBusy){preemptBackgroundAI();setPlayerActionControlsLocked(true,"STATE SYNC：完成後即可繼續行動")}
 else setPlayerActionControlsLocked(aiBusy,"自由行動：描述你想做的事……");
 const n=$("#narrative");if(turnSyncBusy&&n)n.dataset.syncing=turnSyncLabel;else if(n)delete n.dataset.syncing;
 updateAIStatusBadge()
}
function setAIThinking(on,label="AI 正在思考…"){if(on)preemptBackgroundAI();aiBusy=on;updateAIStatusBadge(label);setPlayerActionControlsLocked(on||turnSyncBusy,on?"AI 正在處理你的行動…":turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"");qsa("[data-action],.suggestion,#helperForm button,#npcChatForm button").forEach(b=>b.disabled=on);const helperInput=$("#helperInput");if(helperInput)helperInput.disabled=on;const n=$("#narrative");if(on&&n)n.dataset.thinking=label;else if(n)delete n.dataset.thinking}
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
function show(id){qsa(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");document.body.dataset.screen=id;if(id==="game"){scheduleGameStageFit();requestAnimationFrame(()=>$(".scene")?.scrollIntoView({block:"start"}));resumeDeferredDirectorQueue();scheduleWorldEvolution("gameplay_idle",1800)}}
function migrate(s){ensureStateSyncRuntime(s);ensureClock(s);ensureWorldSimulation(s);ensureWorldRegistry(s);ensureNpcRuntime(s);ensureFactionRuntime(s);bootstrapKnowledgeGraph(s);ensureCharacter(s);ensureTalents(s);ensureQuestProgress(s);ensureMainQuest(s);ensureCrisis(s);ensureWorldImpact(s);ensureRecognition(s);ensureCheckProfile(s);ensurePlayerOrigin(s.player);ensureItemRuntime(s);ensureNotes(s);repairPlayerLocation(s);initializeWeather(s);ensureSurvival(s);ensureMagicRuntime(s);ensureTravelNetwork(s);ensureDungeonSites(s);ensurePlayerExperience(s);s.player.wallet??={};s.player.calendarKnown??=false;s.world.deferredTurns??=[];s.quests??={main:{id:"Q-main",title:"在陌生世界活下來",stage:0,status:"ACTIVE",objectives:["理解自己身處何地","尋找安全的落腳處","找到第一個可以交流的人"]}};s.discoveries??=0;if(!s.sceneTitle||s.sceneTitle==="陌生世界的第一天")s.sceneTitle=deriveSceneTitle(s);return s}
async function refresh(){const exists=await hasWorld().catch(()=>false);$("#continueBtn").disabled=!exists;updateAIStatusBadge();if(!gameState)return;migrate(gameState);recordGameplayStateChanges(gameState);document.body.dataset.worldGenre=gameState.world?.seedContract?.genre||"";$("#worldName").textContent=gameState.player?.worldNameKnown?gameState.world.name:"未知世界";$("#worldMeta").textContent=formatWorldTime(gameState);if($("#topLocation"))$("#topLocation").textContent=gameState.player.location||"未知之地";if($("#topTime"))$("#topTime").textContent=formatWorldTime(gameState);$("#knowledgePct").textContent=`${gameState.player.knowledgeScore}%`;const impactCap=impactCapability(gameState),recognition=recognitionSnapshot(gameState);if($("#impactStat"))$("#impactStat").textContent=impactLabel(impactCap.maxScope);if($("#renownStat"))$("#renownStat").textContent=`${renownLabel(recognition.tier)} · ${recognition.renown}`;$("#hpStat").textContent=`${gameState.player.hp} / ${gameState.player.maxHp}`;const trade=currentTradeProfile(gameState),balances=walletSummary(gameState);$("#currencyLabel").textContent="資產";if(balances.length)$("#goldStat").textContent=balances.slice(0,3).map(x=>`${x.currency?.symbol||""}${x.amount} ${x.currency?.name||x.id}`).join(" · ");else if(trade?.currencies?.length){const cur=trade.currencies[0];$("#goldStat").textContent=`${cur.symbol||""}${gameState.player.wallet?.[cur.id]||0} ${cur.name}`}else if(trade?.mode==="barter")$("#goldStat").textContent="以物易物";else $("#goldStat").textContent="—";$("#playerNameStat").textContent=gameState.player.name||"無名者";if($("#playerInitial"))$("#playerInitial").textContent=(gameState.player.name||"?").trim().slice(0,1)||"?";const talentInfo=talentSnapshot(gameState),survivalInfo=survivalSnapshot(gameState);$("#levelStat").textContent=`Lv.${gameState.player.level} · XP ${gameState.player.xp}/${xpNeeded(gameState.player.level)}${talentInfo.points?` · TP ${talentInfo.points}`:""}`;
 if($("#conditionStat"))$("#conditionStat").textContent=survivalInfo.conditions.length?survivalInfo.conditions.join("、"):"穩定";
 if($("#satietyStat"))$("#satietyStat").textContent=`${Math.round(survivalInfo.satiety)} / 100`;
 if($("#fatigueStat"))$("#fatigueStat").textContent=`${Math.round(survivalInfo.fatigue)} / 100`;
 if($("#magicStat"))$("#magicStat").textContent=gameState.player.magic?`${Math.round(gameState.player.magic.strain||0)} / ${gameState.player.magic.capacity||100}`:"—";$("#location").textContent=gameState.player.location;const weather=weatherUiSnapshot(gameState),weatherEl=$("#weather");if(weatherEl){weatherEl.textContent=weather.observableName;weatherEl.title=weather.sensoryCue||weather.observableName;weatherEl.dataset.danger=String(weather.danger||0)}document.body.dataset.weatherDanger=String(weather.danger||0);$("#sceneTitle").textContent=gameState.sceneTitle||deriveSceneTitle(gameState);$("#narrative").textContent=gameState.narrative;$("#questTitle").textContent=gameState.quests.main.title;$("#questText").textContent=gameState.quests.main.objectives[0]||"";renderKnownNpcs();renderSuggestions();const free=$("#freeAction");if(free){free.disabled=aiBusy||turnSyncBusy||Boolean(gameState.combat?.active);free.placeholder=gameState.combat?.active?"戰鬥中請使用下方戰鬥行動按鈕":turnSyncBusy?"STATE SYNC：同步完成後即可繼續行動":"自由行動：例如「我想仔細檢查眼前可見的物件」"}if(document.body.dataset.screen==="game"&&!aiBusy&&!turnSyncBusy)scheduleWorldEvolution("gameplay_idle",1600)}
async function persist(){if(gameState){
 const experience=ensurePlayerExperience(gameState),day=Number(gameState.world?.state?.day)||1;
 const projected=projectObservableWorldChanges(gameState,gameState.narrative);if(projected.projected.length){gameState.narrative=projected.narrative;recordDebug("WORLD_IMPACT_PROJECTED",{events:projected.projected,day,location:gameState.player?.location||""})}
 if(day>Number(experience?.session?.lastCheckpointDay||day)){const recap=sessionCheckpoint(gameState,"新的一天");if(recap){gameState.narrative=(gameState.narrative?gameState.narrative+"\n\n":"")+"旅程小結："+recap.summary+(recap.worldChanges.length?"\n世界留下的變化："+recap.worldChanges.join("；"):"");recordDebug("SESSION_CHECKPOINT",{reason:recap.reason,day:recap.day,worldChanges:recap.worldChanges})}}
 maintainSession(gameState);await saveWorld(gameState)
}}
function fallbackActionButtons(action=""){const contextual=roleplayFallbackSuggestions(gameState||{},{action});if(contextual.length)return contextual.slice(0,4);return ["檢查地面與附近物件上最新留下的痕跡","找一個正在避開人群的人，問他剛才看見了甚麼","沿著最明顯的新鮮痕跡走一小段，確認它通往哪裡","找一個能看見出入口的位置觀察人流"]}
function renderSuggestions(){
 const box=$("#choices");if(!box)return;
 if(gameState?.combat?.active){box.innerHTML='<div class="action-group main-actions"><div class="action-group-title">戰鬥行動</div><div class="action-grid"><button type="button" data-combat-action="attack">攻擊</button><button type="button" data-combat-action="defend">防禦</button><button type="button" data-combat-action="retreat">撤退</button></div></div>';box.querySelectorAll("[data-combat-action]").forEach(b=>b.onclick=()=>runCombatAction(b.dataset.combatAction));setPlayerActionControlsLocked(aiBusy||turnSyncBusy,turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"");return}
 const source=(gameState?.suggestionIntents?.length?gameState.suggestionIntents:(gameState?.suggestions?.length?gameState.suggestions:fallbackActionButtons())),set=buildContextualActionSet(gameState,source);
 gameState.suggestionIntents=set.all;gameState.suggestions=set.all.map(x=>x.label);
 const card=x=>{const p=suggestionPresentation(gameState,x),classes=["context-action",x.progression?"progression-action":"",["HIGH","EXTREME"].includes(x.risk)?"danger-action":""].filter(Boolean).join(" ");return `<button type="button" class="${classes}" data-suggestion-index="${set.all.indexOf(x)}"><span class="action-label">${esc(p.label)}</span>${p.meta?`<small class="action-meta">${esc(p.meta)}</small>`:""}${p.approach?`<span class="action-approach">${esc(p.approach)}</span>`:""}</button>`};
 box.innerHTML=`<div class="action-group main-actions"><div class="action-group-title">主要建議</div><div class="action-grid">${set.primary.map(card).join("")}</div></div>${set.highRisk.length?`<div class="action-group risk-actions"><div class="action-group-title">高風險行動</div><div class="action-grid risk-grid">${set.highRisk.map(card).join("")}</div></div>`:""}<div class="action-group free-choice"><div class="action-group-title">自由行動</div><button type="button" id="otherActionBtn" class="other-action-btn">我想做其他事情…</button></div>`;
 box.querySelectorAll("[data-suggestion-index]").forEach(b=>b.onclick=()=>{const x=set.all[Number(b.dataset.suggestionIndex)];if(x)runAction("free",x.action,{suggestion:x})});
 $("#otherActionBtn")?.addEventListener("click",()=>{const form=$("#freeActionForm");form?.classList.toggle("hidden");if(form&&!form.classList.contains("hidden"))$("#freeAction")?.focus()});setPlayerActionControlsLocked(aiBusy||turnSyncBusy,turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"")
}
function renderKnownNpcs(){const dock=$("#npcDock"),box=$("#knownNpcList");if(!dock||!box||!gameState)return;const npcs=ensureWorldRegistry(gameState).npcs.filter(x=>canInteractWithNpc(gameState,x)).slice(-6),comm=worldCommunication(gameState);dock.classList.toggle("hidden",!npcs.length);box.innerHTML=npcs.map(n=>{const tag=companionLabel(n),mode=npcInteractionMode(gameState,n),where=mode==="REMOTE"?`遠距 · ${comm.name}`:"附近";return `<button type="button" class="npc-mini" data-npc-id="${esc(n.id)}"><span>${esc((n.name||"?").slice(0,1))}</span><div><strong>${esc(n.name)}</strong><small>${esc(n.role||"")} · ${esc(where)}${tag?` · ${esc(tag)}`:""}</small></div></button>`}).join("");box.querySelectorAll("[data-npc-id]").forEach(b=>b.onclick=()=>openNpcPanel(b.dataset.npcId))}
function openNpcPanel(npcId,answer=""){const npc=findNpc(gameState,npcId);if(!npc||npc.known!==true)return;const status=npc.companion?.status||"NONE",mode=npcInteractionMode(gameState,npc),interactive=Boolean(mode),local=isNpcPresent(gameState,npc),comm=worldCommunication(gameState),actions=interactive?[`<button class="primary" data-npc-chat="${esc(npc.id)}">${mode==="REMOTE"?`透過 ${esc(comm.name)} 聯絡`:"對話"}</button>`]:[`<span class="muted">目前沒有可用的聯絡方式。</span>`];if(local&&status==="OFFERED")actions.push(`<button class="secondary" data-companion="accept" data-npc-id="${esc(npc.id)}">接受同行</button>`);else if(local&&status==="ACTIVE")actions.push(`<button class="ghost" data-companion="leave" data-npc-id="${esc(npc.id)}">請求暫時離隊</button>`);else if(local)actions.push(`<button class="secondary" data-companion="invite" data-npc-id="${esc(npc.id)}">邀請同行</button>`);openModal(`<div class="eyebrow">NPC · ${esc(companionLabel(npc)||"未同行")}</div><h2>${esc(npc.name)}</h2><p>${esc(answer||npc.description||npc.role||"")}</p><div class="settings-actions">${actions.join("")}</div>`);$("#modalContent [data-npc-chat]")?.addEventListener("click",()=>openNpcConversation(npc.id));$("#modalContent [data-companion]")?.addEventListener("click",async e=>{const action=e.currentTarget.dataset.companion;let message="";if(action==="invite"){const r=inviteCompanion(gameState,npc.id);message=r.accepted?npc.name+" 接受了同行邀請。":npc.name+" 暫時沒有接受同行邀請。"}else if(action==="accept"){message=acceptCompanionOffer(gameState,npc.id)?npc.name+" 正式加入旅程。":"這個同行提議已經失效。"}else if(action==="leave"){message=dismissCompanion(gameState,npc.id)?npc.name+" 暫時離開了隊伍。":"目前無法離隊。"}bumpStateRevision(gameState,"COMPANION_ACTION");await persist();await refresh();openNpcPanel(npc.id,message)})}
function npcConversationMessages(npcId){if(!npcChatHistory.has(npcId))npcChatHistory.set(npcId,[]);return npcChatHistory.get(npcId)}
function openNpcConversation(npcId){if(!gameState)return;const npc=findNpc(gameState,npcId),mode=npcInteractionMode(gameState,npc);if(!npc||!mode)return;const messages=npcConversationMessages(npcId),comm=worldCommunication(gameState),where=mode==="REMOTE"?"遠距 · "+comm.name:"就在附近";openModal(`<div class="npc-chat"><div class="npc-chat-head"><div class="npc-chat-avatar">${esc((npc.name||"?").slice(0,1))}</div><div><strong>${esc(npc.name)}</strong><small>${esc(npc.role||"人物")} · ${esc(where)}</small></div></div><div id="npcChatLog" class="npc-chat-log">${messages.length?messages.map(m=>`<div class="chat-bubble ${m.role==="player"?"player":"npc"}">${esc(m.text)}</div>`).join(""):`<div class="chat-bubble npc">${esc(npc.description||npc.role||"對方正等待你開口。")}</div>`}</div><div><p id="npcChatStatus" class="muted"></p><form id="npcChatForm" class="npc-chat-form"><input id="npcChatInput" maxlength="240" autocomplete="off" placeholder="對${esc(npc.name)}說些甚麼……"><button class="primary" type="submit" aria-label="送出">➤</button></form></div></div>`);const log=$("#npcChatLog");if(log)log.scrollTop=log.scrollHeight;$("#npcChatInput")?.focus();$("#npcChatForm")?.addEventListener("submit",async e=>{e.preventDefault();const input=$("#npcChatInput"),q=input?.value.trim();if(q)await submitNpcConversation(npcId,q)})}
async function submitNpcConversation(npcId,q){preemptBackgroundAI();if(!gameState||!q)return;if(turnSyncBusy){recordDebug("PLAYER_NPC_ACTION_BLOCKED_STATE_SYNC",{npcId,q:String(q||"").slice(0,180)});return}if(aiBusy)return;const npc=findNpc(gameState,npcId),mode=npcInteractionMode(gameState,npc);if(!npc||!mode)return;const messages=npcConversationMessages(npcId);messages.push({role:"player",text:q});openNpcConversation(npcId);setAIThinking(true,`${mode==="REMOTE"?"正在建立遠距聯絡":"正在等待"} ${npc.name} 的回應…`);const status=$("#npcChatStatus");if(status)status.textContent="對方正在回應……";let answer=`${npc.name}沒有提供更多可以確認的資訊。`;try{if(aiStatus.aiConfigured)answer=await talkToDynamicNpc(gameState,npc,q,{mode,communication:worldCommunication(gameState)});const turn=applyNpcConversationTurn(gameState,npc,q,answer);bumpStateRevision(gameState,"NPC_CONVERSATION");const suffix=turn.progressed?.length?"\n\n你從這段對話中確認到可推進任務的新線索。":"";messages.push({role:"npc",text:answer+suffix});await persist();await refresh()}catch(e){console.warn("NPC fallback",e);messages.push({role:"npc",text:answer})}finally{setAIThinking(false);openNpcConversation(npcId)}}
function bindNpcLinks(){document.querySelectorAll("#modalContent .npc-link[data-npc-id]").forEach(b=>b.onclick=()=>openNpcPanel(b.dataset.npcId))}
async function runCombatAction(action){preemptBackgroundAI();if(!gameState?.combat?.active)return;if(turnSyncBusy){recordDebug("PLAYER_COMBAT_ACTION_BLOCKED_STATE_SYNC",{action});return}if(aiBusy)return;const r=combatAction(gameState,action);bumpStateRevision(gameState,"COMBAT_ACTION");gameState.narrative=r.summary||"戰鬥局勢發生了變化。";gameState.sceneTitle=deriveSceneTitle(gameState,action);renderRoll(r.roll);if(!gameState.combat?.active){gameState.suggestions=fallbackActionButtons("戰鬥結束")}await persist();await refresh()}
function signed(n){const x=Number(n)||0;return x>0?`+${x}`:String(x)}
function renderRoll(roll){$("#d20").textContent=roll.natural;const m=roll.modifiers||{},parts=[["能力",m.attribute],["技能",m.skill],["裝備",m.equipment],["夥伴",m.companion],["關係",m.relationship],["情境",m.situation],["天氣",m.weather]].filter(([,v])=>Number(v));const detail=parts.map(([k,v])=>`${k} ${signed(v)}`).join(" · ");$("#rollLabel").textContent=`D20 ${roll.natural} ${roll.bonus>=0?"+":"-"} ${Math.abs(roll.bonus)} = ${roll.total} / DC ${roll.dc}`;$("#rollResult").textContent=`${roll.grade.replaceAll("_"," ")}${roll.profile?.skillLabel?` · ${roll.profile.skillLabel}`:""}${detail?` · ${detail}`:""}${Number(roll.difficulty)?` · 難度 ${signed(roll.difficulty)}`:""}${roll.skillUp?` · 技能提升至 ${roll.skillUp.after}`:""}`;const box=$("#diceBox");if(box){box.classList.remove("rolling","roll-success","roll-fail");void box.offsetWidth;box.classList.add("rolling",Number(roll.total)>=Number(roll.dc)?"roll-success":"roll-fail");setTimeout(()=>box.classList.remove("rolling"),700)}}
async function runAction(action,customText="",options={}){
 if(!gameState)return;preemptBackgroundAI();
 if(turnSyncBusy){recordDebug("PLAYER_ACTION_BLOCKED_STATE_SYNC",{action:String(customText||action||"").slice(0,180)});return}
 if(aiBusy)return;
 if(gameState.combat?.active){gameState.narrative="敵人仍在眼前。請使用攻擊、防禦或撤退來處理這場戰鬥。";await refresh();return}
 if(gameState.player.status==="DOWNED"){recoverFromDefeat(gameState);bumpStateRevision(gameState,"DEFEAT_RECOVERY");gameState.narrative="你在失去意識後醒來。傷勢尚未痊癒，但你仍保留已確認的世界知識。";gameState.sceneTitle=deriveSceneTitle(gameState,"醒來");gameState.suggestions=fallbackActionButtons("醒來");await persist();return refresh()}
 const requested=String(customText||action||"").trim()||"觀察目前環境",debugTurnStarted=Date.now(),prevalidatedAssessment=options?.suggestion?trustedSuggestionAssessment(gameState,options.suggestion):null;recordDebug("PLAYER_ACTION_START",{action,customText,requested,day:gameState.world?.state?.day||1,location:gameState.player?.location||""});if(markOpeningEngaged(gameState,requested))recordDebug("OPENING_HOOK_ENGAGED",{action:requested,day:gameState.world?.state?.day||1,location:gameState.player?.location||""});
 let assessment=prevalidatedAssessment;if(assessment)recordDebug("SUGGESTED_ACTION_PREVALIDATED",{action:requested,kind:assessment.kind,progression:options.suggestion?.progression===true,risk:options.suggestion?.risk,approach:options.suggestion?.approach,source:assessment.source});if(!assessment)assessment=fastLocalActionAssessment(gameState,requested);
 if(!assessment){
  if(!aiStatus.aiConfigured){gameState.narrative="這個行動需要語義判斷，但目前沒有可用的 AI Provider。基本觀察、查看背包、休息、使用明確物品與前往已知地點仍可由 Engine 直接處理。";await refresh();return}
  setAIThinking(true,"AI 正在解析 Action Intent 並判斷必要前提…");
  try{assessment=await assessPlayerAction(gameState,requested)}
  catch(e){
   console.warn("action feasibility failed",e);
   gameState.narrative="行動可行性判定暫時失敗，因此這次行動沒有執行，也沒有消耗時間。";
   gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"ACTION_ASSESSMENT_FAILED",visibility:"INTERNAL",action:requested,reason:e?.message||String(e),day:gameState.world?.state?.day||1,at:Date.now()});
   await persist();await refresh();return
  }finally{setAIThinking(false)}
 }
 recordDebug("ACTION_ASSESSMENT",{action:requested,verdict:assessment?.verdict,kind:assessment?.kind,intent:assessment?.actionIntent?.intent,targetId:assessment?.actionIntent?.targetId,source:assessment?.source,confidence:assessment?.confidence,reason:assessment?.reason,latencyFromTurnStartMs:Date.now()-debugTurnStarted});
 if(assessment?.source==="ENGINE_DEGRADED"){gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"ACTION_ASSESSMENT_DEGRADED",visibility:"INTERNAL",action:requested,reason:assessment.aiError||assessment.reason,day:gameState.world?.state?.day||1,at:Date.now()})}
  const effective=assessment?.verdict==="ADJUST"&&assessment.normalizedAction?assessment.normalizedAction:requested;
 const previousSuggestions=[...(gameState.suggestions||[])],previousSuggestionIntents=[...(gameState.suggestionIntents||[])],impactBefore=ensureWorldImpact(gameState).records.length;
 if(assessment?.verdict!=="BLOCK"){
  const localLore=resolveLocalLoreAction(gameState,effective);
  if(localLore){gameState.narrative=localLore.text;gameState.sceneTitle=deriveSceneTitle(gameState,effective);gameState.suggestions=fallbackActionButtons(effective);gameState.suggestionIntents=[];gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"PLAYER_ACTION_ASSESSED",visibility:"INTERNAL",action:requested,normalizedAction:effective,assessment,day:gameState.world?.state?.day||1,at:Date.now()});bumpStateRevision(gameState,"LOCAL_LORE_ACTION");await persist();await refresh();return}
 }
 const actionResult=performAction(gameState,action,customText,assessment),{roll,text:localText}=actionResult;gameState.narrative=localText;
 if(!actionResult.blocked)bumpStateRevision(gameState,actionResult.deterministic?"ENGINE_DETERMINISTIC_ACTION":"ENGINE_ACTION");
 recordDebug("ENGINE_ACTION_RESULT",{action:effective,blocked:Boolean(actionResult.blocked),deterministic:Boolean(actionResult.deterministic),revision:currentStateRevision(gameState),roll:roll?{natural:roll.natural,total:roll.total,dc:roll.dc,grade:roll.grade,success:roll.success,kind:roll.profile?.kind}:null,elapsedMs:Date.now()-debugTurnStarted});
 if(actionResult.blocked||actionResult.deterministic){
  const itemResult=actionResult.ruleEffects?.item;
  if(actionResult.deterministic&&itemResult?.ok&&["ITEM_SHOWN","ITEM_GIVEN"].includes(itemResult.action)&&itemResult.npcId&&aiStatus.aiConfigured){
   const npc=findNpc(gameState,itemResult.npcId);
   if(npc){
    setAIThinking(true,`${npc.name} 正在對你展示的物品作出反應…`);
    try{
     const message=itemResult.action==="ITEM_GIVEN"?`我把「${itemResult.itemName}」交給你。`:`我向你展示「${itemResult.itemName}」。`;
     const answer=await talkToDynamicNpc(gameState,npc,message,{mode:"LOCAL",communication:worldCommunication(gameState)});
     if(answer)gameState.narrative+=(gameState.narrative?"\n\n":"")+answer
    }catch(e){console.warn("item npc reaction fallback",e)}finally{setAIThinking(false)}
   }
  }
  gameState.sceneTitle=deriveSceneTitle(gameState,effective);gameState.suggestions=fallbackActionButtons(effective);gameState.suggestionIntents=[];await persist();await refresh();return
 }
 renderRoll(roll);
 gameState.sceneTitle=deriveSceneTitle(gameState,effective);gameState.suggestions=fallbackActionButtons(effective);gameState.suggestionIntents=[];
 const turnWorldId=gameState.world?.id,turnSnapshot=buildSnapshot(gameState),baseRevision=currentStateRevision(gameState);
 const syncPlan={...planStateSync({action:effective,intent:assessment?.actionIntent||{},roll,snapshot:turnSnapshot,ruleEffects:actionResult.ruleEffects}),baseRevision};
 recordDebug("STATE_SYNC_PLAN",{action:effective,mode:syncPlan.mode,baseRevision,dirtyFlags:syncPlan.dirtyFlags,immediateCapabilities:syncPlan.immediateCapabilities,deferredCapabilities:syncPlan.deferredCapabilities,blocking:syncPlan.blocking});
 gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"TURN_DIRECTOR_MODE",visibility:"INTERNAL",action:effective,mode:syncPlan.mode,dirty:syncPlan.dirty,revision:baseRevision,day:gameState.world?.state?.day||1,at:Date.now()});
 await refresh();

 if(!aiStatus.aiConfigured){
  recordDebug("STATE_SYNC_SKIPPED_NO_PROVIDER",{action:effective,mode:syncPlan.mode,revision:baseRevision});await persist();await refresh();scheduleWorldEvolution(effective||"player_exploration",5000);return
 }
 if(syncPlan.mode==="ENGINE_ONLY"){
  recordDebug("STATE_SYNC_ENGINE_ONLY",{action:effective,revision:baseRevision,dirtyFlags:syncPlan.dirtyFlags});
  startNonblockingPlayerNarration({action:effective,roll,snapshot:turnSnapshot,plan:syncPlan,intent:assessment?.actionIntent,previousSuggestions,previousSuggestionIntents,startedAt:debugTurnStarted});
  await persist();await refresh();scheduleWorldEvolution(effective||"player_exploration",5000);return
 }
 if(syncPlan.mode==="DEFERRED"){
  startNonblockingPlayerNarration({action:effective,roll,snapshot:turnSnapshot,plan:syncPlan,intent:assessment?.actionIntent,previousSuggestions,previousSuggestionIntents,startedAt:debugTurnStarted});
  scheduleDeferredDirector({action:effective,roll,intent:assessment?.actionIntent,plan:syncPlan,queuedAt:Date.now()},1200);
  recordDebug("STATE_SYNC_DEFERRED",{action:effective,revision:baseRevision,capabilities:syncPlan.capabilities});
  await persist();await refresh();scheduleWorldEvolution(effective||"player_exploration",7000);return
 }

 try{
  const jobs=startTurnAIJobs(effective,roll,turnSnapshot,{intent:assessment?.actionIntent,stateSyncPlan:syncPlan,baseRevision});
  const playerActionResult=jobs.playerAction.then(value=>({status:"fulfilled",value}),reason=>({status:"rejected",reason}));
  const stateSyncResult=jobs.stateSync.then(value=>({status:"fulfilled",value}),reason=>({status:"rejected",reason}));
  setTurnSyncing(true,`State Sync ${syncPlan.mode} · ${syncPlan.dirty.join(" / ")||"minimal"}`);
  setAIThinking(true,"PLAYER ACTION AI 正在優先處理你的行動…");
  recordDebug("TURN_DUAL_AI_STARTED",{action:effective,directorMode:syncPlan.mode,transport:jobs.transport,playerActionTask:"scene",stateSyncTask:syncPlan.mode,baseRevision});
  const playerResult=await playerActionResult;
  if(playerResult.status==="fulfilled"){
   const applied=applyPlayerActionScene(playerResult.value,{worldId:turnWorldId,baseRevision,roll,action:effective,previousSuggestions,previousSuggestionIntents});
   recordDebug(applied?"PLAYER_ACTION_AI_COMPLETED":"PLAYER_ACTION_AI_STALE_DISCARDED",{action:effective,mode:syncPlan.mode,baseRevision,currentRevision:currentStateRevision(gameState),elapsedMs:Date.now()-debugTurnStarted,transport:jobs.transport});
   if(applied)await refresh()
  }else recordDebug("PLAYER_ACTION_AI_FAILED",{action:effective,mode:syncPlan.mode,error:playerResult.reason?.message||String(playerResult.reason),elapsedMs:Date.now()-debugTurnStarted});
  setAIThinking(false);

  const stateResult=await stateSyncResult;
  if(stateResult.status!=="fulfilled"){
   recordDebug("STATE_SYNC_AI_FAILED",{action:effective,mode:syncPlan.mode,error:stateResult.reason?.message||String(stateResult.reason),elapsedMs:Date.now()-debugTurnStarted});
   if(syncPlan.mode==="DEEP")throw stateResult.reason;
   recordDebug("STATE_SYNC_FAST_EMPTY_FALLBACK",{action:effective,revision:currentStateRevision(gameState)})
  }else if(stateResult.value){
   const committed=commitStatePatch(gameState,stateResult.value,syncPlan,{action:effective,roll});
   if(committed.stale){recordDebug("STATE_PATCH_STALE_DISCARDED",{action:effective,mode:syncPlan.mode,baseRevision,currentRevision:committed.currentRevision});if(syncPlan.mode==="DEEP")throw new Error("STATE_PATCH_STALE")}
   else recordDebug("STATE_SYNC_AI_COMPLETED",{action:effective,directorMode:syncPlan.mode,elapsedMs:Date.now()-debugTurnStarted,transport:jobs.transport,operations:stateResult.value.operations?.length||0,revision:currentStateRevision(gameState),rebased:committed.rebased===true})
  }
  if(syncPlan.hasDeferredConsequences)scheduleDeferredDirector({action:effective,roll,intent:assessment?.actionIntent,plan:syncPlan,queuedAt:Date.now()},1200);
  recordDebug("TURN_COMMIT",{action:effective,directorMode:syncPlan.mode,elapsedMs:Date.now()-debugTurnStarted,deferredQueue:deferredDirector.queue.length,revision:currentStateRevision(gameState)})
 }catch(e){
  console.warn("AI turn state fallback",e);recordDebug("TURN_SYNC_DEGRADED",{action:effective,mode:syncPlan.mode,error:e?.message||String(e),elapsedMs:Date.now()-debugTurnStarted});
  if(!String(gameState.narrative||"").trim())gameState.narrative=localText;if(!String(gameState.sceneTitle||"").trim())gameState.sceneTitle=deriveSceneTitle(gameState,effective);if(JSON.stringify(gameState.suggestions||[])===JSON.stringify(previousSuggestions))gameState.suggestions=fallbackActionButtons(effective)
 }finally{
  if(aiBusy)setAIThinking(false);if(turnSyncBusy)setTurnSyncing(false)
 }
 try{await persist();await refresh()}
 finally{scheduleWorldEvolution(effective||"player_exploration",5000)}
}
$("#newWorldBtn").onclick=()=>show("creator");$("#continueBtn").onclick=async()=>{gameState=migrate(await loadWorld());if(!gameState)return;const report=validateWorld(gameState.world);if(!report.valid)return alert("存檔世界完整性驗證失敗："+report.errors.join(", "));aiStatus=await aiHealth();await refresh();show("game")};qsa("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));
function worldProgress(value,label,detail=""){const box=$("#worldGenProgress"),bar=$("#worldGenBar"),pct=$("#worldGenPct"),text=$("#worldGenText"),sub=$("#worldGenDetail");box.classList.remove("hidden");bar.style.width=value+"%";pct.textContent=value+"%";text.textContent=label;sub.textContent=detail}
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
  box.innerHTML=ruleValues[target].map(tag=>`<span class="world-tag selected-${target}">${esc(tag)}<button type="button" data-remove-rule-tag="${target}" data-tag="${esc(tag)}" aria-label="移除 ${esc(tag)}">×</button></span>`).join("")||'<span class="muted">尚未加入標籤</span>'
 }
 qsa("[data-remove-rule-tag]").forEach(b=>b.onclick=()=>{const t=b.dataset.removeRuleTag,tag=b.dataset.tag;ruleValues[t]=ruleValues[t].filter(x=>x!==tag);syncRuleHidden();renderRuleTagBuilder();renderCreatorReview()})
}
function addRuleTag(target,raw){
 const tag=cleanRuleTag(raw);if(!tag||!ruleValues[target])return;
 for(const key of Object.keys(ruleValues))ruleValues[key]=ruleValues[key].filter(x=>x!==tag);
 ruleValues[target].push(tag);syncRuleHidden();renderRuleTagBuilder();renderCreatorReview()
}
function renderRuleTagPresets(){
 const box=creatorField("ruleTagPresets"),category=creatorField("ruleTagCategory")?.value||"全部",query=String(creatorField("ruleTagSearch")?.value||"").trim().toLowerCase();if(!box)return;
 const entries=Object.entries(RULE_TAG_LIBRARY).filter(([name])=>category==="全部"||name===category).flatMap(([,tags])=>tags),unique=[...new Set(entries)].filter(tag=>!query||tag.toLowerCase().includes(query));
 box.innerHTML=unique.map(tag=>{const owner=Object.keys(ruleValues).find(k=>ruleValues[k].includes(tag));return `<button type="button" class="world-tag ${owner?"selected-"+owner:""}" data-preset-rule-tag="${esc(tag)}">${esc(tag)}</button>`}).join("")||'<span class="muted">沒有符合的預設標籤</span>';
 const count=creatorField("ruleTagCount");if(count)count.textContent=`${unique.length} 個標籤`;
 qsa("[data-preset-rule-tag]").forEach(b=>b.onclick=()=>addRuleTag(activeRuleTarget,b.dataset.presetRuleTag))
}
function renderRuleTagBuilder(){renderSelectedRuleTags();renderRuleTagPresets();qsa("[data-rule-target]").forEach(b=>b.classList.toggle("active",b.dataset.ruleTarget===activeRuleTarget));qsa("[data-rule-bucket]").forEach(b=>b.classList.toggle("active",b.dataset.ruleBucket===activeRuleTarget))}
function initRuleTagBuilder(){
 const category=creatorField("ruleTagCategory");if(category){category.innerHTML=["全部",...Object.keys(RULE_TAG_LIBRARY)].map(x=>`<option>${esc(x)}</option>`).join("");category.onchange=renderRuleTagPresets}
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
 const btn=$("#generateBtn"),draft=createWorldCreationDraft(creatorRaw()),seed=compileWorldCreation(draft);btn.disabled=true;
 try{
  if(!aiStatus.aiConfigured)throw new Error("建立新世界需要先在 AI 設定連接 Provider，因為世界主題與開局行動會由 AI 生成");
  worldProgress(6,"正在建立 World Blueprint","解析玩家設定、起源、定位、故事傾向與世界約束");
  await new Promise(r=>setTimeout(r,60));
  worldProgress(15,"正在建立 World Constitution","把必須／可以／禁止與難度、起源規則編譯成持久約束");
  gameState=newGame(seed);applyWorldCreationState(gameState,seed);
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
   canonizeGeneration(gameState,candidate.generation)
  }catch(e){console.error("AI world generation failed",e);worldProgress(0,"AI 世界生成失敗",e.message);throw e}
  finally{setAIThinking(false)}
  const contract=buildWorldContract(gameState);gameState.world.creation.contract=structuredClone(contract);
  worldProgress(93,"世界生成完成","世界已編譯完成；請先確認世界契約，再決定是否穿越。");notifyWorldReady();
  const accepted=await confirmWorldContract(contract);
  if(!accepted){gameState=null;worldProgress(0,"已返回修改","這次編譯結果尚未建立正式存檔；修改設定後可重新生成。");return}
  worldProgress(96,"正在建立正式存檔","保存 Blueprint、Constitution、Origin、Difficulty 與世界 Canon");
  await persist();worldProgress(98,"正在準備冒險介面","載入第一個場景");await refresh();worldProgress(100,"準備完成","正在穿越…");await new Promise(r=>setTimeout(r,250));show("game")
 }catch(e){worldProgress(0,"世界生成失敗",e.message);alert("世界編譯失敗："+e.message)}
 finally{btn.disabled=false}
};
$("#freeActionForm").onsubmit=async e=>{e.preventDefault();const input=$("#freeAction"),value=input.value.trim();if(!value)return;input.value="";await runAction("free",value)};
function debugRuntimeSnapshot(){
 return {screen:document.body.dataset.screen||"",aiBusy,turnSyncBusy,turnSyncLabel,stateRevision:gameState?currentStateRevision(gameState):null,nonblockingPlayerAction:Boolean(nonblockingScene.controller),deferredDirector:{running:deferredDirector.running,queued:deferredDirector.queue.length},worldBackground:{running:worldBackground.running,queued:worldBackground.queued,lastReason:worldBackground.lastReason,failures:worldBackground.failures,cooldownRemainingMs:Math.max(0,Number(worldBackground.cooldownUntil||0)-Date.now())},combatActive:Boolean(gameState?.combat?.active),worldId:gameState?.world?.id||null,worldDay:gameState?.world?.state?.day||null}
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
function openModal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden")}$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");$("#modal").onclick=e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden")};
function openWorldMap(){
 const r=ensureWorldRegistry(gameState),map=worldMapSnapshot(gameState),npcs=r.npcs.filter(x=>x.known===true),factions=r.factions.filter(x=>x.known===true),weather=weatherUiSnapshot(gameState);
 const routeByRegion=map.routes.map(x=>`${esc(x.fromName)} ↔ ${esc(x.toName)} · ${Math.round(x.distanceKm)}km · ${esc(x.terrain)}`);
 const regionHtml=map.regions.map(region=>`<div class="lore-item"><small>REGION</small><h3>${esc(region.region)}</h3><div class="world-map-region">${region.locations.map(loc=>{const full=r.locations.find(x=>x.id===loc.id),access=loc.access||{allowed:true,missing:[]},missing=access.missing||[];return `<div class="faction-row"><strong>${loc.current?"◆ ":""}${esc(loc.name)}</strong><small>${esc(loc.type||"未知地點")}${loc.current?" · CURRENT":""}</small>${full?.description?`<span>${esc(full.description)}</span>`:""}${missing.length?`<small>🔒 需要：${missing.map(x=>esc(x.hint||x.id||x.type)).join(" · ")}</small>`:`<small>可進入條件：已滿足</small>`}</div>`}).join("")}</div></div>`).join("");
 openModal(`<div class="eyebrow">KNOWN WORLD MAP</div><h2>世界地圖</h2><p class="muted">只顯示你已經知道的地點與已確認路線；未知區域不會出現在地圖上。</p><div class="lore-list">
 <div class="lore-item"><small>CURRENT WEATHER</small><h3>${esc(weather.observableName)}</h3><p>${esc(weather.sensoryCue||"")}</p></div>
 ${regionHtml||'<div class="lore-item"><p>尚未掌握任何可定位的地點。</p></div>'}
 <div class="lore-item"><small>KNOWN ROUTES</small><p>${routeByRegion.length?routeByRegion.join("<br>"):"尚未確認地點之間的路線"}</p></div>
 <div class="lore-item"><small>KNOWN NPCS</small><p>${npcs.map(x=>`<button class="npc-link" data-npc-id="${esc(x.id)}">${esc(x.name)} · ${esc(x.role)}</button>`).join("")||"尚未遇到人物"}</p></div>
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
 const p=checkProfileSnapshot(gameState),survival=survivalSnapshot(gameState),origin=playerOriginSnapshot(gameState.player),magic=gameState.player.magic||{strain:0,capacity:100},active=ensureWorldRegistry(gameState).npcs.filter(x=>x.known===true&&x.alive!==false&&x.companion?.status==="ACTIVE");
 openModal(`<div class="eyebrow">CHARACTER STATUS</div><h2>${esc(gameState.player.name)}</h2><p class="muted">${esc(origin.label)} · 普通現代成年人基準。地球常識不代表你知道異世界的名稱、規則或文化。</p><div class="lore-list">
 <div class="lore-item"><small>VITALS</small><p><strong>生命</strong> ${gameState.player.hp}/${gameState.player.maxHp}<br><strong>飽食度</strong> ${Math.round(survival.satiety)}/100（越高越飽）<br><strong>疲勞</strong> ${Math.round(survival.fatigue)}/100（越高越疲勞）<br><strong>環境暴露</strong> ${Math.round(survival.exposure)}/100<br><strong>傷勢</strong> ${Math.round(survival.injury)}/100<br><strong>魔法負荷</strong> ${Math.round(magic.strain||0)}/${magic.capacity||100}</p></div>
 <div class="lore-item"><small>MODERN EARTH BASELINE</small><p>${origin.commonKnowledge.map(x=>esc(x)).join("<br>")}</p><small>預設價值觀</small><p>${origin.defaultValues.map(x=>esc(x)).join("<br>")}</p></div>
 <div class="lore-item"><small>ATTRIBUTES</small><p>${Object.entries(p.stats).map(([k,v])=>`<strong>${esc(STAT_LABEL[k]||k)}</strong> ${v}`).join(" · ")}</p></div>
 <div class="lore-item"><small>SKILLS</small>${Object.entries(p.skills).map(([k,v])=>`<p><strong>${esc(SKILL_LABEL[k]||k)}</strong> Lv.${v} · 熟練 ${p.skillProgress[k]||0}${v<5?` / ${4+v*3}`:" · MAX"}</p>`).join("")}</div>
 <div class="lore-item"><small>EQUIPPED TOOLS</small><p>${p.equipped.length?p.equipped.map(x=>`${esc(x.name)} · ${esc(bonusText(x.checkBonuses))}`).join("<br>"):"目前沒有具判定加成的裝備"}</p></div>
 <div class="lore-item"><small>ACTIVE COMPANIONS</small><p>${active.length?active.map(x=>`${esc(x.name)} · ${esc(x.role||"")} · 信任 ${x.trust??0}`).join("<br>"):"目前沒有同行夥伴"}</p></div>
 </div>`)
});
$("#runtimeBtn")?.addEventListener("click",()=>{
 const survival=survivalSnapshot(gameState),magic=gameState.player.magic||{strain:0,capacity:100,knownSpells:[]},talents=talentSnapshot(gameState),travel=travelSnapshot(gameState,{director:false}),market=marketSnapshot(gameState),dungeon=dungeonSnapshot(gameState,{director:false}),culture=cultureSnapshot(gameState),registry=ensureWorldRegistry(gameState),locNames=new Map(registry.locations.map(x=>[x.id,x.name])),companions=ensureNpcRuntime(gameState).filter(x=>x.companion?.status==="ACTIVE"),worldHealth=worldHealthSnapshot(gameState),generationDiag=gameState.world.generationDiagnostics?.summary||{},quality=gameState.world.quality;
 const routeText=travel.routes.length?travel.routes.map(r=>`${esc(locNames.get(r.fromId)||"?")} ↔ ${esc(locNames.get(r.toId)||"?")} · ${r.distanceKm}km · ${esc(r.terrain)} · 約 ${r.baseMinutes} 分`).join("<br>"):"尚未掌握可確認路線";
 const marketText=market?.goods?.length?market.goods.map(g=>`${esc(g.name)} · ${g.price} · 庫存 ${g.stock}`).join("<br>"):"目前沒有可確認的地方市場商品";
 const dungeonText=dungeon?.rooms?.length?dungeon.rooms.map(r=>`${esc(r.name)} · ${r.cleared?"已清理":"已發現"}`).join("<br>"):"目前沒有已探索的遺構空間";
 openModal(`<div class="eyebrow">ISEKAI RUNTIME</div><h2>異界狀態</h2><p class="muted">這些不是背景文字，而是目前正在影響判定與世界狀態的規則。</p><div class="lore-list">
 <div class="lore-item"><small>WORLD QUALITY</small><h3>${quality?.overall??worldHealth.score}/100 · ${esc(quality?.status||worldHealth.status)}</h3><p>Structural Integrity: ${gameState.integrity?.valid?"PASS":"CHECK"} · AI stages ${generationDiag.aiSucceeded??"?"}/${generationDiag.stageCount??"?"} · Fallback ${generationDiag.fallbackCount??0}<br><small>Runtime Health ${worldHealth.score}/100 · Evolution Passes ${gameState.world.evolution?.count??0}</small></p></div>
 <div class="lore-item"><small>SURVIVAL</small><p>飽食度 ${Math.round(survival.satiety)} · 疲勞 ${Math.round(survival.fatigue)} · 環境暴露 ${Math.round(survival.exposure)} · 傷勢 ${Math.round(survival.injury)}<br>${survival.conditions.length?survival.conditions.map(esc).join(" · "):"目前狀態穩定"}</p></div>
 <div class="lore-item"><small>MAGIC</small><p>魔法負荷 ${Math.round(magic.strain||0)} / ${magic.capacity||100}<br>${(magic.knownSpells||[]).length?(magic.knownSpells||[]).map(x=>`${esc(x.name)} · 消耗 ${x.cost}`).join("<br>"):"尚未掌握有 Canon 證據支持的術式"}</p></div>
 <div class="lore-item"><small>LOCAL CULTURE</small><p>${culture?esc(culture.identity||"當地文化仍待理解")+"<br>當地適應 "+culture.standing:"目前沒有足夠資料"}</p></div>
 <div class="lore-item"><small>KNOWN ROUTES</small><p>${routeText}</p></div>
 <div class="lore-item"><small>LOCAL MARKET</small><p>${marketText}</p></div>
 <div class="lore-item"><small>RUINS / DUNGEON</small><p>${dungeonText}</p></div>
 <div class="lore-item"><small>ACTIVE COMPANIONS</small><p>${companions.length?companions.map(x=>`${esc(x.name)} · HP ${x.life?.hp??"?"}/${x.life?.maxHp??"?"} · 精力 ${Math.round(x.life?.energy??0)}`).join("<br>"):"目前沒有同行夥伴"}</p></div>
 <div class="lore-item"><small>TALENTS · POINTS ${talents.points}</small><p>${talents.owned.length?talents.owned.map(x=>esc(x.name)).join(" · "):"尚未選擇天賦"}</p>${talents.points&&talents.available.length?`<div class="settings-actions">${talents.available.map(x=>`<button class="secondary" data-learn-talent="${esc(x.id)}">${esc(x.name)}</button>`).join("")}</div>`:""}</div>
 </div>`);
 qsa("#modalContent [data-learn-talent]").forEach(b=>b.onclick=async()=>{const result=learnTalent(gameState,b.dataset.learnTalent);if(result.ok){await persist();await refresh();$("#runtimeBtn").click()}});
});
$("#impactBtn")?.addEventListener("click",()=>{const snap=impactSnapshot(gameState),recognition=recognitionSnapshot(gameState),records=playerImpactRecords(gameState,50).reverse(),total=Object.values(snap.influence).reduce((a,b)=>a+(Number(b)||0),0);openModal(`<div class="eyebrow">WORLD IMPACT & REPUTATION</div><h2>我改變過的世界</h2><p class="muted">世界會記住你做過的事，但不同地方、人物與勢力只會知道真正傳到他們耳中的部分。</p><div class="lore-list"><div class="lore-item"><small>CURRENT REACH</small><h3>${esc(impactLabel(snap.capability.maxScope))}級影響 · ${esc(renownLabel(recognition.tier))}</h3><p>累積影響 ${total} · 名聲 ${recognition.renown} · 惡名／戒心 ${recognition.notoriety}</p></div>${recognition.titles.length?`<div class="lore-item"><small>HOW THE WORLD NAMES YOU</small><h3>${recognition.titles.map(x=>esc(x.label)).join(" · ")}</h3></div>`:""}${recognition.activeRumors.length?`<div class="lore-item"><small>ACTIVE RUMORS</small><p>${recognition.activeRumors.slice().reverse().map(x=>`${esc(x.targetName||"世界")}：${esc(x.text)}`).join("<br><br>")}</p></div>`:""}${recognition.marks.length?`<div class="lore-item"><small>LEGACY MARKS</small><p>${recognition.marks.slice().reverse().map(x=>`${esc(x.targetName||"世界")} · ${esc(x.label)}`).join("<br>")}</p></div>`:""}${recognition.reactions.length?`<div class="lore-item"><small>WORLD REACTIONS</small><p>${recognition.reactions.slice().reverse().map(x=>esc(x.summary)).join("<br><br>")}</p></div>`:""}${records.map(x=>`<div class="lore-item"><small>DAY ${x.day} · ${esc(impactLabel(x.scope))} · ${esc(x.targetName||"世界")}</small><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p></div>`).join("")||"<div class=\"lore-item\"><p>你尚未對世界造成持久改變。繼續探索、建立關係並介入真正重要的事件。</p></div>"}</div>`)});
$("#journalBtn").onclick=()=>openJournalUI(gameState,openModal,persist,"quests");
$("#inventoryBtn").onclick=()=>openInventoryUI(gameState,openModal,persist,runAction);
$("#historyBtn").onclick=()=>{const events=playerVisibleEvents(gameState,30).reverse();openModal(`<div class="eyebrow">CHRONICLE</div><h2>旅程紀錄</h2><p class="muted">只顯示你親身經歷、可觀察或已取得的事件。</p><div class="lore-list">${events.map(e=>`<div class="lore-item"><small>DAY ${e.day}${e.time?` · ${esc(e.time)}`:""} · ${esc(e.type)}</small><p>${e.summary?esc(e.summary):e.action?esc(e.customText||e.action):"你來到了這個陌生世界。"}</p></div>`).join("")}</div>`)};
$("#aiSettingsBtn").onclick=()=>{const s=loadAISettings(),j=loadJevSettings();openModal(`<div class="eyebrow">LOCAL AI CONFIG</div><h2>AI 設定</h2><p class="muted">API Key 只保存在這個瀏覽器。模型由 Elyndra 按 Provider 固定管理，用戶不需要輸入模型名稱。</p><div class="settings-grid"><label>Provider<select id="aiProvider"><option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="agnes">Agnes 3.0 Flash</option></select></label><label>API Endpoint<input id="aiEndpoint" type="url" value="${esc(s.endpoint)}"></label><label>目前模型<input id="aiModelDisplay" value="${esc(PROVIDERS[s.provider]?.model||s.model)}" readonly></label><label>AI 優化模式<select id="aiOptimization"><option value="standard">標準</option><option value="adaptive">Elyndra 自適應優化</option></select></label><label>API Key<input id="aiKey" type="password" autocomplete="new-password" value="" placeholder="${s.apiKey?"已保存 · 輸入新 Key 才會取代":"尚未設定"}"></label></div><p id="aiProviderHint" class="muted"></p><p id="aiOptimizationHint" class="muted"></p><hr><div class="eyebrow">JEV DECISION ROUTER · OPTIONAL</div><p class="muted">只負責低成本 routing；失敗會自動回本地規則。Jev Key 亦只保存在本瀏覽器。</p><div class="settings-grid"><label>啟用 Jev<input id="jevEnabled" type="checkbox" ${j.enabled?"checked":""}></label><label>Jev Endpoint<input id="jevEndpoint" type="url" value="${esc(j.endpoint)}"></label><label>Jev Model<input id="jevModel" value="${esc(j.model)}"></label><label>Jev API Key<input id="jevKey" type="password" autocomplete="off" value="${esc(j.apiKey)}"></label><label>Confidence Threshold<input id="jevThreshold" type="number" min=".5" max=".95" step=".01" value="${j.threshold}"></label></div><div class="settings-actions"><button id="jevSave" class="secondary">儲存並測試 Jev</button><button id="jevClear" class="ghost">清除 Jev</button></div><p id="jevResult" class="muted"></p><div class="settings-actions"><button id="aiSave" class="primary">儲存並測試</button><button id="aiClear" class="secondary">清除本地 Key</button></div><p id="aiTestResult" class="muted"></p>`);
const provider=$("#aiProvider"),endpoint=$("#aiEndpoint"),modelDisplay=$("#aiModelDisplay"),optimization=$("#aiOptimization"),key=$("#aiKey"),providerHint=$("#aiProviderHint"),optimizationHint=$("#aiOptimizationHint");
const syncProviderHint=()=>{const p=PROVIDERS[provider.value];if(!p)return;if(modelDisplay)modelDisplay.value=p.model;if(providerHint)providerHint.textContent=`${p.label} · Elyndra 固定模型：${p.model}`;if(optimizationHint)optimizationHint.textContent=optimization.value==="adaptive"?"自適應優化會按任務重要性分配思考：行動／敘事較快，核心規則／歷史／Timeline 更深入，Critic／Recovery 使用最高保護。":"標準模式不主動指定 Provider 思考強度，使用模型預設行為。"};
provider.value=s.provider;optimization.value=s.optimization==="adaptive"?"adaptive":"standard";syncProviderHint();optimization.onchange=syncProviderHint;provider.onchange=()=>{saveAISettings({provider:s.provider,endpoint:endpoint.value,apiKey:key.value,optimization:optimization.value});key.value="";const next=selectAIProvider(provider.value),p=PROVIDERS[provider.value];endpoint.value=next.endpoint||p.endpoint;optimization.value=next.optimization==="adaptive"?"adaptive":"standard";key.placeholder=next.apiKey?"已保存 · 輸入新 Key 才會取代":"尚未設定";s.provider=provider.value;syncProviderHint()};
$("#aiSave").onclick=async()=>{const btn=$("#aiSave"),out=$("#aiTestResult");saveAISettings({provider:provider.value,endpoint:endpoint.value,apiKey:$("#aiKey").value,optimization:optimization.value});btn.disabled=true;out.textContent="正在測試連線…";try{await testDirectAI();aiStatus=await aiHealth();out.textContent="連線成功。AI ONLINE 已啟用。";await refresh()}catch(e){aiStatus=await aiHealth();out.textContent="設定已保存在本地，但連線失敗："+e.message;await refresh()}finally{btn.disabled=false}};
$("#jevSave").onclick=async()=>{saveJevSettings({enabled:$("#jevEnabled").checked,endpoint:$("#jevEndpoint").value,model:$("#jevModel").value,apiKey:$("#jevKey").value,threshold:$("#jevThreshold").value});const out=$("#jevResult");out.textContent="正在測試 Jev…";try{const r=await testJev();out.textContent=`Jev OK · ${r.route} · confidence ${r.confidence.toFixed(2)}`}catch(e){out.textContent="Jev 連線失敗："+e.message}};$("#jevClear").onclick=()=>{clearJevSettings();$("#jevResult").textContent="Jev 本地設定已清除。"};
$("#aiClear").onclick=async()=>{clearAISettings(provider.value);const fresh=loadAISettings(provider.value);endpoint.value=fresh.endpoint;optimization.value=fresh.optimization==="adaptive"?"adaptive":"standard";key.value="";key.placeholder="尚未設定";syncProviderHint();aiStatus=await aiHealth();$("#aiTestResult").textContent=`${PROVIDERS[provider.value].label} 的本地 API 設定已清除。`;await refresh()}};
$("#saveToolsBtn").onclick=()=>openSaveManagerUI(gameState,openModal,{onLoad:async loaded=>{gameState=migrate(loaded);await refresh();$("#modal").classList.add("hidden");show("game")},onImport:()=>$("#importFile").click()});
$("#importFile").onchange=async e=>{try{gameState=migrate(await importWorld(e.target.files[0]));await refresh();$("#modal").classList.add("hidden");show("game")}catch(err){alert(err.message)}finally{e.target.value=""}};
$("#resetBtn").onclick=async()=>{if(confirm("確定要刪除目前的本地世界嗎？")){await deleteWorld();gameState=null;await refresh();show("landing")}};
$("#gameMenuBtn")?.addEventListener("click",()=>openModal(`<div class="eyebrow">選單</div><h2>旅程設定</h2><p class="muted">一般冒險期間把系統設定收起，避免打斷場景。</p><div class="lore-list"><button class="secondary" data-system-open="aiSettingsBtn">AI 設定</button><button class="secondary" data-system-open="saveToolsBtn">存檔管理</button><button class="ghost" data-system-open="helperBtn">旅途助手</button><button class="ghost" data-system-open="runtimeBtn">異界狀態</button><button class="ghost" data-system-open="historyBtn">旅程紀錄</button><button class="ghost" data-system-open="debugBtn">Debug 診斷</button><button class="ghost" data-system-open="impactBtn">世界留下的痕跡</button><button class="ghost danger-ghost" data-system-open="resetBtn">重置世界</button></div>`));
$("#modalContent")?.addEventListener("click",e=>{const id=e.target.closest("[data-system-open]")?.dataset.systemOpen;if(id)document.getElementById(id)?.click()});
$("#moreBtn")?.addEventListener("click",()=>$("#gameMenuBtn")?.click());
qsa("[data-nav-home]").forEach(b=>b.addEventListener("click",()=>{$("#modal")?.classList.add("hidden");$(".scene")?.scrollIntoView({behavior:"smooth",block:"start"})}));
qsa("[data-mobile-target]").forEach(b=>b.addEventListener("click",()=>{qsa("[data-mobile-target]").forEach(x=>x.classList.toggle("active",x===b));const target=b.dataset.mobileTarget;if(target==="home"){$("#modal")?.classList.add("hidden");$(".scene")?.scrollIntoView({behavior:"smooth",block:"start"});return}document.getElementById(target)?.click()}));
window.addEventListener("resize",scheduleGameStageFit,{passive:true});
window.visualViewport?.addEventListener("resize",scheduleGameStageFit,{passive:true});
scheduleGameStageFit();
const versionBadge=$("#versionBadge");if(versionBadge)versionBadge.textContent=`v${APP_VERSION}`;
aiStatus=await aiHealth();await refresh();