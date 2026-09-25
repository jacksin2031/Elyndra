from pathlib import Path
import re

ROOT=Path('.')
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def replace_once(p,old,new):
    s=read(p)
    if old not in s: raise SystemExit(f'missing anchor in {p}: {old[:100]}')
    write(p,s.replace(old,new,1))
def sub_once(p,pat,repl,flags=0):
    s=read(p); out,n=re.subn(pat,repl,s,count=1,flags=flags)
    if n!=1: raise SystemExit(f'expected one regex match in {p}: {pat}')
    write(p,out)

# Cache generation + release version.
for p in [Path('app.js'),Path('index.html'),*Path('src').glob('*.js'),*Path('api').glob('*.js'),*Path('test').glob('*.test.js')]:
    if p.exists(): p.write_text(p.read_text(encoding='utf-8').replace('57015','57016'),encoding='utf-8')
for p in [Path('src/version.js'),Path('package.json'),*Path('test').glob('*.test.js')]:
    if p.exists(): p.write_text(p.read_text(encoding='utf-8').replace('0.57.15','0.57.16'),encoding='utf-8')

# Shared player-visible location projection. Canonical name remains internal until KNOWN.
Path('src/player-location-visibility.js').write_text(r'''const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
function record(state){
 const rows=Array.isArray(state?.world?.registry?.locations)?state.world.registry.locations:[],token=clean(state?.player?.location||state?.world?.state?.location,160);
 return rows.find(x=>String(x?.id||"")===token||String(x?.name||"")===token)||null
}
function stripCanonical(value,name){const n=clean(name,100);return n?String(value||"").split(n).join(""):String(value||"")}
function observableAlias(loc){
 const explicit=clean(loc?.observableAlias||loc?.playerAlias,80);if(explicit)return explicit;
 const source=stripCanonical(clean(loc?.visibilityHint?.summary||loc?.description,240),loc?.name),type=clean(loc?.type,40);
 if(/石階/.test(source)&&/(裂隙|裂縫|斷口)/.test(source))return "石階後的裂隙";
 if(/裂隙|裂縫|斷口/.test(source))return "眼前的裂隙";
 if(/石階/.test(source))return "石階後的陌生區域";
 if(/橋|棧橋/.test(source))return "眼前的橋邊";
 if(/洞|穴|窟/.test(source)||/洞|穴|窟/.test(type))return "眼前的洞穴";
 if(/林|森林|樹/.test(source)||/林|森林/.test(type))return "眼前的林地";
 if(/塔/.test(source)||/塔/.test(type))return "眼前的高塔周邊";
 if(/街|巷|道路|路/.test(source)||/街|巷|道路|路/.test(type))return "眼前的陌生道路";
 return type?`眼前的${type}`:"眼前的陌生地點"
}
export function playerVisibleLocationRecord(state){
 const loc=record(state);if(!loc)return {id:null,name:"未知地點",known:false,type:"",region:"",description:""};
 const known=loc.known===true,name=known?clean(loc.name,100):observableAlias(loc);
 return {id:loc.id||null,name,known,type:clean(loc.type,60),region:known?clean(loc.region,100):"",description:clean(stripCanonical(loc.description,loc.name),260)}
}
export function playerVisibleLocationName(state){return playerVisibleLocationRecord(state).name}
export function projectPlayerVisibleLocationName(state,value){
 const token=clean(value,160),rows=Array.isArray(state?.world?.registry?.locations)?state.world.registry.locations:[],loc=rows.find(x=>String(x?.id||"")===token||String(x?.name||"")===token);
 if(!loc)return token||"未知地點";return loc.known===true?clean(loc.name,100):observableAlias(loc)
}
''',encoding='utf-8')

# Player-facing snapshots consume the projection.
replace_once('src/adventure-engine.js','import {ensureWorldRegistry,registrySnapshot,directorRegistrySnapshot,revealRegistryEntities,validateGeneration,canonizeGeneration,resolvePlayerLocation,canInteractWithNpc} from "./world-registry.js?v=57016";','import {ensureWorldRegistry,registrySnapshot,directorRegistrySnapshot,revealRegistryEntities,validateGeneration,canonizeGeneration,resolvePlayerLocation,canInteractWithNpc} from "./world-registry.js?v=57016";\nimport {playerVisibleLocationName} from "./player-location-visibility.js?v=57016";')
replace_once('src/adventure-engine.js','location:state.player.location,seedContract:state.world.seedContract||state.world.seed','location:playerVisibleLocationName(state),seedContract:state.world.seedContract||state.world.seed')
replace_once('src/adventure-engine.js','priorSuggestions:(state.suggestions||[]).slice(0,4),priorSuggestionIntents:(state.suggestionIntents||[]).slice(0,4),knowledgeLayers:buildKnowledgeLayers(state)','priorNarrative:text(state.narrative,500),priorSuggestions:(state.suggestions||[]).slice(0,4),priorSuggestionIntents:(state.suggestionIntents||[]).slice(0,4),knowledgeLayers:buildKnowledgeLayers(state)')

