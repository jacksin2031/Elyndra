const obj=v=>v&&typeof v==="object"&&!Array.isArray(v);
const text=v=>typeof v==="string"?v.trim():"";
const list=v=>{
 if(Array.isArray(v))return v;
 if(typeof v==="string")return v.split(/\n|[；;]/).map(x=>x.trim()).filter(Boolean);
 return []
};

export function normalizeWorldCoreCandidate(core){
 if(!obj(core))return core;
 const theme=text(core.worldTheme);if(theme)core.worldTheme=theme;
 const row=core.seedCompliance?.theme;
 if(theme&&obj(row))row.value=theme;
 core.publicFacts=list(core.publicFacts);
 core.hiddenFacts=list(core.hiddenFacts);
 if(obj(core.worldBible?.weatherSystem)){
  const weather=core.worldBible.weatherSystem;
  if(!Array.isArray(weather.phenomena)&&obj(weather.phenomena))weather.phenomena=Object.values(weather.phenomena);
  if(Array.isArray(weather.phenomena))weather.phenomena=weather.phenomena.filter(obj).map((p,i)=>({...p,id:text(p.id)||`WTH-${i+1}`}));
 }
 return core
}

function mergeValue(base,patch){
 if(Array.isArray(patch))return patch.length?structuredClone(patch):structuredClone(Array.isArray(base)?base:patch);
 if(obj(base)&&obj(patch)){const out=structuredClone(base);for(const [k,v] of Object.entries(patch))out[k]=mergeValue(base[k],v);return out}
 return patch==null||patch===""?structuredClone(base):structuredClone(patch)
}
export function mergeWorldCoreCandidates(base,patch){return normalizeWorldCoreCandidate(mergeValue(obj(base)?base:{},obj(patch)?patch:{}))}

export function worldCoreIssues(core){
 const c=normalizeWorldCoreCandidate(core),issues=[];
 if(!obj(c))return ["core"];
 if(!text(c.worldName))issues.push("worldName");
 if(!text(c.worldTheme))issues.push("worldTheme");
 if(!text(c.summary))issues.push("summary");
 if(!obj(c.seedCompliance))issues.push("seedCompliance");
 if(!obj(c.worldBible))issues.push("worldBible");
 else{
  if(!obj(c.worldBible.civilization))issues.push("worldBible.civilization");
  if(!obj(c.worldBible.communication))issues.push("worldBible.communication");
 }
 const weather=c.worldBible?.weatherSystem;
 if(!obj(weather))issues.push("worldBible.weatherSystem");
 else{
  if(!text(weather.identity))issues.push("worldBible.weatherSystem.identity");
  if(!Array.isArray(weather.phenomena)||weather.phenomena.length<2)issues.push("worldBible.weatherSystem.phenomena>=2")
 }
 if(!Array.isArray(c.publicFacts)||c.publicFacts.filter(x=>text(x)).length<2)issues.push("publicFacts>=2");
 if(!Array.isArray(c.hiddenFacts)||c.hiddenFacts.filter(x=>text(x)).length<2)issues.push("hiddenFacts>=2");
 return [...new Set(issues)]
}

export function validWorldCoreCandidate(core){return worldCoreIssues(core).length===0}
