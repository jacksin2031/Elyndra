import test from "node:test";
import assert from "node:assert/strict";
import {firstButtonAutotestDecision,normalizeAutotestDecision} from "../src/ai-autotest.js";
import {createTimelinePacing,bindTimelineAuthoringSlots,validateWorldTimeline} from "../src/world-timeline.js";

const stalls=n=>Array.from({length:n},(_,i)=>({action:`stalled-${i}`,kind:"OBSERVE",progressed:false,targetId:null}));
const baseState=()=>({world:{id:"W",name:"W",state:{day:1,location:"Room",clock:{hour:9,minute:0}},registry:{locations:[{id:"L1",name:"Room",known:true}],npcs:[{id:"N1",name:"Guide",known:true,alive:true,locationId:"L1"}]}},player:{location:"Room",worldNameKnown:true,hp:10,maxHp:10,level:1},quests:{main:{title:"Goal",objectives:["Find a way onward"]}},suggestionIntents:[{label:"Ask Guide",action:"Ask Guide about another way forward",kind:"SOCIAL",progression:true,targetId:"N1"}],suggestions:[],inventory:[],knowledge:[],events:[],combat:{active:false}});

test("v0.59.8 hard stall recovery stays grounded when no travel route exists",()=>{
 const decision=firstButtonAutotestDecision(baseState(),stalls(5));
 assert.equal(decision.mode,"suggestion");
 assert.equal(decision.targetId,"N1");
 assert.notEqual(decision.kind,"TRAVEL");
});

test("v0.59.8 free decision normalization preserves explicit target metadata",()=>{
 const snapshot={combat:{active:false},suggestions:[]};
 const decision=normalizeAutotestDecision({mode:"free",action:"Go",kind:"TRAVEL",progression:true,targetId:"L2"},snapshot,[]);
 assert.equal(decision.kind,"TRAVEL");
 assert.equal(decision.progression,true);
 assert.equal(decision.targetId,"L2");
});

test("v0.59.8 future binding repairs missing or malformed slots before validation",()=>{
 const pacing=createTimelinePacing(15);
 const bound=bindTimelineAuthoringSlots([{title:"Only one",directorTruth:"A sufficiently detailed hidden cause.",observableEffect:"A sufficiently detailed visible consequence."}],pacing);
 assert.equal(bound.length,pacing.majorEventCount);
 const report=validateWorldTimeline(bound,pacing);
 assert.equal(report.valid,true,report.errors.join(","));
 assert.equal(report.timeline.length,pacing.majorEventCount);
});
