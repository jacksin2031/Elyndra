from pathlib import Path

# Force browsers to fetch the hardened runtime modules and top-level app.
p = Path("app.js")
s = p.read_text()
replacements = {
    '"./src/acquisition-notifier.js?v=54018g"': '"./src/acquisition-notifier.js?v=54018g2"',
    '"./src/state-sync.js?v=54017"': '"./src/state-sync.js?v=54017g2"',
}
for old, new in replacements.items():
    if old not in s:
        raise SystemExit(f"app cache token anchor missing: {old}")
    s = s.replace(old, new, 1)
p.write_text(s)

p = Path("index.html")
s = p.read_text()
old = 'app.js?v=54017g'
new = 'app.js?v=54017g2'
if old not in s:
    raise SystemExit("index app cache token anchor missing")
p.write_text(s.replace(old, new, 1))

p = Path("test/first-button-fast-path-v05417.test.js")
s = p.read_text()
old = r'app\.js\?v=54017g'
new = r'app\.js\?v=54017g2'
if old not in s:
    raise SystemExit("FIRST_BUTTON cache regression anchor missing")
p.write_text(s.replace(old, new, 1))

# Lock the two hardened child-module cache identities as regression contracts.
p = Path("test/runtime-grounding-v05418.test.js")
s = p.read_text()
test = '''\ntest("hardened acquisition runtime modules use fresh browser cache identities",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../app.js",import.meta.url),"utf8"));assert.match(source,/acquisition-notifier\\.js\\?v=54018g2/);assert.match(source,/state-sync\\.js\\?v=54017g2/)});\n'''
if "hardened acquisition runtime modules use fresh browser cache identities" not in s:
    s += test
p.write_text(s)
