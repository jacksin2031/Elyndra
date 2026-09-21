import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {migrateSave} from "../src/storage.js";
import {validateSaveState} from "../src/state-validator.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {applyTurnCandidate} from "../src/adventure-engine.js";
import {ensureTravelNetwork,travelTo} from "../src/travel-engine.js";
import {ensureSurvival} from "../src/survival-engine.js";
import {performAction} from "../src/game-engine.js";
import {learnSpell,resolveMagicAction} from "../src/magic-engine.js";
import {applyCultureAction} from "../src/culture-engine.js";
import {tickNpcs} from "../src/npc-engine.js";
import {applyNpcConversationTurn} from "../src/npc-dialogue-engine.js";
import {tickFactions} from "../src/faction-engine.js";
import {tickMainQuest} from "../src/quest-engine.js";
import {ensureDungeonSites,exploreDungeon} from "../src/dungeon-engine.js";
import {applyWorldImpacts} from "../src/world-impact.js";
import {canStartEncounter} from "../src/combat-engine.js";
import {ensureTalents,grantTalentPoint,learnTalent,talentActionModifier} from "../src/talent-engine.js";
import {createTimelinePacing,timelineAuthoringSlots,bindTimelineAuthoringSlots,validateWorldTimeline} from "../src/world-timeline.js";
import {endgameWindowOpen} from "../src/world-pacing.js";

const seed={genre:"異界奇幻",theme:"漂流世界",scale:"中型",danger:3,magic:4,politics:3,playHours:15,prompt:"世界規則必須能被玩家實際體驗"};
const game=()=>newGame(seed);

test("save v11 migration initializes the new runtime without invalid state",()=>{
 const s=migrateSave(game());
 assert.equal(s.formatVersion,12);
 assert.ok(s.world.travel);assert.ok(s.world.dungeons);assert.ok(s.world.magic);
 assert.ok(s.player.survival);assert.ok(s.player.magic);assert.ok(Array.isArray(s.player.talents));
 assert.equal(validateSaveState(s).valid,true)
});

test("hidden canon cannot become scored knowledge through an AI discovery",()=>{
 const s=game(),hidden=s.world.canon.facts.find(f=>f.visibility==="hidden");
 applyTurnCandidate(s,{narrative:"你似乎注意到某種規律。",discoveries:[{title:"可疑規律",text:hidden.text,factId:hidden.id,evidenceType:"OBSERVED"}],suggestions:["繼續觀察"]},{roll:{success:true,profile:{kind:"OBSERVE"}},action:"觀察"});
 assert.equal(s.knowledge.at(-1).status,"OBSERVATION");assert.equal(s.knowledge.at(-1).factId,null);assert.equal(s.player.knowledgeScore,0)
});

test("public canon needs successful evidence and then becomes verified knowledge",()=>{
 const s=game();s.world.canon.facts.push({id:"FACT-PUBLIC",type:"rule",visibility:"public",text:"此地的藍色石門會在鐘聲後打開。",canonical:true});
 applyTurnCandidate(s,{narrative:"你反覆觀察後確認規律。",discoveries:[{title:"石門規律",text:"石門會在鐘聲後打開。",factId:"FACT-PUBLIC",evidenceType:"OBSERVED"}],suggestions:["等待鐘聲"]},{roll:{success:true,profile:{kind:"OBSERVE"}},action:"觀察石門"});
 assert.equal(s.knowledge.at(-1).status,"VERIFIED");assert.equal(s.knowledge.at(-1).factId,"FACT-PUBLIC");assert.equal(s.player.knowledgeScore,2)
});

test("travel requires a travel success and consumes route time plus survival energy",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"灰港",type:"港鎮",region:"灰岸",description:"沿海聚落",known:true},{name:"星丘",type:"山丘",region:"灰岸",description:"高地聚落",known:true}]});
 const [a,b]=s.world.registry.locations;s.player.location=a.name;s.world.state.location=a.name;ensureTravelNetwork(s);const before=s.world.state.clock.totalMinutes,sv=ensureSurvival(s);sv.fatigue=0;
 const denied=travelTo(s,b,{roll:{success:true,profile:{kind:"GENERAL"}},actionKind:"GENERAL",baseMinutes:0});assert.equal(denied.ok,false);assert.equal(s.player.location,a.name);
 const moved=travelTo(s,b,{roll:{success:true,profile:{kind:"TRAVEL"}},actionKind:"TRAVEL",baseMinutes:0});assert.equal(moved.ok,true);assert.equal(s.player.location,b.name);assert.ok(s.world.state.clock.totalMinutes>before);assert.ok(ensureSurvival(s).fatigue>0)
});

