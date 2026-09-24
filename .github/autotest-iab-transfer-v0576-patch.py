from pathlib import Path
import re


def fail(message):
    raise SystemExit(message)


def replace_required(path, old, new, count=1):
    p=Path(path); text=p.read_text()
    if old not in text:
        fail(f'missing anchor in {path}: {old[:120]}')
    p.write_text(text.replace(old,new,count))

# IAB-safe page transfer: no File Picker, browser clipboard, download manager, or third-party service.
Path('src/autotest-transfer.js').write_text(r'''const encoder=new TextEncoder();
const hex=buffer=>Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,"0")).join("");
function splitText(text,maxChars){const out=[];let at=0;while(at<text.length){let end=Math.min(text.length,at+maxChars);if(end<text.length){const prev=text.charCodeAt(end-1),next=text.charCodeAt(end);if(prev>=0xD800&&prev<=0xDBFF&&next>=0xDC00&&next<=0xDFFF)end-=1}if(end<=at)end=Math.min(text.length,at+maxChars);out.push(text.slice(at,end));at=end}return out}
async function sha256(text,cryptoImpl){if(!cryptoImpl?.subtle?.digest)throw new Error("AUTOTEST_TRANSFER_SHA256_UNAVAILABLE");return hex(await cryptoImpl.subtle.digest("SHA-256",encoder.encode(text)))}
export async function buildAutotestTextTransfer(artifact,{chunkChars=96000,cryptoImpl=globalThis.crypto}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_TRANSFER_ARTIFACT_INVALID");
 const body=String(artifact.body??""),limit=Math.max(4096,Math.floor(Number(chunkChars)||96000)),parts=splitText(body,limit),fullBytes=encoder.encode(body).length,fullSha256=await sha256(body,cryptoImpl);
 const chunks=[];for(let i=0;i<parts.length;i++){const text=parts[i];chunks.push({index:i+1,text,chars:text.length,bytes:encoder.encode(text).length,sha256:await sha256(text,cryptoImpl)})}
 return {schema:"elyndra-autotest-text-transfer-v1",filename:String(artifact.filename),mime:String(artifact.mime||"application/json;charset=utf-8"),encoding:"utf-8-raw-concat",chars:body.length,bytes:fullBytes,sha256:fullSha256,chunkChars:limit,totalChunks:chunks.length,chunks}
}
export function reconstructAutotestTextTransfer(transfer={}){return (Array.isArray(transfer.chunks)?transfer.chunks:[]).slice().sort((a,b)=>Number(a.index)-Number(b.index)).map(row=>String(row.text??"")).join("")}
export function autotestTransferManifest(transfer={}){return {schema:transfer.schema||"elyndra-autotest-text-transfer-v1",filename:String(transfer.filename||""),mime:String(transfer.mime||""),encoding:String(transfer.encoding||"utf-8-raw-concat"),chars:Number(transfer.chars)||0,bytes:Number(transfer.bytes)||0,sha256:String(transfer.sha256||""),chunkChars:Number(transfer.chunkChars)||0,totalChunks:Number(transfer.totalChunks)||0,chunks:(Array.isArray(transfer.chunks)?transfer.chunks:[]).map(row=>({index:Number(row.index)||0,chars:Number(row.chars)||0,bytes:Number(row.bytes)||0,sha256:String(row.sha256||"")}))}}
export async function verifyAutotestTextTransfer(transfer,{cryptoImpl=globalThis.crypto}={}){const text=reconstructAutotestTextTransfer(transfer),actual=await sha256(text,cryptoImpl);return {ok:actual===String(transfer?.sha256||""),actual,expected:String(transfer?.sha256||""),chars:text.length,bytes:encoder.encode(text).length}}
''')

# Explicit FIRST_BUTTON config must dominate storage/anti-stall for the whole batch.
p=Path('src/ai-autotest.js'); text=p.read_text()
old='export async function decideAutotestAction(state,{recentActions=[],customCondition="",signal,disableTimeout=false}={}){if(currentAutotestPlayStrategy()==="FIRST_BUTTON")return firstButtonAutotestDecision(state,recentActions);'
new='export async function decideAutotestAction(state,{recentActions=[],customCondition="",signal,disableTimeout=false,playStrategy}={}){const effectivePlayStrategy=playStrategy==="FIRST_BUTTON"?"FIRST_BUTTON":playStrategy==="AI_DECISION"?"AI_DECISION":currentAutotestPlayStrategy();if(effectivePlayStrategy==="FIRST_BUTTON")return firstButtonAutotestDecision(state,recentActions);'
if old not in text: fail('decideAutotestAction signature anchor missing')
p.write_text(text.replace(old,new,1))

