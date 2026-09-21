import test from "node:test";
import assert from "node:assert/strict";
import {normalizeWorldCoreCandidate,worldCoreIssues,mergeWorldCoreCandidates,validWorldCoreCandidate} from "../src/world-compiler.js";

test("AI-selected worldTheme becomes the single canonical seed-compliance theme",()=>{
 const core={
  worldTheme:"  記憶作為貨幣的世界  ",
  seedCompliance:{theme:{value:"記憶即貨幣",evidence:"記憶交換制度構成世界核心衝突。"}}
 };
 const out=normalizeWorldCoreCandidate(core);
 assert.equal(out.worldTheme,"記憶作為貨幣的世界");
 assert.equal(out.seedCompliance.theme.value,"記憶作為貨幣的世界");
 assert.equal(out.seedCompliance.theme.evidence,"記憶交換制度構成世界核心衝突。");
});

test("theme canonicalization does not invent missing compliance rows",()=>{
 const core={worldTheme:"循環崩壞",seedCompliance:{}};
 normalizeWorldCoreCandidate(core);
 assert.equal(core.worldTheme,"循環崩壞");
 assert.equal(core.seedCompliance.theme,undefined);
});

test("both direct and server world paths canonicalize theme before Engine validation",async()=>{
 const {readFile}=await import("node:fs/promises");
 const [client,server]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../api/world.js",import.meta.url),"utf8")
 ]);
 assert.match(client,/normalizeWorldCoreCandidate\(await worldStage\("CORE"/);
 assert.match(server,/normalizeWorldCoreCandidate\(JSON\.parse\(raw\)\)/);
});


test("core normalization tolerates common model shape drift without inventing lore",()=>{
 const core={worldName:"伊瑟",worldTheme:"潮汐記憶",summary:"一個由記憶潮汐塑造文明與氣候的世界。",seedCompliance:{theme:{value:"old",evidence:"e"}},worldBible:{civilization:{level:3},communication:{name:"潮訊"},weatherSystem:{identity:"記憶潮形成天氣",phenomena:{a:{name:"回聲霧"},b:{id:"WTH-B",name:"逆雨"},c:{name:"靜電潮"},d:{name:"星屑風"}}}},publicFacts:"潮汐會改變道路；居民以鐘聲標記安全時段",hiddenFacts:"潮汐其實受古代裝置控制；王庭隱瞞裝置位置"};
 const out=normalizeWorldCoreCandidate(core);
 assert.equal(out.seedCompliance.theme.value,"潮汐記憶");
 assert.equal(out.worldBible.weatherSystem.phenomena.length,4);
 assert.equal(out.worldBible.weatherSystem.phenomena[0].id,"WTH-1");
 assert.equal(out.publicFacts.length,2);
 assert.equal(out.hiddenFacts.length,2);
 assert.deepEqual(worldCoreIssues(out),[]);
 assert.equal(validWorldCoreCandidate(out),true)
});

test("semantic core repair merges only supplied corrections and reports unresolved requirements",()=>{
 const partial={worldName:"伊瑟",worldTheme:"潮汐記憶",summary:"世界概要",seedCompliance:{theme:{value:"潮汐記憶",evidence:"e"}},worldBible:{civilization:{level:3},communication:{name:"潮訊"},weatherSystem:{identity:"記憶潮形成天氣",phenomena:[{id:"WTH-1",name:"霧"}]}},publicFacts:["事實一"],hiddenFacts:[]};
 assert.ok(worldCoreIssues(partial).includes("worldBible.weatherSystem.phenomena>=4"));
 assert.ok(worldCoreIssues(partial).includes("publicFacts>=2"));
 const repaired=mergeWorldCoreCandidates(partial,{worldBible:{weatherSystem:{phenomena:[{id:"WTH-1",name:"霧"},{id:"WTH-2",name:"逆雨"},{id:"WTH-3",name:"星屑風"},{id:"WTH-4",name:"靜電潮"}]}},publicFacts:["事實一","事實二"],hiddenFacts:["秘密一","秘密二"]});
 assert.equal(repaired.worldName,"伊瑟");
 assert.equal(repaired.worldBible.communication.name,"潮訊");
 assert.deepEqual(worldCoreIssues(repaired),[])
});
