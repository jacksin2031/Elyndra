import {directChat} from "./ai-settings.js?v=54013";
import {recordDebug} from "./debug-telemetry.js?v=54001";
import {helperSnapshot} from "./helper-context.js?v=54005";

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):min));
const pick=(items,random=Math.random)=>items[Math.min(items.length-1,Math.floor(clamp(random(),0,.999999999999)*items.length))];
const text=(value,max=240)=>String(value??"").trim().slice(0,max);
const list=value=>Array.isArray(value)?value:[];

export function autotestExportSelection(value="both"){
 const mode=["both","debug","world"].includes(String(value))?String(value):"both";
 return {mode,debug:mode!=="world",world:mode!=="debug"}
}

const GENRES=["王道奇幻","黑暗奇幻","東方幻想","蒸汽魔法","末日異世界"];
const SCALES=["小型","中型","大型"];
const DIFFICULTIES=["easy","normal","hard","realistic"];
const ORIGINS=["crossing","reincarnation","summoned","possession","native","amnesia"];
const ROLES=["ordinary","adventurer","hero_candidate","merchant","noble","researcher","antagonist","random"];

export function randomAutotestWorldRaw(random=Math.random,index=0){
 const n=(min,max)=>Math.round(min+clamp(random(),0,.999999999999)*(max-min));
 const style=pick(GENRES,random),scale=pick(SCALES,random);
 return {
  masterSeed:`autotest-${Date.now().toString(36)}-${index}-${Math.floor(clamp(random(),0,.999999999999)*1e9).toString(36)}`,
  playerName:"",
  worldStyle:style,
  worldStyleMode:"fixed",
  worldStyleLocked:false,
  worldScale:scale,
  worldScaleMode:"fixed",
  worldScaleLocked:false,
  targetPlayHours:n(4,40),
  difficulty:pick(DIFFICULTIES,random),
  originType:pick(ORIGINS,random),
  originCustom:"",
  playerRole:pick(ROLES,random),
  roleCustom:"",
  customWorldDescription:"",
  storyPreferences:"",
  requiredElements:"",
  allowedElements:"",
  forbiddenElements:"",
  civilizationLevel:n(1,10),civilizationLevelMode:"random",civilizationLevelLocked:false,
  technologyLevel:n(1,10),technologyLevelMode:"random",technologyLevelLocked:false,
  magicLevel:n(1,10),magicLevelMode:"random",magicLevelLocked:false,
  civilizationCount:n(1,12),civilizationCountMode:"random",civilizationCountLocked:false,
  speciesCount:n(1,12),speciesCountMode:"random",speciesCountLocked:false,
  languageCount:n(1,16),languageCountMode:"random",languageCountLocked:false,
  politicalUnity:n(1,10),politicalUnityMode:"random",politicalUnityLocked:false,
  religionInfluence:n(1,10),religionInfluenceMode:"random",religionInfluenceLocked:false,
  resourceAbundance:n(1,10),resourceAbundanceMode:"random",resourceAbundanceLocked:false,
  worldDanger:n(1,10),worldDangerMode:"random",worldDangerLocked:false,
  unknownRatio:n(10,95),unknownRatioMode:"random",unknownRatioLocked:false,
  survivalIntensity:n(1,10),survivalIntensityMode:"random",survivalIntensityLocked:false,
  warState:pick(["PEACE","TENSION","WAR"],random),warStateMode:"random",warStateLocked:false
 }
}

function visibleSuggestion(row,index){
 if(typeof row==="string")return {index,label:text(row,180),action:text(row,180),risk:""};
 return {index,label:text(row?.label||row?.action||"",180),action:text(row?.action||row?.label||"",180),kind:text(row?.kind||"",30).toUpperCase(),risk:text(row?.risk||"",30),approach:text(row?.approach||"",120),progression:row?.progression===true}
}

