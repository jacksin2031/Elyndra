import * as base from "./ai-client.js?v=60010&base=1";
import {applyJapaneseActionSemantics,japaneseFastAssessment} from "./v06019-ja-action-semantics.js?v=60019";
export * from "./ai-client.js?v=60010&base=1";

const clean=(value,max=180)=>String(value??"").trim().slice(0,max);
function visibleIntent(intent,presented){
 if(!intent||typeof intent!=="object"||Array.isArray(intent))return intent;
 const next={...intent,raw:presented};
 if(Array.isArray(intent.subActions)&&intent.subActions.length===1)next.subActions=[presented];
 return next
}

export function preservePlayerVisibleAdjustedAction(assessment,requestedAction=""){
 if(!assessment||String(assessment.verdict||"").toUpperCase()!=="ADJUST")return assessment;
 const requested=clean(requestedAction),adjusted=clean(assessment.normalizedAction);
 if(!requested||!adjusted||requested===adjusted)return assessment;
 return {...assessment,engineNormalizedAction:adjusted,normalizedAction:requested,playerVisibleAction:requested,actionIntent:visibleIntent(assessment.actionIntent,requested)}
}

export function fastLocalActionAssessment(state,action){
 const requested=clean(action),jaFast=globalThis.ELYNDRA_LOCALE==="ja"?japaneseFastAssessment(requested):null;
 if(jaFast)return jaFast;
 return base.fastLocalActionAssessment(state,requested)
}

export async function assessPlayerAction(state,action){
 const requested=clean(action),assessment=await base.assessPlayerAction(state,requested),visible=preservePlayerVisibleAdjustedAction(assessment,requested);
 if(globalThis.ELYNDRA_LOCALE==="ja")applyJapaneseActionSemantics(visible,requested);
 return visible
}
