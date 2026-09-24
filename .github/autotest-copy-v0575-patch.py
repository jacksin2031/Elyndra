from pathlib import Path


def fail(message):
    raise SystemExit(message)

# 1) Add a testable copy helper. Clipboard API first, legacy selection fallback second.
Path('src/autotest-copy.js').write_text(r'''const chars=value=>String(value??"").length;
export async function copyAutotestText(value,{clipboard=globalThis.navigator?.clipboard,documentRef=globalThis.document}={}){
 const text=String(value??"");if(!text)return {status:"empty",method:"none",chars:0};
 let clipboardError=null;
 if(typeof clipboard?.writeText==="function"){
  try{await clipboard.writeText(text);return {status:"copied",method:"clipboard",chars:chars(text)}}catch(error){clipboardError=error}
 }
 if(documentRef?.body&&typeof documentRef.createElement==="function"&&typeof documentRef.execCommand==="function"){
  const area=documentRef.createElement("textarea");area.value=text;area.setAttribute?.("readonly","");area.style.position="fixed";area.style.opacity="0";area.style.pointerEvents="none";area.style.left="-9999px";documentRef.body.appendChild(area);
  try{area.focus?.();area.select?.();area.setSelectionRange?.(0,text.length);const ok=documentRef.execCommand("copy");if(ok)return {status:"copied",method:"selection-fallback",chars:chars(text),clipboardError:clipboardError?.message||null}}
  finally{area.remove?.()}
 }
 return {status:"unsupported",method:"none",chars:chars(text),clipboardError:clipboardError?.message||null}
}
''')

# 2) Wire copy controls into the Developer AutoTest persisted export panel.
p=Path('app.js'); text=p.read_text()
anchor='import {autotestSaveCapability,saveAutotestArtifactWithPicker,saveAutotestArtifactsToDirectory} from "./src/autotest-save.js?v=57004";\n'
if anchor not in text: fail('autotest-save import anchor missing')
text=text.replace(anchor,anchor+'import {copyAutotestText} from "./src/autotest-copy.js?v=57004";\n',1)

anchor='''async function saveDeveloperAutotestArtifact(kind){\n'''
if anchor not in text: fail('saveDeveloperAutotestArtifact anchor missing')
copy_fn='''async function copyDeveloperAutotestArtifact(kind){\n const artifact=developerAutotestArtifact(kind);if(!artifact){appendDeveloperAutotestLog("找不到可複製的 AutoTest 匯出內容。");openDeveloperAutotestPanel();return}\n try{const result=await copyAutotestText(artifact.body);if(result.status==="copied"){appendDeveloperAutotestLog(`已複製 ${kind==="debug"?"Debug JSON":"世界 JSON"}（${Number(result.chars||0).toLocaleString()} 字元，${result.method}）。`);recordDebug("AUTOTEST_EXPORT_COPY_COMPLETED",{kind,filename:artifact.filename,chars:result.chars,method:result.method});return}appendDeveloperAutotestLog("此內置瀏覽器不允許直接寫入剪貼簿；請使用「儲存到…」取回檔案。");recordDebug("AUTOTEST_EXPORT_COPY_UNSUPPORTED",{kind,filename:artifact.filename,chars:result.chars,clipboardError:result.clipboardError||null})}\n catch(error){appendDeveloperAutotestLog(`複製失敗：${error?.message||error}`);recordDebug("AUTOTEST_EXPORT_COPY_FAILED",{kind,error:error?.message||String(error),name:error?.name||"Error"})}\n}\n'''
text=text.replace(anchor,copy_fn+anchor,1)

