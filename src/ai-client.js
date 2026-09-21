import {hasDirectAI,directChat} from "./ai-settings.js?v=340";
import {seedDirective} from "./seed-contract.js?v=276";
import {recognitionForNpc} from "./recognition-engine.js?v=276";
import {normalizeWorldIdentity,mergeCoreWave,coreWaveIssues,buildWorldAnchorContract,mergeOpeningRegion,normalizeFutureLinksToAnchor,worldGenerationLinkIssues} from "./world-compiler.js?v=332";
import {sceneTurnSnapshot,fastTurnStateSnapshot,mergeTurnCandidates} from "./turn-compiler.js?v=335";
import {sanitizePlayerText} from "./runtime-guard.js?v=276";
import {helperSnapshot} from "./helper-context.js?v=320";
import {directorHistorySnapshot,validateWorldHistory} from "./world-history.js?v=276";
import {timelineAuthoringSlots,bindTimelineAuthoringSlots,validateWorldTimeline} from "./world-timeline.js?v=276";
import {playerWeatherSnapshot} from "./weather-engine.js?v=276";
import {createGenerationDiagnostics,recordGenerationStage,finalizeGenerationDiagnostics,normalizeWorldEvaluation,fallbackWorldEvaluation,applyWorldRepairPatch,applyFallbackRecoveryPatch,validateExpansionProvenance} from "./world-quality.js?v=300";
import {parseModelJSON as parseJSON} from "./model-json.js?v=281";
const API_BASE=(globalThis.ELYNDRA_API_BASE||"").replace(/\/$/,"");
const apiPath=path=>API_BASE?API_BASE+path:path;
async function post(path,body){const r=await fetch(apiPath(path),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||`AI_HTTP_${r.status}`);return r.json()}

