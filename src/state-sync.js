const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const DIRTY_KEYS=["location","knowledge","worldNameKnowledge","calendarKnowledge","inventory","npcRelation","faction","quest","worldImpact","generation","timeline","entityReveal","magicLearning","recipe","companion","encounter"];
const EFFECTS=new Set(["MINOR_POSITIVE","POSITIVE","MAJOR_POSITIVE","MINOR_NEGATIVE","NEGATIVE","MAJOR_NEGATIVE"]);
const IMPACT_SCALE=new Set(["MINOR","STANDARD","MAJOR"]);
const PATCH_OPS=new Set(["DISCOVER_FACT","SET_WORLD_NAME_KNOWN","SET_CALENDAR_KNOWN","REVEAL_ENTITY","MOVE_PLAYER","ACQUIRE_ITEM","START_ENCOUNTER","NPC_RELATIONSHIP_SIGNAL","FACTION_REPUTATION_SIGNAL","QUEST_HINT","COMPANION_SIGNAL","LEARN_RECIPE","LEARN_MAGIC","GENERATE_CONTENT","WORLD_IMPACT_SIGNAL","TIMELINE_SIGNAL"]);
const DISCOVERY_SOURCE_KINDS=new Set(["CANON","LOCATION","NPC","EVENT","ITEM","DOCUMENT"]);
const REBASE_SAFE=new Set(["NPC_RELATIONSHIP_SIGNAL","FACTION_REPUTATION_SIGNAL","QUEST_HINT","COMPANION_SIGNAL"]);
const IMMEDIATE_KEYS=new Set(["location","knowledge","worldNameKnowledge","calendarKnowledge","inventory","quest","entityReveal","generation","encounter"]);
const PERSISTENT_KEYS=new Set(["npcRelation","faction","worldImpact","timeline","magicLearning","recipe","companion"]);
const MAJOR=/摧毀|炸毀|燒毀|殺死|處決|征服|佔領|推翻|宣戰|大型儀式|封印|解除封印|改寫|改變世界|城市核心|未知傳送門|destroy|conquer|overthrow|declare war|ritual/i;
const GREETING=/^(?:打招呼|問候|點頭|揮手|致意|say hello|greet)\b|打個招呼|向.+(?:問好|打招呼)/i;
const WORLD_NAME_QUERY=/世界(?:叫|名|名稱)|這(?:個|裡|裏).*(?:世界|地方).*(?:叫|名)|哪個世界|what world|world name/i;
const CALENDAR_QUERY=/日期|今天.*(?:幾|哪)|曆法|日曆|calendar|what date|current date/i;
const PASSIVE_KNOWN=/查看桌面|看看桌面|檢查桌面|重讀|再次閱讀|已知內容|已讀文件|reread|read again/i;
const UNKNOWN_TRAVEL=/未知|未探索|邊境|荒野|傳送門|裂縫|深處|陌生|unknown|unexplored|frontier|portal/i;
const QUEST_WORD=/任務|目標|線索|證據|委託|quest|objective|clue|evidence/i;
const FACTION_WORD=/勢力|陣營|公會|王國|帝國|faction|guild|kingdom|empire/i;
const COMPANION_WORD=/夥伴|同行|加入隊伍|離隊|companion|join party|leave party/i;
const LEARN_MAGIC=/學習.*魔法|學會.*魔法|研習.*法術|領悟.*術式|learn.*spell|learn.*magic/i;
const LEARN_RECIPE=/學習.*配方|研究.*配方|領悟.*製作|learn.*recipe/i;
const ACQUIRE_ITEM_WORD=/撿(?:起|取|走)?|拾(?:起|取|走)?|拿(?:起|走)?|捏起|取下|取走|收起|收入(?:袋|包|背包)?|帶走|採集|收集|取得|獲取|pick\s*up|take\b|collect|gather/i;
const emptyFlags=()=>Object.fromEntries(DIRTY_KEYS.map(k=>[k,false]));
const truthyKeys=flags=>DIRTY_KEYS.filter(k=>flags?.[k]===true);

