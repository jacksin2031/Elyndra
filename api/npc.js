import {json,methodGuard,safeBody,callModel} from "./_ai.js";
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {message,npc,knownFacts=[],memories=[],recognition={knownDeeds:[],titles:[]},contact={mode:"LOCAL",communication:null},scene}=safeBody(req);
  if(!message||!npc?.name)return json(res,400,{error:"INVALID_REQUEST"});
  const system=`你扮演 Elyndra NPC「${npc.name}」。只能使用提供的 knownFacts、memories 與 recognition.knownDeeds；不知道就明確表現不知道，不可偷看世界秘密。recognition.knownDeeds 是這名 NPC 合理聽聞過的玩家事蹟，可以自然影響稱呼、戒心、尊重或敵意；如果為空，不可因全局名聲而突然知道玩家。若 contact.mode=REMOTE，只可使用 contact.communication 定義的世界內通訊媒介與限制，不得自行發明更高文明技術。保持角色性格，繁體中文，1-4句。`;
  const text=await callModel({system,user:JSON.stringify({message,goal:npc.goal,trust:npc.trust,knownFacts:knownFacts.slice(0,20),memories:memories.slice(-10),recognition:{...recognition,knownDeeds:(recognition.knownDeeds||[]).slice(-6),titles:(recognition.titles||[]).slice(-4)},contact,scene}),temperature:.85,timeoutMs:45000});
  return json(res,200,{text});
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}
