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
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.43.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);
 assert.match(css,/\.version-badge\{position:fixed;right:/);assert.match(css,/bottom:/);
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=43000"/);
 assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("v0.43.0 layers Item Heritage and Documents on top of causal Future runtime",async()=>{
 const [html,app,item,causal,docs,recognition]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/item-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8"),
  readFile(new URL("../src/document-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/item-recognition.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=43000/);
 assert.match(app,/\.\/src\/item-engine\.js\?v=43000/);
 assert.match(app,/\.\/src\/world-engine\.js\?v=43000/);
 assert.match(item,/\.\/item-heritage\.js\?v=43000/);
 assert.match(item,/\.\/item-recognition\.js\?v=43000/);
 assert.match(causal,/\.\/document-engine\.js\?v=43000/);
 assert.match(docs,/evidenceType:"DOCUMENT"/);
 assert.match(recognition,/evidenceType:"TESTIMONY"/)
});
