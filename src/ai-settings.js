const KEY="elyndra:ai-settings:v2";
const OLD_KEY="elyndra:ai-settings:v1";
export const PROVIDERS={
 openai:{label:"OpenAI",endpoint:"https://api.openai.com/v1/chat/completions",model:"gpt-5.6-luna"},
 gemini:{label:"Gemini",endpoint:"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",model:"gemini-3.8-flash"},
 agnes:{label:"Agnes",endpoint:"",model:""}
};
const defaults=provider=>({mode:"direct",provider,...PROVIDERS[provider],apiKey:""});
export function loadAISettings(){try{const saved=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY)||"null");if(saved){const provider=PROVIDERS[saved.provider]?saved.provider:"openai";return {...defaults(provider),...saved,provider}}}catch{}return defaults("openai")}
export function saveAISettings(v){const provider=PROVIDERS[v.provider]?v.provider:"openai";const clean={mode:"direct",provider,endpoint:String(v.endpoint||PROVIDERS[provider].endpoint||"").trim(),model:String(v.model||PROVIDERS[provider].model||"").trim(),apiKey:String(v.apiKey||"").trim()};localStorage.setItem(KEY,JSON.stringify(clean));localStorage.removeItem(OLD_KEY);return clean}
export function clearAISettings(){localStorage.removeItem(KEY);localStorage.removeItem(OLD_KEY)}
export function hasDirectAI(){const s=loadAISettings();return Boolean(s.endpoint&&s.model&&s.apiKey)}
async function openAICompatible(s,{system,user,temperature}){const r=await fetch(s.endpoint,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${s.apiKey}`},body:JSON.stringify({model:s.model,temperature,messages:[{role:"system",content:system},{role:"user",content:user}]})});if(!r.ok)throw new Error(`AI_HTTP_${r.status}`);const d=await r.json();return d.choices?.[0]?.message?.content??d.output_text??""}
async function gemini(s,{system,user,temperature}){const endpoint=s.endpoint.replace("{model}",encodeURIComponent(s.model));const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":s.apiKey},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:user}]}],generationConfig:{temperature}})});if(!r.ok)throw new Error(`AI_HTTP_${r.status}`);const d=await r.json();return d.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||""}
export async function directChat(args){const s=loadAISettings();if(!s.endpoint||!s.model||!s.apiKey)throw new Error("DIRECT_AI_NOT_CONFIGURED");const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),30000);try{const call=s.provider==="gemini"?gemini:openAICompatible;return await call(s,{...args,signal:ctrl.signal})}finally{clearTimeout(timer)}}
export async function testDirectAI(){const text=await directChat({system:"Connection test. Reply with exactly ELYNDRA_OK",user:"ELYNDRA connection test",temperature:0});if(!String(text).trim())throw new Error("EMPTY_AI_RESPONSE");return true}
