const obj=v=>v&&typeof v==="object"&&!Array.isArray(v);
const text=v=>typeof v==="string"?v.trim():"";
const list=v=>{
 if(Array.isArray(v))return v;
 if(typeof v==="string")return v.split(/\n|[；;]/).map(x=>x.trim()).filter(Boolean);
 return []
};

export function normalizeWorldCoreCandidate(core){
 if(!obj(core))return core;
 const theme=text(core.worldTheme);if(theme)core.worldTheme=theme;
 const row=core.seedCompliance?.theme;
 if(theme&&obj(row))row.value=theme;
 core.publicFacts=list(core.publicFacts);
 core.hiddenFacts=list(core.hiddenFacts);
 if(obj(core.worldBible?.weatherSystem)){
  const weather=core.worldBible.weatherSystem;
  if(!Array.isArray(weather.phenomena)&&obj(weather.phenomena))weather.phenomena=Object.values(weather.phenomena);
  if(Array.isArray(weather.phenomena))weather.phenomena=weather.phenomena.filter(obj).map((p,i)=>({...p,id:text(p.id)||`WTH-${i+1}`}));
 }
 return core
}

function mergeValue(base,patch){
 if(Array.isArray(patch))return patch.length?structuredClone(patch):structuredClone(Array.isArray(base)?base:patch);
 if(obj(base)&&obj(patch)){const out=structuredClone(base);for(const [k,v] of Object.entries(patch))out[k]=mergeValue(base[k],v);return out}
 return patch==null||patch===""?structuredClone(base):structuredClone(patch)
}
export function mergeWorldCoreCandidates(base,patch){return normalizeWorldCoreCandidate(mergeValue(obj(base)?base:{},obj(patch)?patch:{}))}

export function normalizeCoreAnchorStage(value){
 if(!obj(value))return value;
 const out=structuredClone(value),b=obj(out.worldBible)?out.worldBible:{};
 if(!list(out.publicFacts).length&&list(b.publicFacts).length)out.publicFacts=list(b.publicFacts);
 else out.publicFacts=list(out.publicFacts);
 if(!list(out.hiddenFacts).length&&list(b.hiddenFacts).length)out.hiddenFacts=list(b.hiddenFacts);
 else out.hiddenFacts=list(out.hiddenFacts);
 if(obj(out.worldBible)){delete out.worldBible.publicFacts;delete out.worldBible.hiddenFacts}
 return out
}

export function worldCoreIssues(core){
 const c=normalizeWorldCoreCandidate(core),issues=[];
 if(!obj(c))return ["core"];
 if(!text(c.worldName))issues.push("worldName");
 if(!text(c.worldTheme))issues.push("worldTheme");
 if(!text(c.summary))issues.push("summary");
 if(!obj(c.seedCompliance))issues.push("seedCompliance");
 if(!obj(c.worldBible))issues.push("worldBible");
 else{
  if(!obj(c.worldBible.civilization))issues.push("worldBible.civilization");
  if(!obj(c.worldBible.communication))issues.push("worldBible.communication")
 }
 const weather=c.worldBible?.weatherSystem;
 if(!obj(weather))issues.push("worldBible.weatherSystem");
 else{
  if(!text(weather.identity))issues.push("worldBible.weatherSystem.identity");
  if(!Array.isArray(weather.phenomena)||weather.phenomena.length<2)issues.push("worldBible.weatherSystem.phenomena>=2")
 }
 if(!Array.isArray(c.publicFacts)||c.publicFacts.filter(x=>text(x)).length<2)issues.push("publicFacts>=2");
 if(!Array.isArray(c.hiddenFacts)||c.hiddenFacts.filter(x=>text(x)).length<2)issues.push("hiddenFacts>=2");
 return [...new Set(issues)]
}

export function validWorldCoreCandidate(core){return worldCoreIssues(core).length===0}

const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>text(x)).filter(Boolean))];
export function buildWorldAnchorContract(core,pacing){
 const b=core?.worldBible||{},weather=b.weatherSystem||{};
 return {
  worldName:text(core?.worldName),worldTheme:text(core?.worldTheme),
  startingRegion:text(b.startingRegion),startingSettlement:text(b.startingSettlement),startingLocation:text(b.startingLocation),
  centralConflict:text(b.centralConflict),currentCrisis:text(b.currentCrisis),magicCost:text(b.magicCost),era:text(b.era),tone:text(b.tone),
  civilization:obj(b.civilization)?structuredClone(b.civilization):{},communication:obj(b.communication)?structuredClone(b.communication):{},blueprintProfile:obj(b.blueprintProfile)?structuredClone(b.blueprintProfile):null,
  weatherPhenomena:(Array.isArray(weather.phenomena)?weather.phenomena:[]).map(x=>({id:text(x.id),name:text(x.name),observableName:text(x.observableName)})).filter(x=>x.id),
  publicFacts:uniq(core?.publicFacts).slice(0,4),timelinePacing:structuredClone(pacing||{})
 }
}

