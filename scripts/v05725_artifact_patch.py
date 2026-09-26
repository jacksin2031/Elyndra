from pathlib import Path

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

def replace_once(path,old,new):
    text=read(path)
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected one match, got {count}: {old[:120]!r}')
    write(path,text.replace(old,new,1))

# 1) World generation must enforce Traditional Chinese centrally, not only narrator/helper/NPC paths.
guard='''const SIMPLIFIED_CHINESE_RE=/[严为争仅仪会冻则剧动区压发变听响围垄垒声夹夺实对导尘尝层属峡币废异弃录战抢换断无机来桥检气济浓涟温灭点烧狭现离称竞筑纳线经给绝维绿缘缝缴网肤脉舱节蚀补视记语财货贸边过运进连钉铁铆铜锁锈镇门阀随雾须颗风驱鸣齿]/;
export const WORLD_TRADITIONAL_CHINESE_CONTRACT="所有中文文字欄位一律使用繁體中文（正體字）。JSON key、ID、enum、既有專有代碼保持原樣；人物名、地名、世界名、描述、歷史、社會、任務與建議中的中文不得使用簡體字。";

export function simplifiedChineseLeak(value){
 let found=null;
 const walk=(v,path="$")=>{
  if(found||v==null)return;
  if(typeof v==="string"){
   const match=v.match(SIMPLIFIED_CHINESE_RE);
   if(match)found={character:match[0],path,sample:v.slice(Math.max(0,match.index-20),Math.min(v.length,match.index+21))};
   return
  }
  if(Array.isArray(v)){for(let i=0;i<v.length;i++)walk(v[i],`${path}[${i}]`);return}
  if(typeof v==="object")for(const [k,x] of Object.entries(v))walk(x,`${path}.${k}`)
 };
 walk(value);return found
}
export function hasSimplifiedChineseLeak(value){return Boolean(simplifiedChineseLeak(value))}
'''
write(Path('src/traditional-chinese-guard.js'),guard)

replace_once(Path('src/ai-client.js'),
'import {normalizeRuntimeLocation,normalizeRuntimeNpc,normalizeRuntimeSideQuest,bindRuntimeClaims} from "./runtime-generation-normalizer.js?v=57024";\n',
'import {normalizeRuntimeLocation,normalizeRuntimeNpc,normalizeRuntimeSideQuest,bindRuntimeClaims} from "./runtime-generation-normalizer.js?v=57024";\nimport {WORLD_TRADITIONAL_CHINESE_CONTRACT,simplifiedChineseLeak} from "./traditional-chinese-guard.js?v=57024";\n')
replace_once(Path('src/ai-client.js'),
'''async function worldStage(stage,args){\n try{return await withWorldAiSlot(async()=>parseJSON(await directChat({...args,aiTask:args?.aiTask||worldStageTask(stage)}))) }\n catch(e){const suffix=e?.message||String(e);throw new Error(`WORLD_${stage}_FAILED: ${suffix}`)}\n}''',
'''async function worldStage(stage,args){\n try{return await withWorldAiSlot(async()=>{const system=[String(args?.system||""),WORLD_TRADITIONAL_CHINESE_CONTRACT].filter(Boolean).join("\\n"),value=parseJSON(await directChat({...args,system,aiTask:args?.aiTask||worldStageTask(stage)})),leak=simplifiedChineseLeak(value);if(leak)throw new Error(`NON_TRADITIONAL_CHINESE:${leak.character}:${leak.path}`);return value}) }\n catch(e){const suffix=e?.message||String(e);throw new Error(`WORLD_${stage}_FAILED: ${suffix}`)}\n}''')
replace_once(Path('src/ai-client.js'),
'''function compilerRecoverable(err){const reason=String(err?.message||err||"");return generationTransportFailure(reason)||/AI_TIMEOUT|EMPTY_AI_RESPONSE|INVALID_MODEL_JSON|AI_HTTP_(429|5\\d\\d)|WORLD_[A-Z_]+_FAILED:\\s*(AI_TIMEOUT|EMPTY_AI_RESPONSE|INVALID_MODEL_JSON|AI_HTTP_(429|5\\d\\d))/.test(reason)}''',
'''function compilerRecoverable(err){const reason=String(err?.message||err||"");return generationTransportFailure(reason)||/NON_TRADITIONAL_CHINESE/.test(reason)||/AI_TIMEOUT|EMPTY_AI_RESPONSE|INVALID_MODEL_JSON|AI_HTTP_(429|5\\d\\d)|WORLD_[A-Z_]+_FAILED:\\s*(AI_TIMEOUT|EMPTY_AI_RESPONSE|INVALID_MODEL_JSON|AI_HTTP_(429|5\\d\\d)|NON_TRADITIONAL_CHINESE)/.test(reason)}''')
old='''return {...args,timeoutMs,maxOutputTokens,disableOptimization:true,temperature:Math.min(.3,Number(args.temperature??.3)),system:String(args.system||"")+"\\n上一次輸出未能通過編譯。這次停用額外思考優化並保留足夠可見輸出空間；只回傳 schema 要求的必要 JSON，不要 Markdown、解釋或額外欄位。"}'''
new='''const languageRetry=/NON_TRADITIONAL_CHINESE/.test(String(reason))?"\\n上一次輸出含有簡體字；這次所有中文值必須重寫為繁體中文正體字，JSON key、ID 與 enum 不變。":"";return {...args,timeoutMs,maxOutputTokens,disableOptimization:true,temperature:Math.min(.3,Number(args.temperature??.3)),system:String(args.system||"")+"\\n上一次輸出未能通過編譯。這次停用額外思考優化並保留足夠可見輸出空間；只回傳 schema 要求的必要 JSON，不要 Markdown、解釋或額外欄位。"+languageRetry}'''
replace_once(Path('src/ai-client.js'),old,new)

