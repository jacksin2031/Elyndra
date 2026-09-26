from pathlib import Path
from html.parser import HTMLParser
import re

ROOT=Path('.')
locale=(ROOT/'src/locale-runtime.js').read_text(encoding='utf-8')
keys=set(re.findall(r'^\s*"((?:[^"\\]|\\.)+)"\s*:\s*row\(', locale, re.M))
keys={bytes(k,'utf-8').decode('unicode_escape') if '\\u' in k else k.replace('\\"','"') for k in keys}
han=re.compile(r'[\u3400-\u9fff]')

class P(HTMLParser):
    def __init__(self): super().__init__(); self.rows=[]; self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in {'script','style'}: self.skip+=1
        for k,v in attrs:
            if k in {'placeholder','aria-label','title'} and v and han.search(v): self.rows.append((f'attr:{k}',v.strip()))
    def handle_endtag(self,tag):
        if tag in {'script','style'} and self.skip: self.skip-=1
    def handle_data(self,data):
        if self.skip:return
        s=' '.join(data.split())
        if s and han.search(s): self.rows.append(('text',s))

p=P();p.feed((ROOT/'index.html').read_text(encoding='utf-8'))
missing=[]
for kind,text in p.rows:
    if text not in keys: missing.append((kind,text))
print('=== INDEX MISSING UI KEYS ===')
for kind,text in dict.fromkeys(missing): print(f'{kind}\t{text}')
print('INDEX_MISSING_COUNT',len(dict.fromkeys(missing)))

files=['app.js','src/progression-ui.js','src/acquisition-notifier.js','src/contextual-actions.js','src/player-experience.js','src/world-creation.js']
lit=re.compile(r'(?P<q>["\'`])(?P<s>(?:\\.|(?!\1).)*?)(?P=q)',re.S)
print('=== JS CJK LITERALS NOT IN UI KEYS ===')
for fn in files:
    text=(ROOT/fn).read_text(encoding='utf-8')
    rows=[]
    for m in lit.finditer(text):
        s=m.group('s').replace('\\n',' ').strip()
        if not s or not han.search(s): continue
        if s in keys: continue
        if len(s)>220: continue
        rows.append(s)
    uniq=list(dict.fromkeys(rows))
    print(f'--- {fn} ({len(uniq)}) ---')
    for s in uniq: print(s)
