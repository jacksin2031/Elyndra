import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.57.1 main-push CI supplies a concrete cache diff base",async()=>{
  const [workflow,script]=await Promise.all([
    readFile(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8"),
    readFile(new URL("../scripts/check-cache-bust.mjs",import.meta.url),"utf8")
  ]);
  assert.match(workflow,/CACHE_BASE_REF:/);
  assert.match(workflow,/github\.event\.before/);
  assert.match(workflow,/github\.event\.pull_request\.base\.sha/);
  assert.match(script,/CACHE_BASE_REF\|\|process\.env\.GITHUB_BASE_REF/);
  assert.match(script,/function baseRevision/);
  assert.match(script,/\^\[0-9a-f\]\{7,40\}\$/i);
});
