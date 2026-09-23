from pathlib import Path
p=Path('.github/scripts/v05414_patch.py')
s=p.read_text(encoding='utf-8')
old='evidenceKeywords:["線索"],conditions:["條件"]'
new='evidenceKeywords:[線索文字],conditions:[條件文字]'
if old not in s:
    raise SystemExit('v0.54.14 prompt escape anchor missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')
print('v0.54.14 patcher escaping fixed')
