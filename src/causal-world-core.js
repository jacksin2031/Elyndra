import {ensureWorldLedger,seedLedgerFromEvents,appendWorldLedger} from "./world-ledger.js?v=40000";
import {ensureGenerationClaims,syncGenerationClaimsFromConstitution} from "./generation-claims.js?v=40000";
import {ensureKnowledgeMetadata,knowledgeModelSnapshot} from "./knowledge-model.js?v=40000";
import {ensureFutureEngine,registerTimelineFutures,mirrorLegacyCrisisToFuture,futureSnapshot} from "./future-engine.js?v=40000";

export function ensureCausalWorldCore(state){
 if(!state?.world)throw new Error("CAUSAL_WORLD_STATE_REQUIRED");
 ensureWorldLedger(state);ensureGenerationClaims(state);ensureKnowledgeMetadata(state);ensureFutureEngine(state);
 seedLedgerFromEvents(state);syncGenerationClaimsFromConstitution(state);mirrorLegacyCrisisToFuture(state);
 state.world.causalCore??={version:1,initializedAt:Date.now()};state.world.causalCore.version=1;return state.world.causalCore
}
export function registerCanonizedWorld(state){
 ensureCausalWorldCore(state);registerTimelineFutures(state);syncGenerationClaimsFromConstitution(state);return causalWorldCoreSnapshot(state)
}
export function recordRuntimeLedgerEvent(state,event,meta={}){
 ensureCausalWorldCore(state);return appendWorldLedger(state,event,meta)
}
export function causalWorldCoreSnapshot(state){
 ensureCausalWorldCore(state);
 return {version:1,ledger:{revision:state.world.ledger.revision,count:state.world.ledger.entries.length},generationClaims:{total:state.world.generationClaims.claims.length,pending:state.world.generationClaims.claims.filter(x=>x.status!=="MATERIALIZED").length},knowledge:knowledgeModelSnapshot(state),futures:futureSnapshot(state,{director:true})}
}
