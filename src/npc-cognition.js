import {applyEffect,getEffect,getEffects,setEffectIntensity} from "./effect-engine.js?v=57022";

const uid=p=>p+"-"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const clean=(v,max=260)=>typeof v==="string"?v.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,max):"";
const arr=v=>Array.isArray(v)?v:[];
const day=s=>Math.max(1,Math.round(Number(s?.world?.state?.day)||1));
const minute=s=>Math.max(0,Math.round(Number(s?.world?.state?.clock?.totalMinutes)||0));
const IMPORTANT_MEMORY_TYPES=new Set(["RESCUE","BETRAYAL","DEATH","PROMISE_CREATED","PROMISE_KEPT","PROMISE_BROKEN","PROMISE_EXPIRED","GRUDGE","DEBT","PERSONAL_ITEM","QUEST_OFFERED","QUEST_COMPLETED","QUEST_FAILED","MAJOR_WORLD_EVENT"]);
const BELIEF_STATES=new Set(["BELIEVED","SUSPECTED","DISPUTED","VERIFIED"]);
const COMMITMENT_KINDS=new Set(["PROMISE","GRUDGE","DEBT"]);
const COMMITMENT_STATES=new Set(["OPEN","KEPT","BROKEN","EXPIRED"]);
const TARGET_KINDS=new Set(["PLAYER","NPC","FACTION"]);

