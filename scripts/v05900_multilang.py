from pathlib import Path
import json
import re

ROOT=Path('.')

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def replace_once(path,old,new):
    text=read(path); count=text.count(old)
    if count!=1: raise SystemExit(f'{path}: expected exactly one match, got {count}: {old[:120]!r}')
    write(path,text.replace(old,new,1))
def replace_all(path,old,new,min_count=1):
    text=read(path); count=text.count(old)
    if count<min_count: raise SystemExit(f'{path}: expected at least {min_count} matches, got {count}: {old[:120]!r}')
    write(path,text.replace(old,new))
def insert_before(path,marker,block):
    text=read(path)
    if block.strip() in text: return
    if marker not in text: raise SystemExit(f'{path}: marker not found: {marker[:120]!r}')
    write(path,text.replace(marker,block+marker,1))
def append_once(path,marker,block):
    text=read(path)
    if marker in text: return
    write(path,text.rstrip()+"\n\n"+block.strip()+"\n")

# ---- release version -------------------------------------------------------
pkg=json.loads(read('package.json'))
if pkg.get('version') not in {'0.58.0','0.59.0'}: raise SystemExit(f'unexpected package version {pkg.get("version")}')
pkg['version']='0.59.0'; write('package.json',json.dumps(pkg,ensure_ascii=False,indent=2)+"\n")
write('src/version.js','export const APP_VERSION="0.59.0";\n')

# ---- locale runtime: runtime identity tracking + DOM projection -----------
path='src/locale-runtime.js'
text=read(path)
if 'const RUNTIME_LOCALIZED=new Map();' not in text:
    text=text.replace('const NODE_SOURCE=new WeakMap(),ATTR_SOURCE=new WeakMap();','const NODE_SOURCE=new WeakMap(),ATTR_SOURCE=new WeakMap();\nconst RUNTIME_LOCALIZED=new Map();',1)
if 'export function registerLocalizedOutput' not in text:
    anchor='export function uiText(source,locale=loadLocale()){const key=canonicalUiKey(source),id=normalizeLocale(locale);return UI[key]?.[id]??String(source??"")}\n'
    block='''export function registerLocalizedOutput(value,locale=loadLocale()){
 const id=normalizeLocale(locale),set=RUNTIME_LOCALIZED.get(id)??new Set();RUNTIME_LOCALIZED.set(id,set);
 const add=v=>{if(v==null)return;if(typeof v==="string"){const raw=v.trim();if(raw){set.add(translationKey(raw));try{const parsed=JSON.parse(raw);if(parsed&&typeof parsed==="object")add(parsed)}catch{}}return}if(Array.isArray(v)){for(const x of v)add(x);return}if(typeof v==="object")for(const x of Object.values(v))add(x)};add(value);return set.size
}
export function isRuntimeLocalized(value,locale=loadLocale()){const text=String(value??"").trim();return !text||Boolean(RUNTIME_LOCALIZED.get(normalizeLocale(locale))?.has(translationKey(text)))}
'''
    if anchor not in text: raise SystemExit('locale runtime uiText anchor missing')
    text=text.replace(anchor,anchor+block,1)
