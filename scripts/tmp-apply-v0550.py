from pathlib import Path
import re


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding="utf-8")
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 anchor, got {count}")
    p.write_text(s.replace(old, new, 1), encoding="utf-8")


# AI-01: preserve the active scene while trimming context and expose real degradation.
p = Path("src/context-manager.js")
s = p.read_text(encoding="utf-8")
new_func = r'''export function tokenBudgetSnapshot(snapshot,maxChars=12000){
 const c=structuredClone(snapshot),reasons=[];
 const mark=reason=>{if(reason&&!reasons.includes(reason))reasons.push(reason)};
 const capped=(rows,limit,reason)=>{const a=Array.isArray(rows)?rows:[];if(a.length>limit)mark(reason);return a.slice(-limit)};
 const prioritize=(rows,predicate,limit,reason)=>{const a=Array.isArray(rows)?rows:[];if(a.length>limit)mark(reason);const priority=a.filter(predicate),rest=a.filter(x=>!predicate(x));return [...priority,...rest.slice(-Math.max(0,limit-priority.length))].slice(0,Math.max(limit,priority.length))};
 c.runtimeSummary=trim(c.runtimeSummary||"");if(c.world?.seedContract)c.world.seedContract=compactSeed(c.world.seedContract);
 const currentLocationName=String(c.world?.location||""),currentLocationId=String(c.travel?.currentLocationId||"");
 c.knownFacts=capped(c.knownFacts,18,"KNOWN_FACTS_CAPPED");c.knowledge=capped(c.knowledge,10,"KNOWLEDGE_CAPPED");c.recentEvents=capped(c.recentEvents,8,"RECENT_EVENTS_CAPPED");
 if(c.registry){c.registry.locations=prioritize(c.registry.locations,x=>String(x?.id||"")===currentLocationId||String(x?.name||"")===currentLocationName,10,"LOCATIONS_CAPPED");c.registry.npcs=prioritize(c.registry.npcs,x=>x?.present===true||(currentLocationId&&String(x?.locationId||"")===currentLocationId),10,"NPCS_CAPPED");c.registry.factions=capped(c.registry.factions,8,"FACTIONS_CAPPED");c.registry.sideQuests=capped(c.registry.sideQuests,8,"SIDE_QUESTS_CAPPED")}
 if(c.factions?.length>8){mark("VISIBLE_FACTIONS_CAPPED");c.factions=c.factions.slice(-8)}
 if(c.directorRegistry){c.directorRegistry.locations=capped(c.directorRegistry.locations,8,"DIRECTOR_LOCATIONS_CAPPED");c.directorRegistry.npcs=capped(c.directorRegistry.npcs,8,"DIRECTOR_NPCS_CAPPED");c.directorRegistry.factions=capped(c.directorRegistry.factions,6,"DIRECTOR_FACTIONS_CAPPED")}
 c.companions=capped(c.companions,6,"COMPANIONS_CAPPED");if((c.directorTimeline||[]).length>4)mark("DIRECTOR_TIMELINE_CAPPED");c.directorTimeline=(c.directorTimeline||[]).slice(0,4);c.directorHistory=capped(c.directorHistory,8,"DIRECTOR_HISTORY_CAPPED");c.directorCanon=capped(c.directorCanon,24,"DIRECTOR_CANON_CAPPED");
 if(c.travel?.routes)c.travel.routes=capped(c.travel.routes,24,"TRAVEL_ROUTES_CAPPED");if(c.directorWeather?.system?.phenomena){if(c.directorWeather.system.phenomena.length>8)mark("WEATHER_PHENOMENA_CAPPED");c.directorWeather.system.phenomena=c.directorWeather.system.phenomena.slice(0,8)}if(c.directorWeather?.runtime?.history)c.directorWeather.runtime.history=capped(c.directorWeather.runtime.history,6,"WEATHER_HISTORY_CAPPED");
 if(c.knowledgeGraph){c.knowledgeGraph.nodes=capped(c.knowledgeGraph.nodes,12,"GRAPH_NODES_CAPPED");c.knowledgeGraph.edges=capped(c.knowledgeGraph.edges,16,"GRAPH_EDGES_CAPPED");c.knowledgeGraph.expansions=capped(c.knowledgeGraph.expansions,8,"GRAPH_EXPANSIONS_CAPPED")}
 const currentLoc=x=>String(x?.id||"")===currentLocationId||String(x?.name||"")===currentLocationName,currentNpc=x=>x?.present===true||(currentLocationId&&String(x?.locationId||"")===currentLocationId);
 const queues=[{name:"knownFacts",q:c.knownFacts,min:Math.min(4,c.knownFacts.length)},{name:"knowledge",q:c.knowledge,min:Math.min(4,c.knowledge.length)},{name:"recentEvents",q:c.recentEvents,min:Math.min(2,c.recentEvents.length)},{name:"registry.npcs",q:c.registry?.npcs,min:0,protect:currentNpc},{name:"registry.locations",q:c.registry?.locations,min:0,protect:currentLoc},{name:"registry.sideQuests",q:c.registry?.sideQuests,min:0},{name:"registry.factions",q:c.registry?.factions,min:0},{name:"factions",q:c.factions,min:0},{name:"directorRegistry.locations",q:c.directorRegistry?.locations,min:0},{name:"directorRegistry.npcs",q:c.directorRegistry?.npcs,min:0},{name:"directorRegistry.factions",q:c.directorRegistry?.factions,min:0},{name:"companions",q:c.companions,min:0},{name:"directorTimeline",q:c.directorTimeline,min:0},{name:"directorHistory",q:c.directorHistory,min:0},{name:"directorCanon",q:c.directorCanon,min:0},{name:"travel.routes",q:c.travel?.routes,min:0},{name:"weather.phenomena",q:c.directorWeather?.system?.phenomena,min:0},{name:"weather.history",q:c.directorWeather?.runtime?.history,min:0},{name:"graph.edges",q:c.knowledgeGraph?.edges,min:0},{name:"graph.nodes",q:c.knowledgeGraph?.nodes,min:0},{name:"graph.expansions",q:c.knowledgeGraph?.expansions,min:0}].filter(x=>Array.isArray(x.q));
 const target=Math.max(600,maxChars-280);let guard=0;while(size(c)>target&&guard++<800){let changed=false;for(const entry of queues){const {q,min=0,protect}=entry;if(q.length<=min)continue;const index=protect?q.findIndex(x=>!protect(x)):0;if(index<0)continue;q.splice(index,1);mark("BUDGET_TRIM_"+entry.name);changed=true;if(size(c)<=target)break}if(!changed)break}
 if(size(c)>target){c.runtimeSummary=trim(c.runtimeSummary).slice(0,300);if(c.world?.summary)c.world.summary=String(c.world.summary).slice(0,400);if(c.world?.lastWorldEvent)c.world.lastWorldEvent={type:c.world.lastWorldEvent.type,summary:String(c.world.lastWorldEvent.summary||"").slice(0,180)};mark("TEXT_TRIMMED")}
 if(size(c)>target){const minimal={world:{name:String(c.world?.name||"").slice(0,120),day:c.world?.day,location:String(c.world?.location||"").slice(0,120),seedContract:compactSeed(c.world?.seedContract)},player:c.player?{hp:c.player.hp,knowledgeScore:c.player.knowledgeScore,wallet:c.player.wallet||{},calendarKnown:c.player.calendarKnown===true}:undefined,quest:c.quest?{title:String(c.quest.title||"").slice(0,120),status:c.quest.status,objectives:(c.quest.objectives||[]).slice(0,2).map(x=>String(x).slice(0,160))}:undefined,crisis:c.crisis?{stage:c.crisis.stage,pressure:c.crisis.pressure}:undefined,knownFacts:(c.knownFacts||[]).slice(-4),knowledge:(c.knowledge||[]).slice(-3),inventory:(c.inventory||[]).slice(-6),recentEvents:(c.recentEvents||[]).slice(-2),registry:{locations:prioritize(c.registry?.locations,currentLoc,2,""),npcs:prioritize(c.registry?.npcs,currentNpc,4,""),factions:[],sideQuests:[]},knowledgeGraph:{nodes:[],edges:[],expansions:[]},causalContext:[],factions:[],companions:(c.companions||[]).slice(-3),directorRegistry:{locations:[],npcs:[],factions:[]},directorTimeline:[],directorHistory:[],directorCanon:[],travel:c.travel?{currentLocationId:c.travel.currentLocationId,routes:[]}:undefined,survival:c.survival,culture:c.culture,magic:c.magic?{prevalence:c.magic.prevalence,laws:(c.magic.laws||[]).slice(0,2),strain:c.magic.strain,capacity:c.magic.capacity,knownSpells:(c.magic.knownSpells||[]).slice(-4)}:undefined,market:c.market?{locationId:c.market.locationId,mode:c.market.mode,currency:c.market.currency,goods:(c.market.goods||[]).slice(0,6)}:undefined,weather:c.weather,directorWeather:c.directorWeather?{current:c.directorWeather.current,system:{identity:c.directorWeather.system?.identity||"",phenomena:(c.directorWeather.system?.phenomena||[]).slice(0,3)}}:undefined,hiddenFacts:[]};minimal.contextMeta={approxChars:0,budgetChars:maxChars,withinBudget:true,degraded:true,degradationReasons:[...new Set([...reasons,"MINIMAL_CONTEXT_FALLBACK"])]};minimal.contextMeta.approxChars=size(minimal);minimal.contextMeta.withinBudget=minimal.contextMeta.approxChars<=maxChars;if(!minimal.contextMeta.withinBudget)throw new Error("CONTEXT_BUDGET_TOO_SMALL");return minimal}
 c.contextMeta={approxChars:0,budgetChars:maxChars,withinBudget:true,degraded:reasons.length>0,degradationReasons:reasons};c.contextMeta.approxChars=size(c);c.contextMeta.withinBudget=c.contextMeta.approxChars<=maxChars;return c
}'''
s, n = re.subn(r"export function tokenBudgetSnapshot\(snapshot,maxChars=12000\)\{.*\}\s*$", new_func, s, flags=re.S)
if n != 1:
    raise SystemExit(f"AI-01 context replacement count={n}")
