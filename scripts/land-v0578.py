from pathlib import Path
import re

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    p=ROOT/path
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(text,encoding='utf-8')

def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old,new,1)

# Version + browser cache generation.
pkg=read(Path('package.json'))
pkg=replace_once(pkg,'"version": "0.57.7"','"version": "0.57.8"','package version')
write(Path('package.json'),pkg)
write(Path('src/version.js'),'export const APP_VERSION="0.57.8";\n')

html=read(Path('index.html'))
html=replace_once(html,'app.js?v=57007','app.js?v=57008','index app cache token')
write(Path('index.html'),html)

# Correct the v0.57.7 drag diagnostic: add(File) may return null without throwing.
drag=read(Path('src/autotest-drag-export.js'))
old='export function applyAutotestDragPayload(dataTransfer,payload,{FileImpl=globalThis.File}={}){if(!dataTransfer)throw new Error("AUTOTEST_DRAG_DATA_TRANSFER_UNAVAILABLE");const file=createAutotestDragFile(payload,{FileImpl});let fileItem=false;try{if(dataTransfer.items?.add){dataTransfer.items.add(file);fileItem=true}}catch{}dataTransfer.setData?.("DownloadURL",String(payload.downloadURL||""));dataTransfer.setData?.("text/plain",String(payload.filename||""));try{dataTransfer.effectAllowed="copy"}catch{}return {file,fileItem,downloadURL:Boolean(payload.downloadURL),filename:file.name,bytes:file.size,sha256:payload.sha256}}'
new='export function applyAutotestDragPayload(dataTransfer,payload,{FileImpl=globalThis.File}={}){if(!dataTransfer)throw new Error("AUTOTEST_DRAG_DATA_TRANSFER_UNAVAILABLE");const file=createAutotestDragFile(payload,{FileImpl});let fileItem=false,fileKind="";try{if(dataTransfer.items?.add){const added=dataTransfer.items.add(file);fileItem=Boolean(added);fileKind=String(added?.kind||"")}}catch{}dataTransfer.setData?.("DownloadURL",String(payload.downloadURL||""));dataTransfer.setData?.("text/plain",String(payload.filename||""));try{dataTransfer.effectAllowed="copy"}catch{}return {file,fileItem,fileKind,downloadURL:Boolean(payload.downloadURL),filename:file.name,bytes:file.size,sha256:payload.sha256}}'
drag=replace_once(drag,old,new,'drag add(File) diagnostic')
write(Path('src/autotest-drag-export.js'),drag)

# Standard verified download primitive: Blob/object URL + native <a download>, with explicit post-save verification.
download_module='''const encoder=new TextEncoder();
const hex=buffer=>Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,"0")).join("");
async function sha256Bytes(bytes,cryptoImpl){if(!cryptoImpl?.subtle?.digest)throw new Error("AUTOTEST_DOWNLOAD_SHA256_UNAVAILABLE");return hex(await cryptoImpl.subtle.digest("SHA-256",bytes))}
export async function buildAutotestDownloadPayload(artifact,{cryptoImpl=globalThis.crypto}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_DOWNLOAD_ARTIFACT_INVALID");
 const body=String(artifact.body??""),filename=String(artifact.filename),mime=String(artifact.mime||"application/json;charset=utf-8"),raw=encoder.encode(body),sha256=await sha256Bytes(raw,cryptoImpl);
 return {schema:"elyndra-autotest-download-v1",filename,mime,body,chars:body.length,bytes:raw.length,sha256}
}
export function createAutotestDownloadLease(payload,{BlobImpl=globalThis.Blob,URLImpl=globalThis.URL}={}){
 if(typeof BlobImpl!=="function"||typeof URLImpl?.createObjectURL!=="function"||typeof URLImpl?.revokeObjectURL!=="function")throw new Error("AUTOTEST_DOWNLOAD_OBJECT_URL_UNAVAILABLE");
 const blob=new BlobImpl([String(payload?.body??"")],{type:String(payload?.mime||"application/octet-stream")});
 if(Number(blob.size)!==Number(payload?.bytes))throw new Error("AUTOTEST_DOWNLOAD_BLOB_SIZE_MISMATCH");
 const url=URLImpl.createObjectURL(blob);let active=true;
 return {url,filename:String(payload?.filename||""),bytes:Number(blob.size)||0,sha256:String(payload?.sha256||""),revoke(){if(!active)return;active=false;URLImpl.revokeObjectURL(url)}}
}
export async function verifyAutotestDownloadedFile(file,payload,{cryptoImpl=globalThis.crypto}={}){
 if(!file)throw new Error("AUTOTEST_DOWNLOAD_FILE_MISSING");
 const raw=new Uint8Array(await file.arrayBuffer()),actual=await sha256Bytes(raw,cryptoImpl),expected=String(payload?.sha256||""),filename=String(payload?.filename||"");
 return {ok:String(file.name||"")===filename&&Number(file.size)===Number(payload?.bytes)&&actual===expected,filename:String(file.name||""),expectedFilename:filename,bytes:Number(file.size)||0,expectedBytes:Number(payload?.bytes)||0,sha256:actual,expectedSha256:expected}
}
'''
write(Path('src/autotest-download.js'),download_module)

