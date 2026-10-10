
const HANT_CHAR_MAP=Object.freeze({"这":"這","转":"轉","询":"詢","问":"問","当":"當","视":"視","现":"現","节":"節","轻":"輕","触":"觸","锋":"鋒","锐":"銳","属":"屬","边":"邊","缘":"緣","测":"測","试":"試","温":"溫","质":"質","闭":"閉","仪":"儀","监":"監","为":"為","从":"從","确":"確","认":"認","记":"記","录":"錄","状":"狀","态":"態","细":"細","详":"詳","标":"標","围":"圍","环":"環","参":"參","见":"見","续":"續","验":"驗","证":"證","获":"獲","长":"長","设":"設","仅":"僅","报":"報","断":"斷","体":"體","统":"統","网":"網","络":"絡","灵":"靈","气":"氣","区":"區","门":"門","进":"進","观":"觀","点":"點","线":"線","导":"導","级":"級","结":"結","构":"構","开":"開","关":"關","与":"與","动":"動","无":"無","处":"處","应":"應","术":"術","觉":"覺","话":"話","资":"資","阶":"階"});
function normalizeModelHant(value){
 if(typeof value==="string")return [...value].map(ch=>HANT_CHAR_MAP[ch]||ch).join("");
 if(Array.isArray(value))return value.map(normalizeModelHant);
 if(value&&typeof value==="object"){for(const key of Object.keys(value))value[key]=normalizeModelHant(value[key]);return value}
 return value
}
function parsedModelJSON(value){return normalizeModelHant(JSON.parse(value))}
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

function repairMismatchedModelClosers(value){
 let out="",inString=false,escaped=false,stack=[];
 for(const ch of value){
  if(inString){out+=ch;if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')inString=false;continue}
  if(ch==='"'){inString=true;out+=ch;continue}
  if(ch==='{'){stack.push('}');out+=ch;continue}if(ch==='['){stack.push(']');out+=ch;continue}
  if(ch==='}'||ch===']'){if(stack.at(-1)===ch){stack.pop();out+=ch;continue}const deeper=stack.lastIndexOf(ch);if(deeper<0)return value;while(stack.length-1>deeper)out+=stack.pop();stack.pop();out+=ch;continue}
  out+=ch
 }
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

function leadingBalancedModelJSON(value){
 const opener=value[0];if(opener!=="{"&&opener!=="[")return "";let inString=false,escaped=false;const stack=[opener==="{"?"}":"]"];
 for(let i=1;i<value.length;i++){const ch=value[i];if(inString){if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')inString=false;continue}if(ch==='"'){inString=true;continue}if(ch==="{"||ch==="[")stack.push(ch==="{"?"}":"]");else if(ch==="}"||ch==="]"){if(stack.at(-1)!==ch)return "";stack.pop();if(!stack.length)return value.slice(0,i+1)}}return ""
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
 const structuredStart=source[0]==="{"||source[0]==="[",balanced=structuredStart?leadingBalancedModelJSON(source):firstBalancedModelJSON(source),candidates=[source];if(balanced&&balanced!==source)candidates.push(balanced);
 if(!structuredStart)for(const candidate of balancedModelJSONCandidates(source))if(candidate&&candidate!==source)candidates.push(candidate);
 if(!structuredStart)for(const match of source.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi))for(const candidate of balancedModelJSONCandidates(match[1]))candidates.push(candidate);
 const a=source.indexOf("{"),b=source.lastIndexOf("}");
 if(!structuredStart&&a>=0&&b>a&&(a!==0||b!==source.length-1))candidates.push(source.slice(a,b+1));
 let lastError=null;
 for(const candidate of [...new Set(candidates)]){
  try{return parsedModelJSON(candidate)}
  catch(error){lastError=error}
  const repaired=stripTrailingModelCommas(candidate);
  if(repaired!==candidate)try{return parsedModelJSON(repaired)}catch(error){lastError=error}
  const structural=insertMissingModelCommas(repaired);
  if(structural!==repaired)try{return parsedModelJSON(structural)}catch(error){lastError=error}
  const properties=insertMissingPropertyCommas(structural);
  if(properties!==structural)try{return parsedModelJSON(properties)}catch(error){lastError=error}
  const nested=repairMismatchedModelClosers(properties);
  if(nested!==properties)try{return parsedModelJSON(nested)}catch(error){lastError=error}
  const closed=closeUnfinishedModelJSON(nested);
  if(closed!==properties)try{return parsedModelJSON(closed)}catch(error){lastError=error}
 }
 const detail=lastError?.message||"parse failed";
 throw new Error("INVALID_MODEL_JSON: "+detail)
}
