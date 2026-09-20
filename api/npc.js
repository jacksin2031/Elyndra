import {json,methodGuard,safeBody,callModel} from "./_ai.js";
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {message,npc,knownFacts=[],memories=[],scene}=safeBody(req);
  if(!message||!npc?.name)return json(res,400,{error:"INVALID_REQUEST"});
  const system=`你扮演 Elyndra NPC「${npc.name}」。只能使用提供的 knownFacts 與 memories；不知道就明確表現不知道，不可偷看世界秘密。保持角色性格，繁體中文，1-4句。`;
  const text=await callModel({system,user:JSON.stringify({message,goal:npc.goal,trust:npc.trust,knownFacts:knownFacts.slice(0,20),memories:memories.slice(-10),scene}),temperature:.85});
  return json(res,200,{text});
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}
