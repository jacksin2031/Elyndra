import {advanceTime} from "./world-clock.js?v=274";
import {tickWorld} from "./world-simulation.js?v=274";
import {evaluateQuestEvidence} from "./quest-engine.js?v=274";
import {npcInteractionMode} from "./world-registry.js?v=274";
import {npcConversationMinutes,worldCommunication,establishNpcRemoteContact} from "./communication-engine.js?v=274";
import {deriveSceneTitle} from "./runtime-guard.js?v=274";

const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
export function applyNpcConversationTurn(state,npc,message,answer){
 const mode=npcInteractionMode(state,npc);if(!mode)throw new Error("NPC_CONTACT_UNAVAILABLE");
 const minutes=npcConversationMinutes(state,mode),before=state.world.state.clock?.totalMinutes||0;
 advanceTime(state,minutes);
 npc.memories??=[];
 const summary="玩家："+String(message||"").slice(0,180)+" / "+npc.name+"："+String(answer||"").slice(0,360);
 npc.memories.push({id:id(),type:"conversation",summary,day:state.world.state.day,minute:state.world.state.clock.totalMinutes,mode});
 npc.memories=npc.memories.slice(-12);
 const progressed=evaluateQuestEvidence(state,String(message||"")+" "+String(answer||""),{source:"NPC_TESTIMONY",npcId:npc.id});
 const event={id:id(),type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",npcId:npc.id,mode,summary,day:state.world.state.day,time:String(state.world.state.clock.hour).padStart(2,"0")+":"+String(state.world.state.clock.minute).padStart(2,"0"),minutes,at:Date.now()};
 state.events.push(event);
 if(mode==="LOCAL")establishNpcRemoteContact(state,npc);
 const worldEvent=tickWorld(state);
 state.narrative=String(answer||"").slice(0,900);
 state.sceneTitle=deriveSceneTitle(state,"與"+npc.name+"交談");
 const comm=worldCommunication(state),contactLabel=mode==="REMOTE"?"透過"+comm.name+"繼續聯絡":"繼續與"+npc.name+"交談";
 state.suggestions=[contactLabel,"整理剛才得到的情報","根據對話內容採取下一步行動","暫時結束對話並觀察周圍"];
 return {mode,minutes,elapsed:(state.world.state.clock?.totalMinutes||0)-before,progressed,worldEvent,event};
}
