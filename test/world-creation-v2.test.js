import test from "node:test";
import assert from "node:assert/strict";
import {
 createWorldCreationDraft,
 resolveWorldBlueprint,
 compileWorldCreation,
 validateWorldCreationCandidate,
 applyWorldCreationState,
 buildWorldContract,
 DIFFICULTY_PRESETS,
 BLUEPRINT_SOURCES
} from "../src/world-creation.js";
import {createWorldSeedContract} from "../src/seed-contract.js";

function baseRaw(overrides={}){
 return {
  masterSeed:"wc2-regression-seed",
  worldStyle:"王道奇幻",worldScale:"中型",targetPlayHours:18,difficulty:"hard",
  originType:"summoned",playerRole:"researcher",
  customWorldDescription:"多王國高魔法世界，玩家慢慢成長。",
  storyPreferences:"後期可能爆發戰爭\n希望出現魔法學院篇",
  requiredElements:"魔法學院\n龍",allowedElements:"魔王",forbiddenElements:"槍械\n科幻文明",
  civilizationLevel:6,civilizationLevelMode:"style",
  technologyLevel:4,technologyLevelMode:"random",
  magicLevel:9,magicLevelMode:"fixed",
  civilizationCount:5,civilizationCountMode:"random",
  speciesCount:4,speciesCountMode:"random",
  languageCount:6,languageCountMode:"random",
  politicalUnity:4,politicalUnityMode:"style",
  religionInfluence:6,religionInfluenceMode:"style",
  resourceAbundance:6,resourceAbundanceMode:"style",
  worldDanger:8,worldDangerMode:"fixed",
  warState:"TENSION",warStateMode:"random",
  unknownRatio:70,unknownRatioMode:"random",
  survivalIntensity:8,survivalIntensityMode:"fixed",
  ...overrides
 }
}
function validCandidate(seed,overrides={}){
 return {
  worldTheme:"學院與龍共存的王國",
  summary:"魔法學院研究龍類；這個世界沒有槍械，也禁止科幻文明。",
  worldBible:{startingLocation:"學院外城",blueprintProfile:structuredClone(seed.blueprintProfile)},
  publicFacts:["魔法學院是王國的重要教育機構。","龍存在於北方山脈。"],
  hiddenFacts:[],worldHistory:[],
  generation:{locations:[{name:"魔法學院"}],npcs:[],factions:[],sideQuests:[]},
  ...overrides
 }
}

test("World Creation 2.0 resolves deterministic random values before AI",()=>{
 const a=resolveWorldBlueprint(createWorldCreationDraft(baseRaw()));
 const b=resolveWorldBlueprint(createWorldCreationDraft(baseRaw()));
 assert.deepEqual(a,b);
 assert.equal(a.advanced.magicLevel.value,9);
 assert.equal(a.advanced.magicLevel.source,BLUEPRINT_SOURCES.USER);
 assert.equal(a.difficulty,"hard")
});

test("locked fields remain USER-owned even when their mode says random or style",()=>{
 const draft=createWorldCreationDraft(baseRaw({
  technologyLevel:10,technologyLevelMode:"random",technologyLevelLocked:true,
  civilizationLevel:1,civilizationLevelMode:"style",civilizationLevelLocked:true
 }));
 const b=resolveWorldBlueprint(draft);
 assert.equal(b.advanced.technologyLevel.value,10);
 assert.equal(b.advanced.technologyLevel.source,BLUEPRINT_SOURCES.USER);
 assert.equal(b.advanced.civilizationLevel.value,1);
 assert.equal(b.advanced.civilizationLevel.source,BLUEPRINT_SOURCES.USER)
});

test("degree settings preserve 1-10 precision while legacy Seed receives 1-5 compatibility values",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw({
  magicLevel:10,magicLevelMode:"fixed",
  worldDanger:9,worldDangerMode:"fixed",
  politicalUnity:2,politicalUnityMode:"fixed"
 })));
 assert.equal(seed.blueprintProfile.magicLevel.value,10);
 assert.equal(seed.blueprintProfile.worldDanger.value,9);
 assert.equal(seed.blueprintProfile.politicalUnity.value,2);
 assert.equal(seed.magic,5);
 assert.equal(seed.danger,5);
 assert.equal(seed.politics,5);
 assert.match(seed.prompt,/魔法10\/10/);
 assert.match(seed.prompt,/危險9\/10/)
});

