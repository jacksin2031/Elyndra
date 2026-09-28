import test from "node:test";
import assert from "node:assert/strict";
import {sceneTurnPreview} from "../src/v06028-turn-compiler-hotfix.js";
import {buildContextualActionSet} from "../src/contextual-actions.js";
import {sanitizeNarrativeText,sanitizePlayerText} from "../src/runtime-guard.js";

const withLocale=(locale,fn)=>{const previous=globalThis.ELYNDRA_LOCALE;globalThis.ELYNDRA_LOCALE=locale;try{return fn()}finally{globalThis.ELYNDRA_LOCALE=previous}};
const ai=(label,approach="STEADY",progression=false)=>({label,action:label,kind:"OBSERVE",risk:"LOW",approach,progression,requirementsSatisfied:true,causalBasis:"現在見えている足跡と壁面の変化を調べる",source:"AI"});
const state=()=>({world:{id:"w",state:{day:1},registry:{locations:[{id:"l",name:"霧の谷",known:true,description:"石壁と足跡が見える"}],npcs:[]}},player:{location:"霧の谷"},localization:{displayLocale:"ja"},quests:{main:{objectives:["足跡の先を探す"]}},events:[],inventory:[]});

test("Japanese Scene narration and three AI actions survive the entire display pipeline",()=>withLocale("ja",()=>{
 const narrative="霧の向こうで足跡が石壁の前まで続き、そこで途切れている。";
 const choices=[ai("石壁の手前で足跡の向きを調べる","STEADY",true),ai("足跡の途切れた場所を横から見直す","CREATIVE"),ai("壁の近くで新しい物音を確かめる","SOCIAL")];
 const preview=sceneTurnPreview({narrative,outcome:"SUCCESS",sceneTitle:"石壁の足跡",suggestions:choices},{success:true},{action:"様子を見る"});
 const displayed=buildContextualActionSet(state(),preview.suggestionIntents);
 assert.equal(preview.narrative,narrative);
 assert.equal(displayed.primary.length,3);
 assert.deepEqual(new Set(displayed.primary.map(row=>row.label)),new Set(choices.map(row=>row.label)));
 assert.ok(displayed.primary.every(row=>row.source==="AI"))
}));

test("player text guard uses the chosen language while keeping Traditional Chinese strict",()=>{withLocale("ja",()=>{
 assert.equal(sanitizeNarrativeText("霧の中で小さな足跡を見つけた。"),"霧の中で小さな足跡を見つけた。");
 assert.equal(sanitizePlayerText("石壁の痕跡を調べる"),"石壁の痕跡を調べる")
 });withLocale("en",()=>assert.equal(sanitizeNarrativeText("Footprints stop at the stone wall."),"Footprints stop at the stone wall."));withLocale("zh-Hant",()=>{
 assert.equal(sanitizeNarrativeText("霧の中で足跡を見つけた。",1200,""),"");
 assert.equal(sanitizePlayerText("这条线索还没有确认。",120,""),"")
 })});
