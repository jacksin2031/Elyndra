import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
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

test("v0.57.3 never background-downloads the completed batch and keeps Blob leases long enough for browser handoff",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),start=app.indexOf("async function exportDeveloperAutotestResults"),end=app.indexOf("function downloadDeveloperAutotestArtifact",start),producer=app.slice(start,end);
 assert.ok(start>=0&&end>start);assert.doesNotMatch(producer,/autotestDownload\(/);assert.match(producer,/saveLastAutotestExportSnapshot/);assert.match(app,/setTimeout\(cleanup,120000\)/);assert.doesNotMatch(app,/revokeObjectURL\(url\),800/);assert.match(app,/id="autotestRetryDebug"/);assert.match(app,/id="autotestRetryWorld"/);assert.match(app,/id="autotestRetryRecovery"/)
});
