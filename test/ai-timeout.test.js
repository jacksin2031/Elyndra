import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("world generation uses recoverable bounded subcompiler timeouts instead of a 95s monolithic Core",async()=>{
 const [settings,client]=await Promise.all([
  readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.doesNotMatch(settings,/abort\(\),25000/);
 assert.match(settings,/AI_TIMEOUT: Provider/);
 assert.match(settings,/hardProviderDeadline/);assert.match(settings,/Promise\.race/);
 assert.ok(client.includes('WORLD_${stage}_FAILED'));
 for(const stage of ["IDENTITY","CORE_RULES","CORE_ANCHOR","HISTORY","GEOGRAPHY","FUTURE","SOCIETY","CAST"])assert.match(client,new RegExp(`resilientWorldStage\\("${stage}"`));
 for(const timeout of [35000,50000,55000,65000])assert.match(client,new RegExp(`timeoutMs:${timeout}`));
 assert.doesNotMatch(client,/timeoutMs:95000/);
 assert.match(settings,/max_completion_tokens/);
 assert.match(settings,/maxOutputTokens/);
 assert.match(settings,/providerTokenBudget/);
 assert.match(settings,/Math\.max\(256,Math\.min\(8192/);
 assert.match(settings,/retryOnTimeout!==false/);
 assert.match(client,/retryOnTimeout:false/);
 assert.match(client,/CORE_TIMEOUT_RETRY=new Set\(\["CORE_RULES","CORE_ANCHOR"\]\)/);
 assert.match(client,/allowCoreTimeoutRetry=timedOut&&CORE_TIMEOUT_RETRY\.has\(stage\)/);
 assert.match(client,/noteGenerationSuccess\(\)/);
 assert.match(client,/Math\.min\(35000,Number\(args\.timeoutMs\)/);
 assert.match(client,/PROVIDER_TIMEOUT_CIRCUIT_OPEN/);
 assert.match(client,/generationCircuitOpen/);
 assert.match(client,/compilerRecoverable/);
 assert.match(client,/INVALID_MODEL_JSON/);
 assert.match(client,/Failed to fetch/);assert.match(client,/generationTransportFailure/);assert.match(client,/transportStages/);assert.match(client,/circuit\.transportCount>=2/);
 for(const legacy of ["CORE","CORE_REPAIR","CHRONOLOGY","REGION"])assert.doesNotMatch(client,new RegExp(`worldStage\\("${legacy}"`));
});


test("Player Action and StatePatch do not retry provider timeouts",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const block=client.slice(client.indexOf("export function startTurnAIJobs"),client.indexOf("export async function generateStatePatch"));
 assert.match(block,/aiTask:"scene",signal:options\?\.signal,timeoutMs:35000,retryOnTimeout:false/);
 assert.match(block,/timeoutMs:plan\.mode==="DEEP"\?45000:22000,retryOnTimeout:false/);
 const deferred=client.slice(client.indexOf("export async function generateStatePatch"),client.indexOf("export function finalizeTurnAIJobs"));
 assert.match(deferred,/resolved\.mode==="DEEP"\?45000:resolved\.mode==="DEFERRED"\?35000:22000/);
 assert.match(deferred,/retryOnTimeout:false/)
});

test("server world generation timeout is longer than ordinary narration",async()=>{
 const [core,world,turn,narrate,npc]=await Promise.all([
  readFile(new URL("../api/_ai.js",import.meta.url),"utf8"),
  readFile(new URL("../api/world.js",import.meta.url),"utf8"),
  readFile(new URL("../api/turn.js",import.meta.url),"utf8"),
  readFile(new URL("../api/narrate.js",import.meta.url),"utf8"),
  readFile(new URL("../api/npc.js",import.meta.url),"utf8")
 ]);
 assert.match(core,/timeoutMs=30000/);
 assert.match(core,/AI_TIMEOUT: upstream provider exceeded/);
 assert.match(world,/timeoutMs:120000/);
 assert.match(turn,/timeoutMs:35000/);
 assert.match(turn,/plan\.mode==="DEEP"\?50000:25000/);
 assert.doesNotMatch(turn,/timeoutMs:60000/);
 assert.match(narrate,/timeoutMs:45000/);
 assert.match(npc,/timeoutMs:45000/);
});


test("browser transport failures are recoverable world-compiler failures and open a two-stage circuit",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const recover=client.slice(client.indexOf("function generationTransportFailure"),client.indexOf("let activeGenerationDiagnostics"));
 assert.match(recover,/Failed to fetch/);assert.match(recover,/NetworkError/);assert.match(recover,/ERR_NETWORK/);
 const circuit=client.slice(client.indexOf("function generationCircuit"),client.indexOf("function worldStageFallback"));
 assert.match(circuit,/transportStages/);assert.match(circuit,/transportCount>=2/);
 const resilient=client.slice(client.indexOf("async function resilientWorldStage"),client.indexOf("function fallbackClause"));
 assert.match(resilient,/if\(transportFailed\)noteGenerationTransportFailure/);
 assert.match(resilient,/if\(generationTransportFailure\(retryReason\)\)noteGenerationTransportFailure/)
});


test("v0.54.3 opens the compiler circuit after both core stages exhaust their bounded retry",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const circuit=client.slice(client.indexOf("function generationCircuit"),client.indexOf("function worldStageFallback"));
 assert.match(circuit,/coreFailureStages/);
 assert.match(circuit,/CORE_TIMEOUT_RETRY\.size===circuit\.coreFailureStages/);
 const resilient=client.slice(client.indexOf("async function resilientWorldStage"),client.indexOf("function fallbackClause"));
 assert.match(resilient,/noteGenerationCoreFailure\(stage\)/)
});
