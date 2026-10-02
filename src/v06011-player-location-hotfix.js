const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const locale=()=>String(globalThis.ELYNDRA_LOCALE||"zh-Hant");
const FALLBACK=Object.freeze({ja:"不明な場所",en:"Unknown place","zh-Hans":"未知地点","zh-Hant":"未知地點"});
const UNKNOWN_TOKEN=/^(?:未知地點|未知地点|未知之地|不明な場所|Unknown(?: place| location)?|UNKNOWN)$/iu;
const BROKEN_TOKEN=/\uFFFD|\[bad-location\]/iu;
function rows(state){return Array.isArray(state?.world?.registry?.locations)?state.world.registry.locations:[]}
function token(state){return clean(state?.player?.location||state?.world?.state?.location,160)}
function record(state,value=token(state)){
 if(value!==token(state))return rows(state).find(x=>String(x?.id||"")===value||String(x?.name||"")===value)||null;
 const playerId=String(state?.player?.locationId||""),worldId=String(state?.world?.state?.locationId||"");
 return rows(state).find(x=>playerId&&String(x?.id||"")===playerId)||rows(state).find(x=>worldId&&String(x?.id||"")===worldId)||rows(state).find(x=>String(x?.id||"")===value||String(x?.name||"")===value)||null
}
function stripCanonical(value,name){const n=clean(name,100);return n?String(value||"").split(n).join(""):String(value||"")}
function aliasJa(loc){
 const source=stripCanonical(clean(loc?.visibilityHint?.summary||loc?.description,240),loc?.name),type=clean(loc?.type,40),all=source+" "+type;
 if(/石階/.test(all)&&/(裂隙|裂縫|斷口|亀裂)/.test(all))return "石段の先にある亀裂";
 if(/裂隙|裂縫|斷口|亀裂/.test(all))return "目の前の亀裂";
 if(/石階/.test(all))return "石段の先にある見知らぬ場所";
 if(/橋|棧橋|桟橋/.test(all))return "目の前の橋のたもと";
 if(/洞|穴|窟|洞窟/.test(all))return "目の前の洞窟";
 if(/林|森林|樹|森/.test(all))return "目の前の林";
 if(/塔/.test(all))return "目の前の塔の周辺";
 if(/街|巷|道路|路/.test(all))return "目の前の見知らぬ道";
 return "目の前の見知らぬ場所"
}
function aliasEn(loc){const all=clean(loc?.visibilityHint?.summary||loc?.description,240)+" "+clean(loc?.type,40);if(/橋|棧橋|桟橋|bridge/i.test(all))return "the bridge ahead";if(/洞|穴|窟|cave/i.test(all))return "the cave ahead";if(/林|森林|樹|forest|wood/i.test(all))return "the woods ahead";if(/塔|tower/i.test(all))return "the area around the tower";if(/街|巷|道路|路|road|street/i.test(all))return "the unfamiliar road ahead";return "the unfamiliar place ahead"}
function aliasZh(loc,simplified=false){
 const explicit=clean(loc?.observableAlias||loc?.playerAlias,80);if(explicit)return explicit;
 const source=stripCanonical(clean(loc?.visibilityHint?.summary||loc?.description,240),loc?.name),type=clean(loc?.type,40),all=source+" "+type;
 if(/石階/.test(all)&&/(裂隙|裂縫|斷口)/.test(all))return simplified?"石阶后的裂隙":"石階後的裂隙";
 if(/裂隙|裂縫|斷口/.test(all))return simplified?"眼前的裂隙":"眼前的裂隙";
 if(/石階/.test(all))return simplified?"石阶后的陌生区域":"石階後的陌生區域";
 if(/橋|棧橋|桟橋/.test(all))return simplified?"眼前的桥边":"眼前的橋邊";
 if(/洞|穴|窟/.test(all))return simplified?"眼前的洞穴":"眼前的洞穴";
 if(/林|森林|樹/.test(all))return simplified?"眼前的林地":"眼前的林地";
 if(/塔/.test(all))return simplified?"眼前的高塔周边":"眼前的高塔周邊";
 if(/街|巷|道路|路/.test(all))return simplified?"眼前的陌生道路":"眼前的陌生道路";
 return simplified?"眼前的陌生地点":"眼前的陌生地點"
}
function observableAlias(loc){const id=locale(),explicit=clean(loc?.observableAlias||loc?.playerAlias,80);if(explicit&&id!=="ja"&&id!=="en")return explicit;if(id==="ja")return aliasJa(loc);if(id==="en")return aliasEn(loc);return aliasZh(loc,id==="zh-Hans")}
function trustworthyLooseToken(value){return Boolean(value)&&!UNKNOWN_TOKEN.test(value)&&!BROKEN_TOKEN.test(value)&&value.length<=160}
export function playerVisibleLocationRecord(state){
 const raw=token(state),loc=record(state,raw),id=locale();
 if(!loc){const loose=trustworthyLooseToken(raw)?raw:(FALLBACK[id]||FALLBACK["zh-Hant"]);return {id:null,name:loose,known:false,type:"",region:"",description:""}}
 const known=loc.known===true,name=known?clean(loc.name,100):observableAlias(loc);
 return {id:loc.id||null,name:name||(FALLBACK[id]||FALLBACK["zh-Hant"]),known,type:clean(loc.type,60),region:known?clean(loc.region,100):"",description:clean(stripCanonical(loc.description,loc.name),260)}
}
export function playerVisibleLocationName(state){return playerVisibleLocationRecord(state).name}
export function projectPlayerVisibleLocationName(state,value){
 const raw=clean(value,160),loc=record(state,raw),id=locale();if(!loc)return trustworthyLooseToken(raw)?raw:(FALLBACK[id]||FALLBACK["zh-Hant"]);return loc.known===true?clean(loc.name,100):observableAlias(loc)
}
