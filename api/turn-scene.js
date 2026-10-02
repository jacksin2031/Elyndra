import {json,methodGuard,safeBody,callModel,errorStatus} from "./_ai.js";
import {parseModelJSON} from "../src/model-json.js";
import {sceneTurnSnapshot} from "../src/turn-compiler.js";
import {normalizeActionIntent} from "../src/action-intent.js";
import {buildTurnOutcomeKernel} from "../src/turn-outcome.js";
import {sceneNarratorSystem} from "../src/ai-runtime-contracts.js";

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,intent,roll,snapshot}=safeBody(req);if(!action||!roll||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});
  const actionIntent=normalizeActionIntent(intent||{},action,roll?.profile?.kind||"",snapshot),kernel=buildTurnOutcomeKernel({action,intent:actionIntent,roll,snapshot});
  const input={action,intent:actionIntent,kernel,snapshot:sceneTurnSnapshot(snapshot)};
  const raw=await callModel({signal:req.elyndraSignal,locale:req.elyndraLocale,system:sceneNarratorSystem(),user:JSON.stringify(input),temperature:.8,timeoutMs:35000,maxOutputTokens:1100});
  return json(res,200,{scene:parseModelJSON(raw),actionIntent,kernel})
 }catch(e){
  const status=errorStatus(e);
  return json(res,status,{error:e.code||e.message})
 }
}
