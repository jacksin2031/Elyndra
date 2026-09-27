from pathlib import Path

p=Path('scripts/v0599_patch.py')
s=p.read_text()
start=s.index("old='const destination=firstButtonRecoveryDestination(state),recovered=destination?")
end=s.index("old='const decision={mode:\"free\"", start)
replacement=r'''m=re.search(r'const destination=firstButtonRecoveryDestination\(state\),recovered=destination\?\{mode:"free",suggestionIndex:null,action:`前往\$\{destination\.name\}`,kind:"TRAVEL",progression:true,targetId:destination\.id,combatAction:null,reason:"FIRST_BUTTON_STALL_RECOVERY",goalReached:false,goalEvidence:"",fallback:true\}:deterministicAutotestDecision\(snapshot,recentActions,"FIRST_BUTTON_STALL_RECOVERY"\)',s)
if not m: raise SystemExit('stall destination expression missing')
new='const destination=firstButtonRecoveryDestination(state),recovered=destination?{mode:"free",suggestionIndex:null,action:autotestTravelAction(destination.target,destination.known),kind:"TRAVEL",progression:true,targetId:destination.target.id,combatAction:null,reason:"FIRST_BUTTON_STALL_RECOVERY",goalReached:false,goalEvidence:"",fallback:true}:deterministicAutotestDecision(snapshot,recentActions,"FIRST_BUTTON_STALL_RECOVERY")'
s=s[:m.start()]+new+s[m.end():]
'''
s=s[:start]+replacement+s[end:]
p.write_text(s)
