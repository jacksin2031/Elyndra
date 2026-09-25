from pathlib import Path
import json, re

ROOT=Path('.')

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def replace_once(path, old, new, label):
    text=read(path)
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match in {path}, got {count}')
    write(path,text.replace(old,new,1))

def replace_all_guard(path, old, new, min_count, label):
    text=read(path); count=text.count(old)
    if count<min_count: raise SystemExit(f'{label}: expected >= {min_count} matches in {path}, got {count}')
    write(path,text.replace(old,new))

# 1) Version + coherent module cache generation.
version_path=Path('src/version.js')
version=version_path.read_text(encoding='utf-8')
if 'APP_VERSION="0.57.13"' not in version: raise SystemExit('version guard failed')
version_path.write_text(version.replace('APP_VERSION="0.57.13"','APP_VERSION="0.57.14"'),encoding='utf-8')

pkg_path=Path('package.json'); pkg=json.loads(pkg_path.read_text(encoding='utf-8'))
if pkg.get('version')!='0.57.13': raise SystemExit(f'package version guard failed: {pkg.get("version")}')
pkg['version']='0.57.14'
pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')

for path in [Path('app.js'),Path('index.html'),*Path('src').glob('*.js'),*Path('test').glob('*.test.js')]:
    text=path.read_text(encoding='utf-8')
    if '57013' in text:
        path.write_text(text.replace('57013','57014'),encoding='utf-8')

# 2) AutoTest: use canonical travel network for recovery, retain combat safety, target-loop recovery.
p=Path('src/ai-autotest.js'); s=read(p)
needle='import {helperSnapshot} from "./helper-context.js?v=57014";\n'
if needle not in s: raise SystemExit('ai-autotest import anchor missing')
s=s.replace(needle,needle+'import {ensureTravelNetwork} from "./travel-engine.js?v=57014";\n',1)

old='function firstButtonRecoveryDestination(state={}){const locations=list(state.world?.registry?.locations),currentName=String(state.player?.location||state.world?.state?.location||""),current=locations.find(x=>x?.id===currentName||x?.name===currentName);if(!current)return null;const byId=new Map(locations.map(x=>[String(x?.id||""),x]).filter(([id])=>id));for(const route of list(state.world?.travel?.routes)){if(!route||route.open===false)continue;let other="";if(String(route.fromId||"")===String(current.id||""))other=String(route.toId||"");else if(String(route.toId||"")===String(current.id||""))other=String(route.fromId||"");else continue;const target=byId.get(other);if(target?.known===true&&target?.name&&!(Array.isArray(target.accessRequirements)&&target.accessRequirements.length))return target}return null}'
new='function firstButtonRecoveryDestination(state={}){const locations=list(state.world?.registry?.locations),currentName=String(state.player?.location||state.world?.state?.location||""),current=locations.find(x=>x?.id===currentName||x?.name===currentName);if(!current)return null;const routes=list(ensureTravelNetwork(state)?.routes),byId=new Map(locations.map(x=>[String(x?.id||""),x]).filter(([id])=>id));for(const route of routes){if(!route||route.open===false)continue;let other="";if(String(route.fromId||"")===String(current.id||""))other=String(route.toId||"");else if(String(route.toId||"")===String(current.id||""))other=String(route.fromId||"");else continue;const target=byId.get(other);if(target?.known===true&&target?.name&&!(Array.isArray(target.accessRequirements)&&target.accessRequirements.length))return target}return null}\nfunction repeatedAutotestTarget(recentActions=[]){const rows=list(recentActions).filter(x=>x&&typeof x==="object").slice(-5),targets=rows.map(x=>String(x.targetId||"")).filter(Boolean);if(targets.length<4)return "";const counts=new Map();for(const id of targets)counts.set(id,(counts.get(id)||0)+1);return [...counts.entries()].sort((a,b)=>b[1]-a[1]).find(([,n])=>n>=4)?.[0]||""}'
if old not in s: raise SystemExit('recovery destination anchor missing')
s=s.replace(old,new,1)

