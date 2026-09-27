import * as base from "./v06017-ai-client-hotfix.js?v=60017";
export * from "./v06017-ai-client-hotfix.js?v=60017";
import {recordDebug} from "./debug-telemetry.js?v=57025";

const clean=(value,max=220)=>String(value??"").trim().slice(0,max);
const JA_REST=/(?:少し|短く|しばらく|一度)?(?:休む|休もう|休み|休憩|一休み|腰を下ろ|眠る|睡眠|野営|キャンプ)/u;
const JA_SOCIAL=/(?:呼びかけ|声をかけ|話しかけ|尋ね|訊ね|聞いて|聞く|教えて|知りませんか|質問|会話|交渉|頼む|お願い)/u;
const JA_TRAVEL=/(?:進む|向かう|歩く|移動|沿って|たどる|辿る|越える|渡る|下る|上る|離れる)/u;
const JA_OBSERVE=/(?:観察|調べ|確認|探す|見回す|見渡す|痕跡|様子を見る|耳を澄ます|聞き耳)/u;
function isJapanese(){return String(globalThis.ELYNDRA_LOCALE||"")==="ja"}

export function classifyJapanesePlayerAction(action=""){
 const q=clean(action);
 if(!q)return null;
 if(JA_REST.test(q))return {kind:"GENERAL",intent:"REST"};
 if(JA_SOCIAL.test(q))return {kind:"SOCIAL",intent:"TALK"};
 if(JA_TRAVEL.test(q))return {kind:"TRAVEL",intent:"TRAVEL"};
 if(JA_OBSERVE.test(q))return {kind:"OBSERVE",intent:"OBSERVE"};
 return null
}
function visibleIntent(intent,presented,classification=null){
 const current=intent&&typeof intent==="object"&&!Array.isArray(intent)?intent:{};
 const next={...current,raw:presented};
 if(classification){next.kind=classification.kind;next.intent=classification.intent}
 if(!Array.isArray(current.subActions)||current.subActions.length<=1)next.subActions=[presented];
 return next
}
export function repairJapanesePlayerAssessment(assessment,requestedAction=""){
 if(!assessment||!isJapanese())return assessment;
 const requested=clean(requestedAction);if(!requested)return assessment;
 const classification=classifyJapanesePlayerAction(requested),verdict=String(assessment.verdict||"ALLOW").toUpperCase();
 const adjusted=verdict==="ADJUST"?clean(assessment.engineNormalizedAction||assessment.normalizedAction):clean(assessment.engineNormalizedAction);
 const next={...assessment,normalizedAction:requested,playerVisibleAction:requested,actionIntent:visibleIntent(assessment.actionIntent,requested,classification)};
 if(classification)next.kind=classification.kind;
 if(adjusted&&adjusted!==requested)next.engineNormalizedAction=adjusted;
 return next
}
function localJapaneseAssessment(state,action){
 if(!isJapanese())return null;const classification=classifyJapanesePlayerAction(action);if(!classification)return null;
 const requested=clean(action),registry=state?.world?.registry||{},npcs=Array.isArray(registry.npcs)?registry.npcs:[],rawLocation=String(state?.player?.location||state?.world?.state?.location||""),loc=Array.isArray(registry.locations)?registry.locations.find(x=>String(x?.id||"")===rawLocation||String(x?.name||"")===rawLocation):null,locId=String(loc?.id||"");
 let targetId=null;if(classification.kind==="SOCIAL"){const present=npcs.filter(n=>n?.known===true&&n?.alive!==false&&(n?.companion?.status==="ACTIVE"||(locId&&String(n?.locationId||"")===locId)));if(present.length===1)targetId=String(present[0].id||"")||null}
 return {verdict:"ALLOW",kind:classification.kind,normalizedAction:requested,playerVisibleAction:requested,reason:"日本語の明示的な行動意図を Engine がローカル判定しました。",requirements:[],confidence:98,source:"ENGINE_FASTPATH_JA",actionIntent:{kind:classification.kind,intent:classification.intent,raw:requested,subActions:[requested],targetId}}
}
export function fastLocalActionAssessment(state,action){return localJapaneseAssessment(state,action)||base.fastLocalActionAssessment(state,action)}
export async function assessPlayerAction(state,action){const requested=clean(action),assessment=await base.assessPlayerAction(state,requested);return repairJapanesePlayerAssessment(assessment,requested)}
function fallbackScene(action,roll,snapshot){
 const requested=clean(action),loc=clean(snapshot?.world?.location||snapshot?.player?.location||"");
 const lead=loc?`${loc}で`:"";
 const narrative=roll?.success===false?`${lead}「${requested}」を試みましたが、目的どおりには進みませんでした。Engineで確定した結果は保持されています。`:`${lead}「${requested}」を試み、Engineで確定した結果が反映されました。`;
 return {narrative,sceneTitle:"",suggestions:[],outcome:roll?.success===false?"FAILURE":"SUCCESS"}
}
export function startTurnAIJobs(action,roll,snapshot,options={}){
 const jobs=base.startTurnAIJobs(action,roll,snapshot,options);if(!isJapanese()||!jobs?.playerAction)return jobs;
 const playerAction=Promise.resolve(jobs.playerAction).catch(error=>{if(options?.signal?.aborted)throw error;recordDebug("PLAYER_ACTION_SCENE_ENGINE_FALLBACK",{action:clean(action,180),error:error?.message||String(error)});return fallbackScene(action,roll,snapshot)});
 return {...jobs,playerAction}
}
