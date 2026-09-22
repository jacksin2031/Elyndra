import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {createWorldCreationDraft,compileWorldCreation,applyWorldCreationState} from "../src/world-creation.js";
import {syncGenerationClaimsFromConstitution,reconcileGenerationClaims,generationClaimsSnapshot,constitutionForbidTerms} from "../src/generation-claims.js";
import {ensureWorldCatalog,canonizeWorldDefinitions,worldCatalogSnapshot} from "../src/world-catalog.js";
import {planLazyGeneration,validateLazyGenerationCandidate,commitLazyGeneration} from "../src/lazy-generation.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {causalWorldCoreSnapshot} from "../src/causal-world-core.js";
import {worldEvolutionNeed} from "../src/world-quality.js";

function compiled({civilizations=2,species=1,languages=2,required=[],forbidden=[]}={}){
 const draft=createWorldCreationDraft({
  worldStyle:"王道奇幻",worldScale:"中型",targetPlayHours:12,difficulty:"normal",originType:"crossing",playerRole:"ordinary",masterSeed:"v052-contract",
  civilizationCount:civilizations,civilizationCountMode:"fixed",
  speciesCount:species,speciesCountMode:"fixed",
  languageCount:languages,languageCountMode:"fixed",
  requiredElements:required,forbiddenElements:forbidden
 });
 return compileWorldCreation(draft)
}
function world(opts={}){
 const seed=compiled(opts),s=newGame(seed);applyWorldCreationState(s,seed);s.world.state.region="北境";return {s,seed}
}

test("World Constitution compiles Blueprint count requirements",()=>{
 const {seed}=world({civilizations:3,species:2,languages:4});
 const rules=seed.creationV2.constitution.hardRules.filter(x=>x.kind==="COUNT_REQUIREMENT");
 assert.deepEqual(rules.map(x=>[x.target,x.minimum]),[["CIVILIZATION",3],["SPECIES",2],["LANGUAGE",4]])
});

test("Generation Claims v3 expands Blueprint counts into independent obligations",()=>{
 const {s}=world({civilizations:2,species:1,languages:3});
 const claims=syncGenerationClaimsFromConstitution(s).filter(x=>x.type==="BLUEPRINT_DEFINITION");
 assert.equal(claims.length,6);
 assert.equal(claims.filter(x=>x.definitionKind==="CIVILIZATION").length,2);
 assert.equal(claims.filter(x=>x.definitionKind==="SPECIES").length,1);
 assert.equal(claims.filter(x=>x.definitionKind==="LANGUAGE").length,3);
 assert.ok(claims.every(x=>x.status==="UNMATERIALIZED"&&x.requiredBy==="BLUEPRINT"))
});

test("older Creation saves backfill Blueprint obligations from blueprintProfile",()=>{
 const s=newGame({worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:10,prompt:""});
 s.world.creation={blueprintProfile:{civilizationCount:{value:2},speciesCount:{value:2},languageCount:{value:1}},constitution:{hardRules:[]}};
 const claims=syncGenerationClaimsFromConstitution(s).filter(x=>x.type==="BLUEPRINT_DEFINITION");
 assert.equal(claims.length,5);assert.equal(claims.filter(x=>x.definitionKind==="CIVILIZATION").length,2)
});

test("World Catalog definitions reconcile one-to-one with count claims and remain Director-only",()=>{
 const {s}=world({civilizations:2,species:1,languages:2});syncGenerationClaimsFromConstitution(s);
 const defs=canonizeWorldDefinitions(s,[
  {kind:"CIVILIZATION",name:"霧原諸邦",description:"沿霧原形成的城邦文明"},
  {kind:"CIVILIZATION",name:"赤河部盟",description:"沿赤河遷徙的部落聯盟"},
  {kind:"SPECIES",name:"角民",description:"具有角冠的智慧種族"},
  {kind:"LANGUAGE",name:"霧原語",description:"霧原諸邦常用語"},
  {kind:"LANGUAGE",name:"赤河語",description:"赤河部盟的主要語言"}
 ]);
 assert.equal(defs.length,5);reconcileGenerationClaims(s);
 const claims=generationClaimsSnapshot(s).filter(x=>x.type==="BLUEPRINT_DEFINITION");
 assert.ok(claims.every(x=>x.status==="MATERIALIZED"));
 assert.equal(new Set(claims.flatMap(x=>x.entityRefs)).size,5);
 const publicView=worldCatalogSnapshot(s);assert.ok([...publicView.civilizations,...publicView.species,...publicView.languages].every(x=>x.name==="UNKNOWN"&&x.known===false));
 const director=worldCatalogSnapshot(s,{director:true});assert.equal(director.civilizations[0].name,"霧原諸邦")
});