test("failed lodging payment cannot grant rest recovery",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"燈市",type:"城鎮",region:"中央",description:"夜間市場",known:true,trade:{mode:"currency",currencies:[{id:"CUR-LAMP",name:"燈票",symbol:"◇",issuer:"燈市"}]}}]});s.player.location="燈市";s.world.state.location="燈市";ensureSurvival(s).fatigue=80;
 const old=Math.random;Math.random=()=>.99;try{
  const failed=performAction(s,"free","在旅店住宿");assert.equal(failed.ruleEffects.economy.ok,false);assert.ok(ensureSurvival(s).fatigue>=80);
  s.player.wallet["CUR-LAMP"]=100;ensureSurvival(s).fatigue=80;const paid=performAction(s,"free","在旅店住宿");assert.equal(paid.ruleEffects.economy.ok,true);assert.ok(ensureSurvival(s).fatigue<80);assert.ok(s.player.wallet["CUR-LAMP"]<100)
 }finally{Math.random=old}
});

test("spell learning requires player-verified canon evidence",()=>{
 const s=game();s.world.canon.facts.push({id:"FACT-SPELL",type:"magic",visibility:"public",text:"迴響術可把聲音短暫固定在水晶內。",canonical:true});
 assert.equal(learnSpell(s,{name:"迴響術",cost:8,effect:"固定聲音",sourceFactId:"FACT-SPELL"}),null);
 s.knowledge.push({id:"K-SPELL",title:"迴響術",text:"迴響術可把聲音短暫固定在水晶內。",factId:"FACT-SPELL",status:"VERIFIED",score:2});
 const spell=learnSpell(s,{name:"迴響術",school:"晶響",cost:8,effect:"固定聲音",sourceFactId:"FACT-SPELL"});assert.ok(spell);
 const result=resolveMagicAction(s,"施法迴響術",{success:true});assert.equal(result.success,true);assert.equal(s.player.magic.strain,8)
});

test("local taboos affect persistent cultural standing",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"白壇村",type:"村落",region:"祭原",description:"圍繞祭壇而建",known:true,culture:{identity:"重視祭壇禮俗",taboos:["不可在祭壇前拔劍"],etiquette:["進入祭壇前低頭"]}}]});s.player.location="白壇村";s.world.state.location="白壇村";
 const ev=applyCultureAction(s,"我在祭壇前拔劍",{success:true});assert.ok(ev);assert.equal(s.player.cultureStanding[s.world.registry.locations[0].id],-2)
});

test("NPCs can relocate through the canonical route network for their own survival",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"危谷",type:"谷地",region:"北境",description:"危險谷地",known:true},{name:"高牆鎮",type:"城鎮",region:"北境",description:"安全城鎮",known:true}],npcs:[{name:"洛卡",role:"居民",description:"在谷地生活",known:true,locationName:"危谷",goal:"維持自己的生活與安全"}]});
 const [danger,safe]=s.world.registry.locations;danger.worldState.safety=10;safe.worldState.safety=90;const npc=s.world.registry.npcs[0];npc.lastActionMinute=0;npc.life={hp:30,maxHp:30,energy:70,hunger:20,occupation:"居民",schedulePhase:"ACTIVE",homeLocationId:danger.id,lastMoveMinute:0,lastWorkMinute:0,needs:[],equipment:[]};s.world.state.clock.totalMinutes=500;tickNpcs(s);assert.equal(npc.locationId,safe.id)
});

