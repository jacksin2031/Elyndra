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

function insertMissingModelCommas(value){
 let out="",inString=false,escaped=false;
 for(let i=0;i<value.length;i++){
  const ch=value[i];
  if(inString){out+=ch;if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')inString=false;continue}
  if(ch==='"'){inString=true;out+=ch;continue}
  if(ch==='{'||ch==='['){let j=out.length-1;while(j>=0&&/\s/.test(out[j]))j--;if(out[j]==='}'||out[j]===']')out=out.slice(0,j+1)+','+out.slice(j+1)}
  out+=ch
 }
 return out
}

function insertMissingPropertyCommas(value){
 const key='"(?:\\\\.|[^"\\\\])*"\\s*:';
 let out=value;
 out=out.replace(new RegExp('([}\\]"])(\\s*)('+key+')','g'),'$1,$2$3');
 out=out.replace(new RegExp('(\\b(?:true|false|null)|-?\\d+(?:\\.\\d+)?)(\\s*)('+key+')','g'),'$1,$2$3');
 return out
}

function closeUnfinishedModelJSON(value){
 let inString=false,escaped=false,stack=[];
 for(const ch of value){
  if(inString){if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')inString=false;continue}
  if(ch==='"'){inString=true;continue}
  if(ch==='{')stack.push('}');else if(ch==='[')stack.push(']');else if(ch==='}'||ch===']'){if(stack.at(-1)!==ch)return value;stack.pop()}
 }
 if(inString||!stack.length||stack.length>4)return value;
 return value+[...stack].reverse().join('')
}

function firstBalancedModelJSON(value){
 return balancedModelJSONCandidates(value)[0]||""
}

function balancedModelJSONCandidates(value){
 const out=[];
 for(let start=0;start<value.length;start++){
  const opener=value[start];if(opener!=="{"&&opener!=="[")continue;
  let inString=false,escaped=false,invalid=false;const stack=[opener==="{"?"}":"]"];
  for(let i=start+1;i<value.length;i++){
   const ch=value[i];
   if(inString){if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')inString=false;continue}
   if(ch==='"'){inString=true;continue}
   if(ch==="{"||ch==="[")stack.push(ch==="{"?"}":"]");
   else if(ch==="}"||ch==="]"){
    if(stack.at(-1)!==ch){invalid=true;break}
    stack.pop();if(!stack.length){out.push(value.slice(start,i+1));start=i;break}
   }
  }
  if(invalid)continue
 }
 return out
}

export function parseModelJSON(raw){
 const source=String(raw??"").trim().replace(/^```(?:json)?\s*/i,"").replace(/```$/,"").trim();
 if(!source)throw new Error("INVALID_MODEL_JSON: empty response");
 const balanced=firstBalancedModelJSON(source),candidates=[source];if(balanced&&balanced!==source)candidates.push(balanced);
 for(const candidate of balancedModelJSONCandidates(source))if(candidate&&candidate!==source)candidates.push(candidate);
 for(const match of source.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi))for(const candidate of balancedModelJSONCandidates(match[1]))candidates.push(candidate);
 const a=source.indexOf("{"),b=source.lastIndexOf("}");
 if(a>=0&&b>a&&(a!==0||b!==source.length-1))candidates.push(source.slice(a,b+1));
 let lastError=null;
 for(const candidate of [...new Set(candidates)]){
  try{return JSON.parse(candidate)}
  catch(error){lastError=error}
  const repaired=stripTrailingModelCommas(candidate);
  if(repaired!==candidate)try{return JSON.parse(repaired)}catch(error){lastError=error}
  const structural=insertMissingModelCommas(repaired);
  if(structural!==repaired)try{return JSON.parse(structural)}catch(error){lastError=error}
  const properties=insertMissingPropertyCommas(structural);
  if(properties!==structural)try{return JSON.parse(properties)}catch(error){lastError=error}
  const closed=closeUnfinishedModelJSON(properties);
  if(closed!==properties)try{return JSON.parse(closed)}catch(error){lastError=error}
 }
 const detail=lastError?.message||"parse failed";
 throw new Error("INVALID_MODEL_JSON: "+detail)
}
