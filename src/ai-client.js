import {hasDirectAI,directChat,loadAISettings} from "./ai-settings.js?v=59010";
import {seedDirective} from "./seed-contract.js?v=57025";
import {recognitionForNpc} from "./recognition-engine.js?v=57025";
import {normalizeWorldIdentity,normalizeCoreAnchorStage,mergeCoreWave,coreWaveIssues,buildWorldAnchorContract,mergeOpeningRegion,normalizeFutureLinksToAnchor,worldGenerationLinkIssues,openingCastTimelineSnapshot} from "./world-compiler.js?v=57025";
import {sceneTurnSnapshot,fastTurnStateSnapshot,mergeTurnCandidates} from "./turn-compiler.js?v=57029";
import {sanitizePlayerText} from "./runtime-guard.js?v=57029";
import {helperSnapshot} from "./helper-context.js?v=57029";
import {directorHistorySnapshot,validateWorldHistory} from "./world-history.js?v=57025";
import {timelineAuthoringSlots,bindTimelineAuthoringSlots,validateWorldTimeline} from "./world-timeline.js?v=57025";
import {playerWeatherSnapshot} from "./weather-engine.js?v=57025";
import {createGenerationDiagnostics,recordGenerationStage,finalizeGenerationDiagnostics,normalizeWorldEvaluation,fallbackWorldEvaluation,applyWorldRepairPatch,applyFallbackRecoveryPatch,validateExpansionProvenance,backgroundQualitySnapshot} from "./world-quality.js?v=57025";
import {parseModelJSON as parseJSON} from "./model-json.js?v=57025";
import {npcBehaviorSnapshot} from "./player-experience.js?v=57028";
import {normalizeActionIntent} from "./action-intent.js?v=57025";
import {buildTurnOutcomeKernel,turnDirectorMode as sharedTurnDirectorMode} from "./turn-outcome.js?v=57025";
import {ACTION_ASSESS_SYSTEM as SHARED_ACTION_ASSESS_SYSTEM,DEFERRED_TURN_SCHEMA as SHARED_DEFERRED_TURN_SCHEMA,sceneNarratorSystem,stateDirectorSystem,statePatchDirectorSystem} from "./ai-runtime-contracts.js?v=59000";
import {planStateSync,validateStatePatch} from "./state-sync.js?v=57025";
import {originNpcContext,originOpeningContract} from "./origin-runtime.js?v=57025";
import {historyDepthSnapshot} from "./history-depth.js?v=57025";
import {knowledgeCanRevealCanon} from "./knowledge-model.js?v=57025";
import {validateLazyGenerationCandidate} from "./lazy-generation.js?v=57025";
import {playerVisibleNpcName,canonicalizeNpcIdentityText} from "./player-entity-visibility.js?v=57029";
import {normalizeRuntimeLocation,normalizeRuntimeNpc,normalizeRuntimeSideQuest,bindRuntimeClaims} from "./runtime-generation-normalizer.js?v=57025";
import {WORLD_TRADITIONAL_CHINESE_CONTRACT,simplifiedChineseLeak} from "./traditional-chinese-guard.js?v=57025";
import {loadLocale,normalizeLocale,languageContract,registerLocalizedOutput} from "./locale-runtime.js?v=59010";
const API_BASE=(globalThis.ELYNDRA_API_BASE||"").replace(/\/$/,"");
const apiPath=path=>API_BASE?API_BASE+path:path;
async function post(path,body,options={}){const serverToken=String(globalThis.ELYNDRA_API_TOKEN||"").trim(),r=await fetch(apiPath(path),{method:"POST",signal:options?.signal,headers:{"Content-Type":"application/json",...(serverToken?{Authorization:`Bearer ${serverToken}`}:{})},body:JSON.stringify({...body,locale:normalizeLocale(body?.locale||loadLocale())})});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||`AI_HTTP_${r.status}`);const data=await r.json();registerLocalizedOutput(data,normalizeLocale(body?.locale||loadLocale()));return data}

