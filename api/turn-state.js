import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {parseModelJSON} from "../src/model-json.js";
import {fastTurnStateSnapshot} from "../src/turn-compiler.js";
import {normalizeActionIntent} from "../src/action-intent.js";
import {buildTurnOutcomeKernel,turnDirectorMode,validateKernelBoundaries} from "../src/turn-outcome.js";
import {stateDirectorSystem} from "../src/ai-runtime-contracts.js";

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,intent,roll,snapshot,directorMode:requestedMode}=safeBody(req);if(!action||!roll||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});
  const actionIntent=normalizeActionIntent(intent||{},action,roll?.profile?.kind||"",snapshot),kernel=buildTurnOutcomeKernel({action,intent:actionIntent,roll,snapshot}),directorMode=requestedMode||turnDirectorMode(action,roll,snapshot),stateMode=directorMode==="DEEP"?"DEEP":"FAST";
  const input={action,intent:actionIntent,kernel,snapshot:stateMode==="DEEP"?snapshot:fastTurnStateSnapshot(snapshot)};
  const raw=await callModel({system:stateDirectorSystem(stateMode),user:JSON.stringify(input),temperature:stateMode==="FAST"?.2:.4,timeoutMs:stateMode==="FAST"?30000:50000,maxOutputTokens:stateMode==="FAST"?900:1800});
  const state=parseModelJSON(raw),boundary=validateKernelBoundaries(state,kernel);if(!boundary.valid)return json(res,422,{error:"TURN_OUTCOME_KERNEL_VIOLATION",details:boundary.errors});
  return json(res,200,{state,directorMode,stateMode,actionIntent,kernel})
 }catch(e){
  const status=e.code==="AI_NOT_CONFIGURED"?503:e.code==="INVALID_MODEL_JSON"||String(e.message||"").startsWith("INVALID_MODEL_JSON")?422:502;
  return json(res,status,{error:e.code||e.message})
 }
}
