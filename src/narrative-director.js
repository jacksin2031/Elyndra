const clean=(v,max=360)=>typeof v==="string"?v.trim().slice(0,max):"";
const list=v=>Array.isArray(v)?v:[];
const clockMinute=state=>Number(state?.world?.state?.clock?.totalMinutes)||0;

export const NARRATIVE_DIRECTOR_DIRECTIVE=`Narrative Director 以持久 World State 為權威。故事只能由玩家行動、NPC 欲望、Faction 計畫、Future pressure 與尚未解決後果推進。世界不等待玩家；不得為了劇情讓 NPC/Faction 忘記 currentPlan，不得把未解決後果重置。`;

export function ensureNarrativeDirector(state){
 state.world??={};
 const current=state.world.narrativeDirector&&typeof state.world.narrativeDirector==="object"?state.world.narrativeDirector:{};
 state.world.narrativeDirector={version:1,revision:Number(current.revision)||0,lastEventCount:Number(current.lastEventCount)||0,lastWorldVersion:Number(current.lastWorldVersion)||0,lastMinute:Number(current.lastMinute)||0,createdDay:Number(current.createdDay)||Number(state.world?.state?.day)||1};
 const n=state.world.narrativeDirector,eventCount=list(state.events).length,worldVersion=Number(state.world?.version)||0,minute=clockMinute(state);
 if(eventCount!==n.lastEventCount||worldVersion!==n.lastWorldVersion||minute!==n.lastMinute){n.revision++;n.lastEventCount=eventCount;n.lastWorldVersion=worldVersion;n.lastMinute=minute}
 return n;
}

function activeFutureRows(state){
 return list(state?.world?.futures).filter(x=>!["RESOLVED","CANCELLED"].includes(String(x?.stage||x?.status||"").toUpperCase())).slice(0,8).map(x=>({id:x.id,title:x.title,stage:x.stage||x.status||"DORMANT",pressure:Number(x.pressure)||0,observableEffect:clean(x.observableEffect,220)}));
}
function recentConsequences(state){
 return list(state?.events).filter(x=>/(CONSEQUENCE|IMPACT|FACTION_ACTION|FUTURE_)/i.test(String(x?.type||"")+" "+String(x?.subtype||""))).slice(-10).map(x=>({id:x.id,type:x.type,subtype:x.subtype||"",summary:clean(x.summary||x.customText,220),day:x.day}));
}
function factionPlans(state){
 return list(state?.world?.registry?.factions).slice(-8).map(f=>({id:f.id,name:f.name,goal:clean(f.goal,180),known:f.known===true,agency:{goal:clean(f.agency?.goal||f.goal,180),fear:clean(f.agency?.fear,180),resources:list(f.agency?.resources).slice(0,4),dependencies:list(f.agency?.dependencies).slice(0,4),internalConflicts:list(f.agency?.internalConflicts).slice(0,4),currentPlan:clean(f.agency?.currentPlan,240),nextActionIfPlayerDoesNothing:clean(f.agency?.nextActionIfPlayerDoesNothing,240)},strategy:f.strategy||null}));
}
function npcPlans(state){
 return list(state?.world?.registry?.npcs).slice(-12).map(n=>({id:n.id,name:n.name,known:n.known===true,locationId:n.locationId,goal:clean(n.goal,180),agency:{want:clean(n.agency?.want||n.goal,180),fear:clean(n.agency?.fear,180),secret:clean(n.agency?.secret,240),boundary:clean(n.agency?.boundary,220),currentPlan:clean(n.agency?.currentPlan,240),lifeWithoutPlayer:clean(n.agency?.lifeWithoutPlayer,260)},planner:n.cognition?.planner||null}));
}
function campaignProgress(state,design){
 const keys=["SURVIVE","ORIENT","CONTACT","INVESTIGATE","CRISIS","CLIMAX"],stage=Math.max(0,Math.min(keys.length-1,Math.round(Number(state?.quests?.main?.stage)||0))),stageKey=String(state?.quests?.main?.stageKey||keys[stage]),architecture=design?.campaignArchitecture&&typeof design.campaignArchitecture==="object"?design.campaignArchitecture:null,current=architecture?list(architecture.stages).find(x=>String(x?.key||"").toUpperCase()===stageKey.toUpperCase())||null:null;
 return {stage,stageKey,premise:clean(architecture?.premise,320),centralQuestion:clean(architecture?.centralQuestion,260),currentStage:current?{key:stageKey,pressure:clean(current.pressure,260),directorGoal:clean(current.directorGoal,300),turningConditions:list(current.turningConditions).map(x=>clean(x,180)).filter(Boolean).slice(0,5),failureEscalation:clean(current.failureEscalation,300)}:null,resolutionPrinciples:list(architecture?.resolutionPrinciples).map(x=>clean(x,220)).filter(Boolean).slice(0,5)};
}

export function narrativeDirectorSnapshot(state){
 const runtime=ensureNarrativeDirector(state),design=state?.world?.bible?.designLogic||{},campaign=campaignProgress(state,design),factions=factionPlans(state),npcs=npcPlans(state),futures=activeFutureRows(state),consequences=recentConsequences(state);
 const visibleSignals=list(state?.events).filter(x=>x?.visibility!=="INTERNAL").slice(-6).map(x=>({type:x.type,summary:clean(x.summary||x.customText,180),day:x.day}));
 const playerSafe={anchor:{companions:npcs.filter(x=>x.known&&state?.world?.registry?.npcs?.find(n=>n.id===x.id)?.companion?.status==="ACTIVE").map(x=>x.id)},visiblePressureSignals:visibleSignals,knownFactionGoals:factions.filter(x=>x.known).map(x=>({id:x.id,name:x.name,goal:x.goal})),narrativeContract:{entryProblem:clean(design?.narrativeContract?.entryProblem,220),immediateDesire:clean(design?.narrativeContract?.immediateDesire,220),informationGap:clean(design?.narrativeContract?.informationGap,220),identityQuestion:clean(design?.narrativeContract?.identityQuestion,220),belongingQuestion:clean(design?.narrativeContract?.belongingQuestion,220)}};
 return {version:1,revision:runtime.revision,principle:"WORLD_STATE_FIRST",campaign,contract:design?.narrativeContract||null,storyEngines:list(design?.storyEngines).slice(0,4),worldWithoutPlayer:design?.worldWithoutPlayer||null,mysteryArchitecture:design?.mysteryArchitecture||null,factionPlans:factions,npcPlans:npcs,activeFutures:futures,unresolvedConsequences:consequences,playerSafe};
}

export function narrativeDirectorHealth(state){
 const snap=narrativeDirectorSnapshot(state),issues=[];
 if(!snap.factionPlans.length)issues.push("NO_FACTION_PLANS");
 if(!snap.npcPlans.length)issues.push("NO_NPC_PLANS");
 if(!snap.storyEngines.length)issues.push("NO_STORY_ENGINES");
 if(!snap.worldWithoutPlayer)issues.push("NO_WORLD_WITHOUT_PLAYER");
 return {status:issues.length?"REVIEW":"PASS",issues,revision:snap.revision};
}
