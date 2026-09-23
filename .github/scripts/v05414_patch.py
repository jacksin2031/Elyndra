from pathlib import Path


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, content):
    Path(path).write_text(content, encoding="utf-8")


def replace_once(path, old, new):
    s = read(path)
    if old not in s:
        raise SystemExit(f"missing anchor in {path}: {old[:120]!r}")
    write(path, s.replace(old, new, 1))


# 1. Normalize Runtime SideQuest schema drift before strict Engine validation.
p = "src/runtime-generation-normalizer.js"
s = read(p)
anchor = '''export function normalizeRuntimeLocation(row={},allowedWeatherIds=[]){
 const access=normalizeRuntimeAccess(row.accessRequirements),lore=normalizeRuntimeLore(row.lore);
 return {...row,lore,weatherProfile:normalizeRuntimeWeatherProfile(row.weatherProfile,allowedWeatherIds),accessRequirements:access.requirements,accessNotes:access.notes}
}
'''
insert = anchor + '''\nexport function normalizeRuntimeSideQuest(row={}){\n const evidenceKeywords=uniq(row?.evidenceKeywords,8),rawConditions=row?.conditions;\n const conditionRows=rawConditions==null?[]:(Array.isArray(rawConditions)?rawConditions:[rawConditions]);\n const conditions=conditionRows.map(x=>{if(typeof x==="string")return clean(x,220);if(x&&typeof x==="object"&&!Array.isArray(x))return structuredClone(x);return null}).filter(Boolean).slice(0,5);\n const requested=Number(row?.target),derived=conditions.length?Math.min(3,conditions.length):evidenceKeywords.length?Math.min(3,evidenceKeywords.length):3,target=Math.max(1,Math.min(5,Number.isInteger(requested)?requested:derived));\n return {...row,evidenceKeywords,conditions,target}\n}\n'''
if anchor not in s:
    raise SystemExit("runtime normalizer insertion anchor missing")
write(p, s.replace(anchor, insert, 1))

# 2. Apply SideQuest normalizer in the staged Runtime Quest compiler and make target contract explicit.
p = "src/ai-client.js"
s = read(p)
s = s.replace('import {normalizeRuntimeLocation,bindRuntimeClaims} from "./runtime-generation-normalizer.js?v=54013";',
              'import {normalizeRuntimeLocation,normalizeRuntimeSideQuest,bindRuntimeClaims} from "./runtime-generation-normalizer.js?v=54014";', 1)
s = s.replace('timeoutMs:65000,retryOnTimeout:false,maxOutputTokens:1200,',
              'timeoutMs:75000,retryOnTimeout:false,maxOutputTokens:1200,', 1)
old_prompt = '任務必須引用前面已存在的地點、人物、勢力或 historyRefs，目標要可執行並留下 evidenceKeywords；如仍有 remainingClaims，只有語義真的吻合時才綁定。"+baseRules+" 輸出 schema：{sideQuests:[{title,objective,locationName,npcName,factionName,historyRefs,claimRefs,known:false,evidenceKeywords,conditions,target}]}。'
new_prompt = '任務必須引用前面已存在的地點、人物、勢力或 historyRefs，目標要可執行並留下 evidenceKeywords；conditions 必須永遠是陣列；target 是完成任務所需的進度／證據門檻，只能是 1-5 的整數，絕對不是 NPC 名稱、勢力名稱、任務描述、物件或陣列。如仍有 remainingClaims，只有語義真的吻合時才綁定。"+baseRules+" 輸出 schema：{sideQuests:[{title,objective,locationName,npcName,factionName,historyRefs,claimRefs,known:false,evidenceKeywords:["線索"],conditions:["條件"],target:1}]}。'
if old_prompt not in s:
    raise SystemExit("runtime quest prompt anchor missing")
s = s.replace(old_prompt, new_prompt, 1)
old_apply = 'apply:value=>{const sideQuests=bindRuntimeClaims(plan,"sideQuests",runtimeRows(value,"sideQuests",slots.sideQuests));if(sideQuests.length<Number(slots.sideQuests))throw new Error("RUNTIME_QUESTS_COUNT");return {...generation,sideQuests}}'
new_apply = 'apply:value=>{const sideQuests=bindRuntimeClaims(plan,"sideQuests",runtimeRows(value,"sideQuests",slots.sideQuests).map(normalizeRuntimeSideQuest));if(sideQuests.length<Number(slots.sideQuests))throw new Error("RUNTIME_QUESTS_COUNT");return {...generation,sideQuests}}'
if old_apply not in s:
    raise SystemExit("runtime quest apply anchor missing")
