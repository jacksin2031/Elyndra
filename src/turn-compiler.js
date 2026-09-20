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
  registry:snapshot.registry,
  companions:snapshot.companions,
  recognition:{
   tier:snapshot.recognition?.tier,
   titles:snapshot.recognition?.titles||[],
   activeRumors:snapshot.recognition?.activeRumors||[]
  }
 }
}

export function mergeTurnCandidates(scene,state,roll={}){
 if(!state||typeof state!=="object"||Array.isArray(state))throw new Error("TURN_STATE_REQUIRED");
 const narrative=text(scene?.narrative,1200)||text(state.outcomeSummary,1200)||(roll?.success?"你的行動取得了進展。":"事情沒有完全按你的打算發展。");
 return {
  narrative,
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
  suggestions:Array.isArray(scene?.suggestions)?scene.suggestions:[]
 }
}
