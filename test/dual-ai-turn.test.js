import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sceneTurnSnapshot,mergeTurnCandidates} from "../src/turn-compiler.js";
import {sceneNarratorSystem,stateDirectorSystem} from "../src/ai-runtime-contracts.js";

test("turn merge keeps Player Action prose separate from authoritative State Sync mutations",()=>{
 const scene={narrative:"你推開門，冷風迎面而來。",suggestions:[{label:"看看走廊",action:"檢查門後走廊",kind:"OBSERVE",risk:"LOW"},{label:"聽腳步聲",action:"停下來聆聽腳步聲",kind:"OBSERVE",risk:"LOW"}]};
 const state={outcomeSummary:"門被打開。",location:"北廊",worldNameKnown:false,calendarKnown:false,discoveries:[{title:"痕跡",text:"地上有新腳印"}],items:[],npcChanges:[],companionChanges:[],factionChanges:[],quest:null,entityReveals:[],encounter:null,generation:null,worldImpacts:[]};
 const out=mergeTurnCandidates(scene,state,{success:true});
 assert.equal(out.narrative,scene.narrative);
 assert.equal(out.location,"北廊");
 assert.deepEqual(out.discoveries,state.discoveries);
 assert.deepEqual(out.suggestions,["看看走廊","聽腳步聲"]);
 assert.equal(out.suggestionIntents[0].action,"檢查門後走廊")
});

test("Player Action failure can still degrade to State Sync outcome summary",()=>{
 const state={outcomeSummary:"你未能打開石門，但鎖芯發出清晰裂響。",worldImpacts:[],npcChanges:[],factionChanges:[],companionChanges:[],discoveries:[],items:[],entityReveals:[]};
 const out=mergeTurnCandidates(null,state,{success:false});
 assert.equal(out.narrative,state.outcomeSummary);
 assert.deepEqual(out.worldImpacts,[]);
 assert.deepEqual(out.suggestions,[])
});

test("Player Action snapshot excludes Director knowledge and keeps only Player Knowledge",()=>{
 const snap={world:{name:"UNKNOWN"},player:{name:"A"},knownFacts:["x"],knowledge:[],knowledgeLayers:{version:1,canonTruth:{facts:[{id:"SECRET"}]},directorKnowledge:{hiddenFactIds:["SECRET"]},playerKnowledge:{verifiedFactIds:["PUBLIC"],entries:[]}},inventory:[],quest:null,recentEvents:[],runtimeSummary:"",factions:[],registry:[],companions:[],recognition:{tier:"UNKNOWN",titles:[],activeRumors:[]},directorRegistry:{secret:true},directorTimeline:[{directorTruth:"secret"}],directorHistory:[{summary:"secret history"}],worldImpact:{capability:{maxScope:"WORLD"}}};
 const out=sceneTurnSnapshot(snap);
 assert.equal(out.directorRegistry,undefined);
 assert.equal(out.directorTimeline,undefined);
 assert.equal(out.directorHistory,undefined);
 assert.equal(out.worldImpact,undefined);
 assert.equal(out.knowledgeLayers.canonTruth,undefined);
 assert.deepEqual(out.knowledgeLayers.playerKnowledge.verifiedFactIds,["PUBLIC"])
});

test("Player Action AI and State Sync AI share one Engine Outcome Kernel",()=>{
 const scene=sceneNarratorSystem(),state=stateDirectorSystem("DEEP");
 assert.match(scene,/Turn Outcome Kernel/);
 assert.match(scene,/confirmedOutcome/);
 assert.match(state,/Turn Outcome Kernel/);
 assert.match(state,/confirmedOutcome/)
});

test("direct transport starts dedicated Player Action and State Sync promises",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const block=client.slice(client.indexOf("export function startTurnAIJobs"),client.indexOf("export function finalizeTurnAIJobs"));
 assert.match(block,/const playerAction=directChat\(\{/);
 assert.match(block,/const stateSync=directChat\(\{/);
 assert.match(block,/aiTask:"scene"/);
 assert.match(block,/aiTask:stateMode==="DEEP"\?"turn_state_deep":"turn_state_fast"/);
 assert.match(block,/return \{playerAction,stateSync,directorMode,stateMode,actionIntent,kernel,transport:"direct"\}/)
});

test("server transport uses separate Player Action and State Sync endpoints",async()=>{
 const [client,sceneApi,stateApi]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../api/turn-scene.js",import.meta.url),"utf8"),
  readFile(new URL("../api/turn-state.js",import.meta.url),"utf8")
 ]);
 assert.match(client,/post\("\/api\/turn-scene",payload\)/);
 assert.match(client,/post\("\/api\/turn-state",payload\)/);
 assert.equal((sceneApi.match(/callModel\(\{/g)||[]).length,1);
 assert.equal((stateApi.match(/callModel\(\{/g)||[]).length,1);
 assert.match(sceneApi,/sceneNarratorSystem/);
 assert.match(stateApi,/stateDirectorSystem/);
 assert.match(stateApi,/validateKernelBoundaries/)
});

test("compatibility generateTurn wrapper still runs both jobs safely",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const block=client.slice(client.indexOf("export async function generateTurn"),client.indexOf("export async function generateDeferredTurnEffects"));
 assert.match(block,/startTurnAIJobs/);
 assert.match(block,/Promise\.allSettled\(\[jobs\.playerAction,jobs\.stateSync\]\)/);
 assert.match(block,/finalizeTurnAIJobs/)
});
