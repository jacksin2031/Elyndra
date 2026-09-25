import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {webcrypto} from "node:crypto";
import {deterministicAutotestDecision} from "../src/ai-autotest.js";
import {validateSceneProvenance,validateSuggestionProvenance} from "../src/scene-provenance.js";
import {buildAutotestCodexTransfer,installAutotestCodexBridge,reconstructAutotestCodexTransfer} from "../src/autotest-codex-bridge.js";
import {telemetrySummary} from "../src/debug-telemetry.js";

const scope={
 currentLocation:"眼前的裂隙",
 locationDescription:"空氣中懸浮著細碎發光的藍色晶體粉末，流動介質遮蔽視野。",
 presentNpcNames:[],
 allNpcNames:["阿洛"],
 knownLocations:["眼前的裂隙"],
 visibleEventTexts:["藍色晶體粉末在裂隙邊緣緩慢漂動。"]
};

test("v0.57.22 rejects stale NPC and foreign room baseline in player-visible scene",()=>{
 const result=validateSceneProvenance({sceneTitle:"眼前的裂隙",narrative:"阿洛：一名渾身晶塵傷痕的少年，剛從崩裂的牆外跌入石室。"},scope);
 assert.equal(result.valid,false);
 assert.ok(result.issues.some(x=>x.type==="NPC_NOT_PRESENT"&&x.value==="阿洛"));
 assert.ok(result.issues.some(x=>x.type==="SCENE_CONTAINER_UNGROUNDED"&&x.value==="石室"));
});

test("v0.57.22 rejects suggestion targets from a foreign scene but accepts current-location targets",()=>{
 const bad=validateSuggestionProvenance({kind:"OBSERVE",action:"移步至石室東側牆壁，仔細檢查晶塵滲入路徑。"},scope);
 assert.equal(bad.valid,false);
 assert.ok(bad.issues.some(x=>x.type==="SCENE_CONTAINER_UNGROUNDED"&&x.value==="石室"));
 const good=validateSuggestionProvenance({kind:"OBSERVE",action:"檢查眼前的裂隙附近發光的藍色晶體粉末與可見痕跡。"},scope);
 assert.equal(good.valid,true);
});

test("v0.57.22 deterministic AutoTest recovery rotates grounded hard-stall travel actions",()=>{
 const snapshot={world:{location:"眼前的裂隙"},quest:{objectives:["理解目前異常"]},suggestions:[],combat:{active:false}};
 const recent=Array.from({length:7},()=>({action:"停止重複目前互動，沿眼前的裂隙尋找新人物或可驗證線索",kind:"GENERAL",progressed:false,targetId:null}));
 const first=deterministicAutotestDecision(snapshot,recent,"test fallback");
 assert.equal(first.mode,"free");
 assert.equal(first.kind,"TRAVEL");
 assert.doesNotMatch(first.action,/停止重複目前互動/);
 assert.match(first.action,/出口|通道/);
 const second=deterministicAutotestDecision(snapshot,[...recent,{action:first.action,kind:first.kind,progressed:false,targetId:null}],"test fallback");
 assert.equal(second.mode,"free");assert.equal(second.kind,"TRAVEL");
 assert.notEqual(second.action,first.action);
 assert.match(second.action,/出口|通道/);
});

