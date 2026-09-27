import {advanceTime} from "./world-clock.js?v=57025";
import {tickWorld} from "./world-simulation.js?v=57028";
import {evaluateQuestEvidence} from "./quest-engine.js?v=59014";
import {evaluateNpcQuestInteraction} from "./npc-quest-interaction.js?v=59014";
import {ensureNpcCognition,npcCognitionSnapshot,recordNpcMemory} from "./npc-cognition.js?v=57025";
import {npcInteractionMode} from "./world-registry.js?v=57025";
import {npcConversationMinutes,worldCommunication,establishNpcRemoteContact} from "./communication-engine.js?v=57025";
import {deriveSceneTitle,sanitizePlayerText} from "./runtime-guard.js?v=57029";
import {roleplayFallbackSuggestions} from "./player-experience.js?v=57028";
import {markEntityObserved} from "./visibility-lock.js?v=57025";
import {playerVisibleNpcName,revealNpcNameFromEvidence} from "./player-entity-visibility.js?v=57029";
import {originNpcContext,originRuntimeSnapshot} from "./origin-runtime.js?v=57025";
import {recordDebug} from "./debug-telemetry.js?v=57025";
import {commitNpcConversationAction} from "./npc-agency-engine.js?v=60004";

const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const languageSet=value=>new Set((Array.isArray(value)?value:[]).map(x=>String(x||"").trim().toUpperCase()).filter(Boolean));
export function npcLanguageContext(state,npc){
 const origin=originRuntimeSnapshot(state,{director:true}),context=originNpcContext(state,npc),npcSpoken=languageSet(npc?.languages?.length?npc.languages:["COMMON"]),npcRead=languageSet(npc?.readLanguages?.length?npc.readLanguages:(npc?.languages?.length?npc.languages:["COMMON"])),playerSpoken=languageSet(origin.spokenLanguages),playerRead=languageSet(origin.readLanguages);
 const matches=(a,b)=>[...a].some(x=>b.has(x));
 return {mode:String(context.languageMode||"GESTURE").toUpperCase(),barrier:String(context.languageBarrier||origin.languageBarrier||"STANDARD").toUpperCase(),originPolicy:String(origin.knowledgePolicy||"CUSTOM").toUpperCase(),languagePolicy:String(origin.languagePolicy||"CUSTOM").toUpperCase(),spokenLanguageMatch:matches(playerSpoken,npcSpoken),readLanguageMatch:matches(playerRead,npcRead)}
}
export function applyNpcConversationTurn(state,npc,message,answer,options={}){
 const mode=npcInteractionMode(state,npc);if(!mode)throw new Error("NPC_CONTACT_UNAVAILABLE");ensureNpcCognition(state,npc);
 const languageContext=npcLanguageContext(state,npc),agencyResult=(options.socialPlan?.requiresResolution||options.socialPlan?.requiresCommit)?commitNpcConversationAction(state,npc,options.socialPlan):null;recordDebug("NPC_TALK_RESOLUTION",{languageContext,socialOutcome:agencyResult?.social?.outcome||null,talentInsight:agencyResult?.talentInsight?.applied===true});
 const firstEncounter=mode==="LOCAL"&&npc.encountered!==true;if(mode==="LOCAL"){npc.known=true;npc.encountered=true;markEntityObserved(state,"npc",npc.id,{reason:"NPC_LOCAL_CONVERSATION"})}
 const minutes=npcConversationMinutes(state,mode),before=state.world.state.clock?.totalMinutes||0;revealNpcNameFromEvidence(state,npc,{answer,reason:"NPC_CONVERSATION_EVIDENCE"});const visibleName=playerVisibleNpcName(state,npc);
 advanceTime(state,minutes);
 const summary="玩家："+String(message||"").slice(0,180)+" / "+visibleName+"："+String(answer||"").slice(0,360);
 const memory=recordNpcMemory(state,npc,{type:"CONVERSATION",summary,importance:firstEncounter?3:1,entityRefs:[npc.id],source:"CONVERSATION",day:state.world.state.day,minute:state.world.state.clock.totalMinutes});
 const progressed=evaluateQuestEvidence(state,String(answer||""),{source:"NPC_TESTIMONY",npcId:npc.id});
 const questInteractions=evaluateNpcQuestInteraction(state,npc.id,{type:"TALK",text:String(message||"")+"\n"+String(answer||"")});
 const event={id:id(),type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",worldId:state.world?.id||null,location:state.player?.location||state.world?.state?.location||null,npcId:npc.id,mode,firstEncounter,memoryId:memory?.id||null,socialOutcome:agencyResult?.social?.outcome||null,talentInsightUsed:agencyResult?.talentInsight?.applied===true,questInteractions:questInteractions.map(x=>({questId:x.questId,action:x.action})),summary,day:state.world.state.day,time:String(state.world.state.clock.hour).padStart(2,"0")+":"+String(state.world.state.clock.minute).padStart(2,"0"),minutes,at:Date.now()};
 state.events.push(event);
 const clueText=progressed?.length?sanitizePlayerText(answer,220,""):"";if(clueText)state.events.push({id:id(),type:"NPC_CLUE_CONFIRMED",visibility:"PLAYER_KNOWN",worldId:state.world?.id||null,location:state.player?.location||state.world?.state?.location||null,npcId:npc.id,sourceEventId:event.id,summary:clueText,day:state.world.state.day,at:Date.now()});
 if(mode==="LOCAL")establishNpcRemoteContact(state,npc);
 const worldEvent=tickWorld(state);
 state.narrative=String(answer||"").slice(0,900);
 state.sceneTitle=deriveSceneTitle(state,"與"+visibleName+"交談");
 const comm=worldCommunication(state),contactLabel=mode==="REMOTE"?"透過"+comm.name+"追問剛才沒有說清楚的細節":"追問"+visibleName+"剛才刻意略過的細節";
 const offered=questInteractions.find(x=>x.action==="OFFERED"),questSuggestion=offered?"回應「"+(state.world?.registry?.sideQuests||[]).find(q=>q.id===offered.questId)?.title+"」的委託":"";
 const contextual=roleplayFallbackSuggestions(state,{action:"與"+visibleName+"交談"}).filter(x=>!x.includes("整理")&&!x.includes("確認目前"));
 state.suggestions=[questSuggestion,contactLabel,...contextual].filter((x,i,a)=>x&&a.indexOf(x)===i&&!x.includes("undefined")).slice(0,4);
 return {mode,minutes,elapsed:(state.world.state.clock?.totalMinutes||0)-before,progressed,questInteractions,worldEvent,event,agencyResult,cognition:npcCognitionSnapshot(state,npc)};
}