export async function aiHealth(){if(hasDirectAI())return {ok:true,aiConfigured:true,mode:"direct"};try{const r=await fetch(apiPath("/api/health"));return r.ok?await r.json():{ok:false,aiConfigured:false}}catch{return {ok:false,aiConfigured:false}}}
export async function translateVisibleWorld(payload,targetLocale=loadLocale()){
 const target=normalizeLocale(targetLocale),source=normalizeLocale(payload?.sourceLocale),strings=Array.isArray(payload?.strings)?payload.strings.map(x=>String(x??"").trim()).filter(Boolean).slice(0,220):[];
 if(!strings.length)return {translations:[]};
 const groups=payload?.repair&&hasDirectAI()?strings.map(value=>value.length>140?value.split(/(?<=[。！？])/u).map(x=>x.trim()).filter(Boolean):[value]):strings.map(value=>[value]),request={sourceLocale:source,targetLocale:target,strings:groups.flat()},system=`${payload?.repair?"Previous translations were rejected because they still contain source-language fragments. Rewrite every fragment fully in the target language; keep proper names but translate descriptive Chinese words. ":""}You are Elyndra's lossless runtime translator. Translate or normalize each input string into the target language. sourceLocale is only the world's original language provenance; individual strings may already be in a different previously selected runtime language, so detect the actual source language of each string independently. If a string is already in the target language, preserve its wording whenever possible. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries. Do not add lore, answer the text, summarize, or expose hidden information. Keep output aligned by input index. Return JSON only as {"translations":["..."]}. ${languageContract(target)}`;
 if(!hasDirectAI())return post("/api/translate",request);
 const raw=await directChat({aiTask:"translation",locale:target,timeoutMs:60000,maxOutputTokens:4096,temperature:.05,system,user:JSON.stringify(request)}),parsed=parseJSON(raw),rows=Array.isArray(parsed?.translations)?parsed.translations:[];
 if(rows.length!==request.strings.length)throw new Error("TRANSLATION_COUNT_MISMATCH");let offset=0;const bundle={translations:strings.map((source,i)=>{const translated=rows.slice(offset,offset+groups[i].length).map(x=>String(x??"").trim()).join("");offset+=groups[i].length;return {source,translated:translated||source}})};registerLocalizedOutput(bundle,target);return bundle
}
export function visibleFacts(state){return state.world.canon.facts.filter(f=>state.knowledge.some(k=>k.factId===f.id&&knowledgeCanRevealCanon(state,k))).map(f=>f.text)}
export function npcKnownFacts(state,npc){const scope=new Set(Array.isArray(npc?.knowledgeScope)?npc.knowledgeScope:[]);return state.world.canon.facts.filter(f=>scope.has(f.id)).map(f=>f.text)}
export async function narrate(state,action,roll){const playerWorldName=state.player?.worldNameKnown?state.world.name:"UNKNOWN";if(hasDirectAI()){const raw=await directChat({aiTask:"narration",timeoutMs:45000,system:"You are Elyndra's player-facing narrator. The player only knows visibleFacts, playerLocation, and results directly perceived from this action. Never reveal unknown world names, locations, nations, factions, history, rules, hidden Canon, or secrets. Describe only Engine-confirmed results; never alter dice, Canon, HP, items, or state. Keep the narration concise (roughly 80-180 CJK characters or equivalent length). Do not emit system labels such as [世界動向], 【世界動向】, or SYSTEM. The runtime language contract appended by directChat is the sole authority for output language.",user:JSON.stringify({action,roll,player:{name:state.player?.name||"無名者",worldName:playerWorldName,playerLocation:state.player.location},weather:playerWeatherSnapshot(state),visibleFacts:visibleFacts(state)})});return sanitizePlayerText(raw,700,"")}const raw=(await post("/api/narrate",{action,roll,world:{name:playerWorldName,day:state.world.state.day,location:state.player.location},weather:playerWeatherSnapshot(state),visibleFacts:visibleFacts(state)})).text;return sanitizePlayerText(raw,700,"")}
function emitWorldProgress(cb,progress,label,detail){try{cb?.({progress,label,detail})}catch{}}
const WORLD_AI_CONCURRENCY=2;
let worldAiActive=0;const worldAiWaiters=[];
async function withWorldAiSlot(task){
 if(worldAiActive>=WORLD_AI_CONCURRENCY)await new Promise(resolve=>worldAiWaiters.push(resolve));
 worldAiActive++;
 try{return await task()}
 finally{worldAiActive--;worldAiWaiters.shift()?.()}
}
function worldStageTask(stage){
 return ({IDENTITY:"identity",CORE_RULES:"core_rules",CORE_ANCHOR:"core_anchor",HISTORY:"history",GEOGRAPHY:"geography",FUTURE:"future",SOCIETY:"society",CAST:"cast",QUALITY_CRITIC:"quality",QUALITY_REPAIR:"quality_repair",WORLD_RECOVERY:"recovery",RUNTIME_EXPANSION:"runtime_expansion",RUNTIME_QUALITY_CRITIC:"runtime_quality",RUNTIME_REPAIR:"runtime_repair",HISTORY_DEEPENING:"history_deepening"})[stage]||"turn_state"
}
const TEMPLATE_PLACEHOLDER=/^\s*(?:\d+\s*-\s*\d+\s*字|地點類型|簡短|可空或穩定ID)(?:\s*[:：]|$)|\bnearby\b/i;
const CORE_RULE_FIELDS=["era","centralConflict","magicCost","ancientTruth","currentCrisis","tone"];
export function normalizeCoreRulesStage(value){
 if(!value||typeof value!=="object"||Array.isArray(value)||value.worldBible)return value;
 if(CORE_RULE_FIELDS.every(k=>String(value[k]||"").trim())&&value.civilization&&value.communication)return {worldBible:structuredClone(value)};
 return value
}
function normalizeGeneratedStatePatch(patch){
 if(!patch||typeof patch!=="object"||Array.isArray(patch))return patch;
 const next=structuredClone(patch);
 for(const op of (Array.isArray(next.operations)?next.operations:[])){
  if(String(op?.op||"").toUpperCase()==="DISCOVER_FACT"&&String(op?.sourceKind||"").toUpperCase()==="CANON"&&!String(op?.factId||"").trim()&&String(op?.sourceId||"").trim())op.factId=String(op.sourceId).trim()
 }
 return next
}
function generatedTemplateLeak(value){
 let found=false;const walk=v=>{if(found||v==null)return;if(typeof v==="string"){if(TEMPLATE_PLACEHOLDER.test(v))found=true;return}if(Array.isArray(v)){for(const x of v)walk(x);return}if(typeof v==="object")for(const x of Object.values(v))walk(x)};walk(value);return found
}
function weatherProfileConflict(location){
 const profile=location?.weatherProfile||{},a=new Set(Array.isArray(profile.affinities)?profile.affinities.map(String):[]),s=new Set(Array.isArray(profile.suppressions)?profile.suppressions.map(String):[]);return [...a].some(id=>s.has(id))
}
async function worldStage(stage,args){
 const locale=normalizeLocale(args?.locale||loadLocale());
 try{return await withWorldAiSlot(async()=>{
  const system=[String(args?.system||""),languageContract(locale)].filter(Boolean).join("\n");
  const value=parseJSON(await directChat({...args,locale,system,aiTask:args?.aiTask||worldStageTask(stage)}));
  if(locale==="zh-Hant"){
   const leak=simplifiedChineseLeak(value);if(leak)throw new Error(`NON_TRADITIONAL_CHINESE:${leak.character}:${leak.path}`)
  }
  return value
 })}
 catch(e){const suffix=e?.message||String(e);throw new Error(`WORLD_${stage}_FAILED: ${suffix}`)}
}
function generationTransportFailure(reason){return /Failed to fetch|fetch failed|NetworkError|ERR_NETWORK|Load failed|network request failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|connection (?:reset|closed|refused)/i.test(String(reason||""))}
function compilerRecoverable(err){const reason=String(err?.message||err||"");return generationTransportFailure(reason)||/NON_TRADITIONAL_CHINESE/.test(reason)||/AI_TIMEOUT|EMPTY_AI_RESPONSE|INVALID_MODEL_JSON|AI_HTTP_(429|5\d\d)|WORLD_[A-Z_]+_FAILED:\s*(AI_TIMEOUT|EMPTY_AI_RESPONSE|INVALID_MODEL_JSON|AI_HTTP_(429|5\d\d)|NON_TRADITIONAL_CHINESE)/.test(reason)}
let activeGenerationDiagnostics=null;
function markWorldFallback(stage,reason){
 recordGenerationStage(activeGenerationDiagnostics,stage,{source:"FALLBACK",reason,fallbackUsed:true})
}
function compactRetryArgs(args={},reason=""){
 const base=Math.max(350,Number(args.maxOutputTokens)||900),empty=/EMPTY_AI_RESPONSE|INVALID_MODEL_JSON:\s*empty response/i.test(String(reason)),timedOut=/AI_TIMEOUT/i.test(String(reason));
 const timeoutMs=empty?Math.max(45000,Math.min(70000,Number(args.timeoutMs)||50000)):timedOut?Math.max(25000,Math.min(35000,Number(args.timeoutMs)||35000)):Math.max(30000,Math.min(50000,Number(args.timeoutMs)||45000));
 const maxOutputTokens=empty?Math.min(3200,Math.max(1200,Math.round(base*1.6))):timedOut?Math.max(500,Math.min(1600,Math.round(base*.85))):Math.min(2200,Math.max(base,Math.round(base*1.15)));
 const languageRetry=/NON_TRADITIONAL_CHINESE/.test(String(reason))&&normalizeLocale(args?.locale||loadLocale())==="zh-Hant"?"\n上一次輸出含有簡體字；繁體中文模式下所有中文值必須使用正體字，JSON key、ID 與 enum 不變。":"";return {...args,timeoutMs,maxOutputTokens,disableOptimization:true,temperature:Math.min(.3,Number(args.temperature??.3)),system:String(args.system||"")+"\n上一次輸出未能通過編譯。這次停用額外思考優化並保留足夠可見輸出空間；只回傳 schema 要求的必要 JSON，不要 Markdown、解釋或額外欄位。"+languageRetry}
}
function generationCircuit(diagnostics=activeGenerationDiagnostics){
 if(!diagnostics)return {timeoutCount:0,timeoutStages:[],transportCount:0,transportStages:[],coreFailureStages:[],open:false,openedAt:0,stage:""};
 diagnostics.providerCircuit??={timeoutCount:0,timeoutStages:[],transportCount:0,transportStages:[],coreFailureStages:[],open:false,openedAt:0,stage:""};
 const circuit=diagnostics.providerCircuit;
 circuit.timeoutStages=Array.isArray(circuit.timeoutStages)?[...new Set(circuit.timeoutStages.map(String))]:[];circuit.timeoutCount=circuit.timeoutStages.length;
 circuit.transportStages=Array.isArray(circuit.transportStages)?[...new Set(circuit.transportStages.map(String))]:[];circuit.transportCount=circuit.transportStages.length;
 circuit.coreFailureStages=Array.isArray(circuit.coreFailureStages)?[...new Set(circuit.coreFailureStages.map(String))]:[];return circuit
}
function noteGenerationTimeout(stage,reason){
 if(!/AI_TIMEOUT/.test(String(reason||"")))return;
 const circuit=generationCircuit(),name=String(stage||"UNKNOWN");if(!circuit.timeoutStages.includes(name))circuit.timeoutStages.push(name);
 circuit.timeoutCount=circuit.timeoutStages.length;
 if(circuit.timeoutCount>=4&&!circuit.open){circuit.open=true;circuit.openedAt=Date.now();circuit.stage=name}
}
function noteGenerationTransportFailure(stage,reason){
 if(!generationTransportFailure(reason))return;
 const circuit=generationCircuit(),name=String(stage||"UNKNOWN");if(!circuit.transportStages.includes(name))circuit.transportStages.push(name);
 circuit.transportCount=circuit.transportStages.length;
 if(circuit.transportCount>=2&&!circuit.open){circuit.open=true;circuit.openedAt=Date.now();circuit.stage=name}
}
function noteGenerationCoreFailure(stage){
 if(!CORE_TIMEOUT_RETRY.has(String(stage||"")))return;
 const circuit=generationCircuit(),name=String(stage);if(!circuit.coreFailureStages.includes(name))circuit.coreFailureStages.push(name);
 if(CORE_TIMEOUT_RETRY.size===circuit.coreFailureStages.filter(x=>CORE_TIMEOUT_RETRY.has(x)).length&&!circuit.open){circuit.open=true;circuit.openedAt=Date.now();circuit.stage=name}
}
function generationCircuitOpen(diagnostics=activeGenerationDiagnostics){return diagnostics?.providerCircuit?.open===true}
const CORE_TIMEOUT_RETRY=new Set(["CORE_RULES","CORE_ANCHOR"]);
function noteGenerationSuccess(){
 const circuit=generationCircuit();circuit.timeoutCount=0;circuit.timeoutStages=[];circuit.transportCount=0;circuit.transportStages=[];circuit.coreFailureStages=[];circuit.open=false;circuit.openedAt=0;circuit.stage=""
}
function worldStageFallback(fallback){return structuredClone(typeof fallback==="function"?fallback():fallback)}
async function resilientWorldStage(stage,args,fallback){
 const startedAt=Date.now();
 if(generationCircuitOpen()&&fallback!==undefined){
  recordGenerationStage(activeGenerationDiagnostics,stage,{source:"FALLBACK",reason:"PROVIDER_TIMEOUT_CIRCUIT_OPEN",latencyMs:0,attempts:1,fallbackUsed:true});
  return worldStageFallback(fallback)
 }
 try{
  const value=await worldStage(stage,args);noteGenerationSuccess();
  recordGenerationStage(activeGenerationDiagnostics,stage,{source:"AI",latencyMs:Date.now()-startedAt,attempts:1});
  return value
 }catch(err){
  const firstReason=err?.message||String(err),timedOut=/AI_TIMEOUT/.test(firstReason),transportFailed=generationTransportFailure(firstReason),allowCoreTimeoutRetry=timedOut&&CORE_TIMEOUT_RETRY.has(stage);
  if(transportFailed)noteGenerationTransportFailure(stage,firstReason);
  if(!compilerRecoverable(err)){
   recordGenerationStage(activeGenerationDiagnostics,stage,{source:"FAILED",reason:firstReason,latencyMs:Date.now()-startedAt,attempts:1});
   throw err
  }
  const noTimeoutRetry=args?.retryOnTimeout===false&&timedOut&&!allowCoreTimeoutRetry;
  if(noTimeoutRetry||(generationCircuitOpen()&&!allowCoreTimeoutRetry)){
   if(timedOut)noteGenerationTimeout(stage,firstReason);
   recordGenerationStage(activeGenerationDiagnostics,stage,{source:"FALLBACK",reason:firstReason+(generationCircuitOpen()?" | PROVIDER_TIMEOUT_CIRCUIT_OPEN":""),latencyMs:Date.now()-startedAt,attempts:1,fallbackUsed:true});
   return worldStageFallback(fallback)
  }
  try{
   const value=await worldStage(stage,compactRetryArgs(args,firstReason));noteGenerationSuccess();
   recordGenerationStage(activeGenerationDiagnostics,stage,{source:"AI",reason:"RECOVERED_AFTER: "+firstReason,latencyMs:Date.now()-startedAt,attempts:2});
   return value
  }catch(retryErr){
   const retryReason=retryErr?.message||String(retryErr),reason=firstReason+" | RETRY: "+retryReason;if(/AI_TIMEOUT/.test(retryReason)||timedOut)noteGenerationTimeout(stage,reason);if(generationTransportFailure(retryReason))noteGenerationTransportFailure(stage,retryReason);noteGenerationCoreFailure(stage);
   recordGenerationStage(activeGenerationDiagnostics,stage,{source:"FALLBACK",reason,latencyMs:Date.now()-startedAt,attempts:2,fallbackUsed:true});
   return worldStageFallback(fallback)
  }
 }
}
function fallbackClause(value,fallback="當前危機",max=42){
 const s=String(value||fallback).trim().replace(/[。！？!?；;,.，]+$/g,"").replace(/\s+/g," ");
 return (s||fallback).slice(0,max)
}
function identityFallback(expected,seed){
 return normalizeWorldIdentity({},expected,seed)
}
export function coreRulesFallback(identity,blueprintProfile={}){
 const civ10=Math.max(1,Math.min(10,Number(blueprintProfile?.civilizationLevel?.value)||Math.round(((identity.magic+identity.politics+2)/2)*2)));
 const tech10=Math.max(1,Math.min(10,Number(blueprintProfile?.technologyLevel?.value)||Math.round((identity.politics+identity.magic)*1.2)));
 const magic10=Math.max(1,Math.min(10,Number(blueprintProfile?.magicLevel?.value)||Math.round(identity.magic*2)));
 const civLevel=Math.max(1,Math.min(5,Math.ceil(civ10/2))),highMagic=magic10>=7,highTech=tech10>=7,lowOrganization=civ10<=3;
 let communication;
 if(highTech&&highMagic)communication={name:"遺構共鳴網",medium:"殘存中繼設施、刻印終端與魔力節點",description:lowOrganization?"舊時高技術與魔力網仍有局部節點可用，但現存聚落缺乏能力維持完整網絡。":"高技術中繼設施與魔力節點共同維持跨區域聯絡。",latency:"NEAR_INSTANT",range:civ10>=7?"WORLD":"REGIONAL",accessRule:"ENCOUNTERED",constraints:lowOrganization?"只有少數仍供能節點可用，故障後難以維修，不能視為普遍基建。":"需要穩定供能、中繼節點與維護人員，危機時會降級。"};
 else if(highMagic)communication={name:"共鳴信標",medium:"刻印水晶與共鳴節點",description:"以本世界力量規則驅動的有限遠距聯絡網，只能聯絡已建立關係的人或節點。",latency:"NEAR_INSTANT",range:civLevel>=4?"WORLD":"REGIONAL",accessRule:"ENCOUNTERED",constraints:"需要穩定節點與能量，危機或異常天候會干擾"};
 else if(highTech)communication={name:"遺構訊鏈",medium:"殘存訊號塔與固定中繼終端",description:lowOrganization?"舊文明設備仍能局部傳訊，但現存社群只能維護少量節點。":"依賴成熟技術基建逐站中繼訊息。",latency:"DELAYED",range:civ10>=6?"REGIONAL":"LOCAL",accessRule:"ENCOUNTERED",constraints:"覆蓋受可運作節點限制，斷電或設備損毀時失效"};
 else if(civLevel>=4)communication={name:"驛塔訊鏈",medium:"固定驛塔與信號中繼",description:"依賴成熟基建逐站傳遞訊息，速度快但不是即時通訊。",latency:"DELAYED",range:"REGIONAL",accessRule:"ENCOUNTERED",constraints:"只覆蓋主要聚落與道路，斷路時失效"};
 else communication={name:"行旅信使",medium:"信使、商隊與地方驛點",description:"訊息必須跟隨實際旅程移動，符合較低文明的交通條件。",latency:"DELAYED",range:"LOCAL",accessRule:"ENCOUNTERED",constraints:"受道路、天候與危險地區影響"};
 const infrastructure=lowOrganization&&highTech?"地方組織與道路網薄弱，但仍散布少量高技術遺構與可運作設施":civLevel<=2?"道路與地方設施有限":civLevel<=4?"主要聚落間有穩定交通與公共設施":"跨區域基建成熟但仍受世界規則限制";
 const literacy=highTech?"部分社群仍依賴技術記錄與舊資料保存知識":civLevel<=2?"知識主要由口述、宗教或少數書記保存":"多數聚落具有制度化記錄與教育";
 const mobility=lowOrganization?"長距離交通不穩定，主要依賴地方路線與仍可使用的舊設施":civLevel<=2?"主要依靠步行、獸力與商隊":"主要區域之間存在固定交通網";
 return {worldBible:{era:"現世紀",centralConflict:`「${identity.worldTheme}」造成的資源、制度與生存方式衝突正逐步失衡。`,magicCost:"每次施術都會失去一段最近形成的清晰記憶；連續施術會先出現名字、方向與時間次序混亂，休息只能停止惡化，不能立即取回已失去的記憶。",ancientTruth:`現代社會對「${identity.worldTheme}」的理解只掌握表層，真正起源仍被歷史斷層掩埋。`,currentCrisis:`維持現有秩序的機制正在失效，使「${identity.worldTheme}」由背景規則變成迫近所有人的危機。`,tone:"陌生、探索、因果明確且帶有生存壓力",civilization:{level:civLevel,stage:civLevel<=2?"地方聚落文明":civLevel<=4?"區域網絡文明":"高度組織文明",infrastructure,literacy,mobility},communication}}
}
export function coreAnchorFallback(identity,blueprintProfile={}){
 const required=[...new Set((Array.isArray(blueprintProfile?.mustExist)?blueprintProfile.mustExist:[]).map(x=>String(x||"").trim()).filter(Boolean))];
 const requiredFact=required.length?`世界中確實存在「${required.join("」、「")}」，但其位置、規模與真正性質仍未被開局角色確認。`:"";
 return {summary:`「${identity.worldTheme}」不只是傳說，而係會直接改變文明生活、地理環境與危機走向的世界規則。`,worldBible:{startingRegion:`${identity.worldName}邊境域`,startingSettlement:"邊境聚落",startingLocation:"異界醒轉地",weatherSystem:{identity:`天候會受到「${identity.worldTheme}」直接影響，出現現實世界不存在的異常現象。`,source:identity.worldTheme,cycle:"隨地區、世界狀態與危機程度變化",forecastability:"MEDIUM",phenomena:[{id:"WTH-1",name:"逆相風",observableName:"風向與落物方向短暫相反",description:"局部空間規則出現偏移，風與輕物會違反平常方向。",sensoryCue:"衣角與塵埃同時逆向飄動",rarity:"UNCOMMON",danger:1},{id:"WTH-2",name:"界鳴霧",observableName:"霧中遠近聲音次序混亂",description:"霧層令聲音傳播次序失常，使距離判斷變得不可靠。",sensoryCue:"近處聲音延遲、遠處聲音反而清晰",rarity:"RARE",danger:2}]},},publicFacts:[`居民普遍知道「${identity.worldTheme}」會影響日常生活與出行。`,"不同地區會用各自方法適應異常環境，沒有全世界通用的制度。"],hiddenFacts:[`「${identity.worldTheme}」目前的表現並非世界最初狀態。`,"當前危機與被遺忘的舊世界機制存在直接因果關係。",requiredFact].filter(Boolean)}
}
function historyFallback(anchor){
 return [
  {id:"HIST-1",order:1,era:anchor.era||"古紀",title:"舊世界秩序的形成",category:"改革",summary:fallbackClause(anchor.centralConflict||anchor.worldTheme,"舊世界秩序")+"的前身在此時形成，並留下直到現在仍影響制度與生活的結構。",causes:[anchor.worldTheme],legacies:[anchor.centralConflict||"舊秩序仍在"],discoverKeywords:["舊紀錄"]},
  {id:"HIST-2",order:2,era:anchor.era||"中紀",title:"世界規則的代價浮現",category:"魔法",summary:fallbackClause(anchor.magicCost,"世界力量需要付出代價")+"，不同群體因如何承擔代價而產生長期分歧。",causes:[anchor.magicCost||anchor.centralConflict],legacies:["現代文化仍保留對力量代價的禁忌"],discoverKeywords:["古老禁忌"]},
  {id:"HIST-3",order:3,era:anchor.era||"今紀",title:"當前危機的前兆",category:"災難",summary:fallbackClause(anchor.currentCrisis||anchor.centralConflict,"當前危機")+"並非突然發生，而是過去矛盾累積到今天的結果。",causes:[anchor.centralConflict],legacies:[anchor.currentCrisis||"危機仍在發展"],discoverKeywords:["危機前兆"]}
 ]
}
function geographyFallback(anchor){
 const firstWeather=anchor.weatherPhenomena?.[0]?.id||"",cue=anchor.weatherPhenomena?.[0]?.observableName||"空氣中的流動方向忽然變得不自然";
 return {openingHook:`冰冷而潮濕的地面貼著背脊。遠處傳來一聲延遲的金屬鳴響，${cue}；霧後似乎有腳步靠近，但你無法判斷方向與距離。`,location:{name:anchor.startingLocation,type:"開局地點",region:anchor.startingRegion,description:`位於${anchor.startingRegion}的開局地點，其地貌與${anchor.worldTheme}直接相關。`,known:false,historyRefs:[],weatherProfile:{zone:anchor.startingRegion,affinities:firstWeather?[firstWeather]:[],suppressions:[]},lore:{story:`這個地方留下了與${anchor.centralConflict}有關的痕跡。`,unlockKeywords:["舊痕跡"],minMatches:1}}}
}
function societyFallback(anchor,history,geography){
 const href=history?.[0]?.id||"HIST-1",location=geography?.location?.name||anchor.startingLocation;
 return {locationRef:location,historyRefs:[href],locationCulture:{identity:`在${anchor.worldTheme}與本地環境下形成的生活文化`,etiquette:["先觀察當地人的做法再行動"],taboos:["不要公開輕視本地維生方式"],food:["以本地可取得物資為主"],beliefs:[anchor.centralConflict||anchor.worldTheme],architecture:["配合本地環境與天候"],clothing:["適應當地環境"],hospitality:["對陌生人先保持觀望"],namingStyle:"地方化命名",languageNotes:[]},locationTrade:{mode:"barter",currencies:[],commonBarter:["食物","工具"],foreignAcceptance:[],priceCulture:"價值取決於本地稀缺程度",questReward:0,combatReward:0},faction:{name:`${anchor.startingRegion}在地共同體`,goal:`應對「${fallbackClause(anchor.currentCrisis||anchor.centralConflict,"當前危機",34)}」帶來的壓力，維持地方生存與秩序`,description:`扎根於${location}附近，制度受${history?.[0]?.title||"舊歷史"}影響。`,known:false,locationName:location,historyRefs:[href],culture:{identity:"重視地方生存與互助",etiquette:["尊重地方規矩"],taboos:["破壞共同生存資源"],beliefs:[anchor.worldTheme]},trade:{mode:"barter",currencies:[],commonBarter:["食物","工具"],foreignAcceptance:[],priceCulture:"按稀缺程度交換",questReward:0,combatReward:0},lore:{story:`共同體的形成與「${history?.[0]?.title||"舊歷史"}」直接相關。`,unlockKeywords:[history?.[0]?.title||"舊歷史"],minMatches:1}}}
}
function futureFallback(anchor,history,pacing){
 const slots=timelineAuthoringSlots(pacing),templates=[
  h=>({title:"舊有訊路突然中斷",category:"INFRASTRUCTURE",directorTruth:`源自「${h.title}」留下的制度或設施弱點，在當前危機下首先失效。`,observableEffect:"附近居民開始發現固定聯絡與運輸節點無法如常運作，消息與物資出現延誤。"}),
  h=>({title:"外來避難者抵達邊境",category:"MIGRATION",directorTruth:`「${h.title}」留下的區域矛盾被重新引爆，迫使一批人口離開原居地。`,observableEffect:"帶著不同口音與少量行李的陌生人陸續出現，當地食物、住宿與治安開始受壓。"}),
  h=>({title:"力量代價登記開始強制執行",category:"LAW",directorTruth:`「${h.title}」形成的禁忌與制度被重新啟用，用來控制危機下的超常力量使用。`,observableEffect:"公共場所出現新的檢查與登記要求，居民談論施術代價與違規後果。"}),
  h=>({title:"主要通路因異常天候封閉",category:"WEATHER",directorTruth:`「${h.title}」造成的環境遺產與現時天候循環疊加，使一條重要通路暫時無法安全通行。`,observableEffect:"商隊改道、路標被封，市場開始出現某些日用品供應不足。"}),
  h=>({title:"地方共同體出現公開分裂",category:"POLITICS",directorTruth:`「${h.title}」留下的利益衝突，在「${fallbackClause(anchor.currentCrisis||anchor.centralConflict,"當前危機",34)}」造成的壓力下失去妥協空間。`,observableEffect:"同一聚落的人開始公開支持不同處理方案，守衛、商人與居民的行動不再一致。"}),
  h=>({title:anchor.currentCrisis||"危機進入不可忽視的轉折",category:"CRISIS",directorTruth:"過去歷史累積的矛盾在此時匯合，令當前危機正式改變區域秩序。",observableEffect:"原本零散的異常同時出現，居民開始撤離、封鎖或重新分配資源，日常秩序明顯改變。"})
 ];
 const profiles=[{impactScope:"REGIONAL",intensity:35,duration:2,domains:["INFRASTRUCTURE","COMMUNICATION"],playerCanMitigate:true,playerCanRedirect:true},{impactScope:"REGIONAL",intensity:45,duration:5,domains:["MIGRATION","SUPPLY","SECURITY"],playerCanMitigate:true,playerCanRedirect:true},{impactScope:"LOCAL",intensity:35,duration:4,domains:["LAW","SOCIETY"],playerCanMitigate:true,playerCanRedirect:false},{impactScope:"REGIONAL",intensity:50,duration:3,domains:["WEATHER","TRANSPORT","SUPPLY"],playerCanMitigate:true,playerCanRedirect:true},{impactScope:"REGIONAL",intensity:55,duration:7,domains:["POLITICS","SECURITY"],playerCanMitigate:true,playerCanRedirect:true},{impactScope:"NATIONAL",intensity:70,duration:10,domains:["CRISIS","SECURITY","SUPPLY"],playerCanMitigate:true,playerCanRedirect:true}];
 const rows=slots.map((slot,i)=>{const h=history?.[i%Math.max(1,history.length)]||{id:"HIST-1",title:"既有歷史"},t=templates[Math.min(i,templates.length-1)](h),p=profiles[Math.min(i,profiles.length-1)];return {...t,...p,slot:slot.slot,pressure:Math.min(15,3+i),affectedRegions:[anchor.startingRegion],playerCanPrevent:true,playerCanAccelerate:true,links:{historyRefs:[h.id||"HIST-1"],locationRefs:["STARTING_REGION"]}}});
 return {worldCalendar:{name:`${anchor.worldName}紀`,epochName:anchor.era||"現紀",dayTerm:"日",cycleTerm:"旬",longCycleTerm:"輪",daysPerCycle:10,cyclesPerLongCycle:10,cycles:["初旬","中旬","末旬"],periods:[{name:"前段",fromMinute:0,toMinute:479},{name:"中段",fromMinute:480,toMinute:959},{name:"後段",fromMinute:960,toMinute:1439}]},worldTimeline:bindTimelineAuthoringSlots(rows,pacing)}
}
function castFallback(anchor,history,region,society){
 const location=anchor.startingLocation,faction=society?.faction?.name||"";
 return {npcs:[{name:"當地引路人",role:"居民",behaviorProfile:{mannerisms:["緊張時會先看向出入口"],speechPatterns:["回答前先說自己能確認到哪一步"],habits:["會記住附近人流與出口"],values:["保護自己的生活圈"],fears:["錯誤判斷令身邊的人受害"],contradictions:["對陌生人謹慎，卻又不願放著求助者不管"],promises:[],grudges:[]},description:`生活在${location}、熟悉最基本地方規矩的人。`,personality:"對陌生人謹慎但願意回答眼前問題",goal:"確保自己與聚落安全",locationName:location,factionName:faction,knowledgeScope:(anchor.publicFacts||[]).slice(0,2),historyRefs:[history?.[0]?.id||"HIST-1"],known:true,companionProfile:{joinThreshold:45,leaveThreshold:10,motives:["保護自己的生活圈"],boundaries:["不會為陌生人無條件冒險"]},lore:{story:`家族記憶與「${history?.[0]?.title||"舊歷史"}」有關。`,unlockKeywords:[history?.[0]?.title||"舊歷史"],minMatches:1}}],sideQuests:[],suggestions:["循著剛才的異常聲音找出來源","檢查附近地面有沒有新留下的腳印或拖痕","找一個能看清出入口的人，問他剛才發生了甚麼"]}
}

