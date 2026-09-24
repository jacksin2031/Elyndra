from pathlib import Path
import re


def fail(message):
    raise SystemExit(message)

# New export/persistence module.
Path('src/autotest-export.js').write_text(r'''const DB_NAME="elyndra-autotest-exports-v1",STORE_NAME="snapshots",SLOT="last",LOCAL_KEY="elyndra:autotest-export:last:v1",LOCAL_LIMIT=4_000_000;
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const safeStorage=()=>{try{return globalThis.localStorage||null}catch{return null}};
const cleanMode=value=>["debug","world","both"].includes(value)?value:"both";
const safeStamp=value=>String(value||new Date().toISOString()).replace(/[:.]/g,"-");
function normalizeSnapshot(snapshot={}){
 const out=clone(snapshot)||{};
 out.schema="elyndra-autotest-export-v2";out.appVersion=String(out.appVersion||"");out.createdAt=String(out.createdAt||new Date().toISOString());out.stamp=safeStamp(out.stamp||out.createdAt);out.exportMode=cleanMode(out.exportMode);
 out.debugPayload=out.debugPayload&&typeof out.debugPayload==="object"?out.debugPayload:{};out.worlds=Array.isArray(out.worlds)?out.worlds:[];
 return out
}
export function buildAutotestExportSnapshot({appVersion="",report={},results=[],telemetry=[],startedAt=0,exportMode="both",createdAt=new Date().toISOString()}={}){
 const rows=Array.isArray(results)?results:[],runTelemetry=(Array.isArray(telemetry)?telemetry:[]).filter(e=>Number(e?.at)>=Number(startedAt||0));
 const debugPayload={...clone(report),telemetry:clone(runTelemetry),actions:rows.map(r=>({index:r.index,status:r.status,stopReason:r.stopReason,actions:clone(r.actions||[])}))};
 const worlds=rows.filter(r=>r?.world).map(r=>({index:r.index,status:r.status,stopReason:r.stopReason,summary:clone(r.summary),world:clone(r.world)}));
 return normalizeSnapshot({appVersion,createdAt,stamp:safeStamp(createdAt),exportMode:cleanMode(exportMode),debugPayload,worlds})
}
export function buildAutotestExportArtifacts(snapshot={}){
 const s=normalizeSnapshot(snapshot),debugEnabled=s.exportMode!=="world",worldEnabled=s.exportMode!=="debug",artifacts={debug:null,world:null,recovery:null};
 if(debugEnabled)artifacts.debug={kind:"debug",filename:`Elyndra-autotest-debug-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify(s.debugPayload,null,2)};
 if(worldEnabled&&s.worlds.length===1)artifacts.world={kind:"world",filename:`Elyndra-autotest-world-v${s.appVersion}-${s.stamp}.elyndra`,mime:"application/json;charset=utf-8",body:JSON.stringify(s.worlds[0].world,null,2)};
 else if(worldEnabled&&s.worlds.length)artifacts.world={kind:"world",filename:`Elyndra-autotest-worlds-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify({schema:"elyndra-autotest-worlds-v1",appVersion:s.appVersion,createdAt:s.createdAt,worlds:s.worlds},null,2)};
 if(artifacts.debug&&artifacts.world)artifacts.recovery={kind:"recovery",filename:`Elyndra-autotest-recovery-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify({schema:"elyndra-autotest-recovery-v1",appVersion:s.appVersion,createdAt:s.createdAt,debug:s.debugPayload,worlds:s.worlds},null,2)};
 return artifacts
}
function openDb(indexedDBImpl){
 return new Promise((resolve,reject)=>{const req=indexedDBImpl.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:"slot"})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("AUTOTEST_EXPORT_DB_OPEN_FAILED"))})
}
function idbPut(db,value){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readwrite");tx.objectStore(STORE_NAME).put(value);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error("AUTOTEST_EXPORT_DB_WRITE_FAILED"));tx.onabort=()=>reject(tx.error||new Error("AUTOTEST_EXPORT_DB_WRITE_ABORTED"))})}
function idbGet(db){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readonly"),req=tx.objectStore(STORE_NAME).get(SLOT);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||new Error("AUTOTEST_EXPORT_DB_READ_FAILED"))})}
export async function saveLastAutotestExportSnapshot(snapshot,{indexedDBImpl=globalThis.indexedDB,storage=safeStorage()}={}){
 const normalized=normalizeSnapshot(snapshot);let indexedError="";
 if(indexedDBImpl){try{const db=await openDb(indexedDBImpl);try{await idbPut(db,{slot:SLOT,...normalized})}finally{db.close?.()}return {backend:"indexeddb",persisted:true}}catch(error){indexedError=String(error?.message||error||"INDEXEDDB_FAILED")}}
 const text=JSON.stringify(normalized);
 if(storage&&text.length<=LOCAL_LIMIT){storage.setItem(LOCAL_KEY,text);return {backend:"localStorage",persisted:true,warning:indexedError||null}}
 throw new Error(indexedError?`AUTOTEST_EXPORT_PERSIST_FAILED: ${indexedError}`:"AUTOTEST_EXPORT_PERSIST_FAILED")
}
export async function loadLastAutotestExportSnapshot({indexedDBImpl=globalThis.indexedDB,storage=safeStorage()}={}){
 if(indexedDBImpl){try{const db=await openDb(indexedDBImpl);try{const row=await idbGet(db);if(row){const {slot,...snapshot}=row;return normalizeSnapshot(snapshot)}}finally{db.close?.()}}catch{}}
 try{const raw=storage?.getItem(LOCAL_KEY);return raw?normalizeSnapshot(JSON.parse(raw)):null}catch{return null}
}
''')

