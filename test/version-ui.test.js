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
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=320"/);
 assert.match(app,/versionBadge\.textContent=\`v\$\{APP_VERSION\}\`/);
});

test("v0.32.0 raster scene UI assets are cache-busted independently from Agnes and recovery modules",async()=>{
 const [html,app]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/styles\.css\?v=312/);
 assert.match(html,/app\.js\?v=320/);
 assert.match(app,/\.\/src\/version\.js\?v=320/);
 assert.match(app,/\.\/src\/ai-settings\.js\?v=310/);
 assert.match(app,/\.\/src\/ai-client\.js\?v=320/);
 for(const mod of ["world-engine","world-registry"])assert.match(app,new RegExp("\\.\\/src\\/"+mod+"\\.js\\?v=320"));
 assert.match(app,/\.\/src\/world-quality\.js\?v=300/)
});