text=text.replace('if(loc.sourceLocale===id)return true;return Boolean(loc.translations?.[id]?.[translationKey(text)])','if(loc.sourceLocale===id||isRuntimeLocalized(text,id))return true;return Boolean(loc.translations?.[id]?.[translationKey(text)])')
text=text.replace('if(loc.sourceLocale===id)return text;return loc.translations?.[id]?.[translationKey(text)]||text','if(loc.sourceLocale===id||isRuntimeLocalized(text,id))return text;return loc.translations?.[id]?.[translationKey(text)]||text')
old='const id=normalizeLocale(targetLocale),loc=ensureWorldLocale(state,id),table=loc.translations[id]??={};const rows=Array.isArray(bundle?.translations)?bundle.translations:[];\n for(const item of rows){const source=String(item?.source??"").trim(),translated=String(item?.translated??"").trim();if(source&&translated)table[translationKey(source)]=translated}'
new='const id=normalizeLocale(targetLocale),loc=ensureWorldLocale(state,id),table=loc.translations[id]??={},sources=loc.translationSources??={};loc.translationSources=sources;sources[id]??={};const rows=Array.isArray(bundle?.translations)?bundle.translations:[];\n for(const item of rows){const source=String(item?.source??"").trim(),translated=String(item?.translated??"").trim();if(source&&translated){const key=translationKey(source);table[key]=translated;sources[id][key]=source;registerLocalizedOutput(translated,id)}}'
if old in text: text=text.replace(old,new,1)
if 'export function applyWorldLocaleToDocument' not in text:
    text += '''\nexport function translatedCompositeText(state,value,locale=loadLocale()){
 const text=String(value??"");if(!state||!text)return text;const exact=translatedText(state,text,locale);if(exact!==text)return exact;const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id);if(loc.sourceLocale===id)return text;const table=loc.translations?.[id]||{},sources=loc.translationSources?.[id]||{};let out=text;const entries=Object.entries(sources).map(([key,source])=>[source,table[key]]).filter(([source,target])=>source&&target&&source!==target).sort((a,b)=>b[0].length-a[0].length);for(const [source,target] of entries)if(source.length>1&&out.includes(source))out=out.split(source).join(target);return out
}
export function applyWorldLocaleToDocument(state,locale=loadLocale(),root=document){
 if(!state||typeof document==="undefined")return;const base=root.body||root,doc=base.ownerDocument||root,filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(parent.tagName))continue;const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;const localized=translatedCompositeText(state,trim,locale);if(localized!==trim)node.nodeValue=raw.replace(trim,localized)}
}
'''
write(path,text)

# ---- index: language selector + structural narrator placement --------------
path='index.html'
text=read(path)
text=text.replace('styles.css?v=58000','styles.css?v=59000').replace('app.js?v=58000','app.js?v=59000')
header='<div class="topbar-context" aria-live="polite"><span id="topLocation">未知之地</span><span class="topbar-dot">◆</span><span id="topTime">時序未知</span></div>\n<span id="aiBadge" class="status">LOCAL</span>'
header_new='<div class="topbar-context" aria-live="polite"><span id="topLocation">未知之地</span><span class="topbar-dot">◆</span><span id="topTime">時序未知</span></div>\n<label class="language-control"><span>語言</span><select id="languageSelect" aria-label="語言"><option value="zh-Hant">繁體中文</option><option value="zh-Hans">簡體中文</option><option value="en">English</option><option value="ja">日本語</option></select></label>\n<span id="aiBadge" class="status">LOCAL</span>'
if header in text: text=text.replace(header,header_new,1)
old='''<div class="scene-art"><div class="scene-atmosphere" aria-hidden="true"></div><div class="scene-copy">
<div class="scene-meta"><span id="location" class="location"></span><span id="weather" class="weather-chip" data-danger="0"></span></div>
<h2 id="sceneTitle">理解眼前狀況</h2><p id="narrative"></p></div></div>
<div class="decision-panel">'''
new='''<div class="scene-art"><div class="scene-atmosphere" aria-hidden="true"></div><div class="scene-copy">
<div class="scene-meta"><span id="location" class="location"></span><span id="weather" class="weather-chip" data-danger="0"></span></div>
<h2 id="sceneTitle">理解眼前狀況</h2></div></div>
<div class="narrative-panel" aria-live="polite"><p id="narrative"></p></div>
<div class="decision-panel">'''
if old not in text: raise SystemExit('index narrator structure anchor missing')
text=text.replace(old,new,1)
write(path,text)

