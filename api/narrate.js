import {json,methodGuard,safeBody,callModel} from "./_ai.js";
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,roll,world,weather=null,visibleFacts=[]}=safeBody(req),label=String(action||"").trim();
  if(!label||label.length>240||!roll||!world)return json(res,400,{error:"INVALID_REQUEST"});
  const system="你是 Elyndra 的繁體中文敘事者。只能描述已發生的遊戲結果。不得改變骰子、HP、物品、Canon、角色生死或創造玩家尚未獲准知道的秘密。不得假設任何預設人物、地名、貨幣或敵人。weather 若存在，只可自然描述其目前可感知效果，不得推測背後未公開規則。回答 80-180 字，不要使用 Markdown。";
  const user=JSON.stringify({action:label,roll,world:{name:world.name,day:world.day,location:world.location},weather,visibleFacts:visibleFacts.slice(0,20)});
  const text=await callModel({system,user,temperature:.75,timeoutMs:45000});return json(res,200,{text});
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}
