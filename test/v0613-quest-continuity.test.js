import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {ensureMainQuest,questContinuitySnapshot} from "../src/quest-engine.js";
import {normalizeRuntimeSideQuest} from "../src/runtime-generation-normalizer.js";
import {pendingQuestContinuity} from "../src/quest-contracts.js";
import {worldEnrichmentPressure} from "../src/world-enrichment.js";
import {planLazyGeneration,validateLazyGenerationCandidate} from "../src/lazy-generation.js";
import {fallbackWorldDesignLogic,worldArchitectRequiredSchema} from "../src/world-architect-skill.js";
import {narrativeDirectorSnapshot} from "../src/narrative-director.js";

const seed={genre:"王道奇幻",theme:"失落文明",scale:"中型",danger:3,magic:3,politics:3,prompt:""};

test("v0.61.3 legacy text quest conditions become evidence hints instead of fake executable conditions",()=>{
 const q=normalizeRuntimeSideQuest({title:"封蠟",objective:"找出封蠟來源",conditions:["取得紅色封蠟"],evidenceKeywords:["碎布"],target:"invalid"});
 assert.deepEqual(q.conditions,[]);assert.ok(q.evidenceKeywords.includes("取得紅色封蠟"));assert.ok(q.evidenceKeywords.includes("碎布"));assert.equal(q.target,1)
});

test("v0.61.3 quest canonization preserves entity links and chains a consequence to its predecessor",()=>{
 const s=newGame(seed);
 canonizeGeneration(s,{locations:[{name:"霧港",type:"港口",description:"潮霧籠罩的地方港口",known:true}],factions:[{name:"潮印會",goal:"維持港口封印與航路",description:"掌握港務與封印的地方組織"}],npcs:[{name:"璃安",role:"信使",description:"負責港內封印文書的信使",goal:"找回失落文書",locationName:"霧港",factionName:"潮印會"}],sideQuests:[{title:"遺失的封蠟",objective:"找到文書失落前留下的封蠟痕跡",locationName:"霧港",npcName:"璃安",factionName:"潮印會",known:true,continuityMode:"NEW_THREAD",predecessorQuestIds:[],motivation:"港務文書失蹤，信使必須在交班前確認去向。",stakes:"封印紀錄若缺失，下一班船無法核對安全航路。",completionConsequences:["潮印會能確認文書被誰經手。"],failureConsequences:["港口會暫停一條未能核對的航路。"],evidenceKeywords:["封蠟"],conditions:[],target:1}]});
 const r=s.world.registry,q1=r.sideQuests[0],npc=r.npcs.find(x=>x.name==="璃安"),loc=r.locations.find(x=>x.name==="霧港"),fac=r.factions.find(x=>x.name==="潮印會");
 assert.equal(q1.locationId,loc.id);assert.equal(q1.issuerNpcId,npc.id);assert.equal(q1.factionId,fac.id);assert.equal(q1.arcId,q1.id);assert.equal(q1.chainDepth,0);
 q1.status="COMPLETED";q1.outcome={status:"COMPLETED",day:1,summary:"已找回封蠟線索"};
 canonizeGeneration(s,{sideQuests:[{title:"被改寫的航路表",objective:"確認封蠟線索指出的航路表為何被改寫",known:true,continuityMode:"CONSEQUENCE",predecessorQuestIds:[q1.id],motivation:"第一個任務證明文書曾被重新封裝。",stakes:"若錯誤航路表繼續流通，船隊會依錯誤資料出港。",completionConsequences:["港務會鎖定改寫流程的具體環節。"],failureConsequences:["錯誤航路資料會繼續擴散。"],evidenceKeywords:["航路表"],conditions:[],target:1}]});
 const q2=r.sideQuests.find(x=>x.title==="被改寫的航路表");assert.ok(q2);assert.deepEqual(q2.predecessorQuestIds,[q1.id]);assert.equal(q2.arcId,q1.id);assert.equal(q2.chainDepth,1)
});

test("v0.61.3 pending continuity disappears once a successor claims the terminal quest",()=>{
 const old={id:"Q-old",status:"COMPLETED",continuityMode:"NEW_THREAD",completionConsequences:["守衛會追查失竊物資"],failureConsequences:[]};
 assert.equal(pendingQuestContinuity([old],3)[0]?.id,"Q-old");
 const next={id:"Q-next",status:"ACTIVE",continuityMode:"CONSEQUENCE",predecessorQuestIds:["Q-old"],completionConsequences:[],failureConsequences:[]};
 assert.equal(pendingQuestContinuity([old,next],3).length,0)
});