p.write_text(s, encoding="utf-8")

# AI-02 + AI-03: explicit requirements and hard Engine outcome narrative guard.
p = Path("src/turn-compiler.js")
s = p.read_text(encoding="utf-8")
anchor = 'const text=(v,max=1200)=>typeof v==="string"?v.trim().slice(0,max):"";'
if anchor not in s:
    raise SystemExit("turn compiler text anchor missing")
s = s.replace(anchor, anchor + '\nconst list=(v,max=8,maxLen=100)=>Array.isArray(v)?[...new Set(v.map(x=>text(x,maxLen)).filter(Boolean))].slice(0,max):[];', 1)
old = 'approach:["STEADY","SOCIAL","BOLD","CREATIVE"].includes(String(raw.approach||"").toUpperCase())?String(raw.approach).toUpperCase():"STEADY",progression:raw.progression===true,requirementsSatisfied:raw.requirementsSatisfied!==false}'
new = 'approach:["STEADY","SOCIAL","BOLD","CREATIVE"].includes(String(raw.approach||"").toUpperCase())?String(raw.approach).toUpperCase():"STEADY",progression:raw.progression===true,requirementsSatisfied:raw.requirementsSatisfied===true,requiredItemIds:list(raw.requiredItemIds),requiredCapabilities:list(raw.requiredCapabilities,8,70)}'
if old not in s:
    raise SystemExit("turn compiler requirements anchor missing")
