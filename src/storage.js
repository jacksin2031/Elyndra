import {assertSaveState} from "./state-validator.js?v=57018";
import {ensureItemRuntime} from "./item-engine.js?v=57018";
import {ensureNotes} from "./notes-engine.js?v=57018";
import {ensurePlayerOrigin} from "./player-origin.js?v=57018";
import {ensureCausalWorldCore} from "./causal-world-core.js?v=57018";
const DB_NAME="elyndra",DB_VERSION=1,STORE="saves",FORMAT_VERSION=12;
const INTERNAL_TYPES=new Set(["NPC_AUTONOMOUS_ACTION","FACTION_ACTION","WORLD_CANON_EXPANDED","AI_TURN_APPLIED"]);const MIGRATION_RENOWN={PERSONAL:1,LOCAL:4,REGIONAL:10,FACTION:15,WORLD:25};const LEGACY_SUGGESTIONS=["觀察目前環境","確認自己的狀態","尋找可以安全前進的方向"];
function inferVisibility(e){if(e?.visibility)return e.visibility;if(INTERNAL_TYPES.has(e?.type))return "INTERNAL";if(e?.type==="WORLD_EVENT")return "OBSERVABLE";return "PLAYER_KNOWN"}
let dbPromise=null;function openDB(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"})};req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();dbPromise=null};resolve(db)};req.onerror=()=>{dbPromise=null;reject(req.error)}});return dbPromise}
async function tx(mode,fn){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),s=t.objectStore(STORE);let value;try{value=fn(s)}catch(e){reject(e);return}t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error)})}
export function migrateSave(input){
 if(!input||typeof input!=="object")throw new Error("SAVE_STATE_INVALID");
 const declared=Number(input.formatVersion??1);
 if(!Number.isInteger(declared)||declared<1)throw new Error("SAVE_VERSION_INVALID");
 if(declared>FORMAT_VERSION)throw new Error("SAVE_VERSION_TOO_NEW");
 const s=structuredClone(input);let v=Number(s.formatVersion||1);
 if(v<2){s.world.registry??={locations:[],npcs:[],factions:[],sideQuests:[]};s.world.graph??={nodes:[],edges:[],expansions:[]};s.world.state.crisis??={stage:"DORMANT",pressure:0,lastStageDay:s.world.state.day,history:[]};s.world.state.simulation??={tension:10,lastEventMinute:0,flags:{}};s.player.level??=1;s.player.xp??=0;s.player.status??="ALIVE";for(const q of s.world.registry.sideQuests||[]){q.progress??=0;q.target??=3;q.evidence??=[]}v=2}
 if(v<3){s.player.name??="無名者";s.player.nameSource??="LEGACY";s.player.worldNameKnown??=true;s.suggestions??=[];v=3}
 if(v<4){
  s.world.registry??={locations:[],npcs:[],factions:[],sideQuests:[]};for(const key of ["locations","npcs","factions","sideQuests"]){s.world.registry[key]??=[];for(const x of s.world.registry[key])if(x.known==null)x.known=true}
  s.world.graph??={nodes:[],edges:[],expansions:[]};
  const clock=s.world.state.clock||{day:s.world.state.day||1,hour:8,minute:0,totalMinutes:0};s.world.state.clock=clock;
  const sim=s.world.state.simulation??={tension:10,lastEventMinute:0,flags:{}};sim.lastTickMinute??=clock.totalMinutes;sim.npcCursor??=0;sim.factionCursor??=0;sim.flags??={};s.world.state.simulation=sim;
  s.world.state.crisis??={stage:"DORMANT",pressure:0,lastStageDay:s.world.state.day,history:[]};
  s.world.economy??=s.world.bible?.economy||{currencyExists:false,currencyName:"",currencySymbol:"",startingAmount:0,questReward:0,combatReward:0};
  for(const e of s.events||[])e.visibility=inferVisibility(e);
  v=4
 }
 if(v<5){if(Array.isArray(s.suggestions)&&s.suggestions.length===LEGACY_SUGGESTIONS.length&&s.suggestions.every((x,i)=>x===LEGACY_SUGGESTIONS[i]))s.suggestions=[];s.world.theme??=(s.world.seedContract?.theme&&s.world.seedContract.theme!=="AI_DECIDES"?s.world.seedContract.theme:"");v=5}
 if(v<6){s.player.wallet??={};s.player.calendarKnown??=false;s.world.timeline??=[];s.world.calendar??={name:"未知曆法",epochName:"未知紀元",dayTerm:"日",cycleTerm:"輪",longCycleTerm:"紀",daysPerCycle:10,cyclesPerLongCycle:10,cycles:["初輪","次輪","末輪"],periods:[{name:"暗時",fromMinute:0,toMinute:359},{name:"初光",fromMinute:360,toMinute:719},{name:"盛光",fromMinute:720,toMinute:1079},{name:"餘光",fromMinute:1080,toMinute:1439}]};for(const n of s.world.registry?.npcs||[]){n.companionProfile??={joinThreshold:35,leaveThreshold:10,motives:[],boundaries:[]};n.companion??={status:"NONE",joinedDay:null,leftDay:null,offeredDay:null,reason:""}}v=6}
 if(v<7){s.world.impact??={version:1,influence:{personal:0,local:0,regional:0,faction:0,world:0},records:[],queue:[]};s.world.state.statusTags??=[];for(const x of s.world.registry?.locations||[])x.worldState??={safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]};for(const x of s.world.registry?.npcs||[])x.worldState??={statusTags:[]};for(const x of s.world.registry?.factions||[])x.worldState??={stability:50,statusTags:[]};for(const x of s.world.timeline||[]){x.baseTriggerDay??=x.triggerDay;x.impactOffsetDays??=0;x.intensityModifier??=0;x.impactHistory??=[]}v=7}
 if(v<8){const impacts=(s.world.impact?.records||[]).filter(x=>x?.type==="PLAYER_IMPACT"),tier=n=>n>=60?"LEGEND":n>=30?"MAJOR_FIGURE":n>=12?"REGIONAL_FIGURE":n>=4?"LOCAL_NAME":"UNKNOWN";let renown=0;const deeds=[],rumors=[],processedImpactIds=[];for(const [i,x] of impacts.entries()){const scope=["PERSONAL","LOCAL","REGIONAL","FACTION","WORLD"].includes(x.scope)?x.scope:"LOCAL";renown+=MIGRATION_RENOWN[scope]||1;const deedId=`LEGACY-DEED-${i}-${x.id}`;deeds.push({id:deedId,impactId:x.id,scope,targetKind:x.targetKind,targetId:x.targetId,targetName:x.targetName,title:x.title,summary:x.summary,tone:"NEUTRAL",day:x.day,region:""});rumors.push({id:`LEGACY-RUM-${i}-${x.id}`,deedId,impactId:x.id,scope,spread:scope,tone:"NEUTRAL",targetKind:x.targetKind,targetId:x.targetId,targetName:x.targetName,text:x.summary||x.title||"過去的事蹟仍被人記得。",availableMinute:0,createdDay:x.day,status:"ACTIVE"});processedImpactIds.push(x.id)}s.world.recognition??={version:1,renown,notoriety:0,tier:tier(renown),deeds,rumors,titles:[],marks:[],reactions:[],factionAttention:{},processedImpactIds};v=8}
 if(v<9){s.player.stats??={strength:2,agility:2,mind:2};s.player.stats.presence??=2;s.player.stats.instinct??=2;s.player.skills??={OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:0};s.player.skillProgress??={OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:0};for(const k of ["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"]){s.player.skills[k]??=0;s.player.skillProgress[k]??=0}v=9}
 if(v<10){s.world.weather??={version:1,currentId:"",startedMinute:Number(s.world.state?.clock?.totalMinutes)||0,nextChangeMinute:Number(s.world.state?.clock?.totalMinutes)||0,locationKey:"",sequence:0,history:[],legacyNeutral:!Boolean(s.world.bible?.weatherSystem?.phenomena?.length)};for(const x of s.world.registry?.locations||[])x.weatherProfile??={zone:"",affinities:[],suppressions:[]};v=10}
 if(v<11){
  const now=Number(s.world.state?.clock?.totalMinutes)||0;
  s.world.impact??={version:2,influence:{personal:0,local:0,regional:0,faction:0,world:0},records:[],queue:[]};s.world.impact.version=2;s.world.impact.records=Array.isArray(s.world.impact.records)?s.world.impact.records:[];s.world.impact.queue=Array.isArray(s.world.impact.queue)?s.world.impact.queue:[];
  const locations=s.world.registry?.locations||[],npcs=s.world.registry?.npcs||[];
  for(const rec of s.world.impact.records){
   if(rec?.type!=="PLAYER_IMPACT"||rec.authority)continue;
   let loc=null;if(rec.targetKind==="location")loc=locations.find(x=>x.id===rec.targetId)||null;
   if(rec.targetKind==="npc"){const npc=npcs.find(x=>x.id===rec.targetId);loc=locations.find(x=>x.id===npc?.locationId)||null}
   rec.authority={originLocationId:loc?.id||null,region:loc?.region||"",parentTargetKind:rec.targetKind||"",parentTargetId:rec.targetId||""}
  }
  for(const q of s.world.impact.queue){q.observableAtLocationIds=Array.isArray(q.observableAtLocationIds)?q.observableAtLocationIds:(q.targetKind==="location"&&q.targetId?[q.targetId]:[]);q.revealedAtMinute=Number.isFinite(q.revealedAtMinute)?q.revealedAtMinute:null;q.rollSuccess=q.rollSuccess!==false;q.outcome??=""}
  s.world.state.statusTags??=[];s.world.state.structures=Array.isArray(s.world.state.structures)?s.world.state.structures:[];
  for(const x of s.world.registry?.locations||[]){x.worldState??={safety:50,prosperity:50,supply:50,infrastructure:50,stability:50,statusTags:[]};x.worldState.structures=Array.isArray(x.worldState.structures)?x.worldState.structures:[]}
  for(const x of s.world.registry?.npcs||[]){x.worldState??={statusTags:[]};x.worldState.structures=Array.isArray(x.worldState.structures)?x.worldState.structures:[];x.life??={hp:30,maxHp:30,energy:70,hunger:20,occupation:x.role||"旅人",schedulePhase:"ACTIVE",homeLocationId:x.locationId||null,lastMoveMinute:now,lastWorkMinute:now,needs:[],equipment:[]};x.skills??={OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0,GENERAL:1}}
  for(const x of s.world.registry?.factions||[]){x.worldState??={stability:50,statusTags:[]};x.worldState.structures=Array.isArray(x.worldState.structures)?x.worldState.structures:[];x.diplomacy??={};x.strategy??="HOLD"}
  for(const q of s.world.registry?.sideQuests||[]){q.conditions=Array.isArray(q.conditions)?q.conditions:[];q.matchedConditions=Array.isArray(q.matchedConditions)?q.matchedConditions:[]}
  s.world.travel??={version:1,routes:[]};s.world.dungeons??={version:1,sites:[]};s.world.magic??={version:1,laws:s.world.bible?.magicCost?[String(s.world.bible.magicCost)]:[],schools:[],anomalies:[],prevalence:Number(s.world.seedContract?.magic??s.world.seed?.magic)||0};
  s.player.survival??={hunger:0,fatigue:0,exposure:0,injury:0,conditions:[],lastMinute:now};s.player.magic??={capacity:100,strain:0,knownSpells:[],attunements:[]};s.player.cultureStanding??={};s.player.talents=Array.isArray(s.player.talents)?s.player.talents:[];s.player.talentPoints=Number.isFinite(s.player.talentPoints)?s.player.talentPoints:0;s.player.combatStatuses=Array.isArray(s.player.combatStatuses)?s.player.combatStatuses:[];
  if(s.quests?.main){s.quests.main.stage=Math.max(0,Math.min(5,Math.round(Number(s.quests.main.stage)||0)));s.quests.main.stageKey??=["SURVIVE","ORIENT","CONTACT","INVESTIGATE","CRISIS","CLIMAX"][s.quests.main.stage]}
  v=11
 }
 if(v<12){
  const surv=s.player?.survival;if(surv){if(!Number.isFinite(Number(surv.satiety)))surv.satiety=Number.isFinite(Number(surv.hunger))?Math.max(0,Math.min(100,100-Number(surv.hunger))):100;delete surv.hunger}
  s.crafting??={version:1,recipes:[]};s.notes=Array.isArray(s.notes)?s.notes:[];
  ensurePlayerOrigin(s.player);ensureItemRuntime(s);ensureNotes(s);v=12
 }
 ensurePlayerOrigin(s.player);ensureItemRuntime(s);ensureNotes(s);ensureCausalWorldCore(s);s.stateSync??={revision:0,lastCommitAt:0,lastReason:"",history:[]};s.stateSync.revision=Math.max(0,Math.round(Number(s.stateSync.revision)||0));s.stateSync.history=Array.isArray(s.stateSync.history)?s.stateSync.history.slice(-40):[];
 s.formatVersion=FORMAT_VERSION;return s
}
async function putSave(state,id="autosave",label=""){const clean=migrateSave(state);assertSaveState(clean);if(id==="autosave")Object.assign(state,clean);const record={...structuredClone(clean),id,savedAt:new Date().toISOString(),saveLabel:String(label||"").slice(0,80),formatVersion:FORMAT_VERSION};await tx("readwrite",s=>s.put(record));return record}
async function getSave(id){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readonly"),r=t.objectStore(STORE).get(id);r.onsuccess=()=>{try{if(!r.result){resolve(null);return}const migrated=migrateSave(r.result);assertSaveState(migrated);resolve(migrated)}catch(e){reject(e)}};r.onerror=()=>reject(r.error)})}
export async function saveWorld(state){return putSave(state,"autosave","自動存檔")}
export async function loadWorld(){return getSave("autosave")}
export async function saveWorldSlot(state,slot=1,label=""){const n=Math.max(1,Math.min(3,Math.round(Number(slot)||1)));return putSave(state,"slot-"+n,label||"手動存檔 "+n)}
export async function loadWorldSlot(slot=1){const n=Math.max(1,Math.min(3,Math.round(Number(slot)||1)));return getSave("slot-"+n)}
export async function listWorldSaves(){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readonly"),r=t.objectStore(STORE).getAll();r.onsuccess=()=>resolve((r.result||[]).map(x=>({id:x.id,savedAt:x.savedAt||"",saveLabel:x.saveLabel||"",worldName:x.world?.name||"未知世界",playerName:x.player?.name||"無名者",day:x.world?.state?.day||1,location:x.player?.location||"未知地點"})).sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt))));r.onerror=()=>reject(r.error)})}
export async function deleteWorldSlot(slot){const id=slot==="autosave"?"autosave":"slot-"+Math.max(1,Math.min(3,Math.round(Number(slot)||1)));await tx("readwrite",s=>s.delete(id))}
export async function hasWorld(){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readonly"),r=t.objectStore(STORE).getKey("autosave");r.onsuccess=()=>resolve(r.result!==undefined);r.onerror=()=>reject(r.error)})}
export async function deleteWorld(){await tx("readwrite",s=>{s.delete("autosave");s.delete("slot-1");s.delete("slot-2");s.delete("slot-3")})}
export function exportWorld(state){const payload={format:"elyndra-save",formatVersion:FORMAT_VERSION,exportedAt:new Date().toISOString(),state:migrateSave(state)};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${state.world?.name||"world"}.elyndra`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
export async function importWorld(file){const payload=JSON.parse(await file.text()),version=Number(payload.formatVersion);if(payload.format!=="elyndra-save"||!Number.isInteger(version)||version<1||version>FORMAT_VERSION||!payload.state?.world)throw new Error(version>FORMAT_VERSION?"SAVE_VERSION_TOO_NEW":"不是有效的 Elyndra 存檔");if(Number(payload.state.formatVersion||version)>FORMAT_VERSION)throw new Error("SAVE_VERSION_TOO_NEW");const state=migrateSave(payload.state);assertSaveState(state);await saveWorld(state);return state}