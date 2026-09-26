from pathlib import Path
import json


def replace_once(path, old, new):
    p=Path(path); text=p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old,new,1),encoding="utf-8")

# 1) Remove the stale duplicate FIRST_BUTTON expansion block. The loop already schedules
# expansionReason before the AI decision; firstButtonExpansionReason never existed.
replace_once(
    "app.js",
    '      if(firstButtonFast&&firstButtonExpansionReason){const scheduled=scheduleDeveloperAutotestExpansion(firstButtonExpansionReason,turn);recordDebug("AUTOTEST_RUNTIME_EXPANSION_DEFERRED",{reason:firstButtonExpansionReason,turn,scheduled})}\n',
    ''
)

# 2) Make HIGH language difficulty affect actual spoken interaction mode, while preserving
# origin language knowledge. Reading remains disabled under HIGH.
origin=Path("src/origin-runtime.js")
text=origin.read_text(encoding="utf-8")
old='''function policy(state){\n const p=profile(state),key=String(p.knowledgePolicy||"CUSTOM").toUpperCase(),base=KNOWLEDGE_RULES[key]||KNOWLEDGE_RULES.CUSTOM,difficulty=String(state.world?.creation?.difficultyRules?.languageBarrier||"STANDARD").toUpperCase();\n return {...base,knowledgePolicy:key,languagePolicy:String(p.languagePolicy||"CUSTOM").toUpperCase(),legalStatus:String(p.legalStatus||"CUSTOM").toUpperCase(),openingBias:String(p.openingBias||"CUSTOM").toUpperCase(),readCommon:base.readCommon&&difficulty!=="HIGH"}\n}\n'''
new='''function policy(state){\n const p=profile(state),key=String(p.knowledgePolicy||"CUSTOM").toUpperCase(),base=KNOWLEDGE_RULES[key]||KNOWLEDGE_RULES.CUSTOM,languageBarrier=String(state.world?.creation?.difficultyRules?.languageBarrier||"STANDARD").toUpperCase();\n return {...base,knowledgePolicy:key,languagePolicy:String(p.languagePolicy||"CUSTOM").toUpperCase(),legalStatus:String(p.legalStatus||"CUSTOM").toUpperCase(),openingBias:String(p.openingBias||"CUSTOM").toUpperCase(),languageBarrier,readCommon:base.readCommon&&languageBarrier!=="HIGH"}\n}\n'''
if old not in text: raise SystemExit("origin policy block not found")
text=text.replace(old,new,1)
old='''  knowledgePolicy:rules.knowledgePolicy,languagePolicy:rules.languagePolicy,legalStatus:rules.legalStatus,openingBias:rules.openingBias,\n  identitySignal:rules.identitySignal,equipmentPolicy:rules.equipmentPolicy,spawnPolicy:rules.spawnPolicy,openingMode:rules.openingMode,\n'''
new='''  knowledgePolicy:rules.knowledgePolicy,languagePolicy:rules.languagePolicy,languageBarrier:rules.languageBarrier,legalStatus:rules.legalStatus,openingBias:rules.openingBias,\n  identitySignal:rules.identitySignal,equipmentPolicy:rules.equipmentPolicy,spawnPolicy:rules.spawnPolicy,openingMode:rules.openingMode,\n'''
if old not in text: raise SystemExit("origin runtime language fields not found")
text=text.replace(old,new,1)
old=''' rt.phase=post?"POST_CANON":"PRE_WORLD";rt.identitySignal=rules.identitySignal;rt.equipmentPolicy=rules.equipmentPolicy;rt.spawnPolicy=rules.spawnPolicy;rt.openingMode=rules.openingMode;\n'''
new=''' rt.phase=post?"POST_CANON":"PRE_WORLD";rt.languageBarrier=rules.languageBarrier;rt.identitySignal=rules.identitySignal;rt.equipmentPolicy=rules.equipmentPolicy;rt.spawnPolicy=rules.spawnPolicy;rt.openingMode=rules.openingMode;\n'''
if old not in text: raise SystemExit("origin apply runtime assignment not found")
text=text.replace(old,new,1)
old='''export function originLanguageMode(state,npc=null){\n const rt=ensureOriginRuntime(state),npcLanguages=uniq(npc?.languages?.length?npc.languages:["COMMON"]),spoken=new Set(rt.spokenLanguages);\n if(npcLanguages.some(x=>spoken.has(x)))return rt.knowledgePolicy==="AMNESIA"?"FRAGMENTED":"FLUENT";\n return "GESTURE"\n}\n'''
new='''export function originLanguageMode(state,npc=null){\n const rt=ensureOriginRuntime(state),rules=policy(state),npcLanguages=uniq(npc?.languages?.length?npc.languages:["COMMON"]),spoken=new Set(rt.spokenLanguages),shared=npcLanguages.some(x=>spoken.has(x));\n if(!shared)return "GESTURE";\n if(rules.languageBarrier==="HIGH")return rt.knowledgePolicy==="AMNESIA"?"GESTURE":"FRAGMENTED";\n return rt.knowledgePolicy==="AMNESIA"?"FRAGMENTED":"FLUENT"\n}\n'''
if old not in text: raise SystemExit("originLanguageMode block not found")
text=text.replace(old,new,1)
old='''  originId:rt.originId,legalStatus:rt.legalStatus,identitySignal:signal,languageMode,\n'''
new='''  originId:rt.originId,legalStatus:rt.legalStatus,identitySignal:signal,languageBarrier:rt.languageBarrier,languageMode,\n'''
if old not in text: raise SystemExit("originNpcContext return fields not found")
text=text.replace(old,new,1)
old=''' const rt=ensureOriginRuntime(state),base={originId:rt.originId,label:rt.label,knowledgePolicy:rt.knowledgePolicy,legalStatus:rt.legalStatus,identitySignal:rt.identitySignal,spokenLanguages:[...rt.spokenLanguages],readLanguages:[...rt.readLanguages],openingMode:rt.openingMode};\n'''
new=''' const rt=ensureOriginRuntime(state),base={originId:rt.originId,label:rt.label,knowledgePolicy:rt.knowledgePolicy,languageBarrier:rt.languageBarrier,legalStatus:rt.legalStatus,identitySignal:rt.identitySignal,spokenLanguages:[...rt.spokenLanguages],readLanguages:[...rt.readLanguages],openingMode:rt.openingMode};\n'''
if old not in text: raise SystemExit("originRuntimeSnapshot base not found")
text=text.replace(old,new,1)
origin.write_text(text,encoding="utf-8")