s = s.replace(old, new, 1)
old = '''export function sceneTurnPreview(scene,roll={},context={}){
 const fallback=fallbackNarrative(context.action,roll),narrative=sanitizePlayerText(scene?.narrative,1200,fallback),sceneTitle=sanitizePlayerText(scene?.sceneTitle,60,"");
 const suggestionIntents=normalizeSuggestionIntents(scene?.suggestions,context.priorSuggestionIntents||context.priorSuggestions||[]);
 const suggestions=suggestionIntents.length?suggestionIntents.map(x=>x.label):sanitizeSuggestions(scene?.suggestions,context.priorSuggestions||[]);
 return {narrative:narrative||fallback,sceneTitle,suggestions,suggestionIntents}
}'''
new = '''function guardedSceneNarrative(scene,roll={},action=""){
 const fallback=fallbackNarrative(action,roll),candidate=sanitizePlayerText(scene?.narrative,1200,"");
 if(roll?.success===false)return {narrative:fallback,outcome:"FAILURE",narrativeRejected:Boolean(candidate)};
 if(roll?.success===true&&String(scene?.outcome||"SUCCESS").toUpperCase()!=="SUCCESS")return {narrative:fallback,outcome:"SUCCESS",narrativeRejected:Boolean(candidate)};
 return {narrative:candidate||fallback,outcome:roll?.success===true?"SUCCESS":null,narrativeRejected:false}
}
export function sceneTurnPreview(scene,roll={},context={}){
 const guarded=guardedSceneNarrative(scene,roll,context.action),sceneTitle=sanitizePlayerText(scene?.sceneTitle,60,"");
 const suggestionIntents=normalizeSuggestionIntents(scene?.suggestions,context.priorSuggestionIntents||context.priorSuggestions||[]);
 const suggestions=suggestionIntents.length?suggestionIntents.map(x=>x.label):sanitizeSuggestions(scene?.suggestions,context.priorSuggestions||[]);
 return {...guarded,sceneTitle,suggestions,suggestionIntents}
}'''
if old not in s:
    raise SystemExit("scene preview anchor missing")