p=Path('app.js'); text=p.read_text()
anchor='import {randomAutotestWorldRaw,decideAutotestAction,autotestStopReason,autotestStateFingerprint,autotestWorldSummary,buildAutotestReport,autotestExportSelection,autotestPlayStrategy} from "./src/ai-autotest.js?v=57002";\n'
if anchor not in text: fail('ai-autotest import anchor missing')
text=text.replace(anchor,anchor+'import {buildAutotestExportSnapshot,buildAutotestExportArtifacts,saveLastAutotestExportSnapshot,loadLastAutotestExportSnapshot} from "./src/autotest-export.js?v=57002";\n',1)

old='const developerAutotest={running:false,stopRequested:false,worldIndex:0,turn:0,results:[],startedAt:0,endedAt:0,config:null,controller:null,batchController:null,lastReport:null,lastMessage:"",logs:[],hiddenAt:0,lastVisibleAt:0,backgroundInterruptions:0,backgroundDurationMs:0};'
new='const developerAutotest={running:false,stopRequested:false,worldIndex:0,turn:0,results:[],startedAt:0,endedAt:0,config:null,controller:null,batchController:null,lastReport:null,lastMessage:"",logs:[],hiddenAt:0,lastVisibleAt:0,backgroundInterruptions:0,backgroundDurationMs:0,exportSnapshot:null,exportPersistence:null};\nvoid loadLastAutotestExportSnapshot().then(snapshot=>{if(!snapshot)return;developerAutotest.exportSnapshot=snapshot;developerAutotest.exportPersistence={backend:"indexeddb-or-fallback",persisted:true,restored:true};if(!developerAutotest.lastReport&&snapshot.debugPayload?.summary)developerAutotest.lastReport=snapshot.debugPayload;recordDebug("AUTOTEST_EXPORT_CACHE_RESTORED",{createdAt:snapshot.createdAt,worlds:snapshot.worlds?.length||0})}).catch(error=>recordDebug("AUTOTEST_EXPORT_CACHE_RESTORE_FAILED",{error:error?.message||String(error)}));'
if old not in text: fail('developerAutotest state anchor missing')
text=text.replace(old,new,1)

pattern=r'function autotestDownload\(filename,body,type="application/json;charset=utf-8"\)\{.*?\n\}'
replacement='''const autotestDownloadLeases=new Set();
function autotestDownload(filename,body,type="application/json;charset=utf-8"){
 const blob=new Blob([body],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.style.display="none";a.rel="noopener";document.body.appendChild(a);
 const lease={url,a},cleanup=()=>{if(!autotestDownloadLeases.delete(lease))return;try{a.remove()}catch{}try{URL.revokeObjectURL(url)}catch{}};autotestDownloadLeases.add(lease);const timer=setTimeout(cleanup,120000);lease.timer=timer;
 try{a.click();recordDebug("AUTOTEST_EXPORT_DOWNLOAD_TRIGGERED",{filename,bytes:blob.size,userActivation:Boolean(navigator.userActivation?.isActive)});return {filename,bytes:blob.size}}catch(error){clearTimeout(timer);cleanup();throw error}
}'''
text,n=re.subn(pattern,replacement,text,count=1,flags=re.S)
if n!=1: fail('autotestDownload replacement failed')

