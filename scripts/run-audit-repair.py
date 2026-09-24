from pathlib import Path
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
    subprocess.run(['git', 'commit', '-m', 'fix: restore v0.54.19 action profiles after parser repair'], check=True)
    subprocess.run(['git', 'push', 'origin', 'HEAD:fix/audit-2026-09-24-all'], check=True)

# Keep an inspectable copy of the full test output while the temporary repair
# workflow is active. GitHub's connector does not expose raw step logs, so this
# file makes the exact failing assertion available on the repair branch.
test_run = subprocess.run(['npm', 'test'], text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
output = test_run.stdout or ''
Path('audit-test-output.txt').write_text(output[-60000:], encoding='utf-8')
subprocess.run(['git', 'add', 'audit-test-output.txt'], check=True)
diagnostic_changed = subprocess.run(['git', 'diff', '--cached', '--quiet']).returncode != 0
if diagnostic_changed:
    subprocess.run(['git', 'commit', '-m', 'chore: capture v0.54.19 failing test output'], check=True)
    subprocess.run(['git', 'push', 'origin', 'HEAD:fix/audit-2026-09-24-all'], check=True)

status.append(f'full suite diagnostic exit={test_run.returncode}')
print('\n'.join(status))
