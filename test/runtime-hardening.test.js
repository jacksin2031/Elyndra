import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {advanceTime} from "../src/world-clock.js";
import {tickWorld} from "../src/world-simulation.js";
import {tickNpcs,inviteCompanion} from "../src/npc-engine.js";
import {tickFactions} from "../src/faction-engine.js";
import {bootstrapKnowledgeGraph,graphSnapshot,recordCausalEvent} from "../src/knowledge-graph.js";
import {tokenBudgetSnapshot} from "../src/context-manager.js";
import {migrateSave} from "../src/storage.js";
import {ensureCrisis,addCrisisPressure} from "../src/crisis-engine.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {applyTurnCandidate} from "../src/adventure-engine.js";

const seed={genre:"王道奇幻",theme:"失落文明",scale:"中型",danger:3,magic:3,politics:3,prompt:"世界設定必須保持神秘探索感"};

test("NPC simulation rotates beyond the first four entities",()=>{
 const s=newGame(seed);s.world.state.clock.totalMinutes=500;
 s.world.registry.npcs=Array.from({length:6},(_,i)=>({id:`NPC-${i}`,name:`NPC${i}`,role:"居民",description:"測試",known:true,alive:true,trust:0,goal:"生活",knowledgeScope:[],memories:[],lastActionMinute:0}));
 const a=tickNpcs(s),b=tickNpcs(s),ids=new Set([...a,...b].map(e=>e.npcId));
 assert.ok(ids.has("NPC-4"));assert.ok(ids.has("NPC-5"));
});

test("faction simulation rotates beyond the first four entities",()=>{
 const s=newGame(seed);s.world.state.clock.totalMinutes=800;
 s.world.registry.factions=Array.from({length:6},(_,i)=>({id:`FAC-${i}`,name:`勢力${i}`,goal:"擴張",description:"測試",known:false,resources:50,influence:25,playerReputation:0,relations:{},lastActionMinute:0}));
 const a=tickFactions(s),b=tickFactions(s),ids=new Set([...a,...b].map(e=>e.factionId));
 assert.ok(ids.has("FAC-4"));assert.ok(ids.has("FAC-5"));
});

test("internal causal events never leak through graph snapshot",()=>{
 const s=newGame(seed);s.world.bible={centralConflict:"王權衝突",magicCost:"記憶代價",ancientTruth:"被隱藏的重啟",currentCrisis:"核心失控"};
 bootstrapKnowledgeGraph(s);
 recordCausalEvent(s,{id:"internal",type:"FACTION_ACTION",visibility:"INTERNAL",summary:"秘密勢力正在政變",day:1});
 recordCausalEvent(s,{id:"visible",type:"WORLD_EVENT",visibility:"OBSERVABLE",summary:"遠方天空出現異光",day:1});
 const snap=graphSnapshot(s);
 assert.equal(snap.nodes.some(n=>n.label.includes("秘密勢力")),false);
 assert.equal(snap.nodes.some(n=>n.label.includes("異光")),true);
 const visibleIds=new Set(snap.nodes.map(n=>n.id));
 assert.equal(snap.edges.some(e=>!visibleIds.has(e.from)||!visibleIds.has(e.to)),false);
});

test("knowledge graph bootstrap still creates fundamentals after event nodes already exist",()=>{
 const s=newGame(seed);s.world.bible={centralConflict:"王權衝突",magicCost:"記憶代價",ancientTruth:"世界重啟",currentCrisis:"核心失控"};
 s.world.graph={nodes:[{id:"EVN-old",type:"event",label:"舊事件",visibility:"hidden"}],edges:[],expansions:[]};
 bootstrapKnowledgeGraph(s);
 for(const type of ["conflict","secret","crisis","rule"])assert.ok(s.world.graph.nodes.some(n=>n.type===type));
});

test("world tension advances by elapsed time instead of tick call count",()=>{
 const s=newGame(seed);const start=s.world.state.simulation.tension;
 for(let i=0;i<10;i++){advanceTime(s,2);tickWorld(s)}
 assert.equal(s.world.state.simulation.tension,start);
 for(let i=0;i<5;i++){advanceTime(s,2);tickWorld(s)}
 assert.equal(s.world.state.simulation.tension,start+1);
});

