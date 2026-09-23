from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")

def write(path, text):
    Path(path).write_text(text, encoding="utf-8")

def replace_once(path, old, new):
    text=read(path)
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:120]!r}")
    text=text.replace(old,new,1)
    write(path,text)

def replace_all(path, old, new):
    text=read(path)
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old!r}")
    write(path,text.replace(old,new))

# Release/version/cache graph.
replace_all("src/version.js", '0.54.14', '0.54.15')
for path in ["package.json","api/health.js"]:
    replace_all(path, '0.54.14', '0.54.15')
replace_all("index.html", 'app.js?v=54014', 'app.js?v=54015')
replace_all("app.js", '?v=54014', '?v=54015')
replace_all("test/version-ui.test.js", '0.54.14', '0.54.15')
replace_all("test/version-ui.test.js", '54014', '54015')
replace_all("test/module-cache.test.js", 'v0.54.14', 'v0.54.15')
replace_all("test/module-cache.test.js", '54014', '54015')
replace_all("test/ai-settings.test.js", 'ai-settings\\.js\\?v=54014', 'ai-settings\\.js\\?v=54015')
replace_all("test/v05414-regressions.test.js", 'runtime-generation-normalizer\\.js\\?v=54014', 'runtime-generation-normalizer\\.js\\?v=54015')

# Runtime NPC shape recovery.
p="src/runtime-generation-normalizer.js"
t=read(p)
anchor='export function normalizeRuntimeSideQuest(row={}){\n'
if anchor not in t:
    raise SystemExit("runtime normalizer anchor missing")
insert='''export function normalizeRuntimeNpc(row={}){\n const knowledgeScope=uniq(Array.isArray(row?.knowledgeScope)?row.knowledgeScope:[],12),behaviorRaw=row?.behaviorProfile,behavior=behaviorRaw&&typeof behaviorRaw==="object"&&!Array.isArray(behaviorRaw)?behaviorRaw:{},behaviorText=typeof behaviorRaw==="string"?clean(behaviorRaw,220):"";\n const behaviorProfile={mannerisms:uniq(behavior.mannerisms,4),speechPatterns:uniq(behavior.speechPatterns,4),habits:uniq(behavior.habits,4),values:uniq(behavior.values,4),fears:uniq(behavior.fears,4),contradictions:uniq(behavior.contradictions,4),promises:uniq(behavior.promises,4),grudges:uniq(behavior.grudges,4)};\n if(!behaviorProfile.speechPatterns.length&&clean(behavior.greeting,180))behaviorProfile.speechPatterns=[clean(behavior.greeting,180)];\n if(!behaviorProfile.fears.length&&clean(behavior.fear,180))behaviorProfile.fears=[clean(behavior.fear,180)];\n if(behaviorText&&!behaviorProfile.habits.length)behaviorProfile.habits=[behaviorText];\n const companionRaw=row?.companionProfile,companion=companionRaw&&typeof companionRaw==="object"&&!Array.isArray(companionRaw)?companionRaw:{},companionText=typeof companionRaw==="string"?clean(companionRaw,220):"",join=Math.round(Number(companion.joinThreshold)),leave=Math.round(Number(companion.leaveThreshold));\n const companionProfile={joinThreshold:Number.isFinite(join)?Math.max(5,Math.min(90,join)):35,leaveThreshold:Number.isFinite(leave)?Math.max(0,Math.min(70,leave)):10,motives:uniq(companion.motives,4),boundaries:uniq(companion.boundaries,4)};\n if(!companionProfile.motives.length&&clean(companion.reason,180))companionProfile.motives=[clean(companion.reason,180)];\n if(!companionProfile.boundaries.length&&Array.isArray(companion.conditions))companionProfile.boundaries=uniq(companion.conditions,4);\n if(companionText&&!companionProfile.boundaries.length)companionProfile.boundaries=[companionText];\n return {...row,knowledgeScope,behaviorProfile,companionProfile}\n}\n\n'''
t=t.replace(anchor,insert+anchor,1)
write(p,t)

