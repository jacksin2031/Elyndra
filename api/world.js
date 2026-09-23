import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {seedDirective} from "../src/seed-contract.js";
import {normalizeWorldCoreCandidate,normalizeWorldIdentity,normalizeCoreAnchorStage,mergeCoreWave,coreWaveIssues,buildWorldAnchorContract,mergeOpeningRegion,normalizeFutureLinksToAnchor,worldGenerationLinkIssues} from "../src/world-compiler.js";
import {fallbackWorldEvaluation} from "../src/world-quality.js";
import {parseModelJSON} from "../src/model-json.js";
import {validateWorldCreationCandidate} from "../src/world-creation.js";
import {validateWorldHistory} from "../src/world-history.js";
import {timelineAuthoringSlots,bindTimelineAuthoringSlots,validateWorldTimeline} from "../src/world-timeline.js";
import {originOpeningContract} from "../src/origin-runtime.js";

const CORE_RULE_FIELDS=["era","centralConflict","magicCost","ancientTruth","currentCrisis","tone"];
const text=v=>String(v??"").trim();
function stageError(stage,reason,status=422){
 const e=new Error("WORLD_"+stage+"_FAILED:"+reason);e.code="WORLD_"+stage+"_FAILED";e.status=status;return e
}
async function stageJSON(diagnostics,stage,{system,user,temperature=.4,timeoutMs=50000,maxOutputTokens=1200,validate}){
 let last=null;
 for(let attempt=1;attempt<=2;attempt++){
  const started=Date.now();
  try{
   const raw=await callModel({signal:req.elyndraSignal,
    system:system+(attempt>1?"\n上一個輸出未通過這一階段的 schema／因果驗證。只修正本階段，保持已鎖定輸入不變，只輸出必要 JSON。":""),
    user:typeof user==="function"?user():user,temperature:attempt>1?Math.min(.25,temperature):temperature,timeoutMs,maxOutputTokens
   });
   const value=parseModelJSON(raw),problem=validate?.(value)||"";
   if(problem)throw stageError(stage,problem);
   diagnostics.stages[stage]={source:"AI",reason:attempt>1?"RECOVERED_AFTER:"+String(last?.message||last||""):"",latencyMs:Date.now()-started,attempts:attempt,fallbackUsed:false};
   return value
  }catch(e){last=e;if(attempt===2)break}
 }
 diagnostics.stages[stage]={source:"FAILED",reason:String(last?.message||last||"stage failed"),latencyMs:0,attempts:2,fallbackUsed:false};
 throw last?.status?last:stageError(stage,String(last?.message||last||"stage failed"),502)
}
function stageSummary(diagnostics){
 const rows=Object.values(diagnostics.stages);return {stageCount:rows.length,aiSucceeded:rows.filter(x=>x.source==="AI").length,fallbackCount:0,failedCount:rows.filter(x=>x.source==="FAILED").length}
}
function rulesProblem(value){
 const b=value?.worldBible;return !b||CORE_RULE_FIELDS.some(k=>!text(b[k]))||!b.civilization||!b.communication?"STRUCTURE_INVALID":""
}
function anchorProblem(value){
 value=normalizeCoreAnchorStage(value);
 const b=value?.worldBible;if(!b)return "WORLD_BIBLE_REQUIRED";
 if(["startingRegion","startingSettlement","startingLocation"].some(k=>!text(b[k])))return "STARTING_LOCATION_FIELDS_REQUIRED";
 if(!b.weatherSystem||!Array.isArray(b.weatherSystem.phenomena)||b.weatherSystem.phenomena.length<2)return "WEATHER_SYSTEM_INVALID";
 if(!Array.isArray(value.publicFacts)||value.publicFacts.length<2||!Array.isArray(value.hiddenFacts)||value.hiddenFacts.length<2)return "FACTS_INVALID";
 return ""
}
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {seed,constitution}=safeBody(req);if(!seed)return json(res,400,{error:"INVALID_REQUEST"});
  const directive=seedDirective(seed),auto=directive.contract.worldviewMode==="ai",expected=directive.contract,chosen=v=>v==="AI_DECIDES"||v==null?"AI 必須自行決定並回傳具體值":v;
  const diagnostics={version:2,startedAt:Date.now(),finishedAt:0,quality:"HEALTHY",stages:{},summary:null};

  const identityRaw=await stageJSON(diagnostics,"IDENTITY",{
   timeoutMs:35000,maxOutputTokens:700,temperature:.35,
   system:"你是 Elyndra World Identity Compiler。只決定最小世界身份，不生成文明細節、天氣、歷史、地點、NPC、勢力、任務或 Timeline。worldviewMode=style 時必須遵守 expected；worldviewMode=ai 時可自行決定，但所有值要形成同一世界主題。只輸出 JSON。",
   user:JSON.stringify({seed,expected,blueprintProfile:directive.blueprintProfile,styleFoundation:directive.styleFoundation,required:{worldName:"2-12字",worldTheme:"具體核心主題",playerName:seed.playerName||"",genre:chosen(expected.genre),scale:chosen(expected.scale),danger:auto?"1-5":expected.danger,magic:auto?"1-5":expected.magic,politics:auto?"1-5":expected.politics,premise:"30-70字"}})
  });
  const identity=normalizeWorldIdentity(identityRaw,expected,seed);

  const [rulesRaw,anchorRaw]=await Promise.all([
   stageJSON(diagnostics,"CORE_RULES",{
   timeoutMs:50000,maxOutputTokens:1200,temperature:.35,validate:rulesProblem,
   system:"你是 Elyndra Core Rules Compiler。Identity 已鎖定。只具體化世界硬規則：時代、核心衝突、魔法代價、古代真相、當前危機、敘事氣氛、文明程度與遠距通訊。不得生成地點、天氣、歷史、人物、勢力、任務或 Timeline。blueprintProfile.mustExist 屬規則／文明層的要素必須實際存在；forbidden 不得出現。只輸出 JSON。",
   user:JSON.stringify({identity,seedContract:expected,blueprintProfile:directive.blueprintProfile,required:{worldBible:{era:"世界自己的時代",centralConflict:"40-80字",magicCost:"硬規則與代價",ancientTruth:"40-80字",currentCrisis:"40-80字",tone:"氣氛",civilization:{level:"1-5",stage:"文明階段",infrastructure:"基建",literacy:"教育／識字",mobility:"交通"},communication:{name:"名稱",medium:"媒介",description:"運作方式",latency:"NONE|DELAYED|NEAR_INSTANT|INSTANT",range:"LOCAL|REGIONAL|WORLD",accessRule:"ENCOUNTERED",constraints:"限制"}}}})
  }),
   stageJSON(diagnostics,"CORE_ANCHOR",{
   timeoutMs:50000,maxOutputTokens:1400,temperature:.35,validate:anchorProblem,
   system:"你是 Elyndra Core Anchor Compiler。Identity 已鎖定。你與 Core Rules Compiler 同一 wave 並行工作；不得自行改寫 Identity。只建立 summary、開局 Region/Settlement/Location、Weather Canon、publicFacts、hiddenFacts。publicFacts 與 hiddenFacts 必須放在 JSON root，不能放入 worldBible。所有地點與天氣必須能由 Identity、Seed Contract 與 blueprintProfile 解釋。不得生成歷史、勢力、NPC、任務或 Timeline。只輸出 JSON。",
   user:JSON.stringify({identity,seedContract:expected,blueprintProfile:directive.blueprintProfile,required:{summary:"70-130字",worldBible:{startingRegion:"開局區域",startingSettlement:"附近首個文明聚落",startingLocation:"出生位置",weatherSystem:{identity:"天氣法則",source:"來源",cycle:"變化方式",forecastability:"LOW|MEDIUM|HIGH",phenomena:[{id:"WTH-1",name:"正式名稱",observableName:"感官名稱",description:"20-40字",sensoryCue:"感官線索",rarity:"COMMON|UNCOMMON|RARE|EXTREME",danger:"0-5"},{id:"WTH-2",name:"正式名稱",observableName:"感官名稱",description:"20-40字",sensoryCue:"感官線索",rarity:"COMMON|UNCOMMON|RARE|EXTREME",danger:"0-5"}]}},publicFacts:["2-3項"],hiddenFacts:["2-3項"]}})
  })
  ]);
  const normalizedAnchor=normalizeCoreAnchorStage(anchorRaw);
  let core=mergeCoreWave(identity,expected,rulesRaw,normalizedAnchor),coreIssues=coreWaveIssues(identity,rulesRaw,normalizedAnchor,core);
  if(coreIssues.length)throw stageError("CORE_LINK",coreIssues.join(","));
  core.worldBible.blueprintProfile=structuredClone(directive.blueprintProfile);
  const anchor=buildWorldAnchorContract(core,directive.timelinePacing),originOpening=originOpeningContract({player:{origin:seed.creationV2?.originProfile||{}},world:{creation:seed.creationV2||{},state:{day:1}}});

  const [historyRaw,geography]=await Promise.all([
   stageJSON(diagnostics,"HISTORY",{
   timeoutMs:75000,maxOutputTokens:1500,temperature:.4,
   validate:value=>{const v=validateWorldHistory(value?.worldHistory);return v.valid?"":"VALIDATION_FAILED:"+v.errors.join(",")},
   system:"你是 Elyndra History Compiler。World Anchor 已鎖定。只生成3個不可改寫的過去歷史 Canon，每項必須解釋 centralConflict、magicCost、civilization 或 currentCrisis 如何形成。不得生成未來、地點、勢力、NPC 或任務。只輸出 JSON。",
   user:JSON.stringify({anchor,required:{worldHistory:Array.from({length:3},(_,i)=>({id:"HIST-"+(i+1),order:i+1,era:"世界內時代",title:"重大歷史事件",category:"戰爭|王朝|宗教|技術|魔法|遷徙|災難|改革",summary:"40-80字",causes:["原因"],legacies:["現代影響"],discoverKeywords:["1-2線索"]}))}})
  }),
   stageJSON(diagnostics,"GEOGRAPHY",{
   timeoutMs:50000,maxOutputTokens:1000,temperature:.4,
   validate:value=>!value?.openingHook||!value?.location||value.location.name!==anchor.startingLocation||value.location.region!==anchor.startingRegion?"STRUCTURE_OR_ANCHOR_INVALID":"",
   system:"你是 Elyndra Geography Compiler。World Anchor 已鎖定；你與 History Compiler 同一 wave 並行工作。只生成 openingHook 與唯一開局地點的物理環境；地點必須能承載 HIST-1..3 的歷史痕跡，但不得假定具體事件內容，也不得新增文化、交易、勢力、NPC 或任務。openingHook 必須有立即可感知、可採取行動的具體異常。只輸出 JSON。",
   user:JSON.stringify({anchor,playerOrigin:seed.creationV2?.originProfile||null,originOpening,required:{openingHook:"80-160字",location:{name:anchor.startingLocation,type:"具體用途／形態",region:anchor.startingRegion,description:"40-90字",historyRefs:["至少1個 HIST id"],known:false,weatherProfile:{zone:"天候區",affinities:["既有 WTH id"],suppressions:[]},lore:{story:"40-80字歷史痕跡",unlockKeywords:["1-2線索"],minMatches:1}}}})
  })
  ]);
  const historyReport=validateWorldHistory(historyRaw.worldHistory),history=historyReport.history;

  const timelineSlots=timelineAuthoringSlots(directive.timelinePacing);
  const [futureRaw,society]=await Promise.all([
   stageJSON(diagnostics,"FUTURE",{
   timeoutMs:70000,maxOutputTokens:3000,temperature:.4,
   validate:value=>{const bound=bindTimelineAuthoringSlots(value?.worldTimeline,directive.timelinePacing),v=validateWorldTimeline(bound,directive.timelinePacing);return value?.worldCalendar&&v.valid?"":"TIMELINE_INVALID:"+(v.errors||[]).join(",")},
   system:"你是 Elyndra Future Compiler。Anchor、History、Geography 已鎖定。只生成世界曆法與可能發生的 Future Timeline；事件要透過 links.historyRefs/locationRefs 回連已存在內容，不得新增文明、勢力、地點或人物。每個事件的 impactScope、affectedRegions、intensity、duration、domains 及 prevent/accelerate/mitigate/redirect 必須符合事件內容，不可把全部事件都填成相同 Scope 或 Domain。日期窗口由 Engine slots 決定。只輸出 JSON。",
   user:JSON.stringify({anchor,history,geography,blueprintProfile:directive.blueprintProfile,timelineSlots,required:{worldCalendar:{name:"曆法名",epochName:"紀元",dayTerm:"日序",cycleTerm:"短週期",longCycleTerm:"長週期",daysPerCycle:"3-60",cyclesPerLongCycle:"3-30",cycles:["3-6名稱"],periods:[{name:"時段",fromMinute:0,toMinute:359}]},worldTimeline:timelineSlots.map((slot,i)=>({slot:slot.slot,title:"事件"+(i+1),category:"類型",directorTruth:"隱藏因果",observableEffect:"可觀察影響",pressure:"0-15",impactScope:"LOCAL|REGIONAL|NATIONAL|CONTINENTAL|WORLD",affectedRegions:[anchor.startingRegion],intensity:"0-100",duration:"1-30或null",domains:["1-4項"],activationConditions:["DAY>=2"],cancelConditions:[],escalationConditions:[],playerCanPrevent:true,playerCanAccelerate:true,playerCanMitigate:true,playerCanRedirect:true,links:{historyRefs:["HIST id"],locationRefs:[anchor.startingLocation]}}))}})
  }),
   stageJSON(diagnostics,"SOCIETY",{
   timeoutMs:55000,maxOutputTokens:1500,temperature:.4,
   validate:value=>!value||typeof value!=="object"||Array.isArray(value)||value.locationRef!==anchor.startingLocation||!Array.isArray(value.historyRefs)||!value.historyRefs.length?"STRUCTURE_INVALID":"",
   system:"你是 Elyndra Society Compiler。History 與 Geography 已鎖定；你與 Future Compiler 同一 wave 並行工作。只建立開局地點的 culture、trade 與最多1個地方 faction；制度、禁忌、信仰與經濟必須來自既有歷史、地理條件。不可重命名或新增地點。只輸出 JSON。",
   user:JSON.stringify({anchor,history,geography,required:{locationRef:anchor.startingLocation,historyRefs:["至少1個 HIST id"],locationCulture:{identity:"文化核心",etiquette:["1項"],taboos:["1項"],food:["1項"],beliefs:["1項"],architecture:["1項"],clothing:["1項"],hospitality:["1項"],namingStyle:"命名規則",languageNotes:[]},locationTrade:{mode:"currency|barter|mixed|ration|token",currencies:[],commonBarter:[],foreignAcceptance:[],priceCulture:"簡短",questReward:0,combatReward:0},faction:{name:"地方勢力",goal:"與危機／歷史有關",description:"40-80字",known:false,locationName:anchor.startingLocation,historyRefs:["至少1個 HIST id"],culture:{identity:"核心文化"},trade:{mode:"barter",currencies:[],commonBarter:[],foreignAcceptance:[],priceCulture:"簡短",questReward:0,combatReward:0},lore:{story:"40-80字",unlockKeywords:["1-2線索"],minMatches:1}}}})
  })
  ]);
  const authoredTimeline=bindTimelineAuthoringSlots(futureRaw.worldTimeline,directive.timelinePacing),timelineReport=validateWorldTimeline(authoredTimeline,directive.timelinePacing);
  let future=normalizeFutureLinksToAnchor({worldCalendar:futureRaw.worldCalendar,worldTimeline:timelineReport.timeline},anchor,history);

  let region=mergeOpeningRegion(anchor,geography,society),linkIssues=worldGenerationLinkIssues({anchor,history,geography,society,future});
  if(linkIssues.length)throw stageError("SOCIETY_LINK",linkIssues.join(","));

  const cast=await stageJSON(diagnostics,"CAST",{
   timeoutMs:55000,maxOutputTokens:1900,temperature:.45,
   validate:value=>!Array.isArray(value?.npcs)||!Array.isArray(value?.sideQuests)||!Array.isArray(value?.suggestions)||value.suggestions.length<2?"STRUCTURE_INVALID":"",
   system:"你是 Elyndra Opening Cast Compiler。前面所有世界觀都已鎖定。只生成1個附近 NPC、最多1個支線與3-4個 suggestions；附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true；這只公開人物存在與外觀，不公開 lore、秘密或知識。NPC、任務只能引用既有 Location/Faction/History，不得新增地點、勢力、世界規則或歷史。只輸出 JSON。",
   user:JSON.stringify({anchor,history,geography,society,future:{worldTimeline:future.worldTimeline.map(x=>({id:x.id,title:x.title,observableEffect:x.observableEffect,links:x.links}))},required:{npcs:[{name:"附近人物",role:"身份",description:"40-80字",personality:"人格",goal:"地方目標",locationName:anchor.startingLocation,factionName:"既有或空",knowledgeScope:[],historyRefs:["0-2 HIST"],known:true,behaviorProfile:{mannerisms:["1項"],speechPatterns:["1項"],habits:["1項"],values:["1項"],fears:["1項"],contradictions:["1項"],promises:[],grudges:[]},companionProfile:{joinThreshold:35,leaveThreshold:10,motives:["1項"],boundaries:["1項"]},lore:{story:"40-80字",unlockKeywords:["1-2線索"],minMatches:1}}],sideQuests:[{title:"支線",objective:"可執行目標",known:false,locationName:anchor.startingLocation,npcName:"上方 NPC 或空",factionName:"既有或空",historyRefs:["0-2 HIST"],evidenceKeywords:["2個線索"],conditions:[],target:2}],suggestions:["3-4個直接回應 openingHook 的行動"]}})
  });
  linkIssues=worldGenerationLinkIssues({anchor,history,geography,society,future,cast});if(linkIssues.length)throw stageError("CAST_LINK",linkIssues.join(","));

  const candidate=normalizeWorldCoreCandidate({...core,originOpening,worldHistory:history,worldCalendar:future.worldCalendar,worldTimeline:future.worldTimeline,openingHook:region.openingHook,suggestions:cast.suggestions,generation:{locations:region.locations.slice(0,1),npcs:cast.npcs.slice(0,1),factions:region.factions.slice(0,1),sideQuests:cast.sideQuests.slice(0,1)}});
  candidate.worldBible.blueprintProfile=structuredClone(directive.blueprintProfile);
  const blueprintValidation=validateWorldCreationCandidate(seed,candidate);if(!blueprintValidation.valid)return json(res,422,{error:"BLUEPRINT_COMPLIANCE_FAILED",details:blueprintValidation.errors});
  diagnostics.finishedAt=Date.now();diagnostics.summary=stageSummary(diagnostics);diagnostics.quality=diagnostics.summary.failedCount?"DEGRADED":"HEALTHY";
  candidate.blueprintCompliance=blueprintValidation.compliance;candidate.generationDiagnostics=diagnostics;candidate.worldQuality={...fallbackWorldEvaluation(candidate,diagnostics,"BACKGROUND_AI_CRITIC_PENDING"),backgroundPending:true,repairHistory:[]};
  return json(res,200,{candidate})
 }catch(e){return json(res,e.status|| (e.code==="AI_NOT_CONFIGURED"?503:502),{error:e.code||e.message})}
}