replace_once('src/helper-context.js','import {dungeonSnapshot} from "./dungeon-engine.js?v=57016";','import {dungeonSnapshot} from "./dungeon-engine.js?v=57016";\nimport {playerVisibleLocationName} from "./player-location-visibility.js?v=57016";')
replace_once('src/helper-context.js','const locName=String(state.player?.location||state.world?.state?.location||""),loc=locations.find(x=>x.name===locName)||null;','const locName=String(state.player?.location||state.world?.state?.location||""),loc=locations.find(x=>x.name===locName)||null,visibleLocation=playerVisibleLocationName(state);')
replace_once('src/helper-context.js','location:state.player?.location||"未知地點",','location:visibleLocation||"未知地點",')
replace_once('src/helper-context.js','currentLocation:loc?{name:loc.name,type:loc.type,region:loc.region,description:safe(loc.description,220)}:{name:state.player?.location||"未知地點"},','currentLocation:loc?{name:visibleLocation,type:loc.type,region:loc.known===true?loc.region:"",description:safe(loc.description,220).split(String(loc.name||"")).join("")}:{name:visibleLocation||"未知地點"},')

replace_once('src/contextual-actions.js','import {normalizeActionIntent,inferActionKind} from "./action-intent.js?v=57016";','import {normalizeActionIntent,inferActionKind} from "./action-intent.js?v=57016";\nimport {playerVisibleLocationName} from "./player-location-visibility.js?v=57016";')
replace_once('src/contextual-actions.js','function currentLocation(state){return clean(state.player?.location,80)||"眼前這個地方"}','function currentLocation(state){return clean(playerVisibleLocationName(state),80)||"眼前這個地方"}')
replace_once('src/contextual-actions.js','if(kind==="OBSERVE"&&loc)return {sourceKind:"LOCATION",sourceId:String(loc.id||loc.name),evidenceType:"OBSERVED",title:`${clean(loc.name,60)||"目前位置"}的可觀察環境`,text:clean(loc.description,300)||`你確認目前位置「${clean(loc.name,80)}」本身仍提供可直接觀察的地形、出入口或活動基準，可用來縮窄下一步調查範圍。`};','if(kind==="OBSERVE"&&loc){const visible=currentLocation(state);return {sourceKind:"LOCATION",sourceId:String(loc.id||loc.name),evidenceType:"OBSERVED",title:`${visible||"目前位置"}的可觀察環境`,text:clean(loc.description,300).split(String(loc.name||"")).join("")||`你確認${visible||"目前位置"}仍提供可直接觀察的地形、出入口或活動基準，可用來縮窄下一步調查範圍。`}};')

# Being physically present only grants OBSERVED. A formal place name needs evidence/social confirmation.
replace_once('src/world-registry.js','if(entity.name===state.player?.location)return true;\n  return socialSource||(actionKind==="OBSERVE"&&hasEvidence>0)','if(entity.name===state.player?.location)return socialSource||hasEvidence>0;\n  return socialSource||(actionKind==="OBSERVE"&&hasEvidence>0)')

# Scene continuity without director history.
replace_once('src/turn-compiler.js','survival:snapshot.survival||null,\n  quest:snapshot.quest,','survival:snapshot.survival||null,\n  quest:snapshot.quest,\n  priorNarrative:text(snapshot.priorNarrative,500),')

# Narrator style and state-delta contract.
replace_once('src/ai-runtime-contracts.js','"narrative":"80-180字繁體中文，只描述玩家當下可感知結果"','"narrative":"1-3句、40-180字繁體中文，只描述玩家當下可感知結果與實際後果"')
replace_once('src/ai-runtime-contracts.js','return `你是 Elyndra Scene Narrator。','return `你是 Elyndra Scene Narrator。一般回合 narrative 以 1–3 句具體、自然的現場敘述為主，聚焦玩家當下感官、可觀察變化與 Engine 已確認的實際後果；禁止輸出「旅程小結」「世界留下的變化」「仍放不下的事」等報表式段落。不要把骰子結果改寫成「行動成功，但是否出現新資訊」之類機械模板；SUCCESS 只代表 kernel.confirmedOutcome 中已成立的行動結果，不代表 NPC 信任、任務、物品或知識一定改變，只有 kernel.allowedVisibleFacts 或 snapshot 中真實 state delta 支持時才可敘述。接續 snapshot.priorNarrative 的具體線索與人物反應，但不要重複列印 quest／interaction 歷史，不得把同一觀察換句話重講，也不得無中生有新線索。嚴守玩家 POV 與名稱知識邊界：snapshot 只給你的名稱才可使用；未知人名、未知 canonical 地名與 hidden Canon 不得補全，陌生地點只用可觀察描述。全程使用自然繁體中文，除非 snapshot 明確提供玩家可見專名，否則避免中英硬插；結尾可指出一個可行方向，但不得代替玩家決定。')

