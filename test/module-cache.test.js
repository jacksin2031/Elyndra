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

test("v0.41.0 refreshes State Sync dependency chain while preserving Causal World Core generation",async()=>{
 const [html,app,client,adventure,storage,turn,contracts]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/storage.js",import.meta.url),"utf8"),
  readFile(new URL("../src/turn-outcome.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-runtime-contracts.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=41000/);
 assert.match(html,/styles\.css\?v=38001/);
 assert.match(app,/\.\/src\/version\.js\?v=41000/);
 assert.match(app,/\.\/src\/ai-client\.js\?v=41000/);
 assert.match(app,/\.\/src\/adventure-engine\.js\?v=41000/);
 assert.match(app,/\.\/src\/storage\.js\?v=41000/);
 assert.match(app,/\.\/src\/state-sync\.js\?v=41000/);
 assert.match(app,/\.\/src\/world-engine\.js\?v=40000/);
 assert.match(app,/\.\/src\/game-engine\.js\?v=40000/);
 assert.match(app,/\.\/src\/combat-engine\.js\?v=40000/);
 assert.match(app,/\.\/src\/progression-ui\.js\?v=41000/);
 assert.match(client,/\.\/turn-outcome\.js\?v=41000/);
 assert.match(client,/\.\/ai-runtime-contracts\.js\?v=41000/);
 assert.match(client,/\.\/state-sync\.js\?v=41000/);
 assert.match(adventure,/\.\/state-sync\.js\?v=41000/);
 assert.match(adventure,/\.\/combat-engine\.js\?v=40000/);
 assert.match(storage,/\.\/state-validator\.js\?v=41000/);
 assert.match(storage,/\.\/causal-world-core\.js\?v=40000/);
 assert.match(turn,/\.\/state-sync\.js\?v=41000/);
 assert.match(contracts,/\.\/state-sync\.js\?v=41000/);
 assert.match(app,/\.\/src\/world-creation\.js\?v=37001/);
 assert.match(app,/\.\/src\/contextual-actions\.js\?v=38003/)
});
