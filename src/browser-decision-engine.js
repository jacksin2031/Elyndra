import {recordDebug} from "./debug-telemetry.js?v=61007";
import {BROWSER_DECISION,BROWSER_DECISION_ENGINE,BROWSER_DECISION_MODE,createBrowserDecisionRequest,normalizeBrowserDecisionResult,browserDecisionPolicy} from "./browser-decision-contract.js?v=61007";
export const BROWSER_DECISION_DEFAULTS=Object.freeze({mode:BROWSER_DECISION_MODE.SHADOW_ONLY,timeoutMs:1500,acceptThreshold:.9,uncertainThreshold:.65});
const randomId=()=>globalThis.crypto?.randomUUID?.()||"rpc-"+Math.random().toString(36).slice(2)+Date.now().toString(36);
export function detectBrowserDecisionCapabilities(env=globalThis){
 const navigator=env?.navigator||{},secureContext=env?.isSecureContext!==false;
 return {
  secureContext,
  webgpu:Boolean(secureContext&&navigator?.gpu),
  worker:typeof env?.Worker==="function",
  wasm:typeof env?.WebAssembly==="object"||typeof env?.WebAssembly==="function",
  hardwareConcurrency:Math.max(0,Number(navigator?.hardwareConcurrency)||0),
  deviceMemory:Number.isFinite(Number(navigator?.deviceMemory))?Number(navigator.deviceMemory):null
 };
}
function defaultWorkerFactory(env){
 if(typeof env?.Worker!=="function")return null;
 return ()=>new env.Worker(new URL("./browser-decision-worker.js?v=61007",import.meta.url),{type:"module",name:"elyndra-browser-decision"});
}
function workerRpc(worker,type,payload,timeoutMs){
 return new Promise((resolve,reject)=>{
  const id=randomId();
  const timer=setTimeout(()=>{cleanup();reject(new Error("BROWSER_DECISION_TIMEOUT"))},Math.max(100,Number(timeoutMs)||1500));
  const onMessage=event=>{const msg=event?.data||{};if(msg.id!==id)return;cleanup();msg.ok?resolve(msg.data):reject(new Error(msg.error||"BROWSER_DECISION_WORKER_ERROR"))};
  const onError=event=>{cleanup();reject(new Error(event?.message||"BROWSER_DECISION_WORKER_ERROR"))};
  function cleanup(){clearTimeout(timer);worker.removeEventListener?.("message",onMessage);worker.removeEventListener?.("error",onError)}
  worker.addEventListener?.("message",onMessage);worker.addEventListener?.("error",onError);
  worker.postMessage?.({id,type,payload});
 });
}
export class BrowserDecisionEngine{
 constructor({env=globalThis,workerFactory=null,wasmEvaluator=null,serverEvaluator=null,telemetry=recordDebug,config={}}={}){
  this.env=env;this.workerFactory=workerFactory||defaultWorkerFactory(env);this.wasmEvaluator=wasmEvaluator;this.serverEvaluator=serverEvaluator;this.telemetry=typeof telemetry==="function"?telemetry:()=>{};
  this.config={...BROWSER_DECISION_DEFAULTS,...config};this.worker=null;this.workerReady=false;this.workerProbe=null;this.initialized=false;this.capabilities=null;this.initError="";
 }
 async init(){
  if(this.initialized)return this.status();
  this.capabilities=detectBrowserDecisionCapabilities(this.env);
  if(this.capabilities.webgpu&&this.capabilities.worker&&this.workerFactory){
   try{
    this.worker=this.workerFactory();
    const probe=await workerRpc(this.worker,"INIT",{},this.config.timeoutMs);
    this.workerProbe=probe&&typeof probe==="object"?probe:null;
    this.workerReady=Boolean(probe?.ready&&probe?.webgpu&&probe?.computeReady);
   }catch(error){this.initError=String(error?.message||error);try{this.worker?.terminate?.()}catch{}this.worker=null;this.workerReady=false}
  }
  this.initialized=true;
  this.telemetry("BROWSER_DECISION_CAPABILITY",{...this.capabilities,workerReady:this.workerReady,workerProbe:this.workerProbe,mode:this.config.mode,initError:this.initError});
  return this.status();
 }
 status(){return {initialized:this.initialized,workerReady:this.workerReady,workerProbe:this.workerProbe,capabilities:this.capabilities||detectBrowserDecisionCapabilities(this.env),mode:this.config.mode,initError:this.initError}}
 async _runEvaluator(engine,evaluator,request){
  const started=Date.now(),raw=await evaluator(request),result=normalizeBrowserDecisionResult(raw,{engine,fallback:engine!==BROWSER_DECISION_ENGINE.WEBGPU});
  if(!result.latencyMs)result.latencyMs=Math.max(0,Date.now()-started);
  return result;
 }
 async evaluate(input={}){
  if(!this.initialized)await this.init();
  const request=input?.schema?input:createBrowserDecisionRequest(input),attempts=[];
  let result=null;
  if(this.workerReady&&this.worker){
   try{result=normalizeBrowserDecisionResult(await workerRpc(this.worker,"EVALUATE",request,this.config.timeoutMs),{engine:BROWSER_DECISION_ENGINE.WEBGPU});attempts.push({engine:"WEBGPU",status:"SUCCESS"})}
   catch(error){attempts.push({engine:"WEBGPU",status:"ERROR",error:String(error?.message||error)});this.workerReady=false}
  }
  let policy=result?browserDecisionPolicy(result,{task:request.task,...this.config}):{escalate:true};
  if(policy.escalate&&typeof this.wasmEvaluator==="function"){
   try{result=await this._runEvaluator(BROWSER_DECISION_ENGINE.WASM,this.wasmEvaluator,request);attempts.push({engine:"WASM",status:"SUCCESS"});policy=browserDecisionPolicy(result,{task:request.task,...this.config})}
   catch(error){attempts.push({engine:"WASM",status:"ERROR",error:String(error?.message||error)})}
  }
  if((!result||policy.escalate)&&typeof this.serverEvaluator==="function"){
   try{result=await this._runEvaluator(BROWSER_DECISION_ENGINE.SERVER,this.serverEvaluator,request);attempts.push({engine:"SERVER",status:"SUCCESS"});policy=browserDecisionPolicy(result,{task:request.task,...this.config})}
   catch(error){attempts.push({engine:"SERVER",status:"ERROR",error:String(error?.message||error)})}
  }
  if(!result)result=normalizeBrowserDecisionResult({decision:BROWSER_DECISION.UNCERTAIN,confidence:0,reasonCodes:["NO_DECISION_ENGINE_AVAILABLE"],engine:BROWSER_DECISION_ENGINE.NONE,fallback:true});
  policy=browserDecisionPolicy(result,{task:request.task,...this.config});
  this.telemetry("BROWSER_DECISION",{task:request.task,decision:result.decision,confidence:result.confidence,reasonCodes:result.reasonCodes,engine:result.engine,modelVersion:result.modelVersion,latencyMs:result.latencyMs,fallback:result.fallback,policy,attempts});
  return {...result,policy,requestId:request.requestId};
 }
 async dispose(){
  if(this.worker){try{await workerRpc(this.worker,"DISPOSE",{},500)}catch{}try{this.worker.terminate?.()}catch{}}
  this.worker=null;this.workerReady=false;this.workerProbe=null;this.initialized=false;
 }
}
export function createBrowserDecisionEngine(options={}){return new BrowserDecisionEngine(options)}