const PHYSICAL_PICKUP=/撿(?:起|取|走)?|拾(?:起|取|走)?|拿起|捏起|取下|取走|採集|收集|pick\s*up|collect|gather/i;
const normalizeEvidenceText=v=>String(v||"").normalize("NFKC").toLowerCase().replace(/\s+/g,"");
function evidenceMentions(text,name){const a=normalizeEvidenceText(text),b=normalizeEvidenceText(name);return Boolean(a&&b&&a.includes(b))}
function evidenceFragments(value){
 const src=String(value||"").normalize("NFKC").toLowerCase(),out=[];
 for(const token of (src.match(/[a-z0-9][a-z0-9_-]{3,}/g)||[]))out.push(token);
 for(const run of (src.match(/[\u3400-\u9fff]{4,}/g)||[]))for(let i=0;i<=run.length-4;i++)out.push(run.slice(i,i+4));
 return [...new Set(out)].slice(0,120)
}
function evidenceSupportsClaim(evidence,title,body){
 if(evidenceMentions(evidence,title))return true;
 const hay=normalizeEvidenceText(evidence);if(!hay)return false;
 let hits=0;for(const fragment of evidenceFragments(body)){if(hay.includes(normalizeEvidenceText(fragment))&&++hits>=2)return true}
 return false
}
export function groundedPickupItemFromAction(action="",roll={},observableText=""){
 if(roll?.success!==true)return null;
 const q=clean(action,220);if(!q||!PHYSICAL_PICKUP.test(q))return null;
 const m=q.match(/(?:撿(?:起|取|走)?|拾(?:起|取|走)?|拿起|捏起|取下|取走|採集|收集|pick\s*up|collect|gather)\s*(?:那|這)?(?:一)?(?:枚|片|個|塊|份|支|把|件|顆|粒|束|瓶|本|張)?\s*([^，。；、,.;!?！？]{2,28}?)(?=\s*(?:並|然後|再|後|並且|放入|收入|收進|$))/i);
 if(!m)return null;
 const name=clean(m[1],40).replace(/^(?:地上|桌上|眼前|旁邊|附近)(?:的)?/,"").trim();if(name.length<2||!q.includes(name)||!evidenceMentions(observableText,name))return null;
 return {name,description:"由本回合可見敘事確認並由玩家成功拾取的物件；詳細性質尚待確認。",category:"MATERIAL",quantity:1,identified:false,evidenceFactId:"",historyRefs:[],craftingTags:[],useEffects:[],checkBonuses:{}}
}

