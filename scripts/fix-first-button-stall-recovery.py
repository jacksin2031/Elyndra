from pathlib import Path

path=Path('app.js')
source=path.read_text(encoding='utf-8')

old='''async function expandDeveloperAutotestWorld(reason="WORLD_EDGE_UNDERDEFINED",options={}){
 const state=gameState,sessionToken=captureStateSession(),pending=pendingRuntimeGenerationPlan(state);if(!developerAutotestActive||!state||!aiStatus.aiConfigured||(!needsExpansion(state)&&!pending))return false;
 const background=options?.background===true,signal=options?.signal||developerAutotest.batchController?.signal,plan=pending||planLazyGeneration(state,{reason}),startedAt=Date.now();recordDebug("AUTOTEST_RUNTIME_EXPANSION_STARTED",{reason,planId:plan.id,resumeStage:plan.checkpoint?.stage||null,background});'''
new='''async function expandDeveloperAutotestWorld(reason="WORLD_EDGE_UNDERDEFINED",options={}){
 const state=gameState,sessionToken=captureStateSession(),pending=pendingRuntimeGenerationPlan(state),force=options?.force===true;if(!developerAutotestActive||!state||!aiStatus.aiConfigured||(!force&&!needsExpansion(state)&&!pending))return false;
 const background=options?.background===true,signal=options?.signal||developerAutotest.batchController?.signal,plan=pending||planLazyGeneration(state,{reason}),startedAt=Date.now();recordDebug("AUTOTEST_RUNTIME_EXPANSION_STARTED",{reason,planId:plan.id,resumeStage:plan.checkpoint?.stage||null,background,force});'''
if old in source:
    source=source.replace(old,new,1)
elif new not in source:
    raise SystemExit('expandDeveloperAutotestWorld anchor not found')

old='''function scheduleDeveloperAutotestExpansion(reason="FIRST_BUTTON_STALL_RECOVERY",turn=0){
 if(!developerAutotestActive||!developerAutotest.running||!gameState||!aiStatus.aiConfigured||autotestRuntimeExpansion.running||!needsExpansion(gameState))return false;
 const stateToken=captureStateSession(),batchSignal=developerAutotest.batchController?.signal;if(batchSignal?.aborted)return false;'''
new='''function scheduleDeveloperAutotestExpansion(reason="FIRST_BUTTON_STALL_RECOVERY",turn=0){
 const forcedRecovery=reason==="FIRST_BUTTON_STALL_RECOVERY";
 if(!developerAutotestActive||!developerAutotest.running||!gameState||!aiStatus.aiConfigured||autotestRuntimeExpansion.running||(!forcedRecovery&&!needsExpansion(gameState)))return false;
 const stateToken=captureStateSession(),batchSignal=developerAutotest.batchController?.signal;if(batchSignal?.aborted)return false;'''
if old in source:
    source=source.replace(old,new,1)
elif new not in source:
    raise SystemExit('scheduleDeveloperAutotestExpansion guard anchor not found')

old=''' void expandDeveloperAutotestWorld(reason,{background:true,signal:ctrl.signal}).then(ok=>{if(isCurrentStateSession(stateToken))recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_COMPLETED",{reason,turn,worldId,ok})}).finally(()=>{if(batchSignal)batchSignal.removeEventListener("abort",relay);if(autotestRuntimeExpansion.controller===ctrl)autotestRuntimeExpansion.controller=null;autotestRuntimeExpansion.running=false;autotestRuntimeExpansion.reason="";autotestRuntimeExpansion.turn=0});'''
new=''' void expandDeveloperAutotestWorld(reason,{background:true,signal:ctrl.signal,force:forcedRecovery}).then(ok=>{if(isCurrentStateSession(stateToken))recordDebug("AUTOTEST_RUNTIME_EXPANSION_BACKGROUND_COMPLETED",{reason,turn,worldId,ok,forcedRecovery})}).finally(()=>{if(batchSignal)batchSignal.removeEventListener("abort",relay);if(autotestRuntimeExpansion.controller===ctrl)autotestRuntimeExpansion.controller=null;autotestRuntimeExpansion.running=false;autotestRuntimeExpansion.reason="";autotestRuntimeExpansion.turn=0});'''
if old in source:
    source=source.replace(old,new,1)
elif new not in source:
    raise SystemExit('background expansion call anchor not found')

old='''     developerAutotest.turn=turn;const firstButtonFast=config.playStrategy==="FIRST_BUTTON";let firstButtonExpansionReason="";if(!firstButtonFast&&needsExpansion(gameState))await expandDeveloperAutotestWorld("WORLD_EDGE_UNDERDEFINED");else if(firstButtonFast&&needsExpansion(gameState)){const stall=autotestRecentStallCount(recentActions),sparseWorld=(gameState.world?.registry?.locations||[]).length<=1&&turn>=5;if(stall>=3||sparseWorld)firstButtonExpansionReason=stall>=3?"FIRST_BUTTON_STALL_RECOVERY":"FIRST_BUTTON_SPARSE_WORLD";else recordDebug("AUTOTEST_RUNTIME_EXPANSION_SKIPPED",{reason:"FIRST_BUTTON_FAST_PATH",phase:"TURN",turn,stall})}if(firstButtonFast)await waitForAutotestActionReady(3000);else await waitForAutotestIdle();'''
new='''     developerAutotest.turn=turn;const firstButtonFast=config.playStrategy==="FIRST_BUTTON";let firstButtonExpansionReason="";if(!firstButtonFast&&needsExpansion(gameState))await expandDeveloperAutotestWorld("WORLD_EDGE_UNDERDEFINED");else if(firstButtonFast){const stall=autotestRecentStallCount(recentActions),expansionNeeded=needsExpansion(gameState),sparseWorld=(gameState.world?.registry?.locations||[]).length<=1&&turn>=5;if(stall>=3)firstButtonExpansionReason="FIRST_BUTTON_STALL_RECOVERY";else if(expansionNeeded&&sparseWorld)firstButtonExpansionReason="FIRST_BUTTON_SPARSE_WORLD";else if(expansionNeeded)recordDebug("AUTOTEST_RUNTIME_EXPANSION_SKIPPED",{reason:"FIRST_BUTTON_FAST_PATH",phase:"TURN",turn,stall})}if(firstButtonFast)await waitForAutotestActionReady(3000);else await waitForAutotestIdle();'''
if old in source:
    source=source.replace(old,new,1)
elif new not in source:
    raise SystemExit('FIRST_BUTTON turn gate anchor not found')

path.write_text(source,encoding='utf-8')
print('FIRST_BUTTON stall recovery can force one bounded background expansion after 3 stalled turns')