async function recoverFallbackWorldCandidate(candidate,diagnostics,report){
 if(generationCircuitOpen(diagnostics)){diagnostics.recovery={attempted:false,succeeded:false,reason:"PROVIDER_TIMEOUT_CIRCUIT_OPEN",finishedAt:Date.now()};return candidate}
 const before=finalizeGenerationDiagnostics(diagnostics);
 const stageRows=Object.entries(before.stages||{}),fallbackStages=stageRows.filter(([,row])=>row?.source==="FALLBACK").map(([stage])=>stage);
 if(fallbackStages.length<4||fallbackStages.length*2<Math.max(1,stageRows.length))return candidate;
 diagnostics.recovery={attempted:true,succeeded:false,startedAt:Date.now(),fallbackStages:[...fallbackStages],recoveredStages:[]};
 report(85,"世界自動復原",`偵測到 ${fallbackStages.length}/${stageRows.length} 個階段使用 fallback；只重寫 fallback 內容，保留成功 AI Canon`);
 try{
  const recoveryPatch=await worldStage("WORLD_RECOVERY",{
   timeoutMs:65000,maxOutputTokens:2400,temperature:.45,
   system:`你是 Elyndra World Recovery Architect。只有 payload.fallbackStages 列出的階段可重寫；其他 AI 成功階段視為鎖定 Canon，不得改。永遠禁止改 worldName、worldTheme、seedCompliance。CORE_RULES fallback 可重寫 worldBible 的規則／文明／通訊；CORE_ANCHOR fallback 可重寫 summary、startingRegion/Settlement/Location、Weather、公私 facts；HISTORY fallback 可重寫既有 worldHistory 內容但保留 HIST id/order；GEOGRAPHY fallback 可重寫 openingHook 與既有 location 描述；FUTURE fallback 可重寫 calendar 描述與 Timeline title/category/directorTruth/observableEffect/pressure，但保留 id/日期窗口/links；SOCIETY fallback 可重寫 location culture/trade 與既有 faction，包括名稱；CAST fallback 可重寫既有 NPC/sideQuest，包括名稱。不得新增或刪除實體，historyRefs 不可改。若重新命名 Anchor/Faction/NPC，Engine 會同步引用。目標係消除「異界醒轉地」「當地引路人」「在地共同體」等模板佔位內容，並令所有 fallback 部分具體服務 worldTheme 與已鎖定歷史。openingHook 必須保持符合 candidate.originOpening / playerOrigin 的知識視角，而且開局 1–3 回合內必須已經有一個可見或可聽見、立即、可採取行動、尚未解決的具體異常；不能只有氣氛與「四周很陌生」。可使用逃跑者、突然停止的鐘聲、受傷陌生人、封閉入口、追逐、求救等形式，但不得洩漏未發現 Canon。只輸出 JSON：{"patch":{...},"changedTargets":["..."]}。`,
   user:JSON.stringify({fallbackStages,candidate})
  });
  const recovered=applyFallbackRecoveryPatch(candidate,recoveryPatch,diagnostics);
  diagnostics.recovery={...diagnostics.recovery,succeeded:true,finishedAt:Date.now(),recoveredStages:[...fallbackStages],changedTargets:Array.isArray(recoveryPatch?.changedTargets)?recoveryPatch.changedTargets:[]};
  return recovered
 }catch(e){
  diagnostics.recovery={...diagnostics.recovery,succeeded:false,finishedAt:Date.now(),reason:e?.message||String(e)};
  return candidate
 }
}

async function evaluateWorldQuality(candidate,diagnostics){
 if(generationCircuitOpen(diagnostics))return fallbackWorldEvaluation(candidate,diagnostics,"PROVIDER_TIMEOUT_CIRCUIT_OPEN");
 try{
  const raw=await worldStage("QUALITY_CRITIC",{
   timeoutMs:50000,maxOutputTokens:1500,temperature:.25,
   system:`你是 Elyndra World Critic。你不負責續寫故事，只評估這個世界候選。分別評 internalConsistency、originality、worldDepth、historyIntegration、geography、societyCulture、magicSystem、factions、characters、futureEvents、playability、knowledgeBoundary，每項0-100；overall 0-100。特別檢查 fallback 模板味、未來 Timeline 是否真的是事件、魔法規則是否可執行、History 是否以結構化 refs 連到 Location/NPC/Faction、openingHook 是否遵守 candidate.originOpening 與 playerOrigin 的知識權限；World Theme 永遠不可直接當成玩家已知抽象真相。findings 最多8項，每項包含 severity、targetType、targetIds、problem、evidence、recommendation、requiresRegeneration。只輸出 JSON。`,
   user:JSON.stringify({candidate,generationDiagnostics:finalizeGenerationDiagnostics(diagnostics)})
  });
  return normalizeWorldEvaluation(raw,{source:"AI"})
 }catch(e){
  return fallbackWorldEvaluation(candidate,diagnostics,e?.message||String(e))
 }
}
async function reviewAndRepairWorldCandidate(candidate,diagnostics,report){
 let current=structuredClone(candidate),evaluation=await evaluateWorldQuality(current,diagnostics),repairHistory=[];
 if(generationCircuitOpen(diagnostics)){current.generationDiagnostics=finalizeGenerationDiagnostics(diagnostics);current.worldQuality={...evaluation,repairHistory,skippedAIRepair:true};return current}
 for(let pass=1;pass<=2&&evaluation.overall<80&&evaluation.findings.some(x=>x.requiresRegeneration);pass++){
  report(85,"AI 世界評審與修復",`世界品質 ${evaluation.overall}/100；正在定點修復第 ${pass} 輪，不重寫已鎖定歷史、Seed Contract 或 Timeline 時間窗口`);
  let repair;
  try{
   repair=await worldStage("QUALITY_REPAIR",{
    timeoutMs:65000,maxOutputTokens:1900,temperature:.45,
    system:`你是 Elyndra World Repair Architect。根據 critic findings 只輸出需要修補的 patch。禁止改 worldName、worldTheme、seedCompliance、worldHistory、worldCalendar、startingRegion、startingSettlement、startingLocation；禁止更改 Timeline 的 id/日期窗口/links/impactScope/affectedRegions/intensity/duration/domains/playerCanPrevent/playerCanAccelerate/playerCanMitigate/playerCanRedirect。優先修正模板化內容、具體魔法代價、事件性、文化與角色深度、符合 Origin knowledge boundary 的 openingHook。generation 只能修改既有陣列同 index 的描述性欄位，不可新增、刪除或重新命名實體；historyRefs 必須保留。只輸出 JSON：{"patch":{...},"changedTargets":["..."]}。`,
    user:JSON.stringify({candidate:current,evaluation})
   })
  }catch{break}
  const before=evaluation.overall;
  current=applyWorldRepairPatch(current,repair);
  evaluation=await evaluateWorldQuality(current,diagnostics);
  repairHistory.push({pass,before,after:evaluation.overall,targets:Array.isArray(repair?.changedTargets)?repair.changedTargets:evaluation.repairTargets,at:Date.now()})
 }
 current.generationDiagnostics=finalizeGenerationDiagnostics(diagnostics);
 current.worldQuality={...evaluation,repairHistory};
 return current
}

