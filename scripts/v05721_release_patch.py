from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
paths=[]
for rel in ["app.js","autotest-export-sw.js","package.json","package-lock.json","index.html"]:
    p=ROOT/rel
    if p.exists(): paths.append(p)
for folder in ["src","api","test"]:
    base=ROOT/folder
    if base.exists():
        paths += [p for p in base.rglob("*") if p.is_file() and p.suffix in {".js",".mjs",".json"}]
for p in paths:
    s=p.read_text(encoding="utf-8")
    s=s.replace("0.57.20","0.57.21").replace("57020","57021")
    s=s.replace(r"0\.57\.20",r"0\.57\.21").replace(r"0\\.57\\.20",r"0\\.57\\.21")
    p.write_text(s,encoding="utf-8")
