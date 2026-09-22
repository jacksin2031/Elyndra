import {generationClaimsSnapshot,reserveGenerationClaim,releaseGenerationClaim,materializeGenerationClaim,syncGenerationClaimsFromCausalStructure,constitutionForbidTerms,materialSatisfiesClaim} from "./generation-claims.js?v=52000";
import {pendingHistoryLegacyEchoes,reserveHistoryLegacyEcho,releaseHistoryLegacyEcho,materializeHistoryLegacyEcho} from "./history-legacy.js?v=50000";

const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(v,max=12)=>[...new Set((Array.isArray(v)?v:[v]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);
const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const REASONS=["PLAYER_REQUEST","WORLD_EDGE_UNDERDEFINED","WORLD_QUALITY_DROP","PERIODIC_CANON_REVIEW","CLAIM_MATERIALIZATION","BACKGROUND_GAMEPLAY"];
export const LAZY_PROMPT_VERSION="RUNTIME_EXPANSION_V3";
export const LAZY_VALIDATION_VERSION="LAZY_VALIDATION_V4";
function fingerprint(value){return hash(JSON.stringify(value??{})).toString(36)}

export function ensureLazyGeneration(state){
 state.world??={};state.world.lazyGeneration??={version:2,generationRevision:0,plans:[],commits:[]};const root=state.world.lazyGeneration;
 root.version=2;root.generationRevision=Math.max(0,Number(root.generationRevision)||0);root.plans=Array.isArray(root.plans)?root.plans.slice(-80):[];root.commits=Array.isArray(root.commits)?root.commits.slice(-80):[];return root
}
function normalizeReason(reason){
 const q=String(reason||"BACKGROUND_GAMEPLAY").toUpperCase();
 for(const r of REASONS)if(q.includes(r))return r;
 return "BACKGROUND_GAMEPLAY"
}
function rotate(rows,seed,count){
 if(!rows.length||count<=0)return [];const start=seed%rows.length,out=[];for(let i=0;i<Math.min(count,rows.length);i++)out.push(rows[(start+i)%rows.length]);return out
}
function slotsFor(state,reason,hasClaims){
 const politics=Number(state.world?.seedContract?.politics??state.world?.seed?.politics)||0,existing=state.world?.registry||{};
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
export function planLazyGeneration(state,{reason="BACKGROUND_GAMEPLAY"}={}){
 const root=ensureLazyGeneration(state);syncGenerationClaimsFromCausalStructure(state);
 const normalizedReason=normalizeReason(reason),region=clean(state.world?.state?.region,120)||"UNKNOWN",day=Math.max(1,Number(state.world?.state?.day)||1),evolution=Math.max(0,Number(state.world?.evolution?.count)||0);
 const active=root.plans.find(x=>x.status==="PLANNED"&&x.reason===normalizedReason&&x.region===region&&Number(x.day)===day&&Number(x.evolution)===evolution);if(active)return active;
 const generationRevision=root.generationRevision+1,claims=pendingClaims(state),legacyEchoes=pendingHistoryLegacyEchoes(state,{limit:12}),key=[state.world?.id||"WORLD",normalizedReason,region,day,evolution,generationRevision,claims.map(x=>x.id).join(","),legacyEchoes.map(x=>x.id).join(",")].join("|"),seed=hash(key),planId="LGP-"+seed.toString(36);
 const existing=root.plans.find(x=>x.id===planId&&x.status==="PLANNED");if(existing)return existing;
 const history=(state.world?.history||[]).filter(x=>x?.id).sort((a,b)=>String(a.id).localeCompare(String(b.id))),historyRefs=rotate(history,seed,Math.min(2,history.length)).map(x=>x.id);
 const selectedClaims=rotate(claims,seed>>>5,Math.min(2,claims.length)),selectedEchoes=rotate(legacyEchoes,seed>>>9,Math.min(2,legacyEchoes.length)),definitionClaimCount=selectedClaims.filter(x=>x.type==="BLUEPRINT_DEFINITION").length,slots=slotsFor(state,normalizedReason,(selectedClaims.length-definitionClaimCount)>0||selectedEchoes.length>0);slots.definitions=Math.min(3,definitionClaimCount);
 for(const e of selectedEchoes)if(e.kind==="MEMORIAL")slots.locations=Math.max(1,slots.locations);else if(e.kind==="ORAL_TRADITION")slots.npcs=Math.max(1,slots.npcs);
 const worldVersion=Number(state.world?.version)||1,totalMinutes=Math.max(0,Number(state.world?.state?.clock?.totalMinutes)||0),worldSeedFingerprint=fingerprint(state.world?.seedContract||state.world?.seed||{}),entitySeed=hash(key+"|ENTITY|"+generationRevision).toString(36),generationSlot={region,day,evolution,reason:normalizedReason};
 const plan={id:planId,key,seed,status:"PLANNED",reason:normalizedReason,requestedReason:clean(reason,220),region,day,evolution,worldVersion,generationRevision,worldSeedFingerprint,entitySeed,generationSlot,promptVersion:LAZY_PROMPT_VERSION,validationVersion:LAZY_VALIDATION_VERSION,generatedAtWorldTime:{day,totalMinutes},slots,forbiddenTerms:constitutionForbidTerms(state),historyRefs:[...new Set([...historyRefs,...selectedEchoes.map(x=>x.historyId)])],claimIds:selectedClaims.map(x=>x.id),claims:selectedClaims.map(x=>({id:x.id,type:x.type,label:x.label,requiredBy:x.requiredBy,definitionKind:x.definitionKind||null,slotIndex:x.slotIndex||0,sourceRef:x.sourceRef||null,historyRefs:[...(x.historyRefs||[])]})),legacyEchoIds:selectedEchoes.map(x=>x.id),legacyEchoes:selectedEchoes.map(x=>({id:x.id,kind:x.kind,label:x.label,historyId:x.historyId})),createdAt:Date.now()};
 for(const c of selectedClaims)reserveGenerationClaim(state,c.id,{planId,reason:normalizedReason});for(const e of selectedEchoes)reserveHistoryLegacyEcho(state,e.id,{planId,reason:normalizedReason});
 root.plans.push(plan);root.plans=root.plans.slice(-80);return plan
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
function forbiddenMatch(row,terms=[]){const semantic={name:row?.name,title:row?.title,type:row?.type,kind:row?.kind,role:row?.role,description:row?.description,objective:row?.objective,goal:row?.goal,traits:row?.traits,regions:row?.regions,culture:row?.culture,trade:row?.trade,lore:row?.lore,companionProfile:row?.companionProfile};const hay=normalizeForbidden(JSON.stringify(semantic));return terms.find(term=>{const needle=normalizeForbidden(term);return needle&&hay.includes(needle)})||null}
export function validateLazyGenerationCandidate(state,generation,plan,options={}){
 const errors=[];if(!plan||plan.status!=="PLANNED")return {valid:false,errors:["LAZY_PLAN_NOT_ACTIVE"]};
 for(const key of ["generationRevision","worldSeedFingerprint","entitySeed","generationSlot","promptVersion","validationVersion","generatedAtWorldTime"])if(plan[key]==null)errors.push("LAZY_REPLAY_METADATA_MISSING:"+key);
 if(plan.promptVersion!==LAZY_PROMPT_VERSION)errors.push("LAZY_PROMPT_VERSION_MISMATCH");if(plan.validationVersion!==LAZY_VALIDATION_VERSION)errors.push("LAZY_VALIDATION_VERSION_MISMATCH");
 const allowedHistory=new Set([...(plan.historyRefs||[]),...(plan.claims||[]).flatMap(x=>x.historyRefs||[])]);
 for(const key of ["locations","npcs","factions","sideQuests","definitions"]){
  const rows=groupRows(generation,key),limit=Math.max(0,Number(plan.slots?.[key])||0);if(rows.length>limit)errors.push("LAZY_SLOT_EXCEEDED:"+key);
  const existing=existingNames(state,key),canonized=new Set((options?.added?.[key]||[]).map(x=>rowIdentity(key,x)).filter(Boolean)),candidateNames=new Set();
  for(const row of rows){
   const name=rowIdentity(key,row);
   if(name&&existing.has(name)&&!canonized.has(name))errors.push("LAZY_DUPLICATE_ENTITY:"+key+":"+name);
   if(name&&candidateNames.has(name))errors.push("LAZY_DUPLICATE_CANDIDATE:"+key+":"+name);if(name)candidateNames.add(name);
   const forbidden=forbiddenMatch(row,plan.forbiddenTerms||[]);if(forbidden)errors.push("LAZY_FORBIDDEN_TERM:"+forbidden);
   const refs=uniq(row?.historyRefs,8);if(key!=="definitions"&&(state.world?.history||[]).length&&refs.length===0)errors.push("LAZY_HISTORY_REF_REQUIRED:"+key);
   for(const id of refs)if(allowedHistory.size&&!allowedHistory.has(id))errors.push("LAZY_HISTORY_REF_OUTSIDE_PLAN:"+id);
   const claimRefs=uniq(row?.claimRefs,6);for(const id of claimRefs){if(!plan.claimIds.includes(id)){errors.push("LAZY_CLAIM_NOT_RESERVED:"+id);continue}const claim=(plan.claims||[]).find(x=>x.id===id);if(claim&&!materialSatisfiesClaim(claim,row))errors.push("LAZY_CLAIM_SEMANTIC_MISMATCH:"+id)};
   const echoRefs=uniq(row?.echoRefs,6);for(const id of echoRefs)if(!(plan.legacyEchoIds||[]).includes(id))errors.push("LAZY_ECHO_NOT_RESERVED:"+id)
  }
 }
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
function addedIdFor(raw,added,key){
 const name=key==="definitions"?(String(raw?.kind||"").toUpperCase()+":"+String(raw?.name||"").trim().toLocaleLowerCase()):String(key==="sideQuests"?raw?.title:raw?.name||"").trim().toLocaleLowerCase(),rows=added?.[key]||[];
 const hit=rows.find(x=>(key==="definitions"?(String(x.kind||"").toUpperCase()+":"+String(x.name||"").trim().toLocaleLowerCase()):String(key==="sideQuests"?x.title:x.name||"").trim().toLocaleLowerCase())===name);return hit?.id||null
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
 plan.status="COMMITTED";plan.committedAt=Date.now();plan.entityRefs=uniq(Object.values(added||{}).flat().map(x=>x?.id),24);root.generationRevision=Math.max(root.generationRevision,Number(plan.generationRevision)||0);
 const replay={generationRevision:plan.generationRevision,worldVersion:plan.worldVersion,worldSeedFingerprint:plan.worldSeedFingerprint,entitySeed:plan.entitySeed,generationSlot:structuredClone(plan.generationSlot),promptVersion:plan.promptVersion,validationVersion:plan.validationVersion,generatedAtWorldTime:structuredClone(plan.generatedAtWorldTime),sourceProvider:clean(meta.sourceProvider,80)||"UNKNOWN",sourceModel:clean(meta.sourceModel,120)||"UNKNOWN"};
 root.commits.push({planId:plan.id,day:plan.day,reason:plan.reason,entityRefs:[...plan.entityRefs],claimIds:[...plan.claimIds],legacyEchoIds:[...(plan.legacyEchoIds||[])],worldVersion:Number(state.world?.version)||1,replay});root.commits=root.commits.slice(-80);
 return {ok:true,planId:plan.id,entityRefs:plan.entityRefs,claimIds:plan.claimIds,legacyEchoIds:plan.legacyEchoIds||[],replay}
}
export function abortLazyGeneration(state,plan,reason=""){
 if(!plan)return false;for(const id of plan.claimIds||[])releaseGenerationClaim(state,id,reason||"LAZY_ABORTED");for(const id of plan.legacyEchoIds||[])releaseHistoryLegacyEcho(state,id,reason||"LAZY_ABORTED");plan.status="ABORTED";plan.abortReason=clean(reason,240);plan.abortedAt=Date.now();return true
}
export function lazyGenerationSnapshot(state,{director=false}={}){
 const root=ensureLazyGeneration(state),active=root.plans.filter(x=>x.status==="PLANNED").slice(-4);
 return director?{version:root.version,generationRevision:root.generationRevision,active:structuredClone(active),recentCommits:structuredClone(root.commits.slice(-8))}:{version:root.version,generationRevision:root.generationRevision,pending:active.length,recentCommitCount:root.commits.slice(-8).length}
}