const DEFAULT_MAX_BODY_BYTES=512*1024,DEFAULT_RATE_LIMIT=30,DEFAULT_WORLD_RATE_LIMIT=4,RATE_WINDOW_MS=60_000;
const rateBuckets=new Map();
const header=(req,name)=>String(req?.headers?.[name.toLowerCase()]??req?.headers?.[name]??"").trim();
const envInt=(name,fallback,min,max)=>{const n=Math.round(Number(process.env[name]));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback};
const byteLength=value=>new TextEncoder().encode(String(value??"")).length;
const maxBodyBytes=()=>envInt("ELYNDRA_MAX_REQUEST_BYTES",DEFAULT_MAX_BODY_BYTES,16*1024,2*1024*1024);
const secretEqual=(a,b)=>{a=String(a||"");b=String(b||"");if(!a||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0};
const json=(res,status,data)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data))};
const error=(code,status)=>Object.assign(new Error(code),{code,statusCode:status});
export function serverGatewayReady(){return process.env.ELYNDRA_SERVER_AI_ENABLED==="true"&&Boolean(String(process.env.ELYNDRA_GATEWAY_TOKEN||"").trim())}
function sameOrigin(req,origin){
 const forwardedHost=header(req,"x-forwarded-host").split(",")[0].trim(),host=forwardedHost||header(req,"host");if(!host)return false;
 const proto=header(req,"x-forwarded-proto").split(",")[0].trim()||"https";
 return origin===proto+"://"+host
}
function originAllowed(req){
 const origin=header(req,"origin");if(!origin)return true;
 if(sameOrigin(req,origin))return true;
 const allowed=String(process.env.ELYNDRA_ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
 return allowed.includes(origin)
}
function requestKey(req){
 const forwarded=header(req,"x-forwarded-for").split(",")[0].trim();
 return forwarded||String(req?.socket?.remoteAddress||"unknown")
}
function rateLimit(req,res){
 const world=/\/api\/world(?:\?|$)/.test(String(req?.url||"")),limit=envInt(world?"ELYNDRA_WORLD_RATE_LIMIT_PER_MINUTE":"ELYNDRA_RATE_LIMIT_PER_MINUTE",world?DEFAULT_WORLD_RATE_LIMIT:DEFAULT_RATE_LIMIT,1,600);
 const now=Date.now(),key=(world?"world:":"api:")+requestKey(req),current=rateBuckets.get(key);
 const bucket=!current||now-current.startedAt>=RATE_WINDOW_MS?{startedAt:now,count:0}:current;bucket.count++;rateBuckets.set(key,bucket);
 if(rateBuckets.size>1000)for(const [k,v] of rateBuckets)if(now-v.startedAt>=RATE_WINDOW_MS)rateBuckets.delete(k);
 if(bucket.count<=limit)return true;
 const retry=Math.max(1,Math.ceil((RATE_WINDOW_MS-(now-bucket.startedAt))/1000));res.setHeader("Retry-After",String(retry));json(res,429,{error:"RATE_LIMITED",retryAfterSeconds:retry});return false
}
export function methodGuard(req,res){
 if(req.method!=="POST"){json(res,405,{error:"METHOD_NOT_ALLOWED"});return false}
 if(process.env.ELYNDRA_SERVER_AI_ENABLED!=="true"){json(res,503,{error:"SERVER_AI_DISABLED"});return false}
 const expected=String(process.env.ELYNDRA_GATEWAY_TOKEN||"").trim();
 if(!expected){json(res,503,{error:"SERVER_AI_AUTH_REQUIRED"});return false}
 if(!secretEqual(header(req,"x-elyndra-gateway-token"),expected)){json(res,401,{error:"UNAUTHORIZED"});return false}
 if(!originAllowed(req)){json(res,403,{error:"ORIGIN_NOT_ALLOWED"});return false}
 const declared=Number(header(req,"content-length"));if(Number.isFinite(declared)&&declared>maxBodyBytes()){json(res,413,{error:"REQUEST_TOO_LARGE"});return false}
 return rateLimit(req,res)
}
export function safeBody(req){
 const raw=req?.body??{};
 if(typeof raw==="string"){
  if(byteLength(raw)>maxBodyBytes())throw error("REQUEST_TOO_LARGE",413);
  try{const parsed=JSON.parse(raw||"{}");if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw error("INVALID_JSON",400);return parsed}catch(e){if(e?.code)throw e;throw error("INVALID_JSON",400)}
 }
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw error("INVALID_JSON",400);
 let serialized;try{serialized=JSON.stringify(raw)}catch{throw error("INVALID_JSON",400)}
 if(byteLength(serialized)>maxBodyBytes())throw error("REQUEST_TOO_LARGE",413);
 return raw
}
export async function callModel({system,user,temperature=.7,timeoutMs=30000,maxOutputTokens=0}){
 const endpoint=process.env.AI_API_URL,apiKey=process.env.AI_API_KEY,model=process.env.AI_MODEL;
 if(!endpoint||!model)throw Object.assign(new Error("AI_NOT_CONFIGURED"),{code:"AI_NOT_CONFIGURED"});
 timeoutMs=Math.max(5000,Math.min(120000,Math.round(Number(timeoutMs)||30000)));
 const ctrl=new AbortController();let timedOut=false;const timer=setTimeout(()=>{timedOut=true;ctrl.abort(new Error("AI_TIMEOUT"))},timeoutMs);const requested=Math.round(Number(maxOutputTokens)||0),limit=requested?Math.max(256,Math.min(8192,requested)):0;
 try{
  const r=await fetch(endpoint,{method:"POST",signal:ctrl.signal,headers:{"Content-Type":"application/json",...(apiKey?{Authorization:`Bearer ${apiKey}`}:{})},body:JSON.stringify({model,temperature,...(limit?{max_completion_tokens:limit}:{}),messages:[{role:"system",content:system},{role:"user",content:user}]})});
  if(!r.ok)throw new Error(`UPSTREAM_${r.status}`);const d=await r.json();return d.choices?.[0]?.message?.content??d.output_text??"";
 }catch(e){if(timedOut)throw Object.assign(new Error(`AI_TIMEOUT: upstream provider exceeded ${Math.round(timeoutMs/1000)} seconds`),{code:"AI_TIMEOUT"});throw e}
 finally{clearTimeout(timer)}
}
export {json};