old=' if(snapshot.combat?.active===true){const decision={mode:"combat",combatAction:"attack",action:"attack",suggestionIndex:null,kind:"COMBAT",progression:false,targetId:null,reason:"FIRST_BUTTON",goalReached:false,goalEvidence:"",firstButton:true};recordDebug("AUTOTEST_FIRST_BUTTON_DECISION",{worldId,mode:decision.mode,combatAction:"attack"});return decision}\n if(stall>=3){const recovered=deterministicAutotestDecision(snapshot,recentActions,"FIRST_BUTTON_STALL_RECOVERY"),decision={...recovered,firstButton:true,firstButtonOverride:true,reason:"FIRST_BUTTON_STALL_RECOVERY"};recordDebug("AUTOTEST_FIRST_BUTTON_STALL_RECOVERY",{worldId,stall,action:decision.action,kind:decision.kind||"",targetId:decision.targetId||null,suggestionIndex:decision.suggestionIndex});recordDebug("AUTOTEST_FIRST_BUTTON_DECISION",{worldId,mode:decision.mode,suggestionIndex:decision.suggestionIndex,action:decision.action,kind:decision.kind||"",recovered:true});return decision}'
new=' if(snapshot.combat?.active===true){const maxHp=Math.max(1,Number(snapshot.player?.maxHp)||1),hp=Math.max(0,Number(snapshot.player?.hp)||0),lowHp=hp/maxHp<=.35,combatAction=lowHp?"retreat":"attack",decision={mode:"combat",combatAction,action:combatAction,suggestionIndex:null,kind:"COMBAT",progression:false,targetId:null,reason:lowHp?"FIRST_BUTTON_COMBAT_SAFETY_RECOVERY":"FIRST_BUTTON",goalReached:false,goalEvidence:"",firstButton:true,firstButtonOverride:lowHp};recordDebug("AUTOTEST_FIRST_BUTTON_DECISION",{worldId,mode:decision.mode,combatAction,hp,maxHp,safetyOverride:lowHp});return decision}\n const repeatedTarget=repeatedAutotestTarget(recentActions);\n if(stall>=3||repeatedTarget){const destination=(stall>=5||repeatedTarget)?firstButtonRecoveryDestination(state):null,recovered=destination?{mode:"free",suggestionIndex:null,action:`前往${destination.name}`,kind:"TRAVEL",progression:true,targetId:destination.id,combatAction:null,reason:"FIRST_BUTTON_STALL_TRAVEL_RECOVERY",goalReached:false,goalEvidence:"",fallback:true}:deterministicAutotestDecision(snapshot,recentActions,"FIRST_BUTTON_STALL_RECOVERY"),decision={...recovered,firstButton:true,firstButtonOverride:true,reason:destination?"FIRST_BUTTON_STALL_TRAVEL_RECOVERY":"FIRST_BUTTON_STALL_RECOVERY"};recordDebug("AUTOTEST_FIRST_BUTTON_STALL_RECOVERY",{worldId,stall,repeatedTarget:repeatedTarget||null,action:decision.action,kind:decision.kind||"",targetId:decision.targetId||null,suggestionIndex:decision.suggestionIndex});recordDebug("AUTOTEST_FIRST_BUTTON_DECISION",{worldId,mode:decision.mode,suggestionIndex:decision.suggestionIndex,action:decision.action,kind:decision.kind||"",recovered:true});return decision}'
if old not in s: raise SystemExit('first button recovery anchor missing')
s=s.replace(old,new,1)

# Quality critic is advisory for execution health: keep WARN issue, but don't turn completed worlds into DEGRADED solely for quality pending/unavailable.
old='if(list(world.actions).some(x=>x?.error)||runtimeRecoveryFailed(world)||String(world?.summary?.coherence?.status||"").toUpperCase()==="FAIL"||world?.summary?.coherence?.quality?.pending===true||world?.summary?.coherence?.quality?.unavailable===true)return "DEGRADED";'
new='if(list(world.actions).some(x=>x?.error)||runtimeRecoveryFailed(world)||String(world?.summary?.coherence?.status||"").toUpperCase()==="FAIL")return "DEGRADED";'
if old not in s: raise SystemExit('reportedWorldStatus anchor missing')
s=s.replace(old,new,1)