app=read(Path('app.js')).replace('?v=57007','?v=57008')
old_import='import {buildAutotestDragPayload,applyAutotestDragPayload,verifyAutotestDragFile} from "./src/autotest-drag-export.js?v=57008";'
new_import=old_import+'\nimport {buildAutotestDownloadPayload,createAutotestDownloadLease,verifyAutotestDownloadedFile} from "./src/autotest-download.js?v=57008";'
app=replace_once(app,old_import,new_import,'download module import')
old_state='const developerAutotestDrag={kind:"",payload:null,selfTest:null,lastDrag:null};'
new_state=old_state+'\nconst developerAutotestDownload={kind:"",payload:null,lease:null,request:null,verification:null};'
app=replace_once(app,old_state,new_state,'download UI state')

app=replace_once(app,'<h3>IAB 原生檔案拖出已保存 snapshot，不需重跑</h3>','<h3>AutoTest snapshot 已保存，不需重跑</h3>','export heading')
app=replace_once(app,'<p><strong>主要交付路徑：</strong>建立原生 File drag payload，同時提供 Chromium DownloadURL。可直接拖到 Windows Explorer 或 ChatGPT Web；不依賴 picker、clipboard 或下載按鈕。</p>','<p><strong>主要交付路徑：</strong>標準 Blob/object URL + 原生 &lt;a download&gt;。點擊只代表瀏覽器收到下載要求；只有把實際檔案重新選回並通過檔名、bytes、SHA-256 三項驗證才算 PASS。原生 drag 保留為進階 fallback。</p>','export primary path copy')
app=replace_once(app,"${exportArtifacts.debug?'<button id=\"autotestDragDebug\" class=\"primary\">準備拖出 Debug JSON</button>':\"\"}","${exportArtifacts.debug?'<button id=\"autotestDownloadDebug\" class=\"primary\">下載並驗證 Debug JSON</button><button id=\"autotestDragDebug\" class=\"secondary\">進階拖出 Debug</button>':\"\"}",'debug download primary')
app=replace_once(app,"${exportArtifacts.world?'<button id=\"autotestDragWorld\" class=\"primary\">準備拖出世界 JSON</button>':\"\"}","${exportArtifacts.world?'<button id=\"autotestDownloadWorld\" class=\"primary\">下載並驗證世界 JSON</button><button id=\"autotestDragWorld\" class=\"secondary\">進階拖出世界</button>':\"\"}",'world download primary')
app=replace_once(app,"${exportArtifacts.recovery?'<button id=\"autotestDragRecovery\" class=\"primary\">準備拖出 Recovery JSON</button>':\"\"}","${exportArtifacts.recovery?'<button id=\"autotestDownloadRecovery\" class=\"primary\">下載並驗證 Recovery JSON</button><button id=\"autotestDragRecovery\" class=\"secondary\">進階拖出 Recovery</button>':\"\"}",'recovery download primary')

