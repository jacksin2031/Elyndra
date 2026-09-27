const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const numberOrNull=v=>Number.isFinite(Number(v))?Number(v):null;

export const RESOLUTION_TIERS=Object.freeze([
 "CRITICAL_SUCCESS",
 "STRONG_SUCCESS",
 "SUCCESS_WITH_COST",
 "FAILURE_WITH_OPPORTUNITY",
 "CRITICAL_FAILURE"
]);

const COST_BY_APPROACH={
 FORCE:"STRAIN_OR_EXPOSURE",
 FINESSE:"POSITION",
 STEALTH:"EXPOSURE",
 DECEPTION:"SUSPICION",
 PERSUASION:"TIME_OR_LEVERAGE",
 INTIMIDATION:"RELATIONSHIP_RISK",
 KNOWLEDGE:"TIME",
 INSTINCT:"UNCERTAINTY",
 MAGIC:"MAGIC_STRAIN",
 CREATIVE:"RESOURCE_OR_POSITION"
};
const OPPORTUNITY_BY_KIND={OBSERVE:"NEW_ANGLE",SOCIAL:"COUNTEROFFER",TRAVEL:"ALTERNATE_ROUTE",RISKY:"TACTICAL_OPENING",GENERAL:"NEXT_ACTION"};
const COMPLICATION_BY_APPROACH={FORCE:"ESCALATION",FINESSE:"BAD_POSITION",STEALTH:"DETECTED",DECEPTION:"SUSPICION_SPIKE",PERSUASION:"SOCIAL_RESISTANCE",INTIMIDATION:"GRUDGE_RISK",KNOWLEDGE:"MISLEADING_SURFACE",INSTINCT:"UNCERTAINTY_SPIKE",MAGIC:"MAGIC_BACKLASH",CREATIVE:"COLLATERAL_CHANGE"};

function legacyGrade(roll={}){return String(roll?.grade||"").toUpperCase()}
function threshold(roll={}){const raw=Number(roll?.profile?.strongSuccessMargin);return Number.isFinite(raw)?clamp(Math.round(raw),1,10):5}

export function deriveResolutionTier(roll={},intent={}){
 const grade=legacyGrade(roll),success=roll?.success===true,total=numberOrNull(roll?.total),dc=numberOrNull(roll?.dc),hasThreshold=total!==null&&dc!==null,margin=hasThreshold?total-dc:null;
 if(grade==="CRITICAL_SUCCESS")return "CRITICAL_SUCCESS";
 if(grade==="CRITICAL_FAILURE")return "CRITICAL_FAILURE";
 if(success){
  if(!hasThreshold)return "STRONG_SUCCESS";
  return margin>=threshold(roll)?"STRONG_SUCCESS":"SUCCESS_WITH_COST"
 }
 return "FAILURE_WITH_OPPORTUNITY"
}

function semanticCost(intent={}){
 const approach=String(intent?.approach||"INSTINCT").toUpperCase(),risk=String(intent?.risk||"UNKNOWN").toUpperCase(),type=COST_BY_APPROACH[approach]||"POSITION";
 return {type,severity:["HIGH","EXTREME"].includes(risk)?"MODERATE":"MINOR",source:"MIXED_SUCCESS",committed:false}
}
function semanticOpportunity(intent={}){
 const kind=String(intent?.kind||"GENERAL").toUpperCase();
 return {type:OPPORTUNITY_BY_KIND[kind]||"NEXT_ACTION",source:"FAILED_ATTEMPT",committed:false}
}
function semanticComplication(intent={}){
 const approach=String(intent?.approach||"INSTINCT").toUpperCase();
 return {type:COMPLICATION_BY_APPROACH[approach]||"ESCALATION",severity:"MAJOR",source:"CRITICAL_FAILURE",committed:false}
}

export function buildResolutionOutcome({roll={},intent={},snapshot={}}={}){
 const tier=deriveResolutionTier(roll,intent),total=numberOrNull(roll?.total),dc=numberOrNull(roll?.dc),margin=total!==null&&dc!==null?total-dc:null;
 const goalAchieved=["CRITICAL_SUCCESS","STRONG_SUCCESS","SUCCESS_WITH_COST"].includes(tier);
 const costs=tier==="SUCCESS_WITH_COST"?[semanticCost(intent)]:[];
 const opportunities=tier==="FAILURE_WITH_OPPORTUNITY"?[semanticOpportunity(intent)]:[];
 const complications=tier==="CRITICAL_FAILURE"?[semanticComplication(intent)]:[];
 return {
  version:1,
  tier,
  goalAchieved,
  margin,
  legacy:{success:roll?.success===true,grade:legacyGrade(roll),natural:numberOrNull(roll?.natural),total,dc},
  stakes:{desiredOutcome:typeof intent?.stakes?.desiredOutcome==="string"?intent.stakes.desiredOutcome:intent?.goal||null,acceptedRisk:typeof intent?.stakes?.acceptedRisk==="string"?intent.stakes.acceptedRisk:null,risk:String(intent?.risk||"UNKNOWN").toUpperCase()},
  costs,
  complications,
  opportunities,
  stateChanges:[],
  effectPolicy:{costRequired:tier==="SUCCESS_WITH_COST",opportunityAllowed:tier==="FAILURE_WITH_OPPORTUNITY",complicationRequired:tier==="CRITICAL_FAILURE",semanticEffectsRequireCommit:true},
  context:{hasSnapshot:Boolean(snapshot&&typeof snapshot==="object")}
 }
}
