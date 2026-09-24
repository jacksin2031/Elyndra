import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {buildContextualActionSet,evaluateSuggestionRequirements,trustedSuggestionAssessment} from "../src/contextual-actions.js";
import {groundStatePatch,projectDeferredSceneEvidence} from "../src/state-sync.js";
import {parseModelJSON} from "../src/model-json.js";

function state(){return {
 world:{id:"W1",state:{day:1,location:"裂縫"},registry:{locations:[{id:"L1",name:"裂縫",known:true},{id:"L2",name:"枯脈祭壇",known:true}],npcs:[]},travel:{routes:[{id:"R1",fromId:"L1",toId:"L2",open:true}]},canon:{facts:[]}},
 player:{location:"裂縫",magic:{capacity:100,strain:0,knownSpells:[],attunements:[]},skills:{},talents:[],capabilities:[]},inventory:[],events:[],knowledge:[]
}}

test("v0.56.1 rejects generic magic manipulation when player has no learned magic capability",()=>{
 const r=evaluateSuggestionRequirements(state(),{label:"以靈息探查",action:"運用少量靈息感知周圍，試圖穿透介質或引發反應。",kind:"GENERAL",risk:"MEDIUM",approach:"CREATIVE",causalBasis:"測試",requirementsSatisfied:true,requiredItemIds:[],requiredCapabilities:[]});
 assert.equal(r.ok,false);assert.ok(r.reasons.includes("IMPLIED_CAPABILITY_MISSING:MAGIC_USE"))
});

test("v0.56.1 local exploration is not trusted as canonical TRAVEL",()=>{
 const s=state(),action="沿著石壁夾縫向前探索，確認狹窄通道是否有進一步的開口。",set=buildContextualActionSet(s,[{label:"沿夾縫前進",action,kind:"TRAVEL",risk:"LOW",approach:"STEADY",progression:true,causalBasis:"眼前有夾縫",requirementsSatisfied:true,requiredItemIds:[],requiredCapabilities:[]}]);
 const row=set.all.find(x=>x.action===action);assert.ok(row);assert.notEqual(row.kind,"TRAVEL");
 const assessment=trustedSuggestionAssessment(s,row);assert.ok(assessment);assert.notEqual(assessment.actionIntent.intent,"TRAVEL")
});

test("v0.56.1 explicit known destination remains canonical TRAVEL",()=>{
 const s=state(),action="前往枯脈祭壇，離開目前位置。",set=buildContextualActionSet(s,[{label:"前往祭壇",action,kind:"TRAVEL",risk:"LOW",approach:"STEADY",progression:true,targetId:"L2",causalBasis:"已知路線",requirementsSatisfied:true,requiredItemIds:[],requiredCapabilities:[]}]);
 const row=set.all.find(x=>x.action===action);assert.ok(row);assert.equal(row.kind,"TRAVEL");const assessment=trustedSuggestionAssessment(s,row);assert.equal(assessment.actionIntent.intent,"TRAVEL")
});

test("v0.56.1 pending state discovery is projected from actual scene evidence",()=>{
 const s=state(),raw={op:"DISCOVER_FACT",title:"低頻嗡鳴的節律指向北偏東",text:"低頻嗡鳴整體指向北偏東。",factId:"obs-1",evidenceType:"OBSERVED",sourceKind:"LOCATION",sourceId:"L1"},scene="你閉上雙眼細聽低頻嗡鳴；聲源在左前方較強，右後方較弱。";
 const pending=groundStatePatch(s,{baseRevision:0,operations:[raw]},{observableText:"",evidencePhase:"STATE_PENDING"});assert.equal(pending.rejected.length,0);assert.equal(pending.deferredEvidence.length,1);
 const projected=projectDeferredSceneEvidence(pending.deferredEvidence,scene);assert.equal(projected.length,1);assert.equal(projected[0].title,"本回合確認到的可觀察線索");assert.equal(projected[0].text,scene);
 const grounded=groundStatePatch(s,{baseRevision:0,operations:projected},{observableText:scene,evidencePhase:"SCENE"});assert.equal(grounded.rejected.length,0);assert.equal(grounded.patch.operations.length,1)
});

test("v0.56.1 parser accepts first balanced JSON when provider appends another value",()=>{
 assert.deepEqual(parseModelJSON('{"ok":true}\n{"extra":1}'),{ok:true});assert.deepEqual(parseModelJSON('prefix {"a":[1,2]} trailing prose'),{a:[1,2]})
});

test("v0.56.1 autotest finalizer is called once per generated world path",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),matches=app.match(/await finalizeDeveloperAutotestWorld\(config\);/g)||[];assert.equal(matches.length,2);assert.match(app,/projectDeferredSceneEvidence\(rows,context\?\.observableText\)/)
});