pattern=r'function exportDeveloperAutotestResults\(report,results\)\{.*?\n\}'
replacement='''async function exportDeveloperAutotestResults(report,results){
 const snapshot=buildAutotestExportSnapshot({appVersion:APP_VERSION,report,results,telemetry:telemetryEntries(),startedAt:developerAutotest.startedAt,exportMode:developerAutotest.config?.exportMode||"both"});developerAutotest.exportSnapshot=snapshot;
 try{developerAutotest.exportPersistence=await saveLastAutotestExportSnapshot(snapshot);recordDebug("AUTOTEST_EXPORT_PERSISTED",{backend:developerAutotest.exportPersistence.backend,worlds:snapshot.worlds.length})}
 catch(error){developerAutotest.exportPersistence={backend:"memory",persisted:false,error:error?.message||String(error)};recordDebug("AUTOTEST_EXPORT_PERSIST_FAILED",{error:developerAutotest.exportPersistence.error})}
 const artifacts=buildAutotestExportArtifacts(snapshot),sizes=Object.fromEntries(Object.entries(artifacts).filter(([,a])=>a).map(([k,a])=>[k,new Blob([a.body],{type:a.mime}).size]));recordDebug("AUTOTEST_EXPORT_READY",{artifacts:Object.keys(sizes),sizes,persisted:developerAutotest.exportPersistence?.persisted===true,backend:developerAutotest.exportPersistence?.backend||"memory"});
 appendDeveloperAutotestLog(`匯出資料已準備${developerAutotest.exportPersistence?.persisted?"並保存到瀏覽器":"於本頁記憶體"}；請用下方按鈕下載，無需重跑測試。`);return snapshot
}
function downloadDeveloperAutotestArtifact(kind){
 const snapshot=developerAutotest.exportSnapshot;if(!snapshot){appendDeveloperAutotestLog("找不到可重新匯出的 AutoTest 結果。");openDeveloperAutotestPanel();return}
 const artifacts=buildAutotestExportArtifacts(snapshot),artifact=artifacts[kind];if(!artifact){appendDeveloperAutotestLog(`本輪沒有 ${kind} 匯出內容。`);openDeveloperAutotestPanel();return}
 try{const info=autotestDownload(artifact.filename,artifact.body,artifact.mime);appendDeveloperAutotestLog(`已要求下載 ${artifact.filename}（${Number(info.bytes||0).toLocaleString()} bytes）。若瀏覽器未顯示完成，可再次按同一按鈕。`);recordDebug("AUTOTEST_EXPORT_RETRY_TRIGGERED",{kind,filename:artifact.filename,bytes:info.bytes})}
 catch(error){appendDeveloperAutotestLog(`下載啟動失敗：${error?.message||error}`);recordDebug("AUTOTEST_EXPORT_RETRY_FAILED",{kind,error:error?.message||String(error)});openDeveloperAutotestPanel()}
}
async function reloadDeveloperAutotestExport(){
 try{const snapshot=await loadLastAutotestExportSnapshot();if(!snapshot){appendDeveloperAutotestLog("瀏覽器內沒有已保存的 AutoTest 匯出資料。");return}developerAutotest.exportSnapshot=snapshot;if(!developerAutotest.lastReport&&snapshot.debugPayload?.summary)developerAutotest.lastReport=snapshot.debugPayload;appendDeveloperAutotestLog(`已載入 ${snapshot.createdAt} 的匯出資料，可直接重新下載。`)}catch(error){appendDeveloperAutotestLog(`載入上次匯出資料失敗：${error?.message||error}`)}openDeveloperAutotestPanel()
}'''
text,n=re.subn(pattern,replacement,text,count=1,flags=re.S)
if n!=1: fail('exportDeveloperAutotestResults replacement failed')

old=' const running=developerAutotest.running,report=developerAutotest.lastReport,summary=report?.summary;\n return `'
new=' const running=developerAutotest.running,report=developerAutotest.lastReport,summary=report?.summary,exportSnapshot=developerAutotest.exportSnapshot,exportArtifacts=exportSnapshot?buildAutotestExportArtifacts(exportSnapshot):{};\n const exportPanel=exportSnapshot?`<div class="lore-item"><small>EXPORT READY · ${esc(exportSnapshot.createdAt||"")}</small><h3>可重新匯出，不需重跑</h3><p>${developerAutotest.exportPersistence?.persisted?"結果已保存於瀏覽器；重新整理頁面後仍可載入。":"結果目前保留在本頁記憶體。"}</p><div class="settings-actions">${exportArtifacts.debug?\'<button id="autotestRetryDebug" class="secondary">重新匯出 Debug JSON</button>\':""}${exportArtifacts.world?\'<button id="autotestRetryWorld" class="secondary">重新匯出世界</button>\':""}${exportArtifacts.recovery?\'<button id="autotestRetryRecovery" class="primary">下載單一復原包</button>\':""}<button id="autotestReloadExport" class="ghost">重新載入已保存結果</button></div></div>`:`<div class="lore-item"><small>EXPORT RECOVERY</small><p>若之前已完成測試，可嘗試從瀏覽器保存區載入並重新匯出。</p><button id="autotestReloadExport" class="secondary">載入上次匯出資料</button></div>`;\n return `'
if old not in text: fail('panel header anchor missing')
text=text.replace(old,new,1)

