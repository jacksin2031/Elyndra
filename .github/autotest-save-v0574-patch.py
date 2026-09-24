from pathlib import Path
import re


def fail(message):
    raise SystemExit(message)

# 1) Tighten FIRST_BUTTON: never override an existing first visible button.
p=Path('src/ai-autotest.js'); text=p.read_text()
pattern=r'export function firstButtonAutotestDecision\(state=\{\},recentActions=\[\]\)\{.*?\nfunction installAutotestStrategyUi'
replacement=r'''export function firstButtonAutotestDecision(state={},recentActions=[]){
 const snapshot=playerVisibleAutotestSnapshot(state),worldId=text(state?.world?.id||"WORLD",160),stall=consecutiveAutotestStall(recentActions);
 if(snapshot.combat?.active===true){const decision={mode:"combat",combatAction:"attack",action:"attack",suggestionIndex:null,kind:"COMBAT",progression:false,targetId:null,reason:"FIRST_BUTTON",goalReached:false,goalEvidence:"",firstButton:true};recordDebug("AUTOTEST_FIRST_BUTTON_DECISION",{worldId,mode:decision.mode,combatAction:"attack"});return decision}
 const chosen=list(snapshot.suggestions)[0];
 if(chosen){const decision={mode:"suggestion",suggestionIndex:0,action:text(chosen.action||chosen.label,180),kind:text(chosen.kind||"",30),progression:chosen.progression===true,targetId:chosen.targetId||null,combatAction:null,reason:"FIRST_BUTTON",goalReached:false,goalEvidence:"",firstButton:true};if(stall>=3)recordDebug("AUTOTEST_FIRST_BUTTON_PINNED_DURING_STALL",{worldId,stall,action:decision.action,kind:decision.kind,targetId:decision.targetId});recordDebug("AUTOTEST_FIRST_BUTTON_DECISION",{worldId,mode:decision.mode,suggestionIndex:0,action:decision.action,kind:decision.kind});return decision}
 const decision={mode:"free",suggestionIndex:null,action:"觀察四周並確認目前最明顯的變化",kind:"OBSERVE",progression:false,targetId:null,combatAction:null,reason:"FIRST_BUTTON_UNAVAILABLE_FALLBACK",goalReached:false,goalEvidence:"",firstButton:true,firstButtonUnavailable:true};recordDebug("AUTOTEST_FIRST_BUTTON_UNAVAILABLE",{worldId,location:snapshot?.world?.location||"",fallbackAction:decision.action,stall});return decision
}
function installAutotestStrategyUi'''
text,n=re.subn(pattern,replacement,text,count=1,flags=re.S)
if n!=1: fail('FIRST_BUTTON function replacement failed')
p.write_text(text)

# 2) App: wire File System Access API save path while retaining anchor fallback.
p=Path('app.js'); text=p.read_text()
anchor='import {buildAutotestExportSnapshot,buildAutotestExportArtifacts,saveLastAutotestExportSnapshot,loadLastAutotestExportSnapshot} from "./src/autotest-export.js?v=57003";\n'
if anchor not in text: fail('autotest-export import anchor missing')
text=text.replace(anchor,anchor+'import {autotestSaveCapability,saveAutotestArtifactWithPicker,saveAutotestArtifactsToDirectory} from "./src/autotest-save.js?v=57003";\n',1)

