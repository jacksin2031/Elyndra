const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const KINDS=["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"];
const RARITY=new Set(["COMMON","UNCOMMON","RARE","EXTREME"]);
const FORECAST=new Set(["LOW","MEDIUM","HIGH"]);
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const genericPhenomena=[
 {id:"WTH-STABLE",name:"穩定天象",observableName:"天空與氣流相對平穩",description:"世界環境暫時處於較穩定狀態。",sensoryCue:"周圍沒有明顯的天候異常。",rarity:"COMMON",weight:45,durationMin:120,durationMax:360,danger:0,actionModifiers:{}},
 {id:"WTH-DISTURBANCE",name:"環境擾動",observableName:"周圍出現明顯環境擾動",description:"風、能量或大氣條件出現足以影響活動的變化。",sensoryCue:"空氣與遠方景象變得不穩定。",rarity:"UNCOMMON",weight:28,durationMin:60,durationMax:210,danger:2,actionModifiers:{OBSERVE:-1,TRAVEL:-1,RISKY:-1}},
 {id:"WTH-VEIL",name:"低能見現象",observableName:"視野被流動介質遮蔽",description:"世界中的懸浮物、霧狀能量或其他介質降低能見度。",sensoryCue:"遠處輪廓逐漸變得模糊。",rarity:"UNCOMMON",weight:20,durationMin:60,durationMax:180,danger:2,actionModifiers:{OBSERVE:-2,TRAVEL:-1}},
 {id:"WTH-ANOMALY",name:"異常天象",observableName:"天空與環境出現不尋常異象",description:"由這個世界自身法則造成的罕見天氣異常。",sensoryCue:"光線、聲音或空氣質感出現不尋常變化。",rarity:"RARE",weight:7,durationMin:30,durationMax:120,danger:3,actionModifiers:{OBSERVE:1,TRAVEL:-2,RISKY:-1}}
];
function normalizeMods(input){
 const out={};for(const k of KINDS){const n=Math.round(Number(input?.[k])||0);if(n)out[k]=clamp(n,-2,2)}return out
}
function normalizePhenomenon(raw,i){
 const fallback=genericPhenomena[i%genericPhenomena.length];
 const min=clamp(Math.round(Number(raw?.durationMin)||fallback.durationMin),15,720),max=clamp(Math.round(Number(raw?.durationMax)||fallback.durationMax),min,1440);
 return {
  id:clean(raw?.id,60)||fallback.id+(i?("-"+i):""),
  name:clean(raw?.name,80)||fallback.name,
  observableName:clean(raw?.observableName,100)||clean(raw?.name,80)||fallback.observableName,
  description:clean(raw?.description,320)||fallback.description,
  sensoryCue:clean(raw?.sensoryCue,240)||fallback.sensoryCue,
  rarity:RARITY.has(raw?.rarity)?raw.rarity:fallback.rarity,
  weight:clamp(Math.round(Number(raw?.weight)||fallback.weight),1,100),
  durationMin:min,durationMax:max,
  danger:clamp(Math.round(Number(raw?.danger)||0),0,5),
  actionModifiers:normalizeMods(raw?.actionModifiers),
  tags:Array.isArray(raw?.tags)?[...new Set(raw.tags.map(x=>clean(x,60)).filter(Boolean))].slice(0,8):[],
  transitions:Array.isArray(raw?.transitions)?[...new Set(raw.transitions.map(x=>clean(x,60)).filter(Boolean))].slice(0,8):[]
 }
}
export function normalizeWeatherSystem(input={},seed={}){
 const raw=Array.isArray(input?.phenomena)?input.phenomena:[];
 const rows=raw.slice(0,8).map(normalizePhenomenon);
 for(let i=rows.length;i<4;i++)rows.push(normalizePhenomenon(genericPhenomena[i],i));
 const ids=new Set();for(let i=0;i<rows.length;i++){if(ids.has(rows[i].id))rows[i].id="WTH-"+(i+1);ids.add(rows[i].id)}
 return {
  identity:clean(input?.identity,220)||"天氣由世界自身環境法則與時間變化共同形成。",
  source:clean(input?.source,220)||"世界環境與能量循環",
  cycle:clean(input?.cycle,180)||"天候會隨世界時間與地區逐步轉變。",
  forecastability:FORECAST.has(input?.forecastability)?input.forecastability:"MEDIUM",
  phenomena:rows,
  seedMagic:clamp(Math.round(Number(seed?.magic)||0),0,5)
 }
}
export function normalizeWeatherProfile(input={},allowedIds=null){
 const allowed=allowedIds?new Set(allowedIds):null,keep=x=>{const v=clean(x,60);return v&&(!allowed||allowed.has(v))};
 return {
  zone:clean(input?.zone,100)||"",
  affinities:Array.isArray(input?.affinities)?[...new Set(input.affinities.map(x=>clean(x,60)).filter(x=>keep(x)))].slice(0,6):[],
  suppressions:Array.isArray(input?.suppressions)?[...new Set(input.suppressions.map(x=>clean(x,60)).filter(x=>keep(x)))].slice(0,6):[]
 }
}
function currentLocation(state){
 const locations=state.world?.registry?.locations||[],player=String(state.player?.location||""),worldLoc=String(state.world?.state?.location||"");
 return locations.find(x=>x.name===player)||locations.find(x=>x.name===worldLoc)||null
}
function locationKey(state){const loc=currentLocation(state);return loc?.id||loc?.name||String(state.world?.state?.region||"WORLD")}
function choose(state,excludeId=""){
 const sys=normalizeWeatherSystem(state.world?.bible?.weatherSystem,state.world?.seedContract||state.world?.seed||{}),loc=currentLocation(state),profile=normalizeWeatherProfile(loc?.weatherProfile,sys.phenomena.map(x=>x.id)),allowed=sys.phenomena.filter(x=>!profile.suppressions.includes(x.id));
 const base=(allowed.length?allowed:sys.phenomena),candidates=excludeId&&base.length>1?base.filter(x=>x.id!==excludeId):base;
 const pool=candidates.map(x=>({x,w:x.weight*(profile.affinities.includes(x.id)?3:1)}));
 const current=sys.phenomena.find(x=>x.id===excludeId);if(current?.transitions?.length){for(const p of pool)if(current.transitions.includes(p.x.id))p.w*=3}
 const total=pool.reduce((a,p)=>a+p.w,0),clock=Number(state.world?.state?.clock?.totalMinutes)||0,seq=Number(state.world?.weather?.sequence)||0,h=hash([state.world?.id,locationKey(state),clock,seq].join("|")),target=(h%Math.max(1,total))+1;
 let n=0;for(const p of pool){n+=p.w;if(target<=n)return p.x}return pool[0]?.x||sys.phenomena[0]
}
function durationFor(state,p){
 const seq=Number(state.world?.weather?.sequence)||0,h=hash([state.world?.id,p.id,seq,state.world?.state?.clock?.totalMinutes||0].join("|")),span=Math.max(0,p.durationMax-p.durationMin);
 return p.durationMin+(span?h%(span+1):0)
}
export function initializeWeather(state,{force=false}={}){
 state.world.bible??={};const hadCanon=Boolean(state.world.bible.weatherSystem?.phenomena?.length);state.world.bible.weatherSystem=normalizeWeatherSystem(state.world.bible.weatherSystem,state.world.seedContract||state.world.seed||{});
 const clock=Number(state.world?.state?.clock?.totalMinutes)||0;
 state.world.weather??={version:1,currentId:"",startedMinute:clock,nextChangeMinute:clock,locationKey:"",sequence:0,history:[]};
 const w=state.world.weather;w.history??=[];w.sequence=Number.isInteger(w.sequence)?w.sequence:0;
 const valid=state.world.bible.weatherSystem.phenomena.some(x=>x.id===w.currentId),key=locationKey(state);
 if(force||!valid){const p=!hadCanon&&!valid?state.world.bible.weatherSystem.phenomena[0]:choose(state,"");w.currentId=p.id;w.startedMinute=clock;w.nextChangeMinute=clock+durationFor(state,p);w.locationKey=key}
 return w
}
export function currentWeather(state){
 initializeWeather(state);const sys=state.world.bible.weatherSystem,w=state.world.weather;
 return sys.phenomena.find(x=>x.id===w.currentId)||sys.phenomena[0]
}
export function tickWeather(state,{force=false}={}){
 const w=initializeWeather(state),clock=Number(state.world?.state?.clock?.totalMinutes)||0,key=locationKey(state);
 if(!force&&w.locationKey===key&&clock<w.nextChangeMinute)return null;
 const prev=currentWeather(state),next=choose(state,prev?.id||"");w.sequence++;w.currentId=next.id;w.startedMinute=clock;w.nextChangeMinute=clock+durationFor(state,next);w.locationKey=key;
 const record={id:"WTH-EV-"+w.sequence+"-"+clock,type:"WEATHER_CHANGED",visibility:"OBSERVABLE",weatherId:next.id,summary:next.sensoryCue||("天氣轉為"+next.observableName),day:state.world?.state?.day||1,time:state.world?.state?.clock?String(state.world.state.clock.hour).padStart(2,"0")+":"+String(state.world.state.clock.minute).padStart(2,"0"):"",at:Date.now()};
 w.history.push({weatherId:next.id,minute:clock,locationKey:key});w.history=w.history.slice(-24);state.events??=[];state.events.push(record);return record
}
export function retargetWeather(state){initializeWeather(state);if(state.world.weather.locationKey!==locationKey(state))return tickWeather(state,{force:true});return null}
export function weatherActionModifier(state,kind){
 const p=currentWeather(state),n=Number(p?.actionModifiers?.[kind])||0;return clamp(Math.round(n),-2,2)
}
export function playerWeatherSnapshot(state){
 const p=currentWeather(state),sys=state.world.bible.weatherSystem;
 return {observableName:p.observableName,sensoryCue:p.sensoryCue,danger:p.danger,forecastability:sys.forecastability,zone:normalizeWeatherProfile(currentLocation(state)?.weatherProfile,sys.phenomena.map(x=>x.id)).zone}
}
export function directorWeatherSnapshot(state){
 initializeWeather(state);return {current:playerWeatherSnapshot(state),runtime:{...state.world.weather,history:(state.world.weather.history||[]).slice(-8)},system:state.world.bible.weatherSystem,locationProfile:normalizeWeatherProfile(currentLocation(state)?.weatherProfile,state.world.bible.weatherSystem.phenomena.map(x=>x.id))}
}
