from pathlib import Path
import re


def replace_once(path, old, new, label):
    p=Path(path); s=p.read_text(encoding='utf-8'); c=s.count(old)
    if c!=1: raise SystemExit(f'{label}: expected 1 anchor, got {c}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# AI-04: required terms need a positive assertion; forbidden scan includes World Bible + Timeline.
p=Path('src/world-creation.js'); s=p.read_text(encoding='utf-8')
old='''function positiveMention(source,term){
 const s=String(source||"").toLocaleLowerCase(),t=String(term||"").toLocaleLowerCase();if(!t)return false;
 let at=s.indexOf(t);
 while(at>=0){
  const before=s.slice(Math.max(0,at-24),at);
  if(!/(沒有|不存在|禁止|不得|不可|不會|未發展|排除|無法使用|不使用|without|forbid|prohibit|no\\s*$)/i.test(before))return true;
  at=s.indexOf(t,at+t.length)
 }
 return false
}'''
new='''function positiveMention(source,term){
 const s=String(source||"").normalize("NFKC").toLocaleLowerCase(),t=String(term||"").normalize("NFKC").toLocaleLowerCase();if(!t)return false;
 let at=s.indexOf(t);
 while(at>=0){
  const before=s.slice(Math.max(0,at-28),at),after=s.slice(at+t.length,Math.min(s.length,at+t.length+24)),around=before+"<TERM>"+after;
  const negated=/(?:沒有|不存在|並不存在|從未存在|禁止|不得|不可|不會|未發展|排除|無法使用|不使用|無此|並無|without|forbid|prohibit|does not exist|do not exist|doesn't exist|never existed|no\\s*$)/i.test(before)||/^(?:並)?(?:不存在|沒有|並無|不會存在|被禁止|is absent|does not exist|is forbidden)/i.test(after.trim())||/(?:不存在|沒有|並無).{0,8}<TERM>/i.test(around);
  if(!negated)return true;
  at=s.indexOf(t,at+t.length)
 }
 return false
}
function positiveRequiredMention(source,term){
 const variants=[String(term||"").trim(),...(REQUIRED_TERM_ALIASES[String(term||"").trim()]||[])].filter(Boolean);
 if(variants.some(v=>positiveMention(source,v)))return true;
 return normalizeRequirementText(term)==="人工智慧"&&/(?:^|[^a-z0-9])a\\.?i\\.?(?:[^a-z0-9]|$)/i.test(String(source||""))&&!/(?:沒有|不存在|禁止|不得|without|no)\\s*.{0,12}a\\.?i\\.?/i.test(String(source||""))
}'''
if old not in s: raise SystemExit('AI-04 positiveMention anchor missing')
s=s.replace(old,new,1)
old=''' const searchable=JSON.stringify({
  worldTheme:candidate?.worldTheme||"",summary:candidate?.summary||"",worldBible:bible,
  publicFacts:candidate?.publicFacts||[],hiddenFacts:candidate?.hiddenFacts||[],worldHistory:candidate?.worldHistory||[],
  generation:candidate?.generation||{}
 }).toLocaleLowerCase();
 for(const term of rules.required||[])if(term&&!requiredElementMentioned(searchable,term))errors.push("WC2_REQUIRED_MISSING:"+term);
 const generated=JSON.stringify({
  theme:candidate?.worldTheme||"",summary:candidate?.summary||"",facts:[...(candidate?.publicFacts||[]),...(candidate?.hiddenFacts||[])],
  history:candidate?.worldHistory||[],generation:candidate?.generation||{}
 });
 for(const term of rules.forbidden||[])if(term&&positiveMention(generated,term))errors.push("WC2_FORBIDDEN_PRESENT:"+term);'''
new=''' const searchable=JSON.stringify({
  worldTheme:candidate?.worldTheme||"",summary:candidate?.summary||"",worldBible:bible,
  publicFacts:candidate?.publicFacts||[],hiddenFacts:candidate?.hiddenFacts||[],worldHistory:candidate?.worldHistory||[],
  worldTimeline:candidate?.worldTimeline||[],generation:candidate?.generation||{}
 });
 for(const term of rules.required||[])if(term&&!positiveRequiredMention(searchable,term))errors.push("WC2_REQUIRED_MISSING:"+term);
 const generated=JSON.stringify({
  theme:candidate?.worldTheme||"",summary:candidate?.summary||"",worldBible:bible,openingHook:candidate?.openingHook||"",
  facts:[...(candidate?.publicFacts||[]),...(candidate?.hiddenFacts||[])],history:candidate?.worldHistory||[],timeline:candidate?.worldTimeline||[],generation:candidate?.generation||{}
 });
 for(const term of rules.forbidden||[])if(term&&positiveMention(generated,term))errors.push("WC2_FORBIDDEN_PRESENT:"+term);'''
if old not in s: raise SystemExit('AI-04 candidate scan anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# AI-04 causal claims: negated mentions can never materialize required claims; canon facts are traceable material.
p=Path('src/generation-claims.js'); s=p.read_text(encoding='utf-8')
old='''function registryEntities(state){
 const r=state.world?.registry||{};return [
  ...(r.locations||[]).map(x=>({kind:"location",id:x.id,name:x.name,description:x.description,historyRefs:x.historyRefs||[]})),
  ...(r.npcs||[]).map(x=>({kind:"npc",id:x.id,name:x.name,description:x.description,historyRefs:x.historyRefs||[]})),
  ...(r.factions||[]).map(x=>({kind:"faction",id:x.id,name:x.name,description:x.description,historyRefs:x.historyRefs||[]})),
  ...(r.sideQuests||[]).map(x=>({kind:"sideQuest",id:x.id,name:x.title,description:x.objective,historyRefs:x.historyRefs||[]}))
 ]}
function searchable(row){return norm([row?.name,row?.description,...(row?.traits||[]),...(row?.regions||[])].filter(Boolean).join(" "))}
export function materialSatisfiesClaim(claim,row){
 if(!claim||!row)return false;
 if(claim.type==="BLUEPRINT_DEFINITION")return String(row.kind||"").toUpperCase()===claim.definitionKind;
 if(claim.type==="REQUIRED_ELEMENT"){const needle=norm(claim.label);return Boolean(needle&&searchable(row).includes(needle))}
 if(claim.type==="HISTORY_ANCHOR")return Boolean(claim.sourceRef&&(row.historyRefs||[]).includes(claim.sourceRef));
 if(claim.type==="FUTURE_ANCHOR")return Boolean((claim.historyRefs||[]).some(id=>(row.historyRefs||[]).includes(id)));
 return false
}'''
new='''function registryEntities(state){
 const r=state.world?.registry||{},facts=Array.isArray(state.world?.canon?.facts)?state.world.canon.facts:[];return [
  ...(r.locations||[]).map(x=>({kind:"location",id:x.id,name:x.name,description:x.description,historyRefs:x.historyRefs||[]})),
  ...(r.npcs||[]).map(x=>({kind:"npc",id:x.id,name:x.name,description:x.description,historyRefs:x.historyRefs||[]})),
  ...(r.factions||[]).map(x=>({kind:"faction",id:x.id,name:x.name,description:x.description,historyRefs:x.historyRefs||[]})),
  ...(r.sideQuests||[]).map(x=>({kind:"sideQuest",id:x.id,name:x.title,description:x.objective,historyRefs:x.historyRefs||[]})),
  ...facts.filter(x=>x?.id).map(x=>({kind:"fact",id:x.id,name:x.title||"",description:x.text||"",historyRefs:x.historyId?[x.historyId]:[]}))
 ]}
function searchableRaw(row){return [row?.name,row?.description,...(row?.traits||[]),...(row?.regions||[])].filter(Boolean).join(" ")}
function positiveMaterialMention(row,term){
 const source=String(searchableRaw(row)||"").normalize("NFKC").toLocaleLowerCase(),needle=String(term||"").normalize("NFKC").toLocaleLowerCase();if(!needle)return false;
 let at=source.indexOf(needle);while(at>=0){const before=source.slice(Math.max(0,at-28),at),after=source.slice(at+needle.length,Math.min(source.length,at+needle.length+24));const negated=/(?:沒有|不存在|並不存在|從未存在|禁止|不得|不可|排除|無此|without|forbid|prohibit|does not exist|never existed|no\\s*$)/i.test(before)||/^(?:並)?(?:不存在|沒有|並無|被禁止|does not exist|is forbidden)/i.test(after.trim());if(!negated)return true;at=source.indexOf(needle,at+needle.length)}return false
}
export function materialSatisfiesClaim(claim,row){
 if(!claim||!row)return false;
 if(claim.type==="BLUEPRINT_DEFINITION")return String(row.kind||"").toUpperCase()===claim.definitionKind;
 if(claim.type==="REQUIRED_ELEMENT")return positiveMaterialMention(row,claim.label);
 if(claim.type==="HISTORY_ANCHOR")return Boolean(claim.sourceRef&&(row.historyRefs||[]).includes(claim.sourceRef));
 if(claim.type==="FUTURE_ANCHOR")return Boolean((claim.historyRefs||[]).some(id=>(row.historyRefs||[]).includes(id)));
 return false
}'''
if old not in s: raise SystemExit('AI-04 generation claim anchor missing')
s=s.replace(old,new,1)
old='export function forbiddenTermMatch(state,value){const hay=norm(typeof value==="string"?value:JSON.stringify(value??{}));return constitutionForbidTerms(state).find(term=>{const needle=norm(term);return needle&&hay.includes(needle)})||null}'
new='''export function forbiddenTermMatch(state,value){
 const source=typeof value==="string"?value:JSON.stringify(value??{});return constitutionForbidTerms(state).find(term=>positiveMaterialMention({description:source},term))||null
}'''
if old not in s: raise SystemExit('AI-04 forbiddenTermMatch anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# AI-04 causal audit scans World Bible, Timeline, History, Futures and Canon facts, not only registry/catalog.
p=Path('src/causal-integrity.js'); s=p.read_text(encoding='utf-8')
old=''' for(const row of worldCatalogDefinitions(state)){const forbidden=forbiddenTermMatch(state,row);if(forbidden)errors.push(issue("FORBIDDEN_CATALOG_MATERIAL",row.id,forbidden))}
 for(const future of state.world.futures||[])for(const hid of future.historicalLinks||[])if(!historyIds.has(hid))errors.push(issue("FUTURE_HISTORY_REF_ORPHAN",future.id,hid));'''
new=''' for(const row of worldCatalogDefinitions(state)){const forbidden=forbiddenTermMatch(state,row);if(forbidden)errors.push(issue("FORBIDDEN_CATALOG_MATERIAL",row.id,forbidden))}
 const forbiddenSurfaces=[
  ["FORBIDDEN_WORLD_BIBLE","WORLD_BIBLE",state.world?.bible||{}],
  ["FORBIDDEN_WORLD_TIMELINE","WORLD_TIMELINE",state.world?.timeline||[]],
  ["FORBIDDEN_WORLD_HISTORY","WORLD_HISTORY",state.world?.history||[]],
  ["FORBIDDEN_WORLD_FUTURE","WORLD_FUTURES",state.world?.futures||[]],
  ["FORBIDDEN_CANON_FACT","CANON_FACTS",state.world?.canon?.facts||[]]
 ];
 for(const [code,ref,value] of forbiddenSurfaces){const forbidden=forbiddenTermMatch(state,value);if(forbidden)errors.push(issue(code,ref,forbidden))}
 for(const future of state.world.futures||[])for(const hid of future.historicalLinks||[])if(!historyIds.has(hid))errors.push(issue("FUTURE_HISTORY_REF_ORPHAN",future.id,hid));'''
if old not in s: raise SystemExit('AI-04 causal audit anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# AI-06: replace text-only magic-law behavior with parsed executable contracts.
Path('src/magic-engine.js').write_text(r'''const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const norm=v=>String(v||"").normalize("NFKC").trim();
function inventoryQty(row){if(row?.quantity===undefined||row?.quantity===null)return 1;const n=Number(row.quantity);return Number.isFinite(n)?n:0}
function lawTrigger(raw){const s=norm(raw);if(/成功(?:施法|施術|施展)|施法成功|successful\s+(?:cast|spell)/i.test(s))return "SUCCESSFUL_CAST";if(/每次(?:施法|施術|施展)|施法時|施術時|each\s+cast|when\s+cast|when\s+casting/i.test(s))return "CAST_ATTEMPT";return null}
export function parseMagicLaw(raw){
 const text=clean(raw,500),trigger=lawTrigger(text);if(!text)return {id:"MAGIC-LAW-EMPTY",text:"",status:"NARRATIVE_ONLY",trigger:null,effect:null,reason:"EMPTY"};
 const mk=(type,amount,extra={})=>({id:"MAGIC-LAW-"+type,text,status:"EXECUTABLE",trigger,effect:{type,amount:clamp(Math.round(Number(amount)||0),1,999),...extra},reason:""});
 let m=text.match(/(?:消耗|損失|扣除|支付|付出|costs?|lose[sd]?|pay[sd]?)\s*(\d+)\s*(?:點)?\s*(?:hp|生命值?|生命力)/i);if(trigger&&m)return mk("HP",m[1]);
 m=text.match(/(?:消耗|增加|承受|支付|付出|costs?|adds?|gain[sd]?)\s*(\d+)\s*(?:點)?\s*(?:魔法負荷|魔力負荷|負荷|strain)/i);if(trigger&&m)return mk("STRAIN",m[1]);
 m=text.match(/(?:消耗|支付|獻上|耗用|consume[sd]?|spend[sd]?|requires?)\s*(\d+)\s*(?:個|枚|份|單位)?\s*([^，。；;,.]{1,28})/i);
 if(trigger&&m){const itemName=clean(m[2],60).replace(/(?:作為代價|才能施法|才可施法|per cast|each cast)$/i,"").trim();if(itemName&&!/^(?:hp|生命值?|生命力|魔法負荷|魔力負荷|負荷|strain)$/i.test(itemName))return mk("ITEM",m[1],{itemName})}
 return {id:"MAGIC-LAW-NARRATIVE",text,status:"NARRATIVE_ONLY",trigger:null,effect:null,reason:trigger?"UNSUPPORTED_EFFECT":"UNSUPPORTED_TRIGGER"}
}
export function ensureMagicRuntime(state){
 const seed=state.world?.seedContract||state.world?.seed||{},cost=String(state.world?.bible?.magicCost||"").trim();
 state.world.magic??={version:2,laws:cost?[cost]:[],schools:[],anomalies:[]};const root=state.world.magic;root.version=2;
 root.laws=Array.isArray(root.laws)?root.laws.map(x=>typeof x==="string"?x:clean(x?.text,500)).filter(Boolean):[];if(cost&&!root.laws.includes(cost))root.laws.unshift(cost);if(!root.laws.length&&cost)root.laws=[cost];root.lawContracts=root.laws.map(parseMagicLaw);
 state.player.magic??={capacity:100,strain:0,knownSpells:[],attunements:[]};const p=state.player.magic;p.capacity=clamp(Number(p.capacity)||100,1,200);p.strain=clamp(Number(p.strain)||0,0,p.capacity);p.knownSpells=Array.isArray(p.knownSpells)?p.knownSpells:[];p.attunements=Array.isArray(p.attunements)?p.attunements:[];
 state.world.magic.prevalence=clamp(Number(seed.magic)||0,0,5);return root
}
export function learnSpell(state,spell){
 ensureMagicRuntime(state);const source=String(spell?.sourceFactId||""),canon=(state.world?.canon?.facts||[]).find(f=>f.id===source),known=(state.knowledge||[]).some(k=>k.factId===source&&k.status==="VERIFIED");if(!canon||!known)return null;
 const name=String(spell?.name||"").trim().slice(0,80);if(!name||!String(canon.text||"").includes(name)||state.player.magic.knownSpells.some(x=>x.name===name))return null;
 const row={id:String(spell?.id||uid("SPL")).slice(0,100),name,school:String(spell?.school||"").slice(0,80),cost:clamp(Math.round(Number(spell?.cost)||10),1,40),effect:String(spell?.effect||"").slice(0,240),sourceFactId:source};state.player.magic.knownSpells.push(row);return row
}
export function magicActionModifier(state,label,kind){ensureMagicRuntime(state);if(!/魔法|施法|術式|咒|spell|cast|magic/i.test(String(label||"")))return 0;const p=state.player.magic,ratio=p.strain/p.capacity;return clamp(ratio>=.9?-3:ratio>=.7?-2:ratio>=.45?-1:0,-3,0)}
function applicableContracts(state,roll){ensureMagicRuntime(state);return state.world.magic.lawContracts.filter(x=>x.status==="EXECUTABLE"&&(x.trigger==="CAST_ATTEMPT"||(x.trigger==="SUCCESSFUL_CAST"&&roll?.success!==false)))}
function findItem(state,name){const target=norm(name).toLocaleLowerCase();return (state.inventory||[]).find(x=>[x?.id,x?.name].some(v=>norm(v).toLocaleLowerCase()===target))||null}
function preflightLawCosts(state,spell,roll){
 const laws=applicableContracts(state,roll),p=state.player.magic;let extraStrain=0;
 for(const law of laws){const e=law.effect;if(e.type==="STRAIN")extraStrain+=e.amount;if(e.type==="HP"&&Number(state.player.hp)<=e.amount)return {ok:false,reason:"MAGIC_LAW_HP_INSUFFICIENT",laws};if(e.type==="ITEM"){const row=findItem(state,e.itemName);if(!row||inventoryQty(row)<e.amount)return {ok:false,reason:"MAGIC_LAW_ITEM_MISSING",laws}}
 }
 if(p.strain+spell.cost+extraStrain>p.capacity)return {ok:false,reason:"MAGIC_CAPACITY_EXCEEDED",laws};return {ok:true,laws}
}
function applyLawCosts(state,laws){
 const effects=[];for(const law of laws){const e=law.effect;if(e.type==="HP"){const before=Number(state.player.hp)||1;state.player.hp=before-e.amount;effects.push({lawId:law.id,type:"HP",amount:e.amount,before,after:state.player.hp})}else if(e.type==="STRAIN"){const before=state.player.magic.strain;state.player.magic.strain=clamp(before+e.amount,0,state.player.magic.capacity);effects.push({lawId:law.id,type:"STRAIN",amount:e.amount,before,after:state.player.magic.strain})}else if(e.type==="ITEM"){const row=findItem(state,e.itemName),before=inventoryQty(row);row.quantity=before-e.amount;effects.push({lawId:law.id,type:"ITEM",itemId:row.id||null,itemName:row.name||e.itemName,amount:e.amount,before,after:row.quantity})}}
 return effects
}
export function resolveMagicAction(state,label,roll){
 ensureMagicRuntime(state);if(!/魔法|施法|術式|咒|spell|cast|magic/i.test(String(label||"")))return null;
 const spell=state.player.magic.knownSpells.find(x=>String(label).includes(x.name));if(!spell)return {handled:true,success:false,reason:"SPELL_NOT_LEARNED"};
 const preflight=preflightLawCosts(state,spell,roll);if(!preflight.ok)return {handled:true,success:false,reason:preflight.reason,lawContracts:preflight.laws};
 const p=state.player.magic,before=p.strain;p.strain=clamp(p.strain+spell.cost,0,p.capacity);let backlash=0;if(roll?.success===false){backlash=Math.max(1,Math.ceil(spell.cost/4));p.strain=clamp(p.strain+backlash,0,p.capacity);state.player.hp=Math.max(1,(Number(state.player.hp)||1)-Math.min(8,backlash))}
 const lawEffects=applyLawCosts(state,preflight.laws),unsupported=state.world.magic.lawContracts.filter(x=>x.status!=="EXECUTABLE").map(x=>x.text),lawStatus=lawEffects.length?"EXECUTED":unsupported.length?"NARRATIVE_ONLY":"NONE";
 const success=roll?.success!==false,summary=success?(lawEffects.length?spell.name+" 被成功施展；Engine 已套用可執行的世界規則代價。":unsupported.length?spell.name+" 被成功施展；世界另有敘事性代價，但 Engine 未宣稱已執行未支援規則。":spell.name+" 被成功施展。"):(spell.name+" 的施術沒有成功，既有施術負荷與反噬由 Engine 結算。");
 const ev={id:uid("MAG"),type:"MAGIC_CAST",visibility:"PLAYER_KNOWN",spellId:spell.id,success,strainBefore:before,strainAfter:p.strain,lawExecution:{status:lawStatus,effects:lawEffects,unsupported},summary,day:state.world?.state?.day||1,at:Date.now()};state.events.push(ev);return {handled:true,success:eventSuccess(ev),event:ev,lawExecution:ev.lawExecution}
}
function eventSuccess(ev){return ev?.success===true}
export function recoverMagic(state,amount=10){ensureMagicRuntime(state);state.player.magic.strain=clamp(state.player.magic.strain-Math.max(0,Number(amount)||0),0,state.player.magic.capacity);return state.player.magic.strain}
export function magicSnapshot(state){ensureMagicRuntime(state);return {prevalence:state.world.magic.prevalence,laws:state.world.magic.laws.slice(0,4),lawContracts:state.world.magic.lawContracts.slice(0,4).map(x=>({text:x.text,status:x.status,trigger:x.trigger,effect:x.effect?structuredClone(x.effect):null,reason:x.reason})),strain:Math.round(state.player.magic.strain),capacity:state.player.magic.capacity,knownSpells:state.player.magic.knownSpells.map(x=>({id:x.id,name:x.name,school:x.school,cost:x.cost,effect:x.effect}))}}
''',encoding='utf-8')

# AI-07: Future snapshot includes dates/status and chronology must be character-specific.
p=Path('src/world-compiler.js'); s=p.read_text(encoding='utf-8')
old='''function normalizeOpeningCast(cast){
 if(!obj(cast)||!Array.isArray(cast.npcs))return cast;
 const normalized=[];
 for(const raw of cast.npcs){
  if(!obj(raw))continue;
  const identity=Boolean(text(raw.name)||text(raw.role)||text(raw.locationName));
  if(identity){normalized.push(raw);continue}
  if(raw.lore!=null&&normalized.length&&!normalized.at(-1)?.lore)normalized[normalized.length-1]={...normalized.at(-1),lore:raw.lore}
 }
 cast.npcs=normalized;return cast
}'''
new='''function normalizeOpeningCast(cast){
 if(!obj(cast)||!Array.isArray(cast.npcs))return cast;
 const normalized=[];
 for(const raw of cast.npcs){
  if(!obj(raw))continue;
  const identity=Boolean(text(raw.name)||text(raw.role)||text(raw.locationName));
  if(identity){if(obj(raw.chronology))raw.chronology={relation:text(raw.chronology.relation)||"CONTEMPORARY",birthEra:text(raw.chronology.birthEra)||"CURRENT",mechanismRef:text(raw.chronology.mechanismRef),mechanism:text(raw.chronology.mechanism)};normalized.push(raw);continue}
  if(raw.lore!=null&&normalized.length&&!normalized.at(-1)?.lore)normalized[normalized.length-1]={...normalized.at(-1),lore:raw.lore}
 }
 cast.npcs=normalized;return cast
}
export function openingCastTimelineSnapshot(future){
 return (Array.isArray(future?.worldTimeline)?future.worldTimeline:[]).map(x=>({id:text(x?.id),title:text(x?.title),earliestDay:Number(x?.earliestDay)||1,latestDay:Number(x?.latestDay)||Number(x?.earliestDay)||1,triggerDay:Number(x?.triggerDay)||null,status:text(x?.status)||"PENDING",observableEffect:text(x?.observableEffect),links:obj(x?.links)?structuredClone(x.links):{historyRefs:[],locationRefs:[]}}))
}'''
if old not in s: raise SystemExit('AI-07 normalize cast anchor missing')
s=s.replace(old,new,1)
old='''export function openingCastChronologyIssues(anchor,history,cast){
 const oldHistoryIds=new Set((Array.isArray(history)?history:[]).filter(event=>/(?:[1-9]\\d{2,}\\s*年|百年|數百年|數世紀|centur|hundred years)/i.test(JSON.stringify(event||{}))).map(event=>text(event?.id)).filter(Boolean));
 if(!oldHistoryIds.size)return [];
 const issues=[],worldText=JSON.stringify(anchor||{});
 for(const [i,npc] of (Array.isArray(cast?.npcs)?cast.npcs:[]).entries()){
  const refs=uniq(npc?.historyRefs);if(!refs.some(id=>oldHistoryIds.has(id)))continue;
  const npcText=JSON.stringify(npc||{});
  if(/後代|後裔|子孫|傳承者|繼承人|後世|descendant|heir|successor/i.test(npcText))continue;
  const firstHand=/(?:曾是|就是|身為|作為|曾任|親自|親歷|參與).{0,24}(?:初代|始祖|創建者|創始者)|(?:初代|始祖|創建者|創始者).{0,24}(?:本人|工程師|成員|領袖|祭司|設計者|研發者)|\\b(?:founder|first[- ]generation)\\b/i.test(npcText);
  if(!firstHand)continue;
  const longevity=/長壽|延命|延壽|不老|不死|休眠|凍眠|時間停滯|時間凍結|immortal|longevity|lifespan|stasis/i.test(worldText+" "+npcText);
  if(!longevity)issues.push("CAST_NPC_"+i+"_TEMPORAL_PLAUSIBILITY")
 }
 return [...new Set(issues)]
}'''
new='''const CHRONOLOGY_MECHANISM=/長壽|延命|延壽|不老|不死|休眠|凍眠|時間停滯|時間凍結|時間位移|immortal|longevity|lifespan|stasis|time displacement/i;
function chronologyBasisValid(anchor,history,npc){
 const c=obj(npc?.chronology)?npc.chronology:{},relation=text(c.relation).toUpperCase(),mechanism=text(c.mechanism),ref=text(c.mechanismRef);if(!["LONG_LIVED","STASIS","TIME_DISPLACED"].includes(relation)||!mechanism||!CHRONOLOGY_MECHANISM.test(mechanism)||!ref)return false;
 if(ref==="WORLD_MAGIC_COST")return CHRONOLOGY_MECHANISM.test(text(anchor?.magicCost));
 const pm=ref.match(/^PUBLIC_FACT:(\\d+)$/);if(pm){const fact=(Array.isArray(anchor?.publicFacts)?anchor.publicFacts:[])[Math.max(0,Number(pm[1])-1)];return Boolean(fact&&CHRONOLOGY_MECHANISM.test(String(fact)))}
 const h=(Array.isArray(history)?history:[]).find(x=>text(x?.id)===ref);return Boolean(h&&CHRONOLOGY_MECHANISM.test(JSON.stringify(h)))
}
export function openingCastChronologyIssues(anchor,history,cast){
 const oldHistoryIds=new Set((Array.isArray(history)?history:[]).filter(event=>/(?:[1-9]\\d{2,}\\s*年|百年|數百年|數世紀|centur|hundred years)/i.test(JSON.stringify(event||{}))).map(event=>text(event?.id)).filter(Boolean));
 if(!oldHistoryIds.size)return [];
 const issues=[];
 for(const [i,npc] of (Array.isArray(cast?.npcs)?cast.npcs:[]).entries()){
  const refs=uniq(npc?.historyRefs);if(!refs.some(id=>oldHistoryIds.has(id)))continue;
  const npcText=JSON.stringify(npc||{});
  if(/後代|後裔|子孫|傳承者|繼承人|後世|descendant|heir|successor/i.test(npcText))continue;
  const firstHand=/(?:曾是|就是|身為|作為|曾任|親自|親歷|參與).{0,24}(?:初代|始祖|創建者|創始者)|(?:初代|始祖|創建者|創始者).{0,24}(?:本人|工程師|成員|領袖|祭司|設計者|研發者)|\\b(?:founder|first[- ]generation)\\b/i.test(npcText);
  if(firstHand&&!chronologyBasisValid(anchor,history,npc))issues.push("CAST_NPC_"+i+"_TEMPORAL_PLAUSIBILITY")
 }
 return [...new Set(issues)]
}'''
if old not in s: raise SystemExit('AI-07 chronology anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Direct generation: import snapshot helper, send complete Future dates/status, require chronology contract.
p=Path('src/ai-client.js'); s=p.read_text(encoding='utf-8')
old='normalizeWorldIdentity,normalizeCoreAnchorStage,mergeCoreWave,coreWaveIssues,buildWorldAnchorContract,mergeOpeningRegion,normalizeFutureLinksToAnchor,worldGenerationLinkIssues'
new='normalizeWorldIdentity,normalizeCoreAnchorStage,mergeCoreWave,coreWaveIssues,buildWorldAnchorContract,mergeOpeningRegion,normalizeFutureLinksToAnchor,worldGenerationLinkIssues,openingCastTimelineSnapshot'
if old not in s: raise SystemExit('AI-07 ai-client import anchor missing')
s=s.replace(old,new,1)
old='''若 NPC 的 historyRefs 指向百年以上的歷史，不可把 NPC 寫成該時代仍存活至今的初代／始祖／創建本人，除非 anchor 或 NPC 明確提供長壽、延命、休眠、時間停滯等足以解釋跨度的機制；否則必須寫成後代、傳承者、繼承人、記錄持有人或其他合理的現代身份。Future Timeline 只代表尚未觸發的可能事件：任何 earliestDay 大於 1 的事件都不可在 NPC description/personality/goal、sideQuest 或 suggestions 寫成 Day 1 已經發生、正在發生或已造成現況；可以寫成擔心、傳聞、預警、準備、防範或可能風險。只有 earliestDay=1 的事件先可以當成開局現況。'''
new='''若 NPC 的 historyRefs 指向百年以上的歷史，不可把 NPC 寫成該時代仍存活至今的初代／始祖／創建本人，除非該 NPC 自己的 chronology 明確提供 LONG_LIVED／STASIS／TIME_DISPLACED，且 mechanismRef 必須指向具體 PUBLIC_FACT:n、HIST-id 或 WORLD_MAGIC_COST 的 Canon 機制；世界其他地方只要出現「長壽」字眼並不算此人物的時間證據。沒有可驗證機制時必須寫成後代、傳承者、繼承人、記錄持有人或其他合理的現代身份。Future Timeline payload 已包含 earliestDay/latestDay/triggerDay/status：任何 earliestDay 大於 1 且未 TRIGGERED 的事件都不可在 NPC description/personality/goal、sideQuest 或 suggestions 寫成 Day 1 已經發生、正在發生或已造成現況；可以寫成擔心、傳聞、預警、準備、防範或可能風險。只有 earliestDay=1 的事件才可作為開局現況。'''
if old not in s: raise SystemExit('AI-07 direct prompt anchor missing')
s=s.replace(old,new,1)
old='future:{worldTimeline:future.worldTimeline.map(x=>({id:x.id,title:x.title,observableEffect:x.observableEffect,links:x.links}))}'
new='future:{worldTimeline:openingCastTimelineSnapshot(future)}'
if old not in s: raise SystemExit('AI-07 direct timeline payload anchor missing')
s=s.replace(old,new,1)
old='known:true,behaviorProfile:{mannerisms:'
new='known:true,chronology:{relation:"CONTEMPORARY|DESCENDANT|LONG_LIVED|STASIS|TIME_DISPLACED",birthEra:"CURRENT 或世界內時代",mechanismRef:"一般角色留空；非常規存活只可 PUBLIC_FACT:n / HIST-id / WORLD_MAGIC_COST",mechanism:"一般角色留空；非常規存活填入對應 Canon 機制"},behaviorProfile:{mannerisms:'
if old not in s: raise SystemExit('AI-07 direct chronology schema anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Server generation mirrors Direct contract.
p=Path('api/world.js'); s=p.read_text(encoding='utf-8')
old='normalizeWorldCoreCandidate,normalizeWorldIdentity,normalizeCoreAnchorStage,mergeCoreWave,coreWaveIssues,buildWorldAnchorContract,mergeOpeningRegion,normalizeFutureLinksToAnchor,worldGenerationLinkIssues'
new='normalizeWorldCoreCandidate,normalizeWorldIdentity,normalizeCoreAnchorStage,mergeCoreWave,coreWaveIssues,buildWorldAnchorContract,mergeOpeningRegion,normalizeFutureLinksToAnchor,worldGenerationLinkIssues,openingCastTimelineSnapshot'
if old not in s: raise SystemExit('AI-07 api import anchor missing')
s=s.replace(old,new,1)
old='''system:"你是 Elyndra Opening Cast Compiler。前面所有世界觀都已鎖定。只生成1個附近 NPC、最多1個支線與3-4個 suggestions；附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true；這只公開人物存在與外觀，不公開 lore、秘密或知識。NPC、任務只能引用既有 Location/Faction/History，不得新增地點、勢力、世界規則或歷史。只輸出 JSON。",'''
new='''system:"你是 Elyndra Opening Cast Compiler。前面所有世界觀都已鎖定。只生成1個附近 NPC、最多1個支線與3-4個 suggestions；附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true；這只公開人物存在與外觀，不公開 lore、秘密或知識。NPC、任務只能引用既有 Location/Faction/History，不得新增地點、勢力、世界規則或歷史。若引用百年以上歷史又聲稱 NPC 是初代／始祖／創建本人，chronology 必須提供 LONG_LIVED／STASIS／TIME_DISPLACED，且 mechanismRef 必須指向 PUBLIC_FACT:n、HIST-id 或 WORLD_MAGIC_COST 的具體 Canon 機制；全世界其他地方的長壽字眼不能代替人物證據。Future Timeline payload 含完整 earliestDay/latestDay/triggerDay/status；earliestDay>1 且未 TRIGGERED 的事件不可寫成 Day 1 已發生。只輸出 JSON。",'''
if old not in s: raise SystemExit('AI-07 api prompt anchor missing')
s=s.replace(old,new,1)
old='future:{worldTimeline:future.worldTimeline.map(x=>({id:x.id,title:x.title,observableEffect:x.observableEffect,links:x.links}))}'
new='future:{worldTimeline:openingCastTimelineSnapshot(future)}'
if old not in s: raise SystemExit('AI-07 api timeline payload anchor missing')
s=s.replace(old,new,1)
old='known:true,behaviorProfile:{mannerisms:'
new='known:true,chronology:{relation:"CONTEMPORARY|DESCENDANT|LONG_LIVED|STASIS|TIME_DISPLACED",birthEra:"CURRENT 或世界內時代",mechanismRef:"一般角色留空；非常規存活只可 PUBLIC_FACT:n / HIST-id / WORLD_MAGIC_COST",mechanism:"一般角色留空；非常規存活填入對應 Canon 機制"},behaviorProfile:{mannerisms:'
if old not in s: raise SystemExit('AI-07 api chronology schema anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# v0.55.1 focused regressions.
Path('test/v0551-world-law-hardening.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createWorldCreationDraft,compileWorldCreation,validateWorldCreationCandidate} from "../src/world-creation.js";
import {materialSatisfiesClaim} from "../src/generation-claims.js";
import {parseMagicLaw,resolveMagicAction} from "../src/magic-engine.js";
import {openingCastChronologyIssues,openingCastTimelineSnapshot} from "../src/world-compiler.js";

function creationSeed({required=[],forbidden=[]}={}){
 return compileWorldCreation(createWorldCreationDraft({masterSeed:"v0551",requiredElements:required,forbiddenElements:forbidden,civilizationCount:1,speciesCount:1,languageCount:1}))
}
function candidate(seed,extra={}){
 return {worldTheme:"測試世界",summary:"穩定世界摘要",worldBible:{blueprintProfile:structuredClone(seed.blueprintProfile),era:"潮曆",centralConflict:"地方衝突",magicCost:"每次成功施法消耗10 HP",ancientTruth:"古代真相",currentCrisis:"港口封鎖",tone:"緊張",...(extra.worldBible||{})},publicFacts:extra.publicFacts||[],hiddenFacts:extra.hiddenFacts||[],worldHistory:extra.worldHistory||[],worldTimeline:extra.worldTimeline||[],generation:extra.generation||{locations:[],npcs:[],factions:[],sideQuests:[]},openingHook:extra.openingHook||""}
}

test("v0.55.1 required element cannot PASS through a negated sentence",()=>{
 const seed=creationSeed({required:["魔法學院"]});
 let r=validateWorldCreationCandidate(seed,candidate(seed,{publicFacts:["此地不存在魔法學院。"]}));assert.equal(r.valid,false);assert.ok(r.errors.includes("WC2_REQUIRED_MISSING:魔法學院"));
 r=validateWorldCreationCandidate(seed,candidate(seed,{publicFacts:["王都設有一所魔法學院，負責訓練術士。"]}));assert.equal(r.errors.some(x=>x.startsWith("WC2_REQUIRED_MISSING:")),false)
});

test("v0.55.1 forbidden content is checked inside World Bible and Timeline",()=>{
 const seed=creationSeed({forbidden:["血月"]});
 let r=validateWorldCreationCandidate(seed,candidate(seed,{worldBible:{currentCrisis:"血月正在升起，港口進入戒嚴。"}}));assert.ok(r.errors.includes("WC2_FORBIDDEN_PRESENT:血月"));
 r=validateWorldCreationCandidate(seed,candidate(seed,{worldTimeline:[{id:"TL-1",title:"血月降臨",earliestDay:3,latestDay:5}]}));assert.ok(r.errors.includes("WC2_FORBIDDEN_PRESENT:血月"))
});

test("v0.55.1 Generation Claim materialization rejects negated mentions",()=>{
 const claim={type:"REQUIRED_ELEMENT",label:"魔法學院"};
 assert.equal(materialSatisfiesClaim(claim,{kind:"location",id:"L1",name:"舊校舍",description:"此地不存在魔法學院。"}),false);
 assert.equal(materialSatisfiesClaim(claim,{kind:"location",id:"L2",name:"星塔魔法學院",description:"仍在運作。"}),true)
});

test("v0.55.1 magic laws expose executable vs narrative-only contracts",()=>{
 assert.deepEqual(parseMagicLaw("成功施法會消耗10 HP").effect,{type:"HP",amount:10});
 assert.equal(parseMagicLaw("成功施法會失去一段童年記憶").status,"NARRATIVE_ONLY")
});
function magicState(cost,inventory=[]){return {world:{seedContract:{magic:3},bible:{magicCost:cost},state:{day:1},canon:{facts:[]}},player:{hp:100,magic:{capacity:100,strain:0,knownSpells:[{id:"S1",name:"火花術",cost:10,effect:"火花"}],attunements:[]}},inventory,events:[],knowledge:[]}}

test("v0.55.1 executable HP magic law creates a real matching state delta",()=>{
 const s=magicState("每次成功施法消耗10 HP"),r=resolveMagicAction(s,"施法 火花術",{success:true});assert.equal(r.success,true);assert.equal(s.player.hp,90);assert.equal(s.player.magic.strain,10);assert.equal(r.lawExecution.status,"EXECUTED");assert.deepEqual(r.lawExecution.effects.map(x=>[x.type,x.amount,x.before,x.after]),[["HP",10,100,90]])
});

test("v0.55.1 unsupported magic law is never falsely claimed as executed",()=>{
 const s=magicState("成功施法會失去一段童年記憶"),r=resolveMagicAction(s,"施法 火花術",{success:true});assert.equal(r.success,true);assert.equal(s.player.hp,100);assert.equal(r.lawExecution.status,"NARRATIVE_ONLY");assert.equal(r.lawExecution.effects.length,0);assert.doesNotMatch(r.event.summary,/已支付|已套用可執行/)
});

test("v0.55.1 executable item magic law checks inventory before mutating cast state",()=>{
 let s=magicState("每次成功施法消耗1個魔晶"),r=resolveMagicAction(s,"施法 火花術",{success:true});assert.equal(r.success,false);assert.equal(r.reason,"MAGIC_LAW_ITEM_MISSING");assert.equal(s.player.magic.strain,0);
 s=magicState("每次成功施法消耗1個魔晶",[{id:"I1",name:"魔晶",quantity:1}]);r=resolveMagicAction(s,"施法 火花術",{success:true});assert.equal(r.success,true);assert.equal(s.inventory[0].quantity,0);assert.equal(r.lawExecution.effects[0].type,"ITEM")
});

test("v0.55.1 chronology requires character-specific canonical mechanism, not unrelated world longevity text",()=>{
 const history=[{id:"HIST-OLD",era:"三百年前",title:"初代建城",summary:"三百年前初代工程師建立城市。"}],anchor={magicCost:"長壽藥存在但只供王族",publicFacts:["王族可使用延壽儀式。"]};
 let cast={npcs:[{name:"洛恩",role:"工程師",description:"他就是三百年前的初代創建者本人。",historyRefs:["HIST-OLD"]}]};assert.deepEqual(openingCastChronologyIssues(anchor,history,cast),["CAST_NPC_0_TEMPORAL_PLAUSIBILITY"]);
 anchor.publicFacts=["延壽儀式可令指定施術者長壽數百年。"];
 cast={npcs:[{name:"洛恩",role:"工程師",description:"他就是三百年前的初代創建者本人。",historyRefs:["HIST-OLD"],chronology:{relation:"LONG_LIVED",birthEra:"舊紀",mechanismRef:"PUBLIC_FACT:1",mechanism:"延壽儀式令本人長壽數百年"}}]};assert.deepEqual(openingCastChronologyIssues(anchor,history,cast),[])
});

test("v0.55.1 CAST timeline snapshot preserves dates, trigger and status in both generation paths",async()=>{
 const snap=openingCastTimelineSnapshot({worldTimeline:[{id:"TL-1",title:"霧潮",earliestDay:3,latestDay:6,triggerDay:4,status:"SCHEDULED",observableEffect:"霧變厚",links:{historyRefs:["H1"],locationRefs:["L1"]}}]});assert.deepEqual(snap[0],{id:"TL-1",title:"霧潮",earliestDay:3,latestDay:6,triggerDay:4,status:"SCHEDULED",observableEffect:"霧變厚",links:{historyRefs:["H1"],locationRefs:["L1"]}});
 const [client,api]=await Promise.all([readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../api/world.js",import.meta.url),"utf8")]);for(const source of [client,api]){assert.match(source,/openingCastTimelineSnapshot\(future\)/);assert.match(source,/chronology:\{relation:/)}
});
''',encoding='utf-8')

# Release version/cache generation.
p=Path('src/version.js'); s=p.read_text(encoding='utf-8');s,n=re.subn(r'APP_VERSION="[^"]+"','APP_VERSION="0.55.1"',s,count=1)
if n!=1: raise SystemExit('version.js anchor missing')
p.write_text(s,encoding='utf-8')
for path in [Path('app.js'),Path('index.html'),*Path('src').rglob('*.js')]:
    text=path.read_text(encoding='utf-8');text=re.sub(r'\?v=\d+','?v=55001',text);path.write_text(text,encoding='utf-8')
for path in Path('test').rglob('*.js'):
    text=path.read_text(encoding='utf-8').replace('55000','55001')
    if path.name in {'version-ui.test.js','version-0550-release.test.js'}: text=text.replace('0.55.0','0.55.1')
    path.write_text(text,encoding='utf-8')
old_release=Path('test/version-0550-release.test.js')
if old_release.exists(): old_release.rename('test/version-0551-release.test.js')
p=Path('test/version-0551-release.test.js')
s=p.read_text(encoding='utf-8').replace('Official v0.55.0 release contract','Official v0.55.1 release contract').replace('v0.55.0 is the canonical app and browser cache release','v0.55.1 is the canonical app and browser cache release').replace('0\\.55\\.0','0\\.55\\.1')
p.write_text(s,encoding='utf-8')

p=Path('README.md'); s=p.read_text(encoding='utf-8');note='''\n## v0.55.1 — World Constraint / Magic Law / Chronology Hardening\n\n- Required world elements must be positively established; negated mentions no longer satisfy generation requirements.\n- Forbidden content is validated across World Bible and Future Timeline as well as generated entities/facts.\n- Magic-law costs are classified as executable Engine contracts or narrative-only rules; unsupported costs are never falsely reported as paid.\n- Opening Cast receives complete Future date/status data and ancient first-hand NPCs require character-specific canonical chronology evidence.\n\n'''
if '## v0.55.1 — World Constraint / Magic Law / Chronology Hardening' not in s:
    m=re.search(r'^# .+?\n',s,re.M);s=s[:m.end()]+note+s[m.end():] if m else note+s;p.write_text(s,encoding='utf-8')
