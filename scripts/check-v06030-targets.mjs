import {readFile} from "node:fs/promises";
const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
const index=await readFile(new URL("../index.html",import.meta.url),"utf8");
const group=process.argv[2]||"all";
const checks={
 imports:[
  ['world-enrichment import','import {ensureWorldEnrichment,worldEnrichmentPressure,markWorldEnrichmentScheduled,markWorldEnrichmentCompleted,markWorldEnrichmentSkipped} from "./src/world-enrichment.js?v=59014";'],
  ['world-quality import','import {worldEvolutionNeed,markWorldEvolution,worldHealthSnapshot,backgroundQualityNeed,applyUnseenWorldRepair,recordBackgroundQualityReview} from "./src/world-quality.js?v=57025";']
 ],
 debug:[
  ['debug action buttons','<button id=\\"debugExportJson\\" class=\\"primary\\">匯出 Debug JSON</button><button id=\\"debugExportTxt\\" class=\\"secondary\\">匯出摘要 TXT</button>'],
  ['debug helper insertion','function gameplayDebugDetail(entry){'],
  ['debug handler binding','$("#debugExportJson").onclick=()=>downloadDebugFile("json");$("#debugExportTxt").onclick=()=>downloadDebugFile("txt");']
 ],
 schedule:[
  ['evolution preflight',' const evolution=worldEvolutionNeed(gameState),expand=needsExpansion(gameState),pendingPlan=pendingRuntimeGenerationPlan(gameState),enrichment=worldEnrichmentPressure(gameState);'],
  ['evolution finally','  if(isCurrentStateSession(sessionToken)&&state&&aiStatus.aiConfigured){const next=worldEvolutionNeed(state),pending=pendingRuntimeGenerationPlan(state);if(pending||needsExpansion(state)||next.required)scheduleWorldEvolution(pending?.reason||next.reason||reason,ctrl.signal.aborted?BACKGROUND_IDLE_GRACE_MS:9000)}']
 ],
 failure:[
  ['cooldown','   const cooldownMs=checkpointed?12000:(timedOut?Math.min(15*60*1000,2*60*1000*(2**(worldBackground.failures-1))):60*1000);worldBackground.cooldownUntil=Date.now()+cooldownMs;'],
  ['failure event','   console.warn("background world evolution fallback",e);state?.events?.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_BACKGROUND_FAILED",visibility:"INTERNAL",reason:error,planId:plan.id,cooldownMs,day:state?.world?.state?.day||1,at:Date.now()});recordDebug("WORLD_EVOLUTION_BACKGROUND_FAILED",{reason,planId:plan.id,error,elapsedMs:Date.now()-debugStarted,cooldownMs,failures:worldBackground.failures})']
 ],
 index:[
  ['version import map','"./src/version.js?v=60010":"./src/version.js?v=60029"'],
  ['quality import map','"./src/world-quality.js?v=57025":"./src/v06029-world-quality-hotfix.js?v=60029"'],
  ['app cache','<script type="module" src="app.js?v=60029"></script>']
 ]
};
const selected=group==="all"?Object.entries(checks):[[group,checks[group]]];
if(!selected[0]?.[1])throw new Error("UNKNOWN_GROUP:"+group);
let failed=false;
for(const [g,rows] of selected){for(const [label,needle] of rows){const hay=g==="index"?index:app;const count=hay.split(needle).length-1;console.log(`${g}:${label}=${count}`);if(count!==1)failed=true}}
if(failed)process.exit(1);
