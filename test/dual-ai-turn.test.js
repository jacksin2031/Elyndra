import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sceneTurnSnapshot} from "../src/turn-compiler.js";
import {sceneNarratorSystem,statePatchDirectorSystem} from "../src/ai-runtime-contracts.js";

test("Player Action snapshot excludes Director-only knowledge",()=>{
 const snap={world:{name:"UNKNOWN"},player:{name:"A"},knownFacts:["x"],knowledge:[],knowledgeLayers:{version:1,canonTruth:{facts:[{id:"SECRET"}]},directorKnowledge:{hiddenFactIds:["SECRET"]},playerKnowledge:{verifiedFactIds:["PUBLIC"],entries:[]}},inventory:[],quest:null,recentEvents:[],runtimeSummary:"",factions:[],registry:[],companions:[],recognition:{tier:"UNKNOWN",titles:[],activeRumors:[]},directorRegistry:{secret:true},directorTimeline:[{directorTruth:"secret"}],directorHistory:[{summary:"secret history"}],worldImpact:{capability:{maxScope:"WORLD"}}};
 const out=sceneTurnSnapshot(snap);assert.equal(out.directorRegistry,undefined);assert.equal(out.directorTimeline,undefined);assert.equal(out.directorHistory,undefined);assert.equal(out.worldImpact,undefined);assert.equal(out.knowledgeLayers.canonTruth,undefined);assert.deepEqual(out.knowledgeLayers.playerKnowledge.verifiedFactIds,["PUBLIC"])
});

test("Player Action and StatePatch share one Engine Outcome Kernel",()=>{
 const scene=sceneNarratorSystem(),patch=statePatchDirectorSystem({mode:"FAST",baseRevision:2,dirty:["knowledge"],capabilities:["DISCOVER_FACT"]});
 assert.match(scene,/Turn Outcome Kernel/);assert.match(scene,/confirmedOutcome/);assert.match(patch,/success、grade、confirmedOutcome、dirtyFlags/);assert.match(patch,/baseRevision/);assert.match(patch,/DISCOVER_FACT/)
});

test("direct transport skips State AI for ENGINE_ONLY and DEFERRED foreground turns",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),block=client.slice(client.indexOf("export function startTurnAIJobs"),client.indexOf("export async function generateStatePatch"));
 assert.match(block,/immediateStateAI=plan\.mode==="FAST"\|\|plan\.mode==="DEEP"/);assert.match(block,/stateSync=immediateStateAI\?directChat/);assert.match(block,/:Promise\.resolve\(null\)/);
 assert.match(block,/aiTask:"scene"/);assert.match(block,/statePatchDirectorSystem\(plan\)/)
});

test("server transport uses separate Player Action and StatePatch endpoints",async()=>{
 const [client,sceneApi,stateApi]=await Promise.all([readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../api/turn-scene.js",import.meta.url),"utf8"),readFile(new URL("../api/turn-state.js",import.meta.url),"utf8")]);
 assert.match(client,/post\("\/api\/turn-scene",payload,\{signal:options\?\.signal\}\)/);assert.match(client,/post\("\/api\/turn-state",payload,\{signal:options\?\.signal\}\)/);
 assert.match(sceneApi,/sceneNarratorSystem/);assert.match(stateApi,/statePatchDirectorSystem/);assert.match(stateApi,/validateStatePatch/);assert.match(stateApi,/serverPlan\(/)
});

test("compatibility generateTurn wrapper accepts null StatePatch",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),block=client.slice(client.indexOf("export async function generateTurn"),client.indexOf("export async function generateDeferredTurnEffects"));
 assert.match(block,/Promise\.allSettled\(\[jobs\.playerAction,jobs\.stateSync\]\)/);assert.match(block,/finalizeTurnAIJobs/)
});
