export const EFFECT_RUNTIME_VERSION=1;
export const EFFECT_CATEGORIES=Object.freeze(["CHARACTER","KNOWLEDGE","SOCIAL","ITEM","WORLD","FUTURE","STORY"]);
export const EFFECT_SCOPES=Object.freeze(["SELF","TARGET","PARTY","LOCATION","SETTLEMENT","REGIONAL","NATIONAL","CONTINENTAL","WORLD"]);
export const EFFECT_DURATIONS=Object.freeze(["INSTANT","SHORT","SCENE","HOURS","DAYS","LONG_TERM","PERSISTENT","PERMANENT","UNTIL_CONDITION"]);
export const EFFECT_VISIBILITY=Object.freeze(["VISIBLE","PARTIAL","HIDDEN","DISCOVERED"]);
export const EFFECT_STATES=Object.freeze(["ACTIVE","SUPPRESSED","RECOVERING","EXPIRED","TRANSFORMED"]);
export const EFFECT_SEVERITY=Object.freeze({NONE:0,MINOR:1,MODERATE:2,SEVERE:3,DANGEROUS:4,CRITICAL:5});
export const SEMANTIC_SEVERITY=Object.freeze({NONE:0,MINOR:1,LIGHT:1,LOW:1,MODERATE:2,MEDIUM:2,SEVERE:3,HIGH:3,DANGEROUS:4,CRITICAL:5,FATAL:5});
export const EFFECT_DEFINITIONS=Object.freeze({
 INJURY:{category:"CHARACTER",tags:["INJURY","PAIN"],scope:"SELF",duration:"LONG_TERM",visibility:"VISIBLE",observation:"傷處持續疼痛，某些用力動作變得困難。"},
 BLEEDING:{category:"CHARACTER",tags:["INJURY","BLEEDING"],scope:"SELF",duration:"SHORT",visibility:"VISIBLE",observation:"傷口仍在流血。"},
 POISON:{category:"CHARACTER",tags:["TOXIN","ILLNESS"],scope:"SELF",duration:"UNTIL_CONDITION",visibility:"PARTIAL",observation:"身體出現不尋常的不適與虛弱感。"},
 FATIGUE:{category:"CHARACTER",tags:["SURVIVAL","FATIGUE"],scope:"SELF",duration:"UNTIL_CONDITION",visibility:"VISIBLE",observation:"疲勞正影響你的持續行動能力。"},
 HUNGER:{category:"CHARACTER",tags:["SURVIVAL","HUNGER"],scope:"SELF",duration:"UNTIL_CONDITION",visibility:"VISIBLE",observation:"飢餓感已經開始干擾行動。"},
 THIRST:{category:"CHARACTER",tags:["SURVIVAL","THIRST"],scope:"SELF",duration:"UNTIL_CONDITION",visibility:"VISIBLE",observation:"口渴與脫水感逐漸明顯。"},
 COLD:{category:"CHARACTER",tags:["SURVIVAL","COLD","EXPOSURE"],scope:"SELF",duration:"UNTIL_CONDITION",visibility:"VISIBLE",observation:"手腳開始發冷，動作不再俐落。"},
 WET:{category:"CHARACTER",tags:["SURVIVAL","WET","ENVIRONMENT"],scope:"SELF",duration:"UNTIL_CONDITION",visibility:"VISIBLE",observation:"衣物和身體仍然潮濕。"},
 FEVER:{category:"CHARACTER",tags:["ILLNESS","FEVER"],scope:"SELF",duration:"DAYS",visibility:"VISIBLE",observation:"體溫與虛弱感顯示身體狀況正在惡化。"},
 WELL_RESTED:{category:"CHARACTER",tags:["POSITIVE","REST"],scope:"SELF",duration:"HOURS",visibility:"VISIBLE",observation:"充分休息讓你的狀態較為穩定。"},
 NOURISHED:{category:"CHARACTER",tags:["POSITIVE","FOOD"],scope:"SELF",duration:"HOURS",visibility:"VISIBLE",observation:"補充食物後，身體狀態穩定下來。"},
 WARMED:{category:"CHARACTER",tags:["POSITIVE","WARMTH"],scope:"SELF",duration:"HOURS",visibility:"VISIBLE",observation:"暖意逐漸恢復到四肢。"},
 PROTECTED:{category:"CHARACTER",tags:["POSITIVE","PROTECTION"],scope:"SELF",duration:"UNTIL_CONDITION",visibility:"VISIBLE",observation:"目前的防護正在減少特定環境影響。"}
});
export const severityFromIntensity=n=>n<=0?0:n<20?1:n<40?2:n<65?3:n<85?4:5;
export const intensityForSeverity=s=>[0,12,30,52,76,95][Math.max(0,Math.min(5,Math.round(Number(s)||0)))];
export function validateEffectProposal(p,{ai=false}={}){
 const errors=[];if(!p||typeof p!=="object"||Array.isArray(p))return {valid:false,errors:["EFFECT_PROPOSAL_INVALID"]};
 const type=String(p.type||"").toUpperCase();if(!EFFECT_DEFINITIONS[type])errors.push("EFFECT_TYPE_UNKNOWN");
 if(ai)for(const k of ["severity","intensity","hp","hpDelta","trust","trustDelta","pressure","pressureDelta","durationMinutes","expiresAtMinute"])if(p[k]!=null)errors.push("AI_NUMERIC_AUTHORITY_FORBIDDEN:"+k);
 if(p.semanticSeverity!=null&&!Object.hasOwn(SEMANTIC_SEVERITY,String(p.semanticSeverity).toUpperCase()))errors.push("EFFECT_SEMANTIC_SEVERITY_INVALID");
 return {valid:errors.length===0,errors,type}
}
export const validateAiEffectProposal=p=>validateEffectProposal(p,{ai:true});