old='''${exportArtifacts.debug?'<button id="autotestSaveDebug" class="primary">儲存 Debug JSON 到…</button>':""}${exportArtifacts.world?'<button id="autotestSaveWorld" class="primary">儲存世界到…</button>':""}${exportArtifacts.recovery?'<button id="autotestSaveRecovery" class="primary">儲存單一復原包到…</button>':""}'''
new='''${exportArtifacts.debug?'<button id="autotestSaveDebug" class="primary">儲存 Debug JSON 到…</button><button id="autotestCopyDebug" class="secondary">複製 Debug JSON</button>':""}${exportArtifacts.world?'<button id="autotestSaveWorld" class="primary">儲存世界到…</button><button id="autotestCopyWorld" class="secondary">複製世界 JSON</button>':""}${exportArtifacts.recovery?'<button id="autotestSaveRecovery" class="primary">儲存單一復原包到…</button>':""}'''
if old not in text: fail('export button group anchor missing')
text=text.replace(old,new,1)

old=''' $("#autotestSaveDebug")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("debug"));$("#autotestSaveWorld")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("world"));$("#autotestSaveRecovery")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("recovery"));$("#autotestSaveAll")?.addEventListener("click",()=>void saveAllDeveloperAutotestArtifacts());\n'''
new=''' $("#autotestSaveDebug")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("debug"));$("#autotestSaveWorld")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("world"));$("#autotestSaveRecovery")?.addEventListener("click",()=>void saveDeveloperAutotestArtifact("recovery"));$("#autotestSaveAll")?.addEventListener("click",()=>void saveAllDeveloperAutotestArtifacts());\n $("#autotestCopyDebug")?.addEventListener("click",()=>void copyDeveloperAutotestArtifact("debug"));$("#autotestCopyWorld")?.addEventListener("click",()=>void copyDeveloperAutotestArtifact("world"));\n'''
if old not in text: fail('save bindings anchor missing')
text=text.replace(old,new,1)
p.write_text(text)

# 3) Regression tests for Clipboard API, fallback, and panel wiring.
Path('test/autotest-copy-v0575.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {copyAutotestText} from "../src/autotest-copy.js";

test("v0.57.5 copies AutoTest JSON through Clipboard API",async()=>{let copied="";const out=await copyAutotestText('{"debug":true}',{clipboard:{writeText:async value=>{copied=value}},documentRef:null});assert.equal(out.status,"copied");assert.equal(out.method,"clipboard");assert.equal(copied,'{"debug":true}')});

test("v0.57.5 falls back to selection copy when Clipboard API is rejected",async()=>{let area=null,exec=0;const body={appendChild(node){area=node}},documentRef={body,createElement(){return {style:{},setAttribute(){},focus(){},select(){},setSelectionRange(){},remove(){this.removed=true}}},execCommand(command){exec++;return command==="copy"}};const out=await copyAutotestText('{"world":true}',{clipboard:{writeText:async()=>{throw new Error("clipboard denied")}},documentRef});assert.equal(out.status,"copied");assert.equal(out.method,"selection-fallback");assert.equal(exec,1);assert.equal(area.value,'{"world":true}');assert.equal(area.removed,true)});

test("v0.57.5 persisted AutoTest export panel exposes direct copy buttons for Debug and World JSON",async()=>{const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.match(app,/id="autotestCopyDebug"/);assert.match(app,/id="autotestCopyWorld"/);assert.match(app,/copyDeveloperAutotestArtifact\("debug"\)/);assert.match(app,/copyDeveloperAutotestArtifact\("world"\)/);assert.match(app,/AUTOTEST_EXPORT_COPY_COMPLETED/)});
''')

# 4) Bump release/cache token so the deployed page cannot reuse v0.57.4 JS.
for path in Path('.').rglob('*'):
    if not path.is_file() or '.git' in path.parts or path.parts[:1]==('.github',):
        continue
    if path.suffix.lower() not in {'.js','.mjs','.html','.json','.md'}:
        continue
    try:data=path.read_text()
    except UnicodeDecodeError:continue
    changed=data.replace('57004','57005').replace('0\\.57\\.4','0\\.57\\.5').replace('0.57.4','0.57.5')
    if changed!=data:path.write_text(changed)