s = s.replace(old_apply, new_apply, 1)
write(p, s)

# 3. Give Agnes History a little more headroom; this exact run hit the 65s hard edge.
replace_once("api/world.js", "timeoutMs:65000,maxOutputTokens:1500", "timeoutMs:75000,maxOutputTokens:1500")

# 4. Autotest fingerprint must count player-visible knowledge changes, not only knowledgeScore.
p = "src/ai-autotest.js"
s = read(p)
old = '''  xp:Number(state.player?.xp)||0,knowledge:Number(state.player?.knowledgeScore)||0,discoveries:Number(state.discoveries)||0,
  questStage:Number(main.stage)||0,questStatus:main.status||"",objective:list(main.objectives)[0]||"",
  inventory:list(state.inventory).reduce((n,x)=>n+Math.max(0,Number(x?.quantity)||1),0),
  knownNpcs:list(state.world?.registry?.npcs).filter(x=>x?.known===true).length,
  knownLocations:list(state.world?.registry?.locations).filter(x=>x?.known===true).length,
  combat:state.combat?.active===true,enemyHp:Number(state.combat?.enemy?.hp)||0
'''
new = '''  xp:Number(state.player?.xp)||0,knowledge:Number(state.player?.knowledgeScore)||0,discoveries:Number(state.discoveries)||0,
  knowledgeState:list(state.knowledge).slice(-12).map(x=>[text(x?.id,100),text(x?.status,40),Number(x?.score)||0]),
  questStage:Number(main.stage)||0,questStatus:main.status||"",objective:list(main.objectives)[0]||"",
  inventory:list(state.inventory).reduce((n,x)=>n+Math.max(0,Number(x?.quantity)||1),0),
  knownNpcs:list(state.world?.registry?.npcs).filter(x=>x?.known===true).length,
  knownLocations:list(state.world?.registry?.locations).filter(x=>x?.known===true).length,
  knownSideQuests:list(state.world?.registry?.sideQuests).filter(x=>x?.known===true&&x?.status!=="COMPLETED").length,
  combat:state.combat?.active===true,enemyHp:Number(state.combat?.enemy?.hp)||0
'''
if old not in s:
    raise SystemExit("autotest fingerprint anchor missing")
write(p, s.replace(old, new, 1))

# 5. Release version/cache generation.
replace_once("src/version.js", 'APP_VERSION="0.54.13"', 'APP_VERSION="0.54.14"')
replace_once("package.json", '"version": "0.54.13"', '"version": "0.54.14"')
replace_once("api/health.js", 'version:"0.54.13"', 'version:"0.54.14"')
replace_once("index.html", 'app.js?v=54013', 'app.js?v=54014')
p = "app.js"; s = read(p)
if '?v=54013' not in s:
    raise SystemExit("app release token missing")
write(p, s.replace('?v=54013', '?v=54014'))

# 6. Existing version/cache/timeout contracts follow the release.
p = "test/version-ui.test.js"; s = read(p)
s = s.replace("0.54.13", "0.54.14").replace("54013", "54014")
write(p, s)

p = "test/module-cache.test.js"; s = read(p)
s = s.replace('test("v0.54.13 keeps structured AI and Developer Autotest cache graphs coherent"', 'test("v0.54.14 keeps structured AI and Developer Autotest cache graphs coherent"', 1)
s = s.replace('assert.match(html,/app\\.js\\?v=54013/);', 'assert.match(html,/app\\.js\\?v=54014/);', 1)
s = s.replace('x==="54013","all app browser imports must use the v0.54.13 release token"', 'x==="54014","all app browser imports must use the v0.54.14 release token"', 1)
write(p, s)

for p in ["test/ai-timeout.test.js", "test/staged-world-compiler.test.js"]:
    s = read(p)
    s = s.replace('[35000,50000,55000,65000,70000]', '[35000,50000,55000,70000,75000]')
    write(p, s)