function relationRow(input={}){
 return {
  trust:clamp(input.trust,0,100),respect:clamp(input.respect,0,100),fear:clamp(input.fear,0,100),obligation:clamp(input.obligation,0,100),
  relationType:clean(input.relationType,40).toUpperCase(),tags:[...new Set(arr(input.tags).map(x=>clean(String(x),40).toUpperCase()).filter(Boolean))].slice(0,8),updatedDay:Number.isFinite(Number(input.updatedDay))?Number(input.updatedDay):null
 }
}
function memoryRow(state,input={}){
 const summary=clean(input.summary||input.text,520);if(!summary)return null;
 return {
  id:clean(input.id,140)||uid("MEM"),type:clean(input.type||"EVENT",60).toUpperCase()||"EVENT",summary,
  subject:clean(input.subject,160),entityRefs:[...new Set(arr(input.entityRefs).map(x=>clean(String(x),140)).filter(Boolean))].slice(0,10),
  emotionalTag:clean(input.emotionalTag,60).toUpperCase(),source:clean(input.source,80).toUpperCase(),importance:clamp(Math.round(Number(input.importance)||1),0,5),
  day:Number.isFinite(Number(input.day))?Number(input.day):day(state),minute:Number.isFinite(Number(input.minute))?Number(input.minute):minute(state),grounded:input.grounded===true,mode:clean(input.mode,24).toUpperCase()
 }
}
function syncLegacyMemories(npc,c){
 const rows=[...c.memory.longTerm.slice(-8),...c.memory.recent.slice(-12)],seen=new Set();
 npc.memories=[];for(const x of rows){if(seen.has(x.id))continue;seen.add(x.id);npc.memories.push({...x,type:String(x.type||"").toLowerCase()})}npc.memories=npc.memories.slice(-20)
}
function normalizeCommitment(state,input={}){
 const kind=COMMITMENT_KINDS.has(String(input.kind||"").toUpperCase())?String(input.kind).toUpperCase():"PROMISE";
 const status=COMMITMENT_STATES.has(String(input.status||"").toUpperCase())?String(input.status).toUpperCase():"OPEN";
 const text=clean(input.text||input.summary||input.promise,320);if(!text)return null;
 return {id:clean(input.id,140)||uid("COM"),kind,status,actor:String(input.actor||"NPC").toUpperCase()==="PLAYER"?"PLAYER":"NPC",text,subject:clean(input.subject,160),targetId:clean(input.targetId,140),questId:clean(input.questId,140),createdDay:Number.isFinite(Number(input.createdDay))?Number(input.createdDay):day(state),dueDay:Number.isFinite(Number(input.dueDay))?Number(input.dueDay):null,resolvedDay:Number.isFinite(Number(input.resolvedDay))?Number(input.resolvedDay):null}
}
function syncBehaviorCommitments(npc,c){
 npc.behaviorProfile??={};
 npc.behaviorProfile.promises=c.commitments.filter(x=>x.kind==="PROMISE").slice(-8).map(x=>({text:x.text,status:x.status,createdDay:x.createdDay,dueDay:x.dueDay}));
 npc.behaviorProfile.grudges=c.commitments.filter(x=>x.kind==="GRUDGE").slice(-8).map(x=>({text:x.text,status:x.status,createdDay:x.createdDay,dueDay:x.dueDay}))
}
function importLegacyCommitments(state,npc,c){
 const legacy=[...arr(npc.behaviorProfile?.promises).map(x=>({...x,kind:"PROMISE"})),...arr(npc.behaviorProfile?.grudges).map(x=>({...x,kind:"GRUDGE"}))];
 for(const row of legacy){const n=normalizeCommitment(state,row);if(n&&!c.commitments.some(x=>x.kind===n.kind&&x.text===n.text))c.commitments.push(n)}
 c.commitments=c.commitments.slice(-24);syncBehaviorCommitments(npc,c)
}
export function ensureNpcCognition(state,npc){
 if(!npc||typeof npc!=="object")return null;npc.memories=arr(npc.memories);
 npc.cognition??={version:1,memory:{recent:[],longTerm:[]},beliefs:[],relationships:{player:{},npcs:{},factions:{}},commitments:[],planner:{goal:"",currentPlan:"",nextStep:"",priority:"GOAL",updatedMinute:0}};
 const c=npc.cognition;c.version=1;c.memory??={recent:[],longTerm:[]};c.memory.recent=arr(c.memory.recent).map(x=>memoryRow(state,x)).filter(Boolean).slice(-16);c.memory.longTerm=arr(c.memory.longTerm).map(x=>memoryRow(state,x)).filter(Boolean).slice(-40);
 if(c.memory.recent.length===0&&c.memory.longTerm.length===0&&npc.memories.length){c.memory.recent=npc.memories.map(x=>memoryRow(state,x)).filter(Boolean).slice(-16)}
 c.beliefs=arr(c.beliefs).filter(x=>x&&clean(x.claimKey,160)).map(x=>({id:clean(x.id,140)||uid("BEL"),claimKey:clean(x.claimKey,160),text:clean(x.text,420),state:BELIEF_STATES.has(String(x.state||"").toUpperCase())?String(x.state).toUpperCase():"SUSPECTED",confidence:clamp(x.confidence,0,100),sourceRef:x.sourceRef&&typeof x.sourceRef==="object"?structuredClone(x.sourceRef):{},entityRefs:[...new Set(arr(x.entityRefs).map(v=>clean(String(v),140)).filter(Boolean))].slice(0,8),updatedDay:Number.isFinite(Number(x.updatedDay))?Number(x.updatedDay):day(state)})).slice(-32);
 c.relationships??={player:{},npcs:{},factions:{}};c.relationships.npcs=c.relationships.npcs&&typeof c.relationships.npcs==="object"&&!Array.isArray(c.relationships.npcs)?c.relationships.npcs:{};c.relationships.factions=c.relationships.factions&&typeof c.relationships.factions==="object"&&!Array.isArray(c.relationships.factions)?c.relationships.factions:{};
 c.relationships.player=relationRow({...c.relationships.player,trust:Number.isFinite(Number(npc.trust))?Number(npc.trust):c.relationships.player?.trust,updatedDay:c.relationships.player?.updatedDay??day(state)});npc.trust=c.relationships.player.trust;
 for(const [k,v] of Object.entries(c.relationships.npcs))c.relationships.npcs[k]=relationRow(v);for(const [k,v] of Object.entries(c.relationships.factions))c.relationships.factions[k]=relationRow(v);
 c.commitments=arr(c.commitments).map(x=>{const n=normalizeCommitment(state,x);return n?(x&&typeof x==="object"?Object.assign(x,n):n):null}).filter(Boolean).slice(-24);importLegacyCommitments(state,npc,c);
 c.planner=c.planner&&typeof c.planner==="object"?c.planner:{};c.planner.goal=clean(c.planner.goal||npc.goal||"維持自己的生活與安全",260);c.planner.currentPlan=clean(c.planner.currentPlan,260);c.planner.nextStep=clean(c.planner.nextStep,80).toUpperCase();c.planner.priority=clean(c.planner.priority||"GOAL",40).toUpperCase();c.planner.updatedMinute=Math.max(0,Number(c.planner.updatedMinute)||0);if(!npc.goal)npc.goal=c.planner.goal;
 syncLegacyMemories(npc,c);return c
}
export function recordNpcMemory(state,npc,input={}){
 const c=ensureNpcCognition(state,npc),row=memoryRow(state,input);if(!c||!row)return null;const signature=row.type+"|"+row.subject+"|"+row.summary;
 const existing=[...c.memory.recent,...c.memory.longTerm].find(x=>x.type+"|"+x.subject+"|"+x.summary===signature);if(existing){existing.importance=Math.max(existing.importance,row.importance);existing.day=row.day;existing.minute=row.minute;syncLegacyMemories(npc,c);return existing}
 c.memory.recent.push(row);c.memory.recent=c.memory.recent.slice(-16);if(row.importance>=4||IMPORTANT_MEMORY_TYPES.has(row.type))c.memory.longTerm.push({...row});c.memory.longTerm=c.memory.longTerm.filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i).slice(-40);syncLegacyMemories(npc,c);return row
}
export function npcMemorySnapshot(state,npc){const c=ensureNpcCognition(state,npc);return c?{recent:c.memory.recent.slice(-8),longTerm:c.memory.longTerm.slice(-16)}:{recent:[],longTerm:[]}}
export function upsertNpcBelief(state,npc,input={},options={}){
 const c=ensureNpcCognition(state,npc),claimKey=clean(input.claimKey||input.id,160);if(!c||!claimKey)return {ok:false,reason:"BELIEF_CLAIM_REQUIRED"};let requested=String(input.state||"SUSPECTED").toUpperCase();if(!BELIEF_STATES.has(requested))requested="SUSPECTED";if(requested==="VERIFIED"&&options.verifiedByEngine!==true)requested="BELIEVED";
 let row=c.beliefs.find(x=>x.claimKey===claimKey);if(!row){row={id:uid("BEL"),claimKey,text:"",state:"SUSPECTED",confidence:25,sourceRef:{},entityRefs:[],updatedDay:day(state)};c.beliefs.push(row)}row.text=clean(input.text||row.text,420);row.state=requested;row.confidence=clamp(input.confidence??row.confidence,0,100);row.sourceRef=input.sourceRef&&typeof input.sourceRef==="object"?structuredClone(input.sourceRef):row.sourceRef;row.entityRefs=[...new Set([...arr(row.entityRefs),...arr(input.entityRefs)].map(x=>clean(String(x),140)).filter(Boolean))].slice(0,8);row.updatedDay=day(state);c.beliefs=c.beliefs.slice(-32);return {ok:true,belief:row}
}
export function npcBeliefSnapshot(state,npc){const c=ensureNpcCognition(state,npc);return c?c.beliefs.slice(-16).map(x=>({...x,sourceRef:structuredClone(x.sourceRef)})):[]}
export function adjustNpcRelationship(state,npc,input={}){
 const c=ensureNpcCognition(state,npc),kind=TARGET_KINDS.has(String(input.targetKind||"PLAYER").toUpperCase())?String(input.targetKind||"PLAYER").toUpperCase():"PLAYER",targetId=clean(input.targetId,140)||"PLAYER";if(!c)return null;
 let row;if(kind==="PLAYER")row=c.relationships.player;else{const bucket=kind==="NPC"?c.relationships.npcs:c.relationships.factions;bucket[targetId]=relationRow(bucket[targetId]||{});row=bucket[targetId]}
 const d=input.changes&&typeof input.changes==="object"?input.changes:input;for(const k of ["trust","respect","fear","obligation"])if(Number.isFinite(Number(d[k])))row[k]=clamp(row[k]+Number(d[k]),0,100);if(input.relationType)row.relationType=clean(input.relationType,40).toUpperCase();row.updatedDay=day(state);if(kind==="PLAYER")npc.trust=row.trust;
 const summary=clean(input.reason,220);if(summary)recordNpcMemory(state,npc,{type:"RELATIONSHIP_CHANGE",summary,importance:Math.max(1,Math.round(Math.max(Math.abs(Number(d.trust)||0),Math.abs(Number(d.respect)||0),Math.abs(Number(d.fear)||0),Math.abs(Number(d.obligation)||0))/5)),entityRefs:[targetId],day:day(state)});return {...row}
}
export function npcRelationshipSnapshot(state,npc){const c=ensureNpcCognition(state,npc);return c?{player:{...c.relationships.player},npcs:structuredClone(c.relationships.npcs),factions:structuredClone(c.relationships.factions)}:{player:relationRow({}),npcs:{},factions:{}}}
export function createNpcCommitment(state,npc,input={}){
 const c=ensureNpcCognition(state,npc),row=normalizeCommitment(state,input);if(!c||!row)return {ok:false,reason:"COMMITMENT_INVALID"};const existing=c.commitments.find(x=>x.kind===row.kind&&x.status==="OPEN"&&x.text===row.text&&x.actor===row.actor);if(existing)return {ok:true,commitment:existing,existing:true};c.commitments.push(row);c.commitments=c.commitments.slice(-24);syncBehaviorCommitments(npc,c);recordNpcMemory(state,npc,{type:row.kind==="GRUDGE"?"GRUDGE":"PROMISE_CREATED",summary:row.text,subject:row.subject,entityRefs:[row.targetId,row.questId].filter(Boolean),importance:4,source:"COMMITMENT"});return {ok:true,commitment:row,existing:false}
}
export function resolveNpcCommitment(state,npc,commitmentId,status="KEPT",reason=""){
 const c=ensureNpcCognition(state,npc),row=c?.commitments.find(x=>x.id===commitmentId);if(!row)return {ok:false,reason:"COMMITMENT_NOT_FOUND"};const next=String(status||"").toUpperCase();if(!COMMITMENT_STATES.has(next)||next==="OPEN")return {ok:false,reason:"COMMITMENT_STATUS_INVALID"};if(row.status!=="OPEN")return {ok:true,commitment:row,existing:true};row.status=next;row.resolvedDay=day(state);syncBehaviorCommitments(npc,c);
 if(row.actor==="PLAYER"){if(next==="KEPT")adjustNpcRelationship(state,npc,{changes:{trust:5,respect:4,obligation:8},reason:reason||"玩家履行了對這名 NPC 的承諾。"});else if(next==="BROKEN"||next==="EXPIRED")adjustNpcRelationship(state,npc,{changes:{trust:-8,respect:-5,fear:1},reason:reason||"玩家沒有履行對這名 NPC 的承諾。"})}
 recordNpcMemory(state,npc,{type:next==="KEPT"?"PROMISE_KEPT":next==="BROKEN"?"PROMISE_BROKEN":"PROMISE_EXPIRED",summary:reason||row.text,subject:row.subject,entityRefs:[row.targetId,row.questId].filter(Boolean),importance:5,source:"COMMITMENT"});return {ok:true,commitment:row}
}
export function tickNpcCommitments(state,npc){const c=ensureNpcCognition(state,npc),out=[];if(!c)return out;for(const row of c.commitments){if(row.status==="OPEN"&&row.dueDay!=null&&day(state)>row.dueDay){const r=resolveNpcCommitment(state,npc,row.id,"EXPIRED","承諾期限已過，但事情沒有完成。");if(r.ok)out.push(r.commitment)}}return out}
export function npcCommitmentSnapshot(state,npc){const c=ensureNpcCognition(state,npc);return c?c.commitments.slice(-16).map(x=>({...x})):[]}
function setNpcEffectIntensity(state,npc,type,intensity,reason){const current=getEffect(state,type,{targetKind:"NPC",targetId:npc.id});if(intensity<=0){if(current)setEffectIntensity(state,current,0,{reason});return null}if(current)return setEffectIntensity(state,current,intensity,{reason});return applyEffect(state,{type,intensity},{target:{kind:"NPC",id:npc.id},source:{kind:"NPC_LIFE",id:npc.id}}).effect||null}
export function syncNpcLifeEffects(state,npc){if(!npc?.id||!npc.life)return [];const hunger=clamp((Number(npc.life.hunger)||0)-50,0,50)*2,fatigue=clamp(50-(Number(npc.life.energy)||0),0,50)*2;setNpcEffectIntensity(state,npc,"HUNGER",hunger,"NPC_LIFE_HUNGER");setNpcEffectIntensity(state,npc,"FATIGUE",fatigue,"NPC_LIFE_FATIGUE");return getEffects(state,{targetKind:"NPC",targetId:npc.id}).map(x=>({id:x.id,type:x.type,severity:x.severity,intensity:x.intensity,visibility:x.visibility}))}
export function applyNpcEffect(state,npc,proposal,options={}){ensureNpcCognition(state,npc);return applyEffect(state,proposal,{...options,target:{kind:"NPC",id:npc.id},source:options.source||{kind:"NPC_EVENT",id:npc.id}})}
export function npcEffectSnapshot(state,npc){return getEffects(state,{targetKind:"NPC",targetId:npc?.id}).map(x=>({id:x.id,type:x.type,severity:x.severity,intensity:x.intensity,tags:[...x.tags],visibility:x.visibility,state:x.state}))}
function effectSeverity(state,npc){return npcEffectSnapshot(state,npc).reduce((m,x)=>Math.max(m,Number(x.severity)||0),0)}
export function evaluateNpcNeeds(state,npc,crisis={}){
 const c=ensureNpcCognition(state,npc),life=npc?.life||{},loc=(state?.world?.registry?.locations||[]).find(x=>x.id===npc?.locationId),rows=[];if(!c)return rows;const stage=String(crisis?.stage||state?.world?.state?.crisis?.stage||"DORMANT").toUpperCase(),safety=Number(loc?.worldState?.safety??50),sev=effectSeverity(state,npc);
 if(safety<30||["CRISIS","ENDGAME"].includes(stage))rows.push({kind:"SAFETY",score:100+(30-safety)});
 const hunger=Number(life.hunger)||0,energy=Number(life.energy)||0;if(hunger>=65||energy<=30||sev>=3)rows.push({kind:"SURVIVAL",score:90+Math.max(hunger-65,30-energy,sev*5)});
 const due=c.commitments.filter(x=>x.status==="OPEN").sort((a,b)=>(a.dueDay??999999)-(b.dueDay??999999))[0];if(due)rows.push({kind:"COMMITMENT",score:due.dueDay!=null&&due.dueDay<=day(state)+1?85:65,commitmentId:due.id});
 rows.push({kind:"GOAL",score:45},{kind:"WORK",score:35});rows.sort((a,b)=>b.score-a.score);return rows
}
export function planNpcNextStep(state,npc,crisis={}){
 const c=ensureNpcCognition(state,npc),needs=evaluateNpcNeeds(state,npc,crisis),top=needs[0]||{kind:"GOAL",score:0},life=npc?.life||{};if(!c)return null;let plan="推進自己的長期目標",step="ADVANCE_GOAL";
 if(top.kind==="SAFETY"){plan="離開危險區域並確保基本安全";step="MOVE_TO_SAFETY"}
 else if(top.kind==="SURVIVAL"){if((Number(life.energy)||0)<=30){plan="先休息恢復體力";step="REST"}else if((Number(life.hunger)||0)>=65){plan="先處理飢餓並尋找食物";step="SEEK_FOOD"}else{plan="處理目前最嚴重的身體狀態";step="SEEK_TREATMENT"}}
 else if(top.kind==="COMMITMENT"){const row=c.commitments.find(x=>x.id===top.commitmentId);plan=row?"履行承諾：「"+row.text+"」":"履行尚未完成的承諾";step="FULFILL_COMMITMENT"}
 else if(top.kind==="WORK"){plan="維持工作與日常生活";step="WORK"}
 else{const g=clean(npc.goal||c.planner.goal,220);plan=g?"推進目標：「"+g+"」":"維持自己的生活與安全";step=/尋找|追查|調查|find|seek|investigat/i.test(g)?"INVESTIGATE_GOAL":/旅|前往|travel|reach/i.test(g)?"TRAVEL_FOR_GOAL":"ADVANCE_GOAL"}
 c.planner.goal=clean(npc.goal||c.planner.goal,260);c.planner.currentPlan=plan;c.planner.nextStep=step;c.planner.priority=top.kind;c.planner.updatedMinute=minute(state);return {goal:c.planner.goal,currentPlan:plan,nextStep:step,priority:top.kind,needs}
}
export function npcPlannerSnapshot(state,npc){const c=ensureNpcCognition(state,npc);return c?{...c.planner,needs:evaluateNpcNeeds(state,npc)}:null}
export function npcCognitionSnapshot(state,npc){const c=ensureNpcCognition(state,npc);if(!c)return null;return {memory:npcMemorySnapshot(state,npc),beliefs:npcBeliefSnapshot(state,npc),relationships:npcRelationshipSnapshot(state,npc),commitments:npcCommitmentSnapshot(state,npc),planner:npcPlannerSnapshot(state,npc),effects:npcEffectSnapshot(state,npc)}}
