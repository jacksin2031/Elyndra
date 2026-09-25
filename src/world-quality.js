import {ensureVisibilityLocks,backgroundMutableFields,canBackgroundMutateEntity} from "./visibility-lock.js?v=57015";
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
 const d=obj(diagnostics)?structuredClone(diagnostics):createGenerationDiagnostics(),entries=Object.entries(d.stages||{}),rows=entries.map(([,row])=>row);
 const aiSucceeded=rows.filter(x=>x.source==="AI").length,fallbackCount=rows.filter(x=>x.source==="FALLBACK").length,failedCount=rows.filter(x=>x.source==="FAILED").length;
 const recovered=new Set(d.recovery?.succeeded===true&&Array.isArray(d.recovery?.recoveredStages)?d.recovery.recoveredStages:[]);
 const recoveredFallbackCount=entries.filter(([stage,row])=>row?.source==="FALLBACK"&&recovered.has(stage)).length;
 const unrecoveredFallbackCount=Math.max(0,fallbackCount-recoveredFallbackCount);
 d.finishedAt=Date.now();
 d.totalLatencyMs=Math.max(0,d.finishedAt-(Number(d.startedAt)||d.finishedAt));
 d.summary={stageCount:rows.length,aiSucceeded,fallbackCount,recoveredFallbackCount,unrecoveredFallbackCount,failedCount};
 d.quality=failedCount?"FAILED":unrecoveredFallbackCount>=4?"SEVERELY_DEGRADED":unrecoveredFallbackCount?"DEGRADED":fallbackCount?"RECOVERED":"HEALTHY";
 return d
}

const statusFor=score=>score>=80?"PASS":score>=70?"MINOR_REPAIR":score>=50?"REPAIR_REQUIRED":"MAJOR_REPAIR";

