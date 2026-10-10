import test from "node:test";
import assert from "node:assert/strict";
import {BROWSER_DECISION,BROWSER_DECISION_ENGINE,BROWSER_DECISION_MODE,BROWSER_DECISION_TASK,createBrowserDecisionRequest,normalizeBrowserDecisionResult,browserDecisionPolicy} from "../src/browser-decision-contract.js";
import {BrowserDecisionEngine,detectBrowserDecisionCapabilities} from "../src/browser-decision-engine.js";

test("browser decision request enforces known task contract",()=>{
 const r=createBrowserDecisionRequest({task:BROWSER_DECISION_TASK.ACTION_LEGALITY,payload:{action:"look"}});
 assert.equal(r.schema,"elyndra-browser-decision-v1");
 assert.equal(r.task,"ACTION_LEGALITY");
 assert.throws(()=>createBrowserDecisionRequest({task:"UNKNOWN"}),/BROWSER_DECISION_UNSUPPORTED_TASK/);
});

test("browser decision result normalizes confidence, engine and reason codes",()=>{
 const r=normalizeBrowserDecisionResult({decision:"accept",confidence:9,engine:"webgpu",reasonCodes:["ok","OK",""]});
 assert.equal(r.decision,BROWSER_DECISION.ACCEPT);
 assert.equal(r.confidence,1);
 assert.equal(r.engine,BROWSER_DECISION_ENGINE.WEBGPU);
 assert.deepEqual(r.reasonCodes,["OK"]);
});

test("shadow mode never enforces even high confidence local decisions",()=>{
 const p=browserDecisionPolicy({decision:"ACCEPT",confidence:.99,engine:"WEBGPU"},{task:BROWSER_DECISION_TASK.ACTION_CLASSIFICATION,mode:BROWSER_DECISION_MODE.SHADOW_ONLY});
 assert.equal(p.enforce,false);
 assert.equal(p.shadow,true);
});

test("capability detection requires secure context for WebGPU",()=>{
 const env={isSecureContext:false,navigator:{gpu:{},hardwareConcurrency:8,deviceMemory:8},Worker:function(){},WebAssembly:{}};
 const c=detectBrowserDecisionCapabilities(env);
 assert.equal(c.webgpu,false);
 assert.equal(c.worker,true);
 assert.equal(c.hardwareConcurrency,8);
});

test("engine fails safe when no local or server evaluator exists",async()=>{
 const events=[],env={isSecureContext:true,navigator:{},WebAssembly:{}};
 const engine=new BrowserDecisionEngine({env,telemetry:(type,data)=>events.push({type,data})});
 const r=await engine.evaluate({task:BROWSER_DECISION_TASK.ACTION_LEGALITY,payload:{action:"test"}});
 assert.equal(r.decision,BROWSER_DECISION.UNCERTAIN);
 assert.equal(r.engine,BROWSER_DECISION_ENGINE.NONE);
 assert.equal(r.policy.enforce,false);
 assert.ok(r.reasonCodes.includes("NO_DECISION_ENGINE_AVAILABLE"));
 assert.ok(events.some(x=>x.type==="BROWSER_DECISION_CAPABILITY"));
 assert.ok(events.some(x=>x.type==="BROWSER_DECISION"));
});

test("engine can use WASM fallback without treating it as WebGPU success",async()=>{
 const engine=new BrowserDecisionEngine({
  env:{isSecureContext:true,navigator:{},WebAssembly:{}},
  telemetry:()=>{},
  wasmEvaluator:async()=>({decision:"ACCEPT",confidence:.94,reasonCodes:["LOCAL_MODEL_ACCEPT"],modelVersion:"test-wasm-v1"})
 });
 const r=await engine.evaluate({task:BROWSER_DECISION_TASK.ACTION_CLASSIFICATION,payload:{action:"查看背包"}});
 assert.equal(r.engine,BROWSER_DECISION_ENGINE.WASM);
 assert.equal(r.fallback,true);
 assert.equal(r.decision,BROWSER_DECISION.ACCEPT);
 assert.equal(r.modelVersion,"test-wasm-v1");
});


class FakeDecisionWorker{
 constructor(){this.listeners={message:new Set(),error:new Set()};this.terminated=false}
 addEventListener(type,fn){this.listeners[type]?.add(fn)}
 removeEventListener(type,fn){this.listeners[type]?.delete(fn)}
 postMessage(msg){
  queueMicrotask(()=>{
   if(this.terminated)return;
   let data;
   if(msg.type==="INIT")data={id:msg.id,ok:true,data:{ready:true,webgpu:true,computeReady:true,modelReady:false,reasonCodes:["MODEL_NOT_LOADED"]},error:""};
   else if(msg.type==="EVALUATE")data={id:msg.id,ok:true,data:{decision:"UNCERTAIN",confidence:0,reasonCodes:["MODEL_NOT_LOADED"],engine:"WEBGPU",modelVersion:"unloaded",metadata:{computeReady:true,modelReady:false}},error:""};
   else data={id:msg.id,ok:true,data:{disposed:true},error:""};
   for(const fn of this.listeners.message)fn({data});
  });
 }
 terminate(){this.terminated=true}
}

test("engine requires successful compute probe before marking WebGPU worker ready",async()=>{
 const events=[];
 const env={isSecureContext:true,navigator:{gpu:{},hardwareConcurrency:8},Worker:FakeDecisionWorker,WebAssembly:{}};
 const engine=new BrowserDecisionEngine({env,workerFactory:()=>new FakeDecisionWorker(),telemetry:(type,data)=>events.push({type,data})});
 const status=await engine.init();
 assert.equal(status.workerReady,true);
 assert.equal(status.workerProbe.computeReady,true);
 const r=await engine.evaluate({task:BROWSER_DECISION_TASK.ACTION_LEGALITY,payload:{action:"test"}});
 assert.equal(r.engine,BROWSER_DECISION_ENGINE.WEBGPU);
 assert.equal(r.decision,BROWSER_DECISION.UNCERTAIN);
 assert.ok(r.reasonCodes.includes("MODEL_NOT_LOADED"));
 assert.equal(r.policy.enforce,false);
 assert.equal(events.find(x=>x.type==="BROWSER_DECISION_CAPABILITY")?.data?.workerProbe?.computeReady,true);
 await engine.dispose();
 assert.equal(engine.status().workerReady,false);
 assert.equal(engine.status().workerProbe,null);
});
