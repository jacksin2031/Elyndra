const clean=(v,max=600)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)};
export function normalizeWorldTimeline(input=[]){
 const out=[];
 for(const [i,x] of (Array.isArray(input)?input:[]).slice(0,8).entries()){
  if(!x||typeof x!=="object")continue;
  const title=clean(x.title,120),directorTruth=clean(x.directorTruth,600),observableEffect=clean(x.observableEffect,500);
  const earliestDay=clamp(Math.round(Number(x.earliestDay)||0),2,365),latestDay=clamp(Math.round(Number(x.latestDay)||earliestDay),earliestDay,365);
  if(!title||directorTruth.length<8||observableEffect.length<8)continue;
  const id=clean(x.id,100)||`TL-${i+1}-${hash(title+"|"+earliestDay+"|"+latestDay)}`;
  const triggerDay=earliestDay+(hash(id+"|"+title)%(latestDay-earliestDay+1));
  out.push({id,title,category:clean(x.category,60)||"WORLD_EVENT",earliestDay,latestDay,triggerDay,directorTruth,observableEffect,pressure:clamp(Math.round(Number(x.pressure)||0),0,15),status:"SCHEDULED",triggeredDay:null})
 }
 return out
}
export function validateWorldTimeline(input){
 const timeline=normalizeWorldTimeline(input),errors=[];
 if(timeline.length<4)errors.push("WORLD_TIMELINE_TOO_SHORT");
 for(let i=1;i<timeline.length;i++)if(timeline[i].earliestDay<timeline[i-1].earliestDay)errors.push("WORLD_TIMELINE_NOT_ORDERED");
 return {valid:errors.length===0,errors,timeline}
}
export function directorTimelineSnapshot(state,limit=6){
 return (state.world?.timeline||[]).filter(x=>x.status==="SCHEDULED").slice(0,limit).map(x=>({id:x.id,category:x.category,earliestDay:x.earliestDay,latestDay:x.latestDay,triggerDay:x.triggerDay,directorTruth:x.directorTruth,observableEffect:x.observableEffect,pressure:x.pressure}))
}
export function triggerDueTimelineEvents(state){
 const day=Number(state.world?.state?.day)||1,timeline=state.world?.timeline||[],due=timeline.find(x=>x.status==="SCHEDULED"&&day>=x.triggerDay);
 if(!due)return null;
 due.status="TRIGGERED";due.triggeredDay=day;
 return due
}
