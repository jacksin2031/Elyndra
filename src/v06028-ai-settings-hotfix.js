import * as base from "./ai-settings.js?v=60012&base=1";
export * from "./ai-settings.js?v=60012&base=1";

export const V06028_SCENE_TIMEOUT_MS=10500;

function sceneTimeoutError(){
 const error=new Error(`AI_TIMEOUT: provider did not complete within ${Math.round(V06028_SCENE_TIMEOUT_MS/1000*10)/10} seconds`);
 error.code="AI_TIMEOUT";
 return error
}

export async function directChat(args={}){
 if(String(args?.aiTask||"").toLowerCase()!=="scene"||args?.disableTimeout===true)return base.directChat(args);
 const parent=args?.signal;
 if(parent?.aborted)return base.directChat(args);
 const controller=new AbortController();
 const onParentAbort=()=>{try{controller.abort(parent?.reason)}catch{}};
 parent?.addEventListener?.("abort",onParentAbort,{once:true});
 let timer=0;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{const error=sceneTimeoutError();try{controller.abort(error)}catch{}reject(error)},V06028_SCENE_TIMEOUT_MS)});
 try{
  return await Promise.race([base.directChat({...args,signal:controller.signal,disableTimeout:true}),timeout])
 }finally{
  if(timer)clearTimeout(timer);
  parent?.removeEventListener?.("abort",onParentAbort)
 }
}
