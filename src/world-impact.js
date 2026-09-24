import {addCrisisPressure,ensureCrisis} from "./crisis-engine.js?v=56001";
import {applyTimelineImpact} from "./world-timeline.js?v=56001";
import {validateRecognitionCandidate,registerImpactRecognition} from "./recognition-engine.js?v=56001";

const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const clean=(v,max=300)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SCOPES=["PERSONAL","LOCAL","REGIONAL","FACTION","WORLD"];
const RANK=Object.fromEntries(SCOPES.map((x,i)=>[x,i]));
const POINTS={PERSONAL:1,LOCAL:2,REGIONAL:4,FACTION:6,WORLD:10};
const LIMITS={PERSONAL:5,LOCAL:12,REGIONAL:20,FACTION:25,WORLD:35};
const SEMANTIC_EFFECTS=new Set(["NONE","MINOR_POSITIVE","POSITIVE","MAJOR_POSITIVE","MINOR_NEGATIVE","NEGATIVE","MAJOR_NEGATIVE"]);
function semanticDelta(effect,limit){
 const e=String(effect||"").toUpperCase();if(!SEMANTIC_EFFECTS.has(e)||e==="NONE")return 0;const negative=e.includes("NEGATIVE"),ratio=e.startsWith("MAJOR_")?.8:e.startsWith("MINOR_")?.25:.5,amount=Math.max(1,Math.round(limit*ratio));return negative?-amount:amount
}
function mutationDelta(mutation,limit){
 const e=String(mutation?.effect||"").toUpperCase();if(SEMANTIC_EFFECTS.has(e))return semanticDelta(e,limit);
 const n=Number(mutation?.value);return Number.isFinite(n)?clamp(Math.round(n),-limit,limit):0
}
function mutationDirection(mutation){const e=String(mutation?.effect||"").toUpperCase();if(SEMANTIC_EFFECTS.has(e))return Math.sign(semanticDelta(e,100));return Math.sign(Number(mutation?.value)||0)}

const LOCATION_FIELDS=new Set(["safety","prosperity","supply","infrastructure","stability"]);
const FACTION_FIELDS=new Set(["resources","influence","stability"]);
const NPC_FIELDS=new Set(["trust"]);
const WORLD_FIELDS=new Set(["tension","crisisPressure"]);
const STRUCTURE_STATES=new Set(["ACTIVE","OPEN","RESTORED","STABILIZED","DAMAGED","DESTROYED","CLOSED","FLOODED","ABANDONED","CORRUPTED","TRANSFORMED"]);
const NEGATIVE_STRUCTURE_STATES=new Set(["DAMAGED","DESTROYED","CLOSED","FLOODED","ABANDONED","CORRUPTED"]);
const TARGETS={
 PERSONAL:new Set(["npc"]),
 LOCAL:new Set(["location","npc","faction"]),
 REGIONAL:new Set(["location","npc","faction"]),
 FACTION:new Set(["faction"]),
 WORLD:new Set(["location","npc","faction","world"])
};

