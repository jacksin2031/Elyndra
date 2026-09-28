import * as base from "./turn-compiler.js?v=57029&base=1";
export * from "./turn-compiler.js?v=57029&base=1";

const clean=value=>String(value??"").normalize("NFC").trim();
const rowIds=row=>[row?.engineAction,row?.action,row?.playerVisibleAction,row?.label].map(clean).filter(Boolean);
function sameAction(row,action=""){const target=clean(action);return Boolean(target&&rowIds(row).includes(target))}
function uniqueRows(rows=[]){const out=[];for(const row of rows){const action=clean(row?.action),label=clean(row?.label);if(!action||out.some(x=>clean(x.action)===action||clean(x.label)===label))continue;out.push(row);if(out.length>=4)break}return out}

export function recoverPriorAiSuggestions(previous=[],executedAction=""){
 const recovered=[];
 for(const raw of Array.isArray(previous)?previous:[]){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
  if(String(raw.source||"").toUpperCase()==="ENGINE")continue;
  if(sameAction(raw,executedAction))continue;
  const normalized=base.normalizeSuggestionIntent(raw);if(!normalized)continue;
  recovered.push({...normalized,source:String(raw.source||"AI").toUpperCase()==="ENGINE"?"AI":"AI",engineAction:clean(raw.engineAction)||undefined,playerVisibleAction:clean(raw.playerVisibleAction)||undefined})
 }
 return uniqueRows(recovered)
}

function filterExecuted(rows=[],action=""){
 return uniqueRows((Array.isArray(rows)?rows:[]).filter(row=>!sameAction(row,action)))
}

function withAiRecovery(result,context={}){
 const fresh=filterExecuted(result?.suggestionIntents||[],context.action);
 if(fresh.length)return {...result,suggestionIntents:fresh,suggestions:fresh.map(x=>x.label),suggestionRecovery:"FRESH_AI"};
 const recovered=recoverPriorAiSuggestions(context.priorSuggestionIntents||[],context.action);
 if(recovered.length)return {...result,suggestionIntents:recovered,suggestions:recovered.map(x=>x.label),suggestionRecovery:"PRIOR_AI"};
 return result
}

export function sceneTurnPreview(scene,roll={},context={}){
 return withAiRecovery(base.sceneTurnPreview(scene,roll,context),context)
}

export function mergeTurnCandidates(scene,state,roll={},context={}){
 return withAiRecovery(base.mergeTurnCandidates(scene,state,roll,context),context)
}

export const __v06028={sameAction,filterExecuted};
