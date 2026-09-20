import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {sceneTurnSnapshot,mergeTurnCandidates} from "../src/turn-compiler.js";

const parse=raw=>{try{return JSON.parse(raw)}catch{throw Object.assign(new Error("INVALID_MODEL_JSON"),{code:"INVALID_MODEL_JSON"})}};

export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {action,roll,snapshot}=safeBody(req);if(!action||!roll||!snapshot)return json(res,400,{error:"INVALID_REQUEST"});

  const sceneSystem=`你是 Elyndra Scene Narrator。你只負責玩家可見敘事與下一步建議，不可修改世界狀態、Canon、NPC 關係、勢力、任務、戰鬥、物品或世界影響。骰子結果由 Engine 決定，不能改。只可使用玩家已知資訊，不得引用 director-only 資訊或發明未揭露專有名詞。snapshot.weather 是玩家目前可直接感知的天氣，敘事要自然反映其感官效果，但不可揭露未發現的 Weather Canon。narrative 必須忠於 roll.success / grade。sceneTitle 是給玩家看的目前目標，必須用動詞導向，反映最新位置、衝突或劇情發展，例如「調查鐘聲來源」；不得只寫氣氛章節名，也不得固定使用「陌生世界的第一天」。只使用繁體中文，不得輸出 [世界動向]、【世界改變】、SYSTEM 等系統標籤。suggestions 每輪應與 priorSuggestions 有實質變化，除非場景完全沒有改變；不得使用其他語言。只輸出 JSON：{"sceneTitle":"4-18字繁體中文目前目標","narrative":"80-180字繁體中文","suggestions":["3-4個只基於眼前資訊的下一步行動"]}`;

  const stateSystem=`你是 Elyndra State Director。你只負責結構化世界狀態候選，不寫長篇敘事。骰子結果不可修改。snapshot.world.seedContract 是硬性世界合約；directorRegistry、directorTimeline、directorHistory、directorCanon 與 directorWeather 只供保持 Canon，directorTruth 不得寫入玩家可見欄位。天氣由 Engine 推進，State Director 不可自行改寫目前天氣或臨時創造新 weather phenomenon。npcChanges 只能引用 snapshot.registry.npcs 中 present=true 或 remoteContactable=true 的 NPC id或 ACTIVE 夥伴；沒有合法聯絡方式的遠處 NPC 不可直接互動。companionChanges 只可對 present=true NPC 或 ACTIVE 夥伴使用 OFFER 或 LEAVE；location 只可引用既有 Canon 地點或本回合實際新到達的 generation 地點；只有行動與骰子合理導致直接衝突才建立 encounter；敵人的 element / weaknesses / resistances / abilities 必須來自本世界設定與當前場景，不得套用固定怪物模板。discoveries 只有在本回合成功行動實際取得證據時才可引用 directorCanon 的 factId；無法對應 Canon 的內容只能作未驗證觀察，不得當作世界真相。worldImpacts 只用於玩家真正造成的持久改變，不得改寫過去 Canon，scope 不得高於 snapshot.worldImpact.capability.maxScope；REGIONAL 以上才可調整未觸發 Timeline；recognition 必須忠於已成立 impact，spread 不得超過 impact scope。既有實體只用 entityReveals，不得重建。若 generation 新增 location，必須附 weatherProfile，而且只可引用 snapshot.directorWeather.system.phenomena 已存在的 id，不得創造新天氣。普通行動可回空 generation/worldImpacts。magicLearning 只有玩家本回合成功取得並理解對應 Canon 證據時才可使用，每回合最多 1 個，sourceFactId 必須存在於 directorCanon；不得憑空發明玩家已學會的法術。item.evidenceFactId 只有在同一回合 discoveries 已用相同 factId 取得 VERIFIED Canon 證據時才可填；物品名稱本身不能當作任務真相。item.checkBonuses 只可用於功能性工具／裝備，單項每類 -2 至 2。outcomeSummary 只作敘事 AI 失敗時 fallback，必須使用繁體中文且不得帶系統標籤。只輸出 JSON：{"outcomeSummary":"40-100字可見結果摘要","location":null,"worldNameKnown":false,"calendarKnown":false,"discoveries":[{"title":"...","text":"...","factId":"directorCanon 中既有 fact id；沒有可驗證 Canon 時留空","evidenceType":"OBSERVED|HEARD|READ|EXAMINED"}],"items":[{"name":"...","description":"...","evidenceFactId":"只有同回合 verified discovery 支持此物品為任務證據時填 fact id，否則留空","lore":{"story":"...","unlockKeywords":["..."],"minMatches":1},"checkBonuses":{"OBSERVE|SOCIAL|TRAVEL|RISKY|GENERAL|ALL":"可選整數 -2 至 2"}}],"magicLearning":[{"name":"本世界法術名","school":"本世界魔法流派","cost":10,"effect":"可驗證效果","sourceFactId":"directorCanon 中明確支持此法術／術式的 fact id"}],"npcChanges":[{"npcId":"已知 NPC id","trustDelta":0}],"companionChanges":[{"npcId":"已知 NPC id","action":"OFFER|LEAVE","reason":"..."}],"factionChanges":[{"factionId":"已知勢力 id","reputationDelta":0}],"quest":{"title":null,"objective":null},"entityReveals":[{"kind":"location|npc|faction|sideQuest","id":"既有 id"}],"encounter":null,"generation":{"locations":[],"npcs":[],"factions":[],"sideQuests":[]},"worldImpacts":[{"scope":"PERSONAL|LOCAL|REGIONAL|FACTION|WORLD","targetKind":"location|npc|faction|world","targetId":"已存在 id|CURRENT_LOCATION|WORLD","title":"持久改變","summary":"可驗證結果","reason":"直接因果","outcome":"BENEFIT|COST|MIXED","mutations":[{"field":"合法數值欄位|statusTag|structure","op":"DELTA|ADD_TAG|REMOVE_TAG|STRUCTURE","value":"數值／標記；STRUCTURE 時為 {id,label,state,description}"}],"consequences":[],"timelineEffects":[]}]}`;

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
