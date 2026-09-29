import test from "node:test";
import assert from "node:assert/strict";
import {backgroundQualityNeed,recordBackgroundQualityReview} from "../src/v06029-world-quality-hotfix.js";

const state=()=>({world:{version:4,quality:{background:{running:false}},state:{day:1}}});

test("v0.60.29 failed background quality attempt remains retry-eligible",()=>{
 const s=state();
 recordBackgroundQualityReview(s,{error:"WORLD_QUALITY_CRITIC_FAILED: AI_TIMEOUT"});
 const bg=s.world.quality.background;
 assert.equal(bg.reviewedAt,0);
 assert.equal(bg.reviewedWorldVersion,0);
 assert.equal(bg.lastAttemptWorldVersion,4);
 assert.match(bg.lastError,/AI_TIMEOUT/);
 assert.equal(backgroundQualityNeed(s).reason,"FAILURE_BACKOFF");
 bg.nextRetryAt=Date.now()-1;
 assert.deepEqual(backgroundQualityNeed(s),{required:true,reason:"RETRY_AFTER_FAILURE"});
 assert.equal(s.world.quality.status,"UNAVAILABLE");
});

test("v0.60.29 successful background quality review still settles the current world version",()=>{
 const s=state();
 recordBackgroundQualityReview(s,{evaluation:{overall:91,status:"PASS",source:"AI",official:true}});
 assert.equal(s.world.quality.background.reviewedWorldVersion,4);
 assert.equal(backgroundQualityNeed(s).required,false);
 assert.equal(backgroundQualityNeed(s).reason,"UP_TO_DATE");
});

test("v0.60.29 preserves last successful review when a later attempt fails",()=>{
 const s=state();
 recordBackgroundQualityReview(s,{evaluation:{overall:90,status:"PASS",source:"AI",official:true}});
 s.world.version=5;
 recordBackgroundQualityReview(s,{error:"AI_TIMEOUT"});
 assert.equal(s.world.quality.background.reviewedWorldVersion,4);
 assert.equal(backgroundQualityNeed(s).reason,"FAILURE_BACKOFF");
 s.world.quality.background.nextRetryAt=Date.now()-1;
 assert.equal(backgroundQualityNeed(s).reason,"RETRY_AFTER_FAILURE");
});
