from pathlib import Path

# The first staging run proved registration/ready can complete before the current
# document becomes controlled. Treat that as a one-navigation lifecycle state,
# not as a broken export bridge.
p=Path('src/autotest-http-handoff.js')
s=p.read_text(encoding='utf-8')
old='export async function ensureAutotestHttpExportWorker({navigatorImpl=globalThis.navigator,scriptUrl="./autotest-export-sw.js?v=57007",scope="./",timeoutMs=10000}={}){const sw=navigatorImpl?.serviceWorker;if(!sw?.register)return {supported:false,controlled:false,error:"SERVICE_WORKER_UNAVAILABLE"};const registration=await sw.register(scriptUrl,{scope,type:"module",updateViaCache:"none"});await sw.ready;const controlled=Boolean(sw.controller)||await waitForController(sw,timeoutMs);return {supported:true,controlled,scope:registration.scope||scope,scriptUrl}}'
new='export async function ensureAutotestHttpExportWorker({navigatorImpl=globalThis.navigator,scriptUrl="./autotest-export-sw.js?v=57007",scope="./",timeoutMs=3000}={}){const sw=navigatorImpl?.serviceWorker;if(!sw?.register)return {supported:false,controlled:false,reloadRequired:false,error:"SERVICE_WORKER_UNAVAILABLE"};const registration=await sw.register(scriptUrl,{scope,type:"module",updateViaCache:"none"});await sw.ready;const controlled=Boolean(sw.controller)||await waitForController(sw,timeoutMs);return {supported:true,controlled,reloadRequired:!controlled,scope:registration.scope||scope,scriptUrl}}'
assert old in s
s=s.replace(old,new,1)
s=s.replace('if(!worker.controlled)throw new Error("AUTOTEST_HTTP_SERVICE_WORKER_NOT_CONTROLLING");','if(!worker.controlled){const error=new Error("AUTOTEST_HTTP_SERVICE_WORKER_RELOAD_REQUIRED");error.code="AUTOTEST_HTTP_SERVICE_WORKER_RELOAD_REQUIRED";error.worker=worker;throw error;}',1)
p.write_text(s,encoding='utf-8')

# App bootstrap: register the bridge as soon as v0.57.7 loads. If the browser
# does not hand control to the current document, perform exactly one guarded
# reload. IndexedDB is persistent, so the saved AutoTest snapshot is preserved.
p=Path('app.js')
s=p.read_text(encoding='utf-8')
old='import {probeAutotestHttpHandoff,triggerAutotestHttpDownload,triggerAutotestHttpInline} from "./src/autotest-http-handoff.js?v=57007";'
new='import {ensureAutotestHttpExportWorker,probeAutotestHttpHandoff,triggerAutotestHttpDownload,triggerAutotestHttpInline} from "./src/autotest-http-handoff.js?v=57007";'
assert old in s
s=s.replace(old,new,1)
anchor='const developerAutotestHttpHandoff={ready:{},preparing:false,error:""};'
assert anchor in s
bootstrap=r'''const AUTOTEST_HTTP_SW_RELOAD_KEY="elyndra-autotest-http-sw-reload-v57007";
async function bootstrapAutotestHttpExportWorker(){
 try{
  const worker=await ensureAutotestHttpExportWorker({scriptUrl:"./autotest-export-sw.js?v=57007",scope:"./",timeoutMs:1500});
  if(!worker.supported)return;
  if(worker.controlled){sessionStorage.removeItem(AUTOTEST_HTTP_SW_RELOAD_KEY);return}
  if(worker.reloadRequired&&sessionStorage.getItem(AUTOTEST_HTTP_SW_RELOAD_KEY)!=="1"){
   sessionStorage.setItem(AUTOTEST_HTTP_SW_RELOAD_KEY,"1");
   location.reload();
  }
 }catch(error){recordDebug?.("AUTOTEST_HTTP_EXPORT_BOOTSTRAP_FAILED",{error:error?.message||String(error)})}
}
void bootstrapAutotestHttpExportWorker();'''
s=s.replace(anchor,anchor+'\n'+bootstrap,1)
oldcatch='catch(error){developerAutotestHttpHandoff.error=error?.message||String(error);recordDebug("AUTOTEST_HTTP_EXPORT_VERIFY_FAILED",{error:developerAutotestHttpHandoff.error})}finally{developerAutotestHttpHandoff.preparing=false;updateDeveloperAutotestHttpHandoffUI()}'
newcatch='catch(error){const message=error?.message||String(error);if(message==="AUTOTEST_HTTP_SERVICE_WORKER_RELOAD_REQUIRED"&&sessionStorage.getItem(AUTOTEST_HTTP_SW_RELOAD_KEY)!=="1"){sessionStorage.setItem(AUTOTEST_HTTP_SW_RELOAD_KEY,"1");appendDeveloperAutotestLog("HTTP bridge 已安裝；正在自動重新載入一次以取得 Service Worker 控制權。IndexedDB snapshot 會保留，不會重跑測試。");location.reload();return}developerAutotestHttpHandoff.error=message;recordDebug("AUTOTEST_HTTP_EXPORT_VERIFY_FAILED",{error:developerAutotestHttpHandoff.error})}finally{developerAutotestHttpHandoff.preparing=false;updateDeveloperAutotestHttpHandoffUI()}'
assert oldcatch in s
s=s.replace(oldcatch,newcatch,1)
# Clear the one-time marker once a real proof succeeds.
s=s.replace('developerAutotestHttpHandoff.ready[kind]=proof;recordDebug("AUTOTEST_HTTP_EXPORT_VERIFIED"','developerAutotestHttpHandoff.ready[kind]=proof;sessionStorage.removeItem(AUTOTEST_HTTP_SW_RELOAD_KEY);recordDebug("AUTOTEST_HTTP_EXPORT_VERIFIED"',1)
p.write_text(s,encoding='utf-8')

