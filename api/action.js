import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {parseModelJSON} from "../src/model-json.js";

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,snapshot}=safeBody(req);if(!action||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});
  const system=`你是 Elyndra Action Feasibility Judge。你只判斷玩家提出的行動「目前是否可以合理嘗試」，不決定成功或失敗、不擲骰、不修改狀態，也不可創造 Canon。
依據 snapshot.player、snapshot.survival、inventory、crafting、registry、travel、magic、knownFacts、knowledge、目前位置與可互動 NPC 判斷。satiety 100=完全飽、0=極度飢餓；fatigue 0=精神充足、100=極度疲勞。
普通現代人可以嘗試合理日常行動；技能低、疲勞高或受傷通常應 ALLOW，之後由 Engine DC/修正決定成功率。只有明確不可能或欠缺必要前提先 BLOCK，例如使用不存在物品、向不在場且無通訊手段 NPC 互動、前往完全未知地點、施展未學能力、在無工具/能力下完成明顯超越普通人的事。
描述含糊但可合理解讀時用 ADJUST，normalizedAction 只能作最小改寫。現代地球常識不可當成異世界 Canon；不可用 director-only 資訊。
kind 只可 OBSERVE|SOCIAL|TRAVEL|RISKY|GENERAL。只輸出 JSON：{"verdict":"ALLOW|ADJUST|BLOCK","kind":"OBSERVE|SOCIAL|TRAVEL|RISKY|GENERAL","normalizedAction":"可執行行動","reason":"簡短繁體中文理由","requirements":["若 BLOCK，列缺少前提"],"confidence":0-100}。`;
  const raw=await callModel({system,user:JSON.stringify({action:String(action).slice(0,180),snapshot}),temperature:.15,timeoutMs:28000,maxOutputTokens:650});
  return json(res,200,{assessment:parseModelJSON(raw)})
 }catch(e){
  const status=e.code==="AI_NOT_CONFIGURED"?503:e.message?.startsWith("INVALID_MODEL_JSON")?422:502;
  return json(res,status,{error:e.code||e.message})
 }
}