s = s.replace(old, new, 1)
old = ''' const fallback=fallbackNarrative(context.action,roll),sceneText=sanitizePlayerText(scene?.narrative,1200,""),stateText=sanitizePlayerText(state.outcomeSummary,1200,"");
 const narrative=state?.encounter?.type==="combat"?(stateText||sceneText||fallback):(sceneText||stateText||fallback);'''
new = ''' const fallback=fallbackNarrative(context.action,roll),sceneText=sanitizePlayerText(scene?.narrative,1200,""),stateText=sanitizePlayerText(state.outcomeSummary,1200,"");
 const guarded=guardedSceneNarrative(scene,roll,context.action);
 const narrative=roll?.success===false?fallback:(state?.encounter?.type==="combat"?(stateText||guarded.narrative||fallback):(guarded.narrative||stateText||fallback));'''
if old not in s:
    raise SystemExit("merge narrative anchor missing")
s = s.replace(old, new, 1)
old = '''  narrative,
  sceneTitle,'''
new = '''  narrative,
  outcome:roll?.success===false?"FAILURE":roll?.success===true?"SUCCESS":null,
  narrativeRejected:roll?.success===false?Boolean(sceneText):guarded.narrativeRejected,
  sceneTitle,'''
if old not in s:
    raise SystemExit("merge return anchor missing")
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

# AI-02 contextual suggestion requirements + inventory-bound trust seal.
p = Path("src/contextual-actions.js")
s = p.read_text(encoding="utf-8")
anchor = 'const clean=(v,max=180)=>typeof v==="string"?v.normalize("NFC").replace(/[\\u0000-\\u001f\\u007f]/g,"").trim().slice(0,max):"";'
if anchor not in s:
    raise SystemExit("contextual clean anchor missing")
s = s.replace(anchor, anchor + '\nconst list=(v,max=8,maxLen=100)=>Array.isArray(v)?[...new Set(v.map(x=>clean(x,maxLen)).filter(Boolean))].slice(0,max):[];', 1)
replace = 'requirementsSatisfied:row.requirementsSatisfied!==false,'
if replace not in s:
    raise SystemExit("contextual requirements anchor missing")
