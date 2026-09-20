import {ensureCrisis} from "./crisis-engine.js?v=231";
import {recordCausalEvent} from "./knowledge-graph.js?v=231";
import {ensureWorldRegistry} from "./world-registry.js?v=231";
import {ensureClock} from "./world-clock.js?v=231";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
function simulation(state){state.world.state.simulation??={tension:10,lastEventMinute:0,lastTickMinute:ensureClock(state).totalMinutes,flags:{}};state.world.state.simulation.npcCursor??=0;return state.world.state.simulation}
function roundRobin(state,list,key,limit=4){if(!list.length)return [];const sim=simulation(state),count=Math.min(limit,list.length),start=Math.max(0,Number(sim[key])||0)%list.length,out=Array.from({length:count},(_,i)=>list[(start+i)%list.length]);sim[key]=(start+count)%list.length;return out}
export function ensureNpcRuntime(state){const r=ensureWorldRegistry(state),now=ensureClock(state).totalMinutes;for(const n of r.npcs){n.personality??="對陌生人保持謹慎";n.goal??="維持自己的生活與安全";n.knowledgeScope??=[];n.memories??=[];n.trust??=0;n.alive??=true;n.lastActionMinute??=now}return r.npcs}
export function tickNpcs(state){
 const now=ensureClock(state).totalMinutes,out=[],npcs=ensureNpcRuntime(state);
 for(const npc of roundRobin(state,npcs,"npcCursor",4)){
  if(!npc.alive||now-npc.lastActionMinute<120)continue;
  npc.lastActionMinute=now;
  const crisis=ensureCrisis(state),reaction=crisis.stage==="ENDGAME"?"並開始為迫近的終局作準備":crisis.stage==="CRISIS"?"並因世界危機調整了自己的計劃":crisis.stage==="ESCALATING"?"，同時開始留意近期異常":"";
  const summary=npc.name+" 為了「"+npc.goal+"」採取了自己的行動"+reaction+"。";
  const ev={id:id(),type:"NPC_AUTONOMOUS_ACTION",visibility:"INTERNAL",npcId:npc.id,summary,day:state.world.state.day,time:String(state.world.state.clock.hour).padStart(2,"0")+":"+String(state.world.state.clock.minute).padStart(2,"0"),at:Date.now()};
  npc.memories.push({id:id(),type:"autonomous",summary,day:state.world.state.day});npc.memories=npc.memories.slice(-12);state.events.push(ev);recordCausalEvent(state,ev,{entityIds:[npc.id,npc.factionId].filter(Boolean)});out.push(ev)
 }
 return out
}
export function findNpc(state,idOrName){return ensureNpcRuntime(state).find(n=>n.id===idOrName||n.name===idOrName)||null}