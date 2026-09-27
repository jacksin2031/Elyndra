import * as base from "./game-engine.js?v=60006&base=1";
import {safePlayerVisibleText} from "./v06011-locale-runtime-hotfix.js?v=60011";
import {projectSuccessfulTravel,projectPermissionGrant} from "./v06014-turn-projection.js?v=60014";
import {localizeV06015JapaneseVisibleText} from "./v06015-ja-visible-text.js?v=60018";
import {applyJapaneseActionSemantics,explicitJapaneseActionSemantics} from "./v06019-ja-action-semantics.js?v=60019";
import {recordDebug} from "./debug-telemetry.js?v=57025";
export * from "./game-engine.js?v=60006&base=1";

const locale=()=>String(globalThis.ELYNDRA_LOCALE||"zh-Hant");
const visible=v=>typeof v==="string"?safePlayerVisibleText(v,locale()):v;
const clean=(v,max=220)=>typeof v==="string"?v.trim().slice(0,max):"";
function projectionVisible(value){
 const text=String(value??"");if(locale()!=="ja")return visible(text);
 let m=text.match(/^你取得了前往「(.+)」的通行許可。$/u);if(m)return `「${m[1]}」への通行許可を得ました。`;
 m=text.match(/^你休息了\s*(\d+)\s*分鐘。身體狀態按時間與環境條件恢復。$/u);if(m)return `${m[1]}分休みました。時間と環境条件に応じて身体状態が回復しました。`;
 return localizeV06015JapaneseVisibleText(visible(text))
}
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
function synchronizePresentedActionIntent(assessment,presented){
 const intent=assessment?.actionIntent;if(!intent||typeof intent!=="object"||Array.isArray(intent))return;
 const next={...intent,raw:presented};
 if(Array.isArray(intent.subActions)&&intent.subActions.length===1)next.subActions=[presented];
 assessment.actionIntent=next
}
function unambiguousPresentNpcId(state){
 const registry=state?.world?.registry||{},rows=Array.isArray(registry.npcs)?registry.npcs:[],current=clean(state?.player?.location||state?.world?.state?.location,160);if(!current||!rows.length)return "";
 const loc=(registry.locations||[]).find(x=>x?.id===current||x?.name===current),currentId=String(loc?.id||current),candidates=rows.filter(npc=>{
  if(!npc||npc.alive===false)return false;const here=String(npc.locationId||npc.location||"");return here===currentId||here===current
 });
 return candidates.length===1?String(candidates[0].id||""):""
}
function bindUnambiguousJapaneseSocialTarget(state,assessment,presented){
 const semantic=locale()==="ja"?explicitJapaneseActionSemantics(presented):null;if(!assessment||semantic?.kind!=="SOCIAL")return;
 const intent=assessment.actionIntent&&typeof assessment.actionIntent==="object"&&!Array.isArray(assessment.actionIntent)?assessment.actionIntent:{};
 if(clean(intent.targetId||assessment.targetId,160))return;const targetId=unambiguousPresentNpcId(state);if(!targetId)return;
 assessment.actionIntent={...intent,targetId};assessment.targetId=targetId
}
function scalarState(state){
 const s=state?.player?.survival||{};return {hp:Number(state?.player?.hp),satiety:Number(s.satiety),fatigue:Number(s.fatigue),exposure:Number(s.exposure),injury:Number(s.injury)}
}
function recordScalarStateChanges(state,before,sourceAction=""){
 const after=scalarState(state),labels={hp:"HP",satiety:"satiety",fatigue:"fatigue",exposure:"exposure",injury:"injury"},changes={};
 for(const key of Object.keys(after)){if(Number.isFinite(before[key])&&Number.isFinite(after[key])&&before[key]!==after[key])changes[key]={from:before[key],to:after[key],delta:after[key]-before[key]}}
 const keys=Object.keys(changes);if(!keys.length)return;
 const summary=keys.map(key=>`${labels[key]||key} ${changes[key].from}→${changes[key].to}`).join(" · "),clock=state?.world?.state?.clock||{};
 recordDebug("GAME_PLAYER_STATE_CHANGED",{sourceAction:clean(sourceAction,180),summary,changes,clock:{day:Number(state?.world?.state?.day)||Number(clock.day)||0,time:`${String(Number(clock.hour)||0).padStart(2,"0")}:${String(Number(clock.minute)||0).padStart(2,"0")}`}})
}
export function coherentActionAssessment(assessment,customText=""){
 if(!assessment)return assessment;
 const verdict=String(assessment.verdict||"").toUpperCase(),presented=clean(customText,220);
 if(locale()==="ja"&&presented)applyJapaneseActionSemantics(assessment,presented);
 if(verdict==="ALLOW"){
  if(!presented)return assessment;
  assessment.normalizedAction=presented;assessment.playerVisibleAction=presented;synchronizePresentedActionIntent(assessment,presented);return assessment
 }
 if(verdict==="ADJUST"&&clean(assessment.engineNormalizedAction,220)){
  const next={...assessment,actionIntent:assessment.actionIntent&&typeof assessment.actionIntent==="object"?{...assessment.actionIntent}:assessment.actionIntent,normalizedAction:clean(assessment.engineNormalizedAction,220),playerVisibleAction:clean(assessment.playerVisibleAction||presented,220)||presented};
  if(locale()==="ja"&&presented)applyJapaneseActionSemantics(next,presented,{engine:true});return next
 }
 return assessment
}
export function performAction(state,action="free",customText="",assessment=null){
 const presented=clean(customText||action,220)||"free",before=scalarState(state),coherentAssessment=coherentActionAssessment(assessment,customText);bindUnambiguousJapaneseSocialTarget(state,coherentAssessment,presented);
 const engineAssessment=coherentAssessment&&typeof coherentAssessment==="object"?{...coherentAssessment,actionIntent:coherentAssessment.actionIntent&&typeof coherentAssessment.actionIntent==="object"?{...coherentAssessment.actionIntent}:coherentAssessment.actionIntent}:coherentAssessment,semantic=locale()==="ja"?explicitJapaneseActionSemantics(presented):null;
 if(engineAssessment&&semantic){applyJapaneseActionSemantics(engineAssessment,presented,{engine:true});if(semantic.intent==="REST"&&semantic.engineAction){engineAssessment.verdict="ADJUST";engineAssessment.normalizedAction=semantic.engineAction;engineAssessment.engineNormalizedAction=semantic.engineAction}}
 const projectionLabel=clean(coherentAssessment?.playerVisibleAction||presented,220)||presented,result=localizeResult(base.performAction(state,action,customText,engineAssessment));
 if(result&&!result.blocked){projectSuccessfulTravel(state,projectionLabel,result,coherentAssessment||{},projectionVisible);projectPermissionGrant(state,projectionLabel,result,coherentAssessment||{},projectionVisible)}
 if(locale()==="ja"&&state){if(typeof result?.text==="string")state.narrative=result.text;else if(typeof state.narrative==="string")state.narrative=projectionVisible(state.narrative);localizePlayerEvents(state)}
 recordScalarStateChanges(state,before,projectionLabel);
 return result
}
