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
 assert.match(client,/不要判斷成功率/);
 assert.match(client,/技能低、疲勞高或受傷通常仍可 ALLOW/);
 assert.match(client,/ALLOW\|ADJUST\|BLOCK/);
 assert.match(block,/\/api\/action/);
 assert.match(block,/actionFeasibilitySnapshot/);
 assert.match(client,/helperSnapshot\(state\)/);
 assert.match(client,/disableOptimization:compact/);
 assert.match(client,/AI_RETRY/);
 assert.match(client,/ENGINE_DEGRADED/);
 assert.match(block,/degradedActionAssessment/);
 assert.doesNotMatch(block,/const snapshot=buildSnapshot\(state\)/);
});

test("server action assessment endpoint exists and never rolls dice",async()=>{
 const api=await readFile(new URL("../api/action.js",import.meta.url),"utf8");
 assert.match(api,/Action Feasibility Judge/);
 assert.match(api,/不擲骰/);
 assert.doesNotMatch(api,/Math\.random|d20\(/);
 assert.match(api,/ALLOW\|ADJUST\|BLOCK/)
});


test("action feasibility has two AI attempts before conservative Engine degradation",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const start=client.indexOf("export async function assessPlayerAction");
 const end=client.indexOf("export async function generateTurn",start);
 const block=client.slice(start,end);
 assert.match(block,/directActionAssessment\(payload,label,false\)/);
 assert.match(block,/directActionAssessment\(\{action:label,snapshot\},label,true\)/);
 assert.match(block,/return degradedActionAssessment\(state,label,e\)/);
 assert.match(client,/目前背包中找不到這個行動所指定的物品/);
 assert.match(client,/你目前沒有已知能力支持這種超常移動/)
});
