import {json,methodGuard,safeBody,callModel} from "./_ai.js";
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {seed,constitution}=safeBody(req);if(!seed)return json(res,400,{error:"INVALID_REQUEST"});
  const system="你是 Elyndra World Architect。輸出嚴格 JSON，不要 Markdown。生成內容必須服從 constitution，避免自相矛盾。只生成候選內容，最終 Canon 由 Game Engine 驗證。";
  const user=JSON.stringify({seed,constitution,required:{summary:"string",publicFacts:["string"],hiddenFacts:["string"],openingHook:"string"}});
  const raw=await callModel({system,user,temperature:.8});let candidate;try{candidate=JSON.parse(raw)}catch{return json(res,422,{error:"INVALID_MODEL_JSON"})}
  if(!candidate.summary||!Array.isArray(candidate.publicFacts)||!Array.isArray(candidate.hiddenFacts)||!candidate.openingHook)return json(res,422,{error:"INVALID_WORLD_CANDIDATE"});
  return json(res,200,{candidate});
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}
