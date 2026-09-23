from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

def read(path):
    return (ROOT/path).read_text(encoding="utf-8")

def write(path,text):
    (ROOT/path).write_text(text,encoding="utf-8")

# Preserve legacy/unpaced Future contracts while enabling protection for normal paced worlds.
p=Path("src/world-pacing.js")
t=read(p)
old='''export function eventDangerProfile(state){
 const p=pacingPhase(state),seedDanger=clamp(Math.round(Number(state.world?.seedContract?.danger)||3),1,5),newbieProtection=p.day<=1;
 const progress=clamp((p.day-1)/Math.max(1,p.horizon-1),0,1);
'''
new='''export function eventDangerProfile(state){
 const p=pacingPhase(state),seedDanger=clamp(Math.round(Number(state.world?.seedContract?.danger)||3),1,5),hasPacing=Number(state.world?.timelinePacing?.horizonDays)>=2;
 if(!hasPacing)return {...p,seedDanger,newbieProtection:false,rampTier:5,maxDanger:5,pressureCap:20,intensityCap:100,futurePressureCap:100,legacyUnpaced:true};
 const newbieProtection=p.day<=1;
 const progress=clamp((p.day-1)/Math.max(1,p.horizon-1),0,1);
'''
if old not in t: raise SystemExit("world-pacing legacy anchor missing")
t=t.replace(old,new,1)
write(p,t)

# Future Engine keeps its existing deterministic pressure contract. The Timeline trigger gate is the protection boundary.
p=Path("src/future-runtime.js")
t=read(p)
t=t.replace('import {eventDangerProfile} from "./world-pacing.js?v=54018p1";\n','')
t=t.replace('import {eventDangerProfile} from "./world-pacing.js?v=540181";\n','')
old='if(event?.type==="WORLD_EVENT"&&event?.subtype==="TIMELINE_EVENT"){future.activatedDay=Math.max(1,Number(event.day)||Number(state.world?.state?.day)||1);const cap=eventDangerProfile(state).futurePressureCap;return Math.max(0,Math.min(cap,80)-Number(future.pressure||0))}'
new='if(event?.type==="WORLD_EVENT"&&event?.subtype==="TIMELINE_EVENT"){future.activatedDay=Math.max(1,Number(event.day)||Number(state.world?.state?.day)||1);return Math.max(0,80-Number(future.pressure||0))}'
if old not in t: raise SystemExit("future event delta correction anchor missing")
t=t.replace(old,new,1)
old='for(const future of futures){future.pressure=Math.min(Math.max(0,Number(future.pressure)||0),eventDangerProfile(state).futurePressureCap);recomputeFutureStage(state,future);if(future.activatedDay&&future.stage!=="RESOLVED"&&Number(future.pressure||0)>=80)future.stage="ACTIVE";const signal=emitForeshadowing(state,future,rt);if(signal)signals.push(signal)}'
new='for(const future of futures){recomputeFutureStage(state,future);if(future.activatedDay&&future.stage!=="RESOLVED"&&Number(future.pressure||0)>=80)future.stage="ACTIVE";const signal=emitForeshadowing(state,future,rt);if(signal)signals.push(signal)}'
if old not in t: raise SystemExit("future pressure loop correction anchor missing")
t=t.replace(old,new,1)
write(p,t)

# Browser cache identities must remain digits-only. 540181 is the v0.54.18 runtime-hotfix graph.
for p in [ROOT/"app.js",ROOT/"index.html",*(ROOT/"src").glob("*.js"),*(ROOT/"test").glob("*.test.js")]:
    if not p.exists(): continue
    t=p.read_text(encoding="utf-8")
    t=t.replace("54018p1","540181")
    p.write_text(t,encoding="utf-8")

# Strengthen the two authored test fixtures so existing Timeline validation accepts them.
p=Path("test/newbie-protection-v05418.test.js")
t=read(p)
t=t.replace('directorTruth:"節點逐步失衡。",observableEffect:"儀式場出現不穩定震動。"','directorTruth:"地下節點正在逐步失衡並可能引發儀式反噬。",observableEffect:"儀式場地面持續出現可感知的不穩定震動。"')
t=t.replace('directorTruth:"地方衝突可能擴大。",observableEffect:"道路巡查增加。"','directorTruth:"邊境地方衝突正在累積並可能擴大成公開對立。",observableEffect:"道路巡查與臨時檢查開始明顯增加。"')
write(p,t)

# Official app version stays 0.54.18, while the changed browser runtime uses a fresh numeric hotfix token.
p=Path("test/version-05418-release.test.js")
t=read(p)
t=t.replace('assert.match(html,/app\\.js\\?v=54018/);','assert.match(html,/app\\.js\\?v=540181/);')
t=t.replace('assert.ok(tokens.every(x=>x==="54018"));','assert.ok(tokens.every(x=>x==="54018"||x==="540181"));\n assert.ok(tokens.includes("540181"));')
write(p,t)

print("applied compatibility corrections for v0.54.18 newbie protection patch")
