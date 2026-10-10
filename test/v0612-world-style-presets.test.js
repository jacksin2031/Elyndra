import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {WORLD_STYLE_NAMES,getWorldStylePreset,getWorldStyleBlueprint} from "../src/world-style-presets.js";
import {createWorldCreationDraft,resolveWorldBlueprint,worldContractHtml} from "../src/world-creation.js";
import {randomAutotestWorldRaw} from "../src/ai-autotest.js";

const NEW_STYLES=Object.freeze(["低魔政治奇幻","神話洪荒","浮空群島","魔導都市","巨獸共生","永夜寒境"]);
const EXPECTED=Object.freeze({
 "低魔政治奇幻":{civilization:7,technology:4,magic:2,danger:6,survival:5,unknownRatio:45},
 "神話洪荒":{civilization:3,technology:2,magic:10,danger:9,survival:8,unknownRatio:85},
 "浮空群島":{civilization:6,technology:6,magic:7,danger:7,survival:6,unknownRatio:75},
 "魔導都市":{civilization:9,technology:8,magic:7,danger:5,survival:3,unknownRatio:35},
 "巨獸共生":{civilization:5,technology:5,magic:6,danger:8,survival:7,unknownRatio:70},
 "永夜寒境":{civilization:4,technology:5,magic:4,danger:9,survival:10,unknownRatio:70}
});

test("v0.61.2 core registry owns all six recovered gallery styles and their Blueprint defaults",()=>{
 for(const name of NEW_STYLES){
  assert.ok(WORLD_STYLE_NAMES.includes(name),name);
  const preset=getWorldStylePreset(name),blueprint=getWorldStyleBlueprint(name);
  assert.ok(preset.foundation.length>20,name);
  assert.deepEqual(Object.fromEntries(Object.keys(EXPECTED[name]).map(key=>[key,blueprint[key]])),EXPECTED[name]);
  assert.ok(Array.isArray(preset.narrativeRules)&&preset.narrativeRules.length>=3,name)
 }
});

test("v0.61.2 World Creation resolves new styles through the registry instead of duplicated defaults",()=>{
 for(const name of NEW_STYLES){
  const b=resolveWorldBlueprint(createWorldCreationDraft({masterSeed:"v0612-"+name,worldStyle:name,worldStyleMode:"fixed",worldScale:"中型",worldScaleMode:"style",civilizationLevelMode:"style",technologyLevelMode:"style",magicLevelMode:"style",politicalUnityMode:"style",religionInfluenceMode:"style",resourceAbundanceMode:"style",worldDangerMode:"style",unknownRatioMode:"style",survivalIntensityMode:"style"}));
  assert.equal(b.style.value,name);
  assert.equal(b.advanced.magicLevel.value,EXPECTED[name].magic,name);
  assert.equal(b.advanced.worldDanger.value,EXPECTED[name].danger,name);
  assert.equal(b.advanced.unknownRatio.value,EXPECTED[name].unknownRatio,name)
 }
});

test("v0.61.2 creator, translations, contract and importmap expose every new world style",async()=>{
 const [html,translations]=await Promise.all([readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../src/ui-translations-extra.js",import.meta.url),"utf8")]);
 const genre=html.match(/<select id="genre">([\s\S]*?)<\/select>/)?.[1]||"";
 const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1]||"{}").imports;
 for(const name of NEW_STYLES){assert.ok(genre.includes(`<option value="${name}">${name}</option>`),`${name} keeps its explicit canonical value and visible label`);assert.ok(translations.includes(`"${name}":r(`),name)}
 assert.equal(imports["./src/world-style-presets.js?v=57025"],"./src/world-style-presets.js?v=61008");
 assert.equal(imports["./src/world-style-presets.js?v=60032"],"./src/world-style-presets.js?v=61008");
 assert.equal(imports["./src/world-creation.js?v=60010&base=1"],"./src/world-creation.js?v=61008&base=1");
 globalThis.ELYNDRA_LOCALE="en";const en=worldContractHtml({worldStyle:"魔導都市",worldScale:"中型",difficulty:"普通",origin:"穿越",role:"普通人",metrics:null,structure:[],difficultyRules:[],storyPreferences:[],required:[],allowed:[],forbidden:[],unknown:[]});assert.match(en,/Magitech Metropolis/);
 globalThis.ELYNDRA_LOCALE="ja";const ja=worldContractHtml({worldStyle:"神話洪荒",worldScale:"大型",difficulty:"普通",origin:"穿越",role:"普通人",metrics:null,structure:[],difficultyRules:[],storyPreferences:[],required:[],allowed:[],forbidden:[],unknown:[]});assert.match(ja,/神話的原初世界/)
});

test("v0.61.2 autotest random style pool is sourced from the registry",()=>{
 const allowed=WORLD_STYLE_NAMES.filter(name=>name!=="自訂世界");
 for(let i=0;i<allowed.length;i++){
  const random=()=>Math.min(.999999,(i+.1)/allowed.length),raw=randomAutotestWorldRaw(random,i+1);
  assert.ok(allowed.includes(raw.worldStyle),raw.worldStyle)
 }
});
