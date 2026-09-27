from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def rep(path,old,new):
    p=ROOT/path;text=p.read_text(encoding="utf-8")
    if old not in text: raise SystemExit(f"missing cache edge in {path}: {old}")
    p.write_text(text.replace(old,new),encoding="utf-8")
# Direct dependents of the changed check/talent engines.
rep("src/adventure-engine.js",'./check-engine.js?v=57025','./check-engine.js?v=60004')
rep("src/item-engine.js",'./check-engine.js?v=57025','./check-engine.js?v=60004')
rep("src/adventure-engine.js",'./talent-engine.js?v=57025','./talent-engine.js?v=60004')
# item-engine becomes cache-distinct, so every browser importer must follow it.
for path in ["app.js","src/adventure-engine.js","src/combat-engine.js","src/game-engine.js","src/progression-ui.js","src/storage.js"]:
    rep(path,'./src/item-engine.js?v=59014' if path=="app.js" else './item-engine.js?v=59014','./src/item-engine.js?v=60004' if path=="app.js" else './item-engine.js?v=60004')
# progression/storage are now cache-distinct as well.
rep("app.js",'./src/progression-ui.js?v=59014','./src/progression-ui.js?v=60004')
rep("app.js",'./src/storage.js?v=59014','./src/storage.js?v=60004')
rep("src/progression-ui.js",'./storage.js?v=59014','./storage.js?v=60004')
