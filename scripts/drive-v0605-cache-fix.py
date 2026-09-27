from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def rep(path,old,new):
    p=ROOT/path;text=p.read_text(encoding="utf-8")
    if old not in text: raise SystemExit(f"missing cache edge in {path}: {old}")
    p.write_text(text.replace(old,new),encoding="utf-8")

# quest-engine -> npc-quest-interaction closure
rep("src/npc-quest-interaction.js",'./quest-engine.js?v=59014','./quest-engine.js?v=60005')
for path in ["src/item-engine.js","src/npc-conversation.js","src/npc-dialogue-engine.js"]:
    rep(path,'./npc-quest-interaction.js?v=59014','./npc-quest-interaction.js?v=60005')

# item-engine becomes cache-distinct, so every browser importer follows it.
for path in ["app.js","src/adventure-engine.js","src/combat-engine.js","src/game-engine.js","src/progression-ui.js","src/storage.js"]:
    old='./src/item-engine.js?v=60004' if path=="app.js" else './item-engine.js?v=60004'
    new='./src/item-engine.js?v=60005' if path=="app.js" else './item-engine.js?v=60005'
    rep(path,old,new)

# combat/storage are now cache-distinct as well.
rep("app.js",'./src/combat-engine.js?v=60004','./src/combat-engine.js?v=60005')
rep("src/adventure-engine.js",'./combat-engine.js?v=60004','./combat-engine.js?v=60005')
rep("app.js",'./src/storage.js?v=60004','./src/storage.js?v=60005')
rep("src/progression-ui.js",'./storage.js?v=60004','./storage.js?v=60005')