test("NPC testimony can advance a clue quest without becoming verified world knowledge",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"橋村",type:"村落",region:"河谷",description:"河邊聚落",known:true}],npcs:[{name:"希爾",role:"目擊者",description:"曾看見商隊經過",known:true,locationName:"橋村"}],sideQuests:[{title:"追查商隊",objective:"問出商隊去向",known:true,evidenceKeywords:["紅旗車隊"],target:1}]});
 const npc=s.world.registry.npcs[0];s.player.location="橋村";s.world.state.location="橋村";npc.encountered=true;const before=s.player.knowledgeScore;
 const out=applyNpcConversationTurn(s,npc,{question:"你見過那支商隊嗎？",answer:"我昨晚看見紅旗車隊沿河往東。"});
 assert.equal(out.questProgress.length,1);assert.equal(s.world.registry.sideQuests[0].status,"COMPLETED");assert.equal(s.player.knowledgeScore,before);assert.equal(s.knowledge.at(-1).status,"TESTIMONY")
});

test("factions choose strategy from goals and can change territory prosperity",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"河市",type:"城鎮",region:"河谷",description:"交易城",known:true}],factions:[{name:"流商聯",goal:"擴大交易與繁榮",description:"商業聯盟",known:true},{name:"鐵衛團",goal:"守住邊境",description:"武裝勢力",known:true}],npcs:[{name:"行商",role:"商人",description:"聯盟成員",known:true,locationName:"河市",factionName:"流商聯"}]});
 const loc=s.world.registry.locations[0],f=s.world.registry.factions.find(x=>x.name==="流商聯"),before=loc.worldState.prosperity;s.world.state.clock.totalMinutes=500;for(const x of s.world.registry.factions)x.lastActionMinute=0;tickFactions(s);assert.equal(f.strategy,"TRADE");assert.ok(loc.worldState.prosperity>before)
});

test("main quest advances through engine states instead of AI title rewrites",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"起點鎮",type:"城鎮",region:"中央",description:"起點",known:true}],npcs:[{name:"米亞",role:"居民",description:"第一個接觸者",known:true,locationName:"起點鎮"}]});s.player.location="起點鎮";s.world.state.location="起點鎮";s.world.registry.npcs[0].encountered=true;assert.equal(tickMainQuest(s).stage,2);
 for(let i=1;i<=3;i++){const id="FACT-Q"+i;s.world.canon.facts.push({id,type:"public",visibility:"public",text:"已驗證世界規則 "+i+" 的完整說明。",canonical:true});s.knowledge.push({id:"KQ"+i,title:"規則"+i,text:"已驗證世界規則 "+i+" 的完整說明。",factId:id,status:"VERIFIED",score:4})}
 assert.equal(tickMainQuest(s).stage,3);s.world.state.crisis={stage:"CRISIS",pressure:70,history:[]};assert.equal(tickMainQuest(s).stage,4);s.world.state.crisis.stage="ENDGAME";assert.equal(tickMainQuest(s).stage,5);assert.equal(s.quests.main.status,"CLIMAX")
});

test("ruins persist as a room graph and cleared rooms do not reset",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"逆塔遺跡",type:"遺跡",region:"古層",description:"倒懸高塔殘骸",known:true}]});s.player.location="逆塔遺跡";s.world.state.location="逆塔遺跡";const site=ensureDungeonSites(s).sites[0],count=site.rooms.length;
 const first=exploreDungeon(s,"探索遺跡",{success:true});assert.ok(first);assert.equal(site.rooms.length,count);assert.equal(site.rooms[0].cleared,true);
 const next=site.rooms[1];exploreDungeon(s,"前進到 "+next.name,{success:true});assert.equal(site.currentRoomId,next.id);assert.equal(site.rooms[0].cleared,true)
});

test("structural world impacts persist explicit bridge and facility states",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"斷橋鎮",type:"聚落",region:"河谷",description:"依橋而生",known:true}]});const loc=s.world.registry.locations[0];s.player.location=loc.name;s.world.state.location=loc.name;
 const out=applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:loc.id,title:"修復斷橋",summary:"玩家完成了橋樑結構修復。",outcome:"BENEFIT",mutations:[{field:"structure",op:"STRUCTURE",value:{id:"BRIDGE-1",label:"北側石橋",state:"RESTORED",description:"恢復通行"}}]}],{roll:{success:true}});
 assert.equal(out.length,1);assert.equal(loc.worldState.structures[0].state,"RESTORED")
});

