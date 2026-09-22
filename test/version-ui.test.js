// v0.51 release contract
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes APP_VERSION and package version consistently",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.51.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);assert.match(css,/\.version-badge\{position:fixed;right:/);
 assert.match(html,/app\.js\?v=50000/);assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=51000"/);assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("History Lazy Deepen remains available after v0.51",async()=>{
 const [app,client,historyDepth,historyFuture,docs,heritage,worldEngine,api]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/history-depth.js",import.meta.url),"utf8"),readFile(new URL("../src/history-future.js",import.meta.url),"utf8"),
  readFile(new URL("../src/document-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/item-heritage.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),readFile(new URL("../api/history-deepen.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/runBackgroundHistoryDeepening/);assert.match(app,/preemptBackgroundHistory/);
 assert.match(client,/export async function generateHistoryDeepening/);assert.match(historyDepth,/validateHistoryDeepeningCandidate/);
 assert.match(historyFuture,/signalHistoryResearch/);assert.match(docs,/registerHistoryDeepeningDocuments/);assert.match(heritage,/registerHistoryRelicSeeds/);
 assert.match(worldEngine,/歷史 Skeleton/);assert.match(api,/History Deepening Architect/)
});

test("v0.48 Future Scope authoring remains intact after v0.51",async()=>{
 const [app,client,timeline,future,quality,compiler,api]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-timeline.js",import.meta.url),"utf8"),readFile(new URL("../src/future-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-quality.js",import.meta.url),"utf8"),readFile(new URL("../src/world-compiler.js",import.meta.url),"utf8"),
  readFile(new URL("../api/world.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/ai-client\.js\?v=51000/);assert.match(app,/\.\/src\/world-quality\.js\?v=51000/);
 assert.match(client,/impactScope/);assert.match(client,/playerCanMitigate/);assert.match(client,/playerCanRedirect/);
 assert.match(timeline,/IMPACT_SCOPES/);assert.match(timeline,/affectedRegions/);assert.match(timeline,/playerCanMitigate/);
 assert.match(future,/impactScope:row\.impactScope\|\|"REGIONAL"/);assert.match(future,/affectedRegions:Array\.isArray\(row\.affectedRegions\)/);
 assert.match(quality,/playerCanMitigate/);assert.match(compiler,/AFFECTED_REGION_INVALID/);assert.match(api,/impactScope/)
});

test("v0.49 build identity and diegetic journey UX remain intact after v0.51",async()=>{
 const [app,talent,journey,progression]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/talent-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/journey-closure.js",import.meta.url),"utf8"),readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/talent-engine\.js\?v=49000/);assert.match(app,/\.\/src\/journey-closure\.js\?v=49000/);
 assert.match(talent,/buildIdentitySnapshot/);assert.match(talent,/OTHER_PATH_LOCKED/);assert.match(talent,/specializedSkillGain/);
 assert.match(journey,/maybeJourneyCheckpoint/);assert.match(journey,/recentJourneyCheckpoints/);
 assert.match(progression,/未解之謎/);assert.match(progression,/傳聞與徵兆/);assert.match(app,/旅人狀態/);assert.match(app,/旅程回顧/)
});

test("v0.51 closes New History into hidden Legacy Echoes",async()=>{
 const [app,legacy,lazy,futureRuntime,causal,client]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/history-legacy.js",import.meta.url),"utf8"),
  readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),readFile(new URL("../src/future-runtime.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/lazy-generation\.js\?v=51000/);
 assert.match(legacy,/ORAL_TRADITION/);assert.match(legacy,/MEMORIAL/);assert.match(legacy,/WEAPON_RELIC/);assert.match(legacy,/syncHistoryLegacy/);
 assert.match(lazy,/reserveHistoryLegacyEcho/);assert.match(lazy,/materializeHistoryLegacyEcho/);assert.match(lazy,/releaseHistoryLegacyEcho/);
 assert.match(futureRuntime,/seedHistoryLegacy\(state,history\.id\)/);assert.match(causal,/syncHistoryLegacy\(state\)/);
 assert.match(client,/legacyEchoes:plan\.legacyEchoes\|\|\[\]/)
});


test("v0.51.0 adds monotonic Visibility Lock and replay metadata",async()=>{
 const [app,visibility,lazy,quality,registry,causal,client]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/visibility-lock.js",import.meta.url),"utf8"),
  readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),readFile(new URL("../src/world-quality.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-registry.js",import.meta.url),"utf8"),readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/world-registry\.js\?v=51000/);assert.match(app,/\.\/src\/world-quality\.js\?v=51000/);assert.match(app,/\.\/src\/lazy-generation\.js\?v=51000/);
 assert.match(visibility,/UNSEEN/);assert.match(visibility,/HINTED/);assert.match(visibility,/OBSERVED/);assert.match(visibility,/KNOWN/);assert.match(visibility,/CANON_LOCKED/);
 assert.match(lazy,/LAZY_PROMPT_VERSION/);assert.match(lazy,/LAZY_VALIDATION_VERSION/);assert.match(lazy,/generationRevision/);assert.match(lazy,/worldSeedFingerprint/);assert.match(lazy,/entitySeed/);assert.match(lazy,/generatedAtWorldTime/);
 assert.match(quality,/backgroundMutableFields/);assert.match(registry,/markEntityObserved/);assert.match(causal,/visibilityLockSnapshot/);assert.match(client,/generationSource/)
});
