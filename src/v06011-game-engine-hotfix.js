import * as base from "./game-engine.js?v=60006&base=1";
import {safePlayerVisibleText} from "./v06011-locale-runtime-hotfix.js?v=60011";
import {projectSuccessfulTravel,projectPermissionGrant} from "./v06014-turn-projection.js?v=60014";
import {localizeV06015JapaneseVisibleText} from "./v06015-ja-visible-text.js?v=60016";
export * from "./game-engine.js?v=60006&base=1";

const locale=()=>String(globalThis.ELYNDRA_LOCALE||"zh-Hant");
const visible=v=>typeof v==="string"?safePlayerVisibleText(v,locale()):v;
const clean=(v,max=220)=>typeof v==="string"?v.trim().slice(0,max):"";
function projectionVisible(value){
 const text=String(value??"");if(locale()!=="ja")return visible(text);
 let m=text.match(/^你取得了前往「(.+)」的通行許可。$/u);if(m)return `「${m[1]}」への通行許可を得ました。`;
 return localizeV06015JapaneseVisibleText(visible(text))
}
function localizeArray(rows=[]){return Array.isArray(rows)?rows.map(visible):rows}
function localizeResult(result){
 if(!result||locale()!=="ja")return result;
 if(typeof result.text==="string")result.text=projectionVisible(result.text);
 const fx=result.ruleEffects||{};
 if(fx.engineFeasibility){fx.engineFeasibility.reason=projectionVisible(fx.engineFeasibility.reason);fx.engineFeasibility.requirements=Array.isArray(fx.engineFeasibility.requirements)?fx.engineFeasibility.requirements.map(projectionVisible):fx.engineFeasibility.requirements}
 if(fx.gate?.message)fx.gate.message=projectionVisible(fx.gate.message);
 if(fx.npcRelationship?.summary)fx.npcRelationship.summary=projectionVisible(fx.npcRelationship.summary);
 if(fx.talentRule?.improvised?.summary)fx.talentRule.improvised.summary=projectionVisible(fx.talentRule.improvised.summary);
 if(fx.talentRule?.travelMitigation?.summary)fx.talentRule.travelMitigation.summary=projectionVisible(fx.talentRule.travelMitigation.summary);
 return result
}
function localizePlayerEvents(state){
 if(locale()!=="ja"||!Array.isArray(state?.events))return;
 for(const event of state.events.slice(-12)){
  if(event?.visibility==="INTERNAL")continue;
  for(const key of ["summary","text","playerSummary","visibleSummary","reason"])if(typeof event?.[key]==="string")event[key]=projectionVisible(event[key])
 }
}
export function coherentActionAssessment(assessment,customText=""){
 if(!assessment)return assessment;
 const verdict=String(assessment.verdict||"").toUpperCase(),presented=clean(customText,220);
 if(verdict==="ALLOW")return presented?{...assessment,normalizedAction:presented,playerVisibleAction:presented}:assessment;
 if(verdict==="ADJUST"&&clean(assessment.engineNormalizedAction,220))return {...assessment,normalizedAction:clean(assessment.engineNormalizedAction,220),playerVisibleAction:clean(assessment.playerVisibleAction||presented,220)||presented};
 return assessment;
}
export function performAction(state,action="free",customText="",assessment=null){
 const coherentAssessment=coherentActionAssessment(assessment,customText),label=clean(coherentAssessment?.normalizedAction||customText||action,220)||"free",result=localizeResult(base.performAction(state,action,customText,coherentAssessment));
 if(result&&!result.blocked){projectSuccessfulTravel(state,label,result,coherentAssessment||{},projectionVisible);projectPermissionGrant(state,label,result,coherentAssessment||{},projectionVisible)}
 if(locale()==="ja"&&state){if(typeof state.narrative==="string")state.narrative=projectionVisible(state.narrative);localizePlayerEvents(state)}
 return result
}
