from pathlib import Path
import re

changed=[]
for f in Path('api').glob('*.js'):
    if f.name in {'_ai.js','translate.js','health.js'}: continue
    s=f.read_text(encoding='utf-8')
    before=s
    s=re.sub(r'callModel\(\{\s*signal:req\.elyndraSignal\s*,(?!\s*locale:req\.elyndraLocale\s*,)',
             'callModel({signal:req.elyndraSignal,locale:req.elyndraLocale,',s)
    if s!=before:
        f.write_text(s,encoding='utf-8');changed.append(str(f))

# Every endpoint that reads request-local language and calls the model must now forward it.
missing=[]
for f in Path('api').glob('*.js'):
    if f.name in {'_ai.js','translate.js','health.js'}: continue
    s=f.read_text(encoding='utf-8')
    if 'callModel(' in s and 'safeBody(req)' in s and 'locale:req.elyndraLocale' not in s:
        missing.append(str(f))
if missing: raise SystemExit('request locale still missing from: '+', '.join(missing))
print('request-local locale forwarded:', ', '.join(changed) or 'already complete')
