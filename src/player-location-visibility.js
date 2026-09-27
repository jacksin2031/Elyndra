const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const locale=()=>["zh-Hant","zh-Hans","en","ja"].includes(globalThis.ELYNDRA_LOCALE)?globalThis.ELYNDRA_LOCALE:"zh-Hant";
const TEXT={
 "zh-Hant":{unknown:"未知地點",crack:"眼前的裂隙",stepsCrack:"石階後的裂隙",steps:"石階後的陌生區域",bridge:"眼前的橋邊",cave:"眼前的洞穴",woods:"眼前的林地",tower:"眼前的高塔周邊",road:"眼前的陌生道路",generic:"眼前的陌生地點",prefix:"眼前的"},
 "zh-Hans":{unknown:"未知地点",crack:"眼前的裂隙",stepsCrack:"石阶后的裂隙",steps:"石阶后的陌生区域",bridge:"眼前的桥边",cave:"眼前的洞穴",woods:"眼前的林地",tower:"眼前的高塔周边",road:"眼前的陌生道路",generic:"眼前的陌生地点",prefix:"眼前的"},
 en:{unknown:"Unknown location",crack:"The fissure ahead",stepsCrack:"The fissure beyond the stone steps",steps:"The unfamiliar area beyond the stone steps",bridge:"The bridge ahead",cave:"The cave ahead",woods:"The wooded area ahead",tower:"The area around the tower ahead",road:"The unfamiliar road ahead",generic:"An unfamiliar place ahead",prefix:"The area ahead: "},
 ja:{unknown:"未知の場所",crack:"目の前の裂け目",stepsCrack:"石段の先の裂け目",steps:"石段の先の見知らぬ区域",bridge:"目の前の橋のたもと",cave:"目の前の洞窟",woods:"目の前の林",tower:"目の前の塔の周辺",road:"目の前の見知らぬ道",generic:"目の前の見知らぬ場所",prefix:"目の前の"}
};
const t=key=>TEXT[locale()]?.[key]||TEXT["zh-Hant"][key]||key;
function record(state){
 const rows=Array.isArray(state?.world?.registry?.locations)?state.world.registry.locations:[],token=clean(state?.player?.location||state?.world?.state?.location,160);
 return rows.find(x=>String(x?.id||"")===token||String(x?.name||"")===token)||null
}
function stripCanonical(value,name){const n=clean(name,100);return n?String(value||"").split(n).join(""):String(value||"")}
function observableAlias(loc){
 const explicit=clean(loc?.observableAlias||loc?.playerAlias,80);if(explicit)return explicit;
 const source=stripCanonical(clean(loc?.visibilityHint?.summary||loc?.description,240),loc?.name),type=clean(loc?.type,40);
 if(/石階|石阶|石段/.test(source)&&/(裂隙|裂縫|裂缝|斷口|断口|裂け目)/.test(source))return t("stepsCrack");
 if(/裂隙|裂縫|裂缝|斷口|断口|裂け目/.test(source))return t("crack");
 if(/石階|石阶|石段/.test(source))return t("steps");
 if(/橋|桥|棧橋|栈桥|桟橋/.test(source))return t("bridge");
 if(/洞|穴|窟|洞窟/.test(source)||/洞|穴|窟|洞窟/.test(type))return t("cave");
 if(/林|森林|樹|树/.test(source)||/林|森林/.test(type))return t("woods");
 if(/塔/.test(source)||/塔/.test(type))return t("tower");
 if(/街|巷|道路|路|通り/.test(source)||/街|巷|道路|路|通り/.test(type))return t("road");
 return type?`${t("prefix")}${type}`:t("generic")
}
export function playerVisibleLocationRecord(state){
 const loc=record(state);if(!loc)return {id:null,name:t("unknown"),known:false,type:"",region:"",description:""};
 const known=loc.known===true,name=known?clean(loc.name,100):observableAlias(loc);
 return {id:loc.id||null,name,known,type:clean(loc.type,60),region:known?clean(loc.region,100):"",description:clean(stripCanonical(loc.description,loc.name),260)}
}
export function playerVisibleLocationName(state){return playerVisibleLocationRecord(state).name}
export function projectPlayerVisibleLocationName(state,value){
 const token=clean(value,160),rows=Array.isArray(state?.world?.registry?.locations)?state.world.registry.locations:[],loc=rows.find(x=>String(x?.id||"")===token||String(x?.name||"")===token);
 if(!loc)return token||t("unknown");return loc.known===true?clean(loc.name,100):observableAlias(loc)
}
