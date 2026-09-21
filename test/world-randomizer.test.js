import test from "node:test";
import assert from "node:assert/strict";
import {randomWorldSettings} from "../src/world-randomizer.js";

test("random world settings fills all reviewable creator fields",()=>{
 const values=[0.99,0,0.49,0.79,0.51];
 let i=0;
 const out=randomWorldSettings({genres:["王道奇幻","黑暗奇幻","東方幻想"],scales:["小型","中型","大型"]},()=>values[i++]);
 assert.equal(out.genre,"東方幻想");
 assert.equal(out.danger,1);
 assert.equal(out.magic,3);
 assert.equal(out.politics,4);
 assert.equal(out.scale,"中型")
});

test("random world settings does not own player name prompt or play duration",()=>{
 const out=randomWorldSettings({genres:["王道奇幻"],scales:["中型"]},()=>0);
 assert.deepEqual(Object.keys(out).sort(),["danger","genre","magic","politics","scale"])
});

test("random world settings rejects missing option sets",()=>{
 assert.throws(()=>randomWorldSettings({genres:[],scales:["中型"]}),/RANDOM_WORLD_OPTIONS_REQUIRED/)
});


test("creator random world button only fills settings and waits for explicit generation",async()=>{
 const {readFile}=await import("node:fs/promises");
 const [html,app]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/id="randomWorldBtn"[^>]*>🎲 隨機世界<\/button>/);
 assert.doesNotMatch(html,/aiWorldviewBtn|交給 AI 決定世界觀/);
 const start=app.indexOf('$("#randomWorldBtn")?.addEventListener');
 const end=app.indexOf('$("#genre")?.addEventListener',start);
 const randomHandler=app.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.match(randomHandler,/randomWorldSettings/);
 assert.doesNotMatch(randomHandler,/generateWorldCandidate|newGame|persist\(/);
 const generateBlock=app.slice(app.indexOf('$("#generateBtn").onclick'),app.indexOf('$("#freeActionForm").onsubmit'));
 assert.match(generateBlock,/worldviewMode:"style"/);
 assert.match(generateBlock,/generateWorldCandidate/);
 assert.doesNotMatch(generateBlock,/worldviewMode:"ai"/)
});
