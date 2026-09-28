import * as raw from "./v06015-contextual-actions-hotfix.js?v=60015";
import * as v20 from "./v06020-contextual-actions-hotfix.js?v=60020";
export * from "./v06020-contextual-actions-hotfix.js?v=60020";

function projectSharedSet(set={}){
 const cache=new Map();
 const project=row=>{
  if(!row)return row;
  if(cache.has(row))return cache.get(row);
  const projected=v20.projectV06020JapaneseSuggestionIdentity(row);
  cache.set(row,projected);
  return projected
 };
 return {
  primary:(set.primary||[]).map(project),
  highRisk:(set.highRisk||[]).map(project),
  all:(set.all||[]).map(project)
 }
}

export function projectV06021ContextualSet(set={}){return projectSharedSet(set)}
export function buildContextualActionSet(state,rows=[],options={}){return projectSharedSet(raw.buildContextualActionSet(state,rows,options))}
export function regenerateContextualActionSet(state,options={}){return projectSharedSet(raw.regenerateContextualActionSet(state,options))}
export function trustedSuggestionAssessment(state,row){return v20.trustedSuggestionAssessment(state,row)}
export function suggestionPresentation(state,row){return v20.suggestionPresentation(state,row)}
