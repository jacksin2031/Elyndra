import {sanitizePlayerText,sanitizeSuggestion,sanitizeSuggestions,fallbackNarrative} from "./runtime-guard.js?v=57001";
const text=(v,max=1200)=>typeof v==="string"?v.trim().slice(0,max):"";
const list=(v,max=8,maxLen=100)=>Array.isArray(v)?[...new Set(v.map(x=>text(x,maxLen)).filter(Boolean))].slice(0,max):[];
const SUGGESTION_KINDS=new Set(["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"]);
const SUGGESTION_RISKS=new Set(["LOW","MEDIUM","HIGH","EXTREME","UNKNOWN"]);
export function normalizeSuggestionIntent(raw){
 if(typeof raw==="string"){const label=sanitizeSuggestion(raw);return label?{label,action:label,kind:"GENERAL",risk:"UNKNOWN",targetId:null,skillHint:null}:null}
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const label=sanitizeSuggestion(raw.label||raw.action),action=sanitizePlayerText(raw.action,180,label||"");
 if(!label||!action)return null;
 const kind=SUGGESTION_KINDS.has(String(raw.kind||"").toUpperCase())?String(raw.kind).toUpperCase():"GENERAL";
 const risk=SUGGESTION_RISKS.has(String(raw.risk||"").toUpperCase())?String(raw.risk).toUpperCase():"UNKNOWN";
 return {label,action,kind,risk,targetId:text(raw.targetId,100)||null,skillHint:sanitizePlayerText(raw.skillHint,70,"")||null,consequenceHint:sanitizePlayerText(raw.consequenceHint,90,"")||null,causalBasis:sanitizePlayerText(raw.causalBasis,180,"")||null,approach:["STEADY","SOCIAL","BOLD","CREATIVE"].includes(String(raw.approach||"").toUpperCase())?String(raw.approach).toUpperCase():"STEADY",progression:raw.progression===true,requirementsSatisfied:raw.requirementsSatisfied===true,requiredItemIds:list(raw.requiredItemIds),requiredCapabilities:list(raw.requiredCapabilities,8,70)}
}
export function normalizeSuggestionIntents(input,previous=[]){
 const out=[];for(const raw of Array.isArray(input)?input:[]){const x=normalizeSuggestionIntent(raw);if(x&&!out.some(y=>y.action===x.action)){out.push(x);if(out.length>=5)break}}
 const before=(Array.isArray(previous)?previous:[]).map(normalizeSuggestionIntent).filter(Boolean);
 const same=out.length===before.length&&out.length>0&&out.every((x,i)=>x.action===before[i]?.action&&x.label===before[i]?.label);
 return same?[]:out
}

export function sceneTurnSnapshot(snapshot={}){
 const world={name:snapshot.world?.name||"UNKNOWN",day:snapshot.world?.day||1,clock:snapshot.player?.calendarKnown===true?(snapshot.world?.clock||null):null,location:snapshot.world?.location||snapshot.player?.location||"未知地點"};
 const locations=(snapshot.registry?.locations||[]).map(x=>({id:x.id,name:x.name,type:x.type,region:x.region,description:x.description,culture:x.culture,trade:x.trade,accessRequirements:x.accessRequirements}));
 const npcs=(snapshot.registry?.npcs||[]).filter(n=>n.present===true).map(n=>({id:n.id,name:n.name,role:n.role,description:n.description,trust:n.trust,companionStatus:n.companionStatus,present:true}));
 const factions=(snapshot.factions||[]).map(f=>({id:f.id,name:f.name,playerReputation:f.playerReputation}));
 const sideQuests=(snapshot.registry?.sideQuests||[]).map(q=>({id:q.id,title:q.title,objective:q.objective,status:q.status,progress:q.progress,target:q.target}));
 return {
  world,
  weather:snapshot.weather,
  player:snapshot.player,
  knownFacts:snapshot.knownFacts,
  knowledge:snapshot.knowledge,
  inventory:snapshot.inventory,
  magic:snapshot.magic||null,
  talents:snapshot.talents||null,
  crafting:snapshot.crafting||null,
  survival:snapshot.survival||null,
  quest:snapshot.quest,
  recentEvents:snapshot.recentEvents,
  factions,
  registry:{locations,npcs,factions:[],sideQuests},
  companions:snapshot.companions,
  priorSuggestions:(snapshot.priorSuggestions||[]).slice(0,4),
  priorSuggestionIntents:(snapshot.priorSuggestionIntents||[]).slice(0,4),
  knowledgeLayers:snapshot.knowledgeLayers?{version:snapshot.knowledgeLayers.version||1,playerKnowledge:structuredClone(snapshot.knowledgeLayers.playerKnowledge||{})}:null,
  recognition:{
   tier:snapshot.recognition?.tier,
   titles:snapshot.recognition?.titles||[],
   activeRumors:snapshot.recognition?.activeRumors||[]
  }
 }
}