# Journey recaps belong to history UI, not every-turn narration.
old=''' const recap=maybeJourneyCheckpoint(state);if(recap){\n  const lines=["旅程小結："+recap.summary];\n  if(recap.discoveries.length)lines.push("記住的線索："+recap.discoveries.join("；"));\n  if(recap.worldChanges.length)lines.push("世界留下的變化："+recap.worldChanges.join("；"));\n  if(recap.unresolved.length)lines.push("仍放不下的事："+recap.unresolved.slice(0,2).join("；"));\n  state.narrative=(state.narrative?state.narrative+"\\n\\n":"")+lines.join("\\n");\n  recordDebug("SESSION_CHECKPOINT",{reason:recap.reason,day:recap.day,location:recap.location,worldChanges:recap.worldChanges,discoveries:recap.discoveries,unresolved:recap.unresolved})\n }'''
new=''' const recap=maybeJourneyCheckpoint(state);if(recap){\n  recordDebug("SESSION_CHECKPOINT",{reason:recap.reason,day:recap.day,location:recap.location,worldChanges:recap.worldChanges,discoveries:recap.discoveries,unresolved:recap.unresolved})\n }'''
replace_once('app.js',old,new)

# UI projection.
replace_once('app.js','import {ensureWorldRegistry,canonizeGeneration,enrichGeneratedLocations,canInteractWithNpc,npcInteractionMode,isNpcPresent,repairPlayerLocation} from "./src/world-registry.js?v=57016";','import {ensureWorldRegistry,canonizeGeneration,enrichGeneratedLocations,canInteractWithNpc,npcInteractionMode,isNpcPresent,repairPlayerLocation} from "./src/world-registry.js?v=57016";\nimport {playerVisibleLocationName} from "./src/player-location-visibility.js?v=57016";')
replace_once('app.js','$("#location").textContent=gameState.player.location;','$("#location").textContent=playerVisibleLocationName(gameState);')

# AutoTest difficulty plan + player-visible location.
replace_once('src/ai-autotest.js','import {ensureTravelNetwork} from "./travel-engine.js?v=57016";','import {ensureTravelNetwork} from "./travel-engine.js?v=57016";\nimport {playerVisibleLocationName} from "./player-location-visibility.js?v=57016";')
replace_once('src/ai-autotest.js','const DIFFICULTIES=["easy","normal","hard","realistic"];','export const AUTOTEST_DIFFICULTIES=Object.freeze(["easy","normal","hard","realistic"]);\nconst DIFFICULTIES=AUTOTEST_DIFFICULTIES;\nexport function normalizeAutotestDifficulty(value,fallback="normal"){const raw=String(value||"").toLowerCase();return DIFFICULTIES.includes(raw)?raw:(DIFFICULTIES.includes(String(fallback||"").toLowerCase())?String(fallback).toLowerCase():"normal")}\nexport function autotestDifficultyPlan({worldCount=1,difficultyMode="CURRENT",currentDifficulty="normal"}={}){const count=Math.max(1,Math.min(20,Math.round(Number(worldCount)||1))),mode=String(difficultyMode||"CURRENT").toUpperCase(),current=normalizeAutotestDifficulty(currentDifficulty);const difficulties=mode==="ALL"?[...DIFFICULTIES]:DIFFICULTIES.includes(mode.toLowerCase())?[mode.toLowerCase()]:[current],out=[];let index=0;for(const difficulty of difficulties)for(let ordinal=1;ordinal<=count;ordinal++)out.push({index:++index,ordinal,difficulty});return out}')
replace_once('src/ai-autotest.js','location:text(player.location||state.world?.state?.location||"",160)','location:text(playerVisibleLocationName(state),160)')

