import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newGame} from "../src/world-engine.js";
import {advanceTime} from "../src/world-clock.js";
import {buildActionCheck} from "../src/check-engine.js";
import {actionProfile} from "../src/game-engine.js";
import {canonizeGeneration,resolvePlayerLocation} from "../src/world-registry.js";
import {helperSnapshot} from "../src/helper-context.js";
import {sceneTurnSnapshot} from "../src/turn-compiler.js";
import {migrateSave} from "../src/storage.js";
import {normalizeWeatherSystem,initializeWeather,currentWeather,tickWeather,playerWeatherSnapshot,directorWeatherSnapshot} from "../src/weather-engine.js";

const seed={worldviewMode:"style",genre:"王道奇幻",scale:"中型",danger:3,magic:4,politics:3,playHours:15,prompt:""};
const canon=()=>({identity:"天候由浮空海的魔力潮汐驅動",source:"浮空海魔潮",cycle:"潮汐每隔數個時段改變",forecastability:"LOW",phenomena:[
 {id:"WTH-CALM",name:"靜潮",observableName:"天空與氣流暫時平穩",description:"魔潮暫時沉降",sensoryCue:"空氣中的微光緩慢沉降。",rarity:"COMMON",weight:45,durationMin:60,durationMax:90,danger:0,actionModifiers:{}},
 {id:"WTH-UP",name:"逆星雨",observableName:"發光微粒正向天空升起",description:"星屑受逆向魔力牽引升空",sensoryCue:"地面附近的發光微粒開始逆著重力飄向天空。",rarity:"UNCOMMON",weight:30,durationMin:45,durationMax:80,danger:2,actionModifiers:{OBSERVE:1,TRAVEL:-1}},
 {id:"WTH-MEM",name:"記憶雷幕",observableName:"無聲冷光在厚雲內連續閃動",description:"雲層中的記憶魔力產生放電",sensoryCue:"雲後亮起一陣陣沒有雷聲的冷白閃光。",rarity:"RARE",weight:15,durationMin:30,durationMax:60,danger:4,actionModifiers:{OBSERVE:-1,TRAVEL:-2,RISKY:-1}},
 {id:"WTH-VEIL",name:"浮灰幕",observableName:"銀灰霧幕開始遮蔽遠處",description:"浮灰凝聚成移動霧牆",sensoryCue:"遠方輪廓被一層銀灰色流動霧幕吞沒。",rarity:"UNCOMMON",weight:10,durationMin:40,durationMax:70,danger:2,actionModifiers:{OBSERVE:-2,TRAVEL:-1}}
]});

function weatherState(){
 const s=newGame(seed);s.world.bible={weatherSystem:canon()};
 canonizeGeneration(s,{locations:[{name:"星井廣場",type:"廣場",region:"中央",description:"露天廣場",known:true,weatherProfile:{zone:"浮空海下層",affinities:["WTH-UP"],suppressions:[]}}]});
 resolvePlayerLocation(s,"星井廣場");initializeWeather(s,{force:true});return s
}

test("weather canon preserves genuinely otherworldly phenomena and bounded mechanics",()=>{
 const w=normalizeWeatherSystem(canon(),seed);
 assert.equal(w.phenomena.length,4);
 assert.equal(w.phenomena[1].name,"逆星雨");
 assert.match(w.phenomena[1].sensoryCue,/逆著重力/);
 assert.equal(w.phenomena[2].actionModifiers.TRAVEL,-2);
 assert.equal(w.phenomena[2].danger,4);
});

test("pre-canon and legacy worlds begin with neutral fallback weather",()=>{
 const s=newGame(seed);initializeWeather(s);
 assert.equal(currentWeather(s).id,"WTH-STABLE");
 assert.equal(playerWeatherSnapshot(s).observableName,"天空與氣流相對平穩");
});

