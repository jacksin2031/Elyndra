import * as base from "./world-quality.js?v=57025&base=1";
import {worldEnrichmentPressure} from "./world-enrichment.js?v=59014";
import {qualityBackoff,noteQualityFailure,clearQualityFailure,evolutionBackoff,QUALITY_RETRY_BASE_MS,QUALITY_RETRY_MAX_MS} from "./v06030-background-backoff.js?v=60029";
export * from "./world-quality.js?v=57025&base=1";

export function backgroundQualityNeed(state){
 const bg=state?.world?.quality?.background,current=Number(state?.world?.version)||1,guard=qualityBackoff(state);
 if(bg?.running===true)return {required:false,reason:"RUNNING"};
 if(guard.active)return {required:false,reason:"FAILURE_BACKOFF",retryAt:guard.retryAt,remainingMs:guard.remainingMs};
 if(bg?.error||guard.failures>0){const reviewed=Number(bg?.reviewedWorldVersion)||0;if(current>=reviewed)return {required:true,reason:"RETRY_AFTER_FAILURE"}}
 return base.backgroundQualityNeed(state)
}

export function worldEvolutionNeed(state){
 const persisted=evolutionBackoff(state);
 if(persisted.active){const health=base.worldHealthSnapshot(state);return {required:false,reasons:["EXPANSION_BACKOFF"],reason:"EXPANSION_BACKOFF",health,retryAt:persisted.retryAt}}
 const guard=worldEnrichmentPressure(state);
 if(guard?.backoff===true){const health=base.worldHealthSnapshot(state);return {required:false,reasons:["EXPANSION_BACKOFF"],reason:"EXPANSION_BACKOFF",health,retryAt:Number(guard.backoffUntil)||0}}
 return base.worldEvolutionNeed(state)
}

export function recordBackgroundQualityReview(state,{evaluation=null,repair=null,error=""}={}){
 const prior=state?.world?.quality?.background&&typeof state.world.quality.background==="object"?structuredClone(state.world.quality.background):{};
 const failure=String(error||"").trim(),row=base.recordBackgroundQualityReview(state,{evaluation,repair,error});
 if(evaluation||!failure){clearQualityFailure(state);return row}
 const attemptAt=Number(row?.reviewedAt)||Date.now(),attemptVersion=Number(row?.reviewedWorldVersion)||Number(state?.world?.version)||1,backoff=noteQualityFailure(state,failure,{now:attemptAt});
 row.lastAttemptAt=attemptAt;row.lastAttemptWorldVersion=attemptVersion;row.lastError=failure.slice(0,300);row.consecutiveFailures=backoff.failures;row.nextRetryAt=backoff.nextRetryAt;row.reviewedAt=Number(prior?.reviewedAt)||0;row.reviewedWorldVersion=Number(prior?.reviewedWorldVersion)||0;return row
}

export const __v06030={QUALITY_RETRY_BASE_MS,QUALITY_RETRY_MAX_MS};
