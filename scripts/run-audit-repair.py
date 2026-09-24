from pathlib import Path
import re
import subprocess

status = []
p = Path('src/game-engine.js')
if not p.exists():
    raise SystemExit('src/game-engine.js missing')

s = p.read_text(encoding='utf-8')

# v0.54.19 regression guard: the previous parser normalizer replaced the
# whole region between explicitTravelCommand and actionProfile and therefore
# removed PROFILES plus the actionProfile export.
profiles = '''const PROFILES={
 OBSERVE:{dc:10,minutes:15},
 SOCIAL:{dc:11,minutes:20},
 TRAVEL:{dc:12,minutes:45},
 RISKY:{dc:14,minutes:30},
 GENERAL:{dc:12,minutes:30}
};
'''

if 'const PROFILES=' not in s:
    marker = 'function actionProfile(input="")'
    idx = s.find(marker)
    if idx < 0:
        raise RuntimeError('actionProfile marker not found')
    s = s[:idx] + profiles + s[idx:]
    status.append('restored PROFILES')
else:
    status.append('PROFILES already present')

plain = 'function actionProfile(input="")'
exported = 'export function actionProfile(input="")'
if exported not in s:
    if plain not in s:
        raise RuntimeError('actionProfile declaration not found')
    s = s.replace(plain, exported, 1)
    status.append('restored actionProfile export')
else:
    status.append('actionProfile export already present')

# Deterministic mutations are allowed only for explicit commands. Negated or
# compound natural-language sentences must fall through to intent/AI handling.
old_rest = ' const q=clean(label,180);if(!/休息|睡眠|睡覺|紮營|露營|rest|sleep|camp/i.test(q))return null;'
new_rest = ' const q=clean(label,180);if(!explicitRestCommand(q))return null;'
if old_rest in s:
    s = s.replace(old_rest, new_rest, 1)
    status.append('hardened deterministic rest command')
elif new_rest in s:
    status.append('deterministic rest command already hardened')
else:
    raise RuntimeError('deterministicRestAction guard not found')

old_travel = ' const q=clean(label,180),target=(state.world?.registry?.locations||[]).find(x=>x.known===true&&x.name&&q.includes(x.name));if(!target||!/前往|移動|走到|旅行|去|travel|go to|walk/i.test(q))return null;'
new_travel = ' const q=clean(label,180),target=(state.world?.registry?.locations||[]).find(x=>x.known===true&&x.name&&q.includes(x.name));if(!target||!explicitTravelCommand(q,target.name))return null;'
if old_travel in s:
    s = s.replace(old_travel, new_travel, 1)
    status.append('hardened deterministic travel command')
elif new_travel in s:
    status.append('deterministic travel command already hardened')
else:
    raise RuntimeError('deterministicKnownTravel guard not found')

p.write_text(s, encoding='utf-8')

# v0.54.19 introduced stable state aliases/session tokens around asynchronous
# work and moved the browser cache generation forward. Preserve the old test
# invariants while teaching source-level regression tests the new wiring.
patched_paths = []
def replace_in_file(path, replacements):
    f = Path(path)
    text = f.read_text(encoding='utf-8')
    original = text
    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)
    if text != original:
        f.write_text(text, encoding='utf-8')
        patched_paths.append(path)

