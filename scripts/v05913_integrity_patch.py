from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def once(s,old,new,label):
    if old not in s: raise SystemExit(f'MISSING:{label}')
    if s.count(old)!=1: raise SystemExit(f'NON_UNIQUE:{label}:{s.count(old)}')
    return s.replace(old,new,1)
def replace_between(s,start,end,new,label):
    a=s.find(start);b=s.find(end,a+len(start))
    if a<0 or b<0: raise SystemExit(f'MISSING_RANGE:{label}')
    return s[:a]+new+s[b:]

p='src/ai-output-repair.js';s=read(p)
s=once(s,'const value={...raw,sceneTitle:text(raw.sceneTitle,160),narrative:text(raw.narrative,1800)},expected=String(expectedOutcome||"").toUpperCase(),actual=String(raw.outcome||"").toUpperCase();','const value={...raw,narrative:text(raw.narrative,1800)};if("sceneTitle" in raw)value.sceneTitle=text(raw.sceneTitle,160);const expected=String(expectedOutcome||"").toUpperCase(),actual=String(raw.outcome||"").toUpperCase();','scene shape compatibility')
s=once(s,'value.suggestions=suggestions.slice(0,4);if(list(raw.suggestions).length>4)issues.push(issue("SUGGESTION_LIMIT_NORMALIZED",REPAIR_DISPOSITION.NORMALIZED,REPAIR_SEVERITY.RECOVERABLE));return finalize(value,raw,issues,dropped)','value.suggestions=suggestions.slice(0,4);if(list(raw.suggestions).length>4)issues.push(issue("SUGGESTION_LIMIT_NORMALIZED",REPAIR_DISPOSITION.NORMALIZED,REPAIR_SEVERITY.RECOVERABLE));if(dropped.length)issues.push(issue("INVALID_SUGGESTIONS_DROPPED",REPAIR_DISPOSITION.DROPPED,REPAIR_SEVERITY.HARD_REJECT));return finalize(value,raw,issues,dropped)','legacy suggestion aggregate reason')
s=once(s,'return createPipelineTrace({...inherited,stage:type,turnId:inherited.turnId??context?.turnId??(baseRevision==null?null:`REV-${baseRevision}`)})','return createPipelineTrace({...inherited,stage:inherited.stage??context?.stage??type,turnId:inherited.turnId??context?.turnId??(baseRevision==null?null:`REV-${baseRevision}`)})','caller stage correlation')
write(p,s)

p='src/ai-client.js';s=read(p);s=once(s,'./ai-output-repair.js?v=59012','./ai-output-repair.js?v=59013','ai-client repair epoch');write(p,s)

p='app.js';s=read(p)
s=once(s,'import {APP_VERSION} from "./src/version.js?v=59012";','import {APP_VERSION} from "./src/version.js?v=59013";','app version epoch')
s=once(s,'from "./src/ai-client.js?v=59012";','from "./src/ai-client.js?v=59013";','app ai-client epoch')
s=once(s,'from "./src/ai-autotest.js?v=59010";','from "./src/ai-autotest.js?v=59013";','app autotest epoch')
anchor='import {validateSceneProvenance,filterSuggestionProvenance} from "./src/scene-provenance.js?v=57025";'
s=once(s,anchor,anchor+'\nimport {auditStateTransition,restoreStateSnapshot} from "./src/runtime-integrity.js?v=59013";','app integrity import')
start='function commitStatePatch(state,patch,plan,context={}){'
end='function commitSceneGroundedEvidence(state,operations,plan,context={}){'
replacement='''function commitStatePatch(state,patch,plan,context={}){\n const trace=context?.trace||patch?.__elyndraTrace||{},grounded=groundStatePatch(state,patch,context),effectivePatch=grounded.patch;\n if(grounded.rejected.length)recordDebug("STATE_PATCH_GROUNDING_REJECTED",{...trace,mode:plan?.mode||"",action:String(context?.action||"").slice(0,180),rejected:grounded.rejected});\n const valid=validateStatePatch(effectivePatch,plan);recordDebug("STATE_PATCH_VALIDATION",{...trace,status:valid.valid?"PASS":"FAIL",mode:plan?.mode||"",errors:valid.valid?[]:valid.errors});if(!valid.valid)throw new Error("STATE_PATCH_INVALID:"+valid.errors.join(","));\n if(!Array.isArray(effectivePatch.operations)||!effectivePatch.operations.length)return {applied:false,empty:true,rejected:grounded.rejected.length,deferredEvidence:grounded.deferredEvidence||[],revision:currentStateRevision(state)};\n const revision=assessPatchRevision(state,effectivePatch,plan);if(!revision.ok)return {applied:false,stale:true,rejected:grounded.rejected.length,deferredEvidence:grounded.deferredEvidence||[],...revision};\n const before=structuredClone(state),candidate=statePatchToCandidate(effectivePatch,state);applyTurnCandidate(state,candidate,{...context,directorMode:plan.mode});\n const next=bumpStateRevision(state,"STATE_PATCH_"+plan.mode),audit=auditStateTransition(before,state,{patch:effectivePatch,plan,context});recordDebug("STATE_INVARIANT_AUDIT",{...trace,status:audit.ok?"PASS":"FAIL",mode:plan?.mode||"",issues:audit.issues,beforeRevision:audit.beforeRevision,afterRevision:audit.afterRevision,operations:audit.operationCount});\n if(!audit.ok){restoreStateSnapshot(state,before);recordDebug("UNSAFE_COMMIT_PREVENTED",{...trace,mode:plan?.mode||"",issues:audit.issues,restoredRevision:currentStateRevision(state)});return {applied:false,auditFailed:true,unsafePrevented:true,rejected:grounded.rejected.length,deferredEvidence:grounded.deferredEvidence||[],revision:currentStateRevision(state),auditIssues:audit.issues}}\n recordDebug("STATE_COMMIT_SAFE",{...trace,mode:plan?.mode||"",revision:next,operations:effectivePatch.operations.length,rebased:revision.rebased===true});\n return {applied:true,rebased:revision.rebased===true,rebasedFrom:revision.rebasedFrom??null,rejected:grounded.rejected.length,deferredEvidence:grounded.deferredEvidence||[],revision:next,operations:effectivePatch.operations.length}\n}\n'''
s=replace_between(s,start,end,replacement,'commitStatePatch')
write(p,s)

