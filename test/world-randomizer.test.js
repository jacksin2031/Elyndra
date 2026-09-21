import test from "node:test";
import assert from "node:assert/strict";
import {randomWorldSettings} from "../src/world-randomizer.js";

test("random world settings fills legacy reviewable creator fields",()=>{
 const values=[0.99,0,0.49,0.79,0.51];let i=0;
 const out=randomWorldSettings({genres:["王道奇幻","黑暗奇幻","東方幻想"],scales:["小型","中型","大型"]},()=>values[i++]);
 assert.equal(out.genre,"東方幻想");assert.equal(out.danger,1);assert.equal(out.magic,3);assert.equal(out.politics,4);assert.equal(out.scale,"中型")
});
test("random world settings does not own player text or play duration",()=>{
 const out=randomWorldSettings({genres:["王道奇幻"],scales:["中型"]},()=>0);
 assert.deepEqual(Object.keys(out).sort(),["danger","genre","magic","politics","scale"])
});
test("random world settings rejects missing option sets",()=>assert.throws(()=>randomWorldSettings({genres:[],scales:["中型"]}),/RANDOM_WORLD_OPTIONS_REQUIRED/));

test("World Creation 2.0 creator exposes custom style, 1-10 degree sliders and tag builder",async()=>{
 const {readFile}=await import("node:fs/promises");
 const [html,app,css]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../creator.css",import.meta.url),"utf8")
 ]);
 assert.match(html,/<option value="自訂世界">自訂世界<\/option>/);
 assert.match(html,/id="customWorldStyle"/);
 for(const id of ["civilizationLevel","technologyLevel","magicLevel","politicalUnity","religionInfluence","resourceAbundance","worldDanger","survivalIntensity"]){
  assert.match(html,new RegExp('id="'+id+'" type="range" min="1" max="10"'))
 }
 assert.match(html,/WORLD CONSTITUTION TAGS/);
 assert.match(html,/data-rule-target="required"/);
 assert.match(html,/data-rule-target="allowed"/);
 assert.match(html,/data-rule-target="forbidden"/);
 assert.match(html,/id="requiredTagInput"/);
 assert.match(html,/id="allowedTagInput"/);
 assert.match(html,/id="forbiddenTagInput"/);
 assert.match(app,/const RULE_TAG_LIBRARY=/);
 assert.match(app,/魔法學院/);assert.match(app,/天空群島/);assert.match(app,/人工智慧/);assert.match(app,/固定救世主劇情/);
 assert.match(app,/for\(const key of Object\.keys\(ruleValues\)\)ruleValues\[key\]=ruleValues\[key\]\.filter\(x=>x!==tag\)/);
 assert.match(app,/customWorldStyle:v\("customWorldStyle"\)/);
 assert.match(css,/\.preset-tag-cloud/);assert.match(css,/\.degree-control/)
});

test("creator reroll excludes custom-world pseudo preset and never generates immediately",async()=>{
 const {readFile}=await import("node:fs/promises");
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf('$("#randomWorldBtn")?.addEventListener'),end=app.indexOf('$("#genre")?.addEventListener',start),randomHandler=app.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.match(app,/filter\(x=>x!=="自訂世界"\)/);
 assert.match(randomHandler,/randomizeUnlockedCreator/);
 assert.doesNotMatch(randomHandler,/generateWorldCandidate|newGame|persist\(/);
 const generateBlock=app.slice(app.indexOf('$("#generateBtn").onclick'),app.indexOf('$("#freeActionForm").onsubmit'));
 for(const name of ["createWorldCreationDraft","compileWorldCreation","validateWorldCreationCandidate","buildWorldContract","confirmWorldContract","generateWorldCandidate"])assert.match(generateBlock,new RegExp(name))
});
