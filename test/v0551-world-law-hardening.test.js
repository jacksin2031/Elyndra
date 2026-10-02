import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createWorldCreationDraft,compileWorldCreation,validateWorldCreationCandidate} from "../src/world-creation.js";
import {materialSatisfiesClaim} from "../src/generation-claims.js";
import {parseMagicLaw,resolveMagicAction} from "../src/magic-engine.js";
import {openingCastChronologyIssues,openingCastTimelineSnapshot} from "../src/world-compiler.js";

function creationSeed({required=[],forbidden=[]}={}){
 return compileWorldCreation(createWorldCreationDraft({masterSeed:"v0551",requiredElements:required,forbiddenElements:forbidden,civilizationCount:1,speciesCount:1,languageCount:1}))
}
function candidate(seed,extra={}){
 return {worldTheme:"測試世界",summary:"穩定世界摘要",worldBible:{blueprintProfile:structuredClone(seed.blueprintProfile),era:"潮曆",centralConflict:"地方衝突",magicCost:"每次成功施法消耗10 HP",ancientTruth:"古代真相",currentCrisis:"港口封鎖",tone:"緊張",...(extra.worldBible||{})},publicFacts:extra.publicFacts||[],hiddenFacts:extra.hiddenFacts||[],worldHistory:extra.worldHistory||[],worldTimeline:extra.worldTimeline||[],generation:extra.generation||{locations:[],npcs:[],factions:[],sideQuests:[]},openingHook:extra.openingHook||""}
}

test("v0.55.1 required element cannot PASS through a negated sentence",()=>{
 const seed=creationSeed({required:["魔法學院"]});
 let r=validateWorldCreationCandidate(seed,candidate(seed,{publicFacts:["此地不存在魔法學院。"]}));assert.equal(r.valid,false);assert.ok(r.errors.includes("WC2_REQUIRED_MISSING:魔法學院"));
 r=validateWorldCreationCandidate(seed,candidate(seed,{publicFacts:["王都設有一所魔法學院，負責訓練術士。"]}));assert.equal(r.errors.some(x=>x.startsWith("WC2_REQUIRED_MISSING:")),false)
});

test("v0.55.1 forbidden content is checked inside World Bible and Timeline",()=>{
 const seed=creationSeed({forbidden:["血月"]});
 let r=validateWorldCreationCandidate(seed,candidate(seed,{worldBible:{currentCrisis:"血月正在升起，港口進入戒嚴。"}}));assert.ok(r.errors.includes("WC2_FORBIDDEN_PRESENT:血月"));
 r=validateWorldCreationCandidate(seed,candidate(seed,{worldTimeline:[{id:"TL-1",title:"血月降臨",earliestDay:3,latestDay:5}]}));assert.ok(r.errors.includes("WC2_FORBIDDEN_PRESENT:血月"))
});

test("v0.55.1 Generation Claim materialization rejects negated mentions",()=>{
 const claim={type:"REQUIRED_ELEMENT",label:"魔法學院"};
 assert.equal(materialSatisfiesClaim(claim,{kind:"location",id:"L1",name:"舊校舍",description:"此地不存在魔法學院。"}),false);
 assert.equal(materialSatisfiesClaim(claim,{kind:"location",id:"L2",name:"星塔魔法學院",description:"仍在運作。"}),true)
});

test("v0.55.1 magic laws expose executable vs narrative-only contracts",()=>{
 assert.deepEqual(parseMagicLaw("成功施法會消耗10 HP").effect,{type:"HP",amount:10});
 assert.deepEqual(parseMagicLaw("成功施法會失去一段童年記憶").effect,{type:"MEMORY_LOSS",amount:1});
 assert.equal(parseMagicLaw("成功施法後星星會重新排列為你的名字").status,"NARRATIVE_ONLY")
});
function magicState(cost,inventory=[]){return {world:{seedContract:{magic:3},bible:{magicCost:cost},state:{day:1},canon:{facts:[]}},player:{hp:100,magic:{capacity:100,strain:0,knownSpells:[{id:"S1",name:"火花術",cost:10,effect:"火花"}],attunements:[]}},inventory,events:[],knowledge:[]}}

