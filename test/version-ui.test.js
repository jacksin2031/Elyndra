// v0.49 release contract
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes APP_VERSION and package version consistently",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.49.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);assert.match(css,/\.version-badge\{position:fixed;right:/);
 assert.match(html,/app\.js\?v=49000/);assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=49000"/);assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("v0.47 History Lazy Deepen remains available after v0.48",async()=>{
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

test("v0.48.0 authors and preserves Future scope metadata end to end",async()=>{
 const [app,client,timeline,future,quality,compiler,api]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-timeline.js",import.meta.url),"utf8"),readFile(new URL("../src/future-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-quality.js",import.meta.url),"utf8"),readFile(new URL("../src/world-compiler.js",import.meta.url),"utf8"),
  readFile(new URL("../api/world.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/ai-client\.js\?v=48000/);assert.match(app,/\.\/src\/world-quality\.js\?v=48000/);
 assert.match(client,/impactScope/);assert.match(client,/playerCanMitigate/);assert.match(client,/playerCanRedirect/);
 assert.match(timeline,/IMPACT_SCOPES/);assert.match(timeline,/affectedRegions/);assert.match(timeline,/playerCanMitigate/);
 assert.match(future,/impactScope:row\.impactScope\|\|"REGIONAL"/);assert.match(future,/affectedRegions:Array\.isArray\(row\.affectedRegions\)/);
 assert.match(quality,/playerCanMitigate/);assert.match(compiler,/AFFECTED_REGION_INVALID/);assert.match(api,/impactScope/)
});


test("v0.49.0 adds build identity, diegetic journal and journey closure",async()=>{
 const [app,talent,journey,progression]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/talent-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/journey-closure.js",import.meta.url),"utf8"),
  readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/\.\/src\/talent-engine\.js\?v=49000/);assert.match(app,/\.\/src\/journey-closure\.js\?v=49000/);
 assert.match(talent,/buildIdentitySnapshot/);assert.match(talent,/OTHER_PATH_LOCKED/);assert.match(talent,/specializedSkillGain/);assert.match(talent,/talentContextSnapshot/);
 assert.match(journey,/maybeJourneyCheckpoint/);assert.match(journey,/recentJourneyCheckpoints/);
 assert.match(progression,/未解之謎/);assert.match(progression,/傳聞與徵兆/);assert.match(progression,/世界內部數值與隱藏狀態不會出現在手帳/);
 assert.match(app,/旅人狀態/);assert.match(app,/旅程回顧/);
 const runtime=app.slice(app.indexOf('$("#runtimeBtn")?.addEventListener'),app.indexOf('$("#impactBtn")?.addEventListener'));
 assert.doesNotMatch(runtime,/WORLD QUALITY|Structural Integrity|AI stages|Runtime Health/)
});
