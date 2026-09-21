import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {ACTION_ASSESS_SYSTEM} from "../src/ai-runtime-contracts.js";

test("Engine fast path is attempted before AI feasibility",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const run=app.slice(app.indexOf("async function runAction"),app.indexOf('$("#newWorldBtn")'));
 const fast=run.indexOf("fastLocalActionAssessment(gameState,requested)");
 const provider=run.indexOf("if(!aiStatus.aiConfigured)");
 const assess=run.indexOf("await assessPlayerAction");
 const perform=run.indexOf("performAction(gameState");
 assert.ok(fast>=0);
 assert.ok(provider>fast);
 assert.ok(assess>provider);
 assert.ok(perform>assess);
 assert.match(run,/ACTION_ASSESSMENT_FAILED/)
});

test("shared action judge parses Action Intent without deciding dice success",()=>{
 assert.match(ACTION_ASSESS_SYSTEM,/Action Intent \+ Feasibility Judge/);
 assert.match(ACTION_ASSESS_SYSTEM,/不要判斷成功率/);
 assert.match(ACTION_ASSESS_SYSTEM,/技能低、疲勞高或受傷通常仍可 ALLOW/);
 assert.match(ACTION_ASSESS_SYSTEM,/ALLOW\|ADJUST\|BLOCK/);
 assert.match(ACTION_ASSESS_SYSTEM,/snapshot\.player\.origin 是玩家起源的唯一權威資料/);
 assert.doesNotMatch(ACTION_ASSESS_SYSTEM,/普通現代人/)
});

test("client feasibility keeps two AI attempts before conservative Engine degradation",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const start=client.indexOf("export async function assessPlayerAction");
 const end=client.indexOf("export async function generateTurn",start);
 const block=client.slice(start,end);
 assert.match(block,/\/api\/action/);
 assert.match(block,/actionFeasibilitySnapshot/);
 assert.match(block,/directActionAssessment\(payload,label,false\)/);
 assert.match(block,/directActionAssessment\(\{action:label,snapshot\},label,true\)/);
 assert.match(block,/return degradedActionAssessment\(state,label,e\)/);
 assert.match(client,/ENGINE_DEGRADED/);
 assert.match(client,/actionIntent/)
});

test("server action endpoint reuses shared contract and never rolls dice",async()=>{
 const api=await readFile(new URL("../api/action.js",import.meta.url),"utf8");
 assert.match(api,/ACTION_ASSESS_SYSTEM/);
 assert.match(api,/normalizeActionIntent/);
 assert.doesNotMatch(api,/Math\.random|d20\(/)
});