# App wiring.
p=Path('app.js'); text=p.read_text()
anchor='import {copyAutotestText} from "./src/autotest-copy.js?v=57005";\n'
if anchor not in text: fail('copy import anchor missing')
text=text.replace(anchor,anchor+'import {buildAutotestTextTransfer,reconstructAutotestTextTransfer,autotestTransferManifest} from "./src/autotest-transfer.js?v=57005";\n',1)
anchor='const developerAutotest={running:false,stopRequested:false,worldIndex:0,turn:0,results:[],startedAt:0,endedAt:0,config:null,controller:null,batchController:null,lastReport:null,lastMessage:"",logs:[],hiddenAt:0,lastVisibleAt:0,backgroundInterruptions:0,backgroundDurationMs:0,exportSnapshot:null,exportPersistence:null};\n'
if anchor not in text: fail('developerAutotest state anchor missing')
text=text.replace(anchor,anchor+'const developerAutotestTransfer={kind:"",transfer:null,index:0,full:false};\n',1)

old='const decision=await decideAutotestAction(gameState,{recentActions,customCondition:config.stopCondition==="CUSTOM_AI"?config.customCondition:"",signal:ctrl.signal,disableTimeout:config.disableTimeout===true});'
new='const decision=await decideAutotestAction(gameState,{recentActions,customCondition:config.stopCondition==="CUSTOM_AI"?config.customCondition:"",signal:ctrl.signal,disableTimeout:config.disableTimeout===true,playStrategy:config.playStrategy});'
if old not in text: fail('AutoTest decision call anchor missing')
text=text.replace(old,new,1)

