import test from "node:test";
import assert from "node:assert/strict";
import {deriveDirtyFlags,planStateSync,deferredPlanFrom,ensureStateSyncRuntime,currentStateRevision,bumpStateRevision,statePatchSchema,validateStatePatch,statePatchToCandidate,assessPatchRevision} from "../src/state-sync.js";

const snapshot=()=>({stateRevision:4,recentEvents:[],registry:{npcs:[],locations:[]},world:{location:"石室"}});

test("ENGINE_ONLY removes State AI from passive known and Engine-resolved actions",()=>{
 for(const [action,intent,ruleEffects] of [
  ["查看桌面",{intent:"OBSERVE",kind:"OBSERVE"},null],
  ["向守衛打招呼",{intent:"TALK",kind:"SOCIAL"},null],
  ["休息",{intent:"REST",kind:"GENERAL"},{utility:{ok:true}}],
  ["吃食物",{intent:"EAT",kind:"GENERAL"},{item:{ok:true}}],
  ["沿已知道路走到隔壁房間",{intent:"TRAVEL",kind:"TRAVEL"},{travel:{ok:true}}]
 ]){
  const p=planStateSync({action,intent,roll:{success:true,profile:{kind:intent.kind}},snapshot:snapshot(),ruleEffects});
  assert.equal(p.mode,"ENGINE_ONLY",action);assert.equal(p.requiresStateAI,false)
 }
});

test("Dirty Flags grant only causally relevant capabilities",()=>{
 const observe=planStateSync({action:"仔細檢查門上的新血跡",intent:{intent:"OBSERVE",kind:"OBSERVE"},roll:{success:true,profile:{kind:"OBSERVE"}},snapshot:snapshot()});
 assert.equal(observe.mode,"FAST");assert.equal(observe.dirtyFlags.knowledge,true);assert.equal(observe.dirtyFlags.entityReveal,true);
 assert.deepEqual(observe.capabilities.sort(),["DISCOVER_FACT","REVEAL_ENTITY"].sort());

 const social=planStateSync({action:"說服守衛讓我通過",intent:{intent:"PERSUADE",kind:"SOCIAL"},roll:{success:true,profile:{kind:"SOCIAL"}},snapshot:snapshot()});
 assert.equal(social.mode,"DEFERRED");assert.deepEqual(social.capabilities,["NPC_RELATIONSHIP_SIGNAL"]);

 const deep=planStateSync({action:"摧毀城市核心並推翻國王",intent:{intent:"GENERAL",kind:"RISKY"},roll:{success:true,profile:{kind:"RISKY"}},snapshot:snapshot()});
 assert.equal(deep.mode,"DEEP");assert.equal(deep.blocking,true);assert.ok(deep.capabilities.includes("WORLD_IMPACT_SIGNAL"));assert.ok(deep.capabilities.includes("TIMELINE_SIGNAL"))
});

test("FAST exposes immediate capabilities and moves persistent tail to Deferred",()=>{
 const flags=deriveDirtyFlags({action:"質問守衛並檢查他手上的血跡",intent:{intent:"OBSERVE",kind:"OBSERVE"},roll:{success:true,profile:{kind:"OBSERVE"}},snapshot:snapshot()});
 flags.npcRelation=true;
 const p=planStateSync({action:"質問守衛並檢查他手上的血跡",intent:{intent:"OBSERVE",kind:"OBSERVE"},roll:{success:true,profile:{kind:"OBSERVE"}},snapshot:snapshot(),kernel:{dirtyFlags:flags}});
 assert.equal(p.mode,"FAST");assert.ok(p.immediateCapabilities.includes("DISCOVER_FACT"));assert.ok(p.deferredCapabilities.includes("NPC_RELATIONSHIP_SIGNAL"));assert.equal(p.hasDeferredConsequences,true);
 const deferred=deferredPlanFrom(p,9);assert.equal(deferred.mode,"DEFERRED");assert.deepEqual(deferred.capabilities,["NPC_RELATIONSHIP_SIGNAL"]);assert.equal(deferred.baseRevision,9)
});

test("capability schema never exposes unrelated mutation classes",()=>{
 const schema=statePatchSchema({baseRevision:7,capabilities:["DISCOVER_FACT","NPC_RELATIONSHIP_SIGNAL"]});
 assert.match(schema,/DISCOVER_FACT/);assert.match(schema,/NPC_RELATIONSHIP_SIGNAL/);assert.doesNotMatch(schema,/FACTION_REPUTATION_SIGNAL/);assert.doesNotMatch(schema,/WORLD_IMPACT_SIGNAL/)
});

test("StatePatch rejects operations outside Engine whitelist and base revision mismatch",()=>{
 const plan={baseRevision:2,capabilities:["DISCOVER_FACT"]};
 const extra={baseRevision:2,operations:[{op:"WORLD_IMPACT_SIGNAL",targetKind:"world",targetId:"WORLD",axis:"tension",effect:"MAJOR_POSITIVE"}]};
 assert.equal(validateStatePatch(extra,plan).valid,false);
 const stale={baseRevision:1,operations:[]};const v=validateStatePatch(stale,plan);assert.equal(v.valid,false);assert.ok(v.errors.includes("STATE_PATCH_BASE_REVISION_MISMATCH"))
});

test("semantic relationship and impact operations remain semantic through adapter",()=>{
 const patch={baseRevision:0,operations:[
  {op:"NPC_RELATIONSHIP_SIGNAL",npcId:"N1",effect:"MAJOR_POSITIVE"},
  {op:"FACTION_REPUTATION_SIGNAL",factionId:"F1",effect:"MINOR_NEGATIVE"},
  {op:"WORLD_IMPACT_SIGNAL",scope:"WORLD",targetKind:"world",targetId:"WORLD",axis:"tension",effect:"POSITIVE",title:"局勢升溫",summary:"衝突擴大",reason:"玩家行動",outcome:"COST"}
 ]};
 const plan={baseRevision:0,capabilities:["NPC_RELATIONSHIP_SIGNAL","FACTION_REPUTATION_SIGNAL","WORLD_IMPACT_SIGNAL"]};
 assert.equal(validateStatePatch(patch,plan).valid,true);
 const c=statePatchToCandidate(patch,{narrative:"ok",suggestions:[],suggestionIntents:[]});
 assert.equal(c.npcChanges[0].trustEffect,"MAJOR_POSITIVE");assert.equal(c.factionChanges[0].reputationEffect,"MINOR_NEGATIVE");
 assert.equal(c.worldImpacts[0].mutations[0].effect,"POSITIVE");assert.equal("value" in c.worldImpacts[0].mutations[0],false)
});

test("State Revision blocks stale immediate patches but permits safe Deferred rebase",()=>{
 const state={};ensureStateSyncRuntime(state);assert.equal(currentStateRevision(state),0);bumpStateRevision(state,"ENGINE_ACTION");assert.equal(currentStateRevision(state),1);
 const immediate={baseRevision:0,operations:[{op:"DISCOVER_FACT",title:"線索",text:"內容",evidenceType:"OBSERVED"}]};
 assert.equal(assessPatchRevision(state,immediate,{mode:"FAST"}).ok,false);
 const deferred={baseRevision:0,operations:[{op:"NPC_RELATIONSHIP_SIGNAL",npcId:"N1",effect:"MINOR_POSITIVE"}]};
 const r=assessPatchRevision(state,deferred,{mode:"DEFERRED"});assert.equal(r.ok,true);assert.equal(r.rebased,true)
});
