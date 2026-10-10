import {generationClaimsSnapshot,reserveGenerationClaim,releaseGenerationClaim,materializeGenerationClaim,syncGenerationClaimsFromCausalStructure,constitutionForbidTerms,materialSatisfiesClaim} from "./generation-claims.js?v=57025";
import {pendingHistoryLegacyEchoes,reserveHistoryLegacyEcho,releaseHistoryLegacyEcho,materializeHistoryLegacyEcho} from "./history-legacy.js?v=57025";
import {ensureTravelNetwork} from "./travel-engine.js?v=57025";
import {pendingQuestContinuity,questContinuityIssues,questConditionReferenceIssues} from "./quest-contracts.js?v=61008";

const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(v,max=12)=>[...new Set((Array.isArray(v)?v:[v]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);
const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const REASONS=["PLAYER_REQUEST","WORLD_EDGE_UNDERDEFINED","WORLD_QUALITY_DROP","PERIODIC_CANON_REVIEW","CLAIM_MATERIALIZATION","BACKGROUND_GAMEPLAY","PROACTIVE_ENRICHMENT","STALL_RECOVERY"];
const PROVIDER_ABORT=/AI_TIMEOUT|AI_HTTP_(?:429|5\d\d)|Failed to fetch|fetch failed|NetworkError|ERR_NETWORK|Load failed|network request failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|connection (?:reset|closed|refused)|PROVIDER/i;
export const LAZY_PROMPT_VERSION="RUNTIME_EXPANSION_V5";
export const LAZY_VALIDATION_VERSION="LAZY_VALIDATION_V6";
function fingerprint(value){return hash(JSON.stringify(value??{})).toString(36)}
function providerAbortPlan(plan){return plan?.status==="ABORTED"&&PROVIDER_ABORT.test(String(plan?.abortReason||""))}
function activityTime(row){return Math.max(Number(row?.createdAt)||0,Number(row?.lastAttemptAt)||0,Number(row?.updatedAt)||0,Number(row?.abortedAt)||0,Number(row?.committedAt)||0)}
function lifecycleRank(row){return ({PLANNED:1,ABORTED:2,COMMITTED:3})[String(row?.status||"").toUpperCase()]||0}
function reconcileCommittedPlans(root){
 const byId=new Map(root.commits.map(row=>[String(row?.planId||""),row]).filter(([id])=>id));
 for(const commit of root.commits)root.generationRevision=Math.max(root.generationRevision,Number(commit?.replay?.generationRevision)||0);
 const reconciled=[];
 for(const plan of root.plans){
  const commit=byId.get(String(plan?.id||""));if(!commit)continue;
  if(plan.status!=="COMMITTED")reconciled.push(plan.id);
  plan.status="COMMITTED";plan.committedAt=Math.max(Number(plan.committedAt)||0,Number(commit.committedAt)||0)||undefined;
  plan.entityRefs=[...new Set([...(Array.isArray(plan.entityRefs)?plan.entityRefs:[]),...(Array.isArray(commit.entityRefs)?commit.entityRefs:[])].map(String).filter(Boolean))];
  delete plan.terminalFailure;delete plan.failureKind;delete plan.checkpoint
 }
 return reconciled
}

export function ensureLazyGeneration(state){
 state.world??={};state.world.lazyGeneration??={version:2,generationRevision:0,plans:[],commits:[]};const root=state.world.lazyGeneration;
 root.version=2;root.generationRevision=Math.max(0,Number(root.generationRevision)||0);
 const rows=Array.isArray(root.plans)?root.plans:[],deduped=new Map();
 for(const row of rows){
  const key=String(row?.id||"");if(!key)continue;
  const prior=deduped.get(key);if(!prior){deduped.set(key,row);continue}
  const rowTime=activityTime(row),priorTime=activityTime(prior),newer=rowTime>priorTime?row:rowTime<priorTime?prior:lifecycleRank(row)>lifecycleRank(prior)?row:prior;
  newer.attempts=Math.max(1,Number(row?.attempts)||1,Number(prior?.attempts)||1);deduped.set(key,newer)
 }
 root.plans=[...deduped.values()].slice(-80);root.commits=Array.isArray(root.commits)?root.commits.slice(-80):[];reconcileCommittedPlans(root);return root
}
export function reconcileLazyGenerationLifecycle(state){
 const root=ensureLazyGeneration(state),commitIds=new Set(root.commits.map(row=>String(row?.planId||"")).filter(Boolean));
 return {generationRevision:root.generationRevision,reconciledPlanIds:root.plans.filter(row=>commitIds.has(String(row?.id||""))).map(row=>row.id),activePlanIds:root.plans.filter(row=>row.status==="PLANNED").map(row=>row.id)}
}
function normalizeReason(reason){
 const q=String(reason||"BACKGROUND_GAMEPLAY").toUpperCase();
 for(const r of REASONS)if(q.includes(r))return r;
 return "BACKGROUND_GAMEPLAY"
}
function rotate(rows,seed,count){
 if(!rows.length||count<=0)return [];const start=seed%rows.length,out=[];for(let i=0;i<Math.min(count,rows.length);i++)out.push(rows[(start+i)%rows.length]);return out
}
function slotsFor(state,reason,hasClaims,domain=""){
 if(reason==="PROACTIVE_ENRICHMENT"){
  const d=String(domain||"").toUpperCase();return {locations:d==="GEOGRAPHY"?1:0,npcs:d==="CAST"?1:0,factions:d==="FACTION"?1:0,sideQuests:d==="QUEST"?1:0,definitions:0}
 }
 const politics=Number(state.world?.seedContract?.politics??state.world?.seed?.politics)||0,existing=state.world?.registry||{};
 if(reason==="STALL_RECOVERY"){const locationCount=(existing.locations||[]).length,npcCount=(existing.npcs||[]).length;return {locations:locationCount<4?1:0,npcs:npcCount<4?1:0,factions:0,sideQuests:0,definitions:0}}
 const slots={locations:1,npcs:1,factions:0,sideQuests:1,definitions:0};
 if(reason==="WORLD_EDGE_UNDERDEFINED"||reason==="PLAYER_REQUEST")slots.locations=2;
 if(reason==="WORLD_QUALITY_DROP"){slots.locations=1;slots.npcs=2}
 if(reason==="PERIODIC_CANON_REVIEW"){slots.locations=1;slots.npcs=1;slots.sideQuests=0}
 if((politics>=4&&(existing.factions||[]).length<2)||hasClaims)slots.factions=1;
 return slots
}
function pendingClaims(state){
 return generationClaimsSnapshot(state,{pendingOnly:true}).filter(x=>x.status==="UNMATERIALIZED"||x.status==="FAILED").sort((a,b)=>String(a.key).localeCompare(String(b.key)))
}
export function planLazyGeneration(state,{reason="BACKGROUND_GAMEPLAY",domain=""}={}){
 const root=ensureLazyGeneration(state);syncGenerationClaimsFromCausalStructure(state);
 const normalizedReason=normalizeReason(reason),enrichmentDomain=normalizedReason==="PROACTIVE_ENRICHMENT"&&["GEOGRAPHY","CAST","FACTION","QUEST"].includes(String(domain||"").toUpperCase())?String(domain).toUpperCase():"",region=clean(state.world?.state?.region,120)||"UNKNOWN",day=Math.max(1,Number(state.world?.state?.day)||1),evolution=Math.max(0,Number(state.world?.evolution?.count)||0);
 const active=root.plans.find(x=>x.status==="PLANNED"&&x.reason===normalizedReason&&String(x.domain||"")===enrichmentDomain&&x.region===region&&Number(x.day)===day&&Number(x.evolution)===evolution);if(active)return active;
 const generationRevision=root.generationRevision+1,matchingAborts=root.plans.filter(x=>x.status==="ABORTED"&&x.reason===normalizedReason&&x.region===region&&Number(x.day)===day&&Number(x.evolution)===evolution&&String(x.domain||"")===(enrichmentDomain||"")),rotatingAborts=matchingAborts.filter(row=>row.terminalFailure===true||providerAbortPlan(row)),claims=pendingClaims(state),legacyEchoes=pendingHistoryLegacyEchoes(state,{limit:12});
 let attemptEpoch=rotatingAborts.reduce((next,row)=>Math.max(next,(Number(row.attemptEpoch)||0)+1),0),key="",seed=0,planId="",reusableAbort=null;
 while(true){
  key=[state.world?.id||"WORLD",normalizedReason,region,day,evolution,generationRevision,"attempt="+attemptEpoch,"domain="+enrichmentDomain,claims.map(x=>x.id).join(","),legacyEchoes.map(x=>x.id).join(",")].join("|");seed=hash(key);planId="LGP-"+seed.toString(36);
  const collision=root.plans.find(x=>x.id===planId);if(!collision)break;if(collision.status==="PLANNED")return collision;
  if(collision.status==="ABORTED"&&collision.key===key&&collision.terminalFailure!==true&&!providerAbortPlan(collision)){reusableAbort=collision;break}
  attemptEpoch++
 }
 const history=(state.world?.history||[]).filter(x=>x?.id).sort((a,b)=>String(a.id).localeCompare(String(b.id))),historyRefs=rotate(history,seed,Math.min(2,history.length)).map(x=>x.id);
 const selectedClaims=enrichmentDomain?[]:rotate(claims,seed>>>5,Math.min(2,claims.length)),selectedEchoes=enrichmentDomain?[]:rotate(legacyEchoes,seed>>>9,Math.min(2,legacyEchoes.length)),definitionClaimCount=selectedClaims.filter(x=>x.type==="BLUEPRINT_DEFINITION").length,slots=slotsFor(state,normalizedReason,(selectedClaims.length-definitionClaimCount)>0||selectedEchoes.length>0,enrichmentDomain);slots.definitions=Math.min(3,definitionClaimCount);
 for(const e of selectedEchoes)if(e.kind==="MEMORIAL")slots.locations=Math.max(1,slots.locations);else if(e.kind==="ORAL_TRADITION")slots.npcs=Math.max(1,slots.npcs);
 const worldVersion=Number(state.world?.version)||1,totalMinutes=Math.max(0,Number(state.world?.state?.clock?.totalMinutes)||0),worldSeedFingerprint=fingerprint(state.world?.seedContract||state.world?.seed||{}),entitySeed=hash(key+"|ENTITY|"+generationRevision).toString(36),generationSlot={region,day,evolution,reason:normalizedReason};
 const plan={id:planId,key,seed,status:"PLANNED",reason:normalizedReason,domain:enrichmentDomain||null,requestedReason:clean(reason,220),region,day,evolution,worldVersion,generationRevision,attemptEpoch,worldSeedFingerprint,entitySeed,generationSlot,promptVersion:LAZY_PROMPT_VERSION,validationVersion:LAZY_VALIDATION_VERSION,generatedAtWorldTime:{day,totalMinutes},slots,forbiddenTerms:constitutionForbidTerms(state),historyRefs:[...new Set([...historyRefs,...selectedEchoes.map(x=>x.historyId)])],claimIds:selectedClaims.map(x=>x.id),claims:selectedClaims.map(x=>({id:x.id,type:x.type,label:x.label,requiredBy:x.requiredBy,definitionKind:x.definitionKind||null,slotIndex:x.slotIndex||0,sourceRef:x.sourceRef||null,historyRefs:[...(x.historyRefs||[])]})),legacyEchoIds:selectedEchoes.map(x=>x.id),legacyEchoes:selectedEchoes.map(x=>({id:x.id,kind:x.kind,label:x.label,historyId:x.historyId})),createdAt:Date.now(),lastAttemptAt:Date.now(),attempts:1};
 for(const c of selectedClaims)reserveGenerationClaim(state,c.id,{planId,reason:normalizedReason});for(const e of selectedEchoes)reserveHistoryLegacyEcho(state,e.id,{planId,reason:normalizedReason});
 if(reusableAbort){const index=root.plans.indexOf(reusableAbort);if(index>=0)root.plans[index]=plan;else root.plans.push(plan)}else root.plans.push(plan);root.plans=root.plans.slice(-80);return plan
}
function groupRows(g,key){return Array.isArray(g?.[key])?g[key]:[]}
function rowIdentity(key,row){
 return key==="definitions"?(String(row?.kind||"").toUpperCase()+":"+String(row?.name||"").trim().toLocaleLowerCase()):String(key==="sideQuests"?row?.title:row?.name||"").trim().toLocaleLowerCase()
}
function existingNames(state,key){
 const r=state.world?.registry||{},catalog=state.world?.catalog||{},rows=key==="sideQuests"?(r.sideQuests||[]):key==="definitions"?[...(catalog.civilizations||[]),...(catalog.species||[]),...(catalog.languages||[])]:r[key]||[];
 return new Set(rows.map(x=>rowIdentity(key,x)).filter(Boolean))
}
const normalizeForbidden=v=>String(v||"").normalize("NFKC").toLocaleLowerCase().replace(/[\s_\-—–、，,。.!！？?：:；;（）()\[\]{}「」『』【】〈〉《》"'\`´’‘“”·・\\/]+/g,"");
function forbiddenMatch(row,terms=[]){const hay=normalizeForbidden(JSON.stringify(row??{}));return terms.find(term=>{const needle=normalizeForbidden(term);return needle&&hay.includes(needle)})||null}
export function validateLazyGenerationCandidate(state,generation,plan,options={}){
 const errors=[];if(!plan||plan.status!=="PLANNED")return {valid:false,errors:["LAZY_PLAN_NOT_ACTIVE"]};
 const root=ensureLazyGeneration(state),checkpoint=plan.checkpoint&&typeof plan.checkpoint==="object"?plan.checkpoint:null,optionAdded=options?.added&&typeof options.added==="object"?options.added:null,checkpointAdded=checkpoint?.added&&typeof checkpoint.added==="object"?checkpoint.added:{},effectiveAdded=optionAdded||checkpointAdded,canonizedDelta=Object.values(effectiveAdded).some(rows=>Array.isArray(rows)&&rows.length)?1:0,expectedWorldVersion=checkpoint?Math.max(1,Number(checkpoint.worldVersion)||Number(plan.worldVersion)||1):(Number(plan.worldVersion)||1)+canonizedDelta,currentWorldVersion=Number(state.world?.version)||1;
 if(currentWorldVersion!==expectedWorldVersion)errors.push("LAZY_STALE_WORLD_VERSION");
 if(Number(plan.generationRevision)!==Number(root.generationRevision)+1)errors.push("LAZY_STALE_GENERATION_REVISION");
 for(const key of ["generationRevision","worldSeedFingerprint","entitySeed","generationSlot","promptVersion","validationVersion","generatedAtWorldTime"])if(plan[key]==null)errors.push("LAZY_REPLAY_METADATA_MISSING:"+key);
 if(plan.promptVersion!==LAZY_PROMPT_VERSION)errors.push("LAZY_PROMPT_VERSION_MISMATCH");if(plan.validationVersion!==LAZY_VALIDATION_VERSION)errors.push("LAZY_VALIDATION_VERSION_MISMATCH");
 const allowedHistory=new Set([...(state.world?.history||[]).map(x=>x?.id).filter(Boolean),...(plan.historyRefs||[]),...(plan.claims||[]).flatMap(x=>x.historyRefs||[])]);
 for(const key of ["locations","npcs","factions","sideQuests","definitions"]){
  const rows=groupRows(generation,key),limit=Math.max(0,Number(plan.slots?.[key])||0);if(rows.length>limit)errors.push("LAZY_SLOT_EXCEEDED:"+key);
  const existing=existingNames(state,key),canonized=new Set((effectiveAdded?.[key]||[]).map(x=>rowIdentity(key,x)).filter(Boolean)),candidateNames=new Set();
  for(const row of rows){
   const name=rowIdentity(key,row);
   if(name&&existing.has(name)&&!canonized.has(name))errors.push("LAZY_DUPLICATE_ENTITY:"+key+":"+name);
   if(name&&candidateNames.has(name))errors.push("LAZY_DUPLICATE_CANDIDATE:"+key+":"+name);if(name)candidateNames.add(name);
   const forbidden=forbiddenMatch(row,plan.forbiddenTerms||[]);if(forbidden)errors.push("LAZY_FORBIDDEN_TERM:"+forbidden);
   const refs=uniq(row?.historyRefs,8);if(key!=="definitions"&&(state.world?.history||[]).length&&refs.length===0)errors.push("LAZY_HISTORY_REF_REQUIRED:"+key);
   for(const id of refs)if(allowedHistory.size&&!allowedHistory.has(id))errors.push("LAZY_HISTORY_REF_OUTSIDE_PLAN:"+id);
   const claimRefs=uniq(row?.claimRefs,6);for(const id of claimRefs){if(!plan.claimIds.includes(id)){errors.push("LAZY_CLAIM_NOT_RESERVED:"+id);continue}const claim=(plan.claims||[]).find(x=>x.id===id);if(claim&&!materialSatisfiesClaim(claim,row))errors.push("LAZY_CLAIM_SEMANTIC_MISMATCH:"+id)};
   const echoRefs=uniq(row?.echoRefs,6);for(const id of echoRefs)if(!(plan.legacyEchoIds||[]).includes(id))errors.push("LAZY_ECHO_NOT_RESERVED:"+id);
   if(key==="sideQuests"){for(const issue of questContinuityIssues(row,state.world?.registry?.sideQuests||[]))errors.push("LAZY_"+issue);for(const issue of questConditionReferenceIssues(row,{...(state.world?.registry||{}),items:state.inventory||[],facts:(state.knowledge||[]).filter(x=>x.factId).map(x=>({id:x.factId})),events:state.events||[]}))errors.push("LAZY_"+issue)}
  }
 }
 const pendingQuest=pendingQuestContinuity(state.world?.registry?.sideQuests||[],1)[0]||null,questRows=groupRows(generation,"sideQuests");
 if(plan.reason==="PROACTIVE_ENRICHMENT"&&String(plan.domain||"").toUpperCase()==="QUEST"&&pendingQuest&&questRows.length&&!questRows.some(row=>(Array.isArray(row?.predecessorQuestIds)?row.predecessorQuestIds:[]).map(String).includes(String(pendingQuest.id))))errors.push("LAZY_QUEST_CONTINUITY_UNRESOLVED:"+pendingQuest.id);
 for(const claimId of plan.claimIds){
  const bound=["locations","npcs","factions","sideQuests","definitions"].some(key=>groupRows(generation,key).some(row=>uniq(row?.claimRefs,6).includes(claimId)));
  if(!bound)errors.push("LAZY_RESERVED_CLAIM_UNBOUND:"+claimId)
 }
 for(const echo of plan.legacyEchoes||[]){
  const allowed=echo.kind==="MEMORIAL"?["locations"]:echo.kind==="ORAL_TRADITION"?["npcs"]:[];
  const bound=allowed.some(key=>groupRows(generation,key).some(row=>uniq(row?.echoRefs,6).includes(echo.id)));
  if(!bound)errors.push("LAZY_RESERVED_ECHO_UNBOUND:"+echo.id)
 }
 return {valid:errors.length===0,errors:[...new Set(errors)],planId:plan.id}
}
function mergeCheckpointAdded(prior={},added={}){
 const out={locations:[],npcs:[],factions:[],sideQuests:[],definitions:[]};
 for(const key of Object.keys(out)){
  const map=new Map();
  for(const row of [...(prior?.[key]||[]),...(added?.[key]||[])]){const id=String(row?.id||rowIdentity(key,row)||"");if(id)map.set(id,structuredClone(row))}
  out[key]=[...map.values()]
 }
 return out
}
export function recordLazyGenerationCheckpoint(state,plan,{stage,generation,added={}}={}){
 if(!plan||plan.status!=="PLANNED")return {ok:false,error:"LAZY_PLAN_NOT_ACTIVE"};
 const prior=plan.checkpoint&&typeof plan.checkpoint==="object"?plan.checkpoint:{},completed=[...new Set([...(prior.completedStages||[]),clean(stage,80)].filter(Boolean))];
 plan.checkpoint={stage:clean(stage,80)||prior.stage||"",completedStages:completed,generation:structuredClone(generation||prior.generation||{}),added:mergeCheckpointAdded(prior.added,added),worldVersion:Number(state.world?.version)||1,updatedAt:Date.now()};
 plan.lastAttemptAt=Date.now();return {ok:true,checkpoint:plan.checkpoint}
}
export function hasLazyGenerationCheckpoint(plan){return Boolean(plan?.status==="PLANNED"&&plan?.checkpoint?.stage&&plan?.checkpoint?.generation)}

function addedIdFor(raw,added,key){
 const name=key==="definitions"?(String(raw?.kind||"").toUpperCase()+":"+String(raw?.name||"").trim().toLocaleLowerCase()):String(key==="sideQuests"?raw?.title:raw?.name||"").trim().toLocaleLowerCase(),rows=added?.[key]||[];
 const hit=rows.find(x=>(key==="definitions"?(String(x.kind||"").toUpperCase()+":"+String(x.name||"").trim().toLocaleLowerCase()):String(key==="sideQuests"?x.title:x.name||"").trim().toLocaleLowerCase())===name);return hit?.id||null
}
function recoveryAffordance(state,plan,added={}){
 if(!/FIRST_BUTTON_STALL_RECOVERY/i.test(String(plan?.requestedReason||"")))return null;
 const locations=state.world?.registry?.locations||[],newIds=new Set((added.locations||[]).map(x=>String(x?.id||"")).filter(Boolean)),currentName=String(state.player?.location||state.world?.state?.location||""),currentId=String(state.player?.locationId||state.world?.state?.locationId||"");
 const current=locations.find(x=>x?.id===currentId)||locations.find(x=>x?.id===currentName||x?.name===currentName);if(!current)return null;
 const candidates=locations.filter(x=>newIds.has(String(x?.id||""))&&x!==current&&!(Array.isArray(x?.accessRequirements)&&x.accessRequirements.length));if(!candidates.length)return null;
 ensureTravelNetwork(state);const routes=Array.isArray(state.world?.travel?.routes)?state.world.travel.routes:[],byId=new Map(locations.map(row=>[String(row?.id||""),row]));
 const routePath=(target)=>{
  const queue=[String(current.id)],previous=new Map(),seen=new Set([String(current.id)]);
  while(queue.length){const from=queue.shift();if(from===String(target.id))break;
   for(const route of routes){if(!route||route.open===false)continue;const a=String(route.fromId||""),b=String(route.toId||""),to=a===from?b:b===from?a:"";if(!to||seen.has(to))continue;const destination=byId.get(to);if(!destination)continue;if(to!==String(target.id)&&destination.known!==true)continue;seen.add(to);previous.set(to,{from,route});queue.push(to)}
  }
  const end=String(target.id);if(!seen.has(end))return null;const path=[];let cursor=end;while(cursor!==String(current.id)){const step=previous.get(cursor);if(!step)return null;path.unshift(step.route);cursor=step.from}return path
 };
 const reachable=candidates.map(target=>({target,path:routePath(target)})).filter(row=>row.path?.length).sort((a,b)=>String(a.target.id).localeCompare(String(b.target.id)))[0];if(!reachable)return null;
 const {target,path}=reachable;target.known=true;target.visibilityLock="KNOWN";target.revealedDay=target.revealedDay??Math.max(1,Number(state.world?.state?.day)||1);
 return {kind:"location",id:String(target.id||""),name:String(target.name||""),routeId:path[0]?.id||null,routeIds:path.map(x=>String(x.id||"")).filter(Boolean),reason:"FIRST_BUTTON_STALL_RECOVERY"}
}
export function commitLazyGeneration(state,plan,generation,added,meta={}){
 const root=ensureLazyGeneration(state),v=validateLazyGenerationCandidate(state,generation,plan,{added});if(!v.valid)return {ok:false,errors:v.errors};
 const bindings={},echoBindings={};
 for(const key of ["locations","npcs","factions","sideQuests","definitions"])for(const raw of groupRows(generation,key)){
  const id=addedIdFor(raw,added,key);if(!id)continue;
  for(const claimId of uniq(raw?.claimRefs,6)){bindings[claimId]??=[];bindings[claimId].push(id)}
  for(const echoId of uniq(raw?.echoRefs,6)){echoBindings[echoId]??=[];echoBindings[echoId].push(id)}
 }
 const missingClaims=plan.claimIds.filter(id=>!uniq(bindings[id]||[]).length),missingEchoes=(plan.legacyEchoIds||[]).filter(id=>!uniq(echoBindings[id]||[]).length);
 if(missingClaims.length||missingEchoes.length){
  for(const id of plan.claimIds||[])releaseGenerationClaim(state,id,"LAZY_COMMIT_ENTITY_MISSING");
  for(const id of plan.legacyEchoIds||[])releaseHistoryLegacyEcho(state,id,"LAZY_COMMIT_ENTITY_MISSING");
  return {ok:false,errors:[...missingClaims.map(x=>"LAZY_CLAIM_NOT_MATERIALIZED:"+x),...missingEchoes.map(x=>"LAZY_ECHO_NOT_MATERIALIZED:"+x)]}
 }
 for(const claimId of plan.claimIds)materializeGenerationClaim(state,claimId,uniq(bindings[claimId]||[]));
 for(const echoId of plan.legacyEchoIds||[])materializeHistoryLegacyEcho(state,echoId,uniq(echoBindings[echoId]||[]));
 const affordance=recoveryAffordance(state,plan,added);if(affordance)plan.recoveryAffordance=structuredClone(affordance);
 plan.status="COMMITTED";plan.committedAt=Date.now();plan.entityRefs=uniq(Object.values(added||{}).flat().map(x=>x?.id),24);root.generationRevision=Math.max(root.generationRevision,Number(plan.generationRevision)||0);
 const replay={generationRevision:plan.generationRevision,worldVersion:plan.worldVersion,worldSeedFingerprint:plan.worldSeedFingerprint,entitySeed:plan.entitySeed,generationSlot:structuredClone(plan.generationSlot),promptVersion:plan.promptVersion,validationVersion:plan.validationVersion,generatedAtWorldTime:structuredClone(plan.generatedAtWorldTime),sourceProvider:clean(meta.sourceProvider,80)||"UNKNOWN",sourceModel:clean(meta.sourceModel,120)||"UNKNOWN"};
 root.commits.push({planId:plan.id,day:plan.day,reason:plan.reason,requestedReason:plan.requestedReason,entityRefs:[...plan.entityRefs],claimIds:[...plan.claimIds],legacyEchoIds:[...(plan.legacyEchoIds||[])],worldVersion:Number(state.world?.version)||1,committedAt:plan.committedAt,recoveryAffordance:affordance?structuredClone(affordance):null,replay});root.commits=root.commits.slice(-80);
 return {ok:true,planId:plan.id,entityRefs:plan.entityRefs,claimIds:plan.claimIds,legacyEchoIds:plan.legacyEchoIds||[],recoveryAffordance:affordance||null,replay}
}
export function abortLazyGeneration(state,plan,reason=""){
 if(!plan)return false;for(const id of plan.claimIds||[])releaseGenerationClaim(state,id,reason||"LAZY_ABORTED");for(const id of plan.legacyEchoIds||[])releaseHistoryLegacyEcho(state,id,reason||"LAZY_ABORTED");plan.status="ABORTED";plan.attempts=Math.max(1,Number(plan.attempts)||1);plan.abortReason=clean(reason,240);plan.abortedAt=Date.now();plan.lastAttemptAt=plan.abortedAt;return true
}
export function failLazyGenerationTerminal(state,plan,reason="LAZY_CHECKPOINT_TERMINAL_FAILURE"){
 if(!abortLazyGeneration(state,plan,reason))return {ok:false,error:"LAZY_PLAN_MISSING"};
 delete plan.checkpoint;plan.terminalFailure=true;plan.failureKind="TERMINAL_CHECKPOINT";plan.failureRecordedAt=plan.abortedAt;
 return {ok:true,planId:plan.id,attemptEpoch:Number(plan.attemptEpoch)||0,status:plan.status,reason:plan.abortReason}
}
export function lazyGenerationSnapshot(state,{director=false}={}){
 const root=ensureLazyGeneration(state),active=root.plans.filter(x=>x.status==="PLANNED").slice(-4);
 return director?{version:root.version,generationRevision:root.generationRevision,active:structuredClone(active),recentCommits:structuredClone(root.commits.slice(-8))}:{version:root.version,generationRevision:root.generationRevision,pending:active.length,recentCommitCount:root.commits.slice(-8).length}
}
