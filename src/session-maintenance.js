import {compactNpcMemories,compactEvents} from "./context-manager.js?v=56000";
export function maintainSession(state){
 if(state.events.length>40){const c=compactEvents(state.events,24);if(c.summary)state.runtimeSummary=c.summary.slice(-2000)}
 for(const npc of Object.values(state.npcs||{}))if(npc.memories)npc.memories=compactNpcMemories(npc.memories,12);
 state.events=state.events.slice(-80);return state
}