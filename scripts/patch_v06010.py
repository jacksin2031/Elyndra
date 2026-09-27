from pathlib import Path
import json,re

ROOT=Path('.')

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def replace_once(path,old,new):
    text=read(path)
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:100]!r}')
    write(path,text.replace(old,new,1))

def replace_all_required(path,old,new,min_count=1):
    text=read(path); count=text.count(old)
    if count<min_count: raise SystemExit(f'{path}: expected >= {min_count} matches, found {count}: {old!r}')
    write(path,text.replace(old,new))

# Version + top-level app cache token.
replace_once('package.json','"version": "0.60.9"','"version": "0.60.10"')
replace_once('src/version.js','APP_VERSION="0.60.9"','APP_VERSION="0.60.10"')
replace_once('index.html','src="app.js?v=60009"','src="app.js?v=60010"')

# Cache-bust the browser modules changed in this patch.
app=read('app.js')
for old,new in [
    ('./src/version.js?v=60009','./src/version.js?v=60010'),
    ('./src/locale-runtime.js?v=60009','./src/locale-runtime.js?v=60010'),
    ('./src/world-creation.js?v=59003','./src/world-creation.js?v=60010'),
]:
    if old not in app: raise SystemExit(f'app.js missing cache edge {old}')
    app=app.replace(old,new,1)
write('app.js',app)

# Other source modules still import the old locale-runtime URL. Import-map the old URL
# to the new cache token so the browser has one locale-runtime module instance and the
# cache policy does not force unrelated modules to churn.
replace_once('index.html',
    '"./src/npc-agency-engine.js?v=60003":"./src/npc-agency-engine.js?v=60004"}',
    '"./src/npc-agency-engine.js?v=60003":"./src/npc-agency-engine.js?v=60004","./src/locale-runtime.js?v=60009":"./src/locale-runtime.js?v=60010"}')

# P0: a newly generated world already has sourceLocale === activeLocale. Detecting a
# leaked string must schedule/allow render repair, not turn same-locale creation into a
# blocking language-switch transaction.
replace_once('app.js',
''' const cooldown=localeRepairCooldown.get(state);if(cooldown?.locale===activeLocale&&Date.now()<cooldown.until)return false;''',
''' if(loc.sourceLocale===activeLocale){loc.displayLocale=activeLocale;localeRepairCooldown.delete(state);recordDebug("LOCALE_SAME_SOURCE_REPAIR_NONBLOCKING",{reason,targetLocale:activeLocale,pending:pending.strings.length});return true}\n const cooldown=localeRepairCooldown.get(state);if(cooldown?.locale===activeLocale&&Date.now()<cooldown.until)return false;''')

# worldReadyNotice must be correct on its first frame; do not rely on the MutationObserver
# or AI translation to replace a Chinese toast later.
old_notify='''function notifyWorldReady(){\n const message="你的異世界已完成編譯，請先確認世界契約，再決定是否穿越。",existing=$("#worldReadyNotice");if(existing)existing.remove();\n const toast=document.createElement("div");toast.id="worldReadyNotice";toast.className="world-ready-notice";toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");toast.innerHTML='<strong>世界生成完成</strong><span>'+message+"</span>";document.body.appendChild(toast);requestAnimationFrame(()=>toast.classList.add("show"));setTimeout(()=>{toast.classList.remove("show");setTimeout(()=>toast.remove(),250)},7000);\n let systemShown=false;\n try{if("Notification" in window&&Notification.permission==="granted"){new Notification("Elyndra · 世界生成完成",{body:message,tag:"elyndra-world-ready"});systemShown=true}}catch{}\n recordDebug("WORLD_CREATION_NOTIFICATION",{phase:"CONTRACT_READY",inPage:true,systemShown,documentHidden:document.hidden===true})\n}'''
new_notify='''function notifyWorldReady(){\n const message=uiText("你的異世界已完成編譯，請先確認世界契約，再決定是否穿越。",activeLocale),title=uiText("世界生成完成",activeLocale),notificationTitle=uiText("Elyndra · 世界生成完成",activeLocale),existing=$("#worldReadyNotice");if(existing)existing.remove();\n const toast=document.createElement("div");toast.id="worldReadyNotice";toast.className="world-ready-notice";toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");toast.innerHTML='<strong>'+esc(title)+'</strong><span>'+esc(message)+"</span>";document.body.appendChild(toast);requestAnimationFrame(()=>toast.classList.add("show"));setTimeout(()=>{toast.classList.remove("show");setTimeout(()=>toast.remove(),250)},7000);\n let systemShown=false;\n try{if("Notification" in window&&Notification.permission==="granted"){new Notification(notificationTitle,{body:message,tag:"elyndra-world-ready"});systemShown=true}}catch{}\n recordDebug("WORLD_CREATION_NOTIFICATION",{phase:"CONTRACT_READY",inPage:true,systemShown,documentHidden:document.hidden===true})\n}'''
replace_once('app.js',old_notify,new_notify)

