from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def rep(path,old,new):
 p=ROOT/path;text=p.read_text(encoding="utf-8")
 if old not in text: raise SystemExit(f"missing cache edge in {path}: {old}")
 p.write_text(text.replace(old,new),encoding="utf-8")
rep("src/adventure-engine.js",'./combat-engine.js?v=59014','./combat-engine.js?v=60004')
rep("app.js",'./src/adventure-engine.js?v=59015','./src/adventure-engine.js?v=60004')
rep("index.html",'app.js?v=60003','app.js?v=60004')
