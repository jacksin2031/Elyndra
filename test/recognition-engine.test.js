import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {applyWorldImpacts,ensureWorldImpact} from "../src/world-impact.js";
import {advanceTime} from "../src/world-clock.js";
import {ensureRecognition,processRecognition,recognitionForNpc,recognitionSnapshot,validateRecognitionCandidate} from "../src/recognition-engine.js";
import {migrateSave} from "../src/storage.js";
import {validateSaveState} from "../src/state-validator.js";

const seed={genre:"黑暗奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:15,prompt:"玩家事蹟必須按世界內資訊傳播"};

function world(){
 const s=newGame(seed);
 canonizeGeneration(s,{
  locations:[
   {name:"石橋鎮",type:"聚落",region:"河谷",description:"河谷中的小鎮",known:true},
   {name:"下游村",type:"村落",region:"河谷",description:"同一河谷的下游村落",known:true}
  ],
  factions:[{name:"河岸盟",goal:"控制渡口",description:"地方勢力",known:true}],
  npcs:[
   {name:"米拉",role:"渡船人",description:"住在石橋鎮",known:true,locationName:"石橋鎮"},
   {name:"塔恩",role:"藥師",description:"住在下游村",known:true,locationName:"下游村"}
  ]
 });
 s.player.location="石橋鎮";s.world.state.location="石橋鎮";return s
}

test("local deeds create earned renown, title, rumor and legacy mark",()=>{
 const s=world(),loc=s.world.registry.locations[0];
 const out=applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:loc.id,title:"修復石橋",summary:"你令河谷主要通路重新可以安全使用。",mutations:[{field:"infrastructure",op:"DELTA",value:8}],recognition:{publicLabel:"石橋修復者",rumor:"有人正在談論那個親手令石橋重新通行的外來者。",tone:"ADMIRE",spread:"LOCAL",legacyMark:{kind:"MEMORIAL",label:"橋頭留下記錄修復者事蹟的木牌"}}}],{roll:{success:true}});
 assert.equal(out.length,1);const r=ensureRecognition(s);assert.equal(r.renown,4);assert.equal(r.tier,"LOCAL_NAME");assert.equal(r.titles[0].label,"石橋修復者");assert.equal(r.marks[0].kind,"MEMORIAL");assert.equal(r.rumors[0].status,"ACTIVE");
});

test("local rumor is known nearby but not telepathically known by a remote NPC",()=>{
 const s=world(),[localNpc,remoteNpc]=s.world.registry.npcs;
 applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:s.world.registry.locations[0].id,title:"重開渡口",summary:"渡口恢復通行。",mutations:[{field:"safety",op:"DELTA",value:4}],recognition:{rumor:"石橋鎮有人重開了封閉多日的渡口。",tone:"RESPECT",spread:"LOCAL",publicLabel:"渡口重開者"}}],{roll:{success:true}});
 assert.equal(recognitionForNpc(s,localNpc).knownDeeds.length,1);
 assert.equal(recognitionForNpc(s,localNpc).titles[0],"渡口重開者");
 assert.equal(recognitionForNpc(s,remoteNpc).knownDeeds.length,0);
 assert.deepEqual(recognitionForNpc(s,remoteNpc).titles,[]);
});

test("regional reputation spreads only after world time passes",()=>{
 const s=world();s.player.knowledgeScore=8;
 for(let i=0;i<2;i++)applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:s.world.registry.locations[0].id,title:"地方改善 "+i,summary:"一項可以被居民確認的地方改善。",mutations:[{field:"prosperity",op:"DELTA",value:1}],recognition:{rumor:"石橋鎮最近有人持續改善公共設施。",tone:"RESPECT",spread:"LOCAL"}}],{roll:{success:true}});
 const remote=s.world.registry.npcs[1],before=recognitionForNpc(s,remote).knownDeeds.length;
 const regional=applyWorldImpacts(s,[{scope:"REGIONAL",targetKind:"location",targetId:s.world.registry.locations[0].id,title:"解除河谷封鎖",summary:"你令整條河谷的主要運輸路線重新恢復。",mutations:[{field:"supply",op:"DELTA",value:12}],recognition:{rumor:"解除河谷封鎖的人正成為沿河聚落共同談論的名字。",tone:"ADMIRE",spread:"REGIONAL",publicLabel:"河谷開路者"}}],{roll:{success:true}});
 assert.equal(regional.length,1);assert.equal(ensureRecognition(s).rumors.at(-1).status,"SPREADING");assert.equal(recognitionForNpc(s,remote).knownDeeds.length,before);
 advanceTime(s,180);processRecognition(s);
 assert.equal(ensureRecognition(s).rumors.at(-1).status,"ACTIVE");assert.equal(recognitionForNpc(s,remote).knownDeeds.length,before+1);
});

