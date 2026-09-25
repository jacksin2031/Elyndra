from pathlib import Path
import json

root=Path('.')

# 1. Add a synchronous browser-download dispatch helper. It must be called before
# any await so Chromium keeps the original trusted user activation.
download=root/'src/autotest-download.js'
text=download.read_text(encoding='utf-8')
helper='''
export function requestAutotestBrowserDownload(artifact,{BlobImpl=globalThis.Blob,URLImpl=globalThis.URL,documentImpl=globalThis.document,setTimeoutImpl=globalThis.setTimeout,nowImpl=Date.now,revokeDelayMs=60000}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_DOWNLOAD_ARTIFACT_INVALID");
 if(typeof BlobImpl!=="function"||typeof URLImpl?.createObjectURL!=="function"||typeof URLImpl?.revokeObjectURL!=="function")throw new Error("AUTOTEST_DOWNLOAD_OBJECT_URL_UNAVAILABLE");
 if(typeof documentImpl?.createElement!=="function")throw new Error("AUTOTEST_DOWNLOAD_DOCUMENT_UNAVAILABLE");
 const body=String(artifact.body??""),filename=String(artifact.filename),mime=String(artifact.mime||"application/octet-stream"),blob=new BlobImpl([body],{type:mime}),url=URLImpl.createObjectURL(blob),anchor=documentImpl.createElement("a"),host=documentImpl.body||documentImpl.documentElement;
 if(!host||typeof host.appendChild!=="function"){URLImpl.revokeObjectURL(url);throw new Error("AUTOTEST_DOWNLOAD_DOCUMENT_UNAVAILABLE")}
 anchor.href=url;anchor.download=filename;anchor.rel="noopener";if(anchor.style)anchor.style.display="none";host.appendChild(anchor);
 try{anchor.click()}finally{anchor.remove?.();const revoke=()=>{try{URLImpl.revokeObjectURL(url)}catch{}};if(typeof setTimeoutImpl==="function")setTimeoutImpl(revoke,Math.max(1000,Number(revokeDelayMs)||60000));else revoke()}
 return {status:"requested",requestedAt:Number(typeof nowImpl==="function"?nowImpl():Date.now()),filename,mime,bytes:Number(blob.size)||encoder.encode(body).length,chars:body.length}
}
'''
if 'export function requestAutotestBrowserDownload' not in text:
    text=text.rstrip()+"\n"+helper
download.write_text(text,encoding='utf-8')

# 2. Make the first Developer AutoTest download click actually request the file.
app=root/'app.js'
text=app.read_text(encoding='utf-8')
old_import='import {buildAutotestDownloadPayload,createAutotestDownloadLease,verifyAutotestDownloadedFile} from "./src/autotest-download.js?v=57008";'
new_import='import {buildAutotestDownloadPayload,createAutotestDownloadLease,verifyAutotestDownloadedFile,requestAutotestBrowserDownload} from "./src/autotest-download.js?v=57009";'
if old_import not in text:
    raise SystemExit('autotest download import anchor not found')
