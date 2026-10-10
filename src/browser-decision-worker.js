const TRANSFORMERS_CDN="https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";
const DEFAULT_MODEL=Object.freeze({
 id:"Xenova/paraphrase-multilingual-MiniLM-L12-v2",
 revision:"2c4055b12046f11709e9df2c122e59ffbdc2f900",
 webgpuDtype:"fp16",
 wasmDtype:"q8"
});
const ACTION_ANCHORS=Object.freeze({
 LOCAL:[
  "查看背包和物品","查看角色狀態與能力","閱讀旅程紀錄或系統資訊","查看旅程紀錄並回顧已發生的事件","打開冒險日誌查看過去紀錄",
  "インベントリや持ち物を確認する","キャラクターの状態や能力を見る","旅の記録や冒険日誌を読み返す","これまでの旅の履歴を確認する",
  "open inventory and inspect items","check character status or journal","read the journey log and review past events"
 ],
 COMBAT:[
  "攻擊眼前的敵人","在戰鬥中防禦或撤退","拔出武器與敵人戰鬥",
  "目の前の敵を攻撃する","戦闘で防御するか撤退する",
  "attack the enemy in combat","defend or retreat from combat"
 ],
 ADVENTURE:[
  "探索周圍環境並尋找線索","和眼前的 NPC 交談詢問情報","前往已知地點繼續冒險","調查神秘遺跡",
  "周囲を探索して手掛かりを探す","NPCに話しかけて情報を聞く","既知の場所へ移動して冒険を続ける",
  "explore the surroundings for clues","talk to an NPC and ask about rumors","travel to a known place"
 ]
});
let gpuDevice=null,gpuAdapter=null,computeReady=false;
let pipelineFactory=null,hfEnv=null,extractor=null,anchorVectors=null,modelProfile=null,modelLoading=null;
const now=()=>globalThis.performance?.now?.()??Date.now();
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const dot=(a,b)=>{let sum=0;const n=Math.min(a?.length||0,b?.length||0);for(let i=0;i<n;i++)sum+=Number(a[i]||0)*Number(b[i]||0);return sum};
const mean=rows=>{if(!rows.length)return [];const out=Array(rows[0].length).fill(0);for(const row of rows)for(let i=0;i<out.length;i++)out[i]+=Number(row[i]||0);for(let i=0;i<out.length;i++)out[i]/=rows.length;const norm=Math.sqrt(out.reduce((s,x)=>s+x*x,0))||1;return out.map(x=>x/norm)};
function safeProgress(info={}){return {status:String(info?.status||""),file:String(info?.file||"").slice(0,180),progress:Number.isFinite(Number(info?.progress))?Number(info.progress):null,loaded:Number.isFinite(Number(info?.loaded))?Number(info.loaded):null,total:Number.isFinite(Number(info?.total))?Number(info.total):null}}
function sendProgress(id,info){globalThis.postMessage?.({id,type:"PROGRESS",progress:safeProgress(info)})}

async function runComputeProbe(device){
 const usage=globalThis.GPUBufferUsage,mapMode=globalThis.GPUMapMode,shaderStage=globalThis.GPUShaderStage;
 if(!usage||!mapMode||!shaderStage)return false;
 const shader=device.createShaderModule({code:"@group(0) @binding(0) var<storage, read_write> output: array<u32>; @compute @workgroup_size(1) fn main(){ output[0]=7u; }"});
 const bindGroupLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:shaderStage.COMPUTE,buffer:{type:"storage"}}]});
 const descriptor={layout:device.createPipelineLayout({bindGroupLayouts:[bindGroupLayout]}),compute:{module:shader,entryPoint:"main"}};
 const pipeline=typeof device.createComputePipelineAsync==="function"?await device.createComputePipelineAsync(descriptor):device.createComputePipeline(descriptor);
 const storage=device.createBuffer({size:4,usage:usage.STORAGE|usage.COPY_SRC}),readback=device.createBuffer({size:4,usage:usage.COPY_DST|usage.MAP_READ});
 try{
  const bindGroup=device.createBindGroup({layout:bindGroupLayout,entries:[{binding:0,resource:{buffer:storage}}]});
  const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.dispatchWorkgroups(1);pass.end();
  encoder.copyBufferToBuffer(storage,0,readback,0,4);device.queue.submit([encoder.finish()]);await readback.mapAsync(mapMode.READ);
  const value=new Uint32Array(readback.getMappedRange().slice(0))[0];readback.unmap();return value===7;
 }finally{storage.destroy?.();readback.destroy?.()}
}

