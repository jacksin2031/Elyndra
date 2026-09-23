from pathlib import Path
import re, textwrap

workflow = Path('.github/workflows/tmp-first-button-progressive-expansion.yml').read_text(encoding='utf-8')
start = workflow.index("python - <<'PY'\n") + len("python - <<'PY'\n")
end = workflow.index("\n          PY", start)
body = textwrap.dedent(workflow[start:end])
exec(compile(body, '<embedded-audit-repair>', 'exec'), {'__name__': '__main__'})

# Correct the generated travel helper without dynamic-regex escaping hazards.
p = Path('src/game-engine.js')
s = p.read_text(encoding='utf-8')
replacement = '''function explicitTravelCommand(value,name){const q=clean(value,180),target=clean(name,120);if(!target||!explicitMutationCommand(q))return false;const normalized=q.replace(/[「」『』"']/g,"").replace(/[。.!！]+$/g,"").trim(),lower=normalized.toLowerCase(),t=target.toLowerCase();return normalized===`前往${target}`||normalized===`移動到${target}`||normalized===`走到${target}`||normalized===`去${target}`||normalized===`請前往${target}`||lower===`travel to ${t}`||lower===`go to ${t}`||lower===`walk to ${t}`}\n'''
s, count = re.subn(r'function explicitTravelCommand\(value,name\)\{.*?\}\n(?=function actionProfile)', replacement, s, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'explicitTravelCommand generated helper count={count}')
p.write_text(s, encoding='utf-8')

# Retry marker: the workflow is now installed and watches this file.
