from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

# Release/cache regression contracts must follow the new cache generation.
for path in (ROOT/'test').glob('*.js'):
    text=path.read_text(encoding='utf-8')
    text=text.replace('57018','57019')
    path.write_text(text,encoding='utf-8')

# Canonical release expectations, including escaped regex literals.
for rel in ['test/version-0551-release.test.js','test/version-ui.test.js']:
    path=ROOT/rel
    text=path.read_text(encoding='utf-8')
    text=text.replace('0.57.18','0.57.19').replace(r'0\.57\.18',r'0\.57\.19')
    path.write_text(text,encoding='utf-8')

# v0.57.15 fixture intends to test a present, name-known NPC. v0.57.17 separated
# entity-known from name-known, so state that intent explicitly instead of weakening
# the production visibility projection.
path=ROOT/'test/v05715-suggestion-refresh.test.js'
text=path.read_text(encoding='utf-8')
old='{id:"N1",name:"巡路人",known:true,alive:true,locationId:"L1"}'
new='{id:"N1",name:"巡路人",known:true,nameKnown:true,alive:true,locationId:"L1"}'
if old not in text:
    raise SystemExit('MISSING_ANCHOR:v05715-name-known-fixture')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('v0.57.19 refine applied')
