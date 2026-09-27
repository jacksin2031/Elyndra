from pathlib import Path

path=Path("src/combat-engine.js")
source=path.read_text(encoding="utf-8")
old='function combatKindFromIntent(intent){const i=String(intent?.intent||"").toUpperCase(),q=String(intent?.raw||"").toLowerCase();if(/撤退|逃離|脫離|retreat|escape|flee/.test(q))return "RETREAT";if(i==="ATTACK")return "ATTACK";if(i==="DEFEND")return "DEFEND";if(i==="MOVE"||i==="TRAVEL")return "MOVE";if(i==="USE_ITEM"||i==="EAT")return "USE_ITEM";if(i==="CAST")return "CAST";if(i==="ASSIST")return "ASSIST";if(["TALK","SOCIAL","PERSUADE","THREATEN"].includes(i))return "SOCIAL";if(i==="INTERACT")return "INTERACT";return "TECHNIQUE"}'
new='function combatKindFromIntent(intent){const i=String(intent?.intent||"").toUpperCase(),q=String(intent?.raw||"").toLowerCase(),tactical=/假攻|佯攻|絆|重心|繳械|牽制|壓制|誘導|逼退|trip|feint|disarm|off[ _-]?balance|pin|pressure/.test(q);if(/撤退|逃離|脫離|retreat|escape|flee/.test(q))return "RETREAT";if(i==="ATTACK")return "ATTACK";if(i==="DEFEND")return "DEFEND";if((i==="MOVE"||i==="TRAVEL")&&tactical)return "TECHNIQUE";if(i==="MOVE"||i==="TRAVEL")return "MOVE";if(i==="USE_ITEM"||i==="EAT")return "USE_ITEM";if(i==="CAST")return "CAST";if(i==="ASSIST")return "ASSIST";if(["TALK","SOCIAL","PERSUADE","THREATEN"].includes(i))return "SOCIAL";if(i==="INTERACT")return "INTERACT";return "TECHNIQUE"}'
if old not in source:
    raise SystemExit("COMBAT_KIND_FUNCTION_NOT_FOUND")
path.write_text(source.replace(old,new),encoding="utf-8")