s = s.replace(replace, 'requirementsSatisfied:row.requirementsSatisfied===true,\n  requiredItemIds:list(row.requiredItemIds),requiredCapabilities:list(row.requiredCapabilities,8,70),', 1)
replace = 'targetId:clean(row.validatedContext.targetId,100)||null'
if replace not in s:
    raise SystemExit("validated context target anchor missing")
s = s.replace(replace, replace + ',\n   inventorySeal:clean(row.validatedContext.inventorySeal,900)', 1)
anchor = 'function sceneEventCount(state){return (state.events||[]).filter(e=>e?.visibility!=="INTERNAL").length}'
helper = '''function sceneEventCount(state){return (state.events||[]).filter(e=>e?.visibility!=="INTERNAL").length}
function inventorySeal(state){return (state.inventory||[]).filter(x=>(Number(x?.quantity)||1)>0).map(x=>`${String(x?.id||x?.name||"")}:${Number(x?.quantity)||1}`).sort().join("|").slice(0,900)}
function requiredItemsAvailable(state,row){const required=Array.isArray(row?.requiredItemIds)?row.requiredItemIds:[];if(!required.length)return true;const have=new Set((state.inventory||[]).filter(x=>(Number(x?.quantity)||1)>0).flatMap(x=>[String(x?.id||""),String(x?.name||"")]).filter(Boolean));return required.every(x=>have.has(String(x)))}'''
if anchor not in s:
    raise SystemExit("scene event helper anchor missing")
s = s.replace(anchor, helper, 1)
replace = '&&Number(v.eventCount)===sceneEventCount(state)\n}'
if replace not in s:
    raise SystemExit("context seal end anchor missing")
s = s.replace(replace, '&&Number(v.eventCount)===sceneEventCount(state)\n  &&(!v.inventorySeal||String(v.inventorySeal)===inventorySeal(state))\n}', 1)
old = 'const x=normalizeContextualSuggestion(row);if(!x||x.requirementsSatisfied===false||(x.source==="AI"&&!x.causalBasis))return null;'
new = 'const x=normalizeContextualSuggestion(row);if(!x||x.requirementsSatisfied!==true||!requiredItemsAvailable(state,x)||(x.source==="AI"&&!x.causalBasis))return null;'
if old not in s:
    raise SystemExit("prevalidate suggestion anchor missing")
s = s.replace(old, new, 1)
replace = 'eventCount:sceneEventCount(state),targetId:x.targetId||null}'
if replace not in s:
    raise SystemExit("validated context creation anchor missing")
s = s.replace(replace, 'eventCount:sceneEventCount(state),targetId:x.targetId||null,inventorySeal:inventorySeal(state)}', 1)
replace = 'if(!contextSealCurrent(state,v))return null;'
if replace not in s:
    raise SystemExit("trusted context seal anchor missing")
s = s.replace(replace, 'if(!contextSealCurrent(state,v)||!requiredItemsAvailable(state,x))return null;', 1)
p.write_text(s, encoding="utf-8")

# Prompt/schema aligns with deterministic contracts.
p = Path("src/ai-runtime-contracts.js")
s = p.read_text(encoding="utf-8")
replace = '"causalBasis":"為甚麼當前場景確實可以嘗試這個行動","requirementsSatisfied":true}'
if replace not in s:
    raise SystemExit("structured suggestion schema anchor missing")
s = s.replace(replace, '"causalBasis":"為甚麼當前場景確實可以嘗試這個行動","requirementsSatisfied":true,"requiredItemIds":[],"requiredCapabilities":[]}', 1)
old = 'export const TURN_SCENE_SCHEMA=`{"sceneTitle":"4-18字繁體中文目前目標","narrative":"80-180字繁體中文，只描述玩家當下可感知結果","suggestions":['
new = 'export const TURN_SCENE_SCHEMA=`{"outcome":"SUCCESS|FAILURE，必須與 payload.kernel.result.success 完全一致","sceneTitle":"4-18字繁體中文目前目標","narrative":"80-180字繁體中文，只描述玩家當下可感知結果","suggestions":['
if old not in s:
    raise SystemExit("scene schema anchor missing")
