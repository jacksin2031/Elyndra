from pathlib import Path
import re

ROOT=Path('.')

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def must_replace(p,old,new,count=1):
    s=read(p); n=s.count(old)
    if n < count: raise SystemExit(f'{p}: missing expected text: {old[:100]!r} (found {n})')
    write(p,s.replace(old,new,count))

# 1) Direct AI: selected runtime language is the only output language.
p='src/ai-client.js'; s=read(p)
old='system:"你是 Elyndra 的繁體中文敘事者。玩家只知道 payload 中 visibleFacts、playerLocation 與這次行動能直接感知到的結果。world/Canon 可能存在更多真相，但不可提前說出任何未學會的世界名稱、地名、國家、勢力、歷史或規則。只能描述已由遊戲引擎決定的結果，不可改骰子、Canon、HP、物品。回答80-180字。只使用繁體中文；除既有專有名詞外不要切換成英文、日文、韓文或其他語言，也不要輸出 [世界動向]、【世界動向】、SYSTEM 等系統標籤。"'
new='system:"You are Elyndra\'s player-facing narrator. The player only knows visibleFacts, playerLocation, and results directly perceived from this action. Never reveal unknown world names, locations, nations, factions, history, rules, hidden Canon, or secrets. Describe only Engine-confirmed results; never alter dice, Canon, HP, items, or state. Keep the narration concise (roughly 80-180 CJK characters or equivalent length). Do not emit system labels such as [世界動向], 【世界動向】, or SYSTEM. The runtime language contract appended by directChat is the sole authority for output language."'
if old not in s: raise SystemExit('ai-client: legacy Traditional-Chinese narrate prompt not found')
s=s.replace(old,new,1)
old_func='''async function worldStage(stage,args){
 try{return await withWorldAiSlot(async()=>{const system=[String(args?.system||""),WORLD_TRADITIONAL_CHINESE_CONTRACT].filter(Boolean).join("\\n"),value=parseJSON(await directChat({...args,system,aiTask:args?.aiTask||worldStageTask(stage)})),leak=simplifiedChineseLeak(value);if(leak)throw new Error(`NON_TRADITIONAL_CHINESE:${leak.character}:${leak.path}`);return value}) }
 catch(e){const suffix=e?.message||String(e);throw new Error(`WORLD_${stage}_FAILED: ${suffix}`)}
}'''
new_func='''async function worldStage(stage,args){
 const locale=normalizeLocale(args?.locale||loadLocale());
 try{return await withWorldAiSlot(async()=>{
  const system=[String(args?.system||""),languageContract(locale)].filter(Boolean).join("\\n");
  const value=parseJSON(await directChat({...args,locale,system,aiTask:args?.aiTask||worldStageTask(stage)}));
  if(locale==="zh-Hant"){
   const leak=simplifiedChineseLeak(value);if(leak)throw new Error(`NON_TRADITIONAL_CHINESE:${leak.character}:${leak.path}`)
  }
  return value
 })}
 catch(e){const suffix=e?.message||String(e);throw new Error(`WORLD_${stage}_FAILED: ${suffix}`)}
}'''
if old_func not in s: raise SystemExit('ai-client: worldStage legacy language lock not found')
s=s.replace(old_func,new_func,1)
# Retry wording must not force zh-Hant for other locales. Keep diagnostic phrase but condition it.
s=s.replace('const languageRetry=/NON_TRADITIONAL_CHINESE/.test(String(reason))?"\\n上一次輸出含有簡體字；這次所有中文值必須重寫為繁體中文正體字，JSON key、ID 與 enum 不變。":"";',
'''const languageRetry=/NON_TRADITIONAL_CHINESE/.test(String(reason))&&normalizeLocale(args?.locale||loadLocale())==="zh-Hant"?"\\n上一次輸出含有簡體字；繁體中文模式下所有中文值必須使用正體字，JSON key、ID 與 enum 不變。":"";''')
write(p,s)

# 2) Runtime schemas: schema examples may be Chinese, but must never require zh-Hant.
p='src/ai-runtime-contracts.js'; s=read(p)
repls={
 '4-18字繁體中文目前目標':'4-18字、使用目前 runtime 選擇語言的目前目標',
 '1-3句、40-180字繁體中文，只描述玩家當下可感知結果與實際後果':'1-3句、40-180字或等量篇幅，使用目前 runtime 選擇語言，只描述玩家當下可感知結果與實際後果',
 '簡短繁體中文理由':'使用目前 runtime 選擇語言的簡短理由',
 '全程使用自然繁體中文，除非 snapshot 明確提供玩家可見專名，否則避免中英硬插':'全程只使用目前 runtime 選擇語言的自然表達；除 snapshot 明確提供的玩家可見專名外，不得混入其他語言',
 '只使用繁體中文，不得輸出系統標籤':'只使用目前 runtime 選擇語言，不得混入其他語言（既有專名除外），不得輸出系統標籤'
}
for old,new in repls.items():
    if old not in s: raise SystemExit(f'ai-runtime-contracts missing: {old}')
    s=s.replace(old,new)
write(p,s)

# 3) Server API: every model call uses request-local locale. Narrator prompt is language-neutral.
for f in Path('api').glob('*.js'):
    if f.name in {'_ai.js','translate.js','health.js'}: continue
    s=f.read_text(encoding='utf-8')
    s=s.replace('callModel({signal:req.elyndraSignal,system:', 'callModel({signal:req.elyndraSignal,locale:req.elyndraLocale,system:')
    # avoid duplicate if rerun
    s=s.replace('callModel({signal:req.elyndraSignal,locale:req.elyndraLocale,locale:req.elyndraLocale,system:', 'callModel({signal:req.elyndraSignal,locale:req.elyndraLocale,system:')
    f.write_text(s,encoding='utf-8')
