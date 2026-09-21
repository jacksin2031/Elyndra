import test from "node:test";
import assert from "node:assert/strict";
import {newGame} from "../src/world-engine.js";
import {addInventoryItem,presentItemToNpc} from "../src/item-engine.js";
import {ensureItemHeritage,advanceItemKnowledge,itemStorySnapshot,ITEM_KNOWLEDGE_STAGES} from "../src/item-heritage.js";
import {npcItemRecognition,recordNpcItemTestimony} from "../src/item-recognition.js";
import {registerDocument,readDocument,canReadDocument,documentSignificance} from "../src/document-engine.js";
import {createFutureSkeleton} from "../src/future-engine.js";
import {ensureHistoryFutureLinks} from "../src/history-future.js";
import {ensureCausalWorldCore,registerCanonizedWorld} from "../src/causal-world-core.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:4,playHours:12,prompt:"物品與文獻測試"};
function world(){
 const s=newGame(seed);
 s.world.history=[{id:"HIST-LEGION",order:1,era:"舊王紀",title:"銀旗軍團最後一戰",category:"WAR",summary:"銀旗軍團在北門覆滅。",causes:["圍城"],legacies:["軍徽散落"],regions:["北境"],factions:["銀旗軍團"],discoverKeywords:["銀旗軍徽","軍需簿"],canonical:true,mutable:false}];
 createFutureSkeleton(s,{id:"FUT-SIEGE",title:"北門再圍城",pressure:20,historicalLinks:["HIST-LEGION"],impactScope:"REGIONAL",playerCanPrevent:true,playerCanMitigate:true,playerCanRedirect:true,playerCanAccelerate:true});
 ensureHistoryFutureLinks(s);registerCanonizedWorld(s);ensureCausalWorldCore(s);
 s.world.registry.locations=[{id:"LOC-GATE",name:"北門",region:"北境",known:true,worldState:{safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]}}];
 s.player.location="北門";s.world.state.location="北門";
 return s
}

test("world creation keeps Item Heritage skeletal and linked instead of generating inventory catalogues",()=>{
 const s=world(),h=ensureItemHeritage(s);
 assert.equal(h.version,1);assert.equal(s.inventory.length,0);
 assert.ok(h.seeds.some(x=>x.historyRefs.includes("HIST-LEGION")));
 assert.ok(h.seeds.some(x=>x.futureRefs.includes("FUT-SIEGE")));
 assert.ok(h.seeds.every(x=>["UNMATERIALIZED","RESERVED","MATERIALIZED"].includes(x.status)))
});

test("important item knowledge advances progressively without one-shot full identification",()=>{
 const s=world(),item=addInventoryItem(s,{name:"缺口舊短刀",category:"ARTIFACT",identified:false,description:"刀身有磨損與陌生刻印。",heritage:{provenance:{culture:"北境軍伍",era:"舊王紀",craftTradition:"銀旗軍用鍛法",historyRefs:["HIST-LEGION"],futureRefs:["FUT-SIEGE"],trueOrigin:"銀旗軍團最後一戰的傳令兵佩刀",fullSignificance:"刀柄內藏的軍路標記可用來重建舊補給線。"}}});
 assert.equal(itemStorySnapshot(s,item.id).knowledgeStage,"UNKNOWN");
 assert.equal(advanceItemKnowledge(s,item.id,{method:"OBSERVE"}).stage,"OBSERVED");
 item.identified=true;assert.equal(advanceItemKnowledge(s,item.id,{method:"IDENTIFY_TYPE"}).stage,"TYPE_IDENTIFIED");
 assert.equal(advanceItemKnowledge(s,item.id,{method:"CRAFT_EXAM"}).stage,"ORIGIN_SUSPECTED");
 const view=itemStorySnapshot(s,item.id);assert.equal(view.suspectedOrigin.era,"舊王紀");assert.equal("directorProvenance" in view,false);
 assert.deepEqual(ITEM_KNOWLEDGE_STAGES,["UNKNOWN","OBSERVED","TYPE_IDENTIFIED","ORIGIN_SUSPECTED","HISTORY_IDENTIFIED","TRUE_PROVENANCE_KNOWN","FULL_SIGNIFICANCE_KNOWN"])
});

test("verified History evidence unlocks provenance but player snapshot hides unreached significance",()=>{
 const s=world(),item=addInventoryItem(s,{name:"銀旗舊刀",category:"ARTIFACT",identified:true,heritage:{provenance:{era:"舊王紀",historyRefs:["HIST-LEGION"],futureRefs:["FUT-SIEGE"],trueOrigin:"最後一名傳令兵所有",fullSignificance:"能定位舊軍道"}}});
 s.knowledge.push({id:"K-H",title:"軍團戰史",text:"你已用實物與檔案確認銀旗軍團最後一戰。",status:"VERIFIED",beliefState:"VERIFIED",evidenceType:"ARTIFACT",historyId:"HIST-LEGION",claimKey:"hist-legion",sourceIndependence:1,score:3});
 advanceItemKnowledge(s,item.id,{method:"RESEARCH",evidenceRef:"K-H"});
 const view=itemStorySnapshot(s,item.id);assert.ok(["HISTORY_IDENTIFIED","TRUE_PROVENANCE_KNOWN"].includes(view.knowledgeStage));
 if(view.knowledgeStage!=="FULL_SIGNIFICANCE_KNOWN")assert.equal(view.fullSignificance,undefined)
});

