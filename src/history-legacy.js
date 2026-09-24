import {registerDocument} from "./document-engine.js?v=57005";
import {registerHistoryRelicSeeds} from "./item-heritage.js?v=57005";

const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(v,max=16)=>[...new Set((Array.isArray(v)?v:[v]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);
const ECHO_KINDS=new Set(["DOCUMENT","ORAL_TRADITION","RELIC","MEMORIAL","WEAPON_RELIC"]);
const STATUS=new Set(["UNMATERIALIZED","RESERVED","MATERIALIZED"]);
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function historyById(state,id){return (state.world?.history||[]).find(x=>x.id===id)||null}
function ledgerEntry(state,history){return (state.world?.ledger?.entries||[]).find(x=>x.id===history?.ledgerRef)||null}
function isMartial(history){return /WAR|COMBAT|BATTLE|SIEGE|戰|戰鬥|圍城|軍|決戰/i.test([history?.category,history?.title].filter(Boolean).join(" "))}
function echoId(historyId,kind){return "HECHO-"+hash(historyId+"|"+kind)}
function normalizeEcho(raw={},historyId=""){
 const kind=ECHO_KINDS.has(String(raw.kind||"").toUpperCase())?String(raw.kind).toUpperCase():"ORAL_TRADITION";
 return {id:clean(raw.id,140)||echoId(historyId,kind),historyId,kind,label:clean(raw.label,180),status:STATUS.has(String(raw.status||"").toUpperCase())?String(raw.status).toUpperCase():"UNMATERIALIZED",entityRefs:uniq(raw.entityRefs,12),artifactRefs:uniq(raw.artifactRefs,12),reservation:raw.reservation&&typeof raw.reservation==="object"?structuredClone(raw.reservation):null,createdDay:Math.max(1,Number(raw.createdDay)||1,0),materializedDay:Number(raw.materializedDay)||null}
}
function seedEchoes(history,day){
 const base=[
  {kind:"DOCUMENT",label:"關於「"+history.title+"」的後世記錄"},
  {kind:"ORAL_TRADITION",label:"關於「"+history.title+"」的口述傳說"},
  {kind:"RELIC",label:"由「"+history.title+"」留下的遺物"},
  {kind:"MEMORIAL",label:"紀念「"+history.title+"」的場所或痕跡"}
 ];
 if(isMartial(history))base.push({kind:"WEAPON_RELIC",label:"與「"+history.title+"」相關的武器或軍用器物"});
 return base.map(x=>normalizeEcho({...x,id:echoId(history.id,x.kind),createdDay:day},history.id))
}
export function ensureHistoryLegacy(state){
 state.world??={};state.world.historyLegacy??={version:1,records:[]};const root=state.world.historyLegacy;root.version=1;root.records=Array.isArray(root.records)?root.records:[];
 const prior=new Map(root.records.map(x=>[x?.historyId,x]));
 const next=[];
 for(const history of state.world?.history||[]){
  if(!history?.id||!history.ledgerRef)continue;
  const source=ledgerEntry(state,history),old=prior.get(history.id)||{},existing=new Map((old.echoes||[]).map(x=>[x?.kind,normalizeEcho(x,history.id)])),seeded=seedEchoes(history,source?.worldDay||1);
  const echoes=seeded.map(seed=>existing.get(seed.kind)||seed);
  next.push({historyId:history.id,ledgerRef:history.ledgerRef,createdDay:Math.max(1,Number(old.createdDay)||Number(source?.worldDay)||1),echoes})
 }
 root.records=next.slice(-120);return root
}
function recordFor(state,historyId){return ensureHistoryLegacy(state).records.find(x=>x.historyId===historyId)||null}
export function seedHistoryLegacy(state,historyId){
 const history=historyById(state,historyId);if(!history?.ledgerRef)return null;ensureHistoryLegacy(state);materializeSafeHistoryLegacy(state,history.id);return recordFor(state,history.id)
}
export function materializeSafeHistoryLegacy(state,historyId){
 const history=historyById(state,historyId),record=recordFor(state,historyId);if(!history||!record)return {documents:[],relics:[]};
 const documents=[],relics=[];
 const docEcho=record.echoes.find(x=>x.kind==="DOCUMENT");
 if(docEcho&&docEcho.status!=="MATERIALIZED"){
  const id="LEGACY-DOC-"+history.id,doc=registerDocument(state,{id,title:"事件記錄：「"+history.title+"」",author:"不詳",era:history.era||"玩家時代",language:"COMMON",reliability:"UNKNOWN",bias:"事件發生後留下的記錄；可能只代表記錄者視角。",historyRefs:[history.id],known:false,claims:[{text:history.summary,historyId:history.id,claimKey:"legacy:"+history.id,disputes:false}]});
  if(doc){docEcho.status="MATERIALIZED";docEcho.artifactRefs=[doc.id];docEcho.materializedDay=Number(state.world?.state?.day)||1;documents.push(doc.id)}
 }
 for(const kind of ["RELIC","WEAPON_RELIC"]){
  const echo=record.echoes.find(x=>x.kind===kind);if(!echo||echo.status==="MATERIALIZED")continue;
  const ids=registerHistoryRelicSeeds(state,history.id,[{id:"LEGACY-"+kind+"-"+history.id,label:echo.label,era:history.era,description:kind==="WEAPON_RELIC"?"與這段新歷史有直接關係、尚未被玩家發現的武器或軍用器物種子。":"與這段新歷史有直接關係、尚未被玩家發現的遺物種子。",significance:"這件物品的真正意義只能透過後續調查與證據逐步確認。"}]);
  if(ids.length){echo.status="MATERIALIZED";echo.artifactRefs=ids;echo.materializedDay=Number(state.world?.state?.day)||1;relics.push(...ids)}
 }
 return {documents,relics}
}
export function syncHistoryLegacy(state){
 const root=ensureHistoryLegacy(state);for(const record of root.records)materializeSafeHistoryLegacy(state,record.historyId);return ensureHistoryLegacy(state)
}
export function pendingHistoryLegacyEchoes(state,{limit=12}={}){
 const rows=[];for(const record of ensureHistoryLegacy(state).records)for(const echo of record.echoes)if(["ORAL_TRADITION","MEMORIAL"].includes(echo.kind)&&echo.status==="UNMATERIALIZED")rows.push(structuredClone(echo));
 return rows.sort((a,b)=>Number(a.createdDay)-Number(b.createdDay)||String(a.id).localeCompare(String(b.id))).slice(0,Math.max(0,Number(limit)||0))
}
export function reserveHistoryLegacyEcho(state,echoIdValue,meta={}){
 const root=ensureHistoryLegacy(state);for(const record of root.records){const echo=record.echoes.find(x=>x.id===echoIdValue);if(!echo||echo.status!=="UNMATERIALIZED")continue;echo.status="RESERVED";echo.reservation={planId:clean(meta.planId,160)||null,reason:clean(meta.reason,180),reservedAtRevision:Number(state.world?.version)||1};return echo}return null
}
export function releaseHistoryLegacyEcho(state,echoIdValue,reason=""){
 const root=ensureHistoryLegacy(state);for(const record of root.records){const echo=record.echoes.find(x=>x.id===echoIdValue);if(!echo||echo.status!=="RESERVED")continue;echo.status="UNMATERIALIZED";echo.reservation=null;echo.failureReason=clean(reason,240);return echo}return null
}
export function materializeHistoryLegacyEcho(state,echoIdValue,entityRefs=[]){
 const refs=uniq(entityRefs,12);if(!refs.length)return null;const root=ensureHistoryLegacy(state);
 for(const record of root.records){const echo=record.echoes.find(x=>x.id===echoIdValue);if(!echo||!["UNMATERIALIZED","RESERVED"].includes(echo.status))continue;echo.status="MATERIALIZED";echo.entityRefs=refs;echo.reservation=null;echo.materializedDay=Number(state.world?.state?.day)||1;return echo}return null
}
export function historyLegacySnapshot(state,{director=false}={}){
 const root=ensureHistoryLegacy(state);
 if(director)return structuredClone(root.records);
 return root.records.map(r=>({historyId:r.historyId,materialized:r.echoes.filter(x=>x.status==="MATERIALIZED").length,pending:r.echoes.filter(x=>x.status!=="MATERIALIZED").length}))
}