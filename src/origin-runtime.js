import {recordKnowledgeEvidence} from "./knowledge-model.js?v=56000";

const clean=(v,max=300)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(rows,max=16)=>[...new Set((Array.isArray(rows)?rows:[]).map(x=>clean(x,120)).filter(Boolean))].slice(0,max);
const KNOWLEDGE_RULES=Object.freeze({
 EARTH_ONLY:{factLimit:0,worldName:false,calendar:false,spokenCommon:false,readCommon:false,identitySignal:"OUTSIDER",equipmentPolicy:"NONE",spawnPolicy:"UNREGISTERED_ARRIVAL",openingMode:"ZERO_LOCAL_KNOWLEDGE"},
 PARTIAL_LOCAL:{factLimit:3,worldName:true,calendar:true,spokenCommon:true,readCommon:true,identitySignal:"LOCAL_OR_UNKNOWN",equipmentPolicy:"WORLD_LOCAL_BASIC",spawnPolicy:"LOCAL_LIFE",openingMode:"PARTIAL_LOCAL"},
 BRIEFED_PARTIAL:{factLimit:2,worldName:true,calendar:false,spokenCommon:true,readCommon:true,identitySignal:"SPONSORED_OUTSIDER",equipmentPolicy:"SPONSOR_DEPENDENT",spawnPolicy:"SUMMONING_EVENT",openingMode:"BRIEFED"},
 HOST_FRAGMENTED:{factLimit:1,worldName:false,calendar:false,spokenCommon:true,readCommon:false,identitySignal:"HOST_IDENTITY",equipmentPolicy:"HOST_EXISTING",spawnPolicy:"HOST_LOCATION",openingMode:"FRAGMENTED"},
 LOCAL_BASELINE:{factLimit:6,worldName:true,calendar:true,spokenCommon:true,readCommon:true,identitySignal:"LOCAL",equipmentPolicy:"WORLD_LOCAL_BASIC",spawnPolicy:"LOCAL_HOME_OR_DUTY",openingMode:"LOCAL_BASELINE"},
 AMNESIA:{factLimit:0,worldName:false,calendar:false,spokenCommon:true,readCommon:false,identitySignal:"IDENTITY_UNCLEAR",equipmentPolicy:"UNKNOWN_EXISTING",spawnPolicy:"MEMORY_GAP",openingMode:"MEMORY_GAP"},
 CUSTOM:{factLimit:0,worldName:false,calendar:false,spokenCommon:false,readCommon:false,identitySignal:"CUSTOM_UNKNOWN",equipmentPolicy:"CUSTOM",spawnPolicy:"CUSTOM",openingMode:"CUSTOM"}
});

