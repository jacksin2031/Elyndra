import {recordDebug} from "./debug-telemetry.js?v=61009";
import {BROWSER_DECISION_MODE,BROWSER_DECISION_TASK} from "./browser-decision-contract.js?v=61009";
import {createBrowserDecisionEngine} from "./browser-decision-engine.js?v=61009";
import {BROWSER_ACTION_BENCHMARK,summarizeBrowserDecisionBenchmark} from "./browser-decision-benchmark.js?v=61009";
import {BROWSER_DECISION_TASK_BENCHMARK,summarizeBrowserDecisionTaskBenchmark} from "./browser-decision-task-benchmark.js?v=61009";
import {loadBrowserDecisionSettings} from "./browser-decision-settings.js?v=61009";

let engine=null,modelLoadPromise=null;
const list=value=>Array.isArray(value)?value:[];
const text=(value,max=180)=>String(value??"").trim().slice(0,max);

function currentEngine(){
 const settings=loadBrowserDecisionSettings();
 if(!engine)engine=createBrowserDecisionEngine({config:{mode:BROWSER_DECISION_MODE.SHADOW_ONLY,acceptThreshold:Math.max(.9,settings.minConfidence),uncertainThreshold:settings.minConfidence}});
 return engine
}
export async function browserDecisionStatus(){
 const settings=loadBrowserDecisionSettings(),e=currentEngine(),status=await e.init();
 return {...status,enabled:settings.enabled,settings}
}
export async function loadBrowserDecisionModel({onProgress=null}={}){
 const settings=loadBrowserDecisionSettings();if(!settings.enabled)throw new Error("BROWSER_DECISION_DISABLED");
 const e=currentEngine();await e.init();
 if(e.status().modelReady)return e.status().modelProfile;
 if(!modelLoadPromise)modelLoadPromise=e.loadModel({model:settings.model,device:"auto",onProgress,timeoutMs:300000}).finally(()=>{modelLoadPromise=null});
 return modelLoadPromise
}
export async function runBrowserDecisionBenchmark({onProgress=null}={}){
 const e=currentEngine();await loadBrowserDecisionModel({onProgress});
 return summarizeBrowserDecisionBenchmark(await e.benchmark(BROWSER_ACTION_BENCHMARK))
}
export async function runBrowserDecisionTaskBenchmark({onProgress=null}={}){
 const e=currentEngine();await loadBrowserDecisionModel({onProgress});
 return summarizeBrowserDecisionTaskBenchmark(await e.benchmark({suite:"TASKS",cases:BROWSER_DECISION_TASK_BENCHMARK}))
}
export async function runBrowserDecisionFullBenchmark({onProgress=null}={}){
 const action=await runBrowserDecisionBenchmark({onProgress}),tasks=await runBrowserDecisionTaskBenchmark();
 return {action,tasks,totalCases:Number(action?.cases||0)+Number(tasks?.cases||0),correct:Number(action?.correct||0)+Number(tasks?.correct||0)}
}
async function evaluateShadow(task,payload={},context={},telemetryType="BROWSER_DECISION_TASK_SHADOW"){
 const settings=loadBrowserDecisionSettings();if(!settings.enabled)return null;
 const started=Date.now();
 try{
  const e=currentEngine();await loadBrowserDecisionModel();
  const result=await e.evaluate({task,payload,context});
  recordDebug(telemetryType,{task,decision:result?.decision||"UNCERTAIN",confidence:result?.confidence||0,reasonCodes:result?.reasonCodes||[],engine:result?.engine||"NONE",modelVersion:result?.modelVersion||"",latencyMs:Date.now()-started,metadata:result?.metadata||{}});
  return result
 }catch(error){
  recordDebug(telemetryType+"_FAILED",{task,error:text(error?.message||error,300),latencyMs:Date.now()-started});
  return null
 }
}

