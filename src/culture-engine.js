const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function location(state){const name=String(state.player?.location||"");return (state.world?.registry?.locations||[]).find(x=>x.name===name)||null}
function needles(rule){const text=String(rule||"").replace(/[，。！？、,.!?；;：:（）()「」『』【】]/g," ");const parts=text.split(/\s+/).filter(x=>x.length>=2),out=[];for(const p of parts){if(p.length<=5)out.push(p);else{out.push(p.slice(0,3),p.slice(-3))}}return [...new Set(out)]}
function matches(label,rules){const q=String(label||"").toLowerCase();return (rules||[]).filter(rule=>needles(rule).some(x=>q.includes(x.toLowerCase())))}
export function ensureCultureStanding(state){state.player.cultureStanding??={};return state.player.cultureStanding}
export function evaluateCultureAction(state,label){
 const loc=location(state),culture=loc?.culture||{},taboos=matches(label,culture.taboos),etiquette=matches(label,culture.etiquette),standing=ensureCultureStanding(state)[loc?.id]||0;
 return {locationId:loc?.id||null,taboos,etiquette,standing,modifier:clamp((etiquette.length?1:0)-(taboos.length?2:0)+(standing>=5?1:standing<=-5?-1:0),-3,2)}
}
export function cultureActionModifier(state,label,kind){if(!["SOCIAL","GENERAL","RISKY"].includes(kind))return 0;return evaluateCultureAction(state,label).modifier}
export function applyCultureAction(state,label,roll){
 const result=evaluateCultureAction(state,label);if(!result.locationId||(!result.taboos.length&&!result.etiquette.length))return null;
 const map=ensureCultureStanding(state),before=Number(map[result.locationId])||0,delta=result.taboos.length?-2:(result.etiquette.length&&roll?.success?1:0);map[result.locationId]=clamp(before+delta,-20,20);
 const summary=result.taboos.length?"你的行為觸犯了當地可辨識的禁忌。":"你的行為符合當地禮俗，周圍人的態度稍有改善。";
 const ev={id:"CUL-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2)),type:"CULTURE_REACTION",visibility:"PLAYER_KNOWN",locationId:result.locationId,summary,standingBefore:before,standingAfter:map[result.locationId],day:state.world?.state?.day||1,at:Date.now()};state.events.push(ev);return ev
}
export function cultureSnapshot(state){const loc=location(state);if(!loc)return null;return {locationId:loc.id,identity:loc.culture?.identity||"",etiquette:(loc.culture?.etiquette||[]).slice(0,5),taboos:(loc.culture?.taboos||[]).slice(0,5),standing:Number(ensureCultureStanding(state)[loc.id])||0}}
