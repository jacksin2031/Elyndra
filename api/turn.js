import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {parseModelJSON} from "../src/model-json.js";
import {sceneTurnSnapshot,fastTurnStateSnapshot} from "../src/turn-compiler.js";
import {normalizeActionIntent} from "../src/action-intent.js";
import {buildTurnOutcomeKernel} from "../src/turn-outcome.js";
import {sceneNarratorSystem,statePatchDirectorSystem} from "../src/ai-runtime-contracts.js";
import {planStateSync,validateStatePatch} from "../src/state-sync.js";

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,intent,roll,snapshot}=safeBody(req);if(!action||!roll||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});
  const actionIntent=normalizeActionIntent(intent||{},action,roll?.profile?.kind||"",snapshot),kernel=buildTurnOutcomeKernel({action,intent:actionIntent,roll,snapshot});
  const base=planStateSync({action,intent:actionIntent,roll,snapshot,kernel}),plan={...base,baseRevision:Math.max(0,Math.round(Number(snapshot.stateRevision)||0))};kernel.dirtyFlags={...(plan.dirtyFlags||kernel.dirtyFlags||{})};
  const scenePromise=callModel({system:sceneNarratorSystem(),user:JSON.stringify({action,intent:actionIntent,kernel,snapshot:sceneTurnSnapshot(snapshot)}),temperature:.8,timeoutMs:35000,maxOutputTokens:760}).then(parseModelJSON);
  const patchPromise=(plan.mode==="FAST"||plan.mode==="DEEP")?callModel({system:statePatchDirectorSystem(plan),user:JSON.stringify({action,intent:actionIntent,kernel,plan,snapshot:plan.mode==="DEEP"?snapshot:fastTurnStateSnapshot(snapshot)}),temperature:plan.mode==="DEEP"?.3:.15,timeoutMs:plan.mode==="DEEP"?50000:25000,maxOutputTokens:plan.mode==="DEEP"?1300:650}).then(parseModelJSON):Promise.resolve({baseRevision:plan.baseRevision,operations:[]});
  const [sceneResult,patchResult]=await Promise.allSettled([scenePromise,patchPromise]);if(patchResult.status!=="fulfilled")throw patchResult.reason;
  const patch=patchResult.value,v=validateStatePatch(patch,plan);if(!v.valid)return json(res,422,{error:"STATE_PATCH_INVALID",details:v.errors});
  return json(res,200,{scene:sceneResult.status==="fulfilled"?sceneResult.value:null,patch,plan,actionIntent,kernel})
 }catch(e){
  const status=e.code==="AI_NOT_CONFIGURED"?503:e.code==="INVALID_MODEL_JSON"||String(e.message||"").startsWith("INVALID_MODEL_JSON")?422:502;
  return json(res,status,{error:e.code||e.message})
 }
}
