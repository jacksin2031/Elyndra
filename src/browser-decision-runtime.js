import {recordDebug} from "./debug-telemetry.js?v=61008";
import {BROWSER_DECISION_MODE,BROWSER_DECISION_TASK} from "./browser-decision-contract.js?v=61008";
import {createBrowserDecisionEngine} from "./browser-decision-engine.js?v=61008";
import {BROWSER_ACTION_BENCHMARK,summarizeBrowserDecisionBenchmark} from "./browser-decision-benchmark.js?v=61008";
import {loadBrowserDecisionSettings} from "./browser-decision-settings.js?v=61008";

let engine=null,modelLoadPromise=null;
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
export async function classifyBrowserActionShadow(action,state={}){
 const settings=loadBrowserDecisionSettings();if(!settings.enabled)return null;
 const started=Date.now();
 try{
  const e=currentEngine();await loadBrowserDecisionModel();
  const result=await e.evaluate({task:BROWSER_DECISION_TASK.ACTION_CLASSIFICATION,payload:{action:String(action||"").slice(0,300)},context:{combat:Boolean(state?.combat?.active),location:String(state?.player?.location||"").slice(0,120)}});
  recordDebug("BROWSER_DECISION_ACTION_SHADOW",{action:String(action||"").slice(0,180),route:result?.metadata?.route||null,confidence:result?.confidence||0,scores:result?.metadata?.scores||{},engine:result?.engine||"NONE",modelVersion:result?.modelVersion||"",latencyMs:Date.now()-started,decision:result?.decision||"UNCERTAIN"});
  return result
 }catch(error){
  recordDebug("BROWSER_DECISION_ACTION_SHADOW_FAILED",{action:String(action||"").slice(0,180),error:String(error?.message||error).slice(0,300),latencyMs:Date.now()-started});
  return null
 }
}
export function recordBrowserDecisionAssessmentComparison(action,result,assessment={}){
 if(!result)return null;
 const row={action:String(action||"").slice(0,180),browserRoute:result?.metadata?.route||null,browserConfidence:result?.confidence||0,assessmentVerdict:assessment?.verdict||null,assessmentKind:assessment?.kind||null,assessmentIntent:assessment?.actionIntent?.intent||assessment?.intent||null,assessmentSource:assessment?.source||null};
 recordDebug("BROWSER_DECISION_SHADOW_COMPARE",row);return row
}
export async function disposeBrowserDecisionRuntime(){if(engine)await engine.dispose();engine=null;modelLoadPromise=null}
