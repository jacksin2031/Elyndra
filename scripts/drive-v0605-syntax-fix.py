from pathlib import Path
p=Path(__file__).resolve().parents[1]/"src/drive-engine.js"
text=p.read_text(encoding="utf-8")
old='return true}\n}\nexport function fulfillPlayerDrive'
new='return true}\nexport function fulfillPlayerDrive'
if old not in text:
    raise SystemExit("drive syntax anchor missing")
p.write_text(text.replace(old,new,1),encoding="utf-8")
