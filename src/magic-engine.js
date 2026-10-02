import {ensureSurvival} from "./survival-engine.js?v=57025";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const norm=v=>String(v||"").normalize("NFKC").trim();
function inventoryQty(row){if(row?.quantity===undefined||row?.quantity===null)return 1;const n=Number(row.quantity);return Number.isFinite(n)?n:0}
function lawTrigger(raw){const s=norm(raw);if(/成功(?:施法|施術|施展)|施法成功|successful\s+(?:cast|spell)/i.test(s))return "SUCCESSFUL_CAST";if(/每次(?:施法|施術|施展)|施法時|施術時|each\s+cast|when\s+cast|when\s+casting/i.test(s))return "CAST_ATTEMPT";return null}
export function parseMagicLaw(raw){
 const text=clean(raw,500),trigger=lawTrigger(text);if(!text)return {id:"MAGIC-LAW-EMPTY",text:"",status:"NARRATIVE_ONLY",trigger:null,effect:null,reason:"EMPTY"};
 const mk=(type,amount,extra={})=>({id:"MAGIC-LAW-"+type,text,status:"EXECUTABLE",trigger,effect:{type,amount:clamp(Math.round(Number(amount)||0),1,999),...extra},reason:""});
 const amountFrom=(patterns,fallback=1)=>{for(const pattern of patterns){const match=text.match(pattern);if(match)return Math.max(1,Number(match[1])||fallback)}return fallback};
 if(trigger&&/(?:記憶|回憶|memory).{0,16}(?:失去|遺失|喪失|模糊|混亂|損耗|loss|forget|impair)|(?:失去|遺失|喪失|忘掉|forget|lose|loses|loss).{0,20}(?:記憶|回憶|memory)/i.test(text))return mk("MEMORY_LOSS",amountFrom([/(\d+)\s*(?:段|份|個|點|次|units?|points?)?\s*(?:個人)?(?:記憶|回憶|memories|memory)/i,/(?:memory|記憶).{0,18}?(\d+)\s*(?:段|份|點|次|units?|points?)/i]));
 if(trigger&&/(?:腐化|腐蝕|侵蝕|污染|墮落|corrupt(?:ion|s|ed)?|taint|contamination)/i.test(text))return mk("CORRUPTION",amountFrom([/(\d+)\s*(?:點|層|級|percent|%)?\s*(?:腐化|污染|corruption|taint)/i,/(?:corruption|腐化|污染|taint).{0,18}?(\d+)\s*(?:點|層|級|percent|%)?/i]));
 if(trigger&&/(?:肉體.{0,12}(?:代價|損耗|負荷|cost|toll|strain|damage)|身體.{0,12}(?:代價|損耗|負荷|cost|toll|strain|damage)|體力.{0,12}(?:消耗|損耗|代價)|(?:bodily|body|physical).{0,12}(?:cost|toll|strain|damage)|(?:體力|體能|stamina).{0,10}(?:消耗|損耗|cost|loss))/i.test(text))return mk("BODY_COST",amountFrom([/(\d+)\s*(?:點)?\s*(?:體力|體能|體能值|身體|肉體|stamina|body)/i,/(?:body|bodily|physical).{0,18}?(\d+)\s*(?:points?|units?)?/i]));
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
 state.player.magic??={capacity:100,strain:0,knownSpells:[],attunements:[]};const p=state.player.magic;p.capacity=clamp(Number(p.capacity)||100,1,200);p.strain=clamp(Number(p.strain)||0,0,p.capacity);p.knownSpells=Array.isArray(p.knownSpells)?p.knownSpells:[];p.attunements=Array.isArray(p.attunements)?p.attunements:[];p.memoryBurden=clamp(Math.round(Number(p.memoryBurden)||0),0,10);p.memoryEffects=Array.isArray(p.memoryEffects)?p.memoryEffects.slice(-24):[];p.corruption=clamp(Math.round(Number(p.corruption)||0),0,100);
 state.world.magic.prevalence=clamp(Number(seed.magic)||0,0,5);return root
}
export function learnSpell(state,spell){
 ensureMagicRuntime(state);const source=String(spell?.sourceFactId||""),canon=(state.world?.canon?.facts||[]).find(f=>f.id===source),known=(state.knowledge||[]).some(k=>k.factId===source&&k.status==="VERIFIED");if(!canon||!known)return null;
 const name=String(spell?.name||"").trim().slice(0,80);if(!name||!String(canon.text||"").includes(name)||state.player.magic.knownSpells.some(x=>x.name===name))return null;
 const row={id:String(spell?.id||uid("SPL")).slice(0,100),name,school:String(spell?.school||"").slice(0,80),cost:clamp(Math.round(Number(spell?.cost)||10),1,40),effect:String(spell?.effect||"").slice(0,240),sourceFactId:source};state.player.magic.knownSpells.push(row);return row
}
export function magicActionModifier(state,label,kind){ensureMagicRuntime(state);const p=state.player.magic,q=String(label||""),magic=/魔法|施法|術式|咒|spell|cast|magic/i.test(q),recall=/回想|記得|記憶|回憶|追憶|remember|recall|memory/i.test(q);let penalty=0;if(magic){const ratio=p.strain/p.capacity;penalty+=ratio>=.9?-3:ratio>=.7?-2:ratio>=.45?-1:0;if(p.corruption>=80)penalty-=2;else if(p.corruption>=40)penalty-=1}if(recall&&p.memoryBurden>0)penalty-=p.memoryBurden>=6?3:p.memoryBurden>=3?2:1;return clamp(penalty,-3,0)}
function applicableContracts(state,roll){ensureMagicRuntime(state);return state.world.magic.lawContracts.filter(x=>x.status==="EXECUTABLE"&&(x.trigger==="CAST_ATTEMPT"||(x.trigger==="SUCCESSFUL_CAST"&&roll?.success!==false)))}
function findItem(state,name){const target=norm(name).toLocaleLowerCase();return (state.inventory||[]).find(x=>[x?.id,x?.name].some(v=>norm(v).toLocaleLowerCase()===target))||null}
function preflightLawCosts(state,spell,roll){
 const laws=applicableContracts(state,roll),p=state.player.magic;let extraStrain=0;
 for(const law of laws){const e=law.effect;if(e.type==="STRAIN")extraStrain+=e.amount;if(e.type==="HP"&&Number(state.player.hp)<=e.amount)return {ok:false,reason:"MAGIC_LAW_HP_INSUFFICIENT",laws};if(e.type==="ITEM"){const row=findItem(state,e.itemName);if(!row||inventoryQty(row)<e.amount)return {ok:false,reason:"MAGIC_LAW_ITEM_MISSING",laws}}
 }
 if(p.strain+spell.cost+extraStrain>p.capacity)return {ok:false,reason:"MAGIC_CAPACITY_EXCEEDED",laws};return {ok:true,laws}
}
function applyLawCosts(state,laws){
 const effects=[];for(const law of laws){const e=law.effect;if(e.type==="HP"){const before=Number(state.player.hp)||1;state.player.hp=before-e.amount;effects.push({lawId:law.id,type:"HP",amount:e.amount,before,after:state.player.hp})}else if(e.type==="STRAIN"){const before=state.player.magic.strain;state.player.magic.strain=clamp(before+e.amount,0,state.player.magic.capacity);effects.push({lawId:law.id,type:"STRAIN",amount:e.amount,before,after:state.player.magic.strain})}else if(e.type==="ITEM"){const row=findItem(state,e.itemName),before=inventoryQty(row);row.quantity=before-e.amount;effects.push({lawId:law.id,type:"ITEM",itemId:row.id||null,itemName:row.name||e.itemName,amount:e.amount,before,after:row.quantity})}else if(e.type==="MEMORY_LOSS"){const p=state.player.magic,before=p.memoryBurden;p.memoryBurden=clamp(before+e.amount,0,10);const record={id:uid("MEM"),lawId:law.id,kind:"RECALL_IMPAIRED",amount:e.amount,burdenAfter:p.memoryBurden,createdAt:Date.now()};p.memoryEffects.push(record);p.memoryEffects=p.memoryEffects.slice(-24);effects.push({lawId:law.id,type:"MEMORY_LOSS",amount:e.amount,before,after:p.memoryBurden,mechanic:"RECALL_CHECK_PENALTY",preservedKnowledge:true})}else if(e.type==="CORRUPTION"){const p=state.player.magic,before=p.corruption,delta=Math.min(100,e.amount*10);p.corruption=clamp(before+delta,0,100);effects.push({lawId:law.id,type:"CORRUPTION",amount:delta,before,after:p.corruption,mechanic:"MAGIC_CHECK_PENALTY"})}else if(e.type==="BODY_COST"){const s=ensureSurvival(state);if(!s)continue;const before=Number(s.injury)||0,delta=Math.min(50,e.amount);s.injury=clamp(before+delta,0,100);ensureSurvival(state);effects.push({lawId:law.id,type:"BODY_COST",amount:delta,before,after:s.injury,mechanic:"SURVIVAL_INJURY"})}}
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
export function magicSnapshot(state){ensureMagicRuntime(state);return {prevalence:state.world.magic.prevalence,laws:state.world.magic.laws.slice(0,4),lawContracts:state.world.magic.lawContracts.slice(0,4).map(x=>({text:x.text,status:x.status,trigger:x.trigger,effect:x.effect?structuredClone(x.effect):null,reason:x.reason})),strain:Math.round(state.player.magic.strain),capacity:state.player.magic.capacity,memoryBurden:state.player.magic.memoryBurden,memoryEffects:state.player.magic.memoryEffects.slice(-8).map(x=>structuredClone(x)),corruption:state.player.magic.corruption,knownSpells:state.player.magic.knownSpells.map(x=>({id:x.id,name:x.name,school:x.school,cost:x.cost,effect:x.effect}))}}
