import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {performAction,resolveEngineFeasibility} from "../src/game-engine.js";
import {combatAction,startEncounter} from "../src/combat-engine.js";
import {createPlayerDrive,driveSnapshot,syncPlayerDrivesFromEvents} from "../src/drive-engine.js";
import {ensureStoryRhythm,rhythmSuggestionBias,storyRhythmSnapshot,syncStoryRhythm} from "../src/story-rhythm-engine.js";

const seed={playerName:"整合測試者",worldviewMode:"style",genre:"奇幻",scale:"小型",danger:3,magic:3,politics:2,playHours:8,prompt:"TRPG Depth E2E acceptance"};
function state(){
 const s=newGame(seed);s.events??=[];s.inventory??=[];s.player.hp=200;s.player.maxHp=200;return s
}
function installLocalNpc(s){
 s.world.registry??={};s.world.registry.locations=Array.isArray(s.world.registry.locations)?s.world.registry.locations:[];s.world.registry.npcs=Array.isArray(s.world.registry.npcs)?s.world.registry.npcs:[];
 let loc=s.world.registry.locations.find(x=>x?.name===s.player?.location)||s.world.registry.locations[0];
 if(!loc){loc={id:"LOC-GATE",name:s.player?.location||"灰港城門",known:true,description:"城門前的石路與守衛崗哨。"};s.world.registry.locations.push(loc);s.player.location=loc.name;s.world.state.location=loc.name}
 else{s.player.location=loc.name;s.world.state.location=loc.name;loc.known=true}
 const npc={id:"NPC-GATE",name:"灰港守衛",role:"守衛",goal:"維持城門秩序",known:true,encountered:true,alive:true,locationId:loc.id,trust:30};
 s.world.registry.npcs=s.world.registry.npcs.filter(x=>x?.id!==npc.id);s.world.registry.npcs.push(npc);return npc
}
function push(s,type,summary,extra={}){const e={id:crypto.randomUUID(),type,visibility:"PLAYER_KNOWN",summary,day:s.world?.state?.day||1,at:Date.now(),...extra};s.events.push(e);return e}

test("E2E: a free-text combat technique becomes a player-facing Combat beat before victory",()=>{
 const s=state();ensureStoryRhythm(s);startEncounter(s,[{id:"OGRE",name:"石皮巨人",hp:300,defense:18,damage:1,level:1}]);
 const result=combatAction(s,"我先向左假攻，等巨人轉移重心後滑到腿側絆它的膝蓋");
 assert.equal(result.intent.combatAction,"TECHNIQUE");assert.equal(s.combat.active,true);
 syncStoryRhythm(s);const snap=storyRhythmSnapshot(s,{sync:false}),beat=snap.recent.find(x=>x.eventType==="COMBAT_ACTION_RESOLVED");
 assert.ok(beat,"combat turn must be visible to Story Rhythm before COMBAT_WON");assert.equal(beat.mode,"COMBAT")
});

test("E2E: free-text intimidation uses Social Conflict 2.0 instead of generic success-to-trust",()=>{
 const s=state(),npc=installLocalNpc(s),before=Number(npc.trust)||30;
 const assessment={verdict:"ALLOW",kind:"SOCIAL",confidence:99,actionIntent:{intent:"THREATEN",approach:"INTIMIDATION",targetId:npc.id,raw:"我警告守衛再擋路就要承擔後果"}};
 const result=performAction(s,"free","我警告灰港守衛：再擋路就要承擔後果",assessment),social=result.ruleEffects?.npcRelationship;
 assert.equal(social?.tactic,"INTIMIDATION");assert.ok(s.events.some(x=>x.type==="SOCIAL_CONFLICT_RESOLVED"&&x.tactic==="INTIMIDATION"));
 const after=Number(social?.relationship?.trust);assert.ok(Number.isFinite(after));assert.ok(after<before,"intimidation must not be converted into a generic trust reward")
});

test("E2E: one grounded clue can advance a player Drive and Story Rhythm without either gaining Canon authority",()=>{
 const s=state();ensureStoryRhythm(s);const created=createPlayerDrive(s,{type:"MYSTERY",title:"查清失蹤案",target:2,focus:true});assert.equal(created.ok,true);
 const clue=push(s,"NPC_CLUE_CONFIRMED","失蹤案的新線索指出失蹤者昨晚曾經過舊橋。",{npcId:"NPC-WITNESS"});
 const progressed=syncPlayerDrivesFromEvents(s);syncStoryRhythm(s);const drive=driveSnapshot(s).active.find(x=>x.id===created.drive.id),beat=storyRhythmSnapshot(s,{sync:false}).recent.find(x=>x.eventId===clue.id);
 assert.deepEqual(progressed,[created.drive.id]);assert.equal(drive.progress,1);assert.equal(drive.status,"ACTIVE");assert.equal(beat?.narrativeFunction,"MYSTERY_PROGRESS");assert.equal(created.drive.status,"ACTIVE")
});

test("E2E: rhythm preference stays soft and Engine authority still blocks impossible movement",()=>{
 const s=state();ensureStoryRhythm(s);for(let i=0;i<3;i++)push(s,"NPC_CONVERSATION",`你與守衛進行第 ${i+1} 輪交談。`,{npcId:"NPC-GATE"});syncStoryRhythm(s);
 assert.ok(rhythmSuggestionBias(s,{kind:"OBSERVE",action:"檢查城門旁的痕跡"})>rhythmSuggestionBias(s,{kind:"SOCIAL",action:"繼續與守衛交談"}));
 const impossible=resolveEngineFeasibility(s,"我直接瞬間移動到王都",{kind:"TRAVEL",actionIntent:{intent:"TRAVEL"}});assert.equal(impossible.verdict,"BLOCK");assert.match(impossible.reason,/能力|超常移動/)
});

test("E2E: player-facing local GM prose no longer leaks validation or state-machine disclaimers",async()=>{
 const game=await readFile(new URL("../src/game-engine.js",import.meta.url),"utf8");
 assert.doesNotMatch(game,/是否得到新資訊|世界狀態為準|不額外推斷|憑空出現新線索|Engine 無法套用效果/)
});