export async function generateWorldCandidate(seed,constitution,onProgress){
 const diagnostics=createGenerationDiagnostics();activeGenerationDiagnostics=diagnostics;
 let progressFloor=0;const report=(progress,label,detail)=>{if(progress<progressFloor)return;progressFloor=progress;emitWorldProgress(onProgress,progress,label,detail)};
 const directive=seedDirective(seed),auto=directive.contract.worldviewMode==="ai",expected=directive.contract;
 const chosen=v=>v==="AI_DECIDES"||v==null?"AI 必須自行決定並回傳具體值":v;
 if(hasDirectAI()){
  report(42,"世界身份","先用短請求鎖定唯一 World Identity；失敗時由 Seed Contract 安全補上");
  const identityRaw=await resilientWorldStage("IDENTITY",{
   timeoutMs:35000,retryOnTimeout:false,maxOutputTokens:500,
   system:`你是 Elyndra World Identity Compiler。只決定最小世界身份，不生成文明細節、天氣、歷史、地點、NPC 或任務。worldviewMode=style 時 genre/scale/danger/magic/politics 必須完全遵守 expected；worldviewMode=ai 時可自行決定，但所有值必須互相形成同一個世界主題。worldTheme 必須具體、可驅動世界規則與衝突。只輸出 JSON。`,
   user:JSON.stringify({seed,expected,blueprintProfile:directive.blueprintProfile,styleFoundation:directive.styleFoundation,randomEntropy:directive.randomEntropy,required:{worldName:"2-12字世界名",worldTheme:"具體核心主題",playerName:seed.playerName||"",genre:chosen(expected.genre),scale:chosen(expected.scale),danger:auto?"1-5":expected.danger,magic:auto?"1-5":expected.magic,politics:auto?"1-5":expected.politics,premise:"30-70字，解釋主題如何成為世界規則"}})
  },()=>identityFallback(expected,seed));
  const identity=normalizeWorldIdentity(identityRaw,expected,seed);

  report(47,"雙 AI 世界核心","最多兩個 AI 同時生成規則與開局 Anchor；兩邊共享同一 World Identity Contract");
  let [rulesRaw,anchorRaw]=await Promise.all([
   resilientWorldStage("CORE_RULES",{
    timeoutMs:50000,retryOnTimeout:false,maxOutputTokens:900,
    system:`你是 Elyndra Core Rules Compiler。blueprintProfile 是 Engine 已解析的硬性 World Blueprint，所有 resolved value 與 source 都不得改寫；你的工作是把它具體化為一致世界。blueprintProfile.mustExist 是硬性世界要素：凡屬規則、科技、文明或通訊層的項目都必須實際具體化，並在對應敘述中至少保留一次該標籤原詞，方便 Engine 驗證；不可只複製清單。只能根據 identity、Seed Contract 與 blueprintProfile 補充世界硬規則：時代、核心衝突、魔法代價、古代真相、當前危機、敘事氣氛、文明程度與遠距通訊。不得改 worldName/worldTheme，不得生成地點、Weather、歷史 Timeline、NPC 或任務。civilization 與 communication 必須互相合理；低文明／低魔法不可無理由出現即時全球網絡。所有規則都必須直接服務 identity.worldTheme。只輸出 JSON。`,
    user:JSON.stringify({identity,seedContract:expected,blueprintProfile:directive.blueprintProfile,styleFoundation:directive.styleFoundation,required:{worldBible:{era:"世界自己的時代稱呼",centralConflict:"40-80字，直接源於 worldTheme",magicCost:"至少20字硬規則與代價",ancientTruth:"40-80字深層真相",currentCrisis:"40-80字正在發展危機",tone:"敘事氣氛",civilization:{level:"1-5",stage:"文明階段名稱",infrastructure:"基建程度",literacy:"教育／識字狀況",mobility:"交通與人口流動"},communication:{name:"世界內聯絡方式",medium:"媒介",description:"如何運作且為何符合文明／魔法程度",latency:"NONE|DELAYED|NEAR_INSTANT|INSTANT",range:"LOCAL|REGIONAL|WORLD",accessRule:"ENCOUNTERED",constraints:"限制與代價"}}}})
   },()=>coreRulesFallback(identity,directive.blueprintProfile)),
   resilientWorldStage("CORE_ANCHOR",{
    timeoutMs:50000,retryOnTimeout:false,maxOutputTokens:1000,
    system:`你是 Elyndra Core Anchor Compiler。只能根據 identity 與 Seed Contract 定義：世界概要、開局區域／聚落／出生位置、Weather Canon、公開事實與真正秘密。blueprintProfile.mustExist 的每一項都必須在世界 Canon 實際存在；summary、publicFacts 或 hiddenFacts 至少要有一處保留每個標籤的原詞並說明它如何存在，不可只複製清單。publicFacts 與 hiddenFacts 必須放在 JSON root，不能放入 worldBible。不得改 worldName/worldTheme，不得生成歷史 Timeline、勢力、NPC 或任務。startingRegion/Settlement/Location、Weather、publicFacts、hiddenFacts 必須全部可以由 identity.worldTheme/premise 解釋，避免互相無關的拼貼設定。出生位置亦必須符合 blueprintProfile.origin：crossing 應像無登記的突然抵達；summoned 應合理接近召喚方可接觸的位置；native/reincarnation 應像既有地方生活的一部分；possession 應符合 host 身份；amnesia 要支援記憶缺口。這只決定地點因果，不可替玩家新增未授權知識。至少2個 Weather phenomena，其中至少1個明顯屬於異世界。只輸出 JSON。`,
    user:JSON.stringify({identity,seedContract:expected,blueprintProfile:directive.blueprintProfile,required:{summary:"70-130字",worldBible:{startingRegion:"開局區域",startingSettlement:"附近首個文明聚落",startingLocation:"玩家真實出生位置",weatherSystem:{identity:"20-50字天氣法則",source:"天氣來源",cycle:"變化方式",forecastability:"LOW|MEDIUM|HIGH",phenomena:[{id:"WTH-1",name:"異世界天候名",observableName:"感官描述",description:"20-40字",sensoryCue:"直接可感知",rarity:"COMMON|UNCOMMON|RARE|EXTREME",danger:"0-5"},{id:"WTH-2",name:"異世界天候名",observableName:"感官描述",description:"20-40字",sensoryCue:"直接可感知",rarity:"COMMON|UNCOMMON|RARE|EXTREME",danger:"0-5"}]}},publicFacts:["2-3項與 worldTheme 直接相關的公開事實"],hiddenFacts:["2-3項與 worldTheme/current premise 直接相關的秘密"]}})
   },()=>coreAnchorFallback(identity,directive.blueprintProfile))
  ]);

  const rulesRequired=CORE_RULE_FIELDS;
  let rules=normalizeCoreRulesStage(rulesRaw);
  if(!rules?.worldBible||rulesRequired.some(k=>!String(rules.worldBible?.[k]||"").trim())||!rules.worldBible.civilization||!rules.worldBible.communication){markWorldFallback("CORE_RULES","STRUCTURE_INVALID");rules=coreRulesFallback(identity,directive.blueprintProfile)};
  let coreAnchor=normalizeCoreAnchorStage(anchorRaw);
  if(!coreAnchor?.worldBible||["startingRegion","startingSettlement","startingLocation"].some(k=>!String(coreAnchor.worldBible?.[k]||"").trim())||!coreAnchor.worldBible.weatherSystem||!Array.isArray(coreAnchor.publicFacts)||!Array.isArray(coreAnchor.hiddenFacts)){markWorldFallback("CORE_ANCHOR","STRUCTURE_INVALID");coreAnchor=coreAnchorFallback(identity,directive.blueprintProfile)};

  let core=mergeCoreWave(identity,expected,rules,coreAnchor),coreIssues=coreWaveIssues(identity,rules,coreAnchor,core);
  if(coreIssues.length){
   markWorldFallback("CORE_RULES","CORE_WAVE_INVALID:"+coreIssues.join(","));
   markWorldFallback("CORE_ANCHOR","CORE_WAVE_INVALID:"+coreIssues.join(","));
   rules=coreRulesFallback(identity,directive.blueprintProfile);coreAnchor=coreAnchorFallback(identity,directive.blueprintProfile);
   core=mergeCoreWave(identity,expected,rules,coreAnchor);coreIssues=coreWaveIssues(identity,rules,coreAnchor,core)
  }
  if(coreIssues.length)throw new Error(`WORLD_CORE_INVALID: ${coreIssues.join(",")}`);
  report(52,"世界核心完成","Identity、Rules、Anchor 已合併成單一 World Anchor Contract");

  const anchor=buildWorldAnchorContract(core,directive.timelinePacing),originOpening=originOpeningContract({player:{origin:seed.creationV2?.originProfile||{}},world:{creation:seed.creationV2||{},state:{day:1}}});
  report(56,"雙 AI 編譯 Wave 1","最多兩個 AI 同時生成：過去歷史與開局地理；兩者共享同一 World Anchor Contract");

  const [historyRaw,geographyRaw]=await Promise.all([
   resilientWorldStage("HISTORY",{
    timeoutMs:75000,retryOnTimeout:false,maxOutputTokens:1200,
    system:`你是 Elyndra History Compiler。只生成 3 個不可改寫的過去歷史 Canon。所有內容必須直接解釋 anchor 的 centralConflict、magicCost、civilization 或 currentCrisis 如何形成。每個事件使用指定 HIST-1..3 id。不要生成未來 Timeline、地點、勢力、NPC 或任務。只輸出 JSON。`,
    user:JSON.stringify({anchor,required:{worldHistory:Array.from({length:3},(_,i)=>({id:`HIST-${i+1}`,order:i+1,era:"世界內時代",title:"重大歷史事件",category:"戰爭|王朝|宗教|技術|魔法|遷徙|災難|改革",summary:"40-80字",causes:["最多1項"],legacies:["1-2項現代仍存在影響"],discoverKeywords:["1-2線索"]}))}})
   },()=>({worldHistory:historyFallback(anchor)})),
   resilientWorldStage("GEOGRAPHY",{
    timeoutMs:50000,retryOnTimeout:false,maxOutputTokens:800,
    system:`你是 Elyndra Geography Compiler。只生成 openingHook 與唯一開局地點的物理／環境資料，不生成文化、交易、勢力、NPC、任務。location.name 與 region 必須分別等於 anchor.startingLocation / anchor.startingRegion。地貌、建築外觀與 weatherProfile 必須能由 anchor.worldTheme、weatherPhenomena、currentCrisis 解釋；weather id 只能引用 anchor.weatherPhenomena。openingHook 的玩家起源只以 payload.playerOrigin 與 payload.originOpening 為權威；不得自行假設玩家來自現代地球。originOpening.worldNameKnown / calendarKnown / openingMode 決定開場可否直接理解世界名稱、曆法與地方背景；只可使用 playerOrigin.commonKnowledge、initialAssumptions、worldKnowledgeBoundary 及 originOpening 授權內容。未授權異世界專有名詞、歷史、人物、魔法規則或地方文化不可提前知道。openingHook 必須在第一幕就包含一個可見或可聽見、立即、可採取行動、尚未解決的具體異常，例如有人逃跑、鐘聲突然停止、傷者求助、入口封閉、追逐或突發破壞；玩家必須能立刻想到至少三種不同反應，不能只有神秘氣氛。只輸出 JSON。`,
    user:JSON.stringify({anchor,playerOrigin:seed.creationV2?.originProfile||null,originOpening,required:{openingHook:"80-160字符合 Origin knowledge boundary 的感官開場；必須有立即可行動的具體異常，且至少暗示三種可採取反應",location:{name:anchor.startingLocation,type:"具體地點用途或形態；不得輸出「地點類型」",region:anchor.startingRegion,description:"40-90字物理環境",known:false,weatherProfile:{zone:"地理天候區",affinities:["anchor weather id"],suppressions:["anchor weather id"]},lore:{story:"40-80字環境留下的歷史痕跡",unlockKeywords:["1-2線索"],minMatches:1}}}})
   },()=>geographyFallback(anchor))
  ]);
  const historyReport=validateWorldHistory(historyRaw?.worldHistory);if(!historyReport.valid)markWorldFallback("HISTORY","VALIDATION_FAILED:"+historyReport.errors.join(","));const history=historyReport.valid?historyReport.history:historyFallback(anchor);
  let geography=geographyRaw;
  const geographySemanticIssues=[];if(generatedTemplateLeak(geography))geographySemanticIssues.push("TEMPLATE_LEAK");if(weatherProfileConflict(geography?.location))geographySemanticIssues.push("WEATHER_PROFILE_CONFLICT");
  if(!geography?.openingHook||!geography?.location||geography.location.name!==anchor.startingLocation||geography.location.region!==anchor.startingRegion||geographySemanticIssues.length){markWorldFallback("GEOGRAPHY",geographySemanticIssues.length?"SEMANTIC_INVALID:"+geographySemanticIssues.join(","):"STRUCTURE_OR_ANCHOR_INVALID");geography=geographyFallback(anchor)};
  report(64,"雙 AI 編譯 Wave 2","歷史與地理已鎖定；最多兩個 AI 同時生成未來 Timeline 與地方社會，兩者必須引用 Wave 1");

  const slots=timelineAuthoringSlots(directive.timelinePacing);
  const [futureRaw,societyRaw]=await Promise.all([
   resilientWorldStage("FUTURE",{
    timeoutMs:75000,retryOnTimeout:false,maxOutputTokens:4200,
    system:`你是 Elyndra Future Compiler。根據同一 anchor、已鎖定 history、geography 與 blueprintProfile.storyTendencies 生成世界曆法及「可能發生」的未來 Timeline。故事偏好不是固定劇情；每個事件必須提供 activationConditions / cancelConditions / escalationConditions，條件只可使用 DAY>=n、EVENT:TYPE、FACT:id、FLAG:key、LOCATION:name 及 NOT: 前綴。你必須同時作者化 impactScope（LOCAL|REGIONAL|NATIONAL|CONTINENTAL|WORLD）、affectedRegions、intensity 0-100、duration（世界日，可 null）、domains，以及 playerCanPrevent / playerCanAccelerate / playerCanMitigate / playerCanRedirect；Scope 與 intensity 必須符合事件內容，不可全部填成同一值。每個事件必須透過 links.historyRefs 或 links.locationRefs 明確連回既有歷史／開局地理；禁止新增無來源文明、勢力或地點。日期窗口由 Engine slots 決定，你不要自行改 earliest/latest。所有自由文字欄位保持精簡：directorTruth 與 observableEffect 各最多 40 字；conditions 各最多 2 項；affectedRegions 最多 2 項；domains 最多 2 項；不要輸出 Markdown、解釋或額外欄位。只輸出 JSON。`,
    user:JSON.stringify({anchor,history,geography,blueprintProfile:directive.blueprintProfile,timelineSlots:slots,required:{worldCalendar:{name:"曆法名",epochName:"紀元",dayTerm:"日序",cycleTerm:"短週期",longCycleTerm:"長週期",daysPerCycle:"3-60",cyclesPerLongCycle:"3-30",cycles:["3-6名稱"],periods:[{name:"時段",fromMinute:0,toMinute:359}]},worldTimeline:slots.map((slot,i)=>({slot:slot.slot,title:`事件${i+1}`,category:"類型",directorTruth:"20-50字隱藏因果",observableEffect:"20-50字可觀察影響",pressure:"0-15",impactScope:"LOCAL|REGIONAL|NATIONAL|CONTINENTAL|WORLD",affectedRegions:["只能用已存在區域；至少包含與事件直接相關區域"],intensity:"0-100",duration:"1-30 世界日或 null",domains:["1-4個，如 SECURITY|POLITICS|SUPPLY|WEATHER|MAGIC|MIGRATION|LAW|ECONOMY"],activationConditions:["DAY>=2"],cancelConditions:["可空；EVENT:PEACE_TREATY 等"],escalationConditions:["可空；FLAG:war_tension 等"],playerCanPrevent:true,playerCanAccelerate:true,playerCanMitigate:true,playerCanRedirect:true,links:{historyRefs:["至少1個 HIST id"],locationRefs:["STARTING_LOCATION|STARTING_REGION 或 anchor 名稱"]}}))}})
   },()=>futureFallback(anchor,history,directive.timelinePacing)),
   resilientWorldStage("SOCIETY",{
    timeoutMs:55000,retryOnTimeout:false,maxOutputTokens:1400,
    system:`你是 Elyndra Society Compiler。只生成開局地點的 culture、trade 與最多1個地方 faction。你必須以已鎖定 geography 作生活環境，以 history 作制度／禁忌／信仰來源。locationRef 必須等於 anchor.startingLocation，historyRefs 必須引用既有 HIST id。禁止重新命名地點或創造第二個地點。只輸出 JSON。`,
    user:JSON.stringify({anchor,history,geography,required:{locationRef:anchor.startingLocation,historyRefs:["至少1個 HIST id"],locationCulture:{identity:"文化核心",etiquette:["1項"],taboos:["1項"],food:["1項"],beliefs:["1項"],architecture:["1項"],clothing:["1項"],hospitality:["1項"],namingStyle:"具體命名規則；不得輸出「簡短」",languageNotes:[]},locationTrade:{mode:"currency|barter|mixed|ration|token",currencies:[{id:"可空或穩定ID",name:"名稱",symbol:"",issuer:"發行者",description:"簡短"}],commonBarter:["0-2項"],foreignAcceptance:[],priceCulture:"簡短",questReward:0,combatReward:0},faction:{name:"地方勢力",goal:"與 currentCrisis/歷史遺產有關",description:"40-80字",known:false,locationName:anchor.startingLocation,historyRefs:["至少1個 HIST id"],culture:{identity:"核心文化",etiquette:["1項"],taboos:["1項"],beliefs:["1項"]},trade:{mode:"currency|barter|mixed|ration|token",currencies:[],commonBarter:[],foreignAcceptance:[],priceCulture:"簡短",questReward:0,combatReward:0},lore:{story:"40-80字",unlockKeywords:["1-2線索"],minMatches:1}}}})
   },()=>societyFallback(anchor,history,geography))
  ]);

  let society=societyRaw;
  if(!society||typeof society!=="object"||Array.isArray(society)||generatedTemplateLeak(society)){markWorldFallback("SOCIETY",generatedTemplateLeak(society)?"SEMANTIC_INVALID:TEMPLATE_LEAK":"STRUCTURE_INVALID");society=societyFallback(anchor,history,geography)};
  const politics=Number(core?.seedCompliance?.politics?.value??expected.politics);
  if(politics>=4&&!String(society?.faction?.name||"").trim()){markWorldFallback("SOCIETY","SEED_POLITICS_STRUCTURE_MISSING");society=societyFallback(anchor,history,geography)}
  let region=mergeOpeningRegion(anchor,geography,society);
  const futureFallbackCandidate=futureFallback(anchor,history,directive.timelinePacing),futureRows=timelineAuthoringSlots(directive.timelinePacing).map((_,i)=>{const x=Array.isArray(futureRaw?.worldTimeline)?futureRaw.worldTimeline[i]:null;return x&&typeof x==="object"&&String(x.title||"").trim()&&String(x.directorTruth||"").trim().length>=8&&String(x.observableEffect||"").trim().length>=8?x:futureFallbackCandidate.worldTimeline[i]}),authoredTimeline=bindTimelineAuthoringSlots(futureRows,directive.timelinePacing),timelineReport=validateWorldTimeline(authoredTimeline,directive.timelinePacing);
  if(!timelineReport.valid)markWorldFallback("FUTURE","TIMELINE_VALIDATION_FAILED:"+timelineReport.errors.join(","));
  let future=timelineReport.valid?normalizeFutureLinksToAnchor({worldCalendar:(futureRaw?.worldCalendar&&typeof futureRaw.worldCalendar==="object")?futureRaw.worldCalendar:futureFallbackCandidate.worldCalendar,worldTimeline:timelineReport.timeline},anchor,history):futureFallbackCandidate;
  if(!future?.worldCalendar||!Array.isArray(future.worldTimeline))throw new Error("WORLD_FUTURE_INVALID");
  let linkIssues=worldGenerationLinkIssues({anchor,history,geography,society,future});
  let societyIssues=linkIssues.filter(x=>x.startsWith("SOCIETY_")),futureIssues=linkIssues.filter(x=>x.startsWith("FUTURE_")),sharedIssues=linkIssues.filter(x=>!x.startsWith("SOCIETY_")&&!x.startsWith("FUTURE_"));
  if(societyIssues.length){markWorldFallback("SOCIETY","CROSS_STAGE_LINK_INVALID:"+societyIssues.join(","));society=societyFallback(anchor,history,geography);region=mergeOpeningRegion(anchor,geography,society)}
  if(futureIssues.length){markWorldFallback("FUTURE","CROSS_STAGE_LINK_INVALID:"+futureIssues.join(","));future=futureFallback(anchor,history,directive.timelinePacing)}
  linkIssues=worldGenerationLinkIssues({anchor,history,geography,society,future});sharedIssues=linkIssues.filter(x=>!x.startsWith("SOCIETY_")&&!x.startsWith("FUTURE_"));
  if(sharedIssues.length||linkIssues.some(x=>x.startsWith("SOCIETY_")||x.startsWith("FUTURE_")))throw new Error("WORLD_LINK_INVALID:"+linkIssues.join(","));

  report(74,"雙 AI 編譯 Wave 3","前兩波 Canon 關係已鎖定；最後只用一個 AI 生成附近人物與支線");
  let cast=await resilientWorldStage("CAST",{
   timeoutMs:55000,retryOnTimeout:false,maxOutputTokens:2400,
   system:`你是 Elyndra Opening Cast Compiler。只生成1個附近 NPC、最多1個支線與3-4個 suggestions。這名附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true；這只公開人物存在與外觀，不代表玩家知道其 lore、秘密或知識。你必須使用既有 anchor/history/geography/society/future：NPC 必須在 anchor.startingLocation，factionName 只能引用 society.faction.name 或留空；historyRefs 只能引用既有 HIST id。NPC 必須有可觀察且一致的人格：至少給出一項習慣動作、說話模式、日常習慣、價值、恐懼與內在矛盾，寫入 behaviorProfile；不要把這些做成數值。支線必須以 locationName、npcName、factionName 或 historyRefs 至少一項連回前兩波內容。若 NPC 的 historyRefs 指向百年以上的歷史，不可把 NPC 寫成該時代仍存活至今的初代／始祖／創建本人，除非該 NPC 自己的 chronology 明確提供 LONG_LIVED／STASIS／TIME_DISPLACED；長壽、延命、休眠、時間停滯等非常規存活都必須由這個角色自己的 chronology 綁定，且 mechanismRef 必須指向具體 PUBLIC_FACT:n、HIST-id 或 WORLD_MAGIC_COST 的 Canon 機制；世界其他地方只要出現「長壽」字眼並不算此人物的時間證據。沒有可驗證機制時必須寫成後代、傳承者、繼承人、記錄持有人或其他合理的現代身份。Future Timeline payload 已包含 earliestDay/latestDay/triggerDay/status：任何 earliestDay 大於 1 且未 TRIGGERED 的事件都不可在 NPC description/personality/goal、sideQuest 或 suggestions 寫成 Day 1 已經發生、正在發生或已造成現況；可以寫成擔心、傳聞、預警、準備、防範或可能風險。只有 earliestDay=1 的事件才可作為開局現況。suggestions 必須直接回應 openingHook 裡的具體人物、聲音、痕跡、入口或異常，禁止「觀察四周」「繼續探索」「確認狀態」等 UI 指令。不得新增新地點／勢力。只輸出 JSON。`,
   user:JSON.stringify({anchor,history,geography,society,future:{worldTimeline:openingCastTimelineSnapshot(future)},required:{npcs:[{name:"附近人物",role:"具體身份或職責；不得輸出「角色」",description:"40-80字",personality:"具體人格特徵；不得輸出「簡短」",goal:"與地方社會／危機有關",locationName:anchor.startingLocation,factionName:"society.faction.name 或空",knowledgeScope:["anchor.publicFacts 完整文字"],historyRefs:["0-2個 HIST id"],known:true,chronology:{relation:"CONTEMPORARY|DESCENDANT|LONG_LIVED|STASIS|TIME_DISPLACED",birthEra:"CURRENT 或世界內時代",mechanismRef:"一般角色留空；非常規存活只可 PUBLIC_FACT:n / HIST-id / WORLD_MAGIC_COST",mechanism:"一般角色留空；非常規存活填入對應 Canon 機制"},behaviorProfile:{mannerisms:["1項可觀察習慣動作"],speechPatterns:["1項說話模式"],habits:["1項日常習慣"],values:["1項價值"],fears:["1項恐懼"],contradictions:["1項矛盾"],promises:[],grudges:[]},companionProfile:{joinThreshold:35,leaveThreshold:10,motives:["1項"],boundaries:["1項"]},lore:{story:"40-80字",unlockKeywords:["1-2線索"],minMatches:1}}],sideQuests:[{title:"支線",objective:"具體可執行目標；不得輸出「簡短」",known:false,locationName:anchor.startingLocation,npcName:"上方 NPC 或空",factionName:"既有 faction 或空",historyRefs:["0-2個 HIST id"],evidenceKeywords:["2個實體線索"],conditions:[],target:2}],suggestions:["3-4個直接引用 openingHook 人物、聲音、物件或痕跡的具體角色扮演行動"]}})
  },()=>castFallback(anchor,history,region,society));
  if(!Array.isArray(cast?.npcs)||!Array.isArray(cast?.sideQuests)||!Array.isArray(cast?.suggestions)||cast.suggestions.length<2||generatedTemplateLeak(cast)){const missing=[!Array.isArray(cast?.npcs)&&"NPCS",!Array.isArray(cast?.sideQuests)&&"SIDE_QUESTS",!Array.isArray(cast?.suggestions)&&"SUGGESTIONS",Array.isArray(cast?.suggestions)&&cast.suggestions.length<2&&"SUGGESTIONS_COUNT"].filter(Boolean);markWorldFallback("CAST",generatedTemplateLeak(cast)?"SEMANTIC_INVALID:TEMPLATE_LEAK":"STRUCTURE_INVALID"+(missing.length?":"+missing.join(","):""));cast=castFallback(anchor,history,region,society)};
  linkIssues=worldGenerationLinkIssues({anchor,history,geography,society,future,cast});
  if(linkIssues.length){markWorldFallback("CAST","CROSS_STAGE_LINK_INVALID:"+linkIssues.join(","));cast=castFallback(anchor,history,region,society);linkIssues=worldGenerationLinkIssues({anchor,history,geography,society,future,cast})}
  if(linkIssues.length)throw new Error("WORLD_CAST_LINK_INVALID:"+linkIssues.join(","));

  report(84,"整合世界","三個 2-way Wave 完成；Engine 正在驗證跨階段引用");
  const draft={...core,originOpening,worldHistory:history,worldCalendar:future.worldCalendar,worldTimeline:future.worldTimeline,openingHook:region.openingHook,suggestions:cast.suggestions,generation:{locations:region.locations.slice(0,1),npcs:cast.npcs.slice(0,1),factions:region.factions.slice(0,1),sideQuests:cast.sideQuests.slice(0,1)}};
  draft.generationDiagnostics=finalizeGenerationDiagnostics(diagnostics);
  draft.worldQuality={...fallbackWorldEvaluation(draft,diagnostics,"BACKGROUND_AI_CRITIC_PENDING"),backgroundPending:true,repairHistory:[]};
  activeGenerationDiagnostics=null;report(86,"世界骨架完成","Engine 驗證完成；AI Quality Critic 將在玩家進入世界後背景執行，不阻塞穿越。");return draft

 }
 activeGenerationDiagnostics=null;
 report(42,"世界核心","正在透過伺服器建立世界");
 const candidate=(await post("/api/world",{seed,constitution,seedDirective:directive})).candidate;
 report(85,"AI 世界評審","伺服器已完成世界品質評分與必要的定點修復");
 return candidate
}
export async function generateHistoryDeepening(state,plan,options={}){
 if(!plan?.historyId)return null;const signal=options?.signal;
 const payload={plan,constitution:state.world?.creation?.constitution||null,world:{name:state.world?.name||"",theme:state.world?.theme||"",bible:state.world?.bible||null},futureRefs:(state.world?.futures||[]).filter(x=>(plan.skeleton?.futureRefs||[]).includes(x.id)).map(x=>({id:x.id,title:x.title,stage:x.stage,impactScope:x.impactScope,domains:x.domains}))};
 if(!hasDirectAI())return (await post("/api/history-deepen",payload,{signal})).candidate;
 return worldStage("HISTORY_DEEPENING",{
  signal,timeoutMs:50000,retryOnTimeout:false,maxOutputTokens:1900,temperature:.5,
  system:`你是 Elyndra History Deepening Architect。Engine 已鎖定 plan.skeleton，絕對不可修改、重述成不同因果、覆蓋或重新命名 Skeleton。你的工作只是在玩家已開始研究這段歷史後，為 plan.targetDepth 新增隱藏 Canon detail。只可輸出 plan.quotas 允許數量內的 additions；existingDetail 已經提交過，不能重寫或重複。所有細節必須能由 skeleton.causes / summary / legacies 解釋，並遵守 Constitution。accounts 可以互相矛盾、有偏見或不可靠；documents 只是未來可被找到的證據，不會自動成為玩家知識；relics 只是 Item Heritage seeds，不會自動給玩家。clueRefs 只能引用 plan.clues 中既有 id；futureRefs 只能引用 plan.skeleton.futureRefs。不得生成玩家已經知道了這些新細節的敘述。只輸出 JSON：{"historyId":"與 plan 完全相同","targetDepth":"OUTLINE|DEEP|FULL","additions":{"actors":[{"name":"歷史人物","role":"在事件中的角色","allegiance":"勢力或立場","motive":"動機","fate":"結局","clueRefs":[]}],"places":[{"name":"歷史地點","role":"事件中的作用","modernTrace":"今日仍留下的痕跡","clueRefs":[]}],"chronology":[{"sequence":1,"event":"具體發生事件","causes":[],"consequences":[],"clueRefs":[]}],"accounts":[{"perspective":"記錄者或群體","claim":"其版本說法","reliability":"LOW|MEDIUM|HIGH|UNKNOWN","bias":"偏見來源","clueRefs":[]}],"documents":[{"title":"文獻名","author":"作者或不詳","era":"時代","culture":"文化","language":"COMMON 或世界語言","reliability":"UNKNOWN|LOW|MEDIUM|HIGH|PRIMARY_SOURCE","bias":"立場","claims":[{"text":"文獻主張","clueId":null,"disputes":false}]}],"relics":[{"label":"遺物名","description":"外觀／用途","culture":"文化","era":"時代","significance":"真正歷史意義","clueRefs":[],"futureRefs":[]}],"solutionClues":[{"clueId":"既有 clue id 或 null","interpretation":"這條歷史資訊可能如何影響未來問題","futureRefs":[]}]}}。`,
  user:JSON.stringify(payload)
 })
}

