from pathlib import Path

path=Path('app.js')
s=path.read_text(encoding='utf-8')
changed=False

old='''async function runBackgroundWorldQualityCritic(){
 if(developerAutotestActive||!gameState||!aiStatus.aiConfigured||worldQualityBackground.running)return;'''
new='''async function runBackgroundWorldQualityCritic(options={}){
 const allowAutotest=options?.allowAutotest===true;
 if((developerAutotestActive&&!allowAutotest)||!gameState||!aiStatus.aiConfigured||worldQualityBackground.running)return;'''
if old in s:
    s=s.replace(old,new,1);changed=True;print('patched autotest-aware quality critic')
elif new in s:
    print('autotest-aware quality critic already patched')
else:
    raise SystemExit('quality critic marker not found')

marker='''async function waitForAutotestActionReady(timeoutMs=38000){'''
helper='''async function finalizeDeveloperAutotestWorld(config={}){
 if(!gameState||developerAutotest.stopRequested||developerAutotest.batchController?.signal?.aborted)return false;
 const timeoutMs=config.disableTimeout===true?180000:90000,started=Date.now();
 while(Date.now()-started<timeoutMs){
  const settled=!document.hidden&&autotestForegroundIdle()&&!autotestRuntimeExpansion.running&&!worldBackground.running&&!historyBackground.running;
  if(settled)break;
  if(document.hidden)await waitForAutotestVisible();else await new Promise(r=>setTimeout(r,120))
 }
 const runtimeSettled=!document.hidden&&autotestForegroundIdle()&&!autotestRuntimeExpansion.running&&!worldBackground.running&&!historyBackground.running;
 if(!runtimeSettled){recordDebug("AUTOTEST_FINAL_SETTLE_TIMEOUT",{timeoutMs,foregroundIdle:autotestForegroundIdle(),runtimeExpansion:autotestRuntimeExpansion.running,worldBackground:worldBackground.running,historyBackground:historyBackground.running});return false}
 if(backgroundQualityNeed(gameState).required){
  recordDebug("AUTOTEST_FINAL_QUALITY_STARTED",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn});
  await runBackgroundWorldQualityCritic({allowAutotest:true})
 }
 const qualitySettled=!backgroundQualityNeed(gameState).required;
 recordDebug("AUTOTEST_FINAL_QUALITY_SETTLED",{worldIndex:developerAutotest.worldIndex,turn:developerAutotest.turn,qualitySettled});
 return qualitySettled
}
'''
if helper not in s:
    if marker not in s: raise SystemExit('autotest action-ready marker not found')
    s=s.replace(marker,helper+marker,1);changed=True;print('added final autotest settle')
else:
    print('final autotest settle already present')

old_world='''    if(config.mode==="worlds"){
     result.status="COMPLETED";result.phase="GENERATION";result.stopReason="WORLD_GENERATED";result.summary=autotestWorldSummary(gameState);result.world=structuredClone(gameState);developerAutotest.results.push(result);'''
new_world='''    if(config.mode==="worlds"){
     await finalizeDeveloperAutotestWorld(config);
     result.status="COMPLETED";result.phase="GENERATION";result.stopReason="WORLD_GENERATED";result.summary=autotestWorldSummary(gameState);result.world=structuredClone(gameState);developerAutotest.results.push(result);'''
if old_world in s:
    s=s.replace(old_world,new_world,1);changed=True;print('added final quality to world-only autotest')
elif new_world in s:
    print('world-only final quality already present')
else:
    raise SystemExit('world-only completion marker not found')

old_play='''    result.stopReason=result.stopReason||"TURN_LIMIT";result.status="COMPLETED";result.summary=autotestWorldSummary(gameState);result.world=structuredClone(gameState);developerAutotest.results.push(result);'''
new_play='''    await finalizeDeveloperAutotestWorld(config);
    result.stopReason=result.stopReason||"TURN_LIMIT";result.status="COMPLETED";result.summary=autotestWorldSummary(gameState);result.world=structuredClone(gameState);developerAutotest.results.push(result);'''
if old_play in s:
    s=s.replace(old_play,new_play,1);changed=True;print('added final quality to play autotest')
elif new_play in s:
    print('play final quality already present')
else:
    raise SystemExit('play completion marker not found')

if changed:path.write_text(s,encoding='utf-8')
