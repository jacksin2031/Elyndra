import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readdirSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {createRateLimiter,safeBody,errorStatus} from "../api/_ai.js";
import {buildPagesArtifact} from "../scripts/build-pages-artifact.mjs";

test("malformed client JSON returns 400 across all server routes without provider calls",async()=>{
 assert.throws(()=>safeBody({body:"{broken"}),error=>error.code==="INVALID_JSON"&&errorStatus(error)===400);
 const previous=process.env.ELYNDRA_SERVER_TOKEN;process.env.ELYNDRA_SERVER_TOKEN="disposable-recovery-test";
 const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error("UNEXPECTED_PROVIDER_CALL")};
 try{for(const file of readdirSync(new URL("../api/",import.meta.url)).filter(name=>name.endsWith(".js")&&!name.startsWith("_")&&name!=="health.js")){
  const {default:handler}=await import("../api/"+file),res={setHeader(){},end(value){this.body=JSON.parse(value)}};
  await handler({method:"POST",body:"{broken",headers:{authorization:"Bearer disposable-recovery-test"}},res);
  assert.equal(res.statusCode,400,file);assert.equal(res.body.error,"INVALID_JSON",file)
 }}finally{globalThis.fetch=originalFetch;if(previous===undefined)delete process.env.ELYNDRA_SERVER_TOKEN;else process.env.ELYNDRA_SERVER_TOKEN=previous}
});
test("rate limiter prunes expired clients and refuses overflow without resetting active limits",()=>{
 let now=0;const limiter=createRateLimiter({limit:2,maxBuckets:2,windowMs:1000,now:()=>now});
 assert.equal(limiter.consume("a"),true);assert.equal(limiter.consume("a"),true);assert.equal(limiter.consume("a"),false);
 now=100;assert.equal(limiter.consume("b"),true);assert.equal(limiter.consume("c"),false);assert.equal(limiter.size,2);assert.equal(limiter.consume("a"),false);
 now=1000;assert.equal(limiter.consume("c"),true);assert.equal(limiter.size,2);assert.equal(limiter.consume("b"),true);assert.equal(limiter.consume("b"),false);
 now=1100;assert.equal(limiter.consume("a"),true);assert.equal(limiter.size,2)
 let clock=100;const rollback=createRateLimiter({limit:2,maxBuckets:2,windowMs:10,now:()=>clock});rollback.consume("a");clock=90;rollback.consume("b");clock=100;assert.equal(rollback.consume("c"),true,"expired later-inserted client must be pruned after a clock rollback");assert.equal(rollback.size,2);
});
test("Pages artifact contains runtime resources but excludes server, logs and player/debug files",()=>{
 const root=mkdtempSync(path.join(tmpdir(),"elyndra-pages-"));
 for(const name of ["src","assets","output","debug-chrome","api"]){mkdirSync(path.join(root,name));writeFileSync(path.join(root,name,"probe.txt"),name)}
 writeFileSync(path.join(root,"src","runtime.js"),"export const ready=true;");writeFileSync(path.join(root,"assets","cover.webp"),"art");writeFileSync(path.join(root,"assets","ARTWORK.md"),"local provenance");writeFileSync(path.join(root,"src",".env"),"private");
 for(const name of ["index.html","app.js","autotest-export-sw.js","creator.css","world-style-library.css",".env","debug.json","package.json"]){writeFileSync(path.join(root,name),name)}
 const output=buildPagesArtifact({root});assert.deepEqual(readdirSync(output).sort(),["app.js","assets","autotest-export-sw.js","creator.css","index.html","src","world-style-library.css"].sort());
 assert.deepEqual(readdirSync(path.join(output,"src")),["runtime.js"]);assert.deepEqual(readdirSync(path.join(output,"assets")),["cover.webp"]);
 assert.throws(()=>buildPagesArtifact({root}),/DESTINATION_NOT_EMPTY/);
});
test("both supported CI runtimes use the full canonical suite and deployment uploads the allowlist artifact",()=>{
 const source=readFileSync(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8");
 const primary=source.slice(source.indexOf("- name: Full regression suite"),source.indexOf("- name: Set up secondary"));assert.match(primary,/run: npm test/);
 const secondary=source.slice(source.indexOf("- name: Secondary Node"),source.indexOf("\n  deploy:"));assert.match(secondary,/npm test/);
 assert.match(source,/node scripts\/build-pages-artifact\.mjs/);assert.match(source,/path: \.pages-artifact/);assert.doesNotMatch(source,/path: \.\s*$/m)
 const version=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8")).version;assert.ok(source.includes(`APP_VERSION="${version}"`),"deployed source verifier must require the current release");
});
