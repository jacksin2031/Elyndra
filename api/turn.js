import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {parseModelJSON} from "../src/model-json.js";
import {sceneTurnSnapshot,fastTurnStateSnapshot,mergeTurnCandidates} from "../src/turn-compiler.js";
import {normalizeActionIntent} from "../src/action-intent.js";
import {buildTurnOutcomeKernel,turnDirectorMode,validateKernelBoundaries} from "../src/turn-outcome.js";
import {sceneNarratorSystem,stateDirectorSystem} from "../src/ai-runtime-contracts.js";

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,intent,roll,snapshot}=safeBody(req);if(!action||!roll||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});
  const actionIntent=normalizeActionIntent(intent||{},action,roll?.profile?.kind||"",snapshot),kernel=buildTurnOutcomeKernel({action,intent:actionIntent,roll,snapshot}),directorMode=turnDirectorMode(action,roll,snapshot);
  const sceneInput={action,intent:actionIntent,kernel,snapshot:sceneTurnSnapshot(snapshot)};
  // Server API currently has no separate deferred worker, therefore DEFERRED uses the full state schema in the same request.
  const serverStateMode=directorMode==="FAST"?"FAST":"DEEP",stateInput={action,intent:actionIntent,kernel,snapshot:serverStateMode==="FAST"?fastTurnStateSnapshot(snapshot):snapshot};
  const scenePromise=callModel({system:sceneNarratorSystem(),user:JSON.stringify(sceneInput),temperature:.8,timeoutMs:35000,maxOutputTokens:760}).then(parseModelJSON);
  const statePromise=callModel({system:stateDirectorSystem(serverStateMode),user:JSON.stringify(stateInput),temperature:serverStateMode==="FAST"?.2:.45,timeoutMs:serverStateMode==="FAST"?30000:50000,maxOutputTokens:serverStateMode==="FAST"?900:1800}).then(parseModelJSON);
  const [sceneResult,stateResult]=await Promise.allSettled([scenePromise,statePromise]);
  if(stateResult.status!=="fulfilled")throw stateResult.reason;
  const boundary=validateKernelBoundaries(stateResult.value,kernel);if(!boundary.valid)return json(res,422,{error:"TURN_OUTCOME_KERNEL_VIOLATION",details:boundary.errors});
  const scene=sceneResult.status==="fulfilled"?sceneResult.value:null,candidate=mergeTurnCandidates(scene,stateResult.value,roll,{action,kernel,priorSuggestions:snapshot?.priorSuggestions||[],priorSuggestionIntents:snapshot?.priorSuggestionIntents||[]});
  return json(res,200,{candidate:{...candidate,directorMode,actionIntent,kernel}})
 }catch(e){
  const status=e.code==="AI_NOT_CONFIGURED"?503:e.code==="INVALID_MODEL_JSON"||String(e.message||"").startsWith("INVALID_MODEL_JSON")?422:502;
  return json(res,status,{error:e.code||e.message})
 }
}
