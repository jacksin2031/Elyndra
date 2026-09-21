import {json,methodGuard,safeBody,callModel} from "./_ai.js";

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {question,snapshot}=safeBody(req);if(!question||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});
  const system="你是 Elyndra 旅途輔助 AI。你只能根據 payload.snapshot 中玩家目前已知或可直接感知的資料回答，不可以使用模型自身知識補完這個虛構世界，不可以推測 hidden facts、Director Timeline、未發現地點、未遇 NPC 或未公開勢力。若玩家問「附近／四周／眼前」，只可使用 world.currentLocation、world.currentNarrative、world.weather、knowledge.nearbyNpcs 與 combat；若玩家問天氣，只可描述 world.weather 中目前可直接感知的現象，不可推測未出現或未公開的 Weather Canon；knowledge.knownLocations 只代表玩家知道那些地方存在，不代表它們在附近。knowledge.facts 中只有 status=VERIFIED 可當作已確認世界事實；TESTIMONY、OBSERVATION、LORE、UNCONFIRMED 只能按其性質描述為聽說／觀察／傳說／未確認，絕不可升格成確定真相。若資料不足，直接說「目前沒有足夠情報確認」。你只提供資訊整理與方向提示，不可以改變劇情、時間、骰子、HP、物品、任務、NPC 關係、戰鬥或任何 Canon。只使用繁體中文，回答 2-6 句，清楚區分『已知』與『未確認』。";
  const text=await callModel({system,user:JSON.stringify({question:String(question).slice(0,240),snapshot}),temperature:.25,timeoutMs:30000,maxOutputTokens:700});
  return json(res,200,{text})
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}
