import test from "node:test";
import assert from "node:assert/strict";
import {generateWorldCandidate} from "../src/ai-client.js";
import {createWorldCreationDraft,compileWorldCreation} from "../src/world-creation.js";

function storage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}}
const seed=()=>compileWorldCreation(createWorldCreationDraft({masterSeed:"recovery-genesis-pipeline",worldStyle:"王道奇幻",originType:"crossing",historicalDepth:"DEEP_TIME",routeDensity:"DENSE"}));

test("server-client world pipeline recomputes Genesis instead of trusting a supplied 100 score",async()=>{
 const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage;globalThis.localStorage=storage();let requests=0;
 const candidate={worldName:"Test",worldTheme:"Frontier",summary:"A frontier world.",worldBible:{startingRegion:"Border",startingLocation:"Gate",civilization:{level:3,stage:"Settled",infrastructure:"Roads",literacy:"Schools",mobility:"Walking"}},generation:{locations:[{name:"Gate",region:"Border"}],npcs:[],factions:[],sideQuests:[]},publicFacts:["The roads are closed."],hiddenFacts:["The old gate conceals a separate realm."],worldHistory:[],worldTimeline:[],worldGenesisEvaluation:{status:"PASS",score:100}};
 globalThis.fetch=async url=>{assert.equal(url,"/api/world");requests++;return {ok:true,json:async()=>({candidate})}};
 try{const result=await generateWorldCandidate(seed(),{});assert.equal(requests,1);assert.equal(result.worldGenesisEvaluation.checks.length,18);assert.equal(Object.keys(result.worldGenesisEvaluation.dimensions).length,7);assert.ok(result.worldGenesisEvaluation.score<100);assert.equal(result.worldGenesisPlan.history.depth,"DEEP_TIME");assert.equal(result.worldGenesisPlan.topology.routeDensity,"DENSE");assert.deepEqual(result.hiddenFacts,candidate.hiddenFacts)}finally{globalThis.fetch=oldFetch;if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage}
});

test("direct world fallback carries deferred Genesis scopes without any extra evaluator requests",async()=>{
 const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage;globalThis.localStorage=storage();
 globalThis.localStorage.setItem("elyndra:ai-settings:v3",JSON.stringify({provider:"openai",profiles:{openai:{endpoint:"https://fixture.invalid/chat",apiKey:"disposable-fixture",optimization:"standard"}}}));
 let active=0,maxActive=0,requests=0;globalThis.fetch=async url=>{assert.equal(url,"https://fixture.invalid/chat");requests++;active++;maxActive=Math.max(maxActive,active);await Promise.resolve();active--;return {ok:true,json:async()=>({choices:[{message:{content:"{}"}}]})}};
 try{const result=await generateWorldCandidate(seed(),{});assert.equal(requests,9,"only the existing nine generation/compliance stages may call the provider");assert.ok(maxActive<=2);assert.equal(result.worldGenesisEvaluation.checks.length,18);assert.equal(result.worldGenesisPlan.history.depth,"DEEP_TIME");assert.ok(result.worldGenesisEvaluation.partialRealization.length>0);assert.ok(result.worldGenesisEvaluation.score<100);assert.equal(result.generation.locations.length,1);assert.ok(result.originOpening);assert.ok(result.worldBible.designLogic)}finally{globalThis.fetch=oldFetch;if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage}
});