async function probeWebGpu(timeoutMs=3500){
 if(computeReady&&gpuDevice)return true;
 if(!globalThis.navigator?.gpu)return false;
 const probe=(async()=>{
  try{
   const adapter=await globalThis.navigator.gpu.requestAdapter();if(!adapter)return false;
   const device=await adapter.requestDevice(),ok=await runComputeProbe(device);
   if(!ok){try{device.destroy?.()}catch{}return false}
   gpuAdapter=adapter;gpuDevice=device;computeReady=true;
   gpuDevice?.lost?.then?.(()=>{gpuDevice=null;gpuAdapter=null;computeReady=false;if(modelProfile?.device==="webgpu"){extractor=null;anchorVectors=null;modelProfile=null}}).catch?.(()=>{});
   return true
  }catch{return false}
 })();
 const timeout=new Promise(resolve=>setTimeout(()=>resolve(false),Math.max(500,Number(timeoutMs)||3500)));
 return Boolean(await Promise.race([probe,timeout]))
}
async function initWorker(){
 return {ready:true,webgpu:Boolean(globalThis.navigator?.gpu),computeReady,modelReady:Boolean(extractor),modelProfile};
}

async function transformers(){
 if(pipelineFactory)return {pipeline:pipelineFactory,env:hfEnv};
 const lib=await import(TRANSFORMERS_CDN);pipelineFactory=lib.pipeline;hfEnv=lib.env;
 if(hfEnv){hfEnv.useBrowserCache=true;hfEnv.useWasmCache=true;hfEnv.allowRemoteModels=true}
 return {pipeline:pipelineFactory,env:hfEnv};
}
async function embed(texts){
 const input=Array.isArray(texts)?texts:[texts],out=await extractor(input,{pooling:"mean",normalize:true}),rows=out.tolist();
 return Array.isArray(rows?.[0])?rows:[rows];
}
async function prepareAnchors(){
 const labels=Object.keys(ACTION_ANCHORS),texts=[],owners=[];
 for(const label of labels)for(const value of ACTION_ANCHORS[label]){texts.push(value);owners.push(label)}
 const rows=await embed(texts),grouped={};for(const label of labels)grouped[label]=[];
 rows.forEach((row,index)=>grouped[owners[index]].push(row));
 anchorVectors=grouped;
}

async function loadModel(payload={},requestId=""){
 const requested=String(payload?.device||"auto").toLowerCase(),model={...DEFAULT_MODEL,...(payload?.model||{})};
 let device=requested==="wasm"?"wasm":((await probeWebGpu(Number(payload?.gpuProbeTimeoutMs)||3500))?"webgpu":"wasm"),dtype=device==="webgpu"?(model.webgpuDtype||"fp16"):(model.wasmDtype||"q8"),fallbackReason=requested!=="wasm"&&device==="wasm"?"WEBGPU_PROBE_FAILED":"";
 const same=extractor&&modelProfile?.id===model.id&&modelProfile?.revision===model.revision&&modelProfile?.device===device&&modelProfile?.dtype===dtype;
 if(same)return {...modelProfile,ready:true,cached:true};
 if(modelLoading)return modelLoading;
 modelLoading=(async()=>{
  const started=now(),{pipeline}=await transformers();
  try{extractor=await pipeline("feature-extraction",model.id,{device,dtype,revision:model.revision,progress_callback:info=>sendProgress(requestId,info)})}
  catch(error){
   if(device!=="webgpu")throw error;
   fallbackReason="WEBGPU_MODEL_LOAD_FAILED:"+String(error?.message||error).slice(0,180);
   sendProgress(requestId,{status:"fallback",file:"webgpu-to-wasm"});extractor=null;anchorVectors=null;device="wasm";dtype=model.wasmDtype||"q8";
   extractor=await pipeline("feature-extraction",model.id,{device,dtype,revision:model.revision,progress_callback:info=>sendProgress(requestId,info)})
  }
  await prepareAnchors();
  modelProfile={id:model.id,revision:model.revision,device,dtype,requestedDevice:requested,fallbackReason,loadedAt:Date.now(),loadLatencyMs:Math.max(0,Math.round(now()-started)),anchorCount:Object.values(ACTION_ANCHORS).reduce((n,x)=>n+x.length,0)};
  return {...modelProfile,ready:true,cached:false};
 })();
 try{return await modelLoading}catch(error){extractor=null;anchorVectors=null;modelProfile=null;throw error}finally{modelLoading=null}
}

