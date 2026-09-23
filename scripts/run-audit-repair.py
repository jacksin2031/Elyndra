from pathlib import Path
import re, subprocess, textwrap, traceback

status = []
error = None
try:
    workflow = Path('.github/workflows/tmp-first-button-progressive-expansion.yml').read_text(encoding='utf-8')
    start = workflow.index("python - <<'PY'\n") + len("python - <<'PY'\n")
    end = workflow.index("\n          PY", start)
    body = textwrap.dedent(workflow[start:end])
    exec(compile(body, '<embedded-audit-repair>', 'exec'), {'__name__': '__main__'})
    status.append('embedded repair completed')
except BaseException as exc:
    error = exc
    status.append('embedded repair failed')
    status.append(traceback.format_exc())

# Repair the travel helper if the embedded patch reached that section.
p = Path('src/game-engine.js')
if p.exists():
    s = p.read_text(encoding='utf-8')
    replacement = '''function explicitTravelCommand(value,name){const q=clean(value,180),target=clean(name,120);if(!target||!explicitMutationCommand(q))return false;const normalized=q.replace(/[「」『』"']/g,"").replace(/[。.!！]+$/g,"").trim(),lower=normalized.toLowerCase(),t=target.toLowerCase();return normalized===`前往${target}`||normalized===`移動到${target}`||normalized===`走到${target}`||normalized===`去${target}`||normalized===`請前往${target}`||lower===`travel to ${t}`||lower===`go to ${t}`||lower===`walk to ${t}`}\n'''
    s2, count = re.subn(r'function explicitTravelCommand\(value,name\)\{.*?\}\n(?=function actionProfile)', replacement, s, count=1, flags=re.S)
    if count == 1:
        p.write_text(s2, encoding='utf-8')
        status.append('explicitTravelCommand normalized')
    else:
        status.append(f'explicitTravelCommand normalization skipped count={count}')

Path('audit-repair-status.txt').write_text('\n'.join(status) + '\n', encoding='utf-8')

# Persist diagnostic/partial output on the isolated repair branch so it can be reviewed even if later gates fail.
subprocess.run(['git','config','user.name','Elyndra Audit Repair'], check=True)
subprocess.run(['git','config','user.email','actions@users.noreply.github.com'], check=True)
subprocess.run(['git','add','app.js','index.html','package.json','src','api','test','.env.example','audit-repair-status.txt'], check=True)
changed = subprocess.run(['git','diff','--cached','--quiet']).returncode != 0
if changed:
    subprocess.run(['git','commit','-m','wip: capture audit repair output'], check=True)
    subprocess.run(['git','push','origin','HEAD:fix/audit-2026-09-24-all'], check=True)

print('\n'.join(status))
# Keep the workflow moving so syntax/tests can expose any additional problems.