# Report difficulty grouping.
replace_once('src/ai-autotest.js','effectiveWorlds=worlds.map(w=>({...w,reportedStatus:reportedWorldStatus(w)})),executionCompleted=w=>w.status==="COMPLETED"&&!(w.phase==="PLAY"&&Math.max(0,Number(w.turns)||0)===0);return {schema:','effectiveWorlds=worlds.map(w=>({...w,reportedStatus:reportedWorldStatus(w)})),executionCompleted=w=>w.status==="COMPLETED"&&!(w.phase==="PLAY"&&Math.max(0,Number(w.turns)||0)===0),difficultyOf=w=>normalizeAutotestDifficulty(w?.difficulty||w?.world?.player?.difficulty||w?.world?.world?.creation?.blueprint?.difficulty||w?.world?.world?.creation?.difficultyRules?.id||"normal"),difficultyKeys=[...new Set(effectiveWorlds.map(difficultyOf))],byDifficulty=Object.fromEntries(difficultyKeys.map(difficulty=>{const group=effectiveWorlds.filter(w=>difficultyOf(w)===difficulty),indexes=new Set(group.map(w=>w.index));return [difficulty,{worldsRequested:Number(config.worldsPerDifficulty)||group.length,worldsCompleted:group.filter(executionCompleted).length,worldsFailed:group.filter(w=>w.reportedStatus==="FAILED").length,worldsHealthy:group.filter(w=>w.reportedStatus==="COMPLETED").length,worldsDegraded:group.filter(w=>w.reportedStatus==="DEGRADED").length,turns:group.reduce((n,w)=>n+(Number(w.turns)||0),0),issues:issues.filter(issue=>indexes.has(issue.worldIndex)).length}]}));return {schema:')
replace_once('src/ai-autotest.js','worldsRequested:Number(config.worldCount)||worlds.length,','worldsRequested:Number(config.totalWorldCount)||Number(config.worldCount)||worlds.length,')
replace_once('src/ai-autotest.js','generationStages,stageBreakdown,tokenTotals},stopReasons:','generationStages,stageBreakdown,tokenTotals,byDifficulty},stopReasons:')
replace_once('src/ai-autotest.js','worlds:effectiveWorlds.map(w=>({index:w.index,status:w.reportedStatus,','worlds:effectiveWorlds.map(w=>({index:w.index,difficulty:difficultyOf(w),status:w.reportedStatus,')

# App difficulty UI/wiring.
replace_once('app.js','import {createWorldCreationDraft,compileWorldCreation,validateWorldCreationCandidate,applyWorldCreationState,buildWorldContract,worldContractHtml} from "./src/world-creation.js?v=57016";','import {createWorldCreationDraft,compileWorldCreation,validateWorldCreationCandidate,applyWorldCreationState,buildWorldContract,worldContractHtml,DIFFICULTY_PRESETS} from "./src/world-creation.js?v=57016";')
replace_once('app.js','import {randomAutotestWorldRaw,decideAutotestAction,autotestStopReason,autotestStateFingerprint,autotestWorldSummary,buildAutotestReport,autotestExportSelection,autotestPlayStrategy} from "./src/ai-autotest.js?v=57016";','import {randomAutotestWorldRaw,decideAutotestAction,autotestStopReason,autotestStateFingerprint,autotestWorldSummary,buildAutotestReport,autotestExportSelection,autotestPlayStrategy,autotestDifficultyPlan} from "./src/ai-autotest.js?v=57016";')
replace_once('app.js','const c=developerAutotest.config||{mode:"play",worldCount:1,maxTurns:30,stopCondition:"TURN_LIMIT",conditionTarget:10,customCondition:"",exportMode:"both",disableTimeout:false};','const c=developerAutotest.config||{mode:"play",worldCount:1,maxTurns:30,stopCondition:"TURN_LIMIT",conditionTarget:10,customCondition:"",exportMode:"both",disableTimeout:false,difficultyMode:"CURRENT"};')
replace_once('app.js','const running=developerAutotest.running,report=developerAutotest.lastReport,summary=report?.summary,exportSnapshot=developerAutotest.exportSnapshot,exportArtifacts=exportSnapshot?buildAutotestExportArtifacts(exportSnapshot):{},saveCapability=autotestSaveCapability(window);','const running=developerAutotest.running,report=developerAutotest.lastReport,summary=report?.summary,exportSnapshot=developerAutotest.exportSnapshot,exportArtifacts=exportSnapshot?buildAutotestExportArtifacts(exportSnapshot):{},saveCapability=autotestSaveCapability(window),difficultyRows=summary?.byDifficulty?Object.entries(summary.byDifficulty).map(([id,row])=>`<div><strong>${esc(DIFFICULTY_PRESETS[id]?.label||id)}</strong> · ${row.worldsCompleted} 完成 / ${row.worldsFailed} 失敗 · ${row.turns} 回合 · ${row.issues} Issues</div>`).join(""):"";')
replace_once('app.js','<label>隨機世界數量<input id="autotestWorldCount" type="number" min="1" max="20" value="${Math.max(1,Number(c.worldCount)||1)}" ${running?"disabled":""}></label>','<label>隨機世界數量<input id="autotestWorldCount" type="number" min="1" max="20" value="${Math.max(1,Number(c.worldsPerDifficulty||c.worldCount)||1)}" ${running?"disabled":""}></label>\n <label>遊玩難度<select id="autotestDifficultyMode" ${running?"disabled":""}><option value="CURRENT">維持目前難度</option><option value="easy">簡單</option><option value="normal">普通</option><option value="hard">困難</option><option value="realistic">現實</option><option value="ALL">難度矩陣：全部逐一測試</option></select></label>')
replace_once('app.js','${summary?`<div class="lore-item"><small>LAST REPORT</small><h3>${summary.worldsCompleted} 完成 · ${summary.worldsFailed} 失敗 · ${summary.totalTurns} 回合</h3><p>Issues ${summary.issues} · AI Requests ${summary.aiRequests} · Tokens ${Number(summary.tokenTotals?.total||0).toLocaleString()} · 平均 AI latency ${summary.aiLatencyAverageMs}ms</p></div>`:""}${exportPanel}','${summary?`<div class="lore-item"><small>LAST REPORT</small><h3>${summary.worldsCompleted} 完成 · ${summary.worldsFailed} 失敗 · ${summary.totalTurns} 回合</h3><p>Issues ${summary.issues} · AI Requests ${summary.aiRequests} · Tokens ${Number(summary.tokenTotals?.total||0).toLocaleString()} · 平均 AI latency ${summary.aiLatencyAverageMs}ms</p>${difficultyRows?`<div class="autotest-difficulty-summary">${difficultyRows}</div>`:""}</div>`:""}${exportPanel}')
replace_once('app.js','disableTimeout:$("#autotestDisableTimeout")?.checked===true,\n  playStrategy:autotestPlayStrategy()','disableTimeout:$("#autotestDisableTimeout")?.checked===true,\n  difficultyMode:String($("#autotestDifficultyMode")?.value||"CURRENT"),\n  playStrategy:autotestPlayStrategy()')
replace_once('app.js','if($("#autotestMode"))$("#autotestMode").value=c.mode||"play";if($("#autotestStopCondition"))','if($("#autotestMode"))$("#autotestMode").value=c.mode||"play";if($("#autotestDifficultyMode"))$("#autotestDifficultyMode").value=c.difficultyMode||"CURRENT";if($("#autotestStopCondition"))')

