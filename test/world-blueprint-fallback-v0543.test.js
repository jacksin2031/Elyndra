import test from "node:test";
import assert from "node:assert/strict";
import {coreRulesFallback} from "../src/ai-client.js";

test("v0.54.3 core fallback follows resolved civilization, technology and magic blueprint values",()=>{
 const identity={worldTheme:"魔力污染後的遺構生存",magic:4,politics:2,danger:4,scale:"大型"};
 const blueprintProfile={
  civilizationLevel:{value:3},
  technologyLevel:{value:8},
  magicLevel:{value:8}
 };
 const out=coreRulesFallback(identity,blueprintProfile).worldBible;
 assert.equal(out.civilization.level,2);
 assert.match(out.civilization.infrastructure,/高技術遺構/);
 assert.equal(out.communication.name,"遺構共鳴網");
 assert.equal(out.communication.range,"REGIONAL");
 assert.match(out.communication.constraints,/少數|故障|維修/)
});

test("v0.54.3 fallback does not grant world-range near-instant communication to low-organization worlds merely because magic is high",()=>{
 const identity={worldTheme:"破碎大陸",magic:5,politics:1,danger:5,scale:"大型"};
 const out=coreRulesFallback(identity,{civilizationLevel:{value:2},technologyLevel:{value:3},magicLevel:{value:9}}).worldBible;
 assert.equal(out.civilization.level,1);
 assert.notEqual(out.communication.range,"WORLD")
});
