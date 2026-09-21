import {discoverHistoryEvidence} from "./world-history.js?v=271";
import {ensureSurvival} from "./survival-engine.js?v=271";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)};
const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
function currentLocation(state){const name=String(state.player?.location||"");return (state.world?.registry?.locations||[]).find(x=>x.name===name)||null}
function eligible(loc){return Boolean(loc&&/遺跡|廢墟|洞|地城|地下|塔|神殿|墓|迷宮|ruin|cave|dungeon|tower|temple|crypt|maze/i.test((loc.type||"")+" "+(loc.description||"")))}
function historyFor(state,loc){const rows=state.world?.history||[],regional=rows.filter(x=>(x.regions||[]).some(r=>r===loc.region||loc.description?.includes(r)));const pool=regional.length?regional:rows;return pool.length?pool[hash(loc.id+"|history")%pool.length]:null}
function roomName(loc,index){const names=["外圍入口","殘存通道","封閉內層","核心遺構","深層斷面"];return (loc.name||"未知遺跡")+" · "+names[index]}
function buildSite(state,loc){
 const count=4+(hash(loc.id+"|rooms")%2),history=historyFor(state,loc),rooms=[];
 for(let i=0;i<count;i++)rooms.push({id:"ROOM-"+hash(loc.id+"|"+i),name:roomName(loc,i),depth:i,hazard:clamp(1+(hash(loc.id+"|hazard|"+i)%5),1,5),visited:false,cleared:false,lootTaken:false,historyId:i===count-1||i===2?history?.id||null:null,artifactLabel:history?("與「"+history.title+"」相關的殘留證據"):"無法立即辨識的異世界遺物",connections:[]});
 for(let i=0;i<count-1;i++){rooms[i].connections.push(rooms[i+1].id);rooms[i+1].connections.push(rooms[i].id)}
 if(count>4){rooms[1].connections.push(rooms[3].id);rooms[3].connections.push(rooms[1].id)}
 return {id:"SITE-"+hash(loc.id),locationId:loc.id,name:loc.name+"探索區",status:"ACTIVE",currentRoomId:rooms[0].id,rooms,createdDay:state.world.state.day,completedDay:null}
}
export function ensureDungeonSites(state){
 state.world.dungeons??={version:1,sites:[]};const d=state.world.dungeons;d.sites=Array.isArray(d.sites)?d.sites:[];
 for(const loc of state.world?.registry?.locations||[])if(eligible(loc)&&!d.sites.some(s=>s.locationId===loc.id))d.sites.push(buildSite(state,loc));
 return d
}
export function currentDungeon(state){const loc=currentLocation(state);if(!loc)return null;return ensureDungeonSites(state).sites.find(s=>s.locationId===loc.id&&s.status!=="SEALED")||null}
function room(site){return site.rooms.find(r=>r.id===site.currentRoomId)||site.rooms[0]}
function moveRequested(site,label){const q=String(label||"");return site.rooms.find(r=>r.connections.includes(site.currentRoomId)&&q.includes(r.name))||null}
export function exploreDungeon(state,label,roll){
 const site=currentDungeon(state);if(!site||!/探索|深入|進入|搜尋|調查|打開|前進|explore|enter|search|investigate|open|advance/i.test(String(label||"")))return null;
 const current=room(site),requested=moveRequested(site,label);if(requested&&roll?.success!==false)site.currentRoomId=requested.id;
 const target=room(site),beforeVisited=target.visited;target.visited=true;let history=null,loot=null,hazardDamage=0;
 if(roll?.success!==false){target.cleared=true;if(target.historyId&&!target.evidenceRecovered){history=discoverHistoryEvidence(state,target.historyId,{type:"ARCHAEOLOGY",siteId:site.id,roomId:target.id,label:target.artifactLabel});target.evidenceRecovered=Boolean(history)}
  if(!target.lootTaken&&target.depth>0&&(hash(target.id+"|loot")%3===0)){loot={id:uid("ART"),name:target.artifactLabel,description:"從 "+target.name+" 中取得的實體遺物；其價值與用途必須依本世界的歷史、魔法或市場規則判定。",identified:false,source:"DUNGEON",historyId:target.historyId||null};state.inventory.push(loot);target.lootTaken=true}
 }else{const danger=target.hazard;hazardDamage=Math.max(1,danger+Math.floor(danger/2));state.player.hp=Math.max(1,(Number(state.player.hp)||1)-hazardDamage);ensureSurvival(state).injury=clamp(ensureSurvival(state).injury+danger*2,0,100)}
 const allCleared=site.rooms.every(r=>r.cleared);if(allCleared&&!site.completedDay){site.status="CLEARED";site.completedDay=state.world.state.day}
 const summary=roll?.success===false?"探索受到遺構本身的危險阻礙。":history?"你在遺構中取得了可驗證的歷史證據。":loot?"你在遺構中找到一件持久存在的遺物。":beforeVisited?"你再次檢查已走過的區域，沒有憑空刷新內容。":"你將這個空間正式納入已探索的遺構地圖。";
 const ev={id:uid("EV"),type:"DUNGEON_EXPLORE",visibility:"PLAYER_KNOWN",siteId:site.id,roomId:target.id,summary,day:state.world.state.day,at:Date.now()};state.events.push(ev);return {siteId:site.id,roomId:target.id,history,loot,hazardDamage,status:site.status}
}
export function dungeonSnapshot(state,{director=false}={}){
 const site=currentDungeon(state);if(!site)return null;const current=room(site);return {siteId:site.id,name:site.name,status:site.status,currentRoomId:site.currentRoomId,rooms:site.rooms.filter(r=>director||r.visited).map(r=>({id:r.id,name:r.name,depth:r.depth,hazard:r.hazard,visited:r.visited,cleared:r.cleared,lootTaken:r.lootTaken,connections:director||r.visited?r.connections:[],historyId:director?r.historyId:null}))}
}
