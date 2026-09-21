import {ensureCrisis} from "./crisis-engine.js?v=276";
import {recordCausalEvent} from "./knowledge-graph.js?v=276";
import {ensureWorldRegistry} from "./world-registry.js?v=276";
import {ensureClock} from "./world-clock.js?v=276";
import {ensureTravelNetwork} from "./travel-engine.js?v=276";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function simulation(state){state.world.state.simulation??={tension:10,lastEventMinute:0,lastTickMinute:ensureClock(state).totalMinutes,flags:{}};state.world.state.simulation.npcCursor??=0;return state.world.state.simulation}
function roundRobin(state,list,key,limit=4){if(!list.length)return [];const sim=simulation(state),count=Math.min(limit,list.length),start=Math.max(0,Number(sim[key])||0)%list.length,out=Array.from({length:count},(_,i)=>list[(start+i)%list.length]);sim[key]=(start+count)%list.length;return out}
function companionProfile(p={}){return {joinThreshold:clamp(Math.round(Number(p.joinThreshold)||35),5,90),leaveThreshold:clamp(Math.round(Number(p.leaveThreshold)||10),0,70),motives:Array.isArray(p.motives)?p.motives.map(String).slice(0,4):[],boundaries:Array.isArray(p.boundaries)?p.boundaries.map(String).slice(0,4):[]}}
function companionState(c={}){return {status:["NONE","OFFERED","ACTIVE","LEFT"].includes(c.status)?c.status:"NONE",joinedDay:Number.isFinite(c.joinedDay)?c.joinedDay:null,leftDay:Number.isFinite(c.leftDay)?c.leftDay:null,offeredDay:Number.isFinite(c.offeredDay)?c.offeredDay:null,reason:String(c.reason||"").slice(0,220)}}
function roleSkills(n){
 const text=(n.role+" "+n.goal+" "+n.personality).toLowerCase();
 return {OBSERVE:/斥候|學者|獵人|偵察|scout|scholar|hunter/.test(text)?2:0,SOCIAL:/商人|外交|貴族|merchant|diplomat|noble/.test(text)?2:0,TRAVEL:/嚮導|旅人|航海|guide|traveler|sailor/.test(text)?2:0,RISKY:/戰士|騎士|傭兵|護衛|warrior|knight|mercenary|guard/.test(text)?2:0,GENERAL:1}
}
function ensureLife(n,now){
 n.life??={hp:30,maxHp:30,energy:70,hunger:20,occupation:n.role||"旅人",schedulePhase:"ACTIVE",homeLocationId:n.locationId||null,lastMoveMinute:now,lastWorkMinute:now,needs:[],equipment:[]};
 const l=n.life;l.maxHp=clamp(Math.round(Number(l.maxHp)||30),1,200);l.hp=clamp(Math.round(Number(l.hp)||l.maxHp),0,l.maxHp);l.energy=clamp(Number(l.energy)||70,0,100);l.hunger=clamp(Number(l.hunger)||20,0,100);l.needs=Array.isArray(l.needs)?l.needs:[];l.equipment=Array.isArray(l.equipment)?l.equipment:[];n.skills??=roleSkills(n);return l
}
function relationEvent(state,npc,type,summary){const ev={id:id(),type,visibility:"PLAYER_KNOWN",npcId:npc.id,summary,day:state.world.state.day,at:Date.now()};state.events.push(ev);npc.memories.push({id:id(),type:type.toLowerCase(),summary,day:state.world.state.day});npc.memories=npc.memories.slice(-20);return ev}
export function companionSnapshot(state){return ensureNpcRuntime(state).filter(n=>n.known===true&&["ACTIVE","OFFERED"].includes(n.companion.status)).map(n=>({id:n.id,name:n.name,role:n.role,trust:n.trust,status:n.companion.status,goal:n.goal,hp:n.life.hp,maxHp:n.life.maxHp,energy:Math.round(n.life.energy),skills:n.skills,equipment:n.life.equipment.slice(0,4)}))}
export function inviteCompanion(state,npcId){const npc=findNpc(state,npcId);if(!npc||npc.known!==true||npc.alive===false)return {accepted:false,reason:"NPC_UNAVAILABLE"};if(npc.companion.status==="ACTIVE")return {accepted:true,reason:"ALREADY_ACTIVE"};const threshold=npc.companionProfile.joinThreshold;if((npc.trust??0)<threshold){relationEvent(state,npc,"COMPANION_INVITE_DECLINED",npc.name+" 暫時沒有接受同行邀請。");return {accepted:false,reason:"TRUST_TOO_LOW",requiredTrust:threshold}}npc.companion={...npc.companion,status:"ACTIVE",joinedDay:state.world.state.day,leftDay:null,reason:"接受玩家邀請"};relationEvent(state,npc,"COMPANION_JOINED",npc.name+" 接受邀請，成為同行夥伴。");return {accepted:true,npc}}
export function acceptCompanionOffer(state,npcId){const npc=findNpc(state,npcId);if(!npc||npc.companion.status!=="OFFERED"||npc.alive===false)return false;npc.companion={...npc.companion,status:"ACTIVE",joinedDay:state.world.state.day,leftDay:null,reason:"玩家接受主動同行提議"};relationEvent(state,npc,"COMPANION_JOINED",npc.name+" 正式加入你的旅程。");return true}
export function dismissCompanion(state,npcId,reason="玩家希望暫時分開行動"){const npc=findNpc(state,npcId);if(!npc||npc.companion.status!=="ACTIVE")return false;npc.companion={...npc.companion,status:"LEFT",leftDay:state.world.state.day,reason:String(reason).slice(0,220)};relationEvent(state,npc,"COMPANION_LEFT",npc.name+" 離開了目前的同行隊伍。");return true}
export function applyCompanionChange(state,change){const npc=findNpc(state,change?.npcId);if(!npc||npc.known!==true||npc.alive===false)return false;const action=String(change?.action||"").toUpperCase(),reason=String(change?.reason||"").trim().slice(0,220);if(action==="OFFER"){if(!["NONE","LEFT"].includes(npc.companion.status)||(npc.trust??0)<Math.max(5,npc.companionProfile.joinThreshold-10))return false;npc.companion={...npc.companion,status:"OFFERED",offeredDay:state.world.state.day,reason:reason||"NPC 主動提出同行"};relationEvent(state,npc,"COMPANION_OFFERED",npc.name+" 主動提出希望與你同行。");return true}if(action==="LEAVE"&&npc.companion.status==="ACTIVE"){npc.companion={...npc.companion,status:"LEFT",leftDay:state.world.state.day,reason:reason||"NPC 依照自己的目標離開"};relationEvent(state,npc,"COMPANION_LEFT",npc.name+" 決定離開同行隊伍。");return true}return false}
function evaluateCompanionAutonomy(state,npc,crisis){const day=state.world.state.day;if(npc.lastCompanionDecisionDay===day)return;if(npc.companion.status==="ACTIVE"&&(npc.trust??0)<=npc.companionProfile.leaveThreshold){npc.lastCompanionDecisionDay=day;applyCompanionChange(state,{npcId:npc.id,action:"LEAVE",reason:"彼此信任已低於繼續同行的底線"});return}const pressure=["ESCALATING","CRISIS","ENDGAME"].includes(crisis.stage);if(npc.known===true&&["NONE","LEFT"].includes(npc.companion.status)&&(npc.trust??0)>=npc.companionProfile.joinThreshold+(pressure?10:25)){npc.lastCompanionDecisionDay=day;applyCompanionChange(state,{npcId:npc.id,action:"OFFER",reason:pressure?"世界局勢令他認為同行更符合自己的目標":"長期累積的信任令他願意主動同行"})}}
export function ensureNpcRuntime(state){const r=ensureWorldRegistry(state),now=ensureClock(state).totalMinutes;for(const n of r.npcs){n.personality??="對陌生人保持謹慎";n.goal??="維持自己的生活與安全";n.knowledgeScope??=[];n.memories??=[];n.trust=clamp(Number(n.trust)||0,0,100);n.alive??=true;n.companionProfile=companionProfile(n.companionProfile);n.companion=companionState(n.companion);n.lastActionMinute??=now;ensureLife(n,now)}return r.npcs}
function neighbourLocations(state,npc){
 const net=ensureTravelNetwork(state),locs=state.world.registry?.locations||[],edges=net.routes.filter(r=>r.open!==false&&(r.fromId===npc.locationId||r.toId===npc.locationId));
 return edges.map(r=>locs.find(x=>x.id===(r.fromId===npc.locationId?r.toId:r.fromId))).filter(Boolean)
}
function chooseMove(state,npc,crisis){
 const options=neighbourLocations(state,npc);if(!options.length)return null;
 const current=(state.world.registry?.locations||[]).find(x=>x.id===npc.locationId),unsafe=Number(current?.worldState?.safety??50)<30||["CRISIS","ENDGAME"].includes(crisis.stage);
 if(unsafe)return options.sort((a,b)=>Number(b.worldState?.safety??50)-Number(a.worldState?.safety??50))[0];
 const goal=(npc.goal||"").toLowerCase();if(/商|交易|trade|merchant/.test(goal))return options.sort((a,b)=>Number(b.worldState?.prosperity??50)-Number(a.worldState?.prosperity??50))[0];
 if(/探索|尋找|追查|旅|explore|seek|find/.test(goal))return options[(npc.id.length+state.world.state.day)%options.length];
 return null
}
function workAtLocation(state,npc){
 const loc=(state.world.registry?.locations||[]).find(x=>x.id===npc.locationId);if(!loc)return null;const l=npc.life,now=ensureClock(state).totalMinutes;
 if(l.energy<25){l.energy=clamp(l.energy+25,0,100);l.schedulePhase="REST";return npc.name+" 暫時休息，恢復自己的體力。"}
 l.schedulePhase="WORK";l.energy=clamp(l.energy-8,0,100);l.hunger=clamp(l.hunger+4,0,100);l.lastWorkMinute=now;
 const role=(npc.role||"").toLowerCase();if(/商|農|工|匠|merchant|farmer|craft/.test(role))loc.worldState.prosperity=clamp(Number(loc.worldState.prosperity||50)+1,0,100);if(/守|兵|騎士|guard|soldier|knight/.test(role))loc.worldState.safety=clamp(Number(loc.worldState.safety||50)+1,0,100);
 return npc.name+" 在 "+loc.name+" 繼續自己的「"+l.occupation+"」生活。"
}
export function tickNpcs(state){
 const now=ensureClock(state).totalMinutes,out=[],npcs=ensureNpcRuntime(state),crisis=ensureCrisis(state);
 for(const npc of roundRobin(state,npcs,"npcCursor",4)){
  if(!npc.alive||now-npc.lastActionMinute<120)continue;
  npc.lastActionMinute=now;evaluateCompanionAutonomy(state,npc,crisis);const life=npc.life;
  if(npc.companion.status==="ACTIVE"){life.energy=clamp(life.energy-2,0,100);life.schedulePhase="TRAVEL_WITH_PLAYER";const playerLoc=(state.world.registry?.locations||[]).find(x=>x.name===state.player?.location);if(playerLoc)npc.locationId=playerLoc.id}
  else{const move=chooseMove(state,npc,crisis);if(move&&now-life.lastMoveMinute>=240){const from=npc.locationId;npc.locationId=move.id;life.lastMoveMinute=now;life.energy=clamp(life.energy-6,0,100);life.schedulePhase="TRAVEL";state.events.push({id:id(),type:"NPC_MOVED",visibility:"INTERNAL",npcId:npc.id,fromLocationId:from,toLocationId:move.id,summary:npc.name+" 因自己的目標與環境狀況移動到 "+move.name+"。",day:state.world.state.day,at:Date.now()})}}
  const summary=workAtLocation(state,npc)||npc.name+" 根據自己的目標調整了今天的行動。";
  const ev={id:id(),type:"NPC_AUTONOMOUS_ACTION",visibility:"INTERNAL",npcId:npc.id,summary,day:state.world.state.day,time:String(state.world.state.clock.hour).padStart(2,"0")+":"+String(state.world.state.clock.minute).padStart(2,"0"),at:Date.now()};
  npc.memories.push({id:id(),type:"autonomous",summary,day:state.world.state.day});npc.memories=npc.memories.slice(-20);state.events.push(ev);recordCausalEvent(state,ev,{entityIds:[npc.id,npc.factionId].filter(Boolean)});out.push(ev)
 }
 return out
}
export function activeCompanions(state){return ensureNpcRuntime(state).filter(n=>n.alive!==false&&n.companion.status==="ACTIVE")}
export function applyCompanionCombatSupport(state,enemy,action){
 const allies=activeCompanions(state),events=[];let damage=0,guard=0;
 for(const npc of allies.slice(0,3)){const l=npc.life;if(l.hp<=0)continue;const risky=Number(npc.skills?.RISKY)||0;if(action==="attack"&&risky>0){const hit=Math.max(1,1+risky+Math.floor((npc.trust||0)/35));enemy.hp=Math.max(0,enemy.hp-hit);damage+=hit;l.energy=clamp(l.energy-3,0,100);events.push(npc.name+" 協助攻擊")}else{guard+=risky>=2?2:1;events.push(npc.name+" 協助掩護")}}
 return {damage,guard,events}
}
export function damageCompanion(state,amount){
 const allies=activeCompanions(state).filter(n=>n.life.hp>0);if(!allies.length)return null;const npc=allies[0],dmg=Math.max(1,Math.round(Number(amount)||1));npc.life.hp=Math.max(0,npc.life.hp-dmg);if(npc.life.hp===0)relationEvent(state,npc,"COMPANION_DOWNED",npc.name+" 在戰鬥中失去繼續行動的能力。");return {npcId:npc.id,name:npc.name,damage:dmg,hp:npc.life.hp}
}
export function findNpc(state,idOrName){return ensureNpcRuntime(state).find(n=>n.id===idOrName||n.name===idOrName)||null}
