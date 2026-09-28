import test from "node:test";
import assert from "node:assert/strict";
import {createWorldCreationDraft,compileWorldCreation,validateWorldCreationCandidate} from "../src/v06022-world-creation-hotfix.js";

const REQUIRED="魔法は希少（使い手は人口の約二割）";
function raw(overrides={}){return {masterSeed:"v06022-required-magic",worldStyle:"王道奇幻",worldScale:"中型",difficulty:"normal",originType:"crossing",playerRole:"ordinary",requiredElements:REQUIRED,allowedElements:"",forbiddenElements:"",magicLevel:7,magicLevelMode:"style",customWorldDescription:"霧の港町。",storyPreferences:"",...overrides}}
function candidate(seed,summary){return {worldTheme:"霧の港町",summary,worldBible:{startingLocation:"波止場",blueprintProfile:structuredClone(seed.blueprintProfile)},publicFacts:[],hiddenFacts:[],worldHistory:[],worldTimeline:[],generation:{locations:[{name:"波止場"}],npcs:[],factions:[],sideQuests:[]}}}

test("v0.60.22 required rare-magic tag constrains Blueprint even without duplicate freeform text",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(raw()));
 assert.equal(seed.blueprintProfile.magicLevel.value,2);
 assert.equal(seed.blueprintProfile.magicLevel.source,"USER");
 assert.equal(seed.creationV2.blueprint.rules.required[0],REQUIRED);
 assert.ok(seed.creationV2.constitution.hardRules.some(x=>x.kind==="REQUIRE"&&x.term===REQUIRED));
 assert.match(seed.prompt,/魔法2\/10/);
 assert.match(seed.prompt,/魔法は希少（使い手は人口の約二割）/)
});

test("v0.60.22 Constitution accepts semantic Japanese paraphrase of rare magic plus about 20 percent users",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(raw()));
 const report=validateWorldCreationCandidate(seed,candidate(seed,"この世界では魔術は非常に希少で、魔法の使い手は人口のおよそ20%に限られている。"));
 assert.equal(report.valid,true,report.errors.join(","));
 assert.equal(report.errors.some(x=>x===`WC2_REQUIRED_MISSING:${REQUIRED}`),false);
 assert.equal(report.compliance.MUST_EXIST_COMPLIANCE.status,"PASS")
});

test("v0.60.22 Constitution accepts equivalent 二割 wording without requiring the literal preset label",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(raw()));
 const report=validateWorldCreationCandidate(seed,candidate(seed,"魔法は珍しく、住民の二割ほどだけが術を扱える。"));
 assert.equal(report.valid,true,report.errors.join(","))
});

test("v0.60.22 does not weaken the hard rule to magic-only or rarity-only evidence",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(raw()));
 let report=validateWorldCreationCandidate(seed,candidate(seed,"魔法は希少で、限られた者だけが使える。"));
 assert.equal(report.valid,false);
 assert.ok(report.errors.includes(`WC2_REQUIRED_MISSING:${REQUIRED}`));
 report=validateWorldCreationCandidate(seed,candidate(seed,"人口の約20%が特別な職能を持つが、魔法については何も定められていない。"));
 assert.equal(report.valid,false);
 assert.ok(report.errors.includes(`WC2_REQUIRED_MISSING:${REQUIRED}`))
});

test("v0.60.22 keeps explicit locked magic level authoritative",()=>{
 const seed=compileWorldCreation(createWorldCreationDraft(raw({magicLevel:6,magicLevelMode:"fixed",magicLevelLocked:true})));
 assert.equal(seed.blueprintProfile.magicLevel.value,6);
 assert.equal(seed.blueprintProfile.magicLevel.source,"USER")
});
