import {assertSaveState} from "./state-validator.js";
const DB_NAME="elyndra",DB_VERSION=1,STORE="saves",FORMAT_VERSION=4;
const INTERNAL_TYPES=new Set(["NPC_AUTONOMOUS_ACTION","FACTION_ACTION","WORLD_CANON_EXPANDED","AI_TURN_APPLIED"]);
function inferVisibility(e){if(e?.visibility)return e.visibility;if(INTERNAL_TYPES.has(e?.type))return "INTERNAL";if(e?.type==="WORLD_EVENT")return "OBSERVABLE";return "PLAYER_KNOWN"}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function tx(mode,fn){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),s=t.objectStore(STORE);let value;try{value=fn(s)}catch(e){reject(e);return}t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error)})}
export function migrateSave(input){
 const s=structuredClone(input);let v=Number(s.formatVersion||1);
 if(v<2){s.world.registry??={locations:[],npcs:[],factions:[],sideQuests:[]};s.world.graph??={nodes:[],edges:[],expansions:[]};s.world.state.crisis??={stage:"DORMANT",pressure:0,lastStageDay:s.world.state.day,history:[]};s.world.state.simulation??={tension:10,lastEventMinute:0,flags:{}};s.player.level??=1;s.player.xp??=0;s.player.status??="ALIVE";for(const q of s.world.registry.sideQuests||[]){q.progress??=0;q.target??=3;q.evidence??=[]}v=2}
 if(v<3){s.player.name??="無名者";s.player.nameSource??="LEGACY";s.player.worldNameKnown??=true;s.suggestions??=["觀察目前環境","確認自己的狀態","尋找可以安全前進的方向"];v=3}
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
 s.formatVersion=FORMAT_VERSION;return s
}
export async function saveWorld(state){const clean=migrateSave(state);assertSaveState(clean);Object.assign(state,clean);const record={...structuredClone(clean),id:"autosave",savedAt:new Date().toISOString(),formatVersion:FORMAT_VERSION};await tx("readwrite",s=>s.put(record));return record}
export async function loadWorld(){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readonly"),r=t.objectStore(STORE).get("autosave");r.onsuccess=()=>resolve(r.result?migrateSave(r.result):null);r.onerror=()=>reject(r.error)})}
export async function hasWorld(){return !!(await loadWorld())}
export async function deleteWorld(){await tx("readwrite",s=>s.delete("autosave"))}
export function exportWorld(state){const payload={format:"elyndra-save",formatVersion:FORMAT_VERSION,exportedAt:new Date().toISOString(),state:migrateSave(state)};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${state.world?.name||"world"}.elyndra`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
export async function importWorld(file){const payload=JSON.parse(await file.text());if(payload.format!=="elyndra-save"||![1,2,3,4].includes(Number(payload.formatVersion))||!payload.state?.world)throw new Error("不是有效的 Elyndra 存檔");const state=migrateSave(payload.state);assertSaveState(state);await saveWorld(state);return state}