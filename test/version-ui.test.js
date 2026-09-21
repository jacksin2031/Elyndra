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
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.41.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);
 assert.match(css,/\.version-badge\{position:fixed;right:/);assert.match(css,/bottom:/);
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=41000"/);
 assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("v0.41.0 layers StatePatch runtime on top of v0.40 Causal World Core",async()=>{
 const [html,app,storage]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/storage.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/styles\.css\?v=38001/);assert.match(html,/creator\.css\?v=37000/);assert.match(html,/app\.js\?v=41000/);
 assert.match(app,/\.\/src\/state-sync\.js\?v=41000/);
 assert.match(app,/\.\/src\/world-engine\.js\?v=40000/);
 assert.match(storage,/ensureCausalWorldCore/);
 assert.match(storage,/stateSync\?\?=/)
});