# ---- CSS: narrator must always occupy row immediately above actions --------
path='styles.css'
text=read(path)
text=text.replace('.scene-copy p[data-recovery]:after','#narrative[data-recovery]:after').replace('.scene-copy p[data-thinking]:after','#narrative[data-thinking]:after')
write(path,text)
append_once(path,'/* v0.59.0 structural narrator row + language control */',r'''
/* v0.59.0 structural narrator row + language control */
.language-control{display:flex;align-items:center;gap:7px;margin-left:auto;font-size:10px;letter-spacing:.08em;color:var(--muted)}
.language-control select{width:auto;min-width:118px;padding:7px 28px 7px 9px;border-radius:999px;background:#0a0f19;border:1px solid var(--line);color:var(--text);font-size:11px}
#game .scene{display:grid!important;grid-template-rows:minmax(0,1fr) auto auto!important;gap:10px!important}
#game .scene-art{grid-row:1!important;min-height:0!important}
#game .scene-copy{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-end!important;height:100%!important;pointer-events:none}
#game .scene-copy .scene-meta,#game .scene-copy h2{position:static!important}
#game .narrative-panel{grid-row:2!important;position:relative!important;z-index:3!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important}
#game .narrative-panel #narrative{position:static!important;display:block!important;width:100%!important;max-width:none!important;min-height:58px!important;margin:0!important;padding:13px 16px!important;color:#d8dde6!important;line-height:1.65!important;background:rgba(5,8,13,.92)!important;border:1px solid rgba(215,179,106,.24)!important;border-left:2px solid var(--gold)!important;border-radius:10px!important;backdrop-filter:blur(10px)!important;transform:none!important;inset:auto!important;overflow-wrap:anywhere!important}
#game .decision-panel{grid-row:3!important;position:relative!important;z-index:2!important;margin:0!important}
body.locale-transition #game .decision-panel{pointer-events:none;opacity:.45}
body.locale-transition #game .narrative-panel #narrative:before{content:"…";display:block;color:var(--gold);letter-spacing:.2em}
@media(max-width:900px){.language-control span{display:none}.language-control select{min-width:96px}.topbar{gap:9px}#game .scene{grid-template-rows:minmax(320px,1fr) auto auto!important}}
@media(max-width:620px){.language-control{margin-left:auto}.language-control select{min-width:82px;max-width:105px;padding:6px 22px 6px 7px}#game .narrative-panel #narrative{min-height:52px!important;padding:11px 12px!important}}
''')

# ---- ai-settings: central output-language override -------------------------
path='src/ai-settings.js'; text=read(path)
if 'locale-runtime.js?v=59000' not in text:
    text=text.replace('import {recordAIUsage,recordDebug} from "./debug-telemetry.js?v=57025";','import {recordAIUsage,recordDebug} from "./debug-telemetry.js?v=57025";\nimport {loadLocale,normalizeLocale,languageContract,registerLocalizedOutput} from "./locale-runtime.js?v=59000";',1)
text=text.replace('const AI_TASK_TIER={action:"FAST",narration:"FAST",helper:', 'const AI_TASK_TIER={action:"FAST",narration:"FAST",translation:"FAST",helper:',1)
old='''export async function directChat(args){
 const s=loadAISettings();'''
new='''export async function directChat(args){
 const locale=normalizeLocale(args?.locale||loadLocale()),runtimeLanguage=languageContract(locale);args={...args,locale,system:String(args?.system||"").trim()+"\\n\\n"+runtimeLanguage};
 const s=loadAISettings();'''
if old not in text: raise SystemExit('ai-settings directChat anchor missing')
text=text.replace(old,new,1)
old='return result}\n  catch(e){const backgroundPaused='
new='registerLocalizedOutput(result,locale);return result}\n  catch(e){const backgroundPaused='
if old not in text: raise SystemExit('ai-settings result anchor missing')
text=text.replace(old,new,1)
write(path,text)

# ---- ai-client: locale forwarding + translation service --------------------
path='src/ai-client.js'; text=read(path)
text=text.replace('from "./ai-settings.js?v=57025"','from "./ai-settings.js?v=59000"',1)
if 'locale-runtime.js?v=59000' not in text:
    anchor='import {WORLD_TRADITIONAL_CHINESE_CONTRACT,simplifiedChineseLeak} from "./traditional-chinese-guard.js?v=57025";'
    text=text.replace(anchor,anchor+'\nimport {loadLocale,normalizeLocale,languageContract,registerLocalizedOutput} from "./locale-runtime.js?v=59000";',1)
