import {ensureTravelNetwork,travelSnapshot} from "./travel-engine.js?v=320";
export function worldMapSnapshot(state){
 const locations=(state.world?.registry?.locations||[]).filter(x=>x.known===true),knownIds=new Set(locations.map(x=>x.id)),travel=travelSnapshot(state);
 const byId=new Map(locations.map(x=>[x.id,x]));
 const routes=(travel.routes||[]).filter(r=>knownIds.has(r.fromId)&&knownIds.has(r.toId)).map(r=>({...r,fromName:byId.get(r.fromId)?.name||"",toName:byId.get(r.toId)?.name||""}));
 const regions=[...new Set(locations.map(x=>x.region||"未知區域"))].map(region=>({region,locations:locations.filter(x=>(x.region||"未知區域")===region).map(x=>({id:x.id,name:x.name,type:x.type||"",description:x.description||"",current:x.name===state.player?.location}))}));
 return {currentLocation:state.player?.location||"",regions:regions.map(group=>({...group,locations:group.locations.map(loc=>({...loc,access:(travel.locations||[]).find(x=>x.id===loc.id)?.access||{allowed:true,requirements:[],missing:[]}}))})),routes}
}
export function ensureWorldMap(state){ensureTravelNetwork(state);return worldMapSnapshot(state)}
