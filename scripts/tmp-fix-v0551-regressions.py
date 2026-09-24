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

# 2) Repair test pollution from cache-generation edits. These are actual timeout
# values and remain 55,000 ms; they are not cache identities.
for path in ["test/ai-timeout.test.js", "test/staged-world-compiler.test.js"]:
    replace(path, "[35000,50000,55001,70000,75000]", "[35000,50000,55000,70000,75000]")
replace(
    "test/v05415-regressions.test.js",
    r"RUNTIME_SOCIETY[\s\S]*?timeoutMs:55001,maxOutputTokens:2400",
    r"RUNTIME_SOCIETY[\s\S]*?timeoutMs:55000,maxOutputTokens:2400",
)

# 3) AI-07 intentionally supersedes the old permissive chronology behavior: a
# generic world longevity rule does not prove this particular NPC lived for
# centuries. The explicit person-specific allow case lives in the v0.55.1 tests.
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

# Keep the older human-readable wording contract while retaining the stricter
# structured chronology binding introduced in v0.55.1.
replace(
    "src/ai-client.js",
    "除非該 NPC 自己的 chronology 明確提供 LONG_LIVED／STASIS／TIME_DISPLACED，且 mechanismRef",
    "除非該 NPC 自己的 chronology 明確提供 LONG_LIVED／STASIS／TIME_DISPLACED；長壽、延命、休眠、時間停滯等非常規存活都必須由這個角色自己的 chronology 綁定，且 mechanismRef",
)
replace(
    "api/world.js",
    "chronology 必須提供 LONG_LIVED／STASIS／TIME_DISPLACED，且 mechanismRef",
    "chronology 必須提供 LONG_LIVED／STASIS／TIME_DISPLACED；長壽、延命、休眠、時間停滯等非常規存活都必須由這個角色自己的 chronology 綁定，且 mechanismRef",
)

# 4) New structured chronology legitimately sits between known:true and the
# behavior profile. Keep asserting both fields without requiring adjacency.
replace(
    "test/v05415-regressions.test.js",
    r'assert.match(client,/historyRefs:\["0-2個 HIST id"\],known:true,behaviorProfile/);',
    r'assert.match(client,/historyRefs:\["0-2個 HIST id"\],known:true,[\s\S]*?behaviorProfile/);',
)
replace(
    "test/v05415-regressions.test.js",
    r'assert.match(server,/historyRefs:\["0-2 HIST"\],known:true,behaviorProfile/);',
    r'assert.match(server,/historyRefs:\["0-2 HIST"\],known:true,[\s\S]*?behaviorProfile/);',
)
