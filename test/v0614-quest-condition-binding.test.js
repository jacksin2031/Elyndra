import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {questConditionReferenceIssues,repairQuestConditionEntityBindings} from "../src/quest-contracts.js";

const context={
 npcs:[{id:"NPC-ALIN",name:"阿藺"},{id:"NPC-YUKE",name:"嶼珂"}],
 locations:[],factions:[],sideQuests:[]
};
const mismatched={conditions:[{type:"ENTITY_KNOWN",id:"NPC-ALIN",field:"known",op:"EQ",value:true,description:"玩家必須已知嶼珂已取得合法配給票。"}]};

test("v0.61.6 quest condition rejects an existing but semantically wrong entity id",()=>{
 const issues=questConditionReferenceIssues(mismatched,context);
 assert.deepEqual(issues,["QUEST_CONDITION_ENTITY_SEMANTIC_MISMATCH:0:NPC-ALIN->NPC-YUKE"]);
});

test("v0.61.6 quest condition deterministically rebinds the uniquely named canonical entity",()=>{
 const rows=repairQuestConditionEntityBindings(mismatched,context);
 assert.equal(rows[0].id,"NPC-YUKE");
 assert.equal(rows[0].description,mismatched.conditions[0].description);
});

const lazySource=fs.readFileSync(new URL("../src/lazy-generation.js",import.meta.url),"utf8");
const registrySource=fs.readFileSync(new URL("../src/world-registry.js",import.meta.url),"utf8");
const aiSource=fs.readFileSync(new URL("../src/ai-client.js",import.meta.url),"utf8");

test("v0.61.6 runtime quest pipeline validates and repairs semantic entity binding",()=>{
 assert.match(lazySource,/questConditionReferenceIssues\(row,\{\.\.\.\(state\.world\?\.registry\|\|\{\}\),items:state\.inventory/);
 assert.match(registrySource,/repairQuestConditionEntityBindings\(x,conditionContext\)/);assert.match(registrySource,/questConditionReferenceIssues\(\{conditions\},conditionContext\)/);
 assert.match(aiSource,/禁止文字寫 A 卻把 id 綁到 B/);
});


test("v0.61.6 quest condition binds a unique short name inside a canonical compound NPC name",()=>{
 const compound={npcs:[{id:"NPC-YUKE",name:"配給調查員·嶼珂"},{id:"NPC-ALIN",name:"邊境記錄員·阿藺"}],locations:[],factions:[],sideQuests:[]};
 const input={conditions:[{type:"NPC_STATE",id:"NPC-ALIN",field:"known",op:"EQ",value:true,description:"確認嶼珂已取得合法配給票。"}]};
 const rows=repairQuestConditionEntityBindings(input,compound);
 assert.equal(rows[0].id,"NPC-YUKE");
 assert.deepEqual(questConditionReferenceIssues(input,compound),["QUEST_CONDITION_ENTITY_SEMANTIC_MISMATCH:0:NPC-ALIN->NPC-YUKE"]);
});