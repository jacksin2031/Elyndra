from pathlib import Path

ROOT=Path('.')
def patch(path, pairs):
    p=ROOT/path
    s=p.read_text(encoding='utf-8')
    for old,new in pairs:
        if old not in s:
            raise SystemExit(f'{path}: missing test-contract anchor: {old!r}')
        s=s.replace(old,new,1)
    p.write_text(s,encoding='utf-8')

# The source tests encode the version inside regular-expression literals, so the dots are escaped.
for path in ['test/v05901-i18n-coverage.test.js','test/version-0551-release.test.js']:
    patch(path, [(r'0\.59\.2',r'0\.59\.3')])

# world-creation.js is a changed live browser module in this release and therefore owns 59003.
patch('test/version-ui.test.js', [
    (r'world-creation\.js\?v=57025',r'world-creation\.js\?v=59003'),
])

print('v0.59.3 locale test contracts aligned')
