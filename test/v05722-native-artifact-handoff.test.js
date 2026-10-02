import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {readFile} from "node:fs/promises";
import {autotestSaveCapability,shareAutotestArtifact} from "../src/autotest-save.js";
import {buildAutotestExportArtifacts} from "../src/autotest-export.js";

class FakeFile extends Blob{
 constructor(parts,name,options={}){super(parts,options);this.name=String(name);this.lastModified=Number(options.lastModified)||0}
}

const artifact={filename:"Elyndra-autotest-worlds-v0.57.17-2026-09-25T16-31-51-390Z.json",mime:"application/json;charset=utf-8",body:'{"世界":"裂隙","ok":true}'};

test("v0.57.22 native Web Share hands off an exact File synchronously from the user gesture chain",async()=>{
 let shareCalled=false,sharedFile=null;
 const navigatorImpl={
  canShare:payload=>Array.isArray(payload?.files)&&payload.files[0]?.name===artifact.filename,
  share:payload=>{shareCalled=true;sharedFile=payload.files[0];return Promise.resolve()}
 };
 const promise=shareAutotestArtifact(artifact,{navigatorImpl,FileImpl:FakeFile,cryptoImpl:webcrypto,nowImpl:()=>123});
 assert.equal(shareCalled,true,"navigator.share must be invoked before the async function yields");
 const result=await promise;
 assert.equal(result.status,"shared");
 assert.equal(result.method,"web-share-file");
 assert.equal(result.filename,artifact.filename);
 assert.equal(result.bytes,new TextEncoder().encode(artifact.body).byteLength);
 assert.equal(sharedFile.name,artifact.filename);
 assert.equal(sharedFile.size,result.bytes);
 assert.equal(await sharedFile.text(),artifact.body);
 assert.match(result.sha256,/^[0-9a-f]{64}$/)
});

test("v0.57.22 capability detection exposes supported native file APIs without inventing a fallback",()=>{
 const navigator={canShare:()=>true,share:()=>Promise.resolve()};
 assert.deepEqual(autotestSaveCapability({navigator,File:FakeFile,showSaveFilePicker(){},showDirectoryPicker(){},isSecureContext:true}),{filePicker:true,directoryPicker:true,fileShare:true,secureContext:true});
 assert.deepEqual(autotestSaveCapability({navigator:{},File:FakeFile,isSecureContext:true}),{filePicker:false,directoryPicker:false,fileShare:false,secureContext:true})
});

test("v0.57.22 preserved v0.57.17 snapshot regenerates the original artifact identity instead of renaming to the current app version",()=>{
 const snapshot={appVersion:"0.57.17",createdAt:"2026-09-25T16:31:51.390Z",stamp:"2026-09-25T16-31-51-390Z",exportMode:"both",debugPayload:{summary:{turns:120}},worlds:[{world:{id:"W1"}},{world:{id:"W2"}}]};
 const artifacts=buildAutotestExportArtifacts(snapshot);
 assert.equal(artifacts.world.filename,"Elyndra-autotest-worlds-v0.57.17-2026-09-25T16-31-51-390Z.json");
 assert.equal(artifacts.debug.filename,"Elyndra-autotest-debug-v0.57.17-2026-09-25T16-31-51-390Z.json")
});

// Compatibility integration choice: preserve native handoff as primary and keep helpers secondary; this does not claim the pre-incident UI hierarchy is reproduced.
test("v0.57.22 archives retained runs, keeps native handoff primary, and offers explicit secondary copy helpers",async()=>{
 const source=await readFile(new URL("../src/autotest-export.js",import.meta.url),"utf8"),app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(source,/archiveSlotFor/);
 assert.match(source,/idbPut\(db,\{slot:archiveSlot,\.\.\.normalized\}\).*idbPut\(db,\{slot:SLOT,\.\.\.normalized\}\)/s);
 assert.match(app,/archiveAutotestExportSnapshot\(snapshot\)/);
 assert.match(app,/id="autotestShareDebug"/);
 assert.match(app,/id="autotestRetainedRun"/);
  assert.match(app,/AUTOTEST_EXPORT_SHARE_COMPLETED/);
  assert.match(app,/installAutotestCodexBridge\(kind=>developerAutotestArtifact\(kind\),\{chunkChars:131072\}\)/);
   const nativeShareIndex=app.indexOf('id="autotestShareDebug"'),secondaryCopyIndex=app.indexOf('id="autotestCopyDebug"'),transferIndex=app.indexOf('id="autotestTransferDebug"'),dragIndex=app.indexOf('id="autotestDragDebug"');
  assert.ok(nativeShareIndex>=0&&secondaryCopyIndex>nativeShareIndex&&transferIndex>nativeShareIndex&&dragIndex>nativeShareIndex,"native share controls stay ahead of secondary copy, transfer, and drag helpers");
  assert.match(app,/id="autotestCopyWorld"/);
  assert.match(app,/class="autotest-export-assist"/);
  assert.match(app,/#autotestCopyDebug"\)\?\.addEventListener\("click",\(\)=>void copyDeveloperAutotestArtifact\("debug"\)\)/);
  assert.match(app,/#autotestCopyWorld"\)\?\.addEventListener\("click",\(\)=>void copyDeveloperAutotestArtifact\("world"\)\)/);
  assert.match(app,/id="autotestDragWorld"/);
  assert.match(app,/id="autotestDragRecovery"/);
  assert.match(app,/id="autotestTransferWorld"/);
  assert.match(app,/id="autotestTransferRecovery"/);
  assert.match(app,/id="autotestFallbackRecovery"/);
  assert.match(app,/#autotestDragDebug"\)\?\.addEventListener\("click",\(\)=>void openDeveloperAutotestDragExport\("debug"\)\)/);
  assert.match(app,/#autotestTransferDebug"\)\?\.addEventListener\("click",\(\)=>void openDeveloperAutotestTextTransfer\("debug"\)\)/);
  assert.match(app,/#autotestFallbackRecovery"\)\?\.addEventListener\("click",\(\)=>downloadDeveloperAutotestArtifact\("recovery"\)\)/)
 });
