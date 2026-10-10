import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {buildAutotestExportArtifacts,archiveAutotestExportSnapshot} from "../src/autotest-export.js";
import {buildAutotestDownloadPayload,createAutotestDownloadLease,ensureAutotestDownloadBridge} from "../src/autotest-download.js";

function memoryDb(rows=new Map()){
 const db={close(){},transaction(){const tx={objectStore:()=>({
  get(slot){const req={};queueMicrotask(()=>{req.result=rows.get(slot)||null;req.onsuccess?.();});return req;},
  put(row){rows.set(row.slot,structuredClone(row));queueMicrotask(()=>tx.oncomplete?.());}
 })};return tx;}};
 return {rows,indexedDB:{open(){const req={};queueMicrotask(()=>{req.result=db;req.onsuccess?.();});return req;}}};
}

function worker(indexedDB){
 const handlers={};vm.runInNewContext(readFileSync(new URL("../autotest-export-sw.js",import.meta.url),"utf8"),{
  self:{addEventListener:(type,handler)=>handlers[type]=handler},indexedDB,TextEncoder,URL,Response
 });
 return async url=>{let response;handlers.fetch({request:{method:"GET",url},respondWith(value){response=value;}});return await response;};
}

test("selected retained snapshot is archived for HTTP download without replacing the last run",async()=>{
 const last={slot:"last",appVersion:"0.60.31",debugPayload:{marker:"keep last"}},db=memoryDb(new Map([["last",last]]));
 const selected={appVersion:"0.61.3",createdAt:"2026-10-02T00:00:00.000Z",stamp:"retained",exportMode:"both",debugPayload:{marker:"selected recovered run"},worlds:[{world:{lore:"世界🌏".repeat(30000)}}]};
 const archive=await archiveAutotestExportSnapshot(selected,{indexedDBImpl:db.indexedDB});
 assert.equal(archive.archived,true);assert.deepEqual(db.rows.get("last"),last);
 const artifact=buildAutotestExportArtifacts(selected).world,payload=await buildAutotestDownloadPayload(artifact);
 const lease=createAutotestDownloadLease(payload,{navigatorImpl:{serviceWorker:{controller:{}}},locationImpl:{href:"https://elyndra.test/Elyndra/"},snapshotSlot:archive.slot});
 assert.equal(new URL(lease.url).searchParams.get("slot"),archive.slot);
 const response=await worker(db.indexedDB)(lease.url);
 assert.equal(response.status,200);assert.equal(response.headers.get("Content-Type"),"application/octet-stream");
 assert.match(response.headers.get("Content-Disposition"),/attachment;/);
 assert.equal(response.headers.get("Content-Length"),String(payload.bytes));
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(artifact.body,"utf8"));
});

test("explicit slot never serves another run when last contains the same filename",async()=>{
 const filename="retained.json",row=body=>({downloadArtifacts:{[filename]:{filename,mime:"application/json",body,bytes:Buffer.byteLength(body)}}});
 const db=memoryDb(new Map([["last",row('{"run":"wrong"}')],["run:selected",row('{"run":"selected"}')]])),fetchWorker=worker(db.indexedDB);
 const request=slot=>`https://elyndra.test/__elyndra_autotest_download__?filename=${filename}&slot=${encodeURIComponent(slot)}`;
 assert.equal(await (await fetchWorker(request("run:selected"))).text(),'{"run":"selected"}');
 const missing=await fetchWorker(request("run:missing"));assert.equal(missing.status,404);assert.equal(await missing.text(),"AUTOTEST_DOWNLOAD_SNAPSHOT_MISSING");
 assert.equal(await (await fetchWorker(`https://elyndra.test/__elyndra_autotest_download__?filename=${filename}`)).text(),'{"run":"wrong"}',"legacy no-slot links retain their last-run contract");
});

