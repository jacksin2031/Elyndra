import {playerVisibleEvents} from "./event-visibility.js?v=276";
import {sanitizePlayerText} from "./runtime-guard.js?v=276";
import {playerWeatherSnapshot} from "./weather-engine.js?v=276";
import {survivalSnapshot} from "./survival-engine.js?v=276";
import {travelSnapshot} from "./travel-engine.js?v=276";
import {marketSnapshot} from "./economy-engine.js?v=276";
import {dungeonSnapshot} from "./dungeon-engine.js?v=276";

const safe=(v,max=300)=>sanitizePlayerText(v,max,"");

export function helperSnapshot(state){
 state=structuredClone(state);
 const r=state.world?.registry||{locations:[],npcs:[],factions:[],sideQuests:[]},locations=Array.isArray(r.locations)?r.locations:[],npcs=Array.isArray(r.npcs)?r.npcs:[],factions=Array.isArray(r.factions)?r.factions:[],sideQuests=Array.isArray(r.sideQuests)?r.sideQuests:[];
 const locName=String(state.player?.location||state.world?.state?.location||""),loc=locations.find(x=>x.name===locName)||null;
 const present=n=>n?.alive!==false&&(n?.companion?.status==="ACTIVE"||Boolean(loc&&n?.locationId===loc.id));
 const nearbyNpcs=npcs.filter(n=>n?.known===true&&n?.encountered===true&&present(n)).slice(-8).map(n=>({name:n.name,role:n.role,description:safe(n.description,180),trust:Number.isFinite(n.trust)?n.trust:null,companionStatus:n.companion?.status||"NONE"}));
 const knownLocations=locations.filter(x=>x.known===true).slice(-12).map(x=>({name:x.name,type:x.type,region:x.region,description:safe(x.description,180)}));
 const knownFactions=factions.filter(x=>x.known===true).slice(-8).map(x=>({name:x.name,goal:safe(x.goal,160),reputation:x.playerReputation??0}));
 const knownSideQuests=sideQuests.filter(x=>x.known===true&&x.status!=="COMPLETED").slice(-8).map(x=>({title:x.title,objective:x.objective,progress:x.progress??0,target:x.target??3}));
 const recentEvents=playerVisibleEvents(state,8).map(e=>({day:e.day,summary:safe(e.summary||e.customText||e.action||e.type,180)})).filter(x=>x.summary);
 const wallet=state.player?.wallet&&typeof state.player.wallet==="object"?state.player.wallet:{},currencyMap=new Map();
 for(const place of locations)if(place?.known===true)for(const cur of place?.trade?.currencies||[])if(cur?.id)currencyMap.set(cur.id,cur);
 const assets=Object.entries(wallet).filter(([,amount])=>Number(amount)>0).map(([id,amount])=>({name:currencyMap.get(id)?.name||id,symbol:currencyMap.get(id)?.symbol||"",amount:Number(amount)}));
 return {
  rule:"ONLY_PLAYER_KNOWN",
  player:{
   name:state.player?.name||"無名者",
   location:state.player?.location||"未知地點",
   hp:state.player?.hp,
   maxHp:state.player?.maxHp,
   level:state.player?.level,
   assets,
   inventory:(state.inventory||[]).slice(-20).map(x=>({name:x.name,description:safe(x.description,120),equipped:x.equipped===true})),
   survival:survivalSnapshot(state),
   magic:state.player?.magic?{strain:state.player.magic.strain,capacity:state.player.magic.capacity,knownSpells:(state.player.magic.knownSpells||[]).map(x=>({name:x.name,school:x.school,cost:x.cost,effect:safe(x.effect,140)}))}:null
  },
  world:{
   name:state.player?.worldNameKnown?state.world?.name:"UNKNOWN",
   time:state.player?.calendarKnown?state.world?.state?.clock:null,
   currentLocation:loc?{name:loc.name,type:loc.type,region:loc.region,description:safe(loc.description,220)}:{name:state.player?.location||"未知地點"},
   currentNarrative:safe(state.narrative,500),
   sceneTitle:safe(state.sceneTitle,80),
   weather:playerWeatherSnapshot(state),
   travel:travelSnapshot(state,{director:false}),
   market:(()=>{const m=marketSnapshot(state);return m?{mode:m.mode,currency:m.currency?{id:m.currency.id,name:m.currency.name,symbol:m.currency.symbol}:null,goods:m.goods.map(x=>({name:x.name,price:x.price,stock:x.stock}))}:null})(),
   dungeon:dungeonSnapshot(state,{director:false})
  },
  objective:{
   mainTitle:safe(state.quests?.main?.title,120),
   objectives:(state.quests?.main?.objectives||[]).map(x=>safe(x,160)).filter(Boolean).slice(0,4),
   suggestions:(state.suggestions||[]).map(x=>safe(x,120)).filter(Boolean).slice(0,4)
  },
  knowledge:{
   facts:(state.knowledge||[]).slice(-20).map(x=>({title:safe(x.title,100),text:safe(x.text,260),status:["VERIFIED","TESTIMONY","OBSERVATION","LORE"].includes(x.status)?x.status:"UNCONFIRMED"})).filter(x=>x.title&&x.text),
   knownLocations,
   nearbyNpcs,
   knownFactions,
   knownSideQuests,
   recentEvents
  },
  combat:state.combat?.active?{active:true,enemy:{name:safe(state.combat.enemy?.name,80),hp:state.combat.enemy?.hp,maxHp:state.combat.enemy?.maxHp}}:{active:false}
 }
}
