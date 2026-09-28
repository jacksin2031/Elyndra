import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {safePlayerVisibleText,hasLocaleLeak,uiText} from "../src/v06011-locale-runtime-hotfix.js";
import {playerVisibleLocationName,playerVisibleLocationRecord} from "../src/v06011-player-location-hotfix.js";
import {roleplayFallbackSuggestions} from "../src/v06011-player-experience-hotfix.js";
import {validateLazyGenerationCandidate,LAZY_PROMPT_VERSION,LAZY_VALIDATION_VERSION} from "../src/v06011-lazy-generation-hotfix.js";

const withJa=fn=>{const prev=globalThis.ELYNDRA_LOCALE;globalThis.ELYNDRA_LOCALE="ja";try{return fn()}finally{globalThis.ELYNDRA_LOCALE=prev}};

test("v0.60.13 Japanese visible text localizes known templates and preserves unknown leaks for field-aware fallback",()=>withJa(()=>{
 const recovery=uiText("AI 場景敘述未完成；已保留 Engine 的可見結果並重建安全行動。","ja");
 assert.match(recovery,/AIの場面描写/);assert.equal(hasLocaleLeak(recovery,"ja"),false);
 const success=safePlayerVisibleText("你在サルナ湾桟橋完成了「橋を渡る」。","ja");
 assert.equal(success,"サルナ湾桟橋で「橋を渡る」を達成しました。");assert.equal(hasLocaleLeak(success,"ja"),false);
 const arbitrary="目前場景敘述仍然沒有完成，因此這個結果暫時只能使用繁體中文備援。";
 assert.equal(hasLocaleLeak(arbitrary,"ja"),true);assert.equal(safePlayerVisibleText(arbitrary,"ja"),arbitrary)
}));

test("v0.60.11 HUD preserves a concrete Japanese location token even before registry convergence",()=>withJa(()=>{
 const state={player:{location:"サルナ湾桟橋"},world:{state:{location:"サルナ湾桟橋"},registry:{locations:[]}}};
 assert.equal(playerVisibleLocationName(state),"サルナ湾桟橋");assert.equal(playerVisibleLocationRecord(state).known,false)
}));

test("v0.60.11 unknown canonical locations use a Japanese observable alias",()=>withJa(()=>{
 const state={player:{location:"LOC-1"},world:{state:{location:"LOC-1"},registry:{locations:[{id:"LOC-1",name:"隠された正式名称",known:false,type:"棧橋",description:"木造棧橋が湾へ伸びている"}]}}};
 const row=playerVisibleLocationRecord(state);assert.equal(row.known,false);assert.equal(row.name,"目の前の橋のたもと");assert.doesNotMatch(row.name,/眼前|橋邊|未知/)
}));

test("v0.60.11 Japanese fallback suggestions are generated natively in Japanese",()=>withJa(()=>{
 const state={player:{location:"サルナ湾桟橋"},world:{registry:{locations:[{id:"L1",name:"サルナ湾桟橋",known:true}],npcs:[{id:"N1",name:"ミラ",known:true,alive:true,locationId:"L1"}]}},suggestions:[]};
 const rows=roleplayFallbackSuggestions(state,{action:"橋の向こうを確認する"});assert.ok(rows.length>=3);assert.ok(rows.some(x=>x.includes("ミラ")));for(const row of rows)assert.equal(hasLocaleLeak(row,"ja"),false)
}));

