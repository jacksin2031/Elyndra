import assert from "node:assert/strict";
import http from "node:http";
import {readFile,writeFile,mkdtemp,rm} from "node:fs/promises";
import {join,normalize,extname} from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";
import {chromium} from "playwright";
const root=process.cwd(),port=4178,origin=`http://127.0.0.1:${port}`;
const mime={'.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const fixture=`<!doctype html><meta charset="utf-8"><button id="debug">debug</button><button id="world">world</button><script type="module">
import {buildAutotestExportSnapshot,buildAutotestExportArtifacts,saveLastAutotestExportSnapshot} from "/src/autotest-export.js?v=57010";
import {buildAutotestDownloadPayload,ensureAutotestDownloadBridge,requestAutotestBrowserDownload} from "/src/autotest-download.js?v=57010";
const results=[1,2].map(index=>({index,status:"COMPLETED",stopReason:"TURN_LIMIT",summary:{index},world:{formatVersion:1,world:{id:"W"+index,name:"世界"+index},player:{name:"P"+index}}}));
const snapshot=buildAutotestExportSnapshot({appVersion:"0.57.10",report:{summary:{worldsRequested:2,totalTurns:60}},results,createdAt:"2026-09-25T04:30:00.000Z",exportMode:"both"});
await saveLastAutotestExportSnapshot(snapshot);const artifacts=buildAutotestExportArtifacts(snapshot);const expected={};for(const kind of ["debug","world"]){const p=await buildAutotestDownloadPayload(artifacts[kind]);expected[kind]={filename:p.filename,bytes:p.bytes,sha256:p.sha256,body:p.body}}
const bridge=await ensureAutotestDownloadBridge({scriptUrl:"/autotest-export-sw.js?v=57010",scope:"/",timeoutMs:5000});window.__bridge=bridge;window.__expected=expected;window.__requests={};
for(const kind of ["debug","world"])document.querySelector("#"+kind).addEventListener("click",()=>{window.__requests[kind]=requestAutotestBrowserDownload(artifacts[kind])});window.__ready=true;
</script>`;
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,origin);if(u.pathname==="/proof.html"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"});res.end(fixture);return}const rel=normalize(decodeURIComponent(u.pathname)).replace(/^[/\\]+/,"");if(rel.includes("..")){res.writeHead(403);res.end();return}const file=join(root,rel),body=await readFile(file);res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream","Cache-Control":"no-store"});res.end(body)}catch{res.writeHead(404);res.end("not found")}});
await new Promise(resolve=>server.listen(port,"127.0.0.1",resolve));const out=await mkdtemp(join(tmpdir(),"elyndra-v05710-"));
try{const browser=await chromium.launch({headless:true});const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();await page.goto(origin+"/proof.html",{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>window.__ready===true&&navigator.serviceWorker?.controller&&window.__bridge?.controlled===true,{timeout:10000});
for(const kind of ["debug","world"]){const expected=await page.evaluate(k=>window.__expected[k],kind),wait=page.waitForEvent("download",{timeout:10000});await page.click("#"+kind);const download=await wait;assert.equal(download.suggestedFilename(),expected.filename);const failure=await download.failure();assert.equal(failure,null,`browser download failed: ${failure||"unknown"}`);const nativePath=await download.path();assert.ok(nativePath,"Chromium must expose a landed download file");const bytes=await readFile(nativePath),sha=createHash("sha256").update(bytes).digest("hex");assert.equal(bytes.length,expected.bytes);assert.equal(sha,expected.sha256);assert.equal(bytes.toString("utf8"),expected.body);const request=await page.evaluate(k=>window.__requests[k],kind);assert.equal(request.method,"service-worker-http");assert.equal(request.bridgeControlled,true);console.log(`IAB_HTTP_FIRST_CLICK PASS kind=${kind} filename=${expected.filename} bytes=${bytes.length} sha256=${sha}`)}await browser.close()}finally{server.close();await rm(out,{recursive:true,force:true})}