function guardedSceneNarrative(scene,roll={},action=""){
 const fallback=fallbackNarrative(action,roll),candidate=sanitizePlayerText(scene?.narrative,1200,"");
 if(roll?.success===false)return {narrative:fallback,outcome:"FAILURE",narrativeRejected:Boolean(candidate)};
 if(roll?.success===true&&String(scene?.outcome||"SUCCESS").toUpperCase()!=="SUCCESS")return {narrative:fallback,outcome:"SUCCESS",narrativeRejected:Boolean(candidate)};
 return {narrative:candidate||fallback,outcome:roll?.success===true?"SUCCESS":null,narrativeRejected:false}
}
export function sceneTurnPreview(scene,roll={},context={}){
 const guarded=guardedSceneNarrative(scene,roll,context.action),sceneTitle=sanitizePlayerText(scene?.sceneTitle,60,"");
 const suggestionIntents=normalizeSuggestionIntents(scene?.suggestions,context.priorSuggestionIntents||context.priorSuggestions||[]);
 const suggestions=suggestionIntents.length?suggestionIntents.map(x=>x.label):sanitizeSuggestions(scene?.suggestions,context.priorSuggestions||[]);
 return {...guarded,sceneTitle,suggestions,suggestionIntents}
}

export function fastTurnStateSnapshot(snapshot={},plan={}){
 const scene=sceneTurnSnapshot(snapshot),caps=new Set(plan?.capabilities||[]);
 const out={
  stateRevision:Number(snapshot.stateRevision)||0,
  world:scene.world,weather:scene.weather,
  player:scene.player,
  knownFacts:(Array.isArray(scene.knownFacts)?scene.knownFacts:[]).slice(-12),
  knowledge:(Array.isArray(scene.knowledge)?scene.knowledge:[]).slice(-8),
  recentEvents:(Array.isArray(scene.recentEvents)?scene.recentEvents:[]).slice(-6),
  registry:{locations:(scene.registry?.locations||[]).slice(-5),npcs:(scene.registry?.npcs||[]).slice(-5),factions:[],sideQuests:caps.has("QUEST_HINT")?(scene.registry?.sideQuests||[]).slice(-4):[]},
  quest:scene.quest||null,
  knowledgeLayers:scene.knowledgeLayers||null,
  directorCanon:caps.has("DISCOVER_FACT")?(Array.isArray(snapshot.directorCanon)?snapshot.directorCanon:[]).slice(-14):[]
 };
 if(caps.has("ACQUIRE_ITEM"))out.inventory=(scene.inventory||[]).slice(-8);
 if(caps.has("MOVE_PLAYER")||caps.has("REVEAL_ENTITY"))out.travel=snapshot.travel||null;
 if(caps.has("START_ENCOUNTER"))out.survival=snapshot.survival||null;
 if(caps.has("LEARN_MAGIC"))out.magic=snapshot.magic||null;
 if(caps.has("WORLD_IMPACT_SIGNAL"))out.worldImpact={capability:snapshot.worldImpact?.capability||null};
 return out
}

export function mergeTurnCandidates(scene,state,roll={},context={}){
 if(!state||typeof state!=="object"||Array.isArray(state))throw new Error("TURN_STATE_REQUIRED");
 const fallback=fallbackNarrative(context.action,roll),sceneText=sanitizePlayerText(scene?.narrative,1200,""),stateText=sanitizePlayerText(state.outcomeSummary,1200,"");
 const guarded=guardedSceneNarrative(scene,roll,context.action);
 const narrative=roll?.success===false?fallback:(state?.encounter?.type==="combat"?(stateText||guarded.narrative||fallback):(guarded.narrative||stateText||fallback));
 const suggestionIntents=normalizeSuggestionIntents(scene?.suggestions,context.priorSuggestionIntents||context.priorSuggestions||[]);
 const suggestions=suggestionIntents.length?suggestionIntents.map(x=>x.label):sanitizeSuggestions(scene?.suggestions,context.priorSuggestions||[]),sceneTitle=sanitizePlayerText(scene?.sceneTitle,60,"");
 return {
  narrative,
  outcome:roll?.success===false?"FAILURE":roll?.success===true?"SUCCESS":null,
  narrativeRejected:roll?.success===false?Boolean(sceneText):guarded.narrativeRejected,
  sceneTitle,
  location:state.location??null,
  worldNameKnown:state.worldNameKnown===true,
  calendarKnown:state.calendarKnown===true,
  discoveries:Array.isArray(state.discoveries)?state.discoveries:[],
  items:Array.isArray(state.items)?state.items:[],
  recipes:Array.isArray(state.recipes)?state.recipes:[],
  magicLearning:Array.isArray(state.magicLearning)?state.magicLearning:[],
  npcChanges:Array.isArray(state.npcChanges)?state.npcChanges:[],
  companionChanges:Array.isArray(state.companionChanges)?state.companionChanges:[],
  factionChanges:Array.isArray(state.factionChanges)?state.factionChanges:[],
  quest:state.quest??null,
  entityReveals:Array.isArray(state.entityReveals)?state.entityReveals:[],
  encounter:state.encounter??null,
  generation:state.generation??null,
  worldImpacts:Array.isArray(state.worldImpacts)?state.worldImpacts:[],
  suggestions,
  suggestionIntents
 }
}
