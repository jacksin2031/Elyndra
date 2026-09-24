from pathlib import Path

# Keep the new v0.55.0 scene-anchor policy while preserving the pre-existing
# hard-cap behaviour for pathological snapshots and impossibly tiny budgets.
p = Path("src/context-manager.js")
s = p.read_text(encoding="utf-8")

old = 'export function tokenBudgetSnapshot(snapshot,maxChars=12000){\n const c=structuredClone(snapshot),reasons=[];'
new = 'export function tokenBudgetSnapshot(snapshot,maxChars=12000){\n if(maxChars<600)throw new Error("CONTEXT_BUDGET_TOO_SMALL");\n const c=structuredClone(snapshot),reasons=[];'
if old not in s:
    raise SystemExit("v0.55.0 tiny-budget guard anchor missing")
s = s.replace(old, new, 1)

replacements = {
    'knownFacts:(c.knownFacts||[]).slice(-4)': 'knownFacts:(c.knownFacts||[]).slice(-4).map(x=>typeof x==="string"?x.slice(0,220):x)',
    'knowledge:(c.knowledge||[]).slice(-3)': 'knowledge:(c.knowledge||[]).slice(-3).map(x=>typeof x==="string"?x.slice(0,220):{id:x?.id,title:String(x?.title||"").slice(0,100),text:String(x?.text||"").slice(0,220),factId:x?.factId,status:x?.status})',
    'inventory:(c.inventory||[]).slice(-6)': 'inventory:(c.inventory||[]).slice(-6).map(x=>typeof x==="string"?x.slice(0,160):{id:x?.id,name:String(x?.name||"").slice(0,100),quantity:x?.quantity})',
    'registry:{locations:prioritize(c.registry?.locations,currentLoc,2,""),npcs:prioritize(c.registry?.npcs,currentNpc,4,""),factions:[],sideQuests:[]}': 'registry:{locations:prioritize(c.registry?.locations,currentLoc,2,"").map(x=>({id:x?.id,name:String(x?.name||"").slice(0,100),type:x?.type})),npcs:prioritize(c.registry?.npcs,currentNpc,4,"").map(x=>({id:x?.id,name:String(x?.name||"").slice(0,100),locationId:x?.locationId,present:x?.present===true})),factions:[],sideQuests:[]}',
}
for old, new in replacements.items():
    if old not in s:
        raise SystemExit(f"v0.55.0 context compact anchor missing: {old[:60]}")
    s = s.replace(old, new, 1)

old = 'minimal.contextMeta.approxChars=size(minimal);minimal.contextMeta.withinBudget=minimal.contextMeta.approxChars<=maxChars;if(!minimal.contextMeta.withinBudget)throw new Error("CONTEXT_BUDGET_TOO_SMALL");return minimal'
new = '''minimal.contextMeta.approxChars=size(minimal);minimal.contextMeta.withinBudget=minimal.contextMeta.approxChars<=maxChars;
  if(!minimal.contextMeta.withinBudget){
   minimal.contextMeta.degradationReasons.push("HARD_CAP_COMPACTION");
   minimal.knowledge=[];minimal.knownFacts=[];minimal.inventory=[];minimal.recentEvents=[];minimal.companions=[];minimal.magic=undefined;minimal.market=undefined;minimal.weather=undefined;minimal.directorWeather=undefined;minimal.survival=undefined;minimal.culture=undefined;
   minimal.contextMeta.approxChars=size(minimal);minimal.contextMeta.withinBudget=minimal.contextMeta.approxChars<=maxChars
  }
  if(!minimal.contextMeta.withinBudget){
   minimal.registry={locations:[],npcs:[],factions:[],sideQuests:[]};minimal.travel=undefined;minimal.contextMeta.degradationReasons.push("SCENE_ANCHORS_DROPPED_FOR_HARD_CAP");minimal.contextMeta.approxChars=size(minimal);minimal.contextMeta.withinBudget=minimal.contextMeta.approxChars<=maxChars
  }
  if(!minimal.contextMeta.withinBudget)throw new Error("CONTEXT_BUDGET_TOO_SMALL");return minimal'''
if old not in s:
    raise SystemExit("v0.55.0 minimal fallback anchor missing")
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

# The release test contains regex-escaped version/cache literals, which the
# generic textual version bump intentionally does not rewrite.
p = Path("test/version-0550-release.test.js")
s = p.read_text(encoding="utf-8")
s = s.replace("Official v0.54.19 release contract", "Official v0.55.0 release contract")
s = s.replace('test("v0.54.19 is the canonical app and browser cache release"', 'test("v0.55.0 is the canonical app and browser cache release"')
s = s.replace('pkg.version,"0.54.19"', 'pkg.version,"0.55.0"')
s = s.replace('APP_VERSION="0\\.54\\.19"', 'APP_VERSION="0\\.55\\.0"')
s = s.replace('app\\.js\\?v=54019', 'app\\.js\\?v=55000')
s = s.replace('x==="54019"', 'x==="55000"')
s = s.replace('tokens.includes("54019")', 'tokens.includes("55000")')
p.write_text(s, encoding="utf-8")
