// v0.52 release contract
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes APP_VERSION and package version consistently",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.52.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);assert.match(css,/\.version-badge\{position:fixed;right:/);
 assert.match(html,/app\.js\?v=52000/);assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=52000"/);assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("History Lazy Deepen remains available after v0.52",async()=>{
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

test("Future Scope and character identity remain intact after v0.52",async()=>{
 const [app,client,timeline,future,talent,journey,progression]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-timeline.js",import.meta.url),"utf8"),readFile(new URL("../src/future-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/talent-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/journey-closure.js",import.meta.url),"utf8"),readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/ai-client\.js\?v=52000/);assert.match(client,/impactScope/);assert.match(timeline,/playerCanMitigate/);assert.match(future,/playerCanRedirect/);
 assert.match(app,/\.\/src\/talent-engine\.js\?v=49000/);assert.match(app,/\.\/src\/journey-closure\.js\?v=49000/);
 assert.match(talent,/buildIdentitySnapshot/);assert.match(journey,/recentJourneyCheckpoints/);assert.match(progression,/未解之謎/)
});

test("v0.50/v0.51 causal protections remain intact after v0.52",async()=>{
 const [app,legacy,lazy,visibility,quality,registry,causal]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/history-legacy.js",import.meta.url),"utf8"),
  readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),readFile(new URL("../src/visibility-lock.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-quality.js",import.meta.url),"utf8"),readFile(new URL("../src/world-registry.js",import.meta.url),"utf8"),readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/lazy-generation\.js\?v=52000/);assert.match(legacy,/ORAL_TRADITION/);assert.match(legacy,/WEAPON_RELIC/);
 assert.match(visibility,/UNSEEN/);assert.match(visibility,/CANON_LOCKED/);assert.match(quality,/backgroundMutableFields/);assert.match(registry,/markEntityObserved/);
 assert.match(lazy,/generationRevision/);assert.match(lazy,/worldSeedFingerprint/);assert.match(causal,/visibilityLockSnapshot/)
});

test("v0.52.0 makes Blueprint counts and FORBID rules runtime contracts",async()=>{
 const [app,creation,claims,catalog,lazy,registry,causal,client]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/world-creation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/generation-claims.js",import.meta.url),"utf8"),readFile(new URL("../src/world-catalog.js",import.meta.url),"utf8"),
  readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),readFile(new URL("../src/world-registry.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/world-creation\.js\?v=52000/);assert.match(app,/\.\/src\/world-registry\.js\?v=52000/);
 assert.match(creation,/COUNT_REQUIREMENT/);assert.match(creation,/WC2-CIVILIZATION_COUNT/);assert.match(creation,/WC2-SPECIES_COUNT/);assert.match(creation,/WC2-LANGUAGE_COUNT/);
 assert.match(claims,/BLUEPRINT_DEFINITION/);assert.match(claims,/constitutionForbidTerms/);assert.match(claims,/materialSatisfiesClaim/);
 assert.match(catalog,/CIVILIZATION/);assert.match(catalog,/SPECIES/);assert.match(catalog,/LANGUAGE/);
 assert.match(lazy,/LAZY_CLAIM_SEMANTIC_MISMATCH/);assert.match(lazy,/LAZY_FORBIDDEN_TERM/);assert.match(registry,/WORLD_CONSTITUTION_FORBID/);
 assert.match(causal,/worldCatalogSnapshot/);assert.match(client,/generation\.definitions/);assert.match(client,/forbiddenTerms/)
});