replace_in_file('test/background-world-evolution.test.js', [
    ('generateRegionExpansion(gameState,reason,{signal:ctrl.signal,plan,onStage:stage=>commitRuntimeStageCheckpoint(plan,stage)})',
     'generateRegionExpansion(state,reason,{signal:ctrl.signal,plan,onStage:stage=>commitRuntimeStageCheckpoint(plan,stage,sessionToken,state)})')
])
replace_in_file('test/fast-deferred-director.test.js', [
    ('commitStatePatch\\(gameState,patch,plan/', 'commitStatePatch\\(state,patch,plan/'),
    ('deferredPlanFrom\\(basePlan,currentStateRevision\\(gameState\\)\\)/', 'deferredPlanFrom\\(basePlan,currentStateRevision\\(state\\)\\)/')
])
replace_in_file('test/history-lazy-deepen-v047.test.js', [
    ('generateHistoryDeepening\\(gameState,plan,\\{signal:ctrl\\.signal\\}\\)/', 'generateHistoryDeepening\\(state,plan,\\{signal:ctrl\\.signal\\}\\)/'),
    ('validateHistoryDeepeningCandidate\\(gameState,plan,candidate\\)/', 'validateHistoryDeepeningCandidate\\(state,plan,candidate\\)/'),
    ('commitHistoryDeepening\\(gameState,plan,candidate\\)/', 'commitHistoryDeepening\\(state,plan,candidate\\)/')
])
replace_in_file('test/nonblocking-turn-sync.test.js', [
    ('assert.match(app,/currentStateRevision\\(gameState\\)!==revision/);',
     'assert.match(app,/isCurrentStateSession\\(sessionToken\\)/);assert.match(app,/applyPlayerActionScene\\(scene,\\{worldId,baseRevision,roll,action,previousSuggestions,previousSuggestionIntents,state,sessionToken\\}\\)/);'),
    ('assert.match(app,/async function runAction\\(action,customText="",options=\\{\\}\\)\\{\\s*if\\(!gameState\\)return;markForegroundActivity\\(\\);preemptBackgroundAI\\(\\)/);',
     'assert.match(app,/async function runAction\\(action,customText="",options=\\{\\}\\)\\{\\s*if\\(!gameState\\)return;const actionState=gameState,actionSession=captureStateSession\\(\\);markForegroundActivity\\(\\);preemptBackgroundAI\\(\\)/);')
])
replace_in_file('test/runtime-grounding-v05418.test.js', [
    ('acquisition-notifier\\.js\\?v=54018', 'acquisition-notifier\\.js\\?v=54019'),
    ('state-sync\\.js\\?v=54018', 'state-sync\\.js\\?v=54019')
])
replace_in_file('test/staged-world-compiler.test.js', [
    ('ai-settings\\.js\\?v=54018', 'ai-settings\\.js\\?v=54019'),
    ('seed-contract\\.js\\?v=54018', 'seed-contract\\.js\\?v=54019'),
    ('world-compiler\\.js\\?v=54018', 'world-compiler\\.js\\?v=54019'),
    ('recognition-engine\\.js\\?v=54018', 'recognition-engine\\.js\\?v=54019')
])
replace_in_file('test/v05412-regressions.test.js', [
    ('turn-outcome\\.js\\?v=54018', 'turn-outcome\\.js\\?v=54019'),
    ('ai-runtime-contracts\\.js\\?v=54018', 'ai-runtime-contracts\\.js\\?v=54019')
])
replace_in_file('test/v05414-regressions.test.js', [
    ('runtime-generation-normalizer\\.js\\?v=54018', 'runtime-generation-normalizer\\.js\\?v=54019')
])
replace_in_file('test/version-05418-release.test.js', [
    ('Official v0.54.18 release contract', 'Official v0.54.19 release contract'),
    ('v0.54.18 is the canonical app and browser cache release', 'v0.54.19 is the canonical app and browser cache release'),
    ('"0.54.18"', '"0.54.19"'),
    ('APP_VERSION="0\\.54\\.18"', 'APP_VERSION="0\\.54\\.19"'),
    ('app\\.js\\?v=540181', 'app\\.js\\?v=54019'),
    ('x==="54018"||x==="540181"', 'x==="54019"'),
    ('tokens.includes("540181")', 'tokens.includes("54019")')
])
replace_in_file('test/version-ui.test.js', [
    ('// v0.54.18 release contract', '// v0.54.19 release contract'),
    ('"0.54.18"', '"0.54.19"'),
    ('\\?v=54018', '\\?v=54019'),
    ('after v0.54.18 runtime checkpoint hardening', 'after v0.54.19 session/checkpoint hardening')
])
replace_in_file('test/visibility-lazy-generation-v044.test.js', [
    ('generateRegionExpansion\\(gameState,reason,\\{signal:ctrl\\.signal,plan,onStage:stage=>commitRuntimeStageCheckpoint\\(plan,stage\\)\\}\\)/',
     'generateRegionExpansion\\(state,reason,\\{signal:ctrl\\.signal,plan,onStage:stage=>commitRuntimeStageCheckpoint\\(plan,stage,sessionToken,state\\)\\}\\)/'),
    ('validateLazyGenerationCandidate\\(gameState,ex\\.generation,plan,\\{added:plan\\.checkpoint\\?\\.added\\}\\)/',
     'validateLazyGenerationCandidate\\(state,ex\\.generation,plan,\\{added:plan\\.checkpoint\\?\\.added\\}\\)/'),
    ('plan\\.checkpoint\\?\\.added\\|\\|canonizeGeneration\\(gameState,ex\\.generation\\)/',
     'plan\\.checkpoint\\?\\.added\\|\\|canonizeGeneration\\(state,ex\\.generation\\)/'),
    ('commitLazyGeneration\\(gameState,plan,ex\\.generation,added,\\{sourceProvider:ex\\.generationSource\\?\\.provider,sourceModel:ex\\.generationSource\\?\\.model\\}\\)/',
     'commitLazyGeneration\\(state,plan,ex\\.generation,added,\\{sourceProvider:ex\\.generationSource\\?\\.provider,sourceModel:ex\\.generationSource\\?\\.model\\}\\)/'),
    ('plan\\.status==="PLANNED"&&!checkpointed\\)abortLazyGeneration\\(gameState,plan/',
     'plan\\.status==="PLANNED"&&!checkpointed\\)abortLazyGeneration\\(state\\|\\|\\{world:\\{\\}\\},plan/')
])
replace_in_file('test/module-cache.test.js', [
    ('v0.54.18 keeps structured AI and Developer Autotest cache graphs coherent', 'v0.54.19 keeps structured AI and Developer Autotest cache graphs coherent'),
    ('app\\.js\\?v=540181', 'app\\.js\\?v=54019'),
    ('appImports.every(x=>["54018","540181"].includes(x))', 'appImports.every(x=>x==="54019")'),
    ('all app browser imports must use tracked v0.54.18 release or numeric hotfix tokens', 'all app browser imports must use the v0.54.19 cache generation'),
    ('appImports.includes("540181")', 'appImports.includes("54019")'),
    ('the runtime hotfix graph must expose a fresh numeric cache token', 'the runtime graph must expose the v0.54.19 cache token'),
    ('client,/\\.\\/ai-settings\\.js\\?v=54018/', 'client,/\\.\\/ai-settings\\.js\\?v=54019/'),
    ('client,/\\.\\/turn-compiler\\.js\\?v=54018/', 'client,/\\.\\/turn-compiler\\.js\\?v=54019/'),
    ('client,/\\.\\/turn-outcome\\.js\\?v=54018/', 'client,/\\.\\/turn-outcome\\.js\\?v=54019/'),
    ('client,/\\.\\/action-intent\\.js\\?v=54018/', 'client,/\\.\\/action-intent\\.js\\?v=54019/'),
    ('client,/\\.\\/state-sync\\.js\\?v=54018/', 'client,/\\.\\/state-sync\\.js\\?v=54019/'),
    ('client,/\\.\\/ai-runtime-contracts\\.js\\?v=540181/', 'client,/\\.\\/ai-runtime-contracts\\.js\\?v=54019/'),
    ('client,/\\.\\/knowledge-model\\.js\\?v=54018/', 'client,/\\.\\/knowledge-model\\.js\\?v=54019/'),
    ('client,/\\.\\/lazy-generation\\.js\\?v=54018/', 'client,/\\.\\/lazy-generation\\.js\\?v=54019/'),
    ('tokens.every(x=>["54018","540181"].includes(x))', 'tokens.every(x=>["54018","54019"].includes(x))')
])

