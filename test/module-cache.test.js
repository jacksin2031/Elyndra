import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";

async function entryCacheVersion(){
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const versions=[...app.matchAll(/from\s+"\.\/src\/[^"]+\.js\?v=(\d+)";/g)].map(m=>m[1]);
 assert.ok(versions.length>5);
 assert.equal(new Set(versions).size,1);
 return versions[0]
}

test("every nested browser module import uses the exact entry cache generation",async()=>{
 const expected=await entryCacheVersion(),files=(await readdir(new URL("../src/",import.meta.url))).filter(x=>x.endsWith(".js"));
 for(const file of files){
  const source=await readFile(new URL("../src/"+file,import.meta.url),"utf8");
  for(const match of source.matchAll(/from\s+"(\.\/[^"]+\.js)([^"]*)";/g)){
   assert.equal(match[2],"?v="+expected,file+" cache mismatch for "+match[1]+": expected ?v="+expected+", got "+(match[2]||"<none>"))
  }
 }
});

test("entry assets and app src imports share one cache version",async()=>{
 const v=await entryCacheVersion(),html=await readFile(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,new RegExp("app\\.js\\?v="+v));
 assert.match(html,new RegExp("styles\\.css\\?v="+v))
});