old=' ${summary?`<div class="lore-item"><small>LAST REPORT</small><h3>${summary.worldsCompleted} 完成 · ${summary.worldsFailed} 失敗 · ${summary.totalTurns} 回合</h3><p>Issues ${summary.issues} · AI Requests ${summary.aiRequests} · Tokens ${Number(summary.tokenTotals?.total||0).toLocaleString()} · 平均 AI latency ${summary.aiLatencyAverageMs}ms</p></div>`:""}</div>\n <p class="muted">完成後會按「輸出內容」設定下載 Debug JSON、測試世界，或兩者；單一世界為 .elyndra，多世界為 JSON bundle。</p>`;'
new=' ${summary?`<div class="lore-item"><small>LAST REPORT</small><h3>${summary.worldsCompleted} 完成 · ${summary.worldsFailed} 失敗 · ${summary.totalTurns} 回合</h3><p>Issues ${summary.issues} · AI Requests ${summary.aiRequests} · Tokens ${Number(summary.tokenTotals?.total||0).toLocaleString()} · 平均 AI latency ${summary.aiLatencyAverageMs}ms</p></div>`:""}${exportPanel}</div>\n <p class="muted">AutoTest 完成後先把結果保存到瀏覽器，再由你按按鈕下載；不再於背景連續觸發多檔自動下載。單一世界為 .elyndra，多世界為 JSON bundle；「單一復原包」同時包含 Debug 與全部世界。</p>`;'
if old not in text: fail('panel export description anchor missing')
text=text.replace(old,new,1)

old=' $("#autotestStop")?.addEventListener("click",()=>{developerAutotest.stopRequested=true;const reason=new DOMException("Developer autotest stopped","AbortError");developerAutotest.controller?.abort(reason);developerAutotest.batchController?.abort(reason);appendDeveloperAutotestLog("已要求停止；正在 Abort 當前 AI request，之後於安全點結束。");recordDebug("AUTOTEST_STOP_REQUESTED",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn})})\n}'
new=' $("#autotestStop")?.addEventListener("click",()=>{developerAutotest.stopRequested=true;const reason=new DOMException("Developer autotest stopped","AbortError");developerAutotest.controller?.abort(reason);developerAutotest.batchController?.abort(reason);appendDeveloperAutotestLog("已要求停止；正在 Abort 當前 AI request，之後於安全點結束。");recordDebug("AUTOTEST_STOP_REQUESTED",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn})});\n $("#autotestRetryDebug")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("debug"));$("#autotestRetryWorld")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("world"));$("#autotestRetryRecovery")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("recovery"));$("#autotestReloadExport")?.addEventListener("click",()=>void reloadDeveloperAutotestExport())\n}'
if old not in text: fail('panel bind anchor missing')
text=text.replace(old,new,1)

old='try{exportDeveloperAutotestResults(report,developerAutotest.results)}catch(e){recordDebug("AUTOTEST_EXPORT_FAILED",{error:e?.message||String(e)})}'
new='try{await exportDeveloperAutotestResults(report,developerAutotest.results)}catch(e){recordDebug("AUTOTEST_EXPORT_FAILED",{error:e?.message||String(e)})}'
if old not in text: fail('final export call anchor missing')
text=text.replace(old,new,1)
p.write_text(text)

