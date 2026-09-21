export function parseModelJSON(raw){
 const source=String(raw??"").trim().replace(/^```(?:json)?\s*/i,"").replace(/```$/,"").trim();
 if(!source)throw new Error("INVALID_MODEL_JSON: empty response");
 const candidates=[source],a=source.indexOf("{"),b=source.lastIndexOf("}");
 if(a>=0&&b>a&&(a!==0||b!==source.length-1))candidates.push(source.slice(a,b+1));
 let lastError=null;
 for(const candidate of [...new Set(candidates)]){
  try{return JSON.parse(candidate)}
  catch(error){lastError=error}
 }
 const detail=lastError?.message||"parse failed";
 throw new Error("INVALID_MODEL_JSON: "+detail)
}
