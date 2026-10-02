import test from "node:test";
import assert from "node:assert/strict";
import {talentActionModifier,talentSnapshot} from "../src/talent-engine.js";
import {commitNpcInsightTalent,interceptCompanionHarmWithTalent,mitigateTravelFailureWithTalent,planNpcInsightTalent,talentUseAvailable,useImprovisedToolTalent} from "../src/talent-rules.js";

function fixture(talents=[]){
 return {world:{id:"w1",state:{day:2,clock:{totalMinutes:600}},registry:{npcs:[],locations:[]}},player:{name:"旅人",location:"北門",talents:talents.map(id=>({id})),talentPoints:0,skills:{OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:0}},events:[]}
}

test("Talent 2.0 rule talents no longer collapse into static +1 bonuses",()=>{
 const state=fixture(["TAL-INTEL-2","TAL-SURVIVAL-3","TAL-VANGUARD-2","TAL-ADAPT-2"]),snap=talentSnapshot(state);
 assert.equal(talentActionModifier(state,"SOCIAL"),0);assert.equal(talentActionModifier(state,"TRAVEL"),0);assert.equal(talentActionModifier(state,"RISKY"),0);assert.equal(talentActionModifier(state,"GENERAL"),0);
 for(const id of ["TAL-INTEL-2","TAL-SURVIVAL-3","TAL-VANGUARD-2","TAL-ADAPT-2"]){const row=snap.owned.find(x=>x.id===id);assert.ok(row?.rule?.type);assert.ok(row?.rule?.trigger)}
});

test("就地取材 grants an Engine permission once per location-day scene",()=>{
 const state=fixture(["TAL-ADAPT-2"]);const first=useImprovisedToolTalent(state,{label:"我就地取材，用附近的木片做成臨時工具撬開卡住的盒蓋"});
 assert.equal(first.applied,true);assert.equal(first.permission,"ORDINARY_ENVIRONMENT_AS_TOOL");assert.equal(first.checkBonus,1);assert.equal(useImprovisedToolTalent(state,{label:"我再次就地取材"}).applied,false);
 state.world.state.day=3;assert.equal(talentUseAvailable(state,"TAL-ADAPT-2"),true)
});

test("追跡者視野 converts travel danger/position consequence into time without rewriting failure",()=>{
 const state=fixture(["TAL-SURVIVAL-3"]),resolution={tier:"FAILURE_WITH_OPPORTUNITY",goalAchieved:false};const result=mitigateTravelFailureWithTalent(state,{baseMinutes:40,resolution});
 assert.equal(result.applied,true);assert.deepEqual(result.conversion,{from:"DANGER_OR_POSITION",to:"TIME"});assert.equal(result.extraMinutes,20);assert.equal(resolution.goalAchieved,false);assert.equal(mitigateTravelFailureWithTalent(state,{baseMinutes:40,resolution}).applied,false)
});

test("迎擊姿態 intercepts companion harm once per combat round and reduces severity",()=>{
 const state=fixture(["TAL-VANGUARD-2"]);state.combat={round:2,encounter:{id:"enc-1"}};const first=interceptCompanionHarmWithTalent(state,{damage:7});
 assert.equal(first.applied,true);assert.equal(first.redirectedToPlayer,4);assert.equal(first.prevented,1);assert.equal(first.companionDamage,2);const sameRound=interceptCompanionHarmWithTalent(state,{damage:7});assert.equal(sameRound.applied,false);assert.equal(sameRound.companionDamage,7);
 state.combat.round=3;assert.equal(interceptCompanionHarmWithTalent(state,{damage:4}).applied,true)
});

test("讀懂弦外之音 exposes only an Engine-bounded agency clue and consumes on commit",()=>{
 const state=fixture(["TAL-INTEL-2"]),agency={disposition:"WARY",policy:"HONOR_COMMITMENT",priority:"GOAL",nextStep:"ADVANCE_GOAL",socialStance:"NEUTRAL"};const plan=planNpcInsightTalent(state,{npcId:"npc-a",message:"我想讀懂弦外之音，看出他在迴避什麼。",agency});
 assert.ok(plan);assert.equal(plan.pendingUse,true);assert.match(plan.clue,/承諾/);assert.doesNotMatch(JSON.stringify(plan),/trust|respect|fear|obligation|\b\d{2,3}\b/i);assert.equal(talentUseAvailable(state,"TAL-INTEL-2",{scope:"NPC_SCENE",targetId:"npc-a"}),true);
 const committed=commitNpcInsightTalent(state,plan);assert.equal(committed.applied,true);assert.equal(talentUseAvailable(state,"TAL-INTEL-2",{scope:"NPC_SCENE",targetId:"npc-a"}),false);assert.ok(state.events.some(x=>x.type==="TALENT_RULE_USED"&&x.talentId==="TAL-INTEL-2"))
});

import {readFile,readdir} from "node:fs/promises";

test("Talent 2.0 is wired into game, combat and NPC conversation authority and discovered by the full-suite runner",async()=>{
 const [game,combat,agency,conversation,client,pages,runner,packageText,testFiles]=await Promise.all([
  readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/combat-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/npc-agency-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/npc-conversation.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8"),readFile(new URL("../scripts/run-tests.mjs",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8"),readdir(new URL("./",import.meta.url))
 ]);
 assert.match(game,/useImprovisedToolTalent/);assert.match(game,/mitigateTravelFailureWithTalent/);assert.match(game,/buildResolutionOutcome/);
 assert.match(combat,/interceptCompanionHarmWithTalent/);assert.match(agency,/ROLEPLAY_WITH_ENGINE_APPROVED_INSIGHT_ONLY/);assert.match(conversation,/requiresCommit/);assert.match(client,/approvedInsight/);
 assert.match(pages,/name: Full regression suite\s+run: npm test/);
 assert.equal(JSON.parse(packageText).scripts.test,"npm run version:check && npm run cache:check && node scripts/check-js.mjs && node scripts/run-tests.mjs");
 assert.match(runner,/readdirSync\(dir\)\.filter\(name=>name\.endsWith\("\.test\.js"\)\)/);
 assert.match(runner,/spawnSync\(process\.execPath,\["--test",\.\.\.files\]/);
 assert.ok(testFiles.filter(name=>name.endsWith(".test.js")).includes("talent-rules-v0604.test.js"));
});