# 2) Apply canonical player-facing NPC name visibility to AutoTest and read-only helper snapshots.
replace_once(Path('src/ai-autotest.js'),
'import {playerVisibleLocationName} from "./player-location-visibility.js?v=57024";\n',
'import {playerVisibleLocationName} from "./player-location-visibility.js?v=57024";\nimport {playerVisibleNpcName} from "./player-entity-visibility.js?v=57024";\n')
replace_once(Path('src/ai-autotest.js'),
'name:text(x.name,120),role:text(x.role,120),encountered:x.encountered===true',
'name:text(playerVisibleNpcName(state,x),120),role:text(x.role,120),encountered:x.encountered===true')
replace_once(Path('src/helper-context.js'),
'import {playerVisibleLocationName} from "./player-location-visibility.js?v=57024";\n',
'import {playerVisibleLocationName} from "./player-location-visibility.js?v=57024";\nimport {playerVisibleNpcName} from "./player-entity-visibility.js?v=57024";\n')
replace_once(Path('src/helper-context.js'),
'.map(n=>({name:n.name,role:n.role,description:safe(n.description,180),trust:Number.isFinite(n.trust)?n.trust:null,companionStatus:n.companion?.status||"NONE"}))',
'.map(n=>({name:playerVisibleNpcName(state,n),role:n.role,description:safe(n.description,180),trust:Number.isFinite(n.trust)?n.trust:null,companionStatus:n.companion?.status||"NONE"}))')

