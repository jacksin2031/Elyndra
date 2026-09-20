import {ensureWorldRegistry} from "./world-registry.js?v=231";
import {recordCausalEvent} from "./knowledge-graph.js?v=231";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function ensureQuestProgress(state){for(const q of ensureWorldRegistry(state).sideQuests){q.progress??=0;q.target??=3;q.status??="ACTIVE";q.evidence??=[];q.evidenceKeywords??=[];q.matchedKeywords??=[]}return state.world.registry.sideQuests}
export function progressSideQuest(state,questId,evidence){const q=ensureQuestProgress(state).find(x=>x.id===questId);if(!q||q.status!=="ACTIVE"||!evidence)return false;const ev=String(evidence).slice(0,180);if(q.evidence.includes(ev))return false;q.evidence.push(ev);q.evidence=q.evidence.slice(-6);q.progress=Math.min(q.target,q.progress+1);if(q.progress>=q.target)return completeSideQuest(state,q.id);return true}
export function completeSideQuest(state,questId){
 const q=ensureQuestProgress(state).find(x=>x.id===questId);if(!q||q.status==="COMPLETED"||q.progress<q.target)return false;
 q.status="COMPLETED";q.completedDay=state.world.state.day;
 const economy=state.world?.economy||state.world?.bible?.economy||{},reward=economy.currencyExists===true?clamp(Math.round(Number(economy.questReward)||0),0,20):0;
 if(reward)state.player.gold+=reward;
 const suffix=reward?`，獲得 ${reward} ${economy.currencyName||"貨幣"}`:"";
 const ev={id:id(),type:"QUEST_COMPLETED",visibility:"PLAYER_KNOWN",summary:"完成支線任務："+q.title+suffix,day:state.world.state.day,at:Date.now()};state.events.push(ev);recordCausalEvent(state,ev,{entityIds:[q.id]});return true
}
export function questSnapshot(state){const r=ensureWorldRegistry(state);ensureQuestProgress(state);return {main:state.quests.main,side:r.sideQuests.slice(-12).map(q=>({id:q.id,title:q.title,objective:q.objective,status:q.status,progress:q.progress,target:q.target}))}}
export function evaluateQuestEvidence(state,evidence){
 const raw=String(evidence||"").trim(),hay=raw.toLowerCase(),progressed=[];if(!hay)return progressed;
 for(const q of ensureQuestProgress(state)){
  if(q.status!=="ACTIVE"||q.known!==true||!Array.isArray(q.evidenceKeywords)||!q.evidenceKeywords.length)continue;
  for(const keyword of q.evidenceKeywords){const k=String(keyword).trim();if(!k||q.matchedKeywords.includes(k)||!hay.includes(k.toLowerCase()))continue;q.matchedKeywords.push(k);if(progressSideQuest(state,q.id,`${k}：${raw.slice(0,120)}`))progressed.push({questId:q.id,keyword:k});if(q.status==="COMPLETED")break}
 }
 return progressed
}