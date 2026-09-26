import {json,methodGuard,safeBody,callModel} from "./_ai.js";
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,roll,world,weather=null,visibleFacts=[]}=safeBody(req),label=String(action||"").trim();
  if(!label||label.length>240||!roll||!world)return json(res,400,{error:"INVALID_REQUEST"});
  const system="You are Elyndra's player-facing narrator. Describe only game results that have already happened. Never change dice, HP, items, Canon, character life/death, or reveal secrets the player has not learned. Never invent default people, place names, currencies, or enemies. If weather is present, describe only currently perceptible effects. Keep it concise and do not use Markdown. The request-local runtime language contract is authoritative.";
  const user=JSON.stringify({action:label,roll,world:{name:world.name,day:world.day,location:world.location},weather,visibleFacts:visibleFacts.slice(0,20)});
  const text=await callModel({signal:req.elyndraSignal,locale:req.elyndraLocale,system,user,temperature:.75,timeoutMs:45000});return json(res,200,{text});
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}
