import test from "node:test";
import assert from "node:assert/strict";
import {groundStatePatch,groundedPickupItemFromAction,statePatchToCandidate} from "../src/state-sync.js";
import {npcInteractionMode} from "../src/world-registry.js";
import {applyNpcConversationTurn} from "../src/npc-conversation.js";
import {reconcileWorldEconomy} from "../src/world-locality.js";
import {fallbackWorldEvaluation} from "../src/world-quality.js";
import {deriveAcquisitionNotifications} from "../src/acquisition-notifier.js";
import {WORLD_CONSTITUTION} from "../src/world-engine.js";

// Final regression contract for runtime evidence grounding, acquisition feedback, and world consistency.
const baseState=()=>({player:{location:"中央祭壇",knowledgeScore:0,wallet:{}},world:{state:{day:1,region:"核心區",location:"中央祭壇",clock:{day:1,hour:8,minute:0,totalMinutes:480}},registry:{locations:[{id:"L1",name:"中央祭壇",region:"核心區",known:true,trade:{mode:"barter",currencies:[],questReward:0,combatReward:0}}],npcs:[],factions:[],sideQuests:[]},canon:{facts:[{id:"F1",visibility:"public",text:"外環入口受高壓閥控制"}]},documents:{documents:[]}},events:[],inventory:[],knowledge:[],suggestions:[]});

test("item acquisition requires the item name in observable scene evidence",()=>{const s=baseState(),patch={baseRevision:0,operations:[{op:"ACQUIRE_ITEM",item:{name:"藍光碎屑",category:"MATERIAL",quantity:1}}]};let r=groundStatePatch(s,patch,{action:"撿起藍光碎屑",roll:{success:true}});assert.equal(r.patch.operations.length,0);assert.equal(r.rejected[0].reason,"ITEM_NAME_NOT_OBSERVED");assert.equal(r.deferredEvidence.length,1);r=groundStatePatch(s,patch,{action:"撿起藍光碎屑",roll:{success:true},observableText:"你從裂縫旁撿起一枚藍光碎屑，冰冷表面沾著灰。"});assert.equal(r.patch.operations.length,1);assert.equal(groundedPickupItemFromAction("撿起藍光碎屑",{success:true},"眼前只有灰塵"),null);assert.equal(groundedPickupItemFromAction("撿起藍光碎屑",{success:true},"你看見藍光碎屑落在手中")?.name,"藍光碎屑")});

test("knowledge title must be spoken/read/narrated before DISCOVER_FACT commits",()=>{const s=baseState(),patch={baseRevision:0,operations:[{op:"DISCOVER_FACT",title:"高壓氣閥",text:"外環入口由高壓氣閥控制",factId:"F1",evidenceType:"OBSERVED",sourceKind:"LOCATION",sourceId:"L1"}]};let r=groundStatePatch(s,patch,{action:"觀察四周"});assert.equal(r.patch.operations.length,0);assert.equal(r.rejected[0].reason,"KNOWLEDGE_NAME_NOT_OBSERVED");r=groundStatePatch(s,patch,{action:"觀察四周",observableText:"旁白：牆後傳來高壓氣閥的規律洩壓聲。"});assert.equal(r.patch.operations.length,1)});

test("read documents can ground named knowledge",()=>{const s=baseState();s.world.documents.documents.push({id:"D1",title:"閥室維修錄",read:true,claims:[{text:"高壓氣閥每天第三輪需要洩壓"}]});const r=groundStatePatch(s,{baseRevision:0,operations:[{op:"DISCOVER_FACT",title:"高壓氣閥",text:"每天第三輪需要洩壓",factId:"",evidenceType:"READ",sourceKind:"DOCUMENT",sourceId:"D1"}]},{action:"閱讀維修錄"});assert.equal(r.patch.operations.length,1)});

test("scene-confirmed unknown travel target becomes a canonical materialization candidate",()=>{const s=baseState(),patch={baseRevision:0,operations:[{op:"MOVE_PLAYER",location:"祭壇外環入口"}]};let r=groundStatePatch(s,patch,{action:"前往祭壇外環入口",roll:{success:true,profile:{kind:"TRAVEL"}}});assert.equal(r.patch.operations.length,0);assert.equal(r.deferredEvidence.length,1);r=groundStatePatch(s,patch,{action:"前往祭壇外環入口",roll:{success:true,profile:{kind:"TRAVEL"}},observableText:"你沿著閥聲找到祭壇外環入口，門後有可通行的石階。"});assert.equal(r.patch.operations.length,1);assert.equal(r.patch.operations[0].materializeLocation.name,"祭壇外環入口");const c=statePatchToCandidate(r.patch,s);assert.equal(c.generation.locations[0].name,"祭壇外環入口");assert.equal(c.location,"祭壇外環入口")});

