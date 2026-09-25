import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto,createHash} from "node:crypto";
import {buildAutotestExportArtifacts} from "../src/autotest-export.js";
import {shareAutotestArtifact} from "../src/autotest-save.js";

class FakeFile extends Blob{
 constructor(parts,name,options={}){super(parts,options);this.name=String(name);this.lastModified=Number(options.lastModified)||0}
}

const encoder=new TextEncoder();
const sha256=text=>createHash("sha256").update(encoder.encode(text)).digest("hex");

test("v0.57.23 retained v0.57.17 raw Debug/world artifacts win over regenerated JSON byte-for-byte",()=>{
 const debugName="Elyndra-autotest-debug-v0.57.17-2026-09-25T16-31-51-390Z.json";
 const worldName="Elyndra-autotest-worlds-v0.57.17-2026-09-25T16-31-51-390Z.json";
 const debugBody='{\r\n  "summary" : { "turns" : 120 },\r\n  "marker" : "ORIGINAL-v05717"\r\n}\r\n';
 const worldBody='{ "schema" : "elyndra-autotest-worlds-v1",\r\n  "worlds" : [ { "world" : {"id":"W1"} } ]\r\n}\r\n';
 const snapshot={
  appVersion:"0.57.17",createdAt:"2026-09-25T16:31:51.390Z",stamp:"2026-09-25T16-31-51-390Z",exportMode:"both",
  debugPayload:{summary:{turns:999},marker:"REGENERATED-WOULD-DIFFER"},
  worlds:[{world:{id:"DIFFERENT"}},{world:{id:"DIFFERENT-2"}}],
  downloadArtifacts:{
   [debugName]:{kind:"debug",filename:debugName,mime:"application/json;charset=utf-8",body:debugBody,bytes:encoder.encode(debugBody).byteLength},
   [worldName]:{kind:"world",filename:worldName,mime:"application/json;charset=utf-8",body:worldBody,bytes:encoder.encode(worldBody).byteLength}
  }
 };
 const artifacts=buildAutotestExportArtifacts(snapshot);
 assert.equal(artifacts.debug.filename,debugName);
 assert.equal(artifacts.debug.body,debugBody);
 assert.equal(artifacts.world.filename,worldName);
 assert.equal(artifacts.world.body,worldBody);
 assert.equal(encoder.encode(artifacts.debug.body).byteLength,encoder.encode(debugBody).byteLength);
 assert.equal(encoder.encode(artifacts.world.body).byteLength,encoder.encode(worldBody).byteLength);
 assert.equal(sha256(artifacts.debug.body),sha256(debugBody));
 assert.equal(sha256(artifacts.world.body),sha256(worldBody));
 assert.doesNotMatch(artifacts.debug.body,/REGENERATED-WOULD-DIFFER/);
 assert.doesNotMatch(artifacts.world.body,/DIFFERENT/)
});

test("v0.57.23 native Web Share receives the retained artifact raw body and exact original SHA",async()=>{
 const filename="Elyndra-autotest-debug-v0.57.17-2026-09-25T16-31-51-390Z.json";
 const body='{\r\n "raw" : true, "spacing" : "must stay"\r\n}\r\n';
 const snapshot={appVersion:"0.57.17",createdAt:"2026-09-25T16:31:51.390Z",stamp:"2026-09-25T16-31-51-390Z",exportMode:"debug",debugPayload:{raw:false},worlds:[],downloadArtifacts:{[filename]:{kind:"debug",filename,mime:"application/json;charset=utf-8",body,bytes:encoder.encode(body).byteLength}}};
 const artifact=buildAutotestExportArtifacts(snapshot).debug;
 let sharedFile=null;
 const navigatorImpl={canShare:payload=>payload?.files?.[0]?.name===filename,share:payload=>{sharedFile=payload.files[0];return Promise.resolve()}};
 const result=await shareAutotestArtifact(artifact,{navigatorImpl,FileImpl:FakeFile,cryptoImpl:webcrypto,nowImpl:()=>1});
 assert.equal(result.status,"shared");
 assert.equal(result.filename,filename);
 assert.equal(result.bytes,encoder.encode(body).byteLength);
 assert.equal(result.sha256,sha256(body));
 assert.equal(sharedFile.name,filename);
 assert.equal(await sharedFile.text(),body)
});

test("v0.57.23 still reconstructs an artifact when an older snapshot has no persisted raw artifact",()=>{
 const snapshot={appVersion:"0.57.17",createdAt:"2026-09-25T16:31:51.390Z",stamp:"2026-09-25T16-31-51-390Z",exportMode:"debug",debugPayload:{summary:{turns:120}},worlds:[]};
 const debug=buildAutotestExportArtifacts(snapshot).debug;
 assert.equal(debug.filename,"Elyndra-autotest-debug-v0.57.17-2026-09-25T16-31-51-390Z.json");
 assert.equal(JSON.parse(debug.body).summary.turns,120)
});
