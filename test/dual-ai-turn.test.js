import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sceneTurnSnapshot,mergeTurnCandidates} from "../src/turn-compiler.js";
import {sceneNarratorSystem,stateDirectorSystem} from "../src/ai-runtime-contracts.js";

test("turn merge keeps Scene prose separate from authoritative State mutations",()=>{
 const scene={narrative:"你推開門，冷風迎面而來。",suggestions:[{label:"看看走廊",action:"檢查門後走廊",kind:"OBSERVE",risk:"LOW"},{label:"聽腳步聲",action:"停下來聆聽腳步聲",kind:"OBSERVE",risk:"LOW"}]};
 const state={outcomeSummary:"門被打開。",location:"北廊",worldNameKnown:false,calendarKnown:false,discoveries:[{title:"痕跡",text:"地上有新腳印"}],items:[],npcChanges:[],companionChanges:[],factionChanges:[],quest:null,entityReveals:[],encounter:null,generation:null,worldImpacts:[]};
 const out=mergeTurnCandidates(scene,state,{success:true});
 assert.equal(out.narrative,scene.narrative);
 assert.equal(out.location,"北廊");
 assert.deepEqual(out.discoveries,state.discoveries);
 assert.deepEqual(out.suggestions,["看看走廊","聽腳步聲"]);
 assert.equal(out.suggestionIntents[0].action,"檢查門後走廊")
});

test("scene failure degrades to State outcome summary without discarding State",()=>{
 const state={outcomeSummary:"你未能打開石門，但鎖芯發出清晰裂響。",worldImpacts:[],npcChanges:[],factionChanges:[],companionChanges:[],discoveries:[],items:[],entityReveals:[]};
 const out=mergeTurnCandidates(null,state,{success:false});
 assert.equal(out.narrative,state.outcomeSummary);
 assert.deepEqual(out.worldImpacts,[]);
 assert.deepEqual(out.suggestions,[])
});

test("Scene snapshot excludes Director knowledge and keeps only Player Knowledge",()=>{
 const snap={world:{name:"UNKNOWN"},player:{name:"A"},knownFacts:["x"],knowledge:[],knowledgeLayers:{version:1,canonTruth:{facts:[{id:"SECRET"}]},directorKnowledge:{hiddenFactIds:["SECRET"]},playerKnowledge:{verifiedFactIds:["PUBLIC"],entries:[]}},inventory:[],quest:null,recentEvents:[],runtimeSummary:"",factions:[],registry:[],companions:[],recognition:{tier:"UNKNOWN",titles:[],activeRumors:[]},directorRegistry:{secret:true},directorTimeline:[{directorTruth:"secret"}],directorHistory:[{summary:"secret history"}],worldImpact:{capability:{maxScope:"WORLD"}}};
 const out=sceneTurnSnapshot(snap);
 assert.equal(out.directorRegistry,undefined);
 assert.equal(out.directorTimeline,undefined);
 assert.equal(out.directorHistory,undefined);
 assert.equal(out.worldImpact,undefined);
 assert.equal(out.knowledgeLayers.canonTruth,undefined);
 assert.deepEqual(out.knowledgeLayers.playerKnowledge.verifiedFactIds,["PUBLIC"])
});

test("shared Scene and State contracts both bind to Engine Outcome Kernel",()=>{
 const scene=sceneNarratorSystem(),state=stateDirectorSystem("DEEP");
 assert.match(scene,/Turn Outcome Kernel/);
 assert.match(scene,/confirmedOutcome/);
 assert.match(state,/Turn Outcome Kernel/);
 assert.match(state,/confirmedOutcome/);
 assert.match(scene,/snapshot\.player\.origin 是玩家起源的唯一權威資料/);
 assert.match(state,/不得自行假設現代地球背景/)
});

test("direct and server turn generation keep Scene and State parallel with one shared kernel",async()=>{
 const [client,server]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../api/turn.js",import.meta.url),"utf8")
 ]);
 const directBlock=client.slice(client.indexOf("export async function generateTurn"),client.indexOf("export async function generateDeferredTurnEffects"));
 assert.equal((directBlock.match(/const scenePromise=directChat\(\{/g)||[]).length,1);
 assert.equal((directBlock.match(/StatePromise=\(\)=>directChat\(\{/g)||[]).length,2);
 assert.match(directBlock,/buildTurnOutcomeKernel/);
 assert.match(directBlock,/sceneInput=\{action,intent:actionIntent,kernel,snapshot:sceneTurnSnapshot\(snapshot\)\}/);
 assert.match(directBlock,/stateInput=\{action,intent:actionIntent,kernel,snapshot:directorMode==="DEEP"\?snapshot:fastTurnStateSnapshot\(snapshot\)\}/);
 assert.match(directBlock,/Promise\.allSettled\(\[scenePromise,statePromise\]\)/);
 assert.match(directBlock,/validateKernelBoundaries/);
 assert.equal((server.match(/callModel\(\{/g)||[]).length,2);
 assert.match(server,/buildTurnOutcomeKernel/);
 assert.match(server,/Promise\.allSettled\(\[scenePromise,statePromise\]\)/)
});

test("only Deep State Director receives full Director snapshot",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const block=client.slice(client.indexOf("export async function generateTurn"),client.indexOf("export async function generateDeferredTurnEffects"));
 assert.match(block,/sceneTurnSnapshot\(snapshot\)/);
 assert.match(block,/directorMode==="DEEP"\?snapshot:fastTurnStateSnapshot\(snapshot\)/);
 assert.match(block,/directorMode==="DEEP"\?deepStatePromise\(\):fastStatePromise\(\)/)
});
