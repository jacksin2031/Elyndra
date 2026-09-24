import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PROVIDERS,loadAISettings,saveAISettings,clearAISettings,directChat,hardProviderDeadline,setDirectAIRuntimeControl,clearDirectAIRuntimeControl,optimizationTier,providerOptimization,providerTokenBudget} from "../src/ai-settings.js";

function memoryStorage(){
 const data=new Map();
 return {
  getItem:key=>data.has(key)?data.get(key):null,
  setItem:(key,value)=>data.set(key,String(value)),
  removeItem:key=>data.delete(key),
  clear:()=>data.clear()
 }
}

test("Agnes mode has a first-class 3.0 Flash preset",()=>{
 assert.equal(PROVIDERS.agnes.label,"Agnes");
 assert.equal(PROVIDERS.agnes.mode,"Agnes 3.0 Flash");
 assert.equal(PROVIDERS.agnes.endpoint,"https://apihub.agnes-ai.com/v1/chat/completions");
 assert.equal(PROVIDERS.agnes.model,"agnes-3.0-flash")
});

test("legacy blank Agnes profile is hydrated from the new preset",()=>{
 const prior=globalThis.localStorage;globalThis.localStorage=memoryStorage();
 try{
  localStorage.setItem("elyndra:ai-settings:v3",JSON.stringify({provider:"agnes",profiles:{agnes:{endpoint:"",model:"",apiKey:"saved-key"}}}));
  const s=loadAISettings("agnes");
  assert.equal(s.endpoint,PROVIDERS.agnes.endpoint);
  assert.equal(s.model,PROVIDERS.agnes.model);
  assert.equal(s.apiKey,"saved-key")
 }finally{globalThis.localStorage=prior}
});

test("Agnes transport uses OpenAI-compatible bearer request with temperature",async()=>{
 const priorStorage=globalThis.localStorage,priorFetch=globalThis.fetch;globalThis.localStorage=memoryStorage();
 let request;
 try{
  clearAISettings();
  saveAISettings({provider:"agnes",apiKey:"test-key",endpoint:"",model:""});
  globalThis.fetch=async(url,init)=>{request={url,init,body:JSON.parse(init.body)};return {ok:true,json:async()=>({choices:[{message:{content:"ELYNDRA_OK"}}]})}};
  const text=await directChat({system:"system",user:"user",temperature:.23,maxOutputTokens:777,timeoutMs:5000,retryOnTimeout:false});
  assert.equal(text,"ELYNDRA_OK");
  assert.equal(request.url,PROVIDERS.agnes.endpoint);
  assert.equal(request.init.headers.Authorization,"Bearer test-key");
  assert.equal(request.body.model,"agnes-3.0-flash");
  assert.equal(request.body.max_tokens,777);
  assert.equal(request.body.temperature,.23)
 }finally{globalThis.localStorage=priorStorage;globalThis.fetch=priorFetch}
});

test("AI settings UI exposes Agnes as a selectable mode",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/<option value="agnes">Agnes 3\.0 Flash<\/option>/);
 assert.match(app,/Agnes 3\.0 Flash/);
 assert.match(app,/Elyndra 自適應優化/);
 assert.match(app,/目前模型/);
 assert.doesNotMatch(app,/id="aiModel"/);
 assert.match(app,/ai-settings\.js\?v=57005/)
});


test("provider models are fixed presets even when legacy or save input tries to override them",()=>{
 const prior=globalThis.localStorage;globalThis.localStorage=memoryStorage();
 try{
  localStorage.setItem("elyndra:ai-settings:v3",JSON.stringify({provider:"openai",profiles:{openai:{endpoint:"https://example.invalid/v1/chat/completions",model:"wrong-model",apiKey:"k",optimization:"adaptive"}}}));
  let s=loadAISettings("openai");
  assert.equal(s.model,PROVIDERS.openai.model);
  assert.equal(s.optimization,"adaptive");
  s=saveAISettings({provider:"gemini",endpoint:PROVIDERS.gemini.endpoint,model:"user-typed-model",apiKey:"g",optimization:"adaptive"});
  assert.equal(s.model,PROVIDERS.gemini.model)
 }finally{globalThis.localStorage=prior}
});

