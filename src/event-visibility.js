const PLAYER_VISIBILITY=new Set(["PLAYER_KNOWN","OBSERVABLE","RUMOR"]);
const SAFE_KEYS=new Set(["id","type","visibility","day","time","at","summary","customText","action","itemName","npcName","scope","stage","futureStage","impactScope","domains","locationName","recipeName","questTitle","weatherName","title"]);
export function isPlayerVisibleEvent(event){
 if(!event||typeof event!=="object")return false;
 return PLAYER_VISIBILITY.has(String(event.visibility||"").toUpperCase())
}
export function projectPlayerEvent(event){
 if(!isPlayerVisibleEvent(event))return null;const out={};
 for(const key of SAFE_KEYS)if(event[key]!=null)out[key]=structuredClone(event[key]);
 if(!out.summary&&typeof event.observableEffect==="string")out.summary=event.observableEffect.slice(0,500);
 return out
}
export function playerVisibleEvents(state,limit=30){
 const events=Array.isArray(state?.events)?state.events:[];
 return events.filter(isPlayerVisibleEvent).slice(-Math.max(0,limit)).map(projectPlayerEvent).filter(Boolean)
}
export function withVisibility(event,visibility="INTERNAL"){
 const v=String(visibility||"INTERNAL").toUpperCase();return {...event,visibility:["PLAYER_KNOWN","OBSERVABLE","RUMOR","INTERNAL","DIRECTOR_ONLY"].includes(v)?v:"INTERNAL"}
}