import {ensureCrisis,addCrisisPressure} from "./crisis-engine.js";
import {recordCausalEvent} from "./knowledge-graph.js";
import {tickFactions} from "./faction-engine.js";
import {tickNpcs} from "./npc-engine.js";
import {ensureClock} from "./world-clock.js";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
export function ensureWorldSimulation(state){state.world.state.simulation??={tension:10,lastEventMinute:0,flags:{}};ensureCrisis(state);return state.world.state.simulation}
export function tickWorld(state){
 tickNpcs(state);tickFactions(state);
 const sim=ensureWorldSimulation(state),clock=ensureClock(state),danger=Math.max(1,Math.min(5,Number(state.world?.seedContract?.danger)||3));
 sim.tension=Math.min(100,sim.tension+Math.max(1,danger-2));
 const elapsed=clock.totalMinutes-sim.lastEventMinute;if(elapsed<180)return null;
 const roll=Math.random();let event=null;
 if(sim.tension>=18&&roll<.35)event={kind:"RUMOR",summary:"從可觀察的痕跡與零碎動靜中，你察覺周遭的風險正在上升。",pressure:2};
 else if(sim.tension>=30&&roll<.55)event={kind:"ACTIVITY_SHIFT",summary:"附近出現更多來源不明的活動痕跡，但你仍無法確認背後是誰。",pressure:5};
 else if(sim.tension>=45&&roll<.7)event={kind:"WORLD_PRESSURE",summary:"周遭環境出現一種不尋常的變化，像是某個正在累積的危機開始影響到你能感知的範圍。",pressure:12};
 if(!event)return null;
 sim.lastEventMinute=clock.totalMinutes;sim.tension=Math.max(5,sim.tension-8);
 const record={id:id(),type:"WORLD_EVENT",visibility:"OBSERVABLE",subtype:event.kind,summary:event.summary,day:clock.day,time:`${String(clock.hour).padStart(2,"0")}:${String(clock.minute).padStart(2,"0")}`,at:Date.now()};
 state.events.push(record);
 const crisis=state.world.graph?.nodes?.find(n=>n.type==="crisis");
 recordCausalEvent(state,record,{causeIds:crisis?[crisis.id]:[]});
 addCrisisPressure(state,event.pressure,event.summary);
 state.world.state.lastWorldEvent=record;
 return record
}