old='''function downloadDeveloperAutotestArtifact(kind){
 const snapshot=developerAutotest.exportSnapshot;if(!snapshot){appendDeveloperAutotestLog("找不到可重新匯出的 AutoTest 結果。");openDeveloperAutotestPanel();return}
 const artifacts=buildAutotestExportArtifacts(snapshot),artifact=artifacts[kind];if(!artifact){appendDeveloperAutotestLog(`本輪沒有 ${kind} 匯出內容。`);openDeveloperAutotestPanel();return}
 try{const info=autotestDownload(artifact.filename,artifact.body,artifact.mime);appendDeveloperAutotestLog(`已要求下載 ${artifact.filename}（${Number(info.bytes||0).toLocaleString()} bytes）。若瀏覽器未顯示完成，可再次按同一按鈕。`);recordDebug("AUTOTEST_EXPORT_RETRY_TRIGGERED",{kind,filename:artifact.filename,bytes:info.bytes})}
 catch(error){appendDeveloperAutotestLog(`下載啟動失敗：${error?.message||error}`);recordDebug("AUTOTEST_EXPORT_RETRY_FAILED",{kind,error:error?.message||String(error)});openDeveloperAutotestPanel()}
}
'''
new='''function developerAutotestArtifact(kind){const snapshot=developerAutotest.exportSnapshot;if(!snapshot)return null;return buildAutotestExportArtifacts(snapshot)[kind]||null}
function downloadDeveloperAutotestArtifact(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可下載的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 try{const info=autotestDownload(artifact.filename,artifact.body,artifact.mime);appendDeveloperAutotestLog(`已觸發傳統下載 fallback：${artifact.filename}（${Number(info.bytes||0).toLocaleString()} bytes）。此路徑依賴內置瀏覽器下載管理器。`);recordDebug("AUTOTEST_EXPORT_FALLBACK_TRIGGERED",{kind,filename:artifact.filename,bytes:info.bytes,userActivation:Boolean(navigator.userActivation?.isActive)})}
 catch(error){appendDeveloperAutotestLog(`傳統下載啟動失敗：${error?.message||error}`);recordDebug("AUTOTEST_EXPORT_FALLBACK_FAILED",{kind,error:error?.message||String(error)});openDeveloperAutotestPanel()}
}
async function saveDeveloperAutotestArtifact(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可儲存的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 const capability=autotestSaveCapability(window);recordDebug("AUTOTEST_EXPORT_SAVE_CAPABILITY",{...capability,kind,userActivation:Boolean(navigator.userActivation?.isActive)});
 if(!capability.filePicker){appendDeveloperAutotestLog("此內置瀏覽器未提供 Save File Picker；改用傳統下載 fallback。");downloadDeveloperAutotestArtifact(kind);return}
 try{
  const savePromise=saveAutotestArtifactWithPicker(artifact),result=await savePromise;
  if(result.status==="cancelled"){appendDeveloperAutotestLog("已取消另存檔案；持久化 snapshot 仍保留，可稍後再試。");recordDebug("AUTOTEST_EXPORT_SAVE_CANCELLED",{kind,filename:artifact.filename});return}
  if(result.status==="unsupported"){downloadDeveloperAutotestArtifact(kind);return}
  appendDeveloperAutotestLog(`儲存完成：${result.filename}（${Number(result.bytes||0).toLocaleString()} bytes）。`);recordDebug("AUTOTEST_EXPORT_SAVE_COMPLETED",{kind,filename:result.filename,bytes:result.bytes,method:result.method})
 }catch(error){appendDeveloperAutotestLog(`直接儲存失敗（${error?.name||"Error"}）：${error?.message||error}；改用傳統下載 fallback。`);recordDebug("AUTOTEST_EXPORT_SAVE_FAILED",{kind,error:error?.message||String(error),name:error?.name||"Error"});downloadDeveloperAutotestArtifact(kind)}
}
async function saveAllDeveloperAutotestArtifacts(){
 const snapshot=developerAutotest.exportSnapshot;if(!snapshot){appendDeveloperAutotestLog("找不到可儲存的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 const artifacts=buildAutotestExportArtifacts(snapshot),selected={debug:artifacts.debug,world:artifacts.world,recovery:artifacts.recovery},capability=autotestSaveCapability(window);recordDebug("AUTOTEST_EXPORT_DIRECTORY_CAPABILITY",{...capability,userActivation:Boolean(navigator.userActivation?.isActive)});
 if(!capability.directoryPicker){appendDeveloperAutotestLog("此內置瀏覽器未提供資料夾 Picker；請使用上方各檔案的「儲存到…」按鈕。`);return}
 try{const savePromise=saveAutotestArtifactsToDirectory(selected),result=await savePromise;if(result.status==="cancelled"){appendDeveloperAutotestLog("已取消選擇資料夾；snapshot 仍保留。");return}if(result.status!=="saved"){appendDeveloperAutotestLog("資料夾直接儲存不可用；請改用逐檔「儲存到…」。");return}const total=result.files.reduce((n,x)=>n+Number(x.bytes||0),0);appendDeveloperAutotestLog(`已直接儲存 ${result.files.length} 個檔案，共 ${total.toLocaleString()} bytes。`);recordDebug("AUTOTEST_EXPORT_DIRECTORY_SAVE_COMPLETED",{files:result.files,totalBytes:total})}catch(error){appendDeveloperAutotestLog(`資料夾儲存失敗：${error?.message||error}`);recordDebug("AUTOTEST_EXPORT_DIRECTORY_SAVE_FAILED",{error:error?.message||String(error),name:error?.name||"Error"})}
}
'''
if old not in text: fail('downloadDeveloperAutotestArtifact anchor missing')
text=text.replace(old,new,1)
# Fix accidental template quote in inserted message before JS validation.
text=text.replace('請使用上方各檔案的「儲存到…」按鈕。`);return}', '請使用上方各檔案的「儲存到…」按鈕。");return}')

