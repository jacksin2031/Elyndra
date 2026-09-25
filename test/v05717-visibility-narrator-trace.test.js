import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {playerVisibleNpcName,revealNpcNameFromEvidence,projectPlayerVisibleRegistry} from "../src/player-entity-visibility.js";
import {sceneTurnPreview} from "../src/turn-compiler.js";
import {fallbackNarrative} from "../src/runtime-guard.js";

function state(){return {world:{state:{day:1},registry:{npcs:[{id:"N1",name:"裂-7",known:true,encountered:false,description:"貨櫃旁的人影"}],locations:[]}},player:{location:"未知地點"},events:[]}}

test("v0.57.17 NPC canonical name stays hidden until grounded evidence reveals it",()=>{
 const s=state(),npc=s.world.registry.npcs[0];
 assert.equal(playerVisibleNpcName(s,npc),"眼前的陌生人");
 assert.equal(projectPlayerVisibleRegistry(s,{npcs:[{id:"N1",name:"裂-7"}]}).npcs[0].name,"眼前的陌生人");
 assert.equal(revealNpcNameFromEvidence(s,npc,{answer:"我不打算告訴你名字。"}),false);
 assert.equal(playerVisibleNpcName(s,npc),"眼前的陌生人");
 assert.equal(revealNpcNameFromEvidence(s,npc,{answer:"你可以叫我裂-7。"}),true);
 assert.equal(playerVisibleNpcName(s,npc),"裂-7");
});

test("v0.57.17 concrete Engine-consistent failure narration survives scene guard",()=>{
 const narrative="你伸手扳動貨櫃門鎖，鏽死的鎖舌只發出一聲乾澀摩擦，門沒有打開。";
 const out=sceneTurnPreview({narrative,outcome:"FAILURE"},{success:false,grade:"FAILURE"},{action:"打開貨櫃"});
 assert.equal(out.narrative,narrative);
 assert.doesNotMatch(fallbackNarrative("打開貨櫃",{success:false,grade:"FAILURE"}),/沒有達成預期目的|換一個方法會更有機會/);
});

test("v0.57.17 main UI uses one location projection and keeps free action alongside suggestions",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/topLocation[^\n]+playerVisibleLocationName\(gameState\)/);
 assert.doesNotMatch(app,/topLocation[^\n]+gameState\.player\.location\|\|"未知之地"/);
 assert.match(app,/重新產生建議行動/);
 assert.match(app,/我想做其他事情…/);
 assert.match(app,/建議只是可行方向，不是允許行動的封閉清單/);
 assert.match(app,/id="freeActionForm"|#freeActionForm/);
});

test("v0.57.17 relationship modifier and mutation outcome are distinct and traced",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),game=await readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),adventure=await readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8");
 assert.match(app,/關係修正/);assert.match(app,/互動後：/);assert.match(app,/npcRelationship:actionResult\.ruleEffects\?\.npcRelationship/);
 assert.match(game,/SUCCESS"\)changes=\{trust:2,respect:1\}/);assert.match(game,/source:"ENGINE_LOCAL_SOCIAL"/);
 assert.match(adventure,/NPC_RELATIONSHIP_CHANGED/);assert.match(adventure,/source:"SCENE_TURN"/);assert.match(adventure,/adjustNpcRelationship/);
});

test("v0.57.17 suggestions project NPC names instead of treating known entity as known name",async()=>{
 const actions=await readFile(new URL("../src/contextual-actions.js",import.meta.url),"utf8"),adv=await readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8");
 assert.match(actions,/playerVisibleNpcName/);assert.match(actions,/visibleNpcName\(state,npc\)/);
 assert.match(adv,/projectPlayerVisibleRegistry/);
});
