import * as base from "./ai-client.js?v=60010&base=1";
export * from "./ai-client.js?v=60010&base=1";

const clean=(value,max=180)=>String(value??"").trim().slice(0,max);

export function preservePlayerVisibleAdjustedAction(assessment,requestedAction=""){
 if(!assessment||String(assessment.verdict||"").toUpperCase()!=="ADJUST")return assessment;
 const requested=clean(requestedAction),adjusted=clean(assessment.normalizedAction);
 if(!requested||!adjusted||requested===adjusted)return assessment;
 return {...assessment,engineNormalizedAction:adjusted,normalizedAction:requested,playerVisibleAction:requested};
}

export async function assessPlayerAction(state,action){
 const requested=clean(action);
 const assessment=await base.assessPlayerAction(state,requested);
 return preservePlayerVisibleAdjustedAction(assessment,requested);
}
