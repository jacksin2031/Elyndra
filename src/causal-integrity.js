import {ensureWorldLedger} from "./world-ledger.js?v=55000";
import {ensureGenerationClaims,reconcileGenerationClaims,validateGenerationClaims,materialSatisfiesClaim,forbiddenTermMatch} from "./generation-claims.js?v=55000";
import {ensureKnowledgeMetadata} from "./knowledge-model.js?v=55000";
import {ensureFutureEngine} from "./future-engine.js?v=55000";
import {ensureHistoryLegacy} from "./history-legacy.js?v=55000";
import {ensureWorldCatalog,worldCatalogDefinitions} from "./world-catalog.js?v=55000";
import {ensureVisibilityLocks} from "./visibility-lock.js?v=55000";
import {ensureLazyGeneration} from "./lazy-generation.js?v=55000";
import {ensureHistoryDepth} from "./history-depth.js?v=55000";
import {ensureDocumentRuntime} from "./document-engine.js?v=55000";
import {ensureItemHeritage} from "./item-heritage.js?v=55000";

const LOCK_RANK={UNSEEN:0,HINTED:1,OBSERVED:2,KNOWN:3,CANON_LOCKED:4};
const uniq=v=>[...new Set(v)];
const registryMaterials=state=>{
 const r=state.world?.registry||{};
 return [
  ...(r.locations||[]).map(x=>({...x,kind:"location"})),
  ...(r.npcs||[]).map(x=>({...x,kind:"npc"})),
  ...(r.factions||[]).map(x=>({...x,kind:"faction"})),
  ...(r.sideQuests||[]).map(x=>({...x,kind:"sideQuest",name:x.title,description:x.objective}))
 ]
};
function issue(code,ref="",detail=""){return {code,ref:String(ref||""),detail:String(detail||"")}}
function materialMap(state){
 const rows=[...registryMaterials(state),...worldCatalogDefinitions(state)];
 return new Map(rows.filter(x=>x?.id).map(x=>[x.id,x]))
}

export function repairCausalIntegrity(state){
 ensureWorldLedger(state);ensureWorldCatalog(state);ensureGenerationClaims(state);ensureKnowledgeMetadata(state);ensureFutureEngine(state);ensureHistoryLegacy(state);ensureVisibilityLocks(state);
 const lazy=ensureLazyGeneration(state),active=new Set(lazy.plans.filter(x=>x.status==="PLANNED").map(x=>x.id)),repairs=[];
 for(const claim of state.world.generationClaims.claims){
  if(claim.status==="RESERVED"&&(!claim.reservation?.planId||!active.has(claim.reservation.planId))){
   claim.status="UNMATERIALIZED";claim.reservation=null;claim.failureReason="ORPHAN_RESERVATION_RECOVERED";repairs.push("CLAIM_RESERVATION:"+claim.id)
  }
 }
 for(const record of state.world.historyLegacy.records)for(const echo of record.echoes||[]){
  if(echo.status==="RESERVED"&&(!echo.reservation?.planId||!active.has(echo.reservation.planId))){
   echo.status="UNMATERIALIZED";echo.reservation=null;echo.failureReason="ORPHAN_RESERVATION_RECOVERED";repairs.push("LEGACY_ECHO_RESERVATION:"+echo.id)
  }
 }
 const materialBefore=new Map(state.world.generationClaims.claims.map(x=>[x.id,{status:x.status,refs:JSON.stringify(x.entityRefs||[])}]));reconcileGenerationClaims(state);
 for(const claim of state.world.generationClaims.claims){const before=materialBefore.get(claim.id);if(before?.status==="MATERIALIZED"&&claim.status!=="MATERIALIZED")repairs.push("CLAIM_MATERIALIZATION_DRIFT:"+claim.id);else if(before&&before.refs!==JSON.stringify(claim.entityRefs||[]))repairs.push("CLAIM_MATERIAL_RECONCILED:"+claim.id)}
 const ledger=state.world.ledger,byLedger=new Map(ledger.entries.map(x=>[x.id,x]));
 for(const history of state.world.history||[]){
  const entry=history?.ledgerRef?byLedger.get(history.ledgerRef):null;if(!entry)continue;
  if(!(entry.historyRefs||[]).includes(history.id)){entry.historyRefs=uniq([...(entry.historyRefs||[]),history.id]);repairs.push("LEDGER_HISTORY_BACKLINK:"+history.id)}
 }
 return {repaired:repairs.length>0,repairs:uniq(repairs)}
}