test("v0.57.22 Codex bridge reconstructs retained artifact without picker/download/clipboard",async()=>{
 const artifact={filename:"Elyndra-autotest-debug-v0.57.17-proof.json",mime:"application/json;charset=utf-8",body:JSON.stringify({hello:"世界",rows:Array.from({length:9000},(_,i)=>`row-${i}`)},null,2)};
 const transfer=await buildAutotestCodexTransfer(artifact,{chunkChars:16384,cryptoImpl:webcrypto});
 assert.ok(transfer.totalChunks>1);
 assert.equal(reconstructAutotestCodexTransfer(transfer),artifact.body);
 const host={};
 const bridge=installAutotestCodexBridge(async kind=>kind==="debug"?artifact:null,{globalImpl:host,cryptoImpl:webcrypto,chunkChars:16384});
 assert.equal(host.__ELYNDRA_AUTOTEST_CODEX__,bridge);
 const manifest=await bridge.manifest("debug"),parts=[];
 for(let i=1;i<=manifest.totalChunks;i++)parts.push((await bridge.read("debug",i)).text);
 const body=parts.join("");
 assert.equal(body,artifact.body);
 const verified=await bridge.verifyText("debug",body);
 assert.equal(verified.ok,true);
 assert.equal(verified.sha256,manifest.sha256);
 assert.equal(verified.bytes,manifest.bytes);
});

test("v0.57.22 telemetry exposes error type task provider and class distribution",()=>{
 const summary=telemetrySummary([
  {at:1,type:"AI_CALL_FAILED",data:{task:"action",provider:"openai",error:"AI_TIMEOUT: Provider timeout"}},
  {at:2,type:"AI_CALL_FAILED",data:{task:"runtime_expansion",provider:"openai",error:"AI_HTTP_429: rate limited"}},
  {at:3,type:"AUTOTEST_RUNTIME_EXPANSION_FAILED",data:{error:"INVALID_MODEL_JSON: invalid"}}
 ]);
 assert.equal(summary.errorCount,3);
 assert.equal(summary.errorBreakdown.byType.AI_CALL_FAILED,2);
 assert.equal(summary.errorBreakdown.byTask.action,1);
 assert.equal(summary.errorBreakdown.byProvider.openai,2);
 assert.equal(summary.errorBreakdown.byClass.TIMEOUT,1);
 assert.equal(summary.errorBreakdown.byClass.RATE_LIMIT,1);
 assert.equal(summary.errorBreakdown.byClass.INVALID_JSON,1);
});

test("v0.57.22 bounds action assessment latency and avoids blocking per-turn expansion",async()=>{
 const ai=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),app=await readFile(new URL("../app.js",import.meta.url),"utf8"),settings=await readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8");
 assert.match(ai,/ACTION_ASSESSMENT_CIRCUIT_OPEN_MS=60000/);
 assert.match(ai,/timeoutMs:compact\?10000:18000/);
 assert.match(ai,/retryOnTimeout:false/);
 assert.match(settings,/PLAYER_CRITICAL_BACKPRESSURE_MAX_MS=6000/);
 assert.doesNotMatch(app,/if\(!firstButtonFast&&needsExpansion\(gameState\)\)await expandDeveloperAutotestWorld/);
 assert.match(app,/AUTOTEST_RUNTIME_EXPANSION_THROTTLED/);
 assert.match(app,/AUTOTEST_RUNTIME_EXPANSION_DEFERRED/);
});

test("v0.57.22 shows visible AI progress/recovery and enforces scene/suggestion provenance",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),contextual=await readFile(new URL("../src/contextual-actions.js",import.meta.url),"utf8"),css=await readFile(new URL("../styles.css",import.meta.url),"utf8");
 assert.match(app,/AI 回應較慢，必要時會自動切換 Engine 備援/);
 assert.match(app,/ACTION_ASSESSMENT_DEGRADED_VISIBLE/);
 assert.match(app,/SCENE_PROVENANCE_REJECTED/);
 assert.match(app,/SUGGESTION_PROVENANCE_REJECTED/);
 assert.match(contextual,/suggestionMatchesCurrentScene/);
 assert.match(css,/data-recovery/);
});

test("v0.57.22 exposes a machine-readable retained-snapshot Codex bridge",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/installAutotestCodexBridge/);
 assert.match(app,/__ELYNDRA_AUTOTEST_CODEX__/);
 assert.match(app,/Codex 無下載取回/);
 assert.match(app,/不使用下載管理器、File Picker 或剪貼簿/);
});