marker='function developerAutotestTransferLabel(kind){return kind==="debug"?"Debug JSON":kind==="world"?"世界 JSON":"Recovery JSON"}'
download_ui=r'''function releaseDeveloperAutotestDownloadLease(){try{developerAutotestDownload.lease?.revoke?.()}catch{}developerAutotestDownload.lease=null}
function developerAutotestDownloadLabel(kind){return kind==="debug"?"Debug JSON":kind==="world"?"世界 JSON":"Recovery JSON"}
function developerAutotestDownloadHtml(){
 const p=developerAutotestDownload.payload;if(!p)return `<div class="eyebrow">AUTOTEST · VERIFIED DOWNLOAD</div><h2>沒有可下載資料</h2><button id="autotestDownloadBack" class="secondary">返回 AutoTest</button>`;
 const label=developerAutotestDownloadLabel(developerAutotestDownload.kind),request=developerAutotestDownload.request,verification=developerAutotestDownload.verification;
 const proof=verification?(verification.ok?`<p class="success"><strong>PASS · 實際檔案已驗證</strong><br>${esc(verification.filename)} · ${Number(verification.bytes).toLocaleString()} bytes<br>SHA-256 <code>${esc(verification.sha256)}</code></p>`:`<p class="error"><strong>FAIL · 實際檔案不一致</strong><br>實際：${esc(verification.filename||"")} · ${Number(verification.bytes||0).toLocaleString()} bytes · <code>${esc(verification.sha256||"")}</code><br>預期：${esc(p.filename)} · ${Number(p.bytes).toLocaleString()} bytes · <code>${esc(p.sha256)}</code></p>`):request?.status==="requested"?`<p class="muted"><strong>DOWNLOAD REQUESTED · NOT VERIFIED</strong><br>瀏覽器已收到標準下載點擊，但 Elyndra 不會把這一步當成保存成功。請在下載完成後用下方檔案選擇器重新選回檔案。</p>`:`<p class="muted"><strong>尚未要求下載。</strong> 點擊後仍不會宣稱成功，直到實際檔案通過驗證。</p>`;
 return `<div class="eyebrow">AUTOTEST · VERIFIED DOWNLOAD</div><h2>${esc(label)} 標準下載</h2><div class="lore-item"><p><strong>檔名：</strong><code>${esc(p.filename)}</code></p><p><strong>大小：</strong>${Number(p.bytes).toLocaleString()} bytes · ${Number(p.chars).toLocaleString()} 字元</p><p><strong>SHA-256：</strong><code>${esc(p.sha256)}</code></p><p class="muted">下載實作：Blob → URL.createObjectURL() → 原生 &lt;a download&gt;。此頁只把「重新選回的檔案」驗證成功視為完成。</p></div>${proof}<div class="settings-actions"><a id="autotestDownloadAnchor" class="primary" href="#">下載檔案</a><label class="secondary" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer">驗證已下載檔案<input id="autotestDownloadVerifyFile" type="file" style="display:none"></label><button id="autotestDownloadBack" class="ghost">返回 AutoTest</button></div><p id="autotestDownloadStatus" class="muted">若此 IAB 點擊後沒有產生可保存的下載檔，停止重試 drag；唯一有效驗證是取得實際檔案後在此選回，並讓檔名、bytes、SHA-256 全部一致。</p>`
}
function bindDeveloperAutotestDownload(){
 const p=developerAutotestDownload.payload,lease=developerAutotestDownload.lease,anchor=$("#autotestDownloadAnchor"),input=$("#autotestDownloadVerifyFile"),status=$("#autotestDownloadStatus");
 if(anchor&&p&&lease){anchor.href=lease.url;anchor.download=p.filename;anchor.addEventListener("click",()=>{developerAutotestDownload.request={status:"requested",requestedAt:Date.now(),filename:p.filename,bytes:p.bytes,sha256:p.sha256};developerAutotestDownload.verification=null;if(status)status.textContent=`DOWNLOAD REQUESTED · NOT VERIFIED · ${p.filename} · ${Number(p.bytes).toLocaleString()} bytes · SHA-256 ${p.sha256}`;recordDebug("AUTOTEST_DOWNLOAD_REQUESTED",{kind:developerAutotestDownload.kind,filename:p.filename,bytes:p.bytes,sha256:p.sha256,userActivation:Boolean(navigator.userActivation?.isActive)})})}
 input?.addEventListener("change",()=>{const file=input.files?.[0]||null;void verifyAutotestDownloadedFile(file,p).then(result=>{developerAutotestDownload.verification=result;recordDebug(result.ok?"AUTOTEST_DOWNLOAD_VERIFIED":"AUTOTEST_DOWNLOAD_VERIFY_FAILED",{kind:developerAutotestDownload.kind,...result});openModal(developerAutotestDownloadHtml());bindDeveloperAutotestDownload()}).catch(error=>{developerAutotestDownload.verification={ok:false,filename:file?.name||"",bytes:file?.size||0,sha256:"",error:error?.message||String(error)};recordDebug("AUTOTEST_DOWNLOAD_VERIFY_FAILED",{kind:developerAutotestDownload.kind,error:error?.message||String(error)});openModal(developerAutotestDownloadHtml());bindDeveloperAutotestDownload()})});
 $("#autotestDownloadBack")?.addEventListener("click",()=>{releaseDeveloperAutotestDownloadLease();openDeveloperAutotestPanel()})
}
async function openDeveloperAutotestDownload(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可下載的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 try{releaseDeveloperAutotestDownloadLease();const payload=await buildAutotestDownloadPayload(artifact),lease=createAutotestDownloadLease(payload);developerAutotestDownload.kind=kind;developerAutotestDownload.payload=payload;developerAutotestDownload.lease=lease;developerAutotestDownload.request=null;developerAutotestDownload.verification=null;recordDebug("AUTOTEST_DOWNLOAD_READY",{kind,filename:payload.filename,bytes:payload.bytes,chars:payload.chars,sha256:payload.sha256});openModal(developerAutotestDownloadHtml());bindDeveloperAutotestDownload()}
 catch(error){appendDeveloperAutotestLog(`標準下載資料建立失敗：${error?.message||error}`);recordDebug("AUTOTEST_DOWNLOAD_PREPARE_FAILED",{kind,error:error?.message||String(error)});openDeveloperAutotestPanel()}
}
'''
app=replace_once(app,marker,download_ui+marker,'verified download UI insertion')

