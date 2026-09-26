import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {hasSimplifiedChineseLeak,simplifiedChineseLeak} from "../src/traditional-chinese-guard.js";
import {playerVisibleAutotestSnapshot,buildAutotestReport} from "../src/ai-autotest.js";
import {helperSnapshot} from "../src/helper-context.js";

function visibilityState(){
 return {world:{id:"W",name:"隱藏世界",state:{day:1,clock:{hour:8,minute:0,totalMinutes:0}},registry:{locations:[{id:"L1",name:"起點",known:true}],npcs:[{id:"N1",name:"咯噠三號",known:true,encountered:true,nameKnown:false,alive:true,locationId:"L1",role:"守衛"}],factions:[],sideQuests:[]},canon:{facts:[]}},player:{name:"Tester",worldNameKnown:false,calendarKnown:false,location:"起點",hp:10,maxHp:10,status:"ACTIVE",level:1,wallet:{},survival:{satiety:100,fatigue:0,conditions:[]}},quests:{main:{title:"",stage:0,status:"ACTIVE",objectives:[]}},inventory:[],knowledge:[],events:[],suggestions:[],suggestionIntents:[]}
}

test("v0.57.25 rejects artifact-proven Simplified Chinese in generated world values",async()=>{
 assert.equal(hasSimplifiedChineseLeak("铁雾"),true);assert.equal(hasSimplifiedChineseLeak("铆钉镇北岸货运吊桥下的废弃维修舱"),true);
 assert.equal(hasSimplifiedChineseLeak("鐵霧"),false);assert.equal(hasSimplifiedChineseLeak("鉚釘鎮北岸貨運吊橋下的廢棄維修艙"),false);assert.equal(hasSimplifiedChineseLeak("皇后"),false);
 assert.equal(simplifiedChineseLeak({name:"铁雾"}).character,"铁");
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");assert.match(client,/WORLD_TRADITIONAL_CHINESE_CONTRACT/);assert.match(client,/NON_TRADITIONAL_CHINESE/)
});

test("v0.57.25 AutoTest and helper snapshots never expose an unrevealed canonical NPC name",()=>{
 const s=visibilityState();assert.equal(playerVisibleAutotestSnapshot(s).knownNpcs[0].name,"眼前的陌生人");assert.equal(helperSnapshot(s).knowledge.nearbyNpcs[0].name,"眼前的陌生人");
 s.events.push({type:"NPC_NAME_REVEALED",npcId:"N1"});assert.equal(playerVisibleAutotestSnapshot(s).knownNpcs[0].name,"咯噠三號");assert.equal(helperSnapshot(s).knowledge.nearbyNpcs[0].name,"咯噠三號")
});

test("v0.57.25 report counts all 120 turn errors even when only 50 details are retained",()=>{
 const difficulties=["easy","normal","hard","realistic"],worlds=difficulties.map((difficulty,i)=>({index:i+1,difficulty,status:"COMPLETED",phase:"PLAY",turns:30,stopReason:"TURN_LIMIT",actions:Array.from({length:30},(_,j)=>({worldIndex:i+1,turn:j+1,error:"firstButtonExpansionReason is not defined",beforeFingerprint:`${i}-${j}-a`,afterFingerprint:`${i}-${j}-b`,decision:{action:`a-${j}`}})),generation:{diagnostics:{quality:"HEALTHY",stages:{}}},summary:{coherence:{status:"PASS",issues:[],quality:{pending:false,unavailable:false}}}}));
 const report=buildAutotestReport({config:{totalWorldCount:4,worldsPerDifficulty:1,maxTurns:30},worlds,telemetry:[],startedAt:1,endedAt:2});
 assert.equal(report.summary.worldsExecuted,4);assert.equal(report.summary.worldsCompleted,0);assert.equal(report.summary.worldsFailed,4);assert.equal(report.summary.totalTurns,120);assert.equal(report.summary.turnActionErrors,120);assert.equal(report.summary.turnFailureDetailCount,50);assert.equal(report.summary.issueDetailCount,50);assert.equal(report.summary.issueDetailsTruncated,true);assert.equal(report.summary.issues,120);assert.equal(report.issues.filter(x=>x.type==="TURN_FAILED").length,50);
 for(const difficulty of difficulties){assert.equal(report.summary.byDifficulty[difficulty].worldsFailed,1);assert.equal(report.summary.byDifficulty[difficulty].turnActionErrors,30);assert.equal(report.summary.byDifficulty[difficulty].issues,30)}
});