# Deterministic user-intent constraint: in "follow worldview" (style) mode, an explicit
# statement about magic scarcity is more specific than the style preset. This prevents
# 王道奇幻's default magic=8 from overriding "魔法は希少".
wc=read('src/world-creation.js')
anchor='''function resolveField(f,key,styleBase,r,opts={}){\n const mode=f?.mode||"style",min=opts.min??1,max=opts.max??10,locked=f?.locked===true;\n let value=f?.value,source=locked||mode==="fixed"?BLUEPRINT_SOURCES.USER:mode==="random"?BLUEPRINT_SOURCES.RANDOM:BLUEPRINT_SOURCES.STYLE;\n if(!locked&&mode==="style"&&styleBase?.[key]!=null)value=styleBase[key];\n if(!locked&&mode==="random"){\n  if(opts.values)value=pick(r,opts.values);\n  else value=Math.round(min+r()*(max-min))\n }\n if(opts.values&&!opts.values.includes(value))value=opts.values[0];\n else if(!opts.values)value=clamp(value,min,max);\n return {value,source,locked}\n}\n'''
insert=anchor+'''\nfunction explicitMagicLevel(draft){\n const source=[draft?.basic?.customStyleDescription,draft?.customWorldDescription,...(Array.isArray(draft?.storyPreferences)?draft.storyPreferences:[])].filter(Boolean).join("\\n").normalize("NFKC"),lower=source.toLowerCase();\n if(!source.trim())return null;\n if(/(?:魔法|魔術|魔力)(?:は|が)?(?:希少|稀少)(?:ではない|じゃない)/u.test(source))return null;\n if(/(?:魔法|魔術|魔力)(?:は|が|の存在は)?(?:ほぼ|ほとんど)?(?:存在しない|ない|無い|禁止)|(?:無魔法|无魔法|沒有魔法|没有魔法)|\\b(?:no|without)\\s+magic\\b/i.test(source))return 1;\n if(/(?:魔法|魔術|魔力)(?:は|が|の存在は)?(?:非常に|とても|かなり)?(?:希少|稀少|珍しい|少ない|めったにない|滅多にない)|(?:希少|稀少|rare|scarce)(?:な|の|\\s+)(?:魔法|魔術|魔力|magic)|(?:魔法|魔术|魔力)(?:非常)?(?:稀有|稀少|罕見|罕见|很少|少見|少见)|\\bmagic\\s+is\\s+(?:very\\s+)?(?:rare|scarce)\\b|\\b(?:rare|scarce)[ -]?magic\\b/i.test(source)||/(?:magic).{0,8}(?:rare|scarce)/i.test(lower))return 2;\n if(/(?:魔法|魔術|魔力)(?:は|が)?(?:限定的|限られている)|\\blow[ -]?magic\\b/i.test(source))return 3;\n if(/(?:魔法|魔術|魔力)(?:は|が)?(?:非常に|とても)?(?:普遍|豊富|豊か|日常的|ありふれている)|(?:魔法|魔术|魔力)(?:普遍|丰富|豐富|常見|常见)|\\b(?:high|common|abundant)[ -]?magic\\b|\\bmagic\\s+is\\s+(?:common|abundant)\\b/i.test(source))return 8;\n return null\n}\n'''
if wc.count(anchor)!=1: raise SystemExit('world-creation resolveField anchor mismatch')
wc=wc.replace(anchor,insert,1)
old='''export function resolveWorldBlueprint(draft){\n const d=draft?.schemaVersion===2?draft:createWorldCreationDraft(draft),r=rng(d.masterSeed),style=d.basic.worldStyle.value,base=STYLE_BASE[style]||STYLE_BASE["王道奇幻"];\n const scale=resolveField(d.basic.worldScale,"scale",base,r,{values:["小型","中型","大型"]});\n const a=d.advanced;\n const resolved={\n  civilizationLevel:resolveField(a.civilizationLevel,"civilization",base,r,{min:1,max:10}),\n  technologyLevel:resolveField(a.technologyLevel,"technology",base,r,{min:1,max:10}),\n  magicLevel:resolveField(a.magicLevel,"magic",base,r,{min:1,max:10}),'''
new='''export function resolveWorldBlueprint(draft){\n const d=draft?.schemaVersion===2?draft:createWorldCreationDraft(draft),r=rng(d.masterSeed),style=d.basic.worldStyle.value,base=STYLE_BASE[style]||STYLE_BASE["王道奇幻"];\n const scale=resolveField(d.basic.worldScale,"scale",base,r,{values:["小型","中型","大型"]});\n const a=d.advanced,promptMagic=explicitMagicLevel(d);let magicLevel=resolveField(a.magicLevel,"magic",base,r,{min:1,max:10});\n if(promptMagic!=null&&a.magicLevel?.mode==="style"&&a.magicLevel?.locked!==true)magicLevel={...magicLevel,value:promptMagic,source:BLUEPRINT_SOURCES.USER};\n const resolved={\n  civilizationLevel:resolveField(a.civilizationLevel,"civilization",base,r,{min:1,max:10}),\n  technologyLevel:resolveField(a.technologyLevel,"technology",base,r,{min:1,max:10}),\n  magicLevel,'''
if wc.count(old)!=1: raise SystemExit('world-creation blueprint anchor mismatch')
wc=wc.replace(old,new,1)
write('src/world-creation.js',wc)