test("weather advances from world time and emits an observable event without reselecting the same phenomenon",()=>{
 const s=weatherState(),before=currentWeather(s).id;
 s.world.weather.nextChangeMinute=s.world.state.clock.totalMinutes+1;advanceTime(s,2);
 const ev=tickWeather(s);
 assert.ok(ev);assert.equal(ev.type,"WEATHER_CHANGED");assert.equal(ev.visibility,"OBSERVABLE");
 assert.notEqual(currentWeather(s).id,before);
 assert.ok(s.events.some(x=>x.id===ev.id));
});

test("moving into a weather zone respects local suppressions and affinities",()=>{
 const s=newGame(seed);s.world.bible={weatherSystem:canon()};
 canonizeGeneration(s,{locations:[
  {name:"低空港",type:"港口",region:"中央",description:"浮空港",known:true,weatherProfile:{zone:"低空風帶",affinities:["WTH-CALM"],suppressions:[]}},
  {name:"星屑谷",type:"谷地",region:"中央",description:"星屑堆積的谷地",known:true,weatherProfile:{zone:"逆星雨核心帶",affinities:["WTH-UP"],suppressions:["WTH-CALM","WTH-MEM","WTH-VEIL"]}}
 ]});
 resolvePlayerLocation(s,"低空港");initializeWeather(s,{force:true});resolvePlayerLocation(s,"星屑谷");
 assert.equal(currentWeather(s).id,"WTH-UP");
 assert.equal(directorWeatherSnapshot(s).locationProfile.zone,"逆星雨核心帶");
});

test("weather contributes its own bounded D20 modifier",()=>{
 const s=weatherState();s.world.weather.currentId="WTH-MEM";s.world.weather.nextChangeMinute=9999;
 const check=buildActionCheck(s,"穿越暴露的山路",actionProfile("穿越暴露的山路"));
 assert.equal(check.kind,"TRAVEL");assert.equal(check.modifiers.weather,-2);assert.ok(check.bonus<=-2);
});

test("player and helper weather views expose sensations but not hidden canon mechanics",()=>{
 const s=weatherState();s.world.weather.currentId="WTH-MEM";
 const player=playerWeatherSnapshot(s),before=JSON.stringify(s),helper=helperSnapshot(s);
 assert.deepEqual(Object.keys(player).sort(),["observableName","sensoryCue"]);
 assert.equal(JSON.stringify(s),before);
 assert.equal(helper.world.weather.observableName,player.observableName);
 assert.equal("system" in helper.world.weather,false);
 assert.equal(JSON.stringify(helper).includes("記憶魔力產生放電"),false);
});

test("Scene Narrator sees current observable weather but not Director weather canon",()=>{
 const s=weatherState(),snapshot={world:{name:"UNKNOWN"},weather:playerWeatherSnapshot(s),directorWeather:directorWeatherSnapshot(s),player:{},knownFacts:[],knowledge:[],inventory:[],quest:null,recentEvents:[],runtimeSummary:"",factions:[],registry:{npcs:[]},companions:[],recognition:{}};
 const scene=sceneTurnSnapshot(snapshot);
 assert.equal(scene.weather.observableName,snapshot.weather.observableName);
 assert.equal(scene.directorWeather,undefined);
});

test("save migration v10 initializes weather runtime and location profiles",()=>{
 const s=newGame(seed);s.formatVersion=9;delete s.world.weather;
 s.world.registry.locations.push({id:"LOC-OLD",name:"舊城",type:"城市",description:"舊存檔地點",known:true});
 const m=migrateSave(s);assert.equal(m.formatVersion,10);assert.ok(m.world.weather);assert.equal(m.world.weather.legacyNeutral,true);initializeWeather(m);assert.equal(m.world.bible?.weatherSystem,undefined);assert.equal(currentWeather(m).id,"WTH-STABLE");assert.deepEqual(m.world.registry.locations[0].weatherProfile,{zone:"",affinities:[],suppressions:[]});
});

test("weather UI and AI generation contracts are wired into the current release",async()=>{
 const [html,app,client]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/id="weather" class="weather-chip"/);
 assert.match(app,/\["天氣",m\.weather\]/);
 assert.match(client,/weatherSystem/);assert.match(client,/weatherProfile/);
 assert.match(client,/communication:\{[^\n]+constraints:"限制與代價"\},weatherSystem:/);
});
