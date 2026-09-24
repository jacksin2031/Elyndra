import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {copyAutotestText} from "../src/autotest-copy.js";

test("v0.57.5 copies AutoTest JSON through Clipboard API",async()=>{let copied="";const out=await copyAutotestText('{"debug":true}',{clipboard:{writeText:async value=>{copied=value}},documentRef:null});assert.equal(out.status,"copied");assert.equal(out.method,"clipboard");assert.equal(copied,'{"debug":true}')});

test("v0.57.5 falls back to selection copy when Clipboard API is rejected",async()=>{let area=null,exec=0;const body={appendChild(node){area=node}},documentRef={body,createElement(){return {style:{},setAttribute(){},focus(){},select(){},setSelectionRange(){},remove(){this.removed=true}}},execCommand(command){exec++;return command==="copy"}};const out=await copyAutotestText('{"world":true}',{clipboard:{writeText:async()=>{throw new Error("clipboard denied")}},documentRef});assert.equal(out.status,"copied");assert.equal(out.method,"selection-fallback");assert.equal(exec,1);assert.equal(area.value,'{"world":true}');assert.equal(area.removed,true)});

test("v0.57.5 persisted AutoTest export panel exposes direct copy buttons for Debug and World JSON",async()=>{const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.match(app,/id="autotestCopyDebug"/);assert.match(app,/id="autotestCopyWorld"/);assert.match(app,/copyDeveloperAutotestArtifact\("debug"\)/);assert.match(app,/copyDeveloperAutotestArtifact\("world"\)/);assert.match(app,/AUTOTEST_EXPORT_COPY_COMPLETED/)});
