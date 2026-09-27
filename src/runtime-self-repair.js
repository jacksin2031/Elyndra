import {integrityFingerprint,restoreStateSnapshot} from "./runtime-integrity.js?v=59013";

const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const list=v=>Array.isArray(v)?v:[];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const HIDDEN_START_POLICIES=new Set(["EARTH_ONLY","PARTIAL_LOCAL","HOST_FRAGMENTED","AMNESIA","CUSTOM"]);
const WORLD_NAME_REVEAL_EVENTS=new Set(["WORLD_NAME_DISCOVERED","WORLD_NAME_REVEALED","SET_WORLD_NAME_KNOWN"]);
const LOCATION_REVEAL_EVENTS=new Set(["LOCATION_DISCOVERED","LOCATION_REVEALED","REVEAL_ENTITY"]);

function runtime(state){
 state.runtimeRecovery??={version:1,attempts:0,repairs:0,rollbacks:0,lastAt:0,lastPhase:"",lastIssues:[],history:[],openingBoundaryChecked:false};
 const r=state.runtimeRecovery;
 r.version=1;r.attempts=Math.max(0,Number(r.attempts)||0);r.repairs=Math.max(0,Number(r.repairs)||0);r.rollbacks=Math.max(0,Number(r.rollbacks)||0);r.lastAt=Math.max(0,Number(r.lastAt)||0);r.lastPhase=clean(r.lastPhase,40);r.lastIssues=list(r.lastIssues).slice(-20);r.history=list(r.history).slice(-24);r.openingBoundaryChecked=r.openingBoundaryChecked===true;
 return r
}
function policy(state){return String(state?.player?.originRuntime?.knowledgePolicy||state?.player?.origin?.knowledgePolicy||"").toUpperCase()}
function openingBoundaryActive(state){return Math.max(1,Number(state?.world?.state?.day)||1)<=1&&state?.world?.experience?.opening?.hookEngaged!==true&&state?.runtimeRecovery?.openingBoundaryChecked!==true}
function worldNameEvidence(state){
 const name=clean(state?.world?.name,120);if(!name)return false;
 if(list(state?.events).some(e=>WORLD_NAME_REVEAL_EVENTS.has(String(e?.type||"").toUpperCase())))return true;
 return list(state?.knowledge).some(k=>["VERIFIED","CONFIRMED","SOURCE_CONFIRMED"].includes(String(k?.status||k?.beliefState||"").toUpperCase())&&(String(k?.text||"").includes(name)||String(k?.title||"").includes(name)))
}
function locationRecord(state){
 const token=clean(state?.player?.location||state?.world?.state?.location,160),rows=list(state?.world?.registry?.locations);
 return rows.find(x=>String(x?.id||"")===token||String(x?.name||"")===token)||null
}
function locationNameEvidence(state,loc){
 if(!loc)return false;const id=String(loc?.id||""),name=clean(loc?.name,120);
 if(loc.originKnown===true||loc.nameKnown===true)return true;
 if(list(state?.events).some(e=>LOCATION_REVEAL_EVENTS.has(String(e?.type||"").toUpperCase())&&(String(e?.id||e?.targetId||"")===id||String(e?.location||e?.name||"")===name)))return true;
 return list(state?.knowledge).some(k=>["VERIFIED","CONFIRMED","SOURCE_CONFIRMED"].includes(String(k?.status||k?.beliefState||"").toUpperCase())&&(name&&String(k?.text||"").includes(name)))
}
function issue(code,severity="MEDIUM",details={}){return {code,severity,...details}}
export function diagnoseRuntimeState(state,{phase="RUNTIME"}={}){
 const issues=[];if(!state||typeof state!=="object")return {ok:false,issues:[issue("STATE_MISSING","CRITICAL")],phase};
 const p=policy(state),loc=locationRecord(state),sync=state.stateSync,opening=openingBoundaryActive(state);
 if(opening&&HIDDEN_START_POLICIES.has(p)&&state?.player?.worldNameKnown===true&&!worldNameEvidence(state))issues.push(issue("KNOWLEDGE_WORLD_NAME_EARLY","HIGH",{policy:p}));
 if(opening&&HIDDEN_START_POLICIES.has(p)&&loc?.known===true&&!locationNameEvidence(state,loc))issues.push(issue("KNOWLEDGE_LOCATION_NAME_EARLY","HIGH",{policy:p,locationId:loc.id||null}));
 if(sync&&(!Number.isFinite(Number(sync.revision))||Number(sync.revision)<0))issues.push(issue("STATE_SYNC_REVISION_INVALID","HIGH",{revision:sync.revision}));
 if(state.player){const max=Math.max(1,Number(state.player.maxHp)||100),hp=Number(state.player.hp);if(!Number.isFinite(hp)||hp<0||hp>max)issues.push(issue("PLAYER_HP_OUT_OF_RANGE","MEDIUM",{hp,maxHp:max}))}
 if(state.world?.registry){for(const key of ["locations","npcs","factions","sideQuests"])if(!Array.isArray(state.world.registry[key]))issues.push(issue("REGISTRY_COLLECTION_INVALID","HIGH",{collection:key}))}
 if(!Array.isArray(state.suggestions))issues.push(issue("SUGGESTIONS_INVALID","LOW"));
 if(!Array.isArray(state.suggestionIntents))issues.push(issue("SUGGESTION_INTENTS_INVALID","LOW"));
 return {ok:issues.length===0,issues,phase}
}
function applySafeRepair(state,row){
 if(row.code==="KNOWLEDGE_WORLD_NAME_EARLY"){state.player.worldNameKnown=false;return true}
 if(row.code==="KNOWLEDGE_LOCATION_NAME_EARLY"){const loc=locationRecord(state);if(loc){loc.known=false;loc.visibilityLock=loc.visibilityLock||"UNSEEN";return true}return false}
 if(row.code==="STATE_SYNC_REVISION_INVALID"){state.stateSync.revision=Math.max(0,Math.round(Number(state.stateSync.revision)||0));return true}
 if(row.code==="PLAYER_HP_OUT_OF_RANGE"){const max=Math.max(1,Number(state.player.maxHp)||100);state.player.hp=clamp(Number(state.player.hp)||0,0,max);return true}
 if(row.code==="REGISTRY_COLLECTION_INVALID"){state.world.registry[row.collection]=[];return true}
 if(row.code==="SUGGESTIONS_INVALID"){state.suggestions=[];return true}
 if(row.code==="SUGGESTION_INTENTS_INVALID"){state.suggestionIntents=[];return true}
 return false
}
export function repairRuntimeState(state,{phase="RUNTIME",now=Date.now()}={}){
 if(!state||typeof state!=="object")return {ok:false,changed:false,rolledBack:false,issues:[issue("STATE_MISSING","CRITICAL")],repaired:[]};
 const r=runtime(state),before=structuredClone(state),canonBefore=integrityFingerprint(state?.world?.canon??null),openingCheck=openingBoundaryActive(state),diagnosis=diagnoseRuntimeState(state,{phase}),repaired=[];
 r.attempts+=1;r.lastAt=now;r.lastPhase=clean(phase,40)||"RUNTIME";
 for(const row of diagnosis.issues)if(applySafeRepair(state,row))repaired.push(row.code);
 const canonAfter=integrityFingerprint(state?.world?.canon??null);
 if(canonBefore!==canonAfter){restoreStateSnapshot(state,before);const rr=runtime(state);rr.rollbacks+=1;rr.lastAt=now;rr.lastPhase=clean(phase,40)||"RUNTIME";rr.lastIssues=["REPAIR_CANON_MUTATION_BLOCKED"];rr.history.push({at:now,phase:rr.lastPhase,changed:false,rolledBack:true,issues:[...rr.lastIssues]});rr.history=rr.history.slice(-24);return {ok:false,changed:false,rolledBack:true,issues:[issue("REPAIR_CANON_MUTATION_BLOCKED","CRITICAL")],repaired:[]}}
 const after=diagnoseRuntimeState(state,{phase}),changed=repaired.length>0;r.repairs+=changed?1:0;if(openingCheck&&String(phase).toUpperCase()==="MIGRATE")r.openingBoundaryChecked=true;r.lastIssues=after.issues.map(x=>x.code);r.history.push({at:now,phase:r.lastPhase,changed,rolledBack:false,repaired:[...repaired],remaining:[...r.lastIssues]});r.history=r.history.slice(-24);
 return {ok:after.ok,changed,rolledBack:false,issues:after.issues,repaired,canonBefore,canonAfter}
}
export function runtimeRecoverySnapshot(state){const r=runtime(state);return {version:r.version,attempts:r.attempts,repairs:r.repairs,rollbacks:r.rollbacks,lastAt:r.lastAt,lastPhase:r.lastPhase,lastIssues:[...r.lastIssues],openingBoundaryChecked:r.openingBoundaryChecked,history:r.history.slice(-8)}}