old='body:JSON.stringify(body)'
new='body:JSON.stringify({...body,locale:normalizeLocale(body?.locale||loadLocale())})'
if old not in text: raise SystemExit('ai-client post body anchor missing')
text=text.replace(old,new,1)
old='if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||`AI_HTTP_${r.status}`);return r.json()'
new='if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||`AI_HTTP_${r.status}`);const data=await r.json();registerLocalizedOutput(data,normalizeLocale(body?.locale||loadLocale()));return data'
if old not in text: raise SystemExit('ai-client post response anchor missing')
text=text.replace(old,new,1)
anchor='export async function aiHealth(){if(hasDirectAI())return {ok:true,aiConfigured:true,mode:"direct"};try{const r=await fetch(apiPath("/api/health"));return r.ok?await r.json():{ok:false,aiConfigured:false}}catch{return {ok:false,aiConfigured:false}}}\n'
if anchor not in text: raise SystemExit('ai-client aiHealth anchor missing')
translate='''export async function translateVisibleWorld(payload,targetLocale=loadLocale()){
 const target=normalizeLocale(targetLocale),source=normalizeLocale(payload?.sourceLocale),strings=Array.isArray(payload?.strings)?payload.strings.map(x=>String(x??"").trim()).filter(Boolean).slice(0,220):[];
 if(!strings.length)return {translations:[]};if(source===target)return {translations:strings.map(source=>({source,translated:source}))};
 const request={sourceLocale:source,targetLocale:target,strings},system=`You are Elyndra's lossless runtime translator. Translate each input string into the target language. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries. Do not add lore, answer the text, summarize, or expose hidden information. Keep output aligned by input index. Return JSON only as {"translations":["..."]}. ${languageContract(target)}`;
 if(!hasDirectAI())return post("/api/translate",request);
 const raw=await directChat({aiTask:"translation",locale:target,timeoutMs:60000,maxOutputTokens:4096,temperature:.05,system,user:JSON.stringify(request)}),parsed=parseJSON(raw),rows=Array.isArray(parsed?.translations)?parsed.translations:[];
 if(rows.length!==strings.length)throw new Error("TRANSLATION_COUNT_MISMATCH");const bundle={translations:strings.map((source,i)=>({source,translated:String(rows[i]??"").trim()||source}))};registerLocalizedOutput(bundle,target);return bundle
}
'''
text=text.replace(anchor,anchor+translate,1)
write(path,text)

# ---- server API: request-local language contract ---------------------------
path='api/_ai.js'; text=read(path)
if '../src/locale-runtime.js' not in text:
    text=text.replace('import {timingSafeEqual} from "node:crypto";','import {timingSafeEqual} from "node:crypto";\nimport {DEFAULT_LOCALE,normalizeLocale,languageContract} from "../src/locale-runtime.js";',1)
old='export function safeBody(req){const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});const max='
new='export function safeBody(req){const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});req.elyndraLocale=normalizeLocale(body?.locale||DEFAULT_LOCALE);const max='
if old not in text: raise SystemExit('_ai safeBody anchor missing')
text=text.replace(old,new,1)
old='export async function callModel({system,user,temperature=.7,timeoutMs=30000,maxOutputTokens=1200,signal=null}){const endpoint='
new='export async function callModel({system,user,temperature=.7,timeoutMs=30000,maxOutputTokens=1200,signal=null,locale=DEFAULT_LOCALE}){system=String(system||"").trim()+"\\n\\n"+languageContract(normalizeLocale(locale));const endpoint='
if old not in text: raise SystemExit('_ai callModel anchor missing')
text=text.replace(old,new,1)
write(path,text)
for api in Path('api').glob('*.js'):
    if api.name in {'_ai.js','translate.js'}: continue
    t=api.read_text(encoding='utf-8')
    t=t.replace('callModel({signal:req.elyndraSignal,system:', 'callModel({signal:req.elyndraSignal,locale:req.elyndraLocale,system:')
    api.write_text(t,encoding='utf-8')
# world.js had stageJSON outside handler but referenced req; make request explicit.
path='api/world.js'; text=read(path)
if 'async function stageJSON(req,diagnostics,stage' not in text:
    text=text.replace('async function stageJSON(diagnostics,stage,','async function stageJSON(req,diagnostics,stage,',1)
    text=text.replace('stageJSON(diagnostics,','stageJSON(req,diagnostics,')
write(path,text)