test("custom world style stays first-class and becomes Seed style foundation",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw({
  worldStyle:"自訂世界",
  customWorldStyle:"天空群島文明，魔法由記憶驅動，跨國學院保持中立。",
  civilizationLevel:7,civilizationLevelMode:"fixed"
 })));
 const contract=createWorldSeedContract(seed);
 assert.equal(seed.genre,"自訂世界");
 assert.equal(seed.blueprintProfile.customStyleDescription,"天空群島文明，魔法由記憶驅動，跨國學院保持中立。");
 assert.match(contract.styleFoundation,/天空群島文明/);
 assert.doesNotMatch(contract.styleFoundation,/冒險感較強/)
});

test("hard Constitution tags compile ahead of long freeform text",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw({customWorldDescription:"很長的世界描述".repeat(180)})));
 assert.match(seed.prompt,/硬性必須存在：魔法學院、龍/);
 assert.match(seed.prompt,/硬性禁止出現：槍械、科幻文明/);
 assert.ok(seed.prompt.length<=800);
 const c=seed.creationV2.constitution;
 assert.ok(c.hardRules.some(x=>x.kind==="REQUIRE"&&x.term==="魔法學院"));
 assert.ok(c.hardRules.some(x=>x.kind==="FORBID"&&x.term==="槍械"))
});

test("Blueprint Compliance rejects missing required, positive forbidden and profile drift",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw()));
 const bad=validCandidate(seed,{summary:"軍隊使用槍械守衛王城",publicFacts:["龍存在於北方山脈。"],generation:{locations:[],npcs:[],factions:[],sideQuests:[]},worldBible:{blueprintProfile:{...structuredClone(seed.blueprintProfile),technologyLevel:{value:10,source:"AI_INFERRED",locked:false}}}});
 const report=validateWorldCreationCandidate(seed,bad);
 assert.equal(report.valid,false);
 assert.ok(report.errors.includes("WC2_REQUIRED_MISSING:魔法學院"));
 assert.ok(report.errors.includes("WC2_FORBIDDEN_PRESENT:槍械"));
 assert.ok(report.errors.includes("BLUEPRINT_TECH_MISMATCH"))
});

test("Blueprint Compliance accepts equivalent wording for built-in technology requirements",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw({
  requiredElements:"人工智慧\n網絡通訊",
  forbiddenElements:""
 })));
 const report=validateWorldCreationCandidate(seed,validCandidate(seed,{
  summary:"城市由 AI 協助分配公共資源，各區透過網路通信節點交換即時訊息。",
  publicFacts:["人工智能系統參與交通調度。","跨區通信網路依賴固定中繼節點。"],
  generation:{locations:[],npcs:[],factions:[],sideQuests:[]}
 }));
 assert.equal(report.valid,true,report.errors.join(","));
 assert.equal(report.compliance.MUST_EXIST_COMPLIANCE.status,"PASS")
});

test("Blueprint Compliance accepts explicit prohibitions and reports named compliance rows",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw()));
 const report=validateWorldCreationCandidate(seed,validCandidate(seed));
 assert.equal(report.valid,true,report.errors.join(","));
 assert.equal(report.compliance.ORIGIN_COMPLIANCE.status,"PASS");
 assert.equal(report.compliance.TECH_COMPLIANCE.status,"PASS");
 assert.equal(report.compliance.CIVILIZATION_COMPLIANCE.status,"PASS");
 assert.equal(report.compliance.DIFFICULTY_COMPLIANCE.status,"PASS");
 assert.equal(report.compliance.FORBIDDEN_CONTENT_COMPLIANCE.status,"PASS")
});

test("creation state persists origin role difficulty and dynamic constitution",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw()));
 const state={world:{seed:{},constitution:[{id:"C-001",text:"base"}]},player:{}};
 applyWorldCreationState(state,seed);
 assert.equal(state.world.creation.schemaVersion,2);
 assert.equal(state.player.origin.label,"被召喚");
 assert.equal(state.player.role.label,"研究者");
 assert.equal(state.player.difficulty,"hard");
 assert.equal(state.world.creation.difficultyRules.savePolicy,DIFFICULTY_PRESETS.hard.savePolicy);
 assert.ok(state.world.constitution.some(x=>x.kind==="DESTINY_TENDENCY"));
 assert.ok(state.world.constitution.some(x=>x.kind==="FORBID"&&x.term==="槍械"))
});

test("World Contract is public projection and keeps hidden truth out",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw()));
 const state={world:{seed:{},constitution:[]},player:{}};
 applyWorldCreationState(state,seed);
 state.world.hiddenState={truth:"玩家其實由古神召喚"};
 const contract=buildWorldContract(state),text=JSON.stringify(contract);
 assert.equal(contract.difficulty,"困難");
 assert.equal(contract.origin,"被召喚");
 assert.match(contract.structure[0],/\/10/);
 assert.ok(contract.unknown.includes("隱藏世界真相"));
 assert.equal(text.includes("玩家其實由古神召喚"),false)
});
