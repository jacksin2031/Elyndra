from pathlib import Path

ROOT=Path('.')
def rd(p): return (ROOT/p).read_text(encoding='utf-8')
def wr(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def rep(p,old,new,count=1):
    s=rd(p)
    if old not in s: raise SystemExit(f'{p}: missing anchor: {old[:80]!r}')
    wr(p,s.replace(old,new,count))

# Root cause: state.notes is canonically an Array. Array.prototype.entries is a
# function, so state.notes?.entries must never be selected as the iterable.
p='src/locale-runtime.js'; s=rd(p)
old='for(const note of state.notes?.entries||state.notes||[]){add(note?.title);add(note?.text||note?.content)}'
new='const noteRows=Array.isArray(state.notes)?state.notes:(Array.isArray(state.notes?.entries)?state.notes.entries:[]);for(const note of noteRows){add(note?.title);add(note?.text||note?.content)}'
if old not in s: raise SystemExit('locale-runtime notes iterable anchor missing')
wr(p,s.replace(old,new,1))

# Close the browser cache graph around the changed locale runtime.
rep('src/ai-settings.js','./locale-runtime.js?v=59001','./locale-runtime.js?v=59002')
rep('src/ai-client.js','./ai-settings.js?v=59001','./ai-settings.js?v=59002')
rep('src/ai-client.js','./locale-runtime.js?v=59001','./locale-runtime.js?v=59002')
rep('src/ai-autotest.js','./ai-settings.js?v=59001','./ai-settings.js?v=59002')

p='app.js'; s=rd(p)
for old,new in [
 ('./src/version.js?v=59001','./src/version.js?v=59002'),
 ('./src/locale-runtime.js?v=59001','./src/locale-runtime.js?v=59002'),
 ('./src/ai-settings.js?v=59001','./src/ai-settings.js?v=59002'),
 ('./src/ai-client.js?v=59001','./src/ai-client.js?v=59002'),
 ('./src/ai-autotest.js?v=59001','./src/ai-autotest.js?v=59002'),
]:
    if old not in s: raise SystemExit(f'app cache anchor missing {old}')
    s=s.replace(old,new,1)
wr(p,s)
rep('index.html','app.js?v=59001','app.js?v=59002')
rep('package.json','"version": "0.59.1"','"version": "0.59.2"')
rep('src/version.js','APP_VERSION="0.59.1"','APP_VERSION="0.59.2"')

# Current release/cache contract.
p='test/version-0551-release.test.js'; s=rd(p)
s=s.replace('Official v0.59.1 release contract','Official v0.59.2 release contract')
s=s.replace('v0.59.1 is the canonical app and browser cache release','v0.59.2 is the canonical app and browser cache release')
s=s.replace('assert.equal(pkg.version,"0.59.1")','assert.equal(pkg.version,"0.59.2")')
s=s.replace('APP_VERSION="0\\.59\\.1"','APP_VERSION="0\\.59\\.2"')
s=s.replace('app\\.js\\?v=59001','app\\.js\\?v=59002').replace('version\\.js\\?v=59001','version\\.js\\?v=59002')
s=s.replace('["57025","57026","57028","57029","58000","59000","59001"]','["57025","57026","57028","57029","58000","59000","59001","59002"]')
s=s.replace('assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59001"));','assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59002"));')
wr(p,s)

p='test/version-ui.test.js'; s=rd(p)
s=s.replace('// v0.59.1 release contract','// v0.59.2 release contract')
s=s.replace('assert.equal(pkg.version,"0.59.1")','assert.equal(pkg.version,"0.59.2")')
s=s.replace('app\\.js\\?v=59001','app\\.js\\?v=59002')
s=s.replace('version\\.js\\?v=59001','version\\.js\\?v=59002')
s=s.replace('ai-client\\.js\\?v=59001','ai-client\\.js\\?v=59002')
s=s.replace('ai-autotest\\.js\\?v=59001','ai-autotest\\.js\\?v=59002')
wr(p,s)

p='test/v05901-i18n-coverage.test.js'; s=rd(p)
s=s.replace('test("v0.59.1 closes static and dynamic i18n coverage gaps"','test("v0.59.1 i18n coverage remains active in v0.59.2"')
s=s.replace('app\\.js\\?v=59001','app\\.js\\?v=59002')
s=s.replace('assert.equal(JSON.parse(pkg).version,"0.59.1")','assert.equal(JSON.parse(pkg).version,"0.59.2")')
s=s.replace('APP_VERSION="0\\.59\\.1"','APP_VERSION="0\\.59\\.2"')
wr(p,s)

(ROOT/'test/v05902-world-compile-i18n-notes.test.js').write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport {visibleTranslationPayload,missingVisibleTranslations} from "../src/locale-runtime.js";\n\nfunction stateWithNotes(notes){return {notes,world:{language:"zh-Hant",registry:{npcs:[],locations:[]}},quests:{main:{objectives:[]}},suggestions:[],inventory:[]}}\n\ntest("v0.59.2 non-default locale translation accepts the canonical notes array",()=>{\n const state=stateWithNotes([]);\n assert.equal(typeof state.notes.entries,"function");\n assert.doesNotThrow(()=>visibleTranslationPayload(state,"ja"));\n assert.doesNotThrow(()=>missingVisibleTranslations(state,"ja"));\n});\n\ntest("v0.59.2 locale translation also tolerates the legacy notes.entries array shape",()=>{\n const state=stateWithNotes({entries:[{title:"旅の記録",text:"記録"}]});\n const payload=visibleTranslationPayload(state,"en");\n assert.ok(payload.strings.includes("旅の記録"));\n});\n''',encoding='utf-8')

p='README.md'; s=rd(p)
s=s.replace('目前版本：**v0.59.1**','目前版本：**v0.59.2**',1)
anchor='## v0.59.1 重點'
if anchor in s and '## v0.59.2 重點' not in s:
    s=s.replace(anchor,'## v0.59.2 重點\n\nv0.59.2 修復非繁體中文介面在世界契約確認後進入遊戲時，`state.notes` 陣列被誤判為 `entries` iterable 而觸發 `function is not iterable` 的問題。日文、英文與簡體中文現在可正常完成世界建立、存檔與首次遊戲畫面 refresh。\n\n'+anchor,1)
wr(p,s)

(ROOT/'docs/releases/v0.59.2.md').write_text('''# Elyndra v0.59.2\n\n## Hotfix\n\n- Fixed a world-entry crash affecting non-Traditional-Chinese locales after accepting the World Contract.\n- Root cause: `visibleTranslationPayload()` read `state.notes?.entries` before checking whether `state.notes` was already an Array; for Arrays, `.entries` is the built-in function and is not itself iterable.\n- The locale runtime now accepts both the canonical notes Array and the legacy `{ entries: [] }` shape.\n- Added regression coverage for Japanese/English translation payload generation with an empty notes Array.\n- Browser cache contract advanced to `59002`; app version advanced to `0.59.2`.\n''',encoding='utf-8')
print('v0.59.2 world-entry locale hotfix applied')
