from pathlib import Path

# Keep every browser-visible ES module edge on the v0.57.22 cache generation.
for path in Path("src").glob("*.js"):
    text = path.read_text(encoding="utf-8")
    updated = text.replace("?v=57021", "?v=57022")
    if updated != text:
        path.write_text(updated, encoding="utf-8")

# Canonical release tests use escaped regex literals; update those precisely.
for path in Path("test").glob("*.test.js"):
    text = path.read_text(encoding="utf-8")
    updated = text.replace(r"0\.57\.21", r"0\.57\.22")
    if updated != text:
        path.write_text(updated, encoding="utf-8")

print("v0.57.22 cache/release refine applied")