p='src/ai-autotest.js';s=read(p)
anchor='import {recordDebug} from "./debug-telemetry.js?v=57025";'
s=once(s,anchor,anchor+'\nimport {summarizeRuntimeObservability} from "./runtime-observability.js?v=59013";','autotest observability import')
needle='const ai=list(telemetry).filter(e=>e?.type==="AI_REQUEST")'
insert='const runtimeObservability=summarizeRuntimeObservability(telemetry);if(runtimeObservability.unsafeCommits>0)issues.push({severity:"ERROR",type:"UNSAFE_COMMIT_DETECTED",message:`${runtimeObservability.unsafeCommits} unsafe state commits were observed.`});if(runtimeObservability.preventedUnsafeCommits>0)issues.push({severity:"WARN",type:"INVARIANT_AUDIT_PREVENTED_COMMIT",message:`${runtimeObservability.preventedUnsafeCommits} candidate state transitions were rejected before persistence.`});for(const drift of runtimeObservability.driftSignatures.slice(0,12))issues.push({severity:"WARN",type:"UPSTREAM_CONTRACT_DRIFT",signature:drift.code,count:drift.count,ratePct:drift.ratePct,message:`${drift.code} repeated in ${drift.ratePct}% of applicable AI outputs.`});'+needle
s=once(s,needle,insert,'autotest runtime KPI insert')
s=once(s,'generationStages,stageBreakdown,tokenTotals,byDifficulty','generationStages,stageBreakdown,tokenTotals,runtimeIntegrity:runtimeObservability,byDifficulty','autotest summary KPI')
write(p,s)

p='src/version.js';write(p,read(p).replace('0.59.12','0.59.13'))
p='package.json';data=json.loads(read(p));data['version']='0.59.13';write(p,json.dumps(data,ensure_ascii=False,indent=2)+'\n')
p='index.html';write(p,read(p).replace('app.js?v=59012','app.js?v=59013'))

for p in ['test/version-ui.test.js','test/version-0551-release.test.js','test/v05901-i18n-coverage.test.js']:
    s=read(p).replace('0.59.12','0.59.13').replace('0\\.59\\.12','0\\.59\\.13')
    s=s.replace('app\\.js\\?v=59012','app\\.js\\?v=59013').replace('src\\/version\\.js\\?v=59012','src\\/version\\.js\\?v=59013').replace('src\\/ai-client\\.js\\?v=59012','src\\/ai-client\\.js\\?v=59013')
    if p.endswith('version-ui.test.js'):
        s=s.replace('src\\/ai-autotest\\.js\\?v=59010','src\\/ai-autotest\\.js\\?v=59013')
    if p.endswith('version-0551-release.test.js'):
        s=s.replace('"59010","59012"]','"59010","59012","59013"]')
        s=s.replace('assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59010"));assert.ok(tokens.includes("59012"));assert.ok(tokens.includes("59013"));','assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59010"));assert.ok(tokens.includes("59013"));')
    write(p,s)
p='test/v05911-origin-hud-regressions.test.js';write(p,read(p).replace('under v0.59.12','under v0.59.13').replace('app\\.js\\?v=59012','app\\.js\\?v=59013'))
p='test/v05912-ai-output-repair.test.js';write(p,read(p).replace('ai-output-repair\\.js\\?v=59012','ai-output-repair\\.js\\?v=59013'))
print('v0.59.13 integration patched')
