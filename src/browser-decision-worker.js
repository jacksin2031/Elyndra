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
const TASK_ANCHORS=Object.freeze({
 ACTION_LEGALITY:Object.freeze({
  ACCEPT:["玩家具備所需物品、能力與位置條件，這個行動現在可以合理嘗試","必要な所持品・能力・位置条件が揃っており、この行動は今試せる","the player has the required item ability target and route, so this action is feasible now"],
  REJECT:["玩家缺少必要物品或能力、目標不在場、或指定行動在目前狀態不可能","必要なアイテムや能力がなく、対象も不在で、現在の状態では実行できない","the action is impossible now because a required item ability present target or reachable route is missing"]
 }),
 NARRATIVE_CONSISTENCY:Object.freeze({
  ACCEPT:["敘事只描述已確認的結果與可觀察事實，沒有把失敗寫成成功，也沒有創造不存在的人物地點或資訊","描写は確認済みの結果と観測可能な事実だけを使い、失敗を成功に変えず、存在しない人物や場所を作らない","the narration stays within confirmed outcome and observable facts without inventing people places or success"],
  REJECT:["敘事違反已確認結果，把失敗寫成成功，洩漏隱藏資訊，或創造不在場人物與不存在地點","描写が確定結果に反し、失敗を成功として扱い、隠し情報や存在しない人物・場所を作っている","the narration contradicts the confirmed outcome, leaks hidden information, or invents absent people and places"]
 }),
 AI_OUTPUT_ACCEPTANCE:Object.freeze({
  ACCEPT:["AI 輸出結構完整、欄位可解析、引用既有資料，而且所有 operation 都在允許範圍內","AI出力は構造が完全で解析可能、既存データを参照し、operation は許可範囲内","the AI output is structurally complete parseable grounded and uses only authorized operations"],
  REJECT:["AI 輸出缺少必要欄位、無法解析、引用虛構 ID，或所有 operation 都未授權","AI出力は必須フィールド不足、解析不能、架空ID参照、または全operationが未許可","the AI output is malformed incomplete references invented ids or contains only unauthorized operations"]
 }),
 OUTCOME:Object.freeze({
  SUCCESS:["行動成功並達成主要目的，玩家確實做到想做的事","行動は成功し主要な目的を達成した","the action succeeds and the main intended outcome is achieved"],
  FAILURE:["行動沒有達成主要目的，嘗試失敗或受到阻礙但局勢仍可繼續","行動は主要目的を達成できず失敗または阻止された","the action fails to achieve its main goal and remains blocked or unsuccessful"]
 })
});
const ORIGIN_SIGNAL_GLOSSES=Object.freeze({
 DISPLACEMENT:"從熟悉環境突然斷裂到陌生世界，玩家以外來者視角面對認知摩擦",
 OUTSIDER_COGNITIVE_DISCONTINUITY:"玩家明顯感受到自己不屬於此地，熟悉常識與眼前環境出現落差",
 UNEARNED_LOCAL_KNOWLEDGE:"玩家沒有來源卻直接知道本地文化、歷史、人物或世界規則",
 INSTANT_BELONGING:"玩家沒有過程或代價就立刻融入並被當成本地人",
 CONTINUITY_WITH_LIMITS:"角色已有本地人生延續，但身份、知識或資源仍存在限制",
 PREEXISTING_LOCAL_LIFE:"開局可感知角色在此之前已有本地生活、身份、物件或關係痕跡",
 TOTAL_LOCAL_OMNISCIENCE:"角色因本地身份而自動知道整個世界所有資訊",
 EARTH_ARRIVAL_FRAMING:"把角色寫成剛從地球掉進異世界的外來者",
 DEPENDENCY_AND_AGENDA:"召喚帶來依賴、目的、要求或世界側議程",
 SUMMONING_WORLD_TRACE:"開局存在召喚者、召喚目的、召喚事故或召喚現象的可感知痕跡",
 SUMMONER_CLAIM_AS_CANON:"召喚方說法未經證實就直接成為世界真相",
 UNCAUSED_RANDOM_ARRIVAL:"被召喚卻完全沒有世界側原因，只是隨機抵達",
 IDENTITY_ASYMMETRY:"玩家自我與宿主既有身份之間存在不對稱與衝突",
 HOST_HAS_PREEXISTING_SOCIAL_TRACE:"宿主在接管前已有身體、物件、生活或社會關係痕跡",
 FULL_HOST_MEMORY:"玩家立即獲得宿主完整記憶",
 OUTSIDER_DEFAULT_FRAMING:"把本地人或附身者預設寫成第一次看見異世界的外來者",
 RANDOM_NEW_LOCAL_IDENTITY:"宿主身份憑空新生成而沒有任何前史",
 NORMALCY_DISRUPTED:"先有玩家熟悉的本地日常，再由具體異常打破正常",
 LOCAL_NORMALCY_BEFORE_DISRUPTION:"第一幕先呈現玩家熟悉的本地生活與正常狀態，之後才出現事件",
 ZERO_LOCAL_KNOWLEDGE:"原住民對自己的故鄉、日常與基本常識完全沒有知識",
 SELF_UNCERTAINTY:"記憶缺口造成對身份或過去的不確定，但基本認知與行動能力仍存在",
 IDENTITY_OR_PAST_UNCERTAINTY:"身體、物件、他人反應或環境痕跡讓玩家無法確定自己的身份或過去",
 TOTAL_COGNITIVE_RESET:"失憶被寫成連基本認知、語言或感官都全面重置",
 CONVENIENT_MEMORY_RESTORE:"為推進劇情方便而突然完整恢復關鍵記憶",
 AMNESIA_AS_CANON_PATCH:"用失憶來解釋或修補世界 Canon 矛盾",
 CUSTOM_DEFINED:"玩家自訂起源的具體身份張力",
 CUSTOM_ORIGIN_TRACE:"第一幕實際呈現至少一項自訂起源造成的可感知後果"
});
let gpuDevice=null,gpuAdapter=null,computeReady=false;
let pipelineFactory=null,hfEnv=null,extractor=null,anchorVectors=null,taskAnchorVectors=null,modelProfile=null,modelLoading=null;
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
   gpuDevice?.lost?.then?.(()=>{gpuDevice=null;gpuAdapter=null;computeReady=false;if(modelProfile?.device==="webgpu"){extractor=null;anchorVectors=null;taskAnchorVectors=null;modelProfile=null}}).catch?.(()=>{});
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
async function embedGroups(groups={}){
 const labels=Object.keys(groups),texts=[],owners=[];for(const label of labels)for(const value of groups[label]||[]){texts.push(value);owners.push(label)}
 const rows=texts.length?await embed(texts):[],grouped={};for(const label of labels)grouped[label]=[];
 rows.forEach((row,index)=>grouped[owners[index]].push(row));return grouped
}
async function prepareAnchors(){
 anchorVectors=await embedGroups(ACTION_ANCHORS);
 taskAnchorVectors={};for(const [task,groups] of Object.entries(TASK_ANCHORS))taskAnchorVectors[task]=await embedGroups(groups)
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
   sendProgress(requestId,{status:"fallback",file:"webgpu-to-wasm"});extractor=null;anchorVectors=null;taskAnchorVectors=null;device="wasm";dtype=model.wasmDtype||"q8";
   extractor=await pipeline("feature-extraction",model.id,{device,dtype,revision:model.revision,progress_callback:info=>sendProgress(requestId,info)})
  }
  await prepareAnchors();
  modelProfile={id:model.id,revision:model.revision,device,dtype,requestedDevice:requested,fallbackReason,loadedAt:Date.now(),loadLatencyMs:Math.max(0,Math.round(now()-started)),anchorCount:Object.values(ACTION_ANCHORS).reduce((n,x)=>n+x.length,0)};
  return {...modelProfile,ready:true,cached:false};
 })();
 try{return await modelLoading}catch(error){extractor=null;anchorVectors=null;taskAnchorVectors=null;modelProfile=null;throw error}finally{modelLoading=null}
}