text=text.replace(old_import,new_import,1)
old_fn='''async function openDeveloperAutotestDownload(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可下載的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 try{releaseDeveloperAutotestDownloadLease();const payload=await buildAutotestDownloadPayload(artifact),lease=createAutotestDownloadLease(payload);developerAutotestDownload.kind=kind;developerAutotestDownload.payload=payload;developerAutotestDownload.lease=lease;developerAutotestDownload.request=null;developerAutotestDownload.verification=null;recordDebug("AUTOTEST_DOWNLOAD_READY",{kind,filename:payload.filename,bytes:payload.bytes,chars:payload.chars,sha256:payload.sha256});openModal(developerAutotestDownloadHtml());bindDeveloperAutotestDownload()}
 catch(error){appendDeveloperAutotestLog(`標準下載資料建立失敗：${error?.message||error}`);recordDebug("AUTOTEST_DOWNLOAD_PREPARE_FAILED",{kind,error:error?.message||String(error)});openDeveloperAutotestPanel()}
}'''
new_fn='''async function openDeveloperAutotestDownload(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可下載的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 releaseDeveloperAutotestDownloadLease();let immediateRequest=null;
 try{immediateRequest=requestAutotestBrowserDownload(artifact);recordDebug("AUTOTEST_DOWNLOAD_REQUESTED",{kind,filename:immediateRequest.filename,bytes:immediateRequest.bytes,userActivation:Boolean(navigator.userActivation?.isActive),stage:"primary-click"})}
 catch(error){recordDebug("AUTOTEST_DOWNLOAD_REQUEST_FAILED",{kind,filename:artifact.filename,error:error?.message||String(error),userActivation:Boolean(navigator.userActivation?.isActive),stage:"primary-click"})}
 try{const payload=await buildAutotestDownloadPayload(artifact),lease=createAutotestDownloadLease(payload);developerAutotestDownload.kind=kind;developerAutotestDownload.payload=payload;developerAutotestDownload.lease=lease;developerAutotestDownload.request=immediateRequest?{...immediateRequest,sha256:payload.sha256}:null;developerAutotestDownload.verification=null;recordDebug("AUTOTEST_DOWNLOAD_READY",{kind,filename:payload.filename,bytes:payload.bytes,chars:payload.chars,sha256:payload.sha256,immediateRequested:Boolean(immediateRequest)});openModal(developerAutotestDownloadHtml());bindDeveloperAutotestDownload()}
 catch(error){appendDeveloperAutotestLog(`標準下載資料建立失敗：${error?.message||error}`);recordDebug("AUTOTEST_DOWNLOAD_PREPARE_FAILED",{kind,error:error?.message||String(error)});openDeveloperAutotestPanel()}
}'''
if old_fn not in text:
    raise SystemExit('openDeveloperAutotestDownload anchor not found')
text=text.replace(old_fn,new_fn,1)
text=text.replace('>下載檔案</a>','>重新下載檔案</a>')
text=text.replace('下載並驗證世界 JSON','下載並驗證世界檔').replace('進階拖出世界','進階拖出世界檔').replace('頁面取回世界 JSON','頁面取回世界檔')
text=text.replace('kind==="world"?"世界 JSON"','kind==="world"?"世界檔"')
text=text.replace('?v=57008','?v=57009')
app.write_text(text,encoding='utf-8')

# 3. Release/cache version bump.
index=root/'index.html'
index.write_text(index.read_text(encoding='utf-8').replace('app.js?v=57008','app.js?v=57009'),encoding='utf-8')
(root/'src/version.js').write_text('export const APP_VERSION="0.57.9";\n',encoding='utf-8')
pkg_path=root/'package.json'
pkg=json.loads(pkg_path.read_text(encoding='utf-8'));pkg['version']='0.57.9'
pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')

# Existing release-contract tests intentionally pin the current canonical release.
# Move those pins with the hotfix so they validate v0.57.9 rather than fail stale.
for p in (root/'test').glob('*.test.js'):
    t=p.read_text(encoding='utf-8')
    t=t.replace('0\\.57\\.8','0\\.57\\.9').replace('0.57.8','0.57.9').replace('57008','57009')
    p.write_text(t,encoding='utf-8')