export async function aiHealth(){if(hasDirectAI())return {ok:true,aiConfigured:true,mode:"direct"};try{const r=await fetch(apiPath("/api/health"));return r.ok?await r.json():{ok:false,aiConfigured:false}}catch{return {ok:false,aiConfigured:false}}}
export function visibleFacts(state){return state.world.canon.facts.filter(f=>state.knowledge.some(k=>k.factId===f.id)).map(f=>f.text)}
export function npcKnownFacts(state,npc){const scope=new Set(Array.isArray(npc?.knowledgeScope)?npc.knowledgeScope:[]);return state.world.canon.facts.filter(f=>scope.has(f.id)).map(f=>f.text)}
export async function narrate(state,action,roll){const playerWorldName=state.player?.worldNameKnown?state.world.name:"UNKNOWN";if(hasDirectAI()){const raw=await directChat({aiTask:"narration",timeoutMs:45000,system:"你是 Elyndra 的繁體中文敘事者。玩家只知道 payload 中 visibleFacts、playerLocation 與這次行動能直接感知到的結果。world/Canon 可能存在更多真相，但不可提前說出任何未學會的世界名稱、地名、國家、勢力、歷史或規則。只能描述已由遊戲引擎決定的結果，不可改骰子、Canon、HP、物品。回答80-180字。只使用繁體中文；除既有專有名詞外不要切換成英文、日文、韓文或其他語言，也不要輸出 [世界動向]、【世界動向】、SYSTEM 等系統標籤。",user:JSON.stringify({action,roll,player:{name:state.player?.name||"無名者",worldName:playerWorldName,playerLocation:state.player.location},weather:playerWeatherSnapshot(state),visibleFacts:visibleFacts(state)})});return sanitizePlayerText(raw,700,"")}const raw=(await post("/api/narrate",{action,roll,world:{name:playerWorldName,day:state.world.state.day,location:state.player.location},weather:playerWeatherSnapshot(state),visibleFacts:visibleFacts(state)})).text;return sanitizePlayerText(raw,700,"")}
function emitWorldProgress(cb,progress,label,detail){try{cb?.({progress,label,detail})}catch{}}
const WORLD_AI_CONCURRENCY=2;
let worldAiActive=0;const worldAiWaiters=[];
async function withWorldAiSlot(task){
 if(worldAiActive>=WORLD_AI_CONCURRENCY)await new Promise(resolve=>worldAiWaiters.push(resolve));
 worldAiActive++;
 try{return await task()}
 finally{worldAiActive--;worldAiWaiters.shift()?.()}
}
function worldStageTask(stage){
 return ({IDENTITY:"identity",CORE_RULES:"core_rules",CORE_ANCHOR:"core_anchor",HISTORY:"history",GEOGRAPHY:"geography",FUTURE:"future",SOCIETY:"society",CAST:"cast",QUALITY_CRITIC:"quality",QUALITY_REPAIR:"quality_repair",WORLD_RECOVERY:"recovery",RUNTIME_EXPANSION:"runtime_expansion",RUNTIME_QUALITY_CRITIC:"runtime_quality",RUNTIME_REPAIR:"runtime_repair"})[stage]||"turn_state"
}
async function worldStage(stage,args){
 try{return await withWorldAiSlot(async()=>parseJSON(await directChat({...args,aiTask:args?.aiTask||worldStageTask(stage)}))) }
 catch(e){const suffix=e?.message||String(e);throw new Error(`WORLD_${stage}_FAILED: ${suffix}`)}
}
function compilerRecoverable(err){return /AI_TIMEOUT|EMPTY_AI_RESPONSE|INVALID_MODEL_JSON|AI_HTTP_(429|5\d\d)|WORLD_[A-Z_]+_FAILED:\s*(AI_TIMEOUT|EMPTY_AI_RESPONSE|INVALID_MODEL_JSON|AI_HTTP_(429|5\d\d))/.test(String(err?.message||err||""))}
let activeGenerationDiagnostics=null;
function markWorldFallback(stage,reason){
 recordGenerationStage(activeGenerationDiagnostics,stage,{source:"FALLBACK",reason,fallbackUsed:true})
}
function compactRetryArgs(args={},reason=""){
 const base=Math.max(350,Number(args.maxOutputTokens)||900),empty=/EMPTY_AI_RESPONSE|INVALID_MODEL_JSON:\s*empty response/i.test(String(reason)),timedOut=/AI_TIMEOUT/i.test(String(reason));
 const timeoutMs=empty?Math.max(45000,Math.min(70000,Number(args.timeoutMs)||50000)):Math.max(30000,Math.min(50000,Number(args.timeoutMs)||45000));
 const maxOutputTokens=empty?Math.min(3200,Math.max(1200,Math.round(base*1.6))):timedOut?Math.max(500,Math.min(1600,Math.round(base*.85))):Math.min(2200,Math.max(base,Math.round(base*1.15)));
 return {...args,timeoutMs,maxOutputTokens,disableOptimization:true,temperature:Math.min(.3,Number(args.temperature??.3)),system:String(args.system||"")+"\n上一次輸出未能通過編譯。這次停用額外思考優化並保留足夠可見輸出空間；只回傳 schema 要求的必要 JSON，不要 Markdown、解釋或額外欄位。"}
}
async function resilientWorldStage(stage,args,fallback){
 const startedAt=Date.now();
 try{
  const value=await worldStage(stage,args);
  recordGenerationStage(activeGenerationDiagnostics,stage,{source:"AI",latencyMs:Date.now()-startedAt,attempts:1});
  return value
 }catch(err){
  const firstReason=err?.message||String(err);
  if(!compilerRecoverable(err)){
   recordGenerationStage(activeGenerationDiagnostics,stage,{source:"FAILED",reason:firstReason,latencyMs:Date.now()-startedAt,attempts:1});
   throw err
  }
  try{
   const value=await worldStage(stage,compactRetryArgs(args,firstReason));
   recordGenerationStage(activeGenerationDiagnostics,stage,{source:"AI",reason:"RECOVERED_AFTER: "+firstReason,latencyMs:Date.now()-startedAt,attempts:2});
   return value
  }catch(retryErr){
   const retryReason=retryErr?.message||String(retryErr),reason=firstReason+" | RETRY: "+retryReason;
   recordGenerationStage(activeGenerationDiagnostics,stage,{source:"FALLBACK",reason,latencyMs:Date.now()-startedAt,attempts:2,fallbackUsed:true});
   return structuredClone(typeof fallback==="function"?fallback():fallback)
  }
 }
}
function fallbackClause(value,fallback="當前危機",max=42){
 const s=String(value||fallback).trim().replace(/[。！？!?；;,.，]+$/g,"").replace(/\s+/g," ");
 return (s||fallback).slice(0,max)
}
function identityFallback(expected,seed){
 return normalizeWorldIdentity({},expected,seed)
}
function coreRulesFallback(identity){
 const highMagic=identity.magic>=4,highCiv=identity.danger>=0&&identity.politics>=0&&identity.scale&&identity.magic>=0;
 const civLevel=Math.max(1,Math.min(5,Math.round((identity.magic+identity.politics+2)/2)));
 let communication;
 if(highMagic)communication={name:"共鳴信標",medium:"刻印水晶與共鳴節點",description:"以本世界力量規則驅動的有限遠距聯絡網，只能聯絡已建立關係的人或節點。",latency:"NEAR_INSTANT",range:civLevel>=4?"WORLD":"REGIONAL",accessRule:"ENCOUNTERED",constraints:"需要穩定節點與能量，危機或異常天候會干擾"};
 else if(civLevel>=4)communication={name:"驛塔訊鏈",medium:"固定驛塔與信號中繼",description:"依賴成熟基建逐站傳遞訊息，速度快但不是即時通訊。",latency:"DELAYED",range:"REGIONAL",accessRule:"ENCOUNTERED",constraints:"只覆蓋主要聚落與道路，斷路時失效"};
 else communication={name:"行旅信使",medium:"信使、商隊與地方驛點",description:"訊息必須跟隨實際旅程移動，符合較低文明的交通條件。",latency:"DELAYED",range:"LOCAL",accessRule:"ENCOUNTERED",constraints:"受道路、天候與危險地區影響"};
 return {worldBible:{era:"現世紀",centralConflict:`「${identity.worldTheme}」造成的資源、制度與生存方式衝突正逐步失衡。`,magicCost:"每次施術都會失去一段最近形成的清晰記憶；連續施術會先出現名字、方向與時間次序混亂，休息只能停止惡化，不能立即取回已失去的記憶。",ancientTruth:`現代社會對「${identity.worldTheme}」的理解只掌握表層，真正起源仍被歷史斷層掩埋。`,currentCrisis:`維持現有秩序的機制正在失效，使「${identity.worldTheme}」由背景規則變成迫近所有人的危機。`,tone:"陌生、探索、因果明確且帶有生存壓力",civilization:{level:civLevel,stage:civLevel<=2?"地方聚落文明":civLevel<=4?"區域網絡文明":"高度組織文明",infrastructure:civLevel<=2?"道路與地方設施有限":civLevel<=4?"主要聚落間有穩定交通與公共設施":"跨區域基建成熟但仍受世界規則限制",literacy:civLevel<=2?"知識主要由口述、宗教或少數書記保存":"多數聚落具有制度化記錄與教育",mobility:civLevel<=2?"主要依靠步行、獸力與商隊":"主要區域之間存在固定交通網"},communication}}
}
function coreAnchorFallback(identity){
 return {summary:`「${identity.worldTheme}」不只是傳說，而係會直接改變文明生活、地理環境與危機走向的世界規則。`,worldBible:{startingRegion:`${identity.worldName}邊境域`,startingSettlement:"邊境聚落",startingLocation:"異界醒轉地",weatherSystem:{identity:`天候會受到「${identity.worldTheme}」直接影響，出現現實世界不存在的異常現象。`,source:identity.worldTheme,cycle:"隨地區、世界狀態與危機程度變化",forecastability:"MEDIUM",phenomena:[{id:"WTH-1",name:"逆相風",observableName:"風向與落物方向短暫相反",description:"局部空間規則出現偏移，風與輕物會違反平常方向。",sensoryCue:"衣角與塵埃同時逆向飄動",rarity:"UNCOMMON",danger:1},{id:"WTH-2",name:"界鳴霧",observableName:"霧中遠近聲音次序混亂",description:"霧層令聲音傳播次序失常，使距離判斷變得不可靠。",sensoryCue:"近處聲音延遲、遠處聲音反而清晰",rarity:"RARE",danger:2}]},},publicFacts:[`居民普遍知道「${identity.worldTheme}」會影響日常生活與出行。`,"不同地區會用各自方法適應異常環境，沒有全世界通用的制度。"],hiddenFacts:[`「${identity.worldTheme}」目前的表現並非世界最初狀態。`,"當前危機與被遺忘的舊世界機制存在直接因果關係。"]}
}
function historyFallback(anchor){
 return [
  {id:"HIST-1",order:1,era:anchor.era||"古紀",title:"舊世界秩序的形成",category:"改革",summary:fallbackClause(anchor.centralConflict||anchor.worldTheme,"舊世界秩序")+"的前身在此時形成，並留下直到現在仍影響制度與生活的結構。",causes:[anchor.worldTheme],legacies:[anchor.centralConflict||"舊秩序仍在"],discoverKeywords:["舊紀錄"]},
  {id:"HIST-2",order:2,era:anchor.era||"中紀",title:"世界規則的代價浮現",category:"魔法",summary:fallbackClause(anchor.magicCost,"世界力量需要付出代價")+"，不同群體因如何承擔代價而產生長期分歧。",causes:[anchor.magicCost||anchor.centralConflict],legacies:["現代文化仍保留對力量代價的禁忌"],discoverKeywords:["古老禁忌"]},
  {id:"HIST-3",order:3,era:anchor.era||"今紀",title:"當前危機的前兆",category:"災難",summary:fallbackClause(anchor.currentCrisis||anchor.centralConflict,"當前危機")+"並非突然發生，而是過去矛盾累積到今天的結果。",causes:[anchor.centralConflict],legacies:[anchor.currentCrisis||"危機仍在發展"],discoverKeywords:["危機前兆"]}
 ]
}
function geographyFallback(anchor){
 const firstWeather=anchor.weatherPhenomena?.[0]?.id||"",cue=anchor.weatherPhenomena?.[0]?.observableName||"空氣中的流動方向忽然變得不自然";
 return {openingHook:`冰冷而潮濕的地面貼著背脊。遠處傳來一聲延遲的金屬鳴響，${cue}；霧後似乎有腳步靠近，但你無法判斷方向與距離。`,location:{name:anchor.startingLocation,type:"開局地點",region:anchor.startingRegion,description:`位於${anchor.startingRegion}的開局地點，其地貌與${anchor.worldTheme}直接相關。`,known:false,historyRefs:[],weatherProfile:{zone:anchor.startingRegion,affinities:firstWeather?[firstWeather]:[],suppressions:[]},lore:{story:`這個地方留下了與${anchor.centralConflict}有關的痕跡。`,unlockKeywords:["舊痕跡"],minMatches:1}}}
}
function societyFallback(anchor,history,geography){
 const href=history?.[0]?.id||"HIST-1",location=geography?.location?.name||anchor.startingLocation;
 return {locationRef:location,historyRefs:[href],locationCulture:{identity:`在${anchor.worldTheme}與本地環境下形成的生活文化`,etiquette:["先觀察當地人的做法再行動"],taboos:["不要公開輕視本地維生方式"],food:["以本地可取得物資為主"],beliefs:[anchor.centralConflict||anchor.worldTheme],architecture:["配合本地環境與天候"],clothing:["適應當地環境"],hospitality:["對陌生人先保持觀望"],namingStyle:"地方化命名",languageNotes:[]},locationTrade:{mode:"barter",currencies:[],commonBarter:["食物","工具"],foreignAcceptance:[],priceCulture:"價值取決於本地稀缺程度",questReward:0,combatReward:0},faction:{name:`${anchor.startingRegion}在地共同體`,goal:`應對「${fallbackClause(anchor.currentCrisis||anchor.centralConflict,"當前危機",34)}」帶來的壓力，維持地方生存與秩序`,description:`扎根於${location}附近，制度受${history?.[0]?.title||"舊歷史"}影響。`,known:false,locationName:location,historyRefs:[href],culture:{identity:"重視地方生存與互助",etiquette:["尊重地方規矩"],taboos:["破壞共同生存資源"],beliefs:[anchor.worldTheme]},trade:{mode:"barter",currencies:[],commonBarter:["食物","工具"],foreignAcceptance:[],priceCulture:"按稀缺程度交換",questReward:0,combatReward:0},lore:{story:`共同體的形成與「${history?.[0]?.title||"舊歷史"}」直接相關。`,unlockKeywords:[history?.[0]?.title||"舊歷史"],minMatches:1}}}
}
function futureFallback(anchor,history,pacing){
 const slots=timelineAuthoringSlots(pacing),templates=[
  h=>({title:"舊有訊路突然中斷",category:"INFRASTRUCTURE",directorTruth:`源自「${h.title}」留下的制度或設施弱點，在當前危機下首先失效。`,observableEffect:"附近居民開始發現固定聯絡與運輸節點無法如常運作，消息與物資出現延誤。"}),
  h=>({title:"外來避難者抵達邊境",category:"MIGRATION",directorTruth:`「${h.title}」留下的區域矛盾被重新引爆，迫使一批人口離開原居地。`,observableEffect:"帶著不同口音與少量行李的陌生人陸續出現，當地食物、住宿與治安開始受壓。"}),
  h=>({title:"力量代價登記開始強制執行",category:"LAW",directorTruth:`「${h.title}」形成的禁忌與制度被重新啟用，用來控制危機下的超常力量使用。`,observableEffect:"公共場所出現新的檢查與登記要求，居民談論施術代價與違規後果。"}),
  h=>({title:"主要通路因異常天候封閉",category:"WEATHER",directorTruth:`「${h.title}」造成的環境遺產與現時天候循環疊加，使一條重要通路暫時無法安全通行。`,observableEffect:"商隊改道、路標被封，市場開始出現某些日用品供應不足。"}),
  h=>({title:"地方共同體出現公開分裂",category:"POLITICS",directorTruth:`「${h.title}」留下的利益衝突，在「${fallbackClause(anchor.currentCrisis||anchor.centralConflict,"當前危機",34)}」造成的壓力下失去妥協空間。`,observableEffect:"同一聚落的人開始公開支持不同處理方案，守衛、商人與居民的行動不再一致。"}),
  h=>({title:anchor.currentCrisis||"危機進入不可忽視的轉折",category:"CRISIS",directorTruth:"過去歷史累積的矛盾在此時匯合，令當前危機正式改變區域秩序。",observableEffect:"原本零散的異常同時出現，居民開始撤離、封鎖或重新分配資源，日常秩序明顯改變。"})
 ];
 const rows=slots.map((slot,i)=>{const h=history?.[i%Math.max(1,history.length)]||{id:"HIST-1",title:"既有歷史"},t=templates[Math.min(i,templates.length-1)](h);return {...t,slot:slot.slot,pressure:Math.min(15,3+i),links:{historyRefs:[h.id||"HIST-1"],locationRefs:["STARTING_REGION"]}}});
 return {worldCalendar:{name:`${anchor.worldName}紀`,epochName:anchor.era||"現紀",dayTerm:"日",cycleTerm:"旬",longCycleTerm:"輪",daysPerCycle:10,cyclesPerLongCycle:10,cycles:["初旬","中旬","末旬"],periods:[{name:"前段",fromMinute:0,toMinute:479},{name:"中段",fromMinute:480,toMinute:959},{name:"後段",fromMinute:960,toMinute:1439}]},worldTimeline:bindTimelineAuthoringSlots(rows,pacing)}
}
function castFallback(anchor,history,region,society){
 const location=anchor.startingLocation,faction=society?.faction?.name||"";
 return {npcs:[{name:"當地引路人",role:"居民",description:`生活在${location}、熟悉最基本地方規矩的人。`,personality:"對陌生人謹慎但願意回答眼前問題",goal:"確保自己與聚落安全",locationName:location,factionName:faction,knowledgeScope:(anchor.publicFacts||[]).slice(0,2),historyRefs:[history?.[0]?.id||"HIST-1"],known:false,companionProfile:{joinThreshold:45,leaveThreshold:10,motives:["保護自己的生活圈"],boundaries:["不會為陌生人無條件冒險"]},lore:{story:`家族記憶與「${history?.[0]?.title||"舊歷史"}」有關。`,unlockKeywords:[history?.[0]?.title||"舊歷史"],minMatches:1}}],sideQuests:[],suggestions:["觀察四周","確認自己身上的物品","嘗試與附近的人打招呼"]}
}