# Direct runtime generation hardening.
p="src/ai-client.js"
t=read(p)
t=t.replace('normalizeRuntimeLocation,normalizeRuntimeSideQuest,bindRuntimeClaims} from "./runtime-generation-normalizer.js?v=54014";', 'normalizeRuntimeLocation,normalizeRuntimeNpc,normalizeRuntimeSideQuest,bindRuntimeClaims} from "./runtime-generation-normalizer.js?v=54015";',1)
old='''async function runtimeExpansionStage(stage,{signal,system,user,maxOutputTokens=1200,temperature=.45,apply,state,plan}){\n let lastError=null;\n for(let attempt=1;attempt<=2;attempt++){\n  try{\n   const value=await worldStage(stage,{aiTask:"runtime_expansion",signal,timeoutMs:45000,retryOnTimeout:false,maxOutputTokens,temperature,system:system+(attempt>1?"\\\n上一輪未通過 Engine 驗證。只修正本階段 JSON，不得改動先前已鎖定的內容。":""),user:JSON.stringify(typeof user==="function"?user():user)});\n   const generation=apply(value);assertRuntimeProgress(state,plan,generation,stage);return generation\n  }catch(e){lastError=e}\n }\n throw lastError||new Error(stage+"_FAILED")\n}\n'''
new='''async function runtimeExpansionStage(stage,{signal,system,user,maxOutputTokens=1200,timeoutMs=45000,temperature=.45,apply,state,plan}){\n let lastError=null;\n for(let attempt=1;attempt<=2;attempt++){\n  try{\n   const attemptTokens=attempt>1?Math.min(3600,Math.max(Number(maxOutputTokens)+700,Math.round(Number(maxOutputTokens)*1.5))):maxOutputTokens;\n   const retryHint=attempt>1?"\\n上一輪未通過 Engine 驗證。只修正本階段 JSON，不得改動先前已鎖定的內容；若上一輪被截斷，縮短自由文字但必須完整閉合 JSON。":"";\n   const value=await worldStage(stage,{aiTask:"runtime_expansion",signal,timeoutMs:attempt>1?Math.max(timeoutMs,50000):timeoutMs,retryOnTimeout:false,maxOutputTokens:attemptTokens,temperature:attempt>1?Math.min(.3,temperature):temperature,system:system+retryHint,user:JSON.stringify(typeof user==="function"?user():user)});\n   const generation=apply(value);assertRuntimeProgress(state,plan,generation,stage);return generation\n  }catch(e){lastError=e}\n }\n throw lastError||new Error(stage+"_FAILED")\n}\n'''
if old not in t:
    raise SystemExit("runtimeExpansionStage block mismatch")
t=t.replace(old,new,1)
t=t.replace('signal,state,plan,maxOutputTokens:1400,temperature:.45,\n  system:"你是 Elyndra Runtime Society Architect。', 'signal,state,plan,timeoutMs:55000,maxOutputTokens:2400,temperature:.35,\n  system:"你是 Elyndra Runtime Society Architect。',1)
t=t.replace('Faction 必須引用已鎖定 history/location 因果，並優先實現 remainingClaims。"+baseRules+', 'Faction 必須引用已鎖定 history/location 因果，並優先實現 remainingClaims。為避免長 JSON 被截斷，每個 culture/trade 自由文字欄位保持一句短句，陣列欄位最多1項；currencies 可留空，不得輸出額外說明。"+baseRules+',1)
t=t.replace('NPC 必須落在既有或今次已鎖定地點，提供 historyRefs、companionProfile、behaviorProfile、lore；ORAL_TRADITION legacy echo 只能在這一階段由 NPC 綁定。優先實現 remainingClaims。', 'NPC 必須落在既有或今次已鎖定地點，提供 historyRefs、knowledgeScope、companionProfile、behaviorProfile、lore；knowledgeScope 必須是陣列。behaviorProfile 必須使用 mannerisms/speechPatterns/habits/values/fears/contradictions/promises/grudges 陣列；companionProfile 必須使用 joinThreshold/leaveThreshold/motives/boundaries。ORAL_TRADITION legacy echo 只能在這一階段由 NPC 綁定。優先實現 remainingClaims。',1)
t=t.replace('behaviorProfile,companionProfile,lore:{story:40-80字文字,unlockKeywords:[1-2個實體線索],minMatches:1}', 'behaviorProfile:{mannerisms:[1項],speechPatterns:[1項],habits:[1項],values:[1項],fears:[1項],contradictions:[1項],promises:[],grudges:[]},companionProfile:{joinThreshold:35,leaveThreshold:10,motives:[1項],boundaries:[1項]},lore:{story:40-80字文字,unlockKeywords:[1-2個實體線索],minMatches:1}',1)
t=t.replace('const npcs=bindRuntimeClaims(plan,"npcs",runtimeRows(value,"npcs",slots.npcs));', 'const npcs=bindRuntimeClaims(plan,"npcs",runtimeRows(value,"npcs",slots.npcs).map(normalizeRuntimeNpc));',1)
# Opening cast NPC is explicitly nearby at the starting location: expose existence, not hidden lore.
t=t.replace('system:`你是 Elyndra Opening Cast Compiler。只生成1個附近 NPC、最多1個支線與3-4個 suggestions。', 'system:`你是 Elyndra Opening Cast Compiler。只生成1個附近 NPC、最多1個支線與3-4個 suggestions。這名附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true；這只公開人物存在與外觀，不代表玩家知道其 lore、秘密或知識。',1)
t=t.replace('historyRefs:["0-2個 HIST id"],known:false,behaviorProfile:', 'historyRefs:["0-2個 HIST id"],known:true,behaviorProfile:',1)
# Fallback opening NPC mirrors the same visibility contract.
old_fallback='knowledgeScope:(anchor.publicFacts||[]).slice(0,2),historyRefs:[history?.[0]?.id||"HIST-1"],known:false,companionProfile:'
if old_fallback not in t:
    raise SystemExit("opening cast fallback visibility anchor missing")
