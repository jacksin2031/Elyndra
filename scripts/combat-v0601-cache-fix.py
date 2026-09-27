from pathlib import Path

path=Path("index.html")
source=path.read_text(encoding="utf-8")
key='"./src/combat-engine.js?v=59014":"./src/combat-engine.js?v=60001"'
if key not in source:
    marker='"./src/origin-runtime.js?v=57025":"./src/origin-runtime.js?v=59014",'
    if marker not in source:
        raise SystemExit("IMPORTMAP_INSERTION_POINT_NOT_FOUND")
    source=source.replace(marker,marker+key+',',1)
    path.write_text(source,encoding="utf-8")