test("v0.60.13 background lazy generation safely rebases pure revision drift including checkpoints only",()=>{
 const state={world:{id:"W1",version:2,state:{day:1,clock:{totalMinutes:15}},registry:{locations:[],npcs:[],factions:[],sideQuests:[]},catalog:{civilizations:[],species:[],languages:[]},history:[],lazyGeneration:{version:2,generationRevision:0,plans:[],commits:[]}}};
 const basePlan={id:"P1",status:"PLANNED",worldVersion:1,generationRevision:1,worldSeedFingerprint:"seed",entitySeed:"entity",generationSlot:{region:"R",day:1,evolution:0,reason:"BACKGROUND_GAMEPLAY"},promptVersion:LAZY_PROMPT_VERSION,validationVersion:LAZY_VALIDATION_VERSION,generatedAtWorldTime:{day:1,totalMinutes:0},slots:{locations:0,npcs:0,factions:0,sideQuests:0,definitions:0},forbiddenTerms:[],historyRefs:[],claimIds:[],claims:[],legacyEchoIds:[],legacyEchoes:[]};
 const out=validateLazyGenerationCandidate(state,{locations:[],npcs:[],factions:[],sideQuests:[],definitions:[]},basePlan);assert.equal(out.valid,true);assert.equal(out.rebased,true);assert.equal(basePlan.worldVersion,2);
 const checkpointed={...basePlan,id:"P2",worldVersion:1,checkpoint:{stage:"CORE",worldVersion:1,added:{locations:[],npcs:[],factions:[],sideQuests:[],definitions:[]}}};
 const resumed=validateLazyGenerationCandidate(state,{locations:[],npcs:[],factions:[],sideQuests:[],definitions:[]},checkpointed);assert.equal(resumed.valid,true);assert.equal(resumed.rebased,true);assert.equal(checkpointed.checkpoint.worldVersion,2);
 const unsafe={...basePlan,id:"P3",worldVersion:1,slots:{...basePlan.slots,locations:0}};const rejected=validateLazyGenerationCandidate(state,{locations:[{id:"L1",name:"越界地點"}],npcs:[],factions:[],sideQuests:[],definitions:[]},unsafe);assert.equal(rejected.valid,false);assert.ok(rejected.errors.includes("LAZY_STALE_WORLD_VERSION"));assert.ok(rejected.errors.some(x=>String(x).startsWith("LAZY_SLOT_EXCEEDED")))
});

test("v0.60.11 manual-test protections remain wired through the v0.60.30 wrapper chain",async()=>{
 const [html,app,game25,ai25,ai24]=await Promise.all([readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../app.js",import.meta.url),"utf8"),readFile(new URL("../src/v06025-game-engine-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06025-ai-client-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06024-ai-client-hotfix.js",import.meta.url),"utf8")]);
 assert.match(html,/\.\/src\/locale-runtime\.js\?v=60010\"\s*:\s*\"\.\/src\/v06011-locale-runtime-hotfix\.js\?v=60013/);
 assert.match(html,/\.\/src\/player-location-visibility\.js\?v=57025\"\s*:\s*\"\.\/src\/v06011-player-location-hotfix\.js\?v=60011/);
 assert.match(html,/\.\/src\/game-engine\.js\?v=60006\"\s*:\s*\"\.\/src\/v06025-game-engine-hotfix\.js\?v=60025/);
 assert.match(html,/\.\/src\/player-experience\.js\?v=57028\"\s*:\s*\"\.\/src\/v06011-player-experience-hotfix\.js\?v=60011/);
 assert.match(html,/\.\/src\/lazy-generation\.js\?v=59014\"\s*:\s*\"\.\/src\/v06011-lazy-generation-hotfix\.js\?v=60013/);
 assert.match(html,/\.\/src\/version\.js\?v=60010\"\s*:\s*\"\.\/src\/version\.js\?v=60030/);
 assert.match(html,/\.\/src\/contextual-actions\.js\?v=60010\"\s*:\s*\"\.\/src\/v06021-contextual-actions-hotfix\.js\?v=60021/);
 assert.match(html,/\.\/src\/ai-client\.js\?v=60010\"\s*:\s*\"\.\/src\/v06025-ai-client-hotfix\.js\?v=60026/);
 assert.match(game25,/v06019-game-engine-hotfix\.js\?v=60019/);assert.match(ai25,/v06024-ai-client-hotfix\.js\?v=60026/);assert.match(ai24,/v06019-ai-client-hotfix\.js\?v=60026/);
 assert.match(html,/v06027-runtime-ui-hotfix\.js\?v=60027/);assert.match(html,/app\.js\?v=60030/);
 assert.match(app,/playerActionFlight\.epoch!==actionFlightEpoch\|\|playerActionFlight\.timedOut\|\|actionAiLease!==foregroundAiLease/);
 assert.match(app,/PLAYER_ACTION_AI_STALE_DISCARDED/);assert.match(app,/preemptNonblockingScene\(\)/)
});
