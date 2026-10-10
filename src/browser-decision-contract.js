export const BROWSER_DECISION_SCHEMA="elyndra-browser-decision-v1";
export const BROWSER_DECISION_TASK=Object.freeze({
 ACTION_CLASSIFICATION:"ACTION_CLASSIFICATION",
 ACTION_LEGALITY:"ACTION_LEGALITY",
 ORIGIN_COMPLIANCE:"ORIGIN_COMPLIANCE",
 NARRATIVE_CONSISTENCY:"NARRATIVE_CONSISTENCY",
 AI_OUTPUT_ACCEPTANCE:"AI_OUTPUT_ACCEPTANCE",
 NEED_AI_ROUTING:"NEED_AI_ROUTING"
});
export const BROWSER_DECISION=Object.freeze({ACCEPT:"ACCEPT",REJECT:"REJECT",NEEDS_AI:"NEEDS_AI",UNCERTAIN:"UNCERTAIN"});
export const BROWSER_DECISION_ENGINE=Object.freeze({WEBGPU:"WEBGPU",WASM:"WASM",SERVER:"SERVER",NONE:"NONE"});
export const BROWSER_DECISION_MODE=Object.freeze({SHADOW_ONLY:"SHADOW_ONLY",ENFORCE_LOW_RISK:"ENFORCE_LOW_RISK"});
const TASKS=new Set(Object.values(BROWSER_DECISION_TASK));
const DECISIONS=new Set(Object.values(BROWSER_DECISION));
const ENGINES=new Set(Object.values(BROWSER_DECISION_ENGINE));
const LOW_RISK_TASKS=new Set([BROWSER_DECISION_TASK.ACTION_CLASSIFICATION,BROWSER_DECISION_TASK.NEED_AI_ROUTING]);
const id=()=>globalThis.crypto?.randomUUID?.()||"bd-"+Math.random().toString(36).slice(2)+Date.now().toString(36);
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(Number(value))?Number(value):0));
const text=(value,max=120)=>String(value??"").trim().slice(0,max);
export function createBrowserDecisionRequest({task,payload={},context={},requestId=""}={}){
 const normalizedTask=text(task,80).toUpperCase();
 if(!TASKS.has(normalizedTask))throw new Error("BROWSER_DECISION_UNSUPPORTED_TASK:"+normalizedTask);
 return {schema:BROWSER_DECISION_SCHEMA,requestId:text(requestId,160)||id(),task:normalizedTask,payload,context,createdAt:Date.now()};
}
export function normalizeBrowserDecisionResult(input={},defaults={}){
 const decision=String(input?.decision||defaults?.decision||BROWSER_DECISION.UNCERTAIN).toUpperCase();
 const engine=String(input?.engine||defaults?.engine||BROWSER_DECISION_ENGINE.NONE).toUpperCase();
 const reasonCodes=[...new Set((Array.isArray(input?.reasonCodes)?input.reasonCodes:[]).map(x=>text(x,120).toUpperCase()).filter(Boolean))];
 return {
  schema:BROWSER_DECISION_SCHEMA,
  decision:DECISIONS.has(decision)?decision:BROWSER_DECISION.UNCERTAIN,
  confidence:clamp(input?.confidence),
  reasonCodes,
  engine:ENGINES.has(engine)?engine:BROWSER_DECISION_ENGINE.NONE,
  modelVersion:text(input?.modelVersion||defaults?.modelVersion||"unloaded",120),
  latencyMs:Math.max(0,Math.round(Number(input?.latencyMs)||0)),
  fallback:Boolean(input?.fallback??defaults?.fallback),
  metadata:input?.metadata&&typeof input.metadata==="object"?input.metadata:{}
 };
}
export function browserDecisionPolicy(result,{task,mode=BROWSER_DECISION_MODE.SHADOW_ONLY,acceptThreshold=.9,uncertainThreshold=.65}={}){
 const r=normalizeBrowserDecisionResult(result);
 const highConfidence=r.confidence>=Math.max(.5,Math.min(.99,Number(acceptThreshold)||.9));
 const enoughConfidence=r.confidence>=Math.max(.1,Math.min(.95,Number(uncertainThreshold)||.65));
 const lowRisk=LOW_RISK_TASKS.has(String(task||"").toUpperCase());
 const enforce=mode===BROWSER_DECISION_MODE.ENFORCE_LOW_RISK&&lowRisk&&highConfidence&&r.decision!==BROWSER_DECISION.UNCERTAIN;
 const escalate=!enoughConfidence||r.decision===BROWSER_DECISION.UNCERTAIN||r.decision===BROWSER_DECISION.NEEDS_AI;
 return {enforce,shadow:!enforce,escalate,lowRisk,highConfidence,enoughConfidence};
}