async function recoverFallbackWorldCandidate(candidate,diagnostics,report){
 const before=finalizeGenerationDiagnostics(diagnostics);
 const stageRows=Object.entries(before.stages||{}),fallbackStages=stageRows.filter(([,row])=>row?.source==="FALLBACK").map(([stage])=>stage);
 if(fallbackStages.length<4||fallbackStages.length*2<Math.max(1,stageRows.length))return candidate;
 diagnostics.recovery={attempted:true,succeeded:false,startedAt:Date.now(),fallbackStages:[...fallbackStages],recoveredStages:[]};
 report(85,"世界自動復原",`偵測到 ${fallbackStages.length}/${stageRows.length} 個階段使用 fallback；只重寫 fallback 內容，保留成功 AI Canon`);
 try{
  const recoveryPatch=await worldStage("WORLD_RECOVERY",{
   timeoutMs:65000,maxOutputTokens:2400,temperature:.45,
   system:`你是 Elyndra World Recovery Architect。只有 payload.fallbackStages 列出的階段可重寫；其他 AI 成功階段視為鎖定 Canon，不得改。永遠禁止改 worldName、worldTheme、seedCompliance。CORE_RULES fallback 可重寫 worldBible 的規則／文明／通訊；CORE_ANCHOR fallback 可重寫 summary、startingRegion/Settlement/Location、Weather、公私 facts；HISTORY fallback 可重寫既有 worldHistory 內容但保留 HIST id/order；GEOGRAPHY fallback 可重寫 openingHook 與既有 location 描述；FUTURE fallback 可重寫 calendar 描述與 Timeline title/category/directorTruth/observableEffect/pressure，但保留 id/日期窗口/links；SOCIETY fallback 可重寫 location culture/trade 與既有 faction，包括名稱；CAST fallback 可重寫既有 NPC/sideQuest，包括名稱。不得新增或刪除實體，historyRefs 不可改。若重新命名 Anchor/Faction/NPC，Engine 會同步引用。目標係消除「異界醒轉地」「當地引路人」「在地共同體」等模板佔位內容，並令所有 fallback 部分具體服務 worldTheme 與已鎖定歷史。openingHook 必須保持零知識感官視角。只輸出 JSON：{"patch":{...},"changedTargets":["..."]}。`,
   user:JSON.stringify({fallbackStages,candidate})
  });
  const recovered=applyFallbackRecoveryPatch(candidate,recoveryPatch,diagnostics);
  diagnostics.recovery={...diagnostics.recovery,succeeded:true,finishedAt:Date.now(),recoveredStages:[...fallbackStages],changedTargets:Array.isArray(recoveryPatch?.changedTargets)?recoveryPatch.changedTargets:[]};
  return recovered
 }catch(e){
  diagnostics.recovery={...diagnostics.recovery,succeeded:false,finishedAt:Date.now(),reason:e?.message||String(e)};
  return candidate
 }
}

async function evaluateWorldQuality(candidate,diagnostics){
 try{
  const raw=await worldStage("QUALITY_CRITIC",{
   timeoutMs:50000,maxOutputTokens:1500,temperature:.25,
   system:`你是 Elyndra World Critic。你不負責續寫故事，只評估這個世界候選。分別評 internalConsistency、originality、worldDepth、historyIntegration、geography、societyCulture、magicSystem、factions、characters、futureEvents、playability、knowledgeBoundary，每項0-100；overall 0-100。特別檢查 fallback 模板味、未來 Timeline 是否真的是事件、魔法規則是否可執行、History 是否以結構化 refs 連到 Location/NPC/Faction、openingHook 有沒有洩漏玩家未知地名／世界名／World Theme。findings 最多8項，每項包含 severity、targetType、targetIds、problem、evidence、recommendation、requiresRegeneration。只輸出 JSON。`,
   user:JSON.stringify({candidate,generationDiagnostics:finalizeGenerationDiagnostics(diagnostics)})
  });
  return normalizeWorldEvaluation(raw,{source:"AI"})
 }catch(e){
  return fallbackWorldEvaluation(candidate,diagnostics,e?.message||String(e))
 }
}
async function reviewAndRepairWorldCandidate(candidate,diagnostics,report){
 let current=structuredClone(candidate),evaluation=await evaluateWorldQuality(current,diagnostics),repairHistory=[];
 for(let pass=1;pass<=2&&evaluation.overall<80&&evaluation.findings.some(x=>x.requiresRegeneration);pass++){
  report(85,"AI 世界評審與修復",`世界品質 ${evaluation.overall}/100；正在定點修復第 ${pass} 輪，不重寫已鎖定歷史、Seed Contract 或 Timeline 時間窗口`);
  let repair;
  try{
   repair=await worldStage("QUALITY_REPAIR",{
    timeoutMs:65000,maxOutputTokens:1900,temperature:.45,
    system:`你是 Elyndra World Repair Architect。根據 critic findings 只輸出需要修補的 patch。禁止改 worldName、worldTheme、seedCompliance、worldHistory、worldCalendar、startingRegion、startingSettlement、startingLocation；禁止更改 Timeline 的 id/日期窗口/links。優先修正模板化內容、具體魔法代價、事件性、文化與角色深度、零知識 openingHook。generation 只能修改既有陣列同 index 的描述性欄位，不可新增、刪除或重新命名實體；historyRefs 必須保留。只輸出 JSON：{"patch":{...},"changedTargets":["..."]}。`,
    user:JSON.stringify({candidate:current,evaluation})
   })
  }catch{break}
  const before=evaluation.overall;
  current=applyWorldRepairPatch(current,repair);
  evaluation=await evaluateWorldQuality(current,diagnostics);
  repairHistory.push({pass,before,after:evaluation.overall,targets:Array.isArray(repair?.changedTargets)?repair.changedTargets:evaluation.repairTargets,at:Date.now()})
 }
 current.generationDiagnostics=finalizeGenerationDiagnostics(diagnostics);
 current.worldQuality={...evaluation,repairHistory};
 return current
}

