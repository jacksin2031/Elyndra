function stripTrailingModelCommas(value){
 let out="",inString=false,escaped=false;
 for(let i=0;i<value.length;i++){
  const ch=value[i];
  if(inString){
   out+=ch;
   if(escaped)escaped=false;
   else if(ch==="\\")escaped=true;
   else if(ch==='"')inString=false;
   continue
  }
  if(ch==='"'){inString=true;out+=ch;continue}
  if(ch===","){
   let j=i+1;while(j<value.length&&/\s/.test(value[j]))j++;
   if(value[j]==="}"||value[j]==="]")continue
  }
  out+=ch
 }
 return out
}

export function parseModelJSON(raw){
 const source=String(raw??"").trim().replace(/^```(?:json)?\s*/i,"").replace(/```$/,"").trim();
 if(!source)throw new Error("INVALID_MODEL_JSON: empty response");
 const candidates=[source],a=source.indexOf("{"),b=source.lastIndexOf("}");
 if(a>=0&&b>a&&(a!==0||b!==source.length-1))candidates.push(source.slice(a,b+1));
 let lastError=null;
 for(const candidate of [...new Set(candidates)]){
  try{return JSON.parse(candidate)}
  catch(error){lastError=error}
  const repaired=stripTrailingModelCommas(candidate);
  if(repaired!==candidate)try{return JSON.parse(repaired)}catch(error){lastError=error}
 }
 const detail=lastError?.message||"parse failed";
 throw new Error("INVALID_MODEL_JSON: "+detail)
}
