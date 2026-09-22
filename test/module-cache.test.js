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

test("v0.47.0 propagates History Deepen through the browser dependency graph",async()=>{
 const [html,app,client,futureRuntime,simulation,item,itemRecognition,causal,world,storage,game,combat,adventure,npcConversation,progression,documents]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/future-runtime.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-simulation.js",import.meta.url),"utf8"),readFile(new URL("../src/item-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/item-recognition.js",import.meta.url),"utf8"),readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/storage.js",import.meta.url),"utf8"),
  readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/combat-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/npc-conversation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8"),readFile(new URL("../src/document-engine.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=47000/);
 for(const path of ["version","world-engine","ai-client","adventure-engine","game-engine","storage","world-simulation","npc-conversation","combat-engine","item-engine","progression-ui"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=47000"),path);
 assert.match(futureRuntime,/\.\/history-future\.js\?v=47000/);assert.match(simulation,/\.\/future-runtime\.js\?v=47000/);
 assert.match(item,/\.\/item-heritage\.js\?v=47000/);assert.match(item,/\.\/item-recognition\.js\?v=47000/);assert.match(itemRecognition,/\.\/item-heritage\.js\?v=47000/);
 assert.match(causal,/\.\/item-heritage\.js\?v=47000/);assert.match(causal,/\.\/document-engine\.js\?v=47000/);assert.match(causal,/\.\/history-depth\.js\?v=47000/);
 assert.match(world,/\.\/world-history\.js\?v=47000/);assert.match(world,/\.\/causal-world-core\.js\?v=47000/);
 assert.match(storage,/\.\/item-engine\.js\?v=47000/);assert.match(storage,/\.\/causal-world-core\.js\?v=47000/);
 assert.match(game,/\.\/world-engine\.js\?v=47000/);assert.match(game,/\.\/world-simulation\.js\?v=47000/);assert.match(game,/\.\/item-engine\.js\?v=47000/);
 assert.match(combat,/\.\/world-engine\.js\?v=47000/);assert.match(combat,/\.\/world-simulation\.js\?v=47000/);
 assert.match(adventure,/\.\/combat-engine\.js\?v=47000/);assert.match(adventure,/\.\/world-history\.js\?v=47000/);assert.match(adventure,/\.\/item-engine\.js\?v=47000/);
 assert.match(npcConversation,/\.\/world-simulation\.js\?v=47000/);assert.match(progression,/\.\/item-engine\.js\?v=47000/);assert.match(progression,/\.\/storage\.js\?v=47000/);
 assert.match(documents,/\.\/history-future\.js\?v=47000/);assert.match(documents,/\.\/history-depth\.js\?v=47000/);assert.match(client,/\.\/history-depth\.js\?v=47000/)
});
