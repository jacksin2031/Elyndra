import test from "node:test";import assert from "node:assert/strict";import {compileWorld,newGame,validateWorld,d20} from "../src/world-engine.js";import {performAction} from "../src/game-engine.js";
const seed={genre:"黑暗奇幻",theme:"世界輪迴",scale:"中型",danger:4,magic:4,politics:3,prompt:"測試世界"};
test("world compiler produces valid canon",()=>{const {world,report}=compileWorld(seed);assert.equal(report.valid,true);assert.equal(report.score,100);assert.ok(world.canon.facts.length>=3)});
test("new game has persistent runtime domains",()=>{const s=newGame(seed);assert.ok(s.player);assert.ok(s.npcs.lia);assert.ok(s.inventory.length);assert.ok(s.knowledge.length);assert.ok(s.events.length)});
test("validator rejects broken world",()=>{assert.equal(validateWorld({}).valid,false)});
test("d20 stays inside rules",()=>{for(let i=0;i<100;i++){const r=d20(12,2);assert.ok(r.natural>=1&&r.natural<=20);assert.equal(r.total,r.natural+2)}});
test("action appends event",()=>{const s=newGame(seed),before=s.events.length;performAction(s,"lia");assert.equal(s.events.length,before+1);assert.ok(s.npcs.lia.memories.length)});
