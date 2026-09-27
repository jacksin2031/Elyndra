import * as base from "./game-engine.js?v=60006&base=1";
import {safePlayerVisibleText} from "./v06011-locale-runtime-hotfix.js?v=60011";
import {projectSuccessfulTravel,projectPermissionGrant} from "./v06014-turn-projection.js?v=60014";
export * from "./game-engine.js?v=60006&base=1";

const locale=()=>String(globalThis.ELYNDRA_LOCALE||"zh-Hant");
const visible=v=>typeof v==="string"?safePlayerVisibleText(v,locale()):v;
const clean=(v,max=220)=>typeof v==="string"?v.trim().slice(0,max):"";
function localizeArray(rows=[]){return Array.isArray(rows)?rows.map(visible):rows}
function localizeResult(result){
 if(!result||locale()!=="ja")return result;
 if(typeof result.text==="string")result.text=visible(result.text);
 const fx=result.ruleEffects||{};
 if(fx.engineFeasibility){fx.engineFeasibility.reason=visible(fx.engineFeasibility.reason);fx.engineFeasibility.requirements=localizeArray(fx.engineFeasibility.requirements)}
 if(fx.gate?.message)fx.gate.message=visible(fx.gate.message);
 if(fx.npcRelationship?.summary)fx.npcRelationship.summary=visible(fx.npcRelationship.summary);
 if(fx.talentRule?.improvised?.summary)fx.talentRule.improvised.summary=visible(fx.talentRule.improvised.summary);
 if(fx.talentRule?.travelMitigation?.summary)fx.talentRule.travelMitigation.summary=visible(fx.talentRule.travelMitigation.summary);
 return result
}
function localizePlayerEvents(state){
 if(locale()!=="ja"||!Array.isArray(state?.events))return;
 for(const event of state.events.slice(-12)){
  if(event?.visibility==="INTERNAL")continue;
  for(const key of ["summary","text","playerSummary","visibleSummary","reason"])if(typeof event?.[key]==="string")event[key]=visible(event[key])
 }
}
export function performAction(state,action="free",customText="",assessment=null){
 const label=clean(assessment?.normalizedAction||customText||action,220)||"free",result=localizeResult(base.performAction(state,action,customText,assessment));
 if(result&&!result.blocked){projectSuccessfulTravel(state,label,result,assessment||{},visible);projectPermissionGrant(state,label,result,assessment||{},visible)}
 if(locale()==="ja"&&state){if(typeof state.narrative==="string")state.narrative=visible(state.narrative);localizePlayerEvents(state)}
 return result
}
