import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {turnDirectorMode} from "../src/turn-outcome.js";
import {fastTurnStateSnapshot} from "../src/turn-compiler.js";
import {validateDeferredTurnEffects} from "../src/adventure-engine.js";

test("ordinary exploration and conversation use Fast Turn State",()=>{
 assert.equal(turnDirectorMode("仔細觀察門上的痕跡",{profile:{kind:"OBSERVE"}},{}),"FAST");
 assert.equal(turnDirectorMode("走到走廊盡頭",{profile:{kind:"TRAVEL"}},{}),"FAST");
 assert.equal(turnDirectorMode("問守衛現在是甚麼地方",{profile:{kind:"SOCIAL"}},{}),"FAST")
});

test("persistent consequences defer while major world mutations stay deep",()=>{
 assert.equal(turnDirectorMode("說服守衛放我們通過",{profile:{kind:"SOCIAL"}},{}),"DEFERRED");
 assert.equal(turnDirectorMode("學習石碑上的魔法",{profile:{kind:"GENERAL"}},{}),"DEFERRED");
 assert.equal(turnDirectorMode("摧毀整座城的核心並推翻王國",{profile:{kind:"RISKY"}},{}),"DEEP")
});

test("Fast Turn State snapshot excludes heavy director context",()=>{
 const src={world:{location:"A"},player:{hp:10},knownFacts:["x"],knowledge:{facts:[]},inventory:[],quest:null,recentEvents:[],runtimeSummary:"",factions:[],registry:{npcs:[]},companions:[],priorSuggestions:[],directorCanon:[{id:"F1"}],directorTimeline:[{id:"T1"}],directorHistory:[{id:"H1"}],directorRegistry:{locations:[{id:"L1"}]},culture:{heavy:true},market:{heavy:true},dungeon:{heavy:true},worldImpact:{capability:{maxScope:"LOCAL"}},travel:{},survival:{},magic:{}};
 const out=fastTurnStateSnapshot(src);
 assert.deepEqual(out.directorCanon,[{id:"F1"}]);
 assert.equal("directorTimeline" in out,false);
 assert.equal("directorHistory" in out,false);
 assert.equal("directorRegistry" in out,false);
 assert.equal("culture" in out,false);
 assert.equal("market" in out,false);
 assert.equal("dungeon" in out,false)
});

test("Deferred Director accepts only narrow persistent-effect shape",()=>{
 assert.equal(validateDeferredTurnEffects({recipes:[],magicLearning:[],companionChanges:[],factionChanges:[],generation:{locations:[],npcs:[],factions:[],sideQuests:[]},worldImpacts:[]}).valid,true);
 assert.equal(validateDeferredTurnEffects({factionChanges:"bad"}).valid,false)
});

test("app preserves Action Intent when scheduling Deferred Director",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/candidate\.directorMode==="DEFERRED"/);
 assert.match(app,/scheduleDeferredDirector\(\{action:label,roll,intent:assessment\?\.actionIntent,queuedAt:Date\.now\(\)\},3500\)/);
 assert.match(app,/generateDeferredTurnEffects\(task\.action,task\.roll,buildSnapshot\(gameState\),\{signal:ctrl\.signal,intent:task\.intent\}\)/);
 assert.match(app,/type:"TURN_DIRECTOR_MODE"/);
 assert.match(app,/type:"DEFERRED_TURN_STARTED"/);
 assert.match(app,/type:"DEFERRED_TURN_FAILED"/);
 assert.match(app,/applyDeferredTurnEffects\(gameState,effects/);
 assert.match(app,/world\.deferredTurns/);
 assert.match(app,/resumeDeferredDirectorQueue\(\)/)
});

test("committed turns expose director mode for latency diagnostics",async()=>{
 const adventure=await readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8");
 assert.match(adventure,/type:"AI_TURN_APPLIED".*directorMode:c\.directorMode\|\|"DEEP"/s)
});
