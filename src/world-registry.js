import {normalizeLore} from "./lore-engine.js?v=267";
import {normalizeCultureProfile,normalizeTradeProfile} from "./world-locality.js?v=267";
import {ensureNpcRemoteContact,canRemoteContactNpc} from "./communication-engine.js?v=267";
const uid=(p)=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));const keywords=v=>Array.isArray(v)?[...new Set(v.map(x=>clean(x,60)).filter(x=>x.length>=2))].slice(0,6):[];
export function ensureWorldRegistry(state){
 state.world.registry??={locations:[],npcs:[],factions:[],sideQuests:[]};
 const r=state.world.registry;
 r.locations??=[];r.npcs??=[];r.factions??=[];r.sideQuests??=[];
 for(const list of [r.locations,r.npcs,r.factions,r.sideQuests])for(const x of list)if(x.known==null)x.known=true;
 for(const n of r.npcs){if(n.encountered==null)n.encountered=Boolean(n.companion?.status==="ACTIVE"||(n.memories||[]).length||(Number(n.trust)||0)!==0);ensureNpcRemoteContact(state,n)}
 return r
}
export function repairPlayerLocation(state){
 const r=ensureWorldRegistry(state);if(!r.locations.length)return null;
 const player=String(state.player?.location||"").trim(),worldLoc=String(state.world?.state?.location||"").trim();
 let entity=r.locations.find(x=>x.name===player)||r.locations.find(x=>x.name===worldLoc);
 if(!entity)entity=[...r.locations].reverse().find(x=>x.known===true)||r.locations[0];
 if(entity){state.player.location=entity.name;state.world.state.location=entity.name}
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
export function resolvePlayerLocation(state,raw){
 const token=String(raw??"").trim();if(!token)return null;const r=ensureWorldRegistry(state);
 const entity=r.locations.find(x=>x.id===token||x.name===token);if(!entity)return null;
 entity.known=true;entity.discoveredDay??=state.world.state.day;state.player.location=entity.name;state.world.state.location=entity.name;return entity
}
export function registrySnapshot(state,{visibleOnly=false}={}){
 const r=ensureWorldRegistry(state),filter=arr=>visibleOnly?arr.filter(x=>x.known===true):arr;
 return {
  locations:filter(r.locations).slice(-20).map(({id,name,type,region,description,culture,trade,worldState})=>({id,name,type,region,description,culture,trade,worldState})),
  npcs:filter(r.npcs).slice(-20).map(n=>({id:n.id,name:n.name,role:n.role,locationId:n.locationId,factionId:n.factionId,description:n.description,personality:n.personality,goal:n.goal,trust:n.trust,companionStatus:n.companion?.status||"NONE",encountered:n.encountered===true,present:isNpcPresent(state,n),remoteContactable:canRemoteContactNpc(state,n),worldState:n.worldState})),
  factions:filter(r.factions).slice(-12).map(({id,name,goal,description,resources,influence,playerReputation,relations,culture,trade,worldState})=>({id,name,goal,description,resources,influence,playerReputation,relations,culture,trade,worldState})),
  sideQuests:r.sideQuests.filter(q=>!visibleOnly||q.known===true).filter(q=>q.status!=="COMPLETED").slice(-12).map(({id,title,objective,status,progress,target})=>({id,title,objective,status,progress:progress??0,target:target??3}))
 }
}
export function directorRegistrySnapshot(state){
 const r=ensureWorldRegistry(state);
 return {
  locations:r.locations.slice(-12).map(({id,name,type,region,known})=>({id,name,type,region,known:Boolean(known)})),
  npcs:r.npcs.slice(-12).map(({id,name,role,locationId,factionId,known,companion,companionProfile,goal})=>({id,name,role,locationId,factionId,known:Boolean(known),goal,companionStatus:companion?.status||"NONE",companionProfile})),
  factions:r.factions.slice(-8).map(({id,name,known})=>({id,name,known:Boolean(known)}))
 }
}
export function revealRegistryEntities(state,reveals=[]){
 const r=ensureWorldRegistry(state),maps={location:r.locations,npc:r.npcs,faction:r.factions,sideQuest:r.sideQuests},out=[];
 for(const x of Array.isArray(reveals)?reveals.slice(0,6):[]){
  const kind=clean(x?.kind,30),id=clean(x?.id,140),list=maps[kind];if(!list||!id)continue;
  const entity=list.find(v=>v.id===id);if(!entity)continue;const wasKnown=entity.known===true,wasEncountered=entity.encountered===true;
  entity.known=true;entity.discoveredDay??=state.world.state.day;if(kind==="npc"&&isNpcPresent(state,entity)){entity.encountered=true;ensureNpcRemoteContact(state,entity)}
  if(!wasKnown||(!wasEncountered&&entity.encountered===true))out.push({kind,id,name:entity.name||entity.title||""})
 }
 if(out.length){state.events??=[];state.events.push({id:uid("EV"),type:"ENTITY_REVEALED",visibility:"PLAYER_KNOWN",day:state.world.state.day,summary:out.map(x=>`${x.kind}:${x.name}`).join(" · "),at:Date.now()})}
 return out
}
export function validateGeneration(g){
 if(g==null)return {valid:true,errors:[]};const e=[];
 if(typeof g!=="object"||Array.isArray(g))return {valid:false,errors:["GENERATION_INVALID"]};
 for(const k of ["locations","npcs","factions","sideQuests"])if(g[k]!=null&&!Array.isArray(g[k]))e.push(k.toUpperCase()+"_INVALID");
 for(const x of g.locations||[])if(!clean(x?.name,80)||!clean(x?.description,400))e.push("LOCATION_SHAPE_INVALID");else{if(x.lore!=null&&!normalizeLore(x.lore))e.push("LOCATION_LORE_INVALID");if(x.culture!=null&&typeof x.culture!=="object")e.push("LOCATION_CULTURE_INVALID");if(x.trade!=null&&typeof x.trade!=="object")e.push("LOCATION_TRADE_INVALID")}
 for(const x of g.npcs||[])if(!clean(x?.name,80)||!clean(x?.role,100))e.push("NPC_SHAPE_INVALID");else{if(x.lore!=null&&!normalizeLore(x.lore))e.push("NPC_LORE_INVALID");if(x.companionProfile!=null&&typeof x.companionProfile!=="object")e.push("NPC_COMPANION_PROFILE_INVALID")}
 for(const x of g.factions||[])if(!clean(x?.name,80)||!clean(x?.goal,200))e.push("FACTION_SHAPE_INVALID");else{if(x.lore!=null&&!normalizeLore(x.lore))e.push("FACTION_LORE_INVALID");if(x.culture!=null&&typeof x.culture!=="object")e.push("FACTION_CULTURE_INVALID");if(x.trade!=null&&typeof x.trade!=="object")e.push("FACTION_TRADE_INVALID")}
 for(const x of g.sideQuests||[]){if(!clean(x?.title,100)||!clean(x?.objective,240))e.push("SIDE_QUEST_SHAPE_INVALID");if(x.evidenceKeywords!=null&&!Array.isArray(x.evidenceKeywords))e.push("SIDE_QUEST_EVIDENCE_INVALID");if(x.target!=null&&(!Number.isInteger(x.target)||x.target<1||x.target>5))e.push("SIDE_QUEST_TARGET_INVALID")}
 return {valid:e.length===0,errors:[...new Set(e)]}
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
 for(const x of (g?.locations||[]).slice(0,2)){const name=clean(x.name,80);if(byName(r.locations,name))continue;const o={id:uid("LOC"),name,type:clean(x.type,60)||"未知地點",region:clean(x.region,80)||state.world.state.region||"",description:clean(x.description,400),known:x.known===true,lore:normalizeLore(x.lore),culture:normalizeCultureProfile(x.culture),trade:normalizeTradeProfile(x.trade),worldState:{safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]},canonical:true,createdDay:state.world.state.day};r.locations.push(o);added.locations.push(o)}
 for(const x of (g?.factions||[]).slice(0,1)){const name=clean(x.name,80);if(byName(r.factions,name))continue;const o={id:uid("FAC"),name,goal:clean(x.goal,200),description:clean(x.description,400),known:x.known===true,lore:normalizeLore(x.lore),culture:normalizeCultureProfile(x.culture),trade:normalizeTradeProfile(x.trade),resources:50,influence:25,playerReputation:0,relations:{},worldState:{stability:50,statusTags:[]},lastActionMinute:state.world.state.clock?.totalMinutes||0,canonical:true};r.factions.push(o);added.factions.push(o)}
 const locByName=name=>r.locations.find(v=>v.name.toLowerCase()===clean(name,80).toLowerCase());
 const facByName=name=>r.factions.find(v=>v.name.toLowerCase()===clean(name,80).toLowerCase());
 const locIds=new Set(r.locations.map(x=>x.id)),facIds=new Set(r.factions.map(x=>x.id));
 for(const x of (g?.npcs||[]).slice(0,2)){
  const name=clean(x.name,80);if(byName(r.npcs,name))continue;
  const requestedLoc=clean(x.locationId,120),requestedFac=clean(x.factionId,120);
  const resolvedLoc=locIds.has(requestedLoc)?requestedLoc:locByName(x.locationName)?.id||null;
  const resolvedFac=facIds.has(requestedFac)?requestedFac:facByName(x.factionName)?.id||null;
  const o={id:uid("NPC"),name,role:clean(x.role,100),description:clean(x.description,400),personality:clean(x.personality,240)||"對陌生人保持謹慎",goal:clean(x.goal,240)||"維持自己的生活與安全",locationId:resolvedLoc,factionId:resolvedFac,knowledgeScope:resolveKnowledgeScope(state,x.knowledgeScope),known:x.known===true,encountered:false,remoteContact:{established:false,blocked:false},lore:normalizeLore(x.lore),alive:true,trust:0,companionProfile:{joinThreshold:clamp(Math.round(Number(x.companionProfile?.joinThreshold)||35),5,90),leaveThreshold:clamp(Math.round(Number(x.companionProfile?.leaveThreshold)||10),0,70),motives:Array.isArray(x.companionProfile?.motives)?x.companionProfile.motives.map(v=>clean(v,120)).filter(Boolean).slice(0,4):[],boundaries:Array.isArray(x.companionProfile?.boundaries)?x.companionProfile.boundaries.map(v=>clean(v,120)).filter(Boolean).slice(0,4):[]},companion:{status:"NONE",joinedDay:null,leftDay:null,offeredDay:null,reason:""},worldState:{statusTags:[]},memories:[],lastActionMinute:state.world.state.clock?.totalMinutes||0,canonical:true};
  r.npcs.push(o);added.npcs.push(o)
 }
 for(const x of (g?.sideQuests||[]).slice(0,1)){const title=clean(x.title,100);if(r.sideQuests.some(q=>q.title.toLowerCase()===title.toLowerCase()))continue;const evidenceKeywords=keywords(x.evidenceKeywords),target=clamp(Number.isInteger(x.target)?x.target:(evidenceKeywords.length?Math.min(3,evidenceKeywords.length):3),1,5),o={id:uid("SQ"),title,objective:clean(x.objective,240),known:x.known===true,status:"ACTIVE",progress:0,target,evidence:[],evidenceKeywords,matchedKeywords:[],createdDay:state.world.state.day,canonical:true};r.sideQuests.push(o);added.sideQuests.push(o)}
 if(Object.values(added).some(a=>a.length)){state.world.version++;state.events.push({id:uid("EV"),type:"WORLD_CANON_EXPANDED",visibility:"INTERNAL",day:state.world.state.day,summary:Object.entries(added).filter(([,a])=>a.length).map(([k,a])=>`${k} +${a.length}`).join(" · "),at:Date.now()})}
 return added
}