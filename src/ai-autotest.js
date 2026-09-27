export * from "./ai-autotest-base.js?v=59008";
import * as base from "./ai-autotest-base.js?v=59008";
import {ensureTravelNetwork} from "./travel-engine.js?v=57025";

const rows=value=>Array.isArray(value)?value:[];
const clean=(value,max=180)=>String(value??"").trim().slice(0,max);
const stallCount=recent=>{let n=0;for(const row of rows(recent).slice().reverse()){if(row?.progressed!==false)break;n++}return n};
const recentActions=recent=>new Set(rows(recent).slice(-10).map(x=>clean(x?.action||x?.label||x,180).toLowerCase()).filter(Boolean));

function knownRouteDestination(state={}){
 const locations=rows(state.world?.registry?.locations),routes=rows(ensureTravelNetwork(state)?.routes),known=locations.filter(x=>x?.known===true&&x?.name&&!(Array.isArray(x.accessRequirements)&&x.accessRequirements.length)),byId=new Map(locations.map(x=>[String(x?.id||""),x]).filter(([id])=>id));
 if(!known.length||!routes.length)return null;
 const currentRaw=String(state.player?.location||state.world?.state?.location||""),current=locations.find(x=>String(x?.id||"")===currentRaw||String(x?.name||"")===currentRaw)||locations.find(x=>currentRaw&&(currentRaw.includes(String(x?.name||""))||String(x?.name||"").includes(currentRaw)));
 const candidates=[];
 for(const route of routes){
  if(!route||route.open===false)continue;
  const from=byId.get(String(route.fromId||"")),to=byId.get(String(route.toId||""));
  if(current){
   if(String(route.fromId||"")===String(current.id||"")&&to)candidates.push(to);
   if(String(route.toId||"")===String(current.id||"")&&from)candidates.push(from)
  }else{
   if(from)candidates.push(from);if(to)candidates.push(to)
  }
 }
 return candidates.find(x=>x?.known===true&&x?.name&&!(Array.isArray(x.accessRequirements)&&x.accessRequirements.length))||null
}

function groundedSuggestion(state={},recent=[]){
 const snapshot=base.playerVisibleAutotestSnapshot(state),seen=recentActions(recent),suggestions=rows(snapshot?.suggestions),fresh=suggestions.filter(x=>!seen.has(clean(x?.action||x?.label,180).toLowerCase()));
 return fresh.find(x=>x?.progression===true&&x?.targetId&&!["OBSERVE","GENERAL"].includes(String(x?.kind||"").toUpperCase()))
  ||fresh.find(x=>x?.progression===true&&!["OBSERVE","GENERAL"].includes(String(x?.kind||"").toUpperCase()))
  ||fresh.find(x=>!["OBSERVE","GENERAL"].includes(String(x?.kind||"").toUpperCase()))
  ||fresh[0]||suggestions.find(x=>x?.targetId)||suggestions[0]||null
}

function groundedRecovery(state={},recent=[],reason="AUTOTEST_STALL_RECOVERY"){
 const destination=knownRouteDestination(state);
 if(destination)return {mode:"free",suggestionIndex:null,action:`前往${destination.name}`,kind:"TRAVEL",progression:true,targetId:String(destination.id||"")||null,combatAction:null,reason,goalReached:false,goalEvidence:"",fallback:true,groundedRecovery:true};
 const snapshot=base.playerVisibleAutotestSnapshot(state),suggestion=groundedSuggestion(state,recent);
 if(suggestion){const index=rows(snapshot.suggestions).indexOf(suggestion);return {mode:"suggestion",suggestionIndex:Math.max(0,index),action:clean(suggestion.action||suggestion.label,180),kind:clean(suggestion.kind,30),progression:suggestion.progression===true,targetId:suggestion.targetId||null,combatAction:null,reason,goalReached:false,goalEvidence:"",fallback:true,groundedRecovery:true}}
 return {...base.deterministicAutotestDecision(snapshot,recent,reason),kind:"OBSERVE",targetId:null,progression:false,reason:`${reason}; no grounded route or suggestion`,groundedRecovery:false}
}

function needsGroundedRecovery(decision,recent=[]){
 const stall=stallCount(recent),kind=String(decision?.kind||"").toUpperCase();
 if(stall<3)return false;
 if(kind==="TRAVEL"&&!decision?.targetId)return true;
 if(stall>=5&&decision?.mode==="free"&&decision?.progression===true&&!decision?.targetId)return true;
 return stall>=7
}

export function firstButtonAutotestDecision(state={},recent=[]){
 const decision=base.firstButtonAutotestDecision(state,recent);
 if(!needsGroundedRecovery(decision,recent))return decision;
 const recovered=groundedRecovery(state,recent,"FIRST_BUTTON_STALL_RECOVERY");
 return {...recovered,firstButton:true,firstButtonOverride:true}
}

export function normalizeAutotestDecision(value,snapshot={},recent=[]){
 const decision=base.normalizeAutotestDecision(value,snapshot,recent);
 let parsed=value;
 if(typeof value==="string"){const raw=value.trim().replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();try{parsed=JSON.parse(raw)}catch{parsed=null}}
 if(decision?.mode==="free"&&parsed&&typeof parsed==="object")return {...decision,kind:clean(parsed.kind||decision.kind,30),progression:parsed.progression===true,targetId:clean(parsed.targetId,100)||decision.targetId||null};
 return decision
}

export async function decideAutotestAction(state,options={}){
 const recent=rows(options?.recentActions),strategy=options?.playStrategy;
 if(strategy==="FIRST_BUTTON")return firstButtonAutotestDecision(state,recent);
 let decision=await base.decideAutotestAction(state,options);
 if(needsGroundedRecovery(decision,recent)){
  const recovered=groundedRecovery(state,recent,"AUTOTEST_STALL_RECOVERY");
  decision={...recovered,goalReached:decision?.goalReached===true,goalEvidence:decision?.goalEvidence||""}
 }
 return decision
}

export function buildAutotestReport(input={}){
 const report=base.buildAutotestReport(input),telemetry=rows(input?.telemetry),latestReady=Math.max(0,...telemetry.filter(e=>e?.type==="UI_TRANSLATION_READY").map(e=>Number(e.at)||0));
 const ignorable=issue=>{
  const type=String(issue?.type||""),message=String(issue?.message||"");
  if(type==="TELEMETRY_LOCALE_TRANSLATION_FAILED"&&latestReady>0)return true;
  if(/AI_RATE_LIMIT_BACKPRESSURE/.test(message)&&["TELEMETRY_AUTOTEST_RUNTIME_EXPANSION_FAILED","TELEMETRY_STATE_SYNC_AI_FAILED"].includes(type))return true;
  return false
 };
 const before=rows(report.issues),kept=before.filter(x=>!ignorable(x)),removed=before.length-kept.length;
 if(removed){report.issues=kept;report.summary.issueDetailCount=Math.max(0,Number(report.summary.issueDetailCount||0)-removed);report.summary.issues=Math.max(0,Number(report.summary.issues||0)-removed);report.summary.recoveredTelemetryIssues=(Number(report.summary.recoveredTelemetryIssues)||0)+removed}
 return report
}
