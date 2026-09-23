import {ensureFutureEngine,applyFuturePressure} from "./future-engine.js?v=54018";
import {recordKnowledgeEvidence,recomputeCorroboration,ensureKnowledgeMetadata} from "./knowledge-model.js?v=54018";
import {signalHistoryResearch} from "./history-depth.js?v=54018";

const clean=(v,max=400)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(rows,max=12)=>[...new Set((Array.isArray(rows)?rows:[]).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);
const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const SCOPES=["LOCAL","REGIONAL","NATIONAL","CONTINENTAL","WORLD"];

function validHistories(state){return new Set((state.world?.history||[]).map(x=>x.id).filter(Boolean))}
function verifiedSets(state){
 ensureKnowledgeMetadata(state);
 return {
  histories:new Set((state.knowledge||[]).filter(x=>x?.status==="VERIFIED"&&x.historyId).map(x=>x.historyId)),
  facts:new Set((state.knowledge||[]).filter(x=>x?.status==="VERIFIED"&&x.factId).map(x=>x.factId))
 }
}
function seedClues(history){
 const seeds=[...(history.discoverKeywords||[]),...(history.legacies||[])].map(x=>clean(x,160)).filter(Boolean);
 return [...new Set(seeds)].slice(0,6).map((hint,i)=>({id:"CLUE-"+history.id+"-"+(i+1),hint,status:"UNDISCOVERED",evidenceRefs:[]}))
}
function defaultSolutions(future){
 const refs=uniq(future.historicalLinks,4),rows=[];
 const add=(type,enabled,extra={})=>{if(enabled&&refs.length)rows.push({
  id:"SOL-"+future.id+"-"+type,type,requiresHistoryRefs:refs,requiresFactRefs:[],requireMode:"ANY",used:false,
  description:type==="PREVENT"?"利用已驗證的歷史知識，在事件越過不可逆界線前切斷關鍵因果。":
   type==="MITIGATE"?"利用歷史中的應對方法降低事件強度與外溢範圍。":
   type==="REDIRECT"?"利用歷史因果弱點，把事件影響導向較小範圍。":
   "利用已知因果主動推高事件壓力或提前其發展。",
  ...extra
 })};
 add("PREVENT",future.playerCanPrevent!==false,{pressureDelta:-30});
 add("MITIGATE",future.playerCanMitigate!==false,{pressureDelta:-15,intensityDelta:-15});
 add("REDIRECT",future.playerCanRedirect!==false,{pressureDelta:-8,scopeShift:-1});
 add("ACCELERATE",future.playerCanAccelerate!==false,{pressureDelta:15,intensityDelta:10});
 return rows
}
function normalizeSolutions(future){
 const valid=validHistories({world:{history:[]}});void valid;
 const source=Array.isArray(future.solutionSeeds)&&future.solutionSeeds.length?future.solutionSeeds:defaultSolutions(future);
 future.solutionSeeds=source.slice(0,8).map((x,i)=>({
  id:clean(x?.id,140)||("SOL-"+future.id+"-"+(i+1)),
  type:["PREVENT","MITIGATE","REDIRECT","ACCELERATE"].includes(String(x?.type||"").toUpperCase())?String(x.type).toUpperCase():"MITIGATE",
  requiresHistoryRefs:uniq(x?.requiresHistoryRefs?.length?x.requiresHistoryRefs:future.historicalLinks,4),
  requiresFactRefs:uniq(x?.requiresFactRefs,4),
  requireMode:String(x?.requireMode||"ANY").toUpperCase()==="ALL"?"ALL":"ANY",
  description:clean(x?.description,300)||"利用已驗證知識改變未來事件的發展。",
  pressureDelta:Math.max(-40,Math.min(25,Number(x?.pressureDelta)||0)),
  intensityDelta:Math.max(-25,Math.min(20,Number(x?.intensityDelta)||0)),
  scopeShift:Math.max(-2,Math.min(2,Math.round(Number(x?.scopeShift)||0))),
  used:x?.used===true,
  usedDay:Number(x?.usedDay)||null
 }));
 return future.solutionSeeds
}

export function ensureHistoryFutureLinks(state){
 state.world??={};state.world.history=Array.isArray(state.world.history)?state.world.history:[];
 const futures=ensureFutureEngine(state),valid=validHistories(state);
 for(const future of futures){
  future.historicalLinks=uniq(future.historicalLinks,8).filter(x=>valid.has(x));
  normalizeSolutions(future)
 }
 for(const history of state.world.history){
  if(!Array.isArray(history.clues)||!history.clues.length)history.clues=seedClues(history);
  else{
   const normalized=[];for(const [i,x] of history.clues.slice(0,8).entries()){
    if(!x||typeof x!=="object")continue;const hint=clean(x.hint||x.text,180);if(!hint)continue;
    x.id=clean(x.id,140)||("CLUE-"+history.id+"-"+(i+1));x.hint=hint;
    x.status=["UNDISCOVERED","DISCOVERED","CORROBORATED","VERIFIED"].includes(String(x.status||"").toUpperCase())?String(x.status).toUpperCase():"UNDISCOVERED";
    x.evidenceRefs=uniq(x.evidenceRefs,10);normalized.push(x)
   }history.clues=normalized
  }
  history.futureRefs=futures.filter(f=>f.historicalLinks?.includes(history.id)).map(f=>f.id).slice(0,8)
 }
 return {history:state.world.history,futures}
}

export function recordHistoryClueEvidence(state,input={}){
 ensureHistoryFutureLinks(state);
 const history=(state.world.history||[]).find(x=>x.id===clean(input.historyId,140));if(!history)return {ok:false,reason:"HISTORY_NOT_FOUND"};
 const clue=(history.clues||[]).find(x=>x.id===clean(input.clueId,140))||(history.clues||[])[0];if(!clue)return {ok:false,reason:"HISTORY_CLUE_NOT_FOUND"};
 const evidence=recordKnowledgeEvidence(state,{
  title:clean(input.title,120)||history.title,
  text:clean(input.text,500)||clue.hint,
  historyId:history.id,
  claimKey:clean(input.claimKey,180)||("history:"+history.id+":"+clue.id),
  evidenceType:String(input.evidenceType||"TESTIMONY").toUpperCase(),
  sourceRef:input.sourceRef||null,
  sourceIndependence:input.sourceIndependence??0.5,
  verifiedByEngine:input.verifiedByEngine===true,
  score:input.score||3
 });
 clue.evidenceRefs=uniq([...(clue.evidenceRefs||[]),evidence.id],10);
 const c=recomputeCorroboration(state,evidence.claimKey);
 clue.status=evidence.status==="VERIFIED"?"VERIFIED":c.beliefState==="CORROBORATED"?"CORROBORATED":"DISCOVERED";
 const deepening=signalHistoryResearch(state,history.id,{reason:"CLUE_"+clue.status});
 return {ok:true,historyId:history.id,clueId:clue.id,evidence,corroboration:c,deepening}
}

export function historyClueSnapshot(state,{knownOnly=false}={}){
 ensureHistoryFutureLinks(state);
 return (state.world.history||[]).map(h=>({
  historyId:h.id,title:h.title,futureRefs:[...(h.futureRefs||[])],
  clues:(h.clues||[]).filter(c=>!knownOnly||c.status!=="UNDISCOVERED").map(c=>({id:c.id,hint:c.hint,status:c.status,evidenceCount:(c.evidenceRefs||[]).length}))
 })).filter(x=>!knownOnly||x.clues.length)
}

export function unlockedFutureSolutions(state,futureId){
 ensureHistoryFutureLinks(state);
 const future=ensureFutureEngine(state).find(x=>x.id===futureId);if(!future)return [];
 const verified=verifiedSets(state);
 return (future.solutionSeeds||[]).map(s=>{
  const checks=[...(s.requiresHistoryRefs||[]).map(id=>verified.histories.has(id)),...(s.requiresFactRefs||[]).map(id=>verified.facts.has(id))];
  const unlocked=checks.length>0&&(s.requireMode==="ALL"?checks.every(Boolean):checks.some(Boolean));
  return {...structuredClone(s),unlocked}
 })
}

export function applyFutureSolution(state,futureId,solutionId,options={}){
 ensureHistoryFutureLinks(state);
 const future=ensureFutureEngine(state).find(x=>x.id===futureId);if(!future)return {ok:false,reason:"FUTURE_NOT_FOUND"};
 const solution=unlockedFutureSolutions(state,futureId).find(x=>x.id===solutionId);if(!solution)return {ok:false,reason:"SOLUTION_NOT_FOUND"};
 if(!solution.unlocked)return {ok:false,reason:"SOLUTION_LOCKED"};
 if(solution.used&&!options.allowRepeat)return {ok:false,reason:"SOLUTION_ALREADY_USED"};
 const allowed={PREVENT:future.playerCanPrevent!==false,MITIGATE:future.playerCanMitigate!==false,REDIRECT:future.playerCanRedirect!==false,ACCELERATE:future.playerCanAccelerate!==false};
 if(!allowed[solution.type])return {ok:false,reason:"SOLUTION_NOT_ALLOWED"};
 const before={pressure:future.pressure,intensity:future.intensity,impactScope:future.impactScope,stage:future.stage};
 if(solution.pressureDelta)applyFuturePressure(state,future.id,solution.pressureDelta,"HISTORY_SOLUTION:"+solution.id);
 if(solution.intensityDelta)future.intensity=Math.max(0,Math.min(100,Number(future.intensity||50)+solution.intensityDelta));
 if(solution.scopeShift){
  const idx=Math.max(0,SCOPES.indexOf(future.impactScope)),next=Math.max(0,Math.min(SCOPES.length-1,idx+solution.scopeShift));future.impactScope=SCOPES[next]
 }
 if(solution.type==="PREVENT"&&future.pressure<=15){future.stage="RESOLVED";future.preventedDay=Number(state.world?.state?.day)||1}
 const raw=(future.solutionSeeds||[]).find(x=>x.id===solution.id);if(raw){raw.used=true;raw.usedDay=Number(state.world?.state?.day)||1}
 const event={id:uid("EV"),type:"FUTURE_INTERVENTION",visibility:"PLAYER_KNOWN",futureId:future.id,solutionId:solution.id,action:solution.type,
  summary:clean(options.summary,300)||"你利用已驗證的歷史知識，改變了一個正在形成的世界事件。",day:Number(state.world?.state?.day)||1,at:Date.now()};
 state.events??=[];state.events.push(event);
 return {ok:true,futureId:future.id,solutionId:solution.id,action:solution.type,before,after:{pressure:future.pressure,intensity:future.intensity,impactScope:future.impactScope,stage:future.stage},event}
}