function repeatedSameAction(snapshot,action){
 const rows=(snapshot?.recentEvents||[]).filter(x=>clean(x?.action,180));
 if(rows.length<2)return false;
 const a=clean(action,180),last=clean(rows.at(-1)?.action,180),prev=clean(rows.at(-2)?.action,180);
 return Boolean(a&&last===a&&prev===a)
}
function capabilitiesFor(flags,keys=null){
 const allowed=keys?new Set(keys):null,out=[],add=(flag,...ops)=>{if(flags?.[flag]&&(!allowed||allowed.has(flag)))for(const op of ops)if(!out.includes(op))out.push(op)};
 add("knowledge","DISCOVER_FACT");add("worldNameKnowledge","SET_WORLD_NAME_KNOWN");add("calendarKnowledge","SET_CALENDAR_KNOWN");add("entityReveal","REVEAL_ENTITY");add("location","MOVE_PLAYER");add("inventory","ACQUIRE_ITEM");add("encounter","START_ENCOUNTER");
 add("npcRelation","NPC_RELATIONSHIP_SIGNAL");add("faction","FACTION_REPUTATION_SIGNAL");add("quest","QUEST_HINT");add("companion","COMPANION_SIGNAL");
 add("recipe","LEARN_RECIPE");add("magicLearning","LEARN_MAGIC");add("generation","GENERATE_CONTENT");add("worldImpact","WORLD_IMPACT_SIGNAL");add("timeline","TIMELINE_SIGNAL");
 return out
}
export function deriveDirtyFlags({action="",intent={},roll={},snapshot={},kernel=null,ruleEffects=null}={}){
 const flags=emptyFlags(),q=clean(action,220),i=String(intent?.intent||"GENERAL").toUpperCase(),kind=String(intent?.kind||roll?.profile?.kind||"GENERAL").toUpperCase(),success=roll?.success===true,criticalFail=String(roll?.grade||"")==="CRITICAL_FAILURE";
 if(ruleEffects?.utility||ruleEffects?.item||ruleEffects?.economy||ruleEffects?.travel||ruleEffects?.survival&&["REST","EAT"].includes(i))return flags;
 if(PASSIVE_KNOWN.test(q))return flags;
 if(GREETING.test(q)&&i==="TALK")return flags;
 if(!success&&!criticalFail){if(["PERSUADE","THREATEN"].includes(i))flags.npcRelation=true;return flags}
 if(i==="OBSERVE"||kind==="OBSERVE"){if(!repeatedSameAction(snapshot,q)){flags.knowledge=true;flags.entityReveal=true}}
 if(i==="TALK"){flags.knowledge=true;if(QUEST_WORD.test(q))flags.quest=true}
 if(i==="PERSUADE"||i==="THREATEN")flags.npcRelation=true;
 if(i==="TRAVEL"||kind==="TRAVEL"){flags.location=true;flags.entityReveal=true;if(UNKNOWN_TRAVEL.test(q))flags.generation=true}
 if(i==="STEAL"){flags.inventory=true;flags.npcRelation=true}
 if(i==="ATTACK")flags.encounter=true;
 if(i==="SNEAK"){flags.entityReveal=true;if(criticalFail)flags.npcRelation=true}
 if(i==="INTERACT"){flags.knowledge=true;flags.entityReveal=true}
 if(success&&ACQUIRE_ITEM_WORD.test(q)){flags.inventory=true;flags.knowledge=true;flags.entityReveal=true}
 if(i==="CAST"&&MAJOR.test(q))flags.worldImpact=true;
 if(LEARN_MAGIC.test(q))flags.magicLearning=true;
 if(LEARN_RECIPE.test(q))flags.recipe=true;
 if(QUEST_WORD.test(q)&&!flags.quest&&["TALK","PERSUADE","THREATEN","INTERACT","GENERAL"].includes(i))flags.quest=true;
 if(FACTION_WORD.test(q))flags.faction=true;
 if(COMPANION_WORD.test(q))flags.companion=true;
 if(MAJOR.test(q)){flags.worldImpact=true;flags.timeline=true;if(/傳送門|未知|新區域|portal|unknown region/i.test(q))flags.generation=true}
 if(WORLD_NAME_QUERY.test(q))flags.worldNameKnowledge=true;
 if(CALENDAR_QUERY.test(q))flags.calendarKnowledge=true;
 return flags
}
export function planStateSync({action="",intent={},roll={},snapshot={},kernel=null,ruleEffects=null}={}){
 const dirtyFlags={...(kernel?.dirtyFlags||deriveDirtyFlags({action,intent,roll,snapshot,ruleEffects}))};
 if(ruleEffects?.utility||ruleEffects?.item||ruleEffects?.economy||ruleEffects?.travel){dirtyFlags.inventory=false;dirtyFlags.location=false;dirtyFlags.entityReveal=false}
 const dirty=truthyKeys(dirtyFlags),immediateDirty=dirty.filter(k=>IMMEDIATE_KEYS.has(k)),deferredDirty=dirty.filter(k=>PERSISTENT_KEYS.has(k)),q=clean(action,220);
 const deep=Boolean(snapshot?.combat?.active||MAJOR.test(q));
 let mode=deep?"DEEP":immediateDirty.length?"FAST":deferredDirty.length?"DEFERRED":"ENGINE_ONLY";
 const immediateCapabilities=capabilitiesFor(dirtyFlags,IMMEDIATE_KEYS),deferredCapabilities=capabilitiesFor(dirtyFlags,PERSISTENT_KEYS);
 const capabilities=mode==="DEEP"?capabilitiesFor(dirtyFlags):mode==="FAST"?immediateCapabilities:mode==="DEFERRED"?deferredCapabilities:[];
 return {version:2,mode,dirtyFlags,dirty,immediateDirty,deferredDirty,capabilities,immediateCapabilities,deferredCapabilities,requiresStateAI:mode!=="ENGINE_ONLY",blocking:mode==="FAST"||mode==="DEEP",deferred:mode==="DEFERRED",hasDeferredConsequences:mode==="FAST"&&deferredCapabilities.length>0}
}
export function deferredPlanFrom(plan={},baseRevision=0){
 return {...plan,mode:"DEFERRED",blocking:false,deferred:true,requiresStateAI:(plan.deferredCapabilities||[]).length>0,capabilities:[...(plan.deferredCapabilities||[])],dirty:[...(plan.deferredDirty||[])],baseRevision:Number(baseRevision)||0}
}
export function ensureStateSyncRuntime(state){
 state.stateSync??={revision:0,lastCommitAt:0,lastReason:"",history:[]};
 const rt=state.stateSync;rt.revision=Math.max(0,Math.round(Number(rt.revision)||0));rt.lastCommitAt=Math.max(0,Number(rt.lastCommitAt)||0);rt.lastReason=clean(rt.lastReason,80);rt.history=Array.isArray(rt.history)?rt.history.slice(-40):[];
 return rt
}
export function currentStateRevision(state){return ensureStateSyncRuntime(state).revision}
export function bumpStateRevision(state,reason="ENGINE"){
 const rt=ensureStateSyncRuntime(state);rt.revision+=1;rt.lastCommitAt=Date.now();rt.lastReason=clean(reason,80);rt.history.push({revision:rt.revision,reason:rt.lastReason,at:rt.lastCommitAt});rt.history=rt.history.slice(-40);return rt.revision
}
export function statePatchSchema(plan={}){
 const allowed=new Set(plan.capabilities||[]),rows=[];
 if(allowed.has("DISCOVER_FACT"))rows.push('{"op":"DISCOVER_FACT","title":"...","text":"...","factId":"","evidenceType":"OBSERVED|HEARD|READ|EXAMINED","sourceKind":"CANON|LOCATION|NPC|EVENT|ITEM|DOCUMENT","sourceId":"既有且本回合可觀察的 id 或唯一名稱"}');
 if(allowed.has("SET_WORLD_NAME_KNOWN"))rows.push('{"op":"SET_WORLD_NAME_KNOWN"}');
 if(allowed.has("SET_CALENDAR_KNOWN"))rows.push('{"op":"SET_CALENDAR_KNOWN"}');
 if(allowed.has("REVEAL_ENTITY"))rows.push('{"op":"REVEAL_ENTITY","kind":"location|npc|faction|sideQuest","id":"既有 id 或唯一名稱"}');
 if(allowed.has("MOVE_PLAYER"))rows.push('{"op":"MOVE_PLAYER","location":"既有或本回合生成地點名"}');
 if(allowed.has("ACQUIRE_ITEM"))rows.push('{"op":"ACQUIRE_ITEM","item":{"name":"必須原樣使用 action 中被拾取／拿取的物件名稱","description":"只描述本回合可直接感知的性質","category":"MATERIAL|CONSUMABLE|TOOL|EQUIPMENT|KEY|QUEST|ARTIFACT","quantity":1,"identified":true,"evidenceFactId":"","historyRefs":[],"craftingTags":[],"useEffects":[],"checkBonuses":{}}}');
 if(allowed.has("START_ENCOUNTER"))rows.push('{"op":"START_ENCOUNTER","enemy":{"name":"...","description":"...","level":1,"hp":20,"defense":11,"damage":6,"element":"PHYSICAL|FIRE|ICE|LIGHTNING|POISON|ARCANE|HOLY|SHADOW|NATURE|PSYCHIC|NONE","weaknesses":[],"resistances":[],"abilities":[],"loot":""}}');
 if(allowed.has("NPC_RELATIONSHIP_SIGNAL"))rows.push('{"op":"NPC_RELATIONSHIP_SIGNAL","npcId":"已知 NPC id","effect":"MINOR_POSITIVE|POSITIVE|MAJOR_POSITIVE|MINOR_NEGATIVE|NEGATIVE|MAJOR_NEGATIVE"}');
 if(allowed.has("FACTION_REPUTATION_SIGNAL"))rows.push('{"op":"FACTION_REPUTATION_SIGNAL","factionId":"已知勢力 id","effect":"MINOR_POSITIVE|POSITIVE|MAJOR_POSITIVE|MINOR_NEGATIVE|NEGATIVE|MAJOR_NEGATIVE"}');
 if(allowed.has("QUEST_HINT"))rows.push('{"op":"QUEST_HINT","title":null,"objective":"可驗證下一步"}');
 if(allowed.has("COMPANION_SIGNAL"))rows.push('{"op":"COMPANION_SIGNAL","npcId":"已知 NPC id","effect":"OFFER|LEAVE","reason":"..."}');
 if(allowed.has("LEARN_RECIPE"))rows.push('{"op":"LEARN_RECIPE","recipe":{"name":"...","description":"...","inputs":[{"name":"...","quantity":1}],"output":{"name":"...","description":"...","category":"MATERIAL|CONSUMABLE|TOOL|EQUIPMENT|ARTIFACT","quantity":1,"useEffects":[],"checkBonuses":{},"craftingTags":[]},"minutes":30}}');
 if(allowed.has("LEARN_MAGIC"))rows.push('{"op":"LEARN_MAGIC","spell":{"name":"...","school":"...","cost":10,"effect":"...","sourceFactId":"既有 fact id"}}');
 if(allowed.has("GENERATE_CONTENT"))rows.push('{"op":"GENERATE_CONTENT","generation":{"locations":[],"npcs":[],"factions":[],"sideQuests":[]}}');
 if(allowed.has("WORLD_IMPACT_SIGNAL"))rows.push('{"op":"WORLD_IMPACT_SIGNAL","scope":"PERSONAL|LOCAL|REGIONAL|FACTION|WORLD","targetKind":"location|npc|faction|world","targetId":"既有 id|CURRENT_LOCATION|WORLD","axis":"safety|prosperity|supply|infrastructure|stability|resources|influence|trust|tension|crisisPressure","effect":"MINOR_POSITIVE|POSITIVE|MAJOR_POSITIVE|MINOR_NEGATIVE|NEGATIVE|MAJOR_NEGATIVE","title":"...","summary":"...","reason":"...","outcome":"BENEFIT|COST|MIXED"}');
 if(allowed.has("TIMELINE_SIGNAL"))rows.push('{"op":"TIMELINE_SIGNAL","timelineId":"既有 timeline id","action":"DELAY|ADVANCE|WEAKEN|STRENGTHEN","scale":"MINOR|STANDARD|MAJOR","title":"...","summary":"..."}');
 return '{"baseRevision":'+Math.max(0,Number(plan.baseRevision)||0)+',"operations":['+rows.join(",")+']}'
}
export function validateStatePatch(patch,plan={}){
 if(patch&&typeof patch==="object"&&!Array.isArray(patch)){
  if(!Array.isArray(patch.operations)&&PATCH_OPS.has(String(patch.op||"").toUpperCase())){const op=structuredClone(patch);delete op.baseRevision;patch.operations=[op]}
  if(Array.isArray(patch.operations)&&(!Number.isInteger(Number(patch.baseRevision))||Number(patch.baseRevision)<0))patch.baseRevision=Math.max(0,Math.round(Number(plan.baseRevision)||0))
 }
 const errors=[];if(!patch||typeof patch!=="object"||Array.isArray(patch))return {valid:false,errors:["STATE_PATCH_INVALID"]};
 if(!Number.isInteger(Number(patch.baseRevision))||Number(patch.baseRevision)<0)errors.push("STATE_PATCH_BASE_REVISION_INVALID");
 if(Number(patch.baseRevision)!==Number(plan.baseRevision))errors.push("STATE_PATCH_BASE_REVISION_MISMATCH");
 const operations=Array.isArray(patch.operations)?patch.operations:[];
 if(!Array.isArray(patch.operations))errors.push("STATE_PATCH_OPERATIONS_INVALID");
 if(operations.length>10)errors.push("STATE_PATCH_OPERATIONS_LIMIT_EXCEEDED");
 const allowed=new Set(plan.capabilities||[]);
 for(const raw of operations){
  const type=String(raw?.op||"").toUpperCase();if(!PATCH_OPS.has(type)||!allowed.has(type)){errors.push("STATE_PATCH_OPERATION_NOT_ALLOWED:"+type);continue}
  if(type==="DISCOVER_FACT"){
   if(!clean(raw.title,100)||!clean(raw.text,500))errors.push("STATE_PATCH_DISCOVERY_INVALID");
   const sourceKind=String(raw.sourceKind||"").toUpperCase(),sourceId=clean(raw.sourceId,120),factId=clean(raw.factId,120);
   if(!DISCOVERY_SOURCE_KINDS.has(sourceKind)||!sourceId)errors.push("STATE_PATCH_DISCOVERY_GROUNDING_REQUIRED");
   if(sourceKind==="CANON"&&(!factId||factId!==sourceId))errors.push("STATE_PATCH_DISCOVERY_CANON_SOURCE_INVALID")
  }
  if(type==="REVEAL_ENTITY"&&(!["location","npc","faction","sideQuest"].includes(raw.kind)||!clean(raw.id,120)))errors.push("STATE_PATCH_REVEAL_INVALID");
  if(type==="MOVE_PLAYER"&&!clean(raw.location,120))errors.push("STATE_PATCH_MOVE_INVALID");
  if(type==="ACQUIRE_ITEM"&&!clean(raw.item?.name,100))errors.push("STATE_PATCH_ITEM_INVALID");
  if(type==="START_ENCOUNTER"&&!clean(raw.enemy?.name,100))errors.push("STATE_PATCH_ENCOUNTER_INVALID");
  if(["NPC_RELATIONSHIP_SIGNAL","FACTION_REPUTATION_SIGNAL"].includes(type)&&!EFFECTS.has(String(raw.effect||"").toUpperCase()))errors.push("STATE_PATCH_RELATION_INVALID");
  if(type==="NPC_RELATIONSHIP_SIGNAL"&&!clean(raw.npcId,120))errors.push("STATE_PATCH_NPC_INVALID");
  if(type==="FACTION_REPUTATION_SIGNAL"&&!clean(raw.factionId,120))errors.push("STATE_PATCH_FACTION_INVALID");
  if(type==="COMPANION_SIGNAL"&&(!clean(raw.npcId,120)||!["OFFER","LEAVE"].includes(String(raw.effect||"").toUpperCase())))errors.push("STATE_PATCH_COMPANION_INVALID");
  if(type==="LEARN_RECIPE"&&!clean(raw.recipe?.name,120))errors.push("STATE_PATCH_RECIPE_INVALID");
  if(type==="LEARN_MAGIC"&&(!clean(raw.spell?.name,120)||!clean(raw.spell?.sourceFactId,120)))errors.push("STATE_PATCH_MAGIC_INVALID");
  if(type==="GENERATE_CONTENT"&&(!raw.generation||typeof raw.generation!=="object"||Array.isArray(raw.generation)))errors.push("STATE_PATCH_GENERATION_INVALID");
  if(type==="WORLD_IMPACT_SIGNAL"&&!EFFECTS.has(String(raw.effect||"").toUpperCase()))errors.push("STATE_PATCH_WORLD_IMPACT_INVALID");
  if(type==="TIMELINE_SIGNAL"&&(!clean(raw.timelineId,120)||!["DELAY","ADVANCE","WEAKEN","STRENGTHEN"].includes(String(raw.action||"").toUpperCase())||!IMPACT_SCALE.has(String(raw.scale||"").toUpperCase())))errors.push("STATE_PATCH_TIMELINE_INVALID")
 }
 return {valid:errors.length===0,errors:[...new Set(errors)]}
}
function currentLocationRecord(state){
 const rows=state?.world?.registry?.locations||[],name=clean(state?.player?.location||state?.world?.state?.location,120);
 return rows.find(x=>x?.id===name||x?.name===name)||null
}
function registryEntity(state,kind,value){
 const key=kind==="npc"?"npcs":kind==="location"?"locations":kind==="faction"?"factions":kind==="sideQuest"?"sideQuests":"",rows=key?state?.world?.registry?.[key]||[]:[];
 const exact=rows.find(x=>x?.id===value||x?.name===value||x?.title===value);if(exact)return exact;
 const normalized=String(value||"").normalize("NFKC").replace(/\s+/g,"").toLowerCase();if(!normalized)return null;
 const matches=rows.filter(x=>[x?.name,x?.title].some(label=>String(label||"").normalize("NFKC").replace(/\s+/g,"").toLowerCase()===normalized));
 return matches.length===1?matches[0]:null
}
function canonicalizeDiscoverySource(state,raw){
 const sourceKind=String(raw?.sourceKind||"").toUpperCase(),sourceId=clean(raw?.sourceId,120);if(!sourceId)return raw;
 if(sourceKind==="NPC"){const npc=registryEntity(state,"npc",sourceId);if(npc?.id)return {...raw,sourceId:npc.id}}
 if(sourceKind==="LOCATION"){const loc=registryEntity(state,"location",sourceId);if(loc?.id)return {...raw,sourceId:loc.id}}
 return raw
}
function sourceEvidenceText(state,raw,context={}){
 const direct=clean(context?.observableText,2400),sourceKind=String(raw?.sourceKind||"").toUpperCase(),sourceId=clean(raw?.sourceId,120),registry=state?.world?.registry||{};
 const out=[];if(direct)out.push(direct);
 if(sourceKind==="NPC"){
  const npc=(registry.npcs||[]).find(x=>x?.id===sourceId||x?.name===sourceId),npcId=npc?.id||sourceId;
  for(const e of (state?.events||[]).slice(-12))if(e?.type==="NPC_CONVERSATION"&&e?.npcId===npcId&&e?.visibility!=="INTERNAL")out.push(clean(e.summary,900))
 }
 if(sourceKind==="DOCUMENT"){const doc=(state?.world?.documents?.documents||[]).find(x=>x?.id===sourceId&&x?.read===true);if(doc)out.push([doc.title,...(doc.claims||[]).map(x=>x?.text)].filter(Boolean).join(" "))}
 if(sourceKind==="ITEM"){const item=(state?.inventory||[]).find(x=>x?.id===sourceId);if(item)out.push([item.name,item.description].filter(Boolean).join(" "))}
 if(sourceKind==="EVENT"){const event=(state?.events||[]).find(x=>x?.id===sourceId&&x?.visibility!=="INTERNAL");if(event)out.push(clean(event.summary,900))}
 return out.join("\n")
}
export function playerVisibleEvidenceText(state,extra=""){
 const out=[];const direct=clean(extra,2400);if(direct)out.push(direct);const narrative=clean(state?.narrative,1200);if(narrative)out.push(narrative);
 for(const e of (state?.events||[]).slice(-20))if(e?.type==="NPC_CONVERSATION"&&e?.visibility!=="INTERNAL")out.push(clean(e.summary,900));
 for(const doc of (state?.world?.documents?.documents||[]).filter(x=>x?.read===true).slice(-20))out.push([clean(doc?.title,160),...(doc?.claims||[]).map(x=>clean(x?.text,700))].filter(Boolean).join(" "));
 return out.join("\n")
}
function discoverySourceGrounded(state,raw){
 const sourceKind=String(raw?.sourceKind||"").toUpperCase(),sourceId=clean(raw?.sourceId,120),registry=state?.world?.registry||{},current=currentLocationRecord(state);
 if(!DISCOVERY_SOURCE_KINDS.has(sourceKind)||!sourceId)return false;
 if(sourceKind==="CANON"){
  const factId=clean(raw?.factId,120);return factId===sourceId&&(state?.world?.canon?.facts||[]).some(f=>f?.id===sourceId&&String(f?.visibility||"").toLowerCase()==="public")
 }
 if(sourceKind==="LOCATION")return Boolean(current&&(current.id===sourceId||current.name===sourceId));
 if(sourceKind==="NPC"){
  const npc=(registry.npcs||[]).find(x=>x?.id===sourceId||x?.name===sourceId),lock=String(npc?.visibilityLock||"").toUpperCase(),visible=Boolean(npc&&(npc.known===true||npc.encountered===true||["OBSERVED","KNOWN","REVEALED"].includes(lock)));
  const present=Boolean(npc&&current&&(npc.locationId===current.id||npc.locationName===current.name||npc.location===current.name));
  return visible&&present
 }
 if(sourceKind==="EVENT")return (state?.events||[]).some(e=>e?.id===sourceId&&e?.visibility!=="INTERNAL");
 if(sourceKind==="ITEM")return (state?.inventory||[]).some(i=>i?.id===sourceId);
 if(sourceKind==="DOCUMENT")return (state?.world?.documents?.documents||[]).some(d=>d?.id===sourceId&&d?.read===true);
 return false
}
function discoveryNameGrounded(state,raw,context={}){
 const title=clean(raw?.title,100),body=clean(raw?.text,500);return Boolean(title&&body&&evidenceSupportsClaim(sourceEvidenceText(state,raw,context),title,body))
}
function acquiredItemGrounded(state,raw,context={}){
 const name=clean(raw?.item?.name,100);return Boolean(name&&evidenceMentions(playerVisibleEvidenceText(state,context?.observableText),name))
}
function travelIntentGrounded(context={},action=""){
 const kind=String(context?.intent?.kind||context?.roll?.profile?.kind||"").toUpperCase();return kind==="TRAVEL"||/前往|移動|走向|走到|進入|抵達|沿著|循著|travel|move|go to|enter/i.test(action)
}
export function groundStatePatch(state,patch={},context={}){
 const next=structuredClone(patch||{}),accepted=[],rejected=[],deferredEvidence=[],action=clean(context?.action,220),ops=Array.isArray(next.operations)?next.operations:[],generatedLocations=new Set(ops.filter(x=>String(x?.op||"").toUpperCase()==="GENERATE_CONTENT").flatMap(x=>(x?.generation?.locations||[]).flatMap(loc=>[clean(loc?.id,120),clean(loc?.name,120)])).filter(Boolean));
 for(const [index,original] of ops.entries()){
  const type=String(original?.op||"").toUpperCase();let raw=original;
  if(type==="DISCOVER_FACT"){
   raw=canonicalizeDiscoverySource(state,raw);
   if(!discoverySourceGrounded(state,raw)){rejected.push({index,op:type,sourceKind:String(raw?.sourceKind||"").toUpperCase(),sourceId:clean(original?.sourceId,120),reason:"DISCOVERY_SOURCE_NOT_OBSERVABLE"});continue}
   if(!discoveryNameGrounded(state,raw,context)){rejected.push({index,op:type,title:clean(raw?.title,100),reason:"KNOWLEDGE_EVIDENCE_NOT_OBSERVED"});deferredEvidence.push(structuredClone(raw));continue}
  }
  if(type==="REVEAL_ENTITY"){
   const entity=registryEntity(state,String(raw?.kind||""),clean(raw?.id,120));
   if(entity?.id)raw={...raw,id:entity.id};else{rejected.push({index,op:type,kind:String(raw?.kind||""),id:clean(raw?.id,120),reason:"ENTITY_REVEAL_NOT_CANONICAL"});continue}
  }
  const explicitOutcomeFailure=context?.roll?.success===false;
  if(type==="ACQUIRE_ITEM"&&explicitOutcomeFailure){rejected.push({index,op:type,itemName:clean(raw?.item?.name,100),reason:"ENGINE_OUTCOME_FAILURE"});continue}
  if(type==="ACQUIRE_ITEM"&&!acquiredItemGrounded(state,raw,context)){rejected.push({index,op:type,itemName:clean(raw?.item?.name,100),reason:"ITEM_NAME_NOT_OBSERVED"});deferredEvidence.push(structuredClone(raw));continue}
  if(type==="MOVE_PLAYER"&&explicitOutcomeFailure){rejected.push({index,op:type,location:clean(raw?.location,120),reason:"ENGINE_OUTCOME_FAILURE"});continue}
  if(type==="MOVE_PLAYER"){
   const target=clean(raw?.location,120),current=clean(state?.player?.location||state?.world?.state?.location,120),locations=state?.world?.registry?.locations||[],entity=locations.find(x=>x?.id===target||x?.name===target);
   if(!target){rejected.push({index,op:type,location:target,reason:"MOVE_TARGET_NOT_CANONICAL"});continue}
   if(!entity&&!generatedLocations.has(target)){
    const observable=clean(context?.observableText,2400);
    if(travelIntentGrounded(context,action)&&evidenceMentions(observable,target)){
     accepted.push({...raw,materializeLocation:{name:target,type:"可到達地點",region:clean(state?.world?.state?.region,80),description:`「${target}」已在本回合可見敘事中被確認為可實際前往的地點。`,known:true}});continue
    }
    rejected.push({index,op:type,location:target,reason:"MOVE_TARGET_NOT_CANONICAL"});if(travelIntentGrounded(context,action))deferredEvidence.push(structuredClone(raw));continue
   }
   if(entity&&(entity?.name===current||entity?.id===current)){rejected.push({index,op:type,location:target,reason:"MOVE_TARGET_UNCHANGED"});continue}
  }
  accepted.push(raw)
 }
 next.operations=accepted;return {patch:next,rejected,deferredEvidence}
}
function semanticWorldImpact(raw){
 const kind=String(raw.targetKind||""),axis=clean(raw.axis,40),allowed={location:new Set(["safety","prosperity","supply","infrastructure","stability"]),npc:new Set(["trust"]),faction:new Set(["resources","influence","stability"]),world:new Set(["tension","crisisPressure"])};
 if(!allowed[kind]?.has(axis))return null;
 return {scope:String(raw.scope||"LOCAL").toUpperCase(),targetKind:kind,targetId:clean(raw.targetId,120),title:clean(raw.title,120)||"世界狀態改變",summary:clean(raw.summary,400)||"玩家行動造成可持久觀察的改變。",reason:clean(raw.reason,300)||"由玩家本回合行動直接造成",outcome:String(raw.outcome||"MIXED").toUpperCase(),mutations:[{field:axis,op:"DELTA",effect:String(raw.effect||"").toUpperCase()}],consequences:[],timelineEffects:[]}
}
export function statePatchToCandidate(patch,state){
 const c={narrative:String(state?.narrative||"狀態已同步。"),suggestions:[...(state?.suggestions||[])],suggestionIntents:[...(state?.suggestionIntents||[])],discoveries:[],items:[],npcChanges:[],factionChanges:[],companionChanges:[],recipes:[],magicLearning:[],entityReveals:[],worldImpacts:[]};
 const timeline=[];
 for(const raw of patch?.operations||[]){
  const type=String(raw?.op||"").toUpperCase();
  if(type==="DISCOVER_FACT")c.discoveries.push({title:clean(raw.title,100),text:clean(raw.text,500),factId:clean(raw.factId,120),evidenceType:String(raw.evidenceType||"OBSERVED").toUpperCase(),sourceKind:String(raw.sourceKind||"").toUpperCase(),sourceId:clean(raw.sourceId,120)});
  else if(type==="SET_WORLD_NAME_KNOWN")c.worldNameKnown=true;
  else if(type==="SET_CALENDAR_KNOWN")c.calendarKnown=true;
  else if(type==="REVEAL_ENTITY")c.entityReveals.push({kind:raw.kind,id:clean(raw.id,120)});
  else if(type==="MOVE_PLAYER"){if(raw.materializeLocation){c.generation??={locations:[],npcs:[],factions:[],sideQuests:[]};c.generation.locations??=[];c.generation.locations.push(structuredClone(raw.materializeLocation))}c.location=clean(raw.location,120)}
  else if(type==="ACQUIRE_ITEM")c.items.push(structuredClone(raw.item));
  else if(type==="START_ENCOUNTER")c.encounter={type:"combat",enemy:structuredClone(raw.enemy)}
  else if(type==="NPC_RELATIONSHIP_SIGNAL")c.npcChanges.push({npcId:clean(raw.npcId,120),trustEffect:String(raw.effect||"").toUpperCase()});
  else if(type==="FACTION_REPUTATION_SIGNAL")c.factionChanges.push({factionId:clean(raw.factionId,120),reputationEffect:String(raw.effect||"").toUpperCase()});
  else if(type==="QUEST_HINT")c.quest={title:raw.title==null?null:clean(raw.title,120),objective:raw.objective==null?null:clean(raw.objective,240)};
  else if(type==="COMPANION_SIGNAL")c.companionChanges.push({npcId:clean(raw.npcId,120),action:String(raw.effect||"").toUpperCase(),reason:clean(raw.reason,240)});
  else if(type==="LEARN_RECIPE")c.recipes.push(structuredClone(raw.recipe));
  else if(type==="LEARN_MAGIC")c.magicLearning.push(structuredClone(raw.spell));
  else if(type==="GENERATE_CONTENT")c.generation=structuredClone(raw.generation);
  else if(type==="WORLD_IMPACT_SIGNAL"){const x=semanticWorldImpact(raw);if(x)c.worldImpacts.push(x)}
  else if(type==="TIMELINE_SIGNAL")timeline.push(raw)
 }
 for(const raw of timeline.slice(0,2)){
  const n=String(raw.scale||"MINOR").toUpperCase()==="MAJOR"?3:String(raw.scale||"MINOR").toUpperCase()==="STANDARD"?2:1;
  c.worldImpacts.push({scope:"WORLD",targetKind:"world",targetId:"WORLD",title:clean(raw.title,120)||"世界時間線受到影響",summary:clean(raw.summary,400)||"玩家行動改變了未來事件的壓力或時機。",reason:"由玩家本回合行動直接造成",outcome:"MIXED",mutations:[],consequences:[],timelineEffects:[{timelineId:clean(raw.timelineId,120),action:String(raw.action||"").toUpperCase(),days:n,amount:n}]})
 }
 return c
}
export function assessPatchRevision(state,patch,plan={}){
 const current=currentStateRevision(state),base=Number(patch?.baseRevision);
 if(base===current)return {ok:true,rebased:false,currentRevision:current};
 const ops=Array.isArray(patch?.operations)?patch.operations:[],safe=plan.mode==="DEFERRED"&&ops.length>0&&ops.every(x=>REBASE_SAFE.has(String(x?.op||"").toUpperCase()));
 return safe?{ok:true,rebased:true,rebasedFrom:base,currentRevision:current}:{ok:false,stale:true,currentRevision:current,baseRevision:base}
}