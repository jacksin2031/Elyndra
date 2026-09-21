import test from "node:test";
import assert from "node:assert/strict";
import {
 createWorldCreationDraft,
 resolveWorldBlueprint,
 buildWorldConstitution,
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
  worldStyle:"王道奇幻",
  worldScale:"中型",
  targetPlayHours:18,
  difficulty:"hard",
  originType:"summoned",
  playerRole:"researcher",
  customWorldDescription:"多王國高魔法世界，玩家慢慢成長。",
  storyPreferences:"後期可能爆發戰爭\n希望出現魔法學院篇",
  requiredElements:"魔法學院\n龍",
  allowedElements:"魔王",
  forbiddenElements:"槍械\n科幻文明",
  civilizationLevel:5,civilizationLevelMode:"style",
  technologyLevel:4,technologyLevelMode:"random",
  magicLevel:9,magicLevelMode:"fixed",
  civilizationCount:5,civilizationCountMode:"random",
  speciesCount:4,speciesCountMode:"random",
  languageCount:6,languageCountMode:"random",
  politicalUnity:4,politicalUnityMode:"style",
  religionInfluence:5,religionInfluenceMode:"style",
  resourceAbundance:5,resourceAbundanceMode:"style",
  worldDanger:8,worldDangerMode:"fixed",
  warState:"TENSION",warStateMode:"random",
  unknownRatio:70,unknownRatioMode:"random",
  survivalIntensity:8,survivalIntensityMode:"fixed",
  ...overrides
 }
}
function compliantWorld(seed,overrides={}){
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

test("World Creation 2.0 resolves the same master seed deterministically",()=>{
 const a=resolveWorldBlueprint(createWorldCreationDraft(baseRaw()));
 const b=resolveWorldBlueprint(createWorldCreationDraft(baseRaw()));
 assert.deepEqual(a,b);
 assert.equal(a.advanced.magicLevel.value,9);
 assert.equal(a.advanced.magicLevel.source,BLUEPRINT_SOURCES.USER);
 assert.equal(a.difficulty,"hard")
});

test("degree fields preserve 1-10 precision while legacy seed receives 1-5 mapping",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw({magicLevel:10,worldDanger:8,politicalUnity:10})));
 assert.equal(seed.creationV2.blueprint.advanced.magicLevel.value,10);
 assert.equal(seed.creationV2.blueprint.advanced.worldDanger.value,8);
 assert.equal(seed.creationV2.blueprint.advanced.politicalUnity.value,4);
 assert.equal(seed.magic,5);
 assert.equal(seed.danger,4);
 assert.ok(seed.politics>=1&&seed.politics<=5);
 assert.match(seed.prompt,/文明\d+\/10、科技\d+\/10/);
});

test("locked fields remain USER-owned even when their mode is random or style",()=>{
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

test("custom world style remains first-class and becomes Seed style foundation",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw({
  worldStyle:"自訂世界",
  customWorldStyle:"天空群島文明，魔法由記憶驅動，城市建在巨獸骨架之上。"
 })));
 const contract=createWorldSeedContract(seed);
 assert.equal(seed.genre,"自訂世界");
 assert.equal(seed.creationV2.blueprint.style.value,"自訂世界");
 assert.equal(seed.blueprintProfile.customStyleDescription,"天空群島文明，魔法由記憶驅動，城市建在巨獸骨架之上。");
 assert.match(contract.styleFoundation,/天空群島文明/);
 assert.match(seed.prompt,/自訂世界風格：天空群島文明/)
});

test("hard tag constraints are compiled ahead of long freeform text",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw({
  customWorldDescription:"很長的世界描述".repeat(180)
 })));
 assert.match(seed.prompt,/硬性必須存在：魔法學院、龍/);
 assert.match(seed.prompt,/硬性禁止出現：槍械、科幻文明/);
 assert.ok(seed.prompt.length<=800);
 const c=seed.creationV2.constitution;
 assert.ok(c.hardRules.some(x=>x.kind==="REQUIRE"&&x.term==="魔法學院"));
 assert.ok(c.hardRules.some(x=>x.kind==="FORBID"&&x.term==="槍械"))
});

test("candidate validator rejects missing required and positive forbidden content",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw()));
 const bad={worldTheme:"龍之王國",summary:"軍隊使用槍械守衛王城",worldBible:{blueprintProfile:structuredClone(seed.blueprintProfile)},publicFacts:["龍存在"],hiddenFacts:[],worldHistory:[],generation:{}};
 const report=validateWorldCreationCandidate(seed,bad);
 assert.equal(report.valid,false);
 assert.ok(report.errors.includes("WC2_REQUIRED_MISSING:魔法學院"));
 assert.ok(report.errors.includes("WC2_FORBIDDEN_PRESENT:槍械"))
});

test("candidate validator requires exact Engine-owned Blueprint profile",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw()));
 const candidate=compliantWorld(seed);
 candidate.worldBible.blueprintProfile.technologyLevel.value=10;
 const report=validateWorldCreationCandidate(seed,candidate);
 assert.equal(report.valid,false);
 assert.ok(report.errors.includes("BLUEPRINT_TECH_MISMATCH"));
 assert.equal(report.compliance.TECH_COMPLIANCE.status,"FAIL")
});

test("candidate validator accepts explicit prohibition and reports Blueprint compliance",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw()));
 const report=validateWorldCreationCandidate(seed,compliantWorld(seed));
 assert.equal(report.valid,true,report.errors.join(","));
 assert.equal(report.compliance.ORIGIN_COMPLIANCE.status,"PASS");
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

test("World Contract exposes 1-10 structure but never hidden truth",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw()));
 const state={world:{seed:{},constitution:[]},player:{}};
 applyWorldCreationState(state,seed);
 state.world.hiddenState={truth:"玩家其實由古神召喚"};
 const contract=buildWorldContract(state),text=JSON.stringify(contract);
 assert.equal(contract.difficulty,"困難");
 assert.equal(contract.origin,"被召喚");
 assert.ok(contract.structure.some(x=>x.includes("/10")));
 assert.ok(contract.unknown.includes("隱藏世界真相"));
 assert.equal(text.includes("玩家其實由古神召喚"),false)
});
