from pathlib import Path

ROOT=Path('.')
def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def replace(path,old,new,count=1,label='replace'):
    text=read(path); found=text.count(old)
    if found < count: raise SystemExit(f'{label}: expected >= {count} in {path}, got {found}')
    write(path,text.replace(old,new,count))

# Keep health status strict, but count execution completion independently from health.
p='src/ai-autotest.js'; s=read(p)
new_health='if(list(world.actions).some(x=>x?.error)||runtimeRecoveryFailed(world)||String(world?.summary?.coherence?.status||"").toUpperCase()==="FAIL")return "DEGRADED";'
old_health='if(list(world.actions).some(x=>x?.error)||runtimeRecoveryFailed(world)||String(world?.summary?.coherence?.status||"").toUpperCase()==="FAIL"||world?.summary?.coherence?.quality?.pending===true||world?.summary?.coherence?.quality?.unavailable===true)return "DEGRADED";'
if new_health not in s: raise SystemExit('reportedWorldStatus post-patch anchor missing')
s=s.replace(new_health,old_health,1)
s=s.replace('reason:"FIRST_BUTTON_STALL_TRAVEL_RECOVERY"','reason:"FIRST_BUTTON_STALL_RECOVERY"')
s=s.replace('reason:destination?"FIRST_BUTTON_STALL_TRAVEL_RECOVERY":"FIRST_BUTTON_STALL_RECOVERY"','reason:"FIRST_BUTTON_STALL_RECOVERY"')
old='worldsCompleted:effectiveWorlds.filter(w=>w.reportedStatus==="COMPLETED").length,worldsHealthy:effectiveWorlds.filter(w=>w.reportedStatus==="COMPLETED").length'
new='worldsCompleted:effectiveWorlds.filter(executionCompleted).length,worldsHealthy:effectiveWorlds.filter(w=>w.reportedStatus==="COMPLETED").length'
if old not in s: raise SystemExit('completion summary anchor missing')
s=s.replace(old,new,1)
write(p,s)

# Complete the observed Hant normalization gap.
p='src/model-json.js'; s=read(p)
needle='"资":"資"'
if needle not in s: raise SystemExit('Hant map anchor missing')
s=s.replace(needle,'"资":"資","阶":"階"',1); write(p,s)

# Historical contracts: preserve stable recovery reason but assert the now-concrete destination.
p='test/v0552-runtime-regressions.test.js'; s=read(p)
s=s.replace('assert.match(decision.action,/停止重複目前互動/)','assert.equal(decision.action,"前往灰樺鎮蒸汽調節節點");assert.equal(decision.targetId,"L2")',1)
s=s.replace('assert.equal(report.summary.worldsCompleted,0);assert.equal(report.summary.worldsDegraded,1);assert.equal(report.worlds[0].status,"DEGRADED")','assert.equal(report.summary.worldsCompleted,1);assert.equal(report.summary.worldsDegraded,1);assert.equal(report.worlds[0].status,"DEGRADED")',1)
write(p,s)

p='test/autotest-resilience-v0572.test.js'; s=read(p)
old='assert.equal(report.summary.worldsExecuted,1);assert.equal(report.summary.worldsCompleted,0);assert.equal(report.summary.worldsHealthy,0);assert.equal(report.summary.worldsDegraded,1)'
new='assert.equal(report.summary.worldsExecuted,1);assert.equal(report.summary.worldsCompleted,1);assert.equal(report.summary.worldsHealthy,0);assert.equal(report.summary.worldsDegraded,1)'
if old not in s: raise SystemExit('execution/health contract anchor missing')
s=s.replace(old,new,1); write(p,s)

# Current release assertions, including regex-escaped release literals.
for p in ['test/version-0551-release.test.js','test/version-ui.test.js']:
    s=read(p)
    if '0.57.13' not in s and r'0\.57\.13' not in s: raise SystemExit(f'version expectation anchor missing: {p}')
    s=s.replace('0.57.13','0.57.14').replace(r'0\.57\.13',r'0\.57\.14')
    write(p,s)

# The new regression should expect completed execution plus degraded health for advisory critic failure.
p='test/v05714-gameplay-regressions.test.js'; s=read(p)
old='assert.equal(report.summary.worldsCompleted,1);assert.equal(report.summary.worldsDegraded,0)'
new='assert.equal(report.summary.worldsCompleted,1);assert.equal(report.summary.worldsHealthy,0);assert.equal(report.summary.worldsDegraded,1)'
if old not in s: raise SystemExit('v05714 completion/health assertion anchor missing')
s=s.replace(old,new,1); write(p,s)

print('v0.57.14 refinement applied')