# Update obsolete test contract.
p=Path('test/ai-autotest-controls-v0544.test.js'); t=p.read_text()
old='''test("v0.54.4 export path only downloads selected artifact classes",async()=>{\n const app=await readFile(new URL("../app.js",import.meta.url),"utf8");\n const start=app.indexOf("function exportDeveloperAutotestResults"),end=app.indexOf("async function startDeveloperAutotest",start),block=app.slice(start,end);\n assert.match(block,/autotestExportSelection/);\n assert.match(block,/if\\(selection\\.debug\\)autotestDownload/);\n assert.match(block,/if\\(selection\\.world&&worlds\\.length===1\\)autotestDownload/);\n assert.match(block,/else if\\(selection\\.world&&worlds\\.length\\)autotestDownload/)\n});'''
new='''test("v0.57.3 export path persists artifacts and requires explicit retry downloads",async()=>{\n const app=await readFile(new URL("../app.js",import.meta.url),"utf8");\n const start=app.indexOf("async function exportDeveloperAutotestResults"),end=app.indexOf("async function startDeveloperAutotest",start),block=app.slice(start,end);\n assert.match(block,/buildAutotestExportSnapshot/);assert.match(block,/saveLastAutotestExportSnapshot/);\n const persistBlock=block.slice(0,block.indexOf("function downloadDeveloperAutotestArtifact"));assert.doesNotMatch(persistBlock,/autotestDownload\\(/);\n assert.match(app,/id="autotestRetryDebug"/);assert.match(app,/id="autotestRetryWorld"/);assert.match(app,/id="autotestRetryRecovery"/);assert.match(app,/setTimeout\\(cleanup,120000\\)/);assert.match(app,/await exportDeveloperAutotestResults\\(report,developerAutotest\\.results\\)/)\n});'''
if old not in t: fail('legacy export test block missing')
p.write_text(t.replace(old,new,1))

Path('test/autotest-export-v0573.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {buildAutotestExportSnapshot,buildAutotestExportArtifacts,saveLastAutotestExportSnapshot,loadLastAutotestExportSnapshot} from "../src/autotest-export.js";

const world=id=>({id,world:{id},player:{status:"ALIVE"}});

test("v0.57.3 builds separate Debug/world artifacts plus one recovery package",()=>{
 const snapshot=buildAutotestExportSnapshot({appVersion:"0.57.3",report:{summary:{totalTurns:60}},results:[{index:1,status:"COMPLETED",stopReason:"TURN_LIMIT",actions:[{turn:1}],world:world("W1")},{index:2,status:"COMPLETED",stopReason:"TURN_LIMIT",actions:[],world:world("W2")}],telemetry:[{at:100,type:"A"},{at:200,type:"B"}],startedAt:150,exportMode:"both",createdAt:"2026-09-25T01:00:00.000Z"});
 const artifacts=buildAutotestExportArtifacts(snapshot);assert.ok(artifacts.debug);assert.ok(artifacts.world);assert.ok(artifacts.recovery);assert.match(artifacts.world.filename,/autotest-worlds-v0\.57\.3/);assert.match(artifacts.recovery.filename,/autotest-recovery-v0\.57\.3/);
 const debug=JSON.parse(artifacts.debug.body),bundle=JSON.parse(artifacts.world.body),recovery=JSON.parse(artifacts.recovery.body);assert.equal(debug.telemetry.length,1);assert.equal(bundle.worlds.length,2);assert.equal(recovery.worlds.length,2);assert.equal(recovery.debug.summary.totalTurns,60)
});

test("v0.57.3 single-world export remains .elyndra",()=>{
 const snapshot=buildAutotestExportSnapshot({appVersion:"0.57.3",results:[{index:1,status:"COMPLETED",world:world("ONE")}],exportMode:"world",createdAt:"2026-09-25T01:00:00.000Z"}),artifacts=buildAutotestExportArtifacts(snapshot);assert.equal(artifacts.debug,null);assert.match(artifacts.world.filename,/\.elyndra$/);assert.equal(JSON.parse(artifacts.world.body).id,"ONE")
});

test("v0.57.3 export snapshot survives reload through storage fallback when IndexedDB is unavailable",async()=>{
 const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)||null};
 const snapshot=buildAutotestExportSnapshot({appVersion:"0.57.3",report:{summary:{issues:56}},results:[{index:1,status:"COMPLETED",world:world("W")}],exportMode:"both"});
 const saved=await saveLastAutotestExportSnapshot(snapshot,{indexedDBImpl:null,storage});assert.equal(saved.backend,"localStorage");assert.equal(saved.persisted,true);
 const restored=await loadLastAutotestExportSnapshot({indexedDBImpl:null,storage});assert.equal(restored.debugPayload.summary.issues,56);assert.equal(restored.worlds[0].world.id,"W")
});
''')

# Official v0.57.3 release/cache generation.
for p in [Path('package.json'),Path('src/version.js'),*Path('test').glob('*.test.js')]:
    if p.exists(): p.write_text(p.read_text().replace('0.57.2','0.57.3'))
for p in [Path('index.html'),Path('app.js'),*Path('src').glob('*.js'),*Path('scripts').glob('*.mjs'),*Path('test').glob('*.test.js')]:
    if p.exists(): p.write_text(p.read_text().replace('57002','57003'))
