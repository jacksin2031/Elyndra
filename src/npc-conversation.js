import {advanceTime} from "./world-clock.js?v=57015";
import {tickWorld} from "./world-simulation.js?v=57015";
import {evaluateQuestEvidence} from "./quest-engine.js?v=57015";
import {evaluateNpcQuestInteraction} from "./npc-quest-interaction.js?v=57015";
import {ensureNpcCognition,npcCognitionSnapshot,recordNpcMemory} from "./npc-cognition.js?v=57015";
import {npcInteractionMode} from "./world-registry.js?v=57015";
import {npcConversationMinutes,worldCommunication,establishNpcRemoteContact} from "./communication-engine.js?v=57015";
import {deriveSceneTitle} from "./runtime-guard.js?v=57015";
import {roleplayFallbackSuggestions} from "./player-experience.js?v=57015";
import {markEntityObserved} from "./visibility-lock.js?v=57015";

const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
export function applyNpcConversationTurn(state,npc,message,answer){
 const mode=npcInteractionMode(state,npc);if(!mode)throw new Error("NPC_CONTACT_UNAVAILABLE");ensureNpcCognition(state,npc);
 const firstEncounter=mode==="LOCAL"&&npc.encountered!==true;if(mode==="LOCAL"){npc.known=true;npc.encountered=true;markEntityObserved(state,"npc",npc.id,{reason:"NPC_LOCAL_CONVERSATION"})}
 const minutes=npcConversationMinutes(state,mode),before=state.world.state.clock?.totalMinutes||0;
 advanceTime(state,minutes);
 const summary="玩家："+String(message||"").slice(0,180)+" / "+npc.name+"："+String(answer||"").slice(0,360);
 const memory=recordNpcMemory(state,npc,{type:"CONVERSATION",summary,importance:firstEncounter?3:1,entityRefs:[npc.id],source:"CONVERSATION",day:state.world.state.day,minute:state.world.state.clock.totalMinutes});
 const progressed=evaluateQuestEvidence(state,String(answer||""),{source:"NPC_TESTIMONY",npcId:npc.id});
 const questInteractions=evaluateNpcQuestInteraction(state,npc.id,{type:"TALK",text:String(message||"")+"\n"+String(answer||"")});
 const event={id:id(),type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",npcId:npc.id,mode,firstEncounter,memoryId:memory?.id||null,questInteractions:questInteractions.map(x=>({questId:x.questId,action:x.action})),summary,day:state.world.state.day,time:String(state.world.state.clock.hour).padStart(2,"0")+":"+String(state.world.state.clock.minute).padStart(2,"0"),minutes,at:Date.now()};
 state.events.push(event);
 if(mode==="LOCAL")establishNpcRemoteContact(state,npc);
 const worldEvent=tickWorld(state);
 state.narrative=String(answer||"").slice(0,900);
 state.sceneTitle=deriveSceneTitle(state,"與"+npc.name+"交談");
 const comm=worldCommunication(state),contactLabel=mode==="REMOTE"?"透過"+comm.name+"追問剛才沒有說清楚的細節":"追問"+npc.name+"剛才刻意略過的細節";
 const offered=questInteractions.find(x=>x.action==="OFFERED"),questSuggestion=offered?"回應「"+(state.world?.registry?.sideQuests||[]).find(q=>q.id===offered.questId)?.title+"」的委託":"";
 const contextual=roleplayFallbackSuggestions(state,{action:"與"+npc.name+"交談"}).filter(x=>!x.includes("整理")&&!x.includes("確認目前"));
 state.suggestions=[questSuggestion,contactLabel,...contextual].filter((x,i,a)=>x&&a.indexOf(x)===i&&!x.includes("undefined")).slice(0,4);
 return {mode,minutes,elapsed:(state.world.state.clock?.totalMinutes||0)-before,progressed,questInteractions,worldEvent,event,cognition:npcCognitionSnapshot(state,npc)};
}
