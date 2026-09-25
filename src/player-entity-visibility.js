const clean=(v,max=180)=>typeof v==="string"?v.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,max):"";
const uid=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
function unknownAlias(npc){
 const explicit=clean(npc?.observableAlias||npc?.playerAlias,80);if(explicit)return explicit;
 return "眼前的陌生人"
}
export function npcNameKnown(state,npc){
 if(!npc)return false;
 if(npc.nameKnown===true||npc.companion?.status==="ACTIVE")return true;
 return (state?.events||[]).some(e=>e?.type==="NPC_NAME_REVEALED"&&String(e.npcId||"")===String(npc.id||""))
}
export function playerVisibleNpcName(state,npc){
 if(!npc)return "陌生人";
 return npcNameKnown(state,npc)?(clean(npc.name,80)||"熟悉的人"):unknownAlias(npc)
}
export function revealNpcNameFromEvidence(state,npc,{answer="",reason="NPC_SELF_IDENTIFICATION"}={}){
 const name=clean(npc?.name,80);if(!state||!npc||!name||npcNameKnown(state,npc))return false;
 if(!String(answer||"").includes(name))return false;
 npc.nameKnown=true;state.events??=[];
 state.events.push({id:"EV-"+uid(),type:"NPC_NAME_REVEALED",visibility:"PLAYER_KNOWN",npcId:npc.id,reason,summary:`你確認對方的稱呼是「${name}」。`,day:Number(state.world?.state?.day)||1,at:Date.now()});
 return true
}

function nearCanonicalName(candidate,canonical){const a=[...clean(candidate,24)],b=[...clean(canonical,24)];if(a.length!==b.length||a.length<2||a.length>8)return false;let diff=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i]&&++diff>1)return false;return diff===1}
export function canonicalizeNpcIdentityText(state,npc,value=""){
 let out=String(value||"");const canonical=clean(npc?.name,80);if(!canonical||!npcNameKnown(state,npc))return out;
 out=out.replace(/((?:我叫|我是|叫我|稱呼我(?:為)?|我的名字是|名字是)\s*[「『"“]?)([\u3400-\u9fff·・\-]{2,12})/g,(all,prefix,candidate)=>nearCanonicalName(candidate,canonical)?prefix+canonical:all);
 out=out.replace(/^([\u3400-\u9fff·・\-]{2,12})(?=[：:])/,(all,candidate)=>nearCanonicalName(candidate,canonical)?canonical:all);
 return out
}
export function redactUnknownNpcNames(state,value=""){
 let out=String(value||"");for(const npc of state?.world?.registry?.npcs||[]){const name=clean(npc?.name,80);if(name&&!npcNameKnown(state,npc))out=out.split(name).join(playerVisibleNpcName(state,npc))}return out
}
export function projectPlayerVisibleRegistry(state,registry={}){
 const canonical=state?.world?.registry?.npcs||[];
 return {...registry,npcs:(registry?.npcs||[]).map(row=>{const npc=canonical.find(x=>String(x.id||"")===String(row.id||""))||row;return {...row,name:playerVisibleNpcName(state,npc),description:redactUnknownNpcNames(state,row.description||"")}})}
}