s = s.replace(old, new, 1)
old = 'confirmedOutcome 是本回合唯一結果骨架；你不可重新解讀骰子。'
new = 'confirmedOutcome 是本回合唯一結果骨架；你不可重新解讀骰子。輸出的 outcome 必須嚴格等於 kernel.result.success 對應的 SUCCESS 或 FAILURE；FAILURE 不得以任何措辭宣稱主要目的成功、取得物品或完成受阻行動。'
if old not in s:
    raise SystemExit("scene narrator prompt anchor missing")
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

# AI-05: player question is never NPC testimony; explicit denial is not quest evidence.
replace_once(
    "src/npc-conversation.js",
    'const progressed=evaluateQuestEvidence(state,String(message||"")+" "+String(answer||""),{source:"NPC_TESTIMONY",npcId:npc.id});',
    'const progressed=evaluateQuestEvidence(state,String(answer||""),{source:"NPC_TESTIMONY",npcId:npc.id});',
    "NPC testimony split",
)
p = Path("src/quest-engine.js")
s = p.read_text(encoding="utf-8")
anchor = 'const TRUSTED_EVIDENCE=new Set(["CANON_EVIDENCE","ITEM","NPC_TESTIMONY","ENGINE_EVENT","WORLD_STATE"]);'
helper = '''const TRUSTED_EVIDENCE=new Set(["CANON_EVIDENCE","ITEM","NPC_TESTIMONY","ENGINE_EVENT","WORLD_STATE"]);
function testimonyNegatesKeyword(raw,keyword){const source=String(raw||"").normalize("NFKC").toLowerCase(),needle=String(keyword||"").normalize("NFKC").toLowerCase(),i=source.indexOf(needle);if(i<0)return false;const window=source.slice(Math.max(0,i-24),Math.min(source.length,i+needle.length+24));return /不知道|不知|沒聽過|未聽過|沒有聽過|從未聽|從沒聽|未曾聽|沒見過|未見過|不曾見|不存在|never heard|do not know|don't know|not heard/i.test(window)}'''
if anchor not in s:
    raise SystemExit("quest evidence helper anchor missing")
s = s.replace(anchor, helper, 1)
old = 'if(!k||q.matchedKeywords.includes(k)||!hay.includes(k.toLowerCase()))continue;'
new = 'if(!k||q.matchedKeywords.includes(k)||!hay.includes(k.toLowerCase())||(source==="NPC_TESTIMONY"&&testimonyNegatesKeyword(raw,k)))continue;'
if old not in s:
    raise SystemExit("quest keyword anchor missing")
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

# AI-08: canonical ID first; compatibility names normalize only when unique.
p = Path("src/state-sync.js")
s = p.read_text(encoding="utf-8")
old = ''' const key=kind==="npc"?"npcs":kind==="location"?"locations":kind==="faction"?"factions":kind==="sideQuest"?"sideQuests":"",rows=key?state?.world?.registry?.[key]||[]:[];
 return rows.find(x=>x?.id===value||x?.name===value||x?.title===value)||null
}
function canonicalizeDiscoverySource(state,raw){'''
new = ''' const key=kind==="npc"?"npcs":kind==="location"?"locations":kind==="faction"?"factions":kind==="sideQuest"?"sideQuests":"",rows=key?state?.world?.registry?.[key]||[]:[];
 const exact=rows.find(x=>x?.id===value||x?.name===value||x?.title===value);if(exact)return exact;
 const normalized=String(value||"").normalize("NFKC").replace(/\s+/g,"").toLowerCase();if(!normalized)return null;
 const matches=rows.filter(x=>[x?.name,x?.title].some(label=>String(label||"").normalize("NFKC").replace(/\s+/g,"").toLowerCase()===normalized));
 return matches.length===1?matches[0]:null
}
function canonicalizeDiscoverySource(state,raw){'''
if old not in s:
    raise SystemExit("AI-08 registry entity anchor missing")
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

