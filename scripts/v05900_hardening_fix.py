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

missing=[]
for f in Path('api').glob('*.js'):
    if f.name in {'_ai.js','translate.js','health.js'}: continue
    s=f.read_text(encoding='utf-8')
    if 'callModel(' in s and 'safeBody(req)' in s and 'locale:req.elyndraLocale' not in s:
        missing.append(str(f))
if missing: raise SystemExit('request locale still missing from: '+', '.join(missing))

mixed_rule="sourceLocale is only the world's original language provenance; individual strings may already be in a different previously selected runtime language, so detect the actual source language of each string independently."
translator_changed=[]
# Server translator wording.
p=Path('api/translate.js'); s=p.read_text(encoding='utf-8')
old_server="You are Elyndra's lossless runtime translator. Translate or normalize every input string into the target language; if already in the target language preserve its wording whenever possible, while preserving factual meaning, names, numbers, game state, uncertainty, and knowledge boundaries."
if old_server in s:
    s=s.replace(old_server,"You are Elyndra's lossless runtime translator. Translate or normalize every input string into the target language. "+mixed_rule+" Preserve wording when it is already in the target language, and preserve factual meaning, names, numbers, game state, uncertainty, and knowledge boundaries.")
    p.write_text(s,encoding='utf-8');translator_changed.append(str(p))
elif 'actual source language of each string independently' not in s:
    raise SystemExit('api/translate.js: translator prompt is missing mixed-language source detection')

# Direct client translator wording (newer integration uses 'each input string').
p=Path('src/ai-client.js'); s=p.read_text(encoding='utf-8')
old_direct="You are Elyndra's lossless runtime translator. Translate or normalize each input string into the target language. If a string is already in the target language, preserve its wording whenever possible. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries."
old_direct2="Translate each input string into the target language. The sourceLocale is the world origin language only; individual strings may already be in another previously selected runtime language, so detect each string's actual source language independently. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries."
if old_direct in s:
    s=s.replace(old_direct,"You are Elyndra's lossless runtime translator. Translate or normalize each input string into the target language. "+mixed_rule+" If a string is already in the target language, preserve its wording whenever possible. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries.")
    p.write_text(s,encoding='utf-8');translator_changed.append(str(p))
elif old_direct2 in s:
    s=s.replace(old_direct2,"Translate each input string into the target language. "+mixed_rule+" Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries.")
    p.write_text(s,encoding='utf-8');translator_changed.append(str(p))
elif 'actual source language of each string independently' not in s:
    raise SystemExit('src/ai-client.js: translator prompt is missing mixed-language source detection')

print('request-local locale forwarded:', ', '.join(changed) or 'already complete')
print('mixed-language translator hardened:', ', '.join(translator_changed) or 'already complete')
