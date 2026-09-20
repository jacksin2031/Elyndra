import {ensureWorldRegistry} from "./world-registry.js";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
export function completeSideQuest(state,questId){const q=ensureWorldRegistry(state).sideQuests.find(x=>x.id===questId);if(!q||q.status==="COMPLETED")return false;q.status="COMPLETED";q.completedDay=state.world.state.day;state.player.gold+=8;state.events.push({id:id(),type:"QUEST_COMPLETED",summary:"完成支線任務："+q.title,day:state.world.state.day,at:Date.now()});return true}
export function questSnapshot(state){const r=ensureWorldRegistry(state);return {main:state.quests.main,side:r.sideQuests.slice(-12)}}
