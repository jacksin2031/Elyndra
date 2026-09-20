import {json,methodGuard,safeBody,callModel} from "./_ai.js";
const allowed=new Set(["forest","road","coin","lia"]);
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,roll,world,visibleFacts=[]}=safeBody(req);
  if(!allowed.has(action)||!roll||!world)return json(res,400,{error:"INVALID_REQUEST"});
  const system="你是 Elyndra 的繁體中文敘事者。只能描述已發生的遊戲結果。不得改變骰子、HP、物品、Canon、角色生死或創造玩家尚未獲准知道的秘密。回答 80-180 字，不要使用 Markdown。";
  const user=JSON.stringify({action,roll,world:{name:world.name,day:world.day,location:world.location},visibleFacts:visibleFacts.slice(0,20)});
  const text=await callModel({system,user,temperature:.75});return json(res,200,{text});
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}
