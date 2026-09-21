import {normalizeActionIntent} from "./action-intent.js?v=37000";
const clean=(v,max=220)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(rows,max=20)=>[...new Set((Array.isArray(rows)?rows:[]).map(x=>clean(x,220)).filter(Boolean))].slice(0,max);
export function turnDirectorMode(action,roll={},snapshot={}){
 const q=String(action||"").toLowerCase(),kind=String(roll?.profile?.kind||"").toUpperCase();
 if(snapshot?.combat?.active||/摧毀|炸毀|燒毀|殺死|處決|征服|佔領|推翻|宣戰|大型儀式|封印|解除封印|改寫|改變世界|destroy|conquer|overthrow|declare war|ritual/i.test(q))return "DEEP";
 if(/交給|交出|贈送|說服|威脅|邀請|加入|離隊|學習|學會|施法|魔法|製作|打造|聲望|勢力|任務|偷竊|闖入|破壞|give|persuade|threaten|invite|join|leave|learn|cast|craft|faction|quest|steal|break/i.test(q))return "DEFERRED";
 if(kind==="RISKY"&&/攀|跳|闖|偷|破壞|climb|jump|break|steal/i.test(q))return "DEFERRED";
 return "FAST"
}
function confirmedOutcome(intent,roll){
 const label=intent?.raw||"這次行動",success=roll?.success===true,grade=String(roll?.grade||"");
 if(grade==="CRITICAL_SUCCESS")return `Engine 已確認「${label}」取得非常明確的成功；可以描寫直接感官成果，但新 Canon 名稱／身份仍需 State Director commit。`;
 if(grade==="CRITICAL_FAILURE")return `Engine 已確認「${label}」失敗並產生可感知代價或限制；不可敘述成成功，也不可把未知真相當成補償。`;
 if(success)return `Engine 已確認「${label}」成功達成其可合理判定的直接目的；只能在目前可見資訊範圍內具體化結果。`;
 return `Engine 已確認「${label}」未達成預期目的；可以暴露限制、代價或新線索，但不可把主要目的描述成已完成。`
}
export function buildTurnOutcomeKernel({action="",intent=null,roll={},snapshot={}}={}){
 const normalized=normalizeActionIntent(intent||{},action,roll?.profile?.kind||"",snapshot);
 const visible=[
  ...(snapshot?.knownFacts||[]),
  snapshot?.world?.location||"",
  snapshot?.weather?.observableName||"",
  snapshot?.weather?.sensoryCue||"",
  ...(snapshot?.registry?.npcs||[]).filter(x=>x?.present===true).map(x=>x.name),
  ...(snapshot?.companions||[]).map(x=>x.name)
 ];
 return {
  version:1,
  actionIntent:normalized,
  result:{success:roll?.success===true,grade:clean(roll?.grade,40),natural:Number(roll?.natural)||0,total:Number(roll?.total)||0,dc:Number(roll?.dc)||0,kind:normalized.kind},
  confirmedOutcome:confirmedOutcome(normalized,roll),
  allowedVisibleFacts:uniq(visible,24),
  forbiddenClaims:[
   "不可宣稱未揭露地點、勢力、人物、物品或歷史的正式名稱",
   "不可宣稱未知建造者、真正目的、隱藏歷史或 Director Truth",
   "不可把未經 State Director commit 的新實體／新地點當成已確認 Canon",
   "不可把失敗描述成已完成主要目的，亦不可改寫 Engine 的 success/grade"
  ],
  authority:{engineOwns:["actionIntent","feasibility","DC","roll","confirmedOutcome","finalState"],stateDirectorMayPropose:["discoveries","items","entityReveals","encounter","generation","worldImpacts"],sceneNarratorMayCreate:["sensoryProse","sceneTitle","contextualSuggestions"]}
 }
}
export function validateKernelBoundaries(candidate={},kernel={}){
 const errors=[],success=kernel?.result?.success===true;
 if(!success&&candidate?.worldNameKnown===true)errors.push("KERNEL_FAILURE_WORLD_NAME_REVEAL");
 if(!success&&candidate?.calendarKnown===true)errors.push("KERNEL_FAILURE_CALENDAR_REVEAL");
 return {valid:errors.length===0,errors}
}