function defaultState(kind){
 if(kind==="location")return {safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]};
 if(kind==="faction")return {stability:50,statusTags:[]};
 return {statusTags:[]}
}
function ensureEntityState(entity,kind){
 entity.worldState??=defaultState(kind);
 entity.worldState.statusTags=Array.isArray(entity.worldState.statusTags)?entity.worldState.statusTags.map(x=>clean(x,60)).filter(Boolean).slice(0,12):[];
 entity.worldState.structures=Array.isArray(entity.worldState.structures)?entity.worldState.structures:[];
 if(kind==="location")for(const k of LOCATION_FIELDS)entity.worldState[k]=clamp(Number(entity.worldState[k]??50),0,100);
 if(kind==="faction")entity.worldState.stability=clamp(Number(entity.worldState.stability??50),0,100);
 return entity.worldState
}
export function ensureWorldImpact(state){
 state.world.impact??={version:2,influence:{personal:0,local:0,regional:0,faction:0,world:0},records:[],queue:[]};
 const x=state.world.impact;x.version=2;x.influence??={personal:0,local:0,regional:0,faction:0,world:0};x.records=Array.isArray(x.records)?x.records:[];x.queue=Array.isArray(x.queue)?x.queue:[];
 for(const key of ["personal","local","regional","faction","world"])x.influence[key]=Math.max(0,Math.round(Number(x.influence[key])||0));
 state.world.state.statusTags=Array.isArray(state.world.state.statusTags)?state.world.state.statusTags.map(x=>clean(x,60)).filter(Boolean).slice(0,12):[];
 state.world.state.structures=Array.isArray(state.world.state.structures)?state.world.state.structures:[];
 const r=state.world.registry||{};for(const e of r.locations||[])ensureEntityState(e,"location");for(const e of r.npcs||[])ensureEntityState(e,"npc");for(const e of r.factions||[])ensureEntityState(e,"faction");
 return x
}
function verifiedKnowledgeScore(state){
 const canon=new Set((state.world?.canon?.facts||[]).map(x=>x.id)),history=new Set((state.world?.history||[]).map(x=>x.id));
 return (state.knowledge||[]).reduce((sum,k)=>{
  const valid=k?.status==="VERIFIED"&&((k?.factId&&canon.has(k.factId))||(k?.historyId&&history.has(k.historyId)));
  return valid?sum+Math.max(1,Number(k.score)||(k.historyId?3:2)):sum
 },0)
}
export function impactCapability(state,roll=null){
 const impact=ensureWorldImpact(state),rawScore=Math.max(0,Number(state.player?.knowledgeScore)||0),score=Math.min(rawScore,verifiedKnowledgeScore(state)),records=impact.records.filter(x=>x.type==="PLAYER_IMPACT").length,crisis=ensureCrisis(state).stage;
 let max="LOCAL";
 if(score>=8&&records>=2)max="REGIONAL";
 if(score>=12&&records>=4)max="FACTION";
 if(score>=15&&records>=6&&["CRISIS","ENDGAME"].includes(crisis))max="WORLD";
 if(roll&&roll.success===false&&RANK[max]>RANK.LOCAL)max="LOCAL";
 return {maxScope:max,allowedScopes:SCOPES.slice(0,RANK[max]+1),knowledgeScore:score,impactCount:records,crisisStage:crisis}
}
function currentLocation(state){
 const r=state.world.registry||{},name=String(state.player?.location||"");
 return (r.locations||[]).find(x=>x.name===name)||null
}
function locationById(state,id){return (state.world.registry?.locations||[]).find(x=>x.id===id)||null}
function resolveTarget(state,kind,targetId){
 const r=state.world.registry||{};
 if(kind==="world")return {entity:state.world,targetId:"WORLD",name:state.player?.worldNameKnown?state.world.name:"這個世界",known:true};
 if(kind==="location"){
  let e;if(targetId==="CURRENT_LOCATION")e=currentLocation(state);else e=(r.locations||[]).find(x=>x.id===targetId);
  return e?{entity:e,targetId:e.id,name:e.name,known:e.known===true}:null
 }
 if(kind==="npc"){const e=(r.npcs||[]).find(x=>x.id===targetId);return e?{entity:e,targetId:e.id,name:e.name,known:e.known===true}:null}
 if(kind==="faction"){const e=(r.factions||[]).find(x=>x.id===targetId);return e?{entity:e,targetId:e.id,name:e.name,known:e.known===true}:null}
 return null
}
function entityLocation(state,kind,entity){
 if(kind==="location")return entity;
 if(kind==="npc")return locationById(state,entity?.locationId)||null;
 return null
}
function factionHasPresenceAtLocation(state,factionId,locationId){
 return Boolean(locationId&&(state.world.registry?.npcs||[]).some(n=>n.factionId===factionId&&n.locationId===locationId))
}
function factionHasPresenceInRegion(state,factionId,region){
 if(!region)return false;
 const r=state.world.registry||{};
 return (r.npcs||[]).some(n=>n.factionId===factionId&&locationById(state,n.locationId)?.region===region)
}
function authorityFor(state,kind,target){
 const here=currentLocation(state),entity=target?.entity;
 const entityLoc=kind==="location"?entity:kind==="npc"?entityLocation(state,kind,entity):null;
 const origin=here||entityLoc||null;
 return {originLocationId:origin?.id||null,region:origin?.region||"",parentTargetKind:kind,parentTargetId:target?.targetId||""}
}
function consequenceWithinAuthority(state,parent,kind,target){
 if(!parent||!target||parent.scope==="WORLD")return Boolean(parent&&target);
 const authority=parent.authority||{},originId=authority.originLocationId||null,region=authority.region||"";
 if(parent.scope==="PERSONAL")return kind==="npc"&&target.targetId===parent.targetId;
 if(parent.scope==="FACTION")return kind==="faction"&&target.targetId===parent.targetId;
 if(parent.scope==="LOCAL"){
  if(!originId)return kind===parent.targetKind&&target.targetId===parent.targetId;
  if(kind==="location")return target.targetId===originId;
  if(kind==="npc")return entityLocation(state,kind,target.entity)?.id===originId;
  if(kind==="faction")return factionHasPresenceAtLocation(state,target.targetId,originId);
  return false
 }
 if(parent.scope==="REGIONAL"){
  if(!region)return kind===parent.targetKind&&target.targetId===parent.targetId;
  if(kind==="location")return target.entity?.region===region;
  if(kind==="npc")return entityLocation(state,kind,target.entity)?.region===region;
  if(kind==="faction")return factionHasPresenceInRegion(state,target.targetId,region);
  return false
 }
 return false
}
function scopeAllowsKind(scope,kind){return Boolean(TARGETS[scope]?.has(kind))}
function authorizeTarget(state,scope,kind,target){
 if(!scopeAllowsKind(scope,kind)||!target?.known)return false;
 if(scope==="WORLD")return true;
 const here=currentLocation(state),entity=target.entity;
 if(scope==="PERSONAL")return kind==="npc"&&(entity.companion?.status==="ACTIVE"||entityLocation(state,kind,entity)?.id===here?.id);
 if(scope==="LOCAL"){
  if(kind==="location")return entity.id===here?.id;
  if(kind==="npc")return entity.companion?.status==="ACTIVE"||entityLocation(state,kind,entity)?.id===here?.id;
  if(kind==="faction")return Boolean(here&&(state.world.registry?.npcs||[]).some(n=>n.factionId===entity.id&&n.locationId===here.id));
 }
 if(scope==="REGIONAL"){
  const region=here?.region;if(!region)return false;
  if(kind==="location")return entity.id===here?.id||Boolean(region&&entity.region===region);
  if(kind==="npc")return entityLocation(state,kind,entity)?.region===region;
  if(kind==="faction")return factionHasPresenceInRegion(state,entity.id,region);
 }
 if(scope==="FACTION")return kind==="faction";
 return false
}
function fieldSet(kind){return kind==="location"?LOCATION_FIELDS:kind==="npc"?NPC_FIELDS:kind==="faction"?FACTION_FIELDS:kind==="world"?WORLD_FIELDS:new Set()}
function mutationSchemaValid(kind,mutation){
 const op=String(mutation?.op||"").toUpperCase(),field=clean(mutation?.field,50);
 if(op==="STRUCTURE"){
  const v=mutation?.value;return ["location","faction","world"].includes(kind)&&field==="structure"&&v&&typeof v==="object"&&!Array.isArray(v)&&Boolean(clean(v.id,80))&&Boolean(clean(v.label,120))&&STRUCTURE_STATES.has(String(v.state||"").toUpperCase())
 }
 if(["ADD_TAG","REMOVE_TAG"].includes(op))return field==="statusTag"&&Boolean(clean(mutation?.value,60));
 if(op!=="DELTA"||!fieldSet(kind).has(field))return false;
 const e=String(mutation?.effect||"").toUpperCase();if(SEMANTIC_EFFECTS.has(e))return e!=="NONE";const n=Number(mutation?.value);return Number.isFinite(n)&&n!==0
}
function mutationAllowedForRoll(mutation,roll,outcome){
 if(!roll||roll.success!==false)return true;
 if(!["COST","MIXED"].includes(String(outcome||"").toUpperCase()))return false;
 const op=String(mutation?.op||"").toUpperCase();
 if(op==="STRUCTURE")return NEGATIVE_STRUCTURE_STATES.has(String(mutation?.value?.state||"").toUpperCase());
 if(op==="DELTA")return mutationDirection(mutation)<0;
 if(op==="ADD_TAG")return ["COST","MIXED"].includes(String(outcome||"").toUpperCase());
 return false
}
function mutateTag(tags,op,value){
 const tag=clean(value,60);if(!tag)return {changed:false};const before=[...tags];
 if(op==="ADD_TAG"&&!tags.includes(tag))tags.push(tag);
 if(op==="REMOVE_TAG"){const i=tags.indexOf(tag);if(i>=0)tags.splice(i,1)}
 return {changed:before.join("|")!==tags.join("|"),before,after:[...tags],field:"statusTag"}
}
function applyMutation(state,target,kind,mutation,limit){
 if(!mutationSchemaValid(kind,mutation))return {changed:false};
 const op=String(mutation?.op||"").toUpperCase(),field=clean(mutation?.field,50);
 if(op==="STRUCTURE"){
  const holder=kind==="world"?state.world.state:ensureEntityState(target,kind);holder.structures=Array.isArray(holder.structures)?holder.structures:[];
  const v=mutation.value,sid=clean(v.id,80),label=clean(v.label,120),next=String(v.state||"").toUpperCase(),note=clean(v.description,220),existing=holder.structures.find(x=>x.id===sid),before=existing?existing.state:null;
  if(existing){existing.label=label;existing.state=next;existing.description=note;existing.updatedDay=state.world.state.day}else holder.structures.push({id:sid,label,state:next,description:note,createdDay:state.world.state.day,updatedDay:state.world.state.day});
  return {changed:before!==next,field:"structure",structureId:sid,label,before,after:next}
 }
 if(["ADD_TAG","REMOVE_TAG"].includes(op)){
  const holder=kind==="world"?state.world.state:ensureEntityState(target,kind);holder.statusTags??=[];return mutateTag(holder.statusTags,op,mutation.value)
 }
 let delta=mutationDelta(mutation,limit);if(!delta)return {changed:false};
 if(kind==="location"){const ws=ensureEntityState(target,"location"),before=ws[field],after=clamp(before+delta,0,100);ws[field]=after;return {changed:before!==after,field,before,after,delta:after-before}}
 if(kind==="npc"){const before=Number(target[field]??0),after=clamp(before+delta,0,100);target[field]=after;return {changed:before!==after,field,before,after,delta:after-before}}
 if(kind==="faction"){
  if(field==="stability"){const ws=ensureEntityState(target,"faction"),before=ws.stability,after=clamp(before+delta,0,100);ws.stability=after;return {changed:before!==after,field,before,after,delta:after-before}}
  const before=Number(target[field]??(field==="resources"?50:25)),after=clamp(before+delta,0,100);target[field]=after;return {changed:before!==after,field,before,after,delta:after-before}
 }
 if(kind==="world"){
  if(field==="crisisPressure"){const crisis=ensureCrisis(state),before=crisis.pressure;if(delta>0)addCrisisPressure(state,delta,"PLAYER_IMPACT");else crisis.pressure=clamp(before+delta,0,100);const after=ensureCrisis(state).pressure;return {changed:before!==after,field,before,after,delta:after-before}}
  state.world.state.simulation??={tension:10,lastEventMinute:0,lastTickMinute:0,npcCursor:0,factionCursor:0,flags:{}};const before=Number(state.world.state.simulation.tension||0),after=clamp(before+delta,0,100);state.world.state.simulation.tension=after;return {changed:before!==after,field,before,after,delta:after-before}
 }
 return {changed:false}
}
function observableLocations(state,kind,target,raw=[]){
 const known=new Set((state.world.registry?.locations||[]).map(x=>x.id)),ids=[];
 for(const id of Array.isArray(raw)?raw:[])if(known.has(id)&&!ids.includes(id))ids.push(id);
 if(kind==="location"&&target?.targetId&&!ids.includes(target.targetId))ids.push(target.targetId);
 if(kind==="npc"){const id=target?.entity?.locationId;if(id&&known.has(id)&&!ids.includes(id))ids.push(id)}
 if(kind==="faction")for(const n of state.world.registry?.npcs||[]){if(n.factionId===target?.targetId&&n.locationId&&known.has(n.locationId)&&!ids.includes(n.locationId))ids.push(n.locationId)}
 return ids.slice(0,12)
}
export function validateImpactCandidate(input){
 const errors=[];if(input==null)return {valid:true,errors};
 if(!Array.isArray(input))return {valid:false,errors:["WORLD_IMPACTS_INVALID"]};
 for(const x of input.slice(0,3)){
  if(!x||typeof x!=="object"||Array.isArray(x)){errors.push("WORLD_IMPACT_SHAPE_INVALID");continue}
  const scope=String(x.scope||"").toUpperCase();
  if(!SCOPES.includes(scope))errors.push("WORLD_IMPACT_SCOPE_INVALID");
  if(!["location","npc","faction","world"].includes(x.targetKind))errors.push("WORLD_IMPACT_TARGET_INVALID");
  if(typeof x.targetId!=="string"||!x.targetId)errors.push("WORLD_IMPACT_TARGET_ID_INVALID");
  if(clean(x.title,120).length<3||clean(x.summary,400).length<8)errors.push("WORLD_IMPACT_TEXT_INVALID");
  if(x.mutations!=null&&!Array.isArray(x.mutations))errors.push("WORLD_IMPACT_MUTATIONS_INVALID");
  if(x.consequences!=null&&!Array.isArray(x.consequences))errors.push("WORLD_IMPACT_CONSEQUENCES_INVALID");
  if(x.timelineEffects!=null&&!Array.isArray(x.timelineEffects))errors.push("WORLD_IMPACT_TIMELINE_INVALID");
  const rv=validateRecognitionCandidate(x.recognition);if(!rv.valid)errors.push(...rv.errors)
 }
 return {valid:errors.length===0,errors:[...new Set(errors)]}
}
function scheduleConsequence(state,parent,raw,roll){
 const kind=raw?.targetKind||parent.targetKind,rawId=raw?.targetId||parent.targetId,target=resolveTarget(state,kind,rawId);
 if(!target||!authorizeTarget(state,parent.scope,kind,target)||!consequenceWithinAuthority(state,parent,kind,target))return null;
 const delay=clamp(Math.round(Number(raw?.delayMinutes)||0),30,43200),summary=clean(raw?.observableEffect,400);
 const mutations=(Array.isArray(raw?.mutations)?raw.mutations:[]).slice(0,5).filter(m=>mutationSchemaValid(kind,m)&&mutationAllowedForRoll(m,roll,parent.outcome));
 if(!summary||!mutations.length)return null;
 const item={id:uid("CON"),parentImpactId:parent.id,scope:parent.scope,targetKind:kind,targetId:target.targetId,targetName:target.name,dueMinute:(state.world.state.clock?.totalMinutes||0)+delay,observableEffect:summary,mutations:structuredClone(mutations),status:"SCHEDULED",createdDay:state.world.state.day,rollSuccess:roll?.success!==false,outcome:parent.outcome||"",observableAtLocationIds:observableLocations(state,kind,target,raw?.observableAtLocationIds),revealedAtMinute:null};
 ensureWorldImpact(state).queue.push(item);return item
}
export function applyWorldImpacts(state,input,context={}){
 const valid=validateImpactCandidate(input);if(!valid.valid)throw new Error(valid.errors.join(","));
 const impact=ensureWorldImpact(state),applied=[],capability=impactCapability(state,context.roll||null);
 for(const raw of (input||[]).slice(0,2)){
  const scope=String(raw.scope||"").toUpperCase();if(RANK[scope]>RANK[capability.maxScope])continue;
  const target=resolveTarget(state,raw.targetKind,raw.targetId);if(!target||!authorizeTarget(state,scope,raw.targetKind,target))continue;
  const outcome=String(raw.outcome||"").toUpperCase();
  const limit=LIMITS[scope],changes=[];
  for(const m of (raw.mutations||[]).slice(0,5)){if(!mutationAllowedForRoll(m,context.roll,outcome))continue;const c=applyMutation(state,target.entity,raw.targetKind,m,limit);if(c.changed)changes.push(c)}
  const timelineEffects=[];if(context.roll?.success!==false&&RANK[scope]>=RANK.REGIONAL)for(const e of (raw.timelineEffects||[]).slice(0,2)){const changed=applyTimelineImpact(state,e);if(changed)timelineEffects.push(changed)}
  const record={id:uid("IMP"),type:"PLAYER_IMPACT",visibility:"PLAYER_KNOWN",scope,targetKind:raw.targetKind,targetId:target.targetId,targetName:target.name,authority:authorityFor(state,raw.targetKind,target),title:clean(raw.title,120),summary:clean(raw.summary,400),reason:clean(raw.reason,300),outcome,rollSuccess:context.roll?.success!==false,changes,timelineEffects:timelineEffects.map(x=>({timelineId:x.timelineId,action:x.action})),day:state.world.state.day,minute:state.world.state.clock?.totalMinutes||0,at:Date.now()};
  const queued=[];for(const item of (raw.consequences||[]).slice(0,3)){const q=scheduleConsequence(state,record,item,context.roll);if(q)queued.push(q.id)}
  if(!changes.length&&!timelineEffects.length&&!queued.length)continue;
  record.queuedConsequences=queued;impact.records.push(record);
  const k=scope.toLowerCase();impact.influence[k]=(impact.influence[k]||0)+POINTS[scope];
  record.recognition=registerImpactRecognition(state,record,raw.recognition||{});
  state.events.push({id:uid("EV"),type:"WORLD_IMPACT",visibility:"PLAYER_KNOWN",impactId:record.id,scope,summary:record.title+"："+record.summary,day:state.world.state.day,at:Date.now()});
  applied.push(record)
 }
 return applied
}
function triggerVisibility(state,item){
 if(item.targetKind==="world")return "OBSERVABLE";
 const here=currentLocation(state);return here&&item.observableAtLocationIds?.includes(here.id)?"OBSERVABLE":"INTERNAL"
}
function compactQueue(impact){
 const pending=impact.queue.filter(x=>x.status==="SCHEDULED"),terminal=impact.queue.filter(x=>x.status!=="SCHEDULED").slice(-80);
 impact.queue=[...terminal,...pending]
}
export function processDueConsequences(state){
 const impact=ensureWorldImpact(state),now=state.world.state.clock?.totalMinutes||0,out=[];
 for(const item of impact.queue.filter(x=>x.status==="SCHEDULED"&&x.dueMinute<=now).sort((a,b)=>a.dueMinute-b.dueMinute).slice(0,8)){
  const parent=impact.records.find(x=>x.id===item.parentImpactId&&x.type==="PLAYER_IMPACT"),target=resolveTarget(state,item.targetKind,item.targetId);
  if(!parent||!target||!target.known||!scopeAllowsKind(item.scope,item.targetKind)||!consequenceWithinAuthority(state,parent,item.targetKind,target)){item.status="CANCELLED";item.cancelReason="AUTHORITY_INVALID";continue}
  const allowed=(item.mutations||[]).filter(m=>mutationSchemaValid(item.targetKind,m)&&mutationAllowedForRoll(m,{success:item.rollSuccess!==false},item.outcome)),changes=[];
  if(!allowed.length){item.status="CANCELLED";item.cancelReason="NO_VALID_MUTATION";continue}
  for(const m of allowed){const c=applyMutation(state,target.entity,item.targetKind,m,LIMITS[item.scope]||12);if(c.changed)changes.push(c)}
  item.status=changes.length?"TRIGGERED":"CANCELLED";item.triggeredDay=state.world.state.day;item.changes=changes;
  if(!changes.length){item.cancelReason="NO_STATE_CHANGE";continue}
  const visibility=triggerVisibility(state,item),record={id:uid("IMP"),type:"CONSEQUENCE",visibility,scope:item.scope,targetKind:item.targetKind,targetId:item.targetId,targetName:item.targetName,title:"延遲後果",summary:item.observableEffect,reason:"由先前的玩家行動引發",changes,day:state.world.state.day,minute:now,at:Date.now(),parentImpactId:item.parentImpactId,consequenceId:item.id};
  impact.records.push(record);item.recordId=record.id;
  state.events.push({id:uid("EV"),type:"WORLD_CONSEQUENCE",visibility,impactId:record.id,scope:item.scope,summary:item.observableEffect,day:state.world.state.day,at:Date.now()});
  if(visibility!=="INTERNAL")item.revealedAtMinute=now;
  out.push(record)
 }
 compactQueue(impact);return out
}
export function revealTriggeredConsequences(state){
 const impact=ensureWorldImpact(state),now=state.world.state.clock?.totalMinutes||0,here=currentLocation(state),out=[];
 if(!here)return out;
 for(const item of impact.queue.filter(x=>x.status==="TRIGGERED"&&!Number.isFinite(x.revealedAtMinute)&&x.observableAtLocationIds?.includes(here.id))){
  item.revealedAtMinute=now;const record=impact.records.find(x=>x.id===item.recordId);
  if(record)record.visibility="PLAYER_KNOWN";
  const ev={id:uid("EV"),type:"WORLD_CONSEQUENCE_DISCOVERED",visibility:"PLAYER_KNOWN",impactId:record?.id||"",scope:item.scope,summary:item.observableEffect,day:state.world.state.day,at:Date.now()};
  state.events.push(ev);out.push(ev)
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
 const base={capability:impactCapability(state),influence:{...impact.influence},recent:impact.records.filter(x=>x.visibility!=="INTERNAL").slice(-12).map(x=>({id:x.id,type:x.type,scope:x.scope,targetKind:x.targetKind,targetId:x.targetId,targetName:x.targetName,title:x.title,summary:x.summary,day:x.day})),entityStates};
 if(director)base.pendingConsequences=impact.queue.filter(x=>x.status==="SCHEDULED").slice(0,12).map(x=>({id:x.id,parentImpactId:x.parentImpactId,scope:x.scope,targetKind:x.targetKind,targetId:x.targetId,dueMinute:x.dueMinute,observableEffect:x.observableEffect}));
 return base
}
export function playerImpactRecords(state,limit=40){return ensureWorldImpact(state).records.filter(x=>["PLAYER_KNOWN","OBSERVABLE","RUMOR"].includes(x.visibility)).slice(-Math.max(0,limit))}
