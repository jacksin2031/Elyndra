import {readFile,writeFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const write=(path,content)=>writeFile(new URL(`../${path}`,import.meta.url),content,"utf8");
const replaceOnce=(text,search,replacement,label)=>{
 const i=text.indexOf(search);if(i<0)throw new Error(`PATCH_TARGET_MISSING:${label}`);
 if(text.indexOf(search,i+search.length)>=0)throw new Error(`PATCH_TARGET_AMBIGUOUS:${label}`);
 return text.slice(0,i)+replacement+text.slice(i+search.length)
};

const beforePkg=JSON.parse(await read("package.json"));
const beforeApp=await read("app.js");
if(beforePkg.version!=="0.60.29")throw new Error(`BASE_VERSION_MISMATCH:${beforePkg.version}`);
if(beforeApp.includes('id=\"debugCopyJson\"')||beforeApp.includes('DEBUG_JSON_DISPLAYED'))throw new Error("PARTIAL_V06030_PATCH_DETECTED");

await import("./apply-v06030.mjs");

let app=await read("app.js");
app=replaceOnce(
 app,
 ' if(enrichment.backoff)recordDebug("WORLD_ENRICHMENT_BACKOFF",{domain:enrichment.domain||null,pressure:enrichment.pressure||0,backoffUntil:enrichment.backoffUntil||0,reasons:enrichment.reasons||[]});',
 ' if(enrichment.backoff){worldBackground.queued=false;recordDebug("WORLD_ENRICHMENT_BACKOFF",{domain:enrichment.domain||null,pressure:enrichment.pressure||0,backoffUntil:enrichment.backoffUntil||0,reasons:enrichment.reasons||[]});recordDebug("WORLD_EVOLUTION_BACKOFF_ACTIVE",{phase:"preflight",backoffUntil:enrichment.backoffUntil||0,reasons:enrichment.reasons||[],lastError:gameState.world?.enrichment?.lastReason||""});return}',
 "world evolution preflight backoff short circuit"
);
app=replaceOnce(
 app,
 '  if(!result){recordBackgroundQualityReview(state,{error:"BACKGROUND_CRITIC_UNAVAILABLE"});return}',
 '  if(!result){const retry=recordBackgroundQualityReview(state,{error:"BACKGROUND_CRITIC_UNAVAILABLE"});recordDebug("BACKGROUND_QUALITY_RETRY_STATE_SAVED",{reason:"BACKGROUND_CRITIC_UNAVAILABLE",nextRetryAt:Number(retry?.nextRetryAt)||0,consecutiveFailures:Number(retry?.consecutiveFailures)||0});await persist(state,sessionToken).catch(error=>recordDebug("BACKGROUND_QUALITY_FAILURE_STATE_PERSIST_FAILED",{error:error?.message||String(error)}));return}',
 "quality unavailable retry persistence"
);
app=replaceOnce(
 app,
 '  if(!ctrl.signal.aborted){worldQualityBackground.failures=Math.min(4,(Number(worldQualityBackground.failures)||0)+1);recordBackgroundQualityReview(state,{error:e?.message||String(e)});recordDebug("BACKGROUND_QUALITY_CRITIC_FAILED",{error:e?.message||String(e),elapsedMs:Date.now()-startedAt})}',
 '  if(!ctrl.signal.aborted){worldQualityBackground.failures=Math.min(4,(Number(worldQualityBackground.failures)||0)+1);const retry=recordBackgroundQualityReview(state,{error:e?.message||String(e)});recordDebug("BACKGROUND_QUALITY_CRITIC_FAILED",{error:e?.message||String(e),elapsedMs:Date.now()-startedAt,nextRetryAt:Number(retry?.nextRetryAt)||0,consecutiveFailures:Number(retry?.consecutiveFailures)||0});await persist(state,sessionToken).catch(error=>recordDebug("BACKGROUND_QUALITY_FAILURE_STATE_PERSIST_FAILED",{error:error?.message||String(error)}))}',
 "quality failure retry persistence"
);
await write("app.js",app);

let repair=await read("src/v06030-world-evolution-repair.js");
repair=replaceOnce(
 repair,
 ' const description=clean(state?.narrative,400)||clean(world.summary,400)||name;',
 ' const description=clean(world.summary,400)||name;',
 "anchor repair canonical-only description"
);
await write("src/v06030-world-evolution-repair.js",repair);

let legacyRetryTest=await read("test/v06029-world-quality-retry.test.js");
legacyRetryTest=legacyRetryTest
 .replace('test("v0.60.29 failed background quality attempt remains retry-eligible",()=>{','test("v0.60.30 failed background quality attempt enters persisted bounded backoff before retry",()=>{')
 .replace(' assert.deepEqual(backgroundQualityNeed(s),{required:true,reason:"RETRY_AFTER_FAILURE"});',' const blocked=backgroundQualityNeed(s);assert.equal(blocked.required,false);assert.equal(blocked.reason,"FAILURE_BACKOFF");assert.ok(blocked.retryAt>Date.now());\n bg.nextRetryAt=Date.now()-1;assert.deepEqual(backgroundQualityNeed(s),{required:true,reason:"RETRY_AFTER_FAILURE"});')
 .replace(' assert.equal(backgroundQualityNeed(s).reason,"RETRY_AFTER_FAILURE");',' assert.equal(backgroundQualityNeed(s).reason,"FAILURE_BACKOFF");\n s.world.quality.background.nextRetryAt=Date.now()-1;assert.equal(backgroundQualityNeed(s).reason,"RETRY_AFTER_FAILURE");');
await write("test/v06029-world-quality-retry.test.js",legacyRetryTest);

let regression=await read("test/v06030-debug-world-evolution-regression.test.js");
regression=replaceOnce(
 regression,
 ' assert.match(app,/debugRawJson/);assert.match(app,/markWorldEnrichmentBackoff/);assert.match(app,/repairSparseWorldAnchors/)',
 ' assert.match(app,/debugRawJson/);assert.match(app,/markWorldEnrichmentBackoff/);assert.match(app,/repairSparseWorldAnchors/);assert.match(app,/phase:\"preflight\"/);assert.match(app,/BACKGROUND_QUALITY_RETRY_STATE_SAVED/);assert.match(app,/BACKGROUND_QUALITY_FAILURE_STATE_PERSIST_FAILED/)',
 "v06030 regression persistence markers"
);
await write("test/v06030-debug-world-evolution-regression.test.js",regression);

const verifier=`import assert from "node:assert/strict";\nimport {readFile} from "node:fs/promises";\nconst read=path=>readFile(new URL(\`../\${path}\`,import.meta.url),"utf8");\nconst [pkgText,version,index,app,quality,repair,retryTest,regression,pages]=await Promise.all(["package.json","src/version.js","index.html","app.js","src/v06029-world-quality-hotfix.js","src/v06030-world-evolution-repair.js","test/v06029-world-quality-retry.test.js","test/v06030-debug-world-evolution-regression.test.js",".github/workflows/pages.yml"].map(read));\nconst pkg=JSON.parse(pkgText);\nassert.equal(pkg.version,"0.60.30");\nassert.match(version,/APP_VERSION="0\\.60\\.30"/);\nassert.match(index,/app\\.js\\?v=60030/);\nassert.match(index,/v06029-world-quality-hotfix\\.js\\?v=60030/);\nassert.match(quality,/FAILURE_BACKOFF/);assert.match(quality,/nextRetryAt/);assert.match(quality,/EXPANSION_BACKOFF/);\nassert.match(app,/id=\\"debugCopyJson\\"/);assert.match(app,/id=\\"debugShowJson\\"/);assert.match(app,/DEBUG_JSON_DISPLAYED/);\nassert.match(app,/WORLD_EVOLUTION_BACKOFF_ACTIVE/);assert.match(app,/phase:"preflight"/);assert.match(app,/markWorldEnrichmentBackoff/);\nassert.match(app,/BACKGROUND_QUALITY_RETRY_STATE_SAVED/);assert.match(app,/BACKGROUND_QUALITY_FAILURE_STATE_PERSIST_FAILED/);\nassert.match(repair,/CANONICAL_START_ANCHOR/);assert.doesNotMatch(repair,/state\\?\\.narrative/);\nassert.match(retryTest,/FAILURE_BACKOFF/);assert.match(regression,/BACKGROUND_QUALITY_RETRY_STATE_SAVED/);\nassert.match(pages,/Focused v0\\.60\\.30 regressions/);assert.match(pages,/Verify deployed v0\\.60\\.30 source and rendered badge/);\nconsole.log("v0.60.30 applied release contract OK");\n`;
await write("scripts/verify-v06030-applied.mjs",verifier);

console.log("Applied Elyndra v0.60.30 r3 hardening patch");
