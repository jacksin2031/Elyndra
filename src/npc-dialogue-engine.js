import {advanceTime} from "./world-clock.js?v=57017";
import {tickWorld} from "./world-simulation.js?v=57017";
import {evaluateQuestEvidence} from "./quest-engine.js?v=57017";
import {evaluateNpcQuestInteraction} from "./npc-quest-interaction.js?v=57017";
import {ensureNpcCognition,npcCognitionSnapshot,recordNpcMemory} from "./npc-cognition.js?v=57017";
import {npcInteractionMode} from "./world-registry.js?v=57017";
import {npcConversationMinutes} from "./communication-engine.js?v=57017";
import {sanitizePlayerText,deriveSceneTitle} from "./runtime-guard.js?v=57017";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);

export function applyNpcConversationTurn(state,npc,{question="",answer=""}={}){
 const mode=npcInteractionMode(state,npc);if(!mode)throw new Error("NPC_NOT_INTERACTABLE");ensureNpcCognition(state,npc);
 const q=sanitizePlayerText(question,260,""),a=sanitizePlayerText(answer,700,"");if(!q||!a)throw new Error("NPC_CONVERSATION_INVALID");
 const minutes=npcConversationMinutes(state,mode);advanceTime(state,minutes);
 const summary="玩家："+q+" / "+npc.name+"："+a;
 const memory=recordNpcMemory(state,npc,{type:"CONVERSATION",summary,importance:1,entityRefs:[npc.id],source:"NPC_DIALOGUE",day:state.world.state.day,minute:state.world.state.clock.totalMinutes});
 const knowledgeTitle="與 "+npc.name+" 的對話";
 const knowledgeId="NPC-K-"+npc.id+"-"+Date.now();
 const already=(state.knowledge||[]).some(k=>k.title===knowledgeTitle&&k.text===a);
 if(!already){state.knowledge.push({id:knowledgeId,title:knowledgeTitle,status:"TESTIMONY",text:a,sources:["NPC_CONVERSATION"],npcId:npc.id,score:0})}
 const questProgress=evaluateQuestEvidence(state,q+" "+a,{source:"NPC_TESTIMONY",npcId:npc.id});
 const questInteractions=evaluateNpcQuestInteraction(state,npc.id,{type:"TALK",text:q+"\n"+a});
 const event={id:id(),type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",npcId:npc.id,mode,minutes,memoryId:memory?.id||null,questInteractions:questInteractions.map(x=>({questId:x.questId,action:x.action})),summary:"與"+npc.name+"交談："+a,day:state.world.state.day,time:String(state.world.state.clock.hour).padStart(2,"0")+":"+String(state.world.state.clock.minute).padStart(2,"0"),at:Date.now()};
 state.events.push(event);
 state.narrative="你與"+npc.name+(mode==="REMOTE"?"進行遠距聯絡。":"交談。")+" "+a;
 const worldEvent=tickWorld(state);
 state.sceneTitle=deriveSceneTitle(state,"與"+npc.name+"交談");
 return {mode,minutes,questProgress,questInteractions,worldEvent,event,knowledgeAdded:!already,cognition:npcCognitionSnapshot(state,npc)};
}
