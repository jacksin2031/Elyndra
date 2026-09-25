import {recordCausalEvent} from "./knowledge-graph.js?v=57011";
import {ensureWorldRegistry} from "./world-registry.js?v=57011";
import {ensureClock} from "./world-clock.js?v=57011";
import {ensureCrisis} from "./crisis-engine.js?v=57011";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
function simulation(state){state.world.state.simulation??={tension:10,lastEventMinute:0,lastTickMinute:ensureClock(state).totalMinutes,flags:{}};state.world.state.simulation.factionCursor??=0;return state.world.state.simulation}
function roundRobin(state,list,key,limit=4){if(!list.length)return [];const sim=simulation(state),count=Math.min(limit,list.length),start=Math.max(0,Number(sim[key])||0)%list.length,out=Array.from({length:count},(_,i)=>list[(start+i)%list.length]);sim[key]=(start+count)%list.length;return out}
function territory(state,f){const npcIds=new Set((state.world.registry?.npcs||[]).filter(n=>n.factionId===f.id).map(n=>n.locationId).filter(Boolean));return (state.world.registry?.locations||[]).filter(l=>npcIds.has(l.id))}
export function ensureFactionRuntime(state){const r=ensureWorldRegistry(state),now=ensureClock(state).totalMinutes;for(const f of r.factions){f.resources=clamp(Number(f.resources)||50,0,100);f.influence=clamp(Number(f.influence)||25,0,100);f.playerReputation=clamp(Number(f.playerReputation)||0,-100,100);f.relations??={};f.diplomacy??={};f.strategy??="HOLD";f.lastActionMinute??=now;f.worldState??={stability:50,statusTags:[]}}for(const a of r.factions)for(const b of r.factions)if(a.id!==b.id&&a.relations[b.id]==null)a.relations[b.id]=0;return r.factions}
export function changeReputation(state,factionId,delta){const f=ensureFactionRuntime(state).find(x=>x.id===factionId);if(!f)return null;f.playerReputation=clamp(f.playerReputation+clamp(Math.round(delta),-5,5),-100,100);return f.playerReputation}
function relationStatus(v){return v>=45?"ALLIED":v<=-45?"HOSTILE":v>=15?"FRIENDLY":v<=-15?"RIVAL":"NEUTRAL"}
function chooseStrategy(state,f,crisis){
 const stability=Number(f.worldState?.stability??50),goal=(f.goal||"").toLowerCase();
 if(f.resources<30||stability<30)return "RECOVER";
 if(["CRISIS","ENDGAME"].includes(crisis.stage))return /征服|支配|戰|war|conquer/.test(goal)?"MOBILIZE":"DEFEND";
 if(/交易|商|繁榮|trade|merchant|prosper/.test(goal))return "TRADE";
 if(/擴張|領土|征服|expand|territory|conquer/.test(goal)&&f.resources>45)return "EXPAND";
 return "HOLD"
}
function pickCounterparty(fs,f){return fs.filter(x=>x.id!==f.id).sort((a,b)=>(Number(f.relations[a.id])||0)-(Number(f.relations[b.id])||0)||String(a.id).localeCompare(String(b.id)))[0]||null}
export function tickFactions(state){
 const fs=ensureFactionRuntime(state),clock=ensureClock(state),out=[],crisis=ensureCrisis(state);
 for(const f of roundRobin(state,fs,"factionCursor",4)){
  if(clock.totalMinutes-f.lastActionMinute<360)continue;f.lastActionMinute=clock.totalMinutes;const other=pickCounterparty(fs,f),lands=territory(state,f),strategy=chooseStrategy(state,f,crisis);f.strategy=strategy;let summary;
  if(strategy==="RECOVER"){f.resources=clamp(f.resources+3,0,100);f.worldState.stability=clamp(Number(f.worldState.stability||50)+1,0,100);summary=f.name+" 收縮外部行動，集中恢復資源與內部秩序。"}
  else if(strategy==="TRADE"){f.resources=clamp(f.resources+2,0,100);f.influence=clamp(f.influence+1,0,100);for(const l of lands.slice(0,2))l.worldState.prosperity=clamp(Number(l.worldState.prosperity||50)+1,0,100);if(other)f.relations[other.id]=clamp((f.relations[other.id]||0)+1,-100,100);summary=f.name+" 按照自身目標擴大交易與資源往來。"}
  else if(strategy==="DEFEND"){f.resources=clamp(f.resources-1,0,100);for(const l of lands.slice(0,2))l.worldState.safety=clamp(Number(l.worldState.safety||50)+1,0,100);summary=f.name+" 因世界危機轉為防守，強化自己控制地區的安全。"}
  else if(["EXPAND","MOBILIZE"].includes(strategy)&&other){f.resources=clamp(f.resources-3,0,100);f.influence=clamp(f.influence+2,0,100);f.relations[other.id]=clamp((f.relations[other.id]||0)-3,-100,100);other.relations[f.id]=clamp((other.relations[f.id]||0)-2,-100,100);summary=f.name+" 為了「"+f.goal+"」向 "+other.name+" 的利益範圍施加壓力。"}
  else{f.resources=clamp(f.resources+1,0,100);summary=f.name+" 維持現有勢力範圍，等待更合適的時機。"}
  if(other){const status=relationStatus(f.relations[other.id]);f.diplomacy[other.id]=status;other.diplomacy[f.id]=relationStatus(other.relations[f.id]||0)}
  const ev={id:id(),type:"FACTION_ACTION",visibility:"INTERNAL",factionId:f.id,strategy,summary,day:clock.day,time:String(clock.hour).padStart(2,"0")+":"+String(clock.minute).padStart(2,"0"),at:Date.now()};state.events.push(ev);recordCausalEvent(state,ev,{entityIds:[f.id,other?.id].filter(Boolean)});out.push(ev)
 }
 return out
}
export function factionSnapshot(state,{visibleOnly=false}={}){return ensureFactionRuntime(state).filter(f=>!visibleOnly||f.known===true).map(f=>({id:f.id,name:f.name,goal:f.goal,resources:f.resources,influence:f.influence,playerReputation:f.playerReputation,relations:f.relations,diplomacy:f.diplomacy,strategy:f.strategy,territoryIds:territory(state,f).map(x=>x.id)}))}