test("adaptive optimization raises reasoning with task importance for every provider",()=>{
 assert.equal(optimizationTier("action"),"FAST");
 assert.equal(optimizationTier("identity"),"FAST");
 assert.equal(optimizationTier("turn_state_fast"),"FAST");
 assert.equal(optimizationTier("turn_deferred"),"BALANCED");
 assert.equal(optimizationTier("turn_state_deep"),"IMPORTANT");
 assert.equal(optimizationTier("core_rules"),"IMPORTANT");
 assert.equal(optimizationTier("future"),"BALANCED");
 assert.equal(optimizationTier("quality"),"CRITICAL");
 assert.deepEqual(providerOptimization("openai","adaptive","action"),{reasoning_effort:"low"});
 assert.deepEqual(providerOptimization("openai","adaptive","identity"),{reasoning_effort:"low"});
 assert.deepEqual(providerOptimization("openai","adaptive","core_anchor"),{reasoning_effort:"medium"});
 assert.deepEqual(providerOptimization("openai","adaptive","core_rules"),{reasoning_effort:"high"});
 assert.deepEqual(providerOptimization("gemini","adaptive","action"),{thinkingConfig:{thinkingLevel:"LOW"}});
 assert.deepEqual(providerOptimization("gemini","adaptive","history"),{thinkingConfig:{thinkingLevel:"HIGH"}});
 assert.deepEqual(providerOptimization("agnes","adaptive","npc"),{reasoning_effort:"low"});
 assert.deepEqual(providerOptimization("agnes","adaptive","action"),{});
 assert.deepEqual(providerOptimization("agnes","adaptive","scene"),{});
 assert.deepEqual(providerOptimization("agnes","adaptive","turn_state_fast"),{});
 assert.deepEqual(providerOptimization("agnes","adaptive","core_anchor"),{});
 assert.deepEqual(providerOptimization("agnes","adaptive","core_rules"),{});
 assert.deepEqual(providerOptimization("agnes","adaptive","future"),{});
 assert.deepEqual(providerOptimization("agnes","adaptive","identity"),{});
 assert.deepEqual(providerOptimization("agnes","adaptive","geography"),{});
 assert.deepEqual(providerOptimization("agnes","adaptive","society"),{});
 assert.deepEqual(providerOptimization("agnes","adaptive","cast"),{});
 assert.deepEqual(providerOptimization("agnes","adaptive","recovery"),{reasoning_effort:"high"});
 assert.deepEqual(providerOptimization("openai","standard","quality"),{});
 assert.deepEqual(providerOptimization("agnes","standard","turn_state_fast"),{})
});

test("adaptive OpenAI and Agnes requests use native reasoning_effort while keeping fixed models",async()=>{
 const priorStorage=globalThis.localStorage,priorFetch=globalThis.fetch;globalThis.localStorage=memoryStorage();
 try{
  for(const provider of ["openai","agnes"]){
   clearAISettings();let request;
   saveAISettings({provider,apiKey:"test-key",endpoint:PROVIDERS[provider].endpoint,model:"ignored",optimization:"adaptive"});
   globalThis.fetch=async(url,init)=>{request={url,body:JSON.parse(init.body)};return {ok:true,json:async()=>({choices:[{message:{content:"OK"}}]})}};
   await directChat({system:"s",user:"u",aiTask:"action",timeoutMs:5000,retryOnTimeout:false,maxOutputTokens:700});
   assert.equal(request.body.model,PROVIDERS[provider].model);
   if(provider==="openai")assert.equal(request.body.reasoning_effort,"low");else{assert.equal("reasoning_effort" in request.body,false);assert.equal(request.body.max_tokens,800)}
   await directChat({system:"s",user:"u",aiTask:"quality",timeoutMs:5000,retryOnTimeout:false});
   assert.equal(request.body.reasoning_effort,"high")
  }
 }finally{globalThis.localStorage=priorStorage;globalThis.fetch=priorFetch}
});

