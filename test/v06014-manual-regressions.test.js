import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {locationAccessStatus} from "../src/travel-engine.js";
import {projectSuccessfulTravel,projectPermissionGrant} from "../src/v06014-turn-projection.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"小型",danger:2,magic:2,politics:2,playHours:8,prompt:"v0.60.14 regression"};
function travelWorld(){
 const state=newGame(seed),a={id:"LOC-LIGHTHOUSE",name:"北側灯台巡視路",region:"サルナ湾",type:"道路",description:"灯台沿いの巡視路",known:true,accessRequirements:[]},b={id:"LOC-HARBOR",name:"下港路",region:"サルナ湾",type:"道路",description:"港へ下る石段",known:true,accessRequirements:[]};
 state.world.registry.locations=[a,b];state.world.registry.npcs=[];state.player.location=a.name;state.world.state.location=a.name;state.world.state.region=a.region;state.world.travel={version:1,routes:[{id:"R1",fromId:a.id,toId:b.id,distanceKm:1,terrain:"ROAD",hazard:1,baseMinutes:20,open:true,canonical:true}]};return {state,a,b}
}

test("v0.60.14 successful Japanese TRAVEL with a canonical target projects location immediately",()=>{
 const {state,b}=travelWorld(),result={roll:{success:true,profile:{kind:"TRAVEL"}},actionKind:"TRAVEL",minutes:45,text:"Engine result",ruleEffects:{}},assessment={kind:"TRAVEL",actionIntent:{kind:"TRAVEL",intent:"TRAVEL",targetId:b.id}};
 const moved=projectSuccessfulTravel(state,"下港路へ向かう",result,assessment,text=>text.replace(/^你沿著可通行路線抵達 /,"通行可能な経路を通って").replace(/。$/,"に到着しました。"));
 assert.ok(moved);assert.equal(state.player.location,"下港路");assert.equal(state.world.state.location,"下港路");assert.equal(result.travelProjected,true);assert.equal(result.ruleEffects.travel.ok,true);assert.match(result.text,/下港路.*到着/);assert.ok(state.events.some(e=>e.type==="TRAVEL_COMPLETED"&&e.toId===b.id))
});

test("v0.60.14 permission success unlocks only an existing canonical EVENT_OCCURRED gate",()=>{
 const {state,a,b}=travelWorld();b.accessRequirements=[{type:"EVENT_OCCURRED",id:"HARBOR_PASS_GRANTED",hint:"港の通行許可が必要"}];const npc={id:"NPC-GUARD",name:"港湾守衛",role:"守衛",locationId:a.id,known:true,encountered:true,alive:true};state.world.registry.npcs=[npc];
 assert.equal(locationAccessStatus(state,b).allowed,false);
 const result={roll:{success:true},actionKind:"SOCIAL",text:"交渉成功",ruleEffects:{}},assessment={kind:"SOCIAL",actionIntent:{kind:"SOCIAL",intent:"PERSUADE",targetId:npc.id}};
 const grant=projectPermissionGrant(state,"港湾守衛に下港路への通行許可を求める",result,assessment,text=>text.replace(/^你取得了前往「(.+)」的通行許可。$/u,"「$1」への通行許可を得ました。"));
 assert.ok(grant);assert.equal(grant.destinationId,b.id);assert.equal(locationAccessStatus(state,b).allowed,true);assert.ok(state.events.some(e=>e.type==="HARBOR_PASS_GRANTED"&&e.canonicalType==="TRAVEL_PERMISSION_GRANTED"));assert.match(result.text,/下港路.*通行許可/);assert.doesNotMatch(result.text,/取得了|前往/)
});

test("v0.60.14 permission projection does not invent access state when the destination is ambiguous",()=>{
 const {state,a,b}=travelWorld(),c={id:"LOC-DOCK",name:"貨物桟橋",region:"サルナ湾",type:"港",description:"貨物用桟橋",known:true,accessRequirements:[{type:"EVENT_OCCURRED",id:"DOCK_PASS_GRANTED",hint:"許可が必要"}]};b.accessRequirements=[{type:"EVENT_OCCURRED",id:"HARBOR_PASS_GRANTED",hint:"許可が必要"}];state.world.registry.locations.push(c);state.world.travel.routes.push({id:"R2",fromId:a.id,toId:c.id,distanceKm:1,terrain:"ROAD",hazard:1,baseMinutes:20,open:true,canonical:true});const npc={id:"NPC-GUARD",name:"守衛",role:"守衛",locationId:a.id,known:true,encountered:true,alive:true};state.world.registry.npcs=[npc];
 const result={roll:{success:true},actionKind:"SOCIAL",text:"交渉成功",ruleEffects:{}},assessment={kind:"SOCIAL",actionIntent:{kind:"SOCIAL",intent:"PERSUADE",targetId:npc.id}};
 assert.equal(projectPermissionGrant(state,"守衛に通行許可を求める",result,assessment),null);assert.equal(locationAccessStatus(state,b).allowed,false);assert.equal(locationAccessStatus(state,c).allowed,false)
});

test("v0.60.14 fixes remain wired through the v0.60.19 release",async()=>{
 const [ui,engine,index,pkg,version]=await Promise.all([readFile(new URL("../src/v06013-runtime-ui-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../src/v06011-game-engine-hotfix.js",import.meta.url),"utf8"),readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../package.json",import.meta.url),"utf8"),readFile(new URL("../src/version.js",import.meta.url),"utf8")]);
 assert.match(ui,/clearPreviousRoll/);assert.match(ui,/今回の判定を処理中/);assert.match(ui,/前の行動の判定結果は引き継ぎません/);assert.match(ui,/freeActionForm/);assert.match(ui,/data-suggestion-index/);assert.match(ui,/WORLD ECHOES/);assert.match(ui,/主な提案/);assert.match(ui,/19500/);
 assert.match(engine,/v06014-turn-projection\.js\?v=60014/);assert.match(engine,/projectSuccessfulTravel/);assert.match(engine,/projectPermissionGrant/);assert.match(engine,/通行許可を得ました/);
 assert.match(index,/\.\/src\/version\.js\?v=60010\"\s*:\s*\"\.\/src\/version\.js\?v=60019/);assert.match(index,/\.\/src\/game-engine\.js\?v=60006\"\s*:\s*\"\.\/src\/v06011-game-engine-hotfix\.js\?v=60019/);assert.match(index,/v06015-runtime-ui-hotfix\.js\?v=60019/);assert.match(index,/app\.js\?v=60014/);
 assert.equal(JSON.parse(pkg).version,"0.60.19");assert.match(version,/APP_VERSION="0\.60\.19"/)
});