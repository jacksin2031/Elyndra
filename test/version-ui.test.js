// v0.60.31 release contract
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes APP_VERSION and package version consistently",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.60.31");
 assert.match(html,/id="versionBadge" class="version-badge"/);assert.match(css,/\.version-badge\{position:fixed;right:/);
 assert.match(html,/app\.js\?v=60031/);assert.match(html,/v06027-runtime-ui-hotfix\.js\?v=60027/);assert.match(html,/"\.\/src\/version\.js\?v=60010":"\.\/src\/version\.js\?v=60031"/);assert.match(html,/"\.\/src\/game-engine\.js\?v=60006":"\.\/src\/v06025-game-engine-hotfix\.js\?v=60025"/);assert.match(html,/"\.\/src\/ai-client\.js\?v=60010":"\.\/src\/v06025-ai-client-hotfix\.js\?v=60026"/);assert.match(html,/"\.\/src\/ai-settings\.js\?v=60010":"\.\/src\/v06028-ai-settings-hotfix\.js\?v=60031"/);assert.match(html,/"\.\/src\/turn-compiler\.js\?v=57029":"\.\/src\/v06028-turn-compiler-hotfix\.js\?v=60028"/);assert.match(html,/"\.\/src\/world-quality\.js\?v=57025":"\.\/src\/v06029-world-quality-hotfix\.js\?v=60029"/);assert.match(html,/"\.\/src\/talent-engine\.js\?v=60004":"\.\/src\/v06024-talent-engine-hotfix\.js\?v=60024"/);assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=60010"/);assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("History/Future/character systems remain available after v0.53",async()=>{
 const [app,client,historyDepth,historyFuture,docs,heritage,timeline,future,talent,journey,progression]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/history-depth.js",import.meta.url),"utf8"),readFile(new URL("../src/history-future.js",import.meta.url),"utf8"),
  readFile(new URL("../src/document-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/item-heritage.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-timeline.js",import.meta.url),"utf8"),readFile(new URL("../src/future-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/talent-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/journey-closure.js",import.meta.url),"utf8"),readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/runBackgroundHistoryDeepening/);assert.match(client,/export async function generateHistoryDeepening/);assert.match(historyDepth,/validateHistoryDeepeningCandidate/);
 assert.match(historyFuture,/signalHistoryResearch/);assert.match(docs,/registerHistoryDeepeningDocuments/);assert.match(heritage,/registerHistoryRelicSeeds/);
 assert.match(client,/impactScope/);assert.match(timeline,/playerCanMitigate/);assert.match(future,/playerCanRedirect/);
 assert.match(app,/\.\/src\/talent-engine\.js\?v=60004/);assert.match(app,/\.\/src\/journey-closure\.js\?v=57028/);assert.match(talent,/buildIdentitySnapshot/);assert.match(journey,/recentJourneyCheckpoints/);assert.match(progression,/未解之謎/)
});

test("v0.50-v0.52 causal protections remain intact after v0.53",async()=>{
 const [app,legacy,lazy,visibility,quality,registry,causal,creation,claims,catalog,client]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/history-legacy.js",import.meta.url),"utf8"),
  readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),readFile(new URL("../src/visibility-lock.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-quality.js",import.meta.url),"utf8"),readFile(new URL("../src/world-registry.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),readFile(new URL("../src/world-creation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/generation-claims.js",import.meta.url),"utf8"),readFile(new URL("../src/world-catalog.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/lazy-generation\.js\?v=59014/);assert.match(legacy,/ORAL_TRADITION/);assert.match(legacy,/WEAPON_RELIC/);
 assert.match(visibility,/CANON_LOCKED/);assert.match(quality,/backgroundMutableFields/);assert.match(registry,/WORLD_CONSTITUTION_FORBID/);
 assert.match(lazy,/generationRevision/);assert.match(lazy,/worldSeedFingerprint/);assert.match(causal,/visibilityLockSnapshot/);
 assert.match(app,/\.\/src\/world-creation\.js\?v=60010/);assert.match(creation,/COUNT_REQUIREMENT/);assert.match(claims,/BLUEPRINT_DEFINITION/);assert.match(catalog,/WORLD_CATALOG_KINDS/);
 assert.match(client,/generation\.definitions/);assert.match(client,/forbiddenTerms/)
});

test("v0.53.0 hardens Knowledge, background races, Claims and Ledger causality",async()=>{
 const [app,client,lazy,claims,ledger,causal,integrity]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),readFile(new URL("../src/generation-claims.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-ledger.js",import.meta.url),"utf8"),readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),readFile(new URL("../src/causal-integrity.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/ai-client\.js\?v=60010/);assert.match(client,/knowledgeCanRevealCanon/);assert.match(client,/visibleFacts\(state\)/);
 assert.match(lazy,/LAZY_STALE_WORLD_VERSION/);assert.match(lazy,/LAZY_STALE_GENERATION_REVISION/);
 assert.match(claims,/MATERIALIZATION_DRIFT/);assert.match(ledger,/compactLedgerEntries/);assert.match(ledger,/HISTORIC/);
 assert.match(integrity,/auditCausalIntegrity/);assert.match(integrity,/VERIFIED_KNOWLEDGE_ORPHAN/);assert.match(integrity,/CLAIM_RESERVATION_ORPHAN/);assert.match(integrity,/FUTURE_HISTORY_REF_ORPHAN/);
 assert.match(causal,/repairCausalIntegrity/);assert.match(causal,/auditCausalIntegrity/);assert.match(causal,/version:2,integrity:/)
});

test("v0.54 Developer AI autotest remains available after v0.57.30 player-facing hardening",async()=>{
 const [app,autotest]=await Promise.all([readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-autotest.js",import.meta.url),"utf8")]);
 assert.match(app,/\.\/src\/ai-autotest\.js\?v=60010/);assert.match(app,/startDeveloperAutotest/);assert.match(autotest,/playerVisibleAutotestSnapshot/);assert.match(autotest,/buildAutotestReport/)
});