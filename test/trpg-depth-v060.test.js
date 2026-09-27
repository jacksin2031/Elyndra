import test from "node:test";
import assert from "node:assert/strict";
import {normalizeActionIntent,inferActionApproach} from "../src/action-intent.js";
import {buildResolutionOutcome,deriveResolutionTier,RESOLUTION_TIERS} from "../src/resolution-engine.js";
import {buildTurnOutcomeKernel} from "../src/turn-outcome.js";

test("TRPG Depth: Action Intent 2.0 preserves intent approach goal targets tools and stakes",()=>{
 const snapshot={registry:{npcs:[{id:"GIANT",name:"巨人",present:true}],locations:[]},inventory:[{id:"SWORD",name:"短劍"}]};
 const out=normalizeActionIntent({intent:"ATTACK",approach:"FINESSE",goal:"reduce_mobility",risk:"HIGH",targetId:"GIANT",toolId:"SWORD",stakes:{desiredOutcome:"讓巨人失去追擊能力",acceptedRisk:"暴露在近身攻擊範圍"},confidence:92},"我滑到巨人的兩腿之間，順便用短劍砍它膝蓋","RISKY",snapshot);
 assert.equal(out.intent,"ATTACK");assert.equal(out.kind,"RISKY");assert.equal(out.approach,"FINESSE");assert.equal(out.goal,"reduce_mobility");assert.deepEqual(out.targetIds,["GIANT"]);assert.deepEqual(out.toolIds,["SWORD"]);assert.equal(out.stakes.desiredOutcome,"讓巨人失去追擊能力");assert.equal(out.stakes.acceptedRisk,"暴露在近身攻擊範圍");assert.equal(out.confidence,92)
});

test("TRPG Depth: deterministic fallback understands deception creative and defensive approaches",()=>{
 assert.equal(inferActionApproach("我假裝喝醉騙過守衛","TALK","SOCIAL"),"DECEPTION");
 assert.equal(inferActionApproach("我砍斷吊燈繩索，利用吊燈逼退敵人","MANIPULATE","RISKY"),"CREATIVE");
 const defend=normalizeActionIntent({},"我架盾擋在同伴前面","RISKY",{});assert.equal(defend.intent,"DEFEND");assert.equal(defend.approach,"FORCE")
});

test("TRPG Depth: Resolution 2.0 exposes all five deterministic tiers",()=>{
 assert.deepEqual(RESOLUTION_TIERS,["CRITICAL_SUCCESS","STRONG_SUCCESS","SUCCESS_WITH_COST","FAILURE_WITH_OPPORTUNITY","CRITICAL_FAILURE"]);
 assert.equal(deriveResolutionTier({success:true,grade:"CRITICAL_SUCCESS",total:22,dc:15},{}),"CRITICAL_SUCCESS");
 assert.equal(deriveResolutionTier({success:true,grade:"SUCCESS",total:18,dc:12},{}),"STRONG_SUCCESS");
 assert.equal(deriveResolutionTier({success:true,grade:"SUCCESS",total:13,dc:12},{}),"SUCCESS_WITH_COST");
 assert.equal(deriveResolutionTier({success:false,grade:"FAILURE",total:10,dc:12},{}),"FAILURE_WITH_OPPORTUNITY");
 assert.equal(deriveResolutionTier({success:false,grade:"CRITICAL_FAILURE",total:2,dc:12},{}),"CRITICAL_FAILURE")
});

test("TRPG Depth: mixed success achieves the goal but emits an uncommitted semantic cost",()=>{
 const out=buildResolutionOutcome({roll:{success:true,grade:"SUCCESS",total:13,dc:12},intent:{approach:"STEALTH",kind:"RISKY",risk:"HIGH",goal:"get_key",stakes:{desiredOutcome:"get_key"}}});
 assert.equal(out.tier,"SUCCESS_WITH_COST");assert.equal(out.goalAchieved,true);assert.equal(out.costs.length,1);assert.equal(out.costs[0].type,"EXPOSURE");assert.equal(out.costs[0].committed,false);assert.deepEqual(out.stateChanges,[]);assert.equal(out.effectPolicy.semanticEffectsRequireCommit,true)
});

test("TRPG Depth: ordinary failure becomes fail-forward opportunity without rewriting success",()=>{
 const out=buildResolutionOutcome({roll:{success:false,grade:"FAILURE",total:10,dc:12},intent:{approach:"KNOWLEDGE",kind:"OBSERVE",risk:"LOW",goal:"identify_marks"}});
 assert.equal(out.tier,"FAILURE_WITH_OPPORTUNITY");assert.equal(out.goalAchieved,false);assert.equal(out.opportunities[0].type,"NEW_ANGLE");assert.equal(out.costs.length,0)
});

test("TRPG Depth: Turn Outcome Kernel v2 separates fiction mechanics and internal authority",()=>{
 const kernel=buildTurnOutcomeKernel({action:"撬開門鎖",intent:{intent:"INTERACT",kind:"RISKY",approach:"FINESSE",goal:"open_door",risk:"HIGH",stakes:{desiredOutcome:"open_door"}},roll:{success:true,grade:"SUCCESS",natural:11,total:13,dc:12,profile:{kind:"RISKY"}},snapshot:{world:{location:"舊倉庫"},knownFacts:["門鎖已嚴重鏽蝕"],registry:{npcs:[]},companions:[]}});
 assert.equal(kernel.version,2);assert.equal(kernel.resolution.tier,"SUCCESS_WITH_COST");assert.equal(kernel.fiction.goalAchieved,true);assert.equal(kernel.mechanics.outcome.tier,"SUCCESS_WITH_COST");assert.ok(kernel.authority.engineOwns.includes("resolution"));assert.ok(kernel.authority.engineOwns.includes("mechanics"));assert.doesNotMatch(kernel.confirmedOutcome,/Engine 已確認|State Director|commit/i)
});
