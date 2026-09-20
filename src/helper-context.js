import {ensureWorldRegistry,currentLocationRecord,canInteractWithNpc} from "./world-registry.js?v=267";
import {playerVisibleEvents} from "./event-visibility.js?v=267";
import {walletSummary} from "./world-locality.js?v=267";
import {sanitizePlayerText} from "./runtime-guard.js?v=267";

const safe=(v,max=300)=>sanitizePlayerText(v,max,"");

export function helperSnapshot(state){
 const r=ensureWorldRegistry(state),loc=currentLocationRecord(state);
 const nearbyNpcs=r.npcs.filter(n=>canInteractWithNpc(state,n)).slice(-8).map(n=>({name:n.name,role:n.role,description:safe(n.description,180),trust:Number.isFinite(n.trust)?n.trust:null,companionStatus:n.companion?.status||"NONE"}));
 const knownLocations=r.locations.filter(x=>x.known===true).slice(-12).map(x=>({name:x.name,type:x.type,region:x.region,description:safe(x.description,180)}));
 const knownFactions=r.factions.filter(x=>x.known===true).slice(-8).map(x=>({name:x.name,goal:safe(x.goal,160),reputation:x.playerReputation??0}));
 const knownSideQuests=r.sideQuests.filter(x=>x.known===true&&x.status!=="COMPLETED").slice(-8).map(x=>({title:x.title,objective:x.objective,progress:x.progress??0,target:x.target??3}));
 const recentEvents=playerVisibleEvents(state,8).map(e=>({day:e.day,summary:safe(e.summary||e.customText||e.action||e.type,180)})).filter(x=>x.summary);
 return {
  rule:"ONLY_PLAYER_KNOWN",
  player:{
   name:state.player?.name||"無名者",
   location:state.player?.location||"未知地點",
   hp:state.player?.hp,
   maxHp:state.player?.maxHp,
   level:state.player?.level,
   assets:walletSummary(state).map(x=>({name:x.currency?.name||x.id,symbol:x.currency?.symbol||"",amount:x.amount})),
   inventory:(state.inventory||[]).slice(-20).map(x=>({name:x.name,description:safe(x.description,120),equipped:x.equipped===true}))
  },
  world:{
   name:state.player?.worldNameKnown?state.world?.name:"UNKNOWN",
   time:state.player?.calendarKnown?state.world?.state?.clock:null,
   currentLocation:loc?{name:loc.name,type:loc.type,region:loc.region,description:safe(loc.description,220)}:{name:state.player?.location||"未知地點"},
   currentNarrative:safe(state.narrative,500),
   sceneTitle:safe(state.sceneTitle,80)
  },
  objective:{
   mainTitle:safe(state.quests?.main?.title,120),
   objectives:(state.quests?.main?.objectives||[]).map(x=>safe(x,160)).filter(Boolean).slice(0,4),
   suggestions:(state.suggestions||[]).map(x=>safe(x,120)).filter(Boolean).slice(0,4)
  },
  knowledge:{
   facts:(state.knowledge||[]).slice(-20).map(x=>({title:safe(x.title,100),text:safe(x.text,260)})).filter(x=>x.title&&x.text),
   knownLocations,
   nearbyNpcs,
   knownFactions,
   knownSideQuests,
   recentEvents
  },
  combat:state.combat?.active?{active:true,enemy:{name:safe(state.combat.enemy?.name,80),hp:state.combat.enemy?.hp,maxHp:state.combat.enemy?.maxHp}}:{active:false}
 }
}