# ---- app runtime wiring -----------------------------------------------------
path='app.js'; text=read(path)
text=text.replace('import {APP_VERSION} from "./src/version.js?v=58000";','import {APP_VERSION} from "./src/version.js?v=59000";\nimport {SUPPORTED_LOCALES,loadLocale,saveLocale,normalizeLocale,uiText,applyDocumentLocale,ensureWorldLocale,translatedText,missingVisibleTranslations,applyTranslationBundle,applyWorldLocaleToDocument} from "./src/locale-runtime.js?v=59000";',1)
text=text.replace('from "./src/ai-settings.js?v=57025"','from "./src/ai-settings.js?v=59000"',1)
text=text.replace('askTravelHelper,assessPlayerAction,fastLocalActionAssessment} from "./src/ai-client.js?v=58000"','askTravelHelper,assessPlayerAction,fastLocalActionAssessment,translateVisibleWorld} from "./src/ai-client.js?v=59000"',1)
old='const $=s=>document.querySelector(s),qsa=s=>Array.from(document.querySelectorAll(s));let gameState=null,aiStatus={ok:false,aiConfigured:false},aiBusy=false,turnSyncBusy=false,turnSyncLabel="",helperHistory=[],npcChatHistory=new Map();'
new='const $=s=>document.querySelector(s),qsa=s=>Array.from(document.querySelectorAll(s));let gameState=null,aiStatus={ok:false,aiConfigured:false},aiBusy=false,turnSyncBusy=false,turnSyncLabel="",helperHistory=[],npcChatHistory=new Map();\nlet activeLocale=saveLocale(loadLocale()),localeTransitionBusy=false;globalThis.ELYNDRA_LOCALE=activeLocale;const lt=value=>gameState?translatedText(gameState,value,activeLocale):String(value??"");'
if old not in text: raise SystemExit('app state anchor missing')
text=text.replace(old,new,1)
text=text.replace('recordDebug("APP_BOOT",{version:APP_VERSION,href:location.href});','recordDebug("APP_BOOT",{version:APP_VERSION,href:location.href,locale:activeLocale});\napplyDocumentLocale(activeLocale);',1)
# migration keeps canonical source language separate from UI language.
text=text.replace('function migrate(s){ensureStateSyncRuntime(s);','function migrate(s){ensureWorldLocale(s,activeLocale);ensureStateSyncRuntime(s);',1)
# translation barrier inserted immediately before escaping helper, after AI lock helpers exist.
marker='const esc=s=>String(s??"").replaceAll("&","&amp;")'
block='''async function ensureGameplayLocale(reason="runtime"){
 if(!gameState)return true;const pending=missingVisibleTranslations(gameState,activeLocale),loc=ensureWorldLocale(gameState,activeLocale);if(!pending.strings.length){loc.displayLocale=activeLocale;return true}
 if(localeTransitionBusy)return false;if(!aiStatus.aiConfigured){recordDebug("LOCALE_TRANSLATION_BLOCKED",{reason,targetLocale:activeLocale,sourceLocale:loc.sourceLocale,pending:pending.strings.length});return false}
 localeTransitionBusy=true;document.body.classList.add("locale-transition");setAIThinking(true,uiText("正在翻譯世界…",activeLocale));
 try{const bundle=await translateVisibleWorld(pending,activeLocale);applyTranslationBundle(gameState,activeLocale,bundle);const left=missingVisibleTranslations(gameState,activeLocale);if(left.strings.length)throw new Error("TRANSLATION_INCOMPLETE:"+left.strings.length);await saveWorld(gameState);recordDebug("LOCALE_TRANSLATION_READY",{reason,targetLocale:activeLocale,sourceLocale:loc.sourceLocale,count:bundle.translations?.length||0});return true}
 catch(error){recordDebug("LOCALE_TRANSLATION_FAILED",{reason,targetLocale:activeLocale,sourceLocale:loc.sourceLocale,error:error?.message||String(error)});return false}
 finally{localeTransitionBusy=false;document.body.classList.remove("locale-transition");setAIThinking(false)}
}
'''
if marker not in text: raise SystemExit('app esc marker missing')
text=text.replace(marker,block+marker,1)
# refresh becomes a locale gate and returns readiness.
old='async function refresh(){const exists=await hasWorld().catch(()=>false);$("#continueBtn").disabled=!exists;updateAIStatusBadge();if(!gameState)return;migrate(gameState);recordGameplayStateChanges(gameState);'
new='async function refresh({skipLocale=false}={}){const exists=await hasWorld().catch(()=>false);$("#continueBtn").disabled=!exists;updateAIStatusBadge();if(!gameState){applyDocumentLocale(activeLocale);return true}migrate(gameState);if(!skipLocale){const ready=await ensureGameplayLocale("refresh");if(!ready)return false}recordGameplayStateChanges(gameState);'
if old not in text: raise SystemExit('app refresh prefix anchor missing')
text=text.replace(old,new,1)
# player-facing core fields use translation projection, not Canon mutation.
repls={
'$("#worldName").textContent=gameState.player?.worldNameKnown?gameState.world.name:"未知世界";':'$("#worldName").textContent=gameState.player?.worldNameKnown?lt(gameState.world.name):uiText("未知世界",activeLocale);',
'if($("#topLocation"))$("#topLocation").textContent=playerVisibleLocationName(gameState);':'if($("#topLocation"))$("#topLocation").textContent=lt(playerVisibleLocationName(gameState));',
'$("#currencyLabel").textContent="資產";':'$("#currencyLabel").textContent=uiText("資產",activeLocale);',
'$("#location").textContent=playerVisibleLocationName(gameState);':'$("#location").textContent=lt(playerVisibleLocationName(gameState));',
'$("#sceneTitle").textContent=gameState.sceneTitle||deriveSceneTitle(gameState);':'$("#sceneTitle").textContent=lt(gameState.sceneTitle||deriveSceneTitle(gameState));',
'$("#narrative").textContent=gameState.narrative;':'$("#narrative").textContent=lt(gameState.narrative);',
'$("#questTitle").textContent=gameState.quests.main.title;':'$("#questTitle").textContent=lt(gameState.quests.main.title);',
'$("#questText").textContent=gameState.quests.main.objectives[0]||"";':'$("#questText").textContent=lt(gameState.quests.main.objectives[0]||"");'
}
for old,new in repls.items():
    if old not in text: raise SystemExit('app player-facing anchor missing: '+old)
    text=text.replace(old,new,1)
