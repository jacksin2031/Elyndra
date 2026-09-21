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
 DIFFICULTY_PRESETS
} from "../src/world-creation.js";

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
  civilizationLevel:3,civilizationLevelMode:"style",
  technologyLevel:2,technologyLevelMode:"random",
  magicLevel:5,magicLevelMode:"fixed",
  civilizationCount:5,civilizationCountMode:"random",
  speciesCount:4,speciesCountMode:"random",
  languageCount:6,languageCountMode:"random",
  politicalUnity:2,politicalUnityMode:"style",
  religionInfluence:3,religionInfluenceMode:"style",
  resourceAbundance:3,resourceAbundanceMode:"style",
  worldDanger:4,worldDangerMode:"fixed",
  warState:"TENSION",warStateMode:"random",
  unknownRatio:70,unknownRatioMode:"random",
  survivalIntensity:4,survivalIntensityMode:"fixed",
  ...overrides
 }
}

test("World Creation 2.0 resolves the same master seed deterministically",()=>{
 const a=resolveWorldBlueprint(createWorldCreationDraft(baseRaw()));
 const b=resolveWorldBlueprint(createWorldCreationDraft(baseRaw()));
 assert.deepEqual(a,b);
 assert.equal(a.advanced.magicLevel.value,5);
 assert.equal(a.difficulty,"hard")
});

test("locked fields remain fixed even when their mode is random or style",()=>{
 const draft=createWorldCreationDraft(baseRaw({
  technologyLevel:5,technologyLevelMode:"random",technologyLevelLocked:true,
  civilizationLevel:1,civilizationLevelMode:"style",civilizationLevelLocked:true
 }));
 const b=resolveWorldBlueprint(draft);
 assert.equal(b.advanced.technologyLevel.value,5);
 assert.equal(b.advanced.technologyLevel.source,"player_locked");
 assert.equal(b.advanced.civilizationLevel.value,1);
 assert.equal(b.advanced.civilizationLevel.source,"player_locked")
});

test("hard constraints are compiled ahead of long freeform text",()=>{
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
 const bad={worldTheme:"龍之王國",summary:"軍隊使用槍械守衛王城",worldBible:{},publicFacts:[],hiddenFacts:[],worldHistory:[],generation:{}};
 const report=validateWorldCreationCandidate(seed,bad);
 assert.equal(report.valid,false);
 assert.ok(report.errors.includes("WC2_REQUIRED_MISSING:魔法學院"));
 assert.ok(report.errors.includes("WC2_FORBIDDEN_PRESENT:槍械"))
});

test("candidate validator does not treat explicit prohibition as generated forbidden content",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw()));
 const candidate={
  worldTheme:"學院與龍共存的王國",
  summary:"魔法學院研究龍類；這個世界沒有槍械，也禁止科幻文明。",
  worldBible:{startingLocation:"學院外城"},
  publicFacts:["魔法學院是王國的重要教育機構。","龍存在於北方山脈。"],
  hiddenFacts:[],worldHistory:[],
  generation:{locations:[{name:"魔法學院"}],npcs:[],factions:[],sideQuests:[]}
 };
 const report=validateWorldCreationCandidate(seed,candidate);
 assert.equal(report.valid,true,report.errors.join(","))
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

test("World Contract is a public projection and does not expose hidden truth",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(baseRaw()));
 const state={world:{seed:{},constitution:[]},player:{}};
 applyWorldCreationState(state,seed);
 state.world.hiddenState={truth:"玩家其實由古神召喚"};
 const contract=buildWorldContract(state);
 const text=JSON.stringify(contract);
 assert.equal(contract.difficulty,"困難");
 assert.equal(contract.origin,"被召喚");
 assert.ok(contract.unknown.includes("隱藏世界真相"));
 assert.equal(text.includes("玩家其實由古神召喚"),false)
});
