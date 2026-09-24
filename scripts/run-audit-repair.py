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

# Fail immediately if this focused repair introduces a syntax regression.
check = subprocess.run(['node', '--check', str(p)], text=True, capture_output=True)
if check.returncode:
    raise RuntimeError(check.stderr.strip())
status.append('src/game-engine.js syntax PASS')

Path('audit-repair-status.txt').write_text('\n'.join(status) + '\n', encoding='utf-8')

subprocess.run(['git', 'config', 'user.name', 'Elyndra Audit Repair'], check=True)
subprocess.run(['git', 'config', 'user.email', 'actions@users.noreply.github.com'], check=True)
subprocess.run(['git', 'add', 'src/game-engine.js', 'audit-repair-status.txt'], check=True)
changed = subprocess.run(['git', 'diff', '--cached', '--quiet']).returncode != 0
if changed:
    subprocess.run(['git', 'commit', '-m', 'fix: require explicit deterministic rest and travel commands'], check=True)
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