test("degraded AI context keeps the immutable world seed contract",()=>{
 const s=newGame(seed),snap=tokenBudgetSnapshot({world:{name:"UNKNOWN",summary:"X".repeat(50000),location:"未知地點",day:1,seedContract:s.world.seedContract,economy:s.world.economy},player:{hp:100,gold:0,knowledgeScore:0},knownFacts:[],knowledge:[],recentEvents:[],registry:{locations:[],npcs:[],factions:[],sideQuests:[]}},1800);
 assert.equal(snap.world.seedContract.genre,seed.genre);
 assert.equal(snap.world.seedContract.magic,seed.magic);
 assert.equal(snap.world.seedContract.prompt,seed.prompt);
});

test("save migration v8 normalizes simulation cursors, visibility and impact runtime",()=>{
 const s=newGame(seed);s.formatVersion=3;delete s.world.state.simulation.lastTickMinute;delete s.world.state.simulation.npcCursor;delete s.world.state.simulation.factionCursor;
 s.events.push({id:"secret",type:"FACTION_ACTION",day:1,summary:"秘密"});
 const m=migrateSave(s);
 assert.equal(m.formatVersion,11);assert.equal(m.events.at(-1).visibility,"INTERNAL");assert.ok(m.world.impact);assert.ok(m.world.recognition);
 assert.ok(Number.isFinite(m.world.state.simulation.lastTickMinute));assert.equal(m.world.state.simulation.npcCursor,0);assert.equal(m.world.state.simulation.factionCursor,0);assert.deepEqual(m.player.wallet,{});assert.equal(m.player.calendarKnown,false);
});

test("crisis pressure alone cannot unlock ENDGAME before world knowledge",()=>{
 const s=newGame(seed);addCrisisPressure(s,100,"pressure only");assert.equal(ensureCrisis(s).stage,"CRISIS");
 s.world.canon.facts.push({id:"FACT-K1",type:"public",visibility:"public",text:"第一項足以理解危機的世界線索。",canonical:true},{id:"FACT-K2",type:"public",visibility:"public",text:"第二項足以理解危機的世界線索。",canonical:true},{id:"FACT-K3",type:"public",visibility:"public",text:"第三項足以理解危機的世界線索。",canonical:true});s.player.knowledgeScore=10;s.knowledge.push(
  {id:"K1",title:"線索一",text:"第一項足以理解危機的世界線索。",factId:"FACT-K1",status:"VERIFIED",score:4},
  {id:"K2",title:"線索二",text:"第二項足以理解危機的世界線索。",factId:"FACT-K2",status:"VERIFIED",score:3},
  {id:"K3",title:"線索三",text:"第三項足以理解危機的世界線索。",factId:"FACT-K3",status:"VERIFIED",score:3}
 );
 addCrisisPressure(s,0,"knowledge acquired");assert.equal(ensureCrisis(s).stage,"ENDGAME");assert.equal(s.quests.main.status,"CLIMAX");
});

