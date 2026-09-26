from pathlib import Path
import re

ROOT=Path('.')
def rd(p): return (ROOT/p).read_text(encoding='utf-8')
def wr(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def once(s,old,new,label):
    if old not in s: raise SystemExit(f'{label}: missing anchor')
    return s.replace(old,new,1)

# ---- locale runtime: merge full static dictionary and add a residual translation cache ----
p='src/locale-runtime.js'; s=rd(p)
if not s.startswith('import {EXTRA_UI}'):
    s='import {EXTRA_UI} from "./ui-translations-extra.js?v=59001";\n'+s
s=once(s,'};\nconst REVERSE=new Map();','};\nObject.assign(UI,EXTRA_UI);\nconst REVERSE=new Map();','locale UI merge')
# Make static localization mutation-observer-safe and include <title>.
old=''' const doc=base.ownerDocument||root,filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;const source=NODE_SOURCE.get(node)||canonicalUiKey(trim);if(!UI[source])continue;NODE_SOURCE.set(node,source);node.nodeValue=raw.replace(trim,UI[source][id])}
 for(const el of base.querySelectorAll?.("[placeholder],[aria-label],[title]")||[]){let sourceMap=ATTR_SOURCE.get(el);if(!sourceMap){sourceMap={};ATTR_SOURCE.set(el,sourceMap)}for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(!raw)continue;const source=sourceMap[attr]||canonicalUiKey(raw);if(!UI[source])continue;sourceMap[attr]=source;el.setAttribute(attr,UI[source][id])}}'''
new=''' const doc=base.ownerDocument||root,title=doc.querySelector?.("title");if(title){const source=canonicalUiKey(title.textContent);const next=UI[source]?.[id];if(next&&next!==title.textContent)title.textContent=next}
 const filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;const source=NODE_SOURCE.get(node)||canonicalUiKey(trim);if(!UI[source])continue;NODE_SOURCE.set(node,source);const next=UI[source][id];if(next!==trim)node.nodeValue=raw.replace(trim,next)}
 for(const el of base.querySelectorAll?.("[placeholder],[aria-label],[title]")||[]){let sourceMap=ATTR_SOURCE.get(el);if(!sourceMap){sourceMap={};ATTR_SOURCE.set(el,sourceMap)}for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(!raw)continue;const source=sourceMap[attr]||canonicalUiKey(raw);if(!UI[source])continue;sourceMap[attr]=source;const next=UI[source][id];if(next!==raw)el.setAttribute(attr,next)}}'''
s=once(s,old,new,'mutation-safe document locale')
anchor='export function translationKey(value){let h=2166136261;for(const ch of String(value??"")){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}\n'
insert=r'''export function translationKey(value){let h=2166136261;for(const ch of String(value??"")){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
const SESSION_TRANSLATIONS=new Map();
function sessionLocale(locale=loadLocale()){const id=normalizeLocale(locale);let row=SESSION_TRANSLATIONS.get(id);if(!row){row={table:{},sources:{}};SESSION_TRANSLATIONS.set(id,row)}return row}
export function applySessionTranslationBundle(targetLocale,bundle){const id=normalizeLocale(targetLocale),row=sessionLocale(id),items=Array.isArray(bundle?.translations)?bundle.translations:[];for(const item of items){const source=String(item?.source??"").trim(),translated=String(item?.translated??"").trim();if(!source||!translated)continue;const key=translationKey(source);row.table[key]=translated;row.sources[key]=source;registerLocalizedOutput(translated,id)}return items.length}
export function sessionTranslatedText(value,locale=loadLocale()){const text=String(value??"");if(!text)return text;const id=normalizeLocale(locale);if(isRuntimeLocalized(text,id))return text;return sessionLocale(id).table[translationKey(text)]||text}
function sessionCompositeText(value,locale=loadLocale()){const text=String(value??"");if(!text)return text;const exact=sessionTranslatedText(text,locale);if(exact!==text)return exact;const row=sessionLocale(locale);let out=text;const entries=Object.entries(row.sources).map(([key,source])=>[source,row.table[key]]).filter(([source,target])=>source&&target&&source!==target).sort((a,b)=>b[0].length-a[0].length);for(const [source,target] of entries)if(source.length>1&&out.includes(source))out=out.split(source).join(target);return out}
'''
if anchor not in s: raise SystemExit('translationKey anchor missing')
s=s.replace(anchor,insert,1)
# Extend world DOM translation to attributes and add session/residual DOM functions.
old='''export function applyWorldLocaleToDocument(state,locale=loadLocale(),root=document){
 if(!state||typeof document==="undefined")return;const base=root.body||root,doc=base.ownerDocument||root,filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(parent.tagName))continue;const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;const localized=translatedCompositeText(state,trim,locale);if(localized!==trim)node.nodeValue=raw.replace(trim,localized)}
}'''
new=r'''export function applyWorldLocaleToDocument(state,locale=loadLocale(),root=document){
 if(!state||typeof document==="undefined")return;const base=root.body||root,doc=base.ownerDocument||root,filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|TEXTAREA|OPTION|CODE|PRE)$/.test(parent.tagName))continue;const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;const localized=translatedCompositeText(state,trim,locale);if(localized!==trim)node.nodeValue=raw.replace(trim,localized)}for(const el of base.querySelectorAll?.("[placeholder],[aria-label],[title]")||[])for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(!raw)continue;const localized=translatedCompositeText(state,raw,locale);if(localized!==raw)el.setAttribute(attr,localized)}
}
export function applySessionLocaleToDocument(locale=loadLocale(),root=document){
 if(typeof document==="undefined")return;const base=root.body||root,doc=base.ownerDocument||root,filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|TEXTAREA|OPTION|CODE|PRE)$/.test(parent.tagName))continue;const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;const localized=sessionCompositeText(trim,locale);if(localized!==trim)node.nodeValue=raw.replace(trim,localized)}for(const el of base.querySelectorAll?.("[placeholder],[aria-label],[title]")||[])for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(!raw)continue;const localized=sessionCompositeText(raw,locale);if(localized!==raw)el.setAttribute(attr,localized)}
}
export function documentTranslationCandidates(state,locale=loadLocale(),root=document){
 const id=normalizeLocale(locale);if(id===DEFAULT_LOCALE||typeof document==="undefined")return {sourceLocale:state?.localization?.sourceLocale||DEFAULT_LOCALE,targetLocale:id,strings:[]};const base=root.body||root,doc=base.ownerDocument||root,rows=[];const add=value=>{const text=String(value??"").trim();if(!text||!/[\u3400-\u9fff]/u.test(text)||rows.includes(text))return;const canonical=canonicalUiKey(text);if(UI[canonical]||isRuntimeLocalized(text,id)||sessionTranslatedText(text,id)!==text)return;if(state&&translatedCompositeText(state,text,id)!==text)return;rows.push(text)};const filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter);while(walker.nextNode()){const node=walker.currentNode,parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|TEXTAREA|OPTION|CODE|PRE)$/.test(parent.tagName))continue;add(node.nodeValue)}for(const el of base.querySelectorAll?.("[placeholder],[aria-label],[title]")||[])for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(raw)add(raw)}return {sourceLocale:state?.localization?.sourceLocale||DEFAULT_LOCALE,targetLocale:id,strings:rows.slice(0,120)}
}'''
s=once(s,old,new,'world/session DOM localization')
wr(p,s)

# ---- app wiring: residual AI translation for dynamic UI ----
p='app.js'; s=rd(p)
s=s.replace('applyTranslationBundle,applyWorldLocaleToDocument} from "./src/locale-runtime.js?v=59000";',
            'applyTranslationBundle,applyWorldLocaleToDocument,applySessionTranslationBundle,applySessionLocaleToDocument,documentTranslationCandidates} from "./src/locale-runtime.js?v=59001";',1)
# version module changed in this patch
s=s.replace('from "./src/version.js?v=59000";','from "./src/version.js?v=59001";',1)
# Add rendered locale guard after gameplay translation gate.
marker='const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll(\'"\',"&quot;");'
if marker not in s: raise SystemExit('app esc marker missing')
helper=r'''let renderedLocaleBusy=false;
async function ensureRenderedLocale(reason="render",root=document){
 applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);if(activeLocale==="zh-Hant")return true;const pending=documentTranslationCandidates(gameState,activeLocale,root);if(!pending.strings.length)return true;if(!aiStatus.aiConfigured){recordDebug("UI_TRANSLATION_DEFERRED",{reason,targetLocale:activeLocale,pending:pending.strings.length});return false}if(renderedLocaleBusy)return true;renderedLocaleBusy=true;try{const bundle=await translateVisibleWorld(pending,activeLocale);applySessionTranslationBundle(activeLocale,bundle);if(gameState)applyTranslationBundle(gameState,activeLocale,bundle);applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);if(gameState)await saveWorld(gameState);recordDebug("UI_TRANSLATION_READY",{reason,targetLocale:activeLocale,count:bundle.translations?.length||0});return true}catch(error){recordDebug("UI_TRANSLATION_FAILED",{reason,targetLocale:activeLocale,error:error?.message||String(error)});return false}finally{renderedLocaleBusy=false}}
'''
s=s.replace(marker,helper+marker,1)
# Translate on screen activation.
old='function show(id){qsa(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");document.body.dataset.screen=id;if(id==="game"){scheduleGameStageFit();requestAnimationFrame(()=>$(".scene")?.scrollIntoView({block:"start"}));resumeDeferredDirectorQueue();scheduleWorldEvolution("gameplay_idle",1800)}}'
new='function show(id){qsa(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");document.body.dataset.screen=id;void ensureRenderedLocale("screen:"+id,$("#"+id));if(id==="game"){scheduleGameStageFit();requestAnimationFrame(()=>$(".scene")?.scrollIntoView({block:"start"}));resumeDeferredDirectorQueue();scheduleWorldEvolution("gameplay_idle",1800)}}'
s=once(s,old,new,'show locale sync')
# Refresh both with and without world.
s=s.replace('if(!gameState){applyDocumentLocale(activeLocale);return true}', 'if(!gameState){applyDocumentLocale(activeLocale);await ensureRenderedLocale("refresh_no_world",document.querySelector(".screen.active")||document.body);return true}',1)
s=s.replace('applyDocumentLocale(activeLocale);applyWorldLocaleToDocument(gameState,activeLocale);return true}', 'applyDocumentLocale(activeLocale);applyWorldLocaleToDocument(gameState,activeLocale);await ensureRenderedLocale("refresh",document.querySelector(".screen.active")||document.body);return true}',1)
# Modal dynamic content.
old='if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,$("#modal"));requestAnimationFrame('
new='if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,$("#modal"));void ensureRenderedLocale("modal",$("#modal"));requestAnimationFrame('
s=once(s,old,new,'modal residual locale')
# A few high-value pre-world dynamic messages that should not need AI.
s=s.replace('`${p.label} · Elyndra 固定模型：${p.model}`','uiFormat("providerFixedModel",{provider:p.label,model:p.model},activeLocale)')
s=s.replace('optimization.value==="adaptive"?"自適應優化會按任務重要性分配思考：行動／敘事較快，核心規則／歷史／Timeline 更深入，Critic／Recovery 使用最高保護。":"標準模式不主動指定 Provider 思考強度，使用模型預設行為。"', 'optimization.value==="adaptive"?uiText("自適應優化會按任務重要性分配思考：行動／敘事較快，核心規則／歷史／Timeline 更深入，Critic／Recovery 使用最高保護。",activeLocale):uiText("標準模式不主動指定 Provider 思考強度，使用模型預設行為。",activeLocale)')
s=s.replace('out.textContent="正在測試連線…"','out.textContent=uiText("正在測試連線…",activeLocale)')
s=s.replace('out.textContent="連線成功。AI ONLINE 已啟用。"','out.textContent=uiText("連線成功。AI ONLINE 已啟用。",activeLocale)')
s=s.replace('out.textContent="設定已保存在本地，但連線失敗："+e.message','out.textContent=uiText("設定已保存在本地，但連線失敗：",activeLocale)+e.message')
s=s.replace('out.textContent="正在測試 Jev…"','out.textContent=uiText("正在測試 Jev…",activeLocale)')
s=s.replace('out.textContent="Jev 連線失敗："+e.message','out.textContent=uiText("Jev 連線失敗：",activeLocale)+e.message')
s=s.replace('$("#jevResult").textContent="Jev 本地設定已清除。"','$("#jevResult").textContent=uiText("Jev 本地設定已清除。",activeLocale)')
s=s.replace('key.placeholder="尚未設定"','key.placeholder=uiText("尚未設定",activeLocale)')
s=s.replace('if(confirm("確定要刪除目前的本地世界嗎？"))','if(confirm(uiText("確定要刪除目前的本地世界嗎？",activeLocale)))')
# Mutation observer: static dictionary is synchronous; residual AI translation is debounced.
boot='applyDocumentLocale(activeLocale);\nwindow.addEventListener("error"'
observer=r'''applyDocumentLocale(activeLocale);
let localeMutationTimer=0;
const localeObserver=new MutationObserver(()=>{clearTimeout(localeMutationTimer);localeMutationTimer=setTimeout(()=>{const modal=$("#modal"),root=modal&&!modal.classList.contains("hidden")?modal:(document.querySelector(".screen.active")||document.body);applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);void ensureRenderedLocale("mutation",root)},90)});
localeObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["placeholder","aria-label","title"]});
window.addEventListener("error"'''
if boot not in s: raise SystemExit('boot locale anchor missing')
s=s.replace(boot,observer,1)
wr(p,s)

# ---- Extra deterministic format rows ----
p='src/locale-runtime.js'; s=rd(p)
old=''' worldCompileFailed:row("世界編譯失敗：{error}","世界编译失败：{error}","World compilation failed: {error}","世界のコンパイルに失敗しました：{error}")'''
new=''' worldCompileFailed:row("世界編譯失敗：{error}","世界编译失败：{error}","World compilation failed: {error}","世界のコンパイルに失敗しました：{error}"),
 providerFixedModel:row("{provider} · Elyndra 固定模型：{model}","{provider} · Elyndra 固定模型：{model}","{provider} · Elyndra fixed model: {model}","{provider} · Elyndra固定モデル：{model}"),
 tagCount:row("{count} 個標籤","{count} 个标签","{count} tags","{count}個のタグ")'''
s=once(s,old,new,'format rows')
wr(p,s)

# ---- Add generation progress labels to deterministic UI dictionary ----
p='src/ui-translations-extra.js'; s=rd(p)
extra=r''',
 "建立新世界需要先在 AI 設定連接 Provider，因為世界主題與開局行動會由 AI 生成":r("建立新世界需要先在 AI 設定連接 Provider，因為世界主題與開局行動會由 AI 生成","建立新世界需要先在 AI 设置连接 Provider，因为世界主题与开局行动会由 AI 生成","Connect an AI provider before creating a new world because AI generates the world theme and opening actions.","新しい世界を作る前にAI Providerへ接続してください。世界テーマと開始行動はAIが生成します。"),
 "正在建立 World Blueprint":r("正在建立 World Blueprint","正在建立 World Blueprint","Building World Blueprint","World Blueprintを作成中"),
 "解析玩家設定、起源、定位、故事傾向與世界約束":r("解析玩家設定、起源、定位、故事傾向與世界約束","解析玩家设置、起源、定位、故事倾向与世界约束","Parsing player settings, origin, role, story tendencies, and world constraints","プレイヤー設定、起源、役割、物語傾向、世界制約を解析中"),
 "正在建立 World Constitution":r("正在建立 World Constitution","正在建立 World Constitution","Building World Constitution","World Constitutionを作成中"),
 "把必須／可以／禁止與難度、起源規則編譯成持久約束":r("把必須／可以／禁止與難度、起源規則編譯成持久約束","把必须／可以／禁止与难度、起源规则编译成持久约束","Compiling required/allowed/forbidden elements, difficulty, and origin rules into persistent constraints","必須／許可／禁止、難易度、起源ルールを永続制約へコンパイル中"),
 "World Seed 已鎖定":r("World Seed 已鎖定","World Seed 已锁定","World Seed locked","World Seedをロックしました"),
 "同一份 Blueprint、Constitution 與 Seed 會成為後續世界生成的根":r("同一份 Blueprint、Constitution 與 Seed 會成為後續世界生成的根","同一份 Blueprint、Constitution 与 Seed 会成为后续世界生成的根","The same Blueprint, Constitution, and Seed become the root of subsequent world generation","同じBlueprint、Constitution、Seedが今後の世界生成の根になります"),
 "AI World Compiler 正在分段建立世界…":r("AI World Compiler 正在分段建立世界…","AI World Compiler 正在分段建立世界…","AI World Compiler is building the world in stages…","AI World Compilerが段階的に世界を構築中…"),
 "正在驗證 AI 世界":r("正在驗證 AI 世界","正在验证 AI 世界","Validating AI world","AI世界を検証中"),
 "Engine 正在檢查 Seed、Canon、World Constitution、曆法、Timeline 與跨階段引用":r("Engine 正在檢查 Seed、Canon、World Constitution、曆法、Timeline 與跨階段引用","Engine 正在检查 Seed、Canon、World Constitution、历法、Timeline 与跨阶段引用","Engine is checking Seed, Canon, World Constitution, calendar, Timeline, and cross-stage references","EngineがSeed、Canon、World Constitution、暦、Timeline、段階間参照を確認中"),
 "正在 Canonize 開局內容":r("正在 Canonize 開局內容","正在 Canonize 开局内容","Canonizing opening content","開始内容をCanon化中"),
 "只建立世界骨架、出生區域與最小可玩內容；其他地區延遲生成":r("只建立世界骨架、出生區域與最小可玩內容；其他地區延遲生成","只建立世界骨架、出生区域与最小可玩内容；其他地区延迟生成","Building only the world skeleton, starting region, and minimum playable content; other areas are generated later","世界の骨格、開始地域、最小限のプレイ可能内容だけを作り、他地域は遅延生成します"),
 "AI 世界生成失敗":r("AI 世界生成失敗","AI 世界生成失败","AI world generation failed","AI世界生成失敗"),
 "保存 Blueprint、Constitution、Origin、Difficulty 與世界 Canon":r("保存 Blueprint、Constitution、Origin、Difficulty 與世界 Canon","保存 Blueprint、Constitution、Origin、Difficulty 与世界 Canon","Saving Blueprint, Constitution, Origin, Difficulty, and world Canon","Blueprint、Constitution、Origin、Difficulty、世界Canonを保存中")'''
if not s.rstrip().endswith('});'): raise SystemExit('extra UI closing anchor missing')
s=s.rstrip()[:-3]+extra+'\n});\n'
wr(p,s)

# ---- Permanent static coverage scanner ----
scanner=r'''from pathlib import Path
from html.parser import HTMLParser
import re
ROOT=Path('.')
han=re.compile(r'[\u3400-\u9fff]')
keys=set()
for fn in ['src/locale-runtime.js','src/ui-translations-extra.js']:
 text=(ROOT/fn).read_text(encoding='utf-8')
 keys.update(m.group(1).replace('\\"','"') for m in re.finditer(r'^\s*"((?:[^"\\]|\\.)+)"\s*:\s*(?:row|r)\(',text,re.M))
class P(HTMLParser):
 def __init__(self): super().__init__();self.rows=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in {'script','style'}:self.skip+=1
  for k,v in attrs:
   if k in {'placeholder','aria-label','title'} and v and han.search(v):self.rows.append((f'attr:{k}',v.strip()))
 def handle_endtag(self,tag):
  if tag in {'script','style'} and self.skip:self.skip-=1
 def handle_data(self,data):
  if self.skip:return
  t=' '.join(data.split())
  if t and han.search(t):self.rows.append(('text',t))
p=P();p.feed((ROOT/'index.html').read_text(encoding='utf-8'))
missing=list(dict.fromkeys((kind,text) for kind,text in p.rows if text not in keys))
if missing:
 print('STATIC_I18N_MISSING:')
 for kind,text in missing:print(f' - {kind}: {text}')
 raise SystemExit(1)
print(f'Static i18n coverage OK: {len(keys)} dictionary keys cover all index.html CJK text/attributes')
'''
wr('scripts/scan-i18n-coverage.py',scanner)

# ---- Release regression ----
test=r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";

test("v0.59.1 closes static and dynamic i18n coverage gaps",async()=>{
 const [locale,extra,app,index,pkg,version]=await Promise.all([
  readFile(new URL("../src/locale-runtime.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ui-translations-extra.js",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../package.json",import.meta.url),"utf8"),
  readFile(new URL("../src/version.js",import.meta.url),"utf8")
 ]);
 assert.match(locale,/ui-translations-extra\.js\?v=59001/);
 assert.match(locale,/Object\.assign\(UI,EXTRA_UI\)/);
 assert.match(locale,/documentTranslationCandidates/);
 assert.match(locale,/applySessionTranslationBundle/);
 assert.match(locale,/applySessionLocaleToDocument/);
 assert.match(app,/ensureRenderedLocale/);
 assert.match(app,/new MutationObserver/);
 assert.match(app,/ensureRenderedLocale\("modal"/);
 assert.match(app,/ensureRenderedLocale\("refresh"/);
 assert.match(index,/app\.js\?v=59001/);
 assert.equal(JSON.parse(pkg).version,"0.59.1");
 assert.match(version,/APP_VERSION="0\.59\.1"/);
 assert.match(extra,/"World Style"|"世界風格"/);
 execFileSync("python3",["scripts/scan-i18n-coverage.py"],{stdio:"pipe"});
});
'''
wr('test/v05901-i18n-coverage.test.js',test)

# ---- Version, cache entry points, README ----
p='package.json'; s=rd(p).replace('"version": "0.59.0"','"version": "0.59.1"',1);wr(p,s)
p='src/version.js'; s=rd(p).replace('APP_VERSION="0.59.0"','APP_VERSION="0.59.1"',1);wr(p,s)
p='index.html'; s=rd(p).replace('app.js?v=59000','app.js?v=59001',1);wr(p,s)
# Propagate browser dependency cache-busts transitively for changed modules.
changed={'src/locale-runtime.js','src/ui-translations-extra.js','src/version.js','app.js'}
for _ in range(12):
 grew=False
 for f in [Path('app.js'),*Path('src').glob('*.js')]:
  rel=f.as_posix(); text=f.read_text(encoding='utf-8'); before=text
  for dep in list(changed):
   name=Path(dep).name
   text=re.sub(rf'(["\'](?:\./)?{re.escape(name)}\?v=)(\d+)(["\'])',rf'\g<1>59001\g<3>',text)
  if text!=before:
   f.write_text(text,encoding='utf-8')
   if rel not in changed:changed.add(rel);grew=True
 if not grew:break
p='README.md'; s=rd(p).replace('目前版本：**v0.59.0**','目前版本：**v0.59.1**',1)
if '## v0.59.1 重點' not in s:
 s=s.replace('## v0.59.0 重點','## v0.59.1 重點\n\nv0.59.1 補齊多國語言覆蓋：首頁、World Creation、AI 設定、手帳、背包、存檔與動態遊玩 UI 會依繁體中文／簡體中文／English／日本語切換。對於 Engine 或舊模組在遊玩途中產生、未進靜態字典的玩家可見文字，Runtime 會偵測剩餘中文並透過既有 AI 翻譯層轉成目前選擇語言，避免語言混雜。\n\n## v0.59.0 重點',1)
wr(p,s)
print('v0.59.1 i18n hardening applied; cache chain:',', '.join(sorted(changed)))
