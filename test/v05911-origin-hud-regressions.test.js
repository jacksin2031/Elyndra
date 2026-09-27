import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {createWorldCreationDraft,compileWorldCreation,applyWorldCreationState} from "../src/world-creation.js";
import {applyOriginRuntime} from "../src/origin-runtime.js";

function reincarnationState(){
 const seed=compileWorldCreation(createWorldCreationDraft({worldStyle:"王道奇幻",worldScale:"中型",targetPlayHours:12,difficulty:"normal",originType:"reincarnation",playerRole:"ordinary",masterSeed:"v05911-reincarnation"}));
 const s=newGame(seed);applyWorldCreationState(s,seed);
 s.world.bible={...(s.world.bible||{}),startingLocation:"出生村",startingSettlement:"出生村",startingRegion:"北境",weatherSystem:{phenomena:[]}};
 s.world.state.location="出生村";s.player.location="出生村";
 s.world.registry={
  locations:[{id:"LOC-HOME",name:"出生村",known:true},{id:"LOC-SECRET",name:"王都密室",known:true}],
  npcs:[{id:"NPC-SECRET",name:"王都密探",known:true,encountered:true,companion:{status:"NONE"}}],
  factions:[{id:"FAC-SECRET",name:"王都內廷",known:true}],
  sideQuests:[{id:"SQ-SECRET",title:"密室陰謀",known:true}]
 };
 return s
}

test("v0.59.11 reincarnation first POST_CANON keeps only origin-scoped visibility",()=>{
 const s=reincarnationState();
 applyOriginRuntime(s,{phase:"POST_CANON"});
 assert.equal(s.world.registry.locations[0].known,true);
 assert.equal(s.world.registry.locations[1].known,false);
 assert.equal(s.world.registry.npcs[0].known,false);
 assert.equal(s.world.registry.npcs[0].encountered,false);
 assert.equal(s.world.registry.factions[0].known,false);
 assert.equal(s.world.registry.sideQuests[0].known,false)
});

test("v0.59.11 origin boundary only applies once and preserves later discoveries",()=>{
 const s=reincarnationState();
 applyOriginRuntime(s,{phase:"POST_CANON"});
 s.world.registry.locations[1].known=true;
 s.world.registry.npcs[0].known=true;s.world.registry.npcs[0].encountered=true;
 applyOriginRuntime(s,{phase:"POST_CANON"});
 assert.equal(s.world.registry.locations[1].known,true);
 assert.equal(s.world.registry.npcs[0].known,true);
 assert.equal(s.world.registry.npcs[0].encountered,true)
});

test("v0.59.11 player identity HUD hard-bounds artwork",async()=>{
 const css=await readFile(new URL("../world-surfaces.css",import.meta.url),"utf8");
 assert.match(css,/player identity card containment/);
 assert.match(css,/#game \.player-summary\{[^}]*overflow:hidden!important/);
 assert.match(css,/#game \.player-sigil,#game #playerInitial\{[\s\S]*max-width:40px!important;max-height:40px!important/);
 assert.match(css,/object-fit:cover!important/)
});

test("v0.59.11 current objective card stays inside the sidebar HUD",async()=>{
 const css=await readFile(new URL("../world-surfaces.css",import.meta.url),"utf8");
 assert.match(css,/current-objective card containment/);
 assert.match(css,/#game \.quest-card\{[^}]*overflow:hidden!important/);
 assert.match(css,/#game \.quest-card>strong\{[^}]*-webkit-line-clamp:2/);
 assert.match(css,/#game \.quest-card>p\{[^}]*-webkit-line-clamp:3/)
});

test("v0.59.11 cache map routes modified runtime modules to the release epoch",async()=>{
 const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,/world-surfaces\.css\?v=59011/);
 assert.match(html,/app\.js\?v=59011/);
 assert.match(html,/"\.\/src\/version\.js\?v=59010":"\.\/src\/version\.js\?v=59011"/);
 assert.match(html,/"\.\/src\/origin-runtime\.js\?v=57025":"\.\/src\/origin-runtime\.js\?v=59011"/)
});