# 3) Update the older origin contract test that previously codified hard == FLUENT.
p=Path("test/origin-rule-kernel-v045.test.js"); t=p.read_text(encoding="utf-8")
t=t.replace('test("difficulty can preserve spoken language while making native literacy harder",()=>{','test("HIGH difficulty preserves spoken language knowledge but degrades native conversation fluency",()=>{',1)
t=t.replace('assert.equal(ctx.languageMode,"FLUENT");\n const doc=registerDocument(s,{title:"稅務冊",language:"COMMON",claims:[{text:"稅額。"}]});', 'assert.equal(ctx.languageMode,"FRAGMENTED");\n const doc=registerDocument(s,{title:"稅務冊",language:"COMMON",claims:[{text:"稅額。"}]});',1)
p.write_text(t,encoding="utf-8")

# 4) Canonical v0.57.24 release + browser cache generation.
pkg=Path("package.json"); data=json.loads(pkg.read_text(encoding="utf-8"));
if data.get("version")!="0.57.23": raise SystemExit(f"unexpected package version {data.get('version')}")
data["version"]="0.57.24"; pkg.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
replace_once("src/version.js",'APP_VERSION="0.57.23"','APP_VERSION="0.57.24"')

# Every browser-module edge is explicit cache-versioned in this project. Bump the complete
# module graph so changed origin-runtime/app code cannot be served with an old dependency.
for path in [Path("app.js"),*Path("src").rglob("*.js")]:
    s=path.read_text(encoding="utf-8")
    if "?v=57023" in s:
        path.write_text(s.replace("?v=57023","?v=57024"),encoding="utf-8")

idx=Path("index.html"); s=idx.read_text(encoding="utf-8"); idx.write_text(s.replace("styles.css?v=57023","styles.css?v=57024").replace("app.js?v=57023","app.js?v=57024"),encoding="utf-8")

# Current-release/cache contract tests track the canonical browser generation.
for name in ["test/module-cache.test.js","test/version-ui.test.js","test/version-0551-release.test.js","test/ai-settings.test.js","test/first-button-fast-path-v05417.test.js","test/runtime-grounding-v05418.test.js","test/staged-world-compiler.test.js","test/v05412-regressions.test.js","test/v05414-regressions.test.js"]:
    path=Path(name)
    if not path.exists(): continue
    s=path.read_text(encoding="utf-8").replace("57023","57024")
    if name in {"test/version-ui.test.js","test/version-0551-release.test.js"}:
        s=s.replace("0.57.23","0.57.24").replace("0\\.57\\.23","0\\.57\\.24")
    path.write_text(s,encoding="utf-8")

print("v0.57.24 patch applied")