export function normalizeWorldEvaluation(input,meta={}){
 const raw=obj(input)?input:{},dimensions={},provided=[];
 const hasOverall=raw.overall!==undefined&&raw.overall!==null&&raw.overall!==""&&Number.isFinite(Number(raw.overall));
 const suppliedOverall=hasOverall?Math.round(clamp(Number(raw.overall),0,100)):null;
 for(const key of WORLD_QUALITY_DIMENSIONS){
  const value=raw.dimensions?.[key],valid=value!==undefined&&value!==null&&value!==""&&Number.isFinite(Number(value));
  if(valid)provided.push(Math.round(clamp(Number(value),0,100)))
 }
 const dimensionFallback=suppliedOverall??(provided.length?Math.round(provided.reduce((n,v)=>n+v,0)/provided.length):0);
 for(const key of WORLD_QUALITY_DIMENSIONS){
  const value=raw.dimensions?.[key],valid=value!==undefined&&value!==null&&value!==""&&Number.isFinite(Number(value));
  dimensions[key]=valid?Math.round(clamp(Number(value),0,100)):dimensionFallback
 }
 const overall=suppliedOverall??Math.round(WORLD_QUALITY_DIMENSIONS.reduce((n,k)=>n+dimensions[k],0)/WORLD_QUALITY_DIMENSIONS.length);
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

const FALLBACK_STAGE_FINDINGS={
 IDENTITY:{targetType:"WORLD_IDENTITY",problem:"世界身份階段使用 fallback，原創性與主題辨識度可能不足。",recommendation:"保留 Seed Contract，重新具體化世界名稱、主題與 premise。"},
 CORE_RULES:{targetType:"MAGIC_SYSTEM",problem:"核心規則階段使用 fallback，世界主題未必真正落入魔法、文明與危機規則。",recommendation:"令 worldTheme 直接驅動可執行魔法代價、文明制度、通訊限制與 currentCrisis。"},
 CORE_ANCHOR:{targetType:"WORLD_CORE",problem:"開局 Anchor 使用 fallback，地名、Weather Canon 或公開／秘密設定可能模板化。",recommendation:"在不改 Seed Contract 下重新具體化開局地理、天候與世界事實。"},
 HISTORY:{targetType:"HISTORY_INTEGRATION",problem:"歷史階段使用 fallback，過去事件可能只係模板因果。",recommendation:"保留 HIST id 與次序，重寫成直接解釋今日制度、危機與地方生活的具體歷史。"},
 GEOGRAPHY:{targetType:"GEOGRAPHY",problem:"地理階段使用 fallback，開局地貌與環境敘述可能模板化。",recommendation:"保留 Anchor 地點關係，重寫具體地貌、環境痕跡與符合 Origin knowledge boundary 的 openingHook。"},
 FUTURE:{targetType:"FUTURE_EVENTS",problem:"未來 Timeline 使用 fallback，事件可能過於通用。",recommendation:"保留事件 id、日期窗口與 links，重寫成源自本世界歷史與危機的具體事件。"},
 SOCIETY:{targetType:"SOCIETY_CULTURE",problem:"地方社會階段使用 fallback，文化、交易與勢力可能模板化。",recommendation:"利用已鎖定歷史與環境重寫地方文化、經濟與勢力。"},
 CAST:{targetType:"CHARACTERS",problem:"開局人物階段使用 fallback，NPC 或支線可能係通用佔位內容。",recommendation:"保留世界關係與 historyRefs，重寫具體人物、動機與支線。"}
};
function unresolvedFallbackStageFindings(d){
 const recovered=new Set(Array.isArray(d?.recovery?.recoveredStages)?d.recovery.recoveredStages:[]);
 return Object.entries(d?.stages||{}).filter(([stage,row])=>row?.source==="FALLBACK"&&!recovered.has(stage)).map(([stage])=>({
  severity:"HIGH",...(FALLBACK_STAGE_FINDINGS[stage]||{targetType:"WORLD",problem:stage+" 使用 fallback。",recommendation:"以現有 Canon 為基礎重新具體化該部分。"}),requiresRegeneration:true
 }))
}
export function fallbackWorldEvaluation(candidate,diagnostics,reason="AI_CRITIC_UNAVAILABLE"){
 const d=finalizeGenerationDiagnostics(diagnostics),stageFindings=unresolvedFallbackStageFindings(d),fallbacks=stageFindings.length,findings=[...stageFindings];let score=92-Math.min(48,fallbacks*8);
 const magic=clean(candidate?.worldBible?.magicCost,500);
 if(!magic||genericText(magic)){score-=12;findings.push({severity:"HIGH",targetType:"MAGIC_SYSTEM",problem:"魔法代價仍然過於抽象或模板化。",recommendation:"建立可執行的具體代價、觸發條件與可觀察後果。",requiresRegeneration:true})}
 const timeline=Array.isArray(candidate?.worldTimeline)?candidate.worldTimeline:[],effects=timeline.map(x=>clean(x?.observableEffect,500)).filter(Boolean);
 if(effects.length>1&&new Set(effects).size<Math.ceil(effects.length*.6)){score-=14;findings.push({severity:"HIGH",targetType:"FUTURE_EVENTS",problem:"未來事件的可觀察效果高度重複，缺乏事件性。",recommendation:"把每個事件改成具體、可發生、可造成不同後果的世界事件。",requiresRegeneration:true})}
 const g=candidate?.generation||{},linked=[...(g.locations||[]),...(g.npcs||[]),...(g.factions||[])];
 if(linked.length&&linked.filter(x=>Array.isArray(x?.historyRefs)&&x.historyRefs.length).length<linked.length){score-=10;findings.push({severity:"HIGH",targetType:"PROVENANCE",problem:"部分新實體沒有持久化 historyRefs。",recommendation:"為 Location、NPC、Faction 保存有效 historyRefs，避免只靠 prose 推理來源。",requiresRegeneration:true})}
 const opening=clean(candidate?.openingHook,1000),worldName=clean(candidate?.worldName,100),start=clean(candidate?.worldBible?.startingLocation,100),theme=clean(candidate?.worldTheme,200),originOpening=candidate?.originOpening||{},knowledgePolicy=String(originOpening.knowledgePolicy||candidate?.worldBible?.blueprintProfile?.origin?.knowledgePolicy||"EARTH_ONLY").toUpperCase();
 const localStartKnowledge=["PARTIAL_LOCAL","BRIEFED_PARTIAL","LOCAL_BASELINE"].includes(knowledgePolicy),worldNameLeak=originOpening.worldNameKnown===true?false:Boolean(worldName&&opening.includes(worldName)),startLeak=localStartKnowledge?false:Boolean(start&&opening.includes(start)),themeLeak=Boolean(theme&&opening.includes(theme));
 if(worldNameLeak||startLeak||themeLeak){score-=16;findings.push({severity:"CRITICAL",targetType:"KNOWLEDGE_BOUNDARY",problem:"開場超出 Origin 授權的玩家知識邊界，或直接洩漏 Director-level 主題。",recommendation:"依 Origin knowledgePolicy 只使用角色合理已知內容，其餘只保留可直接感知的聲音、光線、氣味、觸感與可見變化。",requiresRegeneration:true})}
 const historyText=JSON.stringify(candidate?.worldHistory||[]),npcRows=Array.isArray(candidate?.generation?.npcs)?candidate.generation.npcs:[],remoteHistory=/百年|數百年|數世紀|centur|hundred years/i.test(historyText),legacyWitness=npcRows.find(n=>/初代|始祖|創建者|創始|founder|first generation/i.test(JSON.stringify(n||{}))),longevity=/長壽|延命|延壽|不老|不死|休眠|凍眠|immortal|longevity|lifespan/i.test(JSON.stringify({bible:candidate?.worldBible||{},npc:legacyWitness||{}}));
 if(remoteHistory&&legacyWitness&&!longevity){score-=8;findings.push({severity:"MEDIUM",targetType:"CHARACTERS",problem:`角色「${clean(legacyWitness.name,80)||"未命名角色"}」被描述為遙遠歷史時期的第一代／創建人物，但世界或角色設定沒有交代壽命、延命、休眠或其他時間跨度機制。`,recommendation:"補充角色壽命／延命機制，或把角色改為後代、傳承者、記錄持有人，避免年代矛盾。",requiresRegeneration:true})}
 const lexicalCorpus=JSON.stringify({bible:candidate?.worldBible||{},generation:candidate?.generation||{},history:candidate?.worldHistory||[]}),sexualContext=/性文化|生殖|繁殖|性交|性儀式|sexual|reproduction/i.test(lexicalCorpus);
 if(/精液/.test(lexicalCorpus)&&!sexualContext){score-=6;findings.push({severity:"MEDIUM",targetType:"LEXICAL_SANITY",problem:"世界文本出現與上下文不相符的生理詞彙，可能是生成模型選詞錯誤。",recommendation:"保持原設定含義，改用符合語境的詞彙，例如凝液、髓液、結晶液或其他世界內術語。",requiresRegeneration:true})}
 score=Math.round(clamp(score,0,100));
 const dimensions=Object.fromEntries(WORLD_QUALITY_DIMENSIONS.map(k=>[k,score]));
 if(findings.some(x=>x.targetType==="MAGIC_SYSTEM"))dimensions.magicSystem=Math.max(20,score-18);
 if(findings.some(x=>x.targetType==="FUTURE_EVENTS"))dimensions.futureEvents=Math.max(20,score-22);
 if(findings.some(x=>x.targetType==="PROVENANCE"))dimensions.historyIntegration=Math.max(25,score-15);
 if(findings.some(x=>x.targetType==="KNOWLEDGE_BOUNDARY"))dimensions.knowledgeBoundary=Math.max(10,score-30);
 const evaluation=normalizeWorldEvaluation({overall:score,dimensions,findings},{source:"FALLBACK",reason});
 if(String(reason||"")==="BACKGROUND_AI_CRITIC_PENDING")return {...evaluation,overall:null,status:"PENDING",official:false,pending:true,provisionalOverall:evaluation.overall};
 return {...evaluation,official:false,pending:false}
}

export function applyFallbackRecoveryPatch(candidate,input,diagnostics){
 const d=finalizeGenerationDiagnostics(diagnostics),fallbackStages=new Set(Object.entries(d.stages||{}).filter(([,row])=>row?.source==="FALLBACK").map(([stage])=>stage));
 const out=structuredClone(candidate||{}),patch=obj(input?.patch)?input.patch:(obj(input)?input:{});
 if(fallbackStages.has("CORE_RULES")&&obj(patch.worldBible)){
  out.worldBible??={};
  for(const key of ["era","centralConflict","magicCost","ancientTruth","currentCrisis","tone","civilization","communication"])if(patch.worldBible[key]!=null)out.worldBible[key]=structuredClone(patch.worldBible[key])
 }
 if(fallbackStages.has("CORE_ANCHOR")){
  if(clean(patch.summary,1200))out.summary=clean(patch.summary,1200);
  for(const key of ["publicFacts","hiddenFacts"])if(Array.isArray(patch[key])&&patch[key].length)out[key]=structuredClone(patch[key]);
  if(obj(patch.worldBible)){
   out.worldBible??={};
   if(patch.worldBible.weatherSystem!=null)out.worldBible.weatherSystem=structuredClone(patch.worldBible.weatherSystem);
   const oldRegion=clean(out.worldBible.startingRegion,160),oldSettlement=clean(out.worldBible.startingSettlement,160),oldLocation=clean(out.worldBible.startingLocation,160);
   const newRegion=clean(patch.worldBible.startingRegion,160)||oldRegion,newSettlement=clean(patch.worldBible.startingSettlement,160)||oldSettlement,newLocation=clean(patch.worldBible.startingLocation,160)||oldLocation;
   out.worldBible.startingRegion=newRegion;out.worldBible.startingSettlement=newSettlement;out.worldBible.startingLocation=newLocation;
   if(obj(out.generation)){
    for(const loc of out.generation.locations||[]){if(clean(loc?.region,160)===oldRegion)loc.region=newRegion;if(clean(loc?.name,160)===oldLocation)loc.name=newLocation}
    for(const npc of out.generation.npcs||[])if(clean(npc?.locationName,160)===oldLocation)npc.locationName=newLocation;
    for(const faction of out.generation.factions||[])if(clean(faction?.locationName,160)===oldLocation)faction.locationName=newLocation;
    for(const q of out.generation.sideQuests||[])if(clean(q?.locationName,160)===oldLocation)q.locationName=newLocation
   }
   for(const event of out.worldTimeline||[])if(obj(event?.links)&&Array.isArray(event.links.locationRefs))event.links.locationRefs=event.links.locationRefs.map(x=>x===oldLocation?newLocation:x===oldRegion?newRegion:x)
  }
 }
 if(fallbackStages.has("HISTORY")&&Array.isArray(out.worldHistory)&&Array.isArray(patch.worldHistory)){
  out.worldHistory=out.worldHistory.map((base,i)=>mergeDescriptive(base,patch.worldHistory[i],["id","order"]))
 }
 if(fallbackStages.has("GEOGRAPHY")){
  if(clean(patch.openingHook,1200))out.openingHook=clean(patch.openingHook,1200);
  if(obj(patch.generation)&&Array.isArray(out.generation?.locations)&&Array.isArray(patch.generation.locations)){
   out.generation.locations=out.generation.locations.map((base,i)=>mergeDescriptive(base,patch.generation.locations[i],["id","name","region","known","historyRefs"]))
  }
 }
 if(fallbackStages.has("FUTURE")){
  if(obj(patch.worldCalendar)&&obj(out.worldCalendar))out.worldCalendar=mergeDescriptive(out.worldCalendar,patch.worldCalendar,["daysPerCycle","cyclesPerLongCycle"]);
  if(Array.isArray(patch.worldTimeline)&&Array.isArray(out.worldTimeline))out.worldTimeline=out.worldTimeline.map((base,i)=>mergeDescriptive(base,patch.worldTimeline[i],["id","earliestDay","latestDay","triggerDay","baseTriggerDay","links","status","triggeredDay","impactScope","affectedRegions","intensity","duration","domains","playerCanPrevent","playerCanAccelerate","playerCanMitigate","playerCanRedirect"]))
 }
 if(fallbackStages.has("SOCIETY")&&obj(patch.generation)&&obj(out.generation)){
  if(Array.isArray(out.generation.locations)&&Array.isArray(patch.generation.locations))out.generation.locations=out.generation.locations.map((base,i)=>{
   const p=patch.generation.locations[i];if(!obj(p))return base;const next=structuredClone(base);
   for(const key of ["culture","trade"])if(p[key]!=null)next[key]=structuredClone(p[key]);
   return next
  });
  if(Array.isArray(out.generation.factions)&&Array.isArray(patch.generation.factions)){
   out.generation.factions=out.generation.factions.map((base,i)=>mergeDescriptive(base,patch.generation.factions[i],["id","locationName","historyRefs","known"]));
   const oldName=clean(candidate?.generation?.factions?.[0]?.name,160),newName=clean(out.generation.factions?.[0]?.name,160);
   if(oldName&&newName&&oldName!==newName){
    for(const npc of out.generation.npcs||[])if(clean(npc?.factionName,160)===oldName)npc.factionName=newName;
    for(const q of out.generation.sideQuests||[])if(clean(q?.factionName,160)===oldName)q.factionName=newName
   }
  }
 }
 if(fallbackStages.has("CAST")&&obj(patch.generation)&&obj(out.generation)){
  if(Array.isArray(out.generation.npcs)&&Array.isArray(patch.generation.npcs)){
   out.generation.npcs=out.generation.npcs.map((base,i)=>mergeDescriptive(base,patch.generation.npcs[i],["id","locationId","locationName","factionId","factionName","knowledgeScope","historyRefs","known"]));
   const oldName=clean(candidate?.generation?.npcs?.[0]?.name,160),newName=clean(out.generation.npcs?.[0]?.name,160);
   if(oldName&&newName&&oldName!==newName)for(const q of out.generation.sideQuests||[])if(clean(q?.npcName,160)===oldName)q.npcName=newName
  }
  if(Array.isArray(out.generation.sideQuests)&&Array.isArray(patch.generation.sideQuests))out.generation.sideQuests=out.generation.sideQuests.map((base,i)=>mergeDescriptive(base,patch.generation.sideQuests[i],["id","locationName","npcName","factionName","historyRefs","known"]))
  if(Array.isArray(patch.suggestions)&&patch.suggestions.length)out.suggestions=structuredClone(patch.suggestions)
 }
 return out
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
  out.worldTimeline=out.worldTimeline.map((base,i)=>mergeDescriptive(base,patch.worldTimeline[i],["id","earliestDay","latestDay","triggerDay","baseTriggerDay","links","status","triggeredDay","impactScope","affectedRegions","intensity","duration","domains","playerCanPrevent","playerCanAccelerate","playerCanMitigate","playerCanRedirect"]))
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
 const r=state?.world?.registry||{},historyIds=new Set((state?.world?.history||[]).map(x=>clean(x?.id,120)).filter(Boolean)),issues=[];const quality=state?.world?.quality||{};let score=Number(quality?.overall);
 if(!Number.isFinite(score))score=quality?.pending===true?75:90;
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


function unseenRepairTargets(state){
 ensureVisibilityLocks(state);const r=state?.world?.registry||{};
 return {
  locations:(r.locations||[]).filter(canBackgroundMutateEntity).map(x=>({id:x.id,name:x.name,region:x.region,visibilityLock:x.visibilityLock,protectedHintFields:x.visibilityHint?.fields||[],description:x.description,culture:x.culture||null,trade:x.trade||null,lore:x.lore||null,historyRefs:uniq(x.historyRefs)})),
  npcs:(r.npcs||[]).filter(canBackgroundMutateEntity).map(x=>({id:x.id,name:x.name,role:x.role,visibilityLock:x.visibilityLock,protectedHintFields:x.visibilityHint?.fields||[],description:x.description,personality:x.personality,goal:x.goal,lore:x.lore||null,historyRefs:uniq(x.historyRefs)})),
  factions:(r.factions||[]).filter(canBackgroundMutateEntity).map(x=>({id:x.id,name:x.name,visibilityLock:x.visibilityLock,protectedHintFields:x.visibilityHint?.fields||[],description:x.description,goal:x.goal,culture:x.culture||null,lore:x.lore||null,historyRefs:uniq(x.historyRefs)}))
 }
}
export function backgroundQualitySnapshot(state){
 const w=state?.world||{},targets=unseenRepairTargets(state);
 return {
  worldVersion:Number(w.version)||1,
  core:{name:w.name||"",theme:w.theme||"",summary:w.summary||"",seedContract:w.seedContract||w.seed||null,bible:w.bible||null,creation:w.creation?{blueprintProfile:w.creation.blueprintProfile||null,constitution:w.creation.constitution||null}:null},
  history:(w.history||[]).slice(0,16).map(x=>({id:x.id,title:x.title,summary:x.summary,causes:x.causes,legacies:x.legacies,regions:x.regions,factions:x.factions})),
  timeline:(w.timeline||[]).slice(0,16).map(x=>({id:x.id,title:x.title,category:x.category,observableEffect:x.observableEffect,links:x.links,activationConditions:x.activationConditions,cancelConditions:x.cancelConditions,escalationConditions:x.escalationConditions})),
  generationDiagnostics:w.generationDiagnostics||null,
  currentQuality:w.quality||null,
  unseenRepairTargets:targets,
  immutableBoundary:{worldIdentity:true,blueprint:true,constitution:true,historySkeleton:true,timelineRules:true,seenContent:true}
 }
}
function safeObject(value){return obj(value)?structuredClone(value):null}
function mergeSafe(target,patch,fields){
 let changed=false;
 for(const field of fields){
  if(patch?.[field]===undefined)continue;
  const next=typeof patch[field]==="string"?clean(patch[field],field==="description"?500:300):safeObject(patch[field]);
  if(next==null)continue;
  if(JSON.stringify(target[field])===JSON.stringify(next))continue;
  target[field]=next;changed=true
 }
 return changed
}
export function applyUnseenWorldRepair(state,input={}){
 const patch=obj(input?.patch)?input.patch:input,targets=unseenRepairTargets(state),allowed={
  locations:new Set(targets.locations.map(x=>x.id)),npcs:new Set(targets.npcs.map(x=>x.id)),factions:new Set(targets.factions.map(x=>x.id))
 },r=state?.world?.registry||{},modified=[];
 const groups=[
  ["locations",r.locations||[],["description","culture","trade","lore"]],
  ["npcs",r.npcs||[],["description","personality","goal","lore"]],
  ["factions",r.factions||[],["description","culture","lore"]]
 ];
 for(const [group,rows,fields] of groups){
  for(const proposed of Array.isArray(patch?.registry?.[group])?patch.registry[group]:[]){
   const id=clean(proposed?.id,160);if(!id||!allowed[group].has(id))continue;
   const entity=rows.find(x=>x.id===id);if(!entity)continue;const mutable=backgroundMutableFields(entity,fields);if(!mutable.length)continue;
   if(mergeSafe(entity,proposed,mutable))modified.push({group,id})
  }
 }
 if(modified.length){state.world.version=Math.max(1,Number(state.world.version)||1)+1;state.events??=[];state.events.push({id:"EV-QUALITY-"+Date.now(),type:"BACKGROUND_QUALITY_REPAIR_APPLIED",visibility:"INTERNAL",modified:modified.map(x=>x.id),day:Number(state.world?.state?.day)||1,at:Date.now()})}
 return {applied:modified.length>0,modified}
}
export function backgroundQualityNeed(state){
 const bg=state?.world?.quality?.background,last=Number(bg?.reviewedWorldVersion)||0,current=Number(state?.world?.version)||1;
 if(bg?.running===true)return {required:false,reason:"RUNNING"};
 if(!bg?.reviewedAt)return {required:true,reason:"INITIAL_BACKGROUND_REVIEW"};
 if(current>last)return {required:true,reason:"WORLD_VERSION_ADVANCED"};
 return {required:false,reason:"UP_TO_DATE"}
}
export function recordBackgroundQualityReview(state,{evaluation=null,repair=null,error=""}={}){
 state.world??={};state.world.quality=obj(state.world.quality)?state.world.quality:{};
 const quality=state.world.quality,prior=obj(quality.background)?quality.background:{},now=Date.now(),failure=clean(error,300);
 quality.background={
  ...prior,running:false,reviewedAt:now,reviewedWorldVersion:Number(state.world.version)||1,
  evaluation:evaluation?structuredClone(evaluation):prior.evaluation||null,
  lastRepair:repair?structuredClone(repair):null,error:failure,
  runs:Math.max(0,Number(prior.runs)||0)+1
 };
 quality.reviewedAt=now;quality.pending=false;quality.backgroundPending=false;
 if(evaluation){quality.status=String(evaluation.status||"PASS").toUpperCase();quality.source=clean(evaluation.source,30)||quality.source||"AI";quality.official=evaluation.official!==false;quality.overall=evaluation.overall??quality.overall??null;quality.provisionalOverall=evaluation.overall??quality.provisionalOverall??null;quality.error=""}
 else if(failure){quality.status="UNAVAILABLE";quality.source=quality.source||"FALLBACK";quality.official=false;quality.error=failure}
 return quality.background
}
