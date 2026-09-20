import {ensureWorldRegistry} from "./world-registry.js?v=266";

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const KINDS=["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"];
const SKILL_LABELS={OBSERVE:"觀察",SOCIAL:"交涉",TRAVEL:"旅行",RISKY:"冒險",GENERAL:"應變"};
const RELEVANCE={
 OBSERVE:/斥候|偵察|學者|研究|獵人|追蹤|scout|scholar|research|hunter|tracker/i,
 SOCIAL:/商人|外交|貴族|旅店|說客|談判|merchant|diplomat|noble|inn|negotiat/i,
 TRAVEL:/嚮導|旅人|斥候|獵人|航海|guide|traveler|traveller|scout|hunter|sailor/i,
 RISKY:/戰士|傭兵|騎士|護衛|盜賊|士兵|warrior|mercenary|knight|guard|thief|soldier/i,
 GENERAL:/.+/
};

export function ensureCheckProfile(state){
 const p=state.player;
 p.stats??={strength:2,agility:2,mind:2,presence:2,instinct:2};
 for(const k of ["strength","agility","mind","presence","instinct"]){const n=Number(p.stats[k]);p.stats[k]=clamp(Math.round(Number.isFinite(n)?n:2),0,20)}
 p.skills??={OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:0};
 p.skillProgress??={OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:0};
 for(const k of KINDS){p.skills[k]=clamp(Math.round(Number(p.skills[k])||0),0,5);p.skillProgress[k]=Math.max(0,Math.round(Number(p.skillProgress[k])||0))}
 return p
}

function actionAttribute(kind,label){
 if(kind==="OBSERVE")return "mind";
 if(kind==="SOCIAL")return "presence";
 if(kind==="TRAVEL")return "agility";
 if(kind==="RISKY")return /偷|潛|躲|閃|撬|pick|steal|sneak|dodge|lock/i.test(label)?"agility":"strength";
 return "instinct"
}
function statBonus(value){return clamp(Math.round(Number(value)||2)-2,-3,5)}
function equippedItems(state){const slots=Object.values(state.player?.equipment||{}).filter(Boolean);return (state.inventory||[]).filter(x=>x?.equipped===true||slots.includes(x.id)||slots.includes(x.name)).slice(0,4)}
function equipmentBonus(state,kind){let n=0;for(const item of equippedItems(state)){const b=item?.checkBonuses||{};n+=Number(b[kind]??b.ALL??0)||0}return clamp(Math.round(n),-3,3)}
function companionBonus(state,kind){
 const npcs=ensureWorldRegistry(state).npcs||[];let score=0;
 for(const n of npcs){if(n?.known!==true||n?.alive===false||n?.companion?.status!=="ACTIVE")continue;const hay=`${n.role||""} ${n.goal||""} ${n.personality||""}`;if(RELEVANCE[kind].test(hay)){score++;if((n.trust??0)>=70)score++}}
 return clamp(score,0,2)
}
function relationshipBonus(state,kind,label){
 if(kind!=="SOCIAL")return 0;const r=ensureWorldRegistry(state);
 for(const n of r.npcs||[]){if(n.known===true&&n.name&&label.includes(n.name)){const t=Number(n.trust)||0;return t>=70?2:t>=40?1:t<=10?-2:t<=25?-1:0}}
 for(const f of r.factions||[]){if(f.known===true&&f.name&&label.includes(f.name)){const x=Number(f.playerReputation)||0;return x>=20?2:x>=5?1:x<=-20?-2:x<=-5?-1:0}}
 return 0
}
function locationState(state){const name=state.player?.location;return (state.world?.registry?.locations||[]).find(x=>x.name===name)?.worldState||null}
function situationBonus(state,kind){
 let n=0;const hp=Number(state.player?.hp)||0,max=Math.max(1,Number(state.player?.maxHp)||1),ratio=hp/max,loc=locationState(state);
 if(["TRAVEL","RISKY"].includes(kind)){if(ratio<.25)n-=2;else if(ratio<.5)n-=1}
 if(kind==="TRAVEL"&&loc){if(Number(loc.infrastructure)>=70)n++;else if(Number(loc.infrastructure)<=30)n--}
 if(kind==="SOCIAL"&&loc){if(Number(loc.stability)>=70)n++;else if(Number(loc.stability)<=30)n--}
 return clamp(n,-3,2)
}
function dcModifier(state,kind){
 const seed=state.world?.seedContract||{};let n=0;
 if(["TRAVEL","RISKY"].includes(kind))n+=clamp((Number(seed.danger)||3)-3,-2,2);
 if(kind==="SOCIAL")n+=clamp((Number(seed.politics)||3)-3,-2,2);
 const crisis=state.world?.state?.crisis?.stage;if(["TRAVEL","RISKY"].includes(kind)&&crisis==="CRISIS")n++;if(["TRAVEL","RISKY"].includes(kind)&&crisis==="ENDGAME")n+=2;
 return clamp(n,-3,4)
}
export function buildActionCheck(state,label,profile){
 const p=ensureCheckProfile(state),kind=KINDS.includes(profile?.kind)?profile.kind:"GENERAL",attribute=actionAttribute(kind,label),baseDC=Math.round(Number(profile?.dc)||12),difficulty=dcModifier(state,kind);
 const modifiers={
  attribute:statBonus(p.stats[attribute]),
  skill:clamp(Number(p.skills[kind])||0,0,5),
  equipment:equipmentBonus(state,kind),
  companion:companionBonus(state,kind),
  relationship:relationshipBonus(state,kind,label),
  situation:situationBonus(state,kind)
 };
 const bonus=clamp(Object.values(modifiers).reduce((a,b)=>a+(Number(b)||0),0),-6,10),dc=clamp(baseDC+difficulty,7,20);
 return {kind,attribute,skill:kind,skillLabel:SKILL_LABELS[kind],baseDC,difficulty,dc,bonus,modifiers}
}
export function trainActionSkill(state,kind,roll){
 const p=ensureCheckProfile(state),k=KINDS.includes(kind)?kind:"GENERAL",before=p.skills[k],gain=roll?.grade==="CRITICAL_SUCCESS"?2:roll?.success?1:0;
 if(!gain||before>=5)return {kind:k,before,after:before,gain:0,rankUp:false,progress:p.skillProgress[k]};
 p.skillProgress[k]+=gain;let rank=p.skills[k],rankUp=false;
 while(rank<5){const need=4+rank*3;if(p.skillProgress[k]<need)break;p.skillProgress[k]-=need;rank++;rankUp=true}
 p.skills[k]=rank;return {kind:k,before,after:rank,gain,rankUp,progress:p.skillProgress[k],next:rank<5?4+rank*3:null}
}
export function checkProfileSnapshot(state){
 const p=ensureCheckProfile(state);return {stats:{...p.stats},skills:{...p.skills},skillProgress:{...p.skillProgress},equipped:equippedItems(state).map(x=>({id:x.id,name:x.name,checkBonuses:x.checkBonuses||{}}))}
}
export function normalizeCheckBonuses(input){
 if(!input||typeof input!=="object"||Array.isArray(input))return {};
 const out={};for(const k of [...KINDS,"ALL"]){const n=Math.round(Number(input[k])||0);if(n)out[k]=clamp(n,-2,2)}return out
}
