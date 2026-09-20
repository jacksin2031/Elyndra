import {sanitizePlayerText,sanitizeSuggestions,fallbackNarrative} from "./runtime-guard.js?v=267";
const text=(v,max=1200)=>typeof v==="string"?v.trim().slice(0,max):"";

export function sceneTurnSnapshot(snapshot={}){
 return {
  world:snapshot.world,
  player:snapshot.player,
  knownFacts:snapshot.knownFacts,
  knowledge:snapshot.knowledge,
  inventory:snapshot.inventory,
  quest:snapshot.quest,
  recentEvents:snapshot.recentEvents,
  runtimeSummary:snapshot.runtimeSummary,
  factions:snapshot.factions,
  registry:{...(snapshot.registry||{}),npcs:(snapshot.registry?.npcs||[]).filter(n=>n.present===true)},
  companions:snapshot.companions,
  priorSuggestions:(snapshot.priorSuggestions||[]).slice(0,4),
  recognition:{
   tier:snapshot.recognition?.tier,
   titles:snapshot.recognition?.titles||[],
   activeRumors:snapshot.recognition?.activeRumors||[]
  }
 }
}

export function mergeTurnCandidates(scene,state,roll={},context={}){
 if(!state||typeof state!=="object"||Array.isArray(state))throw new Error("TURN_STATE_REQUIRED");
 const fallback=fallbackNarrative(context.action,roll),sceneText=sanitizePlayerText(scene?.narrative,1200,""),stateText=sanitizePlayerText(state.outcomeSummary,1200,"");
 const narrative=state?.encounter?.type==="combat"?(stateText||sceneText||fallback):(sceneText||stateText||fallback);
 const suggestions=sanitizeSuggestions(scene?.suggestions,context.priorSuggestions||[]),sceneTitle=sanitizePlayerText(scene?.sceneTitle,60,"");
 return {
  narrative,
  sceneTitle,
  location:state.location??null,
  worldNameKnown:state.worldNameKnown===true,
  calendarKnown:state.calendarKnown===true,
  discoveries:Array.isArray(state.discoveries)?state.discoveries:[],
  items:Array.isArray(state.items)?state.items:[],
  npcChanges:Array.isArray(state.npcChanges)?state.npcChanges:[],
  companionChanges:Array.isArray(state.companionChanges)?state.companionChanges:[],
  factionChanges:Array.isArray(state.factionChanges)?state.factionChanges:[],
  quest:state.quest??null,
  entityReveals:Array.isArray(state.entityReveals)?state.entityReveals:[],
  encounter:state.encounter??null,
  generation:state.generation??null,
  worldImpacts:Array.isArray(state.worldImpacts)?state.worldImpacts:[],
  suggestions
 }
}
