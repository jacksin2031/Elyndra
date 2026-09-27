import * as base from "./v06019-contextual-actions-hotfix.js?v=60019";
export * from "./v06019-contextual-actions-hotfix.js?v=60019";
import {hasV06020JapaneseLeak,localizeV06020JapaneseVisibleText} from "./v06020-ja-manual-ui.js?v=60020";

const clean=(v,max=220)=>String(v??"").trim().slice(0,max);
const EXACT=Object.freeze({
 "利用現場環境製造一個觀察機會":"周囲の環境を利用して観察の機会を作る",
 "冒険靠近最明顯的危險源":"最も目立つ危険源へあえて近づく",
 "找出能推進目前目標的具體證據":"現在の目標を進められる具体的な証拠を探す"
});
function japanese(){return String(globalThis.ELYNDRA_LOCALE||"")==="ja"}
function candidate(value){const raw=clean(value);if(!raw)return "";const exact=EXACT[raw];if(exact)return exact;const localized=clean(localizeV06020JapaneseVisibleText(raw));return localized&&!hasV06020JapaneseLeak(localized)?localized:""}
export function projectV06020JapaneseSuggestionIdentity(row){
 if(!row||!japanese())return row;
 const originalAction=clean(row.engineAction||row.action),visible=candidate(row.playerVisibleAction)||candidate(row.label)||candidate(row.action)||"目の前で確認できることを一つ試す";
 return {...row,engineAction:originalAction||visible,action:visible,label:visible,playerVisibleAction:visible}
}
function projectSet(set={}){return {primary:(set.primary||[]).map(projectV06020JapaneseSuggestionIdentity),highRisk:(set.highRisk||[]).map(projectV06020JapaneseSuggestionIdentity),all:(set.all||[]).map(projectV06020JapaneseSuggestionIdentity)}}
export function buildContextualActionSet(state,rows=[],options={}){return projectSet(base.buildContextualActionSet(state,rows,options))}
export function regenerateContextualActionSet(state,options={}){return projectSet(base.regenerateContextualActionSet(state,options))}
function visibleIntent(intent,presented){const current=intent&&typeof intent==="object"&&!Array.isArray(intent)?intent:{};const next={...current,raw:presented};if(!Array.isArray(current.subActions)||current.subActions.length<=1)next.subActions=[presented];return next}
export function trustedSuggestionAssessment(state,row){
 if(!row)return null;const presented=projectV06020JapaneseSuggestionIdentity(row),engineAction=clean(presented?.engineAction||presented?.action),engineRow=engineAction&&engineAction!==presented?.action?{...presented,action:engineAction,label:engineAction}:presented,assessment=base.trustedSuggestionAssessment(state,engineRow);if(!assessment||!japanese())return assessment;
 const requested=clean(presented?.action);if(!requested)return assessment;const adjusted=clean(assessment.engineNormalizedAction||assessment.normalizedAction);
 return {...assessment,normalizedAction:requested,playerVisibleAction:requested,engineNormalizedAction:adjusted&&adjusted!==requested?adjusted:assessment.engineNormalizedAction,actionIntent:visibleIntent(assessment.actionIntent,requested)}
}
export function suggestionPresentation(state,row){const projected=projectV06020JapaneseSuggestionIdentity(row),presentation=base.suggestionPresentation(state,projected);if(!projected?.action)return presentation;return {...presentation,label:projected.action,canonicalAction:projected.action}}
