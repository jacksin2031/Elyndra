import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {loadAISettings,saveAISettings,providerForTask,PROVIDERS,selectAIProvider} from "../src/ai-settings.js";

const memoryStorage=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}};

test("provider catalog exposes only fixed Gemini, OpenAI and Agnes presets",()=>{
 assert.deepEqual(Object.keys(PROVIDERS),["gemini","openai","agnes"]);
 assert.equal(PROVIDERS.gemini.model,"gemini-2.5-flash");
 assert.equal(PROVIDERS.openai.model,"gpt-5.6-luna");
 assert.equal(PROVIDERS.agnes.model,"agnes-3.0-flash")
});

test("AI settings UI exposes Agnes as a selectable mode",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/<option value="agnes">Agnes 3\.0 Flash<\/option>/);
 assert.match(app,/Agnes 3\.0 Flash/);
 assert.match(app,/Elyndra 自適應優化/);
 assert.match(app,/目前模型/);
 assert.doesNotMatch(app,/id="aiModel"/);
 assert.match(app,/ai-settings\.js\?v=54019/)
});


test("provider models are fixed presets even when legacy or save input tries to override them",()=>{
 const prior=globalThis.localStorage;globalThis.localStorage=memoryStorage();
 try{
  saveAISettings({provider:"openai",openaiKey:"sk-test",model:"bad-model",openaiModel:"bad-model"});
  const loaded=loadAISettings();assert.equal(loaded.provider,"openai");assert.equal(loaded.model,"gpt-5.6-luna");
  assert.equal(providerForTask("narration").model,"gpt-5.6-luna");
  selectAIProvider("agnes");assert.equal(loadAISettings().model,"agnes-3.0-flash")
 }finally{globalThis.localStorage=prior}
});
