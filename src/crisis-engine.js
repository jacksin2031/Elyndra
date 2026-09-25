import {endgameWindowOpen} from "./world-pacing.js?v=57013";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const STAGES=["DORMANT","RUMORS","ESCALATING","CRISIS","ENDGAME"];
export function ensureCrisis(state){state.world.state.crisis??={stage:"DORMANT",pressure:0,lastStageDay:state.world.state.day,history:[]};return state.world.state.crisis}
export function endgameReadiness(state){
 const knowledge=Array.isArray(state.knowledge)?state.knowledge:[],canonIds=new Set((state.world?.canon?.facts||[]).map(f=>f.id)),historyIds=new Set((state.world?.history||[]).map(h=>h.id));
 const verified=knowledge.filter(k=>k?.status==="VERIFIED"&&typeof k?.text==="string"&&k.text.trim().length>=8&&((typeof k.factId==="string"&&canonIds.has(k.factId))||(typeof k.historyId==="string"&&historyIds.has(k.historyId))));
 const rawScore=Math.max(0,Number(state.player?.knowledgeScore)||0),score=Math.min(rawScore,verified.reduce((n,k)=>n+Math.max(1,Number(k.score)||4),0)),substantial=verified.length;
 const pacingReady=endgameWindowOpen(state);return {ready:score>=10&&substantial>=3&&pacingReady,knowledgeReady:score>=10&&substantial>=3,pacingReady,knowledgeScore:score,rawKnowledgeScore:rawScore,substantialKnowledge:substantial,requiredScore:10,requiredKnowledge:3}
}
export function addCrisisPressure(state,amount,reason){
 const c=ensureCrisis(state),before=c.stage;c.pressure=Math.max(0,Math.min(100,c.pressure+Math.max(0,Number(amount)||0)));
 const readiness=endgameReadiness(state),next=c.pressure>=85?(readiness.ready?"ENDGAME":"CRISIS"):c.pressure>=65?"CRISIS":c.pressure>=40?"ESCALATING":c.pressure>=18?"RUMORS":"DORMANT";
 if(STAGES.indexOf(next)>STAGES.indexOf(c.stage)){
  c.stage=next;c.lastStageDay=state.world.state.day;
  const ev={id:id(),type:"CRISIS_STAGE_CHANGED",visibility:"PLAYER_KNOWN",stage:next,summary:"世界危機進入 "+next+" 階段。",day:state.world.state.day,at:Date.now()};
  c.history.push({stage:next,pressure:c.pressure,reason:String(reason||"world").slice(0,180),day:state.world.state.day});c.history=c.history.slice(-12);state.events.push(ev);
  if(next==="ENDGAME"&&state.quests?.main){state.quests.main.status="CLIMAX";state.quests.main.title="世界的真相與最後選擇";state.quests.main.objectives=["追查危機核心","理解世界真相","決定你要守護或改變甚麼"]}
 }
 return {changed:before!==c.stage,stage:c.stage,pressure:c.pressure,endgameReady:readiness.ready}
}
export function crisisSnapshot(state){const c=ensureCrisis(state),readiness=endgameReadiness(state);return {stage:c.stage,pressure:c.pressure,endgameReady:readiness.ready,knowledgeReady:readiness.knowledgeReady,pacingReady:readiness.pacingReady,knowledgeScore:readiness.knowledgeScore,requiredKnowledgeScore:readiness.requiredScore,history:c.history.slice(-4)}}