export async function runWorldQualityCritic(state,options={}){
 if(!hasDirectAI())return null;const signal=options?.signal,snapshot=backgroundQualitySnapshot(state);
 const evaluation=normalizeWorldEvaluation(await worldStage("QUALITY_CRITIC",{
  signal,timeoutMs:45000,retryOnTimeout:false,maxOutputTokens:1300,temperature:.2,
  system:`你是 Elyndra Background World Critic。這次工作絕對不能阻塞玩家，也不能改世界核心。評估 internalConsistency、originality、worldDepth、historyIntegration、geography、societyCulture、magicSystem、factions、characters、futureEvents、playability、knowledgeBoundary，每項0-100，overall 0-100。snapshot.immutableBoundary 全部視為不可修改 Canon；你可以指出問題，但 repair 只能針對 snapshot.unseenRepairTargets。不要把已看見或正在使用內容列為可修復目標。findings 最多8項，只輸出 World Critic JSON。`,
  user:JSON.stringify(snapshot)
 }),{source:"AI_BACKGROUND"});
 let repairPatch=null;
 const unseen=snapshot.unseenRepairTargets||{},hasTargets=["locations","npcs","factions"].some(k=>(unseen[k]||[]).length);
 if(evaluation.overall<80&&evaluation.findings.some(x=>x.requiresRegeneration)&&hasTargets){
  try{
   const repaired=await worldStage("QUALITY_REPAIR",{
    signal,timeoutMs:45000,retryOnTimeout:false,maxOutputTokens:1300,temperature:.35,
    system:`你是 Elyndra Background Unseen Repair Architect。只可以修改 payload.snapshot.unseenRepairTargets 中列出的實體，而且必須以既有 id 指定目標。禁止新增／刪除／重新命名實體；禁止修改位置、known、encountered、historyRefs、knowledgeScope、數值、Quest 規則、Future、Timeline、History、World Identity、Blueprint、Constitution、World Bible。Location 只可提議 description/culture/trade/lore；NPC 只可 description/personality/goal/lore；Faction 只可 description/culture/lore。任何不在 unseenRepairTargets 的 id 都不可輸出。只輸出 JSON：{"patch":{"registry":{"locations":[{"id":"...","description":"...","culture":{},"trade":{},"lore":{}}],"npcs":[{"id":"...","description":"...","personality":"...","goal":"...","lore":{}}],"factions":[{"id":"...","description":"...","culture":{},"lore":{}}]}}}。`,
    user:JSON.stringify({snapshot,evaluation})
   });
   if(repaired?.patch?.registry)repairPatch=repaired
  }catch{}
 }
 return {evaluation,repairPatch,worldVersion:snapshot.worldVersion}
}