# Insert text-transfer UI before legacy download fallback.
anchor='function downloadDeveloperAutotestArtifact(kind){\n'
if anchor not in text: fail('downloadDeveloperAutotestArtifact anchor missing')
transfer_ui=r'''function developerAutotestTransferLabel(kind){return kind==="debug"?"Debug JSON":kind==="world"?"世界 JSON":"Recovery JSON"}
function developerAutotestTransferHtml(){
 const t=developerAutotestTransfer.transfer;if(!t)return `<div class="eyebrow">AUTOTEST · IAB TRANSFER</div><h2>沒有可顯示資料</h2><button id="autotestTransferBack" class="secondary">返回 AutoTest</button>`;
 const full=developerAutotestTransfer.full,index=Math.max(0,Math.min(t.chunks.length-1,developerAutotestTransfer.index)),chunk=t.chunks[index]||{text:"",index:0,chars:0,bytes:0,sha256:""},payload=full?reconstructAutotestTextTransfer(t):chunk.text,manifest=JSON.stringify(autotestTransferManifest(t),null,2),label=developerAutotestTransferLabel(developerAutotestTransfer.kind);
 return `<div class="eyebrow">AUTOTEST · IAB TEXT TRANSFER</div><h2>${esc(label)} 頁面取回</h2><div class="lore-item"><p><strong>檔名：</strong><code>${esc(t.filename)}</code></p><p><strong>完整 SHA-256：</strong><code>${esc(t.sha256)}</code></p><p>${Number(t.bytes).toLocaleString()} bytes · ${Number(t.chars).toLocaleString()} 字元 · ${t.totalChunks} 段 · UTF-8 raw concat</p><p class="muted">此路徑不呼叫 File Picker、navigator.clipboard 或下載管理器。分段模式請依 1 → ${t.totalChunks} 原樣串接，不要加入額外換行或標記；重組後 SHA-256 必須等於上方值。</p></div><div class="settings-actions"><button id="autotestTransferSelect" class="primary">${full?"選取完整 JSON":"選取本段"}</button><button id="autotestTransferPrev" class="secondary" ${full||index<=0?"disabled":""}>上一段</button><button id="autotestTransferNext" class="secondary" ${full||index>=t.chunks.length-1?"disabled":""}>下一段</button><button id="autotestTransferToggleFull" class="secondary">${full?"返回分段模式":"完整 JSON 單頁模式"}</button><button id="autotestTransferBack" class="ghost">返回 AutoTest</button></div><p><strong>${full?"完整檔案":`第 ${chunk.index} / ${t.totalChunks} 段`}</strong>${full?` · SHA-256 ${esc(t.sha256)}`:` · ${Number(chunk.bytes).toLocaleString()} bytes · ${Number(chunk.chars).toLocaleString()} 字元 · SHA-256 ${esc(chunk.sha256)}`}</p><textarea id="autotestTransferText" readonly spellcheck="false" wrap="off" rows="18" style="width:100%;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre;overflow:auto">${esc(payload)}</textarea><p class="muted">按「選取」只建立原生文字選取，不宣稱已寫入剪貼簿；之後的 Ctrl+C 由瀏覽器原生選取機制處理。</p><details><summary>完整性 Manifest</summary><textarea readonly spellcheck="false" wrap="off" rows="10" style="width:100%;font-family:ui-monospace,SFMono-Regular,Consolas,monospace">${esc(manifest)}</textarea></details>`
}
function bindDeveloperAutotestTransfer(){
 $("#autotestTransferSelect")?.addEventListener("click",()=>{const area=$("#autotestTransferText");if(!area)return;area.focus();area.select();area.setSelectionRange?.(0,area.value.length);recordDebug("AUTOTEST_TEXT_TRANSFER_SELECTED",{kind:developerAutotestTransfer.kind,index:developerAutotestTransfer.full?0:developerAutotestTransfer.index+1,full:developerAutotestTransfer.full,chars:area.value.length})});
 $("#autotestTransferPrev")?.addEventListener("click",()=>{developerAutotestTransfer.index=Math.max(0,developerAutotestTransfer.index-1);openModal(developerAutotestTransferHtml());bindDeveloperAutotestTransfer()});
 $("#autotestTransferNext")?.addEventListener("click",()=>{developerAutotestTransfer.index=Math.min((developerAutotestTransfer.transfer?.totalChunks||1)-1,developerAutotestTransfer.index+1);openModal(developerAutotestTransferHtml());bindDeveloperAutotestTransfer()});
 $("#autotestTransferToggleFull")?.addEventListener("click",()=>{developerAutotestTransfer.full=!developerAutotestTransfer.full;openModal(developerAutotestTransferHtml());bindDeveloperAutotestTransfer()});
 $("#autotestTransferBack")?.addEventListener("click",openDeveloperAutotestPanel)
}
async function openDeveloperAutotestTextTransfer(kind){
 const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可頁面取回的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}
 try{const transfer=await buildAutotestTextTransfer(artifact);developerAutotestTransfer.kind=kind;developerAutotestTransfer.transfer=transfer;developerAutotestTransfer.index=0;developerAutotestTransfer.full=false;recordDebug("AUTOTEST_TEXT_TRANSFER_READY",{kind,filename:transfer.filename,bytes:transfer.bytes,chars:transfer.chars,totalChunks:transfer.totalChunks,sha256:transfer.sha256});openModal(developerAutotestTransferHtml());bindDeveloperAutotestTransfer()}
 catch(error){appendDeveloperAutotestLog(`頁面取回資料建立失敗：${error?.message||error}`);recordDebug("AUTOTEST_TEXT_TRANSFER_FAILED",{kind,error:error?.message||String(error)});openDeveloperAutotestPanel()}
}
'''
text=text.replace(anchor,transfer_ui+anchor,1)

