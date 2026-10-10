import test from "node:test";
import assert from "node:assert/strict";
import {fallbackWorldDesignLogic,worldDesignLogicIssues} from "../src/world-architect-skill.js";
import {evaluateWorldStoryArchitecture,assertWorldStoryArchitecture,factionAgencyIssues,npcAgencyIssues} from "../src/world-story-architecture.js";
import {narrativeDirectorSnapshot} from "../src/narrative-director.js";

function faction(){return {name:"灰潮協議會",goal:"維持聚落供應",agency:{goal:"維持聚落供應與地方自治",fear:"供應斷裂導致共同體分裂",resources:["河運倉庫"],dependencies:["上游農地"],internalConflicts:["配給派與自由交易派衝突"],currentPlan:"重新分配本旬糧食",nextActionIfPlayerDoesNothing:"收緊外來人口配給"}}}
function npc(){return {id:"NPC-1",name:"米拉",goal:"保住家人的住處",known:true,locationId:"LOC-1",agency:{want:"保住家人的住處",fear:"家人被迫離開",secret:"她知道倉庫帳本有一頁被替換",boundary:"不會拿家人安全交換陌生人的信任",currentPlan:"先核對今晚的倉庫交接",lifeWithoutPlayer:"照常工作並私下追查帳本異常"}}}
function candidate(){return {worldBible:{designLogic:fallbackWorldDesignLogic({worldTheme:"潮汐會交換人的記憶"},{mustExist:["記憶鹽"]})},generation:{factions:[faction()]}}}

test("Architecture V2 fallback contract is internally complete",()=>{
 const c=candidate();
 assert.deepEqual(worldDesignLogicIssues(c),[]);
 const report=evaluateWorldStoryArchitecture(c);
 assert.equal(report.status,"PASS");
 assert.equal(report.valid,true);
 assert.equal(report.score,100);
});

test("Architecture V2 hard gate rejects an unseeded mystery",()=>{
 const c=candidate();
 c.worldBible.designLogic.mysteryArchitecture.evidenceSeeds=[];
 const report=evaluateWorldStoryArchitecture(c);
 assert.equal(report.status,"FAIL");
 assert.ok(report.hardErrors.includes("WG-008_UNSEEDED_MYSTERY"));
 assert.throws(()=>assertWorldStoryArchitecture(c),e=>e?.code==="WORLD_STORY_ARCHITECTURE_FAILED"&&e?.status===422);
});

test("Agency contracts reject static faction and player-only NPC",()=>{
 assert.ok(factionAgencyIssues({goal:"守城"}).includes("NEXT_ACTION_REQUIRED"));
 assert.ok(npcAgencyIssues({goal:"給玩家任務"}).includes("LIFE_WITHOUT_PLAYER_REQUIRED"));
 assert.deepEqual(factionAgencyIssues(faction()),[]);
 assert.deepEqual(npcAgencyIssues(npc()),[]);
});

test("Legacy worlds are review-only instead of save-breaking",()=>{
 const report=evaluateWorldStoryArchitecture({worldBible:{designLogic:{coreFantasy:"舊世界"}}});
 assert.equal(report.status,"REVIEW");
 assert.equal(report.valid,true);
 assert.equal(report.legacy,true);
});

test("Narrative Director keeps NPC secret out of player-safe guidance",()=>{
 const design=fallbackWorldDesignLogic({worldTheme:"潮汐記憶"},{mustExist:["記憶鹽"]});
 const state={events:[{type:"WORLD_EVENT",visibility:"OBSERVABLE",summary:"港口供應變慢",day:2}],player:{location:"潮港"},world:{version:3,state:{day:2,clock:{totalMinutes:1440}},bible:{designLogic:design},futures:[],registry:{npcs:[npc()],factions:[{id:"FAC-1",known:true,...faction()}]}}};
 const snap=narrativeDirectorSnapshot(state);
 assert.equal(snap.npcPlans[0].agency.secret,"她知道倉庫帳本有一頁被替換");
 assert.doesNotMatch(JSON.stringify(snap.playerSafe),/帳本有一頁被替換/);
 assert.equal(snap.playerSafe.knownFactionGoals[0].name,"灰潮協議會");
 assert.equal(state.world.narrativeDirector.version,1);
});


test("Architecture V2 exposes degraded generation provenance instead of silent PASS",()=>{
 const c=candidate();
 c.generationDiagnostics={stages:{CORE_RULES:{source:"FALLBACK"},SOCIETY:{source:"FALLBACK"}}};
 const report=evaluateWorldStoryArchitecture(c);
 assert.equal(report.valid,true);
 assert.equal(report.status,"REVIEW");
 assert.ok(report.score<=85);
 assert.deepEqual(report.provenanceWarnings.map(x=>x.stage).sort(),["CORE_RULES","SOCIETY"]);
});
