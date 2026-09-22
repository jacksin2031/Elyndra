const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(rows,max=16)=>[...new Set((Array.isArray(rows)?rows:[]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);
export const HISTORY_DEPTH_LEVELS=Object.freeze(["SKELETON","OUTLINE","DEEP","FULL"]);
const RANK=Object.fromEntries(HISTORY_DEPTH_LEVELS.map((x,i)=>[x,i]));
const GROUPS=["actors","places","chronology","accounts","documents","relics","solutionClues"];
const TARGET_TOTALS={
 SKELETON:{actors:0,places:0,chronology:0,accounts:0,documents:0,relics:0,solutionClues:0},
 OUTLINE:{actors:2,places:2,chronology:3,accounts:2,documents:1,relics:1,solutionClues:1},
 DEEP:{actors:4,places:4,chronology:6,accounts:4,documents:2,relics:2,solutionClues:2},
 FULL:{actors:6,places:6,chronology:9,accounts:6,documents:3,relics:3,solutionClues:3}
};
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function level(v,fallback="SKELETON"){const q=String(v||fallback).toUpperCase();return RANK[q]!=null?q:fallback}
function historyById(state,id){return (state.world?.history||[]).find(x=>x.id===id)||null}
function emptyDetail(){return Object.fromEntries(GROUPS.map(k=>[k,[]]))}
function normalizeRecord(raw,history){
 const detail=raw?.detail&&typeof raw.detail==="object"?raw.detail:emptyDetail();
 for(const k of GROUPS)detail[k]=Array.isArray(detail[k])?detail[k].slice(0,32):[];
 return {historyId:history.id,depth:level(raw?.depth),requestedDepth:level(raw?.requestedDepth),status:["IDLE","REQUESTED","PLANNED","READY","FAILED"].includes(String(raw?.status||"").toUpperCase())?String(raw.status).toUpperCase():"IDLE",detail,requestReasons:uniq(raw?.requestReasons,12),planId:clean(raw?.planId,160)||null,lastError:clean(raw?.lastError,300),updatedAt:Number(raw?.updatedAt)||0}
}
export function ensureHistoryDepth(state){
 state.world??={};state.world.historyDepth??={version:1,records:[]};const root=state.world.historyDepth;root.version=1;root.records=Array.isArray(root.records)?root.records:[];
 const by=new Map(root.records.map(x=>[x?.historyId,x]));root.records=(state.world.history||[]).filter(x=>x?.id).map(h=>normalizeRecord(by.get(h.id),h));return root
}
function inferredRequestedDepth(state,history){
 let rank=0;
 const clueRank={UNDISCOVERED:0,DISCOVERED:1,CORROBORATED:2,VERIFIED:3};
 for(const clue of history.clues||[])rank=Math.max(rank,clueRank[String(clue?.status||"UNDISCOVERED").toUpperCase()]||0);
 for(const k of state.knowledge||[])if(k?.historyId===history.id){
  if(k.status==="VERIFIED")rank=Math.max(rank,3);
  else if(k.beliefState==="CORROBORATED")rank=Math.max(rank,2);
  else rank=Math.max(rank,1)
 }
 return HISTORY_DEPTH_LEVELS[Math.min(3,rank)]
}
export function signalHistoryResearch(state,historyId,{reason="HISTORY_RESEARCH",targetDepth=null}={}){
 const history=historyById(state,clean(historyId,140));if(!history)return {ok:false,reason:"HISTORY_NOT_FOUND"};
 const root=ensureHistoryDepth(state),record=root.records.find(x=>x.historyId===history.id),inferred=targetDepth?level(targetDepth):inferredRequestedDepth(state,history);
 if(RANK[inferred]>RANK[record.requestedDepth])record.requestedDepth=inferred;
 record.requestReasons=uniq([...(record.requestReasons||[]),clean(reason,160)||"HISTORY_RESEARCH"],12);
 if(RANK[record.requestedDepth]>RANK[record.depth]&&record.status!=="PLANNED")record.status="REQUESTED";
 record.updatedAt=Date.now();return {ok:true,historyId:history.id,depth:record.depth,requestedDepth:record.requestedDepth,status:record.status}
}
export function historyDeepeningNeed(state){
 const root=ensureHistoryDepth(state);
 const pending=root.records.filter(x=>RANK[x.requestedDepth]>RANK[x.depth]&&x.status!=="PLANNED").sort((a,b)=>RANK[b.requestedDepth]-RANK[a.requestedDepth]||String(a.historyId).localeCompare(String(b.historyId)))[0];
 return pending?{required:true,historyId:pending.historyId,currentDepth:pending.depth,targetDepth:pending.requestedDepth,reasons:[...(pending.requestReasons||[])]}:{required:false,reason:"NO_HISTORY_RESEARCH_PENDING"}
}
function quotasFor(record,targetDepth){
 const totals=TARGET_TOTALS[targetDepth]||TARGET_TOTALS.OUTLINE,out={};for(const k of GROUPS)out[k]=Math.max(0,totals[k]-(record.detail?.[k]?.length||0));return out
}
export function planHistoryDeepening(state,historyId=null){
 const need=historyId?null:historyDeepeningNeed(state),id=clean(historyId||need?.historyId,140),history=historyById(state,id);if(!history)return null;
 const root=ensureHistoryDepth(state),record=root.records.find(x=>x.historyId===id);
 if(record.status==="PLANNED"&&record.planId)return historyDeepeningPayload(state,{id:record.planId,historyId:id,targetDepth:record.requestedDepth,baseWorldVersion:record.baseWorldVersion,quotas:record.quotas});
 if(RANK[record.requestedDepth]<=RANK[record.depth])return null;
 const baseWorldVersion=Number(state.world?.version)||1,targetDepth=record.requestedDepth,quotas=quotasFor(record,targetDepth),planId="HDP-"+hash([state.world?.id||"WORLD",id,record.depth,targetDepth,baseWorldVersion,JSON.stringify(quotas)].join("|"));
 record.status="PLANNED";record.planId=planId;record.baseWorldVersion=baseWorldVersion;record.quotas=quotas;record.updatedAt=Date.now();
 return historyDeepeningPayload(state,{id:planId,historyId:id,targetDepth,baseWorldVersion,quotas})
}
export function historyDeepeningPayload(state,plan){
 const history=historyById(state,plan?.historyId);if(!history)return null;const record=ensureHistoryDepth(state).records.find(x=>x.historyId===history.id);
 return {id:plan.id,historyId:history.id,currentDepth:record.depth,targetDepth:level(plan.targetDepth,record.requestedDepth),baseWorldVersion:Number(plan.baseWorldVersion)||Number(state.world?.version)||1,quotas:structuredClone(plan.quotas||quotasFor(record,record.requestedDepth)),skeleton:{id:history.id,order:history.order,era:history.era,title:history.title,category:history.category,summary:history.summary,causes:structuredClone(history.causes||[]),legacies:structuredClone(history.legacies||[]),regions:structuredClone(history.regions||[]),factions:structuredClone(history.factions||[]),futureRefs:structuredClone(history.futureRefs||[])},clues:(history.clues||[]).map(x=>({id:x.id,hint:x.hint,status:x.status})),existingDetail:structuredClone(record.detail)}
}
function arrayRows(candidate,key){return Array.isArray(candidate?.additions?.[key])?candidate.additions[key]:[]}
function validClues(history){return new Set((history.clues||[]).map(x=>x.id).filter(Boolean))}
function validFutures(history){return new Set((history.futureRefs||[]).filter(Boolean))}
export function validateHistoryDeepeningCandidate(state,plan,candidate){
 const errors=[],history=historyById(state,plan?.historyId);if(!history)return {valid:false,errors:["HISTORY_NOT_FOUND"]};
 if(Number(state.world?.version)!==Number(plan.baseWorldVersion))errors.push("HISTORY_DEEPENING_STALE_WORLD");
 if(candidate?.historyId!==history.id)errors.push("HISTORY_DEEPENING_HISTORY_ID_MISMATCH");
 if(level(candidate?.targetDepth)!==level(plan.targetDepth))errors.push("HISTORY_DEEPENING_DEPTH_MISMATCH");
 for(const forbidden of ["title","summary","causes","legacies","era","category","skeleton","historyPatch"])if(candidate?.[forbidden]!=null)errors.push("HISTORY_SKELETON_MUTATION_FORBIDDEN:"+forbidden);
 const clueIds=validClues(history),futureIds=validFutures(history),fingerprints=new Set();
 for(const key of GROUPS){
  const rows=arrayRows(candidate,key),quota=Math.max(0,Number(plan.quotas?.[key])||0);if(rows.length>quota)errors.push("HISTORY_DEEPENING_QUOTA_EXCEEDED:"+key);
  for(const row of rows){
   if(!row||typeof row!=="object"||Array.isArray(row)){errors.push("HISTORY_DEEPENING_ROW_INVALID:"+key);continue}
   const fp=key+"|"+JSON.stringify(row);if(fingerprints.has(fp))errors.push("HISTORY_DEEPENING_DUPLICATE:"+key);fingerprints.add(fp);
   for(const clueId of uniq(row.clueRefs,8))if(!clueIds.has(clueId))errors.push("HISTORY_DEEPENING_CLUE_REF_INVALID:"+clueId);
   for(const futureId of uniq(row.futureRefs,8))if(!futureIds.has(futureId))errors.push("HISTORY_DEEPENING_FUTURE_REF_INVALID:"+futureId)
  }
 }
 for(const d of arrayRows(candidate,"documents")){
  if(!clean(d.title,140))errors.push("HISTORY_DOCUMENT_TITLE_REQUIRED");
  for(const claim of Array.isArray(d.claims)?d.claims:[]){if(claim?.clueId&&!clueIds.has(claim.clueId))errors.push("HISTORY_DOCUMENT_CLUE_REF_INVALID:"+claim.clueId)}
 }
 for(const row of arrayRows(candidate,"solutionClues"))if(row?.clueId&&!clueIds.has(row.clueId))errors.push("HISTORY_SOLUTION_CLUE_REF_INVALID:"+row.clueId);
 const total=GROUPS.reduce((n,k)=>n+arrayRows(candidate,k).length,0);if(total===0)errors.push("HISTORY_DEEPENING_EMPTY");
 return {valid:errors.length===0,errors:[...new Set(errors)]}
}
function normalizeRows(plan,key,rows,history){
 return rows.map((raw,i)=>{
  const base={id:"HD-"+hash(plan.id+"|"+key+"|"+i+"|"+JSON.stringify(raw)),historyId:history.id};
  if(key==="actors")return {...base,name:clean(raw.name,120)||"未具名歷史人物",role:clean(raw.role,180),allegiance:clean(raw.allegiance,140),motive:clean(raw.motive,300),fate:clean(raw.fate,300),clueRefs:uniq(raw.clueRefs,8)};
  if(key==="places")return {...base,name:clean(raw.name,140)||"未具名歷史地點",role:clean(raw.role,240),modernTrace:clean(raw.modernTrace,360),clueRefs:uniq(raw.clueRefs,8)};
  if(key==="chronology")return {...base,sequence:Math.max(1,Number(raw.sequence)||i+1),event:clean(raw.event,500),causes:uniq(raw.causes,6),consequences:uniq(raw.consequences,6),clueRefs:uniq(raw.clueRefs,8)};
  if(key==="accounts")return {...base,perspective:clean(raw.perspective,160),claim:clean(raw.claim,500),reliability:["LOW","MEDIUM","HIGH","UNKNOWN"].includes(String(raw.reliability||"").toUpperCase())?String(raw.reliability).toUpperCase():"UNKNOWN",bias:clean(raw.bias,300),clueRefs:uniq(raw.clueRefs,8)};
  if(key==="documents")return {...base,title:clean(raw.title,140),author:clean(raw.author,120)||"不詳",era:clean(raw.era,120)||history.era,culture:clean(raw.culture,120),language:clean(raw.language,80)||"COMMON",reliability:["UNKNOWN","LOW","MEDIUM","HIGH","PRIMARY_SOURCE"].includes(String(raw.reliability||"").toUpperCase())?String(raw.reliability).toUpperCase():"UNKNOWN",bias:clean(raw.bias,300),claims:(Array.isArray(raw.claims)?raw.claims:[]).slice(0,8).map(c=>({text:clean(c?.text,500),clueId:clean(c?.clueId,140)||null,disputes:c?.disputes===true})).filter(c=>c.text)};
  if(key==="relics")return {...base,label:clean(raw.label,140)||"未具名遺物",description:clean(raw.description,400),culture:clean(raw.culture,120),era:clean(raw.era,120)||history.era,significance:clean(raw.significance,500),clueRefs:uniq(raw.clueRefs,8),futureRefs:uniq(raw.futureRefs,8)};
  return {...base,clueId:clean(raw.clueId,140)||null,interpretation:clean(raw.interpretation,500),futureRefs:uniq(raw.futureRefs,8)}
 })
}
export function commitHistoryDeepening(state,plan,candidate){
 const v=validateHistoryDeepeningCandidate(state,plan,candidate);if(!v.valid)return {ok:false,errors:v.errors};
 const history=historyById(state,plan.historyId),record=ensureHistoryDepth(state).records.find(x=>x.historyId===history.id),added={};
 for(const key of GROUPS){const rows=normalizeRows(plan,key,arrayRows(candidate,key),history);record.detail[key].push(...rows);added[key]=rows}
 record.depth=level(plan.targetDepth);record.status="READY";record.planId=null;record.baseWorldVersion=null;record.quotas=null;record.lastError="";record.updatedAt=Date.now();
 if(RANK[record.requestedDepth]<=RANK[record.depth])record.requestedDepth=record.depth;
 state.world.version=Math.max(1,Number(state.world.version)||1)+1;state.events??=[];state.events.push({id:"EV-HDEP-"+hash(plan.id+"|"+Date.now()),type:"HISTORY_DEEPENED",visibility:"INTERNAL",historyId:history.id,depth:record.depth,day:Number(state.world?.state?.day)||1,at:Date.now()});
 return {ok:true,historyId:history.id,depth:record.depth,added}
}
export function abortHistoryDeepening(state,plan,reason=""){
 if(!plan)return false;const record=ensureHistoryDepth(state).records.find(x=>x.historyId===plan.historyId);if(!record)return false;
 record.status="REQUESTED";record.planId=null;record.baseWorldVersion=null;record.quotas=null;record.lastError=clean(reason,300);record.updatedAt=Date.now();return true
}
export function historyDepthSnapshot(state,{director=false}={}){
 const root=ensureHistoryDepth(state);
 return root.records.map(r=>director?structuredClone(r):({historyId:r.historyId,depth:r.depth,requestedDepth:r.requestedDepth,status:r.status==="PLANNED"?"REQUESTED":r.status,generated:r.depth!=="SKELETON"}))
}