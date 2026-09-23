from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_required(text, old, new, label, minimum=1):
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f"{label}: expected at least {minimum} occurrence(s) of {old!r}, got {count}")
    return text.replace(old, new)


# AI settings: v0.54.13 browser edge + larger Agnes Future visible completion budget.
p = "test/ai-settings.test.js"
s = read(p)
s = s.replace(r"ai-settings\.js\?v=54012", r"ai-settings\.js\?v=54013")
s = s.replace('providerTokenBudget("agnes","adaptive","future",1200),1600', 'providerTokenBudget("agnes","adaptive","future",1200),3000')
s = s.replace('["future",1200,1600]', '["future",1200,3000]')
write(p, s)

# Parser: missing property commas are intentionally recoverable in v0.54.13;
# retain an explicit unrecoverable syntax-error contract.
p = "test/model-json.test.js"
s = read(p)
pattern = re.compile(
    r'test\("model JSON parser normalizes native JSON syntax errors",\(\)=>\{\n'
    r' assert\.throws\(\n'
    r'  \(\)=>parseModelJSON\(\'\{"worldBible":\{"era":"潮紀" "tone":"灰暗"\}\}\'\),\n'
    r'  /INVALID_MODEL_JSON:\.\*Expected/\n'
    r' \)\n'
    r'\}\);'
)
replacement = '''test("model JSON parser still rejects unrecoverable native JSON syntax errors",()=>{\n assert.throws(\n  ()=>parseModelJSON('{"worldBible":{"era":"潮紀",,"tone":"灰暗"}}'),\n  /INVALID_MODEL_JSON/\n )\n});'''
s2, count = pattern.subn(replacement, s, count=1)
if count != 1:
    raise SystemExit(f"model-json legacy error test replacement count={count}")
write(p, s2)

# Cache graph: root release edges move to 54013. Historical untouched edges remain pinned.
p = "test/module-cache.test.js"
s = read(p)
s = s.replace("v0.54.12 keeps structured AI and Developer Autotest cache graphs coherent", "v0.54.13 keeps structured AI and Developer Autotest cache graphs coherent")
s = s.replace(r"app\.js\?v=54012", r"app\.js\?v=54013")
s = s.replace('appImports.every(x=>x==="54012")', 'appImports.every(x=>x==="54013")')
s = s.replace("all app browser imports must use the release token", "all app browser imports must use the v0.54.13 release token")
s = s.replace(r"\.\/ai-settings\.js\?v=54008", r"\.\/ai-settings\.js\?v=54013")
s = s.replace(r"\.\/turn-outcome\.js\?v=54012", r"\.\/turn-outcome\.js\?v=54013")
s = s.replace(r"\.\/state-sync\.js\?v=54012", r"\.\/state-sync\.js\?v=54013")
s = s.replace(r"\.\/ai-runtime-contracts\.js\?v=54012", r"\.\/ai-runtime-contracts\.js\?v=54013")
s = s.replace('tokens.every(x=>x==="54012")', 'tokens.every(x=>["54012","54013"].includes(x))')
s = s.replace("imports must use 54012", "imports must use tracked release tokens")
write(p, s)

# Staged world compiler: Future gets one larger, non-retrying structured response budget.
p = "test/staged-world-compiler.test.js"
s = read(p)
s = s.replace("for(const timeout of [35000,50000,55000,65000])", "for(const timeout of [35000,50000,55000,65000,70000])")
s = s.replace("for(const budget of [500,800,900,1000,1100,1400,1600,2200])", "for(const budget of [500,800,900,1000,1100,1400,1600,3000])")
s = s.replace("timeoutMs:55000,retryOnTimeout:false,maxOutputTokens:2200", "timeoutMs:70000,retryOnTimeout:false,maxOutputTokens:3000")
s = s.replace(r"ai-settings\.js\?v=54008", r"ai-settings\.js\?v=54013")
s = s.replace(r"world-compiler\.js\?v=54012", r"world-compiler\.js\?v=54013")
write(p, s)

# v0.54.12 regression behavior remains covered, but ai-client's current release edges are v0.54.13.
p = "test/v05412-regressions.test.js"
s = read(p)
s = s.replace(r"\.\/turn-outcome\.js\?v=54012", r"\.\/turn-outcome\.js\?v=54013")
s = s.replace(r"\.\/ai-runtime-contracts\.js\?v=54012", r"\.\/ai-runtime-contracts\.js\?v=54013")
write(p, s)

print("v0.54.13 legacy test contracts updated")
