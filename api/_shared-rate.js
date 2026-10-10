import {createHash} from "node:crypto";

// Fixed-window limit is enforced by Redis, so separate serverless instances share one quota.
// Caller must fail closed on transport/configuration errors.
export function rateIdentity(req={},env=process.env){
 const headers=req.headers||{};
 const remote=String(req.socket?.remoteAddress||"unknown");
 const trusted=env.ELYNDRA_TRUST_PROXY==="1";
 const forwarded=trusted?String(headers["x-vercel-forwarded-for"]||headers["x-forwarded-for"]||"").split(",")[0].trim():"";
 const ip=forwarded||remote;
 return createHash("sha256").update(ip).digest("hex").slice(0,32);
}
export async function consumeRedisRate({url,token,identity,limit=30,windowMs=60000,fetchImpl=fetch,now=Date.now,namespace="elyndra"}={}){
 if(!/^https:\/\//i.test(String(url||""))||!token)throw new Error("SHARED_RATE_LIMIT_NOT_CONFIGURED");
 const epoch=Math.floor(now()/windowMs);
 const key=String(namespace).replace(/[^a-zA-Z0-9:_-]/g,"").slice(0,50)+":ai-rate:"+String(identity)+":"+epoch;
 const response=await fetchImpl(String(url).replace(/\/$/,"")+"/pipeline",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify([["INCR",key],["PEXPIRE",key,windowMs*2]]),signal:AbortSignal.timeout(4000)});
 if(!response.ok)throw new Error("SHARED_RATE_LIMIT_HTTP_"+response.status);
 const rows=await response.json();
 if(!Array.isArray(rows)||rows[0]?.error||rows[1]?.error||rows[1]?.result===undefined)throw new Error("SHARED_RATE_LIMIT_INVALID_RESPONSE");
 const used=Number(rows[0]?.result);
 if(!Number.isSafeInteger(used)||used<1)throw new Error("SHARED_RATE_LIMIT_INVALID_COUNT");
 return used<=limit;
}