test("adaptive Gemini request uses task-aware thinkingConfig and fixed model URL",async()=>{
 const priorStorage=globalThis.localStorage,priorFetch=globalThis.fetch;globalThis.localStorage=memoryStorage();let request;
 try{
  clearAISettings();
  saveAISettings({provider:"gemini",apiKey:"g",endpoint:PROVIDERS.gemini.endpoint,model:"ignored",optimization:"adaptive"});
  globalThis.fetch=async(url,init)=>{request={url,body:JSON.parse(init.body)};return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:"OK"}]}}]})}};
  await directChat({system:"s",user:"u",aiTask:"history",timeoutMs:5000,retryOnTimeout:false});
  assert.match(request.url,/gemini-3\.8-flash/);
  assert.deepEqual(request.body.generationConfig.thinkingConfig,{thinkingLevel:"HIGH"})
 }finally{globalThis.localStorage=priorStorage;globalThis.fetch=priorFetch}
});

test("adaptive mode retries once without native optimization when a compatible endpoint rejects it",async()=>{
 const priorStorage=globalThis.localStorage,priorFetch=globalThis.fetch;globalThis.localStorage=memoryStorage();const bodies=[];
 try{
  clearAISettings();saveAISettings({provider:"agnes",apiKey:"a",endpoint:"https://proxy.invalid/chat",optimization:"adaptive"});
  globalThis.fetch=async(url,init)=>{bodies.push(JSON.parse(init.body));if(bodies.length===1)return {ok:false,status:400,json:async()=>({error:{message:"unsupported field"}})};return {ok:true,json:async()=>({choices:[{message:{content:"OK"}}]})}};
  assert.equal(await directChat({system:"s",user:"u",aiTask:"npc",timeoutMs:5000,retryOnTimeout:false}),"OK");
  assert.equal(bodies[0].reasoning_effort,"low");
  assert.equal("reasoning_effort" in bodies[1],false)
 }finally{globalThis.localStorage=priorStorage;globalThis.fetch=priorFetch}
});


test("adaptive reasoning-capable providers reserve visible completion budget",()=>{
 assert.equal(providerTokenBudget("openai","standard","identity",500),500);
 assert.equal(providerTokenBudget("openai","adaptive","identity",500),500);
 assert.equal(providerTokenBudget("agnes","adaptive","identity",500),900);
 assert.equal(providerTokenBudget("agnes","standard","geography",800),900);
 assert.equal(providerTokenBudget("agnes","adaptive","scene",760),1100);
 assert.equal(providerTokenBudget("agnes","adaptive","turn_state_fast",650),800);
 assert.equal(providerTokenBudget("agnes","adaptive","core_rules",900),1100);
 assert.equal(providerTokenBudget("agnes","adaptive","core_anchor",1000),1200);
 assert.equal(providerTokenBudget("agnes","adaptive","future",1200),3000);
 assert.equal(providerTokenBudget("agnes","adaptive","cast",950),1800);
 assert.equal(providerTokenBudget("agnes","adaptive","runtime_expansion",900),1600);
 assert.ok(providerTokenBudget("openai","adaptive","core_rules",900)>=3600);
 assert.ok(providerTokenBudget("agnes","adaptive","quality",1200)>=4800);
 assert.equal(providerTokenBudget("gemini","adaptive","history",1200),1200)
});

test("empty adaptive OpenAI response retries once without reasoning override",async()=>{
 const priorStorage=globalThis.localStorage,priorFetch=globalThis.fetch;globalThis.localStorage=memoryStorage();const bodies=[];
 try{
  clearAISettings();saveAISettings({provider:"openai",apiKey:"o",endpoint:PROVIDERS.openai.endpoint,optimization:"adaptive"});
  globalThis.fetch=async(url,init)=>{bodies.push(JSON.parse(init.body));if(bodies.length===1)return {ok:true,json:async()=>({choices:[{finish_reason:"length",message:{content:""}}]})};return {ok:true,json:async()=>({choices:[{finish_reason:"stop",message:{content:'{"ok":true}'}}]})}};
  const out=await directChat({system:"s",user:"u",aiTask:"identity",maxOutputTokens:500,timeoutMs:5000,retryOnTimeout:false});
  assert.equal(out,'{"ok":true}');
  assert.equal(bodies.length,2);
  assert.equal(bodies[0].reasoning_effort,"low");
  assert.equal("reasoning_effort" in bodies[1],false);
  assert.equal(bodies[0].max_completion_tokens,500);
  assert.equal(bodies[1].max_completion_tokens,bodies[0].max_completion_tokens)
 }finally{globalThis.localStorage=priorStorage;globalThis.fetch=priorFetch}
});

