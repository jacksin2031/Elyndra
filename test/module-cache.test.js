import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";

test("every browser module import is explicitly cache-versioned",async()=>{
 const files=(await readdir(new URL("../src/",import.meta.url))).filter(x=>x.endsWith(".js"));
 for(const file of files){
  const source=await readFile(new URL("../src/"+file,import.meta.url),"utf8");
  for(const match of source.matchAll(/from\s+"(\.\/[^"]+\.js)([^"]*)";/g)){
   assert.match(match[2],/^\?v=\d+(?:&base=1)?$/,file+" missing cache version for "+match[1]);
  }
 }
});

test("v0.61.3 keeps browser entrypoints and repaired modules on fresh cache identities",async()=>{
 const [html,app]=await Promise.all([readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8")]);
 assert.match(html,/app\.js\?v=61003/);
 assert.match(html,/styles\.css\?v=61003/);assert.match(html,/creator\.css\?v=61003/);assert.match(html,/world-surfaces\.css\?v=61003/);
 const mapText=(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)||[])[1];assert.ok(mapText);
 const imports=JSON.parse(mapText).imports;
 assert.equal(imports["./src/version.js?v=60010"],"./src/version.js?v=61003");
 assert.equal(imports["./src/origin-runtime.js?v=57025"],"./src/origin-runtime.js?v=61003");
 assert.equal(imports["./src/ai-client.js?v=60010&base=1"],"./src/ai-client.js?v=61003&base=1");
 assert.equal(imports["./src/ai-settings.js?v=60012&base=1"],"./src/ai-settings.js?v=61003&base=1");
 assert.equal(imports["./src/ai-autotest.js?v=60010"],"./src/ai-autotest.js?v=61003");
 assert.equal(imports["./src/contextual-actions.js?v=60031&base=1"],"./src/contextual-actions.js?v=61003&base=1");
 assert.equal(imports["./src/game-engine.js?v=60006&base=1"],"./src/game-engine.js?v=61003&base=1");
 assert.equal(imports["./src/scene-provenance.js?v=57025"],"./src/scene-provenance.js?v=61003");
 assert.equal(imports["./src/travel-engine.js?v=57025"],"./src/travel-engine.js?v=61003");
 assert.equal(imports["./src/traditional-chinese-guard.js?v=59014"],"./src/traditional-chinese-guard.js?v=61003");
 const appImports=[...app.matchAll(/from "\.\/src\/[^"]+\.js\?v=(\d+)";/g)].map(x=>Number(x[1]));
 assert.ok(appImports.length>20);assert.ok(appImports.every(Number.isFinite));
 assert.match(app,/startDeveloperAutotest/);assert.match(app,/groundedSuggestionFailForward/);
});
