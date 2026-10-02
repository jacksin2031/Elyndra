import test from "node:test";
import assert from "node:assert/strict";
import {fallbackWorldDesignLogic,worldDesignLogicIssues,worldArchitectQualityFindings,buildWorldArchitectBrief} from "../src/world-architect-skill.js";
import {mergeCoreWave,buildWorldAnchorContract} from "../src/world-compiler.js";

const identity={worldName:"測試界",worldTheme:"記憶會結晶並成為城市能源",magic:4,danger:3};

test("fallback World Architect design is structurally complete",()=>{
 const designLogic=fallbackWorldDesignLogic(identity,{mustExist:["記憶晶體"]});
 const issues=worldDesignLogicIssues({worldBible:{designLogic}});
 assert.deepEqual(issues,[]);
 assert.ok(designLogic.consequenceChains.length>=2);
 assert.ok(designLogic.storyEngines.every(x=>x.playerLevers.length>=2));
});

test("World Architect rejects shallow setting lists without causal structure",()=>{
 const issues=worldDesignLogicIssues({worldBible:{designLogic:{coreFantasy:"有魔法",worldHook:"普通奇幻世界",laws:[],consequenceChains:[],dailyLifeImpacts:[],storyEngines:[],mysteryLayers:{}}}});
 assert.ok(issues.includes("LAWS_MIN_2"));
 assert.ok(issues.includes("CONSEQUENCE_CHAINS_MIN_2"));
 assert.ok(issues.includes("STORY_ENGINES_MIN_2"));
 assert.ok(issues.includes("MYSTERY_LAYERS_INCOMPLETE"));
});

test("common isekai trope needs a recorded world-internal cause and transformation",()=>{
 const designLogic=fallbackWorldDesignLogic(identity,{}),base={worldTheme:identity.worldTheme,worldBible:{designLogic},generation:{factions:[{name:"冒險者公會"}]}};
 const bad=worldArchitectQualityFindings(base);
 assert.ok(bad.some(x=>x.targetType==="ANTI_CLICHE"));
 designLogic.tropeAudit=[{trope:"冒險者公會",causalBasis:"城市把高風險記憶採集外包給持證隊伍，因死亡會造成公共能源損失。",twist:"公會不是任務仲介，而是記憶損耗保險與能源配額機構。"}];
 const good=worldArchitectQualityFindings(base);
 assert.equal(good.some(x=>x.targetType==="ANTI_CLICHE"),false);
});

test("architect brief carries constraints without mutating them",()=>{
 const profile={mustExist:["飛空船"],forbidden:["全球通用金幣"]},brief=buildWorldArchitectBrief({identity,seedContract:{genre:"浮空群島"},blueprintProfile:profile});
 assert.equal(brief.version,1);
 assert.equal(brief.identity.worldTheme,identity.worldTheme);
 assert.deepEqual(brief.hardConstraints.blueprintProfile,profile);
 assert.ok(Array.isArray(brief.doctrine)&&brief.doctrine.length>=8);
});

test("design logic survives Core Rules -> merged core -> World Anchor Contract",()=>{
 const id={...identity,playerName:"",genre:"奇幻",scale:"中型",politics:3,premise:"記憶結晶塑造城市與居民生活。"},designLogic=fallbackWorldDesignLogic(identity,{});
 const rules={worldBible:{era:"晶曆",centralConflict:"記憶能源分配逐步失衡。",magicCost:"每次施術都會永久損失近期的一段清晰記憶。",ancientTruth:"城市核心並非天然形成。",currentCrisis:"能源晶體正異常衰減。",tone:"探索與制度衝突",civilization:{level:3},communication:{name:"晶訊"},designLogic}};
 const anchorStage={summary:"一個以記憶作能源並因此形成制度衝突的世界。",worldBible:{startingRegion:"晶岸",startingSettlement:"刻印城",startingLocation:"舊記憶庫",weatherSystem:{identity:"記憶粒子形成天候",phenomena:[{id:"WTH-1",name:"回聲霧"},{id:"WTH-2",name:"逆光雨"}]}},publicFacts:["居民以記憶晶體供能。","晶體價格正在上升。"],hiddenFacts:["晶體來自被封存的記憶。","核心衰減有人為因素。"]};
 const core=mergeCoreWave(id,{prompt:""},rules,anchorStage),anchor=buildWorldAnchorContract(core,{});
 assert.deepEqual(core.worldBible.designLogic,designLogic);
 assert.deepEqual(anchor.designLogic,designLogic);
});
