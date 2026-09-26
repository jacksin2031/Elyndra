from pathlib import Path

p=Path('src/ui-translations-extra.js')
s=p.read_text(encoding='utf-8').rstrip()
if '"情境化建議行動":r(' not in s:
    if not s.endswith('});'): raise SystemExit('extra UI closing anchor missing')
    row=',\n "情境化建議行動":r("情境化建議行動","情境化建议行动","Contextual action suggestions","状況に応じた行動提案")\n'
    s=s[:-3]+row+'});\n'
    p.write_text(s,encoding='utf-8')

p=Path('scripts/scan-i18n-coverage.py')
s=p.read_text(encoding='utf-8')
old="keys.update(m.group(1).replace('\\\\\"','\"') for m in re.finditer(r'^\\s*\"((?:[^\"\\\\]|\\\\.)+)\"\\s*:\\s*(?:row|r)\\(',text,re.M))"
new="keys.update(m.group(1).replace('\\\\n','\\n').replace('\\\\\"','\"') for m in re.finditer(r'^\\s*\"((?:[^\"\\\\]|\\\\.)+)\"\\s*:\\s*(?:row|r)\\(',text,re.M))"
if old not in s: raise SystemExit('scanner key normalization anchor missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')

# Browser cache graph: app directly imports the runtime modules that changed because
# they now depend on locale-runtime.js?v=59001.
p=Path('app.js');s=p.read_text(encoding='utf-8')
for name in ['ai-settings','ai-client','ai-autotest']:
    s=s.replace(f'./src/{name}.js?v=59000',f'./src/{name}.js?v=59001')
p.write_text(s,encoding='utf-8')

# Current-release regression anchors move with the patch release.
p=Path('test/version-0551-release.test.js');s=p.read_text(encoding='utf-8')
s=s.replace('Official v0.59.0 release contract','Official v0.59.1 release contract')
s=s.replace('v0.59.0 is the canonical app and browser cache release','v0.59.1 is the canonical app and browser cache release')
s=s.replace('"0.59.0"','"0.59.1"').replace('0\\.59\\.0','0\\.59\\.1')
s=s.replace('app\\.js\\?v=59000','app\\.js\\?v=59001')
s=s.replace('["57025","57026","57028","57029","58000","59000"]','["57025","57026","57028","57029","58000","59000","59001"]')
s=s.replace('version\\.js\\?v=59000','version\\.js\\?v=59001')
s=s.replace('assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59000"));','assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59001"));')
p.write_text(s,encoding='utf-8')

p=Path('test/version-ui.test.js');s=p.read_text(encoding='utf-8')
s=s.replace('// v0.59.0 release contract','// v0.59.1 release contract')
s=s.replace('assert.equal(pkg.version,"0.59.0")','assert.equal(pkg.version,"0.59.1")')
s=s.replace('app\\.js\\?v=59000','app\\.js\\?v=59001')
s=s.replace('version\\.js\\?v=59000','version\\.js\\?v=59001')
s=s.replace('ai-client\\.js\\?v=59000','ai-client\\.js\\?v=59001')
s=s.replace('ai-autotest\\.js\\?v=59000','ai-autotest\\.js\\?v=59001')
p.write_text(s,encoding='utf-8')

p=Path('test/v05901-i18n-coverage.test.js');s=p.read_text(encoding='utf-8')
s=s.replace('assert.match(extra,/"World Style"|"世界風格"/);','assert.match(extra,/"世界建立步驟"/);')
p.write_text(s,encoding='utf-8')
print('remaining static i18n gaps and v0.59.1 release anchors patched')
