from pathlib import Path

path = Path('test/version-0551-release.test.js')
text = path.read_text(encoding='utf-8')
old = r'0\.57\.17'
new = r'0\.57\.18'
if old not in text:
    raise SystemExit('MISSING escaped v0.57.17 release regex')
path.write_text(text.replace(old, new), encoding='utf-8')
print('v0.57.18 escaped release contract refined')
