import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";

test("every browser module import is explicitly cache-versioned",async()=>{
 const files=(await readdir(new URL("../src/",import.meta.url))).filter(x=>x.endsWith(".js"));
 for(const file of files){
  const source=await readFile(new URL("../src/"+file,import.meta.url),"utf8");
  for(const match of source.matchAll(/from\s+"(\.\/[^"]+\.js)([^"]*)";/g))assert.match(match[2],/^\?v=\d+$/,file+" missing cache version for "+match[1])
 }
});

test("v0.57.11 keeps structured AI and Developer Autotest cache graphs coherent",async()=>{
 const [html,app,client,stateSync,actions,settings,contracts,adventure,turnOutcome,lazy,knowledge,worldEngine,causal,integrity,simulation,npc,storage,progression]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/state-sync.js",import.meta.url),"utf8"),
  readFile(new URL("../src/contextual-actions.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-runtime-contracts.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/turn-outcome.js",import.meta.url),"utf8"),
  readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/knowledge-model.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-integrity.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-simulation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/npc-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/storage.js",import.meta.url),"utf8"),
  readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=57024/);
 const appImports=[...app.matchAll(/from "\.\/src\/[^"]+\.js\?v=(\d+)";/g)].map(x=>x[1]);
 assert.ok(appImports.length>20);assert.ok(appImports.every(x=>x==="57024"),"all app browser imports must use the v0.57.11 cache generation");assert.ok(appImports.includes("57024"),"the runtime graph must expose the v0.57.11 cache token");
 assert.match(actions,/\.\/action-intent\.js\?v=57024/);assert.match(contracts,/\.\/action-intent\.js\?v=57024/);assert.match(turnOutcome,/\.\/action-intent\.js\?v=57024/);
 assert.match(client,/\.\/ai-settings\.js\?v=57024/);
 assert.match(client,/\.\/turn-compiler\.js\?v=57024/);assert.match(client,/\.\/turn-outcome\.js\?v=57024/);
 assert.match(client,/\.\/action-intent\.js\?v=57024/);assert.match(client,/\.\/state-sync\.js\?v=57024/);assert.match(client,/\.\/ai-runtime-contracts\.js\?v=57024/);assert.match(contracts,/\.\/state-sync\.js\?v=57024/);
 assert.match(client,/\.\/knowledge-model\.js\?v=57024/);assert.match(client,/\.\/lazy-generation\.js\?v=57024/);
 for(const [source,label] of [[adventure,"adventure"],[worldEngine,"world-engine"],[causal,"causal-world-core"],[integrity,"causal-integrity"],[simulation,"world-simulation"],[storage,"storage"],[progression,"progression-ui"]]){
  const tokens=[...source.matchAll(/from "\.\/[^"]+\.js\?v=(\d+)";/g)].map(x=>x[1]);assert.ok(tokens.length,label+" should import browser modules");assert.ok(tokens.every(x=>["54018","540181","57024","57024"].includes(x)),label+" imports must use tracked release tokens")
 }
 assert.match(actions,/groundedSuggestionFailForward/);
 assert.match(stateSync,/groundStatePatch/);
 assert.match(settings,/reasoning_effort:"low"/);
 assert.match(lazy,/generationRevision/);
 assert.match(knowledge,/UNCONFIRMED/);
 assert.match(npc,/NPC_AUTONOMOUS_ACTION/);
 assert.match(app,/startDeveloperAutotest/);
});