text=text.replace('free.placeholder="自由行動：描述你想做的事……"','free.placeholder=uiText("自由行動：描述你想做的事……",activeLocale)')
text=text.replace('esc(p.label)','esc(lt(p.label))').replace('esc(p.meta)','esc(lt(p.meta))').replace('esc(p.approach)','esc(lt(p.approach))')
text=text.replace('visibleName=playerVisibleNpcName(gameState,n);','visibleName=lt(playerVisibleNpcName(gameState,n));')
text=text.replace('const visibleName=playerVisibleNpcName(gameState,npc),','const visibleName=lt(playerVisibleNpcName(gameState,npc)),')
text=text.replace('esc(n.role||"")','esc(lt(n.role||""))')
text=text.replace('esc(answer||npc.description||npc.role||"")','esc(lt(answer||npc.description||npc.role||""))')
# every normal refresh reapplies static UI translations and cached world projection.
old='if(document.body.dataset.screen==="game"&&!aiBusy&&!turnSyncBusy){scheduleWorldEvolution("gameplay_idle",1600);scheduleHistoryDeepening("knowledge_refresh",2100)}}'
new='if(document.body.dataset.screen==="game"&&!aiBusy&&!turnSyncBusy){scheduleWorldEvolution("gameplay_idle",1600);scheduleHistoryDeepening("knowledge_refresh",2100)}applyDocumentLocale(activeLocale);applyWorldLocaleToDocument(gameState,activeLocale);return true}'
if old not in text: raise SystemExit('app refresh suffix anchor missing')
text=text.replace(old,new,1)
# Modal content is localized after every render.
old='function openModal(html){modalRestoreFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden");requestAnimationFrame'
new='function openModal(html){modalRestoreFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden");applyDocumentLocale(activeLocale,$("#modal"));if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,$("#modal"));requestAnimationFrame'
if old not in text: raise SystemExit('app openModal anchor missing')
text=text.replace(old,new,1)
# New worlds record their immutable source language.
old='replaceGameState(newGame(seed),"NEW_WORLD");applyWorldCreationState(gameState,seed);'
new='replaceGameState(newGame(seed),"NEW_WORLD");applyWorldCreationState(gameState,seed);ensureWorldLocale(gameState,activeLocale);gameState.localization.sourceLocale=activeLocale;gameState.localization.displayLocale=activeLocale;gameState.world.language=activeLocale;'
if old not in text: raise SystemExit('app new world anchor missing')
text=text.replace(old,new,1)
# Continue requires translation readiness before entering a mismatched-language world.
old='$("#newWorldBtn").onclick=()=>show("creator");$("#continueBtn").onclick=async()=>{replaceGameState(migrate(await loadWorld()),"CONTINUE_AUTOSAVE");if(!gameState)return;const report=validateWorld(gameState.world);if(!report.valid)return alert("存檔世界完整性驗證失敗："+report.errors.join(", "));aiStatus=await aiHealth();await refresh();show("game");scheduleWorldQualityCritic("continue_world",1200);scheduleHistoryDeepening("continue_world",1500)};qsa("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));'
new='''$("#newWorldBtn").onclick=()=>show("creator");$("#continueBtn").onclick=async()=>{replaceGameState(migrate(await loadWorld()),"CONTINUE_AUTOSAVE");if(!gameState)return;const report=validateWorld(gameState.world);if(!report.valid)return alert("存檔世界完整性驗證失敗："+report.errors.join(", "));aiStatus=await aiHealth();const ready=await refresh();if(!ready)return alert(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));show("game");scheduleWorldQualityCritic("continue_world",1200);scheduleHistoryDeepening("continue_world",1500)};qsa("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));
const languageSelect=$("#languageSelect");if(languageSelect){languageSelect.value=activeLocale;languageSelect.onchange=async()=>{const previous=activeLocale,next=normalizeLocale(languageSelect.value);if(next===previous)return;activeLocale=saveLocale(next);applyDocumentLocale(activeLocale);helperHistory=[];npcChatHistory.clear();closeModal();recordDebug("LOCALE_SWITCH_REQUESTED",{from:previous,to:next,worldId:gameState?.world?.id||null});if(!gameState){applyDocumentLocale(activeLocale);return}aiStatus=await aiHealth();const ready=await ensureGameplayLocale("language_switch");if(!ready){activeLocale=saveLocale(previous);languageSelect.value=previous;applyDocumentLocale(previous);await refresh({skipLocale:true});alert(uiText("需要 AI 才能把目前世界切換到所選語言。",previous));return}await saveWorld(gameState);await refresh({skipLocale:true});recordDebug("LOCALE_SWITCH_APPLIED",{from:previous,to:next})}}'''
if old not in text: raise SystemExit('app continue anchor missing')
text=text.replace(old,new,1)
write(path,text)

