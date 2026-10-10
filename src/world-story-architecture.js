const obj=value=>value&&typeof value==="object"&&!Array.isArray(value);
const list=value=>Array.isArray(value)?value:[];
const clean=(value,max=500)=>typeof value==="string"?value.trim().slice(0,max):"";
const nonEmpty=value=>clean(value,500).length>=6;
const named=value=>clean(value,180).length>=1;

export const WORLD_STORY_HARD_GATES=Object.freeze([
 "WG-001_GENERIC_WORLD","WG-002_PLAYER_CENTRIC_WORLD","WG-003_STATIC_FACTIONS",
 "WG-004_LORE_WITHOUT_CAUSALITY","WG-005_NO_DAILY_LIFE","WG-006_NO_RESOURCE_LOGIC",
 "WG-007_NO_FIXED_TRUTH","WG-008_UNSEEDED_MYSTERY","WG-009_PERFECT_INSTITUTION",
 "WG-010_NO_WORLD_PRESSURE","SG-001_STORY_CONTRACT_INCOMPLETE"
]);

function designOf(candidate={}){
 return obj(candidate?.worldBible?.designLogic)?candidate.worldBible.designLogic:obj(candidate?.designLogic)?candidate.designLogic:{};
}
function agencyOf(row={}){return obj(row?.agency)?row.agency:{}}
function issue(code,problem,evidence=""){
 return {code,severity:"CRITICAL",problem,evidence:clean(evidence,500),requiresRegeneration:true};
}

export function factionAgencyIssues(row={}){
 const a=agencyOf(row),issues=[];
 if(!nonEmpty(a.goal||row.goal))issues.push("GOAL_REQUIRED");
 if(!nonEmpty(a.fear))issues.push("FEAR_REQUIRED");
 if(!list(a.resources).some(named))issues.push("RESOURCE_REQUIRED");
 if(!list(a.dependencies).some(named))issues.push("DEPENDENCY_REQUIRED");
 if(!list(a.internalConflicts).some(nonEmpty))issues.push("INTERNAL_CONFLICT_REQUIRED");
 if(!nonEmpty(a.currentPlan))issues.push("CURRENT_PLAN_REQUIRED");
 if(!nonEmpty(a.nextActionIfPlayerDoesNothing))issues.push("NEXT_ACTION_REQUIRED");
 return issues;
}
export function npcAgencyIssues(row={}){
 const a=agencyOf(row),issues=[];
 if(!nonEmpty(a.want||row.goal))issues.push("WANT_REQUIRED");
 if(!nonEmpty(a.fear))issues.push("FEAR_REQUIRED");
 if(!nonEmpty(a.boundary))issues.push("BOUNDARY_REQUIRED");
 if(!nonEmpty(a.currentPlan))issues.push("CURRENT_PLAN_REQUIRED");
 if(!nonEmpty(a.lifeWithoutPlayer))issues.push("LIFE_WITHOUT_PLAYER_REQUIRED");
 return issues;
}

function completeChain(row){return obj(row)&&nonEmpty(row.cause)&&list(row.consequences).filter(nonEmpty).length>=3&&nonEmpty(row.institution)&&nonEmpty(row.conflict)}
function completeResource(row){return obj(row)&&named(row.resource)&&named(row.controller)&&nonEmpty(row.dependency)&&nonEmpty(row.conflict)}
function completeStoryEngine(row){return obj(row)&&nonEmpty(row.pressure)&&list(row.actors).filter(named).length>=2&&nonEmpty(row.escalation)&&list(row.playerLevers).filter(nonEmpty).length>=2}
function storyContractComplete(d){
 const s=obj(d.narrativeContract)?d.narrativeContract:{};
 const fields=["entryProblem","immediateDesire","advantage","limitation","cost","informationGap","anchorPromise","relationshipPromise","irreversibleRisk","identityQuestion","belongingQuestion"];
 return fields.every(key=>nonEmpty(s[key]))&&list(s.escalationPath).filter(named).length>=3;
}
function addCheck(checks,findings,code,pass,problem,evidence){
 const status=pass?"PASS":"FAIL";checks.push({code,status,evidence:clean(evidence,500)});if(!pass)findings.push(issue(code,problem,evidence));
}

