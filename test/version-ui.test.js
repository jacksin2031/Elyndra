import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes APP_VERSION and package version consistently",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/version.js",import.meta.url),"utf8"),
  readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.42.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);
 assert.match(css,/\.version-badge\{position:fixed;right:/);assert.match(css,/bottom:/);
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=42000"/);
 assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("v0.42.0 layers causal Future simulation on top of v0.41 StatePatch runtime",async()=>{
 const [html,app,simulation,futureRuntime,historyFuture]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-simulation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/future-runtime.js",import.meta.url),"utf8"),
  readFile(new URL("../src/history-future.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=42000/);
 assert.match(app,/\.\/src\/version\.js\?v=42000/);
 assert.match(app,/\.\/src\/world-simulation\.js\?v=42000/);
 assert.match(app,/\.\/src\/state-sync\.js\?v=41000/);
 assert.match(simulation,/\.\/future-runtime\.js\?v=42000/);
 assert.match(futureRuntime,/advanceFutureSimulation/);
 assert.match(historyFuture,/applyFutureSolution/);
});
