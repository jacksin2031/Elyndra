import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";

test("every browser module import is explicitly cache-versioned",async()=>{
 const files=(await readdir(new URL("../src/",import.meta.url))).filter(x=>x.endsWith(".js"));
 for(const file of files){
  const source=await readFile(new URL("../src/"+file,import.meta.url),"utf8");
  for(const match of source.matchAll(/from\s+"(\.\/[^"]+\.js)([^"]*)";/g)){
   assert.match(match[2],/^\?v=\d+$/,file+" missing cache version for "+match[1])
  }
 }
});

test("v0.31.0 adds Agnes mode without invalidating recovery compiler modules",async()=>{
 const [html,app,client]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=310/);
 assert.match(app,/\.\/src\/version\.js\?v=310/);
 assert.match(app,/\.\/src\/ai-settings\.js\?v=310/);\n assert.match(app,/\.\/src\/ai-client\.js\?v=300/);
 assert.match(app,/\.\/src\/world-randomizer\.js\?v=290/);
 for(const mod of ["world-engine","world-registry"])assert.match(app,new RegExp("\\.\\/src\\/"+mod+"\\.js\\?v=280"));
 assert.match(app,/\.\/src\/world-quality\.js\?v=300/);
 assert.match(client,/\.\/world-compiler\.js\?v=280/);
 assert.match(client,/\.\/world-quality\.js\?v=300/);
 assert.match(client,/\.\/model-json\.js\?v=281/)
});
