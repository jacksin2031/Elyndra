import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeProviderUsage,estimateTextTokens,recordAIUsage,recordDebug,telemetryEntries,telemetrySummary,debugBundle,clearDebugTelemetry,scrubDebugText} from "../src/debug-telemetry.js";
import {PROVIDERS,saveAISettings,clearAISettings,directChat} from "../src/ai-settings.js";

function memoryStorage(){
 const data=new Map();
 return {
  getItem:key=>data.has(key)?data.get(key):null,
  setItem:(key,value)=>data.set(key,String(value)),
  removeItem:key=>data.delete(key),
  clear:()=>data.clear()
 }
}

test("OpenAI-compatible usage captures prompt output reasoning cached and total tokens",()=>{
 const u=normalizeProviderUsage("openai",{usage:{prompt_tokens:120,completion_tokens:80,total_tokens:200,prompt_tokens_details:{cached_tokens:20},completion_tokens_details:{reasoning_tokens:35}}});
 assert.deepEqual(u,{source:"API",input:120,output:80,reasoning:35,cached:20,total:200})
});

test("Gemini usage captures prompt candidates thoughts cached and total tokens",()=>{
 const u=normalizeProviderUsage("gemini",{usageMetadata:{promptTokenCount:140,candidatesTokenCount:65,thoughtsTokenCount:42,cachedContentTokenCount:30,totalTokenCount:247}});
 assert.deepEqual(u,{source:"API",input:140,output:65,reasoning:42,cached:30,total:247})
});

test("debug string scrub removes embedded bearer, query and provider API keys",()=>{
 const sample="Provider error: Authorization: Bearer abcdef123456 https://example.test?q=1&api_key=secretvalue sk-abcdefghijklmnop AIza1234567890abcdefghijklmnop";
 const clean=scrubDebugText(sample);
 assert.doesNotMatch(clean,/abcdef123456|secretvalue|sk-abcdefghijklmnop|AIza1234567890abcdefghijklmnop/);
 assert.match(clean,/Bearer \[REDACTED\]/);
 assert.match(clean,/api_key=\[REDACTED\]/)
});

test("missing provider usage is clearly marked estimated",()=>{
 const u=normalizeProviderUsage("agnes",{},"12345678","abcd");
 assert.equal(u.source,"ESTIMATED");
 assert.equal(u.input,estimateTextTokens("12345678"));
 assert.equal(u.output,estimateTextTokens("abcd"));
 assert.equal(u.reasoning,0);
 assert.equal(u.total,u.input+u.output)
});

test("telemetry sums token usage and redacts credentials without hiding gameplay canon",()=>{
 const prior=globalThis.localStorage;globalThis.localStorage=memoryStorage();
 try{
  clearDebugTelemetry();
  recordAIUsage({provider:"openai",model:"m",task:"scene",tier:"FAST",latencyMs:100,response:{usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}},inputText:"x",outputText:"y"});
  recordAIUsage({provider:"gemini",model:"g",task:"history",tier:"IMPORTANT",latencyMs:300,response:{usageMetadata:{promptTokenCount:20,candidatesTokenCount:8,thoughtsTokenCount:4,totalTokenCount:32}},inputText:"x",outputText:"y"});
  recordDebug("GAME_ITEM_GAINED",{itemId:"I1",name:"舊徽章",quantityDelta:1,totalQuantity:1});
  const summary=telemetrySummary(telemetryEntries());
  assert.equal(summary.tokenTotals.total,47);
  assert.equal(summary.tokenTotals.input,30);
  assert.equal(summary.tokenTotals.output,13);
  assert.equal(summary.tokenTotals.reasoning,4);
  assert.equal(summary.aiLatencyMsAverage,200);
  assert.equal(summary.gameplayEvents,1);
  const bundle=debugBundle({appVersion:"0.34.0",aiSettings:{apiKey:"secret-key",authorization:"Bearer xx",model:"m"},gameState:{world:{secretLore:"KEEP_ME"},events:[{type:"PLAYER_ACTION"}]},runtime:{turnSyncBusy:true}});
  assert.equal(bundle.aiSettings.apiKey,"[REDACTED]");
  assert.equal(bundle.aiSettings.authorization,"[REDACTED]");
  assert.equal(bundle.gameState.world.secretLore,"KEEP_ME");
  assert.equal(bundle.gameState.events[0].type,"PLAYER_ACTION")
 }finally{globalThis.localStorage=prior}
});

test("in-game Debug UI exposes token accounting and JSON TXT export",async()=>{
 const [html,app,css,settings]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/id="debugBtn">Debug 診斷/);
 assert.match(app,/function openDebugPanel\(\)/);
 assert.match(app,/debugBundle\(\{appVersion:APP_VERSION,gameState/);
 assert.match(app,/匯出 Debug JSON/);
 assert.match(app,/匯出摘要 TXT/);
 assert.match(app,/Reasoning-Thinking/i);
 assert.match(app,/Token I\/O\/R\/T/);
 assert.match(app,/PLAYER_ACTION_START/);
 assert.match(app,/ACTION_ASSESSMENT/);
 assert.match(app,/ENGINE_ACTION_RESULT/);
 assert.match(app,/TURN_COMMIT/);
 assert.match(app,/GAME_ITEM_GAINED/);
 assert.match(app,/GAME_KNOWLEDGE_GAINED/);
 assert.match(app,/GAME_SIDE_QUEST_ACQUIRED/);
 assert.match(app,/GAME_NPC_ENCOUNTERED/);
 assert.match(app,/GAME_LOCATION_DISCOVERED/);
 assert.match(app,/GAME_COMBAT_STARTED/);
 assert.match(app,/Gameplay State Changes/);
 assert.match(css,/\.debug-card-grid/);
 assert.match(css,/\.debug-table/);
 assert.match(settings,/recordAIUsage/);
 assert.match(settings,/usageMetadata|debug-telemetry/)
});


test("direct OpenAI-compatible response writes real API usage into telemetry",async()=>{
 const priorStorage=globalThis.localStorage,priorFetch=globalThis.fetch;globalThis.localStorage=memoryStorage();
 try{
  clearDebugTelemetry();clearAISettings();
  saveAISettings({provider:"openai",apiKey:"k",endpoint:PROVIDERS.openai.endpoint,optimization:"standard"});
  globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:"OK"}}],usage:{prompt_tokens:33,completion_tokens:7,total_tokens:40,completion_tokens_details:{reasoning_tokens:3}}})});
  assert.equal(await directChat({aiTask:"scene",system:"s",user:"u",timeoutMs:5000,retryOnTimeout:false}),"OK");
  const row=telemetryEntries().filter(x=>x.type==="AI_REQUEST").at(-1);
  assert.equal(row.data.provider,"openai");
  assert.equal(row.data.task,"scene");
  assert.equal(row.data.usage.source,"API");
  assert.equal(row.data.usage.total,40);
  assert.equal(row.data.usage.reasoning,3);
  assert.equal(row.data.responsePreview,"OK")
 }finally{globalThis.localStorage=priorStorage;globalThis.fetch=priorFetch}
});