# 3) Make report status/counts represent real turn failures even when detailed issue rows are capped.
replace_once(Path('src/ai-autotest.js'),
'''function reportedWorldStatus(world={}){if(world.status==="FAILED")return "FAILED";if(world.phase==="PLAY"&&Math.max(0,Number(world.turns)||0)===0)return "PLAY_NOT_STARTED";const quality=String(world?.generation?.diagnostics?.quality||"").toUpperCase();if(["DEGRADED","SEVERELY_DEGRADED"].includes(quality))return "DEGRADED";if(list(world.actions).some(x=>x?.error)||runtimeRecoveryFailed(world)||String(world?.summary?.coherence?.status||"").toUpperCase()==="FAIL"||world?.summary?.coherence?.quality?.pending===true||world?.summary?.coherence?.quality?.unavailable===true)return "DEGRADED";return world.status||"COMPLETED"}''',
'''function reportedWorldStatus(world={}){if(world.status==="FAILED")return "FAILED";if(world.phase==="PLAY"&&Math.max(0,Number(world.turns)||0)===0)return "PLAY_NOT_STARTED";const actionRows=list(world.actions);if(actionRows.length&&actionRows.every(x=>Boolean(x?.error)))return "FAILED";const quality=String(world?.generation?.diagnostics?.quality||"").toUpperCase();if(["DEGRADED","SEVERELY_DEGRADED"].includes(quality))return "DEGRADED";if(actionRows.some(x=>x?.error)||runtimeRecoveryFailed(world)||String(world?.summary?.coherence?.status||"").toUpperCase()==="FAIL"||world?.summary?.coherence?.quality?.pending===true||world?.summary?.coherence?.quality?.unavailable===true)return "DEGRADED";return world.status||"COMPLETED"}''')
replace_once(Path('src/ai-autotest.js'),
'for(const row of turnFailures.slice(0,50))issues.push({severity:"ERROR",type:"TURN_FAILED"',
'const turnFailureDetailLimit=50;for(const row of turnFailures.slice(0,turnFailureDetailLimit))issues.push({severity:"ERROR",type:"TURN_FAILED"')
needle='''const degradedWorlds=diagnostics.filter(d=>!["HEALTHY","RECOVERED"].includes(String(d?.quality||""))).length,tokenTotals='''
replacement='''const sampledTurnFailureDetails=issues.filter(x=>x.type==="TURN_FAILED").length,totalIssueCount=issues.length+Math.max(0,turnFailures.length-sampledTurnFailureDetails),issueCountForIndexes=indexes=>{const sampled=issues.filter(issue=>indexes.has(issue.worldIndex)).length,sampledTurn=issues.filter(issue=>issue.type==="TURN_FAILED"&&indexes.has(issue.worldIndex)).length,actualTurn=turnFailures.filter(row=>indexes.has(row.worldIndex)).length;return sampled+Math.max(0,actualTurn-sampledTurn)};const degradedWorlds=diagnostics.filter(d=>!["HEALTHY","RECOVERED"].includes(String(d?.quality||""))).length,tokenTotals='''
replace_once(Path('src/ai-autotest.js'),needle,replacement)
replace_once(Path('src/ai-autotest.js'),
'''worldsCompleted:group.filter(executionCompleted).length,worldsFailed:group.filter(w=>w.reportedStatus==="FAILED").length,worldsHealthy:group.filter(w=>w.reportedStatus==="COMPLETED").length,worldsDegraded:group.filter(w=>w.reportedStatus==="DEGRADED").length,turns:group.reduce((n,w)=>n+(Number(w.turns)||0),0),issues:issues.filter(issue=>indexes.has(issue.worldIndex)).length''',
'''worldsCompleted:group.filter(w=>executionCompleted(w)&&!["FAILED","PLAY_NOT_STARTED"].includes(w.reportedStatus)).length,worldsFailed:group.filter(w=>w.reportedStatus==="FAILED").length,worldsHealthy:group.filter(w=>w.reportedStatus==="COMPLETED").length,worldsDegraded:group.filter(w=>w.reportedStatus==="DEGRADED").length,turns:group.reduce((n,w)=>n+(Number(w.turns)||0),0),turnActionErrors:turnFailures.filter(row=>indexes.has(row.worldIndex)).length,issues:issueCountForIndexes(indexes)''')
replace_once(Path('src/ai-autotest.js'),
'''worldsCompleted:effectiveWorlds.filter(executionCompleted).length,worldsHealthy:''',
'''worldsCompleted:effectiveWorlds.filter(w=>executionCompleted(w)&&!["FAILED","PLAY_NOT_STARTED"].includes(w.reportedStatus)).length,worldsHealthy:''')
replace_once(Path('src/ai-autotest.js'),
'''totalTurns:actions.length,issues:issues.length,aiRequests:''',
'''totalTurns:actions.length,turnActionErrors:turnFailures.length,turnFailureDetailCount:sampledTurnFailureDetails,issueDetailCount:issues.length,issueDetailsTruncated:turnFailures.length>sampledTurnFailureDetails,issues:totalIssueCount,aiRequests:''')

# Preserve existing test semantics while adding an explicit hidden-name test in v0.57.25.
replace_once(Path('test/ai-autotest-v054.test.js'),
'npcs:[{id:"N1",name:"Known",known:true},{id:"N2",name:"Hidden",known:false}]',
'npcs:[{id:"N1",name:"Known",known:true,nameKnown:true},{id:"N2",name:"Hidden",known:false}]')