# ---- current release tests -------------------------------------------------
path='test/version-0551-release.test.js'; text=read(path)
text=text.replace('// Official v0.58.0 release contract; this file also anchors the final Pages deployment check.','// Official v0.59.0 release contract; this file also anchors the final Pages deployment check.')
text=text.replace('test("v0.58.0 is the canonical app and browser cache release"','test("v0.59.0 is the canonical app and browser cache release"')
text=text.replace('assert.equal(pkg.version,"0.58.0")','assert.equal(pkg.version,"0.59.0")').replace('/APP_VERSION="0\\.58\\.0"/','/APP_VERSION="0\\.59\\.0"/')
text=text.replace('/app\\.js\\?v=58000/','/app\\.js\\?v=59000/').replace('/styles\\.css\\?v=58000/','/styles\\.css\\?v=59000/')
text=text.replace('["57025","57026","57028","57029","58000"]','["57025","57026","57028","57029","58000","59000"]')
text=text.replace('/\\.\\/src\\/version\\.js\\?v=58000/','/\\.\\/src\\/version\\.js\\?v=59000/')
text=text.replace('assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));','assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59000"));')
write(path,text)
path='test/version-ui.test.js'; text=read(path)
text=text.replace('// v0.58.0 release contract','// v0.59.0 release contract').replace('assert.equal(pkg.version,"0.58.0")','assert.equal(pkg.version,"0.59.0")')
text=text.replace('/app\\.js\\?v=58000/','/app\\.js\\?v=59000/',1).replace('"\\.\\/src\\/version\\.js\\?v=58000"','"\\.\\/src\\/version\\.js\\?v=59000"',1)
text=text.replace('/\\.\\/src\\/ai-client\\.js\\?v=58000/','/\\.\\/src\\/ai-client\\.js\\?v=59000/')
write(path,text)

