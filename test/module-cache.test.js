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

test("v0.42.0 refreshes the causal Future dependency chain without invalidating StatePatch",async()=>{
 const [html,app,simulation,game,combat,adventure,npc,npcDialogue,futureRuntime,historyFuture,client,storage]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-simulation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/combat-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/npc-conversation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/npc-dialogue-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/future-runtime.js",import.meta.url),"utf8"),
  readFile(new URL("../src/history-future.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/storage.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=42000/);
 assert.match(app,/\.\/src\/version\.js\?v=42000/);
 assert.match(app,/\.\/src\/world-simulation\.js\?v=42000/);
 assert.match(app,/\.\/src\/game-engine\.js\?v=42000/);
 assert.match(app,/\.\/src\/combat-engine\.js\?v=42000/);
 assert.match(app,/\.\/src\/adventure-engine\.js\?v=42000/);
 assert.match(app,/\.\/src\/npc-conversation\.js\?v=42000/);
 assert.match(simulation,/\.\/future-runtime\.js\?v=42000/);
 assert.match(game,/\.\/world-simulation\.js\?v=42000/);
 assert.match(combat,/\.\/world-simulation\.js\?v=42000/);
 assert.match(adventure,/\.\/combat-engine\.js\?v=42000/);
 assert.match(npc,/\.\/world-simulation\.js\?v=42000/);
 assert.match(npcDialogue,/\.\/world-simulation\.js\?v=42000/);
 assert.match(futureRuntime,/\.\/history-future\.js\?v=42000/);
 assert.match(futureRuntime,/\.\/future-engine\.js\?v=40000/);
 assert.match(historyFuture,/\.\/future-engine\.js\?v=40000/);
 assert.match(client,/\.\/state-sync\.js\?v=41000/);
 assert.match(storage,/\.\/causal-world-core\.js\?v=40000/);
});
