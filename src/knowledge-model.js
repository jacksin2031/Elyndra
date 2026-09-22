const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
export const EVIDENCE_TYPES=Object.freeze(["TESTIMONY","DOCUMENT","OBSERVATION","ARTIFACT"]);
export const BELIEF_STATES=Object.freeze(["UNCONFIRMED","SUPPORTED","CORROBORATED","DISPUTED","VERIFIED"]);
const evidenceSet=new Set(EVIDENCE_TYPES),beliefSet=new Set(BELIEF_STATES);
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);

export function ensureKnowledgeMetadata(state){
 state.knowledge??=[];
 for(const entry of state.knowledge){
  entry.evidenceType=evidenceSet.has(String(entry.evidenceType||entry.evidenceTypeHint||"").toUpperCase())?String(entry.evidenceType||entry.evidenceTypeHint).toUpperCase():(entry.status==="VERIFIED"?"OBSERVATION":"TESTIMONY");
  entry.beliefState=beliefSet.has(String(entry.beliefState||"").toUpperCase())?String(entry.beliefState).toUpperCase():(entry.status==="VERIFIED"?"VERIFIED":"UNCONFIRMED");
  entry.claimKey=clean(entry.claimKey,180)||clean(entry.factId||entry.historyId||entry.text,180).toLowerCase();
  entry.sourceIndependence=Math.max(0,Math.min(1,Number(entry.sourceIndependence??0.5)));
 }
 return state.knowledge
}
function canonicalRefExists(state,row){
 const fact=Boolean(row.factId&&(state.world?.canon?.facts||[]).some(x=>x.id===row.factId));
 const history=Boolean(row.historyId&&(state.world?.history||[]).some(x=>x.id===row.historyId));
 return fact||history
}
export function recordKnowledgeEvidence(state,input={}){
 ensureKnowledgeMetadata(state);
 const evidenceType=String(input.evidenceType||"TESTIMONY").toUpperCase();if(!evidenceSet.has(evidenceType))throw new Error("KNOWLEDGE_EVIDENCE_TYPE_INVALID");
 const row={
  id:clean(input.id,120)||"K-"+uid(),title:clean(input.title,120)||"未命名線索",text:clean(input.text,500),
  factId:clean(input.factId,120)||null,historyId:clean(input.historyId,120)||null,graphNodeId:clean(input.graphNodeId,120)||null,
  evidenceType,claimKey:clean(input.claimKey,180)||clean(input.factId||input.historyId||input.text,180).toLowerCase(),
  sourceRef:input.sourceRef&&typeof input.sourceRef==="object"?structuredClone(input.sourceRef):null,
  sourceIndependence:Math.max(0,Math.min(1,Number(input.sourceIndependence??0.5))),
  status:"UNCONFIRMED",beliefState:"UNCONFIRMED",score:0
 };
 if(!row.text)throw new Error("KNOWLEDGE_TEXT_REQUIRED");
 if(input.verifiedByEngine===true&&canonicalRefExists(state,row)){row.status="VERIFIED";row.beliefState="VERIFIED";row.score=Math.max(1,Number(input.score)||2)}
 state.knowledge.push(row);return row
}
export function recomputeCorroboration(state,claimKey){
 const rows=ensureKnowledgeMetadata(state).filter(x=>x.claimKey===claimKey),independent=rows.filter(x=>x.sourceIndependence>=0.5),types=new Set(independent.map(x=>x.evidenceType));
 const disputed=rows.some(x=>x.disputes===true),verified=rows.some(x=>x.status==="VERIFIED"&&canonicalRefExists(state,x));
 const belief=verified?"VERIFIED":disputed?"DISPUTED":independent.length>=2&&types.size>=2?"CORROBORATED":independent.length>=1?"SUPPORTED":"UNCONFIRMED";
 for(const row of rows)if(row.status!=="VERIFIED")row.beliefState=belief;
 return {claimKey,beliefState:belief,independentSources:independent.length,evidenceTypes:[...types]}
}
export function knowledgeCanRevealCanon(state,entry){
 if(!entry)return false;ensureKnowledgeMetadata(state);return entry.status==="VERIFIED"&&canonicalRefExists(state,entry)
}
export function validateKnowledgeBoundaries(state){
 const errors=[],warnings=[];for(const entry of ensureKnowledgeMetadata(state)){
  if(entry.status==="VERIFIED"&&!canonicalRefExists(state,entry))errors.push("VERIFIED_KNOWLEDGE_ORPHAN:"+entry.id);
  if(entry.status!=="VERIFIED"&&Number(entry.score)>0)warnings.push("UNVERIFIED_KNOWLEDGE_SCORE:"+entry.id)
 }
 return {valid:errors.length===0,errors,warnings}
}
export function knowledgeModelSnapshot(state){
 const rows=ensureKnowledgeMetadata(state);return {entries:rows.slice(-50).map(x=>({id:x.id,title:x.title,status:x.status,beliefState:x.beliefState,evidenceType:x.evidenceType,factId:x.factId||null,historyId:x.historyId||null,claimKey:x.claimKey}))}
}
