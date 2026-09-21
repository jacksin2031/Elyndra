import test from "node:test";
import assert from "node:assert/strict";
import {compileWorld,newGame,validateWorld,d20,applyWorldCandidate} from "../src/world-engine.js";
import {createWorldSeedContract,localSeedCompliance} from "../src/seed-contract.js";
import {createTimelinePacing} from "../src/world-timeline.js";
import {performAction} from "../src/game-engine.js";

const seed={genre:"黑暗奇幻",theme:"世界輪迴",scale:"中型",danger:4,magic:4,politics:3,prompt:"測試世界",playHours:15};

function timelineFor(s=seed){
 const p=createTimelinePacing(s.playHours),out=[];
 for(let i=0;i<p.majorEventCount;i++){
  const t=p.majorEventCount===1?0:i/(p.majorEventCount-1),earliest=Math.max(2,Math.round(2+t*(p.horizonDays-2))),latest=Math.min(p.horizonDays,earliest+2);
  out.push({title:`世界事件${i+1}`,category:"WORLD_EVENT",earliestDay:earliest,latestDay:latest,directorTruth:`第${i+1}個事件背後存在尚未被玩家發現的完整因果。`,observableEffect:`到達時間窗後，玩家能觀察到第${i+1}個世界變化的表面影響。`,pressure:Math.min(15,2+i)})
 }
 return out
}
function historyFor(){return Array.from({length:5},(_,i)=>({id:`HIST-${i+1}`,order:i+1,era:`舊紀${i+1}`,title:`歷史事件${i+1}`,category:"改革",summary:`第${i+1}項已發生且不可改寫的世界歷史。`,causes:["舊制度累積"],legacies:["影響延續至今"],regions:["灰境"],factions:[],discoverKeywords:[`史跡${i+1}`]}))}
function bible(){return {era:"灰燼紀元",centralConflict:"舊王朝遺產正在引發新的權力衝突",magicCost:"每次施法都會消耗施術者的一段清晰記憶",startingRegion:"灰境",startingSettlement:"灰塔聚落",startingLocation:"斷碑谷",ancientTruth:"世界曾被未知力量重置過一次",currentCrisis:"古代封印正逐步失去穩定並影響周邊聚落",tone:"陰暗而壓迫",civilization:{level:2,stage:"城邦文明",infrastructure:"驛路與魔法節點並存",literacy:"書記階層掌握文字",mobility:"商旅沿固定道路往來"},communication:{name:"灰印傳訊",medium:"成對灰印",description:"高魔法支撐的區域傳訊",latency:"NEAR_INSTANT",range:"REGIONAL",accessRule:"ENCOUNTERED",constraints:"需先交換灰印"},weatherSystem:{identity:"灰境的天氣由高空灰潮與魔力流共同形成",source:"灰潮與魔力流",cycle:"每隔數個時段在穩定與灰潮之間轉換",forecastability:"MEDIUM",phenomena:[{id:"WTH-CALM",name:"靜灰",observableName:"灰色天空相對平穩",description:"灰潮暫時沉降",sensoryCue:"空氣中的灰屑緩慢下沉。",rarity:"COMMON",weight:50,durationMin:120,durationMax:300,danger:0,actionModifiers:{}},{id:"WTH-ASH",name:"逆升灰雨",observableName:"灰屑開始向天空逆向飄升",description:"受魔力流影響，灰屑逆重力上升",sensoryCue:"地面的灰屑一點點離地向上飄。",rarity:"UNCOMMON",weight:25,durationMin:60,durationMax:180,danger:2,actionModifiers:{OBSERVE:-1,TRAVEL:-1}},{id:"WTH-GLOW",name:"記憶閃光",observableName:"雲層間反覆出現無聲冷光",description:"魔力殘響在雲層中放電",sensoryCue:"冷白色光芒在雲後無聲閃動。",rarity:"RARE",weight:15,durationMin:45,durationMax:120,danger:3,actionModifiers:{OBSERVE:1,RISKY:-1}},{id:"WTH-VEIL",name:"灰幕",observableName:"厚重灰霧壓低能見度",description:"灰潮形成低空幕牆",sensoryCue:"遠處輪廓被厚重灰霧逐步吞沒。",rarity:"UNCOMMON",weight:10,durationMin:60,durationMax:150,danger:2,actionModifiers:{OBSERVE:-2,TRAVEL:-1}}]}}}
function candidateFor(s=seed,extra={}){
 const compliance=localSeedCompliance(s),theme=compliance.theme.value;
 return {
  seedCompliance:compliance,worldName:"洛希亞",worldTheme:theme,playerName:"凜",summary:"測試摘要",
  publicFacts:["公開事實"],hiddenFacts:["隱藏真相"],openingHook:"你在冰冷石面上醒來。",
  suggestions:["觀察天色","檢查衣物","聆聽四周"],worldBible:bible(),worldHistory:historyFor(),worldTimeline:timelineFor(s),
  worldCalendar:{name:"灰環曆",epochName:"裂世紀",dayTerm:"刻日",cycleTerm:"環",longCycleTerm:"紀",daysPerCycle:9,cyclesPerLongCycle:8,cycles:["灰環","白環","黑環"],periods:[{name:"沉夜",fromMinute:0,toMinute:359},{name:"初明",fromMinute:360,toMinute:719},{name:"盛明",fromMinute:720,toMinute:1079},{name:"餘暮",fromMinute:1080,toMinute:1439}]},
  generation:{},...extra
 }
}

