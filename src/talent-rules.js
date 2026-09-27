const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));

export const TALENT_RULES=Object.freeze({
 "TAL-INTEL-2":Object.freeze({type:"INFORMATION",trigger:"NPC_INSIGHT",scope:"NPC_SCENE",effect:"EVIDENCE_BOUNDED_INTENT_CLUE"}),
 "TAL-SURVIVAL-3":Object.freeze({type:"MITIGATION",trigger:"TRAVEL_FAILURE",scope:"SCENE",effect:"DANGER_TO_TIME"}),
 "TAL-VANGUARD-2":Object.freeze({type:"REACTION",trigger:"COMPANION_HARM",scope:"ROUND",effect:"INTERCEPT_REDUCE_SEVERITY"}),
 "TAL-ADAPT-2":Object.freeze({type:"PERMISSION",trigger:"IMPROVISE_TOOL",scope:"SCENE",effect:"ORDINARY_ENVIRONMENT_AS_TOOL"})
});

function ownedIds(state){return new Set((state?.player?.talents||[]).map(x=>String(x?.id||"")))}
export function hasTalent(state,talentId){return ownedIds(state).has(String(talentId||""))}
export function talentRuleDefinition(talentId){const rule=TALENT_RULES[String(talentId||"")];return rule?{...rule}:null}

export function ensureTalentRuleRuntime(state){
 const p=state.player??(state.player={});p.talentRuntime??={version:2,uses:{}};p.talentRuntime.version=2;p.talentRuntime.uses??={};return p.talentRuntime
}
function worldKey(state){return String(state?.world?.id||"world")}
function dayKey(state){return Math.max(1,Math.round(Number(state?.world?.state?.day)||1))}
function locationKey(state){return String(state?.player?.location||state?.world?.state?.location||"unknown")}
function encounterKey(state){return String(state?.combat?.encounter?.id||state?.combat?.startedAtLocationId||"encounter")}
export function talentRuleScopeKey(state,scope="SCENE",context={}){
 const base=`${worldKey(state)}:${dayKey(state)}`;
 if(scope==="ROUND")return `${base}:ROUND:${encounterKey(state)}:${Math.max(1,Math.round(Number(state?.combat?.round)||1))}`;
 if(scope==="NPC_SCENE")return `${base}:NPC:${locationKey(state)}:${String(context.targetId||"npc")}`;
 if(scope==="DAY")return `${base}:DAY`;
 return `${base}:SCENE:${locationKey(state)}`
}
function usageKey(state,talentId,scope,context){return `${String(talentId)}:${talentRuleScopeKey(state,scope,context)}`}
export function talentUseAvailable(state,talentId,{scope=null,targetId=null}={}){
 const rule=TALENT_RULES[String(talentId||"")];if(!rule||!hasTalent(state,talentId))return false;const runtime=ensureTalentRuleRuntime(state),effectiveScope=scope||rule.scope,key=usageKey(state,talentId,effectiveScope,{targetId});return !runtime.uses[key]
}
export function consumeTalentUse(state,talentId,{scope=null,targetId=null,reason=""}={}){
 const rule=TALENT_RULES[String(talentId||"")];if(!rule||!talentUseAvailable(state,talentId,{scope,targetId}))return {applied:false,reason:"UNAVAILABLE"};
 const runtime=ensureTalentRuleRuntime(state),effectiveScope=scope||rule.scope,key=usageKey(state,talentId,effectiveScope,{targetId}),entry={talentId:String(talentId),trigger:rule.trigger,scope:effectiveScope,scopeKey:talentRuleScopeKey(state,effectiveScope,{targetId}),targetId:targetId?String(targetId):null,reason:String(reason||"").slice(0,180),day:dayKey(state),at:Date.now()};runtime.uses[key]=entry;
 state.events??=[];state.events.push({id:id(),type:"TALENT_RULE_USED",visibility:"PLAYER_KNOWN",...entry});return {applied:true,rule:{...rule},usage:{...entry}}
}

const IMPROVISE=/就地取材|臨時工具|臨時材料|附近(?:的)?(?:物件|東西|材料)|隨手拿|improvis(?:e|ed|ing)|makeshift|use nearby/i;
export function useImprovisedToolTalent(state,{label=""}={}){
 if(!IMPROVISE.test(String(label||"")))return {applied:false,reason:"NOT_REQUESTED"};
 const used=consumeTalentUse(state,"TAL-ADAPT-2",{reason:"把現場普通物件視為本次行動的合適臨時工具"});if(!used.applied)return used;
 return {...used,permission:"ORDINARY_ENVIRONMENT_AS_TOOL",checkBonus:1,summary:"你把附近普通物件改造成足以完成這次嘗試的臨時工具。"}
}

