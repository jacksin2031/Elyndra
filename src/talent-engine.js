const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const OPTIONS=[
 {id:"TAL-OBSERVE",name:"異界洞察",kind:"OBSERVE",bonus:1,description:"長期觀察陌生世界後，能更快辨識環境中的異常與線索。"},
 {id:"TAL-SOCIAL",name:"異文化交涉",kind:"SOCIAL",bonus:1,description:"累積跨文化互動經驗，在陌生禮俗與談判中更穩定。"},
 {id:"TAL-TRAVEL",name:"遠行適應",kind:"TRAVEL",bonus:1,description:"適應未知地形、道路與異常天候造成的旅行負擔。"},
 {id:"TAL-RISKY",name:"危境應對",kind:"RISKY",bonus:1,description:"在戰鬥、陷阱與高風險行動中保持更好的判斷。"},
 {id:"TAL-GENERAL",name:"異界生存者",kind:"GENERAL",bonus:1,description:"面對沒有專門技能覆蓋的異世界問題時更能臨場應變。"}
];
export function ensureTalents(state){const p=state.player;p.talents=Array.isArray(p.talents)?p.talents:[];p.talentPoints=Math.max(0,Math.round(Number(p.talentPoints)||0));return p}
export function grantTalentPoint(state,n=1){const p=ensureTalents(state);p.talentPoints+=Math.max(0,Math.round(Number(n)||0));return p.talentPoints}
export function talentOptions(state){const p=ensureTalents(state),owned=new Set(p.talents.map(x=>x.id));return OPTIONS.filter(x=>!owned.has(x.id)).map(x=>({...x,skillRank:Number(p.skills?.[x.kind])||0})).sort((a,b)=>b.skillRank-a.skillRank||a.name.localeCompare(b.name))}
export function learnTalent(state,idOrName){
 const p=ensureTalents(state);if(p.talentPoints<1)return {ok:false,reason:"NO_TALENT_POINT"};const opt=OPTIONS.find(x=>x.id===idOrName||x.name===idOrName);if(!opt||p.talents.some(x=>x.id===opt.id))return {ok:false,reason:"TALENT_UNAVAILABLE"};p.talentPoints--;p.talents.push({...opt});return {ok:true,talent:opt}
}
export function talentActionModifier(state,kind){const p=ensureTalents(state);return clamp(p.talents.filter(x=>x.kind===kind||x.kind==="ALL").reduce((n,x)=>n+(Number(x.bonus)||0),0),0,3)}
export function resolveTalentAction(state,label){
 const q=String(label||"");if(!/學習|掌握|選擇|天賦|talent|learn/i.test(q))return null;const opt=talentOptions(state).find(x=>q.includes(x.name)||q.includes(x.id));if(!opt)return {handled:true,ok:false,reason:"TALENT_NOT_SPECIFIED",options:talentOptions(state).slice(0,5)};return {handled:true,...learnTalent(state,opt.id)}
}
export function talentSnapshot(state){const p=ensureTalents(state);return {points:p.talentPoints,owned:p.talents.map(x=>({id:x.id,name:x.name,kind:x.kind,bonus:x.bonus,description:x.description})),available:talentOptions(state).slice(0,5)}}
