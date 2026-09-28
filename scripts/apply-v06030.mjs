import {readFile,writeFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const write=(path,content)=>writeFile(new URL(`../${path}`,import.meta.url),content,"utf8");
const replaceOnce=(text,search,replacement,label)=>{
 const i=text.indexOf(search);if(i<0)throw new Error(`PATCH_TARGET_MISSING:${label}`);
 if(text.indexOf(search,i+search.length)>=0)throw new Error(`PATCH_TARGET_AMBIGUOUS:${label}`);
 return text.slice(0,i)+replacement+text.slice(i+search.length)
};

const worldQualityHotfix=`import * as base from "./world-quality.js?v=57025&base=1";
import {worldEnrichmentPressure} from "./world-enrichment.js?v=59014";
export * from "./world-quality.js?v=57025&base=1";

const QUALITY_RETRY_BASE_MS=30000,QUALITY_RETRY_MAX_MS=300000;

export function backgroundQualityNeed(state){
 const bg=state?.world?.quality?.background,current=Number(state?.world?.version)||1,now=Date.now();
 if(bg?.running===true)return {required:false,reason:"RUNNING"};
 if(bg?.error){
  const retryAt=Number(bg?.nextRetryAt)||0;
  if(retryAt>now)return {required:false,reason:"FAILURE_BACKOFF",retryAt,remainingMs:retryAt-now};
  const reviewed=Number(bg?.reviewedWorldVersion)||0;
  if(current>=reviewed)return {required:true,reason:"RETRY_AFTER_FAILURE"}
 }
 return base.backgroundQualityNeed(state)
}

export function worldEvolutionNeed(state){
 const guard=worldEnrichmentPressure(state);
 if(guard?.backoff===true){
  const health=base.worldHealthSnapshot(state);
  return {required:false,reasons:["EXPANSION_BACKOFF"],reason:"EXPANSION_BACKOFF",health,retryAt:Number(guard.backoffUntil)||0}
 }
 return base.worldEvolutionNeed(state)
}

export function recordBackgroundQualityReview(state,{evaluation=null,repair=null,error=""}={}){
 const prior=state?.world?.quality?.background&&typeof state.world.quality.background==="object"?structuredClone(state.world.quality.background):{};
 const failure=String(error||"").trim(),row=base.recordBackgroundQualityReview(state,{evaluation,repair,error});
 if(evaluation||!failure){row.consecutiveFailures=0;row.nextRetryAt=0;row.lastError="";return row}
 const attemptAt=Number(row?.reviewedAt)||Date.now(),attemptVersion=Number(row?.reviewedWorldVersion)||Number(state?.world?.version)||1,failures=Math.min(6,Math.max(1,(Number(prior?.consecutiveFailures)||0)+1)),backoffMs=Math.min(QUALITY_RETRY_MAX_MS,QUALITY_RETRY_BASE_MS*(2**(failures-1)));
 row.lastAttemptAt=attemptAt;
 row.lastAttemptWorldVersion=attemptVersion;
 row.lastError=failure.slice(0,300);
 row.consecutiveFailures=failures;
 row.nextRetryAt=attemptAt+backoffMs;
 row.reviewedAt=Number(prior?.reviewedAt)||0;
 row.reviewedWorldVersion=Number(prior?.reviewedWorldVersion)||0;
 return row
}

export const __v06030={QUALITY_RETRY_BASE_MS,QUALITY_RETRY_MAX_MS};
`;

const evolutionRepair=`import {canonizeGeneration} from "./world-registry.js?v=57025";
const clean=(value,max=160)=>typeof value==="string"?value.trim().slice(0,max):"";
const unknownName=value=>!value||/^(?:未知|不明|unknown|unidentified|未確認|未特定)/iu.test(value);

export function repairSparseWorldAnchors(state){
 const world=state?.world,registry=world?.registry;if(!world||!registry||!Array.isArray(registry.locations))return {applied:false,reason:"REGISTRY_UNAVAILABLE",added:0};
 if(registry.locations.length>0)return {applied:false,reason:"ANCHOR_PRESENT",added:0};
 const bible=world.bible||{},existing=new Set(registry.locations.map(x=>clean(x?.name,160)).filter(Boolean));
 const name=[bible.startingLocation,bible.startingSettlement,world.state?.location].map(x=>clean(x,160)).find(x=>x&&!unknownName(x)&&!existing.has(x));
 if(!name)return {applied:false,reason:"CANONICAL_ANCHOR_UNAVAILABLE",added:0};
 const description=clean(state?.narrative,400)||clean(world.summary,400)||name;
 const generation={locations:[{name,type:"START_ANCHOR",description,region:clean(bible.startingRegion,120),known:false,historyRefs:[]}],npcs:[],factions:[],sideQuests:[],definitions:[]};
 const added=canonizeGeneration(state,generation),count=Array.isArray(added?.locations)?added.locations.length:0;
 if(count){state.events??=[];state.events.push({id:globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_SPARSE_ANCHOR_REPAIRED",visibility:"INTERNAL",locationName:name,day:Number(world.state?.day)||1,at:Date.now()})}
 return {applied:count>0,reason:count?"CANONICAL_START_ANCHOR":"NO_CHANGE",added:count,name}
}
`;

const regressionTest=`import test from "node:test";
import assert from "node:assert/strict";
import {backgroundQualityNeed,recordBackgroundQualityReview,worldEvolutionNeed} from "../src/v06029-world-quality-hotfix.js";
import {repairSparseWorldAnchors} from "../src/v06030-world-evolution-repair.js";
import {newGame} from "../src/world-engine.js";
import {debugBundle} from "../src/debug-telemetry.js";
import {copyAutotestText} from "../src/autotest-copy.js";
import {readFile} from "node:fs/promises";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:15,prompt:""};

test("v0.60.30 background quality failures enter bounded retry backoff",()=>{
 const s=newGame(seed);s.world.quality={background:{running:false}};s.world.version=4;
 const row=recordBackgroundQualityReview(s,{error:"AI_TIMEOUT: quality critic"});
 assert.equal(row.consecutiveFailures,1);assert.ok(row.nextRetryAt>Date.now());
 const blocked=backgroundQualityNeed(s);assert.equal(blocked.required,false);assert.equal(blocked.reason,"FAILURE_BACKOFF");
 row.nextRetryAt=Date.now()-1;const retry=backgroundQualityNeed(s);assert.equal(retry.required,true);assert.equal(retry.reason,"RETRY_AFTER_FAILURE");
 recordBackgroundQualityReview(s,{evaluation:{overall:90}});assert.equal(s.world.quality.background.consecutiveFailures,0);assert.equal(s.world.quality.background.nextRetryAt,0)
});

test("v0.60.30 world evolution honors persisted enrichment/provider backoff",()=>{
 const s=newGame(seed);s.world.bible={startingLocation:"灰庭",startingRegion:"北境"};s.world.enrichment={version:1,count:0,lastCompletedTurn:0,lastScheduledTurn:0,lastDomain:"GEOGRAPHY",lastReason:"",providerBackoffUntil:Date.now()+60000,lastPressure:80};
 const need=worldEvolutionNeed(s);assert.equal(need.required,false);assert.equal(need.reason,"EXPANSION_BACKOFF");assert.ok(need.retryAt>Date.now())
});

test("v0.60.30 sparse save repair materializes only an already-canonical starting anchor",()=>{
 const s=newGame(seed);s.world.bible={startingLocation:"灰庭入口",startingSettlement:"灰庭",startingRegion:"北境"};s.world.state.location="灰庭入口";s.narrative="霧中的石造入口就在眼前。";
 assert.equal(s.world.registry.locations.length,0);const out=repairSparseWorldAnchors(s);assert.equal(out.applied,true);assert.equal(out.added,1);assert.equal(s.world.registry.locations.length,1);assert.equal(s.world.registry.locations[0].name,"灰庭入口");assert.equal(s.world.registry.locations[0].known,false)
});

test("v0.60.30 debug JSON can be obtained without filesystem download",async()=>{
 const s=newGame(seed),bundle=debugBundle({appVersion:"0.60.30",gameState:s,aiSettings:{apiKey:"secret"},runtime:{screen:"game"}}),text=JSON.stringify(bundle,null,2);let copied="";
 const result=await copyAutotestText(text,{clipboard:{writeText:async value=>{copied=value}},documentRef:null});
 assert.equal(result.status,"copied");assert.equal(result.method,"clipboard");const parsed=JSON.parse(copied);assert.equal(parsed.schema,"elyndra-debug-v1");assert.equal(parsed.meta.appVersion,"0.60.30");assert.equal(parsed.aiSettings.apiKey,"[REDACTED]")
});

test("v0.60.30 player debug panel exposes verifiable copy and in-page view paths",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/id=\\\"debugCopyJson\\\"/);assert.match(app,/id=\\\"debugShowJson\\\"/);assert.match(app,/DEBUG_JSON_COPIED/);assert.match(app,/DEBUG_JSON_DISPLAYED/);assert.match(app,/debugRawJson/);assert.match(app,/markWorldEnrichmentBackoff/);assert.match(app,/repairSparseWorldAnchors/)
});
`;

let app=await read("app.js");
app=replaceOnce(app,'import {ensureWorldEnrichment,worldEnrichmentPressure,markWorldEnrichmentScheduled,markWorldEnrichmentCompleted,markWorldEnrichmentSkipped} from "./src/world-enrichment.js?v=59014";','import {ensureWorldEnrichment,worldEnrichmentPressure,markWorldEnrichmentScheduled,markWorldEnrichmentCompleted,markWorldEnrichmentSkipped,markWorldEnrichmentBackoff} from "./src/world-enrichment.js?v=59014";','world enrichment import');
app=replaceOnce(app,'import {worldEvolutionNeed,markWorldEvolution,worldHealthSnapshot,backgroundQualityNeed,applyUnseenWorldRepair,recordBackgroundQualityReview} from "./src/world-quality.js?v=57025";','import {worldEvolutionNeed,markWorldEvolution,worldHealthSnapshot,backgroundQualityNeed,applyUnseenWorldRepair,recordBackgroundQualityReview} from "./src/world-quality.js?v=57025";\nimport {repairSparseWorldAnchors} from "./src/v06030-world-evolution-repair.js?v=60030";','world quality import');
app=replaceOnce(app,'<button id=\\"debugExportJson\\" class=\\"primary\\">匯出 Debug JSON</button><button id=\\"debugExportTxt\\" class=\\"secondary\\">匯出摘要 TXT</button>','<button id=\\"debugExportJson\\" class=\\"primary\\">匯出 Debug JSON</button><button id=\\"debugCopyJson\\" class=\\"secondary\\">Copy JSON</button><button id=\\"debugShowJson\\" class=\\"secondary\\">View JSON</button><button id=\\"debugExportTxt\\" class=\\"secondary\\">匯出摘要 TXT</button>','debug action buttons');
const debugHelpers=`async function copyCurrentDebugJson(bodyOverride=""){
 const body=bodyOverride||JSON.stringify(currentDebugBundle(),null,2),result=await copyAutotestText(body),ok=result?.status==="copied",message=activeLocale==="ja"?(ok?`Debug JSON をコピーしました（${Number(result.chars||body.length).toLocaleString()}文字）`:`Debug JSON をコピーできませんでした。JSON 表示を使用してください。`):(ok?`Debug JSON copied (${Number(result.chars||body.length).toLocaleString()} chars).`:`Debug JSON copy is unavailable. Use View JSON.`);
 debugExportFeedback(message,ok);recordDebug(ok?"DEBUG_JSON_COPIED":"DEBUG_JSON_COPY_FAILED",{method:result?.method||"none",chars:result?.chars||body.length,error:result?.clipboardError||""});return result
}
function showCurrentDebugJson(){
 const bundle=currentDebugBundle(),body=JSON.stringify(bundle,null,2),root=$("#modalContent");if(!root)return;
 const title=activeLocale==="ja"?"Debug JSON（ページ内表示）":"Debug JSON (in-page view)",copyLabel=activeLocale==="ja"?"すべてコピー":"Copy all",backLabel=activeLocale==="ja"?"Debug に戻る":"Back to Debug",hint=activeLocale==="ja"?"この欄はダウンロード不要です。Ctrl+A / Ctrl+C でも取得できます。":"No download is required. You can also use Ctrl+A / Ctrl+C.";
 root.innerHTML=`<div class="panel-head"><div><div class="eyebrow">ELYNDRA DEBUG</div><h2>${title}</h2><p class="muted">${hint}</p></div></div><textarea id="debugRawJson" readonly style="width:100%;min-height:60vh;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre;resize:vertical"></textarea><div class="settings-actions"><button id="debugRawCopy" class="primary">${copyLabel}</button><button id="debugRawBack" class="secondary">${backLabel}</button></div><p id="debugRawStatus" class="muted" role="status"></p>`;
 const area=$("#debugRawJson");if(area){area.value=body;area.focus();area.setSelectionRange?.(0,0)}
 $("#debugRawCopy").onclick=async()=>{const result=await copyAutotestText(body),ok=result?.status==="copied",status=$("#debugRawStatus");if(status)status.textContent=activeLocale==="ja"?(ok?"コピーしました。":"コピーできません。欄を選択して Ctrl+C を使用してください。"):ok?"Copied.":"Copy unavailable; select the field and use Ctrl+C.";recordDebug(ok?"DEBUG_JSON_COPIED":"DEBUG_JSON_COPY_FAILED",{method:result?.method||"none",chars:result?.chars||body.length,source:"in_page_view"})};
 $("#debugRawBack").onclick=openDebugPanel;recordDebug("DEBUG_JSON_DISPLAYED",{chars:body.length,entries:bundle.summary?.entryCount||0,tokens:bundle.summary?.tokenTotals?.total||0})
}
`;
app=replaceOnce(app,'function gameplayDebugDetail(entry){',debugHelpers+'function gameplayDebugDetail(entry){','debug helper insertion');
app=replaceOnce(app,'$("#debugExportJson").onclick=()=>downloadDebugFile("json");$("#debugExportTxt").onclick=()=>downloadDebugFile("txt");','$("#debugExportJson").onclick=()=>downloadDebugFile("json");$("#debugCopyJson").onclick=()=>{void copyCurrentDebugJson()};$("#debugShowJson").onclick=showCurrentDebugJson;$("#debugExportTxt").onclick=()=>downloadDebugFile("txt");','debug handler binding');
app=replaceOnce(app,' const evolution=worldEvolutionNeed(gameState),expand=needsExpansion(gameState),pendingPlan=pendingRuntimeGenerationPlan(gameState),enrichment=worldEnrichmentPressure(gameState);',' const anchorRepair=repairSparseWorldAnchors(gameState);if(anchorRepair.applied){bumpStateRevision(gameState,"SPARSE_WORLD_ANCHOR_REPAIR");recordDebug("WORLD_SPARSE_ANCHOR_REPAIRED",anchorRepair);await persist(gameState,captureStateSession())}\n const evolution=worldEvolutionNeed(gameState),expand=needsExpansion(gameState),pendingPlan=pendingRuntimeGenerationPlan(gameState),enrichment=worldEnrichmentPressure(gameState);','sparse anchor repair');
app=replaceOnce(app,'   const cooldownMs=checkpointed?12000:(timedOut?Math.min(15*60*1000,2*60*1000*(2**(worldBackground.failures-1))):60*1000);worldBackground.cooldownUntil=Date.now()+cooldownMs;','   const cooldownMs=checkpointed?12000:(timedOut?Math.min(15*60*1000,2*60*1000*(2**(worldBackground.failures-1))):60*1000);worldBackground.cooldownUntil=Date.now()+cooldownMs;markWorldEnrichmentBackoff(state,error,{backoffMs:cooldownMs});','world evolution persistent backoff');
app=replaceOnce(app,'   console.warn("background world evolution fallback",e);state?.events?.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_BACKGROUND_FAILED",visibility:"INTERNAL",reason:error,planId:plan.id,cooldownMs,day:state?.world?.state?.day||1,at:Date.now()});recordDebug("WORLD_EVOLUTION_BACKGROUND_FAILED",{reason,planId:plan.id,error,elapsedMs:Date.now()-debugStarted,cooldownMs,failures:worldBackground.failures})','   console.warn("background world evolution fallback",e);state?.events?.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_BACKGROUND_FAILED",visibility:"INTERNAL",reason:error,planId:plan.id,cooldownMs,day:state?.world?.state?.day||1,at:Date.now()});recordDebug("WORLD_EVOLUTION_BACKGROUND_FAILED",{reason,planId:plan.id,error,elapsedMs:Date.now()-debugStarted,cooldownMs,failures:worldBackground.failures});try{await persist(state,sessionToken)}catch(saveError){recordDebug("WORLD_EVOLUTION_FAILURE_STATE_PERSIST_FAILED",{error:saveError?.message||String(saveError)})}','persist failed evolution state');
app=replaceOnce(app,'  if(isCurrentStateSession(sessionToken)&&state&&aiStatus.aiConfigured){const next=worldEvolutionNeed(state),pending=pendingRuntimeGenerationPlan(state);if(pending||needsExpansion(state)||next.required)scheduleWorldEvolution(pending?.reason||next.reason||reason,ctrl.signal.aborted?BACKGROUND_IDLE_GRACE_MS:9000)}','  if(isCurrentStateSession(sessionToken)&&state&&aiStatus.aiConfigured){const next=worldEvolutionNeed(state),pending=pendingRuntimeGenerationPlan(state),guard=worldEnrichmentPressure(state);if(guard.backoff)recordDebug("WORLD_EVOLUTION_BACKOFF_ACTIVE",{backoffUntil:guard.backoffUntil||0,reasons:guard.reasons||[],lastError:state.world?.enrichment?.lastReason||""});else if(pending||needsExpansion(state)||next.required)scheduleWorldEvolution(pending?.reason||next.reason||reason,ctrl.signal.aborted?BACKGROUND_IDLE_GRACE_MS:9000)}','world evolution finally guard');
await write("app.js",app);

let index=await read("index.html");
index=replaceOnce(index,'"./src/version.js?v=60010":"./src/version.js?v=60029"','"./src/version.js?v=60010":"./src/version.js?v=60030"','version cache target');
index=replaceOnce(index,'"./src/world-quality.js?v=57025":"./src/v06029-world-quality-hotfix.js?v=60029"','"./src/world-quality.js?v=57025":"./src/v06029-world-quality-hotfix.js?v=60030"','quality cache target');
index=replaceOnce(index,'<script type="module" src="app.js?v=60029"></script>','<script type="module" src="app.js?v=60030"></script>','app cache target');
await write("index.html",index);

const pkg=JSON.parse(await read("package.json"));pkg.version="0.60.30";await write("package.json",JSON.stringify(pkg,null,2)+"\n");
await write("src/version.js",'export const APP_VERSION="0.60.30";\n');
await write("src/v06029-world-quality-hotfix.js",worldQualityHotfix);
await write("src/v06030-world-evolution-repair.js",evolutionRepair);
await write("test/v06030-debug-world-evolution-regression.test.js",regressionTest);

let versionTest=await read("test/version-ui.test.js");
versionTest=versionTest.replaceAll("v0.60.29","v0.60.30").replaceAll('pkg.version,"0.60.29"','pkg.version,"0.60.30"').replace('app\\.js\\?v=60029','app\\.js\\?v=60030').replace('"\\.\\/src\\/version\\.js\\?v=60010":"\\.\\/src\\/version\\.js\\?v=60029"','"\\.\\/src\\/version\\.js\\?v=60010":"\\.\\/src\\/version\\.js\\?v=60030"').replace('"\\.\\/src\\/world-quality\\.js\\?v=57025":"\\.\\/src\\/v06029-world-quality-hotfix\\.js\\?v=60029"','"\\.\\/src\\/world-quality\\.js\\?v=57025":"\\.\\/src\\/v06029-world-quality-hotfix\\.js\\?v=60030"');
await write("test/version-ui.test.js",versionTest);

let pages=await read(".github/workflows/pages.yml");
pages=pages.replace("Focused v0.60.29 regressions","Focused v0.60.30 regressions").replace("run: node --test test/v06029-background-quality-routing.test.js","run: node --test test/v06030-debug-world-evolution-regression.test.js test/v06029-background-quality-routing.test.js").replace("Verify deployed v0.60.29 source and rendered badge","Verify deployed v0.60.30 source and rendered badge").replace('version_url="${site}src/version.js?v=60029"','version_url="${site}src/version.js?v=60030"').replace('quality_url="${site}src/v06029-world-quality-hotfix.js?v=60029"','quality_url="${site}src/v06029-world-quality-hotfix.js?v=60030"').replace('compiler_url="${site}src/v06028-turn-compiler-hotfix.js?v=60028"','compiler_url="${site}src/v06028-turn-compiler-hotfix.js?v=60028"\n          app_url="${site}app.js?v=60030"').replace('compiler_body="$(curl -fsSL --retry 2 --retry-delay 1 "$compiler_url" || true)"','compiler_body="$(curl -fsSL --retry 2 --retry-delay 1 "$compiler_url" || true)"\n            app_body="$(curl -fsSL --retry 2 --retry-delay 1 "$app_url" || true)"').replace("if grep -q 'APP_VERSION=\"0.60.29\"' <<<\"$version_body\" && grep -q 'V06029_AGNES_BACKGROUND_TASK_ALIAS' <<<\"$settings_body\" && grep -q 'RETRY_AFTER_FAILURE' <<<\"$quality_body\" && grep -q 'recoverPriorAiSuggestions' <<<\"$compiler_body\"; then","if grep -q 'APP_VERSION=\"0.60.30\"' <<<\"$version_body\" && grep -q 'V06029_AGNES_BACKGROUND_TASK_ALIAS' <<<\"$settings_body\" && grep -q 'FAILURE_BACKOFF' <<<\"$quality_body\" && grep -q 'recoverPriorAiSuggestions' <<<\"$compiler_body\" && grep -q 'DEBUG_JSON_DISPLAYED' <<<\"$app_body\" && grep -q 'markWorldEnrichmentBackoff' <<<\"$app_body\"; then").replace("v0\\.60\\.29</div>","v0\\.60\\.30</div>");
await write(".github/workflows/pages.yml",pages);

console.log("Applied Elyndra v0.60.30 release patch");