function classificationFromVector(vector){
 const scores=Object.fromEntries(Object.entries(anchorVectors||{}).map(([label,anchors])=>[label,Math.max(-1,...anchors.map(anchor=>dot(vector,anchor)))]));
 const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]),[topLabel,topScore]=ranked[0]||["ADVENTURE",0],secondScore=ranked[1]?.[1]??0,margin=topScore-secondScore;
 const confidence=clamp(.48+Math.max(0,topScore-.25)*.45+Math.max(0,margin)*1.65);
 return {route:topLabel,confidence,scores:Object.fromEntries(ranked.map(([k,v])=>[k,Math.round(v*10000)/10000])),margin:Math.round(margin*10000)/10000};
}
async function classifyActions(actions=[]){
 if(!extractor||!anchorVectors)throw new Error("BROWSER_DECISION_MODEL_NOT_LOADED");
 const texts=actions.map(x=>String(x||"").trim()).filter(Boolean);
 if(!texts.length)return [];
 const vectors=await embed(texts);return vectors.map((vector,index)=>({action:texts[index],...classificationFromVector(vector)}));
}
async function evaluate(request={}){
 const started=now(),task=String(request?.task||""),action=String(request?.payload?.action||"").trim();
 if(!extractor||!anchorVectors)return {decision:"UNCERTAIN",confidence:0,reasonCodes:["MODEL_NOT_LOADED"],engine:computeReady?"WEBGPU":"WASM",modelVersion:"unloaded",latencyMs:Math.max(0,Math.round(now()-started)),metadata:{task,computeReady,modelReady:false}};
 if(task==="ACTION_CLASSIFICATION"||task==="NEED_AI_ROUTING"){
  const classified=(await classifyActions([action]))[0]||{route:"ADVENTURE",confidence:0,scores:{},margin:0};
  const uncertain=classified.confidence<.65,needsAi=classified.route==="ADVENTURE";
  return {
   decision:uncertain?"UNCERTAIN":(task==="NEED_AI_ROUTING"&&needsAi?"NEEDS_AI":"ACCEPT"),
   confidence:classified.confidence,
   reasonCodes:uncertain?["LOW_CLASSIFICATION_CONFIDENCE"]:["LOCAL_MODEL_CLASSIFIED"],
   engine:modelProfile?.device==="webgpu"?"WEBGPU":"WASM",
   modelVersion:modelProfile?modelProfile.id+"@"+modelProfile.revision.slice(0,8):"unloaded",
   latencyMs:Math.max(0,Math.round(now()-started)),
   metadata:{task,route:classified.route,needsAi,scores:classified.scores,margin:classified.margin,dtype:modelProfile?.dtype}
  };
 }
 return {decision:"UNCERTAIN",confidence:0,reasonCodes:["TASK_MODEL_NOT_IMPLEMENTED"],engine:modelProfile?.device==="webgpu"?"WEBGPU":"WASM",modelVersion:modelProfile?modelProfile.id+"@"+modelProfile.revision.slice(0,8):"unloaded",latencyMs:Math.max(0,Math.round(now()-started)),metadata:{task}};
}

async function benchmark(payload={}){
 const cases=Array.isArray(payload?.cases)?payload.cases:[],started=now();
 if(!extractor||!anchorVectors)throw new Error("BROWSER_DECISION_MODEL_NOT_LOADED");
 const rows=await classifyActions(cases.map(x=>x?.action||""));
 let correct=0,confident=0,confidentCorrect=0;
 const results=rows.map((row,index)=>{const expected=String(cases[index]?.expected||"").toUpperCase(),ok=row.route===expected,isConfident=row.confidence>=.65;if(ok)correct++;if(isConfident){confident++;if(ok)confidentCorrect++}return {...row,expected,ok}});
 return {cases:results.length,correct,accuracy:results.length?correct/results.length:0,confident,confidentCorrect,confidentAccuracy:confident?confidentCorrect/confident:0,latencyMs:Math.max(0,Math.round(now()-started)),results};
}

function respond(id,ok,data,error=""){globalThis.postMessage?.({id,ok,data,error:String(error||"")})}
globalThis.addEventListener?.("message",async event=>{
 const msg=event?.data||{},id=msg.id,type=String(msg.type||"");
 try{
  if(type==="INIT"){respond(id,true,await initWorker());return}
  if(type==="LOAD_MODEL"){respond(id,true,await loadModel(msg.payload,id));return}
  if(type==="EVALUATE"){respond(id,true,await evaluate(msg.payload));return}
  if(type==="BENCHMARK"){respond(id,true,await benchmark(msg.payload));return}
  if(type==="STATUS"){respond(id,true,{ready:true,webgpu:Boolean(globalThis.navigator?.gpu),computeReady,modelReady:Boolean(extractor),modelProfile});return}
  if(type==="DISPOSE"){try{gpuDevice?.destroy?.()}catch{}gpuDevice=null;gpuAdapter=null;computeReady=false;extractor=null;anchorVectors=null;modelProfile=null;respond(id,true,{disposed:true});return}
  throw new Error("BROWSER_DECISION_UNKNOWN_MESSAGE")
 }catch(error){respond(id,false,null,error?.message||error)}
});
