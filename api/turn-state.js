import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {parseModelJSON} from "../src/model-json.js";
import {fastTurnStateSnapshot} from "../src/turn-compiler.js";
import {normalizeActionIntent} from "../src/action-intent.js";
import {buildTurnOutcomeKernel} from "../src/turn-outcome.js";
import {statePatchDirectorSystem} from "../src/ai-runtime-contracts.js";
import {planStateSync,validateStatePatch} from "../src/state-sync.js";

function normalizeGeneratedStatePatch(patch){
 if(!patch||typeof patch!=="object"||Array.isArray(patch))return patch;
 const next=structuredClone(patch);
 for(const op of (Array.isArray(next.operations)?next.operations:[])){
  if(String(op?.op||"").toUpperCase()==="DISCOVER_FACT"&&String(op?.sourceKind||"").toUpperCase()==="CANON"&&!String(op?.factId||"").trim()&&String(op?.sourceId||"").trim())op.factId=String(op.sourceId).trim()
 }
 return next
}
function serverPlan(base,requested,snapshot){
 const baseRevision=Math.max(0,Math.round(Number(requested?.baseRevision??snapshot?.stateRevision)||0));
 if(String(requested?.mode||"").toUpperCase()==="DEFERRED"){
  const capabilities=[...(base.deferredCapabilities||[])];
  return {...base,mode:"DEFERRED",blocking:false,deferred:true,requiresStateAI:capabilities.length>0,capabilities,dirty:[...(base.deferredDirty||[])],baseRevision}
 }
 return {...base,baseRevision}
}
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,intent,roll,snapshot,plan:requestedPlan}=safeBody(req);if(!action||!roll||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});
  const actionIntent=normalizeActionIntent(intent||{},action,roll?.profile?.kind||"",snapshot),kernel=buildTurnOutcomeKernel({action,intent:actionIntent,roll,snapshot});
  const base=planStateSync({action,intent:actionIntent,roll,snapshot,kernel}),plan=serverPlan(base,requestedPlan,snapshot);kernel.dirtyFlags={...(plan.dirtyFlags||kernel.dirtyFlags||{})};
  if(!plan.requiresStateAI)return json(res,200,{patch:{baseRevision:plan.baseRevision,operations:[]},plan,actionIntent,kernel});
  const input={action,intent:actionIntent,kernel,plan,snapshot:plan.mode==="DEEP"?snapshot:fastTurnStateSnapshot(snapshot,plan)};
  const raw=await callModel({signal:req.elyndraSignal,locale:req.elyndraLocale,system:statePatchDirectorSystem(plan),user:JSON.stringify(input),temperature:plan.mode==="DEEP"?.3:.15,timeoutMs:plan.mode==="DEEP"?50000:plan.mode==="DEFERRED"?40000:25000,maxOutputTokens:plan.mode==="DEEP"?1300:plan.mode==="DEFERRED"?900:800});
  const patch=normalizeGeneratedStatePatch(parseModelJSON(raw)),v=validateStatePatch(patch,plan);if(!v.valid)return json(res,422,{error:"STATE_PATCH_INVALID",details:v.errors});
  return json(res,200,{patch,plan,actionIntent,kernel})
 }catch(e){
  const status=e.code==="AI_NOT_CONFIGURED"?503:e.code==="INVALID_MODEL_JSON"||String(e.message||"").startsWith("INVALID_MODEL_JSON")?422:502;
  return json(res,status,{error:e.code||e.message})
 }
}
