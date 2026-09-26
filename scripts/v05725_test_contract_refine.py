from pathlib import Path

def replace_once(path,old,new):
    p=Path(path);text=p.read_text(encoding='utf-8');count=text.count(old)
    if count!=1: raise SystemExit(f'{path}: expected one match, got {count}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# This helper test intends to exercise locality/hidden-world filtering, not unrevealed-name masking.
# Mark its two deliberately "known" fixture identities as name-known; v0.57.25 has a separate negative name-leak regression.
replace_once('test/helper-ai.test.js',
' const a=s.world.registry.npcs.find(x=>x.name==="艾琳"),b=s.world.registry.npcs.find(x=>x.name==="洛安");\n revealRegistryEntities(s,[{kind:"npc",id:a.id}]);',
' const a=s.world.registry.npcs.find(x=>x.name==="艾琳"),b=s.world.registry.npcs.find(x=>x.name==="洛安");\n a.nameKnown=true;b.nameKnown=true;\n revealRegistryEntities(s,[{kind:"npc",id:a.id}]);')

# Keep the staged compiler test focused on concurrency/transport semantics instead of freezing one-line implementation shape.
replace_once('test/staged-world-compiler.test.js',
' assert.match(client,/withWorldAiSlot\\(async\\(\\)=>parseJSON\\(await directChat\\(\\{\\.\\.\\.args,aiTask:args\\?\\.aiTask\\|\\|worldStageTask\\(stage\\)\\}\\)\\)\\)/);',
' assert.match(client,/withWorldAiSlot\\(async\\(\\)=>\\{/);assert.match(client,/WORLD_TRADITIONAL_CHINESE_CONTRACT/);assert.match(client,/simplifiedChineseLeak\\(value\\)/);assert.match(client,/aiTask:args\\?\\.aiTask\\|\\|worldStageTask\\(stage\\)/);')
print('v0.57.25 test contracts refined')