replace_once('app.js','const originalState=gameState?structuredClone(gameState):null,originalScreen=document.body.dataset.screen||"landing";','const originalState=gameState?structuredClone(gameState):null,originalScreen=document.body.dataset.screen||"landing",currentDifficulty=String(originalState?.player?.difficulty||originalState?.world?.creation?.blueprint?.difficulty||originalState?.world?.creation?.difficultyRules?.id||"normal"),difficultyPlan=autotestDifficultyPlan({worldCount:config.worldCount,difficultyMode:config.difficultyMode,currentDifficulty});\n config={...config,worldsPerDifficulty:config.worldCount,totalWorldCount:difficultyPlan.length,difficulties:[...new Set(difficultyPlan.map(x=>x.difficulty))]};')
replace_once('app.js','appendDeveloperAutotestLog(`開始 ${config.worldCount} 個世界的 ${config.mode==="worlds"?"World Fuzz":"AI Playthrough"} 測試。`);','appendDeveloperAutotestLog(`開始 ${config.totalWorldCount} 個世界的 ${config.mode==="worlds"?"World Fuzz":"AI Playthrough"} 測試；難度 ${config.difficulties.map(x=>DIFFICULTY_PRESETS[x]?.label||x).join(" / ")}。`);')
replace_once('app.js','for(let i=1;i<=config.worldCount;i++){\n   if(developerAutotest.stopRequested)break;\n   if(i>1)recordDebug("AUTOTEST_NEXT_WORLD_STARTED",{index:i,worldsRequested:config.worldCount});','for(const planned of difficultyPlan){\n   const i=planned.index,difficulty=planned.difficulty;if(developerAutotest.stopRequested)break;\n   if(i>1)recordDebug("AUTOTEST_NEXT_WORLD_STARTED",{index:i,worldsRequested:config.totalWorldCount,difficulty});')
replace_once('app.js','const worldStartedAt=Date.now(),result={index:i,status:"RUNNING",phase:"GENERATION",turns:0,stopReason:"",error:"",actions:[],generation:null,summary:null,world:null};','const worldStartedAt=Date.now(),result={index:i,difficulty,status:"RUNNING",phase:"GENERATION",turns:0,stopReason:"",error:"",actions:[],generation:null,summary:null,world:null};')
replace_once('app.js','appendDeveloperAutotestLog(`世界 ${i}/${config.worldCount}：隨機設定並開始生成。`);\n    const generated=await createDeveloperAutotestWorld(randomAutotestWorldRaw(Math.random,i),i);','appendDeveloperAutotestLog(`世界 ${i}/${config.totalWorldCount} · ${DIFFICULTY_PRESETS[difficulty]?.label||difficulty}：隨機設定並開始生成。`);\n    const raw=randomAutotestWorldRaw(Math.random,i);raw.difficulty=difficulty;const generated=await createDeveloperAutotestWorld(raw,i);')
replace_once('app.js','const fastTransition=developerAutotest.worldIndex<Math.max(1,Number(config.worldCount)||1),','const fastTransition=developerAutotest.worldIndex<Math.max(1,Number(config.totalWorldCount||config.worldCount)||1),')
replace_once('app.js','const total=Number(developerAutotest.config?.worldCount)||0,','const total=Number(developerAutotest.config?.totalWorldCount||developerAutotest.config?.worldCount)||0,')
replace_once('app.js','${running?`世界 ${developerAutotest.worldIndex}/${c.worldCount} · 回合 ${developerAutotest.turn}/${c.maxTurns}`:"未執行"}','${running?`世界 ${developerAutotest.worldIndex}/${c.totalWorldCount||c.worldCount} · 回合 ${developerAutotest.turn}/${c.maxTurns}`:"未執行"}')
replace_once('app.js','recordDebug("AUTOTEST_WORLD_GENERATION_STARTED",{index,masterSeed:seed.worldCreationSeed||draft.masterSeed,genre:seed.genre||raw.worldStyle,scale:seed.scale||raw.worldScale});','recordDebug("AUTOTEST_WORLD_GENERATION_STARTED",{index,masterSeed:seed.worldCreationSeed||draft.masterSeed,genre:seed.genre||raw.worldStyle,scale:seed.scale||raw.worldScale,difficulty:raw.difficulty});')
replace_once('app.js','seed:{masterSeed:seed.worldCreationSeed||draft.masterSeed,genre:seed.genre||raw.worldStyle,scale:seed.scale||raw.worldScale},','seed:{masterSeed:seed.worldCreationSeed||draft.masterSeed,genre:seed.genre||raw.worldStyle,scale:seed.scale||raw.worldScale,difficulty:raw.difficulty},')

