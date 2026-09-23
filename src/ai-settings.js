import {recordAIUsage,recordDebug} from "./debug-telemetry.js?v=54017";
const KEY="elyndra:ai-settings:v3";const V2_KEY="elyndra:ai-settings:v2";const OLD_KEY="elyndra:ai-settings:v1";
export const PROVIDERS={
 openai:{label:"OpenAI",endpoint:"https://api.openai.com/v1/chat/completions",model:"gpt-5.6-luna",mode:"OpenAI"},
 gemini:{label:"Gemini",endpoint:"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",model:"gemini-3.8-flash",mode:"Gemini"},
 agnes:{label:"Agnes",endpoint:"https://apihub.agnes-ai.com/v1/chat/completions",model:"agnes-3.0-flash",mode:"Agnes 3.0 Flash"}
};
const profile=provider=>({endpoint:PROVIDERS[provider].endpoint,model:PROVIDERS[provider].model,apiKey:"",optimization:"standard"});
const base=()=>({mode:"direct",provider:"openai",profiles:Object.fromEntries(Object.keys(PROVIDERS).map(p=>[p,profile(p)]))});
function normalizeProfile(provider,saved={}){
 const preset=profile(provider),endpoint=String(saved.endpoint||"").trim(),model=String(saved.model||"").trim();
 return {endpoint:endpoint||preset.endpoint,model:preset.model,apiKey:String(saved.apiKey||"").trim(),optimization:["adaptive","fast"].includes(saved.optimization)?"adaptive":"standard"}
}
function migrate(saved){const out=base();if(!saved)return out;if(saved.profiles){out.provider=PROVIDERS[saved.provider]?saved.provider:"openai";for(const p of Object.keys(PROVIDERS))out.profiles[p]=normalizeProfile(p,saved.profiles[p]||{});return out}const p=PROVIDERS[saved.provider]?saved.provider:"openai";out.provider=p;out.profiles[p]=normalizeProfile(p,saved);return out}
function read(){try{return migrate(JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(V2_KEY)||localStorage.getItem(OLD_KEY)||"null"))}catch{return base()}}
export function loadAISettings(provider){const all=read(),p=PROVIDERS[provider]?provider:all.provider;return {mode:"direct",provider:p,...all.profiles[p]}}
export function saveAISettings(v){const all=read(),p=PROVIDERS[v.provider]?v.provider:"openai",previous=all.profiles[p]||profile(p),nextKey=String(v.apiKey||"").trim();all.provider=p;all.profiles[p]={endpoint:String(v.endpoint||PROVIDERS[p].endpoint||"").trim(),model:PROVIDERS[p].model,apiKey:nextKey||previous.apiKey||"",optimization:v.optimization==="adaptive"?"adaptive":"standard"};localStorage.setItem(KEY,JSON.stringify(all));localStorage.removeItem(V2_KEY);localStorage.removeItem(OLD_KEY);return loadAISettings(p)}
export function selectAIProvider(provider){const all=read(),p=PROVIDERS[provider]?provider:"openai";all.provider=p;localStorage.setItem(KEY,JSON.stringify(all));return loadAISettings(p)}
export function clearAISettings(provider){if(!provider){localStorage.removeItem(KEY);localStorage.removeItem(V2_KEY);localStorage.removeItem(OLD_KEY);return}const all=read(),p=PROVIDERS[provider]?provider:all.provider;all.profiles[p]=profile(p);localStorage.setItem(KEY,JSON.stringify(all))}
export function hasDirectAI(){const s=loadAISettings();return Boolean(s.endpoint&&s.model&&s.apiKey)}
const AI_TASK_TIER={
 action:"FAST",narration:"FAST",helper:"FAST",npc:"FAST",scene:"FAST",turn_state_fast:"FAST",identity:"FAST",geography:"FAST",society:"FAST",cast:"FAST",
 core_anchor:"BALANCED",turn_state:"BALANCED",turn_deferred:"BALANCED",runtime_expansion:"BALANCED",turn_state_deep:"IMPORTANT",
 core_rules:"IMPORTANT",history:"IMPORTANT",future:"BALANCED",
 quality:"CRITICAL",quality_repair:"CRITICAL",recovery:"CRITICAL",runtime_quality:"CRITICAL",runtime_repair:"CRITICAL"
};
export function optimizationTier(aiTask="general"){
 return AI_TASK_TIER[String(aiTask||"").toLowerCase()]||"BALANCED"
}
const AGNES_STRUCTURED_OUTPUT_FLOORS={action:800,scene:1100,turn_state_fast:800,identity:900,geography:900,society:1100,cast:1800,core_anchor:1200,core_rules:1100,future:3000,runtime_expansion:1600,runtime_quality:900};
const AI_TASK_TIMEOUT_FLOORS={future:70000};
const agnesStructuredOutputFloor=aiTask=>AGNES_STRUCTURED_OUTPUT_FLOORS[String(aiTask||"").toLowerCase()]||0;
const taskTimeoutFloor=aiTask=>AI_TASK_TIMEOUT_FLOORS[String(aiTask||"").toLowerCase()]||0;
export function providerOptimization(provider,optimization="standard",aiTask="general"){
 const tier=optimizationTier(aiTask);
 if(provider==="agnes"&&agnesStructuredOutputFloor(aiTask))return {};
 if(tier==="FAST"){
  if(provider==="gemini")return {thinkingConfig:{thinkingLevel:"LOW"}};
  if(provider==="openai"||provider==="agnes")return {reasoning_effort:"low"};
  return {}
 }
 if(optimization!=="adaptive")return {};
 const level=tier==="BALANCED"?"medium":"high";
 if(provider==="gemini")return {thinkingConfig:{thinkingLevel:level.toUpperCase()}};
 if(provider==="openai"||provider==="agnes")return {reasoning_effort:level};
 return {}
}
export function providerTokenBudget(provider,optimization="standard",aiTask="general",requested=0){
 const base=Math.round(Number(requested)||0);if(!base)return 0;
 const bounded=Math.max(256,Math.min(8192,base)),tier=optimizationTier(aiTask),agnesFloor=provider==="agnes"?agnesStructuredOutputFloor(aiTask):0;
 if(agnesFloor)return Math.max(agnesFloor,bounded);
 if(tier==="FAST"||optimization!=="adaptive"||provider==="gemini")return bounded;
 const mult={BALANCED:3.5,IMPORTANT:4.5,CRITICAL:5.5}[tier]||3.5,floor={BALANCED:2200,IMPORTANT:3600,CRITICAL:4800}[tier]||2200;
 return Math.max(256,Math.min(8192,Math.max(floor,Math.round(bounded*mult))))
}
function openAIText(d){
 const value=d?.choices?.[0]?.message?.content;
 if(typeof value==="string")return value;
 if(Array.isArray(value))return value.map(x=>typeof x==="string"?x:(x?.text||x?.content||"")).join("");
 return typeof d?.output_text==="string"?d.output_text:""
}
function emptyResponseError(provider,d){
 const finish=d?.choices?.[0]?.finish_reason||d?.candidates?.[0]?.finishReason||"unknown";
 const e=new Error(`EMPTY_AI_RESPONSE: ${provider} finish_reason=${finish}`);e.code="EMPTY_AI_RESPONSE";return e
}
async function apiError(r){let detail="";try{const d=await r.json();detail=d?.error?.message||d?.message||JSON.stringify(d)}catch{try{detail=await r.text()}catch{}}throw new Error(`AI_HTTP_${r.status}${detail?": "+String(detail).slice(0,300):""}`)}
async function openAICompatible(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},allowOptimization=true){const started=Date.now(),model=PROVIDERS[s.provider]?.model||s.model,limit=providerTokenBudget(s.provider,s.optimization,aiTask,maxOutputTokens),tokenLimit=limit?(s.provider==="openai"?{max_completion_tokens:limit}:{max_tokens:limit}):{},sampling=s.provider==="agnes"&&Number.isFinite(Number(temperature))?{temperature:Number(temperature)}:{},optimization=allowOptimization&&!disableOptimization?providerOptimization(s.provider,s.optimization,aiTask):{};const r=await fetch(s.endpoint,{method:"POST",signal,headers:{"Content-Type":"application/json","Authorization":`Bearer ${s.apiKey}`},body:JSON.stringify({model,...tokenLimit,...sampling,...optimization,messages:[{role:"system",content:system},{role:"user",content:user}]})});if(!r.ok){recordDebug("AI_HTTP_ERROR",{provider:s.provider,model,task:aiTask,tier:optimizationTier(aiTask),status:r.status,latencyMs:Date.now()-started});if(allowOptimization&&!disableOptimization&&s.optimization==="adaptive"&&r.status===400)return openAICompatible(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},false);return apiError(r)}const d=await r.json(),text=openAIText(d);recordAIUsage({provider:s.provider,model,task:aiTask,tier:optimizationTier(aiTask),status:String(text).trim()?"SUCCESS":"EMPTY",latencyMs:Date.now()-started,response:d,inputText:String(system||"")+"\n"+String(user||""),outputText:text,attempt:allowOptimization&&!disableOptimization?1:2});if(String(text).trim())return text;if(allowOptimization&&!disableOptimization&&s.optimization==="adaptive")return openAICompatible(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},false);throw emptyResponseError(s.provider,d)}
async function gemini(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},allowOptimization=true){const started=Date.now(),model=PROVIDERS.gemini.model,endpoint=s.endpoint.replace("{model}",encodeURIComponent(model)),limit=providerTokenBudget("gemini",s.optimization,aiTask,maxOutputTokens),native=allowOptimization&&!disableOptimization?providerOptimization("gemini",s.optimization,aiTask):{},generationConfig={...(Number.isFinite(Number(temperature))?{temperature:Number(temperature)}:{}),...(limit?{maxOutputTokens:limit}:{}),...native};const r=await fetch(endpoint,{method:"POST",signal,headers:{"Content-Type":"application/json","x-goog-api-key":s.apiKey},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:user}]}],generationConfig})});if(!r.ok){recordDebug("AI_HTTP_ERROR",{provider:"gemini",model,task:aiTask,tier:optimizationTier(aiTask),status:r.status,latencyMs:Date.now()-started});if(allowOptimization&&!disableOptimization&&s.optimization==="adaptive"&&r.status===400)return gemini(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},false);return apiError(r)}const d=await r.json(),text=d.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";recordAIUsage({provider:"gemini",model,task:aiTask,tier:optimizationTier(aiTask),status:String(text).trim()?"SUCCESS":"EMPTY",latencyMs:Date.now()-started,response:d,inputText:String(system||"")+"\n"+String(user||""),outputText:text,attempt:allowOptimization&&!disableOptimization?1:2});if(String(text).trim())return text;if(allowOptimization&&!disableOptimization&&s.optimization==="adaptive")return gemini(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},false);throw emptyResponseError("gemini",d)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const timeoutValue=v=>Math.max(5000,Math.min(120000,Math.round(Number(v)||30000)));
const providerTimeoutError=ms=>Object.assign(new Error(`AI_TIMEOUT: Provider 在 ${Math.round(ms/1000)} 秒內未完成回應`),{code:"AI_TIMEOUT"});
const providerAbortError=()=>Object.assign(new Error("AI_ABORTED: request cancelled by higher-priority gameplay"),{code:"AI_ABORTED"});
const RUNTIME_CONTROL_KEY="__ELYNDRA_DIRECT_AI_RUNTIME_CONTROL__";
function directAIRuntimeControl(){
 const current=globalThis[RUNTIME_CONTROL_KEY];
 if(current&&typeof current==="object")return current;
 const initial={disableTimeout:false,signal:null,pauseWhenHidden:false};globalThis[RUNTIME_CONTROL_KEY]=initial;return initial
}
export function setDirectAIRuntimeControl(control={}){
 const next={disableTimeout:control?.disableTimeout===true,signal:control?.signal||null,pauseWhenHidden:control?.pauseWhenHidden!==false};globalThis[RUNTIME_CONTROL_KEY]=next;return {...next}
}
export function clearDirectAIRuntimeControl(){globalThis[RUNTIME_CONTROL_KEY]={disableTimeout:false,signal:null,pauseWhenHidden:false}}
function runtimeHidden(){const runtime=directAIRuntimeControl();return runtime.pauseWhenHidden===true&&typeof document!=="undefined"&&document?.hidden===true}
async function waitForRuntimeForeground(parentSignals=[]){
 if(!runtimeHidden())return;
 await new Promise((resolve,reject)=>{
  const signals=[...new Set((Array.isArray(parentSignals)?parentSignals:[]).filter(Boolean))],cleanups=[];
  const done=()=>{for(const fn of cleanups)fn()};
  const visible=()=>{if(typeof document!=="undefined"&&!document.hidden){done();resolve()}};
  document.addEventListener("visibilitychange",visible);cleanups.push(()=>document.removeEventListener("visibilitychange",visible));
  const abort=()=>{done();reject(providerAbortError())};
  for(const signal of signals){if(signal?.aborted){abort();return}signal?.addEventListener?.("abort",abort,{once:true});cleanups.push(()=>signal?.removeEventListener?.("abort",abort))}
 })
}
function abortProviderWhenHidden(controller){
 const runtime=directAIRuntimeControl();if(runtime.pauseWhenHidden!==true||typeof document==="undefined")return {cleanup:()=>{},wasPaused:()=>false};
 let paused=false;const onVisibility=()=>{if(document.hidden){paused=true;try{controller.abort(Object.assign(new Error("AI_BACKGROUND_PAUSED"),{code:"AI_BACKGROUND_PAUSED"}))}catch{}}};
 document.addEventListener("visibilitychange",onVisibility);
 return {cleanup:()=>document.removeEventListener("visibilitychange",onVisibility),wasPaused:()=>paused}
}
export async function hardProviderDeadline(promise,{controller=null,timeoutMs=30000,parentSignal=null,parentSignals=[]}={}){
 const rawMs=Number(timeoutMs),useTimeout=Number.isFinite(rawMs)&&rawMs>0,ms=useTimeout?Math.max(1,Math.round(rawMs)):0;
 let timer=0;const listeners=[],races=[Promise.resolve(promise)];
 if(useTimeout)races.push(new Promise((_,reject)=>{timer=setTimeout(()=>{const err=providerTimeoutError(ms);reject(err);try{controller?.abort?.(err)}catch{}},ms)}));
 const signals=[parentSignal,...(Array.isArray(parentSignals)?parentSignals:[])].filter(Boolean),unique=[...new Set(signals)];
 if(unique.length)races.push(new Promise((_,reject)=>{
  const abortWith=signal=>{const err=providerAbortError();reject(err);try{controller?.abort?.(signal?.reason||err)}catch{}};
  for(const signal of unique){
   if(signal?.aborted){abortWith(signal);break}
   const fn=()=>abortWith(signal);signal?.addEventListener?.("abort",fn,{once:true});listeners.push([signal,fn])
  }
 }));
 try{return await Promise.race(races)}
 finally{if(timer)clearTimeout(timer);for(const [signal,fn] of listeners)signal?.removeEventListener?.("abort",fn)}
}
export async function directChat(args){
 const s=loadAISettings();if(!s.endpoint||!s.model||!s.apiKey)throw new Error("DIRECT_AI_NOT_CONFIGURED");
 const runtime=directAIRuntimeControl(),timeoutDisabled=args?.disableTimeout===true||runtime.disableTimeout===true,timeoutMs=timeoutDisabled?0:Math.max(timeoutValue(args?.timeoutMs),taskTimeoutFloor(args?.aiTask)),parentSignals=[args?.signal,runtime.signal].filter(Boolean);let last,attempt=0;
 while(attempt<2){
  if(parentSignals.some(signal=>signal?.aborted))throw providerAbortError();
  if(runtimeHidden()){recordDebug("AI_BACKGROUND_PAUSED",{provider:s.provider,model:PROVIDERS[s.provider]?.model||s.model,task:args?.aiTask||"general",phase:"BEFORE_REQUEST"});await waitForRuntimeForeground(parentSignals)}
  const ctrl=new AbortController(),visibility=abortProviderWhenHidden(ctrl);
  try{
   const call=s.provider==="gemini"?gemini:openAICompatible,pending=Promise.resolve().then(()=>call(s,{...args,signal:ctrl.signal}));
   const result=await hardProviderDeadline(pending,{controller:ctrl,timeoutMs,parentSignals});visibility.cleanup();return result
  }catch(e){
   const backgroundPaused=visibility.wasPaused()&&!parentSignals.some(signal=>signal?.aborted);visibility.cleanup();
   if(backgroundPaused){recordDebug("AI_BACKGROUND_PAUSED",{provider:s.provider,model:PROVIDERS[s.provider]?.model||s.model,task:args?.aiTask||"general",phase:"IN_FLIGHT"});await waitForRuntimeForeground(parentSignals);continue}
   const parentAborted=parentSignals.some(signal=>signal?.aborted)||e?.code==="AI_ABORTED",err=parentAborted?providerAbortError():e;last=err;
   recordDebug("AI_CALL_FAILED",{provider:s.provider,model:PROVIDERS[s.provider]?.model||s.model,task:args?.aiTask||"general",tier:optimizationTier(args?.aiTask),attempt:attempt+1,timeoutMs:timeoutDisabled?null:timeoutMs,timeoutDisabled,error:err.message,aborted:parentAborted});
   if(!parentAborted&&attempt===0&&(/AI_HTTP_(429|5\d\d)/.test(err.message)||((args?.retryOnTimeout!==false)&&(err.code==="AI_TIMEOUT"||err.name==="AbortError"||err.name==="TimeoutError")))){attempt++;await sleep(700);continue}
   throw err
  }
 }
 throw last
}
export async function testDirectAI(){const text=await directChat({aiTask:"action",system:"Connection test. Reply with exactly ELYNDRA_OK",user:"ELYNDRA connection test"});if(!String(text).trim())throw new Error("EMPTY_AI_RESPONSE");return true}
