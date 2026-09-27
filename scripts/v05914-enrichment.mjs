import {readFileSync,writeFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8"),write=(p,s)=>writeFileSync(p,s,"utf8");
const need=(ok,label)=>{if(!ok)throw new Error("ENRICHMENT_PATCH_MISS:"+label)};

let lazy=read("src/lazy-generation.js");
let before=lazy;
lazy=lazy.replace('const REASONS=["PLAYER_REQUEST","WORLD_EDGE_UNDERDEFINED","WORLD_QUALITY_DROP","PERIODIC_CANON_REVIEW","CLAIM_MATERIALIZATION","BACKGROUND_GAMEPLAY"];','const REASONS=["PLAYER_REQUEST","WORLD_EDGE_UNDERDEFINED","WORLD_QUALITY_DROP","PERIODIC_CANON_REVIEW","CLAIM_MATERIALIZATION","BACKGROUND_GAMEPLAY","PROACTIVE_ENRICHMENT"];');
need(lazy!==before,"lazy reasons");
before=lazy;
lazy=lazy.replace('function slotsFor(state,reason,hasClaims){\n const politics=',`function slotsFor(state,reason,hasClaims,domain=""){
 if(reason==="PROACTIVE_ENRICHMENT"){
  const d=String(domain||"").toUpperCase();return {locations:d==="GEOGRAPHY"?1:0,npcs:d==="CAST"?1:0,factions:d==="FACTION"?1:0,sideQuests:d==="QUEST"?1:0,definitions:0}
 }
 const politics=`);
need(lazy!==before,"lazy slotsFor");
before=lazy;
lazy=lazy.replace('export function planLazyGeneration(state,{reason="BACKGROUND_GAMEPLAY"}={}){','export function planLazyGeneration(state,{reason="BACKGROUND_GAMEPLAY",domain=""}={}){');
need(lazy!==before,"lazy signature");
before=lazy;
lazy=lazy.replace('const normalizedReason=normalizeReason(reason),region=clean(state.world?.state?.region,120)||"UNKNOWN",day=', 'const normalizedReason=normalizeReason(reason),enrichmentDomain=normalizedReason==="PROACTIVE_ENRICHMENT"&&["GEOGRAPHY","CAST","FACTION","QUEST"].includes(String(domain||"").toUpperCase())?String(domain).toUpperCase():"",region=clean(state.world?.state?.region,120)||"UNKNOWN",day=');
need(lazy!==before,"lazy domain normalize");
before=lazy;
lazy=lazy.replace('const active=root.plans.find(x=>x.status==="PLANNED"&&x.reason===normalizedReason&&x.region===region&&Number(x.day)===day&&Number(x.evolution)===evolution);','const active=root.plans.find(x=>x.status==="PLANNED"&&x.reason===normalizedReason&&String(x.domain||"")===enrichmentDomain&&x.region===region&&Number(x.day)===day&&Number(x.evolution)===evolution);');
need(lazy!==before,"lazy active domain");
before=lazy;
lazy=lazy.replace('generationRevision,"attempt="+attemptEpoch,claims.map(x=>x.id).join(","),legacyEchoes.map(x=>x.id).join(",")]', 'generationRevision,"attempt="+attemptEpoch,"domain="+enrichmentDomain,claims.map(x=>x.id).join(","),legacyEchoes.map(x=>x.id).join(",")]');
need(lazy!==before,"lazy key domain");
before=lazy;
lazy=lazy.replace('const selectedClaims=rotate(claims,seed>>>5,Math.min(2,claims.length)),selectedEchoes=rotate(legacyEchoes,seed>>>9,Math.min(2,legacyEchoes.length)),definitionClaimCount=', 'const selectedClaims=enrichmentDomain?[]:rotate(claims,seed>>>5,Math.min(2,claims.length)),selectedEchoes=enrichmentDomain?[]:rotate(legacyEchoes,seed>>>9,Math.min(2,legacyEchoes.length)),definitionClaimCount=');
need(lazy!==before,"lazy proactive claims");
before=lazy;
lazy=lazy.replace('slots=slotsFor(state,normalizedReason,(selectedClaims.length-definitionClaimCount)>0||selectedEchoes.length>0);', 'slots=slotsFor(state,normalizedReason,(selectedClaims.length-definitionClaimCount)>0||selectedEchoes.length>0,enrichmentDomain);');
need(lazy!==before,"lazy domain slots call");
before=lazy;
lazy=lazy.replace('const plan={id:planId,key,seed,status:"PLANNED",reason:normalizedReason,requestedReason:', 'const plan={id:planId,key,seed,status:"PLANNED",reason:normalizedReason,domain:enrichmentDomain||null,requestedReason:');
need(lazy!==before,"lazy plan domain");
write("src/lazy-generation.js",lazy);

let app=read("app.js");
before=app;
app=app.replace('import {historyDeepeningNeed,planHistoryDeepening,validateHistoryDeepeningCandidate,commitHistoryDeepening,abortHistoryDeepening} from "./src/history-depth.js?v=57025";','import {ensureHistoryDepth,signalHistoryResearch,historyDeepeningNeed,planHistoryDeepening,validateHistoryDeepeningCandidate,commitHistoryDeepening,abortHistoryDeepening} from "./src/history-depth.js?v=57025";');
need(app!==before,"app history import");
before=app;
app=app.replace('import {worldEvolutionNeed,markWorldEvolution,worldHealthSnapshot,backgroundQualityNeed,applyUnseenWorldRepair,recordBackgroundQualityReview} from "./src/world-quality.js?v=57025";','import {worldEvolutionNeed,markWorldEvolution,worldHealthSnapshot,backgroundQualityNeed,applyUnseenWorldRepair,recordBackgroundQualityReview} from "./src/world-quality.js?v=57025";\nimport {ensureWorldEnrichment,worldEnrichmentPressure,markWorldEnrichmentScheduled,markWorldEnrichmentCompleted,markWorldEnrichmentSkipped} from "./src/world-enrichment.js?v=59014";');
need(app!==before,"app enrichment import");
before=app;
app=app.replace('ensurePlayerOrigin(s.player);ensureItemRuntime(s);','ensurePlayerOrigin(s.player);ensureHistoryDepth(s);ensureWorldEnrichment(s);ensureItemRuntime(s);');
need(app!==before,"app migrate enrichment");
const oldBlock=` const evolution=worldEvolutionNeed(gameState),expand=needsExpansion(gameState),pendingPlan=pendingRuntimeGenerationPlan(gameState);
 if(!expand&&!evolution.required&&!pendingPlan){worldBackground.queued=false;return}
 const state=gameState,sessionToken=captureStateSession(),worldId=gameState.world?.id,reason=pendingPlan?.reason||(evolution.required?evolution.reason:(worldBackground.lastReason||"background_gameplay")),plan=pendingPlan||planLazyGeneration(gameState,{reason}),ctrl=new AbortController(),debugStarted=Date.now();`;
const newBlock=` const evolution=worldEvolutionNeed(gameState),expand=needsExpansion(gameState),pendingPlan=pendingRuntimeGenerationPlan(gameState),enrichment=worldEnrichmentPressure(gameState);
 recordDebug("WORLD_ENRICHMENT_PRESSURE",{turn:enrichment.turn,elapsedTurns:enrichment.elapsedTurns,pressure:enrichment.pressure,threshold:enrichment.threshold||60,domain:enrichment.domain||null,reasons:enrichment.reasons||[],required:enrichment.required===true,backoff:enrichment.backoff===true,backoffUntil:enrichment.backoffUntil||0});
 if(enrichment.backoff)recordDebug("WORLD_ENRICHMENT_BACKOFF",{domain:enrichment.domain||null,pressure:enrichment.pressure||0,backoffUntil:enrichment.backoffUntil||0,reasons:enrichment.reasons||[]});
 if(!expand&&!evolution.required&&!pendingPlan&&!enrichment.required){worldBackground.queued=false;recordDebug("WORLD_ENRICHMENT_SKIPPED",{reason:"PRESSURE_BELOW_THRESHOLD",pressure:enrichment.pressure||0,domain:enrichment.domain||null});return}
 const state=gameState,sessionToken=captureStateSession(),worldId=gameState.world?.id;
 if(!pendingPlan&&enrichment.required&&enrichment.domain==="HISTORY"){
  const record=(state.world?.historyDepth?.records||[]).find(x=>String(x?.depth||"SKELETON").toUpperCase()==="SKELETON");
  if(record&&signalHistoryResearch(state,record.historyId,{reason:"PROACTIVE_ENRICHMENT",targetDepth:"OUTLINE"}).ok){markWorldEnrichmentScheduled(state,enrichment);recordDebug("WORLD_ENRICHMENT_SCHEDULED",{domain:"HISTORY",pressure:enrichment.pressure,turn:enrichment.turn,reasons:enrichment.reasons});scheduleHistoryDeepening("proactive_enrichment",900);worldBackground.queued=false;return}
  markWorldEnrichmentSkipped(state,enrichment,"HISTORY_TARGET_UNAVAILABLE");recordDebug("WORLD_ENRICHMENT_SKIPPED",{reason:"HISTORY_TARGET_UNAVAILABLE",domain:"HISTORY",pressure:enrichment.pressure});
 }
 const reason=pendingPlan?.reason||(enrichment.required?"PROACTIVE_ENRICHMENT":(evolution.required?evolution.reason:(worldBackground.lastReason||"background_gameplay"))),plan=pendingPlan||planLazyGeneration(gameState,{reason,domain:enrichment.required?enrichment.domain:""}),ctrl=new AbortController(),debugStarted=Date.now();
 if(enrichment.required&&!pendingPlan){markWorldEnrichmentScheduled(state,enrichment);recordDebug("WORLD_ENRICHMENT_SCHEDULED",{domain:enrichment.domain,pressure:enrichment.pressure,turn:enrichment.turn,reasons:enrichment.reasons,planId:plan.id});}`;
need(app.includes(oldBlock),"app background block");app=app.replace(oldBlock,newBlock);
// Existing successful background apply telemetry is the safest completion hook: enrich only when this run was proactive.
const appliedToken='recordDebug("WORLD_EVOLUTION_BACKGROUND_APPLIED",';
if(app.includes(appliedToken))app=app.replace(appliedToken,'if(reason==="PROACTIVE_ENRICHMENT"){markWorldEnrichmentCompleted(state,enrichment,{domain:enrichment.domain,reason});recordDebug("WORLD_ENRICHMENT_COMPLETED",{domain:enrichment.domain,pressureBefore:enrichment.pressure,pressureAfter:worldEnrichmentPressure(state).pressure,turn:enrichment.turn,planId:plan.id})}'+appliedToken);
else console.log("WARN: completion token not found; scheduled-turn cooldown remains active");
write("app.js",app);

console.log("v0.59.14 proactive enrichment patch applied");