# IAB/browser delivery code fix only. Validation remains user-owned.
replace_once('src/autotest-download.js','function nativeNavigate(url,locationImpl,documentImpl){\n if(typeof locationImpl?.assign==="function"){locationImpl.assign(url);return}\n const host=documentImpl?.body||documentImpl?.documentElement;if(!host||typeof documentImpl?.createElement!=="function")throw new Error("AUTOTEST_DOWNLOAD_DOCUMENT_UNAVAILABLE");const a=documentImpl.createElement("a");a.href=url;a.rel="noopener";if(a.style)a.style.display="none";host.appendChild(a);try{a.click()}finally{a.remove?.()}\n}','function nativeAnchorDownload(url,filename,documentImpl){\n const host=documentImpl?.body||documentImpl?.documentElement;if(!host||typeof documentImpl?.createElement!=="function")throw new Error("AUTOTEST_DOWNLOAD_DOCUMENT_UNAVAILABLE");const a=documentImpl.createElement("a");a.href=url;a.download=String(filename||"download");a.rel="noopener";if(a.style)a.style.display="none";host.appendChild(a);try{a.click()}finally{a.remove?.()}\n}')
replace_once('src/autotest-download.js','if(controlled){const url=autotestDownloadHttpUrl(artifact,{baseHref:locationImpl.href,nonce:typeof nowImpl==="function"?nowImpl():Date.now()});method="service-worker-http-navigation";nativeNavigate(url,locationImpl,documentImpl)}','if(controlled){const url=autotestDownloadHttpUrl(artifact,{baseHref:locationImpl.href,nonce:typeof nowImpl==="function"?nowImpl():Date.now()});method="service-worker-http-download";nativeAnchorDownload(url,filename,documentImpl)}')
replace_once('src/autotest-download.js','anchor.href=autotestDownloadHttpUrl({filename},{baseHref:locationImpl.href});anchor.removeAttribute?.("download");anchor.target="_blank";anchor.rel="noopener";anchor.dataset.elyndraNativeDownload="service-worker-http-isolated-navigation"','anchor.href=autotestDownloadHttpUrl({filename},{baseHref:locationImpl.href});anchor.download=filename;anchor.removeAttribute?.("target");anchor.rel="noopener";anchor.dataset.elyndraNativeDownload="service-worker-http-download"')

