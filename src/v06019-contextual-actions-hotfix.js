import * as base from "./v06015-contextual-actions-hotfix.js?v=60015";
export * from "./v06015-contextual-actions-hotfix.js?v=60015";
import {hasLocaleLeak} from "./locale-runtime.js?v=60010";

const clean=(v,max=220)=>String(v??"").trim().slice(0,max);
function isJapanese(){return String(globalThis.ELYNDRA_LOCALE||"")==="ja"}
function visibleSuggestion(row){
 if(!row||!isJapanese())return row;
 const label=clean(row.label),action=clean(row.action),visible=label&&!hasLocaleLeak(label,"ja")?label:(action&&!hasLocaleLeak(action,"ja")?action:"");
 if(!visible||visible===action)return row;
 return {...row,engineAction:row.engineAction||action,action:visible,label:visible}
}
function projectSet(set={}){return {primary:(set.primary||[]).map(visibleSuggestion),highRisk:(set.highRisk||[]).map(visibleSuggestion),all:(set.all||[]).map(visibleSuggestion)}}
export function buildContextualActionSet(state,rows=[],options={}){return projectSet(base.buildContextualActionSet(state,rows,options))}
export function regenerateContextualActionSet(state,options={}){return projectSet(base.regenerateContextualActionSet(state,options))}
function visibleIntent(intent,presented){const current=intent&&typeof intent==="object"&&!Array.isArray(intent)?intent:{};const next={...current,raw:presented};if(!Array.isArray(current.subActions)||current.subActions.length<=1)next.subActions=[presented];return next}
export function trustedSuggestionAssessment(state,row){
 if(!row)return null;const presented=visibleSuggestion(row),engineAction=clean(presented?.engineAction||presented?.action),engineRow=engineAction&&engineAction!==presented?.action?{...presented,action:engineAction,label:engineAction}:presented,assessment=base.trustedSuggestionAssessment(state,engineRow);if(!assessment)return null;
 if(!isJapanese())return assessment;const requested=clean(presented?.action);if(!requested)return assessment;
 const adjusted=clean(assessment.normalizedAction);return {...assessment,normalizedAction:requested,playerVisibleAction:requested,engineNormalizedAction:adjusted&&adjusted!==requested?adjusted:assessment.engineNormalizedAction,actionIntent:visibleIntent(assessment.actionIntent,requested)}
}
export function suggestionPresentation(state,row){const projected=visibleSuggestion(row),presentation=base.suggestionPresentation(state,projected);if(!projected?.action)return presentation;return {...presentation,label:projected.action,canonicalAction:projected.action}}