export async function talkToNpc(state,key,message){const npc=state.npcs?.[key];if(!npc)throw new Error("NPC_NOT_FOUND");const knownFacts=npcKnownFacts(state,npc),payload={message,npc,knownFacts,memories:npc.memories||[],scene:{day:state.world.state.day,location:state.player.location}};if(hasDirectAI())return directChat({aiTask:"npc",timeoutMs:45000,system:`你扮演 Elyndra NPC「${npc.name}」。只能使用提供的 knownFacts 與 memories，不知道就表現不知道。繁體中文1-4句。`,user:JSON.stringify(payload)});return (await post("/api/npc",payload)).text}
export async function talkToDynamicNpc(state,npc,message,contact={}){
 const knownFacts=npcKnownFacts(state,npc),recognition=recognitionForNpc(state,npc),behavior=npcBehaviorSnapshot(npc),originContext=originNpcContext(state,npc),visibleName=playerVisibleNpcName(state,npc),payload={message,npc:{id:npc.id,name:npc.name,role:npc.role,description:npc.description,personality:npc.personality,goal:npc.goal,behavior},knownFacts,memories:(npc.memories||[]).slice(-12),recognition,originContext,contact:{mode:contact.mode||"LOCAL",communication:contact.communication||null},scene:{day:state.world.state.day,clock:state.world.state.clock,location:state.player.location,weather:playerWeatherSnapshot(state)}};
 const identityRule=`你的 canonical 姓名精確為「${npc.name}」。若回答內需要自稱或寫出自己的名字，必須逐字使用這個字串，不得音譯、近音改字或自行改拼法。`;
 let raw="";
 if(hasDirectAI())raw=await directChat({aiTask:"npc",timeoutMs:45000,system:`你扮演 Elyndra NPC「${npc.name}」。${identityRule} 保持 personality、goal、behavior 與既有 memories 一致。只能使用 knownFacts、memories 與 recognition.knownDeeds；public Canon 並不代表你自動知道。behavior 是玩家可感受到的一致人格：回答時自然體現其中一項 mannerism、speechPattern、habit、value、fear 或 contradiction，但不要每句都重複同一習慣，也不要把欄位名稱唸出來。若 memories 或 behavior.promises / grudges 與玩家本次說話有關，必須記得並以行為或措辭反映；不要說出 trust 數值或任何內部關係數值。recognition.knownDeeds 是這名 NPC 合理聽過的玩家事蹟，可以自然影響稱呼、語氣與態度；如果為空就不可突然認識玩家的名聲。originContext 是 Engine 根據玩家 Origin 計算的身份與語言邊界：reaction 只影響演出語氣，不能自行修改 trust；languageMode=GESTURE 時不可讓雙方突然流利理解語言，只能用姿勢、表情、指向與極少量可推斷意思；FRAGMENTED 時可表現詞彙／理解不完整。若 contact.mode=REMOTE，必須自然反映 payload.contact.communication 所定義的世界內通訊媒介與限制，但不要自行發明更高階技術。不知道的事不可捏造。只使用繁體中文1-5句；除既有專有名詞外不要切換其他語言，不要輸出系統標籤。`,user:JSON.stringify(payload)});
 else raw=(await post("/api/npc",payload)).text;
 const safe=sanitizePlayerText(raw,700,`${visibleName}暫時沒有再補充更多資訊。`);return canonicalizeNpcIdentityText(state,npc,safe)
}
export const turnDirectorMode=sharedTurnDirectorMode;

export async function askTravelHelper(state,question){
 const q=String(question||"").trim().slice(0,240);if(!q)throw new Error("HELPER_QUESTION_REQUIRED");
 const snapshot=helperSnapshot(state);
 const system="你是 Elyndra 旅途輔助 AI。你只能根據 payload.snapshot 中玩家目前已知或可直接感知的資料回答，不可以使用模型自身對這個虛構世界的知識補完，不可以推測 hidden facts、Director Timeline、未發現地點、未遇 NPC 或未公開勢力。若玩家問「附近／四周／眼前」，只可使用 world.currentLocation、world.currentNarrative、world.weather、knowledge.nearbyNpcs 與 combat；若玩家問天氣，只可描述 world.weather 中目前可直接感知的天氣，不可推測未出現的 Weather Canon；knowledge.knownLocations 只代表玩家知道那些地方存在，不代表它們在附近。knowledge.facts 中只有 status=VERIFIED 可當作已確認世界事實；TESTIMONY、OBSERVATION、LORE、UNCONFIRMED 只能按其性質描述為聽說／觀察／傳說／未確認，絕不可升格成確定真相。若資料不足，直接說「目前沒有足夠情報確認」。你只提供資訊整理與方向提示，不可以改變劇情、時間、骰子、HP、物品、任務、NPC 關係、戰鬥或任何 Canon。只使用繁體中文，回答 2-6 句，清楚區分『已知』與『未確認』。";
 if(hasDirectAI()){const raw=await directChat({aiTask:"helper",timeoutMs:30000,maxOutputTokens:700,temperature:.25,system,user:JSON.stringify({question:q,snapshot})});return sanitizePlayerText(raw,900,"目前沒有足夠情報確認。")}
 const raw=(await post("/api/helper",{question:q,snapshot})).text;return sanitizePlayerText(raw,900,"目前沒有足夠情報確認。")
}
function normalizeActionAssessment(raw,action,snapshot={}){
 const r=raw&&typeof raw==="object"?raw:{},verdict=["ALLOW","ADJUST","BLOCK"].includes(String(r.verdict||"").toUpperCase())?String(r.verdict).toUpperCase():"ALLOW",kind=["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"].includes(String(r.kind||"").toUpperCase())?String(r.kind).toUpperCase():"GENERAL";
 const normalizedAction=sanitizePlayerText(r.normalizedAction,180,action)||action,actionIntent=normalizeActionIntent(r.actionIntent||r,normalizedAction,kind,snapshot);
 return {verdict,kind,normalizedAction,reason:sanitizePlayerText(r.reason,320,""),requirements:Array.isArray(r.requirements)?r.requirements.map(x=>sanitizePlayerText(x,120,"")).filter(Boolean).slice(0,4):[],confidence:Math.max(0,Math.min(100,Math.round(Number(r.confidence)||70))),actionIntent}
}
function actionFeasibilitySnapshot(state){
 const h=helperSnapshot(state),inventory=(state.inventory||[]).slice(-30).map(x=>({name:x.name,category:x.category,quantity:Number(x.quantity)||1,equipped:x.equipped===true,identified:x.identified!==false,useEffects:(x.useEffects||[]).map(e=>e.type)})),recipes=(state.crafting?.recipes||[]).slice(-20).map(r=>({name:r.name,inputs:(r.inputs||[]).map(i=>({name:i.name,quantity:i.quantity})),output:r.output?.name||""}));
 return {player:{...h.player,origin:state.player?.origin?{label:state.player.origin.label,background:state.player.origin.background,worldKnowledgeBoundary:state.player.origin.worldKnowledgeBoundary}:null,stats:state.player?.stats||{},skills:state.player?.skills||{}},world:h.world,objective:h.objective,knowledge:{knownLocations:h.knowledge?.knownLocations||[],nearbyNpcs:h.knowledge?.nearbyNpcs||[],facts:(h.knowledge?.facts||[]).slice(-12),recentEvents:(h.knowledge?.recentEvents||[]).slice(-6)},inventory,crafting:{recipes},combat:h.combat}
}
function localActionKind(label){
 const q=String(label||"");if(/觀察|查看|檢查|搜尋|調查|observe|inspect|search/i.test(q))return "OBSERVE";if(/說|問|交談|展示|交給|贈送|talk|ask|show|give/i.test(q))return "SOCIAL";if(/前往|走到|離開|移動|旅行|travel|go to|walk/i.test(q))return "TRAVEL";if(/攀|跳|破壞|偷|闖|攻擊|爬|risk|climb|break|steal/i.test(q))return "RISKY";return "GENERAL"
}
export function fastLocalActionAssessment(state,label){
 const q=String(label||"").trim(),kind=localActionKind(q);if(!q||state?.combat?.active||state?.player?.status==="DOWNED")return null;
 const consequential=/偷|竊|闖|破壞|拆|攻擊|威脅|恐嚇|說服|欺騙|騙|賄賂|施法|交給|交出|贈送|展示|出示|攀|跳|撬|開鎖|潛入|steal|break|attack|threat|persuade|lie|bribe|cast|give|show|climb|jump|lockpick|sneak/i;
 const simpleObserve=kind==="OBSERVE"&&!consequential.test(q);
 const simpleSocial=kind==="SOCIAL"&&!consequential.test(q)&&/問|詢問|打招呼|說|交談|聊|talk|ask|greet|say/i.test(q);
 const inventoryOnly=/^(?:查看|打開|檢查)?(?:我的)?(?:背包|物品|inventory)$/i.test(q);
 const utilityOnly=/^(?:查看|打開|檢查)?(?:我的|目前|世界)?(?:角色狀態|狀態|能力狀態|任務|任務列表|地圖|已知地點|character status|status|quest|quests|map)$/i.test(q);
 const rest=/休息|睡眠|睡覺|紮營|露營|rest|sleep|camp/i.test(q);
 const eat=/食用|進食|吃|喝|飲用|eat|drink/i.test(q)&&(state.inventory||[]).some(x=>x?.name&&q.includes(x.name));
 const equipment=/裝備|穿上|卸下|脫下|equip|unequip|put on|take off/i.test(q)&&(state.inventory||[]).some(x=>x?.name&&q.includes(x.name));
 const knownLocation=(state.world?.registry?.locations||[]).find(x=>x?.known===true&&x?.name&&q.includes(x.name));
 const simpleTravel=kind==="TRAVEL"&&Boolean(knownLocation)&&!/闖|突破|潛入|偷渡|break in|sneak/i.test(q);
 const currentLoc=(state.world?.registry?.locations||[]).find(x=>x.name===state.player?.location),knownTrade=/購買|買下|出售|賣掉|賣出|兌換|換錢|buy|sell|exchange/i.test(q)&&Boolean((currentLoc?.market?.goods||[]).some(x=>x?.name&&q.includes(x.name))||(state.inventory||[]).some(x=>x?.name&&q.includes(x.name)));
 if(!simpleObserve&&!simpleSocial&&!inventoryOnly&&!utilityOnly&&!rest&&!eat&&!equipment&&!simpleTravel&&!knownTrade)return null;
 const resolvedKind=inventoryOnly||utilityOnly||rest||eat||equipment||knownTrade?"GENERAL":kind,snapshot=actionFeasibilitySnapshot(state);
 return {verdict:"ALLOW",kind:resolvedKind,normalizedAction:q,reason:"這是 Engine 可以直接確認前提的基本行動，由 Fast Path 放行；若屬 deterministic utility，整個回合不會喚醒 AI。",requirements:[],confidence:99,source:"ENGINE_FASTPATH",actionIntent:normalizeActionIntent({},q,resolvedKind,snapshot)}
}
function degradedActionAssessment(state,label,error){
 const inv=state.inventory||[],q=String(label||""),kind=localActionKind(q),requirements=[];
 if(state.player?.status==="DOWNED")return {verdict:"BLOCK",kind,normalizedAction:q,reason:"你目前失去行動能力。",requirements:["先恢復可行動狀態"],confidence:100,source:"ENGINE_DEGRADED",aiError:String(error?.message||error||"")};
 if(/使用|食用|喝|飲用|服用|展示|出示|交給|交出|贈送|give|show|use|eat|drink/i.test(q)&&!inv.some(x=>x?.name&&q.includes(x.name))){requirements.push("背包中需要有你指定的物品");return {verdict:"BLOCK",kind,normalizedAction:q,reason:"目前背包中找不到這個行動所指定的物品。",requirements,confidence:92,source:"ENGINE_DEGRADED",aiError:String(error?.message||error||"")}}
 if(/飛上天空|直接飛行|瞬間移動|teleport|fly into the sky/i.test(q)&&!(state.player?.magic?.knownSpells||[]).some(s=>/飛|傳送|移動|teleport|flight/i.test(String(s?.name||"")+" "+String(s?.effect||""))))return {verdict:"BLOCK",kind:"RISKY",normalizedAction:q,reason:"你目前沒有已知能力支持這種超常移動。",requirements:["需要相應能力、魔法或工具"],confidence:90,source:"ENGINE_DEGRADED",aiError:String(error?.message||error||"")};
 return {verdict:"ALLOW",kind,normalizedAction:q,reason:"AI 可行性判定暫時不可用；已改用保守 Engine 條件檢查，成功與否仍由正常判定處理。",requirements:[],confidence:35,source:"ENGINE_DEGRADED",aiError:String(error?.message||error||"")}
}
const ACTION_ASSESSMENT_CIRCUIT_FAILURES=2;
const ACTION_ASSESSMENT_CIRCUIT_OPEN_MS=60000;
const actionAssessmentCircuit={worldId:"",failures:0,openUntil:0,lastError:""};
export function actionAssessmentRuntimeSnapshot(){return {...actionAssessmentCircuit}}
function resetActionAssessmentCircuit(worldId=actionAssessmentCircuit.worldId){actionAssessmentCircuit.worldId=String(worldId||"");actionAssessmentCircuit.failures=0;actionAssessmentCircuit.openUntil=0;actionAssessmentCircuit.lastError=""}
function noteActionAssessmentFailure(worldId,error){if(actionAssessmentCircuit.worldId!==String(worldId||""))resetActionAssessmentCircuit(worldId);actionAssessmentCircuit.failures+=1;actionAssessmentCircuit.lastError=String(error?.message||error||"").slice(0,500);if(actionAssessmentCircuit.failures>=ACTION_ASSESSMENT_CIRCUIT_FAILURES)actionAssessmentCircuit.openUntil=Date.now()+ACTION_ASSESSMENT_CIRCUIT_OPEN_MS}
async function directActionAssessment(payload,label,compact=false){
 const raw=await directChat({aiTask:"action",disableOptimization:compact,retryOnTimeout:false,timeoutMs:compact?10000:18000,maxOutputTokens:compact?700:650,temperature:0,system:compact?SHARED_ACTION_ASSESS_SYSTEM+" 不要解釋，只回 JSON。":SHARED_ACTION_ASSESS_SYSTEM,user:JSON.stringify(payload)});
 return {...normalizeActionAssessment(parseJSON(raw),label,payload?.snapshot||{}),source:compact?"AI_RETRY":"AI"}
}
export async function assessPlayerAction(state,action){
 const label=String(action||"").trim().slice(0,180);if(!label)throw new Error("ACTION_REQUIRED");
 const fast=fastLocalActionAssessment(state,label);if(fast)return fast;
 const snapshot=actionFeasibilitySnapshot(state),payload={action:label,snapshot},worldId=String(state?.world?.id||"");
 if(actionAssessmentCircuit.worldId!==worldId)resetActionAssessmentCircuit(worldId);
 if(!hasDirectAI()){try{const server=await post("/api/action",{action:label,snapshot});return {...normalizeActionAssessment(server.assessment,label,snapshot),source:"SERVER_AI"}}catch(e){return degradedActionAssessment(state,label,e)}}
 if(actionAssessmentCircuit.openUntil>Date.now())return degradedActionAssessment(state,label,new Error(`ACTION_ASSESSMENT_CIRCUIT_OPEN: ${actionAssessmentCircuit.lastError||"provider degraded"}`));
 if(actionAssessmentCircuit.openUntil)resetActionAssessmentCircuit(worldId);
 try{const value=await directActionAssessment(payload,label,false);resetActionAssessmentCircuit(worldId);return value}
 catch(firstError){
  if(/AI_RATE_LIMIT_BACKPRESSURE|AI_HTTP_429/.test(String(firstError?.message||firstError))){noteActionAssessmentFailure(worldId,firstError);return degradedActionAssessment(state,label,firstError)}
  try{const value=await directActionAssessment({action:label,snapshot},label,true);resetActionAssessmentCircuit(worldId);return value}
  catch(secondError){const e=new Error((firstError?.message||String(firstError))+" | RETRY: "+(secondError?.message||String(secondError)));noteActionAssessmentFailure(worldId,e);return degradedActionAssessment(state,label,e)}
 }
}