bind_anchor='$("#autotestDragDebug")?.addEventListener("click",()=>void openDeveloperAutotestDragExport("debug"));$("#autotestDragWorld")?.addEventListener("click",()=>void openDeveloperAutotestDragExport("world"));$("#autotestDragRecovery")?.addEventListener("click",()=>void openDeveloperAutotestDragExport("recovery"));'
bind_new='$("#autotestDownloadDebug")?.addEventListener("click",()=>void openDeveloperAutotestDownload("debug"));$("#autotestDownloadWorld")?.addEventListener("click",()=>void openDeveloperAutotestDownload("world"));$("#autotestDownloadRecovery")?.addEventListener("click",()=>void openDeveloperAutotestDownload("recovery"));\n '+bind_anchor
app=replace_once(app,bind_anchor,bind_new,'download button bindings')

pattern=r'function downloadDeveloperAutotestArtifact\(kind\)\{.*?\n\}\nasync function copyDeveloperAutotestArtifact\(kind\)\{'
replacement='function downloadDeveloperAutotestArtifact(kind){void openDeveloperAutotestDownload(kind)}\nasync function copyDeveloperAutotestArtifact(kind){'
app,count=re.subn(pattern,replacement,app,count=1,flags=re.S)
if count!=1:
    raise SystemExit(f'legacy download wrapper: expected 1 match, got {count}')

# Make the drag screen explicit about IAB/native drag limitations.
app=app.replace('此卡在 dragstart 同時發布原生 File item與 Chromium DownloadURL。','此卡在 dragstart 同時發布原生 File item 與 Chromium DownloadURL。')
app=app.replace('此卡在 dragstart 同時發布原生 File item 與 Chromium DownloadURL。拖到 Windows Explorer 是本機落地路徑；拖到 ChatGPT Web 的檔案 drop area 是上傳路徑。Elyndra 只會回報 drag/drop 信號，不會把「開始拖曳」誤報為已保存或已上傳。','此卡在 dragstart 同時嘗試發布原生 File item 與 Chromium DownloadURL；IAB/自動化層可能不支援 native drag。dropEffect=none 或 items.add(File) 回傳 null 時，請改用標準下載。Elyndra 不會把「開始拖曳」誤報為已保存或已上傳。')
write(Path('app.js'),app)

# Current-version assertions use the new browser cache token/version. Historical filenames remain untouched outside tests.
for path in (ROOT/'test').glob('*.test.js'):
    text=path.read_text(encoding='utf-8')
    text=text.replace('57007','57008').replace('0.57.7','0.57.8').replace('0\\.57\\.7','0\\.57\\.8')
    path.write_text(text,encoding='utf-8')