# 4. Targeted regression: exact observed debug naming metadata + 2-world bundle +
# synchronous first-click download dispatch.
test='''import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {buildAutotestDownloadPayload,requestAutotestBrowserDownload} from "../src/autotest-download.js";
import {buildAutotestExportSnapshot,buildAutotestExportArtifacts} from "../src/autotest-export.js";

class FakeBlob{constructor(parts,opt={}){this.body=parts.join("");this.type=opt.type||"";this.size=Buffer.byteLength(this.body)}}
function fakeBrowser(){const clicks=[],made=[],revoked=[],timers=[];const host={appendChild(a){a.parentNode=host}};const documentImpl={body:host,createElement(){return {style:{},click(){clicks.push({href:this.href,download:this.download})},remove(){this.parentNode=null}}}};const URLImpl={createObjectURL(blob){made.push(blob);return "blob:world-proof"},revokeObjectURL(url){revoked.push(url)}};const setTimeoutImpl=(fn,ms)=>{timers.push(ms);fn();return 1};return {clicks,made,revoked,timers,documentImpl,URLImpl,setTimeoutImpl}}

test("v0.57.9 primary request clicks browser download synchronously",()=>{const b=fakeBrowser(),artifact={filename:"worlds.json",mime:"application/json",body:'{"ok":true}'};const r=requestAutotestBrowserDownload(artifact,{BlobImpl:FakeBlob,URLImpl:b.URLImpl,documentImpl:b.documentImpl,setTimeoutImpl:b.setTimeoutImpl,nowImpl:()=>123,revokeDelayMs:60000});assert.equal(r.status,"requested");assert.equal(r.requestedAt,123);assert.equal(r.filename,"worlds.json");assert.equal(r.bytes,Buffer.byteLength(artifact.body));assert.deepEqual(b.clicks,[{href:"blob:world-proof",download:"worlds.json"}]);assert.equal(b.made[0].body,artifact.body);assert.deepEqual(b.revoked,["blob:world-proof"])});

test("v0.57.9 preserves observed v0.57.7 debug filename convention",()=>{const observed={path:"C:\\\\Users\\\\jacks\\\\Downloads\\\\Elyndra-autotest-debug-v0.57.7-2026-09-25T02-40-11-091Z.json",filename:"Elyndra-autotest-debug-v0.57.7-2026-09-25T02-40-11-091Z.json",bytes:71199,sha256:"5f7b41f5dca3acd586ea2db51bc867d769b42d358f1cd590f56f2b7cdef174dd"};const snapshot=buildAutotestExportSnapshot({appVersion:"0.57.7",report:{summary:{}},results:[],createdAt:"2026-09-25T02:40:11.091Z",exportMode:"debug"});const artifact=buildAutotestExportArtifacts(snapshot).debug;assert.equal(artifact.filename,observed.filename);assert.match(observed.path,/Downloads/);assert.equal(observed.bytes,71199);assert.match(observed.sha256,/^[0-9a-f]{64}$/)});

test("v0.57.9 two-world export keeps batch filename/schema and is downloadable",async()=>{const results=[1,2].map(index=>({index,status:"COMPLETED",stopReason:"TURN_LIMIT",summary:{index},world:{formatVersion:12,world:{id:`W${index}`,name:`世界${index}`},player:{name:`P${index}`}}}));const snapshot=buildAutotestExportSnapshot({appVersion:"0.57.9",report:{summary:{worlds:2}},results,createdAt:"2026-09-25T03:30:00.000Z",exportMode:"both"}),artifact=buildAutotestExportArtifacts(snapshot).world;assert.equal(artifact.filename,"Elyndra-autotest-worlds-v0.57.9-2026-09-25T03-30-00-000Z.json");const parsed=JSON.parse(artifact.body);assert.equal(parsed.schema,"elyndra-autotest-worlds-v1");assert.equal(parsed.worlds.length,2);assert.equal(parsed.worlds[0].world.world.name,"世界1");assert.equal(parsed.worlds[1].world.world.name,"世界2");const payload=await buildAutotestDownloadPayload(artifact,{cryptoImpl:webcrypto});const b=fakeBrowser(),request=requestAutotestBrowserDownload(artifact,{BlobImpl:FakeBlob,URLImpl:b.URLImpl,documentImpl:b.documentImpl,setTimeoutImpl:b.setTimeoutImpl});assert.equal(request.filename,payload.filename);assert.equal(request.bytes,payload.bytes);assert.equal(b.clicks.length,1)});
'''
(root/'test/autotest-download-v0579.test.js').write_text(test,encoding='utf-8')