export async function classifyBrowserActionShadow(action,state={}){
 const result=await evaluateShadow(BROWSER_DECISION_TASK.ACTION_CLASSIFICATION,{action:text(action,300)},{combat:Boolean(state?.combat?.active),location:text(state?.player?.location,120)},"BROWSER_DECISION_ACTION_SHADOW");
 return result
}
export function recordBrowserDecisionAssessmentComparison(action,result,assessment={}){
 if(!result)return null;
 const row={action:text(action),browserRoute:result?.metadata?.route||null,browserConfidence:result?.confidence||0,assessmentVerdict:assessment?.verdict||null,assessmentKind:assessment?.kind||null,assessmentIntent:assessment?.actionIntent?.intent||assessment?.intent||null,assessmentSource:assessment?.source||null};
 recordDebug("BROWSER_DECISION_SHADOW_COMPARE",row);return row
}

function playerLocationIds(state={}){
 const raw=[state?.player?.locationId,state?.world?.state?.locationId,state?.player?.location,state?.world?.state?.location].map(x=>String(x||"")).filter(Boolean);
 return new Set(raw)
}
function browserActionLegalityContext(action,state={}){
 const inventoryNames=list(state?.inventory).map(x=>text(x?.name,120)).filter(Boolean),knownAbilities=[
  ...list(state?.player?.magic?.knownSpells||state?.magic?.knownSpells).flatMap(x=>[text(x?.name,120),text(x?.effect,180)]),
  ...list(state?.player?.talents||state?.talents).flatMap(x=>[text(x?.name||x,120),text(x?.description,180)])
 ].filter(Boolean),registry=state?.world?.registry||{},npcs=list(registry.npcs),locations=list(registry.locations),locIds=playerLocationIds(state),presentNpcNames=npcs.filter(n=>n?.alive!==false&&(n?.companion?.status==="ACTIVE"||locIds.has(String(n?.locationId||""))||locIds.has(String(n?.location||"")))).map(n=>text(n?.name,120)).filter(Boolean),knownNpcNames=npcs.map(n=>text(n?.name,120)).filter(Boolean),reachableLocations=locations.filter(x=>x?.known===true).map(x=>text(x?.name,120)).filter(Boolean),hardBlockSignals=[],q=String(action||"");
 const extraordinary=/瞬間移動|直接飛行|飛上天空|teleport|\bfly\b|ワープ|瞬間移動|空を飛/iu.test(q),hasMobility=knownAbilities.some(x=>/飛|傳送|移動|teleport|flight|warp|飛行|転移/iu.test(x));
 if(extraordinary&&!hasMobility)hardBlockSignals.push("UNSUPPORTED_TELEPORT_OR_FLIGHT");
 for(const npc of knownNpcNames)if(npc&&q.includes(npc)&&!presentNpcNames.includes(npc)){hardBlockSignals.push("KNOWN_TARGET_ABSENT");break}
 return {playerStatus:text(state?.player?.status||"ACTIVE",40).toUpperCase(),inventoryNames,knownAbilities,presentNpcNames,reachableLocations,currentLocation:text(state?.player?.location||state?.world?.state?.location,120),hardBlockSignals}
}
export function evaluateActionLegalityShadow(action,state={}){
 return evaluateShadow(BROWSER_DECISION_TASK.ACTION_LEGALITY,{action:text(action,300)},browserActionLegalityContext(action,state),"BROWSER_DECISION_ACTION_LEGALITY_SHADOW")
}
export function recordBrowserDecisionLegalityComparison(action,result,assessment={}){
 if(!result)return null;
 const expected=assessment?.verdict==="BLOCK"?"REJECT":assessment?.verdict==="ADJUST"?"UNCERTAIN":assessment?.verdict==="ALLOW"?"ACCEPT":"UNKNOWN",row={action:text(action),browserDecision:result.decision,browserConfidence:result.confidence,expectedDecision:expected,match:expected==="UNKNOWN"?null:result.decision===expected,assessmentVerdict:assessment?.verdict||null,assessmentSource:assessment?.source||null,reasonCodes:result.reasonCodes||[]};
 recordDebug("BROWSER_DECISION_ACTION_LEGALITY_COMPARE",row);return row
}

