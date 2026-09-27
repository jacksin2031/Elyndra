from pathlib import Path

p=Path('scripts/v0599_patch.py')
s=p.read_text()
# Match the actual one-line minified helper by its next function boundary.
s=s.replace("m=re.search(r'function firstButtonRecoveryDestination\\(state=\\{\\}\\)\\{.*?\\n\\}',s,re.S)","m=re.search(r'function firstButtonRecoveryDestination\\(state=\\{\\}\\)\\{.*?(?=\\nfunction repeatedAutotestTarget)',s,re.S)")
# Keep backward-compatible destination.name/id while attaching target/known metadata.
s=s.replace('return {target,known:true}', 'return {...target,target,known:true}')
s=s.replace('unexplored={target,known:false}', 'unexplored={...target,target,known:false}')
# The legacy stall branch can continue using destination.name/id; skip the brittle rewrite.
start=s.index("old='const destination=firstButtonRecoveryDestination(state),recovered=destination?")
end=s.index("old='const decision={mode:\"free\"", start)
s=s[:start]+"# Legacy stall branch remains compatible via spread destination metadata.\n"+s[end:]
# Replace the unavailable fallback by locating its stable reason token, not its minified formatting.
start=s.index("old='const decision={mode:\"free\"", s.index('# Legacy stall branch'))
end=s.index("old='label.innerHTML", start)
replacement=r'''token='reason:"FIRST_BUTTON_UNAVAILABLE_FALLBACK"'
pos=s.index(token)
row_start=s.rfind('const decision={',0,pos)
row_end=s.index('return decision',pos)+len('return decision')
new='const destination=firstButtonRecoveryDestination(state);if(destination){const decision={mode:"free",suggestionIndex:null,action:autotestTravelAction(destination.target,destination.known),kind:"TRAVEL",progression:true,targetId:destination.target.id,combatAction:null,reason:"FIRST_BUTTON_UNAVAILABLE_TRAVEL",goalReached:false,goalEvidence:"",firstButton:true,firstButtonOverride:true};recordDebug("AUTOTEST_FIRST_BUTTON_UNAVAILABLE_TRAVEL",{worldId,location:snapshot?.world?.location||"",targetId:decision.targetId,targetKnown:destination.known});return decision}const decision={mode:"free",suggestionIndex:null,action:autotestCopy("observe"),kind:"OBSERVE",progression:false,targetId:null,combatAction:null,reason:"FIRST_BUTTON_UNAVAILABLE_FALLBACK",goalReached:false,goalEvidence:"",firstButton:true,firstButtonUnavailable:true};recordDebug("AUTOTEST_FIRST_BUTTON_UNAVAILABLE",{worldId,location:snapshot?.world?.location||"",fallbackAction:decision.action,stall});return decision'
s=s[:row_start]+new+s[row_end:]
'''
s=s[:start]+replacement+s[end:]
# The extra UI table's existing final property has no trailing comma. Make insertion comma-safe.
s=s.replace("s=s[:pos]+insert+s[pos:]; p.write_text(s)","prefix=s[:pos].rstrip(); prefix=prefix if prefix.endswith(',') else prefix+','; s=prefix+'\\n'+insert+s[pos:]; p.write_text(s)")
p.write_text(s)
