const obj=v=>v&&typeof v==="object"&&!Array.isArray(v);
const clean=(v,max=600)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>clean(x,140)).filter(Boolean))];

export const WORLD_QUALITY_DIMENSIONS=[
 "internalConsistency","originality","worldDepth","historyIntegration","geography","societyCulture",
 "magicSystem","factions","characters","futureEvents","playability","knowledgeBoundary"
];

export function createGenerationDiagnostics(){
 return {version:1,startedAt:Date.now(),stages:{}}
}

export function recordGenerationStage(diagnostics,stage,data={}){
 if(!obj(diagnostics)||!clean(stage,60))return diagnostics;
 diagnostics.stages??={};
 const previous=obj(diagnostics.stages[stage])?diagnostics.stages[stage]:{};
 const source=["AI","FALLBACK","FAILED"].includes(data.source)?data.source:(previous.source||"AI");
 diagnostics.stages[stage]={
  ...previous,source,
  reason:clean(data.reason,240)||previous.reason||"",
  latencyMs:Math.max(0,Math.round(Number(data.latencyMs??previous.latencyMs)||0)),
  attempts:Math.max(1,Math.round(Number(data.attempts??previous.attempts)||1)),
  fallbackUsed:data.fallbackUsed===true||source==="FALLBACK"
 };
 return diagnostics
}

export function finalizeGenerationDiagnostics(diagnostics){
 const d=obj(diagnostics)?structuredClone(diagnostics):createGenerationDiagnostics(),rows=Object.values(d.stages||{});
 const aiSucceeded=rows.filter(x=>x.source==="AI").length,fallbackCount=rows.filter(x=>x.source==="FALLBACK").length,failedCount=rows.filter(x=>x.source==="FAILED").length;
 d.finishedAt=Date.now();
 d.totalLatencyMs=Math.max(0,d.finishedAt-(Number(d.startedAt)||d.finishedAt));
 d.summary={stageCount:rows.length,aiSucceeded,fallbackCount,failedCount};
 d.quality=failedCount?"FAILED":fallbackCount>=4?"SEVERELY_DEGRADED":fallbackCount?"DEGRADED":"HEALTHY";
 return d
}

const statusFor=score=>score>=80?"PASS":score>=70?"MINOR_REPAIR":score>=50?"REPAIR_REQUIRED":"MAJOR_REPAIR";

export function normalizeWorldEvaluation(input,meta={}){
 const raw=obj(input)?input:{},dimensions={};
 for(const key of WORLD_QUALITY_DIMENSIONS)dimensions[key]=Math.round(clamp(raw.dimensions?.[key],0,100));
 const supplied=Number(raw.overall),overall=Number.isFinite(supplied)?Math.round(clamp(supplied,0,100)):Math.round(WORLD_QUALITY_DIMENSIONS.reduce((n,k)=>n+dimensions[k],0)/WORLD_QUALITY_DIMENSIONS.length);
 const findings=(Array.isArray(raw.findings)?raw.findings:[]).slice(0,10).map((x,i)=>({
  id:clean(x?.id,80)||"FIND-"+(i+1),
  severity:["LOW","MEDIUM","HIGH","CRITICAL"].includes(String(x?.severity||"").toUpperCase())?String(x.severity).toUpperCase():"MEDIUM",
  targetType:clean(x?.targetType,80)||"WORLD",
  targetIds:uniq(x?.targetIds).slice(0,6),
  problem:clean(x?.problem,500),
  evidence:(Array.isArray(x?.evidence)?x.evidence:[]).map(v=>clean(v,300)).filter(Boolean).slice(0,4),
  recommendation:clean(x?.recommendation,500),
  requiresRegeneration:x?.requiresRegeneration!==false
 })).filter(x=>x.problem||x.recommendation);
 return {
  overall,status:statusFor(overall),dimensions,findings,
  repairTargets:uniq(findings.filter(x=>x.requiresRegeneration).map(x=>x.targetType)),
  source:clean(meta.source,30)||clean(raw.source,30)||"AI",
  reviewedAt:Date.now(),reason:clean(meta.reason,240)||clean(raw.reason,240)
 }
}

const genericText=text=>/任何超常力量|逐步出現可被居民察覺的變化|第\d+次波動|當地引路人|異界醒轉地|與世界主題.*代價/.test(String(text||""));

