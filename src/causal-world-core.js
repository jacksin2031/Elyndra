import {ensureWorldLedger,seedLedgerFromEvents,appendWorldLedger} from "./world-ledger.js?v=40000";
import {ensureGenerationClaims,syncGenerationClaimsFromCausalStructure,reconcileGenerationClaims} from "./generation-claims.js?v=44000";
import {ensureKnowledgeMetadata,knowledgeModelSnapshot} from "./knowledge-model.js?v=40000";
import {ensureFutureEngine,registerTimelineFutures,mirrorLegacyCrisisToFuture,futureSnapshot} from "./future-engine.js?v=48000";
import {ensureItemHeritage} from "./item-heritage.js?v=48000";
import {ensureDocumentRuntime} from "./document-engine.js?v=48000";
import {ensureLazyGeneration,lazyGenerationSnapshot} from "./lazy-generation.js?v=51000";
import {ensureHistoryDepth,historyDepthSnapshot} from "./history-depth.js?v=47000";
import {syncHistoryLegacy,historyLegacySnapshot} from "./history-legacy.js?v=50000";
import {ensureVisibilityLocks,visibilityLockSnapshot} from "./visibility-lock.js?v=51000";

export function ensureCausalWorldCore(state){
 if(!state?.world)throw new Error("CAUSAL_WORLD_STATE_REQUIRED");
 ensureWorldLedger(state);ensureGenerationClaims(state);ensureKnowledgeMetadata(state);ensureFutureEngine(state);ensureItemHeritage(state);ensureDocumentRuntime(state);ensureLazyGeneration(state);ensureHistoryDepth(state);syncHistoryLegacy(state);ensureVisibilityLocks(state);
 seedLedgerFromEvents(state);mirrorLegacyCrisisToFuture(state);syncGenerationClaimsFromCausalStructure(state);reconcileGenerationClaims(state);
 state.world.causalCore??={version:1,initializedAt:Date.now()};state.world.causalCore.version=1;return state.world.causalCore
}
export function registerCanonizedWorld(state){
 ensureCausalWorldCore(state);registerTimelineFutures(state);ensureItemHeritage(state);ensureDocumentRuntime(state);syncGenerationClaimsFromCausalStructure(state);reconcileGenerationClaims(state);return causalWorldCoreSnapshot(state)
}
export function recordRuntimeLedgerEvent(state,event,meta={}){
 ensureCausalWorldCore(state);return appendWorldLedger(state,event,meta)
}
export function causalWorldCoreSnapshot(state){
 ensureCausalWorldCore(state);
 return {version:1,ledger:{revision:state.world.ledger.revision,count:state.world.ledger.entries.length},generationClaims:{total:state.world.generationClaims.claims.length,pending:state.world.generationClaims.claims.filter(x=>x.status!=="MATERIALIZED").length},knowledge:knowledgeModelSnapshot(state),futures:futureSnapshot(state,{director:true}),itemHeritage:{seeds:state.world.itemHeritage?.seeds?.length||0},documents:{count:state.world.documents?.documents?.length||0},lazyGeneration:lazyGenerationSnapshot(state,{director:true}),historyDepth:historyDepthSnapshot(state,{director:true}),historyLegacy:historyLegacySnapshot(state,{director:true}),visibilityLocks:visibilityLockSnapshot(state,{director:true})}
}
