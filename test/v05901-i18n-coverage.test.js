import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";

test("v0.59.1 i18n coverage remains active in v0.59.9",async()=>{
 const [locale,extra,app,index,pkg,version]=await Promise.all([
  readFile(new URL("../src/locale-runtime.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ui-translations-extra.js",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../package.json",import.meta.url),"utf8"),
  readFile(new URL("../src/version.js",import.meta.url),"utf8")
 ]);
 assert.match(locale,/ui-translations-extra\.js\?v=59009/);
 assert.match(locale,/Object\.assign\(UI,EXTRA_UI\)/);
 assert.match(locale,/documentTranslationCandidates/);
 assert.match(locale,/applySessionTranslationBundle/);
 assert.match(locale,/applySessionLocaleToDocument/);
 assert.match(app,/ensureRenderedLocale/);
 assert.match(app,/new MutationObserver/);
 assert.match(app,/ensureRenderedLocale\("modal"/);
 assert.match(app,/ensureRenderedLocale\("refresh"/);
 assert.match(index,/app\.js\?v=59009/);
 assert.equal(JSON.parse(pkg).version,"0.59.9");
 assert.match(version,/APP_VERSION="0\.59\.9"/);
 assert.match(extra,/"世界建立步驟"/);
 execFileSync("python3",["scripts/scan-i18n-coverage.py"],{stdio:"pipe"});
});
