from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/"test/version-ui.test.js"
text=p.read_text(encoding="utf-8")
old='assert.match(app,/\\.\\/src\\/talent-engine\\.js\\?v=57025/);'
new='assert.match(app,/\\.\\/src\\/talent-engine\\.js\\?v=60004/);'
if old not in text:
    raise SystemExit("missing stale Talent UI cache assertion")
p.write_text(text.replace(old,new),encoding="utf-8")
