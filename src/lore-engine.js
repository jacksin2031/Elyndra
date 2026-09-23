const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clean=(v,max=600)=>typeof v==="string"?v.trim().slice(0,max):"";
export function normalizeLore(input){
 if(typeof input==="string"){
  const story=clean(input,800);if(!story)return null;
  return {story,unlockKeywords:[],minMatches:1,known:false,revealedDay:null}
 }
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const story=clean(input.story,800);
 if(!story)return null;
 const unlockKeywords=Array.isArray(input.unlockKeywords)?input.unlockKeywords.map(x=>clean(x,60)).filter(Boolean).slice(0,5):[];
 const minMatches=Math.max(1,Math.min(unlockKeywords.length||1,Number.isInteger(input.minMatches)?input.minMatches:1));
 return {story,unlockKeywords,minMatches,known:Boolean(input.known),revealedDay:input.revealedDay??null}
}
function entries(state){
 const r=state.world?.registry||{};
 return [
  ...(state.inventory||[]).map(x=>({kind:"item",entity:x})),
  ...(r.locations||[]).map(x=>({kind:"location",entity:x})),
  ...(r.npcs||[]).map(x=>({kind:"npc",entity:x})),
  ...(r.factions||[]).map(x=>({kind:"faction",entity:x}))
 ]
}
export function revealStoredLore(state){
 const trustedKnowledge=(state.knowledge||[]).filter(k=>k?.status==="VERIFIED"&&(k.factId||k.historyId));
 const physicalEvidence=(state.inventory||[]).filter(x=>x?.identified!==false&&(x?.source==="DUNGEON"||x?.source==="MARKET"||(x?.evidenceFactId&&(state.knowledge||[]).some(k=>k.factId===x.evidenceFactId&&k.status==="VERIFIED")))).flatMap(x=>[x.name,x.description]);
 const corpus=[...trustedKnowledge.flatMap(k=>[k.title,k.text]),...physicalEvidence].filter(Boolean).join("\n").toLowerCase();
 const revealed=[];
 for(const {kind,entity} of entries(state)){
  const lore=normalizeLore(entity.lore);if(!lore||lore.known)continue;
  const matches=lore.unlockKeywords.filter(k=>corpus.includes(k.toLowerCase())).length;
  if(!lore.unlockKeywords.length||matches<lore.minMatches)continue;
  lore.known=true;lore.revealedDay=state.world?.state?.day??1;entity.lore=lore;if(kind!=="item")entity.known=true;
  const name=clean(entity.name,100)||"未知事物",kid=`LORE-${entity.id||name}`;
  if(!(state.knowledge||[]).some(k=>k.id===kid)){
   state.knowledge.push({id:kid,title:`${name}的故事`,status:"LORE",text:lore.story,sources:[entity.id||kind],score:0});
  }
  state.events??=[];state.events.push({id:uid(),type:"LORE_REVEALED",visibility:"PLAYER_KNOWN",entityId:entity.id,entityType:kind,summary:`理解了「${name}」背後的故事。`,day:state.world?.state?.day??1,at:Date.now()});
  revealed.push({kind,entityId:entity.id,name,story:lore.story})
 }
 return revealed
}
export function visibleLore(entity){const lore=normalizeLore(entity?.lore);return lore?.known?lore.story:""}
export function resolveLocalLoreAction(state,action){
 const q=clean(action,220).toLowerCase();if(!q)return null;
 const inspection=/查看|檢查|閱讀|資訊|資料|故事|來歷|背景|背包|inventory|inspect|lore|history/i.test(q);
 if(!inspection)return null;
 for(const {kind,entity} of entries(state)){
  const name=clean(entity?.name,100);if(!name||!q.includes(name.toLowerCase()))continue;
  if(kind!=="item"&&entity.known!==true)continue;
  const lore=visibleLore(entity),surface=clean(entity.description,400);
  if(lore)return {kind,entityId:entity.id,name,text:`${name}：${lore}`,source:"stored-lore"};
  if(surface)return {kind,entityId:entity.id,name,text:`${name}：${surface}`,source:"stored-description"}
 }
 if(/背包|inventory/i.test(q)){
  const names=(state.inventory||[]).map(x=>x.name).filter(Boolean);
  return {kind:"inventory",text:names.length?`你目前持有：${names.join("、")}。`:"你的背包目前是空的。",source:"local-inventory"}
 }
 return null
}