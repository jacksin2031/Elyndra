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

test("v0.45.0 propagates Origin Rule Kernel cache graph",async()=>{
 const [html,app,client,creation,adventure,world,storage,game,combat,progression,causal,documents,origin]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/world-creation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/storage.js",import.meta.url),"utf8"),readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/combat-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),readFile(new URL("../src/document-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/origin-runtime.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=45000/);
 for(const path of ["version","world-engine","ai-client","adventure-engine","game-engine","storage","combat-engine","world-creation","world-quality","player-origin","progression-ui"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=45000"),path);
 assert.match(app,/\.\/src\/origin-runtime\.js\?v=45000/);
 assert.match(client,/\.\/origin-runtime\.js\?v=45000/);assert.match(client,/\.\/world-quality\.js\?v=45000/);
 assert.match(creation,/\.\/origin-runtime\.js\?v=45000/);assert.match(adventure,/\.\/origin-runtime\.js\?v=45000/);assert.match(adventure,/\.\/player-origin\.js\?v=45000/);assert.match(adventure,/\.\/combat-engine\.js\?v=45000/);
 assert.match(world,/\.\/player-origin\.js\?v=45000/);assert.match(world,/\.\/causal-world-core\.js\?v=45000/);
 assert.match(storage,/\.\/causal-world-core\.js\?v=45000/);assert.match(game,/\.\/world-engine\.js\?v=45000/);assert.match(combat,/\.\/world-engine\.js\?v=45000/);assert.match(progression,/\.\/storage\.js\?v=45000/);
 assert.match(causal,/\.\/document-engine\.js\?v=45000/);assert.match(origin,/\.\/knowledge-model\.js\?v=40000/);assert.match(documents,/\.\/history-future\.js\?v=42000/)
});
