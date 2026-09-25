from pathlib import Path


def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    return text.replace(old, new, 1)

app_path=Path("app.js")
app=app_path.read_text(encoding="utf-8")

app=must_replace(app,
'import {buildAutotestExportSnapshot,buildAutotestExportArtifacts,saveLastAutotestExportSnapshot,loadLastAutotestExportSnapshot} from "./src/autotest-export.js?v=57021";',
'import {buildAutotestExportSnapshot,buildAutotestExportArtifacts,saveLastAutotestExportSnapshot,loadLastAutotestExportSnapshot,archiveAutotestExportSnapshot,listAutotestExportSnapshots,loadAutotestExportSnapshot} from "./src/autotest-export.js?v=57021";',
"autotest export import")
app=must_replace(app,
'import {autotestSaveCapability,saveAutotestArtifactWithPicker,saveAutotestArtifactsToDirectory} from "./src/autotest-save.js?v=57021";',
'import {autotestSaveCapability,saveAutotestArtifactWithPicker,saveAutotestArtifactsToDirectory,shareAutotestArtifact} from "./src/autotest-save.js?v=57021";',
"autotest save import")
app=app.replace('import {installAutotestCodexBridge} from "./src/autotest-codex-bridge.js?v=57021";\n','',1)
app=must_replace(app,
'const developerAutotest={running:false,stopRequested:false,worldIndex:0,turn:0,results:[],startedAt:0,endedAt:0,config:null,controller:null,batchController:null,lastReport:null,lastMessage:"",logs:[],hiddenAt:0,lastVisibleAt:0,backgroundInterruptions:0,backgroundDurationMs:0,exportSnapshot:null,exportPersistence:null};',
'const developerAutotest={running:false,stopRequested:false,worldIndex:0,turn:0,results:[],startedAt:0,endedAt:0,config:null,controller:null,batchController:null,lastReport:null,lastMessage:"",logs:[],hiddenAt:0,lastVisibleAt:0,backgroundInterruptions:0,backgroundDurationMs:0,exportSnapshot:null,exportPersistence:null,retainedRuns:[]};',
"developer autotest retained runs")

boot_start=app.index('const autotestCodexBridge=installAutotestCodexBridge')
boot_end=app.index('const autotestRuntimeExpansion=',boot_start)
boot='''void loadLastAutotestExportSnapshot().then(async snapshot=>{\n if(!snapshot){developerAutotest.retainedRuns=await listAutotestExportSnapshots();return}\n developerAutotest.exportSnapshot=snapshot;developerAutotest.exportPersistence={backend:"indexeddb-or-fallback",persisted:true,restored:true};if(!developerAutotest.lastReport&&snapshot.debugPayload?.summary)developerAutotest.lastReport=snapshot.debugPayload;recordDebug("AUTOTEST_EXPORT_CACHE_RESTORED",{createdAt:snapshot.createdAt,worlds:snapshot.worlds?.length||0});\n try{const archived=await archiveAutotestExportSnapshot(snapshot);recordDebug("AUTOTEST_EXPORT_ARCHIVE_PRESERVED",archived)}catch(error){recordDebug("AUTOTEST_EXPORT_ARCHIVE_PRESERVE_FAILED",{error:error?.message||String(error)})}\n developerAutotest.retainedRuns=await listAutotestExportSnapshots()\n}).catch(error=>recordDebug("AUTOTEST_EXPORT_CACHE_RESTORE_FAILED",{error:error?.message||String(error)}));\n'''
app=app[:boot_start]+boot+app[boot_end:]

