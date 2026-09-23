import {eventAllowedByPacing,eventDangerTier} from "./world-pacing.js?v=540181";
const clean=(v,max=600)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)};
const conditions=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>clean(x,160)).filter(Boolean))].slice(0,8);
const cancelConditions=v=>conditions(v).map(x=>/^NOT:(EVENT|FLAG|FACT|LOCATION):/i.test(x)?x.slice(4):x);
const IMPACT_SCOPES=new Set(["LOCAL","REGIONAL","NATIONAL","CONTINENTAL","WORLD"]);
const impactDomains=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>clean(x,60).toUpperCase()).filter(Boolean))].slice(0,8);
function conditionMet(state,raw){
 const q=clean(raw,160);if(!q)return true;
 if(q.startsWith("NOT:"))return !conditionMet(state,q.slice(4));
 let m=q.match(/^DAY\s*(>=|>|<=|<|=)\s*(\d+)$/i);if(m){const day=Number(state.world?.state?.day)||1,n=Number(m[2]);return m[1]===">="?day>=n:m[1]===">"?day>n:m[1]==="<="?day<=n:m[1]==="<"?day<n:day===n}
 m=q.match(/^EVENT:(.+)$/i);if(m)return (state.events||[]).some(e=>e.type===m[1]||e.id===m[1]);
 m=q.match(/^FACT:(.+)$/i);if(m)return (state.knowledge||[]).some(k=>k.status==="VERIFIED"&&(k.factId===m[1]||k.id===m[1]));
 m=q.match(/^FLAG:(.+)$/i);if(m)return Boolean(state.world?.state?.flags?.[m[1]]);
 m=q.match(/^LOCATION:(.+)$/i);if(m)return String(state.player?.location||state.world?.state?.location||"")===m[1];
 return false
}
function conditionsMet(state,rows=[]){return conditions(rows).every(x=>conditionMet(state,x))}
export function timelineConditionSnapshot(state,event){return {activationMet:conditionsMet(state,event?.activationConditions),cancelMet:conditions(event?.cancelConditions).length>0&&conditionsMet(state,event?.cancelConditions),escalationMet:conditions(event?.escalationConditions).length>0&&conditionsMet(state,event?.escalationConditions)}};
export function createTimelinePacing(playHours=15){
 const targetPlayHours=clamp(Math.round(Number(playHours)||15),2,100);
 let majorEventCount,horizonDays;
 if(targetPlayHours<=5){majorEventCount=4;horizonDays=Math.max(3,Math.round(targetPlayHours*.9))}
 else if(targetPlayHours<=12){majorEventCount=5;horizonDays=Math.max(4,Math.round(targetPlayHours*.75))}
 else if(targetPlayHours<=25){majorEventCount=6;horizonDays=Math.max(7,Math.round(targetPlayHours*.65))}
 else if(targetPlayHours<=50){majorEventCount=7;horizonDays=Math.max(12,Math.round(targetPlayHours*.6))}
 else{majorEventCount=8;horizonDays=Math.min(90,Math.max(24,Math.round(targetPlayHours*.55)))}
 const averageGapDays=Math.max(1,Math.round(horizonDays/(majorEventCount+1))),span=Math.max(0,horizonDays-2);
 const earlyTo=clamp(Math.round(2+span*.25),2,horizonDays),middleFrom=clamp(Math.round(2+span*.25),2,horizonDays),middleTo=clamp(Math.round(2+span*.7),middleFrom,horizonDays),lateFrom=clamp(Math.round(2+span*.65),2,horizonDays);
 return {targetPlayHours,majorEventCount,horizonDays,averageGapDays,phases:{
  early:{fromDay:2,toDay:earlyTo},
  middle:{fromDay:middleFrom,toDay:middleTo},
  late:{fromDay:lateFrom,toDay:horizonDays}
 }}
}
export function timelineAuthoringSlots(pacing=createTimelinePacing()){
 const count=Math.max(1,Math.round(Number(pacing.majorEventCount)||1)),horizon=Math.max(2,Math.round(Number(pacing.horizonDays)||2)),gap=Math.max(1,Math.round(Number(pacing.averageGapDays)||1)),out=[];
 let previous=2;
 for(let i=0;i<count;i++){
  const ratio=count===1?0:i/(count-1),target=Math.round(2+Math.max(0,horizon-2)*ratio),radius=Math.max(0,Math.floor(gap/2));
  let earliest=clamp(target-radius,2,horizon),latest=clamp(target+radius,earliest,horizon);
  earliest=Math.max(previous,earliest);latest=Math.max(earliest,latest);if(i===0)earliest=2;if(i===count-1)latest=horizon;
  previous=earliest;out.push({slot:i+1,earliestDay:earliest,latestDay:latest})
 }
 return out
}
export function bindTimelineAuthoringSlots(input=[],pacing=createTimelinePacing()){
 const slots=timelineAuthoringSlots(pacing),rows=Array.isArray(input)?input:[];
 return slots.map((slot,i)=>({...((rows[i]&&typeof rows[i]==="object")?rows[i]:{}),earliestDay:slot.earliestDay,latestDay:slot.latestDay}))
}
export function normalizeWorldTimeline(input=[],pacing=createTimelinePacing()){
 const out=[];
 for(const [i,x] of (Array.isArray(input)?input:[]).slice(0,pacing.majorEventCount).entries()){
  if(!x||typeof x!=="object")continue;
  const title=clean(x.title,120),directorTruth=clean(x.directorTruth,600),observableEffect=clean(x.observableEffect,500);
  const earliestDay=clamp(Math.round(Number(x.earliestDay)||0),2,pacing.horizonDays),latestDay=clamp(Math.round(Number(x.latestDay)||earliestDay),earliestDay,pacing.horizonDays);
  if(!title||directorTruth.length<8||observableEffect.length<8)continue;
  const id=clean(x.id,100)||"TL-"+(i+1)+"-"+hash(title+"|"+earliestDay+"|"+latestDay);
  const triggerDay=earliestDay+(hash(id+"|"+title)%(latestDay-earliestDay+1));
  const links=x.links&&typeof x.links==="object"&&!Array.isArray(x.links)?{historyRefs:[...new Set((Array.isArray(x.links.historyRefs)?x.links.historyRefs:[]).map(v=>clean(v,100)).filter(Boolean))].slice(0,4),locationRefs:[...new Set((Array.isArray(x.links.locationRefs)?x.links.locationRefs:[]).map(v=>clean(v,120)).filter(Boolean))].slice(0,4)}:{historyRefs:[],locationRefs:[]};
  const pressure=clamp(Math.round(Number(x.pressure)||0),0,15),scopeRaw=String(x.impactScope||"REGIONAL").toUpperCase(),impactScope=IMPACT_SCOPES.has(scopeRaw)?scopeRaw:"REGIONAL",domains=impactDomains(x.domains);if(!domains.length)domains.push("SECURITY");
  out.push({id,title,category:clean(x.category,60)||"WORLD_EVENT",earliestDay,latestDay,triggerDay,baseTriggerDay:triggerDay,impactOffsetDays:0,intensityModifier:0,impactHistory:[],directorTruth,observableEffect,pressure,impactScope,affectedRegions:[...new Set((Array.isArray(x.affectedRegions)?x.affectedRegions:[]).map(v=>clean(v,120)).filter(Boolean))].slice(0,8),intensity:clamp(Math.round(Number(x.intensity)||Math.max(10,pressure*5)),0,100),duration:Number.isFinite(Number(x.duration))?Math.max(0,Math.round(Number(x.duration))):null,domains,links,activationConditions:conditions(x.activationConditions),cancelConditions:cancelConditions(x.cancelConditions),escalationConditions:conditions(x.escalationConditions),playerCanPrevent:x.playerCanPrevent!==false,playerCanAccelerate:x.playerCanAccelerate!==false,playerCanMitigate:x.playerCanMitigate!==false,playerCanRedirect:x.playerCanRedirect!==false,status:"SCHEDULED",triggeredDay:null})
 }
 return out
}
export function validateWorldTimeline(input,pacing=createTimelinePacing()){
 const timeline=normalizeWorldTimeline(input,pacing),errors=[];
 if(timeline.length!==pacing.majorEventCount)errors.push("WORLD_TIMELINE_EVENT_COUNT_MISMATCH");
 for(let i=1;i<timeline.length;i++)if(timeline[i].earliestDay<timeline[i-1].earliestDay)errors.push("WORLD_TIMELINE_NOT_ORDERED");
 if(timeline.length){
  const early=timeline.some(x=>x.earliestDay<=pacing.phases.early.toDay),mid=timeline.some(x=>x.earliestDay>=pacing.phases.middle.fromDay&&x.earliestDay<=pacing.phases.middle.toDay),late=timeline.some(x=>x.latestDay>=pacing.phases.late.fromDay);
  if(!early)errors.push("WORLD_TIMELINE_EARLY_EVENT_MISSING");
  if(!mid)errors.push("WORLD_TIMELINE_MIDDLE_EVENT_MISSING");
  if(!late)errors.push("WORLD_TIMELINE_LATE_EVENT_MISSING")
 }
 return {valid:errors.length===0,errors,timeline,pacing}
}
export function effectiveTriggerDay(x){
 const earliest=Math.max(2,Math.round(Number(x?.earliestDay)||2)),latest=Math.max(earliest,Math.round(Number(x?.latestDay)||earliest));
 const raw=Math.round(Number(x?.baseTriggerDay??x?.triggerDay)||earliest)+Math.round(Number(x?.impactOffsetDays)||0);
 return clamp(raw,earliest,latest)
}
export function effectiveTimelinePressure(x){return clamp(Math.round(Number(x?.pressure)||0)+Math.round(Number(x?.intensityModifier)||0),0,20)}
export function applyTimelineImpact(state,effect){
 const id=clean(effect?.timelineId,120),action=String(effect?.action||"").toUpperCase(),timeline=(state.world?.timeline||[]).find(x=>x.id===id&&x.status==="SCHEDULED");if(!timeline||!["DELAY","ADVANCE","WEAKEN","STRENGTHEN"].includes(action))return null;
 timeline.baseTriggerDay??=timeline.triggerDay;timeline.impactOffsetDays??=0;timeline.intensityModifier??=0;timeline.impactHistory??=[];
 const earliest=Math.max(2,Number(timeline.earliestDay)||2),latest=Math.max(earliest,Number(timeline.latestDay)||earliest),current=Math.max(1,Number(state.world?.state?.day)||1),beforeDay=effectiveTriggerDay(timeline),beforePressure=effectiveTimelinePressure(timeline),base=Number(timeline.baseTriggerDay)||beforeDay;
 if(["DELAY","ADVANCE"].includes(action)&&current>=latest)return null;if(["DELAY","WEAKEN"].includes(action)&&timeline.playerCanPrevent===false)return null;if(["ADVANCE","STRENGTHEN"].includes(action)&&timeline.playerCanAccelerate===false)return null;
 if(action==="DELAY"){const days=clamp(Math.round(Number(effect?.days)||1),1,5),desired=clamp(beforeDay+days,Math.max(earliest,current+1),latest);timeline.impactOffsetDays=desired-base}
 if(action==="ADVANCE"){const days=clamp(Math.round(Number(effect?.days)||1),1,3),desired=clamp(beforeDay-days,Math.max(earliest,current+1),latest);timeline.impactOffsetDays=desired-base}
 if(action==="WEAKEN")timeline.intensityModifier=clamp(timeline.intensityModifier-clamp(Math.round(Number(effect?.amount)||1),1,5),-10,10);
 if(action==="STRENGTHEN")timeline.intensityModifier=clamp(timeline.intensityModifier+clamp(Math.round(Number(effect?.amount)||1),1,5),-10,10);
 timeline.impactHistory.push({day:current,action,days:Number(effect?.days)||0,amount:Number(effect?.amount)||0,beforeDay,afterDay:effectiveTriggerDay(timeline)});timeline.impactHistory=timeline.impactHistory.slice(-20);
 return {timelineId:timeline.id,action,beforeDay,afterDay:effectiveTriggerDay(timeline),beforePressure,afterPressure:effectiveTimelinePressure(timeline)}
}
export function directorTimelineSnapshot(state,limit=6){
 return (state.world?.timeline||[]).filter(x=>x.status==="SCHEDULED").sort((a,b)=>effectiveTriggerDay(a)-effectiveTriggerDay(b)).slice(0,limit).map(x=>({id:x.id,category:x.category,earliestDay:x.earliestDay,latestDay:x.latestDay,triggerDay:effectiveTriggerDay(x),baseTriggerDay:x.baseTriggerDay??x.triggerDay,impactOffsetDays:x.impactOffsetDays||0,intensityModifier:x.intensityModifier||0,directorTruth:x.directorTruth,observableEffect:x.observableEffect,pressure:effectiveTimelinePressure(x),impactScope:x.impactScope||"REGIONAL",affectedRegions:[...(x.affectedRegions||[])],intensity:Number(x.intensity)||0,duration:x.duration??null,domains:[...(x.domains||[])],activationConditions:[...(x.activationConditions||[])],cancelConditions:[...(x.cancelConditions||[])],escalationConditions:[...(x.escalationConditions||[])],playerCanPrevent:x.playerCanPrevent!==false,playerCanAccelerate:x.playerCanAccelerate!==false,playerCanMitigate:x.playerCanMitigate!==false,playerCanRedirect:x.playerCanRedirect!==false,dangerTier:eventDangerTier(x),conditionState:timelineConditionSnapshot(state,x)}))
}
export function triggerDueTimelineEvents(state){
 const day=Number(state.world?.state?.day)||1,timeline=state.world?.timeline||[];
 for(const event of timeline.filter(x=>x.status==="SCHEDULED")){const earliest=Math.max(1,Number(event.earliestDay)||1);if(day<earliest)continue;const c=timelineConditionSnapshot(state,event);if(c.cancelMet){event.status="CANCELLED";event.cancelledDay=day;event.cancelReason="CANCEL_CONDITIONS_MET"}}
 const due=timeline.filter(x=>x.status==="SCHEDULED"&&day>=effectiveTriggerDay(x)&&timelineConditionSnapshot(state,x).activationMet&&eventAllowedByPacing(state,x)).sort((a,b)=>effectiveTriggerDay(a)-effectiveTriggerDay(b)||Number(a.earliestDay)-Number(b.earliestDay)||String(a.id).localeCompare(String(b.id)))[0];
 if(!due)return null;
 const c=timelineConditionSnapshot(state,due);due.status="TRIGGERED";due.triggeredDay=day;due.effectivePressure=clamp(effectiveTimelinePressure(due)+(c.escalationMet?2:0),0,20);due.escalated=c.escalationMet;
 return due
}