test("failed durable impacts need an explicit fail-forward cost",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"工坊鎮",type:"聚落",region:"平原",description:"工匠聚居",known:true}]});const loc=s.world.registry.locations[0];s.player.location=loc.name;s.world.state.location=loc.name;const before=loc.worldState.safety;
 const rejected=applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:loc.id,title:"失敗事故",summary:"失敗候選試圖直接造成永久變化。",mutations:[{field:"safety",op:"DELTA",value:-5}]}],{roll:{success:false}});assert.equal(rejected.length,0);assert.equal(loc.worldState.safety,before);
 const cost=applyWorldImpacts(s,[{scope:"LOCAL",targetKind:"location",targetId:loc.id,title:"施工事故",summary:"失敗造成可以確認的實際代價。",outcome:"COST",mutations:[{field:"safety",op:"DELTA",value:-5}]}],{roll:{success:false}});assert.equal(cost.length,1);assert.equal(loc.worldState.safety,before-5)
});

test("combat encounters are rejected without causal danger and accepted for risky intrusion",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"安靜村",type:"村落",region:"中央",description:"安全地區",known:true}]});s.player.location="安靜村";s.world.state.location="安靜村";
 const enemy={name:"玻璃獸"};assert.equal(canStartEncounter(s,enemy,{actionKind:"SOCIAL",action:"向居民問好",roll:{success:true}}),false);assert.equal(canStartEncounter(s,enemy,{actionKind:"RISKY",action:"強行闖入巢穴",roll:{success:true}}),true)
});

test("level rewards become player-selected talents that affect checks",()=>{
 const s=game();ensureTalents(s);grantTalentPoint(s);const result=learnTalent(s,"TAL-TRAVEL");assert.equal(result.ok,true);assert.equal(talentActionModifier(s,"TRAVEL"),1);assert.equal(s.player.talentPoints,0)
});

test("15-hour worlds use a playable horizon and ENDGAME stays closed in early timeline",()=>{
 const pacing=createTimelinePacing(15);assert.ok(pacing.horizonDays>=7&&pacing.horizonDays<=12);
 const s=game();s.world.timelinePacing=pacing;s.world.timeline=[{id:"TL-1",status:"SCHEDULED",earliestDay:2,latestDay:pacing.horizonDays,triggerDay:pacing.horizonDays,baseTriggerDay:pacing.horizonDays,impactOffsetDays:0,intensityModifier:0,pressure:5}];s.world.state.day=1;assert.equal(endgameWindowOpen(s),false);s.world.state.day=pacing.phases.late.fromDay;assert.equal(endgameWindowOpen(s),true)
});


test("timeline pacing phases and authored slots stay inside the world horizon even for short campaigns",()=>{
 for(const hours of [2,3,5,15,100]){
  const pacing=createTimelinePacing(hours),slots=timelineAuthoringSlots(pacing);
  assert.ok(pacing.phases.early.fromDay>=2&&pacing.phases.early.toDay<=pacing.horizonDays);
  assert.ok(pacing.phases.middle.fromDay>=2&&pacing.phases.middle.toDay<=pacing.horizonDays);
  assert.ok(pacing.phases.late.fromDay>=2&&pacing.phases.late.toDay<=pacing.horizonDays);
  assert.equal(slots.length,pacing.majorEventCount);
  for(let i=0;i<slots.length;i++){assert.ok(slots[i].earliestDay>=2);assert.ok(slots[i].latestDay<=pacing.horizonDays);assert.ok(slots[i].latestDay>=slots[i].earliestDay);if(i)assert.ok(slots[i].earliestDay>=slots[i-1].earliestDay)}
  const authored=slots.map((_,i)=>({title:"事件 "+(i+1),category:"WORLD_EVENT",directorTruth:"這是只有導演層知道的完整事件因果。",observableEffect:"玩家能從世界變化直接觀察到事件影響。",pressure:5}));
  const report=validateWorldTimeline(bindTimelineAuthoringSlots(authored,pacing),pacing);assert.equal(report.valid,true,report.errors.join(","))
 }
});
