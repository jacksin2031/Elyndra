const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function pacingPhase(state){
 const pacing=state.world?.timelinePacing||{},day=Math.max(1,Number(state.world?.state?.day)||1),horizon=Math.max(1,Number(pacing.horizonDays)||1);
 const lateFrom=Math.max(2,Number(pacing.phases?.late?.fromDay)||Math.round(horizon*.65)),middleFrom=Math.max(2,Number(pacing.phases?.middle?.fromDay)||Math.round(horizon*.25));
 return {phase:day>=lateFrom?"LATE":day>=middleFrom?"MIDDLE":"EARLY",day,horizon,progress:clamp(day/horizon,0,1),middleFrom,lateFrom}
}
export function endgameWindowOpen(state){
 const timeline=Array.isArray(state.world?.timeline)?state.world.timeline:[];if(!timeline.length)return true;
 const phase=pacingPhase(state),triggered=timeline.filter(x=>x.status==="TRIGGERED").length,ratio=triggered/timeline.length;
 return phase.phase==="LATE"||ratio>=.65
}
export function pacedTimelinePressure(state,amount){
 const p=pacingPhase(state),n=Math.max(0,Number(amount)||0),factor=p.phase==="EARLY"?.65:p.phase==="MIDDLE"?1:1.15;
 return clamp(Math.round(n*factor),0,20)
}
export function pacingSnapshot(state){
 const p=pacingPhase(state),timeline=Array.isArray(state.world?.timeline)?state.world.timeline:[],triggered=timeline.filter(x=>x.status==="TRIGGERED").length;
 return {...p,triggeredEvents:triggered,totalEvents:timeline.length,endgameWindowOpen:endgameWindowOpen(state)}
}
