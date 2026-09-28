import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {V06028_SCENE_TIMEOUT_MS,V06029_AGNES_BACKGROUND_TASK_ALIAS,v06029RouteBackgroundStructuredTask} from "../src/v06028-ai-settings-hotfix.js";

test("v0.60.30 routes Agnes background quality work through the structured runtime profile",()=>{
 assert.deepEqual(V06029_AGNES_BACKGROUND_TASK_ALIAS,{quality:"runtime_quality",quality_repair:"runtime_quality"});
 const critic=v06029RouteBackgroundStructuredTask({aiTask:"quality",timeoutMs:45000,maxOutputTokens:1300,retryOnTimeout:false},"agnes");
 assert.equal(critic.aiTask,"runtime_quality");
 assert.equal(critic.disableOptimization,true);
 assert.equal(critic.maxOutputTokens,1300);
 assert.equal(critic.timeoutMs,45000);
 assert.equal(critic.retryOnTimeout,false);
 const repair=v06029RouteBackgroundStructuredTask({aiTask:"quality_repair",maxOutputTokens:2200},"agnes");
 assert.equal(repair.aiTask,"runtime_quality");
 assert.equal(repair.disableOptimization,true);
 assert.equal(repair.maxOutputTokens,1600);
});

test("v0.60.30 leaves foreground and non-Agnes task routing unchanged",()=>{
 const scene={aiTask:"scene",timeoutMs:35000,maxOutputTokens:1100};
 assert.equal(v06029RouteBackgroundStructuredTask(scene,"agnes"),scene);
 const openai={aiTask:"quality",timeoutMs:45000,maxOutputTokens:1300};
 assert.equal(v06029RouteBackgroundStructuredTask(openai,"openai"),openai);
 assert.equal(V06028_SCENE_TIMEOUT_MS,10500);
});

test("v0.60.30 directChat applies background routing before delegating to the base client",async()=>{
 const source=await readFile(new URL("../src/v06028-ai-settings-hotfix.js",import.meta.url),"utf8");
 assert.match(source,/provider=base\.loadAISettings\?\.\(\)\.provider\|\|"",routed=v06029RouteBackgroundStructuredTask\(args,provider\)/);
 assert.match(source,/return base\.directChat\(routed\)/);
 assert.match(source,/base\.directChat\(\{\.\.\.routed,signal:controller\.signal,disableTimeout:true\}\)/);
});
