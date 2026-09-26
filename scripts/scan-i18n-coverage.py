from pathlib import Path
from html.parser import HTMLParser
import re
ROOT=Path('.')
han=re.compile(r'[\u3400-\u9fff]')
keys=set()
for fn in ['src/locale-runtime.js','src/ui-translations-extra.js']:
 text=(ROOT/fn).read_text(encoding='utf-8')
 keys.update(m.group(1).replace('\\n','\n').replace('\\"','"') for m in re.finditer(r'^\s*"((?:[^"\\]|\\.)+)"\s*:\s*(?:row|r)\(',text,re.M))
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
