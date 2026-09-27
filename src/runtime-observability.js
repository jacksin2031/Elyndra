const list=value=>Array.isArray(value)?value:[];
const text=(value,max=160)=>String(value??"").trim().slice(0,max);
const randomId=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36);
export const REPAIR_SEVERITY=Object.freeze({RECOVERABLE:"RECOVERABLE",CONTRACT_VIOLATION:"CONTRACT_VIOLATION",HARD_REJECT:"HARD_REJECT"});
export const REPAIR_DISPOSITION=Object.freeze({NORMALIZED:"NORMALIZED",BOUND:"BOUND",DROPPED:"DROPPED",REJECTED:"REJECTED"});
export function createPipelineTrace(seed={}){
 const stage=text(seed?.stage||"PIPELINE",60),turnId=seed?.turnId==null?null:text(seed.turnId,120);
 return {pipelineId:text(seed?.pipelineId,120)||randomId(),correlationId:text(seed?.correlationId,120)||randomId(),turnId,attemptId:Math.max(1,Math.round(Number(seed?.attemptId)||1)),stage};
}
export function summarizeRuntimeObservability(entries=[]){
 const rows=list(entries),received=rows.filter(x=>x?.type==="AI_OUTPUT_RECEIVED"),repaired=rows.filter(x=>x?.type==="AI_OUTPUT_REPAIRED"),rejected=rows.filter(x=>x?.type==="AI_OUTPUT_REJECTED"),safeCommits=rows.filter(x=>x?.type==="STATE_COMMIT_SAFE"),prevented=rows.filter(x=>x?.type==="UNSAFE_COMMIT_PREVENTED"),unsafe=rows.filter(x=>x?.type==="STATE_COMMIT_UNSAFE"),masking=repaired.filter(x=>x?.data?.masking===true),hardRejectEvents=[...repaired,...rejected].filter(x=>Number(x?.data?.hardRejects)>0||x?.type==="AI_OUTPUT_REJECTED"),signatures={};
 for(const e of [...repaired,...rejected])for(const issue of list(e?.data?.issues)){const code=text(issue?.code||issue,120);if(code)signatures[code]=(signatures[code]||0)+1}
 const applicable=Math.max(1,received.length),driftSignatures=Object.entries(signatures).map(([code,count])=>({code,count,rate:count/applicable,ratePct:Math.round(count/applicable*10000)/100})).filter(x=>x.count>=3&&x.rate>.05).sort((a,b)=>b.count-a.count),commits=safeCommits.length+unsafe.length;
 return {runtimeSafety:unsafe.length===0?"HEALTHY":"FAILED",unsafeCommits:unsafe.length,unsafeCommitRate:commits?unsafe.length/commits:0,unsafeCommitRatePct:commits?Math.round(unsafe.length/commits*10000)/100:0,safeCommits:safeCommits.length,preventedUnsafeCommits:prevented.length,aiOutputs:received.length,repairs:repaired.length,rejections:rejected.length,repairRate:received.length?repaired.length/received.length:0,repairRatePct:received.length?Math.round(repaired.length/received.length*10000)/100:0,repairMasking:masking.length,repairMaskingRatePct:received.length?Math.round(masking.length/received.length*10000)/100:0,hardRejectEvents:hardRejectEvents.length,rejectRatePct:received.length?Math.round(rejected.length/received.length*10000)/100:0,narrativeEngineDivergence:signatures.OUTCOME_REBOUND||0,repairSignatures:signatures,driftSignatures};
}
