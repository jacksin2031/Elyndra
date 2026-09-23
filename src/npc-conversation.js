import {advanceTime} from "./world-clock.js?v=54018";
import {tickWorld} from "./world-simulation.js?v=540181";
import {evaluateQuestEvidence} from "./quest-engine.js?v=54018";
import {npcInteractionMode} from "./world-registry.js?v=54018";
import {npcConversationMinutes,worldCommunication,establishNpcRemoteContact} from "./communication-engine.js?v=54018";
import {deriveSceneTitle} from "./runtime-guard.js?v=54018";
import {roleplayFallbackSuggestions} from "./player-experience.js?v=540181";
import {markEntityObserved} from "./visibility-lock.js?v=54018";

const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
export function applyNpcConversationTurn(state,npc,message,answer){
 const mode=npcInteractionMode(state,npc);if(!mode)throw new Error("NPC_CONTACT_UNAVAILABLE");
 const firstEncounter=mode==="LOCAL"&&npc.encountered!==true;if(mode==="LOCAL"){npc.known=true;npc.encountered=true;markEntityObserved(state,"npc",npc.id,{reason:"NPC_LOCAL_CONVERSATION"})}
 const minutes=npcConversationMinutes(state,mode),before=state.world.state.clock?.totalMinutes||0;
 advanceTime(state,minutes);
 npc.memories??=[];
 const summary="玩家："+String(message||"").slice(0,180)+" / "+npc.name+"："+String(answer||"").slice(0,360);
 npc.memories.push({id:id(),type:"conversation",summary,day:state.world.state.day,minute:state.world.state.clock.totalMinutes,mode});
 npc.memories=npc.memories.slice(-12);
 const progressed=evaluateQuestEvidence(state,String(message||"")+" "+String(answer||""),{source:"NPC_TESTIMONY",npcId:npc.id});
 const event={id:id(),type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",npcId:npc.id,mode,firstEncounter,summary,day:state.world.state.day,time:String(state.world.state.clock.hour).padStart(2,"0")+":"+String(state.world.state.clock.minute).padStart(2,"0"),minutes,at:Date.now()};
 state.events.push(event);
 if(mode==="LOCAL")establishNpcRemoteContact(state,npc);
 const worldEvent=tickWorld(state);
 state.narrative=String(answer||"").slice(0,900);
 state.sceneTitle=deriveSceneTitle(state,"與"+npc.name+"交談");
 const comm=worldCommunication(state),contactLabel=mode==="REMOTE"?"透過"+comm.name+"追問剛才沒有說清楚的細節":"追問"+npc.name+"剛才刻意略過的細節";
 const contextual=roleplayFallbackSuggestions(state,{action:"與"+npc.name+"交談"}).filter(x=>!x.includes("整理")&&!x.includes("確認目前"));
 state.suggestions=[contactLabel,...contextual].filter((x,i,a)=>x&&a.indexOf(x)===i).slice(0,4);
 return {mode,minutes,elapsed:(state.world.state.clock?.totalMinutes||0)-before,progressed,worldEvent,event};
}
