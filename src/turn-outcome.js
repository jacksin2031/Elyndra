import {normalizeActionIntent} from "./action-intent.js?v=59015";
import {buildResolutionOutcome} from "./resolution-engine.js?v=59015";
import {deriveDirtyFlags,planStateSync} from "./state-sync.js?v=57025";
const clean=(v,max=220)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(rows,max=20)=>[...new Set((Array.isArray(rows)?rows:[]).map(x=>clean(x,220)).filter(Boolean))].slice(0,max);
export function turnDirectorMode(action,roll={},snapshot={}){
 const normalized=normalizeActionIntent({},action,roll?.profile?.kind||"",snapshot),dirtyFlags=deriveDirtyFlags({action,intent:normalized,roll,snapshot});
 return planStateSync({action,intent:normalized,roll,snapshot,kernel:{dirtyFlags}}).mode
}
function confirmedOutcome(intent,resolution){
 const label=intent?.raw||"這次行動",tier=String(resolution?.tier||"");
 if(tier==="CRITICAL_SUCCESS")return `「${label}」的直接目的明確達成，結果可以呈現得乾脆而有力；不要額外補出未提供的隱藏真相。`;
 if(tier==="STRONG_SUCCESS")return `「${label}」的直接目的已達成，而且這次判定本身沒有強制代價；額外資訊只能來自目前可見事實。`;
 if(tier==="SUCCESS_WITH_COST")return `「${label}」的直接目的已達成，但同時要讓一項代價在場景中可感知地成立；不要把代價省略。`;
 if(tier==="CRITICAL_FAILURE")return `「${label}」未達成預期目的，而且局勢必須留下明確的不利變化；不可用新資訊把失敗抵消成成功。`;
 return `「${label}」未達成預期目的；局勢仍可往前推進並留下新的可行方向，但不能把主要目的描述成已完成。`
}
export function buildTurnOutcomeKernel({action="",intent=null,roll={},snapshot={}}={}){
 const normalized=normalizeActionIntent(intent||{},action,roll?.profile?.kind||"",snapshot),resolution=buildResolutionOutcome({roll,intent:normalized,snapshot});
 const visible=[
  ...(snapshot?.knownFacts||[]),
  snapshot?.world?.location||"",
  snapshot?.weather?.observableName||"",
  snapshot?.weather?.sensoryCue||"",
  ...(snapshot?.registry?.npcs||[]).filter(x=>x?.present===true).map(x=>x.name),
  ...(snapshot?.companions||[]).map(x=>x.name)
 ],allowedVisibleFacts=uniq(visible,24),dirtyFlags=deriveDirtyFlags({action,intent:normalized,roll,snapshot});
 const result={success:roll?.success===true,grade:clean(roll?.grade,40),natural:Number(roll?.natural)||0,total:Number(roll?.total)||0,dc:Number(roll?.dc)||0,kind:normalized.kind};
 return {
  version:2,
  actionIntent:normalized,
  result,
  resolution,
  fiction:{outcomeTier:resolution.tier,goalAchieved:resolution.goalAchieved,costTypes:resolution.costs.map(x=>x.type),complicationTypes:resolution.complications.map(x=>x.type),opportunityTypes:resolution.opportunities.map(x=>x.type),allowedVisibleFacts},
  mechanics:{action:{intent:normalized.intent,kind:normalized.kind,approach:normalized.approach,goal:normalized.goal,risk:normalized.risk,targetIds:[...(normalized.targetIds||[])],toolIds:[...(normalized.toolIds||[])]},roll:{...result,margin:resolution.margin},outcome:{tier:resolution.tier,goalAchieved:resolution.goalAchieved,costs:resolution.costs,complications:resolution.complications,opportunities:resolution.opportunities}},
  confirmedOutcome:confirmedOutcome(normalized,resolution),
  allowedVisibleFacts,
  dirtyFlags,
  forbiddenClaims:[
   "不可宣稱未揭露地點、勢力、人物、物品或歷史的正式名稱",
   "不可宣稱未知建造者、真正目的、隱藏歷史或 Director Truth",
   "不可把未經 State Director commit 的新實體／新地點當成已確認 Canon",
   "不可把未達成目的的結果描述成主要目的已完成，亦不可改寫 Engine 擁有的判定結果"
  ],
  authority:{engineOwns:["actionIntent","feasibility","DC","roll","resolution","mechanics","confirmedOutcome","dirtyFlags","stateRevision","finalState"],stateDirectorMayPropose:["StatePatch operations explicitly granted by the Engine sync plan"],sceneNarratorMayCreate:["sensoryProse","sceneTitle","contextualSuggestions"]}
 }
}
export function validateKernelBoundaries(candidate={},kernel={}){
 const errors=[],success=kernel?.result?.success===true;
 if(!success&&candidate?.worldNameKnown===true)errors.push("KERNEL_FAILURE_WORLD_NAME_REVEAL");
 if(!success&&candidate?.calendarKnown===true)errors.push("KERNEL_FAILURE_CALENDAR_REVEAL");
 return {valid:errors.length===0,errors}
}
