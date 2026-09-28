import * as base from "./ai-settings.js?v=60012&base=1";
export * from "./ai-settings.js?v=60012&base=1";

export const V06028_SCENE_TIMEOUT_MS=10500;
export const V06029_AGNES_BACKGROUND_TASK_ALIAS=Object.freeze({quality:"runtime_quality",quality_repair:"runtime_quality"});

export function v06029RouteBackgroundStructuredTask(args={},provider=""){
 const task=String(args?.aiTask||"").toLowerCase(),route=V06029_AGNES_BACKGROUND_TASK_ALIAS[task];
 if(String(provider||"").toLowerCase()!=="agnes"||!route)return args;
 const requested=Math.round(Number(args?.maxOutputTokens)||1300);
 return {...args,aiTask:route,disableOptimization:true,maxOutputTokens:Math.max(900,Math.min(1600,requested))}
}

function sceneTimeoutError(){
 const error=new Error(`AI_TIMEOUT: provider did not complete within ${Math.round(V06028_SCENE_TIMEOUT_MS/1000*10)/10} seconds`);
 error.code="AI_TIMEOUT";
 return error
}

export async function directChat(args={}){
 const provider=base.loadAISettings?.().provider||"",routed=v06029RouteBackgroundStructuredTask(args,provider);
 if(String(routed?.aiTask||"").toLowerCase()!=="scene"||routed?.disableTimeout===true)return base.directChat(routed);
 const parent=routed?.signal;
 if(parent?.aborted)return base.directChat(routed);
 const controller=new AbortController();
 const onParentAbort=()=>{try{controller.abort(parent?.reason)}catch{}};
 parent?.addEventListener?.("abort",onParentAbort,{once:true});
 let timer=0;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{const error=sceneTimeoutError();try{controller.abort(error)}catch{}reject(error)},V06028_SCENE_TIMEOUT_MS)});
 try{
  return await Promise.race([base.directChat({...routed,signal:controller.signal,disableTimeout:true}),timeout])
 }finally{
  if(timer)clearTimeout(timer);
  parent?.removeEventListener?.("abort",onParentAbort)
 }
}