# Explicit regressions for the standard download path and null-return drag diagnostic.
test='''import test from "node:test";
import assert from "node:assert/strict";
import {createHash,webcrypto} from "node:crypto";
import {readFile} from "node:fs/promises";
import {buildAutotestDownloadPayload,createAutotestDownloadLease,verifyAutotestDownloadedFile} from "../src/autotest-download.js";
import {buildAutotestDragPayload,applyAutotestDragPayload} from "../src/autotest-drag-export.js";
const sha=text=>createHash("sha256").update(text,"utf8").digest("hex");
class FakeFile {constructor(parts,name,options={}){this.name=name;this.type=options.type||"";const text=parts.map(x=>String(x)).join("");this._bytes=new TextEncoder().encode(text);this.size=this._bytes.length}async arrayBuffer(){return this._bytes.buffer.slice(this._bytes.byteOffset,this._bytes.byteOffset+this._bytes.byteLength)}}
test("v0.57.8 builds exact standard-download integrity metadata",async()=>{const body=JSON.stringify({text:"下載驗證🌏".repeat(4096)}),artifact={filename:"Elyndra-autotest-debug-v0.57.7-2026-09-25T02-40-11-091Z.json",mime:"application/json;charset=utf-8",body};const p=await buildAutotestDownloadPayload(artifact,{cryptoImpl:webcrypto});assert.equal(p.filename,artifact.filename);assert.equal(p.bytes,Buffer.byteLength(body));assert.equal(p.sha256,sha(body))});
test("v0.57.8 object URL lease preserves bytes and is revocable",async()=>{const body='{"ok":true,"text":"世界🌏"}',p=await buildAutotestDownloadPayload({filename:"proof.json",mime:"application/json",body},{cryptoImpl:webcrypto}),made=[],revoked=[];class FakeBlob{constructor(parts,opt){this.body=parts.join("");this.type=opt.type;this.size=Buffer.byteLength(this.body)}}const URLImpl={createObjectURL:b=>{made.push(b);return "blob:test-proof"},revokeObjectURL:u=>revoked.push(u)};const lease=createAutotestDownloadLease(p,{BlobImpl:FakeBlob,URLImpl});assert.equal(lease.url,"blob:test-proof");assert.equal(lease.filename,"proof.json");assert.equal(lease.bytes,p.bytes);lease.revoke();lease.revoke();assert.deepEqual(revoked,["blob:test-proof"]);assert.equal(made[0].size,p.bytes)});
test("v0.57.8 verifier requires filename bytes and SHA-256",async()=>{const body='{"value":"正確🌏"}',p=await buildAutotestDownloadPayload({filename:"exact.json",mime:"application/json",body},{cryptoImpl:webcrypto}),ok=new FakeFile([body],"exact.json"),wrongName=new FakeFile([body],"renamed.json"),wrongBody=new FakeFile(['{"value":"錯誤🌏"}'],"exact.json");assert.equal((await verifyAutotestDownloadedFile(ok,p,{cryptoImpl:webcrypto})).ok,true);assert.equal((await verifyAutotestDownloadedFile(wrongName,p,{cryptoImpl:webcrypto})).ok,false);assert.equal((await verifyAutotestDownloadedFile(wrongBody,p,{cryptoImpl:webcrypto})).ok,false)});
test("v0.57.8 drag diagnostic does not claim File item when add(File) returns null",async()=>{const p=await buildAutotestDragPayload({filename:"proof.json",mime:"application/json",body:'{"ok":true}'},{cryptoImpl:webcrypto,btoaImpl:v=>Buffer.from(v,"binary").toString("base64")}),dt={items:{add:()=>null},setData(){},effectAllowed:"none"};const r=applyAutotestDragPayload(dt,p,{FileImpl:FakeFile});assert.equal(r.fileItem,false);assert.equal(r.fileKind,"")});
test("v0.57.8 UI makes standard download primary and verification-gated",async()=>{const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),html=await readFile(new URL("../index.html",import.meta.url),"utf8");assert.match(app,/autotestDownloadDebug/);assert.match(app,/Blob\/object URL/);assert.match(app,/DOWNLOAD REQUESTED · NOT VERIFIED/);assert.match(app,/PASS · 實際檔案已驗證/);assert.match(app,/verifyAutotestDownloadedFile/);assert.match(app,/anchor\.download=p\.filename/);assert.match(app,/items\.add\(File\).*回傳 null/);assert.match(html,/app\.js\?v=57008/)});
'''
write(Path('test/autotest-download-v0578.test.js'),test)