new_test='''import test from "node:test";\nimport assert from "node:assert/strict";\nimport {readFile} from "node:fs/promises";\nimport {hasSimplifiedChineseLeak,simplifiedChineseLeak} from "../src/traditional-chinese-guard.js";\nimport {playerVisibleAutotestSnapshot,buildAutotestReport} from "../src/ai-autotest.js";\nimport {helperSnapshot} from "../src/helper-context.js";\n\nfunction visibilityState(){\n return {world:{id:"W",name:"隱藏世界",state:{day:1,clock:{hour:8,minute:0,totalMinutes:0}},registry:{locations:[{id:"L1",name:"起點",known:true}],npcs:[{id:"N1",name:"咯噠三號",known:true,encountered:true,nameKnown:false,alive:true,locationId:"L1",role:"守衛"}],factions:[],sideQuests:[]},canon:{facts:[]}},player:{name:"Tester",worldNameKnown:false,calendarKnown:false,location:"起點",hp:10,maxHp:10,status:"ACTIVE",level:1,wallet:{},survival:{satiety:100,fatigue:0,conditions:[]}},quests:{main:{title:"",stage:0,status:"ACTIVE",objectives:[]}},inventory:[],knowledge:[],events:[],suggestions:[],suggestionIntents:[]}\n}\n\ntest("v0.57.25 rejects artifact-proven Simplified Chinese in generated world values",async()=>{\n assert.equal(hasSimplifiedChineseLeak("铁雾"),true);assert.equal(hasSimplifiedChineseLeak("铆钉镇北岸货运吊桥下的废弃维修舱"),true);\n assert.equal(hasSimplifiedChineseLeak("鐵霧"),false);assert.equal(hasSimplifiedChineseLeak("鉚釘鎮北岸貨運吊橋下的廢棄維修艙"),false);assert.equal(hasSimplifiedChineseLeak("皇后"),false);\n assert.equal(simplifiedChineseLeak({name:"铁雾"}).character,"铁");\n const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");assert.match(client,/WORLD_TRADITIONAL_CHINESE_CONTRACT/);assert.match(client,/NON_TRADITIONAL_CHINESE/)\n});\n\ntest("v0.57.25 AutoTest and helper snapshots never expose an unrevealed canonical NPC name",()=>{\n const s=visibilityState();assert.equal(playerVisibleAutotestSnapshot(s).knownNpcs[0].name,"眼前的陌生人");assert.equal(helperSnapshot(s).knowledge.nearbyNpcs[0].name,"眼前的陌生人");\n s.events.push({type:"NPC_NAME_REVEALED",npcId:"N1"});assert.equal(playerVisibleAutotestSnapshot(s).knownNpcs[0].name,"咯噠三號");assert.equal(helperSnapshot(s).knowledge.nearbyNpcs[0].name,"咯噠三號")\n});\n\ntest("v0.57.25 report counts all 120 turn errors even when only 50 details are retained",()=>{\n const difficulties=["easy","normal","hard","realistic"],worlds=difficulties.map((difficulty,i)=>({index:i+1,difficulty,status:"COMPLETED",phase:"PLAY",turns:30,stopReason:"TURN_LIMIT",actions:Array.from({length:30},(_,j)=>({worldIndex:i+1,turn:j+1,error:"firstButtonExpansionReason is not defined",beforeFingerprint:`${i}-${j}-a`,afterFingerprint:`${i}-${j}-b`,decision:{action:`a-${j}`}})),generation:{diagnostics:{quality:"HEALTHY",stages:{}}},summary:{coherence:{status:"PASS",issues:[],quality:{pending:false,unavailable:false}}}}));\n const report=buildAutotestReport({config:{totalWorldCount:4,worldsPerDifficulty:1,maxTurns:30},worlds,telemetry:[],startedAt:1,endedAt:2});\n assert.equal(report.summary.worldsExecuted,4);assert.equal(report.summary.worldsCompleted,0);assert.equal(report.summary.worldsFailed,4);assert.equal(report.summary.totalTurns,120);assert.equal(report.summary.turnActionErrors,120);assert.equal(report.summary.turnFailureDetailCount,50);assert.equal(report.summary.issueDetailCount,50);assert.equal(report.summary.issueDetailsTruncated,true);assert.equal(report.summary.issues,120);assert.equal(report.issues.filter(x=>x.type==="TURN_FAILED").length,50);\n for(const difficulty of difficulties){assert.equal(report.summary.byDifficulty[difficulty].worldsFailed,1);assert.equal(report.summary.byDifficulty[difficulty].turnActionErrors,30);assert.equal(report.summary.byDifficulty[difficulty].issues,30)}\n});\n'''
write(Path('test/v05725-artifact-baseline-regressions.test.js'),new_test)

# Canonical release/cache bump. Keep creator.css legacy 57001 untouched because it has its own stable cache token.
paths=[Path('app.js'),Path('index.html'),Path('package.json')]+list(Path('src').glob('*.js'))+list(Path('test').glob('*.js'))
for path in paths:
    text=read(path)
    text=text.replace('57024','57025').replace('0.57.24','0.57.25').replace('0\\.57\\.24','0\\.57\\.25')
    write(path,text)

# Product-level sanity checks before tests.
assert 'firstButtonExpansionReason' not in read(Path('app.js'))
assert '"version": "0.57.25"' in read(Path('package.json'))
assert 'APP_VERSION="0.57.25"' in read(Path('src/version.js'))
assert 'app.js?v=57025' in read(Path('index.html'))
assert 'creator.css?v=57001' in read(Path('index.html'))
print('v0.57.25 artifact baseline hardening patch applied')
