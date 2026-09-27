from pathlib import Path

replacements={
 'app.js':{
  './src/ai-client.js?v=60004':'./src/ai-client.js?v=60009',
  './src/ai-settings.js?v=59010':'./src/ai-settings.js?v=60009',
  './src/ai-autotest.js?v=59013':'./src/ai-autotest.js?v=60009',
  './src/adventure-engine.js?v=60006':'./src/adventure-engine.js?v=60009',
 },
 'src/ai-autotest.js':{'./ai-settings.js?v=59010':'./ai-settings.js?v=60009'},
 'src/ai-client.js':{'./ai-settings.js?v=59010':'./ai-settings.js?v=60009'},
 'src/adventure-engine.js':{'./contextual-actions.js?v=60006':'./contextual-actions.js?v=60009'},
}
for filename,rows in replacements.items():
 p=Path(filename); s=p.read_text(encoding='utf-8')
 for old,new in rows.items():
  if old not in s: raise SystemExit(f'anchor missing {filename}: {old}')
  s=s.replace(old,new)
 p.write_text(s,encoding='utf-8')