browser='''import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,mkdtemp,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import http from "node:http";
import {chromium} from "playwright";
const root=process.cwd();
const mime=p=>p.endsWith(".js")?"text/javascript; charset=utf-8":p.endsWith(".html")?"text/html; charset=utf-8":"application/octet-stream";
const fixture=`<!doctype html><meta charset="utf-8"><a id="download">download</a><script type="module">import {buildAutotestDownloadPayload,createAutotestDownloadLease} from "/src/autotest-download.js?v=57008";const artifact={filename:"Elyndra-autotest-browser-proof-v0.57.8.json",mime:"application/json;charset=utf-8",body:JSON.stringify({version:"0.57.8",text:"下載驗證🌏".repeat(4096)})};const payload=await buildAutotestDownloadPayload(artifact),lease=createAutotestDownloadLease(payload),a=document.querySelector("#download");a.href=lease.url;a.download=payload.filename;window.__downloadProof={filename:payload.filename,bytes:payload.bytes,sha256:payload.sha256};window.__dragProof=(()=>{const dt=new DataTransfer(),item=dt.items.add(new File(["ok"],"proof.txt",{type:"text/plain"}));return {item:Boolean(item),files:dt.files.length,kind:dt.items[0]?.kind||""}})();</script>`;
const server=http.createServer(async(req,res)=>{try{if(req.url?.startsWith("/__fixture")){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});res.end(fixture);return}const pathname=new URL(req.url||"/","http://127.0.0.1").pathname,rel=pathname.replace(/^\/+/,""),file=path.resolve(root,rel);if(!file.startsWith(root+path.sep))throw new Error("bad path");const data=await readFile(file);res.writeHead(200,{"content-type":mime(file)});res.end(data)}catch{res.writeHead(404);res.end("not found")}});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const port=server.address().port,browser=await chromium.launch({headless:true}),page=await browser.newPage(),dir=await mkdtemp(path.join(tmpdir(),"elyndra-download-"));
try{await page.goto(`http://127.0.0.1:${port}/__fixture`);await page.waitForFunction(()=>Boolean(window.__downloadProof));const proof=await page.evaluate(()=>window.__downloadProof),drag=await page.evaluate(()=>window.__dragProof);assert.deepEqual(drag,{item:true,files:1,kind:"file"});const wait=page.waitForEvent("download");await page.click("#download");const download=await wait;assert.equal(download.suggestedFilename(),proof.filename);const target=path.join(dir,proof.filename);await download.saveAs(target);const data=await readFile(target),meta=await stat(target),digest=createHash("sha256").update(data).digest("hex");assert.equal(meta.size,proof.bytes);assert.equal(digest,proof.sha256);console.log(JSON.stringify({status:"PASS",filename:proof.filename,bytes:meta.size,sha256:digest,chromiumDownloadEvent:true,dragFileApi:drag}))}finally{await browser.close();server.close();await rm(dir,{recursive:true,force:true})}
'''
write(Path('scripts/test-autotest-download-browser.mjs'),browser)

release='''# Elyndra v0.57.8\n\nAutoTest export delivery reliability update. Existing IndexedDB AutoTest snapshots remain compatible and are not regenerated.\n\n- Standard Blob/object URL + native `<a download>` is now the primary delivery path.\n- A download click is reported only as `DOWNLOAD REQUESTED · NOT VERIFIED`.\n- Success requires selecting the actual saved file back into Elyndra and matching filename, UTF-8 byte length, and SHA-256.\n- Native drag remains an advanced fallback. `DataTransferItemList.add(File)` returning `null` is no longer reported as a valid File item.\n- Real Chromium regression proves the native download event, suggested filename, saved bytes, and SHA-256.\n- No AutoTest rerun is required for the retained v0.57.7 IndexedDB snapshot.\n'''
write(Path('docs/releases/v0.57.8.md'),release)

print('Prepared Elyndra v0.57.8 verified-download patch')
