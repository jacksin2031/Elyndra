const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
function record(state){
 const rows=Array.isArray(state?.world?.registry?.locations)?state.world.registry.locations:[],playerId=String(state?.player?.locationId||""),worldId=String(state?.world?.state?.locationId||""),token=clean(state?.player?.location||state?.world?.state?.location,160);
 return rows.find(x=>playerId&&String(x?.id||"")===playerId)||rows.find(x=>worldId&&String(x?.id||"")===worldId)||rows.find(x=>String(x?.id||"")===token||String(x?.name||"")===token)||null
}
function stripCanonical(value,name){const n=clean(name,100);return n?String(value||"").split(n).join(""):String(value||"")}
function observableAlias(loc){
 const explicit=clean(loc?.observableAlias||loc?.playerAlias,80);if(explicit)return explicit;
 const source=stripCanonical(clean(loc?.visibilityHint?.summary||loc?.description,240),loc?.name),type=clean(loc?.type,40);
 if(/石階/.test(source)&&/(裂隙|裂縫|斷口)/.test(source))return "石階後的裂隙";
 if(/裂隙|裂縫|斷口/.test(source))return "眼前的裂隙";
 if(/石階/.test(source))return "石階後的陌生區域";
 if(/橋|棧橋/.test(source))return "眼前的橋邊";
 if(/洞|穴|窟/.test(source)||/洞|穴|窟/.test(type))return "眼前的洞穴";
 if(/林|森林|樹/.test(source)||/林|森林/.test(type))return "眼前的林地";
 if(/塔/.test(source)||/塔/.test(type))return "眼前的高塔周邊";
 if(/街|巷|道路|路/.test(source)||/街|巷|道路|路/.test(type))return "眼前的陌生道路";
 return type?`眼前的${type}`:"眼前的陌生地點"
}
export function playerVisibleLocationRecord(state){
 const loc=record(state);if(!loc)return {id:null,name:"未知地點",known:false,type:"",region:"",description:""};
 const known=loc.known===true,name=known?clean(loc.name,100):observableAlias(loc);
 return {id:loc.id||null,name,known,type:clean(loc.type,60),region:known?clean(loc.region,100):"",description:clean(stripCanonical(loc.description,loc.name),260)}
}
export function playerVisibleLocationName(state){return playerVisibleLocationRecord(state).name}
export function projectPlayerVisibleLocationName(state,value){
 const token=clean(value,160),rows=Array.isArray(state?.world?.registry?.locations)?state.world.registry.locations:[],loc=rows.find(x=>String(x?.id||"")===token||String(x?.name||"")===token);
 if(!loc)return token||"未知地點";return loc.known===true?clean(loc.name,100):observableAlias(loc)
}