old=''' const running=developerAutotest.running,report=developerAutotest.lastReport,summary=report?.summary,exportSnapshot=developerAutotest.exportSnapshot,exportArtifacts=exportSnapshot?buildAutotestExportArtifacts(exportSnapshot):{};
 const exportPanel=exportSnapshot?`<div class="lore-item"><small>EXPORT READY · ${esc(exportSnapshot.createdAt||"")}</small><h3>可重新匯出，不需重跑</h3><p>${developerAutotest.exportPersistence?.persisted?"結果已保存於瀏覽器；重新整理頁面後仍可載入。":"結果目前保留在本頁記憶體。"}</p><div class="settings-actions">${exportArtifacts.debug?'<button id="autotestRetryDebug" class="secondary">重新匯出 Debug JSON</button>':""}${exportArtifacts.world?'<button id="autotestRetryWorld" class="secondary">重新匯出世界</button>':""}${exportArtifacts.recovery?'<button id="autotestRetryRecovery" class="primary">下載單一復原包</button>':""}<button id="autotestReloadExport" class="ghost">重新載入已保存結果</button></div></div>`:`<div class="lore-item"><small>EXPORT RECOVERY</small><p>若之前已完成測試，可嘗試從瀏覽器保存區載入並重新匯出。</p><button id="autotestReloadExport" class="secondary">載入上次匯出資料</button></div>`;
'''
new=''' const running=developerAutotest.running,report=developerAutotest.lastReport,summary=report?.summary,exportSnapshot=developerAutotest.exportSnapshot,exportArtifacts=exportSnapshot?buildAutotestExportArtifacts(exportSnapshot):{},saveCapability=autotestSaveCapability(window);
 const exportPanel=exportSnapshot?`<div class="lore-item"><small>EXPORT READY · ${esc(exportSnapshot.createdAt||"")} · v${esc(exportSnapshot.appVersion||"?")}</small><h3>直接儲存已保存 snapshot，不需重跑</h3><p>${developerAutotest.exportPersistence?.persisted?"結果已保存於瀏覽器；重新整理頁面後仍可載入。":"結果目前保留在本頁記憶體。"} · Save File Picker ${saveCapability.filePicker?"可用":"不可用"} · Folder Picker ${saveCapability.directoryPicker?"可用":"不可用"}</p><div class="settings-actions">${exportArtifacts.debug?'<button id="autotestSaveDebug" class="primary">儲存 Debug JSON 到…</button>':""}${exportArtifacts.world?'<button id="autotestSaveWorld" class="primary">儲存世界到…</button>':""}${exportArtifacts.recovery?'<button id="autotestSaveRecovery" class="primary">儲存單一復原包到…</button>':""}${saveCapability.directoryPicker?'<button id="autotestSaveAll" class="secondary">選擇資料夾並儲存全部</button>':""}<button id="autotestReloadExport" class="ghost">重新載入已保存結果</button></div><details><summary>傳統下載 fallback</summary><div class="settings-actions">${exportArtifacts.debug?'<button id="autotestFallbackDebug" class="ghost">下載 Debug</button>':""}${exportArtifacts.world?'<button id="autotestFallbackWorld" class="ghost">下載世界</button>':""}${exportArtifacts.recovery?'<button id="autotestFallbackRecovery" class="ghost">下載復原包</button>':""}</div></details></div>`:`<div class="lore-item"><small>EXPORT RECOVERY</small><p>若之前已完成測試，可從瀏覽器保存區載入並直接另存，不需再跑回合。</p><button id="autotestReloadExport" class="secondary">載入上次匯出資料</button></div>`;
'''
if old not in text: fail('export panel anchor missing')
text=text.replace(old,new,1)

old=''' $("#autotestRetryDebug")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("debug"));$("#autotestRetryWorld")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("world"));$("#autotestRetryRecovery")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("recovery"));$("#autotestReloadExport")?.addEventListener("click",()=>void reloadDeveloperAutotestExport())
'''
new=''' $("#autotestSaveDebug")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("debug"));$("#autotestSaveWorld")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("world"));$("#autotestSaveRecovery")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("recovery"));$("#autotestSaveAll")?.addEventListener("click",()=>void saveAllDeveloperAutotestArtifacts());
 $("#autotestFallbackDebug")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("debug"));$("#autotestFallbackWorld")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("world"));$("#autotestFallbackRecovery")?.addEventListener("click",()=>downloadDeveloperAutotestArtifact("recovery"));$("#autotestReloadExport")?.addEventListener("click",()=>void reloadDeveloperAutotestExport())
'''
if old not in text: fail('export button bindings anchor missing')
text=text.replace(old,new,1)
p.write_text(text)