# Count grounded local NPC interactions as conversation coverage; accept interaction memory as grounded continuity evidence.
old='conversationIds=[...new Set(list(state.events).filter(e=>e?.type==="NPC_CONVERSATION").map(e=>String(e?.npcId||"")).filter(Boolean))]'
new='conversationIds=[...new Set(list(state.events).filter(e=>["NPC_CONVERSATION","NPC_INTERACTION"].includes(String(e?.type||""))).map(e=>String(e?.npcId||"")).filter(Boolean))]'
if old not in s: raise SystemExit('npc conversation event anchor missing')
s=s.replace(old,new,1)
old='if(!list(npc.memories).some(m=>String(m?.type||"").toLowerCase()==="conversation"))memoryMismatch.push(id)'
new='if(!list(npc.memories).some(m=>["conversation","interaction"].includes(String(m?.type||"").toLowerCase())))memoryMismatch.push(id)'
if old not in s: raise SystemExit('npc memory anchor missing')
s=s.replace(old,new,1)
write(p,s)

# 3) App orchestration: target continuity, expansion cooldown, terminal-but-unavailable quality state.
p=Path('app.js'); s=read(p)
old='const autotestRuntimeExpansion={running:false,controller:null,reason:"",turn:0};'
new='const autotestRuntimeExpansion={running:false,controller:null,reason:"",turn:0,cooldownUntil:0};'
if old not in s: raise SystemExit('runtime expansion state anchor missing')
s=s.replace(old,new,1)
old='if(!developerAutotestActive||!developerAutotest.running||!gameState||!aiStatus.aiConfigured||autotestRuntimeExpansion.running||(!forcedRecovery&&!needsExpansion(gameState)))return false;'
new='if(!developerAutotestActive||!developerAutotest.running||!gameState||!aiStatus.aiConfigured||autotestRuntimeExpansion.running||Date.now()<Number(autotestRuntimeExpansion.cooldownUntil||0)||(!forcedRecovery&&!needsExpansion(gameState)))return false;'
if old not in s: raise SystemExit('runtime expansion schedule guard missing')
s=s.replace(old,new,1)
old='void expandDeveloperAutotestWorld(reason,{background:true,signal:ctrl.signal,force:forcedRecovery}).then(ok=>{if(isCurrentStateSession(stateToken))recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_COMPLETED",{reason,turn,worldId,ok})}).finally(()=>{'
new='void expandDeveloperAutotestWorld(reason,{background:true,signal:ctrl.signal,force:forcedRecovery}).then(ok=>{autotestRuntimeExpansion.cooldownUntil=ok?0:Date.now()+15000;if(isCurrentStateSession(stateToken))recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_COMPLETED",{reason,turn,worldId,ok,cooldownUntil:autotestRuntimeExpansion.cooldownUntil})}).finally(()=>{'
if old not in s: raise SystemExit('runtime expansion completion anchor missing')
s=s.replace(old,new,1)

# Both recentActions append sites need targetId to make target-loop diversity actually work.
old='progression:decision.progression===true,progressed:row.beforeFingerprint!==row.afterFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0}'
new='progression:decision.progression===true,targetId:decision.targetId||null,progressed:row.beforeFingerprint!==row.afterFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0}'
if s.count(old)!=1: raise SystemExit(f'recent decision append guard expected 1 got {s.count(old)}')
s=s.replace(old,new,1)
old='progression:row.decision?.progression===true,progressed:row.beforeFingerprint!==row.afterFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0}'
new='progression:row.decision?.progression===true,targetId:row.decision?.targetId||null,progressed:row.beforeFingerprint!==row.afterFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0}'
if s.count(old)!=1: raise SystemExit(f'recent error append guard expected 1 got {s.count(old)}')
s=s.replace(old,new,1)

old='const finalQuality=gameState?.world?.quality||{},qualitySettled=!backgroundQualityNeed(gameState).required&&finalQuality.pending!==true&&finalQuality.backgroundPending!==true&&String(finalQuality.status||"").toUpperCase()!=="PENDING";\n const finalQualitySettleKey=[gameState?.world?.id||"",developerAutotest.turn,qualitySettled].join(":");if(developerAutotest.finalQualitySettleKey!==finalQualitySettleKey){developerAutotest.finalQualitySettleKey=finalQualitySettleKey;recordDebug("AUTOTEST_FINAL_QUALITY_SETTLED",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn,qualitySettled})}\n return qualitySettled'
new='const finalQuality=gameState?.world?.quality||{},qualityStatus=String(finalQuality.status||"").toUpperCase(),qualityUnavailable=qualityStatus==="UNAVAILABLE",qualitySettled=!backgroundQualityNeed(gameState).required&&finalQuality.pending!==true&&finalQuality.backgroundPending!==true&&qualityStatus!=="PENDING"&&!qualityUnavailable,qualityTerminal=qualitySettled||qualityUnavailable;\n const finalQualitySettleKey=[gameState?.world?.id||"",developerAutotest.turn,qualitySettled,qualityUnavailable].join(":");if(developerAutotest.finalQualitySettleKey!==finalQualitySettleKey){developerAutotest.finalQualitySettleKey=finalQualitySettleKey;recordDebug("AUTOTEST_FINAL_QUALITY_SETTLED",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn,qualitySettled,qualityUnavailable})}\n return qualityTerminal'
if old not in s: raise SystemExit('final quality anchor missing')
s=s.replace(old,new,1)
write(p,s)