panel_start=app.index(' const exportPanel=exportSnapshot?')
panel_end=app.index(' return `<div class="eyebrow">DEVELOPER · AI AUTOTEST</div>',panel_start)
panel=''' const retainedRuns=Array.isArray(developerAutotest.retainedRuns)?developerAutotest.retainedRuns:[],retainedOptions=retainedRuns.map(row=>`<option value="${esc(row.slot)}">v${esc(row.appVersion||"?")} · ${esc(row.createdAt||"")} · ${Number(row.worlds)||0} worlds</option>`).join("");\n const nativeUnavailable=!saveCapability.filePicker&&!saveCapability.fileShare,nativeButtons=`${saveCapability.filePicker&&exportArtifacts.debug?'<button id="autotestSaveDebug" class="primary">原生另存 Debug JSON</button>':""}${saveCapability.fileShare&&exportArtifacts.debug?'<button id="autotestShareDebug" class="primary">原生分享 Debug JSON</button>':""}${saveCapability.filePicker&&exportArtifacts.world?'<button id="autotestSaveWorld" class="primary">原生另存世界檔</button>':""}${saveCapability.fileShare&&exportArtifacts.world?'<button id="autotestShareWorld" class="primary">原生分享世界檔</button>':""}${saveCapability.filePicker&&exportArtifacts.recovery?'<button id="autotestSaveRecovery" class="secondary">原生另存 Recovery</button>':""}${saveCapability.fileShare&&exportArtifacts.recovery?'<button id="autotestShareRecovery" class="secondary">原生分享 Recovery</button>':""}${saveCapability.directoryPicker?'<button id="autotestSaveAll" class="secondary">原生另存全部檔案</button>':""}`;\n const retainedControl=retainedOptions?`<div class="lore-item"><small>RETAINED RUNS</small><p>部署與載入新版不會改寫已封存的 run。可在此切回舊 snapshot，再用上方正式原生檔案 API 匯出。</p><div class="settings-actions"><select id="autotestRetainedRun">${retainedOptions}</select><button id="autotestLoadRetainedRun" class="secondary">載入保留 Run</button></div></div>`:"";\n const exportPanel=exportSnapshot?`<div class="lore-item"><small>EXPORT READY · ${esc(exportSnapshot.createdAt||"")} · v${esc(exportSnapshot.appVersion||"?")}</small><h3>AutoTest snapshot 已保存，不需重跑</h3><p>${developerAutotest.exportPersistence?.persisted?"結果已保存於瀏覽器 IndexedDB，並以獨立 run slot 封存；新 run 不會覆蓋這份封存副本。":"結果目前保留在本頁記憶體。"}</p><p><strong>正式匯出：</strong>只使用瀏覽器正式檔案 API。File System Access 可用時直接另存；Web Share File 可用時建立原檔名、原 UTF-8 bytes 的 File 交給系統分享目標。兩者都不可用時只顯示 unsupported，不會自動改走 clipboard、DOM 搬運或間接橋接。</p>${nativeUnavailable?'<p class="error"><strong>目前瀏覽器未提供可用的原生檔案保存／分享 API。</strong> snapshot 仍安全保留，可在支援的同源瀏覽器載入後匯出。</p>':""}<div class="settings-actions">${nativeButtons}<button id="autotestReloadExport" class="secondary">重新載入目前保存結果</button></div><details><summary>標準瀏覽器下載（相容性）</summary><p class="muted">此路徑保留給一般瀏覽器；不會被當成原生保存成功，也不會在 unsupported 時自動觸發。</p><div class="settings-actions">${exportArtifacts.debug?'<button id="autotestDownloadDebug" class="ghost">標準下載 Debug</button>':""}${exportArtifacts.world?'<button id="autotestDownloadWorld" class="ghost">標準下載世界檔</button>':""}${exportArtifacts.recovery?'<button id="autotestDownloadRecovery" class="ghost">標準下載 Recovery</button>':""}</div></details></div>${retainedControl}`:`<div class="lore-item"><small>EXPORT RECOVERY</small><p>若之前已完成測試，可直接載入瀏覽器保存的 snapshot；不需要重跑 AutoTest。</p><button id="autotestReloadExport" class="secondary">載入上次匯出資料</button></div>${retainedControl}`;\n'''
app=app[:panel_start]+panel+app[panel_end:]

# Remove legacy UI bindings that no longer have controls.
for old in [
' $("#autotestDragDebug")?.addEventListener("click",()=>void openDeveloperAutotestDragExport("debug"));$("#autotestDragWorld")?.addEventListener("click",()=>void openDeveloperAutotestDragExport("world"));$("#autotestDragRecovery")?.addEventListener("click",()=>void openDeveloperAutotestDragExport("recovery"));\n',
' $("#autotestTransferDebug")?.addEventListener("click",()=>void openDeveloperAutotestTextTransfer("debug"));$("#autotestTransferWorld")?.addEventListener("click",()=>void openDeveloperAutotestTextTransfer("world"));$("#autotestTransferRecovery")?.addEventListener("click",()=>void openDeveloperAutotestTextTransfer("recovery"));\n',
' $("#autotestCopyDebug")?.addEventListener("click",()=>void copyDeveloperAutotestArtifact("debug"));$("#autotestCopyWorld")?.addEventListener("click",()=>void copyDeveloperAutotestArtifact("world"));\n',
' $("#autotestFallbackDebug")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("debug"));$("#autotestFallbackWorld")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("world"));$("#autotestFallbackRecovery")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("recovery"));'
]:
    app=app.replace(old,'',1)