export function fallbackWorldEvaluation(candidate,diagnostics,reason="AI_CRITIC_UNAVAILABLE"){
 const d=finalizeGenerationDiagnostics(diagnostics),fallbacks=Number(d.summary?.fallbackCount)||0,findings=[];let score=92-Math.min(48,fallbacks*8);
 const magic=clean(candidate?.worldBible?.magicCost,500);
 if(!magic||genericText(magic)){score-=12;findings.push({severity:"HIGH",targetType:"MAGIC_SYSTEM",problem:"魔法代價仍然過於抽象或模板化。",recommendation:"建立可執行的具體代價、觸發條件與可觀察後果。",requiresRegeneration:true})}
 const timeline=Array.isArray(candidate?.worldTimeline)?candidate.worldTimeline:[],effects=timeline.map(x=>clean(x?.observableEffect,500)).filter(Boolean);
 if(effects.length>1&&new Set(effects).size<Math.ceil(effects.length*.6)){score-=14;findings.push({severity:"HIGH",targetType:"FUTURE_EVENTS",problem:"未來事件的可觀察效果高度重複，缺乏事件性。",recommendation:"把每個事件改成具體、可發生、可造成不同後果的世界事件。",requiresRegeneration:true})}
 const g=candidate?.generation||{},linked=[...(g.locations||[]),...(g.npcs||[]),...(g.factions||[])];
 if(linked.length&&linked.filter(x=>Array.isArray(x?.historyRefs)&&x.historyRefs.length).length<linked.length){score-=10;findings.push({severity:"HIGH",targetType:"PROVENANCE",problem:"部分新實體沒有持久化 historyRefs。",recommendation:"為 Location、NPC、Faction 保存有效 historyRefs，避免只靠 prose 推理來源。",requiresRegeneration:true})}
 const opening=clean(candidate?.openingHook,1000),worldName=clean(candidate?.worldName,100),start=clean(candidate?.worldBible?.startingLocation,100),theme=clean(candidate?.worldTheme,200);
 if((worldName&&opening.includes(worldName))||(start&&opening.includes(start))||(theme&&opening.includes(theme))){score-=16;findings.push({severity:"CRITICAL",targetType:"KNOWLEDGE_BOUNDARY",problem:"零知識開場洩漏 Canon 名稱或 Director-level 主題。",recommendation:"只保留角色可直接感知的聲音、光線、氣味、觸感與可見變化。",requiresRegeneration:true})}
 score=Math.round(clamp(score,0,100));
 const dimensions=Object.fromEntries(WORLD_QUALITY_DIMENSIONS.map(k=>[k,score]));
 if(findings.some(x=>x.targetType==="MAGIC_SYSTEM"))dimensions.magicSystem=Math.max(20,score-18);
 if(findings.some(x=>x.targetType==="FUTURE_EVENTS"))dimensions.futureEvents=Math.max(20,score-22);
 if(findings.some(x=>x.targetType==="PROVENANCE"))dimensions.historyIntegration=Math.max(25,score-15);
 if(findings.some(x=>x.targetType==="KNOWLEDGE_BOUNDARY"))dimensions.knowledgeBoundary=Math.max(10,score-30);
 return normalizeWorldEvaluation({overall:score,dimensions,findings},{source:"FALLBACK",reason})
}

function mergeDescriptive(base,patch,protectedKeys=[]){
 if(!obj(patch))return structuredClone(base);
 const out={...structuredClone(base),...structuredClone(patch)};
 for(const key of protectedKeys)if(base?.[key]!==undefined)out[key]=structuredClone(base[key]);
 return out
}

export function applyWorldRepairPatch(candidate,input){
 const out=structuredClone(candidate||{}),patch=obj(input?.patch)?input.patch:(obj(input)?input:{});
 for(const key of ["summary","openingHook"])if(clean(patch[key],1200))out[key]=clean(patch[key],1200);
 for(const key of ["publicFacts","hiddenFacts","suggestions"])if(Array.isArray(patch[key])&&patch[key].length)out[key]=structuredClone(patch[key]);
 if(obj(patch.worldBible)){
  out.worldBible??={};
  for(const key of ["era","centralConflict","magicCost","ancientTruth","currentCrisis","tone","civilization","communication","weatherSystem"])if(patch.worldBible[key]!=null)out.worldBible[key]=structuredClone(patch.worldBible[key])
 }
 if(Array.isArray(patch.worldTimeline)&&Array.isArray(out.worldTimeline)){
  out.worldTimeline=out.worldTimeline.map((base,i)=>mergeDescriptive(base,patch.worldTimeline[i],["id","earliestDay","latestDay","triggerDay","baseTriggerDay","links","status","triggeredDay"]))
 }
 if(obj(patch.generation)&&obj(out.generation)){
  const protectedByGroup={
   locations:["id","name","region","known","historyRefs"],
   npcs:["id","name","locationId","locationName","factionId","factionName","knowledgeScope","historyRefs","known"],
   factions:["id","name","locationName","historyRefs","known"],
   sideQuests:["id","title","locationName","npcName","factionName","historyRefs","known"]
  };
  for(const group of Object.keys(protectedByGroup)){
   if(Array.isArray(out.generation[group])&&Array.isArray(patch.generation[group]))out.generation[group]=out.generation[group].map((base,i)=>mergeDescriptive(base,patch.generation[group][i],protectedByGroup[group]))
  }
 }
 return out
}

