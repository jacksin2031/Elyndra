import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {sceneTurnSnapshot,mergeTurnCandidates} from "../src/turn-compiler.js";

const parse=raw=>{try{return JSON.parse(raw)}catch{throw Object.assign(new Error("INVALID_MODEL_JSON"),{code:"INVALID_MODEL_JSON"})}};

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,roll,snapshot}=safeBody(req);if(!action||!roll||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});

  const sceneSystem=`你是 Elyndra Scene Narrator。你只負責玩家可見敘事與下一步建議，不可修改世界狀態、Canon、NPC 關係、勢力、任務、戰鬥、物品或世界影響。骰子結果由 Engine 決定，不能改。只可使用玩家已知資訊，不得引用 director-only 資訊或發明未揭露專有名詞。narrative 必須忠於 roll.success / grade。只使用繁體中文，不得輸出 [世界動向]、【世界改變】、SYSTEM 等系統標籤。suggestions 每輪應與 priorSuggestions 有實質變化，除非場景完全沒有改變；不得使用其他語言。只輸出 JSON：{"narrative":"80-180字繁體中文","suggestions":["3-4個只基於眼前資訊的下一步行動"]}`;

  const stateSystem=`你是 Elyndra State Director。你只負責結構化世界狀態候選，不寫長篇敘事。骰子結果不可修改。snapshot.world.seedContract 是硬性世界合約；directorRegistry 與 directorTimeline 只供保持 Canon，directorTruth 不得寫入玩家可見欄位。npcChanges 只能引用已知 NPC id；companionChanges 只可對已知 NPC 使用 OFFER 或 LEAVE；只有行動與骰子合理導致直接衝突才建立 encounter。worldImpacts 只用於玩家真正造成的持久改變，不得改寫過去 Canon，scope 不得高於 snapshot.worldImpact.capability.maxScope；REGIONAL 以上才可調整未觸發 Timeline；recognition 必須忠於已成立 impact，spread 不得超過 impact scope。既有實體只用 entityReveals，不得重建。普通行動可回空 generation/worldImpacts。item.checkBonuses 只可用於功能性工具／裝備，單項每類 -2 至 2。outcomeSummary 只作敘事 AI 失敗時 fallback，必須使用繁體中文且不得帶系統標籤。只輸出 JSON：{"outcomeSummary":"40-100字可見結果摘要","location":null,"worldNameKnown":false,"calendarKnown":false,"discoveries":[{"title":"...","text":"..."}],"items":[{"name":"...","description":"...","lore":{"story":"...","unlockKeywords":["..."],"minMatches":1},"checkBonuses":{"OBSERVE|SOCIAL|TRAVEL|RISKY|GENERAL|ALL":"可選整數 -2 至 2"}}],"npcChanges":[{"npcId":"已知 NPC id","trustDelta":0}],"companionChanges":[{"npcId":"已知 NPC id","action":"OFFER|LEAVE","reason":"..."}],"factionChanges":[{"factionId":"已知勢力 id","reputationDelta":0}],"quest":{"title":null,"objective":null},"entityReveals":[{"kind":"location|npc|faction|sideQuest","id":"既有 id"}],"encounter":null,"generation":{"locations":[],"npcs":[],"factions":[],"sideQuests":[]},"worldImpacts":[]}`;

  const scenePromise=callModel({system:sceneSystem,user:JSON.stringify({action,roll,snapshot:sceneTurnSnapshot(snapshot)}),temperature:.8,timeoutMs:35000,maxOutputTokens:700}).then(parse);
  const statePromise=callModel({system:stateSystem,user:JSON.stringify({action,roll,snapshot}),temperature:.55,timeoutMs:50000,maxOutputTokens:1800}).then(parse);
  const [sceneResult,stateResult]=await Promise.allSettled([scenePromise,statePromise]);

  if(stateResult.status!=="fulfilled")throw stateResult.reason;
  const scene=sceneResult.status==="fulfilled"?sceneResult.value:null;
  return json(res,200,{candidate:mergeTurnCandidates(scene,stateResult.value,roll,{action,priorSuggestions:snapshot?.priorSuggestions||[]})})
 }catch(e){
  const status=e.code==="AI_NOT_CONFIGURED"?503:e.code==="INVALID_MODEL_JSON"?422:502;
  return json(res,status,{error:e.code||e.message})
 }
}