# Replace export panel only; legacy Browser APIs remain available but explicitly secondary.
pattern=r' const exportPanel=exportSnapshot\?.*?;\n return `<div class="eyebrow">DEVELOPER · AI AUTOTEST</div>'
new_panel=r''' const exportPanel=exportSnapshot?`<div class="lore-item"><small>EXPORT READY · ${esc(exportSnapshot.createdAt||"")} · v${esc(exportSnapshot.appVersion||"?")}</small><h3>IAB 頁面取回已保存 snapshot，不需重跑</h3><p>${developerAutotest.exportPersistence?.persisted?"結果已保存於瀏覽器 IndexedDB；重新整理後仍可載入。":"結果目前保留在本頁記憶體。"}</p><p><strong>主要交付路徑：</strong>直接在頁面顯示完整 JSON 或固定大小分段，附檔名與 SHA-256；不依賴 File Picker、browser clipboard 或下載管理器。</p><div class="settings-actions">${exportArtifacts.debug?'<button id="autotestTransferDebug" class="primary">頁面取回 Debug JSON</button>':""}${exportArtifacts.world?'<button id="autotestTransferWorld" class="primary">頁面取回世界 JSON</button>':""}${exportArtifacts.recovery?'<button id="autotestTransferRecovery" class="primary">頁面取回 Recovery JSON</button>':""}<button id="autotestReloadExport" class="secondary">重新載入已保存結果</button></div><details><summary>Browser API fallback（Codex IAB 可能自動取消或不落地）</summary><p class="muted">以下只保留兼容性，不作為成功交付判定。</p><div class="settings-actions">${exportArtifacts.debug?'<button id="autotestSaveDebug" class="ghost">Save Picker：Debug</button>':""}${exportArtifacts.world?'<button id="autotestSaveWorld" class="ghost">Save Picker：世界</button>':""}${exportArtifacts.recovery?'<button id="autotestSaveRecovery" class="ghost">Save Picker：Recovery</button>':""}${saveCapability.directoryPicker?'<button id="autotestSaveAll" class="ghost">Directory Picker：全部</button>':""}${exportArtifacts.debug?'<button id="autotestFallbackDebug" class="ghost">傳統下載 Debug</button>':""}${exportArtifacts.world?'<button id="autotestFallbackWorld" class="ghost">傳統下載世界</button>':""}${exportArtifacts.recovery?'<button id="autotestFallbackRecovery" class="ghost">傳統下載 Recovery</button>':""}</div></details></div>`:`<div class="lore-item"><small>EXPORT RECOVERY</small><p>若之前已完成測試，可從瀏覽器保存區載入後使用 IAB 頁面取回，不需再跑回合。</p><button id="autotestReloadExport" class="secondary">載入上次匯出資料</button></div>`;
 return `<div class="eyebrow">DEVELOPER · AI AUTOTEST</div>'''
text,n=re.subn(pattern,new_panel,text,count=1,flags=re.S)
if n!=1: fail('export panel replacement failed')

anchor=' $("#autotestSaveDebug")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("debug"));'
if anchor not in text: fail('AutoTest panel binding anchor missing')
text=text.replace(anchor,' $("#autotestTransferDebug")?.addEventListener("click",()=>void openDeveloperAutotestTextTransfer("debug"));$("#autotestTransferWorld")?.addEventListener("click",()=>void openDeveloperAutotestTextTransfer("world"));$("#autotestTransferRecovery")?.addEventListener("click",()=>void openDeveloperAutotestTextTransfer("recovery"));\n'+anchor,1)
p.write_text(text)