test("known local NPC can be contacted for the first time and becomes encountered",()=>{const s=baseState();const npc={id:"N1",name:"雙轉零九",role:"工程師",known:true,encountered:false,alive:true,locationId:"L1",memories:[],trust:0};s.world.registry.npcs.push(npc);assert.equal(npcInteractionMode(s,npc),"LOCAL");const r=applyNpcConversationTurn(s,npc,"你好","高壓氣閥在外環。 ");assert.equal(r.mode,"LOCAL");assert.equal(npc.encountered,true);assert.equal(npc.memories.length,1);assert.equal(r.event.firstEncounter,true)});

test("global economy reconciles actual regional currencies",()=>{const s=baseState();s.world.economy={currencyExists:false,questReward:0,combatReward:0};s.world.registry.locations[0].trade={mode:"token",currencies:[{id:"CUR-V",name:"標準振動幣",symbol:"v",issuer:"祭壇神職"}],questReward:20,combatReward:20};const e=reconcileWorldEconomy(s);assert.equal(e.currencyExists,true);assert.equal(e.currencyModel,"REGIONAL_CURRENCY");assert.equal(e.questReward,20);assert.equal(e.combatReward,20);assert.equal(e.currencies[0].name,"標準振動幣")});

test("pending background critic never masquerades as an official numeric score",()=>{const q=fallbackWorldEvaluation({worldName:"渦輪廢土",worldTheme:"殘魂蒸汽",openingHook:"冷凝水滴落。",worldBible:{startingLocation:"祭壇",magicCost:"每次抽取殘魂都會永久磨損共鳴器。"},worldTimeline:[],generation:{locations:[],npcs:[],factions:[]}}, {stages:{}}, "BACKGROUND_AI_CRITIC_PENDING");assert.equal(q.status,"PENDING");assert.equal(q.overall,null);assert.equal(q.official,false);assert.equal(q.pending,true);assert.ok(Number.isFinite(q.provisionalOverall))});

test("committed state diffs produce compact acquisition notifications",()=>{const prev={inventory:{},knowledge:{},locations:{L1:{known:true,name:"中央祭壇"}},npcs:{N1:{encountered:false,name:"工程師"}},mainQuest:{stage:1,status:"ACTIVE",objective:"觀察"}},next={inventory:{I1:{quantity:1,name:"藍光碎屑"}},knowledge:{K1:{title:"高壓氣閥",status:"UNCONFIRMED"}},locations:{L1:{known:true,name:"中央祭壇"},L2:{known:true,name:"外環"}},npcs:{N1:{encountered:true,name:"工程師",role:"技師"}},mainQuest:{stage:2,status:"ACTIVE",title:"找出路",objective:"前往外環"}};const rows=deriveAcquisitionNotifications(prev,next);assert.ok(rows.some(x=>x.type==="ITEM"&&x.name==="藍光碎屑"));assert.ok(rows.some(x=>x.type==="KNOWLEDGE"&&x.name==="高壓氣閥"));assert.ok(rows.some(x=>x.type==="LOCATION"));assert.ok(rows.some(x=>x.type==="NPC"));assert.ok(rows.some(x=>x.type==="QUEST"))});

test("world constitution requires chronology and lifespan consistency",()=>{const rule=WORLD_CONSTITUTION.find(x=>x.id==="C-012");assert.ok(rule);assert.match(rule.text,/年齡|世代/);assert.match(rule.text,/長壽|延命/);assert.match(rule.text,/後代|傳承者/)});

test("item name evidence can come from prior visible NPC dialogue or a read document",()=>{
 const npc=baseState();npc.events.push({id:"E1",type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",npcId:"N1",summary:"工程師：你要找的是藍光碎屑。"});
 let r=groundStatePatch(npc,{baseRevision:0,operations:[{op:"ACQUIRE_ITEM",item:{name:"藍光碎屑",category:"MATERIAL",quantity:1}}]},{action:"撿起藍光碎屑",roll:{success:true}});assert.equal(r.patch.operations.length,1);
 const doc=baseState();doc.world.documents.documents.push({id:"D2",title:"倉庫清單",read:true,claims:[{text:"紅銅鑰匙存放於北側架。"}]});
 r=groundStatePatch(doc,{baseRevision:0,operations:[{op:"ACQUIRE_ITEM",item:{name:"紅銅鑰匙",category:"KEY",quantity:1}}]},{action:"拿起紅銅鑰匙",roll:{success:true}});assert.equal(r.patch.operations.length,1)
});

test("acquisition toast renders generated labels through textContent instead of innerHTML",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../src/acquisition-notifier.js",import.meta.url),"utf8"));assert.doesNotMatch(source,/\.innerHTML\s*=/);assert.match(source,/textContent=/)});

test("hardened acquisition runtime modules use fresh browser cache identities",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../app.js",import.meta.url),"utf8"));assert.match(source,/acquisition-notifier\.js\?v=54018g2/);assert.match(source,/state-sync\.js\?v=54017g2/)});
