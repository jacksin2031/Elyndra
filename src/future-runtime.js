import {ensureFutureEngine,applyFuturePressure,recomputeFutureStage,mirrorLegacyCrisisToFuture} from "./future-engine.js?v=57018";
import {ensureHistoryFutureLinks} from "./history-future.js?v=57018";
import {appendWorldLedger,promoteLedgerEntryToHistory,ensureWorldLedger} from "./world-ledger.js?v=57018";
import {seedHistoryLegacy} from "./history-legacy.js?v=57018";

const clean=(v,max=400)=>typeof v==="string"?v.trim().slice(0,max):"";
const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const STRATEGY_DELTA={MOBILIZE:8,EXPAND:5,DEFEND:-2,TRADE:-2,RECOVER:-1,HOLD:0};
const TIMELINE_DELTA={DELAY:-8,ADVANCE:8,WEAKEN:-6,STRENGTHEN:6};
const SIGNIFICANCE_RANK={ROUTINE:0,NOTABLE:1,MAJOR:2,HISTORIC:3};

export function ensureFutureRuntime(state){
 state.world??={};state.world.futureRuntime??={version:1,processedEventIds:[],timelineImpactCursor:{},foreshadowed:{}};
 const rt=state.world.futureRuntime;rt.version=1;rt.processedEventIds=Array.isArray(rt.processedEventIds)?rt.processedEventIds.slice(-600):[];rt.timelineImpactCursor=rt.timelineImpactCursor&&typeof rt.timelineImpactCursor==="object"?rt.timelineImpactCursor:{};rt.foreshadowed=rt.foreshadowed&&typeof rt.foreshadowed==="object"?rt.foreshadowed:{};return rt
}
function timelineForFuture(state,future){const id=String(future.id||"").startsWith("FUT-")?String(future.id).slice(4):"";return (state.world?.timeline||[]).find(x=>x.id===id)||null}
function inferDomains(category){
 const q=String(category||"").toUpperCase();
 if(q.includes("WAR"))return ["SECURITY","FACTION","TRAVEL","MIGRATION","ECONOMY"];
 if(q.includes("PLAGUE")||q.includes("DISEASE"))return ["SURVIVAL","MIGRATION","TRAVEL","ECONOMY"];
 if(q.includes("MAGIC"))return ["MAGIC","SECURITY","SURVIVAL"];
 if(q.includes("POLIT")||q.includes("REVOLUTION"))return ["FACTION","SECURITY","ECONOMY"];
 return ["SECURITY"]
}
function enrichFuture(state,future){
 const timeline=timelineForFuture(state,future);
 if(timeline){
  future.category??=timeline.category||"WORLD_EVENT";future.observableEffect??=clean(timeline.observableEffect,500);
  future.historicalLinks=[...new Set([...(future.historicalLinks||[]),...(timeline.links?.historyRefs||[])])].slice(0,8);
  future.locationRefs=[...new Set([...(future.locationRefs||[]),...(timeline.links?.locationRefs||[])])].slice(0,8)
 }
 future.domains=Array.isArray(future.domains)&&future.domains.length?future.domains:inferDomains(future.category);
 future.locationRefs=Array.isArray(future.locationRefs)?future.locationRefs:[];
 const locations=state.world?.registry?.locations||[];
 const refs=new Set(future.locationRefs),regions=new Set(Array.isArray(future.affectedRegions)?future.affectedRegions:[]);
 for(const l of locations)if(refs.has(l.id)||refs.has(l.name))if(l.region)regions.add(l.region);
 future.affectedRegions=[...regions].slice(0,12);
 const linkedHistory=(state.world?.history||[]).filter(h=>(future.historicalLinks||[]).includes(h.id)),factionNames=new Set(linkedHistory.flatMap(h=>h.factions||[]));
 const factions=state.world?.registry?.factions||[];future.factionRefs=[...new Set([...(future.factionRefs||[]),...factions.filter(f=>factionNames.has(f.id)||factionNames.has(f.name)).map(f=>f.id)])].slice(0,12);
 return future
}
function targetsForEvent(state,event){
 const futures=ensureFutureEngine(state).filter(x=>!x.legacyMirror).map(x=>enrichFuture(state,x));
 if(event?.timelineId)return futures.filter(x=>x.id==="FUT-"+event.timelineId);
 if(event?.type==="FACTION_ACTION"&&event.factionId)return futures.filter(x=>(x.factionRefs||[]).includes(event.factionId));
 return []
}
function eventDelta(state,event,future){
 if(event?.type==="WORLD_EVENT"&&event?.subtype==="TIMELINE_EVENT"){future.activatedDay=Math.max(1,Number(event.day)||Number(state.world?.state?.day)||1);return Math.max(0,80-Number(future.pressure||0))}
 if(event?.type==="FACTION_ACTION")return Number(STRATEGY_DELTA[String(event.strategy||"").toUpperCase()]||0);
 return 0
}
function signalText(future,stage){
 const domains=new Set(future.domains||[]),observable=clean(future.observableEffect,500);
 if(stage==="CRITICAL"||stage==="ACTIVE")return observable||"原本零散的異常已經變成任何在場者都能察覺的重大變化。";
 if(stage==="RESOLVING")return "先前持續升高的異常跡象開始減弱，但其後果仍未完全消失。";
 if(domains.has("MIGRATION"))return stage==="EMERGING"?"道路上開始出現比平日更多的離境者與攜家帶眷的人。":"人口流動明顯增加，住宿、交通與補給開始承受壓力。";
 if(domains.has("ECONOMY"))return stage==="EMERGING"?"部分商品的價格與供應出現不尋常波動。":"供應、價格與商路的變化已經影響到日常生活。";
 if(domains.has("MAGIC"))return stage==="EMERGING"?"少量難以解釋的魔力異常開始被人談論。":"魔力異常已經頻繁到無法再被當作偶發現象。";
 if(domains.has("FACTION"))return stage==="EMERGING"?"不同勢力的巡查、使者與情報活動開始增加。":"勢力間的部署與對立正變得公開而緊張。";
 return stage==="EMERGING"?"市場、道路與閒談中開始出現彼此呼應的不安跡象。":"警戒、檢查與安全措施比之前更頻繁，局勢正在明顯升溫。"
}
function emitForeshadowing(state,future,rt){
 if(future.legacyMirror)return null;
 const stage=String(future.stage||"DORMANT"),before=rt.foreshadowed[future.id]||"DORMANT";if(stage===before)return null;
 rt.foreshadowed[future.id]=stage;if(["DORMANT","RESOLVED"].includes(stage))return null;
 const event={id:uid("EV"),type:"FUTURE_FORESHADOW",visibility:stage==="EMERGING"?"RUMOR":"OBSERVABLE",futureId:future.id,futureStage:stage,impactScope:future.impactScope,domains:[...(future.domains||[])],summary:signalText(future,stage),day:Number(state.world?.state?.day)||1,at:Date.now()};
 state.events??=[];state.events.push(event);return event
}
function classifyEvent(event){
 if(event?.type==="CRISIS_STAGE_CHANGED"&&event.stage==="ENDGAME")return "HISTORIC";
 if(event?.type==="WORLD_IMPACT"&&event.scope==="WORLD")return "HISTORIC";
 if(event?.type==="WORLD_IMPACT"&&["REGIONAL","FACTION"].includes(event.scope))return "MAJOR";
 if(event?.type==="WORLD_EVENT"&&event.subtype==="TIMELINE_EVENT")return "MAJOR";
 if(event?.type==="FUTURE_INTERVENTION"&&["PREVENT","REDIRECT"].includes(event.action))return "MAJOR";
 return null
}
function historicize(state,event){
 const significance=classifyEvent(event);if(!significance)return null;const ledger=ensureWorldLedger(state);
 let entry=ledger.entries.find(x=>x.sourceEventId===event.id);
 if(!entry)entry=appendWorldLedger(state,event,{sourceEventId:event.id,significance,causeRefs:[event.futureId,event.timelineId].filter(Boolean)});
 else if((SIGNIFICANCE_RANK[significance]||0)>(SIGNIFICANCE_RANK[entry.significance]||0))entry.significance=significance;
 const history=promoteLedgerEntryToHistory(state,entry.id,{title:clean(event.summary,120)||event.type,category:event.type,legacies:["此事件成為後續世界狀態與記憶的一部分"],discoverKeywords:[event.type,event.scope,event.subtype].filter(Boolean)});
 if(history)seedHistoryLegacy(state,history.id);return history
}
function processTimelineImpacts(state,rt,changes){
 for(const timeline of state.world?.timeline||[]){
  const rows=Array.isArray(timeline.impactHistory)?timeline.impactHistory:[],seen=Math.max(0,Number(rt.timelineImpactCursor[timeline.id])||0);
  for(const row of rows.slice(seen)){
   const future=ensureFutureEngine(state).find(x=>x.id==="FUT-"+timeline.id);if(!future)continue;const delta=Number(TIMELINE_DELTA[String(row.action||"").toUpperCase()]||0);
   if(delta){const before=future.pressure;applyFuturePressure(state,future.id,delta,"TIMELINE_IMPACT:"+row.action);changes.push({futureId:future.id,delta,before,after:future.pressure,source:"TIMELINE_IMPACT"})}
  }
  rt.timelineImpactCursor[timeline.id]=rows.length
 }
}

