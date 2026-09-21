const KEY="elyndra:ai-settings:v3";const V2_KEY="elyndra:ai-settings:v2";const OLD_KEY="elyndra:ai-settings:v1";
export const PROVIDERS={
 openai:{label:"OpenAI",endpoint:"https://api.openai.com/v1/chat/completions",model:"gpt-5.6-luna",mode:"OpenAI"},
 gemini:{label:"Gemini",endpoint:"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",model:"gemini-3.8-flash",mode:"Gemini"},
 agnes:{label:"Agnes",endpoint:"https://apihub.agnes-ai.com/v1/chat/completions",model:"agnes-3.0-flash",mode:"Agnes 3.0 Flash"}
};
const profile=provider=>({endpoint:PROVIDERS[provider].endpoint,model:PROVIDERS[provider].model,apiKey:"",optimization:"standard"});
const base=()=>({mode:"direct",provider:"openai",profiles:Object.fromEntries(Object.keys(PROVIDERS).map(p=>[p,profile(p)]))});
function normalizeProfile(provider,saved={}){
 const preset=profile(provider),endpoint=String(saved.endpoint||"").trim(),model=String(saved.model||"").trim();
 return {endpoint:endpoint||preset.endpoint,model:preset.model,apiKey:String(saved.apiKey||"").trim(),optimization:["adaptive","fast"].includes(saved.optimization)?"adaptive":"standard"}
}
function migrate(saved){const out=base();if(!saved)return out;if(saved.profiles){out.provider=PROVIDERS[saved.provider]?saved.provider:"openai";for(const p of Object.keys(PROVIDERS))out.profiles[p]=normalizeProfile(p,saved.profiles[p]||{});return out}const p=PROVIDERS[saved.provider]?saved.provider:"openai";out.provider=p;out.profiles[p]=normalizeProfile(p,saved);return out}
function read(){try{return migrate(JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(V2_KEY)||localStorage.getItem(OLD_KEY)||"null"))}catch{return base()}}
export function loadAISettings(provider){const all=read(),p=PROVIDERS[provider]?provider:all.provider;return {mode:"direct",provider:p,...all.profiles[p]}}
export function saveAISettings(v){const all=read(),p=PROVIDERS[v.provider]?v.provider:"openai",previous=all.profiles[p]||profile(p),nextKey=String(v.apiKey||"").trim();all.provider=p;all.profiles[p]={endpoint:String(v.endpoint||PROVIDERS[p].endpoint||"").trim(),model:PROVIDERS[p].model,apiKey:nextKey||previous.apiKey||"",optimization:v.optimization==="adaptive"?"adaptive":"standard"};localStorage.setItem(KEY,JSON.stringify(all));localStorage.removeItem(V2_KEY);localStorage.removeItem(OLD_KEY);return loadAISettings(p)}
export function selectAIProvider(provider){const all=read(),p=PROVIDERS[provider]?provider:"openai";all.provider=p;localStorage.setItem(KEY,JSON.stringify(all));return loadAISettings(p)}
export function clearAISettings(provider){if(!provider){localStorage.removeItem(KEY);localStorage.removeItem(V2_KEY);localStorage.removeItem(OLD_KEY);return}const all=read(),p=PROVIDERS[provider]?provider:all.provider;all.profiles[p]=profile(p);localStorage.setItem(KEY,JSON.stringify(all))}
export function hasDirectAI(){const s=loadAISettings();return Boolean(s.endpoint&&s.model&&s.apiKey)}
const AI_TASK_TIER={
 action:"FAST",narration:"FAST",helper:"FAST",npc:"FAST",scene:"FAST",identity:"FAST",geography:"FAST",society:"FAST",cast:"FAST",
 core_anchor:"BALANCED",turn_state:"BALANCED",runtime_expansion:"BALANCED",
 core_rules:"IMPORTANT",history:"IMPORTANT",future:"IMPORTANT",
 quality:"CRITICAL",quality_repair:"CRITICAL",recovery:"CRITICAL",runtime_quality:"CRITICAL",runtime_repair:"CRITICAL"
};
export function optimizationTier(aiTask="general"){
 return AI_TASK_TIER[String(aiTask||"").toLowerCase()]||"BALANCED"
}
export function providerOptimization(provider,optimization="standard",aiTask="general"){
 if(optimization!=="adaptive")return {};
 const tier=optimizationTier(aiTask);
 const level=tier==="FAST"?"low":tier==="BALANCED"?"medium":"high";
 if(provider==="gemini")return {thinkingConfig:{thinkingLevel:level.toUpperCase()}};
 if(provider==="openai"||provider==="agnes")return {reasoning_effort:level};
 return {}
}
export function providerTokenBudget(provider,optimization="standard",aiTask="general",requested=0){
 const base=Math.round(Number(requested)||0);if(!base)return 0;
 const bounded=Math.max(256,Math.min(8192,base));
 if(optimization!=="adaptive"||provider==="gemini")return bounded;
 const tier=optimizationTier(aiTask),mult={FAST:3,BALANCED:3.5,IMPORTANT:4.5,CRITICAL:5.5}[tier]||3.5,floor={FAST:1600,BALANCED:2200,IMPORTANT:3600,CRITICAL:4800}[tier]||2200;
 return Math.max(256,Math.min(8192,Math.max(floor,Math.round(bounded*mult))))
}
function openAIText(d){
 const value=d?.choices?.[0]?.message?.content;
 if(typeof value==="string")return value;
 if(Array.isArray(value))return value.map(x=>typeof x==="string"?x:(x?.text||x?.content||"")).join("");
 return typeof d?.output_text==="string"?d.output_text:""
}
function emptyResponseError(provider,d){
 const finish=d?.choices?.[0]?.finish_reason||d?.candidates?.[0]?.finishReason||"unknown";
 const e=new Error(`EMPTY_AI_RESPONSE: ${provider} finish_reason=${finish}`);e.code="EMPTY_AI_RESPONSE";return e
}
async function apiError(r){let detail="";try{const d=await r.json();detail=d?.error?.message||d?.message||JSON.stringify(d)}catch{try{detail=await r.text()}catch{}}throw new Error(`AI_HTTP_${r.status}${detail?": "+String(detail).slice(0,300):""}`)}
async function openAICompatible(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},allowOptimization=true){const limit=providerTokenBudget(s.provider,s.optimization,aiTask,maxOutputTokens),tokenLimit=limit?(s.provider==="openai"?{max_completion_tokens:limit}:{max_tokens:limit}):{},sampling=s.provider==="agnes"&&Number.isFinite(Number(temperature))?{temperature:Number(temperature)}:{},optimization=allowOptimization&&!disableOptimization?providerOptimization(s.provider,s.optimization,aiTask):{};const r=await fetch(s.endpoint,{method:"POST",signal,headers:{"Content-Type":"application/json","Authorization":`Bearer ${s.apiKey}`},body:JSON.stringify({model:PROVIDERS[s.provider]?.model||s.model,...tokenLimit,...sampling,...optimization,messages:[{role:"system",content:system},{role:"user",content:user}]})});if(!r.ok){if(allowOptimization&&!disableOptimization&&s.optimization==="adaptive"&&r.status===400)return openAICompatible(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},false);return apiError(r)}const d=await r.json(),text=openAIText(d);if(String(text).trim())return text;if(allowOptimization&&!disableOptimization&&s.optimization==="adaptive")return openAICompatible(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},false);throw emptyResponseError(s.provider,d)}
async function gemini(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},allowOptimization=true){const endpoint=s.endpoint.replace("{model}",encodeURIComponent(PROVIDERS.gemini.model)),limit=providerTokenBudget("gemini",s.optimization,aiTask,maxOutputTokens),native=allowOptimization&&!disableOptimization?providerOptimization("gemini",s.optimization,aiTask):{},generationConfig={...(Number.isFinite(Number(temperature))?{temperature:Number(temperature)}:{}),...(limit?{maxOutputTokens:limit}:{}),...native};const r=await fetch(endpoint,{method:"POST",signal,headers:{"Content-Type":"application/json","x-goog-api-key":s.apiKey},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:user}]}],generationConfig})});if(!r.ok){if(allowOptimization&&!disableOptimization&&s.optimization==="adaptive"&&r.status===400)return gemini(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},false);return apiError(r)}const d=await r.json(),text=d.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";if(String(text).trim())return text;if(allowOptimization&&!disableOptimization&&s.optimization==="adaptive")return gemini(s,{system,user,temperature,signal,maxOutputTokens,aiTask,disableOptimization},false);throw emptyResponseError("gemini",d)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const timeoutValue=v=>Math.max(5000,Math.min(120000,Math.round(Number(v)||30000)));export async function directChat(args){const s=loadAISettings();if(!s.endpoint||!s.model||!s.apiKey)throw new Error("DIRECT_AI_NOT_CONFIGURED");const timeoutMs=timeoutValue(args?.timeoutMs);let last;for(let attempt=0;attempt<2;attempt++){const ctrl=new AbortController();let timedOut=false;const timer=setTimeout(()=>{timedOut=true;ctrl.abort(new DOMException("AI request timed out","TimeoutError"))},timeoutMs);try{const call=s.provider==="gemini"?gemini:openAICompatible;return await call(s,{...args,signal:ctrl.signal})}catch(e){const err=timedOut?Object.assign(new Error(`AI_TIMEOUT: Provider 在 ${Math.round(timeoutMs/1000)} 秒內未完成回應`),{code:"AI_TIMEOUT"}):e;last=err;if(attempt===0&&(/AI_HTTP_(429|5\d\d)/.test(err.message)||((args?.retryOnTimeout!==false)&&(err.code==="AI_TIMEOUT"||err.name==="AbortError"||err.name==="TimeoutError")))){await sleep(700);continue}throw err}finally{clearTimeout(timer)}}throw last}
export async function testDirectAI(){const text=await directChat({aiTask:"action",system:"Connection test. Reply with exactly ELYNDRA_OK",user:"ELYNDRA connection test"});if(!String(text).trim())throw new Error("EMPTY_AI_RESPONSE");return true}