export function mitigateTravelFailureWithTalent(state,{baseMinutes=45,resolution=null}={}){
 if(resolution?.goalAchieved===true)return {applied:false,reason:"GOAL_ALREADY_ACHIEVED"};
 const used=consumeTalentUse(state,"TAL-SURVIVAL-3",{reason:"把旅行失敗的直接危險代價轉成更慢、更保守的行進"});if(!used.applied)return used;
 const extraMinutes=Math.max(15,Math.round(Math.max(1,Number(baseMinutes)||45)*.5));
 return {...used,conversion:{from:"DANGER_OR_POSITION",to:"TIME"},extraMinutes,summary:`你沒有強行冒進，而是改走更慢的安全路線；代價是額外 ${extraMinutes} 分鐘。`}
}

export function interceptCompanionHarmWithTalent(state,{damage=0}={}){
 const incoming=Math.max(0,Math.round(Number(damage)||0));if(!incoming)return {applied:false,reason:"NO_DAMAGE"};
 const used=consumeTalentUse(state,"TAL-VANGUARD-2",{scope:"ROUND",reason:"攔截原本會落在同行者身上的戰鬥傷害"});if(!used.applied)return {...used,companionDamage:incoming,redirectedToPlayer:0,prevented:0};
 const redirectedToPlayer=Math.max(1,Math.ceil(incoming/2)),prevented=1,companionDamage=Math.max(0,incoming-redirectedToPlayer-prevented);
 return {...used,companionDamage,redirectedToPlayer,prevented,summary:`你迎上原本會擊中同行者的攻勢，自己承受 ${redirectedToPlayer} 點傷害，並減輕了剩餘衝擊。`}
}

const INSIGHT=/讀懂弦外之音|看出.+(?:迴避|避開|隱瞞)|讀出.+真正意思|read between the lines|what (?:are|is) .+ avoiding/i;
export function isNpcInsightTalentRequest(message){return INSIGHT.test(String(message||""))}
function insightClue(agency={}){
 const policy=String(agency.policy||"INDEPENDENT"),stance=String(agency.socialStance||"NEUTRAL"),priority=String(agency.priority||"GOAL"),next=String(agency.nextStep||"ADVANCE_GOAL");
 if(policy==="SELF_PRESERVE")return "你察覺對方真正避開的不是問題本身，而是任何會讓自己陷入更大危險的承諾。";
 if(policy==="OPPOSE")return "你察覺對方的迴避帶有主動抗拒；繼續施壓很可能只會讓立場更硬。";
 if(policy==="HONOR_COMMITMENT")return "你察覺對方的保留與既有承諾有關；他似乎不願做出會違背那項承諾的表態。";
 if(policy==="COOPERATE")return "你察覺對方並非拒絕合作，而是在避開一個他尚未願意承擔的具體代價。";
 if(policy==="RESIST"||stance==="RESISTANT"||stance==="HOSTILE")return "你察覺對方的保留主要來自戒備與不信任，而不是單純不知道答案。";
 if(priority==="NEED"||/SAFETY|FOOD|REST|TREATMENT/.test(next))return "你察覺對方此刻優先處理的是自己的迫切需要，因此刻意避開會把他拖進新麻煩的話題。";
 return "你察覺對方正在保留立場：他願意繼續談，但刻意不把自己綁進明確承諾。"
}
export function planNpcInsightTalent(state,{npcId="",message="",agency={}}={}){
 if(!isNpcInsightTalentRequest(message))return null;if(!talentUseAvailable(state,"TAL-INTEL-2",{scope:"NPC_SCENE",targetId:npcId}))return null;
 return {talentId:"TAL-INTEL-2",pendingUse:true,scope:"NPC_SCENE",targetId:String(npcId||"npc"),clue:insightClue(agency),evidencePolicy:"AGENCY_ONLY_NO_HIDDEN_CANON"}
}
export function commitNpcInsightTalent(state,plan){
 if(!plan?.pendingUse||plan.talentId!=="TAL-INTEL-2")return {applied:false,reason:"NO_PENDING_INSIGHT"};return consumeTalentUse(state,"TAL-INTEL-2",{scope:"NPC_SCENE",targetId:plan.targetId,reason:"使用已由 Engine 限界的弦外之音觀察"})
}

export function talentRulesSnapshot(state){
 const runtime=ensureTalentRuleRuntime(state);return {version:2,owned:[...ownedIds(state)].filter(id=>TALENT_RULES[id]).map(id=>({id,rule:{...TALENT_RULES[id]}})),uses:Object.values(runtime.uses).map(x=>({...x}))}
}
