from pathlib import Path

replacements={
'app.js':[
('./src/ai-client.js?v=60009','./src/ai-client.js?v=60010'),
('./src/ai-settings.js?v=60009','./src/ai-settings.js?v=60010'),
('./src/contextual-actions.js?v=60009','./src/contextual-actions.js?v=60010'),
('./src/ai-autotest.js?v=60009','./src/ai-autotest.js?v=60010'),
('./src/adventure-engine.js?v=60009','./src/adventure-engine.js?v=60010'),
],
'src/ai-client.js':[
('./locale-runtime.js?v=60009','./locale-runtime.js?v=60010'),
('./ai-settings.js?v=60009','./ai-settings.js?v=60010'),
],
'src/ai-settings.js':[
('./locale-runtime.js?v=60009','./locale-runtime.js?v=60010'),
],
'src/contextual-actions.js':[
('./locale-runtime.js?v=60009','./locale-runtime.js?v=60010'),
],
'src/ai-autotest.js':[
('./ai-settings.js?v=60009','./ai-settings.js?v=60010'),
],
'src/adventure-engine.js':[
('./contextual-actions.js?v=60009','./contextual-actions.js?v=60010'),
],
'test/v0609-ja-turn-export-regression.test.js':[
('../src/contextual-actions.js?v=60009','../src/contextual-actions.js?v=60010'),
('contextual-actions\\.js\\?v=60009','contextual-actions\\.js\\?v=60010'),
],
}
for path,pairs in replacements.items():
 p=Path(path); s=p.read_text(encoding='utf-8')
 for old,new in pairs:
  if old not in s: raise SystemExit(f'{path}: missing {old}')
  s=s.replace(old,new)
 p.write_text(s,encoding='utf-8')
Path(__file__).unlink()
print('v0.60.10 cache chain repaired')
