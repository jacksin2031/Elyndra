import {normalizeLore} from "./lore-engine.js?v=276";
import {normalizeCultureProfile,normalizeTradeProfile} from "./world-locality.js?v=276";
import {ensureNpcRemoteContact,canRemoteContactNpc} from "./communication-engine.js?v=276";
import {normalizeWeatherProfile,retargetWeather} from "./weather-engine.js?v=276";
import {ensureTravelNetwork,travelTo} from "./travel-engine.js?v=276";
const uid=(p)=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));const keywords=v=>Array.isArray(v)?[...new Set(v.map(x=>clean(x,60)).filter(x=>x.length>=2))].slice(0,6):[];
const ACCESS_TYPES=new Set(["ITEM_OWNED","ITEM_USED","ITEM_SHOWN","ITEM_GIVEN","FACT_KNOWN","EVENT_OCCURRED"]);
function normalizeAccessRequirements(input){
 return (Array.isArray(input)?input:[]).slice(0,4).map(x=>{const type=String(x?.type||"").toUpperCase(),id=clean(x?.id,120);if(!ACCESS_TYPES.has(type)||!id)return null;return {type,id,hint:clean(x?.hint,160)}}).filter(Boolean)
}
export function ensureWorldRegistry(state){
 state.world.registry??={locations:[],npcs:[],factions:[],sideQuests:[]};
 const r=state.world.registry;
 r.locations??=[];r.npcs??=[];r.factions??=[];r.sideQuests??=[];
 for(const list of [r.locations,r.npcs,r.factions,r.sideQuests])for(const x of list)if(x.known==null)x.known=true;
 for(const n of r.npcs){if(n.encountered==null)n.encountered=Boolean(n.companion?.status==="ACTIVE"||(n.memories||[]).length||(Number(n.trust)||0)!==0);ensureNpcRemoteContact(state,n)}
 ensureTravelNetwork(state);return r
}
export function repairPlayerLocation(state){
 const r=ensureWorldRegistry(state);if(!r.locations.length)return null;
 const player=String(state.player?.location||"").trim(),worldLoc=String(state.world?.state?.location||"").trim(),unknown=!player||player==="未知地點";
 if(unknown)return r.locations.find(x=>x.name===worldLoc)||null;
 let entity=r.locations.find(x=>x.name===player);
 if(!entity)entity=[...r.locations].reverse().find(x=>x.known===true)||null;
 if(entity){state.player.location=entity.name;state.world.state.location=entity.name}
 else state.player.location="未知地點";
 return entity||null
}
export function currentLocationRecord(state){
 const r=ensureWorldRegistry(state),player=String(state.player?.location||"").trim(),worldLoc=String(state.world?.state?.location||"").trim();
 return r.locations.find(x=>x.name===player)||r.locations.find(x=>x.name===worldLoc)||null
}
export function isNpcPresent(state,npc){
 if(!npc||npc.alive===false)return false;
 if(npc.companion?.status==="ACTIVE")return true;
 const loc=currentLocationRecord(state);return Boolean(loc&&npc.locationId===loc.id)
}
export function npcInteractionMode(state,npc){if(!npc||npc.known!==true||npc.encountered!==true||npc.alive===false)return null;if(isNpcPresent(state,npc))return "LOCAL";if(canRemoteContactNpc(state,npc))return "REMOTE";return null}
export function canInteractWithNpc(state,npc){return Boolean(npcInteractionMode(state,npc))}
export function resolvePlayerLocation(state,raw,context={}){
 const token=String(raw??"").trim();if(!token)return null;const r=ensureWorldRegistry(state),entity=r.locations.find(x=>x.id===token||x.name===token);if(!entity)return null;
 const internalSetup=Object.keys(context||{}).length===0,result=travelTo(state,entity,{roll:context.roll||null,actionKind:context.actionKind||context.roll?.profile?.kind||"",baseMinutes:Number(context.baseTravelMinutes)||45,force:context.force===true||internalSetup});
 if(!result.ok){state.events.push({id:uid("EV"),type:"TRAVEL_REJECTED",visibility:"INTERNAL",destinationId:entity.id,reason:result.reason,day:state.world.state.day,at:Date.now()});return null}
 return entity
}
export function registrySnapshot(state,{visibleOnly=false}={}){
 const r=ensureWorldRegistry(state),filter=arr=>visibleOnly?arr.filter(x=>x.known===true):arr;
 return {
  locations:filter(r.locations).slice(-20).map(({id,name,type,region,description,culture,trade,worldState,accessRequirements})=>({id,name,type,region,description,culture,trade,worldState,accessRequirements:normalizeAccessRequirements(accessRequirements)})),
  npcs:filter(r.npcs).slice(-20).map(n=>({id:n.id,name:n.name,role:n.role,locationId:n.locationId,factionId:n.factionId,description:n.description,personality:n.personality,goal:n.goal,trust:n.trust,companionStatus:n.companion?.status||"NONE",encountered:n.encountered===true,present:isNpcPresent(state,n),remoteContactable:canRemoteContactNpc(state,n),worldState:n.worldState})),
  factions:filter(r.factions).slice(-12).map(({id,name,goal,description,resources,influence,playerReputation,relations,culture,trade,worldState})=>({id,name,goal,description,resources,influence,playerReputation,relations,culture,trade,worldState})),
  sideQuests:r.sideQuests.filter(q=>!visibleOnly||q.known===true).filter(q=>q.status!=="COMPLETED").slice(-12).map(({id,title,objective,status,progress,target})=>({id,title,objective,status,progress:progress??0,target:target??3}))
 }
}
export function directorRegistrySnapshot(state){
 const r=ensureWorldRegistry(state);
 return {
  locations:r.locations.slice(-12).map(({id,name,type,region,historyRefs,known,accessRequirements})=>({id,name,type,region,historyRefs,known:Boolean(known),accessRequirements:normalizeAccessRequirements(accessRequirements)})),
  npcs:r.npcs.slice(-12).map(({id,name,role,locationId,factionId,historyRefs,known,companion,companionProfile,goal})=>({id,name,role,locationId,factionId,historyRefs,known:Boolean(known),goal,companionStatus:companion?.status||"NONE",companionProfile})),
  factions:r.factions.slice(-8).map(({id,name,historyRefs,known})=>({id,name,historyRefs,known:Boolean(known)}))
 }
}
function revealAuthorized(state,kind,entity,context={}){
 if(context.enforceCausality!==true)return true;
 const actionKind=String(context.actionKind||context.roll?.profile?.kind||"").toUpperCase(),hasEvidence=Number(context.verifiedEvidenceCount)||0,socialSource=actionKind==="SOCIAL"&&ensureWorldRegistry(state).npcs.some(n=>canInteractWithNpc(state,n));
 if(kind==="npc")return isNpcPresent(state,entity);
 if(kind==="location"){
  if(entity.name===state.player?.location)return true;
  return socialSource||(actionKind==="OBSERVE"&&hasEvidence>0)
 }
 if(kind==="faction"){
  const local=ensureWorldRegistry(state).npcs.some(n=>n.factionId===entity.id&&isNpcPresent(state,n)&&n.encountered===true);
  return local||socialSource||(actionKind==="OBSERVE"&&hasEvidence>0)
 }
 if(kind==="sideQuest"){
  return socialSource||(actionKind==="OBSERVE"&&hasEvidence>0)
 }
 return false
}
export function revealRegistryEntities(state,reveals=[],context={}){
 const r=ensureWorldRegistry(state),maps={location:r.locations,npc:r.npcs,faction:r.factions,sideQuest:r.sideQuests},out=[];
 for(const x of Array.isArray(reveals)?reveals.slice(0,6):[]){
  const kind=clean(x?.kind,30),id=clean(x?.id,140),list=maps[kind];if(!list||!id)continue;
  const entity=list.find(v=>v.id===id);if(!entity||!revealAuthorized(state,kind,entity,context))continue;const wasKnown=entity.known===true,wasEncountered=entity.encountered===true;
  entity.known=true;entity.discoveredDay??=state.world.state.day;if(kind==="npc"&&isNpcPresent(state,entity)){entity.encountered=true;ensureNpcRemoteContact(state,entity)}
  if(!wasKnown||(!wasEncountered&&entity.encountered===true))out.push({kind,id,name:entity.name||entity.title||""})
 }
 if(out.length){state.events??=[];state.events.push({id:uid("EV"),type:"ENTITY_REVEALED",visibility:"PLAYER_KNOWN",day:state.world.state.day,summary:out.map(x=>x.kind+":"+x.name).join(" · "),at:Date.now()})}
 return out
}
export function validateGeneration(g){
 if(g==null)return {valid:true,errors:[]};const e=[];
 if(typeof g!=="object"||Array.isArray(g))return {valid:false,errors:["GENERATION_INVALID"]};
 for(const k of ["locations","npcs","factions","sideQuests"])if(g[k]!=null&&!Array.isArray(g[k]))e.push(k.toUpperCase()+"_INVALID");
 for(const x of g.locations||[])if(!clean(x?.name,80)||!clean(x?.description,400))e.push("LOCATION_SHAPE_INVALID");else{if(x.historyRefs!=null&&!Array.isArray(x.historyRefs))e.push("LOCATION_HISTORY_REFS_INVALID");if(x.lore!=null&&!normalizeLore(x.lore))e.push("LOCATION_LORE_INVALID");if(x.culture!=null&&typeof x.culture!=="object")e.push("LOCATION_CULTURE_INVALID");if(x.trade!=null&&typeof x.trade!=="object")e.push("LOCATION_TRADE_INVALID");if(x.weatherProfile!=null&&typeof x.weatherProfile!=="object")e.push("LOCATION_WEATHER_INVALID");if(x.accessRequirements!=null&&(!Array.isArray(x.accessRequirements)||normalizeAccessRequirements(x.accessRequirements).length!==x.accessRequirements.length))e.push("LOCATION_ACCESS_REQUIREMENTS_INVALID")}
 for(const x of g.npcs||[])if(!clean(x?.name,80)||!clean(x?.role,100))e.push("NPC_SHAPE_INVALID");else{if(x.historyRefs!=null&&!Array.isArray(x.historyRefs))e.push("NPC_HISTORY_REFS_INVALID");if(x.lore!=null&&!normalizeLore(x.lore))e.push("NPC_LORE_INVALID");if(x.companionProfile!=null&&typeof x.companionProfile!=="object")e.push("NPC_COMPANION_PROFILE_INVALID")}
 for(const x of g.factions||[])if(!clean(x?.name,80)||!clean(x?.goal,200))e.push("FACTION_SHAPE_INVALID");else{if(x.historyRefs!=null&&!Array.isArray(x.historyRefs))e.push("FACTION_HISTORY_REFS_INVALID");if(x.lore!=null&&!normalizeLore(x.lore))e.push("FACTION_LORE_INVALID");if(x.culture!=null&&typeof x.culture!=="object")e.push("FACTION_CULTURE_INVALID");if(x.trade!=null&&typeof x.trade!=="object")e.push("FACTION_TRADE_INVALID")}
 for(const x of g.sideQuests||[]){if(!clean(x?.title,100)||!clean(x?.objective,240))e.push("SIDE_QUEST_SHAPE_INVALID");if(x.historyRefs!=null&&!Array.isArray(x.historyRefs))e.push("SIDE_QUEST_HISTORY_REFS_INVALID");if(x.evidenceKeywords!=null&&!Array.isArray(x.evidenceKeywords))e.push("SIDE_QUEST_EVIDENCE_INVALID");if(x.conditions!=null&&!Array.isArray(x.conditions))e.push("SIDE_QUEST_CONDITIONS_INVALID");if(x.target!=null&&(!Number.isInteger(x.target)||x.target<1||x.target>5))e.push("SIDE_QUEST_TARGET_INVALID")}
 return {valid:e.length===0,errors:[...new Set(e)]}
}
function resolveHistoryRefs(state,input){
 const valid=new Set((state.world?.history||[]).map(x=>clean(x?.id,120)).filter(Boolean));
 return [...new Set((Array.isArray(input)?input:[]).map(x=>clean(x,120)).filter(x=>valid.has(x)))].slice(0,6)
}
function resolveKnowledgeScope(state,input){
 if(!Array.isArray(input))return [];
 const out=[];
 for(const raw of input.slice(0,16)){
  const value=clean(raw,500);if(!value)continue;
  const fact=state.world.canon.facts.find(f=>f.id===value||f.text===value);
  if(fact&&!out.includes(fact.id))out.push(fact.id)
 }
 return out.slice(0,12)
}
export function canonizeGeneration(state,g){
 const v=validateGeneration(g);if(!v.valid)throw new Error(v.errors.join(","));
 const r=ensureWorldRegistry(state),added={locations:[],npcs:[],factions:[],sideQuests:[]};
 const byName=(arr,name)=>arr.some(x=>String(x.name||"").toLowerCase()===name.toLowerCase());
 for(const x of (g?.locations||[]).slice(0,2)){const name=clean(x.name,80);if(byName(r.locations,name))continue;const o={id:uid("LOC"),name,type:clean(x.type,60)||"未知地點",region:clean(x.region,80)||state.world.state.region||"",description:clean(x.description,400),historyRefs:resolveHistoryRefs(state,x.historyRefs),known:x.known===true,lore:normalizeLore(x.lore),culture:normalizeCultureProfile(x.culture),trade:normalizeTradeProfile(x.trade),weatherProfile:normalizeWeatherProfile(x.weatherProfile,state.world?.bible?.weatherSystem?.phenomena?.map(p=>p.id)||null),accessRequirements:normalizeAccessRequirements(x.accessRequirements),worldState:{safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]},canonical:true,createdDay:state.world.state.day};r.locations.push(o);added.locations.push(o)}
 for(const x of (g?.factions||[]).slice(0,1)){const name=clean(x.name,80);if(byName(r.factions,name))continue;const o={id:uid("FAC"),name,goal:clean(x.goal,200),description:clean(x.description,400),historyRefs:resolveHistoryRefs(state,x.historyRefs),known:x.known===true,lore:normalizeLore(x.lore),culture:normalizeCultureProfile(x.culture),trade:normalizeTradeProfile(x.trade),resources:50,influence:25,playerReputation:0,relations:{},worldState:{stability:50,statusTags:[]},lastActionMinute:state.world.state.clock?.totalMinutes||0,canonical:true};r.factions.push(o);added.factions.push(o)}
 const locByName=name=>r.locations.find(v=>v.name.toLowerCase()===clean(name,80).toLowerCase());
 const facByName=name=>r.factions.find(v=>v.name.toLowerCase()===clean(name,80).toLowerCase());
 const locIds=new Set(r.locations.map(x=>x.id)),facIds=new Set(r.factions.map(x=>x.id));
 for(const x of (g?.npcs||[]).slice(0,2)){
  const name=clean(x.name,80);if(byName(r.npcs,name))continue;
  const requestedLoc=clean(x.locationId,120),requestedFac=clean(x.factionId,120);
  const resolvedLoc=locIds.has(requestedLoc)?requestedLoc:locByName(x.locationName)?.id||null;
  const resolvedFac=facIds.has(requestedFac)?requestedFac:facByName(x.factionName)?.id||null;
  const o={id:uid("NPC"),name,role:clean(x.role,100),description:clean(x.description,400),personality:clean(x.personality,240)||"對陌生人保持謹慎",goal:clean(x.goal,240)||"維持自己的生活與安全",locationId:resolvedLoc,factionId:resolvedFac,historyRefs:resolveHistoryRefs(state,x.historyRefs),knowledgeScope:resolveKnowledgeScope(state,x.knowledgeScope),known:x.known===true,encountered:false,remoteContact:{established:false,blocked:false},lore:normalizeLore(x.lore),alive:true,trust:0,companionProfile:{joinThreshold:clamp(Math.round(Number(x.companionProfile?.joinThreshold)||35),5,90),leaveThreshold:clamp(Math.round(Number(x.companionProfile?.leaveThreshold)||10),0,70),motives:Array.isArray(x.companionProfile?.motives)?x.companionProfile.motives.map(v=>clean(v,120)).filter(Boolean).slice(0,4):[],boundaries:Array.isArray(x.companionProfile?.boundaries)?x.companionProfile.boundaries.map(v=>clean(v,120)).filter(Boolean).slice(0,4):[]},companion:{status:"NONE",joinedDay:null,leftDay:null,offeredDay:null,reason:""},worldState:{statusTags:[]},memories:[],lastActionMinute:state.world.state.clock?.totalMinutes||0,canonical:true};
  r.npcs.push(o);added.npcs.push(o)
 }
 for(const x of (g?.sideQuests||[]).slice(0,1)){const title=clean(x.title,100);if(r.sideQuests.some(q=>q.title.toLowerCase()===title.toLowerCase()))continue;const evidenceKeywords=keywords(x.evidenceKeywords),conditions=Array.isArray(x.conditions)?structuredClone(x.conditions.slice(0,5)):[],target=clamp(Number.isInteger(x.target)?x.target:(conditions.length?Math.min(3,conditions.length):evidenceKeywords.length?Math.min(3,evidenceKeywords.length):3),1,5),o={id:uid("SQ"),title,objective:clean(x.objective,240),known:x.known===true,status:"ACTIVE",progress:0,target,evidence:[],evidenceKeywords,matchedKeywords:[],conditions,matchedConditions:[],historyRefs:resolveHistoryRefs(state,x.historyRefs),createdDay:state.world.state.day,canonical:true};r.sideQuests.push(o);added.sideQuests.push(o)}
 if(added.locations.length)retargetWeather(state);
 if(Object.values(added).some(a=>a.length)){state.world.version++;state.events.push({id:uid("EV"),type:"WORLD_CANON_EXPANDED",visibility:"INTERNAL",day:state.world.state.day,summary:Object.entries(added).filter(([,a])=>a.length).map(([k,a])=>`${k} +${a.length}`).join(" · "),at:Date.now()})}
 return added
}