test("NPC item recognition derives scope from occupation history faction and personal links",()=>{
 const s=world(),item=addInventoryItem(s,{name:"銀旗軍刀",category:"ARTIFACT",identified:true,heritage:{provenance:{culture:"北境",era:"舊王紀",originalFactionId:"FAC-SILVER",historyRefs:["HIST-LEGION"],personalLinks:["NPC-VET"],trueOrigin:"軍團軍刀"}}});
 const smith={id:"NPC-SMITH",name:"鐵匠",role:"鐵匠",known:true,encountered:true,locationId:"LOC-GATE",historyRefs:[],knowledgeScope:[],memories:[],trust:0};
 const veteran={id:"NPC-VET",name:"老兵",role:"銀旗老兵",known:true,encountered:true,locationId:"LOC-GATE",factionId:"FAC-SILVER",historyRefs:["HIST-LEGION"],knowledgeScope:[],memories:[],trust:0};
 s.world.registry.npcs=[smith,veteran];
 const a=npcItemRecognition(s,item,smith),b=npcItemRecognition(s,item,veteran);
 assert.equal(a.level,"TYPE");assert.equal(a.mayMisidentify,true);
 assert.equal(b.level,"PROVENANCE");assert.equal(b.confidence,"HIGH");assert.equal(b.mayWithhold,true);
 const testimony=recordNpcItemTestimony(s,item.id,veteran.id,{text:"我認得這把刀，但不會把所有事都告訴你。",withheld:true});
 assert.equal(testimony.ok,true);assert.equal(testimony.canonChanged,false);
 assert.ok(s.knowledge.some(x=>x.id===testimony.testimonyId&&x.evidenceType==="TESTIMONY"&&x.status!=="VERIFIED"))
});

test("showing an item to an NPC records bounded recognition and testimony without Canon mutation",()=>{
 const s=world(),item=addInventoryItem(s,{name:"軍團徽章",category:"ARTIFACT",identified:true,heritage:{provenance:{historyRefs:["HIST-LEGION"],originalFactionId:"FAC-SILVER"}}});
 s.world.registry.npcs=[{id:"NPC-SCHOLAR",name:"戰史學者",role:"軍事史學者",known:true,encountered:true,locationId:"LOC-GATE",historyRefs:["HIST-LEGION"],knowledgeScope:[],memories:[],trust:0}];
 const before=s.world.canon.facts.length,result=presentItemToNpc(s,item.id,"NPC-SCHOLAR",{give:false});
 assert.equal(result.ok,true);assert.equal(result.special,true);assert.ok(result.testimonyId);assert.equal(s.world.canon.facts.length,before);
 assert.ok(s.events.some(x=>x.type==="ITEM_SHOWN"&&x.recognition?.level==="HISTORY"))
});

test("documents are evidence containers: readable text can corroborate but does not become Canon truth",()=>{
 const s=world(),history=s.world.history[0],clue=history.clues[0];
 const doc=registerDocument(s,{title:"北門軍需簿",author:"軍需官",era:"舊王紀",culture:"北境",language:"COMMON",reliability:"PRIMARY_SOURCE",bias:"軍方官方記錄",historyRefs:["HIST-LEGION"],clueRefs:[clue.id],claims:[{text:"銀旗軍團最後一戰前補給線曾中斷。",claimKey:"silver-supply",historyId:"HIST-LEGION",clueId:clue.id}]});
 const result=readDocument(s,doc.id);assert.equal(result.ok,true);
 const evidence=s.knowledge.find(x=>result.evidenceRefs.includes(x.id));assert.equal(evidence.evidenceType,"DOCUMENT");assert.equal(evidence.status,"UNCONFIRMED");
 assert.equal(s.world.history[0].clues[0].status,"DISCOVERED");
 assert.equal(documentSignificance(s,doc.id).significant,false)
});

test("documents can disagree and remain disputed evidence instead of overwriting History",()=>{
 const s=world(),before=s.world.history[0].summary;
 const a=registerDocument(s,{title:"王國正史",language:"COMMON",claims:[{text:"軍團因敵軍正面突破而敗。",claimKey:"fall-cause",historyId:"HIST-LEGION"}]});
 const b=registerDocument(s,{title:"逃兵手記",language:"COMMON",bias:"私人辯解",claims:[{text:"軍團因補給被自己人切斷而敗。",claimKey:"fall-cause",historyId:"HIST-LEGION",disputes:true}]});
 readDocument(s,a.id);readDocument(s,b.id);
 assert.equal(s.world.history[0].summary,before);
 assert.ok(s.knowledge.filter(x=>x.claimKey==="fall-cause").some(x=>x.beliefState==="DISPUTED"))
});

test("language ability gates reading independently from historical significance",()=>{
 const s=world(),doc=registerDocument(s,{title:"古語石板",language:"OLD_NORTH",claims:[{text:"古塔是舊軍路的一部分。",historyId:"HIST-LEGION"}]});
 assert.equal(canReadDocument(s,doc.id).ok,false);assert.equal(readDocument(s,doc.id).reason,"LANGUAGE_UNKNOWN");
 s.player.languages=["OLD_NORTH"];assert.equal(canReadDocument(s,doc.id).ok,true);
 assert.equal(readDocument(s,doc.id).ok,true)
});
