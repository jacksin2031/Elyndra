import * as base from "./contextual-actions.js?v=60031&base=1";
export * from "./contextual-actions.js?v=60031&base=1";

export function suggestionPresentation(state,row){
 const presentation=base.suggestionPresentation(state,row),action=String(row?.action||"").trim();
 if(!action)return presentation;
 return {...presentation,label:action,canonicalAction:action}
}