test("known faction can proactively seek the player after enough direct attention",()=>{
 const s=world(),f=s.world.registry.factions[0];f.playerReputation=25;
 for(let i=0;i<2;i++)applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"faction",targetId:f.id,title:"協助河岸盟 "+i,summary:"你的行動實際改善了河岸盟目前的處境。",mutations:[{field:"influence",op:"DELTA",value:1}],recognition:{rumor:"河岸盟內部開始談論那名多次改變局勢的外來者。",tone:"RESPECT",spread:"LOCAL"}}],{roll:{success:true}});
 const events=processRecognition(s);assert.ok(events.some(e=>e.type==="FACTION_PLAYER_REACTION"&&/主動要求/.test(e.summary)));assert.ok(recognitionSnapshot(s).reactions.some(x=>x.type==="SEEK_AUDIENCE"));
});

test("fearful public memory raises notoriety without deciding that the player is evil",()=>{
 const s=world();
 applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:s.world.registry.locations[0].id,title:"公開震懾武裝團體",summary:"你以公開行動迫使一批武裝人員撤離。",mutations:[{field:"safety",op:"DELTA",value:3}],recognition:{rumor:"有人畏懼那個令武裝人員當眾退走的外來者。",tone:"FEAR",spread:"LOCAL"}}],{roll:{success:true}});
 const r=ensureRecognition(s);assert.equal(r.renown,4);assert.ok(r.notoriety>0);
});

test("no-op impact candidate earns neither influence nor reputation",()=>{
 const s=world(),impact=ensureWorldImpact(s),recognition=ensureRecognition(s);
 const out=applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:s.world.registry.locations[0].id,title:"沒有真正改變",summary:"這個候選沒有任何合法 mutation 可以落地。",mutations:[{field:"notARealField",op:"DELTA",value:9}],recognition:{rumor:"這條傳聞不應存在。",tone:"ADMIRE",spread:"LOCAL"}}],{roll:{success:true}});
 assert.equal(out.length,0);assert.equal(impact.records.length,0);assert.equal(impact.influence.local,0);assert.equal(recognition.renown,0);assert.equal(recognition.rumors.length,0);
});

test("recognition candidate rejects invalid tone, spread and mark",()=>{
 const r=validateRecognitionCandidate({tone:"DIVINE",spread:"GALAXY",legacyMark:{kind:"PORTAL",label:"x"}});
 assert.equal(r.valid,false);assert.ok(r.errors.includes("RECOGNITION_TONE_INVALID"));assert.ok(r.errors.includes("RECOGNITION_SPREAD_INVALID"));assert.ok(r.errors.includes("RECOGNITION_MARK_INVALID"));
});

test("save format v8 migrates recognition state without breaking existing impact history",()=>{
 const s=world();applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:s.world.registry.locations[0].id,title:"舊版影響",summary:"這是一項已經存在的世界影響。",mutations:[{field:"safety",op:"DELTA",value:2}]}],{roll:{success:true}});
 s.formatVersion=7;delete s.world.recognition;
 const m=migrateSave(s);assert.equal(m.formatVersion,8);assert.ok(m.world.recognition);assert.equal(validateSaveState(m).valid,true);assert.equal(m.world.impact.records.length,1);assert.equal(m.world.recognition.renown,4);assert.equal(m.world.recognition.rumors.length,1);assert.equal(m.world.recognition.rumors[0].status,"ACTIVE");
});
