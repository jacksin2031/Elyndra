import * as base from "./lazy-generation.js?v=59014&base=1";
export * from "./lazy-generation.js?v=59014&base=1";

const STALE_ONLY=new Set(["LAZY_STALE_WORLD_VERSION","LAZY_STALE_GENERATION_REVISION"]);
function canSafelyRebase(plan,result){
 if(!plan||plan.status!=="PLANNED")return false;
 const errors=Array.isArray(result?.errors)?result.errors:[];
 return errors.length>0&&errors.every(x=>STALE_ONLY.has(String(x)))
}
export function validateLazyGenerationCandidate(state,generation,plan,options={}){
 const first=base.validateLazyGenerationCandidate(state,generation,plan,options);if(first.valid||!canSafelyRebase(plan,first))return first;
 const root=base.ensureLazyGeneration(state),worldVersion=Number(state?.world?.version)||1,generationRevision=Math.max(0,Number(root?.generationRevision)||0)+1,now=Date.now();
 plan.worldVersion=worldVersion;plan.generationRevision=generationRevision;plan.generatedAtWorldTime={day:Math.max(1,Number(state?.world?.state?.day)||1),totalMinutes:Math.max(0,Number(state?.world?.state?.clock?.totalMinutes)||0)};plan.rebasedAt=now;plan.rebaseReason="FOREGROUND_REVISION_ADVANCED";
 // v0.60.13: a staged runtime expansion may already have a checkpoint when a
 // foreground turn advances world.version. If stale revision is the only
 // validation failure, rebase the checkpoint version too; never rebase any
 // semantic/slot/history/claim validation failure.
 if(plan.checkpoint&&typeof plan.checkpoint==="object"){plan.checkpoint.worldVersion=worldVersion;plan.checkpoint.updatedAt=now;plan.checkpoint.rebasedAt=now;plan.checkpoint.rebaseReason="FOREGROUND_REVISION_ADVANCED"}
 const second=base.validateLazyGenerationCandidate(state,generation,plan,options);return second.valid?{...second,rebased:true,rebasedFrom:first.errors}:second
}
