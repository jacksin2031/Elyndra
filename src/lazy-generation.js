import {generationClaimsSnapshot,reserveGenerationClaim,releaseGenerationClaim,materializeGenerationClaim,syncGenerationClaimsFromCausalStructure} from "./generation-claims.js?v=44000";

const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(v,max=12)=>[...new Set((Array.isArray(v)?v:[v]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);
const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const REASONS=["PLAYER_REQUEST","WORLD_EDGE_UNDERDEFINED","WORLD_QUALITY_DROP","PERIODIC_CANON_REVIEW","CLAIM_MATERIALIZATION","BACKGROUND_GAMEPLAY"];

export function ensureLazyGeneration(state){
 state.world??={};state.world.lazyGeneration??={version:1,plans:[],commits:[]};const root=state.world.lazyGeneration;
 root.version=1;root.plans=Array.isArray(root.plans)?root.plans.slice(-80):[];root.commits=Array.isArray(root.commits)?root.commits.slice(-80):[];return root
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
 const slots={locations:1,npcs:1,factions:0,sideQuests:1};
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
 const normalizedReason=normalizeReason(reason),region=clean(state.world?.state?.region,120)||"UNKNOWN",day=Math.max(1,Number(state.world?.state?.day)||1),evolution=Math.max(0,Number(state.world?.evolution?.count)||0),claims=pendingClaims(state);
 const key=[state.world?.id||"WORLD",normalizedReason,region,day,evolution,claims.map(x=>x.id).join(",")].join("|"),seed=hash(key),planId="LGP-"+seed.toString(36);
 const existing=root.plans.find(x=>x.id===planId&&x.status==="PLANNED");if(existing)return existing;
 const history=(state.world?.history||[]).filter(x=>x?.id).sort((a,b)=>String(a.id).localeCompare(String(b.id))),historyRefs=rotate(history,seed,Math.min(2,history.length)).map(x=>x.id);
 const selectedClaims=rotate(claims,seed>>>5,Math.min(2,claims.length)),slots=slotsFor(state,normalizedReason,selectedClaims.length>0);
 const plan={id:planId,key,seed,status:"PLANNED",reason:normalizedReason,requestedReason:clean(reason,220),region,day,evolution,worldVersion:Number(state.world?.version)||1,slots,historyRefs,claimIds:selectedClaims.map(x=>x.id),claims:selectedClaims.map(x=>({id:x.id,type:x.type,label:x.label,historyRefs:[...(x.historyRefs||[])]})),createdAt:Date.now()};
 for(const c of selectedClaims)reserveGenerationClaim(state,c.id,{planId,reason:normalizedReason});
 root.plans.push(plan);root.plans=root.plans.slice(-80);return plan
}
function groupRows(g,key){return Array.isArray(g?.[key])?g[key]:[]}
function existingNames(state,key){
 const r=state.world?.registry||{},rows=key==="sideQuests"?(r.sideQuests||[]):r[key]||[];
 return new Set(rows.map(x=>String(key==="sideQuests"?x.title:x.name||"").trim().toLocaleLowerCase()).filter(Boolean))
}
export function validateLazyGenerationCandidate(state,generation,plan){
 const errors=[];if(!plan||plan.status!=="PLANNED")return {valid:false,errors:["LAZY_PLAN_NOT_ACTIVE"]};
 for(const key of ["locations","npcs","factions","sideQuests"]){
  const rows=groupRows(generation,key),limit=Math.max(0,Number(plan.slots?.[key])||0);if(rows.length>limit)errors.push("LAZY_SLOT_EXCEEDED:"+key);
  const names=existingNames(state,key);
  for(const row of rows){
   const name=String(key==="sideQuests"?row?.title:row?.name||"").trim().toLocaleLowerCase();if(name&&names.has(name))errors.push("LAZY_DUPLICATE_ENTITY:"+key+":"+name);
   const refs=uniq(row?.historyRefs,8);if((state.world?.history||[]).length&&refs.length===0)errors.push("LAZY_HISTORY_REF_REQUIRED:"+key);
   const claimRefs=uniq(row?.claimRefs,6);for(const id of claimRefs)if(!plan.claimIds.includes(id))errors.push("LAZY_CLAIM_NOT_RESERVED:"+id)
  }
 }
 for(const claimId of plan.claimIds){
  const bound=["locations","npcs","factions","sideQuests"].some(key=>groupRows(generation,key).some(row=>uniq(row?.claimRefs,6).includes(claimId)));
  if(!bound)errors.push("LAZY_RESERVED_CLAIM_UNBOUND:"+claimId)
 }
 return {valid:errors.length===0,errors:[...new Set(errors)],planId:plan.id}
}
function addedIdFor(raw,added,key){
 const name=String(key==="sideQuests"?raw?.title:raw?.name||"").trim().toLocaleLowerCase(),rows=added?.[key]||[];
 const hit=rows.find(x=>String(key==="sideQuests"?x.title:x.name||"").trim().toLocaleLowerCase()===name);return hit?.id||null
}
export function commitLazyGeneration(state,plan,generation,added){
 const root=ensureLazyGeneration(state),v=validateLazyGenerationCandidate(state,generation,plan);if(!v.valid)return {ok:false,errors:v.errors};
 const bindings={};
 for(const key of ["locations","npcs","factions","sideQuests"])for(const raw of groupRows(generation,key)){
  const id=addedIdFor(raw,added,key);if(!id)continue;for(const claimId of uniq(raw?.claimRefs,6)){bindings[claimId]??=[];bindings[claimId].push(id)}
 }
 const missing=[];
 for(const claimId of plan.claimIds){const refs=uniq(bindings[claimId]||[]);if(refs.length)materializeGenerationClaim(state,claimId,refs);else missing.push(claimId)}
 if(missing.length){for(const id of missing)releaseGenerationClaim(state,id,"LAZY_COMMIT_ENTITY_MISSING");return {ok:false,errors:missing.map(x=>"LAZY_CLAIM_NOT_MATERIALIZED:"+x)}}
 plan.status="COMMITTED";plan.committedAt=Date.now();plan.entityRefs=uniq(Object.values(added||{}).flat().map(x=>x?.id),24);
 root.commits.push({planId:plan.id,day:plan.day,reason:plan.reason,entityRefs:[...plan.entityRefs],claimIds:[...plan.claimIds],worldVersion:Number(state.world?.version)||1});root.commits=root.commits.slice(-80);
 return {ok:true,planId:plan.id,entityRefs:plan.entityRefs,claimIds:plan.claimIds}
}
export function abortLazyGeneration(state,plan,reason=""){
 if(!plan)return false;for(const id of plan.claimIds||[])releaseGenerationClaim(state,id,reason||"LAZY_ABORTED");plan.status="ABORTED";plan.abortReason=clean(reason,240);plan.abortedAt=Date.now();return true
}
export function lazyGenerationSnapshot(state,{director=false}={}){
 const root=ensureLazyGeneration(state),active=root.plans.filter(x=>x.status==="PLANNED").slice(-4);
 return director?{version:root.version,active:structuredClone(active),recentCommits:structuredClone(root.commits.slice(-8))}:{version:root.version,pending:active.length,recentCommitCount:root.commits.slice(-8).length}
}