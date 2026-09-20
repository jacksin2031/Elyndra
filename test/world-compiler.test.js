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

test("both direct and server world paths canonicalize theme before Engine validation",async()=>{
 const {readFile}=await import("node:fs/promises");
 const [client,server]=await Promise.all([
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../api/world.js",import.meta.url),"utf8")
 ]);
 assert.match(client,/normalizeWorldCoreCandidate\(await worldStage\("CORE"/);
 assert.match(server,/normalizeWorldCoreCandidate\(JSON\.parse\(raw\)\)/);
});
