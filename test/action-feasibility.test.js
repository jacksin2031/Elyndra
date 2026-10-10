import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("Engine fast path runs before AI requirement and before action execution",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const run=app.slice(app.indexOf("async function runAction"),app.indexOf('$("#newWorldBtn")'));
 const fast=run.search(/fastLocalActionAssessment\((?:gameState|actionState),requested\)/);
 const provider=run.indexOf("if(!aiStatus.aiConfigured)",fast);
 const assess=run.indexOf("await assessPlayerAction",fast);
 const perform=run.search(/performAction\((?:gameState|actionState),/);
 assert.ok(fast>=0);assert.ok(provider>fast);assert.ok(assess>provider);assert.ok(perform>assess);
 assert.match(run,/這個行動需要語義判斷/);
 assert.match(run,/ACTION_ASSESSMENT_FAILED/)
});


test("prevalidated AI suggestion bypasses feasibility AI and goes directly to Engine",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const run=app.slice(app.indexOf("async function runAction"),app.indexOf('$("#newWorldBtn")'));
 const trusted=run.search(/trustedSuggestionAssessment\((?:gameState|actionState),options\.suggestion\)/);
 const fast=run.search(/fastLocalActionAssessment\((?:gameState|actionState),requested\)/);
 const assess=run.search(/await assessPlayerAction\((?:gameState|actionState),requested\)/);
 const perform=run.search(/performAction\((?:gameState|actionState),/);
 assert.ok(trusted>=0&&trusted<fast);
 assert.ok(fast<assess&&assess<perform);
 assert.match(run,/if\(!assessment\)assessment=fastLocalActionAssessment/);
 assert.match(run,/if\(!assessment\)\{[\s\S]*await assessPlayerAction/);
 assert.match(run,/AI_SUGGESTION_PREVALIDATED|SUGGESTED_ACTION_PREVALIDATED/);
});

test("shared Action Intent feasibility contract separates semantics from dice",async()=>{
 const [client,contracts]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-runtime-contracts.js",import.meta.url),"utf8")
 ]);
 const start=client.indexOf("export async function assessPlayerAction"),end=client.indexOf("export async function generateTurn",start),block=client.slice(start,end);
 assert.match(contracts,/Action Intent \+ Feasibility Adviser/);
 assert.match(contracts,/不要判斷成功率/);
 assert.match(contracts,/技能低、疲勞高或受傷通常仍可 ALLOW/);
 assert.match(contracts,/ALLOW\|ADJUST\|BLOCK/);
 assert.match(contracts,/verdict 只是 proposal/);
 assert.match(contracts,/Engine .*最終 ALLOW\/BLOCK 權/);
 assert.match(contracts,/沿目前位置邊緣探索／尋找出口、通道、階梯或可攀爬地形/);
 assert.match(contracts,/actionIntent/);
 assert.match(block,/\/api\/action/);
 assert.match(block,/actionFeasibilitySnapshot/);
 assert.match(client,/disableOptimization:compact/);
 assert.match(client,/AI_RETRY/);
 assert.match(client,/ENGINE_DEGRADED/);
 assert.doesNotMatch(block,/const snapshot=buildSnapshot\(state\)/)
});

test("server action endpoint imports the same contract and never rolls dice",async()=>{
 const api=await readFile(new URL("../api/action.js",import.meta.url),"utf8");
 assert.match(api,/ACTION_ASSESS_SYSTEM/);
 assert.match(api,/normalizeActionIntent/);
 assert.doesNotMatch(api,/Math\.random|d20\(/)
});

test("action feasibility retains retry then conservative Engine degradation",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 const start=client.indexOf("export async function assessPlayerAction"),end=client.indexOf("export async function generateTurn",start),block=client.slice(start,end);
 assert.match(block,/directActionAssessment\(payload,label,false\)/);
 assert.match(block,/directActionAssessment\(\{action:label,snapshot\},label,true\)/);
 assert.match(block,/return degradedActionAssessment\(state,label,e\)/);
 assert.match(client,/目前背包中找不到這個行動所指定的物品/);
 assert.match(client,/你目前沒有已知能力支持這種超常移動/)
});
