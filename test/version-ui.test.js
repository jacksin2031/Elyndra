import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes APP_VERSION and package version consistently",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.45.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);assert.match(css,/\.version-badge\{position:fixed;right:/);
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=45000"/);assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("v0.45.0 adds Engine-owned Origin Rule Kernel",async()=>{
 const [html,app,origin,creation,client,documents,quality]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/origin-runtime.js",import.meta.url),"utf8"),readFile(new URL("../src/world-creation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../src/document-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-quality.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=45000/);assert.match(app,/\.\/src\/origin-runtime\.js\?v=45000/);
 assert.match(origin,/applyOriginRuntime/);assert.match(origin,/originNpcContext/);assert.match(origin,/originOpeningContract/);
 assert.match(creation,/\.\/origin-runtime\.js\?v=45000/);assert.match(creation,/phase:"PRE_WORLD"/);
 assert.match(app,/phase:"POST_CANON"/);assert.match(client,/originContext/);assert.match(client,/originOpening/);
 assert.match(documents,/originRuntime\?\.readLanguages/);assert.match(quality,/knowledgePolicy/)
});