# 4) Traditional-Chinese continuity: reject more observed leakage in UI and normalize parsed model JSON recursively.
p=Path('src/runtime-guard.js'); s=read(p)
old='const SIMPLIFIED_MARKER=/[这转询问当视现节轻触锋锐属边缘测试温质闭仪监为从发]/g;'
new='const SIMPLIFIED_MARKER=/[这转询问当视现节轻触锋锐属边缘测试温质闭仪监为从发确认记录状态细详标围环参见续验证获长设仅报断体统网络灵气区门进观点线导级结构开关与动无处应术觉话资]/g;'
if old not in s: raise SystemExit('simplified marker anchor missing')
s=s.replace(old,new,1); write(p,s)

p=Path('src/model-json.js'); s=read(p)
insert='''\nconst HANT_CHAR_MAP=Object.freeze({"这":"這","转":"轉","询":"詢","问":"問","当":"當","视":"視","现":"現","节":"節","轻":"輕","触":"觸","锋":"鋒","锐":"銳","属":"屬","边":"邊","缘":"緣","测":"測","试":"試","温":"溫","质":"質","闭":"閉","仪":"儀","监":"監","为":"為","从":"從","确":"確","认":"認","记":"記","录":"錄","状":"狀","态":"態","细":"細","详":"詳","标":"標","围":"圍","环":"環","参":"參","见":"見","续":"續","验":"驗","证":"證","获":"獲","长":"長","设":"設","仅":"僅","报":"報","断":"斷","体":"體","统":"統","网":"網","络":"絡","灵":"靈","气":"氣","区":"區","门":"門","进":"進","观":"觀","点":"點","线":"線","导":"導","级":"級","结":"結","构":"構","开":"開","关":"關","与":"與","动":"動","无":"無","处":"處","应":"應","术":"術","觉":"覺","话":"話","资":"資"});\nfunction normalizeModelHant(value){\n if(typeof value==="string")return [...value].map(ch=>HANT_CHAR_MAP[ch]||ch).join("");\n if(Array.isArray(value))return value.map(normalizeModelHant);\n if(value&&typeof value==="object"){for(const key of Object.keys(value))value[key]=normalizeModelHant(value[key]);return value}\n return value\n}\nfunction parsedModelJSON(value){return normalizeModelHant(JSON.parse(value))}\n'''
if 'const HANT_CHAR_MAP=' in s: raise SystemExit('model Hant normalizer already exists')
s=insert+s
s=s.replace('return JSON.parse(candidate)','return parsedModelJSON(candidate)')
s=s.replace('return JSON.parse(repaired)','return parsedModelJSON(repaired)')
s=s.replace('return JSON.parse(structural)','return parsedModelJSON(structural)')
s=s.replace('return JSON.parse(properties)','return parsedModelJSON(properties)')
s=s.replace('return JSON.parse(closed)','return parsedModelJSON(closed)')
if 'return JSON.parse(' in s: raise SystemExit('unwrapped JSON.parse remains in model parser')
write(p,s)

# 5) Regression tests. Name/content intentionally avoid the excluded product-transfer test families.
test=Path('test/v05714-gameplay-regressions.test.js')
test.write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {firstButtonAutotestDecision,buildAutotestReport,autotestWorldCoherence} from "../src/ai-autotest.js";
import {parseModelJSON} from "../src/model-json.js";
import {sanitizeSuggestion} from "../src/runtime-guard.js";