export async function generateWorldCandidate(seed,constitution,onProgress){
 const diagnostics=createGenerationDiagnostics();activeGenerationDiagnostics=diagnostics;
 let progressFloor=0;const report=(progress,label,detail)=>{if(progress<progressFloor)return;progressFloor=progress;emitWorldProgress(onProgress,progress,label,detail)};
 const directive=seedDirective(seed),auto=directive.contract.worldviewMode==="ai",expected=directive.contract;
 const chosen=v=>v==="AI_DECIDES"||v==null?"AI 必須自行決定並回傳具體值":v;
 if(hasDirectAI()){
  report(42,"世界身份","先用短請求鎖定唯一 World Identity；失敗時由 Seed Contract 安全補上");
  const identityRaw=await resilientWorldStage("IDENTITY",{
   timeoutMs:35000,retryOnTimeout:false,maxOutputTokens:500,
   system:`你是 Elyndra World Identity Compiler。只決定最小世界身份，不生成文明細節、天氣、歷史、地點、NPC 或任務。worldviewMode=style 時 genre/scale/danger/magic/politics 必須完全遵守 expected；worldviewMode=ai 時可自行決定，但所有值必須互相形成同一個世界主題。worldTheme 必須具體、可驅動世界規則與衝突。只輸出 JSON。`,
   user:JSON.stringify({seed,expected,styleFoundation:directive.styleFoundation,randomEntropy:directive.randomEntropy,required:{worldName:"2-12字世界名",worldTheme:"具體核心主題",playerName:seed.playerName||"",genre:chosen(expected.genre),scale:chosen(expected.scale),danger:auto?"1-5":expected.danger,magic:auto?"1-5":expected.magic,politics:auto?"1-5":expected.politics,premise:"30-70字，解釋主題如何成為世界規則"}})
  },()=>identityFallback(expected,seed));
  const identity=normalizeWorldIdentity(identityRaw,expected,seed);

  report(47,"雙 AI 世界核心","最多兩個 AI 同時生成規則與開局 Anchor；兩邊共享同一 World Identity Contract");
  let [rulesRaw,anchorRaw]=await Promise.all([
   resilientWorldStage("CORE_RULES",{
    timeoutMs:50000,retryOnTimeout:false,maxOutputTokens:900,
    system:`你是 Elyndra Core Rules Compiler。只能根據 identity 與 Seed Contract 補充世界硬規則：時代、核心衝突、魔法代價、古代真相、當前危機、敘事氣氛、文明程度與遠距通訊。不得改 worldName/worldTheme，不得生成地點、Weather、歷史 Timeline、NPC 或任務。civilization 與 communication 必須互相合理；低文明／低魔法不可無理由出現即時全球網絡。所有規則都必須直接服務 identity.worldTheme。只輸出 JSON。`,
    user:JSON.stringify({identity,seedContract:expected,styleFoundation:directive.styleFoundation,required:{worldBible:{era:"世界自己的時代稱呼",centralConflict:"40-80字，直接源於 worldTheme",magicCost:"至少20字硬規則與代價",ancientTruth:"40-80字深層真相",currentCrisis:"40-80字正在發展危機",tone:"敘事氣氛",civilization:{level:"1-5",stage:"文明階段名稱",infrastructure:"基建程度",literacy:"教育／識字狀況",mobility:"交通與人口流動"},communication:{name:"世界內聯絡方式",medium:"媒介",description:"如何運作且為何符合文明／魔法程度",latency:"NONE|DELAYED|NEAR_INSTANT|INSTANT",range:"LOCAL|REGIONAL|WORLD",accessRule:"ENCOUNTERED",constraints:"限制與代價"}}}})
   },()=>coreRulesFallback(identity)),
   resilientWorldStage("CORE_ANCHOR",{
    timeoutMs:50000,retryOnTimeout:false,maxOutputTokens:1000,
    system:`你是 Elyndra Core Anchor Compiler。只能根據 identity 與 Seed Contract 定義：世界概要、開局區域／聚落／出生位置、Weather Canon、公開事實與真正秘密。不得改 worldName/worldTheme，不得生成歷史 Timeline、勢力、NPC 或任務。startingRegion/Settlement/Location、Weather、publicFacts、hiddenFacts 必須全部可以由 identity.worldTheme/premise 解釋，避免互相無關的拼貼設定。至少2個 Weather phenomena，其中至少1個明顯屬於異世界。只輸出 JSON。`,
    user:JSON.stringify({identity,seedContract:expected,required:{summary:"70-130字",worldBible:{startingRegion:"開局區域",startingSettlement:"附近首個文明聚落",startingLocation:"玩家真實出生位置",weatherSystem:{identity:"20-50字天氣法則",source:"天氣來源",cycle:"變化方式",forecastability:"LOW|MEDIUM|HIGH",phenomena:[{id:"WTH-1",name:"異世界天候名",observableName:"感官描述",description:"20-40字",sensoryCue:"直接可感知",rarity:"COMMON|UNCOMMON|RARE|EXTREME",danger:"0-5"},{id:"WTH-2",name:"異世界天候名",observableName:"感官描述",description:"20-40字",sensoryCue:"直接可感知",rarity:"COMMON|UNCOMMON|RARE|EXTREME",danger:"0-5"}]}},publicFacts:["2-3項與 worldTheme 直接相關的公開事實"],hiddenFacts:["2-3項與 worldTheme/current premise 直接相關的秘密"]}})
   },()=>coreAnchorFallback(identity))
  ]);

  const rulesRequired=["era","centralConflict","magicCost","ancientTruth","currentCrisis","tone"];
  let rules=rulesRaw;
  if(!rules?.worldBible||rulesRequired.some(k=>!String(rules.worldBible?.[k]||"").trim())||!rules.worldBible.civilization||!rules.worldBible.communication){markWorldFallback("CORE_RULES","STRUCTURE_INVALID");rules=coreRulesFallback(identity)};
  let coreAnchor=anchorRaw;
  if(!coreAnchor?.worldBible||["startingRegion","startingSettlement","startingLocation"].some(k=>!String(coreAnchor.worldBible?.[k]||"").trim())||!coreAnchor.worldBible.weatherSystem||!Array.isArray(coreAnchor.publicFacts)||!Array.isArray(coreAnchor.hiddenFacts)){markWorldFallback("CORE_ANCHOR","STRUCTURE_INVALID");coreAnchor=coreAnchorFallback(identity)};

  let core=mergeCoreWave(identity,expected,rules,coreAnchor),coreIssues=coreWaveIssues(identity,rules,coreAnchor,core);
  if(coreIssues.length){
   markWorldFallback("CORE_RULES","CORE_WAVE_INVALID:"+coreIssues.join(","));
   markWorldFallback("CORE_ANCHOR","CORE_WAVE_INVALID:"+coreIssues.join(","));
   rules=coreRulesFallback(identity);coreAnchor=coreAnchorFallback(identity);
   core=mergeCoreWave(identity,expected,rules,coreAnchor);coreIssues=coreWaveIssues(identity,rules,coreAnchor,core)
  }
  if(coreIssues.length)throw new Error(`WORLD_CORE_INVALID: ${coreIssues.join(",")}`);
  report(52,"世界核心完成","Identity、Rules、Anchor 已合併成單一 World Anchor Contract");

  const anchor=buildWorldAnchorContract(core,directive.timelinePacing);
  report(56,"雙 AI 編譯 Wave 1","最多兩個 AI 同時生成：過去歷史與開局地理；兩者共享同一 World Anchor Contract");

  const [historyRaw,geographyRaw]=await Promise.all([
   resilientWorldStage("HISTORY",{
    timeoutMs:65000,retryOnTimeout:false,maxOutputTokens:1200,
    system:`你是 Elyndra History Compiler。只生成 3 個不可改寫的過去歷史 Canon。所有內容必須直接解釋 anchor 的 centralConflict、magicCost、civilization 或 currentCrisis 如何形成。每個事件使用指定 HIST-1..3 id。不要生成未來 Timeline、地點、勢力、NPC 或任務。只輸出 JSON。`,
    user:JSON.stringify({anchor,required:{worldHistory:Array.from({length:3},(_,i)=>({id:`HIST-${i+1}`,order:i+1,era:"世界內時代",title:"重大歷史事件",category:"戰爭|王朝|宗教|技術|魔法|遷徙|災難|改革",summary:"40-80字",causes:["最多1項"],legacies:["1-2項現代仍存在影響"],discoverKeywords:["1-2線索"]}))}})
   },()=>({worldHistory:historyFallback(anchor)})),
   resilientWorldStage("GEOGRAPHY",{
    timeoutMs:50000,retryOnTimeout:false,maxOutputTokens:800,
    system:`你是 Elyndra Geography Compiler。只生成 openingHook 與唯一開局地點的物理／環境資料，不生成文化、交易、勢力、NPC、任務。location.name 與 region 必須分別等於 anchor.startingLocation / anchor.startingRegion。地貌、建築外觀與 weatherProfile 必須能由 anchor.worldTheme、weatherPhenomena、currentCrisis 解釋；weather id 只能引用 anchor.weatherPhenomena。openingHook 的視角固定是一名來自現代地球的普通成年人：可以用現代常識辨認傷勢、材質、火、水、天氣、簡單機械與危險，但不可知道任何異世界專有名詞、魔法規則、地方文化、貨幣、歷史或人物；第一反應應是確認安全、身體與環境，再保留對超常現象的懷疑。只輸出 JSON。`,
    user:JSON.stringify({anchor,required:{openingHook:"60-120字，只寫零知識感官開場",location:{name:anchor.startingLocation,type:"地點類型",region:anchor.startingRegion,description:"40-90字物理環境",known:false,weatherProfile:{zone:"地理天候區",affinities:["anchor weather id"],suppressions:["anchor weather id"]},lore:{story:"40-80字環境留下的歷史痕跡",unlockKeywords:["1-2線索"],minMatches:1}}}})
   },()=>geographyFallback(anchor))
  ]);
  const historyReport=validateWorldHistory(historyRaw?.worldHistory);if(!historyReport.valid)markWorldFallback("HISTORY","VALIDATION_FAILED:"+historyReport.errors.join(","));const history=historyReport.valid?historyReport.history:historyFallback(anchor);
  let geography=geographyRaw;
  if(!geography?.openingHook||!geography?.location||geography.location.name!==anchor.startingLocation||geography.location.region!==anchor.startingRegion){markWorldFallback("GEOGRAPHY","STRUCTURE_OR_ANCHOR_INVALID");geography=geographyFallback(anchor)};
  report(64,"雙 AI 編譯 Wave 2","歷史與地理已鎖定；最多兩個 AI 同時生成未來 Timeline 與地方社會，兩者必須引用 Wave 1");

  const slots=timelineAuthoringSlots(directive.timelinePacing);
  const [futureRaw,societyRaw]=await Promise.all([
   resilientWorldStage("FUTURE",{
    timeoutMs:65000,retryOnTimeout:false,maxOutputTokens:1450,
    system:`你是 Elyndra Future Compiler。根據同一 anchor、已鎖定 history 與 geography 生成世界曆法及未來 Timeline。每個未來事件必須透過 links.historyRefs 或 links.locationRefs 明確連回既有歷史／開局地理；禁止新增無來源文明、勢力或地點。日期窗口由 Engine slots 決定，你不要計日數。只輸出 JSON。`,
    user:JSON.stringify({anchor,history,geography,timelineSlots:slots,required:{worldCalendar:{name:"曆法名",epochName:"紀元",dayTerm:"日序",cycleTerm:"短週期",longCycleTerm:"長週期",daysPerCycle:"3-60",cyclesPerLongCycle:"3-30",cycles:["3-6名稱"],periods:[{name:"時段",fromMinute:0,toMinute:359}]},worldTimeline:slots.map((slot,i)=>({slot:slot.slot,title:`事件${i+1}`,category:"類型",directorTruth:"20-50字隱藏因果",observableEffect:"20-50字可觀察影響",pressure:"0-15",links:{historyRefs:["至少1個 HIST id"],locationRefs:["STARTING_LOCATION|STARTING_REGION 或 anchor 名稱"]}}))}})
   },()=>futureFallback(anchor,history,directive.timelinePacing)),
   resilientWorldStage("SOCIETY",{
    timeoutMs:50000,retryOnTimeout:false,maxOutputTokens:950,
    system:`你是 Elyndra Society Compiler。只生成開局地點的 culture、trade 與最多1個地方 faction。你必須以已鎖定 geography 作生活環境，以 history 作制度／禁忌／信仰來源。locationRef 必須等於 anchor.startingLocation，historyRefs 必須引用既有 HIST id。禁止重新命名地點或創造第二個地點。只輸出 JSON。`,
    user:JSON.stringify({anchor,history,geography,required:{locationRef:anchor.startingLocation,historyRefs:["至少1個 HIST id"],locationCulture:{identity:"文化核心",etiquette:["1項"],taboos:["1項"],food:["1項"],beliefs:["1項"],architecture:["1項"],clothing:["1項"],hospitality:["1項"],namingStyle:"簡短",languageNotes:[]},locationTrade:{mode:"currency|barter|mixed|ration|token",currencies:[{id:"可空或穩定ID",name:"名稱",symbol:"",issuer:"發行者",description:"簡短"}],commonBarter:["0-2項"],foreignAcceptance:[],priceCulture:"簡短",questReward:0,combatReward:0},faction:{name:"地方勢力",goal:"與 currentCrisis/歷史遺產有關",description:"40-80字",known:false,locationName:anchor.startingLocation,historyRefs:["至少1個 HIST id"],culture:{identity:"核心文化",etiquette:["1項"],taboos:["1項"],beliefs:["1項"]},trade:{mode:"currency|barter|mixed|ration|token",currencies:[],commonBarter:[],foreignAcceptance:[],priceCulture:"簡短",questReward:0,combatReward:0},lore:{story:"40-80字",unlockKeywords:["1-2線索"],minMatches:1}}}})
   },()=>societyFallback(anchor,history,geography))
  ]);

  let society=societyRaw;
  if(!society||typeof society!=="object"||Array.isArray(society)){markWorldFallback("SOCIETY","STRUCTURE_INVALID");society=societyFallback(anchor,history,geography)};
  let region=mergeOpeningRegion(anchor,geography,society);
  const authoredTimeline=bindTimelineAuthoringSlots(futureRaw?.worldTimeline,directive.timelinePacing),timelineReport=validateWorldTimeline(authoredTimeline,directive.timelinePacing);
  if(!timelineReport.valid)markWorldFallback("FUTURE","TIMELINE_VALIDATION_FAILED:"+timelineReport.errors.join(","));
  let future=timelineReport.valid?normalizeFutureLinksToAnchor({worldCalendar:futureRaw.worldCalendar,worldTimeline:timelineReport.timeline},anchor,history):futureFallback(anchor,history,directive.timelinePacing);
  if(!future?.worldCalendar||!Array.isArray(future.worldTimeline))throw new Error("WORLD_FUTURE_INVALID");
  let linkIssues=worldGenerationLinkIssues({anchor,history,geography,society,future});
  let societyIssues=linkIssues.filter(x=>x.startsWith("SOCIETY_")),futureIssues=linkIssues.filter(x=>x.startsWith("FUTURE_")),sharedIssues=linkIssues.filter(x=>!x.startsWith("SOCIETY_")&&!x.startsWith("FUTURE_"));
  if(societyIssues.length){markWorldFallback("SOCIETY","CROSS_STAGE_LINK_INVALID:"+societyIssues.join(","));society=societyFallback(anchor,history,geography);region=mergeOpeningRegion(anchor,geography,society)}
  if(futureIssues.length){markWorldFallback("FUTURE","CROSS_STAGE_LINK_INVALID:"+futureIssues.join(","));future=futureFallback(anchor,history,directive.timelinePacing)}
  linkIssues=worldGenerationLinkIssues({anchor,history,geography,society,future});sharedIssues=linkIssues.filter(x=>!x.startsWith("SOCIETY_")&&!x.startsWith("FUTURE_"));
  if(sharedIssues.length||linkIssues.some(x=>x.startsWith("SOCIETY_")||x.startsWith("FUTURE_")))throw new Error("WORLD_LINK_INVALID:"+linkIssues.join(","));

  report(74,"雙 AI 編譯 Wave 3","前兩波 Canon 關係已鎖定；最後只用一個 AI 生成附近人物與支線");
  let cast=await resilientWorldStage("CAST",{
   timeoutMs:55000,retryOnTimeout:false,maxOutputTokens:950,
   system:`你是 Elyndra Opening Cast Compiler。只生成1個附近 NPC、最多1個支線與3-4個 suggestions。你必須使用既有 anchor/history/geography/society/future：NPC 必須在 anchor.startingLocation，factionName 只能引用 society.faction.name 或留空；historyRefs 只能引用既有 HIST id。支線必須以 locationName、npcName、factionName 或 historyRefs 至少一項連回前兩波內容。不得新增新地點／勢力。只輸出 JSON。`,
   user:JSON.stringify({anchor,history,geography,society,future:{worldTimeline:future.worldTimeline.map(x=>({id:x.id,title:x.title,observableEffect:x.observableEffect,links:x.links}))},required:{npcs:[{name:"附近人物",role:"角色",description:"40-80字",personality:"簡短",goal:"與地方社會／危機有關",locationName:anchor.startingLocation,factionName:"society.faction.name 或空",knowledgeScope:["anchor.publicFacts 完整文字"],historyRefs:["0-2個 HIST id"],known:false,companionProfile:{joinThreshold:35,leaveThreshold:10,motives:["1項"],boundaries:["1項"]},lore:{story:"40-80字",unlockKeywords:["1-2線索"],minMatches:1}}],sideQuests:[{title:"支線",objective:"簡短",known:false,locationName:anchor.startingLocation,npcName:"上方 NPC 或空",factionName:"既有 faction 或空",historyRefs:["0-2個 HIST id"],evidenceKeywords:["2個實體線索"],conditions:[],target:2}],suggestions:["3-4個只基於 openingHook 的短行動"]}})
  },()=>castFallback(anchor,history,region,society));
  if(!Array.isArray(cast?.npcs)||!Array.isArray(cast?.sideQuests)||!Array.isArray(cast?.suggestions)||cast.suggestions.length<2){markWorldFallback("CAST","STRUCTURE_INVALID");cast=castFallback(anchor,history,region,society)};
  linkIssues=worldGenerationLinkIssues({anchor,history,geography,society,future,cast});
  if(linkIssues.length){markWorldFallback("CAST","CROSS_STAGE_LINK_INVALID:"+linkIssues.join(","));cast=castFallback(anchor,history,region,society);linkIssues=worldGenerationLinkIssues({anchor,history,geography,society,future,cast})}
  if(linkIssues.length)throw new Error("WORLD_CAST_LINK_INVALID:"+linkIssues.join(","));

  report(84,"整合世界","三個 Wave 完成；任何時候最多兩個 AI 並行，Engine 正在驗證跨階段引用");
  const draft={...core,worldHistory:history,worldCalendar:future.worldCalendar,worldTimeline:future.worldTimeline,openingHook:region.openingHook,suggestions:cast.suggestions,generation:{locations:region.locations.slice(0,1),npcs:cast.npcs.slice(0,1),factions:region.factions.slice(0,1),sideQuests:cast.sideQuests.slice(0,1)}};
  const recovered=await recoverFallbackWorldCandidate(draft,diagnostics,report);
  const reviewed=await reviewAndRepairWorldCandidate(recovered,diagnostics,report);activeGenerationDiagnostics=null;return reviewed

 }
 activeGenerationDiagnostics=null;
 report(42,"世界核心","正在透過伺服器建立世界");
 const candidate=(await post("/api/world",{seed,constitution,seedDirective:directive})).candidate;
 report(85,"AI 世界評審","伺服器已完成世界品質評分與必要的定點修復");
 return candidate
}
export async function talkToNpc(state,key,message){const npc=state.npcs?.[key];if(!npc)throw new Error("NPC_NOT_FOUND");const knownFacts=npcKnownFacts(state,npc),payload={message,npc,knownFacts,memories:npc.memories||[],scene:{day:state.world.state.day,location:state.player.location}};if(hasDirectAI())return directChat({aiTask:"npc",timeoutMs:45000,system:`你扮演 Elyndra NPC「${npc.name}」。只能使用提供的 knownFacts 與 memories，不知道就表現不知道。繁體中文1-4句。`,user:JSON.stringify(payload)});return (await post("/api/npc",payload)).text}
export async function talkToDynamicNpc(state,npc,message,contact={}){const knownFacts=npcKnownFacts(state,npc),recognition=recognitionForNpc(state,npc),payload={message,npc:{id:npc.id,name:npc.name,role:npc.role,description:npc.description,personality:npc.personality,goal:npc.goal,trust:npc.trust},knownFacts,memories:(npc.memories||[]).slice(-12),recognition,contact:{mode:contact.mode||"LOCAL",communication:contact.communication||null},scene:{day:state.world.state.day,clock:state.world.state.clock,location:state.player.location,weather:playerWeatherSnapshot(state)}};if(hasDirectAI()){const raw=await directChat({aiTask:"npc",timeoutMs:45000,system:`你扮演 Elyndra NPC「${npc.name}」。保持 personality、goal 與既有 memories 一致。只能使用 knownFacts、memories 與 recognition.knownDeeds；public Canon 並不代表你自動知道。recognition.knownDeeds 是這名 NPC 合理聽過的玩家事蹟，可以自然影響稱呼、語氣與態度；如果為空就不可突然認識玩家的名聲。若 contact.mode=REMOTE，必須自然反映 payload.contact.communication 所定義的世界內通訊媒介與限制，但不要自行發明更高階技術。不知道的事不可捏造。只使用繁體中文1-5句；除既有專有名詞外不要切換其他語言，不要輸出系統標籤。`,user:JSON.stringify(payload)});return sanitizePlayerText(raw,700,`${npc.name}暫時沒有再補充更多資訊。`)}const raw=(await post("/api/npc",payload)).text;return sanitizePlayerText(raw,700,`${npc.name}暫時沒有再補充更多資訊。`)}
const TURN_SCENE_SCHEMA='{"sceneTitle":"4-18字繁體中文目前目標，讓玩家一眼知道現在應該處理甚麼，例如「調查鐘聲來源」","narrative":"80-180字繁體中文，只描述玩家當下可感知的行動結果，不建立或修改 Canon","suggestions":["3-4個只基於眼前資訊的下一步行動"]}';
const TURN_STATE_SCHEMA='{"outcomeSummary":"40-100字可見結果摘要","location":null,"worldNameKnown":false,"calendarKnown":false,"discoveries":[{"title":"...","text":"...","factId":"directorCanon 中既有 fact id；沒有可驗證 Canon 時留空","evidenceType":"OBSERVED|HEARD|READ|EXAMINED"}],"items":[{"name":"...","description":"玩家當下可見描述","category":"MATERIAL|CONSUMABLE|TOOL|EQUIPMENT|KEY|QUEST|ARTIFACT","quantity":1,"identified":true,"evidenceFactId":"只有同回合 verified discovery 支持此物品為任務證據時填 fact id，否則留空","historyRefs":["可選既有 HIST id"],"craftingTags":["可選素材標籤"],"useEffects":[{"type":"RESTORE_HP|RESTORE_SATIETY|REDUCE_FATIGUE|REDUCE_EXPOSURE|REDUCE_INJURY|REDUCE_MAGIC_STRAIN","amount":1}],"lore":{"story":"只生成一次","unlockKeywords":["線索"],"minMatches":1},"checkBonuses":{"OBSERVE|SOCIAL|TRAVEL|RISKY|GENERAL|ALL":"可選整數 -2 至 2；只有功能性工具／裝備才填"}}],"recipes":[{"name":"配方名","description":"簡短","inputs":[{"name":"snapshot.inventory 中現有或合理可取得素材名稱","quantity":1}],"output":{"name":"成品","description":"簡短","category":"MATERIAL|CONSUMABLE|TOOL|EQUIPMENT|ARTIFACT","quantity":1,"useEffects":[],"checkBonuses":{},"craftingTags":[]},"minutes":30}],"magicLearning":[{"name":"本世界法術名","school":"本世界魔法流派","cost":10,"effect":"可驗證效果","sourceFactId":"directorCanon 中明確支持此法術／術式的 fact id"}],"npcChanges":[{"npcId":"已知 NPC id","trustDelta":0}],"companionChanges":[{"npcId":"已知 NPC id","action":"OFFER|LEAVE","reason":"符合角色設定的原因"}],"factionChanges":[{"factionId":"已知勢力 id","reputationDelta":0}],"quest":{"title":null,"objective":null},"entityReveals":[{"kind":"location|npc|faction|sideQuest","id":"directorRegistry 既有實體 id"}],"encounter":null或{"type":"combat","enemy":{"name":"符合本世界的敵對存在","description":"與世界規則一致的特徵","level":1,"hp":20,"defense":11,"damage":6,"element":"PHYSICAL|FIRE|ICE|LIGHTNING|POISON|ARCANE|HOLY|SHADOW|NATURE|PSYCHIC|NONE","weaknesses":[],"resistances":[],"abilities":[{"name":"本世界能力","kind":"ATTACK|HEAVY|STATUS|HEAL","power":5,"element":"元素","cooldown":1,"status":"可空"}],"loot":"可空字串"}},"generation":{"locations":[],"npcs":[],"factions":[],"sideQuests":[]},"worldImpacts":[{"scope":"PERSONAL|LOCAL|REGIONAL|FACTION|WORLD","targetKind":"location|npc|faction|world","targetId":"已存在 id|CURRENT_LOCATION|WORLD","title":"持久改變","summary":"可驗證結果","reason":"直接因果","outcome":"BENEFIT|COST|MIXED","mutations":[{"field":"合法數值欄位|statusTag|structure","op":"DELTA|ADD_TAG|REMOVE_TAG|STRUCTURE","value":"數值／標記；STRUCTURE 時為 {id,label,state,description}"}],"consequences":[],"timelineEffects":[]}]}';

