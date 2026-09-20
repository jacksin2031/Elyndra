import {tickFactions} from "./faction-engine.js";
import {tickNpcs} from "./npc-engine.js";
import {ensureClock} from "./world-clock.js";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
export function ensureWorldSimulation(state){state.world.state.simulation??={tension:10,lastEventMinute:0,flags:{}};return state.world.state.simulation}
export function tickWorld(state){tickNpcs(state);tickFactions(state);
 const sim=ensureWorldSimulation(state),clock=ensureClock(state);sim.tension=Math.min(100,sim.tension+1);
 const elapsed=clock.totalMinutes-sim.lastEventMinute;if(elapsed<180)return null;
 const roll=Math.random();let event=null;
 if(sim.tension>=18&&roll<.35)event={kind:"RUMOR",summary:"旅人之間開始流傳北境道路不再安全的消息。"};
 else if(sim.tension>=30&&roll<.55)event={kind:"FACTION_MOVE",summary:"某個尚未被你完全理解的勢力，在北境悄悄調動了人手。"};
 else if(sim.tension>=45&&roll<.7)event={kind:"WORLD_PRESSURE",summary:"遠方鐘聲的規律發生改變，世界似乎正在逼近某個節點。"};
 if(!event)return null;sim.lastEventMinute=clock.totalMinutes;sim.tension=Math.max(5,sim.tension-8);const record={id:id(),type:"WORLD_EVENT",subtype:event.kind,summary:event.summary,day:clock.day,time:`${String(clock.hour).padStart(2,"0")}:${String(clock.minute).padStart(2,"0")}`,at:Date.now()};state.events.push(record);state.world.state.lastWorldEvent=record;return record
}