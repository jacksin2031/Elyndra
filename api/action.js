import {json,methodGuard,safeBody,callModel,errorStatus} from "./_ai.js";
import {parseModelJSON} from "../src/model-json.js";
import {normalizeActionIntent} from "../src/action-intent.js";
import {ACTION_ASSESS_SYSTEM} from "../src/ai-runtime-contracts.js";

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,snapshot}=safeBody(req);if(!action||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});
  const label=String(action).slice(0,180);
  const raw=await callModel({signal:req.elyndraSignal,locale:req.elyndraLocale,system:ACTION_ASSESS_SYSTEM,user:JSON.stringify({action:label,snapshot}),temperature:.15,timeoutMs:28000,maxOutputTokens:750});
  const assessment=parseModelJSON(raw),kind=["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"].includes(String(assessment?.kind||"").toUpperCase())?String(assessment.kind).toUpperCase():"GENERAL";
  assessment.actionIntent=normalizeActionIntent(assessment?.actionIntent||assessment,assessment?.normalizedAction||label,kind,snapshot);
  return json(res,200,{assessment})
 }catch(e){
  const status=errorStatus(e);
  return json(res,status,{error:e.code||e.message})
 }
}
