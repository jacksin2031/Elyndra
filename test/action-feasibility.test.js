import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("free actions are AI-assessed before engine execution",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const run=app.slice(app.indexOf('async function runAction'),app.indexOf('$("#newWorldBtn")'));
 const assess=run.indexOf("await assessPlayerAction");
 const perform=run.indexOf("performAction(gameState");
 assert.ok(assess>=0);
 assert.ok(perform>assess);
 assert.match(run,/if\(!aiStatus\.aiConfigured\)/);
 assert.match(run,/ACTION_ASSESSMENT_FAILED/);
});

test("action judge separates feasibility from dice success",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const start=client.indexOf("export async function assessPlayerAction");
 const end=client.indexOf("export async function generateTurn",start);
 const block=client.slice(start,end);
 assert.match(block,/不決定成功或失敗/);
 assert.match(block,/技能低、疲勞高、受傷或環境惡劣通常不是 BLOCK/);
 assert.match(block,/ALLOW\|ADJUST\|BLOCK/);
 assert.match(block,/\/api\/action/);
});

test("server action assessment endpoint exists and never rolls dice",async()=>{
 const api=await readFile(new URL("../api/action.js",import.meta.url),"utf8");
 assert.match(api,/Action Feasibility Judge/);
 assert.match(api,/不擲骰/);
 assert.doesNotMatch(api,/Math\.random|d20\(/);
 assert.match(api,/ALLOW\|ADJUST\|BLOCK/)
});