test("unpersistable recovery uses exact Blob bytes even under an active Service Worker",async()=>{
 const payload=await buildAutotestDownloadPayload({filename:"fallback.json",body:'{"text":"取回🌏"}',mime:"application/json"});let blob;
 const lease=createAutotestDownloadLease(payload,{navigatorImpl:{serviceWorker:{controller:{}}},locationImpl:{href:"https://elyndra.test/"},preferHttp:false,URLImpl:{createObjectURL(value){blob=value;return "blob:recovered";},revokeObjectURL(){}}});
 assert.equal(lease.method,"blob-url");assert.deepEqual(Buffer.from(await blob.arrayBuffer()),Buffer.from(payload.body,"utf8"));
 const source=readFileSync(new URL("../src/autotest-download.js",import.meta.url),"utf8"),start=source.indexOf("function installTrustedRetryUpgrade"),end=source.indexOf('if(typeof window',start);
 let click;const anchor={href:lease.url,dataset:{elyndraHttpUnavailable:"true"},getAttribute(){return payload.filename;}};
 vm.runInNewContext(source.slice(start,end)+";installTrustedRetryUpgrade(doc,nav,loc)",{doc:{addEventListener(type,handler){click=handler;}},nav:{serviceWorker:{controller:{}}},loc:{href:"https://elyndra.test/"},autotestDownloadHttpUrl(){throw new Error("WRONG_HTTP_UPGRADE");}});
 click({target:{closest:()=>anchor}});assert.equal(anchor.href,lease.url);
});

test("bridge waits for the updated worker rather than accepting an older controller",async()=>{
 let change;const sw={controller:{scriptURL:"https://elyndra.test/autotest-export-sw.js?v=57025"},ready:Promise.resolve(),
  async register(){setTimeout(()=>{sw.controller={scriptURL:"https://elyndra.test/autotest-export-sw.js?v=61006"};change?.();},5);return {scope:"https://elyndra.test/"};},
  addEventListener(type,fn){change=fn;},removeEventListener(){}
 };
 const result=await ensureAutotestDownloadBridge({navigatorImpl:{serviceWorker:sw},scriptUrl:"https://elyndra.test/autotest-export-sw.js?v=61006",timeoutMs:200});
 assert.equal(result.controlled,true);assert.equal(result.status,"ready");assert.match(sw.controller.scriptURL,/61006$/);
});

test("actual app download entry binds the selected snapshot slot and falls back if archival fails",async()=>{
 const app=readFileSync(new URL("../app.js",import.meta.url),"utf8"),start=app.indexOf("async function openDeveloperAutotestDownload(kind)"),end=app.indexOf("function developerAutotestTransferLabel",start),entry=app.slice(start,end);
 for(const persisted of [true,false]){
  const selected={appVersion:"0.61.3",createdAt:"2026-10-02T00:00:00.000Z",stamp:"selected",debugPayload:{marker:"GUI recovered"},worlds:[]},context={
   developerAutotest:{exportSnapshot:selected},developerAutotestDownload:{},developerAutotestArtifact:()=>buildAutotestExportArtifacts(selected).debug,
   releaseDeveloperAutotestDownloadLease(){},buildAutotestDownloadPayload,
   archiveAutotestExportSnapshot:async value=>{assert.equal(value,selected);if(!persisted)throw new Error("QUOTA");return {archived:true,slot:"run:selected"};},
   ensureAutotestDownloadBridge:async()=>({controlled:true,status:"ready"}),
   createAutotestDownloadLease:(payload,options)=>{assert.equal(options.preferHttp,persisted);assert.equal(options.snapshotSlot,persisted?"run:selected":"");return {method:persisted?"service-worker-http":"blob-url"};},
   recordDebug(){},openModal(){},developerAutotestDownloadHtml(){return "";},bindDeveloperAutotestDownload(){},appendDeveloperAutotestLog(error){throw new Error(error);},openDeveloperAutotestPanel(){}
  };
  await vm.runInNewContext(entry+';openDeveloperAutotestDownload("debug")',context);
  assert.equal(context.developerAutotestDownload.lease.method,persisted?"service-worker-http":"blob-url");
  assert.equal(context.developerAutotestDownload.payload.body,buildAutotestExportArtifacts(selected).debug.body);
 }
});