# Replace the browser E2E with a lifecycle-faithful test: seed IDB, install SW,
# navigate once to obtain control, probe exact response, then require an actual
# Chromium download event and byte-for-byte file readback.
Path('scripts/test-autotest-http-download.mjs').write_text(r'''import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {readFile} from "node:fs/promises";
import {chromium} from "playwright";
const port=4173,origin=`http://127.0.0.1:${port}`,server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
async function waitServer(){for(let i=0;i<50;i++){try{const r=await fetch(origin+"/index.html");if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error("HTTP_SERVER_NOT_READY")}
try{
 await waitServer();
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({acceptDownloads:true});
 const page=await context.newPage();
 await page.goto(origin+"/index.html",{waitUntil:"domcontentloaded"});
 const expected=await page.evaluate(async()=>{
  const snapshot={slot:"last",schema:"elyndra-autotest-export-v2",appVersion:"0.57.6",createdAt:"2026-09-24T19:11:04.539Z",stamp:"2026-09-24T19-11-04-539Z",exportMode:"both",debugPayload:{schema:"browser-e2e",worlds:["玄脈九域","九脈斷朝"],turns:60,text:"驗證 IAB HTTP download"},worlds:[{index:1,status:"COMPLETED",stopReason:"TURN_LIMIT",summary:{name:"玄脈九域"},world:{name:"玄脈九域",turns:30}},{index:2,status:"COMPLETED",stopReason:"TURN_LIMIT",summary:{name:"九脈斷朝"},world:{name:"九脈斷朝",turns:30}}]};
  await new Promise((resolve,reject)=>{const req=indexedDB.open("elyndra-autotest-exports-v1",1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("snapshots"))db.createObjectStore("snapshots",{keyPath:"slot"})};req.onsuccess=()=>{const db=req.result,tx=db.transaction("snapshots","readwrite");tx.objectStore("snapshots").put(snapshot);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};req.onerror=()=>reject(req.error)});
  const exports=await import("/src/autotest-export.js?v=57007"),bridge=await import("/src/autotest-http-handoff.js?v=57007"),artifact=exports.buildAutotestExportArtifacts(snapshot).debug,integrity=await bridge.autotestHttpArtifactIntegrity(artifact);
  const registration=await navigator.serviceWorker.register("/autotest-export-sw.js?v=57007",{scope:"/",type:"module",updateViaCache:"none"});await navigator.serviceWorker.ready;
  return {filename:artifact.filename,body:artifact.body,bytes:integrity.bytes,sha256:integrity.sha256,scope:registration.scope};
 });
 // A navigation is the deterministic lifecycle boundary for a newly installed SW.
 await page.reload({waitUntil:"domcontentloaded"});
 const controlled=await page.evaluate(()=>Boolean(navigator.serviceWorker.controller));
 assert.equal(controlled,true,"page must be controlled after lifecycle reload");
 const proof=await page.evaluate(async()=>{const exports=await import("/src/autotest-export.js?v=57007"),bridge=await import("/src/autotest-http-handoff.js?v=57007"),snapshot=await exports.loadLastAutotestExportSnapshot(),artifact=exports.buildAutotestExportArtifacts(snapshot).debug;return bridge.probeAutotestHttpHandoff("debug",artifact,{baseHref:location.href,workerOptions:{scriptUrl:"/autotest-export-sw.js?v=57007",scope:"/",timeoutMs:1000}})});
 assert.equal(proof.verified,true);assert.equal(proof.serviceWorkerControlled,true);assert.equal(proof.filename,expected.filename);assert.equal(proof.bytes,expected.bytes);assert.equal(proof.sha256,expected.sha256);
 const downloadPromise=page.waitForEvent("download",{timeout:10000});
 await page.evaluate(url=>{const a=document.createElement("a");a.href=url;a.rel="noopener";document.body.appendChild(a);a.click()},proof.downloadUrl);
 const download=await downloadPromise;
 assert.equal(download.suggestedFilename(),expected.filename);
 const path=await download.path();assert.ok(path);
 const body=(await readFile(path)).toString("utf8");assert.equal(body,expected.body);assert.equal(new TextEncoder().encode(body).length,expected.bytes);
 console.log(`IAB_HTTP_DOWNLOAD_E2E PASS event=download controlled=true exactBody=true filename=${expected.filename} bytes=${expected.bytes} sha256=${expected.sha256}`);
 await browser.close();
}finally{server.kill("SIGTERM")}
''',encoding='utf-8')

# Unit coverage for the reload-required state.
p=Path('test/autotest-http-handoff-v0577.test.js')
s=p.read_text(encoding='utf-8')
s += r'''
test("uncontrolled first document reports deterministic reload requirement",async()=>{const artifact={filename:"first-load.json",body:'{"ok":true}'};const sw={controller:null,ready:Promise.resolve({scope:"https://example.test/"}),register:async()=>({scope:"https://example.test/"}),addEventListener:()=>{},removeEventListener:()=>{}};await assert.rejects(()=>probeAutotestHttpHandoff("debug",artifact,{navigatorImpl:{serviceWorker:sw},fetchImpl:async()=>{throw new Error("fetch must not run before control")},baseHref:"https://example.test/Elyndra/",workerOptions:{timeoutMs:0}}),/AUTOTEST_HTTP_SERVICE_WORKER_RELOAD_REQUIRED/)})
'''
p.write_text(s,encoding='utf-8')
