const INTERNAL_TYPES=new Set(["NPC_AUTONOMOUS_ACTION","FACTION_ACTION","WORLD_CANON_EXPANDED","AI_TURN_APPLIED"]);
export function isPlayerVisibleEvent(event){
 if(!event||typeof event!=="object")return false;
 if(event.visibility==="INTERNAL"||event.visibility==="DIRECTOR_ONLY")return false;
 if(["PLAYER_KNOWN","OBSERVABLE","RUMOR"].includes(event.visibility))return true;
 return !INTERNAL_TYPES.has(event.type);
}
export function playerVisibleEvents(state,limit=30){
 const events=Array.isArray(state?.events)?state.events:[];
 return events.filter(isPlayerVisibleEvent).slice(-Math.max(0,limit));
}
export function withVisibility(event,visibility="INTERNAL"){return {...event,visibility}}
