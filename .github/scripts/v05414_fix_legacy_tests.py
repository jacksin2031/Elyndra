from pathlib import Path

p=Path('test/ai-settings.test.js')
s=p.read_text(encoding='utf-8')
old='assert.match(app,/ai-settings\\.js\\?v=54013/)'
new='assert.match(app,/ai-settings\\.js\\?v=54014/)'
if old not in s: raise SystemExit('ai-settings legacy token anchor missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')

p=Path('test/module-cache.test.js')
s=p.read_text(encoding='utf-8')
old='assert.ok(appImports.length>20);assert.ok(appImports.every(x=>x==="54013"),"all app browser imports must use the v0.54.13 release token");'
new='assert.ok(appImports.length>20);assert.ok(appImports.every(x=>x==="54014"),"all app browser imports must use the v0.54.14 release token");'
if old not in s: raise SystemExit('module-cache legacy app token anchor missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')
print('v0.54.14 legacy release-token tests updated')