t=t.replace(old_fallback,'knowledgeScope:(anchor.publicFacts||[]).slice(0,2),historyRefs:[history?.[0]?.id||"HIST-1"],known:true,companionProfile:',1)
write(p,t)

# Server opening cast parity.
p="api/world.js"
t=read(p)
t=t.replace('system:"你是 Elyndra Opening Cast Compiler。前面所有世界觀都已鎖定。只生成1個附近 NPC、最多1個支線與3-4個 suggestions；NPC、任務只能引用既有 Location/Faction/History，不得新增地點、勢力、世界規則或歷史。只輸出 JSON。",', 'system:"你是 Elyndra Opening Cast Compiler。前面所有世界觀都已鎖定。只生成1個附近 NPC、最多1個支線與3-4個 suggestions；附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true；這只公開人物存在與外觀，不公開 lore、秘密或知識。NPC、任務只能引用既有 Location/Faction/History，不得新增地點、勢力、世界規則或歷史。只輸出 JSON。",',1)
t=t.replace('historyRefs:["0-2 HIST"],known:false,behaviorProfile:', 'historyRefs:["0-2 HIST"],known:true,behaviorProfile:',1)
write(p,t)

# Preserve observation semantics for within-location repositioning/search, without undoing genuine travel reclassification.
p="src/contextual-actions.js"
t=read(p)
needle='export function trustedSuggestionAssessment(state,row){\n'
helper='''function trustedSuggestionHasKnownDestination(state,action){\n const current=String(state.player?.location||"");\n return (state.world?.registry?.locations||[]).some(loc=>loc?.known===true&&loc?.name&&String(loc.name)!==current&&String(action||"").includes(String(loc.name)))\n}\nfunction trustedSuggestionObservationDominant(action){return /觀察|查看|檢查|搜尋|尋找|調查|辨識|比對|描摹|記錄|線索|證據|痕跡|observe|inspect|search|investigate|compare|trace/i.test(String(action||""))}\n'''
if needle not in t:
    raise SystemExit("trustedSuggestionAssessment anchor missing")
t=t.replace(needle,helper+needle,1)
old_kind='const engineKind=inferActionKind(x.action),kind=engineKind==="GENERAL"?x.kind:engineKind;'
new_kind='const engineKind=inferActionKind(x.action),localObserve=x.kind==="OBSERVE"&&engineKind==="TRAVEL"&&trustedSuggestionObservationDominant(x.action)&&!trustedSuggestionHasKnownDestination(state,x.action),kind=localObserve?"OBSERVE":engineKind==="GENERAL"?x.kind:engineKind;'
if old_kind not in t:
    raise SystemExit("trusted suggestion kind line missing")
t=t.replace(old_kind,new_kind,1)
write(p,t)