const arr=value=>Array.isArray(value)?value:[];
const obj=value=>Boolean(value&&typeof value==="object"&&!Array.isArray(value));
const round=value=>Math.round(Number(value||0)*10000)/10000;
function scoresFromVector(vector,groups={}){
 const scores=Object.fromEntries(Object.entries(groups||{}).map(([label,anchors])=>[label,Math.max(-1,...arr(anchors).map(anchor=>dot(vector,anchor)))]));
 const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]),[topLabel,topScore]=ranked[0]||["UNCERTAIN",0],secondScore=ranked[1]?.[1]??0,margin=topScore-secondScore;
 const confidence=clamp(.48+Math.max(0,topScore-.25)*.45+Math.max(0,margin)*1.65);
 return {topLabel,topScore,secondScore,confidence,scores:Object.fromEntries(ranked.map(([k,v])=>[k,round(v)])),margin:round(margin)}
}
function classificationFromVector(vector){
 const scored=scoresFromVector(vector,anchorVectors||{});return {route:scored.topLabel,confidence:scored.confidence,scores:scored.scores,margin:scored.margin}
}
async function classifyActions(actions=[]){
 if(!extractor||!anchorVectors)throw new Error("BROWSER_DECISION_MODEL_NOT_LOADED");
 const texts=actions.map(x=>String(x||"").trim()).filter(Boolean);if(!texts.length)return [];
 const vectors=await embed(texts);return vectors.map((vector,index)=>({action:texts[index],...classificationFromVector(vector)}))
}
function engineName(){return modelProfile?.device==="webgpu"?"WEBGPU":"WASM"}
function modelName(){return modelProfile?modelProfile.id+"@"+modelProfile.revision.slice(0,8):"unloaded"}
function decisionResult(task,decision,confidence,reasonCodes,metadata,started){
 return {decision,confidence:clamp(confidence),reasonCodes:[...new Set(arr(reasonCodes).map(x=>String(x||"").toUpperCase()).filter(Boolean))],engine:engineName(),modelVersion:modelName(),latencyMs:Math.max(0,Math.round(now()-started)),metadata:{task,dtype:modelProfile?.dtype,...(metadata||{})}}
}
async function semanticTask(text,task){
 const [vector]=await embed([String(text||"").slice(0,2400)]),groups=taskAnchorVectors?.[task]||{},scored=scoresFromVector(vector,groups);return scored
}
function originGloss(signal){const key=String(signal||"").trim();return ORIGIN_SIGNAL_GLOSSES[key]||key.replace(/_/g," ").toLowerCase()}
function visibleText(value,max=1800){return String(value??"").normalize("NFC").trim().slice(0,max)}
function flattenText(value,out=[],depth=0){
 if(out.length>=80||depth>5)return out;if(typeof value==="string"){const x=visibleText(value,240);if(x)out.push(x);return out}
 if(Array.isArray(value)){for(const x of value)flattenText(x,out,depth+1);return out}
 if(obj(value))for(const x of Object.values(value))flattenText(x,out,depth+1);return out
}
async function evaluateActionLegality(request,started){
 const payload=request?.payload||{},context=request?.context||{},action=visibleText(payload.action,320),hard=[...arr(context.hardBlockSignals).map(String).filter(Boolean)];
 if(String(context.playerStatus||"").toUpperCase()==="DOWNED")hard.push("PLAYER_DOWNED");
 if(hard.length)return decisionResult("ACTION_LEGALITY","REJECT",.99,["HARD_FEASIBILITY_BLOCK",...hard],{hardBlockSignals:hard},started);
 const text=["Player action: "+action,"Player status: "+String(context.playerStatus||"ACTIVE"),"Inventory: "+arr(context.inventoryNames).join(", "),"Known abilities: "+arr(context.knownAbilities).join(", "),"Present NPCs: "+arr(context.presentNpcNames).join(", "),"Reachable locations: "+arr(context.reachableLocations).join(", "),"Current location: "+String(context.currentLocation||"")].join("\n");
 const s=await semanticTask(text,"ACTION_LEGALITY"),reject=s.topLabel==="REJECT"&&s.topScore>=.5&&s.margin>=.07,accept=s.topLabel==="ACCEPT"&&s.topScore>=.35&&s.margin>=.015;
 return decisionResult("ACTION_LEGALITY",reject?"REJECT":accept?"ACCEPT":"UNCERTAIN",reject||accept?s.confidence:Math.min(.64,s.confidence),[reject?"SEMANTIC_FEASIBILITY_REJECT":accept?"SEMANTIC_FEASIBILITY_ACCEPT":"LOW_FEASIBILITY_CONFIDENCE"],{scores:s.scores,margin:s.margin,hardBlockSignals:hard},started)
}
async function evaluateOriginCompliance(request,started){
 const payload=request?.payload||{},opening=visibleText(payload.openingHook,2200),origin=payload.originOpening||{},identity=origin.narrativeIdentity||payload.narrativeIdentity||{},anchor=payload.anchor||{},reasonCodes=[];
 if(!opening)return decisionResult("ORIGIN_COMPLIANCE","REJECT",.99,["OPENING_EMPTY"],{},started);
 if(origin.worldNameKnown!==true&&anchor.worldName&&opening.includes(String(anchor.worldName)))reasonCodes.push("WORLD_NAME_LEAK");
 for(const hidden of arr(anchor.hiddenFacts))if(hidden&&opening.includes(String(hidden)))reasonCodes.push("HIDDEN_CANON_LEAK");
 if(reasonCodes.length)return decisionResult("ORIGIN_COMPLIANCE","REJECT",.99,reasonCodes,{exactLeaks:reasonCodes},started);
 const core=originGloss(identity.coreTension),required=arr(identity.requiredSignals).map(originGloss),forbidden=arr(identity.forbiddenSignals).map(originGloss),mustShow=visibleText(identity.proseContract?.mustShow,600),mustAvoid=visibleText(identity.proseContract?.mustAvoid,600);
 const queries=[core,...required,...forbidden, ...(mustShow?[mustShow]:[]), ...(mustAvoid?[mustAvoid]:[])].filter(Boolean),vectors=await embed([opening,...queries]),openingVector=vectors[0],scores=queries.map((q,i)=>({q,score:round(dot(openingVector,vectors[i+1]))}));
 let cursor=0;const coreScore=core?scores[cursor++]?.score??0:1,requiredScores=required.map(()=>scores[cursor++]?.score??0),forbiddenScores=forbidden.map(()=>scores[cursor++]?.score??0),mustShowScore=mustShow?scores[cursor++]?.score??0:null,mustAvoidScore=mustAvoid?scores[cursor++]?.score??0:null;
 const forbiddenMax=Math.max(0,...forbiddenScores,mustAvoidScore??0);if(forbiddenMax>=.5)return decisionResult("ORIGIN_COMPLIANCE","REJECT",clamp(.7+(forbiddenMax-.5)*1.8),["FORBIDDEN_ORIGIN_SIGNAL"],{coreScore,requiredScores,forbiddenScores,mustShowScore,mustAvoidScore},started);
 const requiredPool=[coreScore,...requiredScores,...(mustShowScore==null?[]:[mustShowScore])],minRequired=Math.min(...requiredPool),avgRequired=requiredPool.reduce((a,b)=>a+b,0)/Math.max(1,requiredPool.length),accept=minRequired>=.21&&avgRequired>=.38;
 return decisionResult("ORIGIN_COMPLIANCE",accept?"ACCEPT":"UNCERTAIN",accept?clamp(.68+(avgRequired-.38)*.9):Math.min(.64,clamp(.35+avgRequired*.5)),[accept?"ORIGIN_SEMANTIC_MATCH":"ORIGIN_SIGNAL_EVIDENCE_WEAK"],{coreScore,requiredScores,forbiddenScores,mustShowScore,mustAvoidScore,minRequired:round(minRequired),avgRequired:round(avgRequired)},started)
}
async function evaluateNarrativeConsistency(request,started){
 const payload=request?.payload||{},context=request?.context||{},scene=payload.scene||{},narrative=visibleText(scene.narrative||payload.narrative,2000),title=visibleText(scene.sceneTitle,180),declared=String(scene.outcome||payload.outcome||"").toUpperCase(),expected=String(context.expectedOutcome||payload.expectedOutcome||"").toUpperCase(),combined=narrative+"\n"+title,hard=[];
 if(!narrative)return decisionResult("NARRATIVE_CONSISTENCY","UNCERTAIN",0,["NARRATIVE_EMPTY"],{},started);
 if(expected&&declared&&expected!==declared)hard.push("DECLARED_OUTCOME_MISMATCH");
 if(/\b(?:state director|world state|canonical state|validator|state patch|engine commit)\b|(?:狀態導演|世界狀態|驗證器|狀態補丁|引擎提交)/iu.test(combined))hard.push("INTERNAL_TERMINOLOGY_LEAK");
 for(const claim of arr(context.forbiddenClaims))if(claim&&combined.includes(String(claim)))hard.push("FORBIDDEN_CLAIM");
 const present=new Set(arr(context.presentNpcNames).map(String));for(const name of arr(context.allNpcNames).map(String))if(name&&!present.has(name)&&combined.includes(name))hard.push("NPC_NOT_PRESENT");
 const current=String(context.currentLocation||"");if(String(context.actionKind||"").toUpperCase()!=="TRAVEL")for(const loc of arr(context.knownLocations).map(String))if(loc&&current&&loc!==current&&(title===loc||title.startsWith(loc+" · ")))hard.push("SCENE_TITLE_LOCATION_MISMATCH");
 if(hard.length)return decisionResult("NARRATIVE_CONSISTENCY","REJECT",.98,hard,{declaredOutcome:declared,expectedOutcome:expected},started);
 let outcomeScores=null;if(["SUCCESS","FAILURE"].includes(expected)){const [vector]=await embed([narrative]),s=scoresFromVector(vector,taskAnchorVectors?.OUTCOME||{});outcomeScores=s;if(s.topLabel!==expected&&s.topScore>=.48&&s.margin>=.055)return decisionResult("NARRATIVE_CONSISTENCY","REJECT",s.confidence,["SEMANTIC_OUTCOME_CONTRADICTION"],{expectedOutcome:expected,outcomeScores:s.scores,margin:s.margin},started)}
 const s=await semanticTask("Confirmed outcome: "+(expected||declared||"UNKNOWN")+"\nNarrative: "+narrative,"NARRATIVE_CONSISTENCY"),semanticReject=s.topLabel==="REJECT"&&s.topScore>=.6&&s.margin>=.09;
 return decisionResult("NARRATIVE_CONSISTENCY",semanticReject?"REJECT":"ACCEPT",semanticReject?s.confidence:Math.max(.72,Math.min(.96,outcomeScores?.confidence||s.confidence||.72)),[semanticReject?"SEMANTIC_NARRATIVE_CONTRADICTION":"NARRATIVE_SHADOW_CONSISTENT"],{expectedOutcome:expected,outcomeScores:outcomeScores?.scores||{},consistencyScores:s.scores,margin:s.margin},started)
}
async function evaluateAiOutputAcceptance(request,started){
 const payload=request?.payload||{},context=request?.context||{},kind=String(payload.kind||"").toUpperCase(),output=payload.output,hard=[],repairable=[];
 if(!obj(output))return decisionResult("AI_OUTPUT_ACCEPTANCE","REJECT",.99,["OUTPUT_NOT_OBJECT"],{kind},started);
 if(kind==="SCENE"){
  if(!String(output.outcome||"").trim())hard.push("SCENE_OUTCOME_MISSING");if(!String(output.narrative||"").trim())hard.push("SCENE_NARRATIVE_MISSING");if(!Array.isArray(output.suggestions))hard.push("SCENE_SUGGESTIONS_MISSING");
  const expected=String(context.expectedOutcome||"").toUpperCase(),actual=String(output.outcome||"").toUpperCase();if(expected&&actual&&expected!==actual)repairable.push("OUTCOME_REBOUND");
 }else if(kind==="STATE_PATCH"){
  const operations=arr(output.operations),allowed=new Set(arr(context.capabilities||context.plan?.capabilities).map(x=>String(x||"").toUpperCase())),accepted=operations.filter(op=>obj(op)&&allowed.has(String(op.op||"").toUpperCase()));
  if(operations.length&&accepted.length===0)hard.push("ALL_OPERATIONS_UNAUTHORIZED");
  const expectedRevision=Number(context.baseRevision??context.plan?.baseRevision);if(Number.isFinite(expectedRevision)&&Number(output.baseRevision)!==expectedRevision)repairable.push("BASE_REVISION_REBOUND");
 }else return decisionResult("AI_OUTPUT_ACCEPTANCE","UNCERTAIN",0,["OUTPUT_KIND_UNSUPPORTED"],{kind},started);
 const text=flattenText(output).join(" ").slice(0,2200);if(/\b(?:system prompt|ignore previous instructions|validator output)\b|(?:系統提示詞|忽略先前指示|驗證器輸出)/iu.test(text))hard.push("PROMPT_OR_INTERNAL_LEAK");
 if(hard.length)return decisionResult("AI_OUTPUT_ACCEPTANCE","REJECT",.99,hard,{kind,repairable},started);
 const s=await semanticTask((kind==="SCENE"?String(output.narrative||""):text),"AI_OUTPUT_ACCEPTANCE"),semanticReject=s.topLabel==="REJECT"&&s.topScore>=.65&&s.margin>=.11;
 return decisionResult("AI_OUTPUT_ACCEPTANCE",semanticReject?"REJECT":"ACCEPT",semanticReject?s.confidence:.93,[semanticReject?"SEMANTIC_OUTPUT_RISK":"OUTPUT_SHADOW_ACCEPTED",...repairable],{kind,repairable,scores:s.scores,margin:s.margin},started)
}
async function evaluate(request={}){
 const started=now(),task=String(request?.task||""),action=String(request?.payload?.action||"").trim();
 if(!extractor||!anchorVectors||!taskAnchorVectors)return {decision:"UNCERTAIN",confidence:0,reasonCodes:["MODEL_NOT_LOADED"],engine:computeReady?"WEBGPU":"WASM",modelVersion:"unloaded",latencyMs:Math.max(0,Math.round(now()-started)),metadata:{task,computeReady,modelReady:false}};
 if(task==="ACTION_CLASSIFICATION"||task==="NEED_AI_ROUTING"){
  const classified=(await classifyActions([action]))[0]||{route:"ADVENTURE",confidence:0,scores:{},margin:0},uncertain=classified.confidence<.65,needsAi=classified.route==="ADVENTURE";
  return decisionResult(task,uncertain?"UNCERTAIN":(task==="NEED_AI_ROUTING"&&needsAi?"NEEDS_AI":"ACCEPT"),classified.confidence,uncertain?["LOW_CLASSIFICATION_CONFIDENCE"]:["LOCAL_MODEL_CLASSIFIED"],{route:classified.route,needsAi,scores:classified.scores,margin:classified.margin},started)
 }
 if(task==="ACTION_LEGALITY")return evaluateActionLegality(request,started);
 if(task==="ORIGIN_COMPLIANCE")return evaluateOriginCompliance(request,started);
 if(task==="NARRATIVE_CONSISTENCY")return evaluateNarrativeConsistency(request,started);
 if(task==="AI_OUTPUT_ACCEPTANCE")return evaluateAiOutputAcceptance(request,started);
 return decisionResult(task,"UNCERTAIN",0,["TASK_MODEL_NOT_IMPLEMENTED"],{},started)
}