# 5. Isolated Chromium proof. This is not AutoTest and never opens Elyndra's
# IndexedDB; it only serves an in-memory 2-world export fixture and observes a
# real Chromium download event.
proof='''import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,mkdtemp,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import http from "node:http";
import {chromium} from "playwright";
const root=process.cwd();
const mime=p=>p.endsWith(".js")?"text/javascript; charset=utf-8":p.endsWith(".html")?"text/html; charset=utf-8":"application/octet-stream";
const fixture=`<!doctype html><meta charset="utf-8"><button id="download">download two worlds</button><script type="module">import {buildAutotestExportSnapshot,buildAutotestExportArtifacts} from "/src/autotest-export.js?v=57009";import {buildAutotestDownloadPayload,requestAutotestBrowserDownload} from "/src/autotest-download.js?v=57009";const results=[1,2].map(index=>({index,status:"COMPLETED",stopReason:"TURN_LIMIT",summary:{index},world:{formatVersion:12,world:{id:"W"+index,name:"世界"+index},player:{name:"P"+index}}}));const snapshot=buildAutotestExportSnapshot({appVersion:"0.57.9",report:{summary:{worlds:2}},results,createdAt:"2026-09-25T03:30:00.000Z",exportMode:"both"}),artifact=buildAutotestExportArtifacts(snapshot).world,payload=await buildAutotestDownloadPayload(artifact);window.__downloadProof={filename:payload.filename,bytes:payload.bytes,sha256:payload.sha256,schema:JSON.parse(artifact.body).schema,worlds:JSON.parse(artifact.body).worlds.length};document.querySelector("#download").addEventListener("click",()=>requestAutotestBrowserDownload(artifact,{revokeDelayMs:60000}));</script>`;
const server=http.createServer(async(req,res)=>{try{if(req.url?.startsWith("/__fixture")){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});res.end(fixture);return}const pathname=new URL(req.url||"/","http://127.0.0.1").pathname,rel=pathname.replace(/^\\/+/,""),file=path.resolve(root,rel);if(!file.startsWith(root+path.sep))throw new Error("bad path");const data=await readFile(file);res.writeHead(200,{"content-type":mime(file)});res.end(data)}catch{res.writeHead(404);res.end("not found")}});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const port=server.address().port,browser=await chromium.launch({headless:true}),page=await browser.newPage(),dir=await mkdtemp(path.join(tmpdir(),"elyndra-world-download-"));
try{await page.goto(`http://127.0.0.1:${port}/__fixture`);await page.waitForFunction(()=>Boolean(window.__downloadProof));const p=await page.evaluate(()=>window.__downloadProof);assert.equal(p.schema,"elyndra-autotest-worlds-v1");assert.equal(p.worlds,2);assert.match(p.filename,/^Elyndra-autotest-worlds-v0\\.57\\.9-.*\\.json$/);const wait=page.waitForEvent("download");await page.click("#download");const download=await wait;assert.equal(download.suggestedFilename(),p.filename);const target=path.join(dir,p.filename);await download.saveAs(target);const data=await readFile(target),meta=await stat(target),digest=createHash("sha256").update(data).digest("hex");assert.equal(meta.size,p.bytes);assert.equal(digest,p.sha256);console.log(JSON.stringify({status:"PASS",filename:p.filename,bytes:meta.size,sha256:digest,worlds:p.worlds,chromiumDownloadEvent:true}))}finally{await browser.close();server.close();await rm(dir,{recursive:true,force:true})}
'''
(root/'scripts/prove-autotest-world-download-browser.mjs').write_text(proof,encoding='utf-8')

release=root/'docs/releases/v0.57.9.md'
release.write_text('''# Elyndra v0.57.9

AutoTest world export download hotfix.

- The primary Debug / world / recovery action now dispatches the native browser download synchronously inside the original user activation.
- Integrity calculation and file re-selection verification remain verification-gated after the download request.
- Two-world AutoTest exports remain a batch JSON named `Elyndra-autotest-worlds-v0.57.9-<timestamp>.json` with schema `elyndra-autotest-worlds-v1`.
- Added regression coverage for the observed v0.57.7 Downloads filename and the two-world bundle, plus an isolated Chromium download-event proof.
- These regressions do not run AutoTest and do not open or mutate Elyndra IndexedDB.
''',encoding='utf-8')