export function validateExpansionProvenance(state,generation){
 const historyIds=new Set((state?.world?.history||[]).map(x=>clean(x?.id,120)).filter(Boolean)),issues=[];
 if(!obj(generation))return {valid:false,issues:["GENERATION_MISSING"]};
 const check=(rows,label,required=true)=>{for(const [i,row] of (Array.isArray(rows)?rows:[]).entries()){const refs=uniq(row?.historyRefs);if(required&&historyIds.size&&!refs.length)issues.push(label+"_"+i+"_HISTORY_REF_REQUIRED");if(refs.some(id=>!historyIds.has(id)))issues.push(label+"_"+i+"_HISTORY_REF_INVALID")}};
 check(generation.locations,"LOCATION");check(generation.npcs,"NPC");check(generation.factions,"FACTION");check(generation.sideQuests,"QUEST",false);
 return {valid:issues.length===0,issues:[...new Set(issues)]}
}

export function worldHealthSnapshot(state){
 const r=state?.world?.registry||{},historyIds=new Set((state?.world?.history||[]).map(x=>clean(x?.id,120)).filter(Boolean)),issues=[];let score=Number(state?.world?.quality?.overall);
 if(!Number.isFinite(score))score=90;
 for(const [label,list] of [["LOCATION",r.locations||[]],["NPC",r.npcs||[]],["FACTION",r.factions||[]]])for(const x of list){
  const refs=uniq(x?.historyRefs);
  if(historyIds.size&&!refs.length){score-=4;issues.push(label+"_HISTORY_REF_MISSING:"+clean(x?.name,80))}
  else if(refs.some(id=>!historyIds.has(id))){score-=7;issues.push(label+"_HISTORY_REF_INVALID:"+clean(x?.name,80))}
 }
 const timeline=state?.world?.timeline||[],effects=timeline.map(x=>clean(x?.observableEffect,500)).filter(Boolean);
 if(effects.length>2&&new Set(effects).size<Math.ceil(effects.length*.6)){score-=10;issues.push("TIMELINE_EFFECTS_REPETITIVE")}
 score=Math.round(clamp(score,0,100));
 return {score,status:statusFor(score),issues:issues.slice(0,16),checkedAt:Date.now()}
}

export function worldEvolutionNeed(state){
 state.world.evolution??={lastMinute:-9999,lastVersion:0,count:0,lastReason:""};
 const evo=state.world.evolution,minutes=Number(state.world?.state?.clock?.totalMinutes)||0,elapsed=minutes-(Number(evo.lastMinute)||0),health=worldHealthSnapshot(state),reasons=[];
 if(state.world?.state?.flags?.requestExpansion)reasons.push("PLAYER_REQUEST");
 if((state.world?.registry?.locations||[]).length<2)reasons.push("WORLD_EDGE_UNDERDEFINED");
 if(health.score<80&&elapsed>=120)reasons.push("WORLD_QUALITY_DROP");
 if(Number(state.world?.version)>Number(evo.lastVersion||0)&&elapsed>=360)reasons.push("PERIODIC_CANON_REVIEW");
 return {required:reasons.length>0,reasons,reason:reasons.join("+")||"NONE",health}
}

export function markWorldEvolution(state,meta={}){
 state.world.evolution??={lastMinute:0,lastVersion:0,count:0,lastReason:""};
 const evo=state.world.evolution;
 evo.lastMinute=Number(state.world?.state?.clock?.totalMinutes)||0;
 evo.lastVersion=Number(state.world?.version)||0;
 evo.count=Math.max(0,Number(evo.count)||0)+1;
 evo.lastReason=clean(meta.reason,240)||"WORLD_EVOLUTION";
 evo.lastQuality=worldHealthSnapshot(state);
 return evo
}
