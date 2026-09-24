import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {parseModelJSON} from "../src/model-json.js";

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {plan,world,constitution,futureRefs}=safeBody(req);
  if(!plan?.historyId||!plan?.skeleton||!plan?.targetDepth)return json(res,400,{error:"HISTORY_DEEPENING_PLAN_REQUIRED"});
  const system=`你是 Elyndra History Deepening Architect。Engine 已鎖定 plan.skeleton，絕對不可修改、覆蓋、重新命名或改變其因果。只可為 plan.targetDepth 新增隱藏 Canon detail，且 additions 每一組都不得超過 plan.quotas。existingDetail 已提交，不能重寫或重複。所有新增內容必須由 skeleton.causes、summary、legacies 解釋並遵守 Constitution。accounts 可以互相矛盾或帶偏見；documents 只是未來可發現證據；relics 只是未來可具現化遺物種子；生成本身絕不代表玩家知道這些內容。clueRefs 只能引用 plan.clues 的既有 id；futureRefs 只能引用 plan.skeleton.futureRefs。禁止輸出 historyPatch、title、summary、causes、legacies、era、category。只輸出 JSON：{"historyId":"與 plan 相同","targetDepth":"OUTLINE|DEEP|FULL","additions":{"actors":[],"places":[],"chronology":[],"accounts":[],"documents":[],"relics":[],"solutionClues":[]}}。`;
  const raw=await callModel({signal:req.elyndraSignal,system,user:JSON.stringify({plan,world,constitution,futureRefs}),temperature:.5,timeoutMs:50000});
  let candidate;try{candidate=parseModelJSON(raw)}catch{return json(res,422,{error:"INVALID_MODEL_JSON"})}
  return json(res,200,{candidate})
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message||"HISTORY_DEEPENING_FAILED"})}
}