import test from "node:test";
import assert from "node:assert/strict";
import {evaluateVersionPolicy,isNonProductPath,isProductChange} from "../scripts/version-policy.mjs";

test("version policy exempts CI, tests, docs and tooling",()=>{
 for(const path of [
  ".github/workflows/pages.yml",
  "test/version-ui.test.js",
  "scripts/check-version.mjs",
  "docs/release.md",
  "README.md",
  ".env.example",
  "package.json",
  "src/version.js"
 ])assert.equal(isNonProductPath(path),true,path)
});

test("runtime, API, deployment and asset changes remain product changes",()=>{
 for(const path of ["app.js","index.html","styles.css","creator.css","world-surfaces.css","src/ai-client.js","api/turn.js","vercel.json","assets/icon.svg","autotest-export-sw.js"]){
  assert.equal(isProductChange({path,before:"old",after:"new"}),true,path)
 }
});

test("pure browser cache-token changes do not require a release bump",()=>{
 assert.equal(isProductChange({path:"app.js",before:'import "./src/a.js?v=59006";',after:'import "./src/a.js?v=59007";'}),false);
 assert.equal(isProductChange({path:"index.html",before:'<script src="app.js?v=59006"></script>',after:'<script src="app.js?v=59007"></script>'}),false);
 assert.equal(isProductChange({path:"src/a.js",before:'import "./b.js?v=59006";',after:'import "./b.js?v=59007";'}),false)
});

test("semantic runtime edits still require a release bump even beside cache changes",()=>{
 assert.equal(isProductChange({path:"app.js",before:'const label="old"; import "./src/a.js?v=59006";',after:'const label="new"; import "./src/a.js?v=59007";'}),true)
});

test("non-product-only PR keeps the current version",()=>{
 assert.deepEqual(evaluateVersionPolicy({currentVersion:"0.59.7",baseVersion:"0.59.7",productChanges:[]}),{ok:true,code:"NON_PRODUCT_VERSION_STABLE"})
});

test("product PR requires a higher semantic version",()=>{
 assert.deepEqual(evaluateVersionPolicy({currentVersion:"0.59.7",baseVersion:"0.59.7",productChanges:["app.js"]}),{ok:false,code:"VERSION_NOT_BUMPED"});
 assert.deepEqual(evaluateVersionPolicy({currentVersion:"0.59.8",baseVersion:"0.59.7",productChanges:["app.js"]}),{ok:true,code:"PRODUCT_VERSION_BUMP_OK"})
});

test("empty release bumps and version regressions are rejected",()=>{
 assert.deepEqual(evaluateVersionPolicy({currentVersion:"0.59.8",baseVersion:"0.59.7",productChanges:[]}),{ok:false,code:"VERSION_BUMP_WITHOUT_PRODUCT_CHANGE"});
 assert.deepEqual(evaluateVersionPolicy({currentVersion:"0.59.6",baseVersion:"0.59.7",productChanges:[]}),{ok:false,code:"VERSION_REGRESSION"})
});
