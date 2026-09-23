import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {groundStatePatch} from "../src/state-sync.js";
import {performAction} from "../src/game-engine.js";

const seed={worldviewMode:"style",genre:"黑暗奇幻",scale:"小型",danger:1,magic:3,politics:2,playHours:10,prompt:""};

function localNpcState(){
 const state=newGame(seed);
 state.world.registry??={};
 state.world.registry.locations=[{id:"LOC-ROOM",name:"轉生間",region:"灰燼平原",known:true,visibilityLock:"KNOWN"}];
 state.world.registry.npcs=[{id:"NPC-ALP",name:"轉生官·阿爾卑斯",known:true,encountered:false,visibilityLock:"KNOWN",locationId:"LOC-ROOM",memories:[],alive:true,trust:0}];
 state.world.registry.factions??=[];state.world.registry.sideQuests??=[];
 state.player.location="轉生間";state.world.state.location="轉生間";state.world.state.region="灰燼平原";
 return state
}

test("NPC discovery source accepts unique visible name and canonicalizes to id",()=>{
 const state=localNpcState(),patch={baseRevision:0,operations:[{op:"DISCOVER_FACT",title:"壁爐封印的可驗證徵象",text:"轉生官指出記憶晶體壁爐啟動封印時，濃霧凝滯方向會短暫逆轉。",factId:"",evidenceType:"HEARD",sourceKind:"NPC",sourceId:"轉生官·阿爾卑斯"}]};
 const grounded=groundStatePatch(state,patch,{observableText:"阿爾卑斯指向記憶晶體壁爐：封印啟動時，濃霧凝滯方向會短暫逆轉，這可以親眼確認。"});
 assert.equal(grounded.rejected.length,0);
 assert.equal(grounded.patch.operations.length,1);
 assert.equal(grounded.patch.operations[0].sourceId,"NPC-ALP");
});

test("knowledge grounding uses observable claim evidence instead of requiring exact title text",()=>{
 const state=localNpcState(),patch={baseRevision:0,operations:[{op:"DISCOVER_FACT",title:"第一手封印判定方法",text:"記憶晶體壁爐啟動封印時，濃霧凝滯方向會短暫逆轉。",factId:"",evidenceType:"OBSERVED",sourceKind:"LOCATION",sourceId:"轉生間"}]};
 const grounded=groundStatePatch(state,patch,{observableText:"你看見記憶晶體壁爐開始運轉；封印亮起後，濃霧凝滯方向短暫逆轉。"});
 assert.equal(grounded.rejected.length,0);
 assert.equal(grounded.patch.operations[0].sourceId,"LOC-ROOM");
});

test("knowledge grounding still rejects unrelated claims",()=>{
 const state=localNpcState(),patch={baseRevision:0,operations:[{op:"DISCOVER_FACT",title:"王城戰況",text:"王城北門爆發大規模戰爭，守軍已經全面撤退。",factId:"",evidenceType:"OBSERVED",sourceKind:"LOCATION",sourceId:"轉生間"}]};
 const grounded=groundStatePatch(state,patch,{observableText:"你看見記憶晶體壁爐開始運轉；封印亮起後，濃霧凝滯方向短暫逆轉。"});
 assert.equal(grounded.patch.operations.length,0);
 assert.equal(grounded.rejected[0]?.reason,"KNOWLEDGE_EVIDENCE_NOT_OBSERVED");
});

test("entity reveal by unique npc name is normalized to canonical id",()=>{
 const state=localNpcState(),patch={baseRevision:0,operations:[{op:"REVEAL_ENTITY",kind:"npc",id:"轉生官·阿爾卑斯"}]};
 const grounded=groundStatePatch(state,patch,{});
 assert.equal(grounded.rejected.length,0);
 assert.equal(grounded.patch.operations[0].id,"NPC-ALP");
});

test("generic local TALK action persists encounter and grounded interaction memory",()=>{
 const state=localNpcState(),npc=state.world.registry.npcs[0];
 performAction(state,"free","向轉生官·阿爾卑斯詢問壁爐的運作方法",{verdict:"ALLOW",kind:"SOCIAL",intent:"TALK",targetId:"NPC-ALP",actionIntent:{intent:"TALK",targetId:"NPC-ALP"}});
 assert.equal(npc.encountered,true);
 assert.ok(npc.memories.length>=1);
 assert.equal(npc.memories.at(-1).type,"interaction");
 assert.equal(npc.memories.at(-1).grounded,true);
 assert.ok(state.events.some(e=>e.type==="NPC_INTERACTION"&&e.npcId==="NPC-ALP"));
});
