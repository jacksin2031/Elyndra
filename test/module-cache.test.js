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

test("v0.49.0 preserves Future scope while refreshing player progression cache graph",async()=>{
 const [html,app,client,worldEngine,timeline,impact,simulation,futureRuntime,futureEngine,historyFuture,heritage,docs,causal,itemRecognition,itemEngine,storage,game,combat,adventure,progression,check]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-timeline.js",import.meta.url),"utf8"),readFile(new URL("../src/world-impact.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-simulation.js",import.meta.url),"utf8"),readFile(new URL("../src/future-runtime.js",import.meta.url),"utf8"),
  readFile(new URL("../src/future-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/history-future.js",import.meta.url),"utf8"),
  readFile(new URL("../src/item-heritage.js",import.meta.url),"utf8"),readFile(new URL("../src/document-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),readFile(new URL("../src/item-recognition.js",import.meta.url),"utf8"),
  readFile(new URL("../src/item-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/storage.js",import.meta.url),"utf8"),
  readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/combat-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8"),
  readFile(new URL("../src/check-engine.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=49000/);
 for(const path of ["version","adventure-engine","game-engine","storage","combat-engine","item-engine","progression-ui","check-engine","talent-engine","journey-closure"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=49000"),path);
 for(const path of ["world-engine","ai-client","world-simulation","npc-conversation","world-impact","world-quality","document-engine","item-heritage"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=48000"),path);
 assert.match(client,/\.\/seed-contract\.js\?v=48000/);assert.match(client,/\.\/world-compiler\.js\?v=48000/);assert.match(client,/\.\/world-timeline\.js\?v=48000/);assert.match(client,/\.\/world-quality\.js\?v=48000/);
 assert.match(worldEngine,/\.\/seed-contract\.js\?v=48000/);assert.match(worldEngine,/\.\/world-timeline\.js\?v=48000/);assert.match(worldEngine,/\.\/causal-world-core\.js\?v=48000/);
 assert.match(impact,/\.\/world-timeline\.js\?v=48000/);assert.match(simulation,/\.\/world-timeline\.js\?v=48000/);assert.match(simulation,/\.\/world-impact\.js\?v=48000/);assert.match(simulation,/\.\/future-runtime\.js\?v=48000/);
 assert.match(futureRuntime,/\.\/future-engine\.js\?v=48000/);assert.match(futureRuntime,/\.\/history-future\.js\?v=48000/);assert.match(historyFuture,/\.\/future-engine\.js\?v=48000/);
 assert.match(heritage,/\.\/future-engine\.js\?v=48000/);assert.match(docs,/\.\/history-future\.js\?v=48000/);
 assert.match(causal,/\.\/future-engine\.js\?v=48000/);assert.match(causal,/\.\/item-heritage\.js\?v=48000/);assert.match(causal,/\.\/document-engine\.js\?v=48000/);
 assert.match(itemRecognition,/\.\/item-heritage\.js\?v=48000/);assert.match(itemEngine,/\.\/item-heritage\.js\?v=48000/);assert.match(itemEngine,/\.\/item-recognition\.js\?v=48000/);assert.match(itemEngine,/\.\/check-engine\.js\?v=49000/);
 assert.match(storage,/\.\/item-engine\.js\?v=49000/);assert.match(storage,/\.\/causal-world-core\.js\?v=48000/);
 assert.match(game,/\.\/world-engine\.js\?v=48000/);assert.match(game,/\.\/world-simulation\.js\?v=48000/);assert.match(game,/\.\/item-engine\.js\?v=49000/);assert.match(game,/\.\/check-engine\.js\?v=49000/);assert.match(game,/\.\/talent-engine\.js\?v=49000/);
 assert.match(combat,/\.\/world-engine\.js\?v=48000/);assert.match(combat,/\.\/world-simulation\.js\?v=48000/);assert.match(combat,/\.\/check-engine\.js\?v=49000/);assert.match(combat,/\.\/talent-engine\.js\?v=49000/);
 assert.match(adventure,/\.\/combat-engine\.js\?v=49000/);assert.match(adventure,/\.\/world-timeline\.js\?v=48000/);assert.match(adventure,/\.\/world-impact\.js\?v=48000/);assert.match(adventure,/\.\/item-engine\.js\?v=49000/);assert.match(adventure,/\.\/check-engine\.js\?v=49000/);assert.match(adventure,/\.\/talent-engine\.js\?v=49000/);
 assert.match(progression,/\.\/item-engine\.js\?v=49000/);assert.match(progression,/\.\/storage\.js\?v=49000/);assert.match(progression,/\.\/history-future\.js\?v=48000/);assert.match(progression,/\.\/future-runtime\.js\?v=47000/);
 assert.match(check,/\.\/talent-engine\.js\?v=49000/);assert.match(timeline,/IMPACT_SCOPES/)
});
