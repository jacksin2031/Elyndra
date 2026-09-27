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
# Match the existing FIRST_BUTTON unavailable fallback shape, including firstButtonUnavailable=true.
start=s.index("old='const decision={mode:\"free\"", s.index('# Legacy stall branch'))
end=s.index("old='label.innerHTML", start)
replacement='''old='const decision={mode:"free",suggestionIndex:null,action:"觀察四周並確認目前最明顯的變化",kind:"OBSERVE",progression:false,targetId:null,combatAction:null,reason:"FIRST_BUTTON_UNAVAILABLE_FALLBACK",goalReached:false,goalEvidence:"",firstButton:true,firstButtonUnavailable:true};recordDebug("AUTOTEST_FIRST_BUTTON_UNAVAILABLE",{worldId,location:snapshot?.world?.location||"",fallbackAction:decision.action,stall});return decision'\nnew='const destination=firstButtonRecoveryDestination(state);if(destination){const decision={mode:"free",suggestionIndex:null,action:autotestTravelAction(destination.target,destination.known),kind:"TRAVEL",progression:true,targetId:destination.target.id,combatAction:null,reason:"FIRST_BUTTON_UNAVAILABLE_TRAVEL",goalReached:false,goalEvidence:"",firstButton:true,firstButtonOverride:true};recordDebug("AUTOTEST_FIRST_BUTTON_UNAVAILABLE_TRAVEL",{worldId,location:snapshot?.world?.location||"",targetId:decision.targetId,targetKnown:destination.known});return decision}const decision={mode:"free",suggestionIndex:null,action:autotestCopy("observe"),kind:"OBSERVE",progression:false,targetId:null,combatAction:null,reason:"FIRST_BUTTON_UNAVAILABLE_FALLBACK",goalReached:false,goalEvidence:"",firstButton:true,firstButtonUnavailable:true};recordDebug("AUTOTEST_FIRST_BUTTON_UNAVAILABLE",{worldId,location:snapshot?.world?.location||"",fallbackAction:decision.action,stall});return decision'\nif old not in s: raise SystemExit('unavailable fallback missing')\ns=s.replace(old,new,1)\n'''
s=s[:start]+replacement+s[end:]
p.write_text(s)
