from pathlib import Path


def replace_required(path, replacements):
    p=Path(path); text=p.read_text()
    for old,new in replacements.items():
        if old not in text:
            raise SystemExit(f'missing old contract in {path}: {old}')
        text=text.replace(old,new)
    p.write_text(text)

replace_required('test/autotest-export-v0573.test.js',{
 'id="autotestRetryDebug"':'id="autotestSaveDebug"',
 'id="autotestRetryWorld"':'id="autotestSaveWorld"',
 'id="autotestRetryRecovery"':'id="autotestSaveRecovery"',
})
replace_required('test/ai-autotest-controls-v0544.test.js',{
 'id="autotestRetryDebug"':'id="autotestSaveDebug"',
 'id="autotestRetryWorld"':'id="autotestSaveWorld"',
 'id="autotestRetryRecovery"':'id="autotestSaveRecovery"',
})

p=Path('test/v0552-runtime-regressions.test.js'); text=p.read_text()
old='''test("v0.55.2 FIRST_BUTTON switches to a newly visible recovery route after five stagnant turns",()=>{\n const s=actionState();s.world.registry.locations.push({id:"L2",name:"灰樺鎮蒸汽調節節點",known:true,visibilityLock:"KNOWN"});s.world.travel={routes:[{id:"R1",fromId:"L1",toId:"L2",open:true}]};s.suggestionIntents=[{label:"再問一次",action:"再問閥-04一次",kind:"SOCIAL",progression:true,targetId:"N1"}];\n const recent=Array.from({length:5},(_,i)=>({turn:i+1,progressed:false,action:"再問一次",kind:"SOCIAL"})),decision=firstButtonAutotestDecision(s,recent);\n assert.equal(decision.firstButtonOverride,true);assert.equal(decision.kind,"TRAVEL");assert.equal(decision.targetId,"L2");assert.match(decision.action,/灰樺鎮蒸汽調節節點/)\n});'''
new='''test("v0.57.4 FIRST_BUTTON stays pinned to the first visible button after five stagnant turns",()=>{\n const s=actionState();s.world.registry.locations.push({id:"L2",name:"灰樺鎮蒸汽調節節點",known:true,visibilityLock:"KNOWN"});s.world.travel={routes:[{id:"R1",fromId:"L1",toId:"L2",open:true}]};s.suggestionIntents=[{label:"再問一次",action:"再問閥-04一次",kind:"SOCIAL",progression:true,targetId:"N1"}];\n const recent=Array.from({length:5},(_,i)=>({turn:i+1,progressed:false,action:"再問一次",kind:"SOCIAL"})),decision=firstButtonAutotestDecision(s,recent);\n assert.equal(decision.firstButton,true);assert.equal(decision.suggestionIndex,0);assert.equal(decision.kind,"SOCIAL");assert.equal(decision.targetId,"N1");assert.equal(decision.action,"再問閥-04一次");assert.notEqual(decision.firstButtonOverride,true)\n});'''
if old not in text: raise SystemExit('missing v0552 FIRST_BUTTON override contract')
p.write_text(text.replace(old,new,1))