# Add deterministic first-frame translations for the complete normal world-generation
# progress path plus the world-ready toast. These exact rows make worldProgress(uiText)
# synchronous and remove the transient Chinese flash in Japanese.
locale=read('src/locale-runtime.js')
needle=''' "需要 AI 才能把目前世界切換到所選語言。":row("需要 AI 才能把目前世界切換到所選語言。","需要 AI 才能把当前世界切换到所选语言。","AI is required to switch the current world to the selected language.","現在の世界を選択した言語へ切り替えるにはAIが必要です。"),\n'''
rows=''' "需要 AI 才能把目前世界切換到所選語言。":row("需要 AI 才能把目前世界切換到所選語言。","需要 AI 才能把当前世界切换到所选语言。","AI is required to switch the current world to the selected language.","現在の世界を選択した言語へ切り替えるにはAIが必要です。"),\n "正在建立 World Blueprint":row("正在建立 World Blueprint","正在建立 World Blueprint","Building World Blueprint","World Blueprint を作成中"),\n "解析玩家設定、起源、定位、故事傾向與世界約束":row("解析玩家設定、起源、定位、故事傾向與世界約束","解析玩家设置、起源、定位、故事倾向与世界约束","Parsing player settings, origin, role, story tendencies, and world constraints","プレイヤー設定、起源、役割、物語傾向、世界制約を解析しています。"),\n "正在建立 World Constitution":row("正在建立 World Constitution","正在建立 World Constitution","Building World Constitution","World Constitution を作成中"),\n "把必須／可以／禁止與難度、起源規則編譯成持久約束":row("把必須／可以／禁止與難度、起源規則編譯成持久約束","把必须／可以／禁止与难度、起源规则编译成持久约束","Compiling required/allowed/forbidden elements, difficulty, and origin rules into persistent constraints","必須／許可／禁止、難易度、起源ルールを永続的な制約へコンパイルしています。"),\n "World Seed 已鎖定":row("World Seed 已鎖定","World Seed 已锁定","World Seed locked","World Seed を確定しました"),\n "同一份 Blueprint、Constitution 與 Seed 會成為後續世界生成的根":row("同一份 Blueprint、Constitution 與 Seed 會成為後續世界生成的根","同一份 Blueprint、Constitution 与 Seed 会成为后续世界生成的根","The same Blueprint, Constitution, and Seed become the root of subsequent world generation","同じ Blueprint・Constitution・Seed を以後の世界生成の基盤として使用します。"),\n "世界身份":row("世界身份","世界身份","World Identity","世界アイデンティティ"),\n "先用短請求鎖定唯一 World Identity；失敗時由 Seed Contract 安全補上":row("先用短請求鎖定唯一 World Identity；失敗時由 Seed Contract 安全補上","先用短请求锁定唯一 World Identity；失败时由 Seed Contract 安全补上","Lock a unique World Identity with a short request; safely fall back to the Seed Contract on failure","短いリクエストで固有の World Identity を確定します。失敗した場合は Seed Contract から安全に補完します。"),\n "雙 AI 世界核心":row("雙 AI 世界核心","双 AI 世界核心","2-AI World Core","2-AI 世界コア"),\n "最多兩個 AI 同時生成規則與開局 Anchor；兩邊共享同一 World Identity Contract":row("最多兩個 AI 同時生成規則與開局 Anchor；兩邊共享同一 World Identity Contract","最多两个 AI 同时生成规则与开局 Anchor；两边共享同一 World Identity Contract","Up to two AIs generate rules and the opening Anchor in parallel, sharing one World Identity Contract","最大2つのAIがルールと開始 Anchor を並行生成します。両方が同じ World Identity Contract を共有します。"),\n "世界核心完成":row("世界核心完成","世界核心完成","World Core complete","世界コア完了"),\n "Identity、Rules、Anchor 已合併成單一 World Anchor Contract":row("Identity、Rules、Anchor 已合併成單一 World Anchor Contract","Identity、Rules、Anchor 已合并成单一 World Anchor Contract","Identity, Rules, and Anchor have been merged into one World Anchor Contract","Identity・Rules・Anchor を単一の World Anchor Contract に統合しました。"),\n "雙 AI 編譯 Wave 1":row("雙 AI 編譯 Wave 1","双 AI 编译 Wave 1","2-AI Compile Wave 1","2-AI コンパイル Wave 1"),\n "最多兩個 AI 同時生成：過去歷史與開局地理；兩者共享同一 World Anchor Contract":row("最多兩個 AI 同時生成：過去歷史與開局地理；兩者共享同一 World Anchor Contract","最多两个 AI 同时生成：过去历史与开局地理；两者共享同一 World Anchor Contract","Up to two AIs generate past history and opening geography in parallel, sharing one World Anchor Contract","最大2つのAIが過去の歴史と開始地点の地理を並行生成します。両方が同じ World Anchor Contract を共有します。"),\n "雙 AI 編譯 Wave 2":row("雙 AI 編譯 Wave 2","双 AI 编译 Wave 2","2-AI Compile Wave 2","2-AI コンパイル Wave 2"),\n "歷史與地理已鎖定；最多兩個 AI 同時生成未來 Timeline 與地方社會，兩者必須引用 Wave 1":row("歷史與地理已鎖定；最多兩個 AI 同時生成未來 Timeline 與地方社會，兩者必須引用 Wave 1","历史与地理已锁定；最多两个 AI 同时生成未来 Timeline 与地方社会，两者必须引用 Wave 1","History and geography are locked; up to two AIs generate the future Timeline and local society, both referencing Wave 1","歴史と地理を確定しました。最大2つのAIが未来の Timeline と地域社会を並行生成し、どちらも Wave 1 を参照します。"),\n "雙 AI 編譯 Wave 3":row("雙 AI 編譯 Wave 3","双 AI 编译 Wave 3","2-AI Compile Wave 3","2-AI コンパイル Wave 3"),\n "前兩波 Canon 關係已鎖定；最後只用一個 AI 生成附近人物與支線":row("前兩波 Canon 關係已鎖定；最後只用一個 AI 生成附近人物與支線","前两波 Canon 关系已锁定；最后只用一个 AI 生成附近人物与支线","Canon relationships from the first two waves are locked; one AI now generates nearby characters and a side quest","前2波の Canon 関係を確定しました。最後に1つのAIだけで近隣人物とサイドクエストを生成します。"),\n "整合世界":row("整合世界","整合世界","Integrating world","世界を統合中"),\n "三個 2-way Wave 完成；Engine 正在驗證跨階段引用":row("三個 2-way Wave 完成；Engine 正在驗證跨階段引用","三个 2-way Wave 完成；Engine 正在验证跨阶段引用","Three 2-way waves are complete; Engine is validating cross-stage references","3つの2-way Wave が完了しました。Engine が段階間の参照を検証しています。"),\n "世界骨架完成":row("世界骨架完成","世界骨架完成","World skeleton complete","世界骨格の生成完了"),\n "Engine 驗證完成；AI Quality Critic 將在玩家進入世界後背景執行，不阻塞穿越。":row("Engine 驗證完成；AI Quality Critic 將在玩家進入世界後背景執行，不阻塞穿越。","Engine 验证完成；AI Quality Critic 将在玩家进入世界后后台执行，不阻塞穿越。","Engine validation is complete; AI Quality Critic will run in the background after entry and will not block transition.","Engine の検証が完了しました。AI Quality Critic は世界に入った後バックグラウンドで実行され、移行を妨げません。"),\n "正在驗證 AI 世界":row("正在驗證 AI 世界","正在验证 AI 世界","Validating AI world","AI 世界を検証中"),\n "Engine 正在檢查 Seed、Canon、World Constitution、曆法、Timeline 與跨階段引用":row("Engine 正在檢查 Seed、Canon、World Constitution、曆法、Timeline 與跨階段引用","Engine 正在检查 Seed、Canon、World Constitution、历法、Timeline 与跨阶段引用","Engine is checking Seed, Canon, World Constitution, calendar, Timeline, and cross-stage references","Engine が Seed、Canon、World Constitution、暦、Timeline、段階間の参照を検証しています。"),\n "正在 Canonize 開局內容":row("正在 Canonize 開局內容","正在 Canonize 开局内容","Canonizing opening content","開始内容を Canon 化中"),\n "只建立世界骨架、出生區域與最小可玩內容；其他地區延遲生成":row("只建立世界骨架、出生區域與最小可玩內容；其他地區延遲生成","只建立世界骨架、出生区域与最小可玩内容；其他地区延迟生成","Creating only the world skeleton, starting region, and minimum playable content; other regions are generated lazily","世界骨格、開始地域、最小限のプレイ可能内容だけを作成し、その他の地域は遅延生成します。"),\n "世界生成完成":row("世界生成完成","世界生成完成","World generation complete","世界生成完了"),\n "世界已編譯完成；請先確認世界契約，再決定是否穿越。":row("世界已編譯完成；請先確認世界契約，再決定是否穿越。","世界已编译完成；请先确认世界契约，再决定是否穿越。","World compilation is complete. Review the World Contract before deciding whether to enter.","世界のコンパイルが完了しました。世界契約を確認してから、渡るかどうかを決めてください。"),\n "你的異世界已完成編譯，請先確認世界契約，再決定是否穿越。":row("你的異世界已完成編譯，請先確認世界契約，再決定是否穿越。","你的异世界已完成编译，请先确认世界契约，再决定是否穿越。","Your otherworld has finished compiling. Review the World Contract before deciding whether to enter.","異世界のコンパイルが完了しました。世界契約を確認してから、渡るかどうかを決めてください。"),\n "Elyndra · 世界生成完成":row("Elyndra · 世界生成完成","Elyndra · 世界生成完成","Elyndra · World generation complete","Elyndra · 世界生成完了"),\n "正在建立正式存檔":row("正在建立正式存檔","正在建立正式存档","Creating official save","正式セーブを作成中"),\n "保存 Blueprint、Constitution、Origin、Difficulty 與世界 Canon":row("保存 Blueprint、Constitution、Origin、Difficulty 與世界 Canon","保存 Blueprint、Constitution、Origin、Difficulty 与世界 Canon","Saving Blueprint, Constitution, Origin, Difficulty, and world Canon","Blueprint、Constitution、Origin、Difficulty、世界 Canon を保存しています。"),\n "正在準備冒險介面":row("正在準備冒險介面","正在准备冒险界面","Preparing adventure interface","冒険画面を準備中"),\n "載入第一個場景":row("載入第一個場景","载入第一个场景","Loading the first scene","最初の場面を読み込んでいます"),\n "準備完成":row("準備完成","准备完成","Ready","準備完了"),\n "正在穿越…":row("正在穿越…","正在穿越…","Entering the world…","異世界へ移行中…"),\n "已返回修改":row("已返回修改","已返回修改","Returned to editing","編集に戻りました"),\n "這次編譯結果尚未建立正式存檔；修改設定後可重新生成。":row("這次編譯結果尚未建立正式存檔；修改設定後可重新生成。","这次编译结果尚未建立正式存档；修改设置后可重新生成。","This compilation has not created an official save. Change the settings and generate again.","今回のコンパイル結果はまだ正式セーブになっていません。設定を変更して再生成できます。"),\n "AI 世界生成失敗":row("AI 世界生成失敗","AI 世界生成失败","AI world generation failed","AI 世界生成に失敗しました"),\n "世界生成失敗":row("世界生成失敗","世界生成失败","World generation failed","世界生成に失敗しました"),\n "世界核心":row("世界核心","世界核心","World Core","世界コア"),\n "正在透過伺服器建立世界":row("正在透過伺服器建立世界","正在通过服务器建立世界","Building world through the server","サーバー経由で世界を生成しています"),\n "AI 世界評審":row("AI 世界評審","AI 世界评审","AI World Review","AI 世界レビュー"),\n "伺服器已完成世界品質評分與必要的定點修復":row("伺服器已完成世界品質評分與必要的定點修復","服务器已完成世界品质评分与必要的定点修复","Server completed world quality scoring and required targeted repairs","サーバーで世界品質評価と必要な局所修復が完了しました。"),\n'''
if locale.count(needle)!=1: raise SystemExit('locale insertion anchor mismatch')
locale=locale.replace(needle,rows,1)
write('src/locale-runtime.js',locale)