# New focused multilingual + layout contracts.
Path('test/v05900-multilingual-runtime.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {SUPPORTED_LOCALES,languageContract,ensureWorldLocale,applyTranslationBundle,translatedText,missingVisibleTranslations,registerLocalizedOutput} from "../src/locale-runtime.js";

test("v0.59.0 keeps four locale channels isolated",()=>{
 assert.deepEqual(Object.keys(SUPPORTED_LOCALES),["zh-Hant","zh-Hans","en","ja"]);
 const contracts=Object.keys(SUPPORTED_LOCALES).map(languageContract);assert.equal(new Set(contracts).size,4);for(const c of contracts)assert.match(c,/RUNTIME LANGUAGE OVERRIDE/);
 const state={world:{name:"霧城",registry:{npcs:[],locations:[]}},sceneTitle:"鐘聲停止",narrative:"街道突然安靜。",quests:{main:{title:"活下來",objectives:["尋找安全地點"]}},suggestions:["觀察四周"],inventory:[]};
 const loc=ensureWorldLocale(state,"zh-Hant");loc.sourceLocale="zh-Hant";loc.displayLocale="zh-Hant";
 applyTranslationBundle(state,"en",{translations:[{source:"街道突然安靜。",translated:"The street suddenly falls silent."}]});
 applyTranslationBundle(state,"ja",{translations:[{source:"街道突然安靜。",translated:"通りが突然静まり返る。"}]});
 assert.equal(translatedText(state,"街道突然安靜。","en"),"The street suddenly falls silent.");
 assert.equal(translatedText(state,"街道突然安靜。","ja"),"通りが突然静まり返る。");
 assert.equal(translatedText(state,"街道突然安靜。","zh-Hant"),"街道突然安靜。");
 assert.equal(state.narrative,"街道突然安靜。");
 registerLocalizedOutput("A new English narration appears.","en");assert.equal(missingVisibleTranslations({...state,narrative:"A new English narration appears."},"en").strings.includes("A new English narration appears."),false);
});

test("v0.59.0 narrator is structurally above the action panel",async()=>{
 const [html,css,app,settings,client,server]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../api/_ai.js",import.meta.url),"utf8")
 ]);
 const artEnd=html.indexOf('</div></div>\n<div class="narrative-panel"'),narrative=html.indexOf('id="narrative"'),decision=html.indexOf('<div class="decision-panel">');
 assert.ok(artEnd>0&&narrative>artEnd&&decision>narrative);assert.doesNotMatch(html,/<div class="scene-copy">[\s\S]*id="narrative"[\s\S]*<\/div><\/div>\n<div class="decision-panel">/);
 assert.match(css,/#game \.scene\{display:grid!important;grid-template-rows:minmax\(0,1fr\) auto auto!important/);assert.match(css,/#game \.narrative-panel\{grid-row:2!important/);assert.match(css,/#game \.decision-panel\{grid-row:3!important/);
 assert.match(html,/id="languageSelect"/);assert.match(app,/ensureGameplayLocale/);assert.match(app,/missingVisibleTranslations/);assert.match(app,/translation\.sourceLocale=activeLocale|localization\.sourceLocale=activeLocale/);
 assert.match(settings,/languageContract\(locale\)/);assert.match(settings,/registerLocalizedOutput\(result,locale\)/);assert.match(client,/export async function translateVisibleWorld/);assert.match(server,/languageContract\(normalizeLocale\(locale\)\)/);
});
''',encoding='utf-8')

# Release notes.
Path('docs/releases/v0.59.0.md').write_text('''# Elyndra v0.59.0\n\n- Adds isolated runtime locales: Traditional Chinese, Simplified Chinese, English, and Japanese.\n- Separates UI/display locale from each world\'s canonical source locale; language switching never rewrites Canon.\n- Mid-session switches and loading a world authored in another locale require AI translation of the currently player-visible world corpus before gameplay can continue.\n- Direct-provider and server-provider AI calls receive a request-local runtime language override so output stays in the selected language.\n- Adds per-locale translation caches and prevents translations from one target language leaking into another.\n- Moves the narrator out of the scene-art overlay into a dedicated structural row immediately above `Your Actions`, fixing the recurring narrator position fault.\n''',encoding='utf-8')

print('v0.59.0 multilingual integration patch applied')
