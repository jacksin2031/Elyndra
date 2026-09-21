const clean=(v,max=200)=>typeof v==="string"?v.trim().slice(0,max):"";
const STATUS=new Set(["UNMATERIALIZED","RESERVED","MATERIALIZED","FAILED"]);
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
export function ensureGenerationClaims(state){
 state.world??={};state.world.generationClaims??={version:1,claims:[]};const root=state.world.generationClaims;
 root.version=1;root.claims=Array.isArray(root.claims)?root.claims:[];return root
}
function requiredRules(state){
 const all=[...(state.world?.constitution||[]),...(state.world?.creation?.constitution?.hardRules||[])],out=[];
 for(const row of all){const kind=String(row?.kind||"").toUpperCase(),term=clean(row?.term,160);if(kind==="REQUIRE"&&term)out.push({term,ruleId:clean(row.id,120)||null})}
 return out
}
export function syncGenerationClaimsFromConstitution(state){
 const root=ensureGenerationClaims(state);
 for(const rule of requiredRules(state)){
  const key="REQUIRED_ELEMENT:"+rule.term.toLowerCase();let claim=root.claims.find(x=>x.key===key);
  if(!claim){claim={id:"CLAIM-"+hash(key),key,type:"REQUIRED_ELEMENT",label:rule.term,requiredBy:"CONSTITUTION",ruleId:rule.ruleId,status:"UNMATERIALIZED",entityRefs:[],createdRevision:Number(state.world?.version)||1,materializedRevision:null};root.claims.push(claim)}
 }
 return root.claims
}
export function reserveGenerationClaim(state,claimId){
 const claim=ensureGenerationClaims(state).claims.find(x=>x.id===claimId);if(!claim||claim.status!=="UNMATERIALIZED")return null;claim.status="RESERVED";return claim
}
export function materializeGenerationClaim(state,claimId,entityRefs=[]){
 const claim=ensureGenerationClaims(state).claims.find(x=>x.id===claimId);if(!claim)return null;
 claim.status="MATERIALIZED";claim.entityRefs=[...new Set((Array.isArray(entityRefs)?entityRefs:[entityRefs]).map(x=>clean(x,160)).filter(Boolean))].slice(0,12);
 claim.materializedRevision=Number(state.world?.version)||1;return claim
}
export function failGenerationClaim(state,claimId,reason=""){
 const claim=ensureGenerationClaims(state).claims.find(x=>x.id===claimId);if(!claim)return null;claim.status="FAILED";claim.failureReason=clean(reason,240);return claim
}
export function generationClaimsSnapshot(state,{pendingOnly=false}={}){
 const rows=syncGenerationClaimsFromConstitution(state).filter(x=>!pendingOnly||x.status!=="MATERIALIZED");
 return rows.map(x=>structuredClone(x))
}
export function validateGenerationClaims(state){
 const rows=ensureGenerationClaims(state).claims,errors=[],ids=new Set();
 for(const x of rows){if(!x?.id||ids.has(x.id))errors.push("GENERATION_CLAIM_ID_INVALID");ids.add(x?.id);if(!STATUS.has(x?.status))errors.push("GENERATION_CLAIM_STATUS_INVALID");if(!clean(x?.label,160))errors.push("GENERATION_CLAIM_LABEL_INVALID")}
 return {valid:errors.length===0,errors:[...new Set(errors)]}
}
