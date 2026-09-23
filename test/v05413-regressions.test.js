import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {normalizeLore} from "../src/lore-engine.js";
import {needsExpansion} from "../src/knowledge-graph.js";
import {worldGenerationLinkIssues,mergeOpeningRegion} from "../src/world-compiler.js";
import {parseModelJSON} from "../src/model-json.js";
import {providerTokenBudget} from "../src/ai-settings.js";

test("v0.54.13 accepts string lore without aborting generated NPC canonization",()=>{
 const lore=normalizeLore("他是壁障撕裂當日的倖存者，現在守著脊線。"),story=lore?.story||"";
 assert.match(story,/壁障撕裂/);assert.deepEqual(lore.unlockKeywords,[]);assert.equal(lore.known,false)
});

test("v0.54.13 keeps a checkpointed lazy plan eligible even after location count is satisfied",()=>{
 const state={world:{bible:{era:"X"},registry:{locations:[{name:"A"},{name:"B"},{name:"C"}]},graph:{nodes:[],edges:[],expansions:[]},state:{flags:{}},lazyGeneration:{plans:[{status:"PLANNED",checkpoint:{stage:"RUNTIME_SOCIETY"}}]}}};
 assert.equal(needsExpansion(state),true);
 state.world.lazyGeneration.plans[0].status="COMMITTED";assert.equal(needsExpansion(state),false)
});

test("v0.54.13 recovers society history refs from its generated faction",()=>{
 const anchor={startingLocation:"裂縫觀測哨",startingRegion:"焦土平原",startingSettlement:"鐵鏽堡壘"},history=[{id:"HIST-1"},{id:"HIST-2"}],geography={location:{name:"裂縫觀測哨",region:"焦土平原",description:"x"}},society={locationRef:"裂縫觀測哨",faction:{name:"哨壁協約會",locationName:"裂縫觀測哨",historyRefs:["HIST-2"]}},future={worldTimeline:[]};
 const issues=worldGenerationLinkIssues({anchor,history,geography,society,future});
 assert.equal(issues.includes("SOCIETY_HISTORY_REF_REQUIRED"),false,issues.join(","));
 assert.deepEqual(society.historyRefs,["HIST-2"]);
 assert.deepEqual(mergeOpeningRegion(anchor,geography,society).locations[0].historyRefs,["HIST-2"])
});

test("v0.54.13 folds orphan lore-only cast rows into the preceding NPC before link validation",()=>{
 const anchor={startingLocation:"裂縫觀測哨",startingRegion:"焦土平原",startingSettlement:"鐵鏽堡壘"},history=[{id:"HIST-1"}],geography={location:{name:"裂縫觀測哨",region:"焦土平原"}},society={locationRef:"裂縫觀測哨",historyRefs:["HIST-1"]},future={worldTimeline:[]},cast={npcs:[{name:"守夜人",role:"觀測員",locationName:"裂縫觀測哨",historyRefs:["HIST-1"]},{lore:{story:"舊日倖存者",unlockKeywords:["灰紋"],minMatches:1}}],sideQuests:[]};
 const issues=worldGenerationLinkIssues({anchor,history,geography,society,future,cast});
 assert.equal(issues.some(x=>x.startsWith("CAST_NPC_1_")),false,issues.join(","));
 assert.equal(cast.npcs.length,1);assert.equal(cast.npcs[0].lore.story,"舊日倖存者")
});

test("v0.54.13 model JSON repair handles a missing comma between properties",()=>{
 const parsed=parseModelJSON('{"sceneTitle":"測試","narrative":"第一段" "suggestions":[]}');
 assert.equal(parsed.sceneTitle,"測試");assert.equal(parsed.narrative,"第一段");assert.deepEqual(parsed.suggestions,[])
});

test("v0.54.13 Agnes Future gets enough structured output headroom to avoid 2200-token truncation",async()=>{
 assert.equal(providerTokenBudget("agnes","standard","future",2200),3000);
 const settings=await readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8");
 assert.match(settings,/AI_TASK_TIMEOUT_FLOORS=\{future:70000\}/)
});
