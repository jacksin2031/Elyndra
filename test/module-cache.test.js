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

test("v0.38.3 refreshes contextual action seal and dual-AI timeout modules",async()=>{
 const [html,app,client,adventure,contextual]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/contextual-actions.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=38003/);
 assert.match(html,/styles\.css\?v=38001/);
 assert.match(app,/\.\/src\/version\.js\?v=38003/);
 assert.match(app,/\.\/src\/ai-client\.js\?v=38003/);
 assert.match(app,/\.\/src\/adventure-engine\.js\?v=38003/);
 assert.match(app,/\.\/src\/contextual-actions\.js\?v=38003/);
 assert.match(app,/\.\/src\/turn-compiler\.js\?v=38000/);
 assert.match(app,/\.\/src\/world-creation\.js\?v=37001/);
 assert.match(client,/\.\/world-compiler\.js\?v=38001/);
 assert.match(client,/\.\/turn-compiler\.js\?v=38000/);
 assert.match(client,/\.\/ai-runtime-contracts\.js\?v=38000/);
 assert.match(adventure,/\.\/contextual-actions\.js\?v=38003/);
 assert.match(contextual,/\.\/action-intent\.js\?v=38000/)
});
