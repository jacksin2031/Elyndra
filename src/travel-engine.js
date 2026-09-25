import {advanceTime} from "./world-clock.js?v=57021";
import {currentWeather,retargetWeather,tickWeather} from "./weather-engine.js?v=57021";
import {tickSurvival} from "./survival-engine.js?v=57021";

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h)};
const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));

function locations(state){return Array.isArray(state.world?.registry?.locations)?state.world.registry.locations:[]}
function current(state){
 const playerName=String(state.player?.location||""),worldName=String(state.world?.state?.location||"");
 return locations(state).find(x=>x.name===playerName)||locations(state).find(x=>x.name===worldName)||null
}
function hasRoute(routes,a,b){return routes.some(r=>(r.fromId===a&&r.toId===b)||(r.fromId===b&&r.toId===a))}
function terrainFor(a,b){
 const text=((a?.type||"")+" "+(b?.type||"")+" "+(a?.region||"")+" "+(b?.region||"")).toLowerCase();
 if(/山|峰|峽|洞|荒|沼|雪|火山/.test(text))return "ROUGH";
 if(/海|港|島|河|湖|水/.test(text))return "WATER";
 if(/城|鎮|村|街|道路|平原/.test(text))return "ROAD";
 return "WILDERNESS"
}
function routeSpec(state,a,b,crossRegion=false){
 const seed=hash([state.world?.id,a.id,b.id].sort().join("|")),distance=crossRegion?20+(seed%61):2+(seed%15),terrain=terrainFor(a,b),hazard=terrain==="ROUGH"?4:terrain==="WILDERNESS"?3:terrain==="WATER"?3:2;
 const speed=terrain==="ROAD"?9:terrain==="WATER"?12:terrain==="ROUGH"?20:15;
 return {id:uid("RTE"),fromId:a.id,toId:b.id,distanceKm:distance,terrain,hazard,baseMinutes:Math.max(20,Math.round(distance*speed)),open:true,canonical:true,generatedBy:"ENGINE_GEOGRAPHY",createdDay:state.world?.state?.day||1,lastUsedMinute:null}
}
export function ensureTravelNetwork(state){
 state.world.travel??={version:1,routes:[]};const t=state.world.travel;t.version=1;t.routes=Array.isArray(t.routes)?t.routes:[];
 const locs=locations(state);if(locs.length<2)return t;
 const groups=new Map();for(const loc of locs){const key=String(loc.region||"UNMAPPED");if(!groups.has(key))groups.set(key,[]);groups.get(key).push(loc)}
 for(const group of groups.values()){group.sort((a,b)=>Number(a.createdDay||0)-Number(b.createdDay||0)||String(a.id).localeCompare(String(b.id)));for(let i=1;i<group.length;i++){const a=group[i-1],b=group[i];if(!hasRoute(t.routes,a.id,b.id))t.routes.push(routeSpec(state,a,b,false))}}
 const reps=[...groups.values()].map(g=>g[0]).filter(Boolean).sort((a,b)=>String(a.region||"").localeCompare(String(b.region||"")));
 for(let i=1;i<reps.length;i++){const a=reps[i-1],b=reps[i];if(!hasRoute(t.routes,a.id,b.id))t.routes.push(routeSpec(state,a,b,true))}
 return t
}
function neighbours(state,id){
 const t=ensureTravelNetwork(state),out=[];for(const r of t.routes){if(r.open===false)continue;if(r.fromId===id)out.push({route:r,to:r.toId});else if(r.toId===id)out.push({route:r,to:r.fromId})}return out
}
function accessRequirementMet(state,c){
 const type=String(c?.type||"").toUpperCase(),id=String(c?.id||"");
 if(type==="ITEM_OWNED")return (state.inventory||[]).some(x=>(x.id===id||x.name===id)&&(Number(x.quantity)||1)>0);
 if(["ITEM_USED","ITEM_SHOWN","ITEM_GIVEN"].includes(type)){const eventType={ITEM_USED:"ITEM_USED",ITEM_SHOWN:"ITEM_SHOWN",ITEM_GIVEN:"ITEM_GIVEN"}[type];return (state.events||[]).some(e=>e.type===eventType&&(e.itemId===id||e.itemName===id))}
 if(type==="FACT_KNOWN")return (state.knowledge||[]).some(k=>k.status==="VERIFIED"&&k.factId===id);
 if(type==="EVENT_OCCURRED")return (state.events||[]).some(e=>e.id===id||e.type===id);
 return false
}
export function locationAccessStatus(state,location){
 const requirements=Array.isArray(location?.accessRequirements)?location.accessRequirements:[];
 const missing=requirements.filter(x=>!accessRequirementMet(state,x));
 return {allowed:missing.length===0,requirements,missing}
}
function weatherFactor(state){const w=currentWeather(state),danger=clamp(Number(w?.danger)||0,0,5);return 1+danger*.08}
function routeMinutes(state,route){return Math.max(10,Math.round(Number(route.baseMinutes||45)*(1+clamp(Number(route.hazard)||0,0,5)*.04)*weatherFactor(state)))}
export function findTravelPlan(state,destinationId){
 const start=current(state),target=locations(state).find(x=>x.id===destinationId);if(!start||!target)return null;if(start.id===target.id)return {fromId:start.id,toId:target.id,routes:[],minutes:0,distanceKm:0};
 const dist=new Map([[start.id,0]]),prev=new Map(),queue=[start.id],seen=new Set();
 while(queue.length){queue.sort((a,b)=>(dist.get(a)??Infinity)-(dist.get(b)??Infinity));const id=queue.shift();if(seen.has(id))continue;seen.add(id);if(id===target.id)break;
  for(const edge of neighbours(state,id)){const nd=(dist.get(id)||0)+routeMinutes(state,edge.route);if(nd<(dist.get(edge.to)??Infinity)){dist.set(edge.to,nd);prev.set(edge.to,{from:id,route:edge.route});queue.push(edge.to)}}
 }
 if(!dist.has(target.id))return null;const routes=[];let cursor=target.id;while(cursor!==start.id){const p=prev.get(cursor);if(!p)return null;routes.unshift(p.route);cursor=p.from}
 return {fromId:start.id,toId:target.id,routes,minutes:dist.get(target.id),distanceKm:routes.reduce((n,r)=>n+Number(r.distanceKm||0),0)}
}
export function travelTo(state,destination,{roll=null,actionKind="",baseMinutes=45,force=false}={}){
 const target=typeof destination==="string"?locations(state).find(x=>x.id===destination||x.name===destination):destination;if(!target)return {ok:false,reason:"DESTINATION_UNKNOWN"};
 const start=current(state);if(start?.id===target.id){target.known=true;return {ok:true,target,plan:{routes:[],minutes:0,distanceKm:0},extraMinutes:0}}
 if(force){target.known=true;state.player.location=target.name;state.world.state.location=target.name;state.world.state.region=target.region||state.world.state.region;target.discoveredDay??=state.world.state.day;retargetWeather(state);return {ok:true,target,plan:{routes:[],minutes:0,distanceKm:0,forced:true},extraMinutes:0}}
 if(String(actionKind||roll?.profile?.kind||"").toUpperCase()!=="TRAVEL")return {ok:false,reason:"TRAVEL_ACTION_REQUIRED"};
 if(!force&&roll?.success===false)return {ok:false,reason:"TRAVEL_CHECK_FAILED"};
 const access=locationAccessStatus(state,target);if(!force&&!access.allowed){state.events??=[];state.events.push({id:uid("EV"),type:"TRAVEL_ACCESS_BLOCKED",visibility:"PLAYER_KNOWN",destinationId:target.id,missing:access.missing.map(x=>({type:x.type,id:x.id,hint:x.hint||""})),summary:access.missing.map(x=>x.hint||"尚未滿足進入條件").join(" · "),day:state.world?.state?.day||1,at:Date.now()});return {ok:false,reason:"ACCESS_REQUIREMENT_MISSING",missing:access.missing}}
 target.known=true;const plan=findTravelPlan(state,target.id);if(!plan)return {ok:false,reason:"NO_CANON_ROUTE"};
 const extraMinutes=force?0:Math.max(0,plan.minutes-Math.max(0,Number(baseMinutes)||0));if(extraMinutes){advanceTime(state,extraMinutes);tickSurvival(state,extraMinutes,{kind:"TRAVEL"});tickWeather(state)}
 state.player.location=target.name;state.world.state.location=target.name;state.world.state.region=target.region||state.world.state.region;target.discoveredDay??=state.world.state.day;
 for(const route of plan.routes)route.lastUsedMinute=state.world.state.clock?.totalMinutes||0;
 retargetWeather(state);state.events??=[];state.events.push({id:uid("EV"),type:"TRAVEL_COMPLETED",visibility:"PLAYER_KNOWN",fromId:plan.fromId,toId:plan.toId,distanceKm:plan.distanceKm,minutes:plan.minutes,summary:"你沿著可通行路線抵達 "+target.name+"。",day:state.world.state.day,at:Date.now()});
 return {ok:true,target,plan,extraMinutes}
}
export function travelSnapshot(state,{director=false}={}){
 const t=ensureTravelNetwork(state),here=current(state),known=new Set(locations(state).filter(x=>x.known===true).map(x=>x.id)),routes=t.routes.filter(r=>director||(known.has(r.fromId)&&known.has(r.toId))).map(r=>({id:r.id,fromId:r.fromId,toId:r.toId,distanceKm:r.distanceKm,terrain:r.terrain,hazard:r.hazard,baseMinutes:r.baseMinutes,open:r.open!==false}));
 return {currentLocationId:here?.id||null,routes:routes.slice(-40),locations:locations(state).filter(x=>director||x.known===true).map(x=>({id:x.id,name:x.name,region:x.region,type:x.type,access:locationAccessStatus(state,x)})).slice(-40)}
}
