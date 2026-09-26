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
print('remaining static i18n gaps patched')
