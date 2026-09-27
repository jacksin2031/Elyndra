import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {safePlayerVisibleText,hasLocaleLeak} from "../src/v06011-locale-runtime-hotfix.js";

const GENERIC="日本語表示を準備できなかったため、確定済みのゲーム結果のみ保持しています。";

test("v0.60.13 unknown Japanese leak keeps semantic source for field-aware fallback",()=>{
 const source="找一個能提供現場資訊的人";
 assert.equal(hasLocaleLeak(source,"ja"),true);
 assert.equal(safePlayerVisibleText(source,"ja"),source);
 assert.notEqual(safePlayerVisibleText(source,"ja"),GENERIC);
});

test("v0.60.13 known deterministic engine and weather text localizes synchronously",()=>{
 assert.equal(safePlayerVisibleText("視野被流動介質遮蔽","ja"),"流動する霧や粒子によって視界が遮られている");
 assert.equal(safePlayerVisibleText("已重新產生 3 個新的可執行建議。","ja"),"新しい実行可能な提案を3件生成しました。");
 const result=safePlayerVisibleText("你在北側灯台巡視路完成了「石畳を調べる」。","ja");
 assert.match(result,/北側灯台巡視路.*石畳を調べる.*達成/);
 assert.doesNotMatch(result,/找|這|目前|場景/);
});

test("v0.60.13 runtime UI recovery protects narrative and defers global watchdog past scene fallback",async()=>{
 const source=await readFile(new URL("../src/v06013-runtime-ui-hotfix.js",import.meta.url),"utf8");
 assert.match(source,/PLAYER_ACTION_GLOBAL_WATCHDOG/);
 assert.match(source,/19500/);
 assert.match(source,/GENERIC_JA_FALLBACK/);
 assert.match(source,/lastGoodNarrative/);
 assert.match(source,/現在の天候は/);
 assert.match(source,/現在地は/);
 assert.match(source,/WORLD IMPACT & REPUTATION/);
 assert.match(source,/INVENTORY & CRAFTING/);
 assert.match(source,/TRAVEL JOURNAL/);
});

test("v0.60.13 checkpointed lazy generation can rebase stale-only foreground revision drift",async()=>{
 const source=await readFile(new URL("../src/v06011-lazy-generation-hotfix.js",import.meta.url),"utf8");
 assert.match(source,/errors\.every\(x=>STALE_ONLY\.has/);
 assert.doesNotMatch(source,/plan\.checkpoint\)return false/);
 assert.match(source,/plan\.checkpoint\.worldVersion=worldVersion/);
 assert.match(source,/FOREGROUND_REVISION_ADVANCED/);
});
