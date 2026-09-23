from pathlib import Path
import json,re

ROOT=Path('.')
NEW_VERSION='0.54.18'
NEW_TOKEN='54018'

# Canonical semantic version sources.
p=ROOT/'package.json'
pkg=json.loads(p.read_text())
pkg['version']=NEW_VERSION
p.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n')

p=ROOT/'src/version.js'
s=p.read_text()
s=re.sub(r'APP_VERSION="[^"]+"',f'APP_VERSION="{NEW_VERSION}"',s,count=1)
p.write_text(s)

# Browser cache graph: collapse v0.54.17 and temporary hardening tokens into the release token.
def normalize_tokens(path):
    p=ROOT/path
    s=p.read_text()
    s=re.sub(r'\?v=54017(?:[A-Za-z]\d*)?',f'?v={NEW_TOKEN}',s)
    s=re.sub(r'\?v=54018(?:[A-Za-z]\d+)',f'?v={NEW_TOKEN}',s)
    p.write_text(s)

normalize_tokens('app.js')
for p in (ROOT/'src').rglob('*.js'):
    rel=p.relative_to(ROOT)
    normalize_tokens(rel)
normalize_tokens('index.html')

# Release/cache assertions should follow the canonical current release token.
for p in (ROOT/'test').rglob('*.js'):
    s=p.read_text()
    s=re.sub(r'54017(?:[A-Za-z]\d*)?',NEW_TOKEN,s)
    s=re.sub(r'54018(?:[A-Za-z]\d+)',NEW_TOKEN,s)
    p.write_text(s)

p=ROOT/'test/version-ui.test.js'
s=p.read_text().replace('0.54.17',NEW_VERSION)
p.write_text(s)

p=ROOT/'test/module-cache.test.js'
s=p.read_text().replace('v0.54.17','v0.54.18').replace('v0.54.17 release token','v0.54.18 release token')
p.write_text(s)

# Lock the official release contract explicitly.
release_test=ROOT/'test/version-05418-release.test.js'
release_test.write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport {readFile} from "node:fs/promises";\n\ntest("v0.54.18 is the canonical app and browser cache release",async()=>{\n const [pkgText,versionSource,html,app]=await Promise.all([\n  readFile(new URL("../package.json",import.meta.url),"utf8"),\n  readFile(new URL("../src/version.js",import.meta.url),"utf8"),\n  readFile(new URL("../index.html",import.meta.url),"utf8"),\n  readFile(new URL("../app.js",import.meta.url),"utf8")\n ]);\n const pkg=JSON.parse(pkgText);\n assert.equal(pkg.version,"0.54.18");\n assert.match(versionSource,/APP_VERSION="0\\.54\\.18"/);\n assert.match(html,/app\\.js\\?v=54018/);\n const tokens=[...app.matchAll(/from "\\.\\/src\\/[^\"]+\\.js\\?v=(\\d+)";/g)].map(x=>x[1]);\n assert.ok(tokens.length>20);\n assert.ok(tokens.every(x=>x==="54018"));\n assert.doesNotMatch(app,/\\?v=54017/);\n assert.doesNotMatch(app,/\\?v=54018[A-Za-z]/);\n});\n''')

# Pre-test sanity: browser-facing files must not retain the previous or temporary release identity.
for path in [ROOT/'app.js',ROOT/'index.html',*(ROOT/'src').rglob('*.js')]:
    text=path.read_text()
    if re.search(r'\?v=54017',text):
        raise SystemExit(f'stale v0.54.17 cache token: {path}')
    if re.search(r'\?v=54018[A-Za-z]',text):
        raise SystemExit(f'temporary v0.54.18 cache token remains: {path}')

print('Prepared Elyndra v0.54.18 release contract with cache token 54018')