# Opening verification page no longer consumes a hidden first transfer attempt.
pat=r''' releaseDeveloperAutotestDownloadLease\(\);let immediateRequest=null;\n try\{immediateRequest=requestAutotestBrowserDownload\(artifact\);recordDebug\("AUTOTEST_DOWNLOAD_REQUESTED",\{kind,filename:immediateRequest\.filename,bytes:immediateRequest\.bytes,method:immediateRequest\.method,bridgeControlled:immediateRequest\.bridgeControlled,userActivation:Boolean\(navigator\.userActivation\?\.isActive\),stage:"primary-click"\}\)\}\n catch\(error\)\{recordDebug\("AUTOTEST_DOWNLOAD_REQUEST_FAILED",\{kind,filename:artifact\.filename,error:error\?\.message\|\|String\(error\),userActivation:Boolean\(navigator\.userActivation\?\.isActive\),stage:"primary-click"\}\)\}\n try\{const payload=await buildAutotestDownloadPayload\(artifact\),lease=createAutotestDownloadLease\(payload\);developerAutotestDownload\.kind=kind;developerAutotestDownload\.payload=payload;developerAutotestDownload\.lease=lease;developerAutotestDownload\.request=immediateRequest\?\{\.\.\.immediateRequest,sha256:payload\.sha256\}:null;'''
sub_once('app.js',pat,' releaseDeveloperAutotestDownloadLease();\n try{const payload=await buildAutotestDownloadPayload(artifact),lease=createAutotestDownloadLease(payload);developerAutotestDownload.kind=kind;developerAutotestDownload.payload=payload;developerAutotestDownload.lease=lease;developerAutotestDownload.request=null;')
replace_once('app.js','immediateRequested:Boolean(immediateRequest)','immediateRequested:false')
replace_once('app.js','<a id="autotestDownloadAnchor" class="primary" href="#">重新下載檔案</a>','<a id="autotestDownloadAnchor" class="primary" href="#">${request?.status==="requested"?"重新下載檔案":"下載檔案"}</a>')
replace_once('app.js','<p class="muted">下載實作：優先走同源 Service Worker HTTP attachment（Content-Disposition），避免受限制 IAB 吞掉 blob: 下載；只有 bridge 未受控時才退回 Blob。此頁仍只把「重新選回的檔案」驗證成功視為完成。</p>','<p class="muted">開啟此驗證頁不會自動觸發下載。請在頁內明確按一次「下載檔案」；受控環境使用同源 Service Worker HTTP attachment + 原生 download 連結，未受控時才退回 Blob。只有把實際檔案重新選回並通過驗證才算完成。</p>')
replace_once('app.js','buildAutotestDownloadPayload,createAutotestDownloadLease,verifyAutotestDownloadedFile,requestAutotestBrowserDownload','buildAutotestDownloadPayload,createAutotestDownloadLease,verifyAutotestDownloadedFile')

# Non-download regressions only.
Path('test/v05716-knowledge-narrator-difficulty.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {playerVisibleLocationName,playerVisibleLocationRecord} from "../src/player-location-visibility.js";
import {helperSnapshot} from "../src/helper-context.js";
import {buildSnapshot} from "../src/adventure-engine.js";
import {buildContextualActionSet} from "../src/contextual-actions.js";
import {revealRegistryEntities} from "../src/world-registry.js";
import {sceneNarratorSystem} from "../src/ai-runtime-contracts.js";
import {sceneTurnSnapshot} from "../src/turn-compiler.js";
import {autotestDifficultyPlan,buildAutotestReport,AUTOTEST_DIFFICULTIES} from "../src/ai-autotest.js";
import {readFile} from "node:fs/promises";

function state(){return {world:{id:"W",name:"秘界",state:{day:1,region:"北境",clock:{day:1,hour:8,minute:0,totalMinutes:0},location:"裂霧庭",flags:{}},registry:{locations:[{id:"L0",name:"裂霧庭",type:"裂谷",region:"北境",description:"石階後有一道狹長裂隙，冷風從縫中湧出。",known:false,visibilityLock:"OBSERVED",worldState:{safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]}}],npcs:[],factions:[],sideQuests:[]},canon:{facts:[]},travel:{version:1,routes:[]},creation:{blueprint:{difficulty:"normal"},difficultyRules:{id:"normal"}},seedContract:{},weather:{},bible:{weatherSystem:{phenomena:[]}},economy:{},quality:{}},player:{name:"旅人",location:"裂霧庭",hp:100,maxHp:100,level:1,xp:0,knowledgeScore:0,wallet:{},calendarKnown:false,worldNameKnown:false,difficulty:"normal",origin:{}},inventory:[],knowledge:[],events:[],quests:{main:{title:"確認去向",objectives:["找出可驗證的出口"],stage:0,status:"ACTIVE"}},suggestions:[],suggestionIntents:[],discoveries:0,runtimeSummary:"",companions:[]}}