function profile(state){return state.player?.origin||{}}
function policy(state){
 const p=profile(state),key=String(p.knowledgePolicy||"CUSTOM").toUpperCase(),base=KNOWLEDGE_RULES[key]||KNOWLEDGE_RULES.CUSTOM,difficulty=String(state.world?.creation?.difficultyRules?.languageBarrier||"STANDARD").toUpperCase();
 return {...base,knowledgePolicy:key,languagePolicy:String(p.languagePolicy||"CUSTOM").toUpperCase(),legalStatus:String(p.legalStatus||"CUSTOM").toUpperCase(),openingBias:String(p.openingBias||"CUSTOM").toUpperCase(),readCommon:base.readCommon&&difficulty!=="HIGH"}
}
function publicFacts(state){
 return (state.world?.canon?.facts||[]).filter(x=>String(x.visibility||"").toLowerCase()==="public"&&x.id&&x.text)
}
function rankFacts(state,rows){
 const keys=[state.world?.bible?.startingLocation,state.world?.bible?.startingSettlement,state.world?.bible?.startingRegion].map(x=>clean(x,120)).filter(Boolean);
 return [...rows].sort((a,b)=>{
  const as=keys.some(k=>String(a.text).includes(k))?1:0,bs=keys.some(k=>String(b.text).includes(k))?1:0;
  if(as!==bs)return bs-as;return String(a.id).localeCompare(String(b.id))
 })
}
function grantOriginFact(state,fact){
 if((state.knowledge||[]).some(x=>x.factId===fact.id&&x.status==="VERIFIED"))return null;
 return recordKnowledgeEvidence(state,{title:"起源既有常識",text:fact.text,factId:fact.id,evidenceType:"OBSERVATION",sourceRef:{kind:"ORIGIN",originId:profile(state).id||null},sourceIndependence:1,verifiedByEngine:true,score:1})
}
function startingLocationRecord(state){
 const name=clean(state.world?.bible?.startingLocation,120)||clean(state.world?.state?.location,120)||clean(state.player?.location,120);
 return (state.world?.registry?.locations||[]).find(x=>x.name===name)||null
}
export function ensureOriginRuntime(state){
 state.player??={};const p=profile(state),rules=policy(state),existing=state.player.originRuntime&&typeof state.player.originRuntime==="object"?state.player.originRuntime:{};
 state.player.originRuntime={
  version:1,originId:clean(p.id,120)||"UNKNOWN",label:clean(p.label,120)||"未知起源",
  knowledgePolicy:rules.knowledgePolicy,languagePolicy:rules.languagePolicy,legalStatus:rules.legalStatus,openingBias:rules.openingBias,
  identitySignal:rules.identitySignal,equipmentPolicy:rules.equipmentPolicy,spawnPolicy:rules.spawnPolicy,openingMode:rules.openingMode,
  spokenLanguages:uniq(existing.spokenLanguages),readLanguages:uniq(existing.readLanguages),grantedFactIds:uniq(existing.grantedFactIds),
  phase:clean(existing.phase,40)||"UNAPPLIED",appliedRevision:Number(existing.appliedRevision)||null
 };
 return state.player.originRuntime
}
export function applyOriginRuntime(state,{phase="POST_CANON"}={}){
 const rt=ensureOriginRuntime(state),rules=policy(state),post=String(phase).toUpperCase()==="POST_CANON";
 rt.phase=post?"POST_CANON":"PRE_WORLD";rt.identitySignal=rules.identitySignal;rt.equipmentPolicy=rules.equipmentPolicy;rt.spawnPolicy=rules.spawnPolicy;rt.openingMode=rules.openingMode;
 const spoken=[],read=[];
 if(rules.spokenCommon)spoken.push("COMMON");if(rules.readCommon)read.push("COMMON");
 rt.spokenLanguages=uniq(spoken);rt.readLanguages=uniq(read);state.player.spokenLanguages=[...rt.spokenLanguages];state.player.languages=[...rt.readLanguages];
 state.player.identity={legalStatus:rules.legalStatus,signal:rules.identitySignal,recognizedLocally:["LOCAL","HOST_IDENTITY"].includes(rules.identitySignal),sponsorRef:null};
 state.player.startingEquipmentPolicy=rules.equipmentPolicy;
 if(!post)return rt;
 state.player.worldNameKnown=rules.worldName===true;state.player.calendarKnown=rules.calendar===true;
 const rows=rankFacts(state,publicFacts(state)).slice(0,Math.max(0,rules.factLimit)),granted=[];
 for(const fact of rows){const ev=grantOriginFact(state,fact);if(ev||state.knowledge.some(x=>x.factId===fact.id&&x.status==="VERIFIED"))granted.push(fact.id)}
 rt.grantedFactIds=uniq(granted);
 const loc=startingLocationRecord(state);if(loc&&rules.factLimit>0){loc.known=true;loc.discoveredDay??=Number(state.world?.state?.day)||1}
 rt.appliedRevision=Number(state.world?.version)||1;
 state.events??=[];if(!state.events.some(x=>x.type==="ORIGIN_RUNTIME_APPLIED"))state.events.push({id:"EV-ORIGIN-"+String(state.world?.id||"WORLD"),type:"ORIGIN_RUNTIME_APPLIED",visibility:"INTERNAL",originId:rt.originId,knowledgePolicy:rt.knowledgePolicy,day:Number(state.world?.state?.day)||1,at:Date.now()});
 return rt
}
export function originLanguageMode(state,npc=null){
 const rt=ensureOriginRuntime(state),npcLanguages=uniq(npc?.languages?.length?npc.languages:["COMMON"]),spoken=new Set(rt.spokenLanguages);
 if(npcLanguages.some(x=>spoken.has(x)))return rt.knowledgePolicy==="AMNESIA"?"FRAGMENTED":"FLUENT";
 return "GESTURE"
}
export function originNpcContext(state,npc=null){
 const rt=ensureOriginRuntime(state),languageMode=originLanguageMode(state,npc),signal=rt.identitySignal;
 return {
  originId:rt.originId,legalStatus:rt.legalStatus,identitySignal:signal,languageMode,
  reaction:signal==="LOCAL"?"FAMILIAR_BASELINE":signal==="HOST_IDENTITY"?"HOST_RECOGNITION_POSSIBLE":signal==="SPONSORED_OUTSIDER"?"SPONSOR_RECOGNITION_POSSIBLE":signal==="OUTSIDER"?"UNREGISTERED_OUTSIDER":"UNCERTAIN_IDENTITY",
  constraints:languageMode==="GESTURE"?["不可假裝雙方語言互通","只可依賴姿勢、表情、指向與極少量可推斷意思"]:languageMode==="FRAGMENTED"?["玩家可能能說話，但詞彙、閱讀或背景理解不完整"]:["可以正常交談，但 NPC 仍只知道自己的 knowledgeScope 與 memories"]
 }
}
export function originOpeningContract(state){
 const rt=ensureOriginRuntime(state),rules=policy(state);
 return {openingMode:rt.openingMode,worldNameKnown:state.player?.worldNameKnown===true||rules.worldName===true,calendarKnown:state.player?.calendarKnown===true||rules.calendar===true,identitySignal:rt.identitySignal,spawnPolicy:rt.spawnPolicy,equipmentPolicy:rt.equipmentPolicy,knowledgePolicy:rt.knowledgePolicy}
}
export function originRuntimeSnapshot(state,{director=false}={}){
 const rt=ensureOriginRuntime(state),base={originId:rt.originId,label:rt.label,knowledgePolicy:rt.knowledgePolicy,legalStatus:rt.legalStatus,identitySignal:rt.identitySignal,spokenLanguages:[...rt.spokenLanguages],readLanguages:[...rt.readLanguages],openingMode:rt.openingMode};
 if(director)return {...base,languagePolicy:rt.languagePolicy,equipmentPolicy:rt.equipmentPolicy,spawnPolicy:rt.spawnPolicy,grantedFactIds:[...rt.grantedFactIds],phase:rt.phase,appliedRevision:rt.appliedRevision};
 return base
}