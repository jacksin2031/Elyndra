import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {npcNameKnown,playerVisibleNpcName,playerVisibleNpcRole,projectPlayerVisibleRegistry} from "../src/player-entity-visibility.js";
import {deriveAcquisitionNotifications} from "../src/acquisition-notifier.js";

const hiddenNpc={id:"N1",name:"灰石協定邊界巡邏隊 阿雷爾七號",role:"邊界巡邏隊監測員",known:true,encountered:true,nameKnown:false,roleKnown:false};
const state=npc=>({world:{registry:{npcs:[npc]}},events:[]});

test("v0.57.30 anonymous NPC presentation hides canonical name and role until evidence unlocks them",()=>{
 const s=state({...hiddenNpc});const npc=s.world.registry.npcs[0];
 assert.equal(npcNameKnown(s,npc),false);
 assert.equal(playerVisibleNpcName(s,npc),"眼前的陌生人");
 assert.equal(playerVisibleNpcRole(s,npc),"身份未明");
 const projected=projectPlayerVisibleRegistry(s,{npcs:[{...npc,description:"灰石協定邊界巡邏隊 阿雷爾七號正在附近巡視。"}]});
 assert.equal(projected.npcs[0].name,"眼前的陌生人");
 assert.equal(projected.npcs[0].role,"身份未明");
 assert.doesNotMatch(JSON.stringify(projected),/阿雷爾七號|邊界巡邏隊監測員/);
 npc.nameKnown=true;npc.roleKnown=true;
 assert.equal(playerVisibleNpcName(s,npc),hiddenNpc.name);
 assert.equal(playerVisibleNpcRole(s,npc),hiddenNpc.role);
});

test("v0.57.30 GAME_NPC_ENCOUNTERED toast defaults unknown identity to anonymous even when snapshot omits knowledge flags",()=>{
 const prev={npcs:{}},next={npcs:{N1:{id:"N1",name:hiddenNpc.name,displayName:hiddenNpc.name,role:hiddenNpc.role,known:true,encountered:true}}};
 const row=deriveAcquisitionNotifications(prev,next).find(x=>x.type==="NPC");
 assert.ok(row);assert.equal(row.name,"眼前的陌生人");assert.equal(row.detail,"身份未明");
 assert.doesNotMatch(JSON.stringify(row),/灰石協定|阿雷爾七號|邊界巡邏隊監測員/);
 const known=deriveAcquisitionNotifications(prev,{npcs:{N1:{...next.npcs.N1,nameKnown:true,roleKnown:true}}}).find(x=>x.type==="NPC");
 assert.equal(known.name,hiddenNpc.name);assert.equal(known.detail,hiddenNpc.role);
});

test("v0.57.30 adventure NPC card redaction covers the inserted card root and chat header",async()=>{
 const source=await readFile(new URL("../src/player-entity-visibility.js",import.meta.url),"utf8");
 assert.match(source,/root\?\.matches\?\.\("\.npc-mini,\.npc-chat-head"\)/);
 assert.match(source,/parts\[0\]="身份未明"/);
});
