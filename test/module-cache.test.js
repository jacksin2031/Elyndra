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

test("v0.44.0 propagates Visibility Lock and Lazy Generation cache graph",async()=>{
 const [html,app,client,helper,adventure,world,storage,game,combat,progression,causal,lazy]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/helper-context.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/storage.js",import.meta.url),"utf8"),readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/combat-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=44000/);
 for(const path of ["version","world-engine","adventure-engine","game-engine","storage","combat-engine","progression-ui"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=44000"),path);
 assert.match(app,/\.\/src\/ai-client\.js\?v=44000/);assert.match(app,/\.\/src\/turn-compiler\.js\?v=44000/);assert.match(app,/\.\/src\/event-visibility\.js\?v=44000/);assert.match(app,/\.\/src\/lazy-generation\.js\?v=44000/);
 assert.match(client,/\.\/turn-compiler\.js\?v=44000/);assert.match(client,/\.\/helper-context\.js\?v=44000/);
 assert.match(helper,/\.\/event-visibility\.js\?v=44000/);assert.match(adventure,/\.\/event-visibility\.js\?v=44000/);assert.match(adventure,/\.\/turn-compiler\.js\?v=44000/);assert.match(adventure,/\.\/combat-engine\.js\?v=44000/);
 assert.match(world,/\.\/causal-world-core\.js\?v=44000/);assert.match(storage,/\.\/causal-world-core\.js\?v=44000/);assert.match(game,/\.\/world-engine\.js\?v=44000/);assert.match(combat,/\.\/world-engine\.js\?v=44000/);assert.match(progression,/\.\/storage\.js\?v=44000/);
 assert.match(causal,/\.\/generation-claims\.js\?v=44000/);assert.match(causal,/\.\/lazy-generation\.js\?v=44000/);assert.match(lazy,/\.\/generation-claims\.js\?v=44000/)
});
