const clean=(v,max=400)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
export const FUTURE_STAGES=Object.freeze(["DORMANT","EMERGING","ESCALATING","CRITICAL","ACTIVE","RESOLVING","RESOLVED"]);
export const FUTURE_SCOPES=Object.freeze(["LOCAL","REGIONAL","NATIONAL","CONTINENTAL","WORLD"]);
const stages=new Set(FUTURE_STAGES),scopes=new Set(FUTURE_SCOPES);

function mapLegacyStage(stage){return ({DORMANT:"DORMANT",RUMORS:"EMERGING",ESCALATING:"ESCALATING",CRISIS:"CRITICAL",ENDGAME:"ACTIVE"})[String(stage)]||"DORMANT"}
export function ensureFutureEngine(state){
 state.world??={};state.world.futures=Array.isArray(state.world.futures)?state.world.futures:[];
 const legacy=state.world?.state?.crisis;
 if(legacy&&!state.world.futures.some(x=>x.id==="FUT-LEGACY-CRISIS")){
  state.world.futures.push({id:"FUT-LEGACY-CRISIS",title:clean(state.world?.bible?.currentCrisis,120)||"世界危機",hiddenCause:clean(state.world?.bible?.ancientTruth,400),pressure:clamp(legacy.pressure),stage:mapLegacyStage(legacy.stage),earliestDay:1,latestDay:null,activationConditions:[],cancelConditions:[],escalationConditions:[],historicalLinks:[],impactScope:"WORLD",affectedRegions:[],intensity:50,duration:null,domains:["SECURITY"],playerCanPrevent:true,playerCanAccelerate:true,playerCanMitigate:true,playerCanRedirect:true,legacyMirror:true,pressureLog:[]})
 }
 return state.world.futures
}
export function createFutureSkeleton(state,input={}){
 const futures=ensureFutureEngine(state),id=clean(input.id,120)||"FUT-"+uid();if(futures.some(x=>x.id===id))return futures.find(x=>x.id===id);
 const row={id,title:clean(input.title,120)||"未命名未來事件",hiddenCause:clean(input.hiddenCause,400),pressure:clamp(input.pressure),stage:stages.has(input.stage)?input.stage:"DORMANT",earliestDay:Math.max(1,Number(input.earliestDay)||1),latestDay:Number.isFinite(Number(input.latestDay))?Math.max(1,Number(input.latestDay)):null,activationConditions:Array.isArray(input.activationConditions)?input.activationConditions.slice(0,12):[],cancelConditions:Array.isArray(input.cancelConditions)?input.cancelConditions.slice(0,12):[],escalationConditions:Array.isArray(input.escalationConditions)?input.escalationConditions.slice(0,12):[],historicalLinks:Array.isArray(input.historicalLinks)?input.historicalLinks.slice(0,12):[],impactScope:scopes.has(input.impactScope)?input.impactScope:"REGIONAL",affectedRegions:Array.isArray(input.affectedRegions)?input.affectedRegions.slice(0,12):[],intensity:clamp(input.intensity||50),duration:input.duration??null,domains:Array.isArray(input.domains)?input.domains.slice(0,12):[],playerCanPrevent:input.playerCanPrevent!==false,playerCanAccelerate:input.playerCanAccelerate!==false,playerCanMitigate:input.playerCanMitigate!==false,playerCanRedirect:input.playerCanRedirect!==false,legacyMirror:false,pressureLog:[]};
 futures.push(row);return row
}
function verifiedFact(state,id){return (state.knowledge||[]).some(k=>k?.status==="VERIFIED"&&(k.factId===id||k.id===id))}
export function futureConditionMet(state,condition,future=null){
 if(typeof condition==="function")return Boolean(condition(state,future));if(condition&&typeof condition==="object"){const t=String(condition.type||"").toUpperCase();if(t==="PRESSURE_GTE")return Number(future?.pressure||0)>=Number(condition.value||0);if(t==="FLAG")return Boolean(state.world?.state?.flags?.[condition.key]);return false}
 const q=String(condition||"").trim();if(!q)return true;if(q.startsWith("NOT:"))return !futureConditionMet(state,q.slice(4),future);
 let m=q.match(/^DAY\s*(>=|>|<=|<|=)\s*(\d+)$/i);if(m){const day=Number(state.world?.state?.day)||1,n=Number(m[2]);return m[1]===">="?day>=n:m[1]===">"?day>n:m[1]==="<="?day<=n:m[1]==="<"?day<n:day===n}
 m=q.match(/^EVENT:(.+)$/i);if(m)return (state.events||[]).some(e=>e.type===m[1]||e.id===m[1]);
 m=q.match(/^FACT:(.+)$/i);if(m)return verifiedFact(state,m[1]);
 m=q.match(/^FLAG:(.+)$/i);if(m)return Boolean(state.world?.state?.flags?.[m[1]]);
 m=q.match(/^LOCATION:(.+)$/i);if(m)return String(state.player?.location||state.world?.state?.location||"")===m[1];
 m=q.match(/^PRESSURE\s*(>=|>|<=|<|=)\s*(\d+)$/i);if(m){const p=Number(future?.pressure)||0,n=Number(m[2]);return m[1]===">="?p>=n:m[1]===">"?p>n:m[1]==="<="?p<=n:m[1]==="<"?p<n:p===n}
 return false
}
function all(state,rows,future){return (Array.isArray(rows)?rows:[]).every(x=>futureConditionMet(state,x,future))}
export function recomputeFutureStage(state,future){
 if(!future)return null;const day=Number(state.world?.state?.day)||1;
 if(all(state,future.cancelConditions,future)&&future.cancelConditions.length){future.stage="RESOLVED";return future}
 if(future.stage==="RESOLVED")return future;
 const activeReady=day>=future.earliestDay&&(!future.latestDay||day<=future.latestDay)&&all(state,future.activationConditions,future);
 const p=clamp(future.pressure);
 if(future.stage==="ACTIVE"&&p<55){future.stage="RESOLVING";return future}
 if(future.stage==="RESOLVING"&&p<=20){future.stage="RESOLVED";return future}
 future.stage=p>=80&&activeReady?"ACTIVE":p>=60?"CRITICAL":p>=35?"ESCALATING":p>=15?"EMERGING":"DORMANT";return future
}
export function applyFuturePressure(state,futureId,delta,reason=""){
 const future=ensureFutureEngine(state).find(x=>x.id===futureId);if(!future)return null;const before=future.pressure;future.pressure=clamp(before+Number(delta||0));future.pressureLog??=[];future.pressureLog.push({delta:future.pressure-before,reason:clean(reason,180),day:Number(state.world?.state?.day)||1,at:Date.now()});future.pressureLog=future.pressureLog.slice(-80);recomputeFutureStage(state,future);return future
}
export function mirrorLegacyCrisisToFuture(state){
 const legacy=state.world?.state?.crisis;if(!legacy)return null;const future=ensureFutureEngine(state).find(x=>x.id==="FUT-LEGACY-CRISIS");future.pressure=clamp(legacy.pressure);future.stage=mapLegacyStage(legacy.stage);return future
}
export function registerTimelineFutures(state){
 for(const row of state.world?.timeline||[])createFutureSkeleton(state,{id:"FUT-"+row.id,title:row.title||row.category||"世界事件",hiddenCause:row.directorTruth||"",pressure:0,earliestDay:row.earliestDay||row.triggerDay||1,latestDay:row.latestDay||null,activationConditions:Array.isArray(row.activationConditions)?row.activationConditions:[],cancelConditions:Array.isArray(row.cancelConditions)?row.cancelConditions:[],escalationConditions:Array.isArray(row.escalationConditions)?row.escalationConditions:[],impactScope:"REGIONAL",intensity:Math.min(100,Math.max(10,Number(row.pressure||5)*5)),domains:["SECURITY"],playerCanPrevent:true,playerCanAccelerate:true,playerCanMitigate:true,playerCanRedirect:true});
 return ensureFutureEngine(state)
}
export function futureSnapshot(state,{director=false}={}){
 return ensureFutureEngine(state).map(x=>({id:x.id,title:x.title,stage:x.stage,pressure:x.pressure,impactScope:x.impactScope,intensity:x.intensity,domains:x.domains,playerCanPrevent:x.playerCanPrevent,playerCanAccelerate:x.playerCanAccelerate,playerCanMitigate:x.playerCanMitigate,playerCanRedirect:x.playerCanRedirect,...(director?{hiddenCause:x.hiddenCause,activationConditions:x.activationConditions,cancelConditions:x.cancelConditions,historicalLinks:x.historicalLinks}:{})}))
}