if patched_paths:
    status.append('updated v0.54.19 regression contracts: ' + ', '.join(patched_paths))

# Fail immediately if this focused repair introduces a syntax regression.
check = subprocess.run(['node', '--check', str(p)], text=True, capture_output=True)
if check.returncode:
    raise RuntimeError(check.stderr.strip())
status.append('src/game-engine.js syntax PASS')

Path('audit-repair-status.txt').write_text('\n'.join(status) + '\n', encoding='utf-8')

subprocess.run(['git', 'config', 'user.name', 'Elyndra Audit Repair'], check=True)
subprocess.run(['git', 'config', 'user.email', 'actions@users.noreply.github.com'], check=True)
subprocess.run(['git', 'add', 'src/game-engine.js', 'audit-repair-status.txt', *patched_paths], check=True)
changed = subprocess.run(['git', 'diff', '--cached', '--quiet']).returncode != 0
if changed:
    subprocess.run(['git', 'commit', '-m', 'fix: align v0.54.19 regression contracts with session-safe runtime'], check=True)
    subprocess.run(['git', 'push', 'origin', 'HEAD:fix/audit-2026-09-24-all'], check=True)

# Capture the suite once inside the repair step. Besides the tail, emit a compact
# failure index so connector clients can inspect every failed test without the
# enormous `actual:` payload produced by source-regex assertions.
test_run = subprocess.run(['npm', 'test'], text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
output = test_run.stdout or ''
Path('audit-test-output.txt').write_text(output[-60000:], encoding='utf-8')
lines = output.splitlines()
result_indexes = [i for i, row in enumerate(lines) if re.match(r'^(?:ok|not ok)\s+\d+\s+-\s+', row)]
failures = []
for pos, i in enumerate(result_indexes):
    line = lines[i]
    if not line.startswith('not ok '):
        continue
    end = result_indexes[pos + 1] if pos + 1 < len(result_indexes) else len(lines)
    segment = lines[i + 1:end]
    item = [line]
    wanted_prefixes = ('  error:', '  code:', '  operator:', '  expected:')
    for row in segment:
        if row.startswith(wanted_prefixes):
            item.append(row[:1000])
        elif 'TestContext.<anonymous>' in row:
            item.append(row.strip())
    failures.append('\n'.join(item))
summary_rows = [row for row in lines if re.match(r'^# (tests|pass|fail|cancelled|skipped|todo)\s', row)]
compact = '\n\n'.join(failures)
if summary_rows:
    compact += '\n\n' + '\n'.join(summary_rows)
Path('audit-test-failures.txt').write_text(compact + '\n', encoding='utf-8')
subprocess.run(['git', 'add', 'audit-test-output.txt', 'audit-test-failures.txt'], check=True)
diagnostic_changed = subprocess.run(['git', 'diff', '--cached', '--quiet']).returncode != 0
if diagnostic_changed:
    subprocess.run(['git', 'commit', '-m', 'chore: refresh compact v0.54.19 test failures'], check=True)
    subprocess.run(['git', 'push', 'origin', 'HEAD:fix/audit-2026-09-24-all'], check=True)

status.append(f'full suite diagnostic exit={test_run.returncode}')
status.append(f'failed tests captured={len(failures)}')
print('\n'.join(status))