function societyHistoryRefs(society){
 const s=obj(society)?society:{},f=obj(s.faction)?s.faction:{};
 return uniq([...(Array.isArray(s.historyRefs)?s.historyRefs:[]),...(Array.isArray(f.historyRefs)?f.historyRefs:[])])
}
function normalizeOpeningSociety(society){
 if(!obj(society))return society;
 const faction=obj(society.faction)?society.faction:{};
 const refs=societyHistoryRefs(society);if(refs.length&&!uniq(society.historyRefs).length)society.historyRefs=refs;
 const factionLocation=text(faction.locationName);if(!text(society.locationRef)&&factionLocation)society.locationRef=factionLocation;
 return society
}
function normalizeOpeningCast(cast){
 if(!obj(cast)||!Array.isArray(cast.npcs))return cast;
 const normalized=[];
 for(const raw of cast.npcs){
  if(!obj(raw))continue;
  const identity=Boolean(text(raw.name)||text(raw.role)||text(raw.locationName));
  if(identity){normalized.push(raw);continue}
  if(raw.lore!=null&&normalized.length&&!normalized.at(-1)?.lore)normalized[normalized.length-1]={...normalized.at(-1),lore:raw.lore}
 }
 cast.npcs=normalized;return cast
}
const FUTURE_CURRENT_STATE=/(?:已經|已開始|已發生|已出現|已滲入|已侵蝕|已爆發|正在|現正|眼下|目前|此刻|現在).{0,18}(?:發生|出現|開始|滲入|滲透|侵蝕|爆發|襲擊|攻擊|撞擊|撞碎|崩壞|失控|蔓延|逼近|入侵)/i;
function semanticFragments(value){
 const src=text(value).normalize("NFKC").toLowerCase(),out=[];
 for(const token of (src.match(/[a-z0-9][a-z0-9_-]{3,}/g)||[]))out.push(token);
 for(const run of (src.match(/[\u3400-\u9fff]{4,}/g)||[]))for(let i=0;i<=run.length-4;i++)out.push(run.slice(i,i+4));
 return [...new Set(out)]
}
function futureSemanticOverlap(body,event){
 const hay=text(body).normalize("NFKC").toLowerCase();if(!hay)return 0;
 const fragments=[...semanticFragments(event?.title),...semanticFragments(event?.observableEffect),...semanticFragments(event?.directorTruth)],seen=new Set();let hits=0;
 for(const fragment of fragments){if(seen.has(fragment))continue;seen.add(fragment);if(hay.includes(fragment)&&++hits>=2)return hits}
 return hits
}
function castPlayerFacingText(cast){
 const rows=[];
 for(const npc of (Array.isArray(cast?.npcs)?cast.npcs:[]))rows.push(text(npc?.description),text(npc?.personality),text(npc?.goal));
 for(const quest of (Array.isArray(cast?.sideQuests)?cast.sideQuests:[]))rows.push(text(quest?.title),text(quest?.objective),...(Array.isArray(quest?.evidenceKeywords)?quest.evidenceKeywords.map(text):[]),...(Array.isArray(quest?.conditions)?quest.conditions.map(text):[]));
 rows.push(...(Array.isArray(cast?.suggestions)?cast.suggestions.map(text):[]));return rows.filter(Boolean)
}
export function openingCastFutureIssues(cast,future){
 const issues=[],rows=castPlayerFacingText(cast),events=Array.isArray(future?.worldTimeline)?future.worldTimeline:[];
 for(const [i,event] of events.entries()){
  if((Number(event?.earliestDay)||1)<=1)continue;
  if(rows.some(row=>FUTURE_CURRENT_STATE.test(row)&&futureSemanticOverlap(row,event)>=2))issues.push("CAST_FUTURE_"+i+"_PREMATURE_CURRENT_STATE")
 }
 return [...new Set(issues)]
}
export function openingCastChronologyIssues(anchor,history,cast){
 const oldHistoryIds=new Set((Array.isArray(history)?history:[]).filter(event=>/(?:[1-9]\d{2,}\s*年|百年|數百年|數世紀|centur|hundred years)/i.test(JSON.stringify(event||{}))).map(event=>text(event?.id)).filter(Boolean));
 if(!oldHistoryIds.size)return [];
 const issues=[],worldText=JSON.stringify(anchor||{});
 for(const [i,npc] of (Array.isArray(cast?.npcs)?cast.npcs:[]).entries()){
  const refs=uniq(npc?.historyRefs);if(!refs.some(id=>oldHistoryIds.has(id)))continue;
  const npcText=JSON.stringify(npc||{});
  if(/後代|後裔|子孫|傳承者|繼承人|後世|descendant|heir|successor/i.test(npcText))continue;
  const firstHand=/(?:曾是|就是|身為|作為|曾任|親自|親歷|參與).{0,24}(?:初代|始祖|創建者|創始者)|(?:初代|始祖|創建者|創始者).{0,24}(?:本人|工程師|成員|領袖|祭司|設計者|研發者)|\b(?:founder|first[- ]generation)\b/i.test(npcText);
  if(!firstHand)continue;
  const longevity=/長壽|延命|延壽|不老|不死|休眠|凍眠|時間停滯|時間凍結|immortal|longevity|lifespan|stasis/i.test(worldText+" "+npcText);
  if(!longevity)issues.push("CAST_NPC_"+i+"_TEMPORAL_PLAUSIBILITY")
 }
 return [...new Set(issues)]
}

