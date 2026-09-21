const KEY="elyndra:debug-telemetry:v1",MAX_ENTRIES=1600,SESSION_ID=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2),SESSION_STARTED=Date.now();
const safeStorage=()=>{try{return globalThis.localStorage||null}catch{return null}};
const SECRET_STRING_PATTERNS=[
 [/(\bBearer\s+)[A-Za-z0-9._~+\/=-]{6,}/gi,"$1[REDACTED]"],
 [/(\b(?:authorization|x-api-key|api-key)\s*[:=]\s*)[^\s,;]+/gi,"$1[REDACTED]"],
 [/([?&](?:key|api_key|apikey|token|access_token|auth|authorization)=)[^&#\s]+/gi,"$1[REDACTED]"],
 [/\bsk-[A-Za-z0-9_-]{12,}\b/g,"[REDACTED_API_KEY]"],
 [/\bAIza[0-9A-Za-z_-]{20,}\b/g,"[REDACTED_API_KEY]"]
];
export function scrubDebugText(value=""){
 let out=String(value??"");
 for(const [pattern,replacement] of SECRET_STRING_PATTERNS)out=out.replace(pattern,replacement);
 return out
}
function cloneSafe(value,depth=0,seen=new WeakSet()){
 if(depth>20)return "[MAX_DEPTH]";
 if(value==null||typeof value==="number"||typeof value==="boolean")return value;
 if(typeof value==="string")return scrubDebugText(value);
 if(typeof value==="bigint")return String(value);
 if(typeof value==="function")return "[FUNCTION]";
 if(typeof value!=="object")return String(value);
 if(seen.has(value))return "[CIRCULAR]";seen.add(value);
 if(Array.isArray(value))return value.map(x=>cloneSafe(x,depth+1,seen));
 const out={};for(const [k,v] of Object.entries(value)){
  if(/api.?key|authorization|password|access.?token|refresh.?token|bearer|client.?secret/i.test(k)){out[k]="[REDACTED]";continue}
  out[k]=cloneSafe(v,depth+1,seen)
 }return out
}
function read(){try{const s=safeStorage()?.getItem(KEY);const d=s?JSON.parse(s):null;return d&&Array.isArray(d.entries)?d:{entries:[]}}catch{return {entries:[]}}}
function write(d){try{safeStorage()?.setItem(KEY,JSON.stringify({entries:(d.entries||[]).slice(-MAX_ENTRIES)}))}catch{}}
export function estimateTextTokens(text=""){const s=String(text||"");return s?Math.max(1,Math.ceil([...s].length/4)):0}
export function normalizeProviderUsage(provider,response={},inputText="",outputText=""){
 const p=String(provider||"").toLowerCase();
 if(p==="gemini"){
  const u=response?.usageMetadata||response?.usage_metadata||{};
  const input=Number(u.promptTokenCount??u.prompt_token_count),output=Number(u.candidatesTokenCount??u.responseTokenCount??u.candidates_token_count??u.response_token_count),reasoning=Number(u.thoughtsTokenCount??u.thoughts_token_count),cached=Number(u.cachedContentTokenCount??u.cached_content_token_count),total=Number(u.totalTokenCount??u.total_token_count);
  if([input,output,reasoning,total,cached].some(Number.isFinite))return {source:"API",input:Number.isFinite(input)?input:0,output:Number.isFinite(output)?output:0,reasoning:Number.isFinite(reasoning)?reasoning:0,cached:Number.isFinite(cached)?cached:0,total:Number.isFinite(total)?total:Math.max(0,(input||0)+(output||0)+(reasoning||0))}
 }
 const u=response?.usage||{};
 const input=Number(u.prompt_tokens??u.input_tokens),output=Number(u.completion_tokens??u.output_tokens),reasoning=Number(u.completion_tokens_details?.reasoning_tokens??u.output_tokens_details?.reasoning_tokens),cached=Number(u.prompt_tokens_details?.cached_tokens??u.input_tokens_details?.cached_tokens),total=Number(u.total_tokens);
 if([input,output,reasoning,total,cached].some(Number.isFinite))return {source:"API",input:Number.isFinite(input)?input:0,output:Number.isFinite(output)?output:0,reasoning:Number.isFinite(reasoning)?reasoning:0,cached:Number.isFinite(cached)?cached:0,total:Number.isFinite(total)?total:Math.max(0,(input||0)+(output||0))}
 const estIn=estimateTextTokens(inputText),estOut=estimateTextTokens(outputText);return {source:"ESTIMATED",input:estIn,output:estOut,reasoning:0,cached:0,total:estIn+estOut}
}
export function recordDebug(type,data={}){
 const d=read(),entry={id:globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2),sessionId:SESSION_ID,at:Date.now(),type:String(type||"DEBUG"),data:cloneSafe(data)};
 d.entries.push(entry);write(d);return entry
}
export function recordAIUsage({provider,model,task,tier,status="SUCCESS",latencyMs=0,response={},inputText="",outputText="",attempt=1,error=""}={}){
 const usage=normalizeProviderUsage(provider,response,inputText,outputText);
 return recordDebug("AI_REQUEST",{provider,model,task,tier,status,latencyMs:Math.max(0,Math.round(Number(latencyMs)||0)),attempt,usage,requestChars:String(inputText||"").length,responseChars:String(outputText||"").length,responsePreview:String(outputText||"").slice(0,2000),error:String(error||"").slice(0,500)})
}
export function telemetryEntries(){return read().entries.slice()}
export function clearDebugTelemetry(){write({entries:[]});recordDebug("DEBUG_CLEARED",{at:Date.now()})}
export function telemetrySummary(entries=telemetryEntries()){
 const ai=entries.filter(x=>x.type==="AI_REQUEST"),gameplay=entries.filter(x=>String(x.type||"").startsWith("GAME_")),ok=ai.filter(x=>x.data?.status==="SUCCESS"),billable=ai.filter(x=>Number(x.data?.usage?.total)>0),errors=entries.filter(x=>/ERROR|FAILED/.test(x.type)||x.data?.status==="ERROR");
 const tokens=billable.reduce((a,x)=>{const u=x.data?.usage||{};a.input+=Number(u.input)||0;a.output+=Number(u.output)||0;a.reasoning+=Number(u.reasoning)||0;a.cached+=Number(u.cached)||0;a.total+=Number(u.total)||0;a.api+=(u.source==="API");a.estimated+=(u.source!=="API");return a},{input:0,output:0,reasoning:0,cached:0,total:0,api:0,estimated:0});
 const latency=ok.reduce((a,x)=>a+(Number(x.data?.latencyMs)||0),0);
 return {sessionId:SESSION_ID,sessionStartedAt:SESSION_STARTED,exportedAt:Date.now(),entryCount:entries.length,gameplayEvents:gameplay.length,aiRequests:ai.length,aiSuccess:ok.length,aiUsageResponses:billable.length,errorCount:errors.length,tokenTotals:tokens,aiLatencyMsTotal:latency,aiLatencyMsAverage:ok.length?Math.round(latency/ok.length):0}
}
export function debugBundle({appVersion="",gameState=null,aiSettings=null,runtime={}}={}){
 const entries=telemetryEntries(),summary=telemetrySummary(entries);
 return {schema:"elyndra-debug-v1",meta:{appVersion,exportedAt:new Date().toISOString(),sessionId:SESSION_ID,userAgent:globalThis.navigator?.userAgent||"unknown",language:globalThis.navigator?.language||"unknown",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"unknown",viewport:{width:globalThis.innerWidth||0,height:globalThis.innerHeight||0,devicePixelRatio:globalThis.devicePixelRatio||1},online:globalThis.navigator?.onLine??null},summary,aiSettings:cloneSafe(aiSettings),runtime:cloneSafe(runtime),telemetry:entries,gameState:cloneSafe(gameState)}
}
export function debugBundleText(bundle){
 const s=bundle.summary||{},t=s.tokenTotals||{},lines=[
  "ELYNDRA DEBUG REPORT","App: v"+(bundle.meta?.appVersion||"?"),"Exported: "+(bundle.meta?.exportedAt||""),"Session: "+(bundle.meta?.sessionId||""),
  "","Gameplay changes: "+(s.gameplayEvents||0),"AI requests: "+(s.aiRequests||0)+" (success "+(s.aiSuccess||0)+")","AI latency avg: "+(s.aiLatencyMsAverage||0)+" ms","Errors: "+(s.errorCount||0),
  "Tokens total: "+(t.total||0),"  input: "+(t.input||0),"  output: "+(t.output||0),"  reasoning/thinking: "+(t.reasoning||0),"  cached: "+(t.cached||0),"Usage source: API "+(t.api||0)+" / estimated "+(t.estimated||0),
  "","RECENT TELEMETRY"
 ];for(const e of (bundle.telemetry||[]).slice(-250))lines.push(new Date(e.at).toISOString()+" ["+e.type+"] "+JSON.stringify(e.data));
 return lines.join("\n")
}
export function installDebugConsoleCapture(){
 if(globalThis.__ELYNDRA_DEBUG_CONSOLE__)return;globalThis.__ELYNDRA_DEBUG_CONSOLE__=true;
 for(const level of ["warn","error"]){const original=console[level]?.bind(console);if(!original)continue;console[level]=(...args)=>{try{recordDebug("CONSOLE_"+level.toUpperCase(),{message:args.map(x=>typeof x==="string"?scrubDebugText(x):JSON.stringify(cloneSafe(x))).join(" ").slice(0,2500)})}catch{}return original(...args)}}
}