async function benchmark(payload={}){
 const cases=Array.isArray(payload?.cases)?payload.cases:[],started=now();
 if(!extractor||!anchorVectors||!taskAnchorVectors)throw new Error("BROWSER_DECISION_MODEL_NOT_LOADED");
 if(cases.some(x=>x?.task)){
  let correct=0,confident=0,confidentCorrect=0;const results=[];
  for(const row of cases){const result=await evaluate({task:row.task,payload:row.payload||{},context:row.context||{}}),expected=String(row.expectedDecision||row.expected||"").toUpperCase(),ok=result.decision===expected,isConfident=result.confidence>=.65;if(ok)correct++;if(isConfident){confident++;if(ok)confidentCorrect++}results.push({id:row.id||"",task:row.task,expected,ok,decision:result.decision,confidence:result.confidence,reasonCodes:result.reasonCodes,metadata:result.metadata})}
  return {suite:"TASKS",cases:results.length,correct,accuracy:results.length?correct/results.length:0,confident,confidentCorrect,confidentAccuracy:confident?confidentCorrect/confident:0,latencyMs:Math.max(0,Math.round(now()-started)),results}
 }
 const rows=await classifyActions(cases.map(x=>x?.action||""));let correct=0,confident=0,confidentCorrect=0;
 const results=rows.map((row,index)=>{const expected=String(cases[index]?.expected||"").toUpperCase(),ok=row.route===expected,isConfident=row.confidence>=.65;if(ok)correct++;if(isConfident){confident++;if(ok)confidentCorrect++}return {...row,expected,ok}});
 return {suite:"ACTION_CLASSIFICATION",cases:results.length,correct,accuracy:results.length?correct/results.length:0,confident,confidentCorrect,confidentAccuracy:confident?confidentCorrect/confident:0,latencyMs:Math.max(0,Math.round(now()-started)),results}
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
  if(type==="DISPOSE"){try{gpuDevice?.destroy?.()}catch{}gpuDevice=null;gpuAdapter=null;computeReady=false;extractor=null;anchorVectors=null;taskAnchorVectors=null;modelProfile=null;respond(id,true,{disposed:true});return}
  throw new Error("BROWSER_DECISION_UNKNOWN_MESSAGE")
 }catch(error){respond(id,false,null,error?.message||error)}
});