const FAST_TURN_STATE_SCHEMA='{"outcomeSummary":"30-80字可見結果摘要","location":null,"worldNameKnown":false,"calendarKnown":false,"discoveries":[{"title":"...","text":"...","factId":"directorCanon 中既有 fact id 或空字串","evidenceType":"OBSERVED|HEARD|READ|EXAMINED"}],"items":[{"name":"...","description":"玩家當下可見描述","category":"MATERIAL|CONSUMABLE|TOOL|EQUIPMENT|KEY|QUEST|ARTIFACT","quantity":1,"identified":true,"evidenceFactId":"","historyRefs":[],"craftingTags":[],"useEffects":[],"lore":null,"checkBonuses":{}}],"npcChanges":[{"npcId":"目前可互動 NPC id","trustDelta":0}],"quest":{"title":null,"objective":null},"entityReveals":[{"kind":"location|npc|faction|sideQuest","id":"既有可揭露實體 id"}],"encounter":null或{"type":"combat","enemy":{"name":"...","description":"...","level":1,"hp":20,"defense":11,"damage":6,"element":"PHYSICAL|FIRE|ICE|LIGHTNING|POISON|ARCANE|HOLY|SHADOW|NATURE|PSYCHIC|NONE","weaknesses":[],"resistances":[],"abilities":[],"loot":""}}}';
const DEFERRED_TURN_SCHEMA='{"recipes":[{"name":"配方名","description":"簡短","inputs":[{"name":"既有或合理可取得素材","quantity":1}],"output":{"name":"成品","description":"簡短","category":"MATERIAL|CONSUMABLE|TOOL|EQUIPMENT|ARTIFACT","quantity":1,"useEffects":[],"checkBonuses":{},"craftingTags":[]},"minutes":30}],"magicLearning":[{"name":"本世界法術名","school":"既有流派","cost":10,"effect":"可驗證效果","sourceFactId":"directorCanon 中既有 fact id"}],"companionChanges":[{"npcId":"已知 NPC id","action":"OFFER|LEAVE","reason":"..."}],"factionChanges":[{"factionId":"已知勢力 id","reputationDelta":0}],"generation":{"locations":[],"npcs":[],"factions":[],"sideQuests":[]},"worldImpacts":[{"scope":"PERSONAL|LOCAL|REGIONAL|FACTION|WORLD","targetKind":"location|npc|faction|world","targetId":"已存在 id|CURRENT_LOCATION|WORLD","title":"持久改變","summary":"可驗證結果","reason":"直接因果","outcome":"BENEFIT|COST|MIXED","mutations":[{"field":"合法欄位|statusTag|structure","op":"DELTA|ADD_TAG|REMOVE_TAG|STRUCTURE","value":"數值／標記／結構物件"}],"consequences":[],"timelineEffects":[]}]}';

