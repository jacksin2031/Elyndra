import test from "node:test";
import assert from "node:assert/strict";
import {normalizeWorldCoreCandidate} from "../src/world-compiler.js";

test("AI-selected worldTheme becomes the single canonical seed-compliance theme",()=>{
 const core={
  worldTheme:"  記憶作為貨幣的世界  ",
  seedCompliance:{theme:{value:"記憶即貨幣",evidence:"記憶交換制度構成世界核心衝突。"}}
 };
 const out=normalizeWorldCoreCandidate(core);
 assert.equal(out.worldTheme,"記憶作為貨幣的世界");
 assert.equal(out.seedCompliance.theme.value,"記憶作為貨幣的世界");
 assert.equal(out.seedCompliance.theme.evidence,"記憶交換制度構成世界核心衝突。");
});

test("theme canonicalization does not invent missing compliance rows",()=>{
 const core={worldTheme:"循環崩壞",seedCompliance:{}};
 normalizeWorldCoreCandidate(core);
 assert.equal(core.worldTheme,"循環崩壞");
 assert.equal(core.seedCompliance.theme,undefined);
});
