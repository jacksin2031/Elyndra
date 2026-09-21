import {ensureWorldRegistry} from "./world-registry.js?v=272";
import {recordCausalEvent} from "./knowledge-graph.js?v=272";
import {localCurrencyReward} from "./world-locality.js?v=272";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const CONDITION_TYPES=new Set(["FACT_KNOWN","ITEM_OWNED","ENTITY_KNOWN","EVENT_OCCURRED","LOCATION_STATE","NPC_STATE","FACTION_STATE"]);
const TRUSTED_EVIDENCE=new Set(["CANON_EVIDENCE","ITEM","NPC_TESTIMONY","ENGINE_EVENT","WORLD_STATE"]);
const MAIN=[
 {key:"SURVIVE",title:"在陌生世界活下來",objective:"理解自己身處何地，先確保能夠行動。"},
 {key:"ORIENT",title:"確認你的立足點",objective:"掌握目前地點、道路與最基本的當地規則。"},
 {key:"CONTACT",title:"在異世界建立第一段關係",objective:"找到可以交流的人，理解這裡的人如何生活。"},
 {key:"INVESTIGATE",title:"追查這個世界真正的規則",objective:"取得可驗證的證據，分辨傳聞、觀察與世界真相。"},
 {key:"CRISIS",title:"回應正在擴大的世界危機",objective:"利用已掌握的知識與關係，決定如何介入這場危機。"},
 {key:"CLIMAX",title:"世界的真相與最後選擇",objective:"追查危機核心，理解代價，決定你要守護或改變甚麼。"}
];
function normalizeCondition(x){
 if(!x||typeof x!=="object"||!CONDITION_TYPES.has(String(x.type||"").toUpperCase()))return null;
 return {type:String(x.type).toUpperCase(),id:String(x.id||"").slice(0,120),field:String(x.field||"").slice(0,60),op:["GTE","LTE","EQ","NEQ"].includes(String(x.op||"").toUpperCase())?String(x.op).toUpperCase():"EQ",value:x.value}
}
export function ensureMainQuest(state){
 state.quests??={};state.quests.main??={id:"Q-main",stage:0,status:"ACTIVE",objectives:[]};const q=state.quests.main;
 q.id??="Q-main";q.stage=clamp(Math.round(Number(q.stage)||0),0,MAIN.length-1);q.stageKey=MAIN[q.stage].key;q.title=MAIN[q.stage].title;q.objectives=[MAIN[q.stage].objective];q.status=q.stage===MAIN.length-1?"CLIMAX":"ACTIVE";return q
}
function verifiedKnowledgeCount(state){
 const canon=new Set((state.world?.canon?.facts||[]).map(f=>f.id)),history=new Set((state.world?.history||[]).map(h=>h.id));
 return (state.knowledge||[]).filter(k=>(k.factId&&canon.has(k.factId))||(k.historyId&&history.has(k.historyId))).length
}
export function tickMainQuest(state){
 const q=ensureMainQuest(state),r=ensureWorldRegistry(state),loc=r.locations.find(x=>x.name===state.player?.location),contact=r.npcs.some(n=>n.encountered===true),verified=verifiedKnowledgeCount(state),crisis=state.world?.state?.crisis?.stage||"DORMANT";
 let stage=0;if(loc?.known===true)stage=1;if(contact)stage=2;if(verified>=3)stage=3;if(["CRISIS","ENDGAME"].includes(crisis)&&verified>=3)stage=4;if(crisis==="ENDGAME")stage=5;
 if(stage>q.stage){q.stage=stage;q.stageKey=MAIN[stage].key;q.title=MAIN[stage].title;q.objectives=[MAIN[stage].objective];q.status=stage===5?"CLIMAX":"ACTIVE";state.events.push({id:id(),type:"MAIN_QUEST_STAGE_CHANGED",visibility:"PLAYER_KNOWN",stage:q.stage,stageKey:q.stageKey,summary:q.title+"："+q.objectives[0],day:state.world.state.day,at:Date.now()})}
 return q
}
export function ensureQuestProgress(state){
 for(const q of ensureWorldRegistry(state).sideQuests){q.progress??=0;q.target??=3;q.status??="ACTIVE";q.evidence??=[];q.evidenceKeywords??=[];q.matchedKeywords??=[];q.conditions=(Array.isArray(q.conditions)?q.conditions:[]).map(normalizeCondition).filter(Boolean);q.matchedConditions=Array.isArray(q.matchedConditions)?q.matchedConditions:[]}
 return state.world.registry.sideQuests
}
export function progressSideQuest(state,questId,evidence){
 const q=ensureQuestProgress(state).find(x=>x.id===questId);if(!q||q.status!=="ACTIVE"||!evidence)return false;const ev=String(evidence).slice(0,180);if(q.evidence.includes(ev))return false;q.evidence.push(ev);q.evidence=q.evidence.slice(-12);q.progress=Math.min(q.target,q.progress+1);if(q.progress>=q.target)return completeSideQuest(state,q.id);return true
}
export function completeSideQuest(state,questId){
 const q=ensureQuestProgress(state).find(x=>x.id===questId);if(!q||q.status==="COMPLETED"||q.progress<q.target)return false;
 q.status="COMPLETED";q.completedDay=state.world.state.day;
 const reward=localCurrencyReward(state,"questReward");
 const suffix=reward?"，獲得 "+reward.amount+" "+reward.currency.name:"";
 const ev={id:id(),type:"QUEST_COMPLETED",visibility:"PLAYER_KNOWN",summary:"完成支線任務："+q.title+suffix,day:state.world.state.day,at:Date.now()};state.events.push(ev);recordCausalEvent(state,ev,{entityIds:[q.id]});return true
}
function cmp(actual,op,value){if(op==="GTE")return Number(actual)>=Number(value);if(op==="LTE")return Number(actual)<=Number(value);if(op==="NEQ")return actual!==value;return actual===value}
function conditionMet(state,c){
 const r=ensureWorldRegistry(state);
 if(c.type==="FACT_KNOWN")return (state.knowledge||[]).some(k=>k.factId===c.id);
 if(c.type==="ITEM_OWNED")return (state.inventory||[]).some(x=>x.id===c.id||x.name===c.id);
 if(c.type==="ENTITY_KNOWN")return [...r.locations,...r.npcs,...r.factions,...r.sideQuests].some(x=>x.id===c.id&&x.known===true);
 if(c.type==="EVENT_OCCURRED")return (state.events||[]).some(x=>x.id===c.id||x.type===c.id);
 if(c.type==="LOCATION_STATE"){const x=r.locations.find(x=>x.id===c.id);return Boolean(x&&cmp(x.worldState?.[c.field],c.op,c.value))}
 if(c.type==="NPC_STATE"){const x=r.npcs.find(x=>x.id===c.id);const actual=c.field==="companionStatus"?x?.companion?.status:x?.[c.field];return Boolean(x&&cmp(actual,c.op,c.value))}
 if(c.type==="FACTION_STATE"){const x=r.factions.find(x=>x.id===c.id);const actual=c.field==="stability"?x?.worldState?.stability:x?.[c.field];return Boolean(x&&cmp(actual,c.op,c.value))}
 return false
}
export function evaluateQuestState(state){
 const progressed=[];for(const q of ensureQuestProgress(state)){if(q.status!=="ACTIVE"||q.known!==true||!q.conditions.length)continue;for(let i=0;i<q.conditions.length;i++){const key=String(i);if(q.matchedConditions.includes(key)||!conditionMet(state,q.conditions[i]))continue;q.matchedConditions.push(key);if(progressSideQuest(state,q.id,"WORLD_STATE:"+q.conditions[i].type+":"+q.conditions[i].id))progressed.push({questId:q.id,condition:q.conditions[i]});if(q.status==="COMPLETED")break}}return progressed
}
export function questSnapshot(state){
 const r=ensureWorldRegistry(state);ensureQuestProgress(state);tickMainQuest(state);return {main:state.quests.main,side:r.sideQuests.slice(-12).map(q=>({id:q.id,title:q.title,objective:q.objective,status:q.status,progress:q.progress,target:q.target,conditions:q.conditions?.length||0}))}
}
export function evaluateQuestEvidence(state,evidence,context={}){
 const progressed=evaluateQuestState(state),raw=String(evidence||"").trim(),hay=raw.toLowerCase(),source=String(context.source||"");if(!hay||!TRUSTED_EVIDENCE.has(source))return progressed;
 if(source==="CANON_EVIDENCE"&&!(context.factId&&(state.knowledge||[]).some(k=>k.factId===context.factId&&k.status==="VERIFIED")))return progressed;
 if(source==="ITEM"&&!(context.factId&&(state.knowledge||[]).some(k=>k.factId===context.factId&&k.status==="VERIFIED")))return progressed;
 if(source==="NPC_TESTIMONY"){const npc=ensureWorldRegistry(state).npcs.find(n=>n.id===context.npcId);if(!npc||npc.known!==true||npc.encountered!==true)return progressed}
 for(const q of ensureQuestProgress(state)){
  if(q.status!=="ACTIVE"||q.known!==true||!Array.isArray(q.evidenceKeywords)||!q.evidenceKeywords.length)continue;
  for(const keyword of q.evidenceKeywords){const k=String(keyword).trim();if(!k||q.matchedKeywords.includes(k)||!hay.includes(k.toLowerCase()))continue;q.matchedKeywords.push(k);if(progressSideQuest(state,q.id,k+"："+raw.slice(0,120)))progressed.push({questId:q.id,keyword:k});if(q.status==="COMPLETED")break}
 }
 return progressed
}
