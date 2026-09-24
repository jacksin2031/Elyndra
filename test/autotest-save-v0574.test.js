import test from "node:test";
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
