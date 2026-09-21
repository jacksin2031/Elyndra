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
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=34004"/);
 assert.match(app,/versionBadge\.textContent=\`v\$\{APP_VERSION\}\`/);
});

test("v0.34.4 keeps unchanged scene assets independently cached",async()=>{
 const [html,app]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/styles\.css\?v=336/);
 assert.match(html,/app\.js\?v=34004/);
 assert.match(app,/\.\/src\/version\.js\?v=34004/);
 assert.match(app,/\.\/src\/ai-settings\.js\?v=340/);
 assert.match(app,/\.\/src\/ai-client\.js\?v=340/);
 assert.match(app,/\.\/src\/storage\.js\?v=341/); 
 assert.match(app,/\.\/src\/world-engine\.js\?v=320/);
 assert.match(app,/\.\/src\/world-registry\.js\?v=337/);
 assert.match(app,/\.\/src\/world-quality\.js\?v=337/)
});