export function mergeOpeningRegion(anchor,geography,society){
 const g=obj(geography)?geography:{},s=obj(normalizeOpeningSociety(society))?society:{},location=obj(g.location)?g.location:{};
 return {
  openingHook:text(g.openingHook),
  locations:[{
   ...location,
   name:text(location.name)||anchor.startingLocation,
   region:text(location.region)||anchor.startingRegion,
   historyRefs:uniq([...(Array.isArray(location.historyRefs)?location.historyRefs:[]),...societyHistoryRefs(s)]),
   culture:obj(s.locationCulture)?s.locationCulture:{},
   trade:obj(s.locationTrade)?s.locationTrade:{}
  }],
  factions:obj(s.faction)?[s.faction]:[]
 }
}
export function normalizeFutureLinksToAnchor(future,anchor={},history=[]){
 const out=obj(future)?structuredClone(future):{},histIds=new Set((Array.isArray(history)?history:[]).map(x=>text(x?.id)).filter(Boolean));
 const start=text(anchor?.startingLocation),region=text(anchor?.startingRegion),settlement=text(anchor?.startingSettlement);
 const aliases=new Map([["STARTING_LOCATION",start],["STARTING_REGION",region],["STARTING_SETTLEMENT",settlement],[start,start],[region,region],[settlement,settlement]].filter(([a,b])=>a&&b));
 if(Array.isArray(out.worldTimeline))for(const event of out.worldTimeline){
  const links=obj(event?.links)?event.links:{},historyRefs=uniq(links.historyRefs).filter(id=>histIds.has(id)),locationRefs=uniq(links.locationRefs).map(id=>aliases.get(text(id))||"").filter(Boolean);
  event.links={historyRefs,locationRefs};
  const affected=uniq(event?.affectedRegions).map(id=>aliases.get(text(id))||text(id)).filter(Boolean);
  event.affectedRegions=[...new Set(affected.filter(id=>id===region))];if(!event.affectedRegions.length&&region)event.affectedRegions=[region]
 }
 return out
}
export function worldGenerationLinkIssues({anchor,history,geography,society,future,cast}={}){
 society=normalizeOpeningSociety(society);cast=normalizeOpeningCast(cast);
 const issues=[],histIds=new Set((Array.isArray(history)?history:[]).map(x=>text(x?.id)).filter(Boolean)),start=anchor?.startingLocation||"",region=anchor?.startingRegion||"",settlement=anchor?.startingSettlement||"";
 const location=geography?.location;
 if(!obj(location)||text(location.name)!==start)issues.push("GEOGRAPHY_STARTING_LOCATION_MISMATCH");
 if(!obj(location)||text(location.region)!==region)issues.push("GEOGRAPHY_STARTING_REGION_MISMATCH");
 const checkRefs=(refs,label)=>{const values=uniq(refs);if(!values.length)issues.push(label+"_HISTORY_REF_REQUIRED");else if(values.some(id=>!histIds.has(id)))issues.push(label+"_HISTORY_REF_INVALID")};
 if(obj(society)){
  if(text(society.locationRef)!==start)issues.push("SOCIETY_LOCATION_REF_INVALID");
  checkRefs(societyHistoryRefs(society),"SOCIETY");
  if(obj(society.faction)&&text(society.faction.locationName||start)!==start)issues.push("SOCIETY_FACTION_LOCATION_INVALID")
 }else issues.push("SOCIETY_INVALID");
 for(const [i,event] of (Array.isArray(future?.worldTimeline)?future.worldTimeline:[]).entries()){
  const links=obj(event?.links)?event.links:{};
  if(!uniq(links.historyRefs).length&&!uniq(links.locationRefs).length)issues.push("FUTURE_"+i+"_LINK_REQUIRED");
  if(uniq(links.historyRefs).some(id=>!histIds.has(id)))issues.push("FUTURE_"+i+"_HISTORY_REF_INVALID");
  if(uniq(links.locationRefs).some(id=>![start,region,settlement,"STARTING_LOCATION","STARTING_REGION","STARTING_SETTLEMENT"].includes(id)))issues.push("FUTURE_"+i+"_LOCATION_REF_INVALID");
  if(uniq(event?.affectedRegions).some(id=>![region,"STARTING_REGION"].includes(id)))issues.push("FUTURE_"+i+"_AFFECTED_REGION_INVALID")
 }
 if(obj(cast)){
  for(const [i,npc] of (Array.isArray(cast.npcs)?cast.npcs:[]).entries()){
   if(text(npc?.locationName)!==start)issues.push("CAST_NPC_"+i+"_LOCATION_INVALID");
   const refs=uniq(npc?.historyRefs);if(refs.some(id=>!histIds.has(id)))issues.push("CAST_NPC_"+i+"_HISTORY_REF_INVALID")
  }
  for(const [i,q] of (Array.isArray(cast.sideQuests)?cast.sideQuests:[]).entries()){
   const refs=uniq(q?.historyRefs);if(refs.some(id=>!histIds.has(id)))issues.push("CAST_QUEST_"+i+"_HISTORY_REF_INVALID");
   const hasLink=refs.length||text(q?.factionName)||text(q?.npcName)||text(q?.locationName);
   if(!hasLink)issues.push("CAST_QUEST_"+i+"_LINK_REQUIRED")
  }
  issues.push(...openingCastFutureIssues(cast,future),...openingCastChronologyIssues(anchor,history,cast))
 }
 return [...new Set(issues)]
}

