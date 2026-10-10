import {timingSafeEqual,createHash} from "node:crypto";
import {DEFAULT_LOCALE,normalizeLocale,languageContract} from "../src/locale-runtime.js";
import {composePromptLanguageContract} from "../src/prompt-language-contract.js";
const json=(res,status,data)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(data))};
export function createRateLimiter({limit=30,windowMs=60000,maxBuckets=10000,now=Date.now}={}){
 const buckets=new Map();
 return {consume(key){
  const time=now();
  for(const [id,bucket] of buckets)if(time-bucket.started>=windowMs)buckets.delete(id);
  const existing=buckets.get(key);
  if(existing){if(existing.count>=limit)return false;existing.count++;return true}
  // Keep active limits intact when the client table is full.
  if(buckets.size>=maxBuckets)return false;
  buckets.set(key,{started:time,count:1});return true
 },get size(){return buckets.size}}
}
let rateLimiter=null,rateConfig="";
function envInt(name,fallback,min,max){const n=Math.round(Number(process.env[name]));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function bodyBytes(body){try{return Buffer.byteLength(typeof body==="string"?body:JSON.stringify(body??{}),"utf8")}catch{return Number.MAX_SAFE_INTEGER}}
function equalSecret(a,b){const x=Buffer.from(String(a||"")),y=Buffer.from(String(b||""));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y)}
function clientKey(req){const trusted=process.env.VERCEL==="1"?req.headers?.["x-vercel-forwarded-for"]||req.headers?.["x-real-ip"]:"";return String(trusted||req.socket?.remoteAddress||"unknown").split(",")[0].trim()}
const RATE_LUA='local n=redis.call("INCR",KEYS[1]);if n==1 then redis.call("PEXPIRE",KEYS[1],ARGV[1]) end;return n';
export async function consumeDistributedRate(key,{url,token,limit=30,windowMs=60000,fetchImpl=fetch}={}){
 if(!url||!token)throw new Error("DISTRIBUTED_RATE_LIMIT_NOT_CONFIGURED");
 const endpoint=new URL(url);if(endpoint.protocol!=="https:")throw new Error("RATE_LIMIT_ENDPOINT_NOT_HTTPS");
 const digest=createHash("sha256").update(String(key)).digest("hex"),response=await fetchImpl(endpoint.toString(),{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(["EVAL",RATE_LUA,"1","elyndra:api:ratelimit:"+digest,String(windowMs)]),signal:AbortSignal.timeout(4000)});
 if(!response.ok)throw new Error("RATE_LIMIT_STORAGE_HTTP_"+response.status);
 const payload=await response.json(),used=Number(payload?.result);if(!Number.isInteger(used)||used<1)throw new Error("RATE_LIMIT_STORAGE_INVALID_RESULT");return used<=limit
}
async function consumeRate(req){const limit=envInt("ELYNDRA_RATE_LIMIT_PER_MINUTE",30,1,600),maxBuckets=envInt("ELYNDRA_MAX_RATE_BUCKETS",10000,100,100000),config=`${limit}:${maxBuckets}`,url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
 if(url||token||process.env.VERCEL==="1")return consumeDistributedRate(clientKey(req),{url,token,limit});
 if(!rateLimiter||rateConfig!==config){rateLimiter=createRateLimiter({limit,maxBuckets});rateConfig=config}return rateLimiter.consume(clientKey(req))}