test("Lazy Generation materializes Blueprint definition claims through definitions slots",()=>{
 const {s}=world({civilizations:2,species:1,languages:1});
 const plan=planLazyGeneration(s,{reason:"CLAIM_MATERIALIZATION"});
 assert.ok(plan.claims.length>0);assert.equal(plan.slots.definitions,plan.claims.filter(x=>x.type==="BLUEPRINT_DEFINITION").length);
 const definitions=plan.claims.map((claim,i)=>({kind:claim.definitionKind,name:claim.definitionKind+"-"+(i+1),description:"符合 Blueprint 的 "+claim.definitionKind+" 定義",traits:["canonical"],regions:["北境"],claimRefs:[claim.id]}));
 const generation={locations:[],npcs:[],factions:[],sideQuests:[],definitions};
 const check=validateLazyGenerationCandidate(s,generation,plan);assert.equal(check.valid,true,check.errors.join(","));
 const added=canonizeGeneration(s,generation),out=commitLazyGeneration(s,plan,generation,added,{sourceProvider:"test",sourceModel:"test-model"});
 assert.equal(out.ok,true);assert.equal(added.definitions.length,definitions.length);
 for(const id of plan.claimIds)assert.equal(s.world.generationClaims.claims.find(x=>x.id===id).status,"MATERIALIZED")
});

test("reserved claims must bind to content that actually satisfies their semantics",()=>{
 const s=newGame({worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:10,prompt:""});
 s.world.constitution.push({id:"REQ-ACADEMY",kind:"REQUIRE",term:"魔法學院"});
 const plan=planLazyGeneration(s,{reason:"CLAIM_MATERIALIZATION"}),claim=plan.claims.find(x=>x.type==="REQUIRED_ELEMENT");assert.ok(claim);
 const generation={locations:[{name:"普通倉庫",type:"建築",region:"中央",description:"只存放糧食的倉庫",claimRefs:[claim.id]}],npcs:[],factions:[],sideQuests:[],definitions:[]};
 const result=validateLazyGenerationCandidate(s,generation,plan);
 assert.equal(result.valid,false);assert.ok(result.errors.includes("LAZY_CLAIM_SEMANTIC_MISMATCH:"+claim.id))
});

test("Runtime FORBID rejects forbidden content before canonization and at canonization gate",()=>{
 const s=newGame({worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:3,politics:3,playHours:10,prompt:""});
 s.world.constitution.push({id:"FORBID-GUN",kind:"FORBID",term:"槍械"});
 const plan=planLazyGeneration(s,{reason:"BACKGROUND_GAMEPLAY"});assert.deepEqual(constitutionForbidTerms(s),["槍械"]);assert.deepEqual(plan.forbiddenTerms,["槍械"]);
 const generation={locations:[{name:"黑鐵工坊",type:"工坊",region:"中央",description:"秘密製造槍械的工坊"}],npcs:[],factions:[],sideQuests:[],definitions:[]};
 const result=validateLazyGenerationCandidate(s,generation,plan);assert.equal(result.valid,false);assert.ok(result.errors.includes("LAZY_FORBIDDEN_TERM:槍械"));
 assert.throws(()=>canonizeGeneration(s,generation),/WORLD_CONSTITUTION_FORBID:槍械/)
});

test("pending claims are paced into background materialization every 60 world minutes",()=>{
 const {s}=world({civilizations:2,species:1,languages:2});syncGenerationClaimsFromConstitution(s);s.world.evolution={lastMinute:0,lastVersion:s.world.version,count:0,lastReason:""};
 s.world.state.clock.totalMinutes=59;assert.equal(worldEvolutionNeed(s).reasons.includes("CLAIM_MATERIALIZATION"),false);
 s.world.state.clock.totalMinutes=60;assert.equal(worldEvolutionNeed(s).reasons.includes("CLAIM_MATERIALIZATION"),true)
});

test("Causal Core exposes Director World Catalog without promoting it to player Knowledge",()=>{
 const {s}=world({civilizations:1,species:1,languages:1});
 canonizeWorldDefinitions(s,[{kind:"LANGUAGE",name:"星砂語",description:"星砂谷使用的語言"}]);
 const before=structuredClone(s.knowledge),snap=causalWorldCoreSnapshot(s);
 assert.equal(snap.worldCatalog.languages[0].name,"星砂語");assert.deepEqual(s.knowledge,before)
});

test("Expansion AI receives definitions slots, semantic claim rules and FORBID contract",async()=>{
 const client=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");
 assert.match(client,/forbiddenTerms:plan\.forbiddenTerms\|\|\[\]/);
 assert.match(client,/existing:\{locations:[\s\S]*definitions:/);
 assert.match(client,/BLUEPRINT_DEFINITION/);assert.match(client,/generation\.definitions/);assert.match(client,/REQUIRED_ELEMENT/);
 assert.match(client,/forbiddenTerms/);assert.match(client,/"definitions":\[\{"kind":"CIVILIZATION\|SPECIES\|LANGUAGE"/)
});
