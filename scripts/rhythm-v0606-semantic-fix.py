from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding="utf-8")
def write(path,text): (ROOT/path).write_text(text,encoding="utf-8")
def rep(path,old,new,count=1):
    text=read(path)
    if old not in text: raise SystemExit(f"missing pattern in {path}: {old[:180]!r}")
    text=text.replace(old,new,count)
    write(path,text)

# Keep scene form (mode) separate from narrative function. A clue learned in dialogue is
# SOCIAL as presentation mode but still MYSTERY_PROGRESS as dramatic function.
old='function normalizeBeat(raw={}){const mode=MODE_SET.has(raw.mode)?raw.mode:"EXPLORATION";return {id:clean(raw.id,100)||id("BEAT"),eventId:clean(raw.eventId,120),eventType:clean(raw.eventType,70),mode,tags:Array.isArray(raw.tags)?[...new Set(raw.tags.filter(MODE_SET.has.bind(MODE_SET)))].slice(0,4):[mode],tensionBefore:clamp(Math.round(Number(raw.tensionBefore)||0),0,100),tensionAfter:clamp(Math.round(Number(raw.tensionAfter)||0),0,100),summary:clean(raw.summary,220),day:Math.max(1,Number(raw.day)||1),at:Number(raw.at)||Date.now()}}'
new='function normalizeBeat(raw={}){const mode=MODE_SET.has(raw.mode)?raw.mode:"EXPLORATION",narrativeFunction=clean(raw.narrativeFunction,50)||"NONE";return {id:clean(raw.id,100)||id("BEAT"),eventId:clean(raw.eventId,120),eventType:clean(raw.eventType,70),mode,narrativeFunction,tags:Array.isArray(raw.tags)?[...new Set(raw.tags.filter(MODE_SET.has.bind(MODE_SET)))].slice(0,4):[mode],tensionBefore:clamp(Math.round(Number(raw.tensionBefore)||0),0,100),tensionAfter:clamp(Math.round(Number(raw.tensionAfter)||0),0,100),summary:clean(raw.summary,220),day:Math.max(1,Number(raw.day)||1),at:Number(raw.at)||Date.now()}}'
rep("src/story-rhythm-engine.js",old,new)

old='const priority=["PAYOFF","COMBAT","SOCIAL","MYSTERY","DOWNTIME","EXPLORATION"],mode=priority.find(x=>unique.includes(x))||unique[0];return {mode,tags:unique,text,type}'
new='const priority=["PAYOFF","COMBAT","DOWNTIME","SOCIAL","MYSTERY","EXPLORATION"],mode=priority.find(x=>unique.includes(x))||unique[0],narrativeFunction=unique.includes("PAYOFF")?"PAYOFF":unique.includes("MYSTERY")?"MYSTERY_PROGRESS":PROGRESS_TYPES.test(type)?"PROGRESS":unique.includes("DOWNTIME")?"RECOVERY":unique.includes("SOCIAL")?"SOCIAL_CHANGE":unique.includes("COMBAT")?"THREAT":"EXPLORATION";return {mode,narrativeFunction,tags:unique,text,type}'
rep("src/story-rhythm-engine.js",old,new)

old='mode:classification.mode,tags:classification.tags,tensionBefore:before'
new='mode:classification.mode,narrativeFunction:classification.narrativeFunction,tags:classification.tags,tensionBefore:before'
rep("src/story-rhythm-engine.js",old,new)

old='else if(PROGRESS_TYPES.test(classification.type)||classification.tags.includes("MYSTERY"))r.progressDebt=clamp(r.progressDebt+1,0,20);'
new='else if(PROGRESS_TYPES.test(classification.type)||classification.narrativeFunction==="MYSTERY_PROGRESS")r.progressDebt=clamp(r.progressDebt+1,0,20);'
rep("src/story-rhythm-engine.js",old,new)

old='assert.deepEqual(snap.recent.map(x=>x.mode),["MYSTERY","MYSTERY","PAYOFF"]);assert.equal(snap.recent.some(x=>x.eventType==="STATE_SYNC_PLAN"),false)'
new='assert.deepEqual(snap.recent.map(x=>x.mode),["MYSTERY","SOCIAL","PAYOFF"]);assert.deepEqual(snap.recent.map(x=>x.narrativeFunction),["MYSTERY_PROGRESS","MYSTERY_PROGRESS","PAYOFF"]);assert.equal(snap.recent.some(x=>x.eventType==="STATE_SYNC_PLAN"),false)'
rep("test/story-rhythm-v0606.test.js",old,new)
