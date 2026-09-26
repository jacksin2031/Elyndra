from pathlib import Path

ROOT=Path('.')
def rd(p): return (ROOT/p).read_text(encoding='utf-8')
def wr(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def rep(p,old,new,count=1):
    s=rd(p)
    if old not in s: raise SystemExit(f'{p}: missing anchor: {old[:100]!r}')
    wr(p,s.replace(old,new,count))

# 1. Runtime: do not trust mixed-language output as already localized.
p='src/locale-runtime.js'; s=rd(p)
anchor='const RUNTIME_LOCALIZED=new Map();\n'
insert=r'''const RUNTIME_LOCALIZED=new Map();
const JA_CHINESE_LEAK=/(?:眼前的|你的|這個|這些|這是|目前|當前|尚未|仍然|啟用|預設|不使用|世界真正|主要勢力真正|未知區域|故事傾向|文明程度|科技\s*\d|智慧種族約|政治統一|宗教影響|世界危險|生存強度|可自由存檔|飢餓系統|疲勞系統|負面狀態|標準語言障礙|玩家選擇|不包含|穿越到這個世界|返回修改)/u;
const HANT_SIMPLIFIED_LEAK=/[这与为从对会让还开启关闭选择难险饿劳态语种实预设应无]/u;
const HANS_TRADITIONAL_LEAK=/[這與為從對會讓還開啟關閉選擇難險餓勞態語種實預設應無]/u;
export function hasLocaleLeak(value,locale=loadLocale()){
 const text=String(value??'').trim(),id=normalizeLocale(locale);if(!text)return false;
 if(id==='en')return /[\u3040-\u30ff\u3400-\u9fff]/u.test(text);
 if(id==='ja')return JA_CHINESE_LEAK.test(text);
 if(id==='zh-Hans')return HANS_TRADITIONAL_LEAK.test(text);
 if(id==='zh-Hant')return HANT_SIMPLIFIED_LEAK.test(text);
 return false
}
'''
if anchor not in s: raise SystemExit('locale runtime insertion anchor missing')
s=s.replace(anchor,insert,1)
s=s.replace('if(typeof v==="string"){const raw=v.trim();if(raw){set.add(translationKey(raw));try{const parsed=JSON.parse(raw);if(parsed&&typeof parsed==="object")add(parsed)}catch{}}return}',
'''if(typeof v==="string"){const raw=v.trim();if(raw){if(!hasLocaleLeak(raw,id))set.add(translationKey(raw));try{const parsed=JSON.parse(raw);if(parsed&&typeof parsed==="object")add(parsed)}catch{}}return}''',1)
s=s.replace('export function isRuntimeLocalized(value,locale=loadLocale()){const text=String(value??"").trim();return !text||Boolean(RUNTIME_LOCALIZED.get(normalizeLocale(locale))?.has(translationKey(text)))}',
'''export function isRuntimeLocalized(value,locale=loadLocale()){const text=String(value??"").trim(),id=normalizeLocale(locale);return !text||(!hasLocaleLeak(text,id)&&Boolean(RUNTIME_LOCALIZED.get(id)?.has(translationKey(text))))}''',1)
s=s.replace('const payload=visibleTranslationPayload(state,locale);if(payload.sourceLocale===payload.targetLocale&&payload.targetLocale===DEFAULT_LOCALE)return {...payload,strings:[]};const candidates=payload.sourceLocale===payload.targetLocale?payload.volatileStrings:payload.strings;return {...payload,strings:candidates.filter(text=>!hasTranslation(state,text,payload.targetLocale))}',
'''const payload=visibleTranslationPayload(state,locale);if(payload.sourceLocale===payload.targetLocale&&payload.targetLocale===DEFAULT_LOCALE)return {...payload,strings:[]};const candidates=payload.sourceLocale===payload.targetLocale?[...new Set([...payload.volatileStrings,...payload.strings.filter(text=>hasLocaleLeak(text,payload.targetLocale))])]:payload.strings;return {...payload,strings:candidates.filter(text=>!hasTranslation(state,text,payload.targetLocale))}''',1)
old='const id=normalizeLocale(locale);if(id===DEFAULT_LOCALE||typeof document==="undefined")return {sourceLocale:state?.localization?.sourceLocale||DEFAULT_LOCALE,targetLocale:id,strings:[]};const base=root.body||root,doc=base.ownerDocument||root,rows=[];const add=value=>{const text=String(value??"").trim();if(!text||!/[\\u3400-\\u9fff]/u.test(text)||rows.includes(text))return;const canonical=canonicalUiKey(text);if(UI[canonical]||isRuntimeLocalized(text,id)||sessionTranslatedText(text,id)!==text)return;if(state&&translatedCompositeText(state,text,id)!==text)return;rows.push(text)};'
new='const id=normalizeLocale(locale);if(id===DEFAULT_LOCALE||typeof document==="undefined")return {sourceLocale:state?.localization?.sourceLocale||DEFAULT_LOCALE,targetLocale:id,strings:[]};const base=root.body||root,doc=base.ownerDocument||root,rows=[];const add=value=>{const text=String(value??"").trim();if(!text||rows.includes(text))return;const suspicious=id==="en"?/[\\u3040-\\u30ff\\u3400-\\u9fff]/u.test(text):hasLocaleLeak(text,id);if(!suspicious)return;const canonical=canonicalUiKey(text);if(UI[canonical]||isRuntimeLocalized(text,id)||sessionTranslatedText(text,id)!==text)return;if(state&&translatedCompositeText(state,text,id)!==text)return;rows.push(text)};'
if old not in s: raise SystemExit('documentTranslationCandidates anchor missing')
s=s.replace(old,new,1)
wr(p,s)

# 2. World Contract: add raw deterministic values and render all four locales locally.
p='src/world-creation.js'; s=rd(p)
old='''  role:c.role.label,\n  structure:['''
new='''  role:c.role.label,\n  metrics:{civilization:a.civilizationLevel.value,technology:a.technologyLevel.value,magic:a.magicLevel.value,civilizations:a.civilizationCount.value,species:a.speciesCount.value,languages:a.languageCount.value,politicalUnity:a.politicalUnity.value,religion:a.religionInfluence.value,resources:a.resourceAbundance.value,danger:a.worldDanger.value,survival:a.survivalIntensity.value,unknownRatio:a.unknownRatio.value,warState:a.warState.value},\n  difficultyFlags:{hunger:d.hunger,fatigue:d.fatigue,statusEffects:d.statusEffects,savePolicy:d.savePolicy,languageBarrier:d.languageBarrier,permadeath:d.permadeath},\n  structure:['''
if old not in s: raise SystemExit('contract metrics anchor missing')
s=s.replace(old,new,1)
start=s.index('export function worldContractHtml(contract){')
# function is final function in file
replacement=r'''export function worldContractHtml(contract){
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const locale=["zh-Hant","zh-Hans","en","ja"].includes(globalThis.ELYNDRA_LOCALE)?globalThis.ELYNDRA_LOCALE:"zh-Hant";
 const text={
  "zh-Hant":{title:"世界契約",intro:"這是玩家選擇與 Engine 約束的公開摘要，不包含 Hidden World State。",world:"世界",difficulty:"難度",origin:"起源",role:"定位",structure:"世界結構",rules:"難度規則",story:"故事偏好（只作傾向，不保證發生）",required:"必須存在",allowed:"可以存在",forbidden:"禁止出現",unknown:"仍然未知",edit:"返回修改",accept:"穿越到這個世界",civilization:"文明程度",technology:"科技",magic:"魔法",civilizations:"主要文明／部落約",species:"智慧種族約",languages:"語言約",politics:"政治統一",religion:"宗教影響",resources:"資源",danger:"世界危險",survival:"生存強度",unknownArea:"未知區域約",hungerOn:"飢餓系統啟用",hungerOff:"不消耗飽食度",fatigueOn:"疲勞系統啟用",fatigueOff:"沒有疲勞消耗",statusOn:"負面狀態啟用",statusOff:"不產生一般負面狀態",autoSave:"只允許自動存檔",freeSave:"可自由存檔",langHigh:"高語言／文字理解障礙",langLow:"低語言障礙",langStd:"標準語言障礙",deathOn:"永久死亡啟用",deathOff:"預設不使用永久死亡",unknownRows:["世界真正歷史","主要勢力真正目的","尚未探索區域與文明","隱藏世界真相","故事傾向是否、何時以及如何發生"]},
  "zh-Hans":{title:"世界契约",intro:"这是玩家选择与 Engine 约束的公开摘要，不包含 Hidden World State。",world:"世界",difficulty:"难度",origin:"起源",role:"定位",structure:"世界结构",rules:"难度规则",story:"故事偏好（仅作为倾向，不保证发生）",required:"必须存在",allowed:"可以存在",forbidden:"禁止出现",unknown:"仍然未知",edit:"返回修改",accept:"穿越到这个世界",civilization:"文明程度",technology:"科技",magic:"魔法",civilizations:"主要文明／部落约",species:"智慧种族约",languages:"语言约",politics:"政治统一",religion:"宗教影响",resources:"资源",danger:"世界危险",survival:"生存强度",unknownArea:"未知区域约",hungerOn:"饥饿系统启用",hungerOff:"不消耗饱食度",fatigueOn:"疲劳系统启用",fatigueOff:"没有疲劳消耗",statusOn:"负面状态启用",statusOff:"不产生一般负面状态",autoSave:"只允许自动存档",freeSave:"可自由存档",langHigh:"高语言／文字理解障碍",langLow:"低语言障碍",langStd:"标准语言障碍",deathOn:"永久死亡启用",deathOff:"默认不使用永久死亡",unknownRows:["世界真实历史","主要势力真实目的","尚未探索的区域与文明","隐藏的世界真相","故事倾向是否、何时以及如何发生"]},
  en:{title:"World Contract",intro:"This is a public summary of player choices and Engine constraints. Hidden World State is not included.",world:"World",difficulty:"Difficulty",origin:"Origin",role:"Role",structure:"World Structure",rules:"Difficulty Rules",story:"Story Preferences (tendencies only; not guaranteed)",required:"Required",allowed:"May Exist",forbidden:"Forbidden",unknown:"Still Unknown",edit:"Back to Edit",accept:"Enter This World",civilization:"Civilization",technology:"Technology",magic:"Magic",civilizations:"Major civilizations/tribes ≈",species:"Sapient species ≈",languages:"Languages ≈",politics:"Political unity",religion:"Religious influence",resources:"Resources",danger:"World danger",survival:"Survival intensity",unknownArea:"Unexplored regions ≈",hungerOn:"Hunger system enabled",hungerOff:"Satiety is not consumed",fatigueOn:"Fatigue system enabled",fatigueOff:"No fatigue consumption",statusOn:"Negative status effects enabled",statusOff:"Standard negative status effects disabled",autoSave:"Autosave only",freeSave:"Free saving allowed",langHigh:"High language/literacy barrier",langLow:"Low language barrier",langStd:"Standard language barrier",deathOn:"Permadeath enabled",deathOff:"Permadeath disabled by default",unknownRows:["The world's true history","The true goals of major powers","Unexplored regions and civilizations","Hidden truths of the world","Whether, when, and how story tendencies occur"]},
  ja:{title:"世界契約",intro:"これはプレイヤーの選択と Engine 制約の公開概要です。Hidden World State は含まれません。",world:"世界",difficulty:"難易度",origin:"起源",role:"立場",structure:"世界構造",rules:"難易度ルール",story:"物語の傾向（傾向のみで、発生は保証されません）",required:"必須要素",allowed:"存在可能",forbidden:"禁止要素",unknown:"まだ不明",edit:"編集に戻る",accept:"この世界へ渡る",civilization:"文明度",technology:"技術",magic:"魔法",civilizations:"主要文明／部族 約",species:"知的種族 約",languages:"言語 約",politics:"政治統一度",religion:"宗教影響",resources:"資源",danger:"世界危険度",survival:"生存強度",unknownArea:"未探索地域 約",hungerOn:"空腹システム有効",hungerOff:"満腹度を消費しない",fatigueOn:"疲労システム有効",fatigueOff:"疲労消費なし",statusOn:"負の状態異常が有効",statusOff:"通常の負の状態異常なし",autoSave:"オートセーブのみ",freeSave:"自由にセーブ可能",langHigh:"高い言語／識字障壁",langLow:"低い言語障壁",langStd:"標準的な言語障壁",deathOn:"永久死亡あり",deathOff:"永久死亡は標準で無効",unknownRows:["世界の真の歴史","主要勢力の真の目的","未探索の地域と文明","隠された世界の真実","物語の傾向が発生するか、いつ、どのように発生するか"]}
 }[locale];
 const enums={
  "王道奇幻":{"zh-Hant":"王道奇幻","zh-Hans":"王道奇幻",en:"High Fantasy",ja:"王道ファンタジー"},"黑暗奇幻":{"zh-Hant":"黑暗奇幻","zh-Hans":"黑暗奇幻",en:"Dark Fantasy",ja:"ダークファンタジー"},"東方幻想":{"zh-Hant":"東方幻想","zh-Hans":"东方幻想",en:"Eastern Fantasy",ja:"東方幻想"},"蒸汽魔法":{"zh-Hant":"蒸汽魔法","zh-Hans":"蒸汽魔法",en:"Steam Magic",ja:"スチームマジック"},"末日異世界":{"zh-Hant":"末日異世界","zh-Hans":"末日异世界",en:"Apocalyptic Otherworld",ja:"終末異世界"},"小型":{"zh-Hant":"小型","zh-Hans":"小型",en:"Small",ja:"小規模"},"中型":{"zh-Hant":"中型","zh-Hans":"中型",en:"Medium",ja:"中規模"},"大型":{"zh-Hant":"大型","zh-Hans":"大型",en:"Large",ja:"大規模"},"簡單":{"zh-Hant":"簡單","zh-Hans":"简单",en:"Easy",ja:"簡単"},"普通":{"zh-Hant":"普通","zh-Hans":"普通",en:"Normal",ja:"普通"},"困難":{"zh-Hant":"困難","zh-Hans":"困难",en:"Hard",ja:"困難"},"現實":{"zh-Hant":"現實","zh-Hans":"现实",en:"Realistic",ja:"リアル"},"穿越":{"zh-Hant":"穿越","zh-Hans":"穿越",en:"World Crossing",ja:"異世界転移"},"轉生":{"zh-Hant":"轉生","zh-Hans":"转生",en:"Reincarnation",ja:"転生"},"被召喚":{"zh-Hant":"被召喚","zh-Hans":"被召唤",en:"Summoned",ja:"召喚"},"附身":{"zh-Hant":"附身","zh-Hans":"附身",en:"Possession",ja:"憑依"},"原住民":{"zh-Hant":"原住民","zh-Hans":"原住民",en:"Native",ja:"現地人"},"失憶":{"zh-Hant":"失憶","zh-Hans":"失忆",en:"Amnesia",ja:"記憶喪失"},"完全自訂":{"zh-Hant":"完全自訂","zh-Hans":"完全自定义",en:"Custom",ja:"完全カスタム"},"普通人":{"zh-Hant":"普通人","zh-Hans":"普通人",en:"Ordinary Person",ja:"一般人"},"冒險者":{"zh-Hant":"冒險者","zh-Hans":"冒险者",en:"Adventurer",ja:"冒険者"},"英雄候選人":{"zh-Hant":"英雄候選人","zh-Hans":"英雄候选人",en:"Hero Candidate",ja:"英雄候補"},"商人":{"zh-Hant":"商人","zh-Hans":"商人",en:"Merchant",ja:"商人"},"貴族":{"zh-Hant":"貴族","zh-Hans":"贵族",en:"Noble",ja:"貴族"},"研究者":{"zh-Hant":"研究者","zh-Hans":"研究者",en:"Researcher",ja:"研究者"},"反派陣營":{"zh-Hant":"反派陣營","zh-Hans":"反派阵营",en:"Antagonist Faction",ja:"敵対陣営"}
 };
 const local=v=>enums[String(v)]?.[locale]??String(v??"");
 const lines=(title,rows)=>rows?.length?`<div class="contract-group"><small>${esc(title)}</small><p>${rows.map(esc).join("<br>")}</p></div>`:"";
 const m=contract.metrics,f=contract.difficultyFlags;
 const structure=m?[`${text.civilization} ${m.civilization}/10 · ${text.technology} ${m.technology}/10 · ${text.magic} ${m.magic}/10`,`${text.civilizations} ${m.civilizations} · ${text.species} ${m.species} · ${text.languages} ${m.languages}`,`${text.politics} ${m.politicalUnity}/10 · ${text.religion} ${m.religion}/10 · ${text.resources} ${m.resources}/10`,`${text.danger} ${m.danger}/10 · ${text.survival} ${m.survival}/10 · ${text.unknownArea} ${m.unknownRatio}% · ${m.warState}`]:contract.structure;
 const rules=f?[f.hunger?text.hungerOn:text.hungerOff,f.fatigue?text.fatigueOn:text.fatigueOff,f.statusEffects?text.statusOn:text.statusOff,f.savePolicy==="AUTO_ONLY"?text.autoSave:text.freeSave,f.languageBarrier==="HIGH"?text.langHigh:f.languageBarrier==="LOW"?text.langLow:text.langStd,f.permadeath?text.deathOn:text.deathOff]:contract.difficultyRules;
 const unknown=m?text.unknownRows:contract.unknown;
 return `<div class="eyebrow">WORLD CREATION 2.0</div><h2>${esc(text.title)}</h2><p class="muted">${esc(text.intro)}</p><div class="contract-summary"><div><small>${esc(text.world)}</small><strong>${esc(local(contract.worldStyle))} · ${esc(local(contract.worldScale))}</strong></div><div><small>${esc(text.difficulty)}</small><strong>${esc(local(contract.difficulty))}</strong></div><div><small>${esc(text.origin)}</small><strong>${esc(local(contract.origin))}</strong></div><div><small>${esc(text.role)}</small><strong>${esc(local(contract.role))}</strong></div></div>${lines(text.structure,structure)}${lines(text.rules,rules)}${lines(text.story,contract.storyPreferences)}${lines(text.required,contract.required)}${lines(text.allowed,contract.allowed)}${lines(text.forbidden,contract.forbidden)}${lines(text.unknown,unknown)}<div class="contract-actions"><button id="editWorldContract" class="secondary" type="button">${esc(text.edit)}</button><button id="acceptWorldContract" class="primary" type="button">${esc(text.accept)}</button></div>`
}
'''
s=s[:start]+replacement+'\n'
wr(p,s)

# 3. Cache graph and release contract.
for p,old,new in [
 ('src/ai-settings.js','./locale-runtime.js?v=59002','./locale-runtime.js?v=59003'),
 ('src/ai-client.js','./ai-settings.js?v=59002','./ai-settings.js?v=59003'),
 ('src/ai-client.js','./locale-runtime.js?v=59002','./locale-runtime.js?v=59003'),
 ('src/ai-autotest.js','./ai-settings.js?v=59002','./ai-settings.js?v=59003'),
]: rep(p,old,new)

p='app.js'; s=rd(p)
for old,new in [
 ('./src/version.js?v=59002','./src/version.js?v=59003'),
 ('./src/locale-runtime.js?v=59002','./src/locale-runtime.js?v=59003'),
 ('./src/ai-settings.js?v=59002','./src/ai-settings.js?v=59003'),
 ('./src/ai-client.js?v=59002','./src/ai-client.js?v=59003'),
 ('./src/ai-autotest.js?v=59002','./src/ai-autotest.js?v=59003'),
 ('./src/world-creation.js?v=57025','./src/world-creation.js?v=59003'),
]:
    if old not in s: raise SystemExit(f'app cache anchor missing {old}')
    s=s.replace(old,new,1)
wr(p,s)
rep('index.html','app.js?v=59002','app.js?v=59003')
rep('package.json','"version": "0.59.2"','"version": "0.59.3"')
rep('src/version.js','APP_VERSION="0.59.2"','APP_VERSION="0.59.3"')

# Current release tests.
for p in ['test/version-0551-release.test.js','test/version-ui.test.js','test/v05901-i18n-coverage.test.js']:
    s=rd(p).replace('0.59.2','0.59.3').replace('59002','59003')
    wr(p,s)

# Permanent regression coverage.
(ROOT/'test/v05903-locale-completeness.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {worldContractHtml} from "../src/world-creation.js";
import {hasLocaleLeak,registerLocalizedOutput,isRuntimeLocalized,missingVisibleTranslations} from "../src/locale-runtime.js";

const contract={title:"世界契約",worldStyle:"王道奇幻",worldScale:"中型",difficulty:"普通",origin:"穿越",role:"普通人",metrics:{civilization:6,technology:4,magic:8,civilizations:4,species:4,languages:5,politicalUnity:4,religion:6,resources:6,danger:6,survival:4,unknownRatio:55,warState:"TENSION"},difficultyFlags:{hunger:true,fatigue:true,statusEffects:true,savePolicy:"FREE",languageBarrier:"STANDARD",permadeath:false},storyPreferences:[],required:[],allowed:[],forbidden:[],unknown:[]};

test("v0.59.3 World Contract is fully localized in Japanese",()=>{globalThis.ELYNDRA_LOCALE="ja";const html=worldContractHtml(contract);assert.match(html,/世界構造/);assert.match(html,/難易度ルール/);assert.match(html,/この世界へ渡る/);assert.doesNotMatch(html,/(?:仍然未知|難度規則|文明程度|科技 4|飢餓系統|返回修改|穿越到這個世界|玩家選擇)/)});
test("v0.59.3 World Contract is fully localized in English",()=>{globalThis.ELYNDRA_LOCALE="en";const html=worldContractHtml(contract);assert.match(html,/World Contract/);assert.match(html,/World Structure/);assert.match(html,/Enter This World/);assert.doesNotMatch(html,/[㐀-鿿぀-ヿ]/u)});
test("v0.59.3 mixed Japanese-Chinese AI output is not trusted as localized",()=>{const mixed="眼前的風が常に吹き荒れる荒れた丘陵地帯";assert.equal(hasLocaleLeak(mixed,"ja"),true);registerLocalizedOutput(mixed,"ja");assert.equal(isRuntimeLocalized(mixed,"ja"),false);const state={world:{language:"ja",registry:{npcs:[],locations:[{known:true,name:mixed,description:""}]}},localization:{sourceLocale:"ja",displayLocale:"ja",translations:{ja:{}}},quests:{main:{objectives:[]}},suggestions:[],inventory:[],notes:[]};assert.ok(missingVisibleTranslations(state,"ja").strings.includes(mixed))});
''',encoding='utf-8')

# Pages focused gate.
p='.github/workflows/pages.yml'; s=rd(p)
s=s.replace('Focused v0.59.2 regressions','Focused v0.59.3 regressions')
s=s.replace('node --test test/v05902-world-compile-i18n-notes.test.js','node --test test/v05903-locale-completeness.test.js test/v05902-world-compile-i18n-notes.test.js')
wr(p,s)

# Release docs / README.
p='README.md'; s=rd(p).replace('目前版本：**v0.59.2**','目前版本：**v0.59.3**',1)
anchor='## v0.59.2 重點'
if anchor in s and '## v0.59.3 重點' not in s:
    s=s.replace(anchor,'## v0.59.3 重點\n\nv0.59.3 完成多語言可見層補強：World Contract 以 Engine deterministic locale renderer 顯示繁中／簡中／英文／日文；AI 或 Engine 動態文字若混入非目標語言，將不再被誤標為已翻譯，而會進入 residual translation gate。\n\n'+anchor,1)
wr(p,s)
(ROOT/'docs/releases/v0.59.3.md').write_text('''# Elyndra v0.59.3\n\n## Locale completeness hotfix\n\n- World Contract now renders deterministically in Traditional Chinese, Simplified Chinese, English, or Japanese.\n- Contract metrics, difficulty rules, unknown-state labels, origin, role, difficulty, and action buttons no longer inherit Traditional-Chinese presentation text in non-default locales.\n- Added locale contamination detection so mixed output such as `眼前的風が...` is not trusted as already-localized Japanese.\n- Same-locale worlds now send contaminated visible strings through the residual AI translation gate.\n- Added permanent v0.59.3 regression coverage and advanced browser cache contract to `59003`.\n''',encoding='utf-8')
print('v0.59.3 locale completeness patch applied')
