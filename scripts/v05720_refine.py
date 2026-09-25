from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

# The existing fail-forward test intentionally uses an observable event as its
# grounded source. Under v0.57.20 observable events must also carry explicit
# current-world/current-scene provenance, so make that fixture truthful.
p=ROOT/"test/contextual-actions.test.js"
s=p.read_text(encoding="utf-8")
old='{id:"EV-1",type:"WORLD_EVENT",visibility:"OBSERVABLE",summary:"遠近聲音次序出現異常"}'
new='{id:"EV-1",type:"WORLD_EVENT",visibility:"OBSERVABLE",worldId:"WORLD-1",location:"舊城",summary:"遠近聲音次序出現異常"}'
if old not in s:
    raise SystemExit("contextual-actions observable fixture not found")
p.write_text(s.replace(old,new),encoding="utf-8")

# JS regex source contains a single literal backslash before each dot. The
# initial release-bump pass updates plain version strings but intentionally
# needs this escaped release assertion updated separately.
p=ROOT/"test/version-0551-release.test.js"
s=p.read_text(encoding="utf-8")
old=r'0\.57\.19'
new=r'0\.57\.20'
if old not in s:
    raise SystemExit("escaped APP_VERSION release assertion not found")
p.write_text(s.replace(old,new),encoding="utf-8")