export function advanceFutureSimulation(state){
 ensureHistoryFutureLinks(state);const futures=ensureFutureEngine(state),rt=ensureFutureRuntime(state),processed=new Set(rt.processedEventIds),changes=[],signals=[],newHistory=[];
 for(const future of futures)enrichFuture(state,future);
 for(const event of (state.events||[]).slice(-240)){
  if(!event?.id||processed.has(event.id))continue;
  for(const future of targetsForEvent(state,event)){const delta=eventDelta(state,event,future);if(delta){const before=future.pressure;applyFuturePressure(state,future.id,delta,event.type+":"+String(event.strategy||event.subtype||""));changes.push({futureId:future.id,delta,before,after:future.pressure,source:event.id})}}
  const history=historicize(state,event);if(history)newHistory.push(history.id);processed.add(event.id)
 }
 processTimelineImpacts(state,rt,changes);
 rt.processedEventIds=[...processed].slice(-600);
 mirrorLegacyCrisisToFuture(state);
 for(const future of futures){recomputeFutureStage(state,future);if(future.activatedDay&&future.stage!=="RESOLVED"&&Number(future.pressure||0)>=80)future.stage="ACTIVE";const signal=emitForeshadowing(state,future,rt);if(signal)signals.push(signal)}
 return {changes,signals,newHistory}
}

export function playerFutureSignals(state,limit=12){
 const visible=(state.events||[]).filter(x=>x.type==="FUTURE_FORESHADOW"&&["RUMOR","OBSERVABLE","PLAYER_KNOWN"].includes(x.visibility)).slice(-Math.max(1,limit));
 return visible.map(x=>({summary:x.summary,visibility:x.visibility,day:x.day,impactScope:x.impactScope,domains:x.domains}))
}
