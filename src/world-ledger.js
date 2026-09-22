const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(v,max=16)=>[...new Set((Array.isArray(v)?v:[]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);
const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const VISIBILITY=new Set(["PLAYER_KNOWN","OBSERVABLE","RUMOR","INTERNAL","DIRECTOR_ONLY"]);
const SIGNIFICANCE=new Set(["ROUTINE","NOTABLE","MAJOR","HISTORIC"]);

function compactLedgerEntries(state,rows){
 if(rows.length<=2000)return rows;
 const pinned=new Set((state.world?.history||[]).map(x=>x?.ledgerRef).filter(Boolean));
 const recent=new Set(rows.slice(-1800).map(x=>x.id));
 return rows.filter(x=>recent.has(x.id)||pinned.has(x.id)||["MAJOR","HISTORIC"].includes(x.significance)||(x.historyRefs||[]).length>0)
}

export function ensureWorldLedger(state){
 state.world??={};state.world.ledger??={version:1,revision:0,entries:[]};
 const ledger=state.world.ledger;
 ledger.version=1;ledger.revision=Math.max(0,Number(ledger.revision)||0);ledger.entries=Array.isArray(ledger.entries)?ledger.entries:[];
 return ledger
}

export function appendWorldLedger(state,event={},meta={}){
 const ledger=ensureWorldLedger(state),sourceEventId=clean(meta.sourceEventId||event.id,160);
 if(sourceEventId){const prior=ledger.entries.find(x=>x.sourceEventId===sourceEventId);if(prior)return prior}
 const type=clean(event.type||meta.type,80);if(!type)throw new Error("LEDGER_EVENT_TYPE_REQUIRED");
 const revision=ledger.revision+1,clock=state.world?.state?.clock||{};
 const entry={
  id:clean(meta.id,160)||uid("LEDGER"),
  revision,
  sourceEventId:sourceEventId||null,
  type,
  summary:clean(meta.summary||event.summary||event.customText||type,500),
  worldDay:Math.max(1,Number(meta.worldDay??event.day??state.world?.state?.day??clock.day)||1),
  worldMinute:Math.max(0,Number(meta.worldMinute??clock.totalMinutes)||0),
  visibility:VISIBILITY.has(String(meta.visibility||event.visibility||"INTERNAL"))?String(meta.visibility||event.visibility||"INTERNAL"):"INTERNAL",
  significance:SIGNIFICANCE.has(String(meta.significance||"ROUTINE").toUpperCase())?String(meta.significance||"ROUTINE").toUpperCase():"ROUTINE",
  causeRefs:uniq(meta.causeRefs,12),
  entityRefs:uniq(meta.entityRefs,16),
  historyRefs:uniq(meta.historyRefs,12),
  effects:(Array.isArray(meta.effects)?meta.effects:[]).slice(0,16).map(x=>structuredClone(x)),
  at:Number(meta.at||event.at)||Date.now()
 };
 ledger.entries.push(entry);ledger.entries=compactLedgerEntries(state,ledger.entries);ledger.revision=revision;
 return entry
}

export function seedLedgerFromEvents(state){
 const ledger=ensureWorldLedger(state);
 for(const event of Array.isArray(state.events)?state.events:[])appendWorldLedger(state,event,{sourceEventId:event.id,significance:event.type==="WORLD_CREATED"?"HISTORIC":"ROUTINE"});
 return ledger
}

export function ledgerSnapshot(state,{visibleOnly=false,limit=80}={}){
 const ledger=ensureWorldLedger(state),rows=visibleOnly?ledger.entries.filter(x=>["PLAYER_KNOWN","OBSERVABLE","RUMOR"].includes(x.visibility)):ledger.entries;
 return {version:ledger.version,revision:ledger.revision,entries:rows.slice(-Math.max(1,Math.min(200,Number(limit)||80))).map(x=>structuredClone(x))}
}

export function promoteLedgerEntryToHistory(state,entryId,details={}){
 const ledger=ensureWorldLedger(state),entry=ledger.entries.find(x=>x.id===entryId);if(!entry)return null;
 if(!["MAJOR","HISTORIC"].includes(entry.significance)&&details.force!==true)return null;
 state.world.history??=[];
 const existing=state.world.history.find(x=>x.ledgerRef===entry.id);if(existing)return existing;
 const history={
  id:clean(details.id,120)||uid("HIST"),
  order:state.world.history.length+1,
  era:clean(details.era,120)||"玩家時代",
  title:clean(details.title,120)||clean(entry.summary,120)||entry.type,
  category:clean(details.category,80)||"PLAYER_HISTORY",
  summary:clean(details.summary,500)||entry.summary,
  causes:uniq(details.causes?.length?details.causes:entry.causeRefs,6),
  legacies:uniq(details.legacies,8),
  regions:uniq(details.regions,6),
  factions:uniq(details.factions,6),
  discoverKeywords:uniq(details.discoverKeywords,10),
  ledgerRef:entry.id,canonical:true,mutable:false
 };
 state.world.history.push(history);entry.historyRefs=uniq([...(entry.historyRefs||[]),history.id],12);return history
}
