import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PROVIDERS,loadAISettings,saveAISettings,clearAISettings,directChat} from "../src/ai-settings.js";

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
 assert.match(app,/Agnes 模式 · 預設使用 Agnes 3\.0 Flash/);
 assert.match(app,/ai-settings\.js\?v=310/)
});
