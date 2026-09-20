const clean=(v,max=600)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)};
export function createTimelinePacing(playHours=15){
 const targetPlayHours=clamp(Math.round(Number(playHours)||15),2,100);
 let majorEventCount,horizonDays;
 if(targetPlayHours<=5){majorEventCount=4;horizonDays=Math.max(7,Math.round(targetPlayHours*1.6))}
 else if(targetPlayHours<=12){majorEventCount=5;horizonDays=Math.round(targetPlayHours*1.7)}
 else if(targetPlayHours<=25){majorEventCount=6;horizonDays=Math.round(targetPlayHours*1.8)}
 else if(targetPlayHours<=50){majorEventCount=7;horizonDays=Math.round(targetPlayHours*1.9)}
 else{majorEventCount=8;horizonDays=Math.min(180,Math.round(targetPlayHours*1.8))}
 const averageGapDays=Math.max(1,Math.round(horizonDays/(majorEventCount+1)));
 return {targetPlayHours,majorEventCount,horizonDays,averageGapDays,phases:{
  early:{fromDay:2,toDay:Math.max(3,Math.round(horizonDays*.25))},
  middle:{fromDay:Math.max(4,Math.round(horizonDays*.25)),toDay:Math.max(5,Math.round(horizonDays*.7))},
  late:{fromDay:Math.max(6,Math.round(horizonDays*.65)),toDay:horizonDays}
 }}
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
  out.push({id,title,category:clean(x.category,60)||"WORLD_EVENT",earliestDay,latestDay,triggerDay,baseTriggerDay:triggerDay,impactOffsetDays:0,intensityModifier:0,impactHistory:[],directorTruth,observableEffect,pressure:clamp(Math.round(Number(x.pressure)||0),0,15),status:"SCHEDULED",triggeredDay:null})
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
 if(["DELAY","ADVANCE"].includes(action)&&current>=latest)return null;
 if(action==="DELAY"){const days=clamp(Math.round(Number(effect?.days)||1),1,5),desired=clamp(beforeDay+days,Math.max(earliest,current+1),latest);timeline.impactOffsetDays=desired-base}
 if(action==="ADVANCE"){const days=clamp(Math.round(Number(effect?.days)||1),1,3),desired=clamp(beforeDay-days,Math.max(earliest,current+1),latest);timeline.impactOffsetDays=desired-base}
 if(action==="WEAKEN")timeline.intensityModifier=clamp(timeline.intensityModifier-clamp(Math.round(Number(effect?.amount)||1),1,5),-10,10);
 if(action==="STRENGTHEN")timeline.intensityModifier=clamp(timeline.intensityModifier+clamp(Math.round(Number(effect?.amount)||1),1,5),-10,10);
 timeline.impactHistory.push({day:current,action,days:Number(effect?.days)||0,amount:Number(effect?.amount)||0,beforeDay,afterDay:effectiveTriggerDay(timeline)});timeline.impactHistory=timeline.impactHistory.slice(-20);
 return {timelineId:timeline.id,action,beforeDay,afterDay:effectiveTriggerDay(timeline),beforePressure,afterPressure:effectiveTimelinePressure(timeline)}
}
export function directorTimelineSnapshot(state,limit=6){
 return (state.world?.timeline||[]).filter(x=>x.status==="SCHEDULED").sort((a,b)=>effectiveTriggerDay(a)-effectiveTriggerDay(b)).slice(0,limit).map(x=>({id:x.id,category:x.category,earliestDay:x.earliestDay,latestDay:x.latestDay,triggerDay:effectiveTriggerDay(x),baseTriggerDay:x.baseTriggerDay??x.triggerDay,impactOffsetDays:x.impactOffsetDays||0,intensityModifier:x.intensityModifier||0,directorTruth:x.directorTruth,observableEffect:x.observableEffect,pressure:effectiveTimelinePressure(x)}))
}
export function triggerDueTimelineEvents(state){
 const day=Number(state.world?.state?.day)||1,timeline=state.world?.timeline||[],due=timeline.filter(x=>x.status==="SCHEDULED"&&day>=effectiveTriggerDay(x)).sort((a,b)=>effectiveTriggerDay(a)-effectiveTriggerDay(b)||Number(a.earliestDay)-Number(b.earliestDay)||String(a.id).localeCompare(String(b.id)))[0];
 if(!due)return null;
 due.status="TRIGGERED";due.triggeredDay=day;due.effectivePressure=effectiveTimelinePressure(due);
 return due
}
