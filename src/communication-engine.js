const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const LATENCY=new Set(["NONE","DELAYED","NEAR_INSTANT","INSTANT"]);
const REALTIME=new Set(["NEAR_INSTANT","INSTANT"]);
const RANGE=new Set(["LOCAL","REGIONAL","WORLD"]);

export function normalizeCivilizationProfile(input={}){
 const raw=Number(input?.level),level=clamp(Math.round(Number.isFinite(raw)?raw:3),1,5);
 const defaults={
  1:{stage:"分散聚落文明",infrastructure:"聚落分散，跨地域制度與基建非常有限。"},
  2:{stage:"早期城市文明",infrastructure:"已有城鎮、驛路與基礎行政網絡。"},
  3:{stage:"成熟區域文明",infrastructure:"跨城交通、專業機構與穩定區域網絡已形成。"},
  4:{stage:"高度工業／魔導文明",infrastructure:"遠距運輸、能源與通訊基建普遍存在。"},
  5:{stage:"高度網絡化文明",infrastructure:"大部分人口可快速接入跨區域資訊與服務網絡。"}
 }[level];
 return {
  level,
  stage:clean(input?.stage,100)||defaults.stage,
  infrastructure:clean(input?.infrastructure,260)||defaults.infrastructure,
  literacy:clean(input?.literacy,160)||"由當地文化與制度決定",
  mobility:clean(input?.mobility,160)||"由當地交通、地理與技術條件決定"
 }
}

function capability(civLevel,magic){
 if(civLevel<=1&&magic<=2)return {maxLatency:"DELAYED",maxRange:"LOCAL"};
 if(civLevel<=2&&magic<=2)return {maxLatency:"DELAYED",maxRange:"REGIONAL"};
 if(civLevel<=2&&magic===3)return {maxLatency:"DELAYED",maxRange:"REGIONAL"};
 if(civLevel<=2&&magic>=4)return {maxLatency:"NEAR_INSTANT",maxRange:"REGIONAL"};
 if(civLevel===3&&magic<=2)return {maxLatency:"DELAYED",maxRange:"REGIONAL"};
 if(civLevel===3&&magic>=3)return {maxLatency:"NEAR_INSTANT",maxRange:"REGIONAL"};
 if(civLevel===4&&magic<=2)return {maxLatency:"NEAR_INSTANT",maxRange:"REGIONAL"};
 if(civLevel===4)return {maxLatency:"INSTANT",maxRange:"WORLD"};
 return {maxLatency:"INSTANT",maxRange:"WORLD"}
}
const LATENCY_RANK={NONE:0,DELAYED:1,NEAR_INSTANT:2,INSTANT:3},RANGE_RANK={LOCAL:1,REGIONAL:2,WORLD:3};
function capLatency(value,max){return LATENCY_RANK[value]<=LATENCY_RANK[max]?value:max}
function capRange(value,max){return RANGE_RANK[value]<=RANGE_RANK[max]?value:max}

function fallbackCommunication(civ,magic){
 const level=civ.level;
 if(level<=2&&magic<=2)return {name:"驛使聯絡",medium:"信使、驛站與烽火",description:"消息沿既有道路與聚落逐站傳遞。",latency:"DELAYED",range:level===1?"LOCAL":"REGIONAL",constraints:"傳遞需要時間，不能作即時對話。"};
 if(level<=2&&magic>=4)return {name:"傳訊術式",medium:"受訓施術者、成對媒介或聯絡印記",description:"較低技術文明以高普及魔法支撐快速遠距傳訊。",latency:"NEAR_INSTANT",range:"REGIONAL",constraints:"需要先建立可辨識的聯絡印記或媒介。"};
 if(level===3&&magic<=2)return {name:"驛路通信網",medium:"固定驛站、信使與公共消息節點",description:"成熟區域制度可可靠傳訊，但仍受旅程時間限制。",latency:"DELAYED",range:"REGIONAL",constraints:"可靠但不是即時通話。"};
 if(level===3)return {name:"區域共鳴網",medium:"魔導節點或文明特有通訊設施",description:"區域中心之間可快速交換短訊息。",latency:"NEAR_INSTANT",range:"REGIONAL",constraints:"需要接入節點或已建立聯絡對象。"};
 if(level===4&&magic<=2)return {name:"遠距通訊網",medium:"有線、無線或世界內等價終端",description:"高度基建令跨區域快速通訊成為可用服務。",latency:"NEAR_INSTANT",range:"REGIONAL",constraints:"需要終端、地址或身份識別。"};
 if(level===4)return {name:"魔導通訊網",medium:"魔導終端與中繼節點",description:"高度基建與魔法共同支撐快速遠距聯絡。",latency:"INSTANT",range:"WORLD",constraints:"需要已交換識別方式並受網絡覆蓋限制。"};
 return {name:"泛域資訊網",medium:"高度網絡化終端或世界內等價系統",description:"高度文明可讓大多數地區快速交換資訊。",latency:"INSTANT",range:"WORLD",constraints:"仍需要有效身份、地址或聯絡授權。"}
}

export function normalizeCommunicationSystem(input={},seed={},civilizationInput={}){
 const civ=normalizeCivilizationProfile(civilizationInput),magic=clamp(Math.round(Number(seed?.magic??seed?.seedContract?.magic??0)||0),0,5),fallback=fallbackCommunication(civ,magic),cap=capability(civ.level,magic);
 const proposedLatency=LATENCY.has(input?.latency)?input.latency:fallback.latency,proposedRange=RANGE.has(input?.range)?input.range:fallback.range;
 const latency=capLatency(proposedLatency,cap.maxLatency),range=capRange(proposedRange,cap.maxRange);
 const downgraded=latency!==proposedLatency||range!==proposedRange;
 return {
  name:clean(input?.name,80)||fallback.name,
  medium:clean(input?.medium,100)||fallback.medium,
  description:clean(input?.description,280)||fallback.description,
  latency,
  range,
  accessRule:"ENCOUNTERED",
  constraints:clean(input?.constraints,240)||fallback.constraints,
  realtime:REALTIME.has(latency),
  civilizationLevel:civ.level,
  magicLevel:magic,
  capability:{maxLatency:cap.maxLatency,maxRange:cap.maxRange,downgraded}
 }
}

export function ensureCommunicationCanon(state){
 state.world.bible??={};
 const civ=normalizeCivilizationProfile(state.world.bible.civilization);
 state.world.bible.civilization=civ;
 state.world.bible.communication=normalizeCommunicationSystem(state.world.bible.communication,state.world.seedContract||state.world.seed||{},civ);
 return state.world.bible.communication
}
export function worldCommunication(state){return ensureCommunicationCanon(state)}
export function ensureNpcRemoteContact(state,npc){
 if(!npc)return null;
 npc.remoteContact??={established:false,blocked:false};
 if(npc.encountered===true&&npc.remoteContact.established!==true)npc.remoteContact.established=true;
 return npc.remoteContact
}
export function canRemoteContactNpc(state,npc){
 if(!npc||npc.alive===false||npc.known!==true||npc.encountered!==true)return false;
 const system=worldCommunication(state),contact=ensureNpcRemoteContact(state,npc);
 return system.realtime===true&&contact?.established===true&&contact?.blocked!==true
}
export function npcConversationMinutes(state,mode){
 if(mode!=="REMOTE")return 12;
 const c=worldCommunication(state);return c.latency==="INSTANT"?6:c.latency==="NEAR_INSTANT"?10:20
}