save_bind=' $("#autotestSaveDebug")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("debug"));$("#autotestSaveWorld")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("world"));$("#autotestSaveRecovery")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("recovery"));$("#autotestSaveAll")?.addEventListener("click",()=>void saveAllDeveloperAutotestArtifacts());\n'
share_bind=save_bind+' $("#autotestShareDebug")?.addEventListener("click",()=>void shareDeveloperAutotestArtifact("debug"));$("#autotestShareWorld")?.addEventListener("click",()=>void shareDeveloperAutotestArtifact("world"));$("#autotestShareRecovery")?.addEventListener("click",()=>void shareDeveloperAutotestArtifact("recovery"));\n $("#autotestLoadRetainedRun")?.addEventListener("click",()=>void loadDeveloperAutotestRetainedRun(String($("#autotestRetainedRun")?.value||"")));\n'
app=must_replace(app,save_bind,share_bind,"native share bindings")

save_start=app.index('async function saveDeveloperAutotestArtifact(kind){')
save_end=app.index('async function saveAllDeveloperAutotestArtifacts(){',save_start)
save_impl='''async function saveDeveloperAutotestArtifact(kind){\n const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可儲存的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}\n const capability=autotestSaveCapability(window);recordDebug("AUTOTEST_EXPORT_SAVE_CAPABILITY",{...capability,kind,userActivation:Boolean(navigator.userActivation?.isActive)});\n if(!capability.filePicker){appendDeveloperAutotestLog("此瀏覽器未提供 File System Access 另存 API；不會自動轉用下載或其他繞過路徑。");recordDebug("AUTOTEST_EXPORT_SAVE_UNSUPPORTED",{kind,filename:artifact.filename});return}\n try{\n  const result=await saveAutotestArtifactWithPicker(artifact);\n  if(result.status==="cancelled"){appendDeveloperAutotestLog("已取消另存；snapshot 與封存 run 仍保留。");recordDebug("AUTOTEST_EXPORT_SAVE_CANCELLED",{kind,filename:artifact.filename});return}\n  if(result.status!=="saved"){appendDeveloperAutotestLog("此瀏覽器不支援正式另存 API；未觸發任何 fallback。");recordDebug("AUTOTEST_EXPORT_SAVE_UNSUPPORTED",{kind,filename:artifact.filename});return}\n  appendDeveloperAutotestLog(`原生另存完成：${result.filename}（${Number(result.bytes||0).toLocaleString()} bytes）。`);recordDebug("AUTOTEST_EXPORT_SAVE_COMPLETED",{kind,filename:result.filename,bytes:result.bytes,method:result.method})\n }catch(error){appendDeveloperAutotestLog(`原生另存失敗（${error?.name||"Error"}）：${error?.message||error}。snapshot 仍保留，未觸發 fallback。`);recordDebug("AUTOTEST_EXPORT_SAVE_FAILED",{kind,error:error?.message||String(error),name:error?.name||"Error"})}\n}\nasync function shareDeveloperAutotestArtifact(kind){\n const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可分享的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}\n const capability=autotestSaveCapability(window);recordDebug("AUTOTEST_EXPORT_SHARE_CAPABILITY",{...capability,kind,userActivation:Boolean(navigator.userActivation?.isActive)});\n if(!capability.fileShare){appendDeveloperAutotestLog("此瀏覽器未提供 Web Share File API；不會自動轉用下載、clipboard 或其他橋接。");recordDebug("AUTOTEST_EXPORT_SHARE_UNSUPPORTED",{kind,filename:artifact.filename});return}\n try{const result=await shareAutotestArtifact(artifact);if(result.status==="cancelled"){appendDeveloperAutotestLog("已取消原生分享；snapshot 與封存 run 仍保留。");recordDebug("AUTOTEST_EXPORT_SHARE_CANCELLED",{kind,filename:artifact.filename});return}if(result.status!=="shared"){appendDeveloperAutotestLog("此瀏覽器不接受檔案型 Web Share；未觸發 fallback。");recordDebug("AUTOTEST_EXPORT_SHARE_UNSUPPORTED",{kind,filename:artifact.filename});return}appendDeveloperAutotestLog(`原生分享已由系統目標接收：${result.filename} · ${Number(result.bytes||0).toLocaleString()} bytes · SHA-256 ${result.sha256}`);recordDebug("AUTOTEST_EXPORT_SHARE_COMPLETED",{kind,filename:result.filename,bytes:result.bytes,sha256:result.sha256,method:result.method})}\n catch(error){appendDeveloperAutotestLog(`原生分享失敗（${error?.name||"Error"}）：${error?.message||error}。snapshot 仍保留，未觸發 fallback。`);recordDebug("AUTOTEST_EXPORT_SHARE_FAILED",{kind,error:error?.message||String(error),name:error?.name||"Error"})}\n}\n'''
app=app[:save_start]+save_impl+app[save_end:]