export function evaluateOriginComplianceShadow({openingHook="",originOpening={},anchor={}}={}){
 const safeAnchor={worldName:text(anchor?.worldName||anchor?.name,160),hiddenFacts:list(anchor?.hiddenFacts).map(x=>text(typeof x==="string"?x:x?.text||x?.title,300)).filter(Boolean)};
 return evaluateShadow(BROWSER_DECISION_TASK.ORIGIN_COMPLIANCE,{openingHook:text(openingHook,2200),originOpening:{worldNameKnown:originOpening?.worldNameKnown===true,narrativeIdentity:originOpening?.narrativeIdentity||{}},anchor:safeAnchor},{},"BROWSER_DECISION_ORIGIN_SHADOW")
}
export function recordBrowserDecisionOriginComparison(result,official={}){
 if(!result)return null;const expected=official?.status==="FAIL"?"REJECT":official?.status==="PASS"?"ACCEPT":"UNCERTAIN",row={browserDecision:result.decision,browserConfidence:result.confidence,expectedDecision:expected,match:result.decision===expected,officialStatus:official?.status||"UNKNOWN",officialErrors:list(official?.errors).slice(0,12),reasonCodes:result.reasonCodes||[]};recordDebug("BROWSER_DECISION_ORIGIN_COMPARE",row);return row
}

export function evaluateNarrativeConsistencyShadow(scene={},context={}){
 const scope=context?.scope||{},expectedOutcome=context?.expectedOutcome||"",payload={scene:{outcome:text(scene?.outcome,30),sceneTitle:text(scene?.sceneTitle,180),narrative:text(scene?.narrative,2000)}},shadowContext={expectedOutcome:text(expectedOutcome,30).toUpperCase(),currentLocation:text(scope.currentLocation,160),presentNpcNames:list(scope.presentNpcNames).map(x=>text(x,120)),allNpcNames:list(scope.allNpcNames).map(x=>text(x,120)),knownLocations:list(scope.knownLocations).map(x=>text(x,120)),actionKind:text(scope.actionKind||scope.kind,40).toUpperCase(),forbiddenClaims:list(context?.forbiddenClaims).map(x=>text(x,220))};
 return evaluateShadow(BROWSER_DECISION_TASK.NARRATIVE_CONSISTENCY,payload,shadowContext,"BROWSER_DECISION_NARRATIVE_SHADOW")
}
export function recordBrowserDecisionNarrativeComparison(result,{sceneValid=true,narrativeSource="AI",rejectReason="",issues=[]}={}){
 if(!result)return null;const expected=sceneValid&&narrativeSource==="AI"?"ACCEPT":"REJECT",row={browserDecision:result.decision,browserConfidence:result.confidence,expectedDecision:expected,match:result.decision===expected,sceneValid:Boolean(sceneValid),narrativeSource,rejectReason,issues:list(issues).slice(0,12),reasonCodes:result.reasonCodes||[]};recordDebug("BROWSER_DECISION_NARRATIVE_COMPARE",row);return row
}

export function evaluateAiOutputAcceptanceShadow(kind,output,context={}){
 const safeContext={expectedOutcome:text(context?.expectedOutcome,30).toUpperCase(),baseRevision:Number.isFinite(Number(context?.baseRevision??context?.plan?.baseRevision))?Number(context?.baseRevision??context?.plan?.baseRevision):null,capabilities:list(context?.capabilities||context?.plan?.capabilities).map(x=>text(x,80).toUpperCase())};
 return evaluateShadow(BROWSER_DECISION_TASK.AI_OUTPUT_ACCEPTANCE,{kind:text(kind,40).toUpperCase(),output},safeContext,"BROWSER_DECISION_AI_OUTPUT_SHADOW")
}
export function recordBrowserDecisionAiOutputComparison(kind,result,{accepted=false,reasons=[],hardRejects=0}={}){
 if(!result)return null;const expected=accepted?"ACCEPT":"REJECT",row={kind:text(kind,40).toUpperCase(),browserDecision:result.decision,browserConfidence:result.confidence,expectedDecision:expected,match:result.decision===expected,officialAccepted:Boolean(accepted),hardRejects:Number(hardRejects)||0,officialReasons:list(reasons).slice(0,16),reasonCodes:result.reasonCodes||[]};recordDebug("BROWSER_DECISION_AI_OUTPUT_COMPARE",row);return row
}
export async function disposeBrowserDecisionRuntime(){if(engine)await engine.dispose();engine=null;modelLoadPromise=null}