# Regression coverage for exact reconstruction/integrity and FIRST_BUTTON config authority.
Path('test/autotest-iab-transfer-v0576.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {buildAutotestTextTransfer,reconstructAutotestTextTransfer,verifyAutotestTextTransfer,autotestTransferManifest} from "../src/autotest-transfer.js";
import {decideAutotestAction} from "../src/ai-autotest.js";

const sha=text=>createHash("sha256").update(text,"utf8").digest("hex");
function state(){return {world:{id:"W-IAB",state:{day:1,clock:{hour:8,minute:0,totalMinutes:0}},registry:{locations:[{id:"L1",name:"起點",known:true}],npcs:[],factions:[],sideQuests:[]}},player:{location:"起點",hp:100,maxHp:100,status:"ALIVE",level:1,xp:0,knowledgeScore:0,wallet:{}},quests:{main:{title:"測試",stage:0,status:"ACTIVE",objectives:["前進"]}},inventory:[],knowledge:[],events:[],suggestionIntents:[{label:"第一個",action:"固定第一按鈕",kind:"OBSERVE",progression:false,targetId:"L1"},{label:"第二個",action:"不應被 anti-stall 選中",kind:"TRAVEL",progression:true,targetId:"L1"}]}}

test("v0.57.6 IAB text transfer reconstructs Unicode JSON byte-for-byte with SHA-256",async()=>{const body=JSON.stringify({name:"世界🌏",rows:Array.from({length:80},(_,i)=>`第${i}段-${"測試".repeat(8)}`)},null,2),artifact={filename:"Elyndra-test.json",mime:"application/json;charset=utf-8",body};const transfer=await buildAutotestTextTransfer(artifact,{chunkChars:97});assert.ok(transfer.totalChunks>1);assert.equal(reconstructAutotestTextTransfer(transfer),body);assert.equal(transfer.sha256,sha(body));const verified=await verifyAutotestTextTransfer(transfer);assert.equal(verified.ok,true);assert.equal(verified.bytes,Buffer.byteLength(body,"utf8"));const manifest=autotestTransferManifest(transfer);assert.equal(manifest.filename,"Elyndra-test.json");assert.equal(manifest.chunks.length,transfer.totalChunks);assert.equal("text" in manifest.chunks[0],false)});

test("v0.57.6 FIRST_BUTTON batch config overrides storage and anti-stall before AI decision",async()=>{const oldStorage=globalThis.localStorage,oldFetch=globalThis.fetch;let fetches=0;globalThis.localStorage={getItem:()=>"AI_DECISION",setItem(){},removeItem(){}};globalThis.fetch=async()=>{fetches++;throw new Error("provider must not be called")};try{const recent=Array.from({length:8},(_,i)=>({turn:i+1,action:"固定第一按鈕",kind:"OBSERVE",targetId:"L1",progressed:false}));const decision=await decideAutotestAction(state(),{recentActions:recent,playStrategy:"FIRST_BUTTON"});assert.equal(decision.mode,"suggestion");assert.equal(decision.suggestionIndex,0);assert.equal(decision.action,"固定第一按鈕");assert.equal(decision.firstButton,true);assert.equal(fetches,0)}finally{globalThis.localStorage=oldStorage;globalThis.fetch=oldFetch}});

test("v0.57.6 FIRST_BUTTON uses free fallback only when no button exists",async()=>{const s=state();s.suggestionIntents=[];s.suggestions=[];const decision=await decideAutotestAction(s,{playStrategy:"FIRST_BUTTON",recentActions:Array.from({length:8},(_,i)=>({turn:i+1,progressed:false}))});assert.equal(decision.mode,"free");assert.equal(decision.firstButtonUnavailable,true)});

test("v0.57.6 Developer AutoTest makes page transfer primary and passes frozen strategy config",async()=>{const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.match(app,/id="autotestTransferDebug"/);assert.match(app,/id="autotestTransferWorld"/);assert.match(app,/id="autotestTransferRecovery"/);assert.match(app,/AUTOTEST_TEXT_TRANSFER_READY/);assert.match(app,/完整 SHA-256/);assert.match(app,/utf-8-raw-concat/);assert.match(app,/playStrategy:config\.playStrategy/);assert.match(app,/Browser API fallback/)});
''')

# Release bump/cache generation. Do not rewrite historical docs/release notes.
for path in Path('.').rglob('*'):
    if not path.is_file() or '.git' in path.parts or path.parts[:1]==('.github',):
        continue
    if path.suffix.lower() not in {'.js','.mjs','.html','.json'}:
        continue
    try:data=path.read_text()
    except UnicodeDecodeError:continue
    changed=data.replace('57005','57006')
    if path.as_posix() in {'package.json','src/version.js','test/version-ui.test.js','test/version-0551-release.test.js'} or path.parts[:1]==('test',):
        changed=changed.replace('0\\.57\\.5','0\\.57\\.6').replace('0.57.5','0.57.6')
    if changed!=data:path.write_text(changed)

Path('docs/releases/v0.57.6.md').write_text('''# Elyndra v0.57.6\n\nDeveloper AI AutoTest IAB export recovery update.\n\n- Adds an in-page text transfer path for persisted Debug, world, and recovery artifacts.\n- Transfer manifests include exact filename, UTF-8 byte/character counts, per-chunk SHA-256, whole-file SHA-256, and ordered raw-concatenation chunks.\n- File Picker, browser clipboard, and download-manager paths remain compatibility fallbacks only.\n- FIRST_BUTTON now uses the batch-frozen `playStrategy` value as the authority, so anti-stall and storage changes cannot override an available first action button.\n''')