export function startTurnAIJobs(action,roll,snapshot,options={}){
 const actionIntent=normalizeActionIntent(options?.intent||{},action,roll?.profile?.kind||"",snapshot);
 const kernel=buildTurnOutcomeKernel({action,intent:actionIntent,roll,snapshot});
 const basePlan=options?.stateSyncPlan||planStateSync({action,intent:actionIntent,roll,snapshot,kernel,ruleEffects:options?.ruleEffects});
 kernel.dirtyFlags={...(basePlan.dirtyFlags||kernel.dirtyFlags||{})};
 const plan={...basePlan,baseRevision:Number(options?.baseRevision??snapshot?.stateRevision)||0},directorMode=plan.mode,stateMode=plan.mode,immediateStateAI=plan.mode==="FAST"||plan.mode==="DEEP";
 if(hasDirectAI()){
  const sceneInput={action,intent:actionIntent,kernel,snapshot:sceneTurnSnapshot(snapshot)};
  const playerAction=directChat({
   aiTask:"scene",signal:options?.signal,timeoutMs:35000,retryOnTimeout:false,maxOutputTokens:1100,temperature:.8,
   system:sceneNarratorSystem(),
   user:JSON.stringify(sceneInput)
  }).then(parseJSON);
  const stateSync=immediateStateAI?directChat({
   aiTask:plan.mode==="DEEP"?"turn_state_deep":"turn_state_fast",signal:options?.signal,
   timeoutMs:plan.mode==="DEEP"?45000:22000,retryOnTimeout:false,
   maxOutputTokens:plan.mode==="DEEP"?1300:800,
   temperature:plan.mode==="DEEP"?.3:.15,
   system:statePatchDirectorSystem(plan),
   user:JSON.stringify({action,intent:actionIntent,kernel,plan,snapshot:plan.mode==="DEEP"?snapshot:fastTurnStateSnapshot(snapshot,plan)})
  }).then(parseJSON).then(rawPatch=>{const patch=normalizeGeneratedStatePatch(rawPatch),v=validateStatePatch(patch,plan);if(!v.valid)throw new Error("STATE_PATCH_INVALID:"+v.errors.join(","));return patch}):Promise.resolve(null);
  return {playerAction,stateSync,directorMode,stateMode,actionIntent,kernel,plan,transport:"direct"}
 }
 const payload={action,intent:actionIntent,roll,snapshot,plan};
 const playerAction=post("/api/turn-scene",payload,{signal:options?.signal}).then(x=>x.scene);
 const stateSync=immediateStateAI?post("/api/turn-state",payload,{signal:options?.signal}).then(x=>x.patch):Promise.resolve(null);
 return {playerAction,stateSync,directorMode,stateMode,actionIntent,kernel,plan,transport:"server"}
}
export async function generateStatePatch(action,roll,snapshot,plan,options={}){
 if(!plan?.requiresStateAI)return null;
 const actionIntent=normalizeActionIntent(options?.intent||{},action,roll?.profile?.kind||"",snapshot),kernel=options?.kernel||buildTurnOutcomeKernel({action,intent:actionIntent,roll,snapshot});
 const resolved={...plan,baseRevision:Number(plan.baseRevision??snapshot?.stateRevision)||0};kernel.dirtyFlags={...(resolved.dirtyFlags||kernel.dirtyFlags||{})};
 if(hasDirectAI()){
  const raw=await directChat({
   aiTask:resolved.mode==="DEEP"?"turn_state_deep":resolved.mode==="DEFERRED"?"turn_deferred":"turn_state_fast",
   signal:options?.signal,timeoutMs:resolved.mode==="DEEP"?45000:resolved.mode==="DEFERRED"?35000:22000,retryOnTimeout:false,
   maxOutputTokens:resolved.mode==="DEEP"?1300:resolved.mode==="DEFERRED"?900:800,temperature:resolved.mode==="DEEP"?.3:.15,
   system:statePatchDirectorSystem(resolved),
   user:JSON.stringify({action,intent:actionIntent,kernel,plan:resolved,snapshot:resolved.mode==="DEEP"?snapshot:fastTurnStateSnapshot(snapshot,plan)})
  });
  const patch=normalizeGeneratedStatePatch(parseJSON(raw)),v=validateStatePatch(patch,resolved);if(!v.valid)throw new Error("STATE_PATCH_INVALID:"+v.errors.join(","));return patch
 }
 const response=await post("/api/turn-state",{action,intent:actionIntent,roll,snapshot,plan:resolved},{signal:options?.signal});
 return response.patch
}
export function finalizeTurnAIJobs(jobs,scene,statePatch,roll,snapshot,action){
 if(statePatch){const v=validateStatePatch(statePatch,jobs.plan);if(!v.valid)throw new Error("STATE_PATCH_INVALID:"+v.errors.join(","))}
 return {...mergeTurnCandidates(scene,{},roll,{action,kernel:jobs.kernel,priorSuggestions:snapshot?.priorSuggestions||[],priorSuggestionIntents:snapshot?.priorSuggestionIntents||[]}),statePatch,directorMode:jobs.directorMode,actionIntent:jobs.actionIntent,kernel:jobs.kernel,plan:jobs.plan}
}
export async function generateTurn(action,roll,snapshot,options={}){
 const jobs=startTurnAIJobs(action,roll,snapshot,options),[sceneResult,stateResult]=await Promise.allSettled([jobs.playerAction,jobs.stateSync]);
 if(stateResult.status!=="fulfilled")throw stateResult.reason;
 const scene=sceneResult.status==="fulfilled"?sceneResult.value:null;
 try{if(scene)options?.onScene?.(scene)}catch{}
 return finalizeTurnAIJobs(jobs,scene,stateResult.value,roll,snapshot,action)
}

export async function generateDeferredTurnEffects(action,roll,snapshot,options={}){
 if(!hasDirectAI())return null;
 const intent=normalizeActionIntent(options?.intent||{},action,roll?.profile?.kind||"",snapshot);
 const raw=await directChat({
  aiTask:"turn_deferred",signal:options?.signal,timeoutMs:45000,maxOutputTokens:1200,temperature:.35,
  system:`你是 Elyndra Deferred Director。處理已完成 Fast Turn commit 的舊回合，只補「非即時但需要持久保存」的後果。Engine 已決定 action intent 與骰子，不能重新解讀；不可改 narrative、location、HP、骰子、即時物品、已驗證 discoveries、encounter 或已完成 NPC trust。只可輸出 recipes、magicLearning、companionChanges、factionChanges、generation、worldImpacts。沒有直接因果就全部留空。snapshot.player.origin 是唯一權威起源資料，不得自行假設現代地球背景。只輸出 JSON：${SHARED_DEFERRED_TURN_SCHEMA}`,
  user:JSON.stringify({action,intent,roll,snapshot})
 });
 return parseJSON(raw)
}

