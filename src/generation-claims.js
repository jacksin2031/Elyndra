import {worldCatalogDefinitions,ensureWorldCatalog} from "./world-catalog.js?v=56000";

const clean=(v,max=200)=>typeof v==="string"?v.trim().slice(0,max):"";
const STATUS=new Set(["UNMATERIALIZED","RESERVED","MATERIALIZED","FAILED"]);
const TYPES=new Set(["REQUIRED_ELEMENT","BLUEPRINT_DEFINITION","HISTORY_ANCHOR","FUTURE_ANCHOR"]);
const DEFINITION_KINDS=new Set(["CIVILIZATION","SPECIES","LANGUAGE"]);
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function uniq(v,max=12){return [...new Set((Array.isArray(v)?v:[v]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max)}
const norm=v=>String(v||"").normalize("NFKC").toLocaleLowerCase().replace(/[\s_\-—–、，,。.!！？?：:；;（）()\[\]{}「」『』【】〈〉《》"'\`´’‘“”·・\\/]+/g,"");

export function ensureGenerationClaims(state){
 state.world??={};state.world.generationClaims??={version:3,claims:[]};const root=state.world.generationClaims;
 root.version=3;root.claims=Array.isArray(root.claims)?root.claims:[];
 for(const c of root.claims){
  c.type=TYPES.has(String(c.type||"").toUpperCase())?String(c.type).toUpperCase():"REQUIRED_ELEMENT";
  c.status=STATUS.has(String(c.status||"").toUpperCase())?String(c.status).toUpperCase():"UNMATERIALIZED";
  c.entityRefs=uniq(c.entityRefs);c.historyRefs=uniq(c.historyRefs,8);c.sourceRef=clean(c.sourceRef,160)||null;
  c.definitionKind=DEFINITION_KINDS.has(String(c.definitionKind||"").toUpperCase())?String(c.definitionKind).toUpperCase():null;
  c.slotIndex=Math.max(0,Number(c.slotIndex)||0);
  c.reservation=c.reservation&&typeof c.reservation==="object"?c.reservation:null;if(c.status==="RESERVED"&&!c.reservation)c.status="UNMATERIALIZED"
 }
 ensureWorldCatalog(state);return root
}
function constitutionRules(state){
 return [...(state.world?.constitution||[]),...(state.world?.creation?.constitution?.hardRules||[])]
}
function requiredRules(state){
 const out=[];for(const row of constitutionRules(state)){const kind=String(row?.kind||"").toUpperCase(),term=clean(row?.term,160);if(kind==="REQUIRE"&&term)out.push({term,ruleId:clean(row.id,120)||null})}return out
}
function countRules(state){
 const out=[];for(const row of constitutionRules(state)){
  if(String(row?.kind||"").toUpperCase()!=="COUNT_REQUIREMENT")continue;
  const target=String(row?.target||"").toUpperCase(),minimum=Math.max(0,Math.min(24,Math.round(Number(row?.minimum)||0)));
  if(DEFINITION_KINDS.has(target)&&minimum)out.push({target,minimum,ruleId:clean(row.id,120)||null})
 }
 const p=state.world?.creation?.blueprintProfile||state.world?.seedContract?.blueprintProfile||null;
 const fallbacks=[["CIVILIZATION",p?.civilizationCount?.value],["SPECIES",p?.speciesCount?.value],["LANGUAGE",p?.languageCount?.value]];
 for(const [target,value] of fallbacks){
  if(out.some(x=>x.target===target))continue;const minimum=Math.max(0,Math.min(24,Math.round(Number(value)||0)));if(minimum)out.push({target,minimum,ruleId:null})
 }
 return out
}
export function constitutionForbidTerms(state){
 const terms=[];for(const row of constitutionRules(state))if(String(row?.kind||"").toUpperCase()==="FORBID"&&clean(row?.term,160))terms.push(clean(row.term,160));
 for(const term of state.world?.creation?.blueprintProfile?.forbidden||[])if(clean(term,160))terms.push(clean(term,160));
 return [...new Set(terms)]
}
export function forbiddenTermMatch(state,value){
 const source=typeof value==="string"?value:JSON.stringify(value??{});return constitutionForbidTerms(state).find(term=>positiveMaterialMention({description:source},term))||null
}
function upsert(state,input){
 const root=ensureGenerationClaims(state),key=clean(input.key,220);if(!key)return null;
 let claim=root.claims.find(x=>x.key===key);
 if(!claim){
  claim={id:"CLAIM-"+hash(key),key,type:TYPES.has(input.type)?input.type:"REQUIRED_ELEMENT",label:clean(input.label,180),requiredBy:clean(input.requiredBy,80)||"CAUSAL_CORE",ruleId:clean(input.ruleId,120)||null,sourceRef:clean(input.sourceRef,160)||null,historyRefs:uniq(input.historyRefs,8),definitionKind:DEFINITION_KINDS.has(input.definitionKind)?input.definitionKind:null,slotIndex:Math.max(0,Number(input.slotIndex)||0),status:"UNMATERIALIZED",entityRefs:[],createdRevision:Number(state.world?.version)||1,materializedRevision:null,reservation:null};
  root.claims.push(claim)
 }else{
  if(input.label)claim.label=clean(input.label,180);if(input.sourceRef)claim.sourceRef=clean(input.sourceRef,160);if(input.historyRefs)claim.historyRefs=uniq(input.historyRefs,8);
  if(DEFINITION_KINDS.has(input.definitionKind))claim.definitionKind=input.definitionKind;if(input.slotIndex!=null)claim.slotIndex=Math.max(0,Number(input.slotIndex)||0)
 }
 return claim
}
export function syncGenerationClaimsFromConstitution(state){
 for(const rule of requiredRules(state)){
  const key="REQUIRED_ELEMENT:"+rule.term.toLowerCase();
  upsert(state,{key,type:"REQUIRED_ELEMENT",label:rule.term,requiredBy:"CONSTITUTION",ruleId:rule.ruleId})
 }
 for(const rule of countRules(state))for(let i=1;i<=rule.minimum;i++){
  const label={CIVILIZATION:"主要文明／部落",SPECIES:"智慧種族",LANGUAGE:"語言"}[rule.target]+" #"+i;
  upsert(state,{key:"BLUEPRINT_DEFINITION:"+rule.target+":"+i,type:"BLUEPRINT_DEFINITION",label,requiredBy:"BLUEPRINT",ruleId:rule.ruleId,definitionKind:rule.target,slotIndex:i})
 }
 return ensureGenerationClaims(state).claims
}
function registryEntities(state){
 const r=state.world?.registry||{},facts=Array.isArray(state.world?.canon?.facts)?state.world.canon.facts:[];return [
  ...(r.locations||[]).map(x=>({kind:"location",id:x.id,name:x.name,description:x.description,historyRefs:x.historyRefs||[]})),
  ...(r.npcs||[]).map(x=>({kind:"npc",id:x.id,name:x.name,description:x.description,historyRefs:x.historyRefs||[]})),
  ...(r.factions||[]).map(x=>({kind:"faction",id:x.id,name:x.name,description:x.description,historyRefs:x.historyRefs||[]})),
  ...(r.sideQuests||[]).map(x=>({kind:"sideQuest",id:x.id,name:x.title,description:x.objective,historyRefs:x.historyRefs||[]})),
  ...facts.filter(x=>x?.id).map(x=>({kind:"fact",id:x.id,name:x.title||"",description:x.text||"",historyRefs:x.historyId?[x.historyId]:[]}))
 ]}
function searchableRaw(row){return [row?.name,row?.description,...(row?.traits||[]),...(row?.regions||[])].filter(Boolean).join(" ")}
function positiveMaterialMention(row,term){
 const source=String(searchableRaw(row)||"").normalize("NFKC").toLocaleLowerCase(),needle=String(term||"").normalize("NFKC").toLocaleLowerCase();if(!needle)return false;
 let at=source.indexOf(needle);while(at>=0){const before=source.slice(Math.max(0,at-28),at),after=source.slice(at+needle.length,Math.min(source.length,at+needle.length+24));const negated=/(?:沒有|不存在|並不存在|從未存在|禁止|不得|不可|排除|無此|without|forbid|prohibit|does not exist|never existed|no\s*$)/i.test(before)||/^(?:並)?(?:不存在|沒有|並無|被禁止|does not exist|is forbidden)/i.test(after.trim());if(!negated)return true;at=source.indexOf(needle,at+needle.length)}return false
}
export function materialSatisfiesClaim(claim,row){
 if(!claim||!row)return false;
 if(claim.type==="BLUEPRINT_DEFINITION")return String(row.kind||"").toUpperCase()===claim.definitionKind;
 if(claim.type==="REQUIRED_ELEMENT")return positiveMaterialMention(row,claim.label);
 if(claim.type==="HISTORY_ANCHOR")return Boolean(claim.sourceRef&&(row.historyRefs||[]).includes(claim.sourceRef));
 if(claim.type==="FUTURE_ANCHOR")return Boolean((claim.historyRefs||[]).some(id=>(row.historyRefs||[]).includes(id)));
 return false
}
export function syncGenerationClaimsFromCausalStructure(state){
 syncGenerationClaimsFromConstitution(state);
 const entities=registryEntities(state),history=Array.isArray(state.world?.history)?state.world.history:[],futures=Array.isArray(state.world?.futures)?state.world.futures:[];
 for(const h of history.slice(0,24)){
  if(!h?.id)continue;const refs=entities.filter(e=>e.historyRefs.includes(h.id)).map(e=>e.id);
  const c=upsert(state,{key:"HISTORY_ANCHOR:"+h.id,type:"HISTORY_ANCHOR",label:"可探索的歷史遺產："+clean(h.title,120),requiredBy:"HISTORY",sourceRef:h.id,historyRefs:[h.id]});
  if(refs.length&&c?.status!=="MATERIALIZED")materializeGenerationClaim(state,c.id,refs)
 }
 for(const f of futures.filter(x=>!x?.legacyMirror).slice(0,16)){
  const histories=uniq(f.historicalLinks,6);if(!f?.id||!histories.length)continue;
  const refs=entities.filter(e=>e.historyRefs.some(id=>histories.includes(id))).map(e=>e.id);
  const c=upsert(state,{key:"FUTURE_ANCHOR:"+f.id,type:"FUTURE_ANCHOR",label:"與未來壓力相連的可探索來源",requiredBy:"FUTURE",sourceRef:f.id,historyRefs:histories});
  if(refs.length&&c?.status!=="MATERIALIZED")materializeGenerationClaim(state,c.id,refs)
 }
 reconcileGenerationClaims(state);return ensureGenerationClaims(state).claims
}
export function reserveGenerationClaim(state,claimId,meta={}){
 const claim=ensureGenerationClaims(state).claims.find(x=>x.id===claimId);if(!claim||!["UNMATERIALIZED","FAILED"].includes(claim.status))return null;
 claim.status="RESERVED";claim.failureReason="";claim.reservation={planId:clean(meta.planId,160)||null,reason:clean(meta.reason,180)||"",reservedAtRevision:Number(state.world?.version)||1};return claim
}
export function releaseGenerationClaim(state,claimId,reason=""){
 const claim=ensureGenerationClaims(state).claims.find(x=>x.id===claimId);if(!claim||claim.status!=="RESERVED")return null;
 claim.status="UNMATERIALIZED";claim.reservation=null;claim.failureReason=clean(reason,240);return claim
}
export function materializeGenerationClaim(state,claimId,entityRefs=[]){
 const claim=ensureGenerationClaims(state).claims.find(x=>x.id===claimId),refs=uniq(entityRefs);if(!claim||!refs.length)return null;
 claim.status="MATERIALIZED";claim.entityRefs=refs;claim.materializedRevision=Number(state.world?.version)||1;claim.reservation=null;claim.failureReason="";return claim
}
export function failGenerationClaim(state,claimId,reason=""){
 const claim=ensureGenerationClaims(state).claims.find(x=>x.id===claimId);if(!claim)return null;claim.status="FAILED";claim.failureReason=clean(reason,240);claim.reservation=null;return claim
}
function exactRequiredMatches(state,claim){
 return [...registryEntities(state),...worldCatalogDefinitions(state)].filter(e=>materialSatisfiesClaim(claim,e)).map(e=>e.id)
}
export function reconcileGenerationClaims(state){
 const root=ensureGenerationClaims(state),entities=registryEntities(state),defs=worldCatalogDefinitions(state),materials=[...entities,...defs],byId=new Map(materials.map(x=>[x.id,x]));
 for(const claim of root.claims.filter(x=>x.status==="MATERIALIZED")){
  const valid=uniq((claim.entityRefs||[]).filter(id=>{const row=byId.get(id);return row&&materialSatisfiesClaim(claim,row)}));
  if(valid.length){claim.entityRefs=valid;continue}
  claim.status="UNMATERIALIZED";claim.entityRefs=[];claim.materializedRevision=null;claim.reservation=null;claim.failureReason="MATERIALIZATION_DRIFT"
 }
 const usedDefinitions=new Set(root.claims.filter(x=>x.status==="MATERIALIZED"&&x.type==="BLUEPRINT_DEFINITION").flatMap(x=>x.entityRefs||[]));
 for(const claim of root.claims){
  if(claim.status==="MATERIALIZED")continue;let refs=[];
  if(claim.type==="REQUIRED_ELEMENT")refs=exactRequiredMatches(state,claim);
  if(claim.type==="BLUEPRINT_DEFINITION"){const hit=defs.find(d=>d.kind===claim.definitionKind&&!usedDefinitions.has(d.id));if(hit){refs=[hit.id];usedDefinitions.add(hit.id)}}
  if(claim.type==="HISTORY_ANCHOR"&&claim.sourceRef)refs=entities.filter(e=>e.historyRefs.includes(claim.sourceRef)).map(e=>e.id);
  if(claim.type==="FUTURE_ANCHOR"&&claim.historyRefs.length)refs=entities.filter(e=>e.historyRefs.some(id=>claim.historyRefs.includes(id))).map(e=>e.id);
  if(refs.length)materializeGenerationClaim(state,claim.id,refs)
 }
 return root.claims
}
export function generationClaimsSnapshot(state,{pendingOnly=false}={}){
 const rows=syncGenerationClaimsFromCausalStructure(state).filter(x=>!pendingOnly||x.status!=="MATERIALIZED");
 return rows.map(x=>structuredClone(x))
}
export function validateGenerationClaims(state){
 const rows=ensureGenerationClaims(state).claims,errors=[],ids=new Set(),keys=new Set();
 for(const x of rows){
  if(!x?.id||ids.has(x.id))errors.push("GENERATION_CLAIM_ID_INVALID");ids.add(x?.id);
  if(!x?.key||keys.has(x.key))errors.push("GENERATION_CLAIM_KEY_INVALID");keys.add(x?.key);
  if(!STATUS.has(x?.status))errors.push("GENERATION_CLAIM_STATUS_INVALID");
  if(!TYPES.has(x?.type))errors.push("GENERATION_CLAIM_TYPE_INVALID");
  if(!clean(x?.label,180))errors.push("GENERATION_CLAIM_LABEL_INVALID");
  if(x.type==="BLUEPRINT_DEFINITION"&&!DEFINITION_KINDS.has(x.definitionKind))errors.push("GENERATION_CLAIM_DEFINITION_KIND_INVALID");
  if(x.status==="MATERIALIZED"&&!uniq(x.entityRefs).length)errors.push("GENERATION_CLAIM_MATERIALIZATION_EMPTY");
  if(x.status==="RESERVED"&&!x.reservation?.planId)errors.push("GENERATION_CLAIM_RESERVATION_INVALID")
 }
 return {valid:errors.length===0,errors:[...new Set(errors)]}
}
