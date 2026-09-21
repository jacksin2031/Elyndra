const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
export function ensureMagicRuntime(state){
 const seed=state.world?.seedContract||state.world?.seed||{},cost=String(state.world?.bible?.magicCost||"").trim();
 state.world.magic??={version:1,laws:cost?[cost]:[],schools:[],anomalies:[]};state.world.magic.laws=Array.isArray(state.world.magic.laws)?state.world.magic.laws:[];
 state.player.magic??={capacity:100,strain:0,knownSpells:[],attunements:[]};const p=state.player.magic;p.capacity=clamp(Number(p.capacity)||100,1,200);p.strain=clamp(Number(p.strain)||0,0,p.capacity);p.knownSpells=Array.isArray(p.knownSpells)?p.knownSpells:[];p.attunements=Array.isArray(p.attunements)?p.attunements:[];
 state.world.magic.prevalence=clamp(Number(seed.magic)||0,0,5);return state.world.magic
}
export function learnSpell(state,spell){
 ensureMagicRuntime(state);const source=String(spell?.sourceFactId||""),canon=(state.world?.canon?.facts||[]).find(f=>f.id===source),known=(state.knowledge||[]).some(k=>k.factId===source&&k.status==="VERIFIED");if(!canon||!known)return null;
 const name=String(spell?.name||"").trim().slice(0,80);if(!name||!String(canon.text||"").includes(name)||state.player.magic.knownSpells.some(x=>x.name===name))return null;
 const row={id:String(spell?.id||uid("SPL")).slice(0,100),name,school:String(spell?.school||"").slice(0,80),cost:clamp(Math.round(Number(spell?.cost)||10),1,40),effect:String(spell?.effect||"").slice(0,240),sourceFactId:source};state.player.magic.knownSpells.push(row);return row
}
export function magicActionModifier(state,label,kind){
 ensureMagicRuntime(state);if(!/魔法|施法|術式|咒|spell|cast|magic/i.test(String(label||"")))return 0;const p=state.player.magic,ratio=p.strain/p.capacity;return clamp(ratio>=.9?-3:ratio>=.7?-2:ratio>=.45?-1:0,-3,0)
}
export function resolveMagicAction(state,label,roll){
 ensureMagicRuntime(state);if(!/魔法|施法|術式|咒|spell|cast|magic/i.test(String(label||"")))return null;
 const spell=state.player.magic.knownSpells.find(x=>String(label).includes(x.name));if(!spell)return {handled:true,success:false,reason:"SPELL_NOT_LEARNED"};
 const p=state.player.magic;if(p.strain+spell.cost>p.capacity)return {handled:true,success:false,reason:"MAGIC_CAPACITY_EXCEEDED"};
 const before=p.strain;p.strain=clamp(p.strain+spell.cost,0,p.capacity);let backlash=0;if(roll?.success===false){backlash=Math.max(1,Math.ceil(spell.cost/4));p.strain=clamp(p.strain+backlash,0,p.capacity);state.player.hp=Math.max(1,(Number(state.player.hp)||1)-Math.min(8,backlash))}
 const ev={id:uid("MAG"),type:"MAGIC_CAST",visibility:"PLAYER_KNOWN",spellId:spell.id,success:roll?.success!==false,strainBefore:before,strainAfter:p.strain,summary:roll?.success===false?spell.name+" 的施術沒有成功，代價反噬到施術者。":spell.name+" 被成功施展，並支付了這個世界規則要求的施術代價。",day:state.world?.state?.day||1,at:Date.now()};state.events.push(ev);return {handled:true,success:ev.success,event:ev}
}
export function recoverMagic(state,amount=10){ensureMagicRuntime(state);state.player.magic.strain=clamp(state.player.magic.strain-Math.max(0,Number(amount)||0),0,state.player.magic.capacity);return state.player.magic.strain}
export function magicSnapshot(state){ensureMagicRuntime(state);return {prevalence:state.world.magic.prevalence,laws:state.world.magic.laws.slice(0,4),strain:Math.round(state.player.magic.strain),capacity:state.player.magic.capacity,knownSpells:state.player.magic.knownSpells.map(x=>({id:x.id,name:x.name,school:x.school,cost:x.cost,effect:x.effect}))}}