test("v0.61.3 unresolved terminal consequences create QUEST enrichment pressure",()=>{
 const s={world:{registry:{locations:Array.from({length:4},(_,i)=>({id:`L${i}`})),npcs:Array.from({length:3},(_,i)=>({id:`N${i}`})),factions:[{id:"F1"}],sideQuests:[{id:"Q-active",status:"ACTIVE",continuityMode:"NEW_THREAD"},{id:"Q-old",status:"COMPLETED",continuityMode:"NEW_THREAD",completionConsequences:["商會改變下一批貨物的護送方式"],failureConsequences:[]}]},historyDepth:{records:[]},lazyGeneration:{plans:[]}},quests:{main:{stage:2}},discoveries:0,events:Array.from({length:12},(_,i)=>({id:`E${i}`,type:"PLAYER_ACTION"}))};
 const p=worldEnrichmentPressure(s,{now:1000000});assert.equal(p.required,true);assert.equal(p.domain,"QUEST");assert.ok(p.reasons.includes("QUEST_CONTINUITY_PENDING:Q-old"))
});

test("v0.61.3 proactive QUEST validation refuses to ignore an unresolved predecessor",()=>{
 const s=newGame(seed);s.world.registry.sideQuests=[{id:"Q-old",title:"舊任務",objective:"處理舊事",known:true,status:"COMPLETED",continuityMode:"NEW_THREAD",predecessorQuestIds:[],completionConsequences:["地方守衛因此改變巡邏。"],failureConsequences:[],conditions:[],evidenceKeywords:[],historyRefs:[]}];
 const plan=planLazyGeneration(s,{reason:"PROACTIVE_ENRICHMENT",domain:"QUEST"});
 const unrelated={locations:[],npcs:[],factions:[],definitions:[],sideQuests:[{title:"另一件事",objective:"調查市場傳聞",known:false,continuityMode:"NEW_THREAD",predecessorQuestIds:[],motivation:"市場出現新傳聞",stakes:"價格可能波動",completionConsequences:["傳聞被澄清"],failureConsequences:["傳聞擴散"],historyRefs:[],evidenceKeywords:["傳聞"],conditions:[],target:1}]};
 const rejected=validateLazyGenerationCandidate(s,unrelated,plan);assert.equal(rejected.valid,false);assert.ok(rejected.errors.some(x=>x==="LAZY_QUEST_CONTINUITY_UNRESOLVED:Q-old"));
 const linked={...unrelated,sideQuests:[{...unrelated.sideQuests[0],title:"巡邏改道後的空隙",objective:"查明巡邏改道後暴露的新安全空隙",continuityMode:"CONSEQUENCE",predecessorQuestIds:["Q-old"],motivation:"舊任務使守衛改變巡邏，原本被覆蓋的區段現在無人照看。"}]};
 const accepted=validateLazyGenerationCandidate(s,linked,plan);assert.equal(accepted.valid,true,accepted.errors.join(","))
});

test("v0.61.3 campaign architecture exists in generated schema and drives the director stage",()=>{
 const keys=["SURVIVE","ORIENT","CONTACT","INVESTIGATE","CRISIS","CLIMAX"],design=fallbackWorldDesignLogic({worldTheme:"潮汐交換記憶",magic:4,danger:3},{mustExist:[]}),schema=worldArchitectRequiredSchema();
 assert.deepEqual(design.campaignArchitecture.stages.map(x=>x.key),keys);assert.deepEqual(schema.campaignArchitecture.stages.map(x=>x.key),keys);
 const s=newGame(seed);s.world.bible={designLogic:design};s.quests.main.stage=3;s.quests.main.stageKey="INVESTIGATE";
 const director=narrativeDirectorSnapshot(s);assert.equal(director.campaign.stageKey,"INVESTIGATE");assert.equal(director.campaign.currentStage.key,"INVESTIGATE");assert.ok(director.campaign.currentStage.pressure.length>0);assert.equal("campaign" in director.playerSafe,false)
});

test("v0.61.3 player-facing main scaffold uses only known state and never exposes director premise",()=>{
 const s=newGame(seed);s.world.registry.locations.push({id:"LOC-known",name:"灰鐘碼頭",type:"碼頭",description:"已知碼頭",known:true});s.player.location="灰鐘碼頭";s.world.state.location="灰鐘碼頭";s.world.bible={designLogic:{campaignArchitecture:{premise:"王室其實由失落機械偽裝而成",centralQuestion:"秘密",stages:[]}}};
 const q=ensureMainQuest(s);assert.match(q.title,/灰鐘碼頭/);assert.doesNotMatch(q.title+q.objectives.join(""),/失落機械|王室其實/)
});

test("v0.61.3 direct and server quest prompts carry campaign and continuity contracts",async()=>{
 const [client,api]=await Promise.all([readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../api/world.js",import.meta.url),"utf8")]);
 for(const token of ["pendingTerminal","completionConsequences","failureConsequences","campaignArchitecture"])assert.match(client,new RegExp(token));
 for(const token of ["continuityMode","completionConsequences","failureConsequences","campaignArchitecture"])assert.match(api,new RegExp(token))
});
