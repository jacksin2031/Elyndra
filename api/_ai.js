const json=(res,status,data)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(data))};
export function methodGuard(req,res){if(req.method!=="POST"){json(res,405,{error:"METHOD_NOT_ALLOWED"});return false}return true}
export function safeBody(req){return typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{})}
export async function callModel({system,user,temperature=.7}){
 const endpoint=process.env.AI_API_URL,apiKey=process.env.AI_API_KEY,model=process.env.AI_MODEL;
 if(!endpoint||!model)throw Object.assign(new Error("AI_NOT_CONFIGURED"),{code:"AI_NOT_CONFIGURED"});
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);
 try{
  const r=await fetch(endpoint,{method:"POST",signal:ctrl.signal,headers:{"Content-Type":"application/json",...(apiKey?{Authorization:`Bearer ${apiKey}`}:{})},body:JSON.stringify({model,temperature,messages:[{role:"system",content:system},{role:"user",content:user}]})});
  if(!r.ok)throw new Error(`UPSTREAM_${r.status}`);const d=await r.json();return d.choices?.[0]?.message?.content??d.output_text??"";
 }finally{clearTimeout(timer)}
}
export {json};
