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

# A world may have passed through several display languages already. sourceLocale is
# only provenance; translation must detect the actual language of each visible string.
old="You are Elyndra's lossless runtime translator. Translate or normalize every input string into the target language; if already in the target language preserve its wording whenever possible, while preserving factual meaning, names, numbers, game state, uncertainty, and knowledge boundaries."
new="You are Elyndra's lossless runtime translator. Translate or normalize every input string into the target language. sourceLocale is only the world's original language provenance; individual strings may already be in a different previously selected runtime language, so detect the actual source language of each string independently. Preserve wording when it is already in the target language, and preserve factual meaning, names, numbers, game state, uncertainty, and knowledge boundaries."
translator_changed=[]
for path in ['api/translate.js','src/ai-client.js']:
    p=Path(path); s=p.read_text(encoding='utf-8')
    if old in s:
        s=s.replace(old,new)
        p.write_text(s,encoding='utf-8');translator_changed.append(path)
    elif 'actual source language of each string independently' not in s:
        # Alternate earlier wording used by the direct client.
        old2="Translate each input string into the target language. The sourceLocale is the world origin language only; individual strings may already be in another previously selected runtime language, so detect each string's actual source language independently. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries."
        if old2 in s:
            s=s.replace(old2,"Translate each input string into the target language. sourceLocale is only the world's original language provenance; individual strings may already be in a different previously selected runtime language, so detect the actual source language of each string independently. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries.")
            p.write_text(s,encoding='utf-8');translator_changed.append(path)
        else:
            raise SystemExit(f'{path}: translator prompt is missing mixed-language source detection')

print('request-local locale forwarded:', ', '.join(changed) or 'already complete')
print('mixed-language translator hardened:', ', '.join(translator_changed) or 'already complete')
