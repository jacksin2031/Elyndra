import {hasDirectAI,directChat} from "./ai-settings.js?v=264";
import {seedDirective} from "./seed-contract.js?v=264";
import {recognitionForNpc} from "./recognition-engine.js?v=264";
import {normalizeWorldCoreCandidate} from "./world-compiler.js?v=264";
const API_BASE=(globalThis.ELYNDRA_API_BASE||"").replace(/\/$/,"");
const apiPath=path=>API_BASE?API_BASE+path:path;
async function post(path,body){const r=await fetch(apiPath(path),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||`AI_HTTP_${r.status}`);return r.json()}
function parseJSON(raw){const s=String(raw??"").trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\`\`\`$/,"").trim();try{return JSON.parse(s)}catch{const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));throw new Error("INVALID_MODEL_JSON")}}
export async function aiHealth(){if(hasDirectAI())return {ok:true,aiConfigured:true,mode:"direct"};try{const r=await fetch(apiPath("/api/health"));return r.ok?await r.json():{ok:false,aiConfigured:false}}catch{return {ok:false,aiConfigured:false}}}
export function visibleFacts(state){return state.world.canon.facts.filter(f=>state.knowledge.some(k=>k.factId===f.id)).map(f=>f.text)}
export function npcKnownFacts(state,npc){const scope=new Set(Array.isArray(npc?.knowledgeScope)?npc.knowledgeScope:[]);return state.world.canon.facts.filter(f=>scope.has(f.id)).map(f=>f.text)}
export async function narrate(state,action,roll){const playerWorldName=state.player?.worldNameKnown?state.world.name:"UNKNOWN";if(hasDirectAI()){return directChat({timeoutMs:45000,system:"你是 Elyndra 的繁體中文敘事者。玩家只知道 payload 中 visibleFacts、playerLocation 與這次行動能直接感知到的結果。world/Canon 可能存在更多真相，但不可提前說出任何未學會的世界名稱、地名、國家、勢力、歷史或規則。只能描述已由遊戲引擎決定的結果，不可改骰子、Canon、HP、物品。回答80-180字。",user:JSON.stringify({action,roll,player:{name:state.player?.name||"無名者",worldName:playerWorldName,playerLocation:state.player.location},visibleFacts:visibleFacts(state)})})}return (await post("/api/narrate",{action,roll,world:{name:playerWorldName,day:state.world.state.day,location:state.player.location},visibleFacts:visibleFacts(state)})).text}
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
   maxOutputTokens:1600,
   system:`你是 Elyndra World Architect · Core Compiler。你只負責世界核心，不生成曆法、Timeline、地點列表、NPC列表或任務列表。世界主題永遠由你自行創造，不可從固定主題清單選擇。worldviewMode=style 時必須遵守玩家選擇的 genre/scale/danger/magic/politics 與 styleFoundation；worldviewMode=ai 時必須自行決定 genre/theme/scale/danger/magic/politics，六者形成有因果的一致世界觀。不得採用現實地球公曆、現實國家制度或全球統一金幣作預設。seed.playerName 有值必須原樣保留。只輸出 JSON，不要 Markdown。`,
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
    worldBible:{era:"世界自己的時代稱呼",centralConflict:"核心衝突",magicCost:"魔法硬規則與代價",startingRegion:"真實開局區域",startingSettlement:"附近第一個文明聚落",startingLocation:"玩家真實出生位置名稱",ancientTruth:"玩家未知深層真相",currentCrisis:"正在發展中的危機",tone:"敘事氣氛"},
    publicFacts:["2-3項簡潔公開事實"],
    hiddenFacts:["2-3項簡潔真正秘密"]
   }})
  }));
  if(!core?.worldName||!core?.worldTheme||!core?.summary||!core?.seedCompliance||!core?.worldBible||!Array.isArray(core.publicFacts)||!Array.isArray(core.hiddenFacts))throw new Error("WORLD_CORE_INVALID");

  report(58,"平行編譯世界","時間線與開局地區將同時生成，減少等待時間");
  const chronologyPromise=worldStage("CHRONOLOGY",{
   timeoutMs:60000,
   maxOutputTokens:2200,
   system:`你是 Elyndra Chronology Compiler。根據固定世界核心，只生成該世界自己的曆法與完整大事件 Timeline。不得改寫 core，不得洩漏 directorTruth 給玩家。Timeline 必須符合 timelinePacing、按 earliestDay 排序並涵蓋 early/middle/late。欄位內容保持精簡。只輸出 JSON，不要 Markdown。`,
   user:JSON.stringify({core:{worldName:core.worldName,worldTheme:core.worldTheme,worldBible:core.worldBible},timelinePacing:directive.timelinePacing,required:{
    worldCalendar:{name:"曆法名",epochName:"紀元名",dayTerm:"日序稱呼",cycleTerm:"短週期稱呼",longCycleTerm:"長週期稱呼",daysPerCycle:"3-60整數",cyclesPerLongCycle:"3-30整數",cycles:["週期名"],periods:[{name:"時段名",fromMinute:0,toMinute:359}]},
    worldTimeline:Array.from({length:directive.timelinePacing.majorEventCount},(_,i)=>({title:`大事件${i+1}`,category:"事件類型",earliestDay:"2-horizonDays",latestDay:"earliestDay-horizonDays",directorTruth:"簡潔隱藏因果",observableEffect:"簡潔可觀察影響",pressure:"0-15整數"}))
   }})
  }).then(chronology=>{if(!chronology?.worldCalendar||!Array.isArray(chronology?.worldTimeline)||chronology.worldTimeline.length!==directive.timelinePacing.majorEventCount)throw new Error("WORLD_CHRONOLOGY_INVALID");report(64,"時間線完成","開局內容仍在同步編譯");return chronology});

  const openingPromise=(async()=>{
   const region=await worldStage("REGION",{
    timeoutMs:55000,
    maxOutputTokens:1600,
    system:`你是 Elyndra Opening Region Compiler。根據固定世界核心，只生成最小可玩開局：1個出生地點、最多1個勢力與零知識 openingHook。不得生成 NPC、任務或 suggestions。location.name 必須與 worldBible.startingLocation 完全一致。地點／勢力要有簡潔但具辨識度的 culture 與 trade；不可假設世界共用貨幣。openingHook 不可洩漏未知專有資訊。只輸出 JSON，不要 Markdown。`,
    user:JSON.stringify({core:{worldTheme:core.worldTheme,worldBible:core.worldBible,publicFacts:core.publicFacts},required:{
     openingHook:"60-140字感官開場",
     locations:[{name:"必須等於 startingLocation",type:"...",region:core.worldBible.startingRegion,description:"40-100字",known:false,culture:{identity:"核心文化",etiquette:["1項"],taboos:["1項"],food:["1項"],beliefs:["1項"],architecture:["1項"],clothing:["1項"],hospitality:["1項"],namingStyle:"簡短",languageNotes:["0-1項"]},trade:{mode:"currency|barter|mixed|ration|token",currencies:[{id:"穩定ID",name:"名稱",symbol:"",issuer:"發行者",description:"簡短"}],commonBarter:["0-2項"],foreignAcceptance:[],priceCulture:"簡短",questReward:0,combatReward:0},lore:{story:"40-100字，只生成一次",unlockKeywords:["1-3線索"],minMatches:1}}],
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
     sideQuests:[{title:"...",objective:"簡短",known:false,evidenceKeywords:["2-3線索"],target:3}],
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
export async function talkToDynamicNpc(state,npc,message){const knownFacts=npcKnownFacts(state,npc),recognition=recognitionForNpc(state,npc),payload={message,npc:{id:npc.id,name:npc.name,role:npc.role,description:npc.description,personality:npc.personality,goal:npc.goal,trust:npc.trust},knownFacts,memories:(npc.memories||[]).slice(-12),recognition,scene:{day:state.world.state.day,clock:state.world.state.clock,location:state.player.location}};if(hasDirectAI())return directChat({timeoutMs:45000,system:`你扮演 Elyndra NPC「${npc.name}」。保持 personality、goal 與既有 memories 一致。只能使用 knownFacts、memories 與 recognition.knownDeeds；public Canon 並不代表你自動知道。recognition.knownDeeds 是這名 NPC 合理聽過的玩家事蹟，可以自然影響稱呼、語氣與態度；如果為空就不可突然認識玩家的名聲。不知道的事不可捏造。繁體中文1-5句。`,user:JSON.stringify(payload)});return (await post("/api/npc",payload)).text}
const TURN_SCHEMA='{"narrative":"...","location":null,"worldNameKnown":false,"calendarKnown":false,"discoveries":[],"items":[{"name":"...","description":"玩家現在能觀察到的表面描述","lore":{"story":"首次建立時生成一次","unlockKeywords":["線索"],"minMatches":1}}],"npcChanges":[{"npcId":"已知 NPC id","trustDelta":0}],"companionChanges":[{"npcId":"已知 NPC id","action":"OFFER|LEAVE","reason":"符合 personality/goal/memories 的原因"}],"factionChanges":[{"factionId":"已知勢力 id","reputationDelta":0}],"quest":{"title":null,"objective":null},"entityReveals":[{"kind":"npc","id":"directorRegistry 中既有實體 id"}],"encounter":null或{"type":"combat","enemy":{"name":"符合本世界的敵對存在","level":1,"hp":20,"defense":11,"damage":6,"loot":"可為空字串"}},"generation":{"locations":[{"name":"...","type":"...","description":"...","known":true或false,"culture":{"identity":"地方文化核心","etiquette":[],"taboos":[],"food":[],"beliefs":[]},"trade":{"mode":"currency|barter|mixed|ration|token","currencies":[],"commonBarter":[],"foreignAcceptance":[],"priceCulture":"...","questReward":0,"combatReward":0}}],"npcs":[{"name":"...","role":"...","description":"...","known":true或false,"companionProfile":{"joinThreshold":35,"leaveThreshold":10,"motives":[],"boundaries":[]}}],"factions":[{"name":"...","goal":"...","description":"...","known":true或false,"culture":{"identity":"..."},"trade":{"mode":"...","currencies":[]}}],"sideQuests":[]},"worldImpacts":[{"scope":"PERSONAL|LOCAL|REGIONAL|FACTION|WORLD","targetKind":"location|npc|faction|world","targetId":"known id|CURRENT_LOCATION|WORLD","title":"持久改變","summary":"玩家造成的可驗證世界改變","reason":"因果原因","mutations":[{"field":"safety|prosperity|supply|infrastructure|stability|trust|resources|influence|tension|crisisPressure|statusTag","op":"DELTA|ADD_TAG|REMOVE_TAG","value":"number or tag"}],"consequences":[{"delayMinutes":180,"targetKind":"location","targetId":"known id","observableEffect":"稍後可觀察到的後果","mutations":[]}],"timelineEffects":[{"timelineId":"directorTimeline id","action":"DELAY|ADVANCE|WEAKEN|STRENGTHEN","days":1,"amount":1}],"recognition":{"publicLabel":"世界文化中可能出現的玩家稱呼，可空","rumor":"其他人會如何描述這件事","tone":"NEUTRAL|RESPECT|ADMIRE|FEAR|RESENT|SUSPICIOUS|MIXED","spread":"PERSONAL|LOCAL|REGIONAL|FACTION|WORLD","legacyMark":{"kind":"MEMORIAL|NOTICE|SCAR|INSTITUTION|CUSTOM","label":"若真的留下公開可見痕跡才填"}}}],"suggestions":["3-4個下一步行動"]}';
export async function generateTurn(action,roll,snapshot){if(hasDirectAI()){const raw=await directChat({timeoutMs:60000,system:`你是 Elyndra Adventure Director。骰子結果不可修改。snapshot.world.seedContract 是不可違反的玩家 World Seed 合約；所有新事件、地點、NPC、勢力、敵人與世界擴展都必須維持相同 genre/theme/scale/danger/magic/politics/custom prompt。snapshot.directorRegistry 與 snapshot.directorTimeline 是 Director 專用既有 Canon；timeline 的 directorTruth 絕不能提前告訴玩家，只能在事件真正觸發後依可觀察結果敘事。snapshot.companions 是目前同行／提議同行狀態。companionChanges 只可對已知 NPC 提出 OFFER 或 LEAVE，必須符合 personality、goal、trust、memories；玩家是否接受 OFFER 由 Engine/UI 決定。玩家只可知道 snapshot.knownFacts、snapshot.knowledge、snapshot.registry、可見物品、已知 location，以及本回合合理揭露的新資訊。npcChanges 只能引用 snapshot.registry 中玩家已知 NPC id。只有當本回合行動與骰子結果合理導致直接衝突時才建立 encounter，敵人必須符合本世界，不得使用任何預設怪物。snapshot.worldImpact.capability.maxScope 是本回合 Engine 允許的最高世界影響層級。只有玩家行動造成持久、可驗證改變時才填 worldImpacts；普通觀察、閒聊、無結果行動應回空陣列。worldImpacts 不得改寫已發生 Canon，只能改變 Current State 或未來後果；target 必須是已知 registry id、CURRENT_LOCATION 或 WORLD。REGIONAL 以上才可提出 timelineEffects；timelineEffects 只能改未來發生時間／強度，不能刪除事件或改 directorTruth。延遲後果必須有清晰因果，不能憑空獎勵玩家。worldImpacts.recognition 用來描述世界如何記住「已經真正成立」的玩家改變：rumor 必須忠於 impact；spread 不得高於 impact scope；publicLabel 只在當地文化真的可能為玩家形成稱呼時才填；legacyMark 只在玩家行動確實留下紀念物、告示、傷痕、制度或其他持久可見痕跡時使用，普通成功不要亂加。snapshot.recognition 是已經存在的名聲／稱號／傳聞，後續敘事與 NPC 反應應保持一致。只輸出 JSON：${TURN_SCHEMA}。先檢查 directorRegistry：既有實體只用 entityReveals，不得重建；不得再次生成既有 lore；不得洩漏未知秘密。`,user:JSON.stringify({action,roll,snapshot})});return parseJSON(raw)}return (await post("/api/turn",{action,roll,snapshot})).candidate}
export function publicWorldBible(state){const b=state.world.bible||{};return {era:b.era||"",centralConflict:b.centralConflict||"",magicCost:b.magicCost||"",startingRegion:b.startingRegion||"",startingSettlement:b.startingSettlement||"",startingLocation:b.startingLocation||"",currentCrisis:b.currentCrisis||"",tone:b.tone||""}}
export function regionExpansionPayload(state,reason="player_exploration"){return {reason,world:{name:state.player?.worldNameKnown?state.world.name:"UNKNOWN",bible:publicWorldBible(state),seedContract:state.world.seedContract||state.world.seed,region:state.world.state.region,location:state.player.location},existing:{locations:(state.world.registry?.locations||[]).map(x=>x.name).slice(-12),npcs:(state.world.registry?.npcs||[]).map(x=>x.name).slice(-12),factions:(state.world.registry?.factions||[]).map(x=>x.name).slice(-8)},publicFacts:visibleFacts(state).slice(-12)}}
export async function generateRegionExpansion(state,reason="player_exploration"){const payload=regionExpansionPayload(state,reason);if(hasDirectAI()){const raw=await directChat({timeoutMs:90000,system:'你是 Elyndra Progressive World Architect。world.seedContract 是不可違反的玩家世界設定；新區域必須維持同一 genre/theme/scale/danger/magic/politics/custom prompt，不可自行漂移。每個新地點／勢力首次生成時都要有符合當地歷史的 culture 與 trade；不得假設全世界通用貨幣或同一文化。任何新 NPC 都要有 companionProfile，但不代表一定會成為夥伴。只輸出 JSON：{"region":"新區域名稱","reason":"與既有世界的因果連接","generation":{"locations":[{"name":"...","type":"...","region":"...","description":"...","known":true或false,"lore":{"story":"只生成一次","unlockKeywords":["線索"],"minMatches":1}}],"npcs":[{"name":"...","role":"...","description":"...","knowledgeScope":["既有 public fact 完整文字或 fact id"],"known":true或false,"lore":{"story":"只生成一次","unlockKeywords":["線索"],"minMatches":1}}],"factions":[{"name":"...","goal":"...","description":"...","known":false,"lore":{"story":"只生成一次","unlockKeywords":["線索"],"minMatches":1}}],"sideQuests":[{"title":"...","objective":"...","known":true或false,"evidenceKeywords":["2-5個可驗證線索詞"],"target":3}]}}。最多2地點、2 NPC、1勢力、1支線。不得重建 existing、不得再次生成既有 lore、不得改寫 World Bible、不得洩漏 hidden secrets。',user:JSON.stringify(payload)});return parseJSON(raw)}return null}