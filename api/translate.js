import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {normalizeLocale,languageContract} from "../src/locale-runtime.js";
import {parseModelJSON} from "../src/model-json.js";

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const body=safeBody(req),sourceLocale=normalizeLocale(body.sourceLocale),targetLocale=normalizeLocale(body.targetLocale),strings=Array.isArray(body.strings)?body.strings.map(x=>String(x??"").trim()).filter(Boolean).slice(0,220):[];
  if(!strings.length)return json(res,200,{translations:[]});
  if(sourceLocale===targetLocale)return json(res,200,{translations:strings.map(source=>({source,translated:source}))});
  const system=`You are Elyndra's lossless runtime translator. Translate every input string into the target language while preserving factual meaning, names, numbers, game state, uncertainty, and knowledge boundaries. Never add lore, reveal hidden information, summarize, censor, or answer the text. Keep each output item aligned to the same input index. Return JSON only as {"translations":["..."]}. ${languageContract(targetLocale)}`;
  const raw=await callModel({signal:req.elyndraSignal,locale:targetLocale,system,user:JSON.stringify({sourceLocale,targetLocale,strings}),temperature:.05,timeoutMs:60000,maxOutputTokens:4096});
  const parsed=parseModelJSON(raw),translated=Array.isArray(parsed?.translations)?parsed.translations:[];
  if(translated.length!==strings.length)throw new Error("TRANSLATION_COUNT_MISMATCH");
  return json(res,200,{translations:strings.map((source,i)=>({source,translated:String(translated[i]??"").trim()||source}))});
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}