test("world compiler produces valid seed-derived canon",()=>{const {world,report}=compileWorld(seed);assert.equal(report.valid,true);assert.equal(report.score,100);assert.deepEqual(world.seedContract,createWorldSeedContract(seed));assert.equal(world.seedCompliance.politics.value,seed.politics);assert.ok(world.canon.facts.some(f=>f.id==="F-politics"));assert.equal(world.canon.facts.some(f=>f.id==="F-north"),false)});
test("new game has persistent runtime domains without preset action buttons",()=>{const s=newGame(seed);assert.ok(s.player);assert.equal(s.player.name,"無名者");assert.equal(s.player.nameSource,"AI_PENDING");assert.equal(s.player.knowledgeScore,0);assert.equal(s.player.location,"未知地點");assert.deepEqual(s.npcs,{});assert.deepEqual(s.inventory,[]);assert.deepEqual(s.knowledge,[]);assert.deepEqual(s.suggestions,[]);assert.ok(s.events.length)});
test("validator rejects broken world",()=>assert.equal(validateWorld({}).valid,false));
test("d20 stays inside rules",()=>{for(let i=0;i<100;i++){const r=d20(12,2);assert.ok(r.natural>=1&&r.natural<=20);assert.equal(r.total,r.natural+2)}});
test("arbitrary action appends a generic player event without fixed companion logic",()=>{const s=newGame(seed),before=s.events.length,r=performAction(s,"free","嘗試呼喊");assert.equal(s.events.length,before+1);assert.deepEqual(s.npcs,{});assert.equal(r.actionKind,"GENERAL");assert.equal(s.events.at(-1).visibility,"PLAYER_KNOWN")});
test("AI candidate assigns hidden world truth without giving it to the player",()=>{const s=newGame(seed),before=s.world.canon.facts.length,c=candidateFor();c.generationDiagnostics={summary:{stageCount:8,aiSucceeded:8,fallbackCount:0,failedCount:0},quality:"HEALTHY"};c.worldQuality={overall:88,status:"PASS",dimensions:{},findings:[]};const r=applyWorldCandidate(s,c);assert.equal(r.valid,true);assert.equal(s.world.name,"洛希亞");assert.equal(s.world.state.location,"斷碑谷");assert.equal(s.player.location,"未知地點");assert.equal(s.player.worldNameKnown,false);assert.equal(s.player.name,"凜");assert.equal(s.player.nameSource,"AI");assert.equal(s.world.theme,localSeedCompliance(seed).theme.value);assert.equal(s.suggestions[0],"觀察天色");assert.equal(s.world.timeline.length,createTimelinePacing(seed.playHours).majorEventCount);assert.equal(s.world.history.length,5);assert.equal(s.world.history[0].mutable,false);assert.equal(s.world.bible.civilization.level,2);assert.equal(s.world.bible.weatherSystem.phenomena.length,4);assert.ok(s.world.weather.currentId);assert.equal(s.world.canon.facts.length,before+2);assert.equal(s.world.quality.overall,88);assert.equal(s.world.generationDiagnostics.summary.aiSucceeded,8)});
test("invalid AI candidate is rejected",()=>{const s=newGame(seed);assert.throws(()=>applyWorldCandidate(s,{summary:"x"}))});
test("AI world is rejected when seed compliance mismatches user settings",()=>{const s=newGame(seed),bad=localSeedCompliance(seed);bad.magic={value:1,evidence:"模型錯誤地把魔法設定改成低普及度。"};assert.throws(()=>applyWorldCandidate(s,candidateFor(seed,{seedCompliance:bad})),/SEED_MAGIC_MISMATCH/)});
test("custom world prompt is a hard seed requirement",()=>{const s=newGame(seed),bad=localSeedCompliance(seed);bad.prompt={value:"另一個完全不同的世界要求",evidence:"模型忽略了玩家原本的自訂世界描述。"};assert.throws(()=>applyWorldCandidate(s,candidateFor(seed,{seedCompliance:bad})),/SEED_PROMPT_MISMATCH/)});
test("high political complexity requires an opening faction structure",()=>{const politicalSeed={...seed,politics:5},s=newGame(politicalSeed);assert.throws(()=>applyWorldCandidate(s,candidateFor(politicalSeed,{generation:{factions:[]}})),/SEED_POLITICS_STRUCTURE_MISSING/)});
test("free action is recorded and advances profile-specific minutes",()=>{const s=newGame(seed),before=s.world.state.clock.totalMinutes,r=performAction(s,"free","檢查石碑");assert.ok(r.roll);assert.equal(r.actionKind,"OBSERVE");assert.equal(s.world.state.clock.totalMinutes,before+15);assert.equal(s.events.at(-1).customText,"檢查石碑")});
test("user supplied player name overrides AI naming",()=>{const namedSeed={...seed,playerName:"Jack"},s=newGame(namedSeed);applyWorldCandidate(s,candidateFor(namedSeed,{playerName:"模型名字",worldName:"測試界"}));assert.equal(s.player.name,"Jack");assert.equal(s.player.nameSource,"USER")});
test("new game contains main quest",()=>{const s=newGame(seed);assert.equal(s.quests.main.status,"ACTIVE");assert.ok(s.quests.main.objectives.length)});
