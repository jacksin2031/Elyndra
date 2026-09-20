const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function normalizeCalendar(input){
 const c=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
 const cycles=Array.isArray(c.cycles)?c.cycles.map(x=>clean(x,40)).filter(Boolean).slice(0,16):[];
 const periods=Array.isArray(c.periods)?c.periods.map((x,i)=>({name:clean(x?.name,30)||`時段${i+1}`,fromMinute:clamp(Math.round(Number(x?.fromMinute)||0),0,1439),toMinute:clamp(Math.round(Number(x?.toMinute)||1439),0,1439)})).slice(0,8):[];
 return {
  name:clean(c.name,80)||"本地曆法",
  epochName:clean(c.epochName,80)||"無名紀",
  dayTerm:clean(c.dayTerm,20)||"日",
  cycleTerm:clean(c.cycleTerm,20)||"輪",
  longCycleTerm:clean(c.longCycleTerm,20)||"紀",
  daysPerCycle:clamp(Math.round(Number(c.daysPerCycle)||10),3,60),
  cyclesPerLongCycle:clamp(Math.round(Number(c.cyclesPerLongCycle)||10),3,30),
  cycles:cycles.length?cycles:["初輪","次輪","末輪"],
  periods:periods.length?periods:[{name:"暗時",fromMinute:0,toMinute:359},{name:"初光",fromMinute:360,toMinute:719},{name:"盛光",fromMinute:720,toMinute:1079},{name:"餘光",fromMinute:1080,toMinute:1439}]
 }
}
export function normalizeCultureProfile(input){
 const c=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
 const list=(v,max=5)=>Array.isArray(v)?v.map(x=>clean(x,120)).filter(Boolean).slice(0,max):[];
 return {
  identity:clean(c.identity,180),
  etiquette:list(c.etiquette),
  taboos:list(c.taboos),
  food:list(c.food),
  beliefs:list(c.beliefs),
  architecture:list(c.architecture),
  clothing:list(c.clothing),
  hospitality:list(c.hospitality,3),
  namingStyle:clean(c.namingStyle,180),
  languageNotes:list(c.languageNotes,4)
 }
}
export function normalizeTradeProfile(input){
 const t=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
 const mode=["currency","barter","mixed","ration","token"].includes(t.mode)?t.mode:"barter";
 const currencies=Array.isArray(t.currencies)?t.currencies.map((x,i)=>({
  id:clean(x?.id,80)||`CUR-${i+1}-${clean(x?.name,40)||"LOCAL"}`,
  name:clean(x?.name,60),
  symbol:clean(x?.symbol,12),
  issuer:clean(x?.issuer,100),
  description:clean(x?.description,220)
 })).filter(x=>x.name).slice(0,4):[];
 return {
  mode,
  currencies:mode==="barter"?[]:currencies,
  commonBarter:mode==="currency"?[]:(Array.isArray(t.commonBarter)?t.commonBarter.map(x=>clean(x,100)).filter(Boolean).slice(0,6):[]),
  foreignAcceptance:Array.isArray(t.foreignAcceptance)?t.foreignAcceptance.map(x=>clean(x,80)).filter(Boolean).slice(0,6):[],
  priceCulture:clean(t.priceCulture,220),
  questReward:clamp(Math.round(Number(t.questReward)||0),0,20),
  combatReward:clamp(Math.round(Number(t.combatReward)||0),0,20)
 }
}
export function currentLocationEntity(state){
 const name=String(state.player?.location||"");
 return (state.world?.registry?.locations||[]).find(x=>x.name===name)||null
}
export function currentTradeProfile(state){return currentLocationEntity(state)?.trade||null}
export function ensureWallet(state){state.player.wallet??={};return state.player.wallet}
export function addCurrency(state,currencyId,amount){
 const id=clean(currencyId,80),n=Math.max(0,Math.round(Number(amount)||0));if(!id||!n)return 0;
 const w=ensureWallet(state);w[id]=(w[id]||0)+n;return n
}
export function localCurrencyReward(state,key){
 const trade=currentTradeProfile(state);if(!trade||!["currency","mixed","ration","token"].includes(trade.mode)||!trade.currencies?.length)return null;
 const amount=clamp(Math.round(Number(trade[key])||0),0,20);if(!amount)return null;
 const currency=trade.currencies[0];addCurrency(state,currency.id,amount);return {amount,currency}
}
export function walletSummary(state){
 const w=ensureWallet(state),known=new Map();
 for(const loc of state.world?.registry?.locations||[])if(loc.known===true)for(const c of loc.trade?.currencies||[])known.set(c.id,c);
 return Object.entries(w).filter(([,amount])=>amount>0).map(([id,amount])=>({id,amount,currency:known.get(id)||null}))
}
