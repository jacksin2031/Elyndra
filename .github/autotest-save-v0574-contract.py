from pathlib import Path

p=Path('test/autotest-export-v0573.test.js')
text=p.read_text()
replacements={
 'id="autotestRetryDebug"':'id="autotestSaveDebug"',
 'id="autotestRetryWorld"':'id="autotestSaveWorld"',
 'id="autotestRetryRecovery"':'id="autotestSaveRecovery"',
}
for old,new in replacements.items():
    if old not in text:
        raise SystemExit(f'missing old export contract: {old}')
    text=text.replace(old,new)
p.write_text(text)
