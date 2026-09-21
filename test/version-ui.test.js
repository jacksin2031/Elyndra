import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes a fixed bottom-right version badge from APP_VERSION",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/version.js",import.meta.url),"utf8"),
  readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);
 assert.equal(m[1],pkg.version);
 assert.match(html,/id="versionBadge" class="version-badge"/);
 assert.match(css,/\.version-badge\{position:fixed;right:/);
 assert.match(css,/bottom:/);
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=272"/);
 assert.match(app,/versionBadge\.textContent=\`v\$\{APP_VERSION\}\`/);
});

test("v0.27.2 entry assets use the same cache generation",async()=>{
 const [html,app]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/styles\.css\?v=272/);
 assert.match(html,/app\.js\?v=272/);
 const versions=[...app.matchAll(/\.\/src\/[^"]+\.js\?v=(\d+)/g)].map(x=>x[1]);
 assert.ok(versions.length>10);
 assert.deepEqual([...new Set(versions)],["272"]);
});