export function auditCausalIntegrity(state){
 ensureWorldLedger(state);ensureWorldCatalog(state);ensureGenerationClaims(state);ensureKnowledgeMetadata(state);ensureFutureEngine(state);ensureHistoryLegacy(state);ensureVisibilityLocks(state);
 const lazy=ensureLazyGeneration(state),historyDepth=ensureHistoryDepth(state),docs=ensureDocumentRuntime(state),heritage=ensureItemHeritage(state),errors=[],warnings=[];
 const ledger=state.world.ledger,ledgerIds=new Set(),sourceIds=new Set(),historyIds=new Set((state.world.history||[]).map(x=>x.id)),ledgerMap=new Map();
 let maxRevision=0;
 for(const row of ledger.entries){
  if(!row?.id||ledgerIds.has(row.id))errors.push(issue("LEDGER_ID_DUPLICATE",row?.id));else ledgerIds.add(row.id);
  if(row?.sourceEventId){if(sourceIds.has(row.sourceEventId))errors.push(issue("LEDGER_SOURCE_EVENT_DUPLICATE",row.sourceEventId));sourceIds.add(row.sourceEventId)}
  maxRevision=Math.max(maxRevision,Number(row?.revision)||0);if(row?.id)ledgerMap.set(row.id,row)
 }
 if(Number(ledger.revision)<maxRevision)errors.push(issue("LEDGER_REVISION_BEHIND",ledger.revision,maxRevision));
 for(const h of state.world.history||[]){
  if(h?.ledgerRef){
   const entry=ledgerMap.get(h.ledgerRef);if(!entry)errors.push(issue("HISTORY_LEDGER_REF_ORPHAN",h.id,h.ledgerRef));
   else if(!(entry.historyRefs||[]).includes(h.id))warnings.push(issue("LEDGER_HISTORY_BACKLINK_MISSING",h.id,h.ledgerRef))
  }
 }
 const canonFacts=new Set((state.world?.canon?.facts||[]).map(x=>x.id)),knowledge=ensureKnowledgeMetadata(state);
 for(const k of knowledge){
  if(k.status==="VERIFIED"&&!((k.factId&&canonFacts.has(k.factId))||(k.historyId&&historyIds.has(k.historyId))))errors.push(issue("VERIFIED_KNOWLEDGE_ORPHAN",k.id,k.factId||k.historyId));
  if(k.status!=="VERIFIED"&&Number(k.score)>0)warnings.push(issue("UNVERIFIED_KNOWLEDGE_SCORE",k.id,k.score))
 }
 const baseClaims=validateGenerationClaims(state);for(const e of baseClaims.errors)errors.push(issue(e));
 const materials=materialMap(state),definitionRefs=new Set();
 for(const claim of state.world.generationClaims.claims.filter(x=>x.status==="MATERIALIZED")){
  let valid=0;
  for(const id of claim.entityRefs||[]){const row=materials.get(id);if(row&&materialSatisfiesClaim(claim,row))valid++;else errors.push(issue("GENERATION_CLAIM_MATERIAL_DRIFT",claim.id,id))}
  if(!valid)errors.push(issue("GENERATION_CLAIM_EMPTY_VALID_MATERIAL",claim.id));
  if(claim.type==="BLUEPRINT_DEFINITION")for(const id of claim.entityRefs||[]){if(definitionRefs.has(id))errors.push(issue("BLUEPRINT_DEFINITION_REUSED",claim.id,id));definitionRefs.add(id)}
 }
 for(const row of registryMaterials(state)){
  const forbidden=forbiddenTermMatch(state,{name:row.name,description:row.description,lore:row.lore,culture:row.culture,trade:row.trade});if(forbidden)errors.push(issue("FORBIDDEN_CANON_MATERIAL",row.id,forbidden));
  const rank=LOCK_RANK[String(row.visibilityLock||"UNSEEN")]??0;if(row.known===true&&rank<LOCK_RANK.KNOWN)errors.push(issue("VISIBILITY_KNOWN_DOWNGRADE",row.id,row.visibilityLock));if(row.kind==="npc"&&row.encountered===true&&rank<LOCK_RANK.OBSERVED)errors.push(issue("VISIBILITY_ENCOUNTER_DOWNGRADE",row.id,row.visibilityLock))
 }
 for(const row of worldCatalogDefinitions(state)){const forbidden=forbiddenTermMatch(state,row);if(forbidden)errors.push(issue("FORBIDDEN_CATALOG_MATERIAL",row.id,forbidden))}
 for(const future of state.world.futures||[])for(const hid of future.historicalLinks||[])if(!historyIds.has(hid))errors.push(issue("FUTURE_HISTORY_REF_ORPHAN",future.id,hid));
 const activePlans=lazy.plans.filter(x=>x.status==="PLANNED"),expectedRevision=Number(lazy.generationRevision)+1,currentVersion=Number(state.world?.version)||1;
 for(const plan of activePlans){if(Number(plan.worldVersion)!==currentVersion)warnings.push(issue("LAZY_PLAN_STALE_WORLD",plan.id,plan.worldVersion+"!="+currentVersion));if(Number(plan.generationRevision)!==expectedRevision)warnings.push(issue("LAZY_PLAN_STALE_REVISION",plan.id,plan.generationRevision+"!="+expectedRevision))}
 const activeIds=new Set(activePlans.map(x=>x.id));
 for(const claim of state.world.generationClaims.claims.filter(x=>x.status==="RESERVED"))if(!activeIds.has(claim.reservation?.planId))errors.push(issue("CLAIM_RESERVATION_ORPHAN",claim.id,claim.reservation?.planId));
 const documentIds=new Set((docs.documents||[]).map(x=>x.id)),relicIds=new Set((heritage.seeds||[]).map(x=>x.id));
 for(const record of state.world.historyLegacy.records){
  if(!historyIds.has(record.historyId))errors.push(issue("LEGACY_HISTORY_ORPHAN",record.historyId));
  for(const echo of record.echoes||[]){
   if(echo.status==="RESERVED"&&!activeIds.has(echo.reservation?.planId))errors.push(issue("LEGACY_RESERVATION_ORPHAN",echo.id,echo.reservation?.planId));
   if(echo.status!=="MATERIALIZED")continue;
   if(echo.kind==="DOCUMENT")for(const id of echo.artifactRefs||[])if(!documentIds.has(id))errors.push(issue("LEGACY_DOCUMENT_ORPHAN",echo.id,id));
   if(["RELIC","WEAPON_RELIC"].includes(echo.kind))for(const id of echo.artifactRefs||[])if(!relicIds.has(id))errors.push(issue("LEGACY_RELIC_ORPHAN",echo.id,id));
   if(["ORAL_TRADITION","MEMORIAL"].includes(echo.kind))for(const id of echo.entityRefs||[])if(!materials.has(id))errors.push(issue("LEGACY_ENTITY_ORPHAN",echo.id,id))
  }
 }
 for(const record of historyDepth.records)if(record.status==="PLANNED"&&Number(record.baseWorldVersion)!==currentVersion)warnings.push(issue("HISTORY_DEEPENING_STALE_WORLD",record.historyId,record.baseWorldVersion+"!="+currentVersion));
 const uniqueErrors=uniq(errors.map(x=>JSON.stringify(x))).map(x=>JSON.parse(x)),uniqueWarnings=uniq(warnings.map(x=>JSON.stringify(x))).map(x=>JSON.parse(x));
 return {valid:uniqueErrors.length===0,errors:uniqueErrors,warnings:uniqueWarnings,summary:{errors:uniqueErrors.length,warnings:uniqueWarnings.length,ledgerRevision:ledger.revision,worldVersion:currentVersion,stateRevision:Number(state.stateSync?.revision)||0}}
}
export function assertCausalIntegrity(state){
 const report=auditCausalIntegrity(state);if(!report.valid)throw new Error("CAUSAL_INTEGRITY_FAILED:"+report.errors.map(x=>x.code+(x.ref?":"+x.ref:"")).join(","));return report
}
