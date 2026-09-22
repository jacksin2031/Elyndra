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

test("v0.54.1 keeps Developer Autotest and real-session hotfix cache graphs coherent",async()=>{
 const [html,app,client,stateSync,actions,settings,adventure,lazy,knowledge,worldEngine,causal,integrity,simulation,npc,storage,progression]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/state-sync.js",import.meta.url),"utf8"),
  readFile(new URL("../src/contextual-actions.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),
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
 assert.match(html,/app\.js\?v=54001/);
 assert.match(app,/\.\/src\/version\.js\?v=54001/);
 assert.match(app,/\.\/src\/ai-autotest\.js\?v=54000/);
 for(const path of ["ai-settings","world-engine","ai-client","turn-compiler","adventure-engine","session-maintenance","game-engine","storage","world-simulation","npc-engine","npc-conversation","combat-engine","world-creation","item-engine","progression-ui","debug-telemetry","contextual-actions","state-sync","lazy-generation","origin-runtime","document-engine","item-heritage"]){
  assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=54001"),path)
 }
 assert.match(client,/\.\/ai-settings\.js\?v=54001/);
 assert.match(client,/\.\/turn-compiler\.js\?v=54001/);
 assert.match(client,/\.\/action-intent\.js\?v=54001/);
 assert.match(client,/\.\/knowledge-model\.js\?v=54001/);
 assert.match(adventure,/\.\/state-sync\.js\?v=54001/);
 assert.match(adventure,/\.\/contextual-actions\.js\?v=54001/);
 assert.match(worldEngine,/\.\/causal-world-core\.js\?v=54001/);
 assert.match(causal,/\.\/knowledge-model\.js\?v=54001/);
 assert.match(causal,/\.\/lazy-generation\.js\?v=54001/);
 assert.match(causal,/\.\/causal-integrity\.js\?v=54001/);
 assert.match(integrity,/\.\/knowledge-model\.js\?v=54001/);
 assert.match(integrity,/\.\/lazy-generation\.js\?v=54001/);
 assert.match(simulation,/\.\/npc-engine\.js\?v=54001/);
 assert.match(storage,/\.\/causal-world-core\.js\?v=54001/);
 assert.match(storage,/\.\/item-engine\.js\?v=54001/);
 assert.match(progression,/\.\/storage\.js\?v=54001/);
 assert.match(progression,/\.\/item-engine\.js\?v=54001/);
 assert.match(actions,/groundedSuggestionFailForward/);
 assert.match(stateSync,/groundStatePatch/);
 assert.match(settings,/reasoning_effort:"low"/);
 assert.match(lazy,/generationRevision/);
 assert.match(knowledge,/UNCONFIRMED/);
 assert.match(npc,/NPC_AUTONOMOUS_ACTION/);
 assert.match(app,/startDeveloperAutotest/);
});
