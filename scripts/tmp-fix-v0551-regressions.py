from pathlib import Path


def replace(path, old, new, *, min_count=1):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count < min_count:
        raise SystemExit(f"{path}: expected at least {min_count} occurrence(s) of {old!r}, found {count}")
    p.write_text(text.replace(old, new), encoding="utf-8")
    print(f"{path}: replaced {count} occurrence(s)")


# 1) v0.55.1 browser cache identity must be coherent across the full runtime graph.
for p in [Path("app.js"), Path("index.html"), *Path("src").glob("*.js")]:
    text = p.read_text(encoding="utf-8")
    if "?v=55000" in text:
        count = text.count("?v=55000")
        p.write_text(text.replace("?v=55000", "?v=55001"), encoding="utf-8")
        print(f"{p}: cache generation {count} token(s) -> 55001")

# 2) Repair test pollution from the cache-generation replacement. These are real
# timeout values, not cache identities, so they stay at 55000 ms.
for path in ["test/ai-timeout.test.js", "test/staged-world-compiler.test.js"]:
    replace(path, "[35000,50000,55001,70000,75000]", "[35000,50000,55000,70000,75000]")
replace(
    "test/v05415-regressions.test.js",
    "RUNTIME_SOCIETY[\\s\\S]*?timeoutMs:55001,maxOutputTokens:2400",
    "RUNTIME_SOCIETY[\\s\\S]*?timeoutMs:55000,maxOutputTokens:2400",
)

# 3) AI-07 supersedes the old permissive chronology regression: a world-level
# longevity rule alone is no longer enough to prove that this particular NPC
# survived for centuries. Character-specific chronology is covered by the new
# v0.55.1 regression suite.
replace(
    "test/opening-cast-chronology-v05418.test.js",
    'test("opening cast allows first-hand ancient witnesses when longevity is explicitly grounded",()=>{',
    'test("opening cast rejects first-hand ancient witnesses when only global longevity is grounded",()=>{',
)
replace(
    "test/opening-cast-chronology-v05418.test.js",
    'assert.deepEqual(openingCastChronologyIssues(longLived,history,cast),[]);',
    'assert.deepEqual(openingCastChronologyIssues(longLived,history,cast),["CAST_NPC_0_TEMPORAL_PLAUSIBILITY"]);',
)

# Preserve the older human-readable prompt contract while keeping the stricter
# structured chronology object required by v0.55.1.
prompt_old = "除非該 NPC 自己的 chronology 明確提供 LONG_LIVED／STASIS／TIME_DISPLACED，且 mechanismRef"
prompt_new = "除非該 NPC 自己的 chronology 明確提供 LONG_LIVED／STASIS／TIME_DISPLACED；長壽、延命、休眠、時間停滯等非常規存活都必須由這個角色自己的 chronology 綁定，且 mechanismRef"
for path in ["src/ai-client.js", "api/world.js"]:
    replace(path, prompt_old, prompt_new)

# 4) The v0.54.15 visibility regression should allow new required Cast fields
# between known:true and behaviorProfile while still asserting both contracts.
replace(
    "test/v05415-regressions.test.js",
    'assert.match(client,/historyRefs:\\\["0-2個 HIST id"\\\],known:true,behaviorProfile/);',
    'assert.match(client,/historyRefs:\\\["0-2個 HIST id"\\\],known:true,[\\s\\S]*?behaviorProfile/);',
)
replace(
    "test/v05415-regressions.test.js",
    'assert.match(server,/historyRefs:\\\["0-2 HIST"\\\],known:true,behaviorProfile/);',
    'assert.match(server,/historyRefs:\\\["0-2 HIST"\\\],known:true,[\\s\\S]*?behaviorProfile/);',
)
