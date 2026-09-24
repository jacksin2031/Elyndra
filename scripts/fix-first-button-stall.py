from pathlib import Path

path = Path('app.js')
source = path.read_text(encoding='utf-8')

old_expand = '''async function expandDeveloperAutotestWorld(reason="WORLD_EDGE_UNDERDEFINED",options={}){
 const state=gameState,sessionToken=captureStateSession(),pending=pendingRuntimeGenerationPlan(state);if(!developerAutotestActive||!state||!aiStatus.aiConfigured||(!needsExpansion(state)&&!pending))return false;
 const background=options?.background===true,signal=options?.signal||developerAutotest.batchController?.signal,plan=pending||planLazyGeneration(state,{reason}),startedAt=Date.now();recordDebug("AUTOTEST_RUNTIME_EXPANSION_STARTED",{reason,planId:plan.id,resumeStage:plan.checkpoint?.stage||null,background});'''
new_expand = '''async function expandDeveloperAutotestWorld(reason="WORLD_EDGE_UNDERDEFINED",options={}){
 const state=gameState,sessionToken=captureStateSession(),pending=pendingRuntimeGenerationPlan(state),force=options?.force===true;if(!developerAutotestActive||!state||!aiStatus.aiConfigured||(!force&&!needsExpansion(state)&&!pending))return false;
 const background=options?.background===true,signal=options?.signal||developerAutotest.batchController?.signal,plan=pending||planLazyGeneration(state,{reason}),startedAt=Date.now();recordDebug("AUTOTEST_RUNTIME_EXPANSION_STARTED",{reason,planId:plan.id,resumeStage:plan.checkpoint?.stage||null,background,force});'''

old_schedule = '''function scheduleDeveloperAutotestExpansion(reason="FIRST_BUTTON_STALL_RECOVERY",turn=0){
 if(!developerAutotestActive||!developerAutotest.running||!gameState||!aiStatus.aiConfigured||autotestRuntimeExpansion.running||!needsExpansion(gameState))return false;
 const stateToken=captureStateSession(),batchSignal=developerAutotest.batchController?.signal;if(batchSignal?.aborted)return false;
 const ctrl=new AbortController(),worldId=gameState.world?.id,relay=()=>{if(!ctrl.signal.aborted)ctrl.abort(batchSignal?.reason||new DOMException("AutoTest batch stopped","AbortError"))};if(batchSignal)batchSignal.addEventListener("abort",relay,{once:true});
 autotestRuntimeExpansion.running=true;autotestRuntimeExpansion.controller=ctrl;autotestRuntimeExpansion.reason=reason;autotestRuntimeExpansion.turn=turn;recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_STARTED",{reason,turn,worldId});
 void expandDeveloperAutotestWorld(reason,{background:true,signal:ctrl.signal}).then(ok=>{if(isCurrentStateSession(stateToken))recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_COMPLETED",{reason,turn,worldId,ok})}).finally(()=>{if(batchSignal)batchSignal.removeEventListener("abort",relay);if(autotestRuntimeExpansion.controller===ctrl)autotestRuntimeExpansion.controller=null;autotestRuntimeExpansion.running=false;autotestRuntimeExpansion.reason="";autotestRuntimeExpansion.turn=0});'''
new_schedule = '''function scheduleDeveloperAutotestExpansion(reason="FIRST_BUTTON_STALL_RECOVERY",turn=0){
 const forcedRecovery=reason==="FIRST_BUTTON_STALL_RECOVERY";
 if(!developerAutotestActive||!developerAutotest.running||!gameState||!aiStatus.aiConfigured||autotestRuntimeExpansion.running||(!forcedRecovery&&!needsExpansion(gameState)))return false;
 const stateToken=captureStateSession(),batchSignal=developerAutotest.batchController?.signal;if(batchSignal?.aborted)return false;
 const ctrl=new AbortController(),worldId=gameState.world?.id,relay=()=>{if(!ctrl.signal.aborted)ctrl.abort(batchSignal?.reason||new DOMException("AutoTest batch stopped","AbortError"))};if(batchSignal)batchSignal.addEventListener("abort",relay,{once:true});
 autotestRuntimeExpansion.running=true;autotestRuntimeExpansion.controller=ctrl;autotestRuntimeExpansion.reason=reason;autotestRuntimeExpansion.turn=turn;recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_STARTED",{reason,turn,worldId,forcedRecovery});
 void expandDeveloperAutotestWorld(reason,{background:true,signal:ctrl.signal,force:forcedRecovery}).then(ok=>{if(isCurrentStateSession(stateToken))recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_COMPLETED",{reason,turn,worldId,ok})}).finally(()=>{if(batchSignal)batchSignal.removeEventListener("abort",relay);if(autotestRuntimeExpansion.controller===ctrl)autotestRuntimeExpansion.controller=null;autotestRuntimeExpansion.running=false;autotestRuntimeExpansion.reason="";autotestRuntimeExpansion.turn=0});'''

old_turn = '''developerAutotest.turn=turn;const firstButtonFast=config.playStrategy==="FIRST_BUTTON";let firstButtonExpansionReason="";if(!firstButtonFast&&needsExpansion(gameState))await expandDeveloperAutotestWorld("WORLD_EDGE_UNDERDEFINED");else if(firstButtonFast&&needsExpansion(gameState)){const stall=autotestRecentStallCount(recentActions),sparseWorld=(gameState.world?.registry?.locations||[]).length<=1&&turn>=5;if(stall>=3||sparseWorld)firstButtonExpansionReason=stall>=3?"FIRST_BUTTON_STALL_RECOVERY":"FIRST_BUTTON_SPARSE_WORLD";else recordDebug("AUTOTEST_RUNTIME_EXPANSION_SKIPPED",{reason:"FIRST_BUTTON_FAST_PATH",phase:"TURN",turn,stall})}if(firstButtonFast)await waitForAutotestActionReady(3000);else await waitForAutotestIdle();'''
new_turn = '''developerAutotest.turn=turn;const firstButtonFast=config.playStrategy==="FIRST_BUTTON";let firstButtonExpansionReason="";if(!firstButtonFast&&needsExpansion(gameState))await expandDeveloperAutotestWorld("WORLD_EDGE_UNDERDEFINED");else if(firstButtonFast){const stall=autotestRecentStallCount(recentActions),expansionNeeded=needsExpansion(gameState),sparseWorld=(gameState.world?.registry?.locations||[]).length<=1&&turn>=5;if(stall>=3)firstButtonExpansionReason="FIRST_BUTTON_STALL_RECOVERY";else if(expansionNeeded&&sparseWorld)firstButtonExpansionReason="FIRST_BUTTON_SPARSE_WORLD";else recordDebug("AUTOTEST_RUNTIME_EXPANSION_SKIPPED",{reason:"FIRST_BUTTON_FAST_PATH",phase:"TURN",turn,stall,expansionNeeded})}if(firstButtonFast)await waitForAutotestActionReady(3000);else await waitForAutotestIdle();'''

changed = False
for old, new, label in [
    (old_expand, new_expand, 'expandDeveloperAutotestWorld force gate'),
    (old_schedule, new_schedule, 'scheduleDeveloperAutotestExpansion forced recovery'),
    (old_turn, new_turn, 'FIRST_BUTTON stall calculation'),
]:
    if old in source:
        source = source.replace(old, new, 1)
        changed = True
        print('patched', label)
    elif new in source:
        print('already patched', label)
    else:
        raise SystemExit(f'expected block not found: {label}')

if changed:
    path.write_text(source, encoding='utf-8')
