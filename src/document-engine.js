import {recordKnowledgeEvidence,recomputeCorroboration,ensureKnowledgeMetadata} from "./knowledge-model.js?v=57015";
import {ensureHistoryFutureLinks,recordHistoryClueEvidence} from "./history-future.js?v=57015";
import {signalHistoryResearch} from "./history-depth.js?v=57015";

const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(v,max=12)=>[...new Set((Array.isArray(v)?v:[]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);
const uid=p=>p+"-"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
const RELIABILITY=new Set(["UNKNOWN","LOW","MEDIUM","HIGH","PRIMARY_SOURCE"]);
function normalizeClaim(raw={},i=0){
 const text=clean(raw.text,500);if(!text)return null;
 return {id:clean(raw.id,140)||("CLAIM-"+(i+1)),text,claimKey:clean(raw.claimKey,180)||text.toLowerCase().slice(0,180),historyId:clean(raw.historyId,140)||null,clueId:clean(raw.clueId,140)||null,factId:clean(raw.factId,140)||null,disputes:raw.disputes===true}
}
export function ensureDocumentRuntime(state){
 state.world??={};state.world.documents??={version:1,documents:[]};const rt=state.world.documents;rt.version=1;rt.documents=Array.isArray(rt.documents)?rt.documents:[];return rt
}
export function registerDocument(state,input={}){
 ensureHistoryFutureLinks(state);const rt=ensureDocumentRuntime(state),title=clean(input.title,140);if(!title)return null;
 const id=clean(input.id,140)||uid("DOC"),existing=rt.documents.find(x=>x.id===id);if(existing)return existing;
 const row={id,title,author:clean(input.author,120)||"不詳",era:clean(input.era,120)||"年代不詳",culture:clean(input.culture,120),language:clean(input.language,80)||"COMMON",reliability:RELIABILITY.has(String(input.reliability||"").toUpperCase())?String(input.reliability).toUpperCase():"UNKNOWN",bias:clean(input.bias,300),historyRefs:uniq(input.historyRefs,8),clueRefs:uniq(input.clueRefs,8),locationId:clean(input.locationId,140)||null,known:input.known===true,read:false,claims:(Array.isArray(input.claims)?input.claims:[]).map(normalizeClaim).filter(Boolean).slice(0,12),createdDay:Number(state.world?.state?.day)||1};
 rt.documents.push(row);return row
}
export function playerLanguages(state){
 const explicit=uniq(state.player?.languages,16).map(x=>x.toUpperCase()),origin=uniq(state.player?.origin?.languages,16).map(x=>x.toUpperCase()),runtime=uniq(state.player?.originRuntime?.readLanguages,16).map(x=>x.toUpperCase());
 const base=state.player?.originRuntime?["UNIVERSAL"]:["COMMON","UNIVERSAL"];
 return new Set([...base,...runtime,...explicit,...origin])
}
export function canReadDocument(state,docOrId){
 const doc=typeof docOrId==="string"?ensureDocumentRuntime(state).documents.find(x=>x.id===docOrId):docOrId;if(!doc)return {ok:false,reason:"DOCUMENT_NOT_FOUND"};
 const language=String(doc.language||"COMMON").toUpperCase(),known=playerLanguages(state).has(language);return known?{ok:true,document:doc}:{ok:false,reason:"LANGUAGE_UNKNOWN",language,document:doc}
}
export function readDocument(state,docId){
 const access=canReadDocument(state,docId);if(!access.ok)return access;const doc=access.document;doc.known=true;doc.read=true;doc.readDay=Number(state.world?.state?.day)||1;
 const evidence=[];
 for(const claim of doc.claims){
  let row;
  if(claim.historyId&&claim.clueId){
   const result=recordHistoryClueEvidence(state,{historyId:claim.historyId,clueId:claim.clueId,title:doc.title,text:claim.text,evidenceType:"DOCUMENT",sourceRef:{documentId:doc.id,author:doc.author},sourceIndependence:1,verifiedByEngine:false});
   row=result.ok?result.evidence:null
  }else{
   row=recordKnowledgeEvidence(state,{title:doc.title,text:claim.text,historyId:claim.historyId,factId:claim.factId,claimKey:claim.claimKey,evidenceType:"DOCUMENT",sourceRef:{documentId:doc.id,author:doc.author},sourceIndependence:1,verifiedByEngine:false})
  }
  if(row){row.disputes=claim.disputes===true;recomputeCorroboration(state,row.claimKey);evidence.push(row.id)}
 }
 for(const historyId of doc.historyRefs||[])signalHistoryResearch(state,historyId,{reason:"DOCUMENT_RESEARCH"});
 state.events??=[];const event={id:uid("EV"),type:"DOCUMENT_READ",visibility:"PLAYER_KNOWN",documentId:doc.id,summary:"你閱讀了「"+doc.title+"」。內容已作為文獻證據記錄，而不是自動視為世界真相。",day:Number(state.world?.state?.day)||1,at:Date.now()};state.events.push(event);
 return {ok:true,documentId:doc.id,evidenceRefs:evidence,reliability:doc.reliability,bias:doc.bias,event}
}
export function documentSignificance(state,docId){
 const doc=ensureDocumentRuntime(state).documents.find(x=>x.id===docId);if(!doc)return {known:false};
 ensureKnowledgeMetadata(state);const verifiedHistory=new Set((state.knowledge||[]).filter(x=>x.status==="VERIFIED"&&x.historyId).map(x=>x.historyId)),verifiedFacts=new Set((state.knowledge||[]).filter(x=>x.status==="VERIFIED"&&x.factId).map(x=>x.factId));
 const historyRefs=doc.historyRefs.filter(x=>verifiedHistory.has(x)),factRefs=doc.claims.map(x=>x.factId).filter(x=>verifiedFacts.has(x));
 return {known:doc.read===true,historyRefs,factRefs,significant:historyRefs.length>0||factRefs.length>0}
}
export function documentSnapshot(state,{director=false,knownOnly=true}={}){
 return ensureDocumentRuntime(state).documents.filter(x=>!knownOnly||x.known).map(x=>({
  id:x.id,title:x.title,author:x.author,era:x.era,culture:x.culture,language:x.language,reliability:x.reliability,bias:x.bias,read:x.read,
  ...(director?{historyRefs:x.historyRefs,clueRefs:x.clueRefs,claims:structuredClone(x.claims)}:{})
 }))
}

export function registerHistoryDeepeningDocuments(state,historyId,seeds=[]){
 const history=(state.world?.history||[]).find(x=>x.id===historyId);if(!history)return [];
 const out=[];for(const seed of (Array.isArray(seeds)?seeds:[]).slice(0,6)){
  const doc=registerDocument(state,{id:seed.id,title:seed.title,author:seed.author,era:seed.era||history.era,culture:seed.culture,language:seed.language,reliability:seed.reliability,bias:seed.bias,historyRefs:[history.id],clueRefs:(seed.claims||[]).map(x=>x.clueId).filter(Boolean),known:false,claims:(seed.claims||[]).map(x=>({text:x.text,historyId:history.id,clueId:x.clueId,disputes:x.disputes===true}))});
  if(doc)out.push(doc.id)
 }
 return out
}