export function playerVisibleAutotestSnapshot(state={}){
 const registry=state.world?.registry||{},clock=state.world?.state?.clock||{},player=state.player||{},main=state.quests?.main||{},playerContext=helperSnapshot(state);
 const source=list(state.suggestionIntents).length?state.suggestionIntents:list(state.suggestions);
 return {
  playerContext,
  world:{
   name:player.worldNameKnown===true?text(state.world?.name,120):"UNKNOWN",
   day:Number(state.world?.state?.day||clock.day)||1,
   time:String(clock.hour??0).padStart(2,"0")+":"+String(clock.minute??0).padStart(2,"0"),
   location:text(player.location||state.world?.state?.location||"",160)
  },
  scene:{title:text(state.sceneTitle,180),narrative:text(state.narrative,1800)},
  player:{
   name:text(player.name||"無名者",80),hp:Number(player.hp)||0,maxHp:Number(player.maxHp)||0,status:text(player.status||"",60),
   level:Number(player.level)||1,xp:Number(player.xp)||0,knowledgeScore:Number(player.knowledgeScore)||0,
   discoveries:Number(state.discoveries)||0,wallet:player.wallet&&typeof player.wallet==="object"?structuredClone(player.wallet):{}
  },
  quest:{title:text(main.title,180),stage:Number(main.stage)||0,status:text(main.status||"",60),objectives:list(main.objectives).map(x=>text(x,220)).filter(Boolean).slice(0,8)},
  inventory:list(state.inventory).map(x=>({id:text(x?.id,100),name:text(x?.name,120),quantity:Math.max(0,Number(x?.quantity)||1),category:text(x?.category,80),equipped:x?.equipped===true})).slice(0,60),
  knowledge:list(state.knowledge).map(x=>({id:text(x?.id,100),title:text(x?.title,180),status:text(x?.status,80),score:Number(x?.score)||0,factId:x?.factId||null,historyId:x?.historyId||null})).slice(0,100),
  knownNpcs:list(registry.npcs).filter(x=>x?.known===true).map(x=>({id:text(x.id,100),name:text(x.name,120),role:text(x.role,120),encountered:x.encountered===true,trust:Number(x.trust)||0,companionStatus:text(x.companion?.status||"NONE",40)})).slice(0,60),
  knownLocations:list(registry.locations).filter(x=>x?.known===true).map(x=>({id:text(x.id,100),name:text(x.name,140),region:text(x.region,120),type:text(x.type,100)})).slice(0,80),
  suggestions:source.map(visibleSuggestion).filter(x=>x.action||x.label).slice(0,12),
  combat:state.combat?.active?{active:true,enemy:{name:text(state.combat.enemy?.name||"未知敵人",120),hp:Number(state.combat.enemy?.hp)||0}}:{active:false}
 }
}