export function publicWorldBible(state){const b=state.world.bible||{};return {era:b.era||"",centralConflict:b.centralConflict||"",magicCost:b.magicCost||"",startingRegion:b.startingRegion||"",startingSettlement:b.startingSettlement||"",startingLocation:b.startingLocation||"",currentCrisis:b.currentCrisis||"",tone:b.tone||"",civilization:b.civilization||null,communication:b.communication||null,weatherSystem:b.weatherSystem||null}}
export function regionExpansionPayload(state,reason="player_exploration",plan=null){const catalog=state.world?.catalog||{};return {reason,lazyPlan:plan?{id:plan.id,seed:plan.seed,reason:plan.reason,region:plan.region,slots:plan.slots,forbiddenTerms:plan.forbiddenTerms||[],historyRefs:plan.historyRefs,claims:plan.claims,legacyEchoes:plan.legacyEchoes||[],generationRevision:plan.generationRevision,worldSeedFingerprint:plan.worldSeedFingerprint,entitySeed:plan.entitySeed,generationSlot:plan.generationSlot,promptVersion:plan.promptVersion,validationVersion:plan.validationVersion,generatedAtWorldTime:plan.generatedAtWorldTime}:null,world:{name:state.player?.worldNameKnown?state.world.name:"UNKNOWN",bible:publicWorldBible(state),seedContract:state.world.seedContract||state.world.seed,region:state.world.state.region,location:state.player.location},directorHistory:directorHistorySnapshot(state,8),directorHistoryDepth:historyDepthSnapshot(state,{director:true}).filter(x=>x.depth!=="SKELETON").slice(-4),existing:{locations:(state.world.registry?.locations||[]).map(x=>x.name).slice(-12),npcs:(state.world.registry?.npcs||[]).map(x=>x.name).slice(-12),factions:(state.world.registry?.factions||[]).map(x=>x.name).slice(-8),sideQuests:(state.world.registry?.sideQuests||[]).map(x=>x.title).slice(-8),definitions:[...(catalog.civilizations||[]),...(catalog.species||[]),...(catalog.languages||[])].map(x=>({kind:x.kind,name:x.name})).slice(-24)},publicFacts:visibleFacts(state).slice(-12)}}
const RUNTIME_GENERATION_KEYS=["locations","npcs","factions","sideQuests","definitions"];
function emptyRuntimeGeneration(){return {locations:[],npcs:[],factions:[],sideQuests:[],definitions:[]}}
function runtimeRoot(value){return value&&typeof value==="object"&&!Array.isArray(value)?(value.generation&&typeof value.generation==="object"&&!Array.isArray(value.generation)?value.generation:value):{}}
function runtimeRows(value,key,limit=0){const rows=Array.isArray(runtimeRoot(value)?.[key])?runtimeRoot(value)[key]:[];return rows.slice(0,Math.max(0,Number(limit)||0))}
function runtimeIdentity(value){return String(value||"").trim().toLocaleLowerCase()}
function runtimeNewLocations(state,plan,rows){
 const existing=new Set((state?.world?.registry?.locations||[]).map(x=>runtimeIdentity(x?.name)).filter(Boolean)),allowedWeatherIds=(state?.world?.bible?.weatherSystem?.phenomena||[]).map(x=>String(x?.id||"")).filter(Boolean);
 const fresh=(rows||[]).filter(row=>{const name=runtimeIdentity(row?.name);return name&&!existing.has(name)}).map(row=>normalizeRuntimeLocation(row,allowedWeatherIds));
 return bindRuntimeClaims(plan,"locations",fresh)
}
function runtimeDefinitions(plan,rows){return bindRuntimeClaims(plan,"definitions",rows||[])}
function runtimeRefs(rows,key){return new Set((rows||[]).flatMap(row=>Array.isArray(row?.[key])?row[key]:[]).map(String).filter(Boolean))}
function runtimeProgressErrors(state,plan,generation){
 const report=validateLazyGenerationCandidate(state,generation,plan);
 return (report.errors||[]).filter(x=>!/^LAZY_RESERVED_(?:CLAIM|ECHO)_UNBOUND:/.test(String(x)))
}
function assertRuntimeProgress(state,plan,generation,label){const errors=runtimeProgressErrors(state,plan,generation);if(errors.length)throw new Error(label+"_INVALID:"+errors.join(","))}
function runtimeRemainingClaims(plan,generation){
 const used=runtimeRefs(RUNTIME_GENERATION_KEYS.flatMap(key=>generation[key]||[]),"claimRefs");
 return (plan?.claims||[]).filter(x=>!used.has(String(x.id)))
}
function runtimeRemainingEchoes(plan,generation){
 const used=runtimeRefs(RUNTIME_GENERATION_KEYS.flatMap(key=>generation[key]||[]),"echoRefs");
 return (plan?.legacyEchoes||[]).filter(x=>!used.has(String(x.id)))
}
async function runtimeExpansionStage(stage,{signal,system,user,maxOutputTokens=1200,timeoutMs=45000,temperature=.45,apply,state,plan}){
 let lastError=null;
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const attemptTokens=attempt>1?Math.min(3600,Math.max(Number(maxOutputTokens)+700,Math.round(Number(maxOutputTokens)*1.5))):maxOutputTokens;
   const retryHint=attempt>1?"\n上一輪未通過 Engine 驗證。只修正本階段 JSON，不得改動先前已鎖定的內容；若上一輪被截斷，縮短自由文字但必須完整閉合 JSON。":"";
   const value=await worldStage(stage,{aiTask:"runtime_expansion",signal,timeoutMs:attempt>1?Math.max(timeoutMs,50000):timeoutMs,retryOnTimeout:false,maxOutputTokens:attemptTokens,temperature:attempt>1?Math.min(.3,temperature):temperature,system:system+retryHint,user:JSON.stringify(typeof user==="function"?user():user)});
   const generation=apply(value);assertRuntimeProgress(state,plan,generation,stage);return generation
  }catch(e){lastError=e}
 }
 throw lastError||new Error(stage+"_FAILED")
}
function applyRuntimeLocationDetails(current,value){
 const root=runtimeRoot(value),details=Array.isArray(root.locationDetails)?root.locationDetails:[],byName=new Map(details.map(x=>[String(x?.locationName||""),x]));
 const locations=current.locations.map(loc=>{const detail=byName.get(String(loc.name||""));if(!detail?.culture||!detail?.trade)throw new Error("RUNTIME_SOCIETY_LOCATION_DETAIL_MISSING:"+String(loc.name||""));return {...loc,culture:detail.culture,trade:detail.trade}});
 return {...current,locations}
}
export async function generateRegionExpansion(state,reason="player_exploration",options={}){
 const plan=options?.plan||null,payload=regionExpansionPayload(state,reason,plan);if(!hasDirectAI())return null;
 if(!plan)throw new Error("RUNTIME_EXPANSION_PLAN_REQUIRED");
 const signal=options?.signal,slots=plan.slots||{},allowedHistoryRefs=(state.world?.history||[]).map(x=>String(x?.id||"")).filter(Boolean),existingLocationNames=(state.world?.registry?.locations||[]).map(x=>String(x?.name||"")).filter(Boolean),completedStages=new Set(plan.checkpoint?.completedStages||[]),checkpointStage=async stage=>{completedStages.add(stage);if(typeof options?.onStage==="function")await options.onStage({stage,generation:structuredClone(generation),region,reason:stageReason})},baseRules=`Engine 已鎖定 lazyPlan；不得擴大 slots、改 plan、創造 claim/echo/history id、重建 existing、使用 forbiddenTerms，亦不得把 hidden detail 直接變成玩家已知。所有 historyRefs 只能引用 payload.allowedHistoryRefs 中已存在的 Canon HIST id。Definition 去重硬規則：payload.existing.definitions 內已存在的 kind+name 組合禁止再次生成；即使另一個 BLUEPRINT_DEFINITION claim 使用相同 kind，也必須產生不同的新名稱，不得重用 existing definition。Claim 硬規則：BLUEPRINT_DEFINITION 只能綁定 generation.definitions，而且 definition.kind 必須與 claim.definitionKind 相同；Location 不得綁 BLUEPRINT_DEFINITION。REQUIRED_ELEMENT 必須由實際包含指定要素的實體綁定。Legacy Echo 硬規則：MEMORIAL echo 必須由 Location 綁定；ORAL_TRADITION echo 必須由 NPC 綁定。definitions 結構使用 "definitions":[{"kind":"CIVILIZATION|SPECIES|LANGUAGE","name":"..."}]。只輸出 JSON。`;
 let generation=plan.checkpoint?.generation?structuredClone(plan.checkpoint.generation):emptyRuntimeGeneration(),region=String(plan.region||payload.world?.region||"UNKNOWN"),stageReason=String(reason||plan.reason||"player_exploration");

 if(!completedStages.has("RUNTIME_GEOGRAPHY")){generation=await runtimeExpansionStage("RUNTIME_GEOGRAPHY",{
  signal,state,plan,maxOutputTokens:1600,temperature:.5,
  system:"你是 Elyndra Runtime Geography Architect。今次只完善世界的地理骨架與 World Catalog definition，不生成 NPC、Faction、SideQuest。地點先定物理環境、accessRequirements、weatherProfile、historyRefs、lore；文化與交易留給下一階段。accessRequirements 只能是空陣列，或使用既有 Engine id 的結構化條件物件；type 僅限 ITEM_OWNED、ITEM_USED、ITEM_SHOWN、ITEM_GIVEN、FACT_KNOWN、EVENT_OCCURRED，並必須包含既有 id。若沒有可引用的既有 id 必須輸出空陣列；自然語言危險／進入建議寫進 lore.story。weatherProfile 必須使用 zone、affinities、suppressions 三個欄位，其中 affinities／suppressions 只引用既有 WTH id。lore 必須使用 story、unlockKeywords、minMatches 三個欄位。BLUEPRINT_DEFINITION claim 必須由 matching kind definition 綁定；MEMORIAL legacy echo 必須由 location 綁定。"+baseRules+" 輸出 schema：{region,reason,locations:[{name,type,region,description,historyRefs,claimRefs,echoRefs,known:false,accessRequirements,weatherProfile,lore}],definitions:[{kind,name,description,traits,regions,historyRefs,claimRefs}]}。",
  user:()=>({payload:{...payload,allowedHistoryRefs,existingLocationNames},stage:"GEOGRAPHY",slots:{locations:slots.locations||0,definitions:slots.definitions||0},claims:plan.claims||[],legacyEchoes:(plan.legacyEchoes||[]).filter(x=>x.kind==="MEMORIAL"),instruction:"locations 最多生成 slots.locations；至少生成 1 個真正新地點即可完成本次 Geography checkpoint，不得重建 existingLocationNames。"}),
  apply:value=>{
   const root=runtimeRoot(value),locations=runtimeNewLocations(state,plan,runtimeRows(value,"locations",slots.locations)),definitions=runtimeDefinitions(plan,runtimeRows(value,"definitions",slots.definitions));
   if((Number(slots.locations)||0)>0&&locations.length===0)throw new Error("RUNTIME_GEOGRAPHY_LOCATION_COUNT");
   if((Number(slots.definitions)||0)>0&&definitions.length<Number(slots.definitions))throw new Error("RUNTIME_GEOGRAPHY_DEFINITION_COUNT");
   const blueprint=(plan.claims||[]).filter(x=>x.type==="BLUEPRINT_DEFINITION").map(x=>String(x.id)),bound=runtimeRefs(definitions,"claimRefs");
   for(const id of blueprint)if(!bound.has(id))throw new Error("RUNTIME_GEOGRAPHY_BLUEPRINT_CLAIM_UNBOUND:"+id);
   const memorial=(plan.legacyEchoes||[]).filter(x=>x.kind==="MEMORIAL").map(x=>String(x.id)),echoBound=runtimeRefs(locations,"echoRefs");
   for(const id of memorial)if(!echoBound.has(id))throw new Error("RUNTIME_GEOGRAPHY_MEMORIAL_UNBOUND:"+id);
   region=String(root.region||region);stageReason=String(root.reason||stageReason);return {...generation,locations,definitions}
  }
 });await checkpointStage("RUNTIME_GEOGRAPHY")}

 if(!completedStages.has("RUNTIME_SOCIETY")){generation=await runtimeExpansionStage("RUNTIME_SOCIETY",{
  signal,state,plan,timeoutMs:55000,maxOutputTokens:2400,temperature:.35,
  system:"你是 Elyndra Runtime Society Architect。地理與 definitions 已鎖定。今次只為新地點補 culture/trade，並按 slots 生成地方 Faction；不可改地點名稱、物理描述、weatherProfile 或 definitions。locationDetails 必須對 requiredLocationNames 每一個名稱逐字建立一項，不可漏項、改名或合併。Faction 必須引用已鎖定 history/location 因果，並優先實現 remainingClaims。為避免長 JSON 被截斷，每個 culture/trade 自由文字欄位保持一句短句，陣列欄位最多1項；currencies 可留空，不得輸出額外說明。"+baseRules+" 輸出 schema：{locationDetails:[{locationName,culture:{identity,etiquette,taboos,food,beliefs,architecture,clothing,hospitality,namingStyle,languageNotes},trade:{mode,currencies,commonBarter,foreignAcceptance,priceCulture,questReward,combatReward}}],factions:[{name,goal,description,historyRefs,claimRefs,known:false,locationName,culture,trade,lore}]}。",
  user:()=>({payload,stage:"SOCIETY",locked:{region,locations:generation.locations,definitions:generation.definitions},requiredLocationNames:generation.locations.map(x=>String(x.name||"")),slots:{factions:slots.factions||0},remainingClaims:runtimeRemainingClaims(plan,generation)}),
  apply:value=>{let next=applyRuntimeLocationDetails(generation,value),factions=bindRuntimeClaims(plan,"factions",runtimeRows(value,"factions",slots.factions));if((Number(slots.factions)||0)>0&&factions.length<Number(slots.factions))throw new Error("RUNTIME_SOCIETY_FACTION_COUNT");return {...next,factions}}
 });await checkpointStage("RUNTIME_SOCIETY")}

 if((Number(slots.npcs)||0)>0&&!completedStages.has("RUNTIME_CAST")){
  generation=await runtimeExpansionStage("RUNTIME_CAST",{
   signal,state,plan,maxOutputTokens:1500,temperature:.5,
   system:"你是 Elyndra Runtime Cast Architect。地理、地方社會與勢力已鎖定。今次只生成 NPC，不得新增或改寫 Location/Faction/definition。NPC 必須落在既有或今次已鎖定地點，提供 historyRefs、knowledgeScope、companionProfile、behaviorProfile、lore；knowledgeScope 必須是陣列。behaviorProfile 必須使用 mannerisms/speechPatterns/habits/values/fears/contradictions/promises/grudges 陣列；companionProfile 必須使用 joinThreshold/leaveThreshold/motives/boundaries。ORAL_TRADITION legacy echo 只能在這一階段由 NPC 綁定。優先實現 remainingClaims。"+baseRules+" 輸出 schema：{npcs:[{name,role,description,personality,goal,locationName,factionName,historyRefs,claimRefs,echoRefs,knowledgeScope,known:false,behaviorProfile:{mannerisms:[1項],speechPatterns:[1項],habits:[1項],values:[1項],fears:[1項],contradictions:[1項],promises:[],grudges:[]},companionProfile:{joinThreshold:35,leaveThreshold:10,motives:[1項],boundaries:[1項]},lore:{story:40-80字文字,unlockKeywords:[1-2個實體線索],minMatches:1}}]}。",
   user:()=>({payload,stage:"CAST",locked:{region,locations:generation.locations,factions:generation.factions,definitions:generation.definitions},slots:{npcs:slots.npcs||0},remainingClaims:runtimeRemainingClaims(plan,generation),legacyEchoes:runtimeRemainingEchoes(plan,generation).filter(x=>x.kind==="ORAL_TRADITION")}),
   apply:value=>{const npcs=bindRuntimeClaims(plan,"npcs",runtimeRows(value,"npcs",slots.npcs).map(normalizeRuntimeNpc));if(npcs.length<Number(slots.npcs))throw new Error("RUNTIME_CAST_NPC_COUNT");const oral=(plan.legacyEchoes||[]).filter(x=>x.kind==="ORAL_TRADITION").map(x=>String(x.id)),bound=runtimeRefs(npcs,"echoRefs");for(const id of oral)if(!bound.has(id))throw new Error("RUNTIME_CAST_ORAL_ECHO_UNBOUND:"+id);return {...generation,npcs}}
  });await checkpointStage("RUNTIME_CAST")
 }

 if((Number(slots.sideQuests)||0)>0&&!completedStages.has("RUNTIME_QUESTS")){
  generation=await runtimeExpansionStage("RUNTIME_QUESTS",{
   signal,state,plan,maxOutputTokens:950,temperature:.4,
   system:"你是 Elyndra Runtime Quest Architect。世界地理、社會、勢力與人物已鎖定。今次只生成 SideQuest；不得新增任何 Location/NPC/Faction/definition。任務必須引用前面已存在的地點、人物、勢力或 historyRefs，目標要可執行並留下 evidenceKeywords；conditions 必須永遠是陣列；target 是完成任務所需的進度／證據門檻，只能是 1-5 的整數，絕對不是 NPC 名稱、勢力名稱、任務描述、物件或陣列。如仍有 remainingClaims，只有語義真的吻合時才綁定。"+baseRules+" 輸出 schema：{sideQuests:[{title,objective,locationName,npcName,factionName,historyRefs,claimRefs,known:false,evidenceKeywords:[線索文字],conditions:[條件文字],target:1}]}。",
   user:()=>({payload,stage:"QUESTS",locked:{region,locations:generation.locations,npcs:generation.npcs,factions:generation.factions,definitions:generation.definitions},slots:{sideQuests:slots.sideQuests||0},remainingClaims:runtimeRemainingClaims(plan,generation)}),
   apply:value=>{const sideQuests=bindRuntimeClaims(plan,"sideQuests",runtimeRows(value,"sideQuests",slots.sideQuests).map(normalizeRuntimeSideQuest));if(sideQuests.length<Number(slots.sideQuests))throw new Error("RUNTIME_QUESTS_COUNT");return {...generation,sideQuests}}
  });await checkpointStage("RUNTIME_QUESTS")
 }

 const contract=validateLazyGenerationCandidate(state,generation,plan);if(!contract.valid)throw new Error("RUNTIME_EXPANSION_CONTRACT_FAILED:"+contract.errors.join(","));
 const expansion={region,reason:stageReason,generation};let provenance=validateExpansionProvenance(state,generation),quality;
 if(!provenance.valid)throw new Error("RUNTIME_EXPANSION_PROVENANCE_FAILED:"+provenance.issues.join(","));
 try{
  quality=normalizeWorldEvaluation(await worldStage("RUNTIME_QUALITY_CRITIC",{aiTask:"runtime_quality",signal,timeoutMs:25000,retryOnTimeout:false,maxOutputTokens:900,temperature:.2,system:"你是 Elyndra Runtime World Critic。你只評估，不生成或重寫世界。檢查四個已鎖定階段之間的因果一致性、historyRefs、文化差異、可玩性與模板化程度。overall 0-100；findings 最多5項。只輸出 World Critic JSON。",user:JSON.stringify({payload,expansion,provenance,stages:["GEOGRAPHY","SOCIETY","CAST","QUESTS"]})}),{source:"AI"})
 }catch(e){quality=normalizeWorldEvaluation({overall:78,dimensions:{historyIntegration:80,internalConsistency:75,worldDepth:72,playability:76},findings:[]},{source:"FALLBACK",reason:e?.message||String(e)})}
 const ai=loadAISettings();return {...expansion,quality,provenance,generationSource:{provider:ai.provider||"UNKNOWN",model:ai.model||"UNKNOWN"}}
}