export function turnDirectorMode(action,roll={},snapshot={}){
 const q=String(action||"").toLowerCase(),kind=String(roll?.profile?.kind||"").toUpperCase();
 if(snapshot?.combat?.active||/摧毀|炸毀|燒毀|殺死|處決|征服|佔領|推翻|宣戰|大型儀式|封印|解除封印|改寫|改變世界|destroy|conquer|overthrow|declare war|ritual/i.test(q))return "DEEP";
 if(/交給|交出|贈送|說服|威脅|邀請|加入|離隊|學習|學會|施法|魔法|製作|打造|聲望|勢力|任務|偷竊|闖入|破壞|give|persuade|threaten|invite|join|leave|learn|cast|craft|faction|quest|steal|break/i.test(q))return "DEFERRED";
 if(kind==="RISKY"&&/攀|跳|闖|偷|破壞|climb|jump|break|steal/i.test(q))return "DEFERRED";
 return "FAST"
}

export async function askTravelHelper(state,question){
 const q=String(question||"").trim().slice(0,240);if(!q)throw new Error("HELPER_QUESTION_REQUIRED");
 const snapshot=helperSnapshot(state);
 const system="你是 Elyndra 旅途輔助 AI。你只能根據 payload.snapshot 中玩家目前已知或可直接感知的資料回答，不可以使用模型自身對這個虛構世界的知識補完，不可以推測 hidden facts、Director Timeline、未發現地點、未遇 NPC 或未公開勢力。若玩家問「附近／四周／眼前」，只可使用 world.currentLocation、world.currentNarrative、world.weather、knowledge.nearbyNpcs 與 combat；若玩家問天氣，只可描述 world.weather 中目前可直接感知的天氣，不可推測未出現的 Weather Canon；knowledge.knownLocations 只代表玩家知道那些地方存在，不代表它們在附近。knowledge.facts 中只有 status=VERIFIED 可當作已確認世界事實；TESTIMONY、OBSERVATION、LORE、UNCONFIRMED 只能按其性質描述為聽說／觀察／傳說／未確認，絕不可升格成確定真相。若資料不足，直接說「目前沒有足夠情報確認」。你只提供資訊整理與方向提示，不可以改變劇情、時間、骰子、HP、物品、任務、NPC 關係、戰鬥或任何 Canon。只使用繁體中文，回答 2-6 句，清楚區分『已知』與『未確認』。";
 if(hasDirectAI()){const raw=await directChat({aiTask:"helper",timeoutMs:30000,maxOutputTokens:700,temperature:.25,system,user:JSON.stringify({question:q,snapshot})});return sanitizePlayerText(raw,900,"目前沒有足夠情報確認。")}
 const raw=(await post("/api/helper",{question:q,snapshot})).text;return sanitizePlayerText(raw,900,"目前沒有足夠情報確認。")
}
function normalizeActionAssessment(raw,action){
 const r=raw&&typeof raw==="object"?raw:{},verdict=["ALLOW","ADJUST","BLOCK"].includes(String(r.verdict||"").toUpperCase())?String(r.verdict).toUpperCase():"ALLOW",kind=["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"].includes(String(r.kind||"").toUpperCase())?String(r.kind).toUpperCase():"GENERAL";
 return {verdict,kind,normalizedAction:sanitizePlayerText(r.normalizedAction,180,action)||action,reason:sanitizePlayerText(r.reason,320,""),requirements:Array.isArray(r.requirements)?r.requirements.map(x=>sanitizePlayerText(x,120,"")).filter(Boolean).slice(0,4):[],confidence:Math.max(0,Math.min(100,Math.round(Number(r.confidence)||70)))}
}
function actionFeasibilitySnapshot(state){
 const h=helperSnapshot(state),inventory=(state.inventory||[]).slice(-30).map(x=>({name:x.name,category:x.category,quantity:Number(x.quantity)||1,equipped:x.equipped===true,identified:x.identified!==false,useEffects:(x.useEffects||[]).map(e=>e.type)})),recipes=(state.crafting?.recipes||[]).slice(-20).map(r=>({name:r.name,inputs:(r.inputs||[]).map(i=>({name:i.name,quantity:i.quantity})),output:r.output?.name||""}));
 return {player:{...h.player,origin:state.player?.origin?{label:state.player.origin.label,background:state.player.origin.background,worldKnowledgeBoundary:state.player.origin.worldKnowledgeBoundary}:null,stats:state.player?.stats||{},skills:state.player?.skills||{}},world:h.world,objective:h.objective,knowledge:{knownLocations:h.knowledge?.knownLocations||[],nearbyNpcs:h.knowledge?.nearbyNpcs||[],facts:(h.knowledge?.facts||[]).slice(-12),recentEvents:(h.knowledge?.recentEvents||[]).slice(-6)},inventory,crafting:{recipes},combat:h.combat}
}
function localActionKind(label){
 const q=String(label||"");if(/觀察|查看|檢查|搜尋|調查|observe|inspect|search/i.test(q))return "OBSERVE";if(/說|問|交談|展示|交給|贈送|talk|ask|show|give/i.test(q))return "SOCIAL";if(/前往|走到|離開|移動|旅行|travel|go to|walk/i.test(q))return "TRAVEL";if(/攀|跳|破壞|偷|闖|攻擊|爬|risk|climb|break|steal/i.test(q))return "RISKY";return "GENERAL"
}
function degradedActionAssessment(state,label,error){
 const inv=state.inventory||[],q=String(label||""),kind=localActionKind(q),requirements=[];
 if(state.player?.status==="DOWNED")return {verdict:"BLOCK",kind,normalizedAction:q,reason:"你目前失去行動能力。",requirements:["先恢復可行動狀態"],confidence:100,source:"ENGINE_DEGRADED",aiError:String(error?.message||error||"")};
 if(/使用|食用|喝|飲用|服用|展示|出示|交給|交出|贈送|give|show|use|eat|drink/i.test(q)&&!inv.some(x=>x?.name&&q.includes(x.name))){requirements.push("背包中需要有你指定的物品");return {verdict:"BLOCK",kind,normalizedAction:q,reason:"目前背包中找不到這個行動所指定的物品。",requirements,confidence:92,source:"ENGINE_DEGRADED",aiError:String(error?.message||error||"")}}
 if(/飛上天空|直接飛行|瞬間移動|teleport|fly into the sky/i.test(q)&&!(state.player?.magic?.knownSpells||[]).some(s=>/飛|傳送|移動|teleport|flight/i.test(String(s?.name||"")+" "+String(s?.effect||""))))return {verdict:"BLOCK",kind:"RISKY",normalizedAction:q,reason:"你目前沒有已知能力支持這種超常移動。",requirements:["需要相應能力、魔法或工具"],confidence:90,source:"ENGINE_DEGRADED",aiError:String(error?.message||error||"")};
 return {verdict:"ALLOW",kind,normalizedAction:q,reason:"AI 可行性判定暫時不可用；已改用保守 Engine 條件檢查，成功與否仍由正常判定處理。",requirements:[],confidence:35,source:"ENGINE_DEGRADED",aiError:String(error?.message||error||"")}
}
const ACTION_ASSESS_SYSTEM=`你是 Elyndra Action Feasibility Judge。只判斷玩家目前「能否合理嘗試」這個行動；不要判斷成功率、不要擲骰、不要修改狀態、不要創造世界設定。只根據 payload 內玩家可知／可用資料。技能低、疲勞高或受傷通常仍可 ALLOW，之後交由 Engine DC 處理。只有缺少必要物品／能力、目標不在場、未知且不可到達地點、或物理上明顯不可能時才 BLOCK。含糊但可最小修正時用 ADJUST。kind 只可 OBSERVE|SOCIAL|TRAVEL|RISKY|GENERAL。只輸出單一 JSON：{"verdict":"ALLOW|ADJUST|BLOCK","kind":"OBSERVE|SOCIAL|TRAVEL|RISKY|GENERAL","normalizedAction":"...","reason":"...","requirements":[],"confidence":0-100}。`;
async function directActionAssessment(payload,label,compact=false){
 const raw=await directChat({aiTask:"action",disableOptimization:compact,timeoutMs:compact?35000:28000,maxOutputTokens:compact?700:650,temperature:0,system:compact?ACTION_ASSESS_SYSTEM+" 不要解釋，只回 JSON。":ACTION_ASSESS_SYSTEM,user:JSON.stringify(payload)});
 return {...normalizeActionAssessment(parseJSON(raw),label),source:compact?"AI_RETRY":"AI"}
}
export async function assessPlayerAction(state,action){
 const label=String(action||"").trim().slice(0,180);if(!label)throw new Error("ACTION_REQUIRED");
 const snapshot=actionFeasibilitySnapshot(state),payload={action:label,snapshot};
 if(!hasDirectAI()){
  try{const server=await post("/api/action",{action:label,snapshot});return {...normalizeActionAssessment(server.assessment,label),source:"SERVER_AI"}}catch(e){return degradedActionAssessment(state,label,e)}
 }
 try{return await directActionAssessment(payload,label,false)}
 catch(firstError){
  try{return await directActionAssessment({action:label,snapshot},label,true)}
  catch(secondError){const e=new Error((firstError?.message||String(firstError))+" | RETRY: "+(secondError?.message||String(secondError)));return degradedActionAssessment(state,label,e)}
 }
}

