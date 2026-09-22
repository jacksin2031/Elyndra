const LEVELS=Object.freeze(["UNSEEN","HINTED","OBSERVED","KNOWN","CANON_LOCKED"]);
const RANK=Object.fromEntries(LEVELS.map((x,i)=>[x,i]));
const GROUPS={location:"locations",npc:"npcs",faction:"factions",sideQuest:"sideQuests"};
const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(v,max=16)=>[...new Set((Array.isArray(v)?v:[v]).map(x=>clean(x,120)).filter(Boolean))].slice(0,max);
const level=v=>RANK[String(v||"").toUpperCase()]!=null?String(v).toUpperCase():"UNSEEN";

export const VISIBILITY_LOCK_LEVELS=LEVELS;

function currentLocationName(state){return clean(state?.player?.location||state?.world?.state?.location,160)}
function inferredLevel(state,kind,entity){
 if(entity?.canonLocked===true)return "CANON_LOCKED";
 if(entity?.known===true)return "KNOWN";
 if(kind==="npc"&&entity?.encountered===true)return "OBSERVED";
 if(kind==="location"&&clean(entity?.name,160)===currentLocationName(state))return "OBSERVED";
 return "UNSEEN"
}
function normalizeLock(state,kind,entity){
 const current=level(entity?.visibilityLock),inferred=inferredLevel(state,kind,entity),next=RANK[inferred]>RANK[current]?inferred:current;
 entity.visibilityLock=next;
 entity.visibilityHint=entity.visibilityHint&&typeof entity.visibilityHint==="object"?{
  summary:clean(entity.visibilityHint.summary,300),
  fields:uniq(entity.visibilityHint.fields,16),
  source:clean(entity.visibilityHint.source,120),
  day:Number(entity.visibilityHint.day)||null
 }:null;
 return next
}
export function ensureVisibilityLocks(state){
 const r=state?.world?.registry;if(!r)return null;
 for(const [kind,key] of Object.entries(GROUPS))for(const entity of Array.isArray(r[key])?r[key]:[])normalizeLock(state,kind,entity);
 state.world.visibilityLocks??={version:1};state.world.visibilityLocks.version=1;return state.world.visibilityLocks
}
export function visibilityLevel(state,kind,id){
 ensureVisibilityLocks(state);const key=GROUPS[kind],entity=key?(state.world?.registry?.[key]||[]).find(x=>x.id===id):null;return entity?level(entity.visibilityLock):null
}
export function advanceVisibilityLock(state,kind,id,to,meta={}){
 ensureVisibilityLocks(state);const key=GROUPS[kind],entity=key?(state.world?.registry?.[key]||[]).find(x=>x.id===id):null;if(!entity)return null;
 const target=level(to),current=level(entity.visibilityLock);if(RANK[target]<RANK[current])return entity.visibilityLock;
 if(RANK[target]>RANK[current]){entity.visibilityLock=target;entity.visibilityChangedDay=Number(state.world?.state?.day)||1;entity.visibilityReason=clean(meta.reason,180)}
 if(target==="HINTED"){
  const fields=uniq(meta.fields,16);entity.visibilityHint={summary:clean(meta.summary,300),fields,source:clean(meta.source,120),day:Number(state.world?.state?.day)||1}
 }
 if(target==="KNOWN")entity.known=true;
 if(target==="CANON_LOCKED"){entity.canonLocked=true;entity.known=entity.known===true}
 return entity.visibilityLock
}
export function markEntityHinted(state,kind,id,meta={}){return advanceVisibilityLock(state,kind,id,"HINTED",meta)}
export function markEntityObserved(state,kind,id,meta={}){return advanceVisibilityLock(state,kind,id,"OBSERVED",meta)}
export function markEntityKnown(state,kind,id,meta={}){return advanceVisibilityLock(state,kind,id,"KNOWN",meta)}
export function lockEntityCanon(state,kind,id,meta={}){return advanceVisibilityLock(state,kind,id,"CANON_LOCKED",meta)}
export function backgroundMutableFields(entity,fields=[]){
 const current=level(entity?.visibilityLock);
 if(!["UNSEEN","HINTED"].includes(current))return [];
 if(current==="UNSEEN")return [...fields];
 const protectedFields=new Set(uniq(entity?.visibilityHint?.fields,32));
 return fields.filter(x=>!protectedFields.has(x))
}
export function canBackgroundMutateEntity(entity){return backgroundMutableFields(entity,["description"]).length>0}
export function visibilityLockSnapshot(state,{director=false}={}){
 ensureVisibilityLocks(state);const r=state?.world?.registry||{},out={};
 for(const [kind,key] of Object.entries(GROUPS))out[key]=(r[key]||[]).map(x=>director?{id:x.id,name:x.name||x.title||"",visibilityLock:level(x.visibilityLock),visibilityHint:x.visibilityHint?structuredClone(x.visibilityHint):null}:{id:x.id,visibilityLock:level(x.visibilityLock)});
 return out
}
