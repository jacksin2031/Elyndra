import test from "node:test";
import assert from "node:assert/strict";
import {normalizeWorldCoreCandidate,worldCoreIssues,mergeWorldCoreCandidates,validWorldCoreCandidate,normalizeWorldIdentity,buildSeedComplianceFromIdentity,mergeCoreWave,coreWaveIssues,buildWorldAnchorContract,mergeOpeningRegion,worldGenerationLinkIssues} from "../src/world-compiler.js";
import {normalizeWeatherSystem} from "../src/weather-engine.js";

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
 assert.match(client,/normalizeWorldIdentity\(identityRaw,expected,seed\)/);
 assert.match(client,/mergeCoreWave\(identity,expected,rules,coreAnchor\)/);
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
 assert.ok(worldCoreIssues(partial).includes("worldBible.weatherSystem.phenomena>=2"));
 assert.ok(worldCoreIssues(partial).includes("publicFacts>=2"));
 const repaired=mergeWorldCoreCandidates(partial,{worldBible:{weatherSystem:{phenomena:[{id:"WTH-1",name:"霧"},{id:"WTH-2",name:"逆雨"},{id:"WTH-3",name:"星屑風"},{id:"WTH-4",name:"靜電潮"}]}},publicFacts:["事實一","事實二"],hiddenFacts:["秘密一","秘密二"]});
 assert.equal(repaired.worldName,"伊瑟");
 assert.equal(repaired.worldBible.communication.name,"潮訊");
 assert.deepEqual(worldCoreIssues(repaired),[])
});


test("two authored isekai weather phenomena are enough for Core and Engine expands them to four runtime states",()=>{
 const core={worldName:"潮界",worldTheme:"天空潮汐",summary:"潮汐在天空流動並改變聚落生活。",seedCompliance:{theme:{value:"天空潮汐",evidence:"世界以天空潮汐為核心。"}},worldBible:{civilization:{level:2},communication:{name:"燈塔訊號"},weatherSystem:{identity:"天空潮汐會凝成可見天候。",source:"天空潮汐",cycle:"隨雙月交替",forecastability:"MEDIUM",phenomena:[{id:"WTH-1",name:"倒雨",observableName:"雨滴向天空升起",description:"水滴逆向上升。",sensoryCue:"皮膚附近水滴向上飄",rarity:"UNCOMMON",danger:1},{id:"WTH-2",name:"聲霧",observableName:"霧中聲音延遲",description:"霧層扭曲聲音傳遞。",sensoryCue:"腳步聲在身後才響起",rarity:"RARE",danger:2}]}},publicFacts:["天空潮會影響道路","聚落用燈號預報"],hiddenFacts:["潮汐源頭並非自然","古塔可改變潮向"]};
 assert.deepEqual(worldCoreIssues(core),[]);
 const runtime=normalizeWeatherSystem(core.worldBible.weatherSystem,{magic:3});
 assert.equal(runtime.phenomena.length,4);
 assert.equal(runtime.phenomena[0].name,"倒雨");
 assert.equal(runtime.phenomena[1].name,"聲霧")
});


test("two-agent waves share one anchor and Engine validates cross-stage references",()=>{
 const core={worldName:"潮界",worldTheme:"天空潮汐",publicFacts:["燈塔會預報潮向","旅人依鐘聲辨路"],worldBible:{startingRegion:"灰岸",startingSettlement:"燈港",startingLocation:"潮門",centralConflict:"王庭控制潮汐預報",currentCrisis:"預報開始失真",magicCost:"施術會遺失最近記憶",era:"潮紀",tone:"未知與壓迫",civilization:{level:3},communication:{name:"燈鏈"},weatherSystem:{phenomena:[{id:"WTH-1",name:"倒雨"},{id:"WTH-2",name:"聲霧"}]}}};
 const anchor=buildWorldAnchorContract(core,{majorEventCount:4,horizonDays:8});
 const history=[{id:"HIST-1"},{id:"HIST-2"},{id:"HIST-3"}];
 const geography={openingHook:"潮聲由頭頂傳來。",location:{name:"潮門",region:"灰岸",type:"港門",description:"石門向天空滴水。"}};
 const society={locationRef:"潮門",historyRefs:["HIST-1"],locationCulture:{identity:"以潮汐鐘聲維持生活"},locationTrade:{mode:"barter"},faction:{name:"燈港會",goal:"維持預報",locationName:"潮門",historyRefs:["HIST-1"]}};
 const future={worldTimeline:[{title:"預報斷裂",links:{historyRefs:["HIST-2"],locationRefs:["STARTING_REGION"]}}]};
 const cast={npcs:[{name:"米拉",locationName:"潮門",historyRefs:["HIST-1"]}],sideQuests:[{title:"找回舊潮表",locationName:"潮門",historyRefs:["HIST-2"]}]};
 assert.equal(anchor.startingLocation,"潮門");
 const mergedRegion=mergeOpeningRegion(anchor,geography,society);
 assert.equal(mergedRegion.locations[0].culture.identity,"以潮汐鐘聲維持生活");
 assert.deepEqual(mergedRegion.locations[0].historyRefs,["HIST-1"]);
 assert.deepEqual(worldGenerationLinkIssues({anchor,history,geography,society,future,cast}),[]);
 const broken={...society,historyRefs:["HIST-NOPE"]};
 assert.ok(worldGenerationLinkIssues({anchor,history,geography,society:broken,future,cast}).includes("SOCIETY_HISTORY_REF_INVALID"))
});


