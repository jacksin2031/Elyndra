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

test("v0.47.0 propagates History Lazy Deepen cache graph",async()=>{
 const [html,app,client,historyFuture,docs,heritage,causal,world,storage,game,combat,adventure,progression,dungeon,helper]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/history-future.js",import.meta.url),"utf8"),
  readFile(new URL("../src/document-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/item-heritage.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/storage.js",import.meta.url),"utf8"),readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/combat-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8"),readFile(new URL("../src/dungeon-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/helper-context.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=47000/);
 for(const path of ["version","world-engine","ai-client","adventure-engine","game-engine","storage","combat-engine","progression-ui","history-depth","document-engine","item-heritage","dungeon-engine"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=47000"),path);
 assert.match(client,/\.\/world-history\.js\?v=47000/);assert.match(client,/\.\/history-depth\.js\?v=47000/);
 assert.match(historyFuture,/\.\/history-depth\.js\?v=47000/);assert.match(docs,/\.\/history-future\.js\?v=47000/);
 assert.match(causal,/\.\/item-heritage\.js\?v=47000/);assert.match(causal,/\.\/document-engine\.js\?v=47000/);assert.match(causal,/\.\/history-depth\.js\?v=47000/);
 assert.match(world,/\.\/world-history\.js\?v=47000/);assert.match(world,/\.\/causal-world-core\.js\?v=47000/);
 assert.match(storage,/\.\/causal-world-core\.js\?v=47000/);assert.match(game,/\.\/world-engine\.js\?v=47000/);assert.match(combat,/\.\/world-engine\.js\?v=47000/);
 assert.match(adventure,/\.\/combat-engine\.js\?v=47000/);assert.match(adventure,/\.\/dungeon-engine\.js\?v=47000/);assert.match(progression,/\.\/storage\.js\?v=47000/);assert.match(dungeon,/\.\/world-history\.js\?v=47000/);assert.match(helper,/\.\/dungeon-engine\.js\?v=47000/);assert.match(client,/\.\/helper-context\.js\?v=47000/);
 assert.match(heritage,/registerHistoryRelicSeeds/)
});
