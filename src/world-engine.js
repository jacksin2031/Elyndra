import {revealStoredLore} from "./lore-engine.js";
import {createWorldSeedContract,validateSeedCompliance,localSeedCompliance} from "./seed-contract.js?v=230";
const FALLBACK_ACTIONS=["環顧四周，確認眼前能直接觀察到的事物","檢查自己的身體、衣物與隨身狀態","保持安靜，仔細聆聽附近的聲音"];
const uuid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clean=(v,max=120)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const WORLD_CONSTITUTION=[
 {id:"C-001",text:"已 Canonize 的事實不可被敘事 AI 改寫"},
 {id:"C-002",text:"真正死亡不可逆轉，除非世界種子明確定義例外"},
 {id:"C-003",text:"NPC 只能使用其 knowledgeScope、親身記憶與明確取得的資訊"},
 {id:"C-004",text:"骰子與規則結果由 Game Engine 決定，AI 只能提出符合結果的候選變化"},
 {id:"C-005",text:"新生成內容必須通過 Canon、時間線與依賴驗證"},
 {id:"C-006",text:"玩家開局對世界知識為零；世界真相、地名與常識不等於玩家已知資訊"},
 {id:"C-007",text:"Engine 不得硬編碼任何特定世界的地名、人物、勢力、貨幣或敵人"}
];
function hash(s){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return h}
function localWorldName(seed){const a=["艾","賽","諾","維","伊","洛","瑟","亞"],b=["蘭","爾","恩","斯","姆","亞","里","德"],c=["達","拉","恩","亞","爾","斯"];const h=Math.abs(hash(JSON.stringify(seed)));return a[h%a.length]+b[Math.floor(h/a.length)%b.length]+c[Math.floor(h/(a.length*b.length))%c.length]}
function normalizeEconomy(input){
 if(!input||typeof input!=="object"||Array.isArray(input))return {currencyExists:false,currencyName:"",currencySymbol:"",startingAmount:0,questReward:0,combatReward:0};
 const currencyExists=input.currencyExists===true;
 return {currencyExists,currencyName:currencyExists?clean(input.currencyName,40):"",currencySymbol:currencyExists?clean(input.currencySymbol,12):"",startingAmount:currencyExists?clamp(Math.round(Number(input.startingAmount)||0),0,20):0,questReward:currencyExists?clamp(Math.round(Number(input.questReward)||0),0,20):0,combatReward:currencyExists?clamp(Math.round(Number(input.combatReward)||0),0,20):0}
}
export function compileWorld(seed){
 const now=Date.now(),seedContract=createWorldSeedContract(seed),economy=normalizeEconomy(null),world={id:uuid(),name:localWorldName(seed),seed,seedContract,seedCompliance:localSeedCompliance(seed),economy,createdAt:now,version:1,constitution:WORLD_CONSTITUTION,
  canon:{facts:[
   {id:"F-origin",type:"premise",visibility:"hidden",text:premise(seed),canonical:true},
   {id:"F-magic",type:"rule",visibility:"hidden",text:`World Seed 規定魔法普及度為 ${seedContract.magic}/5；具體魔法制度由符合 Seed Contract 的世界 Canon 決定。`,canonical:true},
   {id:"F-politics",type:"rule",visibility:"hidden",text:`World Seed 規定政治複雜度為 ${seedContract.politics}/5；勢力與關係網必須符合此強度。`,canonical:true}
  ],relations:[]},
  state:{day:1,location:"未知真實開局位置",clock:{day:1,hour:8,minute:0,totalMinutes:0},simulation:{tension:10,lastEventMinute:0,lastTickMinute:0,npcCursor:0,factionCursor:0,flags:{}},flags:{}}
 };
 const report=validateWorld(world);if(!report.valid)throw new Error(report.errors.join("\n"));return {world,report}
}
function premise(seed){const s=createWorldSeedContract(seed),extra=s.prompt?` 玩家硬性要求：${s.prompt}`:"";return `World Seed：風格「${s.genre}」、核心主題「${s.theme}」、規模「${s.scale}」、危險度 ${s.danger}/5、魔法普及度 ${s.magic}/5、政治複雜度 ${s.politics}/5。${extra}`}
export function validateWorld(world){
 const errors=[];if(!world?.id)errors.push("WORLD_ID_MISSING");if(!world?.name)errors.push("WORLD_NAME_MISSING");
 if(!Array.isArray(world?.constitution)||world.constitution.length<6)errors.push("CONSTITUTION_INCOMPLETE");
 const ids=new Set();for(const f of world?.canon?.facts||[]){if(!f.id||ids.has(f.id))errors.push("FACT_ID_INVALID");ids.add(f.id);if(!f.text)errors.push(`FACT_TEXT_MISSING:${f.id}`)}
 return {valid:errors.length===0,errors,checkedAt:Date.now(),score:errors.length?Math.max(0,100-errors.length*15):100}
}
export function newGame(seed){
 const {world,report}=compileWorld(seed),requestedName=clean(seed?.playerName,40);
 return {formatVersion:1,world:{...world,registry:{locations:[],npcs:[],factions:[],sideQuests:[]}},integrity:report,
  player:{name:requestedName||"無名者",nameSource:requestedName?"USER":"AI_PENDING",worldNameKnown:false,hp:100,maxHp:100,gold:0,knowledgeScore:0,location:"未知地點"},
  inventory:[],knowledge:[],npcs:{},
  quests:{main:{id:"Q-main",title:"在陌生世界活下來",stage:0,status:"ACTIVE",objectives:["理解自己身處何地","尋找安全的落腳處","找到第一個可以交流的人"]}},
  discoveries:0,suggestions:[...FALLBACK_ACTIONS],
  events:[{id:uuid(),type:"WORLD_CREATED",visibility:"PLAYER_KNOWN",day:1,at:Date.now()}],
  narrative:"你在陌生的環境中醒來。你不知道這是哪裡，也不知道這個世界叫甚麼；現在能依靠的只有眼前能直接感受到的事物。你身上沒有任何預設物品，也沒有任何預設同伴。"}
}
export function d20(dc,bonus=0){const natural=1+Math.floor(Math.random()*20),total=natural+bonus;const grade=natural===20?"CRITICAL_SUCCESS":natural===1?"CRITICAL_FAILURE":total>=dc?"SUCCESS":"FAILURE";return {natural,bonus,total,dc,grade,success:natural!==1&&(natural===20||total>=dc)}}
export function discover(state,item,score=3){if(!state.knowledge.some(k=>k.id===item.id)){state.knowledge.push(item);state.player.knowledgeScore=Math.min(100,state.player.knowledgeScore+score);revealStoredLore(state)}}
export function applyWorldCandidate(state,candidate){
 if(!candidate||!candidate.summary||!Array.isArray(candidate.publicFacts)||!Array.isArray(candidate.hiddenFacts))throw new Error("INVALID_WORLD_CANDIDATE");
 const compliance=validateSeedCompliance(state.world.seed,candidate);if(!compliance.valid)throw new Error("SEED_COMPLIANCE_FAILED:"+compliance.errors.join(","));
 state.world.seedContract=compliance.expected;state.world.seedCompliance=structuredClone(candidate.seedCompliance);
 const worldName=clean(candidate.worldName,80);if(worldName)state.world.name=worldName;
 const aiName=clean(candidate.playerName,40);if(state.player?.nameSource==="AI_PENDING"&&aiName){state.player.name=aiName;state.player.nameSource="AI"}
 const bible=candidate.worldBible;
 if(bible!=null){
  if(typeof bible!=="object"||Array.isArray(bible))throw new Error("INVALID_WORLD_BIBLE");
  const economy=normalizeEconomy(bible.economy);
  state.world.economy=economy;state.player.gold=economy.startingAmount;
  state.world.bible={era:clean(bible.era,120),centralConflict:clean(bible.centralConflict,500),magicCost:clean(bible.magicCost,400),startingRegion:clean(bible.startingRegion,120),startingSettlement:clean(bible.startingSettlement,120),startingLocation:clean(bible.startingLocation,120),ancientTruth:clean(bible.ancientTruth,500),currentCrisis:clean(bible.currentCrisis,500),tone:clean(bible.tone,200),economy}
 }
 const existing=new Set(state.world.canon.facts.map(f=>f.text));let n=0;
 for(const [visibility,list] of [["public",candidate.publicFacts],["hidden",candidate.hiddenFacts]])for(const text of list.slice(0,8)){if(typeof text!=="string"||text.length<3||text.length>500||existing.has(text))continue;state.world.canon.facts.push({id:`AI-F-${Date.now()}-${n++}`,type:"ai_candidate",visibility,text,canonical:true});existing.add(text)}
 state.world.summary=String(candidate.summary).slice(0,1000);
 if(candidate.worldBible?.startingRegion)state.world.state.region=clean(candidate.worldBible.startingRegion,120);
 const trueStart=clean(candidate.worldBible?.startingLocation,120)||clean(candidate.generation?.locations?.[0]?.name,120);if(trueStart)state.world.state.location=trueStart;
 if(candidate.openingHook)state.narrative=String(candidate.openingHook).slice(0,1000);
 const suggestions=(candidate.suggestions||[]).map(x=>clean(x,120)).filter(Boolean).slice(0,4);if(suggestions.length)state.suggestions=suggestions;
 state.world.version++;state.world.graph??={nodes:[],edges:[],expansions:[]};const report=validateWorld(state.world);if(!report.valid)throw new Error(report.errors.join(","));state.integrity=report;return report
}