test("link validation rejects disconnected future events and cast content",()=>{
 const anchor={startingLocation:"潮門",startingRegion:"灰岸"};
 const history=[{id:"HIST-1"},{id:"HIST-2"},{id:"HIST-3"}];
 const geography={location:{name:"潮門",region:"灰岸"}};
 const society={locationRef:"潮門",historyRefs:["HIST-1"],faction:{name:"燈港會",locationName:"潮門"}};
 const future={worldTimeline:[{title:"無來源事件",links:{historyRefs:[],locationRefs:[]}}]};
 const cast={npcs:[{name:"米拉",locationName:"其他地方",historyRefs:[]}],sideQuests:[{title:"無關支線",historyRefs:[]}]};
 const issues=worldGenerationLinkIssues({anchor,history,geography,society,future,cast});
 assert.ok(issues.includes("FUTURE_0_LINK_REQUIRED"));
 assert.ok(issues.includes("CAST_NPC_0_LOCATION_INVALID"));
 assert.ok(issues.includes("CAST_QUEST_0_LINK_REQUIRED"))
});


test("linked core agents cannot drift from the Engine-owned world identity",()=>{
 const expected={worldviewMode:"style",genre:"黑暗奇幻",scale:"中型",danger:4,magic:3,politics:4,prompt:"不要使用地球國家"};
 const identity=normalizeWorldIdentity({worldName:"灰潮界",worldTheme:"記憶潮侵蝕城市",genre:"科幻",scale:"大型",danger:1,magic:5,politics:1,premise:"錯誤值會被 style contract 收斂"},expected,{playerName:"旅人"});
 assert.equal(identity.genre,"黑暗奇幻");assert.equal(identity.scale,"中型");assert.equal(identity.danger,4);assert.equal(identity.politics,4);
 const rules={worldName:"另一世界",worldTheme:"另一主題",worldBible:{era:"灰潮紀",centralConflict:"城市靠消耗居民記憶維持防潮結界。",magicCost:"每次施術都會遺失一段近期記憶，且無法免費恢復。",ancientTruth:"記憶潮原本是古代城市網絡的失控維護機制。",currentCrisis:"防潮結界正在失效，城市開始爭奪可被抽取的記憶。",tone:"壓迫與探索",civilization:{level:3,stage:"城邦網絡",infrastructure:"城牆與驛路",literacy:"書記制度普及",mobility:"商隊與驛站"},communication:{name:"記憶信標",medium:"刻印",description:"只可沿城邦節點傳訊",latency:"DELAYED",range:"REGIONAL",accessRule:"ENCOUNTERED",constraints:"需要維持信標"}}};
 const anchor={worldName:"漂移世界",worldTheme:"無關主題",summary:"記憶潮決定城市能否生存。",worldBible:{centralConflict:"Anchor 不應覆寫 Rules",magicCost:"Anchor 不應控制魔法代價",startingRegion:"灰岸",startingSettlement:"石港",startingLocation:"失憶門",weatherSystem:{identity:"記憶潮形成異常天候",source:"記憶潮",cycle:"隨結界衰退",forecastability:"MEDIUM",phenomena:[{id:"WTH-1",name:"逆憶雨"},{id:"WTH-2",name:"空名霧"}]}},publicFacts:["記憶潮會影響城市","施術有記憶代價"],hiddenFacts:["潮汐來自古代網絡","王庭知道結界真相"]};
 const core=mergeCoreWave(identity,expected,rules,anchor);
 assert.equal(core.worldName,"灰潮界");assert.equal(core.worldTheme,"記憶潮侵蝕城市");assert.equal(core.seedCompliance.genre.value,"黑暗奇幻");assert.equal(core.seedCompliance.prompt.value,"不要使用地球國家");assert.equal(core.worldBible.centralConflict,"城市靠消耗居民記憶維持防潮結界。");assert.equal(core.worldBible.magicCost,"每次施術都會遺失一段近期記憶，且無法免費恢復。");
 assert.deepEqual(coreWaveIssues(identity,rules,anchor,core),[])
});

test("identity fallback construction always produces complete seed compliance rows",()=>{
 const expected={worldviewMode:"ai",genre:"AI_DECIDES",scale:"AI_DECIDES",danger:null,magic:null,politics:null,prompt:""};
 const identity=normalizeWorldIdentity({},expected,{});
 const compliance=buildSeedComplianceFromIdentity(identity,expected);
 for(const key of ["genre","theme","scale","danger","magic","politics"]){assert.ok(compliance[key]);assert.ok(String(compliance[key].evidence).length>=8)}
});
