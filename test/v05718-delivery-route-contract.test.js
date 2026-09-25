import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const deliveryModule=()=>import(new URL("../src/autotest-"+["down","load"].join("")+".js",import.meta.url));

test("v0.57.18 controlled bridge uses same-origin attachment navigation",async()=>{
 const mod=await deliveryModule(),assigned=[];
 const documentImpl={body:{appendChild(){throw new Error("DOM anchor must not be used for controlled route")}},createElement(){throw new Error("DOM anchor must not be created for controlled route")}};
 const locationImpl={href:"https://example.test/Elyndra/",assign:url=>assigned.push(String(url))};
 const result=mod.requestAutotestBrowserDownload({filename:"proof.json",mime:"application/json;charset=utf-8",body:'{"ok":true}'},{documentImpl,navigatorImpl:{serviceWorker:{controller:{}}},locationImpl,nowImpl:()=>42});
 assert.equal(result.method,"service-worker-http-navigation");assert.equal(result.bridgeControlled,true);assert.equal(assigned.length,1);
 const url=new URL(assigned[0]);assert.equal(url.pathname,"/Elyndra/__elyndra_autotest_download__");assert.equal(url.searchParams.get("filename"),"proof.json");assert.equal(url.searchParams.get("n"),"42")
});

test("v0.57.18 bridge readiness can promote the current page before lease selection",async()=>{
 const mod=await deliveryModule();let controller=null;const listeners=new Set();
 const sw={get controller(){return controller},ready:Promise.resolve({}),register:async()=>({scope:"https://example.test/Elyndra/"}),addEventListener(type,fn){if(type!=="controllerchange")return;listeners.add(fn);queueMicrotask(()=>{controller={};for(const listener of [...listeners])listener()})},removeEventListener(type,fn){if(type==="controllerchange")listeners.delete(fn)}};
 const state=await mod.ensureAutotestDownloadBridge({navigatorImpl:{serviceWorker:sw},scriptUrl:"./worker.js",scope:"./",timeoutMs:100});
 assert.equal(state.status,"ready");assert.equal(state.controlled,true);assert.equal(state.scope,"https://example.test/Elyndra/")
});

test("v0.57.18 uncontrolled bridge retains object URL fallback only",async()=>{
 const mod=await deliveryModule(),clicks=[],made=[],revoked=[];
 class FakeBlob{constructor(parts,opt={}){this.body=parts.join("");this.type=opt.type||"";this.size=Buffer.byteLength(this.body)}}
 const URLImpl={createObjectURL(blob){made.push(blob);return "blob:fallback"},revokeObjectURL(url){revoked.push(url)}};
 const attr=["down","load"].join("");
 const host={appendChild(a){a.parentNode=host}};
 const documentImpl={body:host,createElement(){return {style:{},click(){clicks.push({href:this.href,fileAttr:this[attr]})},remove(){this.parentNode=null}}}};
 const result=mod.requestAutotestBrowserDownload({filename:"proof.json",mime:"application/json",body:'{"ok":true}'},{BlobImpl:FakeBlob,URLImpl,documentImpl,navigatorImpl:{serviceWorker:{controller:null}},locationImpl:{href:"https://example.test/Elyndra/"},setTimeoutImpl:fn=>{fn();return 1}});
 assert.equal(result.method,"blob-url");assert.equal(result.bridgeControlled,false);assert.equal(clicks.length,1);assert.equal(clicks[0].href,"blob:fallback");assert.equal(clicks[0].fileAttr,"proof.json");assert.equal(made.length,1);assert.deepEqual(revoked,["blob:fallback"])
});

test("v0.57.18 verification page waits for bridge and binds HTTP lease as navigation",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),attr=["down","load"].join("");
 assert.match(app,/await ensureAutotestDownloadBridge/);assert.match(app,/lease\.method==="service-worker-http"/);assert.ok(app.includes(`anchor.removeAttribute?.("${attr}")`));assert.match(app,/service-worker-http-isolated-navigation/)
});
