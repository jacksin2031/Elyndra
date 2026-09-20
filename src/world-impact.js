import {addCrisisPressure,ensureCrisis} from "./crisis-engine.js?v=250";
import {applyTimelineImpact} from "./world-timeline.js?v=260";
import {validateRecognitionCandidate,registerImpactRecognition} from "./recognition-engine.js?v=260";

const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const clean=(v,max=300)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SCOPES=["PERSONAL","LOCAL","REGIONAL","FACTION","WORLD"];
const RANK=Object.fromEntries(SCOPES.map((x,i)=>[x,i]));
const POINTS={PERSONAL:1,LOCAL:2,REGIONAL:4,FACTION:6,WORLD:10};
const LIMITS={PERSONAL:5,LOCAL:12,REGIONAL:20,FACTION:25,WORLD:35};
const LOCATION_FIELDS=new Set(["safety","prosperity","supply","infrastructure","stability"]);
const FACTION_FIELDS=new Set(["resources","influence","stability"]);
const NPC_FIELDS=new Set(["trust"]);
const WORLD_FIELDS=new Set(["tension","crisisPressure"]);

function defaultState(kind){
 if(kind==="location")return {safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]};
 if(kind==="faction")return {stability:50,statusTags:[]};
 return {statusTags:[]}
}
function ensureEntityState(entity,kind){
 entity.worldState??=defaultState(kind);
 entity.worldState.statusTags=Array.isArray(entity.worldState.statusTags)?entity.worldState.statusTags.map(x=>clean(x,60)).filter(Boolean).slice(0,12):[];
 if(kind==="location")for(const k of LOCATION_FIELDS)entity.worldState[k]=clamp(Number(entity.worldState[k]??50),0,100);
 if(kind==="faction")entity.worldState.stability=clamp(Number(entity.worldState.stability??50),0,100);
 return entity.worldState
}
export function ensureWorldImpact(state){
 state.world.impact??={version:1,influence:{personal:0,local:0,regional:0,faction:0,world:0},records:[],queue:[]};
 const x=state.world.impact;x.version=1;x.influence??={personal:0,local:0,regional:0,faction:0,world:0};x.records=Array.isArray(x.records)?x.records:[];x.queue=Array.isArray(x.queue)?x.queue:[];
 for(const key of ["personal","local","regional","faction","world"])x.influence[key]=Math.max(0,Math.round(Number(x.influence[key])||0));
 state.world.state.statusTags=Array.isArray(state.world.state.statusTags)?state.world.state.statusTags.map(x=>clean(x,60)).filter(Boolean).slice(0,12):[];
 const r=state.world.registry||{};for(const e of r.locations||[])ensureEntityState(e,"location");for(const e of r.npcs||[])ensureEntityState(e,"npc");for(const e of r.factions||[])ensureEntityState(e,"faction");
 return x
}
export function impactCapability(state,roll=null){
 const impact=ensureWorldImpact(state),score=Math.max(0,Number(state.player?.knowledgeScore)||0),records=impact.records.filter(x=>x.type==="PLAYER_IMPACT").length,crisis=ensureCrisis(state).stage;
 let max="LOCAL";
 if(score>=8&&records>=2)max="REGIONAL";
 if(score>=12&&records>=4)max="FACTION";
 if(score>=15&&records>=6&&["CRISIS","ENDGAME"].includes(crisis))max="WORLD";
 if(roll&&roll.success===false&&RANK[max]>RANK.LOCAL)max="LOCAL";
 return {maxScope:max,allowedScopes:SCOPES.slice(0,RANK[max]+1),knowledgeScore:score,impactCount:records,crisisStage:crisis}
}
function resolveTarget(state,kind,targetId){
 const r=state.world.registry||{};
 if(kind==="world")return {entity:state.world,targetId:"WORLD",name:state.player?.worldNameKnown?state.world.name:"這個世界",known:true};
 if(kind==="location"){
  let e;if(targetId==="CURRENT_LOCATION")e=(r.locations||[]).find(x=>x.name===state.player?.location);else e=(r.locations||[]).find(x=>x.id===targetId);
  return e?{entity:e,targetId:e.id,name:e.name,known:e.known===true}:null
 }
 if(kind==="npc"){const e=(r.npcs||[]).find(x=>x.id===targetId);return e?{entity:e,targetId:e.id,name:e.name,known:e.known===true}:null}
 if(kind==="faction"){const e=(r.factions||[]).find(x=>x.id===targetId);return e?{entity:e,targetId:e.id,name:e.name,known:e.known===true}:null}
 return null
}
function mutateTag(tags,op,value){
 const tag=clean(value,60);if(!tag)return {changed:false};const before=[...tags];
 if(op==="ADD_TAG"&&!tags.includes(tag))tags.push(tag);
 if(op==="REMOVE_TAG"){const i=tags.indexOf(tag);if(i>=0)tags.splice(i,1)}
 return {changed:before.join("|")!==tags.join("|"),before,after:[...tags],field:"statusTag"}
}
function applyMutation(state,target,kind,mutation,limit){
 const op=String(mutation?.op||"").toUpperCase(),field=clean(mutation?.field,50);
 if(["ADD_TAG","REMOVE_TAG"].includes(op)){
  const holder=kind==="world"?state.world.state:ensureEntityState(target,kind);holder.statusTags??=[];return mutateTag(holder.statusTags,op,mutation.value)
 }
 if(op!=="DELTA")return {changed:false};
 let delta=Number(mutation?.value);if(!Number.isFinite(delta)||delta===0)return {changed:false};delta=clamp(Math.round(delta),-limit,limit);
 if(kind==="location"&&LOCATION_FIELDS.has(field)){const ws=ensureEntityState(target,"location"),before=ws[field],after=clamp(before+delta,0,100);ws[field]=after;return {changed:before!==after,field,before,after,delta:after-before}}
 if(kind==="npc"&&NPC_FIELDS.has(field)){const before=Number(target[field]??0),after=clamp(before+delta,0,100);target[field]=after;return {changed:before!==after,field,before,after,delta:after-before}}
 if(kind==="faction"&&FACTION_FIELDS.has(field)){
  if(field==="stability"){const ws=ensureEntityState(target,"faction"),before=ws.stability,after=clamp(before+delta,0,100);ws.stability=after;return {changed:before!==after,field,before,after,delta:after-before}}
  const before=Number(target[field]??(field==="resources"?50:25)),after=clamp(before+delta,0,100);target[field]=after;return {changed:before!==after,field,before,after,delta:after-before}
 }
 if(kind==="world"&&WORLD_FIELDS.has(field)){
  if(field==="crisisPressure"){const crisis=ensureCrisis(state),before=crisis.pressure;if(delta>0)addCrisisPressure(state,delta,"PLAYER_IMPACT");else crisis.pressure=clamp(before+delta,0,100);const after=ensureCrisis(state).pressure;return {changed:before!==after,field,before,after,delta:after-before}}
  state.world.state.simulation??={tension:10,lastEventMinute:0,lastTickMinute:0,npcCursor:0,factionCursor:0,flags:{}};const before=Number(state.world.state.simulation.tension||0),after=clamp(before+delta,0,100);state.world.state.simulation.tension=after;return {changed:before!==after,field,before,after,delta:after-before}
 }
 return {changed:false}
}
export function validateImpactCandidate(input){
 const errors=[];if(input==null)return {valid:true,errors};
 if(!Array.isArray(input))return {valid:false,errors:["WORLD_IMPACTS_INVALID"]};
 for(const x of input.slice(0,3)){
  if(!x||typeof x!=="object"||Array.isArray(x))errors.push("WORLD_IMPACT_SHAPE_INVALID");
  else{
   if(!SCOPES.includes(String(x.scope||"").toUpperCase()))errors.push("WORLD_IMPACT_SCOPE_INVALID");
   if(!["location","npc","faction","world"].includes(x.targetKind))errors.push("WORLD_IMPACT_TARGET_INVALID");
   if(typeof x.targetId!=="string"||!x.targetId)errors.push("WORLD_IMPACT_TARGET_ID_INVALID");
   if(clean(x.title,120).length<3||clean(x.summary,400).length<8)errors.push("WORLD_IMPACT_TEXT_INVALID");
   if(x.mutations!=null&&!Array.isArray(x.mutations))errors.push("WORLD_IMPACT_MUTATIONS_INVALID");
   if(x.consequences!=null&&!Array.isArray(x.consequences))errors.push("WORLD_IMPACT_CONSEQUENCES_INVALID");
   if(x.timelineEffects!=null&&!Array.isArray(x.timelineEffects))errors.push("WORLD_IMPACT_TIMELINE_INVALID");
   const rv=validateRecognitionCandidate(x.recognition);if(!rv.valid)errors.push(...rv.errors)
  }
 }
 return {valid:errors.length===0,errors:[...new Set(errors)]}
}
function scheduleConsequence(state,parent,raw){
 const target=resolveTarget(state,raw?.targetKind||parent.targetKind,raw?.targetId||parent.targetId);if(!target||!target.known)return null;
 const delay=clamp(Math.round(Number(raw?.delayMinutes)||0),30,43200),summary=clean(raw?.observableEffect,400);if(!summary||!Array.isArray(raw?.mutations)||!raw.mutations.length)return null;
 const item={id:uid("CON"),parentImpactId:parent.id,scope:parent.scope,targetKind:raw.targetKind||parent.targetKind,targetId:target.targetId,targetName:target.name,dueMinute:(state.world.state.clock?.totalMinutes||0)+delay,observableEffect:summary,mutations:structuredClone(raw.mutations.slice(0,5)),status:"SCHEDULED",createdDay:state.world.state.day};
 ensureWorldImpact(state).queue.push(item);ensureWorldImpact(state).queue=ensureWorldImpact(state).queue.slice(-40);return item
}
export function applyWorldImpacts(state,input,context={}){
 const valid=validateImpactCandidate(input);if(!valid.valid)throw new Error(valid.errors.join(","));
 const impact=ensureWorldImpact(state),applied=[],capability=impactCapability(state,context.roll||null);
 for(const raw of (input||[]).slice(0,2)){
  const scope=String(raw.scope||"").toUpperCase();if(RANK[scope]>RANK[capability.maxScope])continue;if(raw.targetKind==="world"&&scope!=="WORLD")continue;
  const target=resolveTarget(state,raw.targetKind,raw.targetId);if(!target||!target.known)continue;
  const limit=LIMITS[scope],changes=[];
  for(const m of (raw.mutations||[]).slice(0,5)){const c=applyMutation(state,target.entity,raw.targetKind,m,limit);if(c.changed)changes.push(c)}
  const timelineEffects=[];if(RANK[scope]>=RANK.REGIONAL)for(const e of (raw.timelineEffects||[]).slice(0,2)){const changed=applyTimelineImpact(state,e);if(changed)timelineEffects.push(changed)}
  const record={id:uid("IMP"),type:"PLAYER_IMPACT",visibility:"PLAYER_KNOWN",scope,targetKind:raw.targetKind,targetId:target.targetId,targetName:target.name,title:clean(raw.title,120),summary:clean(raw.summary,400),reason:clean(raw.reason,300),changes,timelineEffects:timelineEffects.map(x=>({timelineId:x.timelineId,action:x.action})),day:state.world.state.day,minute:state.world.state.clock?.totalMinutes||0,at:Date.now()};
  const queued=[];for(const item of (raw.consequences||[]).slice(0,3)){const q=scheduleConsequence(state,record,item);if(q)queued.push(q.id)}
  if(!changes.length&&!timelineEffects.length&&!queued.length)continue;
  record.queuedConsequences=queued;impact.records.push(record);impact.records=impact.records.slice(-120);
  const k=scope.toLowerCase();impact.influence[k]=(impact.influence[k]||0)+POINTS[scope];
  record.recognition=registerImpactRecognition(state,record,raw.recognition||{});
  state.events.push({id:uid("EV"),type:"WORLD_IMPACT",visibility:"PLAYER_KNOWN",impactId:record.id,scope,summary:record.title+"："+record.summary,day:state.world.state.day,at:Date.now()});
  applied.push(record)
 }
 return applied
}
export function processDueConsequences(state){
 const impact=ensureWorldImpact(state),now=state.world.state.clock?.totalMinutes||0,out=[];
 for(const item of impact.queue.filter(x=>x.status==="SCHEDULED"&&x.dueMinute<=now).slice(0,4)){
  const target=resolveTarget(state,item.targetKind,item.targetId);if(!target){item.status="CANCELLED";continue}
  const changes=[];for(const m of item.mutations||[]){const c=applyMutation(state,target.entity,item.targetKind,m,LIMITS[item.scope]||12);if(c.changed)changes.push(c)}
  item.status="TRIGGERED";item.triggeredDay=state.world.state.day;item.changes=changes;
  const record={id:uid("IMP"),type:"CONSEQUENCE",visibility:"OBSERVABLE",scope:item.scope,targetKind:item.targetKind,targetId:item.targetId,targetName:item.targetName,title:"延遲後果",summary:item.observableEffect,reason:"由先前的玩家行動引發",changes,day:state.world.state.day,minute:now,at:Date.now(),parentImpactId:item.parentImpactId};
  impact.records.push(record);impact.records=impact.records.slice(-120);state.events.push({id:uid("EV"),type:"WORLD_CONSEQUENCE",visibility:"OBSERVABLE",impactId:record.id,scope:item.scope,summary:item.observableEffect,day:state.world.state.day,at:Date.now()});out.push(record)
 }
 return out
}
export function impactSnapshot(state,{director=false}={}){
 const impact=ensureWorldImpact(state),r=state.world.registry||{};
 const entityStates={
  locations:(r.locations||[]).filter(x=>x.known===true).slice(-12).map(x=>({id:x.id,name:x.name,state:ensureEntityState(x,"location")})),
  factions:(r.factions||[]).filter(x=>x.known===true).slice(-8).map(x=>({id:x.id,name:x.name,resources:x.resources,influence:x.influence,state:ensureEntityState(x,"faction")})),
  npcs:(r.npcs||[]).filter(x=>x.known===true).slice(-12).map(x=>({id:x.id,name:x.name,trust:x.trust,state:ensureEntityState(x,"npc")}))
 };
 const base={capability:impactCapability(state),influence:{...impact.influence},recent:impact.records.slice(-12).map(x=>({id:x.id,type:x.type,scope:x.scope,targetKind:x.targetKind,targetId:x.targetId,targetName:x.targetName,title:x.title,summary:x.summary,day:x.day})),entityStates};
 if(director)base.pendingConsequences=impact.queue.filter(x=>x.status==="SCHEDULED").slice(0,8).map(x=>({id:x.id,parentImpactId:x.parentImpactId,scope:x.scope,targetKind:x.targetKind,targetId:x.targetId,dueMinute:x.dueMinute,observableEffect:x.observableEffect}));
 return base
}
export function playerImpactRecords(state,limit=40){return ensureWorldImpact(state).records.filter(x=>["PLAYER_KNOWN","OBSERVABLE"].includes(x.visibility)).slice(-Math.max(0,limit))}