function parseDecision(value){
 if(value&&typeof value==="object")return value;
 const raw=String(value||"").trim().replace(/^\`\`\`(?:json)?/i,"").replace(/\`\`\`$/,"").trim();
 try{return JSON.parse(raw)}catch{}
 const match=raw.match(/\{[\s\S]*\}/);
 if(match)try{return JSON.parse(match[0])}catch{}
 return {}
}

function normalizedRecent(recentActions=[]){
 return new Set(list(recentActions).slice(-8).map(x=>text(typeof x==="string"?x:(x?.action||x?.label||""),180).toLowerCase()).filter(Boolean))
}
function recentAutotestStalled(recentActions=[]){
 const rows=list(recentActions).filter(x=>x&&typeof x==="object").slice(-3);
 return rows.length>=2&&rows.slice(-2).every(x=>x.progressed===false)
}
function antiStallSuggestion(suggestions,recent){
 const fresh=x=>!recent.has(text(x?.action||x?.label,180).toLowerCase()),active=x=>x?.progression===true&&fresh(x);
 return suggestions.find(x=>active(x)&&!["OBSERVE","GENERAL"].includes(String(x?.kind||"").toUpperCase()))
  ||suggestions.find(active)
  ||suggestions.find(x=>fresh(x)&&!["OBSERVE","GENERAL"].includes(String(x?.kind||"").toUpperCase()))
  ||null
}

export function normalizeAutotestDecision(value,snapshot={},recentActions=[]){
 const parsed=parseDecision(value),combat=snapshot?.combat?.active===true,suggestions=list(snapshot?.suggestions),recent=normalizedRecent(recentActions);
 const goalReached=parsed?.goalReached===true,goalEvidence=text(parsed?.goalEvidence,400),reason=text(parsed?.reason,300);
 if(combat){
  const combatAction=["attack","defend","retreat"].includes(parsed?.combatAction)?parsed.combatAction:"attack";
  return {mode:"combat",combatAction,action:combatAction,suggestionIndex:null,reason,goalReached,goalEvidence}
 }
 if(parsed?.mode==="suggestion"&&suggestions.length){
  let i=clamp(Math.floor(Number(parsed.suggestionIndex)||0),0,suggestions.length-1),chosen=suggestions[i];
  if(recentAutotestStalled(recentActions)&&(chosen?.progression!==true||["OBSERVE","GENERAL"].includes(String(chosen?.kind||"").toUpperCase()))){
   const alt=antiStallSuggestion(suggestions,recent);if(alt){i=suggestions.indexOf(alt);chosen=alt}
  }
  return {mode:"suggestion",suggestionIndex:i,action:text(chosen?.action||chosen?.label,180),kind:text(chosen?.kind||"",30),progression:chosen?.progression===true,combatAction:null,reason,goalReached,goalEvidence}
 }
 if(parsed?.mode==="free"&&text(parsed?.action,180)){
  return {mode:"free",suggestionIndex:null,action:text(parsed.action,180),combatAction:null,reason,goalReached,goalEvidence}
 }
 if(suggestions.length){
  const i=Math.max(0,suggestions.findIndex(x=>!recent.has(text(x?.action||x?.label,180).toLowerCase()))),chosen=suggestions[i<0?0:i];
  return {mode:"suggestion",suggestionIndex:i<0?0:i,action:text(chosen?.action||chosen?.label,180),combatAction:null,reason:"AI decision fallback",goalReached,goalEvidence}
 }
 return {mode:"free",suggestionIndex:null,action:"觀察四周並確認目前最明顯的變化",combatAction:null,reason:"No suggestion available",goalReached,goalEvidence}
}

export async function decideAutotestAction(state,{recentActions=[],customCondition="",signal,disableTimeout=false}={}){
 const snapshot=playerVisibleAutotestSnapshot(state),goal=text(customCondition,500);
 const system=[
  "你是 Elyndra 的自動遊玩測試玩家。你的任務不是寫故事，而是像真實玩家一樣根據目前能看見和已知的情報選下一步。",
  "你只能使用 payload.playerVisible 內的情報；不得假設、猜測或利用任何 hidden canon、director state、未探索地點、未知 NPC 或世界真相。",
  "優先選擇能推進目前目標、取得新情報、測試不同系統並避免重複循環的合理行動。",
  "若 recentActions 最近連續兩回合 progressed=false，視為卡關：不要繼續同類低風險 OBSERVE；優先選 progression=true 的 TRAVEL、SOCIAL、INTERACT、RISKY 或自由行動去接觸人物、出口、道路與任務目標。",
  "mode=suggestion 時用 suggestionIndex 指向現有按鈕；mode=free 時可以自行寫一個玩家真的可以輸入的行動；戰鬥時 mode=combat 並從 attack/defend/retreat 選一個。",
  "不要輸出 Markdown。只輸出 JSON：{\"mode\":\"suggestion|free|combat\",\"suggestionIndex\":0,\"action\":\"...\",\"combatAction\":\"attack|defend|retreat\",\"reason\":\"...\",\"goalReached\":false,\"goalEvidence\":\"...\"}。",
  goal?"另有測試停止條件："+goal+"。只有 playerVisible 已有具體證據證明條件達成時，goalReached 才可為 true；證據不足必須 false。":"沒有額外自訂停止條件。"
 ].join("\n");
 const raw=await directChat({aiTask:"action",timeoutMs:45000,disableTimeout,maxOutputTokens:700,temperature:.35,signal,system,user:JSON.stringify({playerVisible:snapshot,recentActions:list(recentActions).slice(-8),customStopCondition:goal||null})});
 const decision=normalizeAutotestDecision(raw,snapshot,recentActions);
 recordDebug("AUTOTEST_AI_DECISION",{mode:decision.mode,action:decision.action,combatAction:decision.combatAction,suggestionIndex:decision.suggestionIndex,goalReached:decision.goalReached,reason:decision.reason});
 return decision
}

export function autotestStateFingerprint(state={}){
 const clock=state.world?.state?.clock||{},main=state.quests?.main||{};
 return JSON.stringify({
  worldId:state.world?.id||null,
  location:state.player?.location||"",hp:Number(state.player?.hp)||0,status:state.player?.status||"",level:Number(state.player?.level)||1,
  xp:Number(state.player?.xp)||0,knowledge:Number(state.player?.knowledgeScore)||0,discoveries:Number(state.discoveries)||0,
  questStage:Number(main.stage)||0,questStatus:main.status||"",objective:list(main.objectives)[0]||"",
  inventory:list(state.inventory).reduce((n,x)=>n+Math.max(0,Number(x?.quantity)||1),0),
  knownNpcs:list(state.world?.registry?.npcs).filter(x=>x?.known===true).length,
  knownLocations:list(state.world?.registry?.locations).filter(x=>x?.known===true).length,
  combat:state.combat?.active===true,enemyHp:Number(state.combat?.enemy?.hp)||0
 })
}

export function autotestStopReason(state={},progress={},config={},lastDecision={}){
 const turns=Number(progress.turns)||0,maxTurns=Math.max(1,Number(config.maxTurns)||1),condition=String(config.stopCondition||"TURN_LIMIT"),target=Number(config.conditionTarget)||0,errorCount=Number(progress.errorCount)||0;
 if(progress.stopRequested===true)return "MANUAL_STOP";
 if(turns>=maxTurns)return "TURN_LIMIT";
 if(condition==="PLAYER_DOWNED"&&(state.player?.status==="DOWNED"||Number(state.player?.hp)<=0))return "PLAYER_DOWNED";
 if(condition==="MAIN_QUEST_COMPLETE"&&String(state.quests?.main?.status||"").toUpperCase()==="COMPLETED")return "MAIN_QUEST_COMPLETE";
 if(condition==="KNOWLEDGE_SCORE"&&Number(state.player?.knowledgeScore)>=target)return "KNOWLEDGE_SCORE";
 if(condition==="PLAYER_LEVEL"&&Number(state.player?.level)>=target)return "PLAYER_LEVEL";
 if(condition==="DISCOVERIES"&&Number(state.discoveries)>=target)return "DISCOVERIES";
 if(condition==="ERROR_COUNT"&&errorCount>=Math.max(1,target))return "ERROR_COUNT";
 if(condition==="CUSTOM_AI"&&lastDecision?.goalReached===true)return "CUSTOM_AI";
 return ""
}

export function autotestWorldSummary(state={}){
 const registry=state.world?.registry||{},main=state.quests?.main||{},clock=state.world?.state?.clock||{};
 return {
  worldId:state.world?.id||null,worldName:state.world?.name||"UNKNOWN",genre:state.world?.seedContract?.genre||state.world?.creation?.blueprint?.style?.value||"",
  day:Number(state.world?.state?.day||clock.day)||1,totalMinutes:Number(clock.totalMinutes)||0,playerStatus:state.player?.status||"",
  hp:Number(state.player?.hp)||0,level:Number(state.player?.level)||1,knowledgeScore:Number(state.player?.knowledgeScore)||0,discoveries:Number(state.discoveries)||0,
  mainQuest:{title:main.title||"",stage:Number(main.stage)||0,status:main.status||""},
  counts:{inventory:list(state.inventory).length,knowledge:list(state.knowledge).length,npcs:list(registry.npcs).length,knownNpcs:list(registry.npcs).filter(x=>x?.known===true).length,locations:list(registry.locations).length,knownLocations:list(registry.locations).filter(x=>x?.known===true).length,events:list(state.events).length}
 }
}

export function buildAutotestReport({config={},worlds=[],telemetry=[],startedAt=0,endedAt=Date.now()}={}){
 const issues=[],actions=worlds.flatMap(w=>list(w.actions)),generationFailures=worlds.filter(w=>w.status==="FAILED"&&w.phase==="GENERATION"),turnFailures=actions.filter(x=>x.error);
 for(const w of generationFailures)issues.push({severity:"ERROR",type:"WORLD_GENERATION_FAILED",worldIndex:w.index,message:text(w.error,500)});
 for(const row of turnFailures.slice(0,50))issues.push({severity:"ERROR",type:"TURN_FAILED",worldIndex:row.worldIndex,turn:row.turn,message:text(row.error,500)});
 for(const w of worlds){
  const rows=list(w.actions),recent=[];
  let stagnant=0;
  for(const row of rows){
   const action=text(row?.decision?.action||row?.decision?.combatAction,180).toLowerCase();
   if(action&&recent.slice(-3).every(x=>x===action)&&recent.length>=3)issues.push({severity:"WARN",type:"REPETITIVE_ACTION_LOOP",worldIndex:w.index,turn:row.turn,message:action});
   recent.push(action);
   if(row.beforeFingerprint&&row.beforeFingerprint===row.afterFingerprint)stagnant++;else stagnant=0;
   if(stagnant>=5){issues.push({severity:"WARN",type:"NO_STATE_PROGRESS",worldIndex:w.index,turn:row.turn,message:"5 consecutive turns produced the same state fingerprint"});stagnant=0}
  }
 }
 const mirroredTypes=new Set(["AUTOTEST_WORLD_FAILED","AUTOTEST_TURN_FAILED"]);
 const rows=list(telemetry).slice().sort((a,b)=>(Number(a?.at)||0)-(Number(b?.at)||0)),backgroundWindows=[];let hiddenAt=0;
 for(const e of rows){
  if(e?.type==="AUTOTEST_VISIBILITY_HIDDEN")hiddenAt=Number(e.at)||hiddenAt||startedAt;
  if(e?.type==="AUTOTEST_VISIBILITY_VISIBLE"&&hiddenAt){backgroundWindows.push([hiddenAt,(Number(e.at)||hiddenAt)+15000]);hiddenAt=0}
 }
 if(hiddenAt)backgroundWindows.push([hiddenAt,endedAt+15000]);
 const inBackgroundWindow=e=>backgroundWindows.some(([from,to])=>(Number(e?.at)||0)>=from&&(Number(e?.at)||0)<=to);
 const interruptionText=e=>String(e?.data?.error||e?.data?.reason||e?.data?.message||"");
 const backgroundInterruption=e=>inBackgroundWindow(e)&&/Failed to fetch|fetch failed|NetworkError|ERR_NETWORK|Load failed|network request failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|connection (?:reset|closed|refused)|AI_TIMEOUT/i.test(interruptionText(e));
 const intentionalPreemption=e=>e?.type==="AI_CALL_FAILED"&&(e?.data?.aborted===true||/AI_ABORTED: request cancelled by higher-priority gameplay/i.test(String(e?.data?.error||"")));
 const telemetryErrors=list(telemetry).filter(e=>(/ERROR|FAILED/.test(String(e?.type||""))||e?.data?.status==="ERROR")&&!mirroredTypes.has(String(e?.type||""))&&!intentionalPreemption(e)&&!backgroundInterruption(e));
 for(const e of telemetryErrors.slice(0,40))issues.push({severity:"WARN",type:"TELEMETRY_"+String(e.type||"ERROR"),task:text(e?.data?.task||"",80)||undefined,provider:text(e?.data?.provider||"",80)||undefined,message:text(e?.data?.error||e?.data?.reason||e?.data?.message||"",500)});
 const ai=list(telemetry).filter(e=>e?.type==="AI_REQUEST"),allFailedAttempts=list(telemetry).filter(e=>e?.type==="AI_CALL_FAILED"),preemptedAttempts=allFailedAttempts.filter(intentionalPreemption),backgroundFailedAttempts=allFailedAttempts.filter(e=>!intentionalPreemption(e)&&backgroundInterruption(e)),failedAttempts=allFailedAttempts.filter(e=>!intentionalPreemption(e)&&!backgroundInterruption(e));
 const successfulResponses=ai.filter(e=>String(e?.data?.status||"").toUpperCase()==="SUCCESS"),emptyResponses=ai.filter(e=>String(e?.data?.status||"").toUpperCase()==="EMPTY");
 const transportFailures=failedAttempts.filter(e=>/Failed to fetch|fetch failed|NetworkError|ERR_NETWORK|Load failed|network request failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|connection (?:reset|closed|refused)/i.test(String(e?.data?.error||"")));
 const timeoutFailures=failedAttempts.filter(e=>/AI_TIMEOUT/.test(String(e?.data?.error||"")));
 if(emptyResponses.length)issues.push({severity:"WARN",type:"AI_EMPTY_RESPONSES",message:`${emptyResponses.length} AI attempts consumed tokens but returned no usable response.`});
 const stageBreakdown={};const stageRow=task=>stageBreakdown[task]??={success:0,empty:0,failures:0,preempted:0,backgroundInterruptions:0,timeouts:0,transportFailures:0,latencyMsTotal:0,completedResponses:0};
 for(const e of ai){const row=stageRow(text(e?.data?.task||"general",80)||"general"),status=String(e?.data?.status||"").toUpperCase();if(status==="SUCCESS")row.success++;if(status==="EMPTY")row.empty++;row.latencyMsTotal+=Number(e?.data?.latencyMs)||0;row.completedResponses++}
 for(const e of failedAttempts){const row=stageRow(text(e?.data?.task||"general",80)||"general"),err=String(e?.data?.error||"");row.failures++;if(/AI_TIMEOUT/.test(err))row.timeouts++;if(/Failed to fetch|fetch failed|NetworkError|ERR_NETWORK|Load failed|network request failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|connection (?:reset|closed|refused)/i.test(err))row.transportFailures++}
 for(const e of preemptedAttempts)stageRow(text(e?.data?.task||"general",80)||"general").preempted++;
 for(const e of backgroundFailedAttempts)stageRow(text(e?.data?.task||"general",80)||"general").backgroundInterruptions++;
 for(const row of Object.values(stageBreakdown)){row.aiLatencyAverageMs=row.completedResponses?Math.round(row.latencyMsTotal/row.completedResponses):0;delete row.latencyMsTotal;delete row.completedResponses}
 const diagnostics=worlds.map(w=>w?.generation?.diagnostics).filter(d=>d&&typeof d==="object"),stageRows=diagnostics.flatMap(d=>Object.values(d.stages||{}));
 const generationStages={total:stageRows.length,ai:stageRows.filter(x=>x?.source==="AI").length,fallback:stageRows.filter(x=>x?.source==="FALLBACK").length,failed:stageRows.filter(x=>x?.source==="FAILED").length};
 generationStages.aiCompletionRatePct=generationStages.total?Math.round(generationStages.ai/generationStages.total*100):0;generationStages.fallbackCoveragePct=generationStages.total?Math.round(generationStages.fallback/generationStages.total*100):0;
 const degradedWorlds=diagnostics.filter(d=>!["HEALTHY","RECOVERED"].includes(String(d?.quality||""))).length;
 const tokenTotals=ai.reduce((out,e)=>{const u=e?.data?.usage||{};out.input+=Number(u.input)||0;out.output+=Number(u.output)||0;out.reasoning+=Number(u.reasoning)||0;out.cached+=Number(u.cached)||0;out.total+=Number(u.total)||0;return out},{input:0,output:0,reasoning:0,cached:0,total:0});
 const latencyTotal=ai.reduce((n,e)=>n+(Number(e?.data?.latencyMs)||0),0);
 return {
  schema:"elyndra-autotest-report-v1",startedAt:new Date(startedAt||Date.now()).toISOString(),endedAt:new Date(endedAt).toISOString(),durationMs:Math.max(0,endedAt-(startedAt||endedAt)),
  config:structuredClone(config),summary:{worldsRequested:Number(config.worldCount)||worlds.length,worldsCompleted:worlds.filter(w=>w.status==="COMPLETED").length,worldsFailed:worlds.filter(w=>w.status==="FAILED").length,totalTurns:actions.length,issues:issues.length,aiRequests:ai.length,aiSuccessfulResponses:successfulResponses.length,aiEmptyResponses:emptyResponses.length,aiAttempts:ai.length+allFailedAttempts.length,aiFailures:failedAttempts.length,aiPreemptedAttempts:preemptedAttempts.length,aiBackgroundInterruptions:backgroundFailedAttempts.length,backgroundWindowCount:backgroundWindows.length,aiDegradedAttempts:failedAttempts.length+emptyResponses.length,aiTimeouts:timeoutFailures.length,aiTransportFailures:transportFailures.length,aiLatencyAverageMs:ai.length?Math.round(latencyTotal/ai.length):0,generationDegradedWorlds:degradedWorlds,generationStages,stageBreakdown,tokenTotals},
  stopReasons:Object.fromEntries([...new Set(worlds.map(w=>w.stopReason).filter(Boolean))].map(reason=>[reason,worlds.filter(w=>w.stopReason===reason).length])),
  issues,worlds:worlds.map(w=>({index:w.index,status:w.status,phase:w.phase,turns:Number(w.turns)||0,stopReason:w.stopReason||"",error:w.error||"",summary:w.summary||null,generation:w.generation||null}))
 }
}