# Regression test for all reported live failures.
test=Path('test/v06010-ja-world-creation-regression.test.js')
test.write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createWorldCreationDraft,resolveWorldBlueprint,BLUEPRINT_SOURCES} from "../src/world-creation.js";
import {uiText} from "../src/locale-runtime.js";

test("v0.60.10 explicit Japanese rare-magic intent constrains style-mode blueprint",()=>{
 const draft=createWorldCreationDraft({worldStyle:"王道奇幻",worldStyleMode:"fixed",magicLevel:7,magicLevelMode:"style",customWorldDescription:"魔法は希少。灯台守の失踪をめぐる世界。",allowedElements:"灯台守の失踪"});
 const blueprint=resolveWorldBlueprint(draft);
 assert.equal(blueprint.advanced.magicLevel.value,2);
 assert.equal(blueprint.advanced.magicLevel.source,BLUEPRINT_SOURCES.USER);
 assert.deepEqual(blueprint.rules.allowed,["灯台守の失踪"]);
 const baseline=resolveWorldBlueprint(createWorldCreationDraft({worldStyle:"王道奇幻",worldStyleMode:"fixed",magicLevelMode:"style",masterSeed:"baseline"}));
 assert.equal(baseline.advanced.magicLevel.value,8);
});

test("v0.60.10 Japanese creator progress is localized on first render",()=>{
 assert.equal(uiText("世界身份","ja"),"世界アイデンティティ");
 assert.match(uiText("先用短請求鎖定唯一 World Identity；失敗時由 Seed Contract 安全補上","ja"),/Seed Contract/);
 assert.equal(uiText("雙 AI 編譯 Wave 2","ja"),"2-AI コンパイル Wave 2");
 const detail=uiText("歷史與地理已鎖定；最多兩個 AI 同時生成未來 Timeline 與地方社會，兩者必須引用 Wave 1","ja");
 assert.match(detail,/参照します/);assert.doesNotMatch(detail,/參照|兩者|歷史與地理/);
 assert.equal(uiText("世界生成完成","ja"),"世界生成完了");
 assert.equal(uiText("你的異世界已完成編譯，請先確認世界契約，再決定是否穿越。","ja"),"異世界のコンパイルが完了しました。世界契約を確認してから、渡るかどうかを決めてください。");
});

