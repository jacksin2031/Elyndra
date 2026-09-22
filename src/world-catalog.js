const KINDS=Object.freeze(["CIVILIZATION","SPECIES","LANGUAGE"]);
const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(v,max=12)=>[...new Set((Array.isArray(v)?v:[v]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);
const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};

export const WORLD_CATALOG_KINDS=KINDS;

export function ensureWorldCatalog(state){
 state.world??={};state.world.catalog??={version:1,civilizations:[],species:[],languages:[]};const c=state.world.catalog;
 c.version=1;c.civilizations=Array.isArray(c.civilizations)?c.civilizations:[];c.species=Array.isArray(c.species)?c.species:[];c.languages=Array.isArray(c.languages)?c.languages:[];
 return c
}
function bucket(kind){return kind==="CIVILIZATION"?"civilizations":kind==="SPECIES"?"species":kind==="LANGUAGE"?"languages":null}
function normalizeDefinition(raw={}){
 const kind=String(raw.kind||"").toUpperCase(),name=clean(raw.name,100);if(!KINDS.includes(kind)||!name)return null;
 return {kind,name,description:clean(raw.description,420),traits:uniq(raw.traits,8),regions:uniq(raw.regions,8),historyRefs:uniq(raw.historyRefs,8),claimRefs:uniq(raw.claimRefs,8),known:false,canonical:true}
}
export function validateWorldDefinitions(input){
 const rows=Array.isArray(input)?input:[],errors=[],names=new Set();
 for(const raw of rows){
  const row=normalizeDefinition(raw);if(!row){errors.push("WORLD_DEFINITION_INVALID");continue}
  const key=row.kind+":"+row.name.toLocaleLowerCase();if(names.has(key))errors.push("WORLD_DEFINITION_DUPLICATE:"+key);names.add(key)
 }
 return {valid:errors.length===0,errors:[...new Set(errors)]}
}
export function canonizeWorldDefinitions(state,input=[]){
 const report=validateWorldDefinitions(input);if(!report.valid)throw new Error(report.errors.join(","));
 const catalog=ensureWorldCatalog(state),added=[];
 for(const raw of input){
  const row=normalizeDefinition(raw),key=bucket(row.kind),rows=catalog[key];
  if(rows.some(x=>String(x.name||"").toLocaleLowerCase()===row.name.toLocaleLowerCase()))continue;
  const id="DEF-"+row.kind+"-"+hash(row.kind+"|"+row.name+"|"+(state.world?.id||"WORLD"));
  const out={id,...row,createdRevision:Number(state.world?.version)||1};rows.push(out);added.push(out)
 }
 return added
}
export function worldCatalogSnapshot(state,{director=false}={}){
 const c=ensureWorldCatalog(state),map=rows=>rows.map(x=>director?structuredClone(x):{id:x.id,kind:x.kind,name:x.known===true?x.name:"UNKNOWN",known:x.known===true});
 return {version:c.version,civilizations:map(c.civilizations),species:map(c.species),languages:map(c.languages)}
}
export function worldCatalogDefinitions(state){
 const c=ensureWorldCatalog(state);return [...c.civilizations,...c.species,...c.languages]
}
