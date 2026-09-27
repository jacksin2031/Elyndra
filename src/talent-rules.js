const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));

export const TALENT_RULES=Object.freeze({
 "TAL-INTEL-2":Object.freeze({type:"INFORMATION",trigger:"NPC_INSIGHT",scope:"NPC_SCENE",effect:"EVIDENCE_BOUNDED_INTENT_CLUE"}),
 "TAL-SURVIVAL-3":Object.freeze({type:"MITIGATION",trigger:"TRAVEL_FAILURE",scope:"SCENE",effect:"DANGER_TO_TIME"}),
 "TAL-VANGUARD-2":Object.freeze({type:"REACTION",trigger:"COMPANION_HARM",scope:"ROUND",effect:"INTERCEPT_REDUCE_SEVERITY"}),
 "TAL-ADAPT-2":Object.freeze({type:"PERMISSION",trigger:"IMPROVISE_TOOL",scope:"SCENE",effect:"ORDINARY_ENVIRONMENT_AS_TOOL"})
});

function ownedIds(state){return new Set((state?.player?.talents||[]).map(x=>String(x?.id||""))) }
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
 const base=`${worldKey(state)}:${dayKey(state())}`;
 return base
}
