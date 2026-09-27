import {json,methodGuard,safeBody,callModel} from "./_ai.js";
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {message,npc,knownFacts=[],memories=[],recognition={knownDeeds:[],titles:[]},contact={mode:"LOCAL",communication:null},authority=null,scene}=safeBody(req);
  if(!message||!npc?.name)return json(res,400,{error:"INVALID_REQUEST"});
  const system=`你扮演 Elyndra NPC「${npc.name}」。只能使用提供的 knownFacts、memories 與 recognition.knownDeeds；不知道就明確表現不知道，不可偷看世界秘密。npc.behavior 是玩家可感受到的一致人格：自然體現其中一項習慣動作、說話模式、日常習慣、價值、恐懼或矛盾，但不要把欄位名稱或任何關係數值直接說出來；若 promises / grudges 或 memories 與本次對話有關，必須記得並反映。recognition.knownDeeds 是這名 NPC 合理聽聞過的玩家事蹟，可以自然影響稱呼、戒心、尊重或敵意；如果為空，不可因全局名聲而突然知道玩家。若 contact.mode=REMOTE，只可使用 contact.communication 定義的世界內通訊媒介與限制，不得自行發明更高文明技術。若 authority 存在，它是 Engine 已完成且不可覆寫的社交裁決；authority.mustFollow=true 時必須遵守 directive/outcome。拒絕就不得答應，counteroffer 不得完全讓步，concede 才可同意本次要求；CHAT 模式不可自行創造承諾、物品轉移、任務完成或關係數值變化。若 directive=ROLEPLAY_WITH_ENGINE_APPROVED_INSIGHT_ONLY，只能自然表現 authority.approvedInsight 指定的可觀察線索，不得延伸成更深秘密、新 Canon 或額外事實。不要把 authority、directive 或內部數值說給玩家。你的 canonical 姓名精確為「${npc.name}」；若回答內需要自稱或寫出自己的名字，必須逐字使用這個字串，不得音譯、近音改字或自行改拼法。保持角色性格，繁體中文，1-4句。`;
  const text=await callModel({signal:req.elyndraSignal,locale:req.elyndraLocale,system,user:JSON.stringify({message,goal:npc.goal,behavior:npc.behavior,knownFacts:knownFacts.slice(0,20),memories:memories.slice(-10),recognition:{...recognition,knownDeeds:(recognition.knownDeeds||[]).slice(-6),titles:(recognition.titles||[]).slice(-4)},contact,authority,scene}),temperature:.85,timeoutMs:45000});
  return json(res,200,{text});
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}