export async function generateTurn(action,roll,snapshot,options={}){
 if(hasDirectAI()){
  const directorMode=turnDirectorMode(action,roll,snapshot);
  const sceneInput={action,roll,snapshot:sceneTurnSnapshot(snapshot)};
  const stateInput={action,roll,snapshot:directorMode==="DEEP"?snapshot:fastTurnStateSnapshot(snapshot)};
  const scenePromise=directChat({
   aiTask:"scene",timeoutMs:35000,maxOutputTokens:700,temperature:.8,
   system:`你是 Elyndra Scene Narrator。你只負責玩家可見敘事與下一步建議，不可以修改世界狀態、Canon、NPC 關係、勢力、任務、戰鬥、物品或世界影響。snapshot.player.origin 定義玩家是一名來自現代地球的普通成年人；敘事中的第一反應、比較、疑問與風險判斷應符合其 commonKnowledge、defaultValues、initialAssumptions，但玩家明確輸入的行動永遠優先。現代地球常識不可被當成異世界 Canon。骰子結果已由 Engine 決定，不能改。只可使用 payload 中玩家已知資訊；不得引用 director-only 資訊，不得發明未揭露專有名詞。snapshot.weather 是玩家目前可直接感知的天氣，敘事要自然反映其感官效果，但不可替玩家知道未公開的 Weather Canon。sceneTitle 是給玩家看的「目前目標」，必須用動詞導向，根據最新位置、衝突或劇情發展重新命名，例如「調查鐘聲來源」「找到安全落腳處」；不得只寫氣氛章節名，也不得固定使用「陌生世界的第一天」。narrative 必須忠於 roll.success / grade，只描寫當下可感知結果。只使用繁體中文，不得輸出 [世界動向]、【世界改變】、SYSTEM 等系統標籤。suggestions 每輪必須根據當前場景重新生成，除非情境真的沒有改變，否則不得逐字重複 snapshot.priorSuggestions；不得使用其他語言。只輸出 JSON：${TURN_SCENE_SCHEMA}`,
   user:JSON.stringify(sceneInput)
  }).then(parseJSON).then(scene=>{try{options?.onScene?.(scene)}catch{}return scene});

  const fastStatePromise=()=>directChat({
   aiTask:"turn_state_fast",timeoutMs:28000,maxOutputTokens:850,temperature:.2,
   system:`你是 Elyndra Fast Turn State Director。只處理「這一回合立即必須 commit」的結構化狀態；不要做世界擴展、勢力推演、長期後果、配方設計、魔法體系擴寫或永久世界結構變更。骰子結果不可修改。只根據玩家可見資料與 directorCanon 的既有 fact id。
允許欄位只有：outcomeSummary、location、worldNameKnown、calendarKnown、discoveries、items、npcChanges、quest、entityReveals、encounter。
普通觀察／搜尋／移動／一般對話應保持空陣列，除非本回合直接取得證據、物品、信任變化、任務線索、位置變更或觸發戰鬥。location 只可使用既有已知地點；discoveries 不得創造新 Canon；npcChanges 只可引用目前可互動 NPC。只輸出 JSON：${FAST_TURN_STATE_SCHEMA}`,
   user:JSON.stringify(stateInput)
  }).then(parseJSON);
  const deepStatePromise=()=>directChat({
   aiTask:"turn_state_deep",timeoutMs:45000,maxOutputTokens:1700,temperature:.45,
   system:`你是 Elyndra State Director。你只負責結構化世界狀態候選，不寫長篇敘事。骰子結果不可修改。snapshot.world.seedContract 是硬性世界合約；所有新事件、實體、敵人與世界擴展都必須符合它。directorRegistry、directorTimeline、directorHistory、directorCanon 與 directorWeather 只供保持 Canon；天氣狀態由 Engine 推進，State Director 不可自行改寫目前天氣或臨時創造新 weather phenomenon。directorTruth 與未被玩家發現的歷史內容絕不能寫入玩家可見欄位。npcChanges 只能引用 snapshot.registry.npcs 中 present=true 或 remoteContactable=true 的 NPC id，或目前 ACTIVE 夥伴；沒有合法聯絡方式的遠處 NPC 不可直接互動或改 trust。companionChanges 只可作用於 present=true NPC 或 ACTIVE 夥伴，遠距聯絡本身不可瞬間加入實體同行隊伍。location 若有值，只可填 directorRegistry 已存在地點的 id/名稱，或本回合 generation 新建立且玩家實際到達的地點；不可自由創造亂碼或未 Canonize 地名。只有行動與骰子合理導致直接衝突才建立 encounter；敵人的 element / weaknesses / resistances / abilities 必須來自本世界設定與當前場景，不得套用固定怪物模板。discoveries 只有在本回合成功行動實際取得證據時才可引用 directorCanon 的 factId；無法對應 Canon 的內容只能作未驗證觀察，不得當作世界真相。worldImpacts 的 STRUCTURE mutation 可表示橋樑、道路、神殿、城市設施等永久結構狀態，state 只用 ACTIVE|OPEN|RESTORED|STABILIZED|DAMAGED|DESTROYED|CLOSED|FLOODED|ABANDONED|CORRUPTED|TRANSFORMED；失敗不得用正面結構狀態。worldImpacts 只用於玩家真正造成的持久改變；不得改寫過去 Canon；scope 不得高於 snapshot.worldImpact.capability.maxScope；REGIONAL 以上才可調整未觸發 Timeline；recognition 必須忠於已成立 impact 且 spread 不得超過 impact scope。既有實體只用 entityReveals，不得重建。新 generation 必須符合既有 Canon；若 generation 新增 location，必須附 weatherProfile，而且 affinities / suppressions 只能引用 snapshot.directorWeather.system.phenomena 已存在的 id，不得創造新天氣。普通行動可回空 generation/worldImpacts。generation 新地點若有明確的鑰匙／通行證／證據門檻，可使用 accessRequirements（ITEM_OWNED|ITEM_USED|ITEM_SHOWN|ITEM_GIVEN|FACT_KNOWN|EVENT_OCCURRED），但 id 必須引用玩家可取得或已存在的具體條件，禁止建立永遠無法滿足的門檻。snapshot.player.origin 只代表玩家自身的現代地球常識與預設價值觀，不可因此創造或確認任何異世界 Canon。若新增 item，必須分類；CONSUMABLE 只可用白名單 useEffects，食物用 RESTORE_SATIETY 表示增加飽食度；checkBonuses 只可用於明確具功能性的 TOOL/EQUIPMENT，單項每類 -2 至 2；MATERIAL/KEY/QUEST 普通素材或故事物件不要加能力值。recipes 只在本回合真的學到製作方法時生成，材料名稱必須具體，不得憑空消耗不存在物品。outcomeSummary 只用作敘事 AI 失敗時的安全 fallback，必須用繁體中文且不得帶系統標籤。只輸出 JSON：${TURN_STATE_SCHEMA}`,
   user:JSON.stringify(stateInput)
  }).then(parseJSON);
  const statePromise=directorMode==="DEEP"?deepStatePromise():fastStatePromise();

  const [sceneResult,stateResult]=await Promise.allSettled([scenePromise,statePromise]);
  if(stateResult.status!=="fulfilled")throw stateResult.reason;
  const scene=sceneResult.status==="fulfilled"?sceneResult.value:null;
  return {...mergeTurnCandidates(scene,stateResult.value,roll,{action,priorSuggestions:snapshot?.priorSuggestions||[]}),directorMode}
 }
 return (await post("/api/turn",{action,roll,snapshot})).candidate
}

