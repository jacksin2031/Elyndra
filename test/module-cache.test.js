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

test("v0.53.0 propagates Causal Integrity changes through the browser cache graph",async()=>{
 const [html,app,client,creation,worldEngine,simulation,futureRuntime,lazy,causal,integrity,claims,ledger,catalog,storage,game,combat,adventure,progression,npcConversation,npcDialogue,npcEngine,faction,quest,itemEngine,check,registry,quality,visibility]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/world-creation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/world-simulation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/future-runtime.js",import.meta.url),"utf8"),readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),readFile(new URL("../src/causal-integrity.js",import.meta.url),"utf8"),
  readFile(new URL("../src/generation-claims.js",import.meta.url),"utf8"),readFile(new URL("../src/world-ledger.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-catalog.js",import.meta.url),"utf8"),readFile(new URL("../src/storage.js",import.meta.url),"utf8"),
  readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/combat-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8"),
  readFile(new URL("../src/npc-conversation.js",import.meta.url),"utf8"),readFile(new URL("../src/npc-dialogue-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/npc-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/faction-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/quest-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/item-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/check-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/world-registry.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-quality.js",import.meta.url),"utf8"),readFile(new URL("../src/visibility-lock.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=53001/);
 for(const path of ["version","ai-settings","ai-client","adventure-engine","game-engine","contextual-actions","debug-telemetry"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=53001"),path);
 for(const path of ["world-engine","storage","world-simulation","npc-conversation","npc-engine","faction-engine","quest-engine","combat-engine","progression-ui","lazy-generation","world-registry","item-engine","check-engine"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=53000"),path);
 assert.match(app,/\.\/src\/world-creation\.js\?v=52000/);assert.match(app,/\.\/src\/world-quality\.js\?v=51000/);assert.match(app,/\.\/src\/talent-engine\.js\?v=49000/);

 assert.match(client,/\.\/knowledge-model\.js\?v=40000/);assert.match(client,/\.\/world-quality\.js\?v=51000/);
 assert.match(worldEngine,/\.\/causal-world-core\.js\?v=53000/);
 assert.match(causal,/\.\/world-ledger\.js\?v=53000/);assert.match(causal,/\.\/generation-claims\.js\?v=53000/);assert.match(causal,/\.\/lazy-generation\.js\?v=53000/);assert.match(causal,/\.\/causal-integrity\.js\?v=53000/);
 assert.match(integrity,/\.\/world-ledger\.js\?v=53000/);assert.match(integrity,/\.\/generation-claims\.js\?v=53000/);assert.match(integrity,/\.\/lazy-generation\.js\?v=53000/);assert.match(integrity,/\.\/knowledge-model\.js\?v=40000/);
 assert.match(claims,/\.\/world-catalog\.js\?v=52000/);assert.match(lazy,/\.\/generation-claims\.js\?v=53000/);
 assert.match(registry,/\.\/generation-claims\.js\?v=53000/);assert.match(futureRuntime,/\.\/world-ledger\.js\?v=53000/);
 assert.match(simulation,/\.\/future-runtime\.js\?v=53000/);assert.match(simulation,/\.\/faction-engine\.js\?v=53000/);assert.match(simulation,/\.\/npc-engine\.js\?v=53000/);

 for(const mod of [faction,npcEngine,quest,check])assert.match(mod,/\.\/world-registry\.js\?v=53000/);
 assert.match(itemEngine,/\.\/world-registry\.js\?v=53000/);assert.match(itemEngine,/\.\/check-engine\.js\?v=53000/);
 assert.match(npcConversation,/\.\/world-registry\.js\?v=53000/);assert.match(npcConversation,/\.\/quest-engine\.js\?v=53000/);assert.match(npcConversation,/\.\/world-simulation\.js\?v=53000/);
 assert.match(npcDialogue,/\.\/world-registry\.js\?v=53000/);assert.match(npcDialogue,/\.\/quest-engine\.js\?v=53000/);assert.match(npcDialogue,/\.\/world-simulation\.js\?v=53000/);
 assert.match(storage,/\.\/causal-world-core\.js\?v=53000/);assert.match(storage,/\.\/item-engine\.js\?v=53000/);
 assert.match(game,/\.\/world-engine\.js\?v=53000/);assert.match(game,/\.\/world-simulation\.js\?v=53000/);assert.match(game,/\.\/item-engine\.js\?v=53000/);assert.match(game,/\.\/check-engine\.js\?v=53000/);
 assert.match(combat,/\.\/world-engine\.js\?v=53000/);assert.match(combat,/\.\/world-simulation\.js\?v=53000/);assert.match(combat,/\.\/check-engine\.js\?v=53000/);
 assert.match(adventure,/\.\/world-registry\.js\?v=53000/);assert.match(adventure,/\.\/combat-engine\.js\?v=53000/);assert.match(adventure,/\.\/item-engine\.js\?v=53000/);assert.match(adventure,/\.\/check-engine\.js\?v=53000/);
 assert.match(progression,/\.\/storage\.js\?v=53000/);assert.match(progression,/\.\/item-engine\.js\?v=53000/);assert.match(progression,/\.\/world-registry\.js\?v=53000/);assert.match(progression,/\.\/future-runtime\.js\?v=53000/);
 assert.match(creation,/\.\/origin-runtime\.js\?v=45000/);assert.match(quality,/\.\/visibility-lock\.js\?v=51000/);assert.match(visibility,/CANON_LOCKED/);assert.match(catalog,/WORLD_CATALOG_KINDS/);assert.match(ledger,/compactLedgerEntries/)
});