test("unverified AI discoveries cannot progress quests while owned evidence can",()=>{
 const s=newGame(seed);
 canonizeGeneration(s,{sideQuests:[{title:"失蹤商隊",objective:"找出商隊去向",known:true,evidenceKeywords:["商隊徽章","破損車輪"],target:2}]});
 const q=s.world.registry.sideQuests[0];
 applyTurnCandidate(s,{narrative:"你以為找到一枚徽章。",discoveries:[{title:"商隊徽章",text:"這只是 AI 提出的未驗證觀察。"}],suggestions:["繼續搜索"]},{roll:{success:true,profile:{kind:"OBSERVE"}},action:"觀察"});
 assert.equal(q.progress,0);
 applyTurnCandidate(s,{narrative:"你拿到一件名稱可疑但沒有 Canon 來源的物品。",items:[{name:"偽造商隊徽章",description:"AI 聲稱它屬於商隊，但沒有可驗證來源。"}],suggestions:["繼續搜索"]},{roll:{success:true,profile:{kind:"OBSERVE"}},action:"搜索"});assert.equal(q.progress,0);
 s.world.canon.facts.push({id:"FACT-BADGE",type:"clue",visibility:"public",text:"這件金屬標記可驗證屬於失蹤商隊。",canonical:true},{id:"FACT-WHEEL",type:"clue",visibility:"public",text:"這件木製殘骸可驗證來自同一支失蹤商隊。",canonical:true});
 applyTurnCandidate(s,{narrative:"你取得實體徽章。",discoveries:[{title:"第一件商隊物證",text:"確認來源。",factId:"FACT-BADGE",evidenceType:"EXAMINED"}],items:[{name:"商隊徽章",description:"屬於失蹤商隊。",evidenceFactId:"FACT-BADGE"}],suggestions:["繼續搜索"]},{roll:{success:true,profile:{kind:"OBSERVE"}},action:"搜索"});
 assert.equal(q.progress,1);
 applyTurnCandidate(s,{narrative:"你取得第二項實體證據。",discoveries:[{title:"第二件商隊物證",text:"確認來源。",factId:"FACT-WHEEL",evidenceType:"EXAMINED"}],items:[{name:"破損車輪",description:"屬於同一支商隊。",evidenceFactId:"FACT-WHEEL"}],suggestions:["追蹤車痕"]},{roll:{success:true,profile:{kind:"OBSERVE"}},action:"搜索"});
 assert.equal(q.status,"COMPLETED");assert.equal(q.progress,2);
});
test("scheduled world timeline exposes only observable effect when due",()=>{
 const s=newGame(seed);s.world.timeline=[{id:"TL-1",title:"隱藏變局",category:"CRISIS",earliestDay:2,latestDay:2,triggerDay:2,directorTruth:"真正原因是地下封印被某勢力故意破壞。",observableEffect:"遠方地面傳來持續震動，附近鳥群突然離開。",pressure:4,status:"SCHEDULED",triggeredDay:null}];s.world.state.day=2;s.world.state.clock.day=2;s.world.state.clock.totalMinutes=1440;s.world.state.simulation.lastTickMinute=1440;
 const ev=tickWorld(s);assert.equal(ev.subtype,"TIMELINE_EVENT");assert.match(ev.summary,/鳥群/);assert.equal(ev.summary.includes("地下封印"),false);assert.equal(s.world.timeline[0].status,"TRIGGERED");
});

test("side quest reward uses current location currency instead of universal gold",()=>{
 const s=newGame(seed);canonizeGeneration(s,{locations:[{name:"霧市",type:"聚落",description:"被霧包圍的市場",known:true,culture:{identity:"以交換承諾與聲譽維持秩序"},trade:{mode:"currency",currencies:[{id:"CUR-MIST",name:"霧印",issuer:"霧市行會"}],questReward:3,combatReward:1}}],sideQuests:[{title:"找回帳冊",objective:"找回失落帳冊",known:true,evidenceKeywords:["舊帳冊"],target:1}]});s.player.location="霧市";s.world.state.location="霧市";s.world.canon.facts.push({id:"FACT-LEDGER",type:"clue",visibility:"public",text:"這份紙本記錄可驗證是行會遺失物。",canonical:true});applyTurnCandidate(s,{narrative:"你找到了帳冊。",discoveries:[{title:"行會遺失物證",text:"確認來源。",factId:"FACT-LEDGER",evidenceType:"EXAMINED"}],items:[{name:"舊帳冊",description:"這正是行會遺失的帳冊。",evidenceFactId:"FACT-LEDGER"}],suggestions:["交還帳冊"]},{roll:{success:true,profile:{kind:"OBSERVE"}},action:"檢查帳冊"});assert.equal(s.world.registry.sideQuests[0].status,"COMPLETED");assert.equal(s.player.wallet["CUR-MIST"],3);assert.equal(s.player.gold,0);
});

test("any known NPC can join and later leave under local relationship rules",()=>{
 const s=newGame(seed);canonizeGeneration(s,{npcs:[{name:"洛恩",role:"流浪記錄者",description:"四處記錄地方傳說",known:true,companionProfile:{joinThreshold:20,leaveThreshold:8,motives:["想記錄旅途"],boundaries:["不接受背叛"]}}]});const npc=s.world.registry.npcs[0];npc.trust=25;assert.equal(inviteCompanion(s,npc.id).accepted,true);assert.equal(npc.companion.status,"ACTIVE");npc.trust=5;npc.lastActionMinute=0;s.world.state.clock.totalMinutes=300;tickNpcs(s);assert.equal(npc.companion.status,"LEFT");assert.ok(s.events.some(e=>e.type==="COMPANION_LEFT"));
});