export async function generateDeferredTurnEffects(action,roll,snapshot,options={}){
 if(!hasDirectAI())return null;
 const raw=await directChat({
  aiTask:"turn_deferred",signal:options?.signal,timeoutMs:45000,maxOutputTokens:1200,temperature:.35,
  system:`你是 Elyndra Deferred Director。你處理一個已經完成 Fast Turn commit 的舊回合，只補上「非即時但可能需要持久保存」的後果。不可改 narrative、location、HP、骰子結果、即時物品、已驗證 discoveries、encounter 或已完成的 NPC trust。只可輸出 recipes、magicLearning、companionChanges、factionChanges、generation、worldImpacts。沒有直接因果就全部留空。generation 只在玩家行動真的令新實體／區域變得必要時使用；普通觀察、搜尋、走路、一般閒聊通常應為空。worldImpacts 必須是玩家該回合直接造成的持久改變，不得因時間經過自行創造世界事件。所有 id 必須引用 snapshot 中既有 Canon／Registry，除 generation 新實體外不得發明 id。只輸出 JSON：${DEFERRED_TURN_SCHEMA}`,
  user:JSON.stringify({action,roll,snapshot})
 });
 return parseJSON(raw)
}

export function publicWorldBible(state){const b=state.world.bible||{};return {era:b.era||"",centralConflict:b.centralConflict||"",magicCost:b.magicCost||"",startingRegion:b.startingRegion||"",startingSettlement:b.startingSettlement||"",startingLocation:b.startingLocation||"",currentCrisis:b.currentCrisis||"",tone:b.tone||"",civilization:b.civilization||null,communication:b.communication||null,weatherSystem:b.weatherSystem||null}}
export function regionExpansionPayload(state,reason="player_exploration"){return {reason,world:{name:state.player?.worldNameKnown?state.world.name:"UNKNOWN",bible:publicWorldBible(state),seedContract:state.world.seedContract||state.world.seed,region:state.world.state.region,location:state.player.location},directorHistory:directorHistorySnapshot(state,8),existing:{locations:(state.world.registry?.locations||[]).map(x=>x.name).slice(-12),npcs:(state.world.registry?.npcs||[]).map(x=>x.name).slice(-12),factions:(state.world.registry?.factions||[]).map(x=>x.name).slice(-8)},publicFacts:visibleFacts(state).slice(-12)}}
export async function generateRegionExpansion(state,reason="player_exploration",options={}){
 const payload=regionExpansionPayload(state,reason);if(!hasDirectAI())return null;
 const signal=options?.signal;
 const expansion=await worldStage("RUNTIME_EXPANSION",{
  signal,timeoutMs:90000,maxOutputTokens:1800,temperature:.65,
  system:'你是 Elyndra Progressive World Architect。world.seedContract 是不可違反的玩家世界設定；新內容必須保持同一世界因果。每個新 Location、NPC、Faction 都必須提供至少1個有效 historyRefs，且只能引用 directorHistory 中存在的 HIST id；不得只在 prose 提到歷史。每個新地點／勢力要有 culture 與 trade；每個地點要有 weatherProfile，affinities / suppressions 只可引用既有 Weather id。需要鑰匙、通行證、證據或先前事件才能進入的地點，可加入 accessRequirements，type 只可 ITEM_OWNED|ITEM_USED|ITEM_SHOWN|ITEM_GIVEN|FACT_KNOWN|EVENT_OCCURRED，id 必須是具體物品名稱／既有 fact id／既有 event type，hint 要用玩家可理解但不洩漏秘密的提示；不要為普通地點硬加門檻。不得假設全世界通用貨幣或同一文化。任何新 NPC 都要有 companionProfile。只輸出 JSON：{"region":"新區域名稱","reason":"與既有世界的因果連接","generation":{"locations":[{"name":"...","type":"...","region":"...","description":"...","historyRefs":["HIST-1"],"known":true或false,"accessRequirements":[{"type":"ITEM_OWNED","id":"具體物品名稱","hint":"需要相應通行物"}],"weatherProfile":{"zone":"...","affinities":["既有WTH id"],"suppressions":[]},"lore":{"story":"...","unlockKeywords":["線索"],"minMatches":1}}],"npcs":[{"name":"...","role":"...","description":"...","historyRefs":["HIST-1"],"knowledgeScope":["既有 public fact"],"known":true或false,"companionProfile":{"joinThreshold":35,"leaveThreshold":10,"motives":[],"boundaries":[]},"lore":{"story":"...","unlockKeywords":["線索"],"minMatches":1}}],"factions":[{"name":"...","goal":"...","description":"...","historyRefs":["HIST-1"],"known":false,"culture":{"identity":"..."},"trade":{"mode":"barter","currencies":[],"commonBarter":[],"foreignAcceptance":[],"priceCulture":"...","questReward":0,"combatReward":0},"lore":{"story":"...","unlockKeywords":["線索"],"minMatches":1}}],"sideQuests":[{"title":"...","objective":"...","historyRefs":["HIST-1"],"known":true或false,"evidenceKeywords":["線索"],"conditions":[],"target":2}]}}。最多2地點、2 NPC、1勢力、1支線。不得重建 existing、不得改寫 World Bible、不得洩漏 hidden secrets。',
  user:JSON.stringify(payload)
 });
 let provenance=validateExpansionProvenance(state,expansion?.generation),quality;
 try{
  quality=normalizeWorldEvaluation(await worldStage("RUNTIME_QUALITY_CRITIC",{
   signal,timeoutMs:40000,maxOutputTokens:900,temperature:.2,
   system:"你是 Elyndra Runtime World Critic。評估今次 expansion 與既有世界的因果一致性、歷史連結、文化差異、可玩性與模板化程度。overall 0-100；findings 最多5項。historyRefs 缺失或無效必須列 HIGH。只輸出與 World Critic 相同 JSON 格式。",
   user:JSON.stringify({payload,expansion,provenance})
  }),{source:"AI"})
 }catch(e){
  quality=normalizeWorldEvaluation({overall:provenance.valid?78:55,dimensions:{historyIntegration:provenance.valid?80:35,internalConsistency:75,worldDepth:70,playability:75},findings:provenance.issues.map(x=>({severity:"HIGH",targetType:"PROVENANCE",problem:x,recommendation:"補上有效 historyRefs",requiresRegeneration:true}))},{source:"FALLBACK",reason:e?.message||String(e)})
 }
 let final=expansion;
 if(!provenance.valid||quality.overall<75){
  try{
   const repaired=await worldStage("RUNTIME_REPAIR",{
    signal,timeoutMs:55000,maxOutputTokens:1500,temperature:.4,
    system:"你是 Elyndra Runtime Repair Architect。只修正這次 expansion，不可改既有 Canon。保留既有實體名稱與 region，補足有效 historyRefs、文化／交易／lore 深度及具體內容。不得創造 directorHistory 以外的 history id。只輸出完整 {generation:{...}} 修正版。",
    user:JSON.stringify({payload,expansion,quality,provenance})
   });
   if(repaired?.generation)final={...expansion,generation:repaired.generation};
   provenance=validateExpansionProvenance(state,final?.generation)
  }catch{}
 }
 if(!provenance.valid)throw new Error("RUNTIME_EXPANSION_PROVENANCE_FAILED:"+provenance.issues.join(","));
 return {...final,quality,provenance}
}
