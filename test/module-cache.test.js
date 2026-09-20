import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";

test("browser module graph uses explicit cache versions for nested src imports",async()=>{
 const files=(await readdir(new URL("../src/",import.meta.url))).filter(x=>x.endsWith(".js"));
 for(const file of files){
  const source=await readFile(new URL("../src/"+file,import.meta.url),"utf8");
  for(const match of source.matchAll(/from\s+"(\.\/[^"]+\.js)([^"]*)";/g)){
   assert.match(match[2],/^\?v=\d+$/,`${file} has unversioned internal import ${match[1]}`);
  }
 }
});

test("entry assets and app src imports share one cache version",async()=>{
 const [app,html]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8")
 ]);
 const versions=[...app.matchAll(/from\s+"\.\/src\/[^"]+\.js\?v=(\d+)";/g)].map(m=>m[1]);
 assert.ok(versions.length>5);
 assert.equal(new Set(versions).size,1);
 const v=versions[0];
 assert.match(html,new RegExp(`app\\.js\\?v=${v}`));
 assert.match(html,new RegExp(`styles\\.css\\?v=${v}`));
});
