import {isNpcPresent} from "./world-registry.js?v=54018";
import {normalizeCheckBonuses} from "./check-engine.js?v=54018";
import {ensureSurvival,survivalRules} from "./survival-engine.js?v=54018";
import {ensureItemHeritage,ensureItemStory,advanceItemKnowledge,materializeHeritageSeed} from "./item-heritage.js?v=54018";
import {npcItemRecognition,recordNpcItemTestimony} from "./item-recognition.js?v=54018";

const uid=prefix=>prefix+"-"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const CATEGORIES=new Set(["MATERIAL","CONSUMABLE","TOOL","EQUIPMENT","KEY","QUEST","ARTIFACT"]);
const EFFECTS=new Set(["RESTORE_HP","RESTORE_SATIETY","REDUCE_FATIGUE","REDUCE_EXPOSURE","REDUCE_INJURY","REDUCE_MAGIC_STRAIN"]);
const STACKABLE=new Set(["MATERIAL","CONSUMABLE"]);
const POWER_CAP={RESTORE_HP:35,RESTORE_SATIETY:45,REDUCE_FATIGUE:40,REDUCE_EXPOSURE:35,REDUCE_INJURY:30,REDUCE_MAGIC_STRAIN:40};

function uniqStrings(v,max=8){return [...new Set((Array.isArray(v)?v:[]).map(x=>clean(x,50).toUpperCase()).filter(Boolean))].slice(0,max)}
export function itemCategoryLabel(category){
 return {MATERIAL:"素材",CONSUMABLE:"消耗品",TOOL:"工具",EQUIPMENT:"裝備",KEY:"關鍵物品",QUEST:"任務物品",ARTIFACT:"遺物"}[String(category||"").toUpperCase()]||"其他"
}
function effectLabel(type){
 return {RESTORE_HP:"回復生命",RESTORE_SATIETY:"增加飽食度",REDUCE_FATIGUE:"降低疲勞",REDUCE_EXPOSURE:"降低環境暴露",REDUCE_INJURY:"緩解傷勢",REDUCE_MAGIC_STRAIN:"降低魔法負荷"}[type]||type
}
export function normalizeUseEffects(input){
 const rows=Array.isArray(input)?input:(input&&typeof input==="object"?[input]:[]);
 const out=[];
 for(const row of rows.slice(0,3)){
  let type=String(row?.type||"").toUpperCase();if(type==="REDUCE_HUNGER")type="RESTORE_SATIETY";if(!EFFECTS.has(type))continue;
  const amount=Math.round(clamp(row?.amount,1,POWER_CAP[type]||20));
  out.push({type,amount})
 }
 return out
}
function inferCategory(item){
 const raw=String(item?.category||item?.itemType||"").toUpperCase();
 if(CATEGORIES.has(raw))return raw;
 if(item?.consumable===true||normalizeUseEffects(item?.useEffects||item?.useEffect).length)return "CONSUMABLE";
 if(Object.keys(normalizeCheckBonuses(item?.checkBonuses)||{}).length)return "TOOL";
 if(String(item?.source||"").toUpperCase()==="DUNGEON")return "ARTIFACT";
 return "MATERIAL"
}
export function normalizeItem(input={},options={}){
 const category=inferCategory(input),name=clean(input?.name,100);
 if(!name)return null;
 const effects=normalizeUseEffects(input?.useEffects||input?.useEffect);
 const stackable=input?.stackable===true||(input?.stackable!==false&&STACKABLE.has(category));
 const quantity=stackable?Math.round(clamp(input?.quantity??1,1,999)):1;
 return {
  ...input,
  id:clean(input?.id,140)||uid("ITEM"),
  name,
  description:clean(input?.description,320),
  category,
  quantity,
  stackable,
  identified:input?.identified!==false,
  equipped:Boolean(input?.equipped)&&["TOOL","EQUIPMENT"].includes(category),
  consumable:category==="CONSUMABLE",
  useEffects:effects,
  checkBonuses:normalizeCheckBonuses(input?.checkBonuses),
  craftingTags:uniqStrings(input?.craftingTags),
  source:clean(input?.source||options.source,40)||"UNKNOWN"
 }
}
function sameStack(a,b){
 return a.stackable===true&&b.stackable===true&&a.name===b.name&&a.category===b.category&&String(a.evidenceFactId||"")===String(b.evidenceFactId||"")&&JSON.stringify(a.useEffects||[])===JSON.stringify(b.useEffects||[])&&JSON.stringify(a.checkBonuses||{})===JSON.stringify(b.checkBonuses||{})
}
export function ensureItemRuntime(state){
 ensureItemHeritage(state);state.inventory=Array.isArray(state.inventory)?state.inventory:[];
 const normalized=[];
 for(const raw of state.inventory){
  const item=normalizeItem(raw);if(!item)continue;ensureItemStory(state,item);
  const existing=normalized.find(x=>sameStack(x,item));
  if(existing)existing.quantity=Math.min(999,existing.quantity+item.quantity);else normalized.push(item)
 }
 state.inventory=normalized;
 state.crafting??={version:1,recipes:[]};
 state.crafting.version=1;state.crafting.recipes=Array.isArray(state.crafting.recipes)?state.crafting.recipes.map(normalizeRecipe).filter(Boolean):[];
 return state
}
export function addInventoryItem(state,input,options={}){
 ensureItemRuntime(state);const item=normalizeItem(input,options);if(!item)return null;
 const existing=state.inventory.find(x=>sameStack(x,item));
 if(existing){existing.quantity=Math.min(999,existing.quantity+item.quantity);return existing}
 ensureItemStory(state,item);state.inventory.push(item);if(item.heritage?.seedId)materializeHeritageSeed(state,item.heritage.seedId,item.id);return item
}
function removeQuantity(state,item,quantity=1){
 const q=Math.max(1,Math.round(quantity)),idx=state.inventory.findIndex(x=>x.id===item.id);if(idx<0)return false;
 if((item.quantity||1)>q){item.quantity-=q;return true}
 state.inventory.splice(idx,1);return true
}
export function consumeInventoryQuantity(state,itemId,quantity=1){
 ensureItemRuntime(state);const item=state.inventory.find(x=>x.id===itemId||x.name===itemId);if(!item)return {ok:false,reason:"ITEM_NOT_OWNED"};
 const q=Math.max(1,Math.round(Number(quantity)||1));if((Number(item.quantity)||1)<q)return {ok:false,reason:"ITEM_QUANTITY_INSUFFICIENT",item};
 if(item.equipped)return {ok:false,reason:"ITEM_EQUIPPED",item};
 const name=item.name;removeQuantity(state,item,q);return {ok:true,itemName:name,quantity:q}
}
function applyEffect(state,effect){
 const amount=Math.max(1,Number(effect.amount)||1),s=ensureSurvival(state);
 if(effect.type==="RESTORE_HP"){const before=Number(state.player.hp)||0;state.player.hp=Math.min(Number(state.player.maxHp)||100,before+amount);return state.player.hp-before}
 if(effect.type==="RESTORE_SATIETY"){const before=s.satiety;s.satiety=clamp(s.satiety+amount,0,100);return s.satiety-before}
 if(effect.type==="REDUCE_FATIGUE"){const before=s.fatigue;s.fatigue=clamp(s.fatigue-amount,0,100);return before-s.fatigue}
 if(effect.type==="REDUCE_EXPOSURE"){const before=s.exposure;s.exposure=clamp(s.exposure-amount,0,100);return before-s.exposure}
 if(effect.type==="REDUCE_INJURY"){const before=s.injury;s.injury=clamp(s.injury-amount,0,100);return before-s.injury}
 if(effect.type==="REDUCE_MAGIC_STRAIN"){state.player.magic??={capacity:100,strain:0,knownSpells:[],attunements:[]};const before=Number(state.player.magic.strain)||0;state.player.magic.strain=clamp(before-amount,0,Number(state.player.magic.capacity)||100);return before-state.player.magic.strain}
 return 0
}
function refreshSurvivalConditions(state){
 const s=ensureSurvival(state),rules=survivalRules(state);if(!rules.statusEffects){s.conditions=[];return}
 const out=[];if(rules.hunger&&s.satiety<=35)out.push("飢餓");if(rules.fatigue&&s.fatigue>=65)out.push("疲勞");if(s.exposure>=65)out.push("環境暴露");if(s.injury>=55)out.push("傷勢");s.conditions=out
}
export function canUseItem(item){
 const x=normalizeItem(item);return Boolean(x&&x.identified!==false&&x.useEffects.length&&x.category!=="KEY"&&x.category!=="QUEST")
}
export function useItem(state,itemId){
 ensureItemRuntime(state);const item=state.inventory.find(x=>x.id===itemId||x.name===itemId);
 if(!item)return {ok:false,reason:"ITEM_NOT_OWNED"};
 if(item.identified===false)return {ok:false,reason:"ITEM_UNIDENTIFIED",item};
 if(!canUseItem(item))return {ok:false,reason:"ITEM_NOT_USABLE",item};
 const applied=item.useEffects.map(e=>({type:e.type,label:effectLabel(e.type),amount:e.amount,actual:applyEffect(state,e)}));
 refreshSurvivalConditions(state);
 if(item.consumable)removeQuantity(state,item,1);
 state.events??=[];state.events.push({id:uid("EV"),type:"ITEM_USED",visibility:"PLAYER_KNOWN",itemId:item.id,itemName:item.name,effects:applied,day:state.world?.state?.day||1,at:Date.now()});
 return {ok:true,itemName:item.name,consumed:item.consumable,effects:applied}
}
export function itemEffectText(item){
 const x=normalizeItem(item);if(!x||!x.useEffects.length)return "";
 return x.useEffects.map(e=>effectLabel(e.type)+" "+e.amount).join(" · ")
}
export function normalizeRecipe(input){
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const name=clean(input.name,100),rawInputs=Array.isArray(input.inputs)?input.inputs:[],ingredients=[];
 for(const row of rawInputs.slice(0,5)){
  const n=clean(row?.name,100),quantity=Math.round(clamp(row?.quantity??1,1,20));if(n)ingredients.push({name:n,quantity})
 }
 const output=normalizeItem({...input.output,id:clean(input.output?.id,140)||uid("CRAFT"),source:"CRAFTED",equipped:false},{source:"CRAFTED"});
 if(!name||!ingredients.length||!output||["KEY","QUEST"].includes(output.category))return null;
 return {
  id:clean(input.id,140)||uid("RECIPE"),
  name,
  description:clean(input.description,260),
  inputs:ingredients,
  output:{...output,quantity:Math.round(clamp(input.output?.quantity??output.quantity??1,1,10))},
  minutes:Math.round(clamp(input.minutes??30,5,240)),
  source:clean(input.source,60)||"DISCOVERED"
 }
}
export function learnRecipe(state,input,options={}){
 ensureItemRuntime(state);const recipe=normalizeRecipe({...input,source:options.source||input?.source});if(!recipe)return {ok:false,reason:"RECIPE_INVALID"};
 const exists=state.crafting.recipes.find(x=>x.name===recipe.name);if(exists)return {ok:true,recipe:exists,existing:true};
 state.crafting.recipes.push(recipe);state.events??=[];state.events.push({id:uid("EV"),type:"RECIPE_LEARNED",visibility:"PLAYER_KNOWN",recipeId:recipe.id,recipeName:recipe.name,day:state.world?.state?.day||1,at:Date.now()});return {ok:true,recipe,existing:false}
}
function availableByName(state,name){return state.inventory.filter(x=>x.name===name).reduce((n,x)=>n+(Number(x.quantity)||1),0)}
export function recipeStatus(state,recipe){
 ensureItemRuntime(state);const r=typeof recipe==="string"?state.crafting.recipes.find(x=>x.id===recipe||x.name===recipe):normalizeRecipe(recipe);if(!r)return {craftable:false,reason:"RECIPE_NOT_FOUND",missing:[]};
 const missing=r.inputs.map(x=>({name:x.name,need:x.quantity,have:availableByName(state,x.name)})).filter(x=>x.have<x.need);
 return {craftable:missing.length===0,missing,recipe:r}
}
function consumeIngredient(state,name,quantity){
 let remaining=quantity;
 for(const item of [...state.inventory]){
  if(item.name!==name||remaining<=0)continue;
  if(item.equipped)return false;
  const take=Math.min(remaining,Number(item.quantity)||1);removeQuantity(state,item,take);remaining-=take
 }
 return remaining<=0
}
export function craftRecipe(state,recipeId){
 ensureItemRuntime(state);const status=recipeStatus(state,recipeId);if(!status.recipe)return {ok:false,reason:"RECIPE_NOT_FOUND"};
 if(!status.craftable)return {ok:false,reason:"MATERIALS_MISSING",missing:status.missing,recipe:status.recipe};
 for(const input of status.recipe.inputs)if(state.inventory.some(x=>x.name===input.name&&x.equipped))return {ok:false,reason:"INGREDIENT_EQUIPPED",recipe:status.recipe};
 for(const input of status.recipe.inputs)if(!consumeIngredient(state,input.name,input.quantity))return {ok:false,reason:"MATERIALS_CHANGED",recipe:status.recipe};
 const output=addInventoryItem(state,{...status.recipe.output,id:uid("CRAFT"),source:"CRAFTED"},{source:"CRAFTED"});
 state.events??=[];state.events.push({id:uid("EV"),type:"ITEM_CRAFTED",visibility:"PLAYER_KNOWN",recipeId:status.recipe.id,recipeName:status.recipe.name,itemId:output?.id,itemName:output?.name,day:state.world?.state?.day||1,at:Date.now()});
 return {ok:true,recipe:status.recipe,output,minutes:status.recipe.minutes}
}
export function presentItemToNpc(state,itemId,npcId,{give=false}={}){
 ensureItemRuntime(state);const item=state.inventory.find(x=>x.id===itemId||x.name===itemId),npc=(state.world?.registry?.npcs||[]).find(x=>x.id===npcId);
 if(!item)return {ok:false,reason:"ITEM_NOT_OWNED"};if(!npc||npc.known!==true||npc.encountered!==true)return {ok:false,reason:"NPC_NOT_KNOWN"};if(!isNpcPresent(state,npc))return {ok:false,reason:"NPC_NOT_PRESENT"};if(give&&item.equipped)return {ok:false,reason:"ITEM_EQUIPPED"};
 advanceItemKnowledge(state,item.id,{method:"OBSERVE"});
 const recognition=npcItemRecognition(state,item,npc),special=recognition.recognized===true;
 let trustDelta=special?2:give?1:0;trustDelta=Math.max(0,Math.min(2,trustDelta));npc.trust=Math.max(0,Math.min(100,(Number(npc.trust)||0)+trustDelta));npc.memories??=[];
 const action=give?"ITEM_GIVEN":"ITEM_SHOWN",summary=special?`${npc.name} 對「${item.name}」有可辨識的反應；對方能說到哪一層由職業、勢力、歷史連結與個人記憶決定。`:`${npc.name} 注意到你${give?"交出":"展示"}了「${item.name}」，但沒有可靠依據辨認其來歷。`;
 let testimony=null;if(special&&!give)testimony=recordNpcItemTestimony(state,item.id,npc.id,{});
 npc.memories.push({id:uid("MEM"),type:"item",summary,day:state.world?.state?.day||1});npc.memories=npc.memories.slice(-12);
 if(give){const consumed=consumeInventoryQuantity(state,item.id,1);if(!consumed.ok)return consumed}
 state.events??=[];state.events.push({id:uid("EV"),type:action,visibility:"PLAYER_KNOWN",npcId:npc.id,npcName:npc.name,itemId:item.id,itemName:item.name,special,trustDelta,recognition:{level:recognition.level,confidence:recognition.confidence,reasons:recognition.reasons,mayMisidentify:recognition.mayMisidentify,mayWithhold:recognition.mayWithhold},testimonyId:testimony?.testimonyId||null,summary,day:state.world?.state?.day||1,at:Date.now()});
 return {ok:true,action,itemName:item.name,npcId:npc.id,npcName:npc.name,special,trustDelta,recognition,testimonyId:testimony?.testimonyId||null,summary}
}
export function setItemEquipped(state,itemId,equipped=true){
 ensureItemRuntime(state);const item=state.inventory.find(x=>x.id===itemId||x.name===itemId);if(!item)return {ok:false,reason:"ITEM_NOT_OWNED"};
 if(!["TOOL","EQUIPMENT"].includes(item.category))return {ok:false,reason:"ITEM_NOT_EQUIPPABLE",item};
 item.equipped=equipped===true;state.events??=[];state.events.push({id:uid("EV"),type:item.equipped?"ITEM_EQUIPPED":"ITEM_UNEQUIPPED",visibility:"PLAYER_KNOWN",itemId:item.id,itemName:item.name,day:state.world?.state?.day||1,at:Date.now()});
 return {ok:true,itemId:item.id,itemName:item.name,equipped:item.equipped,summary:item.equipped?`你裝備了「${item.name}」。`:`你卸下了「${item.name}」。`}
}
export function craftingSnapshot(state){
 ensureItemRuntime(state);return {recipes:state.crafting.recipes.map(r=>{const status=recipeStatus(state,r);return {id:r.id,name:r.name,description:r.description,inputs:r.inputs,output:{name:r.output.name,category:r.output.category,quantity:r.output.quantity,useEffects:r.output.useEffects,checkBonuses:r.output.checkBonuses},minutes:r.minutes,craftable:status.craftable,missing:status.missing}})}
}
export function resolveItemAction(state,label,roll){
 const q=String(label||"");if(roll?.success===false)return null;ensureItemRuntime(state);
 const mentionedItem=state.inventory.find(x=>x.name&&q.includes(x.name)),mentionedNpc=(state.world?.registry?.npcs||[]).find(x=>x.name&&q.includes(x.name));
 if(/卸下|脫下|unequip|take off/i.test(q)&&mentionedItem)return {handled:true,...setItemEquipped(state,mentionedItem.id,false)};
 if(/裝備|穿上|equip|put on/i.test(q)&&mentionedItem)return {handled:true,...setItemEquipped(state,mentionedItem.id,true)};
 if(/交給|交出|贈送|送給|give|hand over/i.test(q)&&mentionedItem&&mentionedNpc)return {handled:true,...presentItemToNpc(state,mentionedItem.id,mentionedNpc.id,{give:true})};
 if(/展示|出示|拿給.*看|show|present/i.test(q)&&mentionedItem&&mentionedNpc)return {handled:true,...presentItemToNpc(state,mentionedItem.id,mentionedNpc.id,{give:false})};
 if(/使用|食用|進食|吃|喝|飲用|服用|use|eat|drink/i.test(q)){
  const item=state.inventory.find(x=>q.includes(x.name));if(!item)return {handled:true,ok:false,reason:"ITEM_NOT_OWNED"};
  return {handled:true,...useItem(state,item.id)}
 }
 if(/合成|製作|打造|調製|craft|make/i.test(q)){
  const recipe=state.crafting.recipes.find(x=>q.includes(x.name));if(!recipe)return {handled:false};
  return {handled:true,...craftRecipe(state,recipe.id)}
 }
 return null
}
