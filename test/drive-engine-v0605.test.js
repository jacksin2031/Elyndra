import test from "node:test";
import assert from "node:assert/strict";
import {abandonPlayerDrive,createPlayerDrive,driveSnapshot,ensurePlayerDrives,fulfillPlayerDrive,setFocusedDrive,syncPlayerDrivesFromEvents} from "../src/drive-engine.js";
import {newGame} from "../src/world-engine.js";
import {ensureMainQuest,ensureQuestProgress,questSnapshot} from "../src/quest-engine.js";

const seed={playerName:"測試者",worldviewMode:"style",genre:"奇幻",scale:"小型",danger:3,magic:3,politics:2,playHours:8,prompt:"drive v0605"};
function state(){const s=newGame(seed);s.events??=[];s.inventory??=[];return s}
function playerEvent(s,overrides={}){const e={id:crypto.randomUUID(),type:"PLAYER_ACTION",visibility:"PLAYER_KNOWN",customText:"我詢問失蹤妹妹的下落",summary:"你向旅店老闆詢問失蹤妹妹的下落。",day:s.world?.state?.day||1,at:Date.now(),...overrides};s.events.push(e);return e}

test("Drive runtime starts empty and does not turn the World Campaign Scaffold into a player goal",()=>{
 const s=state();ensurePlayerDrives(s);ensureMainQuest(s);ensureQuestProgress(s);const snap=questSnapshot(s);
 assert.equal(snap.drives.active.length,0);assert.equal(snap.main.role,"WORLD_CAMPAIGN_SCAFFOLD");assert.equal(snap.main.playerMainQuest,false);assert.equal(snap.scaffold.role,"WORLD_CAMPAIGN_SCAFFOLD")
});

test("creating a Drive is player-authored, focused deterministically and duplicate-safe",()=>{
 const s=state();const first=createPlayerDrive(s,{type:"PERSONAL",title:"找到失蹤的妹妹",description:"追查她最後出現的地方"});assert.equal(first.ok,true);assert.equal(driveSnapshot(s).focusId,first.drive.id);
 const duplicate=createPlayerDrive(s,{type:"PERSONAL",title:"找到失蹤的妹妹"});assert.equal(duplicate.ok,false);assert.equal(duplicate.reason,"DUPLICATE");
 const second=createPlayerDrive(s,{type:"MYSTERY",title:"查清鐘塔異響",description:"找出午夜鐘聲停止的原因"});assert.equal(second.ok,true);assert.equal(setFocusedDrive(s,second.drive.id),true);assert.equal(driveSnapshot(s).focusId,second.drive.id)
});

test("Drive sync only advances a clearly relevant future event and ignores unrelated actions",()=>{
 const s=state();const created=createPlayerDrive(s,{type:"PERSONAL",title:"找到失蹤的妹妹",description:"追查妹妹的下落",target:3});
 s.events.push({id:crypto.randomUUID(),type:"PLAYER_ACTION",visibility:"PLAYER_KNOWN",customText:"我整理背包",summary:"你整理了背包。",day:1,at:Date.now()});syncPlayerDrivesFromEvents(s);assert.equal(created.drive.progress,0);
 playerEvent(s);const progressed=syncPlayerDrivesFromEvents(s);assert.deepEqual(progressed,[created.drive.id]);assert.equal(created.drive.progress,1);assert.equal(created.drive.evidence.length,1)
});

test("Relationship Drive can anchor to a specific NPC without trusting AI narration",()=>{
 const s=state();const created=createPlayerDrive(s,{type:"RELATIONSHIP",title:"修復與艾琳的關係",description:"重新建立彼此的信任",targetId:"NPC-ERIN",target:2});
 s.events.push({id:crypto.randomUUID(),type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",npcId:"NPC-OTHER",summary:"你與路人寒暄。",day:1,at:Date.now()});syncPlayerDrivesFromEvents(s);assert.equal(created.drive.progress,0);
 s.events.push({id:crypto.randomUUID(),type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",npcId:"NPC-ERIN",summary:"你向艾琳履行先前的承諾並坦白道歉。",day:1,at:Date.now()});syncPlayerDrivesFromEvents(s);assert.equal(created.drive.progress,1)
});

test("Drive becomes READY from evidence but only the player-facing command fulfills it",()=>{
 const s=state();const created=createPlayerDrive(s,{type:"MYSTERY",title:"查清失蹤案",description:"確認失蹤者最後的去向",target:2});
 for(let i=0;i<2;i++){s.events.push({id:crypto.randomUUID(),type:"NPC_CLUE_CONFIRMED",visibility:"PLAYER_KNOWN",summary:`失蹤案線索 ${i+1}：有人看見失蹤者前往舊橋。`,day:1,at:Date.now()+i});syncPlayerDrivesFromEvents(s)}
 assert.equal(created.drive.status,"READY");assert.equal(created.drive.progress,2);const result=fulfillPlayerDrive(s,created.drive.id);assert.equal(result.ok,true);assert.equal(created.drive.status,"FULFILLED")
});

test("a newly initialized Drive runtime never replays historical events",()=>{
 const s=state();playerEvent(s);ensurePlayerDrives(s);const created=createPlayerDrive(s,{type:"PERSONAL",title:"找到失蹤的妹妹",description:"追查妹妹的下落"});syncPlayerDrivesFromEvents(s);assert.equal(created.drive.progress,0)
});

test("abandoning a Drive is explicit and clears focus safely",()=>{
 const s=state();const a=createPlayerDrive(s,{title:"學會在這個世界生活"}),b=createPlayerDrive(s,{title:"找到回家的方法"});setFocusedDrive(s,a.drive.id);assert.equal(abandonPlayerDrive(s,a.drive.id),true);const snap=driveSnapshot(s);assert.equal(snap.archive.at(-1).status,"ABANDONED");assert.notEqual(snap.focusId,a.drive.id);assert.equal(snap.active.some(x=>x.id===b.drive.id),true)
});
