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


const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>text(x)).filter(Boolean))];
export function buildWorldAnchorContract(core,pacing){
 const b=core?.worldBible||{},weather=b.weatherSystem||{};
 return {
  worldName:text(core?.worldName),worldTheme:text(core?.worldTheme),
  startingRegion:text(b.startingRegion),startingSettlement:text(b.startingSettlement),startingLocation:text(b.startingLocation),
  centralConflict:text(b.centralConflict),currentCrisis:text(b.currentCrisis),magicCost:text(b.magicCost),era:text(b.era),tone:text(b.tone),
  civilization:obj(b.civilization)?structuredClone(b.civilization):{},communication:obj(b.communication)?structuredClone(b.communication):{},
  weatherPhenomena:(Array.isArray(weather.phenomena)?weather.phenomena:[]).map(x=>({id:text(x.id),name:text(x.name),observableName:text(x.observableName)})).filter(x=>x.id),
  publicFacts:uniq(core?.publicFacts).slice(0,4),timelinePacing:structuredClone(pacing||{})
 }
}
export function mergeOpeningRegion(anchor,geography,society){
 const g=obj(geography)?geography:{},s=obj(society)?society:{},location=obj(g.location)?g.location:{};
 return {
  openingHook:text(g.openingHook),
  locations:[{
   ...location,
   name:text(location.name)||anchor.startingLocation,
   region:text(location.region)||anchor.startingRegion,
   culture:obj(s.locationCulture)?s.locationCulture:{},
   trade:obj(s.locationTrade)?s.locationTrade:{}
  }],
  factions:obj(s.faction)?[s.faction]:[]
 }
}
export function worldGenerationLinkIssues({anchor,history,geography,society,future,cast}={}){
 const issues=[],histIds=new Set((Array.isArray(history)?history:[]).map(x=>text(x?.id)).filter(Boolean)),start=anchor?.startingLocation||"",region=anchor?.startingRegion||"";
 const location=geography?.location;
 if(!obj(location)||text(location.name)!==start)issues.push("GEOGRAPHY_STARTING_LOCATION_MISMATCH");
 if(!obj(location)||text(location.region)!==region)issues.push("GEOGRAPHY_STARTING_REGION_MISMATCH");
 const checkRefs=(refs,label)=>{const values=uniq(refs);if(!values.length)issues.push(label+"_HISTORY_REF_REQUIRED");else if(values.some(id=>!histIds.has(id)))issues.push(label+"_HISTORY_REF_INVALID")};
 if(obj(society)){
  if(text(society.locationRef)!==start)issues.push("SOCIETY_LOCATION_REF_INVALID");
  checkRefs(society.historyRefs,"SOCIETY");
  if(obj(society.faction)&&text(society.faction.locationName||start)!==start)issues.push("SOCIETY_FACTION_LOCATION_INVALID")
 }else issues.push("SOCIETY_INVALID");
 for(const [i,event] of (Array.isArray(future?.worldTimeline)?future.worldTimeline:[]).entries()){
  const links=obj(event?.links)?event.links:{};
  if(!uniq(links.historyRefs).length&&!uniq(links.locationRefs).length)issues.push("FUTURE_"+i+"_LINK_REQUIRED");
  if(uniq(links.historyRefs).some(id=>!histIds.has(id)))issues.push("FUTURE_"+i+"_HISTORY_REF_INVALID");
  if(uniq(links.locationRefs).some(id=>![start,region,"STARTING_LOCATION","STARTING_REGION"].includes(id)))issues.push("FUTURE_"+i+"_LOCATION_REF_INVALID")
 }
 if(obj(cast)){
  for(const [i,npc] of (Array.isArray(cast.npcs)?cast.npcs:[]).entries()){
   if(text(npc?.locationName)!==start)issues.push("CAST_NPC_"+i+"_LOCATION_INVALID");
   const refs=uniq(npc?.historyRefs);if(refs.some(id=>!histIds.has(id)))issues.push("CAST_NPC_"+i+"_HISTORY_REF_INVALID")
  }
  for(const [i,q] of (Array.isArray(cast.sideQuests)?cast.sideQuests:[]).entries()){
   const refs=uniq(q?.historyRefs);if(refs.some(id=>!histIds.has(id)))issues.push("CAST_QUEST_"+i+"_HISTORY_REF_INVALID");
   const hasLink=refs.length||text(q?.factionName)||text(q?.npcName)||text(q?.locationName);
   if(!hasLink)issues.push("CAST_QUEST_"+i+"_LINK_REQUIRED")
  }
 }
 return [...new Set(issues)]
}