function state(){return {world:{id:"W",name:"測試界",state:{day:1,location:"起點",region:"區",clock:{day:1,hour:8,minute:0,totalMinutes:0}},registry:{locations:[{id:"L1",name:"起點",region:"區",known:true,accessRequirements:[]},{id:"L2",name:"側路",region:"區",known:true,accessRequirements:[]}],npcs:[],factions:[],sideQuests:[]},travel:{version:1,routes:[]}},player:{name:"P",location:"起點",hp:100,maxHp:100,status:"ALIVE",level:1,xp:0,knowledgeScore:0},quests:{main:{title:"主線",stage:1,status:"ACTIVE",objectives:["找到新線索"]}},inventory:[],knowledge:[],events:[],discoveries:0,suggestionIntents:[{label:"再問一次",action:"再次詢問艾琳",kind:"SOCIAL",progression:true,targetId:"N1"},{label:"看看側路",action:"查看側路",kind:"OBSERVE",progression:false,targetId:"L2"}]}}

test("v0.57.14 FIRST_BUTTON retreats when combat HP is at or below safety threshold",()=>{const s=state();s.player.hp=29;s.combat={active:true,enemy:{name:"敵人",hp:40}};const d=firstButtonAutotestDecision(s,[]);assert.equal(d.combatAction,"retreat");assert.equal(d.firstButtonOverride,true);assert.equal(d.reason,"FIRST_BUTTON_COMBAT_SAFETY_RECOVERY")});

test("v0.57.14 FIRST_BUTTON still attacks in combat when HP is healthy",()=>{const s=state();s.combat={active:true,enemy:{name:"敵人",hp:40}};assert.equal(firstButtonAutotestDecision(s,[]).combatAction,"attack")});

test("v0.57.14 stalled recovery materializes route and chooses an exact known destination",()=>{const s=state(),recent=[1,2,3,4,5].map(i=>({action:"詢問 "+i,kind:"SOCIAL",targetId:"N1",progressed:false}));const d=firstButtonAutotestDecision(s,recent);assert.equal(d.kind,"TRAVEL");assert.equal(d.targetId,"L2");assert.equal(d.action,"前往側路");assert.ok(s.world.travel.routes.length>=1)});

test("v0.57.14 repeated target triggers destination recovery even with incidental state changes",()=>{const s=state(),recent=[1,2,3,4,5].map((i)=>({action:"詢問不同細節 "+i,kind:"SOCIAL",targetId:"N1",progressed:i===3}));const d=firstButtonAutotestDecision(s,recent);assert.equal(d.firstButtonOverride,true);assert.equal(d.kind,"TRAVEL");assert.equal(d.targetId,"L2")});

test("v0.57.14 parsed model strings normalize observed Simplified-Chinese leakage",()=>{const row=parseModelJSON('{"text":"确认记录本的保存状态；石阶旁生长；管理体系；仅限；报告中断"}');assert.equal(row.text,"確認記錄本的保存狀態；石階旁生長；管理體系；僅限；報告中斷");assert.equal(sanitizeSuggestion("向灰斑确认记录本的保存状态"),"")});

test("v0.57.14 advisory world quality does not erase completed execution status",()=>{const base={index:1,status:"COMPLETED",phase:"PLAY",turns:30,stopReason:"TURN_LIMIT",actions:[{turn:1,beforeFingerprint:"a",afterFingerprint:"b"}],generation:{diagnostics:{quality:"HEALTHY",stages:{}}},summary:{coherence:{status:"WARN",issues:[{severity:"WARN",type:"WORLD_QUALITY_UNAVAILABLE"}],quality:{pending:false,unavailable:true}}}};const report=buildAutotestReport({config:{worldCount:1,maxTurns:30,playStrategy:"FIRST_BUTTON"},worlds:[base],telemetry:[],startedAt:1,endedAt:2});assert.equal(report.summary.worldsCompleted,1);assert.equal(report.summary.worldsDegraded,0)});

test("v0.57.14 grounded local NPC interaction counts as conversation continuity",()=>{const s=state();s.world.registry.npcs=[{id:"N1",name:"艾琳",known:true,encountered:true,memories:[{type:"interaction",grounded:true}]}];s.events=[{type:"NPC_INTERACTION",npcId:"N1"}];const c=autotestWorldCoherence(s);assert.equal(c.npcConversations.count,1);assert.equal(c.npcConversations.memoryMismatch,0)});
''',encoding='utf-8')

print('v0.57.14 gameplay patch prepared')