test("unknown current canonical location projects observable alias until evidence unlock",()=>{
 const s=state(),alias=playerVisibleLocationName(s);assert.notEqual(alias,"裂霧庭");assert.match(alias,/裂隙|陌生/);assert.equal(playerVisibleLocationRecord(s).known,false);
 const helper=helperSnapshot(s);assert.equal(helper.player.location,alias);assert.equal(helper.world.currentLocation.name,alias);assert.ok(!JSON.stringify(helper).includes("裂霧庭"));
 const snap=buildSnapshot(s),scene=sceneTurnSnapshot(snap);assert.equal(snap.world.location,alias);assert.equal(scene.world.location,alias);assert.ok(!JSON.stringify(scene).includes("裂霧庭"));
 const set=buildContextualActionSet(s,[]);assert.ok(set.all.length>0);assert.ok(set.all.every(x=>!String(x.action||"").includes("裂霧庭")&&!String(x.label||"").includes("裂霧庭")));
 const loc=s.world.registry.locations[0];assert.equal(revealRegistryEntities(s,[{kind:"location",id:loc.id}],{enforceCausality:true,actionKind:"OBSERVE",verifiedEvidenceCount:0}).length,0);assert.equal(loc.known,false);
 assert.equal(revealRegistryEntities(s,[{kind:"location",id:loc.id}],{enforceCausality:true,actionKind:"OBSERVE",verifiedEvidenceCount:1}).length,1);assert.equal(loc.known,true);assert.equal(playerVisibleLocationName(s),"裂霧庭")
});

test("scene narrator contract is concise grounded POV-safe and non-report-like",async()=>{
 const prompt=sceneNarratorSystem();assert.match(prompt,/1–3 句/);assert.match(prompt,/旅程小結/);assert.match(prompt,/不代表 NPC 信任、任務、物品或知識一定改變/);assert.match(prompt,/未知 canonical 地名/);assert.match(prompt,/自然繁體中文/);assert.match(prompt,/不得無中生有新線索/);
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.doesNotMatch(app,/state\.narrative=.*旅程小結/)
});

test("autotest difficulty plan covers current explicit and full matrix deterministically",()=>{
 assert.deepEqual(AUTOTEST_DIFFICULTIES,["easy","normal","hard","realistic"]);assert.deepEqual(autotestDifficultyPlan({worldCount:2,difficultyMode:"CURRENT",currentDifficulty:"hard"}).map(x=>x.difficulty),["hard","hard"]);
 const matrix=autotestDifficultyPlan({worldCount:2,difficultyMode:"ALL",currentDifficulty:"normal"});assert.equal(matrix.length,8);for(const id of AUTOTEST_DIFFICULTIES)assert.equal(matrix.filter(x=>x.difficulty===id).length,2);assert.deepEqual(autotestDifficultyPlan({worldCount:1,difficultyMode:"realistic"}).map(x=>x.difficulty),["realistic"])
});

test("autotest report groups execution by difficulty",()=>{
 const worlds=[{index:1,difficulty:"easy",status:"COMPLETED",phase:"PLAY",turns:3,stopReason:"TURN_LIMIT",actions:[{worldIndex:1,turn:1,beforeFingerprint:"a",afterFingerprint:"b"},{worldIndex:1,turn:2,beforeFingerprint:"b",afterFingerprint:"c"},{worldIndex:1,turn:3,beforeFingerprint:"c",afterFingerprint:"d"}],generation:{diagnostics:{quality:"HEALTHY",stages:{}}}},{index:2,difficulty:"hard",status:"FAILED",phase:"GENERATION",turns:0,error:"boom",actions:[],generation:{diagnostics:{quality:"HEALTHY",stages:{}}}}];
 const report=buildAutotestReport({config:{worldCount:1,worldsPerDifficulty:1,totalWorldCount:2,difficultyMode:"ALL"},worlds,telemetry:[],startedAt:1,endedAt:2});assert.equal(report.summary.worldsRequested,2);assert.equal(report.summary.byDifficulty.easy.worldsCompleted,1);assert.equal(report.summary.byDifficulty.easy.turns,3);assert.equal(report.summary.byDifficulty.hard.worldsFailed,1);assert.ok(report.summary.byDifficulty.hard.issues>=1);assert.equal(report.worlds[0].difficulty,"easy")
});

test("developer autotest wires selected difficulty into each generated world and grouped UI",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.match(app,/id="autotestDifficultyMode"/);assert.match(app,/autotestDifficultyPlan/);assert.match(app,/raw\.difficulty=difficulty/);assert.match(app,/totalWorldCount:difficultyPlan\.length/);assert.match(app,/summary\.byDifficulty/)
});
''',encoding='utf-8')
print('v0.57.16 patch applied')
