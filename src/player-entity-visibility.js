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
export function redactUnknownNpcNames(state,value=""){
 let out=String(value||"");for(const npc of state?.world?.registry?.npcs||[]){const name=clean(npc?.name,80);if(name&&!npcNameKnown(state,npc))out=out.split(name).join(playerVisibleNpcName(state,npc))}return out
}
export function projectPlayerVisibleRegistry(state,registry={}){
 const canonical=state?.world?.registry?.npcs||[];
 return {...registry,npcs:(registry?.npcs||[]).map(row=>{const npc=canonical.find(x=>String(x.id||"")===String(row.id||""))||row;return {...row,name:playerVisibleNpcName(state,npc),description:redactUnknownNpcNames(state,row.description||"")}})}
}
