import {signalHistoryResearch} from "./history-depth.js?v=57018";
const clean=(v,max=320)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function normalizeWorldHistory(input=[]){
 const rows=Array.isArray(input)?input:[];
 const out=[];
 for(const [i,raw] of rows.slice(0,10).entries()){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
  const title=clean(raw.title,120),summary=clean(raw.summary,500),era=clean(raw.era,120)||("過去時代 "+(i+1));
  if(!title||!summary)continue;
  out.push({
   id:clean(raw.id,100)||("HIST-"+(i+1)),
   order:clamp(Math.round(Number(raw.order)||i+1),1,99),
   era,
   title,
   category:clean(raw.category,80)||"歷史事件",
   summary,
   causes:(Array.isArray(raw.causes)?raw.causes:[]).map(x=>clean(x,180)).filter(Boolean).slice(0,4),
   legacies:(Array.isArray(raw.legacies)?raw.legacies:[]).map(x=>clean(x,180)).filter(Boolean).slice(0,5),
   regions:(Array.isArray(raw.regions)?raw.regions:[]).map(x=>clean(x,120)).filter(Boolean).slice(0,5),
   factions:(Array.isArray(raw.factions)?raw.factions:[]).map(x=>clean(x,120)).filter(Boolean).slice(0,5),
   discoverKeywords:(Array.isArray(raw.discoverKeywords)?raw.discoverKeywords:[]).map(x=>clean(x,80)).filter(x=>x.length>=2).slice(0,8),
   canonical:true,
   mutable:false
  });
 }
 return out.sort((a,b)=>a.order-b.order);
}
export function validateWorldHistory(input){
 const history=normalizeWorldHistory(input),errors=[];
 if(history.length<3)errors.push("WORLD_HISTORY_TOO_SHORT");
 const ids=new Set();for(const x of history){if(ids.has(x.id))errors.push("WORLD_HISTORY_ID_DUPLICATE");ids.add(x.id)}
 return {valid:errors.length===0,errors,history};
}
export function directorHistorySnapshot(state,limit=8){
 return (state.world?.history||[]).slice(-Math.max(1,limit)).map(x=>({id:x.id,order:x.order,era:x.era,title:x.title,category:x.category,summary:x.summary,causes:x.causes,legacies:x.legacies,regions:x.regions,factions:x.factions}));
}
export function knownHistorySnapshot(state,limit=12){
 const known=new Set((state.knowledge||[]).filter(k=>k?.status==="VERIFIED").map(k=>k.historyId).filter(Boolean));
 return (state.world?.history||[]).filter(x=>known.has(x.id)).slice(-Math.max(1,limit));
}

export function discoverHistoryEvidence(state,historyId,source={}){
 const history=(state.world?.history||[]).find(x=>x.id===historyId);if(!history)return null;
 const existing=(state.knowledge||[]).find(k=>k.historyId===history.id);if(existing){signalHistoryResearch(state,history.id,{reason:"HISTORY_REVISITED"});return existing};
 const entry={id:"HKN-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2)),title:history.title,status:"VERIFIED",text:history.summary,historyId:history.id,evidenceType:String(source.type||"ARCHAEOLOGY").slice(0,40),sources:["WORLD_HISTORY_EVIDENCE"],sourceRef:{siteId:source.siteId||null,roomId:source.roomId||null,label:String(source.label||"").slice(0,160)},score:3};
 state.knowledge??=[];state.knowledge.push(entry);state.player.knowledgeScore=Math.min(100,(Number(state.player.knowledgeScore)||0)+3);signalHistoryResearch(state,history.id,{reason:"VERIFIED_HISTORY_EVIDENCE"});state.events??=[];state.events.push({id:"HIST-EV-"+Date.now()+"-"+history.id,type:"HISTORY_DISCOVERED",visibility:"PLAYER_KNOWN",historyId:history.id,summary:"你取得了關於「"+history.title+"」的可驗證歷史證據。",day:state.world?.state?.day||1,at:Date.now()});return entry
}
