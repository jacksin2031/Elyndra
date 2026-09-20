const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const VALID_LATENCY=new Set(["INSTANT","NEAR_INSTANT"]);
const VALID_RANGE=new Set(["LOCAL","REGIONAL","WORLD"]);
export function normalizeCommunicationSystem(input={},seed={}){
 const magic=Number(seed?.magic??seed?.seedContract?.magic??0);
 const fallback=magic>=3
  ?{name:"共鳴傳訊",medium:"魔法傳訊",description:"透過世界既有的共鳴術式進行遠距聯絡。"}
  :{name:"遠距聯絡網",medium:"通訊網絡",description:"透過世界既有的通訊節點進行遠距聯絡。"};
 return {
  name:clean(input?.name,80)||fallback.name,
  medium:clean(input?.medium,80)||fallback.medium,
  description:clean(input?.description,260)||fallback.description,
  latency:VALID_LATENCY.has(input?.latency)?input.latency:"INSTANT",
  range:VALID_RANGE.has(input?.range)?input.range:"WORLD",
  accessRule:"ENCOUNTERED",
  constraints:clean(input?.constraints,220)||"只有曾經真正接觸並建立聯絡的人物可以使用。"
 }
}
export function worldCommunication(state){
 const b=state.world?.bible||{};
 return normalizeCommunicationSystem(b.communication,state.world?.seedContract||state.world?.seed||{})
}
export function ensureNpcRemoteContact(state,npc){
 if(!npc)return null;
 npc.remoteContact??={established:false,blocked:false};
 if(npc.encountered===true&&npc.remoteContact.established!==true)npc.remoteContact.established=true;
 return npc.remoteContact
}
export function canRemoteContactNpc(state,npc){
 if(!npc||npc.alive===false||npc.known!==true||npc.encountered!==true)return false;
 const system=worldCommunication(state),contact=ensureNpcRemoteContact(state,npc);
 return VALID_LATENCY.has(system.latency)&&contact?.established===true&&contact?.blocked!==true
}
