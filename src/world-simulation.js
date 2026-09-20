import {ensureCrisis,addCrisisPressure} from "./crisis-engine.js?v=232";
import {recordCausalEvent} from "./knowledge-graph.js?v=232";
import {tickFactions} from "./faction-engine.js?v=232";
import {tickNpcs} from "./npc-engine.js?v=232";
import {ensureClock} from "./world-clock.js?v=232";
import {triggerDueTimelineEvents,effectiveTimelinePressure} from "./world-timeline.js?v=250";
import {processDueConsequences} from "./world-impact.js?v=260";
import {processRecognition} from "./recognition-engine.js?v=260";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
export function ensureWorldSimulation(state){
 const clock=ensureClock(state);
 state.world.state.simulation??={tension:10,lastEventMinute:0,lastTickMinute:clock.totalMinutes,npcCursor:0,factionCursor:0,flags:{}};
 const sim=state.world.state.simulation;
 sim.tension=Number.isFinite(sim.tension)?sim.tension:10;sim.lastEventMinute=Number.isFinite(sim.lastEventMinute)?sim.lastEventMinute:0;sim.lastTickMinute=Number.isFinite(sim.lastTickMinute)?sim.lastTickMinute:clock.totalMinutes;sim.npcCursor=Number.isInteger(sim.npcCursor)?sim.npcCursor:0;sim.factionCursor=Number.isInteger(sim.factionCursor)?sim.factionCursor:0;sim.flags??={};
 ensureCrisis(state);return sim
}
export function tickWorld(state){
 const sim=ensureWorldSimulation(state),clock=ensureClock(state);
tickNpcs(state);tickFactions(state);
 const recognitionEvents=processRecognition(state);
 const consequences=processDueConsequences(state);if(consequences.length){const first=consequences[0];const record={id:id(),type:"WORLD_EVENT",visibility:"OBSERVABLE",subtype:"PLAYER_CONSEQUENCE",impactId:first.id,summary:first.summary,day:clock.day,at:Date.now()};state.world.state.lastWorldEvent=record;return record}
 const danger=Math.max(1,Math.min(5,Number(state.world?.seedContract?.danger)||3)),elapsedSinceTick=Math.max(0,clock.totalMinutes-sim.lastTickMinute),steps=Math.floor(elapsedSinceTick/30);
 if(steps>0){sim.tension=Math.min(100,sim.tension+steps*Math.max(1,danger-2));sim.lastTickMinute+=steps*30}
 const scheduled=triggerDueTimelineEvents(state);if(scheduled){sim.lastEventMinute=clock.totalMinutes;sim.tension=Math.max(5,sim.tension-5);const record={id:id(),type:"WORLD_EVENT",visibility:"OBSERVABLE",subtype:"TIMELINE_EVENT",timelineId:scheduled.id,summary:scheduled.observableEffect,day:clock.day,at:Date.now()};state.events.push(record);const crisis=state.world.graph?.nodes?.find(n=>n.type==="crisis");recordCausalEvent(state,record,{causeIds:crisis?[crisis.id]:[]});const timelinePressure=effectiveTimelinePressure(scheduled);if(timelinePressure)addCrisisPressure(state,timelinePressure,scheduled.observableEffect);state.world.state.lastWorldEvent=record;return record}
 const elapsed=clock.totalMinutes-sim.lastEventMinute;if(elapsed<180)return recognitionEvents[0]||null;
 const roll=Math.random();let event=null;
 if(sim.tension>=18&&roll<.35)event={kind:"RUMOR",summary:"從可觀察的痕跡與零碎動靜中，你察覺周遭的風險正在上升。",pressure:2};
 else if(sim.tension>=30&&roll<.55)event={kind:"ACTIVITY_SHIFT",summary:"附近出現更多來源不明的活動痕跡，但你仍無法確認背後是誰。",pressure:5};
 else if(sim.tension>=45&&roll<.7)event={kind:"WORLD_PRESSURE",summary:"周遭環境出現一種不尋常的變化，像是某個正在累積的危機開始影響到你能感知的範圍。",pressure:12};
 if(!event)return recognitionEvents[0]||null;
 sim.lastEventMinute=clock.totalMinutes;sim.tension=Math.max(5,sim.tension-8);
 const record={id:id(),type:"WORLD_EVENT",visibility:"OBSERVABLE",subtype:event.kind,summary:event.summary,day:clock.day,time:`${String(clock.hour).padStart(2,"0")}:${String(clock.minute).padStart(2,"0")}`,at:Date.now()};
 state.events.push(record);
 const crisis=state.world.graph?.nodes?.find(n=>n.type==="crisis");
 recordCausalEvent(state,record,{causeIds:crisis?[crisis.id]:[]});
 addCrisisPressure(state,event.pressure,event.summary);
 state.world.state.lastWorldEvent=record;
 return record
}