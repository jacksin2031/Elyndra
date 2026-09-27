import {normalizeActionIntent} from "./action-intent.js?v=60000";
import {buildResolutionOutcome} from "./resolution-engine.js?v=60000";
import {resolveSocialAction,socialActionDc,socialConflictSnapshot} from "./social-conflict-engine.js?v=60002";
import {buildActionCheck,trainActionSkill} from "./check-engine.js?v=60004";
import {d20} from "./world-engine.js?v=59014";
import {ensureNpcCognition,npcCommitmentSnapshot,npcPlannerSnapshot,npcRelationshipSnapshot} from "./npc-cognition.js?v=57025";
import {commitNpcInsightTalent,planNpcInsightTalent} from "./talent-rules.js?v=60004";

const clean=(v,max=320)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const REQUEST=/請你|拜託|讓我|允許|准許|給我|告訴我|帶我|幫我|協助我|跟我走|加入我|放我|借我|賣我|show me|tell me|give me|help me|allow me|let me|join me|come with me/i;
const INTIMIDATE=/威脅|恐嚇|不然|否則|後果|後悔|你會後悔|別逼我|不讓.+(?:就|便|的話)|殺了你|揍你|摧毀|intimidat|threat|or else|you(?:'|’)ll regret/i;
const DECEIVE=/我騙|我說謊|假稱|謊稱|冒充|假裝自己|欺騙|deceiv|\blie\b|pretend to be/i;
const BARGAIN=/交換|交易|報酬|付你|給你錢|條件|成交|討價還價|bargain|offer you|pay you|trade|deal/i;
const PERSUADE=/說服|勸說|勸他|懇求|談判|協商|persuad|convince|plead|negotiate/i;

export function classifyNpcSpeechAct(message){
 const raw=clean(message);if(!raw)return {kind:"CHAT",substantive:false,approach:"INSTINCT",goal:"continue_conversation"};
 if(INTIMIDATE.test(raw))return {kind:"INTIMIDATE",substantive:true,approach:"INTIMIDATION",goal:"change_npc_decision"};
 if(DECEIVE.test(raw))return {kind:"DECEIVE",substantive:true,approach:"DECEPTION",goal:"change_npc_belief_or_decision"};
 if(BARGAIN.test(raw))return {kind:"BARGAIN",substantive:true,approach:"PERSUASION",goal:"reach_exchange_or_compromise"};
 if(PERSUADE.test(raw))return {kind:"PERSUADE",substantive:true,approach:"PERSUASION",goal:"change_npc_decision"};
 if(REQUEST.test(raw))return {kind:"REQUEST",substantive:true,approach:"PERSUASION",goal:"obtain_npc_cooperation"};
 return {kind:"CHAT",substantive:false,approach:"INSTINCT",goal:"continue_conversation"}
}
function relationScore(r){return (Number(r.trust)||0)*.42+(Number(r.respect)||0)*.32+(Number(r.obligation)||0)*.24-(Number(r.fear)||0)*.3}
function dispositionFor(r){const s=relationScore(r);return s>=58?"ALLY":s>=32?"WARM":s>=8?"NEUTRAL":s>=-15?"WARY":"HOSTILE"}
export function npcAgencySnapshot(state,npc){
 ensureNpcCognition(state,npc);const rel=npcRelationshipSnapshot(state,npc).player,commitments=npcCommitmentSnapshot(state,npc),planner=npcPlannerSnapshot(state,npc),social=socialConflictSnapshot(state,npc),open=commitments.filter(x=>x.status==="OPEN"),grudge=open.some(x=>x.kind==="GRUDGE"),promise=open.some(x=>x.kind==="PROMISE"),score=relationScore(rel);let policy="INDEPENDENT";
 if((Number(rel.fear)||0)>=85)policy="SELF_PRESERVE";else if(grudge&&score<20)policy="OPPOSE";else if((Number(rel.obligation)||0)>=60||(Number(rel.trust)||0)>=70)policy="COOPERATE";else if(score<0)policy="RESIST";else if(promise)policy="HONOR_COMMITMENT";
 return {disposition:dispositionFor(rel),policy,priority:String(planner?.priority||"GOAL"),nextStep:String(planner?.nextStep||"ADVANCE_GOAL"),hasOpenCommitment:open.length>0,socialStance:String(social?.stance||"NEUTRAL")}
}
function rollFor(state,message,dc,provided){if(provided&&typeof provided==="object")return {...provided,dc:Number(provided.dc??dc)};const check=buildActionCheck(state,message,{kind:"SOCIAL",dc}),roll=d20(check.dc,check.bonus);return Object.assign(roll,{profile:{kind:check.kind,attribute:check.attribute,skill:check.skill,skillLabel:check.skillLabel},modifiers:check.modifiers,baseDC:check.baseDC,difficulty:check.difficulty})}
function directive(outcome){return ({REFUSE:"MUST_REFUSE_REQUEST",COUNTEROFFER:"MUST_COUNTEROFFER_WITHOUT_FULL_CONCESSION",WAVER:"MAY_SHOW_DOUBT_BUT_MUST_NOT_FULLY_CONCEDE",CONCEDE:"MUST_CONCEDE_THE_ENGINE_APPROVED_REQUEST",SURRENDER:"MUST_STOP_RESISTING",ESCALATE:"MUST_ESCALATE_DISTRUST_OR_RESISTANCE"})[outcome]||"MUST_NOT_INVENT_CONCESSION"}
function cloneNpc(state,npc){const copy=structuredClone(state),rows=copy?.world?.registry?.npcs||[];return {state:copy,npc:rows.find(x=>String(x.id)===String(npc?.id))||rows.find(x=>String(x.name)===String(npc?.name))||structuredClone(npc)}}
export function planNpcConversationAction(state,npc,message,options={}){
 const speechAct=classifyNpcSpeechAct(message),agency=npcAgencySnapshot(state,npc),talentInsight=planNpcInsightTalent(state,{npcId:npc?.id||npc?.name||"npc",message,agency});if(talentInsight)return {version:3,requiresResolution:false,requiresCommit:true,speechAct,agency,talentInsight,aiContract:{authority:"ENGINE",mode:"CHAT",directive:"ROLEPLAY_WITH_ENGINE_APPROVED_INSIGHT_ONLY",approvedInsight:talentInsight.clue,insightPolicy:talentInsight.evidencePolicy,disposition:agency.disposition,policy:agency.policy,mustFollow:true}};if(!speechAct.substantive)return {version:3,requiresResolution:false,speechAct,agency,aiContract:{authority:"ENGINE",mode:"CHAT",directive:"ROLEPLAY_ONLY_NO_STATE_CONCESSION",disposition:agency.disposition,policy:agency.policy,mustFollow:true}};
 const preset={intent:"SOCIAL",approach:speechAct.approach,goal:speechAct.goal,targets:[String(npc?.id||npc?.name||"npc")],kind:"SOCIAL",risk:speechAct.kind==="INTIMIDATE"||speechAct.kind==="DECEIVE"?"HIGH":"MEDIUM",raw:clean(message)};
 const intent=normalizeActionIntent(preset,message,"SOCIAL",state),dc=socialActionDc(state,npc,intent,{combat:false}),roll=rollFor(state,message,dc,options.roll),resolution=buildResolutionOutcome({roll,intent,snapshot:{agency}}),preview=cloneNpc(state,npc),social=resolveSocialAction(preview.state,preview.npc,intent,resolution,{combat:false});
 return {version:3,requiresResolution:true,speechAct,agency,intent,dc,roll,resolution,expectedOutcome:social.outcome,expectedSummary:social.summary,aiContract:{authority:"ENGINE",mode:"RESOLVED_SOCIAL_ACTION",speechAct:speechAct.kind,tactic:social.tactic,outcome:social.outcome,goalAchieved:resolution.goalAchieved===true,directive:directive(social.outcome),disposition:agency.disposition,policy:agency.policy,mustFollow:true}}
}
export function commitNpcConversationAction(state,npc,plan){
 if(plan?.talentInsight?.pendingUse){const talentInsight=commitNpcInsightTalent(state,plan.talentInsight);return {committed:talentInsight.applied,talentInsight,agency:npcAgencySnapshot(state,npc)}}if(!plan?.requiresResolution)return {committed:false,reason:"CHAT_ONLY",agency:npcAgencySnapshot(state,npc)};const social=resolveSocialAction(state,npc,plan.intent,plan.resolution,{combat:false});const training=trainActionSkill(state,"SOCIAL",plan.roll);return {committed:true,social,training,outcomeMatchesPlan:social.outcome===plan.expectedOutcome,agency:npcAgencySnapshot(state,npc)}
}
