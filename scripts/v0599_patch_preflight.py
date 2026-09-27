from pathlib import Path

p=Path('scripts/v0599_patch.py')
s=p.read_text()
start=s.index("old='const destination=firstButtonRecoveryDestination(state),recovered=destination?")
end=s.index("old='const decision={mode:\"free\"", start)
replacement=r'''old='action:`前往${destination.name}`,kind:"TRAVEL",progression:true,targetId:destination.id'
new='action:autotestTravelAction(destination.target,destination.known),kind:"TRAVEL",progression:true,targetId:destination.target.id'
if old not in s: raise SystemExit('stall destination expression missing')
s=s.replace(old,new,1)
'''
s=s[:start]+replacement+s[end:]
p.write_text(s)
