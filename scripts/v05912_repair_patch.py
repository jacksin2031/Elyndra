from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def once(s,old,new,label):
    if old not in s: raise SystemExit(f'MISSING:{label}')
    if s.count(old)!=1: raise SystemExit(f'NON_UNIQUE:{label}:{s.count(old)}')
    return s.replace(old,new,1)

p='src/ai-client.js'; s=read(p)
s=once(s,'import {loadLocale,normalizeLocale,languageContract,registerLocalizedOutput} from "./locale-runtime.js?v=59010";','import {loadLocale,normalizeLocale,languageContract,registerLocalizedOutput} from "./locale-runtime.js?v=59010";\nimport {repairAiOutput} from "./ai-output-repair.js?v=59012";','client-import-repair')
s=once(s,'const value=parseJSON(await directChat({...args,locale,system,aiTask:args?.aiTask||worldStageTask(stage)}));','const parsed=parseJSON(await directChat({...args,locale,system,aiTask:args?.aiTask||worldStageTask(stage)})),value=repairAiOutput("WORLD_STAGE",parsed,{stage}).value;','world-stage-repair')
s=once(s,'  }).then(parseJSON);','  }).then(raw=>repairAiOutput("SCENE",parseJSON(raw),{expectedOutcome:kernel.result?.success===true?"SUCCESS":"FAILURE"}).value);','scene-direct-repair')
s=once(s,'  }).then(parseJSON).then(rawPatch=>{const patch=normalizeGeneratedStatePatch(rawPatch),v=validateStatePatch(patch,plan);if(!v.valid)throw new Error("STATE_PATCH_INVALID:"+v.errors.join(","));return patch}):Promise.resolve(null);','  }).then(parseJSON).then(rawPatch=>{const patch=repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(rawPatch),{plan,snapshot}).value,v=validateStatePatch(patch,plan);if(!v.valid)throw new Error("STATE_PATCH_INVALID:"+v.errors.join(","));return patch}):Promise.resolve(null);','state-direct-repair')
s=once(s,' const playerAction=post("/api/turn-scene",payload,{signal:options?.signal}).then(x=>x.scene);',' const playerAction=post("/api/turn-scene",payload,{signal:options?.signal}).then(x=>repairAiOutput("SCENE",x.scene,{expectedOutcome:kernel.result?.success===true?"SUCCESS":"FAILURE"}).value);','scene-server-repair')
s=once(s,' const stateSync=immediateStateAI?post("/api/turn-state",payload,{signal:options?.signal}).then(x=>x.patch):Promise.resolve(null);',' const stateSync=immediateStateAI?post("/api/turn-state",payload,{signal:options?.signal}).then(x=>repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(x.patch),{plan,snapshot}).value):Promise.resolve(null);','state-server-repair')
s=once(s,'  const patch=normalizeGeneratedStatePatch(parseJSON(raw)),v=validateStatePatch(patch,resolved);if(!v.valid)throw new Error("STATE_PATCH_INVALID:"+v.errors.join(","));return patch','  const patch=repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(parseJSON(raw)),{plan:resolved,snapshot}).value,v=validateStatePatch(patch,resolved);if(!v.valid)throw new Error("STATE_PATCH_INVALID:"+v.errors.join(","));return patch','deferred-direct-repair')
s=once(s,' const response=await post("/api/turn-state",{action,intent:actionIntent,roll,snapshot,plan:resolved},{signal:options?.signal});\n return response.patch',' const response=await post("/api/turn-state",{action,intent:actionIntent,roll,snapshot,plan:resolved},{signal:options?.signal});\n return repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(response.patch),{plan:resolved,snapshot}).value','deferred-server-repair')
s=once(s,' const candidate=(await post("/api/world",{seed,constitution,seedDirective:directive})).candidate;\n report(85,"AI 世界評審","伺服器已完成世界品質評分與必要的定點修復");\n return candidate',' const candidate=(await post("/api/world",{seed,constitution,seedDirective:directive})).candidate,repaired=repairAiOutput("WORLD_STAGE",candidate,{stage:"WORLD_SERVER_CANDIDATE"}).value;\n report(85,"AI 世界評審","伺服器已完成世界品質評分與必要的定點修復");\n return repaired','world-server-repair')
write(p,s)

p='app.js'; s=read(p)
s=once(s,'import {APP_VERSION} from "./src/version.js?v=59010";','import {APP_VERSION} from "./src/version.js?v=59012";','app-version-token')
s=once(s,'from "./src/ai-client.js?v=59010";','from "./src/ai-client.js?v=59012";','app-client-token')
write(p,s)

p='src/version.js'; s=read(p); write(p,s.replace('0.59.11','0.59.12'))
p='package.json'; data=json.loads(read(p)); data['version']='0.59.12'; write(p,json.dumps(data,ensure_ascii=False,indent=2)+'\n')

p='index.html'; s=read(p)
s=s.replace('"./src/version.js?v=59010":"./src/version.js?v=59011",','')
s=s.replace('app.js?v=59011','app.js?v=59012')
write(p,s)

for p in ['test/v05901-i18n-coverage.test.js','test/version-ui.test.js']:
    s=read(p).replace('0.59.11','0.59.12').replace('59011','59012')
    if p.endswith('version-ui.test.js'):
        s=s.replace('assert.match(app,/import \\{APP_VERSION\\} from "\\.\\/src\\/version\\.js\\?v=59010"/);assert.match(html,/"\\.\\/src\\/version\\.js\\?v=59010":"\\.\\/src\\/version\\.js\\?v=59012"/);','assert.match(app,/import \\{APP_VERSION\\} from "\\.\\/src\\/version\\.js\\?v=59012"/);')
        s=s.replace('ai-client\\.js\\?v=59010','ai-client\\.js\\?v=59012')
    write(p,s)

p='test/version-0551-release.test.js'; s=read(p)
s=s.replace('0.59.11','0.59.12').replace('0\\.59\\.11','0\\.59\\.12').replace('app\\.js\\?v=59011','app\\.js\\?v=59012')
s=s.replace(' assert.match(html,/"\\.\\/src\\/version\\.js\\?v=59010":"\\.\\/src\\/version\\.js\\?v=59011"/);\n','')
s=s.replace('"59008","59010"]','"59008","59010","59012"]')
s=s.replace('assert.match(app,/\\.\\/src\\/version\\.js\\?v=59010/);','assert.match(app,/\\.\\/src\\/version\\.js\\?v=59012/);')
s=s.replace('assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59010"));','assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59010"));assert.ok(tokens.includes("59012"));')
write(p,s)

p='.github/workflows/pages.yml'; s=read(p)
s=s.replace('Focused v0.59.11 regressions','Focused v0.59.12 regressions')
s=s.replace('run: node --test test/v05911-origin-hud-regressions.test.js','run: node --test test/v05912-ai-output-repair.test.js test/v05911-origin-hud-regressions.test.js')
write(p,s)

for q in [ROOT/'scripts/v05912_repair_patch.py',ROOT/'.github/workflows/v05912-repair-patch.yml']:
    try:q.unlink()
    except FileNotFoundError:pass
print('v0.59.12 deterministic repair integration patched')
