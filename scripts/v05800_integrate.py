from pathlib import Path
import re
import subprocess

DIALOGUE_SHA = "3245cc56c5be66327e61f47b2f6b50b9539a5b1a"


def show(path):
    return subprocess.check_output(["git", "show", f"{DIALOGUE_SHA}:{path}"], text=True, encoding="utf-8")


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match for {old!r}, found {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


Path("src/ai-runtime-contracts.js").write_text(show("src/ai-runtime-contracts.js"), encoding="utf-8")
Path("test/v05730-scene-dialogue-contract.test.js").write_text(show("test/v05730-scene-dialogue-contract.test.js"), encoding="utf-8")

replace_once("package.json", '"version": "0.57.30"', '"version": "0.58.0"')
replace_once("src/version.js", 'APP_VERSION="0.57.30"', 'APP_VERSION="0.58.0"')
replace_once("app.js", './src/version.js?v=57029', './src/version.js?v=58000')
replace_once("app.js", './src/player-entity-visibility.js?v=57029', './src/player-entity-visibility.js?v=58000')
replace_once("app.js", './src/acquisition-notifier.js?v=57026', './src/acquisition-notifier.js?v=58000')
replace_once("index.html", 'app.js?v=57029', 'app.js?v=58000')

Path("test/version-0551-release.test.js").write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// Official v0.58.0 release contract; this file also anchors the final Pages deployment check.
test("v0.58.0 is the canonical app and browser cache release",async()=>{
 const [pkgText,versionSource,html,app]=await Promise.all([
  readFile(new URL("../package.json",import.meta.url),"utf8"),
  readFile(new URL("../src/version.js",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText);
 assert.equal(pkg.version,"0.58.0");
 assert.match(versionSource,/APP_VERSION="0\.58\.0"/);
 assert.match(html,/app\.js\?v=58000/);
 const tokens=[...app.matchAll(/from "\.\/src\/[^"]+\.js\?v=(\d+)";/g)].map(x=>x[1]);
 assert.ok(tokens.length>20);
 assert.ok(tokens.every(x=>["57025","57026","57028","57029","58000"].includes(x)));
 assert.match(app,/\.\/src\/version\.js\?v=58000/);
 assert.match(app,/\.\/src\/player-entity-visibility\.js\?v=58000/);
 assert.match(app,/\.\/src\/acquisition-notifier\.js\?v=58000/);
 assert.match(app,/\.\/src\/npc-conversation\.js\?v=57029/);
 assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));
 assert.doesNotMatch(app,/\?v=54017/);
 assert.doesNotMatch(app,/\?v=54018[A-Za-z]/);
});
''', encoding="utf-8")

p = Path("test/version-ui.test.js")
text = p.read_text(encoding="utf-8")
marker = '\ntest("History/Future/character systems remain available after v0.53"'
if text.count(marker) != 1:
    raise SystemExit("test/version-ui.test.js: current-version block marker mismatch")
head, tail = text.split(marker, 1)
head = head.replace("v0.57.30 release contract", "v0.58.0 release contract")
head = head.replace('pkg.version,"0.57.30"', 'pkg.version,"0.58.0"')
head = head.replace("57029", "58000")
p.write_text(head + marker + tail, encoding="utf-8")

Path("docs/releases/v0.58.0.md").write_text('''# Elyndra v0.58.0

- Harden player-facing NPC identity privacy: unknown canonical names and roles remain redacted in encounter notifications and adventure cards until evidence unlocks them.
- Ground Scene Narrator dialogue: dialogue is optional, player speech cannot be invented, and NPC speech is bounded by visible knowledge, role/trust context, and the Engine-confirmed outcome.
- Preserve deterministic Engine ownership of outcomes and state while tightening the AI narrative boundary.
- Unify the live application version and changed browser cache edges on `0.58.0` / `58000` without rewriting historical release references.
- GitHub Pages validation uses focused release/privacy/dialogue checks and does not invoke `test:nondownload`.
''', encoding="utf-8")

p = Path("README.md")
text = p.read_text(encoding="utf-8")
if text.count("目前版本：**v0.57.12**") != 1:
    raise SystemExit("README.md: current version anchor mismatch")
text = text.replace("目前版本：**v0.57.12**", "目前版本：**v0.58.0**", 1)
pattern = re.compile(r"## v0\.57\.12 重點\n.*?\n完整歷史請查看 `docs/releases/`、Pull Requests 與 commit history。\s*$", re.S)
replacement = '''## v0.58.0 重點

v0.58.0 整合 NPC 玩家可見身份隱私與條件式場景對白：未知 NPC 的 canonical 名稱／職業在取得證據前保持隱藏；Scene Narrator 只在玩家明確說話或有可見 NPC 回應證據時使用簡短對白，並禁止替玩家發明台詞或讓 NPC 洩漏不可知資訊。

完整歷史請查看 `docs/releases/`、Pull Requests 與 commit history。\n'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit("README.md: release highlight anchor mismatch")
p.write_text(text, encoding="utf-8")
