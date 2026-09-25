import {normalizeLore} from "./lore-engine.js?v=57023";
import {normalizeWeatherProfile} from "./weather-engine.js?v=57023";
import {materialSatisfiesClaim} from "./generation-claims.js?v=57023";

const clean=(v,max=400)=>typeof v==="string"?v.trim().slice(0,max):"";
const ACCESS_TYPES=new Set(["ITEM_OWNED","ITEM_USED","ITEM_SHOWN","ITEM_GIVEN","FACT_KNOWN","EVENT_OCCURRED"]);
const uniq=(rows,max=12)=>[...new Set((Array.isArray(rows)?rows:[rows]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);

export function normalizeRuntimeLore(input){
 if(typeof input==="string"){
  const story=clean(input,800);return story?{story,unlockKeywords:[],minMatches:1,known:false,revealedDay:null}:null
 }
 return normalizeLore(input)
}

function weatherRefs(input){
 const out=[];const add=v=>{for(const x of Array.isArray(v)?v:[v]){const s=clean(x,80);if(!s)continue;const ids=s.match(/WTH-[A-Z0-9_-]+/gi);if(ids?.length)out.push(...ids.map(id=>id.toUpperCase()));else if(/^WTH-/i.test(s))out.push(s.toUpperCase())}};
 if(Array.isArray(input)||typeof input==="string")add(input);
 else if(input&&typeof input==="object"){
  add(input.affinities);add(input.dominantPhenomena);add(input.basePhenomena);add(input.phenomena);add(input.primary);add(input.secondary);add(input.modifier)
 }
 return [...new Set(out)].slice(0,8)
}
export function normalizeRuntimeWeatherProfile(input,allowedWeatherIds=[]){
 const allowed=Array.isArray(allowedWeatherIds)&&allowedWeatherIds.length?new Set(allowedWeatherIds.map(String)):null,filter=rows=>rows.filter(id=>!allowed||allowed.has(id));
 const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{},zone=clean(source.zone||source.description||(typeof input==="string"?input:""),100),affinities=filter(weatherRefs(input)),suppressions=filter(weatherRefs(source.suppressions));
 return normalizeWeatherProfile({zone,affinities,suppressions},allowed?[...allowed]:null)
}
export function normalizeRuntimeAccess(input){
 const rows=input==null?[]:(Array.isArray(input)?input:[input]),requirements=[],notes=[];
 for(const row of rows.slice(0,6)){
  if(typeof row==="string"){const note=clean(row,180);if(note)notes.push(note);continue}
  if(!row||typeof row!=="object"||Array.isArray(row))continue;
  const type=String(row.type||"").toUpperCase(),id=clean(row.id,120);if(ACCESS_TYPES.has(type)&&id)requirements.push({type,id,hint:clean(row.hint,160)});
  else {const note=clean(row.hint||row.description||row.text,180);if(note)notes.push(note)}
 }
 return {requirements:requirements.slice(0,4),notes:[...new Set(notes)].slice(0,4)}
}
export function normalizeRuntimeLocation(row={},allowedWeatherIds=[]){
 const access=normalizeRuntimeAccess(row.accessRequirements),lore=normalizeRuntimeLore(row.lore);
 return {...row,lore,weatherProfile:normalizeRuntimeWeatherProfile(row.weatherProfile,allowedWeatherIds),accessRequirements:access.requirements,accessNotes:access.notes}
}

export function normalizeRuntimeNpc(row={}){
 const knowledgeScope=uniq(Array.isArray(row?.knowledgeScope)?row.knowledgeScope:[],12),behaviorRaw=row?.behaviorProfile,behavior=behaviorRaw&&typeof behaviorRaw==="object"&&!Array.isArray(behaviorRaw)?behaviorRaw:{},behaviorText=typeof behaviorRaw==="string"?clean(behaviorRaw,220):"";
 const behaviorProfile={mannerisms:uniq(behavior.mannerisms,4),speechPatterns:uniq(behavior.speechPatterns,4),habits:uniq(behavior.habits,4),values:uniq(behavior.values,4),fears:uniq(behavior.fears,4),contradictions:uniq(behavior.contradictions,4),promises:uniq(behavior.promises,4),grudges:uniq(behavior.grudges,4)};
 if(!behaviorProfile.speechPatterns.length&&clean(behavior.greeting,180))behaviorProfile.speechPatterns=[clean(behavior.greeting,180)];
 if(!behaviorProfile.fears.length&&clean(behavior.fear,180))behaviorProfile.fears=[clean(behavior.fear,180)];
 if(behaviorText&&!behaviorProfile.habits.length)behaviorProfile.habits=[behaviorText];
 const companionRaw=row?.companionProfile,companion=companionRaw&&typeof companionRaw==="object"&&!Array.isArray(companionRaw)?companionRaw:{},companionText=typeof companionRaw==="string"?clean(companionRaw,220):"",join=Math.round(Number(companion.joinThreshold)),leave=Math.round(Number(companion.leaveThreshold));
 const companionProfile={joinThreshold:Number.isFinite(join)?Math.max(5,Math.min(90,join)):35,leaveThreshold:Number.isFinite(leave)?Math.max(0,Math.min(70,leave)):10,motives:uniq(companion.motives,4),boundaries:uniq(companion.boundaries,4)};
 if(!companionProfile.motives.length&&clean(companion.reason,180))companionProfile.motives=[clean(companion.reason,180)];
 if(!companionProfile.boundaries.length&&Array.isArray(companion.conditions))companionProfile.boundaries=uniq(companion.conditions,4);
 if(companionText&&!companionProfile.boundaries.length)companionProfile.boundaries=[companionText];
 return {...row,knowledgeScope,behaviorProfile,companionProfile}
}

export function normalizeRuntimeSideQuest(row={}){
 const evidenceKeywords=uniq(row?.evidenceKeywords,8),rawConditions=row?.conditions;
 const conditionRows=rawConditions==null?[]:(Array.isArray(rawConditions)?rawConditions:[rawConditions]);
 const conditions=conditionRows.map(x=>{if(typeof x==="string")return clean(x,220);if(x&&typeof x==="object"&&!Array.isArray(x))return structuredClone(x);return null}).filter(Boolean).slice(0,5);
 const requested=Number(row?.target),derived=conditions.length?Math.min(3,conditions.length):evidenceKeywords.length?Math.min(3,evidenceKeywords.length):3,target=Math.max(1,Math.min(5,Number.isInteger(requested)?requested:derived));
 return {...row,evidenceKeywords,conditions,target}
}
function runtimeClaimAllowedForKey(claim,key){
 if(claim?.type==="BLUEPRINT_DEFINITION")return key==="definitions";
 if(key==="definitions")return claim?.type==="REQUIRED_ELEMENT";
 return true
}
export function bindRuntimeClaims(plan,key,rows=[]){
 const claims=new Map((plan?.claims||[]).map(x=>[String(x.id),x])),copies=(rows||[]).map(row=>({...row,claimRefs:uniq(row?.claimRefs,6)}));
 for(const row of copies){
  row.claimRefs=row.claimRefs.filter(id=>{const claim=claims.get(String(id));return Boolean(claim&&runtimeClaimAllowedForKey(claim,key)&&materialSatisfiesClaim(claim,row))})
 }
 const used=new Set(copies.flatMap(row=>row.claimRefs.map(String)));
 for(const claim of claims.values()){
  const id=String(claim.id);if(used.has(id)||!runtimeClaimAllowedForKey(claim,key))continue;
  const hit=copies.find(row=>materialSatisfiesClaim(claim,row));if(!hit)continue;hit.claimRefs=[...new Set([...hit.claimRefs,id])];used.add(id)
 }
 return copies
}
