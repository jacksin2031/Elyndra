import test from "node:test";
import assert from "node:assert/strict";
import {randomWorldSettings} from "../src/world-randomizer.js";
import {readFile} from "node:fs/promises";

test("random world settings fills legacy quick-random fields",()=>{
 const values=[0.99,0,0.49,0.79,0.51];
 let i=0;
 const out=randomWorldSettings({genres:["王道奇幻","黑暗奇幻","東方幻想"],scales:["小型","中型","大型"]},()=>values[i++]);
 assert.equal(out.genre,"東方幻想");
 assert.equal(out.danger,1);
 assert.equal(out.magic,3);
 assert.equal(out.politics,4);
 assert.equal(out.scale,"中型")
});

test("random world settings rejects missing option sets",()=>{
 assert.throws(()=>randomWorldSettings({genres:[],scales:["中型"]}),/RANDOM_WORLD_OPTIONS_REQUIRED/)
});

test("World Creation UI provides Custom World and 1-10 degree sliders",async()=>{
 const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,/<option value="自訂世界">自訂世界<\/option>/);
 assert.match(html,/id="customWorldStyle"/);
 for(const id of ["civilizationLevel","technologyLevel","magicLevel","politicalUnity","religionInfluence","resourceAbundance","worldDanger","survivalIntensity"]){
  assert.match(html,new RegExp('id="'+id+'" type="range" min="1" max="10"'))
  assert.match(html,new RegExp('id="'+id+'Value"'))
 }
});

test("World Constitution Tag Builder has preset library and custom tags for all three rule buckets",async()=>{
 const [html,app]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 for(const target of ["required","allowed","forbidden"]){
  assert.match(html,new RegExp('data-rule-target="'+target+'"'));
  assert.match(html,new RegExp('id="'+target+'TagCloud"'));
  assert.match(html,new RegExp('id="'+target+'TagInput"'));
  assert.match(html,new RegExp('data-add-custom-tag="'+target+'"'))
 }
 assert.match(app,/const RULE_TAG_LIBRARY=/);
 assert.match(app,/魔法學院/);
 assert.match(app,/天空群島/);
 assert.match(app,/科幻文明/);
 assert.match(app,/for\(const key of Object\.keys\(ruleValues\)\)ruleValues\[key\]=ruleValues\[key\]\.filter\(x=>x!==tag\)/);
 assert.match(app,/addRuleTag\(target,input\?\.value\)/)
});

test("reroll only changes creator settings and never generates a world",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf('$("#randomWorldBtn")?.addEventListener');
 const end=app.indexOf('$("#genre")?.addEventListener',start);
 const randomHandler=app.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.match(randomHandler,/randomizeUnlockedCreator/);
 assert.doesNotMatch(randomHandler,/generateWorldCandidate|newGame|persist\(/);
 const generateBlock=app.slice(app.indexOf('$("#generateBtn").onclick'),app.indexOf('$("#freeActionForm").onsubmit'));
 assert.match(generateBlock,/createWorldCreationDraft/);
 assert.match(generateBlock,/compileWorldCreation/);
 assert.match(generateBlock,/validateWorldCreationCandidate/);
 assert.match(generateBlock,/buildWorldContract/);
 assert.match(generateBlock,/confirmWorldContract/)
});
