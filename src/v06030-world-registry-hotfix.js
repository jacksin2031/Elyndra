import * as base from "./world-registry.js?v=57025&base=1";
export * from "./world-registry.js?v=57025&base=1";

const clean=(value,max=160)=>String(value??"").normalize("NFC").trim().slice(0,max);

function canonicalCurrentLocation(state){
 const rows=state?.world?.registry?.locations||[];
 const player=clean(state?.player?.location),world=clean(state?.world?.state?.location);
 return rows.find(x=>clean(x?.name)===player)||rows.find(x=>clean(x?.name)===world)||null;
}

export function ensureCurrentLocationVisible(state,{reason="PLAYER_PHYSICALLY_PRESENT"}={}){
 const loc=canonicalCurrentLocation(state);if(!loc)return {changed:false,location:null};
 const changed=loc.known!==true;
 if(changed){
  loc.known=true;loc.visibilityLock="KNOWN";loc.discoveredDay??=Number(state?.world?.state?.day)||1;
  state.events??=[];
  const marker="CURRENT_LOCATION_VISIBILITY_REPAIRED:"+String(loc.id||loc.name||"");
  if(!state.events.some(x=>x?.type==="CURRENT_LOCATION_VISIBILITY_REPAIRED"&&String(x?.locationId||"")===String(loc.id||"")))state.events.push({id:"EV-LOC-VIS-"+String(loc.id||Date.now()),type:"CURRENT_LOCATION_VISIBILITY_REPAIRED",visibility:"INTERNAL",locationId:loc.id||null,locationName:loc.name||"",reason,day:Number(state?.world?.state?.day)||1,at:Date.now(),marker});
 }
 return {changed,location:loc};
}

export function ensureWorldRegistry(state){
 const registry=base.ensureWorldRegistry(state);ensureCurrentLocationVisible(state,{reason:"ENSURE_WORLD_REGISTRY"});return registry;
}

export function repairPlayerLocation(state){
 const entity=base.repairPlayerLocation(state);ensureCurrentLocationVisible(state,{reason:"REPAIR_PLAYER_LOCATION"});return entity;
}

export function currentLocationRecord(state){
 ensureCurrentLocationVisible(state,{reason:"CURRENT_LOCATION_READ"});
 const player=clean(state?.player?.location),world=clean(state?.world?.state?.location),rows=state?.world?.registry?.locations||[];
 return rows.find(x=>clean(x?.name)===player)||rows.find(x=>clean(x?.name)===world)||null;
}

export const __v06030={canonicalCurrentLocation};