p='api/narrate.js'; s=read(p)
s=s.replace('const system="你是 Elyndra 的繁體中文敘事者。只能描述已發生的遊戲結果。不得改變骰子、HP、物品、Canon、角色生死或創造玩家尚未獲准知道的秘密。不得假設任何預設人物、地名、貨幣或敵人。weather 若存在，只可自然描述其目前可感知效果，不得推測背後未公開規則。回答 80-180 字，不要使用 Markdown。";',
'const system="You are Elyndra\'s player-facing narrator. Describe only game results that have already happened. Never change dice, HP, items, Canon, character life/death, or reveal secrets the player has not learned. Never invent default people, place names, currencies, or enemies. If weather is present, describe only currently perceptible effects. Keep it concise and do not use Markdown. The request-local runtime language contract is authoritative.";')
write(p,s)

# Translator must handle worlds that have already passed through another runtime language.
p='api/translate.js'; s=read(p)
s=s.replace('Translate every input string into the target language while preserving factual meaning, names, numbers, game state, uncertainty, and knowledge boundaries.',
'Translate every input string into the target language while preserving factual meaning, names, numbers, game state, uncertainty, and knowledge boundaries. The sourceLocale is the world origin language only; individual strings may already be in another previously selected runtime language, so detect the actual source language of each string independently.')
write(p,s)
p='src/ai-client.js'; s=read(p)
s=s.replace("Translate each input string into the target language. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries.",
"Translate each input string into the target language. The sourceLocale is the world origin language only; individual strings may already be in another previously selected runtime language, so detect each string's actual source language independently. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries.")
write(p,s)

# 4) All world-entry paths must stop until cross-language translation succeeds.
p='app.js'; s=read(p)
old='''$("#saveToolsBtn").onclick=()=>openSaveManagerUI(gameState,openModal,{onLoad:async loaded=>{replaceGameState(migrate(loaded),"LOAD_SLOT");await refresh();$("#modal").classList.add("hidden");show("game")},onImport:()=>$("#importFile").click()});
$("#importFile").onchange=async e=>{try{replaceGameState(migrate(await importWorld(e.target.files[0])),"IMPORT_WORLD");await refresh();$("#modal").classList.add("hidden");show("game")}catch(err){alert(err.message)}finally{e.target.value=""}};'''
new='''$("#saveToolsBtn").onclick=()=>openSaveManagerUI(gameState,openModal,{onLoad:async loaded=>{replaceGameState(migrate(loaded),"LOAD_SLOT");aiStatus=await aiHealth();const ready=await refresh();if(!ready){alert(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));return}$("#modal").classList.add("hidden");show("game")},onImport:()=>$("#importFile").click()});
$("#importFile").onchange=async e=>{try{replaceGameState(migrate(await importWorld(e.target.files[0])),"IMPORT_WORLD");aiStatus=await aiHealth();const ready=await refresh();if(!ready){alert(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));return}$("#modal").classList.add("hidden");show("game")}catch(err){alert(err.message)}finally{e.target.value=""}};'''
if old not in s: raise SystemExit('app: save/import world-entry block not found')
s=s.replace(old,new,1)
write(p,s)

# 5) Focused regression hardening. No nondownload suite.
p='test/v05900-multilingual-runtime.test.js'; s=read(p)
if 'multilingual hardening removes language locks' not in s:
    s += r'''

test("multilingual hardening removes language locks and gates every world entry",async()=>{
 const [client,contracts,app,narrate,translate]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-runtime-contracts.js",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../api/narrate.js",import.meta.url),"utf8"),
  readFile(new URL("../api/translate.js",import.meta.url),"utf8")
 ]);
 assert.match(client,/const locale=normalizeLocale\(args\?\.locale\|\|loadLocale\(\)\)/);
 assert.match(client,/if\(locale==="zh-Hant"\)/);
 assert.doesNotMatch(client,/system:\"你是 Elyndra 的繁體中文敘事者/);
 assert.doesNotMatch(contracts,/4-18字繁體中文|40-180字繁體中文|簡短繁體中文理由|全程使用自然繁體中文|只使用繁體中文/);
 assert.match(contracts,/目前 runtime 選擇語言/);
 assert.match(app,/LOAD_SLOT[\s\S]{0,260}const ready=await refresh\(\)[\s\S]{0,180}if\(!ready\)/);
 assert.match(app,/IMPORT_WORLD[\s\S]{0,260}const ready=await refresh\(\)[\s\S]{0,180}if\(!ready\)/);
 assert.match(narrate,/locale:req\.elyndraLocale/);
 assert.doesNotMatch(narrate,/繁體中文敘事者/);
 assert.match(translate,/actual source language of each string independently/);
});

test("narrator row is an invariant immediately above player actions",async()=>{
 const [html,css]=await Promise.all([readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8")]);
 const n=html.indexOf('<div class="narrative-panel"'),d=html.indexOf('<div class="decision-panel"');
 assert.ok(n>0&&d>n,"narrative-panel must precede decision-panel in the same scene flow");
 assert.ok(d-n<220,"nothing substantial may be inserted between narrator and action panel");
 assert.match(css,/#game \.narrative-panel\{grid-row:2!important/);
 assert.match(css,/#game \.decision-panel\{grid-row:3!important/);
 assert.match(css,/#game \.scene\{display:grid!important;grid-template-rows:minmax\(0,1fr\) auto auto!important/);
});
'''
write(p,s)
print('v0.59.0 multilingual hardening patch applied')
