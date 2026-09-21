import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sceneTurnSnapshot,mergeTurnCandidates} from "../src/turn-compiler.js";

test("turn merge keeps structured Scene suggestions separate from authoritative state",()=>{
 const scene={narrative:"你推開門，冷風迎面而來。",suggestions:[
  {label:"看看走廊",action:"檢查走廊兩側的新鮮痕跡",kind:"OBSERVE",risk:"LOW",targetId:null,skillHint:"觀察"},
  {label:"聽腳步聲",action:"停下來辨認腳步聲的方向",kind:"OBSERVE",risk:"LOW",targetId:null,skillHint:null}
 ]};
 const state={outcomeSummary:"門被打開。",location:"北廊",worldNameKnown:false,calendarKnown:false,discoveries:[{title:"痕跡",text:"地上有新腳印"}],items:[],npcChanges:[],companionChanges:[],factionChanges:[],quest:null,entityReveals:[],encounter:null,generation:null,worldImpacts:[]};
 const out=mergeTurnCandidates(scene,state,{success:true});
 assert.equal(out.narrative,scene.narrative);assert.equal(out.location,"北廊");
 assert.deepEqual(out.discoveries,state.discoveries);
 assert.deepEqual(out.suggestions,["看看走廊","聽腳步聲"]);
 assert.equal(out.suggestionIntents[0].action,"檢查走廊兩側的新鮮痕跡")
});

test("scene failure degrades to State outcome summary without discarding state",()=>{
 const state={outcomeSummary:"你未能打開石門，但鎖芯發出清晰裂響。",worldImpacts:[],npcChanges:[],factionChanges:[],companionChanges:[],discoveries:[],items:[],entityReveals:[]};
 const out=mergeTurnCandidates(null,state,{success:false});
 assert.equal(out.narrative,state.outcomeSummary);assert.deepEqual(out.worldImpacts,[]);assert.deepEqual(out.suggestions,[])
});

test("Scene snapshot excludes Director layers and receives Player Knowledge only",()=>{
 const snap={world:{name:"UNKNOWN"},player:{name:"A"},knownFacts:["x"],knowledge:[],inventory:[],quest:null,recentEvents:[],runtimeSummary:"",factions:[],registry:[],companions:[],recognition:{tier:"UNKNOWN",titles:[],activeRumors:[]},knowledgeLayers:{version:1,canonTruth:{secret:true},directorKnowledge:{secret:true},playerKnowledge:{verifiedFactIds:["F1"],entries:[]}},directorRegistry:{secret:true},directorTimeline:[{directorTruth:"secret"}],directorHistory:[{summary:"secret history"}],worldImpact:{capability:{maxScope:"WORLD"}}};
 const out=sceneTurnSnapshot(snap);
 assert.equal(out.directorRegistry,undefined);assert.equal(out.directorTimeline,undefined);assert.equal(out.directorHistory,undefined);assert.equal(out.worldImpact,undefined);
 assert.equal(out.knowledgeLayers.canonTruth,undefined);assert.equal(out.knowledgeLayers.directorKnowledge,undefined);
 assert.deepEqual(out.knowledgeLayers.playerKnowledge.verifiedFactIds,["F1"])
});

test("Direct and server turns share Outcome Kernel and keep max two concurrent AI calls",async()=>{
 const [client,server,contracts]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../api/turn.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-runtime-contracts.js",import.meta.url),"utf8")
 ]);
 const direct=client.slice(client.indexOf("export async function generateTurn"),client.indexOf("export async function generateDeferredTurnEffects"));
 assert.equal((direct.match(/const scenePromise=directChat\(\{/g)||[]).length,1);
 assert.equal((direct.match(/StatePromise=\(\)=>directChat\(\{/g)||[]).length,2);
 assert.match(direct,/buildTurnOutcomeKernel/);
 assert.match(direct,/sceneInput=\{action,intent:actionIntent,kernel,snapshot:sceneTurnSnapshot\(snapshot\)\}/);
 assert.match(direct,/stateInput=\{action,intent:actionIntent,kernel,snapshot:directorMode==="DEEP"\?snapshot:fastTurnStateSnapshot\(snapshot\)\}/);
 assert.match(direct,/Promise\.allSettled\(\[scenePromise,statePromise\]\)/);
 assert.match(direct,/sceneNarratorSystem\(\)/);assert.match(direct,/stateDirectorSystem\("FAST"\)/);assert.match(direct,/stateDirectorSystem\("DEEP"\)/);
 assert.equal((server.match(/callModel\(\{/g)||[]).length,2);
 assert.match(server,/buildTurnOutcomeKernel/);assert.match(server,/sceneNarratorSystem\(\)/);assert.match(server,/stateDirectorSystem\(serverStateMode\)/);
 assert.match(contracts,/confirmedOutcome 是本回合唯一結果骨架/)
});