# 7. Regression coverage for the exact v0.54.13 field failures.
test_source = r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeRuntimeSideQuest} from "../src/runtime-generation-normalizer.js";
import {validateGeneration} from "../src/world-registry.js";
import {autotestStateFingerprint} from "../src/ai-autotest.js";

test("v0.54.14 normalizes Runtime SideQuest target drift before strict validation",()=>{
 const cases=[
  {target:"蒼-K-77",conditions:["A","B"],evidenceKeywords:["地脈"]},
  {target:{type:"CONVERSATION",entityName:"蒼-K-77"},conditions:"完成靜脈冥想",evidenceKeywords:"晶化果實"},
  {target:["錯誤結構"],conditions:["A","B","C","D"],evidenceKeywords:["x","y"]}
 ];
 const rows=cases.map((x,i)=>normalizeRuntimeSideQuest({title:"任務"+(i+1),objective:"完成可驗證目標",known:false,...x}));
 assert.deepEqual(rows.map(x=>x.target),[2,1,3]);
 assert.ok(rows.every(x=>Array.isArray(x.conditions)&&Array.isArray(x.evidenceKeywords)));
 assert.equal(validateGeneration({sideQuests:rows}).valid,true);
});

test("v0.54.14 preserves a legitimate numeric Runtime SideQuest target",()=>{
 assert.equal(normalizeRuntimeSideQuest({target:5,conditions:[],evidenceKeywords:[]}).target,5);
 assert.equal(normalizeRuntimeSideQuest({target:"4",conditions:[],evidenceKeywords:[]}).target,4);
 assert.equal(normalizeRuntimeSideQuest({target:9,conditions:[],evidenceKeywords:[]}).target,5);
});

function state(){return {world:{id:"W",state:{clock:{day:1,hour:8,minute:0,totalMinutes:0}},registry:{locations:[],npcs:[],sideQuests:[]}},player:{location:"起點",hp:100,status:"ALIVE",level:1,xp:0,knowledgeScore:0},quests:{main:{stage:0,status:"ACTIVE",objectives:["調查"]}},inventory:[],knowledge:[],discoveries:0,combat:{active:false}}}

test("v0.54.14 Autotest fingerprint treats visible knowledge as state progress",()=>{
 const a=state(),before=autotestStateFingerprint(a);
 a.knowledge.push({id:"K-1",title:"新觀察",status:"UNCONFIRMED",score:0});
 assert.notEqual(autotestStateFingerprint(a),before);
 const b=state(),clockOnly=autotestStateFingerprint(b);b.world.state.clock.totalMinutes=45;b.world.state.clock.hour=8;b.world.state.clock.minute=45;
 assert.equal(autotestStateFingerprint(b),clockOnly);
});

test("v0.54.14 Runtime Quest prompt makes target numeric and normalizes before validation",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/target 是完成任務所需的進度／證據門檻，只能是 1-5 的整數/);
 assert.match(client,/runtimeRows\(value,"sideQuests",slots\.sideQuests\)\.map\(normalizeRuntimeSideQuest\)/);
 assert.match(client,/runtime-generation-normalizer\.js\?v=54014/);
 assert.match(client,/resilientWorldStage\("HISTORY",\{\s*timeoutMs:75000/);
});
'''
write("test/v05414-regressions.test.js", test_source)

# 8. Short release note.
p = "README.md"; s = read(p)
marker = "### v0.54.9 — Sequential World Foundation"
note = '''### v0.54.14 — Runtime Quest Recovery\n\nv0.54.13 真實 Autotest 發現 Runtime SideQuest 的 `target` schema 與 Engine 進度門檻契約不一致：模型會輸出 NPC 名稱／任務描述／物件，造成同一 `RUNTIME_QUESTS` checkpoint 每回合重試。v0.54.14 在 Engine validation 前正規化 `target`、`conditions`、`evidenceKeywords`，並把 prompt 明確鎖定 `target=1..5`；Autotest fingerprint 同時納入玩家可見 Knowledge 變化，避免把已取得新線索的回合誤報為 NO_STATE_PROGRESS。History stage hard timeout 由 65 秒調整為 75 秒，以降低 Agnes 長回應的單階段 fallback。\n\n'''
if marker not in s:
    raise SystemExit("README release marker missing")
write(p, s.replace(marker, note + marker, 1))

print("v0.54.14 patch applied")
