const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PRESSURE_CAP={1:3,2:6,3:10,4:15,5:20};
const INTENSITY_CAP={1:25,2:40,3:60,4:80,5:100};
const FUTURE_PRESSURE_CAP={1:25,2:45,3:65,4:85,5:100};

export function pacingPhase(state){
 const pacing=state.world?.timelinePacing||{},day=Math.max(1,Number(state.world?.state?.day)||1),horizon=Math.max(1,Number(pacing.horizonDays)||1);
 const lateFrom=Math.max(2,Number(pacing.phases?.late?.fromDay)||Math.round(horizon*.65)),middleFrom=Math.max(2,Number(pacing.phases?.middle?.fromDay)||Math.round(horizon*.25));
 return {phase:day>=lateFrom?"LATE":day>=middleFrom?"MIDDLE":"EARLY",day,horizon,progress:clamp(day/horizon,0,1),middleFrom,lateFrom}
}

export function eventDangerProfile(state){
 const p=pacingPhase(state),seedDanger=clamp(Math.round(Number(state.world?.seedContract?.danger)||3),1,5),hasPacing=Number(state.world?.timelinePacing?.horizonDays)>=2;
 if(!hasPacing)return {...p,seedDanger,newbieProtection:false,rampTier:5,maxDanger:5,pressureCap:20,intensityCap:100,futurePressureCap:100,legacyUnpaced:true};
 const newbieProtection=p.day<=1;
 const progress=clamp((p.day-1)/Math.max(1,p.horizon-1),0,1);
 const rampTier=newbieProtection?1:progress<.25?2:progress<.5?3:progress<.75?4:5;
 const maxDanger=Math.min(seedDanger,rampTier);
 return {...p,seedDanger,newbieProtection,rampTier,maxDanger,pressureCap:PRESSURE_CAP[maxDanger],intensityCap:INTENSITY_CAP[maxDanger],futurePressureCap:FUTURE_PRESSURE_CAP[maxDanger]}
}

export function eventDangerTier(event={}){
 const pressure=Math.max(0,Number(event.pressure??event.effectivePressure)||0),intensity=Math.max(0,Number(event.intensity)||0),scope=String(event.impactScope||event.scope||"LOCAL").toUpperCase(),category=String(event.category||event.kind||event.subtype||"").toUpperCase();
 let tier=pressure<=3?1:pressure<=6?2:pressure<=10?3:pressure<=15?4:5;
 tier=Math.max(tier,intensity<=25?1:intensity<=40?2:intensity<=60?3:intensity<=80?4:5);
 tier=Math.max(tier,scope==="WORLD"?5:scope==="CONTINENTAL"?4:scope==="NATIONAL"?3:scope==="REGIONAL"?2:1);
 if(/ENDGAME|APOCAL|EXTINCTION|WORLD_WAR/.test(category))tier=5;
 else if(/WAR|PLAGUE|SIEGE|INVASION|COLLAPSE|DISASTER/.test(category))tier=Math.max(tier,3);
 return clamp(tier,1,5)
}

export function eventAllowedByPacing(state,event){return eventDangerTier(event)<=eventDangerProfile(state).maxDanger}
export function clampWorldEventPressure(state,amount){const p=eventDangerProfile(state);return clamp(Math.round(Math.max(0,Number(amount)||0)),0,p.pressureCap)}
export function clampWorldEventIntensity(state,amount){const p=eventDangerProfile(state);return clamp(Math.round(Math.max(0,Number(amount)||0)),0,p.intensityCap)}

export function endgameWindowOpen(state){
 const timeline=Array.isArray(state.world?.timeline)?state.world.timeline:[];if(!timeline.length)return true;
 const phase=pacingPhase(state),triggered=timeline.filter(x=>x.status==="TRIGGERED").length,ratio=triggered/timeline.length;
 return phase.phase==="LATE"||ratio>=.65
}

export function pacedTimelinePressure(state,amount){
 const p=pacingPhase(state),profile=eventDangerProfile(state),n=Math.max(0,Number(amount)||0),factor=p.phase==="EARLY"?.65:p.phase==="MIDDLE"?1:1.15;
 return clamp(Math.round(n*factor),0,profile.pressureCap)
}

export function pacingSnapshot(state){
 const p=pacingPhase(state),profile=eventDangerProfile(state),timeline=Array.isArray(state.world?.timeline)?state.world.timeline:[],triggered=timeline.filter(x=>x.status==="TRIGGERED").length;
 return {...p,newbieProtection:profile.newbieProtection,maxDanger:profile.maxDanger,seedDanger:profile.seedDanger,pressureCap:profile.pressureCap,intensityCap:profile.intensityCap,triggeredEvents:triggered,totalEvents:timeline.length,endgameWindowOpen:endgameWindowOpen(state)}
}