# 3) Update FIRST_BUTTON regression to assert literal first button under stalls.
p=Path('test/ai-autotest-first-button-hotfix.test.js'); text=p.read_text()
pattern=r'test\("first-button anti-stall changes both action class and target after three stalled turns".*?\n'
# Test is one physical line at file end.
text,n=re.subn(pattern,'test("first-button remains pinned to index zero even after repeated stalled turns",()=>{const s=state();s.world.registry.locations.push({id:"LOC-2",name:"側路",known:true});s.suggestionIntents=[{label:"再問一次",action:"再次詢問同一名 NPC",kind:"SOCIAL",progression:true,risk:"LOW",targetId:"NPC-1"},{label:"改走側路",action:"離開對話並走向側路",kind:"TRAVEL",progression:true,risk:"LOW",targetId:"LOC-2"}];const recent=[1,2,3,4,5].map(i=>({action:"詢問 NPC "+i,kind:"SOCIAL",targetId:"NPC-1",progressed:false}));const decision=firstButtonAutotestDecision(s,recent);assert.equal(decision.mode,"suggestion");assert.equal(decision.suggestionIndex,0);assert.equal(decision.action,"再次詢問同一名 NPC");assert.equal(decision.kind,"SOCIAL");assert.equal(decision.targetId,"NPC-1");assert.equal(decision.firstButton,true);assert.notEqual(decision.firstButtonOverride,true)})\n',text,count=1,flags=re.S)
if n!=1: fail('FIRST_BUTTON old anti-stall test replacement failed')
p.write_text(text)

# 4) Add direct-save tests.
Path('test/autotest-save-v0574.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {saveAutotestArtifactWithPicker,saveAutotestArtifactsToDirectory,autotestSaveCapability} from "../src/autotest-save.js";
import {readFile} from "node:fs/promises";
const artifact=(name="debug.json",body='{"ok":true}')=>({filename:name,mime:"application/json;charset=utf-8",body});

test("v0.57.4 Save File Picker is opened synchronously from the user gesture chain and writes then closes",async()=>{
 let called=false,closed=false,written="",options=null;
 const handle={name:"chosen.json",createWritable:async()=>({write:async blob=>{written=await blob.text()},close:async()=>{closed=true}})};
 const promise=saveAutotestArtifactWithPicker(artifact(),{showSaveFilePickerImpl:opts=>{called=true;options=opts;return Promise.resolve(handle)}});
 assert.equal(called,true,"picker must be invoked before the async function yields so user activation is preserved");
 const result=await promise;assert.equal(result.status,"saved");assert.equal(result.method,"file-picker");assert.equal(result.filename,"chosen.json");assert.equal(written,'{"ok":true}');assert.equal(closed,true);assert.equal(options.suggestedName,"debug.json")
});

test("v0.57.4 cancelling Save File Picker keeps the persisted snapshot available instead of forcing fallback",async()=>{
 const error=new Error("cancel");error.name="AbortError";const result=await saveAutotestArtifactWithPicker(artifact(),{showSaveFilePickerImpl:()=>Promise.reject(error)});assert.equal(result.status,"cancelled")
});

test("v0.57.4 directory picker writes all requested AutoTest artifacts",async()=>{
 const writes=new Map(),dir={getFileHandle:async name=>({name,createWritable:async()=>({write:async blob=>writes.set(name,await blob.text()),close:async()=>{}})})};
 const result=await saveAutotestArtifactsToDirectory({debug:artifact("debug.json","D"),world:artifact("world.json","W")},{showDirectoryPickerImpl:()=>Promise.resolve(dir)});assert.equal(result.status,"saved");assert.equal(result.files.length,2);assert.equal(writes.get("debug.json"),"D");assert.equal(writes.get("world.json"),"W")
});

test("v0.57.4 Developer AutoTest exposes direct save controls and retains explicit traditional-download fallback",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.match(app,/id="autotestSaveDebug"/);assert.match(app,/id="autotestSaveWorld"/);assert.match(app,/id="autotestSaveRecovery"/);assert.match(app,/id="autotestFallbackRecovery"/);assert.match(app,/saveDeveloperAutotestArtifact\("debug"\)/);assert.match(app,/downloadDeveloperAutotestArtifact\("recovery"\)/);assert.match(app,/AUTOTEST_EXPORT_SAVE_COMPLETED/)
});

test("v0.57.4 capability detection is explicit for embedded-browser diagnostics",()=>{assert.deepEqual(autotestSaveCapability({showSaveFilePicker(){},showDirectoryPicker(){},isSecureContext:true}),{filePicker:true,directoryPicker:true,secureContext:true})});
''')

# 5) Bump app/cache release to v0.57.4 / 57004 across runtime graph and release contracts.
for path in Path('.').rglob('*'):
    if not path.is_file() or '.git' in path.parts or path.parts[:1]==('.github',):
        continue
    if path.suffix.lower() not in {'.js','.mjs','.html','.json','.md'}:
        continue
    try: data=path.read_text()
    except UnicodeDecodeError: continue
    changed=data.replace('57003','57004').replace('0\\.57\\.3','0\\.57\\.4').replace('0.57.3','0.57.4')
    if changed!=data:path.write_text(changed)

# src/autotest-save.js was created before the release bump and needs no internal cache refs.
