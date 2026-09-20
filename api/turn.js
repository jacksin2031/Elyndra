import {json,methodGuard,safeBody,callModel} from "./_ai.js";
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,roll,snapshot}=safeBody(req);if(!action||!roll||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});
  const system=`你是 Elyndra Adventure Director。遊戲引擎已決定骰子結果，你不能改變它。snapshot.world.seedContract 是硬性世界合約。玩家只知道 knownFacts、knowledge、registry、已知 location、可見物品與本回合合理取得的新資訊；directorRegistry 只用來避免重複生成，不能直接洩漏給玩家。每回合 suggestions 必須依當前場景重新生成。npcChanges 只能引用 snapshot.registry 中已知 NPC 的 id，不存在任何預設 NPC。只有本回合行動及骰子結果合理導致直接衝突時，才可回 encounter；敵人必須符合本世界，不存在預設怪物。只輸出 JSON：
{"narrative":"80-220字繁體中文","location":null或字串,"worldNameKnown":false,"discoveries":[{"title":"...","text":"..."}],"items":[{"name":"...","description":"玩家當下可見描述","lore":{"story":"只生成一次","unlockKeywords":["線索"],"minMatches":1}}],"npcChanges":[{"npcId":"已知 NPC id","trustDelta":整數-2至2}],"factionChanges":[{"factionId":"已知勢力 id","reputationDelta":整數-5至5}],"quest":{"title":null或字串,"objective":null或字串},"entityReveals":[{"kind":"location|npc|faction|sideQuest","id":"directorRegistry 中既有實體 id"}],"encounter":null或{"type":"combat","enemy":{"name":"符合本世界的敵對存在","level":1,"hp":20,"defense":11,"damage":6,"loot":"可空字串"}},"generation":{"locations":[],"npcs":[],"factions":[],"sideQuests":[{"title":"...","objective":"...","known":true或false,"evidenceKeywords":["2-5個可驗證線索詞"],"target":3}]},"suggestions":["3-4個下一步行動"]}
不得洩漏 hiddenFacts。不得聲稱玩家成功做到與 roll.success 相反的事。每次最多新增2個 discoveries、1個 item。既有實體只用 entityReveals，不得重建或再次生成 lore。`;
  const raw=await callModel({system,user:JSON.stringify({action,roll,snapshot}),temperature:.85});let candidate;try{candidate=JSON.parse(raw)}catch{return json(res,422,{error:"INVALID_MODEL_JSON"})}
  return json(res,200,{candidate})
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}