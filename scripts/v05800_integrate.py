from pathlib import Path
import json


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match for {old!r}, found {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


pkg = json.loads(Path("package.json").read_text(encoding="utf-8"))
if pkg.get("version") != "0.58.0":
    raise SystemExit(f"package.json: expected v0.58.0, found {pkg.get('version')}")

# Ensure the browser receives the repaired stylesheet instead of a cached v0.57 asset.
replace_once("index.html", 'styles.css?v=57025', 'styles.css?v=58000')

# The desktop fixed-stage/zoom stack can leave the narration paragraph visually
# detached from the location/title cluster. Force the whole scene-copy cluster into
# one normal vertical flow and explicitly neutralize paragraph positioning/margins.
styles = Path("styles.css")
text = styles.read_text(encoding="utf-8")
marker = "/* v0.58.0 narrator layout stabilization */"
if marker in text:
    raise SystemExit("styles.css: narrator stabilization already present")
text += r'''

/* v0.58.0 narrator layout stabilization */
@media(min-width:901px){
  #game .scene-copy{
    display:flex!important;
    flex-direction:column!important;
    align-items:flex-start!important;
    justify-content:flex-start!important;
    gap:0!important;
    height:auto!important;
  }
  #game .scene-copy .scene-meta{
    position:static!important;
    margin:0!important;
  }
  #game .scene-copy h2{
    position:static!important;
    margin:13px 0 12px!important;
  }
  #game .scene-copy #narrative{
    position:static!important;
    inset:auto!important;
    transform:none!important;
    align-self:flex-start!important;
    width:min(760px,100%)!important;
    max-width:760px!important;
    margin:0!important;
  }
}
'''
styles.write_text(text, encoding="utf-8")

# Focused regression for the reported layout fault.
Path("test/v05800-narrator-layout.test.js").write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.58.0 desktop narration stays in one scene-copy flow",async()=>{
 const [css,html]=await Promise.all([
  readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8")
 ]);
 assert.match(css,/v0\.58\.0 narrator layout stabilization/);
 assert.match(css,/#game \.scene-copy\{[\s\S]*?display:flex!important;[\s\S]*?flex-direction:column!important;/);
 assert.match(css,/#game \.scene-copy #narrative\{[\s\S]*?position:static!important;[\s\S]*?margin:0!important;/);
 assert.match(html,/styles\.css\?v=58000/);
});
''', encoding="utf-8")

# Tighten the current release contract around the stylesheet cache edge.
p = Path("test/version-0551-release.test.js")
release_test = p.read_text(encoding="utf-8")
anchor = 'assert.match(html,/app\\.js\\?v=58000/);'
if release_test.count(anchor) != 1:
    raise SystemExit("test/version-0551-release.test.js: app cache assertion anchor mismatch")
release_test = release_test.replace(anchor, anchor + '\n assert.match(html,/styles\\.css\\?v=58000/);', 1)
p.write_text(release_test, encoding="utf-8")

# Release notes / README mention the UI correction.
p = Path("docs/releases/v0.58.0.md")
notes = p.read_text(encoding="utf-8")
needle = "- Ground Scene Narrator dialogue: dialogue is optional, player speech cannot be invented, and NPC speech is bounded by visible knowledge, role/trust context, and the Engine-confirmed outcome.\n"
if notes.count(needle) != 1:
    raise SystemExit("docs/releases/v0.58.0.md: dialogue bullet anchor mismatch")
notes = notes.replace(needle, needle + "- Fix the desktop narrator text box so location, scene title, and narration stay in one stable vertical flow across the fixed logical stage / CSS zoom layout.\n", 1)
p.write_text(notes, encoding="utf-8")

p = Path("README.md")
readme = p.read_text(encoding="utf-8")
needle = "並禁止替玩家發明台詞或讓 NPC 洩漏不可知資訊。"
if readme.count(needle) != 1:
    raise SystemExit("README.md: v0.58.0 highlight anchor mismatch")
readme = readme.replace(needle, needle + "同時修正桌面版旁白文字框與場景標題分離的版面問題。", 1)
p.write_text(readme, encoding="utf-8")
