import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("main UI exposes APP_VERSION and package version consistently",async()=>{
 const [html,css,app,versionSource,pkgText]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8")
 ]);
 const pkg=JSON.parse(pkgText),m=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
 assert.ok(m);assert.equal(m[1],pkg.version);assert.equal(pkg.version,"0.44.0");
 assert.match(html,/id="versionBadge" class="version-badge"/);assert.match(css,/\.version-badge\{position:fixed;right:/);
 assert.match(app,/import \{APP_VERSION\} from "\.\/src\/version\.js\?v=44000"/);assert.match(app,/versionBadge\.textContent=`v\$\{APP_VERSION\}`/)
});

test("v0.44.0 adds Visibility Lock and Engine-owned Lazy Generation",async()=>{
 const [html,app,visibility,lazy,claims,turn,causal]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/event-visibility.js",import.meta.url),"utf8"),readFile(new URL("../src/lazy-generation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/generation-claims.js",import.meta.url),"utf8"),readFile(new URL("../src/turn-compiler.js",import.meta.url),"utf8"),
  readFile(new URL("../src/causal-world-core.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=44000/);assert.match(app,/\.\/src\/lazy-generation\.js\?v=44000/);assert.match(app,/\.\/src\/event-visibility\.js\?v=44000/);
 assert.match(visibility,/PLAYER_VISIBILITY/);assert.match(visibility,/projectPlayerEvent/);assert.doesNotMatch(visibility,/return !INTERNAL_TYPES/);
 assert.match(lazy,/planLazyGeneration/);assert.match(lazy,/validateLazyGenerationCandidate/);assert.match(lazy,/commitLazyGeneration/);
 assert.match(claims,/syncGenerationClaimsFromCausalStructure/);assert.match(claims,/reserveGenerationClaim/);assert.match(claims,/reconcileGenerationClaims/);
 assert.match(turn,/const world=\{name:snapshot\.world\?\.name/);assert.doesNotMatch(turn,/world:snapshot\.world,/);
 assert.match(causal,/\.\/lazy-generation\.js\?v=44000/)
});
