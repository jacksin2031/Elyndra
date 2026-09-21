import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sceneTurnSnapshot,mergeTurnCandidates} from "../src/turn-compiler.js";

test("turn merge keeps scene prose separate from authoritative state mutations",()=>{
 const scene={narrative:"你推開門，冷風迎面而來。",suggestions:["看看走廊","聽腳步聲"]};
 const state={outcomeSummary:"門被打開。",location:"北廊",worldNameKnown:false,calendarKnown:false,discoveries:[{title:"痕跡",text:"地上有新腳印"}],items:[],npcChanges:[],companionChanges:[],factionChanges:[],quest:null,entityReveals:[],encounter:null,generation:null,worldImpacts:[]};
 const out=mergeTurnCandidates(scene,state,{success:true});
 assert.equal(out.narrative,scene.narrative);
 assert.equal(out.location,"北廊");
 assert.deepEqual(out.discoveries,state.discoveries);
 assert.deepEqual(out.suggestions,scene.suggestions);
});

test("scene failure degrades to state outcome summary without discarding state",()=>{
 const state={outcomeSummary:"你未能打開石門，但鎖芯發出清晰裂響。",worldImpacts:[],npcChanges:[],factionChanges:[],companionChanges:[],discoveries:[],items:[],entityReveals:[]};
 const out=mergeTurnCandidates(null,state,{success:false});
 assert.equal(out.narrative,state.outcomeSummary);
 assert.deepEqual(out.worldImpacts,[]);
 assert.deepEqual(out.suggestions,[]);
});

test("scene snapshot excludes director-only mutation context",()=>{
 const snap={world:{name:"UNKNOWN"},player:{name:"A"},knownFacts:["x"],knowledge:[],inventory:[],quest:null,recentEvents:[],runtimeSummary:"",factions:[],registry:[],companions:[],recognition:{tier:"UNKNOWN",titles:[],activeRumors:[]},directorRegistry:{secret:true},directorTimeline:[{directorTruth:"secret"}],directorHistory:[{summary:"secret history"}],worldImpact:{capability:{maxScope:"WORLD"}}};
 const out=sceneTurnSnapshot(snap);
 assert.equal(out.directorRegistry,undefined);
 assert.equal(out.directorTimeline,undefined);
 assert.equal(out.directorHistory,undefined);
 assert.equal(out.worldImpact,undefined);
 assert.equal(out.recognition.tier,"UNKNOWN");
});

test("direct and server turn generation never exceed two concurrent AI calls",async()=>{
 const [client,server]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../api/turn.js",import.meta.url),"utf8")
 ]);
 const directBlock=client.slice(client.indexOf("export async function generateTurn"),client.indexOf("export async function generateDeferredTurnEffects"));
 assert.equal((directBlock.match(/const scenePromise=directChat\(\{/g)||[]).length,1);
 assert.equal((directBlock.match(/StatePromise=\(\)=>directChat\(\{/g)||[]).length,2);
 assert.match(directBlock,/const statePromise=directorMode==="DEEP"\?deepStatePromise\(\):fastStatePromise\(\)/);
 assert.match(directBlock,/Promise\.allSettled\(\[scenePromise,statePromise\]\)/);
 assert.match(directBlock,/Scene Narrator/);
 assert.match(directBlock,/Fast Turn State Director/);
 assert.match(directBlock,/State Director/);
 assert.equal((server.match(/callModel\(\{/g)||[]).length,2);
 assert.match(server,/Promise\.allSettled\(\[scenePromise,statePromise\]\)/);
});

test("only Deep State Director receives director-only full snapshot",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const block=client.slice(client.indexOf("export async function generateTurn"),client.indexOf("export async function generateDeferredTurnEffects"));
 assert.match(block,/sceneInput=\{action,roll,snapshot:sceneTurnSnapshot\(snapshot\)\}/);
 assert.match(block,/stateInput=\{action,roll,snapshot:directorMode==="DEEP"\?snapshot:fastTurnStateSnapshot\(snapshot\)\}/);
 assert.match(block,/directorMode==="DEEP"\?deepStatePromise\(\):fastStatePromise\(\)/);
 assert.match(block,/Scene Narrator[^]*?不可以修改世界狀態/);
});