# Version and complete browser cache generation. 0.55.0 => 55000.
p = Path("src/version.js")
s = p.read_text(encoding="utf-8")
s, n = re.subn(r'APP_VERSION="[^"]+"', 'APP_VERSION="0.55.0"', s, count=1)
if n != 1:
    raise SystemExit("version.js anchor missing")
p.write_text(s, encoding="utf-8")
for path in [Path("app.js"), Path("index.html"), *Path("src").rglob("*.js")]:
    text = path.read_text(encoding="utf-8")
    path.write_text(re.sub(r"\?v=\d+", "?v=55000", text), encoding="utf-8")
for path in Path("test").rglob("*.js"):
    text = path.read_text(encoding="utf-8").replace("54019", "55000")
    if path.name in {"version-ui.test.js", "version-05419-release.test.js"}:
        text = text.replace("0.54.19", "0.55.0")
    path.write_text(text, encoding="utf-8")
old_release = Path("test/version-05419-release.test.js")
if old_release.exists():
    old_release.rename("test/version-0550-release.test.js")

# Regression coverage for the reproduced audit failures.
Path("test/v0550-ai-contract-regressions.test.js").write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {tokenBudgetSnapshot} from "../src/context-manager.js";
import {normalizeSuggestionIntent,sceneTurnPreview,mergeTurnCandidates} from "../src/turn-compiler.js";
import {buildContextualActionSet} from "../src/contextual-actions.js";
import {evaluateQuestEvidence} from "../src/quest-engine.js";
import {groundStatePatch} from "../src/state-sync.js";

test("v0.55.0 context budget preserves current location, present NPC, useful facts and reports degradation",()=>{
 const registry={locations:Array.from({length:14},(_,i)=>({id:`L${i}`,name:i===2?"目前地點":`地點${i}`,description:"地形".repeat(40)})),npcs:Array.from({length:14},(_,i)=>({id:`N${i}`,name:i===1?"在場者":`人物${i}`,locationId:i===1?"L2":`L${i%14}`,present:i===1,description:"人物資料".repeat(35)})),factions:[],sideQuests:[]};
 const snap={world:{name:"測試界",day:1,location:"目前地點",summary:"世界摘要"},player:{hp:100,knowledgeScore:0},knownFacts:Array.from({length:12},(_,i)=>`已知事實${i}`),knowledge:Array.from({length:12},(_,i)=>({title:`知識${i}`,text:"可驗證資料"})),inventory:[],recentEvents:Array.from({length:8},(_,i)=>({type:"OBSERVE",summary:`事件${i}`})),registry,travel:{currentLocationId:"L2",routes:[]},directorCanon:Array.from({length:80},(_,i)=>({id:`F${i}`,text:"Director 背景".repeat(15)})),directorRegistry:{locations:[],npcs:[],factions:[]},directorTimeline:[],directorHistory:[],companions:[],factions:[],knowledgeGraph:{nodes:[],edges:[],expansions:[]},hiddenFacts:[]};
 const got=tokenBudgetSnapshot(snap,5600);assert.ok(got.registry.locations.some(x=>x.id==="L2"));assert.ok(got.registry.npcs.some(x=>x.id==="N1"));assert.ok(got.knownFacts.length>0);assert.ok(got.knowledge.length>0);assert.equal(got.contextMeta.degraded,true);assert.ok(got.contextMeta.degradationReasons.length>0)
});

test("v0.55.0 AI suggestions require explicit requirement confirmation and real required items",()=>{
 const missing=normalizeSuggestionIntent({label:"拿出紙筆",action:"拿出紙筆記下牆上的符號",kind:"GENERAL",risk:"LOW"});assert.equal(missing.requirementsSatisfied,false);
 const state={world:{id:"W1",state:{day:1},registry:{locations:[],npcs:[]}},player:{location:"石室"},inventory:[],events:[],quests:{main:{objectives:["觀察石室"]}}};
 const set=buildContextualActionSet(state,[{label:"拿出紙筆",action:"拿出紙筆記下牆上的符號",kind:"GENERAL",risk:"LOW",requirementsSatisfied:true,requiredItemIds:["ITEM-paper"],causalBasis:"想記錄符號"}]);assert.equal(set.all.some(x=>x.label==="拿出紙筆"),false)
});

