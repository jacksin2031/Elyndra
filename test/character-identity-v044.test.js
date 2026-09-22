import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {ensureTalents,grantTalentPoint,learnTalent,talentSnapshot,specializedSkillGain} from "../src/talent-engine.js";
import {ensureCheckProfile,trainActionSkill} from "../src/check-engine.js";
import {maybeJourneyCheckpoint,recentJourneyCheckpoints} from "../src/journey-closure.js";

function game(){
 return {
  player:{location:"灰門",skills:{OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:0},skillProgress:{OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:0}},
  world:{state:{day:1,clock:{totalMinutes:0}},registry:{locations:[{id:"L1",name:"灰門",known:true}],npcs:[],factions:[],sideQuests:[]}},
  quests:{main:{objectives:["查清鐘聲為何中斷"]}},
  events:[]
 }
}

test("first talent commits a build path and exposes identity",()=>{
 const s=game();ensureTalents(s);grantTalentPoint(s,1);
 const result=learnTalent(s,"TAL-SOCIAL");
 assert.equal(result.ok,true);
 assert.equal(s.player.buildPath,"INTEL");
 const snap=talentSnapshot(s);
 assert.equal(snap.identity.path.name,"情報交涉");
 assert.deepEqual(snap.identity.focusedKinds,["SOCIAL","OBSERVE"])
});

test("off-path basics cost more while other-path advanced talents stay locked",()=>{
 const s=game();ensureTalents(s);grantTalentPoint(s,1);assert.equal(learnTalent(s,"TAL-SOCIAL").ok,true);
 grantTalentPoint(s,2);
 const off=talentSnapshot(s).available.find(x=>x.id==="TAL-TRAVEL");
 assert.equal(off.cost,2);assert.equal(off.available,true);
 const advanced=talentSnapshot(s).available.find(x=>x.id==="TAL-SURVIVAL-2");
 assert.equal(advanced.available,false);assert.equal(advanced.reason,"OTHER_PATH_LOCKED");
 const learned=learnTalent(s,"TAL-TRAVEL");assert.equal(learned.ok,true);assert.equal(learned.cost,2)
});

test("specialization slows unrelated natural skill growth",()=>{
 const s=game();ensureTalents(s);grantTalentPoint(s,1);learnTalent(s,"TAL-SOCIAL");ensureCheckProfile(s);
 const normal=trainActionSkill(s,"TRAVEL",{success:true,grade:"SUCCESS"});
 assert.equal(normal.gain,0);assert.equal(normal.focused,false);
 const critical=trainActionSkill(s,"TRAVEL",{success:true,grade:"CRITICAL_SUCCESS"});
 assert.equal(critical.gain,1);
 const focused=specializedSkillGain(s,"SOCIAL",1);assert.equal(focused.gain,1);assert.equal(focused.focused,true)
});

test("legacy talent saves infer a compatible path without deleting talents",()=>{
 const s=game();s.player.talents=[{id:"TAL-RISKY",name:"危境應對",kind:"RISKY",bonus:1}];
 ensureTalents(s);
 assert.equal(s.player.buildPath,"VANGUARD");
 assert.equal(s.player.talents.length,1)
});

test("natural journey boundaries create a reusable recap",()=>{
 const s=game();
 s.world.registry.sideQuests.push({id:"Q1",known:true,status:"ACTIVE",objective:"找到失蹤的商隊"});
 s.events.push(
  {id:"E1",type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",summary:"旅店主人說北路昨晚有人失蹤。"},
  {id:"E2",type:"QUEST_COMPLETED",visibility:"PLAYER_KNOWN",summary:"你把受傷的信使送回聚落。"}
 );
 const recap=maybeJourneyCheckpoint(s);
 assert.ok(recap);assert.equal(recap.reason,"完成一段委託");
 assert.ok(recap.unresolved.some(x=>x.includes("失蹤的商隊")));
 assert.equal(recentJourneyCheckpoints(s,3).length,1);
 assert.ok(s.events.some(e=>e.type==="SESSION_CHECKPOINT"))
});

test("journal presents mysteries and omens without raw engine progress labels",async()=>{
 const source=await readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8");
 assert.match(source,/未解之謎/);
 assert.match(source,/傳聞與徵兆/);
 assert.match(source,/世界內部數值與隱藏狀態不會出現在手帳/);
 assert.doesNotMatch(source,/Engine 條件 \+q\.conditions|SIDE QUEST ·/)
});
