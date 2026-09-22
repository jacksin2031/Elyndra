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

test("v0.50.0 preserves v0.49 while propagating Legacy Echo cache graph",async()=>{
 const [html,app,client,worldEngine,simulation,futureRuntime,legacy,lazy,causal,storage,game,combat,adventure,progression,npcConversation,npcDialogue,itemEngine,check]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-simulation.js",import.meta.url),"utf8"),readFile(new URL("../src/future-runtime.js",import.meta.url),"utf8"),
  readFile(new URL("../src/history-legacy.js",import.meta.url),"utf8"),readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),readFile(new URL("../src/storage.js",import.meta.url),"utf8"),
  readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/combat-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8"),
  readFile(new URL("../src/npc-conversation.js",import.meta.url),"utf8"),readFile(new URL("../src/npc-dialogue-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/item-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/check-engine.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=50000/);
 for(const path of ["version","world-engine","ai-client","adventure-engine","game-engine","storage","world-simulation","npc-conversation","combat-engine","progression-ui","lazy-generation"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=50000"),path);
 for(const path of ["item-engine","check-engine","talent-engine","journey-closure"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=49000"),path);
 for(const path of ["world-impact","world-quality","document-engine","item-heritage"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=48000"),path);
 assert.match(client,/\.\/world-quality\.js\?v=48000/);assert.match(client,/\.\/world-timeline\.js\?v=48000/);
 assert.match(worldEngine,/\.\/causal-world-core\.js\?v=50000/);
 assert.match(simulation,/\.\/future-runtime\.js\?v=50000/);assert.match(simulation,/\.\/world-timeline\.js\?v=48000/);
 assert.match(futureRuntime,/\.\/future-engine\.js\?v=48000/);assert.match(futureRuntime,/\.\/history-future\.js\?v=48000/);assert.match(futureRuntime,/\.\/history-legacy\.js\?v=50000/);
 assert.match(legacy,/\.\/document-engine\.js\?v=48000/);assert.match(legacy,/\.\/item-heritage\.js\?v=48000/);
 assert.match(lazy,/\.\/generation-claims\.js\?v=44000/);assert.match(lazy,/\.\/history-legacy\.js\?v=50000/);
 assert.match(causal,/\.\/lazy-generation\.js\?v=50000/);assert.match(causal,/\.\/history-legacy\.js\?v=50000/);
 assert.match(storage,/\.\/causal-world-core\.js\?v=50000/);assert.match(storage,/\.\/item-engine\.js\?v=49000/);
 assert.match(game,/\.\/world-engine\.js\?v=50000/);assert.match(game,/\.\/world-simulation\.js\?v=50000/);assert.match(game,/\.\/item-engine\.js\?v=49000/);assert.match(game,/\.\/check-engine\.js\?v=49000/);
 assert.match(combat,/\.\/world-engine\.js\?v=50000/);assert.match(combat,/\.\/world-simulation\.js\?v=50000/);assert.match(combat,/\.\/check-engine\.js\?v=49000/);
 assert.match(adventure,/\.\/combat-engine\.js\?v=50000/);assert.match(adventure,/\.\/item-engine\.js\?v=49000/);assert.match(adventure,/\.\/check-engine\.js\?v=49000/);
 assert.match(progression,/\.\/storage\.js\?v=50000/);assert.match(progression,/\.\/item-engine\.js\?v=49000/);assert.match(progression,/\.\/future-runtime\.js\?v=50000/);
 assert.match(npcConversation,/\.\/world-simulation\.js\?v=50000/);assert.match(npcDialogue,/\.\/world-simulation\.js\?v=50000/);
 assert.match(itemEngine,/\.\/check-engine\.js\?v=49000/);assert.match(check,/\.\/talent-engine\.js\?v=49000/)
});
