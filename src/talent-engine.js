const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PATHS=Object.freeze({
 INTEL:{id:"INTEL",name:"情報交涉",primary:"SOCIAL",secondary:"OBSERVE",description:"靠人物、情報與觀察打開局面；擅長建立關係、辨識矛盾與取得可驗證線索。"},
 SURVIVAL:{id:"SURVIVAL",name:"探索生存",primary:"TRAVEL",secondary:"OBSERVE",description:"靠路線、地形與生存判斷前進；擅長長途移動、追蹤與環境適應。"},
 ARCANE:{id:"ARCANE",name:"禁忌研究",primary:"OBSERVE",secondary:"GENERAL",description:"靠證據理解異常規則；擅長拆解未知現象與承受危險知識帶來的代價。"},
 VANGUARD:{id:"VANGUARD",name:"重裝戰技",primary:"RISKY",secondary:"GENERAL",description:"靠正面承受風險來改變局面；擅長戰鬥、強行突破與保護同行者。"},
 ADAPT:{id:"ADAPT",name:"臨機應變",primary:"GENERAL",secondary:"TRAVEL",description:"不把自己鎖死在單一專長；擅長資源不足時即場找出可行方法。"}
});
const OPTIONS=[
 {id:"TAL-SOCIAL",path:"INTEL",tier:1,name:"異文化交涉",kind:"SOCIAL",bonus:1,description:"從語氣、禮俗與利益差異中找到可以繼續談下去的位置。"},
 {id:"TAL-INTEL-2",path:"INTEL",tier:2,name:"讀懂弦外之音",kind:"SOCIAL",bonus:1,description:"長期與不同人物周旋後，更容易察覺迴避、保留與真正底線。"},
 {id:"TAL-INTEL-3",path:"INTEL",tier:3,name:"交叉求證",kind:"OBSERVE",bonus:1,description:"習慣把人物說法與現場證據互相比對，減少被單一消息帶偏。"},
 {id:"TAL-TRAVEL",path:"SURVIVAL",tier:1,name:"遠行適應",kind:"TRAVEL",bonus:1,description:"適應未知地形、道路與異常天候造成的旅行負擔。"},
 {id:"TAL-SURVIVAL-2",path:"SURVIVAL",tier:2,name:"荒野節奏",kind:"TRAVEL",bonus:1,description:"懂得在疲勞、補給與速度之間作取捨，長途移動更穩定。"},
 {id:"TAL-SURVIVAL-3",path:"SURVIVAL",tier:3,name:"追跡者視野",kind:"OBSERVE",bonus:1,description:"會把地面、路標、人流與環境變化當成同一條路線線索閱讀。"},
 {id:"TAL-OBSERVE",path:"ARCANE",tier:1,name:"異界洞察",kind:"OBSERVE",bonus:1,description:"長期觀察陌生世界後，能更快辨識環境中的異常與線索。"},
 {id:"TAL-ARCANE-2",path:"ARCANE",tier:2,name:"異常規則拆解",kind:"OBSERVE",bonus:1,description:"面對超常現象時，優先拆成可驗證的現象、條件與代價。"},
 {id:"TAL-ARCANE-3",path:"ARCANE",tier:3,name:"禁忌耐受",kind:"GENERAL",bonus:1,description:"知道某些答案本身就有風險，仍能在壓力下保持判斷與行動。"},
 {id:"TAL-RISKY",path:"VANGUARD",tier:1,name:"危境應對",kind:"RISKY",bonus:1,description:"在戰鬥、陷阱與高風險行動中保持更好的判斷。"},
 {id:"TAL-VANGUARD-2",path:"VANGUARD",tier:2,name:"迎擊姿態",kind:"RISKY",bonus:1,description:"面對明確威脅時不急於退讓，能更穩定地把壓力正面接住。"},
 {id:"TAL-VANGUARD-3",path:"VANGUARD",tier:3,name:"突破線",kind:"RISKY",bonus:1,description:"在必須強行打開缺口時，能把力量與時機集中在最關鍵的一次行動。"},
 {id:"TAL-GENERAL",path:"ADAPT",tier:1,name:"異界生存者",kind:"GENERAL",bonus:1,description:"面對沒有專門技能覆蓋的異世界問題時更能臨場應變。"},
 {id:"TAL-ADAPT-2",path:"ADAPT",tier:2,name:"就地取材",kind:"GENERAL",bonus:1,description:"在工具、情報或時間不足時，仍能用手上已有資源拼出可行方案。"},
 {id:"TAL-ADAPT-3",path:"ADAPT",tier:3,name:"轉換節奏",kind:"TRAVEL",bonus:1,description:"懂得在局勢改變時放棄原方案，快速切換到更合適的移動與處理方式。"}
];
const BY_ID=new Map(OPTIONS.map(x=>[x.id,x]));
function pathRecord(id){return PATHS[String(id||"").toUpperCase()]||null}
function ownedIds(p){return new Set((p.talents||[]).map(x=>x.id))}
function inferredPath(p){
 const score=new Map(Object.keys(PATHS).map(k=>[k,0]));
 for(const t of p.talents||[]){const opt=BY_ID.get(t.id),path=opt?.path||t.path;if(pathRecord(path))score.set(path,(score.get(path)||0)+3+(Number(opt?.tier||t.tier)||1))}
 for(const [id,path] of Object.entries(PATHS))score.set(id,(score.get(id)||0)+(Number(p.skills?.[path.primary])||0)*2+(Number(p.skills?.[path.secondary])||0));
 const best=[...score.entries()].sort((a,b)=>b[1]-a[1])[0];return best&&best[1]>0?best[0]:null
}
function normalizeOwnedTalent(raw){
 const opt=BY_ID.get(raw?.id);if(opt)return {...opt};
 return raw&&raw.id?{...raw,path:pathRecord(raw.path)?.id||null,tier:clamp(Math.round(Number(raw.tier)||1),1,3)}:null
}
export function ensureTalents(state){
 const p=state.player;p.talents=(Array.isArray(p.talents)?p.talents:[]).map(normalizeOwnedTalent).filter(Boolean);p.talentPoints=Math.max(0,Math.round(Number(p.talentPoints)||0));
 p.buildPath=pathRecord(p.buildPath)?.id||inferredPath(p)||null;
 return p
}
export function grantTalentPoint(state,n=1){const p=ensureTalents(state);p.talentPoints+=Math.max(0,Math.round(Number(n)||0));return p.talentPoints}
function priorTierOwned(p,opt){
 if(opt.tier<=1)return true;return p.talents.some(x=>x.path===opt.path&&Number(x.tier)===opt.tier-1)
}
function optionCost(p,opt){if(!p.buildPath||p.buildPath===opt.path)return 1;return opt.tier===1?2:99}
function optionState(p,opt){
 const owned=ownedIds(p);if(owned.has(opt.id))return {available:false,cost:0,reason:"OWNED"};
 if(p.buildPath&&p.buildPath!==opt.path&&opt.tier>1)return {available:false,cost:99,reason:"OTHER_PATH_LOCKED"};
 if(!priorTierOwned(p,opt))return {available:false,cost:optionCost(p,opt),reason:"PREVIOUS_TIER_REQUIRED"};
 const cost=optionCost(p,opt);if(p.talentPoints<cost)return {available:false,cost,reason:"NO_TALENT_POINT"};
 return {available:true,cost,reason:""}
}
export function talentOptions(state,{includeLocked=false}={}){
 const p=ensureTalents(state),rows=OPTIONS.filter(x=>!ownedIds(p).has(x.id)).map(x=>{const gate=optionState(p,x);return {...x,...gate,skillRank:Number(p.skills?.[x.kind])||0,pathName:PATHS[x.path].name}}).sort((a,b)=>(a.path===p.buildPath?-1:b.path===p.buildPath?1:0)||a.tier-b.tier||b.skillRank-a.skillRank||a.name.localeCompare(b.name));
 return includeLocked?rows:rows.filter(x=>x.available)
}
export function learnTalent(state,idOrName){
 const p=ensureTalents(state),opt=OPTIONS.find(x=>x.id===idOrName||x.name===idOrName);if(!opt)return {ok:false,reason:"TALENT_UNAVAILABLE"};
 const gate=optionState(p,opt);if(!gate.available)return {ok:false,reason:gate.reason,cost:gate.cost};
 if(!p.buildPath){p.buildPath=opt.path;state.events??=[];state.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"BUILD_PATH_COMMITTED",visibility:"PLAYER_KNOWN",pathId:opt.path,summary:"你的行動習慣逐漸形成一條清晰路線："+PATHS[opt.path].name,day:Number(state.world?.state?.day)||1,at:Date.now()})}
 p.talentPoints-=gate.cost;p.talents.push({...opt});return {ok:true,talent:{...opt},cost:gate.cost,path:PATHS[p.buildPath]}
}
export function talentActionModifier(state,kind){const p=ensureTalents(state);return clamp(p.talents.filter(x=>x.kind===kind||x.kind==="ALL").reduce((n,x)=>n+(Number(x.bonus)||0),0),0,3)}
export function specializedSkillGain(state,kind,baseGain){
 const p=ensureTalents(state),base=Math.max(0,Math.round(Number(baseGain)||0));if(!base||!p.buildPath)return {gain:base,focused:false,path:null};
 const path=PATHS[p.buildPath],focused=kind===path.primary||kind===path.secondary;
 return {gain:focused?base:Math.max(0,base-1),focused,path:{...path}}
}
export function resolveTalentAction(state,label){
 const q=String(label||"");if(!/學習|掌握|選擇|天賦|talent|learn/i.test(q))return null;const opt=talentOptions(state,{includeLocked:true}).find(x=>q.includes(x.name)||q.includes(x.id));if(!opt)return {handled:true,ok:false,reason:"TALENT_NOT_SPECIFIED",options:talentOptions(state,{includeLocked:true}).slice(0,8)};return {handled:true,...learnTalent(state,opt.id)}
}
export function buildIdentitySnapshot(state){
 const p=ensureTalents(state),path=pathRecord(p.buildPath),owned=p.talents.filter(x=>!path||x.path===path.id).sort((a,b)=>a.tier-b.tier);
 return {committed:Boolean(path),path:path?{...path}:null,depth:owned.reduce((m,x)=>Math.max(m,Number(x.tier)||1),0),offPathCost:path?2:1,focusedKinds:path?[path.primary,path.secondary]:[],description:path?.description||"尚未形成固定路線；第一次選擇天賦會確立主要成長方向。"}
}
export function talentSnapshot(state){
 const p=ensureTalents(state),identity=buildIdentitySnapshot(state);
 return {points:p.talentPoints,identity,owned:p.talents.map(x=>({...x,pathName:pathRecord(x.path)?.name||""})),available:talentOptions(state,{includeLocked:true}).slice(0,15)}
}
export function talentPathDefinitions(){return Object.values(PATHS).map(x=>({...x}))}