export function methodGuard(req,res){if(req.method!=="POST"){json(res,405,{error:"METHOD_NOT_ALLOWED"});return false}const expected=String(process.env.ELYNDRA_SERVER_TOKEN||"");if(!expected){json(res,503,{error:"SERVER_API_DISABLED"});return false}const auth=String(req.headers?.authorization||"").replace(/^Bearer\s+/i,"");if(!equalSecret(auth,expected)){json(res,401,{error:"UNAUTHORIZED"});return false}const max=envInt("ELYNDRA_MAX_REQUEST_BYTES",49152,1024,262144);if(bodyBytes(req.body)>max){json(res,413,{error:"REQUEST_TOO_LARGE"});return false}return consumeRate(req).then(rateAllowed=>{if(!rateAllowed){json(res,429,{error:"RATE_LIMITED"});return false}if(!req.elyndraSignal&&typeof AbortController!=="undefined"){const ctrl=new AbortController(),abort=()=>{if(!ctrl.signal.aborted)ctrl.abort(new Error("CLIENT_DISCONNECTED"))};req.elyndraSignal=ctrl.signal;req.once?.("aborted",abort)}return true}).catch(()=>{json(res,503,{error:"RATE_LIMIT_UNAVAILABLE"});return false})}
export function safeBody(req){let body;try{body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{})}catch{throw Object.assign(new Error("INVALID_JSON"),{code:"INVALID_JSON",statusCode:400})}req.elyndraLocale=normalizeLocale(body?.locale||DEFAULT_LOCALE);const max=envInt("ELYNDRA_MAX_REQUEST_BYTES",49152,1024,262144);if(bodyBytes(body)>max)throw Object.assign(new Error("REQUEST_TOO_LARGE"),{code:"REQUEST_TOO_LARGE",statusCode:413});return body}
export function errorStatus(error){const explicit=Number(error?.statusCode||error?.status);if(Number.isInteger(explicit)&&explicit>=400&&explicit<=599)return explicit;if(error?.code==="INVALID_JSON")return 400;if(error?.code==="AI_NOT_CONFIGURED")return 503;if(error?.code==="INVALID_MODEL_JSON"||String(error?.message||"").startsWith("INVALID_MODEL_JSON"))return 422;return 502}
function extractText(data){const value=data?.choices?.[0]?.message?.content??data?.output_text??"";if(Array.isArray(value))return value.map(x=>typeof x==="string"?x:String(x?.text??x?.content??"")).join("");return String(value??"")}
export async function callModel({system,user,temperature=.7,timeoutMs=30000,maxOutputTokens=1200,signal=null,locale=DEFAULT_LOCALE}){system=composePromptLanguageContract(system,languageContract(normalizeLocale(locale)));const endpoint=process.env.AI_API_URL,apiKey=process.env.AI_API_KEY,model=process.env.AI_MODEL;if(!endpoint||!model)throw Object.assign(new Error("AI_NOT_CONFIGURED"),{code:"AI_NOT_CONFIGURED"});const prompt=String(system||"")+String(user||"");if(Buffer.byteLength(prompt,"utf8")>65536)throw Object.assign(new Error("AI_CONTEXT_TOO_LARGE"),{code:"AI_CONTEXT_TOO_LARGE",statusCode:413});timeoutMs=Math.max(5000,Math.min(120000,Math.round(Number(timeoutMs)||30000)));const ctrl=new AbortController();let timedOut=false,upstreamAbort=null;if(signal){upstreamAbort=()=>{if(!ctrl.signal.aborted)ctrl.abort(signal.reason||new Error("CLIENT_ABORT"))};if(signal.aborted)upstreamAbort();else signal.addEventListener?.("abort",upstreamAbort,{once:true})}const timer=setTimeout(()=>{timedOut=true;if(!ctrl.signal.aborted)ctrl.abort(new Error("AI_TIMEOUT"))},timeoutMs),limit=Math.max(256,Math.min(4096,Math.round(Number(maxOutputTokens)||1200)));try{const r=await fetch(endpoint,{method:"POST",signal:ctrl.signal,headers:{"Content-Type":"application/json",...(apiKey?{Authorization:`Bearer ${apiKey}`}:{})},body:JSON.stringify({model,temperature,max_completion_tokens:limit,messages:[{role:"system",content:system},{role:"user",content:user}]})});if(!r.ok)throw new Error(`UPSTREAM_${r.status}`);return extractText(await r.json())}catch(e){if(timedOut)throw Object.assign(new Error(`AI_TIMEOUT: upstream provider exceeded ${Math.round(timeoutMs/1000)} seconds`),{code:"AI_TIMEOUT"});throw e}finally{clearTimeout(timer);if(signal&&upstreamAbort)signal.removeEventListener?.("abort",upstreamAbort)}}
export {json};
