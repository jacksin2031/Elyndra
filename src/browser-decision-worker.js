let gpuDevice=null;
let gpuAdapter=null;
let modelReady=false;
let computeReady=false;
const now=()=>globalThis.performance?.now?.()??Date.now();
async function runComputeProbe(device){
 const usage=globalThis.GPUBufferUsage,mapMode=globalThis.GPUMapMode,shaderStage=globalThis.GPUShaderStage;
 if(!usage||!mapMode||!shaderStage)return false;
 const shader=device.createShaderModule({code:"@group(0) @binding(0) var<storage, read_write> output: array<u32>; @compute @workgroup_size(1) fn main(){ output[0]=7u; }"});
 const bindGroupLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:shaderStage.COMPUTE,buffer:{type:"storage"}}]});
 const descriptor={layout:device.createPipelineLayout({bindGroupLayouts:[bindGroupLayout]}),compute:{module:shader,entryPoint:"main"}};
 const pipeline=typeof device.createComputePipelineAsync==="function"?await device.createComputePipelineAsync(descriptor):device.createComputePipeline(descriptor);
 const storage=device.createBuffer({size:4,usage:usage.STORAGE|usage.COPY_SRC});
 const readback=device.createBuffer({size:4,usage:usage.COPY_DST|usage.MAP_READ});
 try{
  const bindGroup=device.createBindGroup({layout:bindGroupLayout,entries:[{binding:0,resource:{buffer:storage}}]});
  const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();
  pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.dispatchWorkgroups(1);pass.end();
  encoder.copyBufferToBuffer(storage,0,readback,0,4);device.queue.submit([encoder.finish()]);
  await readback.mapAsync(mapMode.READ);
  const value=new Uint32Array(readback.getMappedRange().slice(0))[0];
  readback.unmap();
  return value===7;
 }finally{
  storage.destroy?.();readback.destroy?.();
 }
}
async function initWebGpu(){
 if(!globalThis.navigator?.gpu)throw new Error("WEBGPU_UNAVAILABLE");
 gpuAdapter=await globalThis.navigator.gpu.requestAdapter();
 if(!gpuAdapter)throw new Error("WEBGPU_ADAPTER_UNAVAILABLE");
 gpuDevice=await gpuAdapter.requestDevice();
 try{computeReady=await runComputeProbe(gpuDevice)}catch{computeReady=false}
 gpuDevice?.lost?.then?.(()=>{gpuDevice=null;modelReady=false;computeReady=false}).catch?.(()=>{});
 return {ready:true,webgpu:true,computeReady,modelReady,reasonCodes:modelReady?[]:["MODEL_NOT_LOADED"]};
}
async function evaluate(payload={}){
 const started=now();
 if(!gpuDevice)throw new Error("WEBGPU_NOT_INITIALIZED");
 return {
  decision:"UNCERTAIN",
  confidence:0,
  reasonCodes:[modelReady?"MODEL_INFERENCE_NOT_IMPLEMENTED":"MODEL_NOT_LOADED"],
  engine:"WEBGPU",
  modelVersion:"unloaded",
  latencyMs:Math.max(0,Math.round(now()-started)),
  metadata:{task:String(payload?.task||""),webgpuReady:true,computeReady,modelReady}
 };
}
function respond(id,ok,data,error=""){globalThis.postMessage?.({id,ok,data,error:String(error||"")})}
globalThis.addEventListener?.("message",async event=>{
 const msg=event?.data||{},id=msg.id,type=String(msg.type||"");
 try{
  if(type==="INIT"){respond(id,true,await initWebGpu());return}
  if(type==="EVALUATE"){respond(id,true,await evaluate(msg.payload));return}
  if(type==="DISPOSE"){try{gpuDevice?.destroy?.()}catch{}gpuDevice=null;gpuAdapter=null;modelReady=false;computeReady=false;respond(id,true,{disposed:true});return}
  throw new Error("BROWSER_DECISION_UNKNOWN_MESSAGE")
 }catch(error){respond(id,false,null,error?.message||error)}
});
