const NAMES=["艾斯特拉","諾爾海姆","瑟雷恩","阿爾維亞","伊瑟蘭","露米納"];
const uuid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
export const WORLD_CONSTITUTION=[
 {id:"C-001",text:"已 Canonize 的事實不可被敘事 AI 改寫"},
 {id:"C-002",text:"真正死亡不可逆轉，除非世界種子明確定義例外"},
 {id:"C-003",text:"NPC 只能使用其 knowledgeScope 可存取的知識"},
 {id:"C-004",text:"骰子與規則結果由 Game Engine 決定，AI 只能敘述"},
 {id:"C-005",text:"新生成內容必須通過 Canon、時間線與依賴驗證"}
];
export function compileWorld(seed){
 const now=Date.now(), name=NAMES[Math.abs(hash(JSON.stringify(seed)))%NAMES.length];
 const world={id:uuid(),name,seed,createdAt:now,version:1,constitution:WORLD_CONSTITUTION,
  canon:{facts:[
   {id:"F-origin",type:"premise",visibility:"hidden",text:premise(seed),canonical:true},
   {id:"F-magic",type:"rule",visibility:"discoverable",text:`魔法普及度為 ${seed.magic}/5；施法需要代價，不能無條件改寫既定歷史。`,canonical:true},
   {id:"F-north",type:"geography",visibility:"public",text:"北境由大片霧林、舊石道與失落遺跡構成。",canonical:true}
  ],relations:[]},
  state:{day:1,location:"霧森邊境 · 無名小徑",flags:{}}
 };
 const report=validateWorld(world); if(!report.valid)throw new Error(report.errors.join("\n")); return {world,report};
}
function premise(seed){const extra=seed.prompt? ` 玩家主題：${seed.prompt}`:"";return `這是一個「${seed.genre}」世界，核心主題為「${seed.theme}」，規模${seed.scale}，危險度 ${seed.danger}/5。${extra}`}
function hash(s){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return h}
export function validateWorld(world){
 const errors=[]; if(!world?.id)errors.push("WORLD_ID_MISSING");if(!world?.name)errors.push("WORLD_NAME_MISSING");
 if(!Array.isArray(world?.constitution)||world.constitution.length<5)errors.push("CONSTITUTION_INCOMPLETE");
 const ids=new Set();for(const f of world?.canon?.facts||[]){if(!f.id||ids.has(f.id))errors.push("FACT_ID_INVALID");ids.add(f.id);if(!f.text)errors.push(`FACT_TEXT_MISSING:${f.id}`)}
 return {valid:errors.length===0,errors,checkedAt:Date.now(),score:errors.length?Math.max(0,100-errors.length*15):100};
}
export function newGame(seed){
 const {world,report}=compileWorld(seed);
 return {formatVersion:1,world,integrity:report,player:{hp:100,maxHp:100,gold:12,knowledgeScore:3,location:world.state.location},
  inventory:[{id:"rusty-sword",name:"生鏽短劍",identified:false},{id:"strange-coin",name:"陌生銅幣",identified:false}],
  knowledge:[{id:"K-coin",title:"陌生銅幣",status:"PARTIAL",text:"銅幣上的文字尚未能解讀。",sources:["strange-coin"]},{id:"K-lia",title:"莉亞",status:"PARTIAL",text:"自稱旅行者，但似乎刻意避開談論自己的出身。",sources:["NPC-lia"]}],
  npcs:{lia:{id:"NPC-lia",name:"莉亞",alive:true,trust:18,goal:"尋找失蹤的姐姐",knowledgeScope:["F-north"],memories:[]}},
  quests:{main:{id:"Q-main",title:"找到前往文明聚落的方法",stage:0,status:"ACTIVE",objectives:["理解自己身處何地","找到安全的聚落","查明陌生銅幣的來源"]}},
  discoveries:0,
  events:[{id:uuid(),type:"WORLD_CREATED",day:1,at:Date.now()}],narrative:"潮濕的泥土沾在掌心。遠處有鐘聲，卻看不見任何城鎮。你身上只有一枚看不懂文字的銅幣，以及一把生鏽短劍。"};
}
export function d20(dc,bonus=0){const natural=1+Math.floor(Math.random()*20),total=natural+bonus;const grade=natural===20?"CRITICAL_SUCCESS":natural===1?"CRITICAL_FAILURE":total>=dc?"SUCCESS":"FAILURE";return {natural,bonus,total,dc,grade,success:natural!==1&&(natural===20||total>=dc)}}
export function discover(state,item,score=3){if(!state.knowledge.some(k=>k.id===item.id)){state.knowledge.push(item);state.player.knowledgeScore=Math.min(100,state.player.knowledgeScore+score)}}
export function applyWorldCandidate(state,candidate){
 if(!candidate||!candidate.summary||!Array.isArray(candidate.publicFacts)||!Array.isArray(candidate.hiddenFacts))throw new Error("INVALID_WORLD_CANDIDATE");
 const existing=new Set(state.world.canon.facts.map(f=>f.text));let n=0;
 for(const [visibility,list] of [["public",candidate.publicFacts],["hidden",candidate.hiddenFacts]]){
  for(const text of list.slice(0,8)){if(typeof text!=="string"||text.length<3||text.length>500||existing.has(text))continue;state.world.canon.facts.push({id:`AI-F-${Date.now()}-${n++}`,type:"ai_candidate",visibility,text,canonical:true});existing.add(text)}
 }
 state.world.summary=String(candidate.summary).slice(0,1000);
 if(candidate.openingHook)state.narrative=String(candidate.openingHook).slice(0,1000);
 state.world.version++;const report=validateWorld(state.world);if(!report.valid)throw new Error(report.errors.join(","));state.integrity=report;return report;
}