test("v0.55.0 failure rolls cannot apply success prose or item-acquisition prose",()=>{
 const scene={outcome:"SUCCESS",sceneTitle:"撬門",narrative:"你成功撬開石門，陌生守衛把紅鑰匙交給你。",suggestions:[]},roll={success:false,grade:"FAILURE",natural:5,total:7,dc:15};
 const preview=sceneTurnPreview(scene,roll,{action:"撬開石門"});assert.equal(preview.outcome,"FAILURE");assert.equal(preview.narrativeRejected,true);assert.doesNotMatch(preview.narrative,/成功撬開|紅鑰匙/);
 const merged=mergeTurnCandidates(scene,{outcomeSummary:"你成功取得紅鑰匙",items:[{name:"紅鑰匙"}]},roll,{action:"撬開石門"});assert.equal(merged.outcome,"FAILURE");assert.doesNotMatch(merged.narrative,/成功取得|紅鑰匙/)
});

test("v0.55.0 denied NPC testimony does not advance keyword quests",()=>{
 const q={id:"Q1",title:"藍光徽記",objective:"確認徽記",known:true,status:"ACTIVE",progress:0,target:2,evidence:[],evidenceKeywords:["藍光徽記"],matchedKeywords:[],conditions:[],matchedConditions:[]};
 const state={world:{state:{day:1},registry:{locations:[],npcs:[{id:"NPC-1",name:"線人",known:true,encountered:true}],factions:[],sideQuests:[q]},canon:{facts:[]},history:[]},player:{},knowledge:[],inventory:[],events:[],quests:{}};
 evaluateQuestEvidence(state,"我不知道甚麼藍光徽記，從未聽過。",{source:"NPC_TESTIMONY",npcId:"NPC-1"});assert.equal(q.progress,0);assert.deepEqual(q.matchedKeywords,[]);
 evaluateQuestEvidence(state,"我昨天在北門親眼看過藍光徽記。",{source:"NPC_TESTIMONY",npcId:"NPC-1"});assert.equal(q.progress,1)
});

test("v0.55.0 uniquely normalizes NPC display-name whitespace to canonical evidence IDs",()=>{
 const state={player:{location:"北門"},world:{state:{day:1},registry:{locations:[{id:"L1",name:"北門",known:true}],npcs:[{id:"NPC-1",name:"維安協員 瑟倫",known:true,encountered:true,alive:true,locationId:"L1"}],factions:[],sideQuests:[]},canon:{facts:[]}},events:[],inventory:[],knowledge:[]};
 const patch={baseRevision:0,operations:[{op:"DISCOVER_FACT",title:"鐘聲異常",text:"維安協員瑟倫指出北門鐘聲突然停止。",factId:"",evidenceType:"HEARD",sourceKind:"NPC",sourceId:"維安協員瑟倫"}]};
 const grounded=groundStatePatch(state,patch,{observableText:"維安協員瑟倫指出北門鐘聲突然停止，值得繼續追查。"});assert.equal(grounded.rejected.length,0);assert.equal(grounded.patch.operations[0].sourceId,"NPC-1")
});
''', encoding="utf-8")

p = Path("README.md")
s = p.read_text(encoding="utf-8")
note = '''\n## v0.55.0 — AI Contract Hardening\n\n- Context budget preserves current-scene anchors and reports degradation.\n- AI suggestions require explicit requirements and deterministic item checks before trusted execution.\n- Engine failures reject arbitrary success prose.\n- NPC quest evidence separates player questions from testimony and rejects explicit denial.\n- Evidence-source display names normalize only to a unique canonical ID.\n\n'''
if "## v0.55.0 — AI Contract Hardening" not in s:
    m = re.search(r"^# .+?\n", s, re.M)
    s = s[:m.end()] + note + s[m.end():] if m else note + s
    p.write_text(s, encoding="utf-8")
