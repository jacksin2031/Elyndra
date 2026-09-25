from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, content):
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path, old, new, label):
    source = read(path)
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, got {count}")
    write(path, source.replace(old, new))


def regex_once(path, pattern, replacement, label):
    source = read(path)
    output, count = re.subn(pattern, lambda _m: replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 regex match, got {count}")
    write(path, output)


def is_download_related_test(path, source):
    return re.search(r"(?:\bdownload\b|autotest-(?:download|iab|save|export|copy|transfer|drag))", f"{path}\n{source}", re.I) is not None


# Release and cache-generation closure. Browser modules must share one cache token.
pkg_path = ROOT / "package.json"
pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
pkg["version"] = "0.57.13"
pkg.setdefault("scripts", {})["test:nondownload"] = "npm run version:check && npm run cache:check && node scripts/check-js.mjs && node scripts/run-nondownload-tests.mjs"
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
write("src/version.js", 'export const APP_VERSION="0.57.13";\n')
for module in [ROOT / "app.js", *(ROOT / "src").rglob("*.js")]:
    source = module.read_text(encoding="utf-8")
    module.write_text(source.replace("57012", "57013"), encoding="utf-8")
replace_once("index.html", "app.js?v=57012", "app.js?v=57013", "INDEX_CACHE_TOKEN")

# Only update current cache-token expectations in tests that this non-download run may execute.
for test_path in (ROOT / "test").rglob("*.test.js"):
    source = test_path.read_text(encoding="utf-8")
    if not is_download_related_test(test_path.name, source) and "57012" in source:
        test_path.write_text(source.replace("57012", "57013"), encoding="utf-8")
version_test = ROOT / "test/version-0551-release.test.js"
source = version_test.read_text(encoding="utf-8")
version_test.write_text(source.replace("0.57.12", "0.57.13").replace(r"0\.57\.12", r"0\.57\.13"), encoding="utf-8")

# FIRST_BUTTON remains deterministic in healthy play, but a proven stall must switch strategy.
first_button = '''export function firstButtonAutotestDecision(state={},recentActions=[]){
 const snapshot=playerVisibleAutotestSnapshot(state),worldId=text(state?.world?.id||"WORLD",160),stall=consecutiveAutotestStall(recentActions);
 if(snapshot.combat?.active===true){const decision={mode:"combat",combatAction:"attack",action:"attack",suggestionIndex:null,kind:"COMBAT",progression:false,targetId:null,reason:"FIRST_BUTTON",goalReached:false,goalEvidence:"",firstButton:true};recordDebug("AUTOTEST_FIRST_BUTTON_DECISION",{worldId,mode:decision.mode,combatAction:"attack"});return decision}
 if(stall>=3){const recovered=deterministicAutotestDecision(snapshot,recentActions,"FIRST_BUTTON_STALL_RECOVERY"),decision={...recovered,firstButton:true,firstButtonOverride:true,reason:"FIRST_BUTTON_STALL_RECOVERY"};recordDebug("AUTOTEST_FIRST_BUTTON_STALL_RECOVERY",{worldId,stall,action:decision.action,kind:decision.kind||"",targetId:decision.targetId||null,suggestionIndex:decision.suggestionIndex});recordDebug("AUTOTEST_FIRST_BUTTON_DECISION",{worldId,mode:decision.mode,suggestionIndex:decision.suggestionIndex,action:decision.action,kind:decision.kind||"",recovered:true});return decision}
 const chosen=list(snapshot.suggestions)[0];
 if(chosen){const decision={mode:"suggestion",suggestionIndex:0,action:text(chosen.action||chosen.label,180),kind:text(chosen.kind||"",30),progression:chosen.progression===true,targetId:chosen.targetId||null,combatAction:null,reason:"FIRST_BUTTON",goalReached:false,goalEvidence:"",firstButton:true};recordDebug("AUTOTEST_FIRST_BUTTON_DECISION",{worldId,mode:decision.mode,suggestionIndex:0,action:decision.action,kind:decision.kind});return decision}
 const decision={mode:"free",suggestionIndex:null,action:"觀察四周並確認目前最明顯的變化",kind:"OBSERVE",progression:false,targetId:null,combatAction:null,reason:"FIRST_BUTTON_UNAVAILABLE_FALLBACK",goalReached:false,goalEvidence:"",firstButton:true,firstButtonUnavailable:true};recordDebug("AUTOTEST_FIRST_BUTTON_UNAVAILABLE",{worldId,location:snapshot?.world?.location||"",fallbackAction:decision.action,stall});return decision
}
function installAutotestStrategyUi'''
regex_once(
    "src/ai-autotest.js",
    r"export function firstButtonAutotestDecision\(state=\{\},recentActions=\[\]\)\{.*?\n\}\nfunction installAutotestStrategyUi",
    first_button,
    "FIRST_BUTTON_RECOVERY",
)
replace_once(
    "src/ai-autotest.js",
    'knownNpcs:list(state.world?.registry?.npcs).filter(x=>x?.known===true).length,knownLocations:',
    'knownNpcs:list(state.world?.registry?.npcs).filter(x=>x?.known===true).length,npcRelations:list(state.world?.registry?.npcs).filter(x=>x?.known===true).slice(0,12).map(x=>[text(x?.id||x?.name,100),Number(x?.trust)||0,Number(x?.cognition?.relationships?.player?.respect)||0,Number(x?.cognition?.relationships?.player?.fear)||0,Number(x?.cognition?.relationships?.player?.obligation)||0]),knownLocations:',
    "AUTOTEST_NPC_FINGERPRINT",
)

# SOCIAL outcomes should become real Engine state, not narrative-only interaction memories.
replace_once(
    "src/game-engine.js",
    'import {markEntityObserved} from "./visibility-lock.js?v=57013";',
    'import {markEntityObserved} from "./visibility-lock.js?v=57013";\nimport {adjustNpcRelationship} from "./npc-cognition.js?v=57013";',
    "GAME_NPC_IMPORT",
)
relationship_helper = ''' return {npcId:npc.id,firstEncounter}
}
function applyLocalNpcRelationshipOutcome(state,interaction,roll,kind,label){
 if(!interaction?.npcId||String(kind||"").toUpperCase()!=="SOCIAL"||!roll)return null;
 const npc=(state.world?.registry?.npcs||[]).find(x=>x?.id===interaction.npcId);if(!npc)return null;
 const grade=String(roll.grade||"").toUpperCase();let changes=null;
 if(grade==="CRITICAL_SUCCESS")changes={trust:6,respect:4,fear:-1};
 else if(grade==="SUCCESS")changes={trust:2,respect:1};
 else if(grade==="CRITICAL_FAILURE")changes={trust:-2,respect:-1,fear:2};
 if(!changes)return null;
 const relationship=adjustNpcRelationship(state,npc,{changes,reason:`玩家社交行動「${clean(label,100)}」由 Engine 判定為 ${grade}。`});
 return {npcId:npc.id,grade,changes,relationship}
}
export function resolveEngineFeasibility'''
replace_once(
    "src/game-engine.js",
    " return {npcId:npc.id,firstEncounter}\n}\nexport function resolveEngineFeasibility",
    relationship_helper,
    "GAME_NPC_RELATION_HELPER",
)
replace_once(
    "src/game-engine.js",
    " const training=trainActionSkill(state,check.kind,roll);if(training.rankUp)roll.skillUp=training;\n advanceTime(state,profile.minutes);",
    " const training=trainActionSkill(state,check.kind,roll);if(training.rankUp)roll.skillUp=training;\n const npcRelationship=applyLocalNpcRelationshipOutcome(state,npcInteraction,roll,profile.kind,label);\n advanceTime(state,profile.minutes);",
    "GAME_NPC_RELATION_APPLY",
)
replace_once(
    "src/game-engine.js",
    "ruleEffects:{survival,culture,economy,magic,talent,dungeon,questProgress,npcInteraction,engineFeasibility}",
    "ruleEffects:{survival,culture,economy,magic,talent,dungeon,questProgress,npcInteraction,npcRelationship,engineFeasibility}",
    "GAME_NPC_RELATION_RETURN",
)

# Main quest progression is sequential: one stage per world-time point.
quest_tick = '''export function tickMainQuest(state){
 const q=ensureMainQuest(state),r=ensureWorldRegistry(state),loc=r.locations.find(x=>x.name===state.player?.location),contact=r.npcs.some(n=>n.encountered===true),verified=verifiedKnowledgeCount(state),crisis=state.world?.state?.crisis?.stage||"DORMANT";let candidate=0;
 if(loc?.known===true)candidate=1;if(contact)candidate=2;if(contact&&(Math.max(0,Number(state.discoveries)||0)>=3||verified>=1))candidate=3;if(["CRISIS","ENDGAME"].includes(crisis)&&verified>=3)candidate=4;if(crisis==="ENDGAME")candidate=5;
 const minute=Math.max(0,Number(state.world?.state?.clock?.totalMinutes)||0),sameMinute=Number.isFinite(Number(q.lastStageMinute))&&Number(q.lastStageMinute)===minute;
 if(candidate>q.stage&&!sameMinute){const fromStage=q.stage,stage=Math.min(candidate,q.stage+1);q.stage=stage;q.stageKey=MAIN[stage].key;q.title=MAIN[stage].title;q.objectives=[MAIN[stage].objective];q.status=stage===5?"CLIMAX":"ACTIVE";q.lastStageMinute=minute;state.events.push({id:id(),type:"MAIN_QUEST_STAGE_CHANGED",visibility:"PLAYER_KNOWN",fromStage,toStage:stage,stage:q.stage,stageKey:q.stageKey,summary:q.title+"："+q.objectives[0],day:state.world.state.day,at:Date.now()})}return q
}
export function ensureQuestProgress'''
regex_once(
    "src/quest-engine.js",
    r"export function tickMainQuest\(state\)\{.*?\}\nexport function ensureQuestProgress",
    quest_tick,
    "QUEST_STEPWISE",
)

# Reject observed Simplified-Chinese leakage so the existing Traditional-Chinese fallback takes over.
replace_once(
    "src/runtime-guard.js",
    "const LATIN=/[A-Za-z]/g;",
    "const LATIN=/[A-Za-z]/g;\nconst SIMPLIFIED_MARKER=/[这转询问当视现节轻触锋锐属边缘测试温质闭仪监为从发]/g;",
    "HANT_MARKER",
)
replace_once(
    "src/runtime-guard.js",
    ' const foreign=(s.match(FOREIGN)||[]).length;if(foreign>Math.max(1,Math.floor(s.length*.03)))return false;\n const han=(s.match(HAN)||[]).length,latin=(s.match(LATIN)||[]).length;',
    ' const foreign=(s.match(FOREIGN)||[]).length;if(foreign>Math.max(1,Math.floor(s.length*.03)))return false;\n if((s.match(SIMPLIFIED_MARKER)||[]).length)return false;\n const han=(s.match(HAN)||[]).length,latin=(s.match(LATIN)||[]).length;',
    "HANT_GUARD",
)

# Rewrite the old regression that intentionally required FIRST_BUTTON to stay stuck.
first_button_test = '''\n\ntest("first-button keeps index zero normally but switches strategy after repeated stalled turns",()=>{const s=state();s.world.registry.locations.push({id:"LOC-2",name:"側路",known:true});s.suggestionIntents=[{label:"再問一次",action:"再次詢問同一名 NPC",kind:"SOCIAL",progression:true,risk:"LOW",targetId:"NPC-1"},{label:"改走側路",action:"離開對話並走向側路",kind:"TRAVEL",progression:true,risk:"LOW",targetId:"LOC-2"}];const recent=[1,2,3,4,5].map(i=>({action:"詢問 NPC "+i,kind:"SOCIAL",targetId:"NPC-1",progressed:false}));const decision=firstButtonAutotestDecision(s,recent);assert.equal(decision.firstButton,true);assert.equal(decision.firstButtonOverride,true);assert.equal(decision.reason,"FIRST_BUTTON_STALL_RECOVERY");assert.notEqual(decision.suggestionIndex,0);assert.equal(decision.kind,"TRAVEL");assert.equal(decision.targetId,"LOC-2")})\n'''
regex_once(
    "test/ai-autotest-first-button-hotfix.test.js",
    r'\n\ntest\("first-button remains pinned to index zero even after repeated stalled turns".*?\n$',
    first_button_test,
    "FIRST_BUTTON_TEST_REWRITE",
)

# Permanent auditable runner: never execute download/IAB/export/save/transfer/drag tests.
non_download_runner = r'''import {readdirSync,readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";
const dir=path.resolve("test");
const related=/(?:\bdownload\b|autotest-(?:download|iab|save|export|copy|transfer|drag))/i;
const candidates=readdirSync(dir).filter(x=>x.endsWith(".test.js")).sort();
const run=[],skipped=[];
for(const name of candidates){const file=path.join("test",name),source=readFileSync(file,"utf8");if(related.test(name+"\n"+source))skipped.push(file);else run.push(file)}
console.log(`Non-download suite: ${run.length} test files; explicitly skipped ${skipped.length} download/IAB/export/save/transfer-related files.`);
console.log("Skipped by policy:\n"+skipped.map(x=>" - "+x).join("\n"));
if(!run.length)process.exit(2);
const result=spawnSync(process.execPath,["--test",...run],{stdio:"inherit"});
process.exit(result.status??1);
'''
write("scripts/run-nondownload-tests.mjs", non_download_runner)

regressions = r'''import test from "node:test";
import assert from "node:assert/strict";
import {firstButtonAutotestDecision,autotestStateFingerprint} from "../src/ai-autotest.js";
import {performAction} from "../src/game-engine.js";
import {npcRelationshipSnapshot} from "../src/npc-cognition.js";
import {tickMainQuest} from "../src/quest-engine.js";
import {sanitizeSuggestion} from "../src/runtime-guard.js";

function baseState(){return {world:{id:"W",name:"測試界",seedContract:{genre:"奇幻",theme:"測試",scale:"小型",danger:3,magic:3,politics:3,targetPlayHours:15},state:{day:1,location:"起點",region:"城區",clock:{day:1,hour:8,minute:0,totalMinutes:0},simulation:{tension:10,lastEventMinute:0,lastTickMinute:0,npcCursor:0,factionCursor:0,flags:{}},crisis:{stage:"DORMANT"},flags:{}},registry:{locations:[{id:"LOC-1",name:"起點",type:"房間",region:"城區",description:"測試地點",known:true,worldState:{safety:60,prosperity:50,supply:50,infrastructure:60,stability:60,statusTags:[]}}],npcs:[],factions:[],sideQuests:[]},canon:{facts:[]},history:[],travel:{version:1,routes:[]},bible:{weatherSystem:{phenomena:[]}},weather:{version:1,currentId:"",startedMinute:0,nextChangeMinute:999999,locationKey:"",sequence:0,history:[],legacyNeutral:true}},player:{id:"PLAYER",name:"測試者",worldNameKnown:false,calendarKnown:false,hp:100,maxHp:100,status:"ALIVE",gold:0,wallet:{},knowledgeScore:0,location:"起點",stats:{strength:2,agility:2,mind:2,presence:2,instinct:2},skills:{OBSERVE:1,SOCIAL:1,TRAVEL:0,RISKY:0,GENERAL:1},skillProgress:{OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:0},magic:{capacity:100,strain:0,knownSpells:[],attunements:[]}},inventory:[],crafting:{version:1,recipes:[]},knowledge:[],events:[],effects:{version:1,sequence:0,active:[],history:[],stats:{}},quests:{main:{id:"Q-main",stage:0,status:"ACTIVE",objectives:[]}},suggestions:[],suggestionIntents:[],discoveries:0,narrative:""}}
function addNpc(s){const n={id:"NPC-1",name:"艾琳",role:"學者",locationId:"LOC-1",known:true,encountered:false,alive:true,trust:0,knowledgeScope:[],memories:[],behaviorProfile:{promises:[],grudges:[]},companion:{status:"NONE"}};s.world.registry.npcs.push(n);return n}

test("v0.57.13 FIRST_BUTTON recovery changes action class after three stalled turns",()=>{const s=baseState();s.world.registry.locations.push({id:"LOC-2",name:"側路",known:true});s.suggestionIntents=[{label:"再問一次",action:"再次詢問艾琳",kind:"SOCIAL",progression:true,targetId:"NPC-1"},{label:"改走側路",action:"離開對話並走向側路",kind:"TRAVEL",progression:true,targetId:"LOC-2"}];const recent=[1,2,3,4,5].map(i=>({action:"詢問艾琳 "+i,kind:"SOCIAL",targetId:"NPC-1",progressed:false}));const d=firstButtonAutotestDecision(s,recent);assert.equal(d.firstButtonOverride,true);assert.equal(d.reason,"FIRST_BUTTON_STALL_RECOVERY");assert.equal(d.kind,"TRAVEL");assert.notEqual(d.suggestionIndex,0)});

test("v0.57.13 NPC relationship change is visible to AutoTest progress fingerprint",()=>{const s=baseState(),n=addNpc(s),before=autotestStateFingerprint(s);n.trust=4;n.cognition={relationships:{player:{trust:4,respect:2,fear:0,obligation:0}}};const after=autotestStateFingerprint(s);assert.notEqual(after,before)});

test("v0.57.13 critical social success updates NPC trust through Engine outcome",()=>{const s=baseState(),n=addNpc(s),old=Math.random;Math.random=()=>0.999999;try{const r=performAction(s,"free","詢問艾琳目前知道的具體線索",{verdict:"ALLOW",kind:"SOCIAL",confidence:100,actionIntent:{intent:"TALK",targetId:n.id}});assert.equal(r.roll.grade,"CRITICAL_SUCCESS");assert.ok(n.trust>=6);assert.ok(npcRelationshipSnapshot(s,n).player.respect>=4);assert.equal(r.ruleEffects.npcRelationship.grade,"CRITICAL_SUCCESS")}finally{Math.random=old}});

test("v0.57.13 main quest advances at most one stage per world-time point",()=>{const s=baseState();addNpc(s).encountered=true;s.discoveries=5;let q=tickMainQuest(s);assert.equal(q.stage,1);q=tickMainQuest(s);assert.equal(q.stage,1);s.world.state.clock.totalMinutes=20;q=tickMainQuest(s);assert.equal(q.stage,2);s.world.state.clock.totalMinutes=40;q=tickMainQuest(s);assert.equal(q.stage,3)});

test("v0.57.13 Simplified-Chinese suggestion leakage is rejected for Hant fallback",()=>{assert.equal(sanitizeSuggestion("用手指轻触金属边缘，测试温度或材质。"),"");assert.equal(sanitizeSuggestion("用手指輕觸金屬邊緣，測試溫度或材質。"),"用手指輕觸金屬邊緣，測試溫度或材質。")});
'''
write("test/v05713-gameplay-regressions.test.js", regressions)

# Pages CI must also respect the user's no-download-testing rule after deployment.
replace_once(
    ".github/workflows/pages.yml",
    "      - run: npm test\n",
    "      - run: npm run test:nondownload\n",
    "PAGES_NONDOWNLOAD",
)

print("v0.57.13 gameplay patch staged successfully")