reload_start=app.index('async function reloadDeveloperAutotestExport(){')
reload_end=app.index('async function startDeveloperAutotest(config){',reload_start)
reload_impl='''async function refreshDeveloperAutotestRetainedRuns(){try{developerAutotest.retainedRuns=await listAutotestExportSnapshots()}catch{developerAutotest.retainedRuns=[]}return developerAutotest.retainedRuns}\nasync function loadDeveloperAutotestRetainedRun(slot){\n try{const snapshot=await loadAutotestExportSnapshot(slot);if(!snapshot){appendDeveloperAutotestLog("找不到指定的保留 run。");return}developerAutotest.exportSnapshot=snapshot;developerAutotest.exportPersistence={backend:"indexeddb",persisted:true,restored:true,archiveSlot:slot};if(snapshot.debugPayload?.summary)developerAutotest.lastReport=snapshot.debugPayload;appendDeveloperAutotestLog(`已載入保留 run：v${snapshot.appVersion} · ${snapshot.createdAt}；不會覆蓋其他 run。`);recordDebug("AUTOTEST_EXPORT_ARCHIVE_LOADED",{slot,appVersion:snapshot.appVersion,createdAt:snapshot.createdAt,worlds:snapshot.worlds?.length||0})}catch(error){appendDeveloperAutotestLog(`載入保留 run 失敗：${error?.message||error}`)}openDeveloperAutotestPanel()\n}\nasync function reloadDeveloperAutotestExport(){\n try{const snapshot=await loadLastAutotestExportSnapshot();if(!snapshot){appendDeveloperAutotestLog("瀏覽器內沒有已保存的 AutoTest 匯出資料。");await refreshDeveloperAutotestRetainedRuns();openDeveloperAutotestPanel();return}developerAutotest.exportSnapshot=snapshot;developerAutotest.exportPersistence={backend:"indexeddb-or-fallback",persisted:true,restored:true};if(snapshot.debugPayload?.summary)developerAutotest.lastReport=snapshot.debugPayload;try{await archiveAutotestExportSnapshot(snapshot)}catch{}await refreshDeveloperAutotestRetainedRuns();appendDeveloperAutotestLog(`已載入 ${snapshot.createdAt} 的匯出資料，並保留為獨立 run，可直接使用原生檔案 API 匯出。`)}catch(error){appendDeveloperAutotestLog(`載入上次匯出資料失敗：${error?.message||error}`)}openDeveloperAutotestPanel()\n}\n'''
app=app[:reload_start]+reload_impl+app[reload_end:]

old_persist='try{developerAutotest.exportPersistence=await saveLastAutotestExportSnapshot(snapshot);recordDebug("AUTOTEST_EXPORT_PERSISTED",{backend:developerAutotest.exportPersistence.backend,worlds:snapshot.worlds.length})}'
new_persist='try{developerAutotest.exportPersistence=await saveLastAutotestExportSnapshot(snapshot);await refreshDeveloperAutotestRetainedRuns();recordDebug("AUTOTEST_EXPORT_PERSISTED",{backend:developerAutotest.exportPersistence.backend,worlds:snapshot.worlds.length,archiveSlot:developerAutotest.exportPersistence.archiveSlot||null})}'
app=must_replace(app,old_persist,new_persist,"refresh retained runs after export")
app=app.replace('請用下方按鈕下載，無需重跑測試。','請用下方正式原生檔案按鈕匯出，無需重跑測試。',1)

# Release/cache bump. Keep old snapshot appVersion values untouched because those live in IndexedDB data, not source constants.
app=app.replace('57021','57022')
app_path.write_text(app,encoding="utf-8")

# Current release/version surfaces.
p=Path("package.json");t=p.read_text(encoding="utf-8");t=t.replace('"version": "0.57.21"','"version": "0.57.22"');p.write_text(t,encoding="utf-8")
p=Path("src/version.js");t=p.read_text(encoding="utf-8").replace('0.57.21','0.57.22');p.write_text(t,encoding="utf-8")
p=Path("index.html");t=p.read_text(encoding="utf-8").replace('57021','57022');p.write_text(t,encoding="utf-8")
p=Path("src/autotest-download.js");t=p.read_text(encoding="utf-8").replace('57021','57022');p.write_text(t,encoding="utf-8")

# Update only release/cache expectations that track the canonical current release.
for path in Path("test").glob("*.test.js"):
    t=path.read_text(encoding="utf-8")
    changed=t.replace('57021','57022').replace('0.57.21','0.57.22').replace(r'0\\.57\\.21',r'0\\.57\\.22')
    if changed!=t:path.write_text(changed,encoding="utf-8")

print("v0.57.22 patch applied")