const lvl=v=>Math.max(1,Math.min(5,Math.round(Number(v)||3)));
const scale=v=>["小型","中型","大型"].includes(v)?v:"中型";
const constraintMarker=/^(?:硬性)?(?:必須存在|可以存在|禁止出現|必須|禁止|REQUIRE|ALLOW|FORBID)\s*[:：]/i;
const constraintLeak=v=>constraintMarker.test(text(v))||/(?:硬性)?必須存在界|禁止出現界|可以存在界/.test(text(v));
function stableHash(value){let h=2166136261;for(const ch of String(value||"")){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0}
function fallbackWorldName(genre,seed={}){
 const pools={
  "王道奇幻":["艾爾諾","維爾莎","拉米爾","索恩提亞"],
  "黑暗奇幻":["灰燼環","烏夜界","斷誓域","暮痕界"],
  "東方幻想":["玄霄","雲荒","瀾洲","曜川"],
  "蒸汽魔法":["銅霧聯域","齒輪穹界","蒸星境","鐵虹環"],
  "末日異世界":["餘燼地平","斷日界","灰潮域","殘光環"],
  "自訂世界":["遠序界","歧光域","裂穹環","萬象境"]
 };
 const pool=pools[genre]||pools["自訂世界"],key=seed.worldCreationSeed||seed.masterSeed||seed.prompt||genre;
 return pool[stableHash(key)%pool.length]
}
function fallbackWorldTheme(genre,expected={},seed={}){
 const profile=expected.blueprintProfile||seed.blueprintProfile||seed.creationV2?.blueprintProfile||{},custom=text(profile.customStyleDescription,180);
 if(custom&&!constraintLeak(custom))return custom;
 const req=(Array.isArray(profile.mustExist)?profile.mustExist:[]).map(x=>text(x,40)).filter(Boolean);
 if(req.length)return `${req.slice(0,3).join("、")}共同塑造文明運作、衝突與生存規則`;
 return `${genre}世界中失序法則下的文明生存`
}
export function normalizeWorldIdentity(identity,expected={},seed={}){
 const raw=obj(identity)?identity:{},auto=expected.worldviewMode==="ai";
 const genre=auto?(text(raw.genre)||"奇幻異世界"):text(expected.genre)||"奇幻異世界";
 const resolvedScale=auto?scale(raw.scale):scale(expected.scale);
 const danger=auto?lvl(raw.danger):lvl(expected.danger);
 const magic=auto?lvl(raw.magic):lvl(expected.magic);
 const politics=auto?lvl(raw.politics):lvl(expected.politics);
 const rawTheme=text(raw.worldTheme),worldTheme=rawTheme&&!constraintLeak(rawTheme)?rawTheme:fallbackWorldTheme(genre,expected,seed);
 const rawName=text(raw.worldName),worldName=rawName&&!constraintLeak(rawName)?rawName:fallbackWorldName(genre,seed);
 return {worldName,worldTheme,playerName:text(raw.playerName)||text(seed.playerName),genre,scale:resolvedScale,danger,magic,politics,premise:text(raw.premise)||`「${worldTheme}」塑造文明、危機與日常生存規則。`}
}
export function buildSeedComplianceFromIdentity(identity,expected={}){
 const ev=(value,why)=>({value,evidence:why});
 const out={
  genre:ev(identity.genre,`世界整體風格以「${identity.genre}」為共同基礎。`),
  theme:ev(identity.worldTheme,`世界核心主題「${identity.worldTheme}」直接驅動規則、危機與地方生活。`),
  scale:ev(identity.scale,`世界採用「${identity.scale}」規模，開局只生成最小可玩區域。`),
  danger:ev(identity.danger,`危險度 ${identity.danger}/5 會影響生存壓力與事件密度。`),
  magic:ev(identity.magic,`魔法普及度 ${identity.magic}/5 會影響社會用途、取得方式與代價。`),
  politics:ev(identity.politics,`政治複雜度 ${identity.politics}/5 會影響勢力利益與制度衝突。`)
 };
 if(text(expected.prompt))out.prompt=ev(expected.prompt,"玩家自訂要求被固定為世界生成硬條件，後續子編譯器必須共同遵守。");
 return out
}
export function mergeCoreWave(identity,expected,rules,anchor){
 anchor=normalizeCoreAnchorStage(anchor);
 const r=obj(rules?.worldBible)?rules.worldBible:{},a=obj(anchor?.worldBible)?anchor.worldBible:{};
 return normalizeWorldCoreCandidate({
  worldName:identity.worldName,worldTheme:identity.worldTheme,playerName:identity.playerName,
  summary:text(anchor?.summary)||identity.premise,
  seedCompliance:buildSeedComplianceFromIdentity(identity,expected),
  worldBible:{
   era:text(r.era),centralConflict:text(r.centralConflict),magicCost:text(r.magicCost),ancientTruth:text(r.ancientTruth),currentCrisis:text(r.currentCrisis),tone:text(r.tone),
   civilization:obj(r.civilization)?structuredClone(r.civilization):{},communication:obj(r.communication)?structuredClone(r.communication):{},blueprintProfile:obj(expected?.blueprintProfile)?structuredClone(expected.blueprintProfile):(obj(r.blueprintProfile)?structuredClone(r.blueprintProfile):null),
   startingRegion:text(a.startingRegion),startingSettlement:text(a.startingSettlement),startingLocation:text(a.startingLocation),
   weatherSystem:obj(a.weatherSystem)?structuredClone(a.weatherSystem):{}
  },
  publicFacts:list(anchor?.publicFacts),hiddenFacts:list(anchor?.hiddenFacts)
 })
}
export function coreWaveIssues(identity,rules,anchor,core){
 anchor=normalizeCoreAnchorStage(anchor);
 const issues=worldCoreIssues(core);
 if(!identity?.worldName||!identity?.worldTheme)issues.push("IDENTITY_INVALID");
 const r=rules?.worldBible,a=anchor?.worldBible;
 for(const key of ["era","centralConflict","magicCost","ancientTruth","currentCrisis","tone"])if(!text(r?.[key]))issues.push("CORE_RULES_"+key.toUpperCase());
 for(const key of ["startingRegion","startingSettlement","startingLocation"])if(!text(a?.[key]))issues.push("CORE_ANCHOR_"+key.toUpperCase());
 if(text(core?.worldName)!==text(identity?.worldName))issues.push("CORE_WORLD_NAME_DRIFT");
 if(text(core?.worldTheme)!==text(identity?.worldTheme))issues.push("CORE_THEME_DRIFT");
 return [...new Set(issues)]
}