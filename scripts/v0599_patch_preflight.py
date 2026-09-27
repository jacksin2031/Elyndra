from pathlib import Path

p=Path('scripts/v0599_patch.py')
s=p.read_text()
# Keep backward-compatible destination.name/id while attaching target/known metadata.
s=s.replace('return {target,known:true}', 'return {...target,target,known:true}')
s=s.replace('unexplored={target,known:false}', 'unexplored={...target,target,known:false}')
# The legacy stall branch can continue using destination.name/id; skip the brittle rewrite.
start=s.index("old='const destination=firstButtonRecoveryDestination(state),recovered=destination?")
end=s.index("old='const decision={mode:\"free\"", start)
s=s[:start]+"# Legacy stall branch remains compatible via spread destination metadata.\n"+s[end:]
p.write_text(s)