test("v0.55.1 executable HP magic law creates a real matching state delta",()=>{
 const s=magicState("每次成功施法消耗10 HP"),r=resolveMagicAction(s,"施法 火花術",{success:true});assert.equal(r.success,true);assert.equal(s.player.hp,90);assert.equal(s.player.magic.strain,10);assert.equal(r.lawExecution.status,"EXECUTED");assert.deepEqual(r.lawExecution.effects.map(x=>[x.type,x.amount,x.before,x.after]),[["HP",10,100,90]])
});

test("v0.55.1 unsupported magic law is never falsely claimed as executed",()=>{
 const s=magicState("成功施法後星星會重新排列為你的名字"),r=resolveMagicAction(s,"施法 火花術",{success:true});assert.equal(r.success,true);assert.equal(s.player.hp,100);assert.equal(r.lawExecution.status,"NARRATIVE_ONLY");assert.equal(r.lawExecution.effects.length,0);assert.doesNotMatch(r.event.summary,/已支付|已套用可執行/)
});

test("v0.55.1 executable item magic law checks inventory before mutating cast state",()=>{
 let s=magicState("每次成功施法消耗1個魔晶"),r=resolveMagicAction(s,"施法 火花術",{success:true});assert.equal(r.success,false);assert.equal(r.reason,"MAGIC_LAW_ITEM_MISSING");assert.equal(s.player.magic.strain,0);
 s=magicState("每次成功施法消耗1個魔晶",[{id:"I1",name:"魔晶",quantity:1}]);r=resolveMagicAction(s,"施法 火花術",{success:true});assert.equal(r.success,true);assert.equal(s.inventory[0].quantity,0);assert.equal(r.lawExecution.effects[0].type,"ITEM")
});

test("v0.55.1 chronology requires character-specific canonical mechanism, not unrelated world longevity text",()=>{
 const history=[{id:"HIST-OLD",era:"三百年前",title:"初代建城",summary:"三百年前初代工程師建立城市。"}],anchor={magicCost:"長壽藥存在但只供王族",publicFacts:["王族可使用延壽儀式。"]};
 let cast={npcs:[{name:"洛恩",role:"工程師",description:"他就是三百年前的初代創建者本人。",historyRefs:["HIST-OLD"]}]};assert.deepEqual(openingCastChronologyIssues(anchor,history,cast),["CAST_NPC_0_TEMPORAL_PLAUSIBILITY"]);
 anchor.publicFacts=["延壽儀式可令指定施術者長壽數百年。"];
 cast={npcs:[{name:"洛恩",role:"工程師",description:"他就是三百年前的初代創建者本人。",historyRefs:["HIST-OLD"],chronology:{relation:"LONG_LIVED",birthEra:"舊紀",mechanismRef:"PUBLIC_FACT:1",mechanism:"延壽儀式令本人長壽數百年"}}]};assert.deepEqual(openingCastChronologyIssues(anchor,history,cast),[])
});

test("v0.55.1 CAST timeline snapshot preserves dates, trigger and status in both generation paths",async()=>{
 const snap=openingCastTimelineSnapshot({worldTimeline:[{id:"TL-1",title:"霧潮",earliestDay:3,latestDay:6,triggerDay:4,status:"SCHEDULED",observableEffect:"霧變厚",links:{historyRefs:["H1"],locationRefs:["L1"]}}]});assert.deepEqual(snap[0],{id:"TL-1",title:"霧潮",earliestDay:3,latestDay:6,triggerDay:4,status:"SCHEDULED",observableEffect:"霧變厚",links:{historyRefs:["H1"],locationRefs:["L1"]}});
 const [client,api]=await Promise.all([readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../api/world.js",import.meta.url),"utf8")]);for(const source of [client,api]){assert.match(source,/openingCastTimelineSnapshot\(future\)/);assert.match(source,/chronology:\{relation:/)}
});
