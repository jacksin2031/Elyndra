import {hasDirectAI,directChat} from "./ai-settings.js?v=270";
import {seedDirective} from "./seed-contract.js?v=270";
import {recognitionForNpc} from "./recognition-engine.js?v=270";
import {normalizeWorldCoreCandidate} from "./world-compiler.js?v=270";
import {sceneTurnSnapshot,mergeTurnCandidates} from "./turn-compiler.js?v=270";
import {sanitizePlayerText} from "./runtime-guard.js?v=270";
import {helperSnapshot} from "./helper-context.js?v=270";
import {directorHistorySnapshot} from "./world-history.js?v=270";
import {playerWeatherSnapshot} from "./weather-engine.js?v=270";
const API_BASE=(globalThis.ELYNDRA_API_BASE||"").replace(/\/$/,"");
const apiPath=path=>API_BASE?API_BASE+path:path;
async function post(path,body){const r=await fetch(apiPath(path),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||`AI_HTTP_${r.status}`);return r.json()}
function parseJSON(raw){const s=String(raw??"").trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\`\`\`$/,"").trim();try{return JSON.parse(s)}catch{const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));throw new Error("INVALID_MODEL_JSON")}}
export async function aiHealth(){if(hasDirectAI())return {ok:true,aiConfigured:true,mode:"direct"};try{const r=await fetch(apiPath("/api/health"));return r.ok?await r.json():{ok:false,aiConfigured:false}}catch{return {ok:false,aiConfigured:false}}}
export function visibleFacts(state){return state.world.canon.facts.filter(f=>state.knowledge.some(k=>k.factId===f.id)).map(f=>f.text)}
export function npcKnownFacts(state,npc){const scope=new Set(Array.isArray(npc?.knowledgeScope)?npc.knowledgeScope:[]);return state.world.canon.facts.filter(f=>scope.has(f.id)).map(f=>f.text)}
export async function narrate(state,action,roll){const playerWorldName=state.player?.worldNameKnown?state.world.name:"UNKNOWN";if(hasDirectAI()){const raw=await directChat({timeoutMs:45000,system:"你是 Elyndra 的繁體中文敘事者。玩家只知道 payload 中 visibleFacts、playerLocation 與這次行動能直接感知到的結果。world/Canon 可能存在更多真相，但不可提前說出任何未學會的世界名稱、地名、國家、勢力、歷史或規則。只能描述已由遊戲引擎決定的結果，不可改骰子、Canon、HP、物品。回答80-180字。只使用繁體中文；除既有專有名詞外不要切換成英文、日文、韓文或其他語言，也不要輸出 [世界動向]、【世界動向】、SYSTEM 等系統標籤。",user:JSON.stringify({action,roll,player:{name:state.player?.name||"無名者",worldName:playerWorldName,playerLocation:state.player.location},weather:playerWeatherSnapshot(state),visibleFacts:visibleFacts(state)})});return sanitizePlayerText(raw,700,"")}const raw=(await post("/api/narrate",{action,roll,world:{name:playerWorldName,day:state.world.state.day,location:state.player.location},weather:playerWeatherSnapshot(state),visibleFacts:visibleFacts(state)})).text;return sanitizePlayerText(raw,700,"")}
function emitWorldProgress(cb,progress,label,detail){try{cb?.({progress,label,detail})}catch{}}
async function worldStage(stage,args){
 try{return parseJSON(await directChat(args))}
 catch(e){const suffix=e?.message||String(e);throw new Error(`WORLD_${stage}_FAILED: ${suffix}`)}
}
export async function generateWorldCandidate(seed,constitution,onProgress){
 let progressFloor=0;const report=(progress,label,detail)=>{if(progress<progressFloor)return;progressFloor=progress;emitWorldProgress(onProgress,progress,label,detail)};
 const directive=seedDirective(seed),auto=directive.contract.worldviewMode==="ai",expected=directive.contract;
 const chosen=v=>v==="AI_DECIDES"||v==null?"AI 必須自行決定並回傳具體值":v;
 if(hasDirectAI()){
  report(42,"世界核心","AI 正在建立精簡世界核心與 Seed Contract");
  const core=normalizeWorldCoreCandidate(await worldStage("CORE",{
   timeoutMs:65000,
   maxOutputTokens:2200,
   system:`你是 Elyndra World Architect · Core Compiler。你只負責世界核心，不生成曆法、Timeline、地點列表、NPC列表或任務列表。世界主題永遠由你自行創造，不可從固定主題清單選擇。worldviewMode=style 時必須遵守玩家選擇的 genre/scale/danger/magic/politics 與 styleFoundation；worldviewMode=ai 時必須自行決定 genre/theme/scale/danger/magic/politics，六者形成有因果的一致世界觀。不得採用現實地球公曆、現實國家制度或全球統一金幣作預設。你必須先定義 civilization.level 1-5，再設計符合「文明程度 + 魔法普及度 + 世界文化」的聯絡方式；低文明低魔法只可有信使／驛站等延遲通訊，只有文明或魔法足以支持時才可有即時或近即時遠距對話，不得無理由直接套用現實互聯網。你亦必須定義本世界獨有 Weather Canon：天氣不必遵循現實地球，可由魔力、天體、浮游物質、世界法則或其他設定形成；至少一種現象必須明顯屬於這個異世界，而不是單純晴雨雪換名。seed.playerName 有值必須原樣保留。只輸出 JSON，不要 Markdown。`,
   user:JSON.stringify({seed,seedDirective:{contract:directive.contract,styleFoundation:directive.styleFoundation,randomEntropy:directive.randomEntropy},required:{
    worldName:"string",worldTheme:"具體核心主題",playerName:"string",summary:"80-160字世界概要",
    seedCompliance:{
     genre:{value:chosen(expected.genre),evidence:"12-40字具體 evidence"},
     theme:{value:"必須與 worldTheme 完全相同",evidence:"12-40字具體 evidence"},
     scale:{value:chosen(expected.scale),evidence:"12-40字具體 evidence"},
     danger:{value:auto?"1-5整數":expected.danger,evidence:"12-40字具體 evidence"},
     magic:{value:auto?"1-5整數":expected.magic,evidence:"12-40字具體 evidence"},
     politics:{value:auto?"1-5整數":expected.politics,evidence:"12-40字具體 evidence"},
     ...(expected.prompt?{prompt:{value:expected.prompt,evidence:"如何落實玩家自訂要求"}}:{})
    },
    worldBible:{era:"世界自己的時代稱呼",centralConflict:"核心衝突",magicCost:"魔法硬規則與代價",startingRegion:"真實開局區域",startingSettlement:"附近第一個文明聚落",startingLocation:"玩家真實出生位置名稱",ancientTruth:"玩家未知深層真相",currentCrisis:"正在發展中的危機",tone:"敘事氣氛",civilization:{level:"1-5整數，1=分散聚落，5=高度網絡化",stage:"世界內文明階段名稱",infrastructure:"基建程度",literacy:"教育／識字狀況",mobility:"人口與交通流動方式"},communication:{name:"符合文明與魔法程度的遠距聯絡方式",medium:"世界內媒介",description:"如何運作且為何符合文明程度",latency:"NONE|DELAYED|NEAR_INSTANT|INSTANT",range:"LOCAL|REGIONAL|WORLD",accessRule:"ENCOUNTERED",constraints:"限制與代價"},weatherSystem:{identity:"這個世界的天氣法則，20-60字",source:"天氣來源，例如大氣／魔力／天體／世界機制",cycle:"如何隨時間或地區變化",forecastability:"LOW|MEDIUM|HIGH",phenomena:Array.from({length:4},(_,i)=>({id:`WTH-${i+1}`,name:"世界內正式名稱",observableName:"玩家只靠感官能描述的名稱，不洩漏未知專有知識",description:"20-60字",sensoryCue:"當下可直接感知的變化",rarity:"COMMON|UNCOMMON|RARE|EXTREME",weight:"1-100",durationMin:"15-720分鐘",durationMax:"durationMin-1440分鐘",danger:"0-5",actionModifiers:{OBSERVE:"-2..2",SOCIAL:"-2..2",TRAVEL:"-2..2",RISKY:"-2..2",GENERAL:"-2..2"},tags:["1-3項"],transitions:["其他WTH id，可空"]}))}},
    publicFacts:["2-3項簡潔公開事實"],
    hiddenFacts:["2-3項簡潔真正秘密"]
   }})
  }));
  if(!core?.worldName||!core?.worldTheme||!core?.summary||!core?.seedCompliance||!core?.worldBible||!Array.isArray(core.worldBible?.weatherSystem?.phenomena)||core.worldBible.weatherSystem.phenomena.length<4||!Array.isArray(core.publicFacts)||!Array.isArray(core.hiddenFacts))throw new Error("WORLD_CORE_INVALID");

  report(58,"平行編譯世界","時間線與開局地區將同時生成，減少等待時間");
  const chronologyPromise=worldStage("CHRONOLOGY",{
   timeoutMs:60000,
   maxOutputTokens:3000,
   system:`你是 Elyndra Chronology Compiler。根據固定世界核心，同時生成「不可改寫的過去歷史 World History」與「會在遊戲中向未來發展的 Timeline」。World History 必須解釋文明、制度、衝突、魔法／技術與現代世界為何變成現在這樣；它是已發生 Canon，之後不可被玩家或 AI 改寫。Timeline 則是未來事件，可被玩家影響其實際結果。不得洩漏 directorTruth 給玩家。Timeline 必須符合 timelinePacing、按 earliestDay 排序並涵蓋 early/middle/late。欄位內容保持精簡。只輸出 JSON，不要 Markdown。`,
   user:JSON.stringify({core:{worldName:core.worldName,worldTheme:core.worldTheme,worldBible:core.worldBible},timelinePacing:directive.timelinePacing,required:{
    worldHistory:Array.from({length:5},(_,i)=>({id:`HIST-${i+1}`,order:i+1,era:"世界內歷史時代名稱",title:`重大歷史事件${i+1}`,category:"戰爭|王朝|宗教|技術|魔法|遷徙|災難|改革等",summary:"已經發生且不可改寫的歷史",causes:["1-3項原因"],legacies:["1-4項直到現在仍存在的影響"],regions:["受影響區域，可空"],factions:["相關勢力，可空"],discoverKeywords:["日後可從遺跡／文獻／NPC發現的線索詞"]})),
    worldCalendar:{name:"曆法名",epochName:"紀元名",dayTerm:"日序稱呼",cycleTerm:"短週期稱呼",longCycleTerm:"長週期稱呼",daysPerCycle:"3-60整數",cyclesPerLongCycle:"3-30整數",cycles:["週期名"],periods:[{name:"時段名",fromMinute:0,toMinute:359}]},
    worldTimeline:Array.from({length:directive.timelinePacing.majorEventCount},(_,i)=>({title:`大事件${i+1}`,category:"事件類型",earliestDay:"2-horizonDays",latestDay:"earliestDay-horizonDays",directorTruth:"簡潔隱藏因果",observableEffect:"簡潔可觀察影響",pressure:"0-15整數"}))
   }})
  }).then(chronology=>{if(!chronology?.worldCalendar||!Array.isArray(chronology?.worldHistory)||chronology.worldHistory.length<3||!Array.isArray(chronology?.worldTimeline)||chronology.worldTimeline.length!==directive.timelinePacing.majorEventCount)throw new Error("WORLD_CHRONOLOGY_INVALID");report(64,"時間線完成","開局內容仍在同步編譯");return chronology});

  const openingPromise=(async()=>{
   const region=await worldStage("REGION",{
    timeoutMs:55000,
    maxOutputTokens:1600,
    system:`你是 Elyndra Opening Region Compiler。根據固定世界核心，只生成最小可玩開局：1個出生地點、最多1個勢力與零知識 openingHook。不得生成 NPC、任務或 suggestions。location.name 必須與 worldBible.startingLocation 完全一致。地點／勢力要有簡潔但具辨識度的 culture 與 trade；不可假設世界共用貨幣。每個地點要有 weatherProfile，affinities / suppressions 只能引用 worldBible.weatherSystem.phenomena 的 id，令不同地區有不同天氣分布。openingHook 不可洩漏未知專有資訊。只輸出 JSON，不要 Markdown。`,
    user:JSON.stringify({core:{worldTheme:core.worldTheme,worldBible:core.worldBible,publicFacts:core.publicFacts},required:{
     openingHook:"60-140字感官開場",
     locations:[{name:"必須等於 startingLocation",type:"...",region:core.worldBible.startingRegion,description:"40-100字",known:false,culture:{identity:"核心文化",etiquette:["1項"],taboos:["1項"],food:["1項"],beliefs:["1項"],architecture:["1項"],clothing:["1項"],hospitality:["1項"],namingStyle:"簡短",languageNotes:["0-1項"]},trade:{mode:"currency|barter|mixed|ration|token",currencies:[{id:"穩定ID",name:"名稱",symbol:"",issuer:"發行者",description:"簡短"}],commonBarter:["0-2項"],foreignAcceptance:[],priceCulture:"簡短",questReward:0,combatReward:0},weatherProfile:{zone:"當地天候區域描述",affinities:["WTH id，0-3項"],suppressions:["WTH id，0-2項"]},lore:{story:"40-100字，只生成一次",unlockKeywords:["1-3線索"],minMatches:1}}],
     factions:[{name:"...",goal:"簡短",description:"40-100字",known:false,culture:{identity:"核心文化",etiquette:["1項"],taboos:["1項"],beliefs:["1項"]},trade:{mode:"currency|barter|mixed|ration|token",currencies:[],commonBarter:[],foreignAcceptance:[],priceCulture:"簡短",questReward:0,combatReward:0},lore:{story:"40-100字，只生成一次",unlockKeywords:["1-3線索"],minMatches:1}}]
    }})
   });
   if(!region?.openingHook||!Array.isArray(region?.locations)||!region.locations.length||!Array.isArray(region?.factions))throw new Error("WORLD_REGION_INVALID");
   report(68,"開局地區完成","正在生成第一名附近人物與開局行動");
   const cast=await worldStage("CAST",{
    timeoutMs:50000,
    maxOutputTokens:1200,
    system:`你是 Elyndra Opening Cast Compiler。只根據既有 core 與 region 生成1個附近 NPC、最多1個支線與3-4個開局 suggestions。NPC knowledgeScope 只能引用 core.publicFacts 完整文字；suggestions 只能使用 openingHook 中可感知資訊。內容保持精簡。只輸出 JSON，不要 Markdown。`,
    user:JSON.stringify({core:{worldTheme:core.worldTheme,publicFacts:core.publicFacts},region:{openingHook:region.openingHook,locations:region.locations,factions:region.factions},required:{
     npcs:[{name:"...",role:"...",description:"40-100字",personality:"簡短",goal:"簡短",locationName:"引用 region.locations",factionName:"可空或引用 region.factions",knowledgeScope:["core.publicFacts 完整文字"],known:false,companionProfile:{joinThreshold:35,leaveThreshold:10,motives:["1-2項"],boundaries:["1-2項"]},lore:{story:"40-100字，只生成一次",unlockKeywords:["1-3線索"],minMatches:1}}],
     sideQuests:[{title:"...",objective:"簡短",known:false,evidenceKeywords:["2-3個只對應實體證據的線索"],conditions:[{type:"FACT_KNOWN|ITEM_OWNED|ENTITY_KNOWN|EVENT_OCCURRED|LOCATION_STATE|NPC_STATE|FACTION_STATE",id:"Canon/entity/event id",field:"可選",op:"GTE|LTE|EQ|NEQ",value:"可選"}],target:3}],
     suggestions:["3-4個短行動"]
    }})
   });
   if(!Array.isArray(cast?.npcs)||!Array.isArray(cast?.sideQuests)||!Array.isArray(cast?.suggestions)||cast.suggestions.length<2)throw new Error("WORLD_CAST_INVALID");
   report(78,"人物與支線完成","等待另一條編譯分支完成後整合世界");
   return {openingHook:region.openingHook,suggestions:cast.suggestions,generation:{locations:region.locations.slice(0,1),npcs:cast.npcs.slice(0,1),factions:region.factions.slice(0,1),sideQuests:cast.sideQuests.slice(0,1)}}
  })();

  const [chronology,opening]=await Promise.all([chronologyPromise,openingPromise]);
  report(84,"整合世界","平行編譯完成，正在合併並交由 Engine 驗證");
  return {...core,...chronology,...opening}
 }
 report(42,"世界核心","正在透過伺服器建立世界");
 const candidate=(await post("/api/world",{seed,constitution,seedDirective:directive})).candidate;
 report(78,"整合世界","伺服器世界候選已完成，準備 Engine 驗證");
 return candidate
}
export async function talkToNpc(state,key,message){const npc=state.npcs?.[key];if(!npc)throw new Error("NPC_NOT_FOUND");const knownFacts=npcKnownFacts(state,npc),payload={message,npc,knownFacts,memories:npc.memories||[],scene:{day:state.world.state.day,location:state.player.location}};if(hasDirectAI())return directChat({timeoutMs:45000,system:`你扮演 Elyndra NPC「${npc.name}」。只能使用提供的 knownFacts 與 memories，不知道就表現不知道。繁體中文1-4句。`,user:JSON.stringify(payload)});return (await post("/api/npc",payload)).text}
export async function talkToDynamicNpc(state,npc,message,contact={}){const knownFacts=npcKnownFacts(state,npc),recognition=recognitionForNpc(state,npc),payload={message,npc:{id:npc.id,name:npc.name,role:npc.role,description:npc.description,personality:npc.personality,goal:npc.goal,trust:npc.trust},knownFacts,memories:(npc.memories||[]).slice(-12),recognition,contact:{mode:contact.mode||"LOCAL",communication:contact.communication||null},scene:{day:state.world.state.day,clock:state.world.state.clock,location:state.player.location,weather:playerWeatherSnapshot(state)}};if(hasDirectAI()){const raw=await directChat({timeoutMs:45000,system:`你扮演 Elyndra NPC「${npc.name}」。保持 personality、goal 與既有 memories 一致。只能使用 knownFacts、memories 與 recognition.knownDeeds；public Canon 並不代表你自動知道。recognition.knownDeeds 是這名 NPC 合理聽過的玩家事蹟，可以自然影響稱呼、語氣與態度；如果為空就不可突然認識玩家的名聲。若 contact.mode=REMOTE，必須自然反映 payload.contact.communication 所定義的世界內通訊媒介與限制，但不要自行發明更高階技術。不知道的事不可捏造。只使用繁體中文1-5句；除既有專有名詞外不要切換其他語言，不要輸出系統標籤。`,user:JSON.stringify(payload)});return sanitizePlayerText(raw,700,`${npc.name}暫時沒有再補充更多資訊。`)}const raw=(await post("/api/npc",payload)).text;return sanitizePlayerText(raw,700,`${npc.name}暫時沒有再補充更多資訊。`)}
const TURN_SCENE_SCHEMA='{"sceneTitle":"4-18字繁體中文目前目標，讓玩家一眼知道現在應該處理甚麼，例如「調查鐘聲來源」","narrative":"80-180字繁體中文，只描述玩家當下可感知的行動結果，不建立或修改 Canon","suggestions":["3-4個只基於眼前資訊的下一步行動"]}';
const TURN_STATE_SCHEMA='{"outcomeSummary":"40-100字可見結果摘要","location":null,"worldNameKnown":false,"calendarKnown":false,"discoveries":[{"title":"...","text":"...","factId":"directorCanon 中既有 fact id；沒有可驗證 Canon 時留空","evidenceType":"OBSERVED|HEARD|READ|EXAMINED"}],"items":[{"name":"...","description":"玩家當下可見描述","evidenceFactId":"只有同回合 verified discovery 支持此物品為任務證據時填 fact id，否則留空","lore":{"story":"只生成一次","unlockKeywords":["線索"],"minMatches":1},"checkBonuses":{"OBSERVE|SOCIAL|TRAVEL|RISKY|GENERAL|ALL":"可選整數 -2 至 2；只有功能性工具／裝備才填"}}],"magicLearning":[{"name":"本世界法術名","school":"本世界魔法流派","cost":10,"effect":"可驗證效果","sourceFactId":"directorCanon 中明確支持此法術／術式的 fact id"}],"npcChanges":[{"npcId":"已知 NPC id","trustDelta":0}],"companionChanges":[{"npcId":"已知 NPC id","action":"OFFER|LEAVE","reason":"符合角色設定的原因"}],"factionChanges":[{"factionId":"已知勢力 id","reputationDelta":0}],"quest":{"title":null,"objective":null},"entityReveals":[{"kind":"location|npc|faction|sideQuest","id":"directorRegistry 既有實體 id"}],"encounter":null或{"type":"combat","enemy":{"name":"符合本世界的敵對存在","description":"與世界規則一致的特徵","level":1,"hp":20,"defense":11,"damage":6,"element":"PHYSICAL|FIRE|ICE|LIGHTNING|POISON|ARCANE|HOLY|SHADOW|NATURE|PSYCHIC|NONE","weaknesses":[],"resistances":[],"abilities":[{"name":"本世界能力","kind":"ATTACK|HEAVY|STATUS|HEAL","power":5,"element":"元素","cooldown":1,"status":"可空"}],"loot":"可空字串"}},"generation":{"locations":[],"npcs":[],"factions":[],"sideQuests":[]},"worldImpacts":[{"scope":"PERSONAL|LOCAL|REGIONAL|FACTION|WORLD","targetKind":"location|npc|faction|world","targetId":"已存在 id|CURRENT_LOCATION|WORLD","title":"持久改變","summary":"可驗證結果","reason":"直接因果","outcome":"BENEFIT|COST|MIXED","mutations":[{"field":"合法數值欄位|statusTag|structure","op":"DELTA|ADD_TAG|REMOVE_TAG|STRUCTURE","value":"數值／標記；STRUCTURE 時為 {id,label,state,description}"}],"consequences":[],"timelineEffects":[]}]}';

export async function askTravelHelper(state,question){
 const q=String(question||"").trim().slice(0,240);if(!q)throw new Error("HELPER_QUESTION_REQUIRED");
 const snapshot=helperSnapshot(state);
 const system="你是 Elyndra 旅途輔助 AI。你只能根據 payload.snapshot 中玩家目前已知或可直接感知的資料回答，不可以使用模型自身對這個虛構世界的知識補完，不可以推測 hidden facts、Director Timeline、未發現地點、未遇 NPC 或未公開勢力。若玩家問「附近／四周／眼前」，只可使用 world.currentLocation、world.currentNarrative、world.weather、knowledge.nearbyNpcs 與 combat；若玩家問天氣，只可描述 world.weather 中目前可直接感知的天氣，不可推測未出現的 Weather Canon；knowledge.knownLocations 只代表玩家知道那些地方存在，不代表它們在附近。若資料不足，直接說「目前沒有足夠情報確認」。你只提供資訊整理與方向提示，不可以改變劇情、時間、骰子、HP、物品、任務、NPC 關係、戰鬥或任何 Canon。只使用繁體中文，回答 2-6 句，清楚區分『已知』與『未確認』。";
 if(hasDirectAI()){const raw=await directChat({timeoutMs:30000,maxOutputTokens:700,temperature:.25,system,user:JSON.stringify({question:q,snapshot})});return sanitizePlayerText(raw,900,"目前沒有足夠情報確認。")}
 const raw=(await post("/api/helper",{question:q,snapshot})).text;return sanitizePlayerText(raw,900,"目前沒有足夠情報確認。")
}
export async function generateTurn(action,roll,snapshot){
 if(hasDirectAI()){
  const sceneInput={action,roll,snapshot:sceneTurnSnapshot(snapshot)};
  const stateInput={action,roll,snapshot};
  const scenePromise=directChat({
   timeoutMs:35000,maxOutputTokens:700,temperature:.8,
   system:`你是 Elyndra Scene Narrator。你只負責玩家可見敘事與下一步建議，不可以修改世界狀態、Canon、NPC 關係、勢力、任務、戰鬥、物品或世界影響。骰子結果已由 Engine 決定，不能改。只可使用 payload 中玩家已知資訊；不得引用 director-only 資訊，不得發明未揭露專有名詞。snapshot.weather 是玩家目前可直接感知的天氣，敘事要自然反映其感官效果，但不可替玩家知道未公開的 Weather Canon。sceneTitle 是給玩家看的「目前目標」，必須用動詞導向，根據最新位置、衝突或劇情發展重新命名，例如「調查鐘聲來源」「找到安全落腳處」；不得只寫氣氛章節名，也不得固定使用「陌生世界的第一天」。narrative 必須忠於 roll.success / grade，只描寫當下可感知結果。只使用繁體中文，不得輸出 [世界動向]、【世界改變】、SYSTEM 等系統標籤。suggestions 每輪必須根據當前場景重新生成，除非情境真的沒有改變，否則不得逐字重複 snapshot.priorSuggestions；不得使用其他語言。只輸出 JSON：${TURN_SCENE_SCHEMA}`,
   user:JSON.stringify(sceneInput)
  }).then(parseJSON);

  const statePromise=directChat({
   timeoutMs:50000,maxOutputTokens:1800,temperature:.55,
   system:`你是 Elyndra State Director。你只負責結構化世界狀態候選，不寫長篇敘事。骰子結果不可修改。snapshot.world.seedContract 是硬性世界合約；所有新事件、實體、敵人與世界擴展都必須符合它。directorRegistry、directorTimeline、directorHistory、directorCanon 與 directorWeather 只供保持 Canon；天氣狀態由 Engine 推進，State Director 不可自行改寫目前天氣或臨時創造新 weather phenomenon。directorTruth 與未被玩家發現的歷史內容絕不能寫入玩家可見欄位。npcChanges 只能引用 snapshot.registry.npcs 中 present=true 或 remoteContactable=true 的 NPC id，或目前 ACTIVE 夥伴；沒有合法聯絡方式的遠處 NPC 不可直接互動或改 trust。companionChanges 只可作用於 present=true NPC 或 ACTIVE 夥伴，遠距聯絡本身不可瞬間加入實體同行隊伍。location 若有值，只可填 directorRegistry 已存在地點的 id/名稱，或本回合 generation 新建立且玩家實際到達的地點；不可自由創造亂碼或未 Canonize 地名。只有行動與骰子合理導致直接衝突才建立 encounter；敵人的 element / weaknesses / resistances / abilities 必須來自本世界設定與當前場景，不得套用固定怪物模板。discoveries 只有在本回合成功行動實際取得證據時才可引用 directorCanon 的 factId；無法對應 Canon 的內容只能作未驗證觀察，不得當作世界真相。worldImpacts 的 STRUCTURE mutation 可表示橋樑、道路、神殿、城市設施等永久結構狀態，state 只用 ACTIVE|OPEN|RESTORED|STABILIZED|DAMAGED|DESTROYED|CLOSED|FLOODED|ABANDONED|CORRUPTED|TRANSFORMED；失敗不得用正面結構狀態。worldImpacts 只用於玩家真正造成的持久改變；不得改寫過去 Canon；scope 不得高於 snapshot.worldImpact.capability.maxScope；REGIONAL 以上才可調整未觸發 Timeline；recognition 必須忠於已成立 impact 且 spread 不得超過 impact scope。既有實體只用 entityReveals，不得重建。新 generation 必須符合既有 Canon；若 generation 新增 location，必須附 weatherProfile，而且 affinities / suppressions 只能引用 snapshot.directorWeather.system.phenomena 已存在的 id，不得創造新天氣。普通行動可回空 generation/worldImpacts。若新增 item，checkBonuses 只可用於明確具功能性的工具／裝備，單項每類 -2 至 2；普通素材或故事物件不要加能力值。outcomeSummary 只用作敘事 AI 失敗時的安全 fallback，必須用繁體中文且不得帶系統標籤。只輸出 JSON：${TURN_STATE_SCHEMA}`,
   user:JSON.stringify(stateInput)
  }).then(parseJSON);

  const [sceneResult,stateResult]=await Promise.allSettled([scenePromise,statePromise]);
  if(stateResult.status!=="fulfilled")throw stateResult.reason;
  const scene=sceneResult.status==="fulfilled"?sceneResult.value:null;
  return mergeTurnCandidates(scene,stateResult.value,roll,{action,priorSuggestions:snapshot?.priorSuggestions||[]})
 }
 return (await post("/api/turn",{action,roll,snapshot})).candidate
}
export function publicWorldBible(state){const b=state.world.bible||{};return {era:b.era||"",centralConflict:b.centralConflict||"",magicCost:b.magicCost||"",startingRegion:b.startingRegion||"",startingSettlement:b.startingSettlement||"",startingLocation:b.startingLocation||"",currentCrisis:b.currentCrisis||"",tone:b.tone||"",civilization:b.civilization||null,communication:b.communication||null,weatherSystem:b.weatherSystem||null}}
export function regionExpansionPayload(state,reason="player_exploration"){return {reason,world:{name:state.player?.worldNameKnown?state.world.name:"UNKNOWN",bible:publicWorldBible(state),seedContract:state.world.seedContract||state.world.seed,region:state.world.state.region,location:state.player.location},directorHistory:directorHistorySnapshot(state,8),existing:{locations:(state.world.registry?.locations||[]).map(x=>x.name).slice(-12),npcs:(state.world.registry?.npcs||[]).map(x=>x.name).slice(-12),factions:(state.world.registry?.factions||[]).map(x=>x.name).slice(-8)},publicFacts:visibleFacts(state).slice(-12)}}
export async function generateRegionExpansion(state,reason="player_exploration"){const payload=regionExpansionPayload(state,reason);if(hasDirectAI()){const raw=await directChat({timeoutMs:90000,system:'你是 Elyndra Progressive World Architect。world.seedContract 是不可違反的玩家世界設定；新區域必須維持同一 genre/theme/scale/danger/magic/politics/custom prompt，不可自行漂移。每個新地點／勢力首次生成時都要符合 directorHistory 中已 Canonize 的過去歷史，並有符合當地歷史的 culture 與 trade；每個新地點必須有 weatherProfile，affinities / suppressions 只可引用 world.bible.weatherSystem.phenomena 既有 id，不得新增或改寫 Weather Canon；不得假設全世界通用貨幣或同一文化。任何新 NPC 都要有 companionProfile，但不代表一定會成為夥伴。只輸出 JSON：{"region":"新區域名稱","reason":"與既有世界的因果連接","generation":{"locations":[{"name":"...","type":"...","region":"...","description":"...","known":true或false,"weatherProfile":{"zone":"當地天候區域","affinities":["既有WTH id"],"suppressions":["既有WTH id"]},"lore":{"story":"只生成一次","unlockKeywords":["線索"],"minMatches":1}}],"npcs":[{"name":"...","role":"...","description":"...","knowledgeScope":["既有 public fact 完整文字或 fact id"],"known":true或false,"lore":{"story":"只生成一次","unlockKeywords":["線索"],"minMatches":1}}],"factions":[{"name":"...","goal":"...","description":"...","known":false,"lore":{"story":"只生成一次","unlockKeywords":["線索"],"minMatches":1}}],"sideQuests":[{"title":"...","objective":"...","known":true或false,"evidenceKeywords":["2-5個只對應實體證據的線索詞"],"conditions":[{"type":"FACT_KNOWN|ITEM_OWNED|ENTITY_KNOWN|EVENT_OCCURRED|LOCATION_STATE|NPC_STATE|FACTION_STATE","id":"existing id","field":"可空","op":"GTE|LTE|EQ|NEQ","value":"可空"}],"target":3}]}}。最多2地點、2 NPC、1勢力、1支線。不得重建 existing、不得再次生成既有 lore、不得改寫 World Bible、不得洩漏 hidden secrets。',user:JSON.stringify(payload)});return parseJSON(raw)}return null}