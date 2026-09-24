import {ensureKnowledgeMetadata} from "./knowledge-model.js?v=56000";
import {ensureFutureEngine} from "./future-engine.js?v=56000";

const clean=(v,max=400)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(rows,max=12)=>[...new Set((Array.isArray(rows)?rows:[]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);
const uid=p=>p+"-"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
export const ITEM_KNOWLEDGE_STAGES=Object.freeze(["UNKNOWN","OBSERVED","TYPE_IDENTIFIED","ORIGIN_SUSPECTED","HISTORY_IDENTIFIED","TRUE_PROVENANCE_KNOWN","FULL_SIGNIFICANCE_KNOWN"]);
const STAGE_RANK=Object.fromEntries(ITEM_KNOWLEDGE_STAGES.map((x,i)=>[x,i]));

function historyIds(state){return new Set((state.world?.history||[]).map(x=>x.id).filter(Boolean))}
function futureIds(state){return new Set(ensureFutureEngine(state).map(x=>x.id).filter(Boolean))}
function normalizeSeed(raw={},i=0){
 return {
  id:clean(raw.id,140)||("HERITAGE-SEED-"+(i+1)),
  kind:["MATERIAL","WEAPON_CULTURE","EQUIPMENT_CULTURE","DAILY_GOODS","KNOWLEDGE_MEDIA","RELIC","FUTURE_RELEVANT_ITEM"].includes(String(raw.kind||"").toUpperCase())?String(raw.kind).toUpperCase():"RELIC",
  label:clean(raw.label,120)||"未具現化遺產",
  culture:clean(raw.culture,120),
  era:clean(raw.era,120),
  historyRefs:uniq(raw.historyRefs,6),
  futureRefs:uniq(raw.futureRefs,6),
  materializedItemIds:uniq(raw.materializedItemIds,8),
  status:["UNMATERIALIZED","RESERVED","MATERIALIZED"].includes(String(raw.status||"").toUpperCase())?String(raw.status).toUpperCase():"UNMATERIALIZED"
 }
}
export function ensureItemHeritage(state){
 state.world??={};state.world.itemHeritage??={version:1,materials:[],weaponCultures:[],equipmentCultures:[],dailyGoods:[],knowledgeMedia:[],seeds:[]};
 const h=state.world.itemHeritage;h.version=1;
 for(const key of ["materials","weaponCultures","equipmentCultures","dailyGoods","knowledgeMedia"])h[key]=Array.isArray(h[key])?h[key].slice(0,24):[];
 h.seeds=Array.isArray(h.seeds)?h.seeds.map(normalizeSeed).slice(0,80):[];
 const existing=new Set(h.seeds.map(x=>x.id));
 for(const history of state.world?.history||[]){
  const id="HERITAGE-HISTORY-"+history.id;if(existing.has(id))continue;
  h.seeds.push(normalizeSeed({id,kind:"RELIC",label:"與「"+history.title+"」相關的遺物或文獻",era:history.era,historyRefs:[history.id]},h.seeds.length));existing.add(id)
 }
 for(const future of ensureFutureEngine(state)){
  if(future.legacyMirror)continue;
  const id="HERITAGE-FUTURE-"+future.id;if(existing.has(id))continue;
  h.seeds.push(normalizeSeed({id,kind:"FUTURE_RELEVANT_ITEM",label:"可影響未來事件的物證或工具",historyRefs:future.historicalLinks||[],futureRefs:[future.id]},h.seeds.length));existing.add(id)
 }
 h.seeds=h.seeds.slice(0,80);return h
}
export function registerItemHeritageProfile(state,input={}){
 const h=ensureItemHeritage(state),list=(key,max=20)=>(Array.isArray(input[key])?input[key]:[]).slice(0,max).map((x,i)=>({
  id:clean(x?.id,140)||("HER-"+key+"-"+(h[key].length+i+1)),name:clean(x?.name||x?.label,120),description:clean(x?.description,320),culture:clean(x?.culture,120),era:clean(x?.era,120),historyRefs:uniq(x?.historyRefs,6)
 })).filter(x=>x.name);
 for(const key of ["materials","weaponCultures","equipmentCultures","dailyGoods","knowledgeMedia"]){
  const rows=list(key);for(const row of rows)if(!h[key].some(x=>x.id===row.id||x.name===row.name))h[key].push(row);h[key]=h[key].slice(0,24)
 }
 for(const raw of Array.isArray(input.seeds)?input.seeds:[]){const row=normalizeSeed(raw,h.seeds.length);if(!h.seeds.some(x=>x.id===row.id))h.seeds.push(row)}
 h.seeds=h.seeds.slice(0,80);return h
}
function normalizeProvenance(state,p={}){
 const histories=historyIds(state),futures=futureIds(state);
 return {
  culture:clean(p.culture,120),era:clean(p.era,120),craftTradition:clean(p.craftTradition,160),
  originalOwnerId:clean(p.originalOwnerId,140)||null,originalFactionId:clean(p.originalFactionId,140)||null,
  historyRefs:uniq(p.historyRefs,6).filter(x=>histories.has(x)),
  futureRefs:uniq(p.futureRefs,6).filter(x=>futures.has(x)),
  personalLinks:uniq(p.personalLinks,8),trueOrigin:clean(p.trueOrigin,360),fullSignificance:clean(p.fullSignificance,500)
 }
}
export function ensureItemStory(state,item){
 if(!item||typeof item!=="object")return null;ensureItemHeritage(state);
 item.heritage??={};item.heritage.seedId=clean(item.heritage.seedId,140)||null;
 item.heritage.provenance=normalizeProvenance(state,item.heritage.provenance||{
  culture:item.culture,era:item.era,historyRefs:item.historyRefs,futureRefs:item.futureRefs,originalOwnerId:item.originalOwnerId,originalFactionId:item.originalFactionId,personalLinks:item.personalLinks
 });
 const stage=String(item.heritage.knowledgeStage||"UNKNOWN").toUpperCase();item.heritage.knowledgeStage=STAGE_RANK[stage]!=null?stage:"UNKNOWN";
 item.heritage.evidenceRefs=uniq(item.heritage.evidenceRefs,16);item.heritage.observations=uniq(item.heritage.observations,12);
 return item.heritage
}
function advance(item,stage,evidenceRef=""){
 const h=item.heritage,current=STAGE_RANK[h.knowledgeStage]||0,target=STAGE_RANK[stage]||0;if(target>current)h.knowledgeStage=stage;
 if(evidenceRef)h.evidenceRefs=uniq([...(h.evidenceRefs||[]),evidenceRef],16);return h.knowledgeStage
}
function verifiedHistoryRefs(state,item){
 ensureKnowledgeMetadata(state);const verified=new Set((state.knowledge||[]).filter(x=>x.status==="VERIFIED"&&x.historyId).map(x=>x.historyId));
 return (item.heritage?.provenance?.historyRefs||[]).filter(x=>verified.has(x))
}
function verifiedEvidenceCount(state,item){
 ensureKnowledgeMetadata(state);const refs=new Set(item.heritage?.evidenceRefs||[]);
 return (state.knowledge||[]).filter(x=>refs.has(x.id)&&x.status==="VERIFIED").length
}
export function advanceItemKnowledge(state,itemId,input={}){
 const item=(state.inventory||[]).find(x=>x.id===itemId||x.name===itemId);if(!item)return {ok:false,reason:"ITEM_NOT_OWNED"};
 ensureItemStory(state,item);const before=item.heritage.knowledgeStage,method=String(input.method||"OBSERVE").toUpperCase(),ref=clean(input.evidenceRef,140);
 if(method==="OBSERVE")advance(item,"OBSERVED",ref);
 if(item.identified!==false||["IDENTIFY_TYPE","CRAFT_EXAM","APPRAISE"].includes(method))advance(item,"TYPE_IDENTIFIED",ref);
 const p=item.heritage.provenance;if((p.culture||p.era||p.craftTradition)&&["CRAFT_EXAM","APPRAISE","RESEARCH","NPC_TESTIMONY"].includes(method))advance(item,"ORIGIN_SUSPECTED",ref);
 const verifiedHistory=verifiedHistoryRefs(state,item);if(verifiedHistory.length)advance(item,"HISTORY_IDENTIFIED",ref);
 if(verifiedHistory.length&&verifiedEvidenceCount(state,item)>=1&&["RESEARCH","ARTIFACT_COMPARE","DOCUMENT_COMPARE","NPC_TESTIMONY","APPRAISE"].includes(method))advance(item,"TRUE_PROVENANCE_KNOWN",ref);
 const verifiedFuture=(p.futureRefs||[]).some(fid=>ensureFutureEngine(state).some(f=>f.id===fid&&(f.solutionSeeds||[]).some(s=>s.used===true)));
 if(item.heritage.knowledgeStage==="TRUE_PROVENANCE_KNOWN"&&(verifiedFuture||input.significanceVerified===true))advance(item,"FULL_SIGNIFICANCE_KNOWN",ref);
 return {ok:true,itemId:item.id,before,stage:item.heritage.knowledgeStage,historyRefs:verifiedHistory}
}
export function materializeHeritageSeed(state,seedId,itemId){
 const h=ensureItemHeritage(state),seed=h.seeds.find(x=>x.id===seedId);if(!seed)return null;seed.materializedItemIds=uniq([...(seed.materializedItemIds||[]),itemId],8);seed.status="MATERIALIZED";return seed
}
export function itemStorySnapshot(state,itemId,{director=false}={}){
 const item=(state.inventory||[]).find(x=>x.id===itemId||x.name===itemId);if(!item)return null;ensureItemStory(state,item);
 const h=item.heritage,p=h.provenance,rank=STAGE_RANK[h.knowledgeStage]||0,out={itemId:item.id,name:item.name,knowledgeStage:h.knowledgeStage};
 if(rank>=1)out.observedDescription=item.description;
 if(rank>=2)out.category=item.category;
 if(rank>=3)out.suspectedOrigin={culture:p.culture||null,era:p.era||null,craftTradition:p.craftTradition||null};
 if(rank>=4)out.historyRefs=[...p.historyRefs];
 if(rank>=5)out.provenance={originalOwnerId:p.originalOwnerId,originalFactionId:p.originalFactionId,trueOrigin:p.trueOrigin||null};
 if(rank>=6)out.fullSignificance=p.fullSignificance||null;
 if(director)out.directorProvenance=structuredClone(p);
 return out
}

export function registerHistoryRelicSeeds(state,historyId,seeds=[]){
 const history=(state.world?.history||[]).find(x=>x.id===historyId);if(!history)return [];
 const h=ensureItemHeritage(state),out=[];
 for(const seed of (Array.isArray(seeds)?seeds:[]).slice(0,8)){
  const label=clean(seed?.label,120);if(!label)continue;
  const id=clean(seed?.id,140)||("HERITAGE-DEEP-"+history.id+"-"+(h.seeds.length+1));
  if(h.seeds.some(x=>x.id===id))continue;
  const row=normalizeSeed({id,kind:"RELIC",label,culture:seed.culture,era:seed.era||history.era,historyRefs:[history.id],futureRefs:seed.futureRefs,status:"UNMATERIALIZED"},h.seeds.length);
  row.description=clean(seed.description,400);row.significance=clean(seed.significance,500);row.clueRefs=uniq(seed.clueRefs,8);
  h.seeds.push(row);out.push(row.id)
 }
 h.seeds=h.seeds.slice(0,80);return out
}
