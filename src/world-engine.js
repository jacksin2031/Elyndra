import {revealStoredLore} from "./lore-engine.js?v=57025";
import {createWorldSeedContract,validateSeedCompliance,localSeedCompliance} from "./seed-contract.js?v=57025";
import {createTimelinePacing,validateWorldTimeline} from "./world-timeline.js?v=57025";
import {normalizeCalendar} from "./world-locality.js?v=57025";
import {sanitizePlayerText,sanitizeSuggestions,sanitizeLocationName} from "./runtime-guard.js?v=57029";
import {normalizeCommunicationSystem,normalizeCivilizationProfile} from "./communication-engine.js?v=57025";
import {validateWorldHistory} from "./world-history.js?v=57025";
import {normalizeWeatherSystem,initializeWeather} from "./weather-engine.js?v=57025";
import {modernEarthOriginProfile} from "./player-origin.js?v=57025";
import {applyOpeningExperience} from "./player-experience.js?v=57028";
import {ensureCausalWorldCore,registerCanonizedWorld} from "./causal-world-core.js?v=57025";
const uuid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clean=(v,max=120)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const WORLD_CONSTITUTION=[
 {id:"C-001",text:"已 Canonize 的事實不可被敘事 AI 改寫"},
 {id:"C-002",text:"真正死亡不可逆轉，除非世界種子明確定義例外"},
 {id:"C-003",text:"NPC 只能使用其 knowledgeScope、親身記憶與明確取得的資訊"},
 {id:"C-004",text:"骰子與規則結果由 Game Engine 決定，AI 只能提出符合結果的候選變化"},
 {id:"C-005",text:"新生成內容必須通過 Canon、時間線與依賴驗證"},
 {id:"C-006",text:"snapshot.player.origin／state.player.origin 是玩家起源、初始知識、語言與價值觀的唯一權威；不得自行假設現代地球背景。任何超出 origin 授權的地名、魔法、貨幣、文化或世界規則都必須由證據取得"},
 {id:"C-007",text:"Engine 不得硬編碼任何特定世界的地名、人物、勢力、貨幣或敵人"},
 {id:"C-008",text:"世界不得默認採用現實地球曆法、國家制度或全球通用貨幣；地方文化與交易制度必須由 Canon 定義"},
 {id:"C-009",text:"世界未來事件在創世時只 Canonize 為 Director 層的潛在事件；Engine 必須同時檢查 activation／cancel／escalation conditions，玩家可以在規則允許時阻止、延遲或加速，不得把偏好當成必然劇情"},
 {id:"C-010",text:"世界過去歷史 Skeleton 在創世時 Canonize 並不可改寫；玩家研究後可 Lazy Deepen 尚未定義的人物、文獻、遺物、地點痕跡與不同記錄版本，但不得改變既有 title、summary、causes、legacies、era、category 或已發生因果；生成隱藏細節本身不等於玩家已知。"},
 {id:"C-011",text:"天氣由世界 Canon 定義並由 Engine 按世界時間與地區推進；天氣可為異世界獨有現象，不得被敘事 AI 臨時改寫"},
 {id:"C-012",text:"角色年齡、世代與世界歷史必須時間一致；若仍存活角色被設定為百年前、數百年前或更早時期的第一代、始祖、創建者或直接見證者，Canon 必須明確定義足以解釋其存活的長壽、延命、不老、休眠或等價機制，否則必須改為後代、傳承者或記錄持有人"}
];
function hash(s){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return h}
function localWorldName(seed){const a=["艾","賽","諾","維","伊","洛","瑟","亞"],b=["蘭","爾","恩","斯","姆","亞","里","德"],c=["達","拉","恩","亞","爾","斯"];const h=Math.abs(hash(JSON.stringify(seed)));return a[h%a.length]+b[Math.floor(h/a.length)%b.length]+c[Math.floor(h/(a.length*b.length))%c.length]}
function normalizeEconomy(input){
 if(!input||typeof input!=="object"||Array.isArray(input))return {currencyExists:false,currencyName:"",currencySymbol:"",startingAmount:0,questReward:0,combatReward:0};
 const currencyExists=input.currencyExists===true;
 return {currencyExists,currencyName:currencyExists?clean(input.currencyName,40):"",currencySymbol:currencyExists?clean(input.currencySymbol,12):"",startingAmount:currencyExists?clamp(Math.round(Number(input.startingAmount)||0),0,20):0,questReward:currencyExists?clamp(Math.round(Number(input.questReward)||0),0,20):0,combatReward:currencyExists?clamp(Math.round(Number(input.combatReward)||0),0,20):0}
}
export function compileWorld(seed){
 const now=Date.now(),seedContract=createWorldSeedContract(seed),timelinePacing=createTimelinePacing(seedContract.targetPlayHours),economy=normalizeEconomy(null),world={id:uuid(),name:localWorldName(seed),seed,seedContract,seedCompliance:localSeedCompliance(seed),timelinePacing,timeline:[],history:[],calendar:normalizeCalendar(null),weather:{version:1,currentId:"",startedMinute:0,nextChangeMinute:0,locationKey:"",sequence:0,history:[]},economy,createdAt:now,version:1,constitution:WORLD_CONSTITUTION,
  canon:{facts:[
   {id:"F-origin",type:"premise",visibility:"hidden",text:premise(seed),canonical:true},
   {id:"F-magic",type:"rule",visibility:"hidden",text:`World Seed 規定魔法普及度為 ${seedContract.magic}/5；具體魔法制度由符合 Seed Contract 的世界 Canon 決定。`,canonical:true},
   {id:"F-politics",type:"rule",visibility:"hidden",text:`World Seed 規定政治複雜度為 ${seedContract.politics}/5；勢力與關係網必須符合此強度。`,canonical:true}
  ],relations:[]},
  state:{day:1,location:"未知真實開局位置",clock:{day:1,hour:8,minute:0,totalMinutes:0},simulation:{tension:10,lastEventMinute:0,lastTickMinute:0,npcCursor:0,factionCursor:0,flags:{}},flags:{}}
 };
 const report=validateWorld(world);if(!report.valid)throw new Error(report.errors.join("\n"));return {world,report}
}
function premise(seed){const s=createWorldSeedContract(seed),extra=s.prompt?` 玩家硬性要求：${s.prompt}`:"";if(s.worldviewMode==="ai")return `World Seed：完整世界觀交由 AI World Architect 隨機決定；世界主題必須由 AI 原創。${extra}`;return `World Seed：基礎風格「${s.genre}」，世界主題由 AI 決定，規模「${s.scale}」、危險度 ${s.danger}/5、魔法普及度 ${s.magic}/5、政治複雜度 ${s.politics}/5。${extra}`}
export function validateWorld(world){
 const errors=[];if(!world?.id)errors.push("WORLD_ID_MISSING");if(!world?.name)errors.push("WORLD_NAME_MISSING");
 if(!Array.isArray(world?.constitution)||world.constitution.length<6)errors.push("CONSTITUTION_INCOMPLETE");
 const ids=new Set();for(const f of world?.canon?.facts||[]){if(!f.id||ids.has(f.id))errors.push("FACT_ID_INVALID");ids.add(f.id);if(!f.text)errors.push(`FACT_TEXT_MISSING:${f.id}`)}
 return {valid:errors.length===0,errors,checkedAt:Date.now(),score:errors.length?Math.max(0,100-errors.length*15):100}
}
export function newGame(seed){
 const {world,report}=compileWorld(seed),requestedName=clean(seed?.playerName,40);
 const state={formatVersion:1,world:{...world,registry:{locations:[],npcs:[],factions:[],sideQuests:[]},generationDiagnostics:null,quality:null,evolution:{lastMinute:-9999,lastVersion:0,count:0,lastReason:""}},integrity:report,
  player:{name:requestedName||"無名者",nameSource:requestedName?"USER":"AI_PENDING",worldNameKnown:false,calendarKnown:false,hp:100,maxHp:100,gold:0,wallet:{},knowledgeScore:0,location:"未知地點",origin:modernEarthOriginProfile(),stats:{strength:2,agility:2,mind:2,presence:2,instinct:2},skills:{OBSERVE:1,SOCIAL:1,TRAVEL:0,RISKY:0,GENERAL:1},skillProgress:{OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:0}},
  inventory:[],knowledge:[],npcs:{},
  quests:{main:{id:"Q-main",title:"在陌生世界活下來",stage:0,status:"ACTIVE",objectives:["理解自己身處何地","尋找安全的落腳處","找到第一個可以交流的人"]}},
  discoveries:0,suggestions:[],
  events:[{id:uuid(),type:"WORLD_CREATED",visibility:"PLAYER_KNOWN",day:1,at:Date.now()}],
  narrative:"你在陌生的環境中醒來。作為一個來自現代地球的普通人，你第一反應是確認自己有沒有受傷、附近有沒有危險，以及眼前環境是否能用熟悉的常識解釋。你不知道這是哪裡，也不知道這個世界叫甚麼；任何異世界名稱、魔法、制度與文化都必須重新觀察和學習。你身上沒有任何預設物品，也沒有任何預設同伴。"};
 ensureCausalWorldCore(state);return state
}
export function d20(dc,bonus=0){const natural=1+Math.floor(Math.random()*20),total=natural+bonus;const grade=natural===20?"CRITICAL_SUCCESS":natural===1?"CRITICAL_FAILURE":total>=dc?"SUCCESS":"FAILURE";return {natural,bonus,total,dc,grade,success:natural!==1&&(natural===20||total>=dc)}}
export function discover(state,item,score=3){
 if(!item||state.knowledge.some(k=>k.id===item.id))return false;
 const canon=new Set((state.world?.canon?.facts||[]).map(f=>f.id)),history=new Set((state.world?.history||[]).map(h=>h.id));
 const verified=item.status==="VERIFIED"&&((item.factId&&canon.has(item.factId))||(item.historyId&&history.has(item.historyId)));
 state.knowledge.push({...item,score:verified?Math.max(1,Number(item.score)||Number(score)||1):0});
 if(verified)state.player.knowledgeScore=Math.min(100,(Number(state.player.knowledgeScore)||0)+Math.max(1,Number(item.score)||Number(score)||1));
 revealStoredLore(state);return true
}
export function applyWorldCandidate(state,candidate){
 if(!candidate||!candidate.summary||!Array.isArray(candidate.publicFacts)||!Array.isArray(candidate.hiddenFacts))throw new Error("INVALID_WORLD_CANDIDATE");if(!candidate.worldCalendar||typeof candidate.worldCalendar!=="object"||Array.isArray(candidate.worldCalendar))throw new Error("WORLD_CALENDAR_REQUIRED");if(!candidate.worldBible?.weatherSystem)throw new Error("WORLD_WEATHER_REQUIRED");candidate.worldBible.weatherSystem=normalizeWeatherSystem(candidate.worldBible.weatherSystem,state.world.seedContract||state.world.seed);
 const compliance=validateSeedCompliance(state.world.seed,candidate);if(!compliance.valid)throw new Error("SEED_COMPLIANCE_FAILED:"+compliance.errors.join(","));const pacing=createTimelinePacing(compliance.expected.targetPlayHours);const timelineReport=validateWorldTimeline(candidate.worldTimeline,pacing);if(!timelineReport.valid)throw new Error("WORLD_TIMELINE_FAILED:"+timelineReport.errors.join(","));const historyReport=validateWorldHistory(candidate.worldHistory);if(!historyReport.valid)throw new Error("WORLD_HISTORY_FAILED:"+historyReport.errors.join(","));
 state.world.seedContract=compliance.expected;state.world.seedCompliance=structuredClone(candidate.seedCompliance);state.world.theme=clean(candidate.worldTheme,160)||compliance.expected.theme;state.world.timelinePacing=timelineReport.pacing;state.world.timeline=timelineReport.timeline;state.world.history=historyReport.history;state.world.calendar=normalizeCalendar(candidate.worldCalendar);
 const worldName=clean(candidate.worldName,80);if(worldName)state.world.name=worldName;
 const aiName=clean(candidate.playerName,40);if(state.player?.nameSource==="AI_PENDING"&&aiName){state.player.name=aiName;state.player.nameSource="AI"}
 const bible=candidate.worldBible;
 if(bible!=null){
  if(typeof bible!=="object"||Array.isArray(bible))throw new Error("INVALID_WORLD_BIBLE");
  const economy=normalizeEconomy(null);
  state.world.economy=economy;state.player.gold=0;
  const civilization=normalizeCivilizationProfile(bible.civilization);state.world.bible={era:clean(bible.era,120),centralConflict:clean(bible.centralConflict,500),magicCost:clean(bible.magicCost,400),startingRegion:clean(bible.startingRegion,120),startingSettlement:clean(bible.startingSettlement,120),startingLocation:clean(bible.startingLocation,120),ancientTruth:clean(bible.ancientTruth,500),currentCrisis:clean(bible.currentCrisis,500),tone:clean(bible.tone,200),civilization,communication:normalizeCommunicationSystem(bible.communication,state.world.seedContract||state.world.seed,civilization),weatherSystem:normalizeWeatherSystem(bible.weatherSystem,state.world.seedContract||state.world.seed)}
 }
 const existing=new Set(state.world.canon.facts.map(f=>f.text));let n=0;
 for(const [visibility,list] of [["public",candidate.publicFacts],["hidden",candidate.hiddenFacts]])for(const text of list.slice(0,8)){if(typeof text!=="string"||text.length<3||text.length>500||existing.has(text))continue;state.world.canon.facts.push({id:`AI-F-${Date.now()}-${n++}`,type:"ai_candidate",visibility,text,canonical:true});existing.add(text)}
 state.world.summary=String(candidate.summary).slice(0,1000);
 if(candidate.generationDiagnostics&&typeof candidate.generationDiagnostics==="object")state.world.generationDiagnostics=structuredClone(candidate.generationDiagnostics);
 if(candidate.worldQuality&&typeof candidate.worldQuality==="object")state.world.quality=structuredClone(candidate.worldQuality);
 state.world.evolution??={lastMinute:-9999,lastVersion:0,count:0,lastReason:""};
 if(candidate.worldBible?.startingRegion)state.world.state.region=clean(candidate.worldBible.startingRegion,120);
 const trueStart=sanitizeLocationName(candidate.generation?.locations?.[0]?.name)||sanitizeLocationName(candidate.worldBible?.startingLocation);if(trueStart)state.world.state.location=trueStart;state.world.weather.legacyNeutral=false;initializeWeather(state,{force:true})
 const opening=sanitizePlayerText(candidate.openingHook,1000,"你在陌生的環境中醒來，只能先從眼前可見的事物判斷身處何方。");
 const suggestions=sanitizeSuggestions(candidate.suggestions,[]);
 const openingExperience=applyOpeningExperience(state,opening,suggestions);state.narrative=openingExperience.narrative;if(openingExperience.suggestions.length)state.suggestions=openingExperience.suggestions;
 state.world.version++;state.world.graph??={nodes:[],edges:[],expansions:[]};const report=validateWorld(state.world);if(!report.valid)throw new Error(report.errors.join(","));state.integrity=report;registerCanonizedWorld(state);return report
}