test("empty adaptive Gemini response retries once without thinkingConfig",async()=>{
 const priorStorage=globalThis.localStorage,priorFetch=globalThis.fetch;globalThis.localStorage=memoryStorage();const bodies=[];
 try{
  clearAISettings();saveAISettings({provider:"gemini",apiKey:"g",endpoint:PROVIDERS.gemini.endpoint,optimization:"adaptive"});
  globalThis.fetch=async(url,init)=>{bodies.push(JSON.parse(init.body));if(bodies.length===1)return {ok:true,json:async()=>({candidates:[{finishReason:"MAX_TOKENS",content:{parts:[]}}]})};return {ok:true,json:async()=>({candidates:[{finishReason:"STOP",content:{parts:[{text:'{"ok":true}'}]}}]})}};
  const out=await directChat({system:"s",user:"u",aiTask:"history",maxOutputTokens:1200,timeoutMs:5000,retryOnTimeout:false});
  assert.equal(out,'{"ok":true}');
  assert.deepEqual(bodies[0].generationConfig.thinkingConfig,{thinkingLevel:"HIGH"});
  assert.equal("thinkingConfig" in bodies[1].generationConfig,false)
 }finally{globalThis.localStorage=priorStorage;globalThis.fetch=priorFetch}
});


test("hard provider deadline resolves independently of a fetch promise that ignores abort",async()=>{
 const controller=new AbortController(),started=Date.now(),never=new Promise(()=>{});
 await assert.rejects(
  hardProviderDeadline(never,{controller,timeoutMs:25}),
  err=>err?.code==="AI_TIMEOUT"&&/Provider/.test(err.message)
 );
 assert.ok(Date.now()-started<500,"hard deadline must not wait for the underlying fetch to settle");
 assert.equal(controller.signal.aborted,true)
});


test("Developer Autotest runtime control can disable deadlines while preserving manual abort",async()=>{
 const priorStorage=globalThis.localStorage,priorFetch=globalThis.fetch;globalThis.localStorage=memoryStorage();
 const batch=new AbortController();
 try{
  clearAISettings();saveAISettings({provider:"openai",apiKey:"o",endpoint:PROVIDERS.openai.endpoint,optimization:"standard"});
  globalThis.fetch=async()=>new Promise(()=>{});
  setDirectAIRuntimeControl({disableTimeout:true,signal:batch.signal});
  const pending=directChat({system:"s",user:"u",aiTask:"action",timeoutMs:5000,retryOnTimeout:false});
  setTimeout(()=>batch.abort(new DOMException("stop","AbortError")),25);
  await assert.rejects(pending,err=>err?.code==="AI_ABORTED");
 }finally{clearDirectAIRuntimeControl();globalThis.localStorage=priorStorage;globalThis.fetch=priorFetch}
});

test("hard provider deadline accepts timeoutMs=0 as no automatic timeout",async()=>{
 const value=await hardProviderDeadline(new Promise(resolve=>setTimeout(()=>resolve("ok"),30)),{timeoutMs:0});
 assert.equal(value,"ok")
});


test("Agnes structured JSON requests keep completion budget instead of reasoning",async()=>{
 const priorStorage=globalThis.localStorage,priorFetch=globalThis.fetch;globalThis.localStorage=memoryStorage();let body;
 try{
  clearAISettings();saveAISettings({provider:"agnes",apiKey:"a",endpoint:PROVIDERS.agnes.endpoint,optimization:"adaptive"});
  globalThis.fetch=async(url,init)=>{body=JSON.parse(init.body);return {ok:true,json:async()=>({choices:[{finish_reason:"stop",message:{content:'{"ok":true}'}}]})}};
  for(const [task,requested,expected] of [["identity",500,900],["scene",760,1100],["turn_state_fast",650,800],["core_rules",900,1100],["core_anchor",1000,1200],["future",1200,3000],["cast",950,1800],["runtime_expansion",900,1600]]){
   assert.equal(await directChat({system:"s",user:"u",aiTask:task,maxOutputTokens:requested,timeoutMs:5000,retryOnTimeout:false}),'{"ok":true}');
   assert.equal("reasoning_effort" in body,false,task);
   assert.equal(body.max_tokens,expected,task)
  }
 }finally{globalThis.localStorage=priorStorage;globalThis.fetch=priorFetch}
});