# Regression coverage reproducing v0.54.14 field failures.
test_path=Path("test/v05415-regressions.test.js")
test_path.write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport {readFile} from "node:fs/promises";\nimport {normalizeRuntimeNpc} from "../src/runtime-generation-normalizer.js";\nimport {buildContextualActionSet,trustedSuggestionAssessment} from "../src/contextual-actions.js";\n\nfunction actionState(){\n return {\n  world:{id:"W",state:{day:1},registry:{locations:[{id:"L1",name:"燼骨城外圍無名廢廟的轉生祭壇",known:true},{id:"L2",name:"燼骨城北風化哨站",known:true}],npcs:[],sideQuests:[]},creation:{blueprint:{difficulty:"normal"}}},\n  player:{location:"燼骨城外圍無名廢廟的轉生祭壇",status:"ACTIVE",difficulty:"normal",skills:{OBSERVE:1,SOCIAL:0,TRAVEL:0,RISKY:0},magic:{knownSpells:[]}},\n  quests:{main:{title:"追查世界規則",objectives:["取得可驗證證據"],status:"ACTIVE"}},events:[]\n }\n}\n\ntest("v0.54.15 normalizes malformed Runtime Cast NPC profiles before validation",()=>{\n const npc=normalizeRuntimeNpc({name:"殘影",role:"守衛",knowledgeScope:"不應是字串",behaviorProfile:"總是避開目光",companionProfile:"不願成為同伴"});\n assert.deepEqual(npc.knowledgeScope,[]);\n assert.equal(typeof npc.behaviorProfile,"object");assert.deepEqual(npc.behaviorProfile.habits,["總是避開目光"]);\n assert.equal(typeof npc.companionProfile,"object");assert.equal(npc.companionProfile.joinThreshold,35);assert.equal(npc.companionProfile.leaveThreshold,10);assert.deepEqual(npc.companionProfile.boundaries,["不願成為同伴"]);\n const drift=normalizeRuntimeNpc({behaviorProfile:{greeting:"先沉默再開口",fear:"害怕節點"},companionProfile:{reason:"需要外部協助",conditions:["不可觸碰禁忌物"]}});\n assert.deepEqual(drift.behaviorProfile.speechPatterns,["先沉默再開口"]);assert.deepEqual(drift.behaviorProfile.fears,["害怕節點"]);assert.deepEqual(drift.companionProfile.motives,["需要外部協助"]);assert.deepEqual(drift.companionProfile.boundaries,["不可觸碰禁忌物"]);\n});\n\ntest("v0.54.15 keeps intra-location search OBSERVE but preserves genuine named TRAVEL",()=>{\n const s=actionState(),localAction="暫時離開祭壇中心，在廢廟其他區域尋找可能保留較完好的符號或文字，試圖建立一套本地的符號對照表。";\n const local=buildContextualActionSet(s,[{label:"找其他符號",action:localAction,kind:"OBSERVE",risk:"MEDIUM",approach:"CREATIVE",progression:true,requirementsSatisfied:true,causalBasis:"仍在同一廢廟內"}]).all.find(x=>x.action===localAction);\n assert.ok(local);const localAssessment=trustedSuggestionAssessment(s,local);assert.equal(localAssessment.kind,"OBSERVE");assert.equal(localAssessment.actionIntent.intent,"OBSERVE");assert.equal(localAssessment.source,"AI_SUGGESTION_PREVALIDATED");\n const travelAction="離開祭壇，前往燼骨城北風化哨站查看入口痕跡";\n const travel=buildContextualActionSet(s,[{label:"去北哨站",action:travelAction,kind:"OBSERVE",risk:"LOW",approach:"STEADY",progression:true,requirementsSatisfied:true,causalBasis:"已知北哨站"}]).all.find(x=>x.action===travelAction);\n assert.ok(travel);const travelAssessment=trustedSuggestionAssessment(s,travel);assert.equal(travelAssessment.kind,"TRAVEL");assert.equal(travelAssessment.actionIntent.intent,"TRAVEL");assert.equal(travelAssessment.source,"AI_SUGGESTION_ENGINE_RECLASSIFIED");\n});\n\ntest("v0.54.15 gives Runtime Society enough output headroom and escalates retry budget",async()=>{\n const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");\n assert.match(client,/RUNTIME_SOCIETY[\\s\\S]*?timeoutMs:55000,maxOutputTokens:2400/);\n assert.match(client,/attemptTokens=attempt>1\\?Math\\.min\\(3600/);\n assert.match(client,/被截斷，縮短自由文字但必須完整閉合 JSON/);\n assert.match(client,/runtimeRows\\(value,"npcs",slots\\.npcs\\)\\.map\\(normalizeRuntimeNpc\\)/);\n});\n\ntest("v0.54.15 opening nearby NPC is player-visible in direct and server world creation",async()=>{\n const [client,server]=await Promise.all([readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../api/world.js",import.meta.url),"utf8")]);\n assert.match(client,/附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true/);\n assert.match(client,/historyRefs:\["0-2個 HIST id"\],known:true,behaviorProfile/);\n assert.match(server,/附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true/);\n assert.match(server,/historyRefs:\["0-2 HIST"\],known:true,behaviorProfile/);\n});\n''',encoding="utf-8")

# Release note.
p="README.md"
t=read(p)
marker="# Elyndra"
note='''\n### v0.54.15 — Runtime Society / Visibility Recovery\n\n- Runtime Society 增加專屬輸出 headroom，第二次編譯會自動提高 token budget 並要求縮短文字、完整閉合 JSON，避免 Agnes 在 1600-token 邊界反覆截斷。\n- Runtime Cast 新增 NPC shape normalizer，修復 `knowledgeScope`、`behaviorProfile`、`companionProfile` 漂移造成的 checkpoint 重試。\n- 同一地點內「離開祭壇中心去搜尋／觀察」不再因「離開」一詞誤判成跨地點 TRAVEL；明確指向另一個已知 Canon 地點時仍維持 TRAVEL。\n- 開局 Cast 的「附近 NPC」現在只公開其存在與外觀（`known:true`），不公開 lore／秘密，令社交路線能在第一幕真正進入玩家可見行動循環。\n\n'''
if note.strip() not in t:
    pos=t.find("\n", t.find(marker))+1 if marker in t else 0
    t=t[:pos]+note+t[pos:]
write(p,t)

print("v0.54.15 patch applied")