export function evaluateWorldStoryArchitecture(candidate={}){
 const d=designOf(candidate),version=Number(d.architectureVersion)||0;
 if(version<2)return {version:2,status:"REVIEW",valid:true,legacy:true,score:60,checks:[],findings:[],hardErrors:[],reason:"LEGACY_ARCHITECTURE"};
 const checks=[],findings=[],factions=list(candidate?.generation?.factions),mystery=obj(d.mysteryArchitecture)?d.mysteryArchitecture:{},without=obj(d.worldWithoutPlayer)?d.worldWithoutPlayer:{};
 addCheck(checks,findings,"WG-001_GENERIC_WORLD",nonEmpty(d.coreDifference)&&nonEmpty(d.themeQuestion),"世界缺少足以改變文明的 Core Difference／Theme Question。",`${d.coreDifference||""} | ${d.themeQuestion||""}`);
 addCheck(checks,findings,"WG-002_PLAYER_CENTRIC_WORLD",list(without.ongoingProcesses).filter(nonEmpty).length>=2&&list(without.nextEscalations).filter(nonEmpty).length>=1,"沒有玩家時世界缺乏可持續運作與升級的進程。",JSON.stringify(without));
 const factionProblems=factions.flatMap((row,i)=>factionAgencyIssues(row).map(x=>`faction[${i}]:${x}`));
 addCheck(checks,findings,"WG-003_STATIC_FACTIONS",factions.length>0&&!factionProblems.length,"勢力缺少自主計畫，仍會等待玩家觸發。",factionProblems.join(", ")||`factions=${factions.length}`);
 addCheck(checks,findings,"WG-004_LORE_WITHOUT_CAUSALITY",list(d.consequenceChains).filter(completeChain).length>=2,"世界設定沒有足夠的規則→制度→衝突因果鏈。",`chains=${list(d.consequenceChains).filter(completeChain).length}`);
 addCheck(checks,findings,"WG-005_NO_DAILY_LIFE",list(d.dailyLifeImpacts).filter(nonEmpty).length>=3,"核心設定沒有落入居民正常生活。",`dailyLifeImpacts=${list(d.dailyLifeImpacts).filter(nonEmpty).length}`);
 const resources=list(d.resourceLoops).filter(completeResource);
 addCheck(checks,findings,"WG-006_NO_RESOURCE_LOGIC",resources.length>=2,"資源沒有形成 Controller／Dependency／Conflict 結構。",`resourceLoops=${resources.length}`);
 addCheck(checks,findings,"WG-007_NO_FIXED_TRUTH",nonEmpty(mystery.question)&&nonEmpty(mystery.trueAnswer),"核心 Mystery 沒有預先固定真相。",`${mystery.question||""} | ${mystery.trueAnswer||""}`);
 addCheck(checks,findings,"WG-008_UNSEEDED_MYSTERY",list(mystery.evidenceSeeds).filter(x=>obj(x)&&nonEmpty(x.clue)&&nonEmpty(x.trueMeaning)).length>=3,"核心 Mystery 沒有至少三個預置線索。",`evidenceSeeds=${list(mystery.evidenceSeeds).length}`);
 addCheck(checks,findings,"WG-009_PERFECT_INSTITUTION",factions.length>0&&factions.every(row=>list(agencyOf(row).internalConflicts).filter(nonEmpty).length>=1),"大型勢力沒有內部利益分裂。",`factions=${factions.length}`);
 addCheck(checks,findings,"WG-010_NO_WORLD_PRESSURE",list(d.storyEngines).filter(completeStoryEngine).length>=2&&list(without.nextEscalations).filter(nonEmpty).length>=1,"世界沒有會在玩家不介入時自行惡化的壓力。",`storyEngines=${list(d.storyEngines).filter(completeStoryEngine).length}`);
 addCheck(checks,findings,"SG-001_STORY_CONTRACT_INCOMPLETE",storyContractComplete(d),"故事缺少進場欲望、限制、代價、Anchor、關係、不可逆風險、身份／歸屬問題或升級路徑。",JSON.stringify(d.narrativeContract||{}));
 const failed=checks.filter(x=>x.status==="FAIL").length,structuralScore=Math.max(0,Math.round((checks.length-failed)/checks.length*100)),hardErrors=findings.map(x=>x.code),diagnostics=candidate?.generationDiagnostics||{},relevantStages=new Set(["CORE_RULES","SOCIETY","CAST","ORIGIN_OPENING_COMPLIANCE"]),degradedStages=Object.entries(diagnostics?.stages||{}).filter(([stage,row])=>relevantStages.has(stage)&&row?.source==="FALLBACK").map(([stage])=>stage),provenanceWarnings=degradedStages.map(stage=>({code:"ARCHITECTURE_FALLBACK_"+stage,severity:"WARNING",stage,problem:stage+" used fallback; structural gates passed but generation provenance is degraded."})),score=hardErrors.length?structuralScore:degradedStages.length?Math.min(structuralScore,85):structuralScore,status=hardErrors.length?"FAIL":degradedStages.length?"REVIEW":"PASS";
 return {version:2,status,valid:hardErrors.length===0,legacy:false,score,checks,findings,hardErrors,provenanceWarnings,reason:degradedStages.length?"DEGRADED_GENERATION_PROVENANCE":""};
}

export function assertWorldStoryArchitecture(candidate={}){
 const report=evaluateWorldStoryArchitecture(candidate);
 if(report.status==="FAIL"){
  const error=new Error("WORLD_STORY_ARCHITECTURE_FAILED:"+report.hardErrors.join(","));
  error.code="WORLD_STORY_ARCHITECTURE_FAILED";error.status=422;error.evaluation=report;throw error;
 }
 return report;
}