test("v0.60.10 same-source new worlds cannot be blocked by language-switch repair",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/if\(loc\.sourceLocale===activeLocale\)\{loc\.displayLocale=activeLocale;localeRepairCooldown\.delete\(state\);recordDebug\("LOCALE_SAME_SOURCE_REPAIR_NONBLOCKING"/);
 assert.match(app,/gameState\.localization\.sourceLocale=activeLocale;gameState\.localization\.displayLocale=activeLocale;gameState\.world\.language=activeLocale/);
 assert.match(app,/const message=uiText\("你的異世界已完成編譯，請先確認世界契約，再決定是否穿越。",activeLocale\),title=uiText\("世界生成完成",activeLocale\)/);
 assert.match(app,/new Notification\(notificationTitle,\{body:message/);
});
''',encoding='utf-8')

# Release-contract tests.
release=read('test/version-0551-release.test.js')
release=release.replace('v0.60.9','v0.60.10').replace('0.60.9','0.60.10').replace('0\\.60\\.9','0\\.60\\.10')
release=release.replace('app\\.js\\?v=60009','app\\.js\\?v=60010')
release=release.replace('"60009"].includes','"60009","60010"].includes')
release=release.replace('/\\.\\/src\\/version\\.js\\?v=60009/','/\\.\\/src\\/version\\.js\\?v=60010/')
release=release.replace('/\\.\\/src\\/locale-runtime\\.js\\?v=60009/','/\\.\\/src\\/locale-runtime\\.js\\?v=60010/')
release=release.replace('assert.ok(tokens.includes("57029"));','assert.match(app,/\\.\\/src\\/world-creation\\.js\\?v=60010/);\n assert.ok(tokens.includes("57029"));')
write('test/version-0551-release.test.js',release)

vui=read('test/version-ui.test.js')
vui=vui.replace('// v0.60.9 release contract','// v0.60.10 release contract').replace('pkg.version,"0.60.9"','pkg.version,"0.60.10"')
vui=vui.replace('app\\.js\\?v=60009','app\\.js\\?v=60010').replace('version\\.js\\?v=60009','version\\.js\\?v=60010').replace('ai-client\\.js\\?v=60009','ai-client\\.js\\?v=60009')
write('test/version-ui.test.js',vui)

v609=read('test/v0609-ja-turn-export-regression.test.js')
v609=v609.replace('locale-runtime\\.js\\?v=60009','locale-runtime\\.js\\?v=60010')
write('test/v0609-ja-turn-export-regression.test.js',v609)

# CI: make the new live regression part of the Node 20/24 Pages gate.
pages=read('.github/workflows/pages.yml')
pages=pages.replace('Focused v0.60.9 regressions','Focused v0.60.10 regressions')
pages=pages.replace('run: node --test test/v0609-ja-turn-export-regression.test.js','run: node --test test/v06010-ja-world-creation-regression.test.js test/v0609-ja-turn-export-regression.test.js')
write('.github/workflows/pages.yml',pages)

Path('docs/releases/v0.60.10.md').write_text('''# Elyndra v0.60.10\n\nJapanese new-world creation hotfix based on the blocked v0.60.9 live manual acceptance.\n\n- New worlds whose canonical source locale already matches the selected locale no longer run a blocking language-switch translation gate before the first scene.\n- World-generation progress text and the world-ready notice are deterministically localized on first render.\n- Explicit worldview text such as `魔法は希少` constrains style-mode magic intensity instead of being overwritten by the style preset.\n- Adds regression coverage to the Node 20/24 Pages gate.\n\nThis release does **not** claim the Japanese manual acceptance is complete; the live flow must be rerun after deployment.\n''',encoding='utf-8')

# The temporary patch machinery must not appear in the PR.
Path('scripts/patch_v06010.py').unlink(missing_ok=True)
Path('.github/workflows/patch-v06010.yml').unlink(missing_ok=True)
print('v0.60.10 patch applied')
