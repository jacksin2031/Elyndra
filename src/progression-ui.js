import {questSnapshot} from "./quest-engine.js?v=320";
import {notesSnapshot,addNote,updateNote,deleteNote} from "./notes-engine.js?v=320";
import {ensureItemRuntime,itemCategoryLabel,itemEffectText,canUseItem,craftingSnapshot} from "./item-engine.js?v=43000";
import {ensureWorldRegistry,isNpcPresent} from "./world-registry.js?v=320";
import {saveWorldSlot,loadWorldSlot,listWorldSaves,deleteWorldSlot,exportWorld} from "./storage.js?v=44000";

const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const $=s=>document.querySelector(s);
const qsa=s=>Array.from(document.querySelectorAll(s));

export function openJournalUI(state,openModal,persist,section="quests"){
 const qs=questSnapshot(state),notes=notesSnapshot(state);
 let tabs='<div class="settings-actions"><button class="'+(section==="quests"?"primary":"ghost")+'" data-journal-section="quests">任務</button><button class="'+(section==="knowledge"?"primary":"ghost")+'" data-journal-section="knowledge">世界知識</button><button class="'+(section==="notes"?"primary":"ghost")+'" data-journal-section="notes">我的筆記</button></div>';
 let body="";
 if(section==="quests"){
  const side=qs.side||[];
  body='<div class="lore-list"><div class="lore-item"><small>MAIN QUEST · '+esc(qs.main.status||"ACTIVE")+'</small><h3>'+esc(qs.main.title)+'</h3><p>'+((qs.main.objectives||[]).map(esc).join("<br>")||"目前沒有主線目標")+'</p></div>';
  body+=side.map(q=>'<div class="lore-item"><small>SIDE QUEST · '+esc(q.status)+' · '+q.progress+'/'+q.target+'</small><h3>'+esc(q.title)+'</h3><p>'+esc(q.objective||"")+'</p><small>'+(q.conditions?'Engine 條件 '+q.conditions+' 項；物品、狀態與事件會自動驗證。':"依據可驗證線索推進。")+'</small></div>').join("");
  if(!side.length)body+='<div class="lore-item"><p>目前沒有已知支線任務。</p></div>';
  body+='</div>';
 }else if(section==="knowledge"){
  body='<div class="lore-list">'+((state.knowledge||[]).map(x=>'<div class="lore-item"><small>'+esc(x.status)+'</small><h3>'+esc(x.title)+'</h3><p>'+esc(x.text)+'</p></div>').join("")||'<div class="lore-item"><p>你尚未確認任何異世界知識。</p></div>')+'</div>';
 }else{
  body='<form id="noteForm" class="settings-grid"><label>標題<input id="noteTitle" maxlength="120" placeholder="例如：進入古塔前要準備的東西"></label><label class="full">內容<textarea id="noteText" maxlength="2000" placeholder="自由記錄自己的想法、推理或待辦事項"></textarea></label><button class="primary" type="submit">新增筆記</button></form>';
  body+='<div class="lore-list">'+(notes.map(n=>'<div class="lore-item"><small>DAY '+n.day+' · '+esc(n.location||"未知地點")+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(n.text)+'</p><div class="settings-actions"><button class="ghost" data-note-edit="'+esc(n.id)+'">編輯</button><button class="ghost danger-ghost" data-note-delete="'+esc(n.id)+'">刪除</button></div></div>').join("")||'<div class="lore-item"><p>你仲未寫任何私人筆記。</p></div>')+'</div>';
 }
 openModal('<div class="eyebrow">WORLD JOURNAL</div><h2>世界手帳</h2><p class="muted">任務由 Engine 驗證；世界知識只包括真正發現的情報；私人筆記只屬於你。</p>'+tabs+body);
 qsa("#modalContent [data-journal-section]").forEach(b=>b.onclick=()=>openJournalUI(state,openModal,persist,b.dataset.journalSection));
 $("#noteForm")?.addEventListener("submit",async e=>{e.preventDefault();const r=addNote(state,{title:$("#noteTitle")?.value,text:$("#noteText")?.value});if(!r.ok)return;await persist();openJournalUI(state,openModal,persist,"notes")});
 qsa("#modalContent [data-note-delete]").forEach(b=>b.onclick=async()=>{deleteNote(state,b.dataset.noteDelete);await persist();openJournalUI(state,openModal,persist,"notes")});
 qsa("#modalContent [data-note-edit]").forEach(b=>b.onclick=async()=>{const note=(state.notes||[]).find(x=>x.id===b.dataset.noteEdit);if(!note)return;const title=prompt("筆記標題",note.title);if(title==null)return;const text=prompt("筆記內容",note.text);if(text==null)return;updateNote(state,note.id,{title,text});await persist();openJournalUI(state,openModal,persist,"notes")})
}

export function openInventoryUI(state,openModal,persist,runAction,{category="ALL",mode="items"}={}){
 ensureItemRuntime(state);
 const categories=["ALL","CONSUMABLE","MATERIAL","TOOL","EQUIPMENT","KEY","QUEST","ARTIFACT"];
 const items=state.inventory.filter(x=>category==="ALL"||x.category===category);
 const present=ensureWorldRegistry(state).npcs.filter(n=>n.known===true&&n.encountered===true&&isNpcPresent(state,n));
 let tabs='<div class="settings-actions"><button class="'+(mode==="items"?"primary":"ghost")+'" data-inventory-mode="items">物品</button><button class="'+(mode==="craft"?"primary":"ghost")+'" data-inventory-mode="craft">合成</button></div>';
 let body="";
 if(mode==="items"){
  const filters='<div class="settings-actions">'+categories.map(k=>'<button class="'+(category===k?"primary":"ghost")+'" data-item-category="'+k+'">'+(k==="ALL"?"全部":itemCategoryLabel(k))+'</button>').join("")+'</div>';
  const cards=items.map(x=>{
   const effect=itemEffectText(x),bonus=Object.entries(x.checkBonuses||{}).filter(([,v])=>Number(v)).map(([k,v])=>k+" "+(v>0?"+":"")+v).join(" · ");
   let actions='<div class="settings-actions">';
   if(canUseItem(x))actions+='<button class="primary" data-item-use="'+esc(x.id)+'">使用</button>';
   if(["TOOL","EQUIPMENT"].includes(x.category)&&Object.keys(x.checkBonuses||{}).length)actions+='<button class="'+(x.equipped?"ghost":"secondary")+'" data-item-equip="'+esc(x.id)+'">'+(x.equipped?"卸下":"裝備")+'</button>';
   actions+='</div>';
   if(present.length){
    actions+='<details><summary>向附近 NPC 展示／交付</summary><div class="settings-actions">'+present.map(n=>'<button class="ghost" data-item-show="'+esc(x.id)+'" data-npc-id="'+esc(n.id)+'">向 '+esc(n.name)+' 展示</button><button class="ghost" data-item-give="'+esc(x.id)+'" data-npc-id="'+esc(n.id)+'">交給 '+esc(n.name)+'</button>').join("")+'</div></details>';
   }
   return '<div class="lore-item"><small>'+esc(itemCategoryLabel(x.category))+(x.quantity>1?' · ×'+x.quantity:"")+(x.equipped?" · EQUIPPED":"")+'</small><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||"暫時沒有更多描述。")+'</p>'+(effect?'<small>'+esc(effect)+'</small>':"")+(bonus?'<small>'+esc(bonus)+'</small>':"")+actions+'</div>';
  }).join("");
  body=filters+'<div class="lore-list">'+(cards||'<div class="lore-item"><p>這個分類目前沒有物品。</p></div>')+'</div>';
 }else{
  const snap=craftingSnapshot(state);
  body='<div class="lore-list">'+(snap.recipes.map(r=>{
   const need=r.inputs.map(i=>i.name+" ×"+i.quantity).join("、"),missing=(r.missing||[]).map(i=>i.name+" "+i.have+"/"+i.need).join("、");
   return '<div class="lore-item"><small>'+r.minutes+' 分鐘 · '+(r.craftable?"材料齊全":"材料不足")+'</small><h3>'+esc(r.name)+'</h3><p>'+esc(r.description||"")+'<br>材料：'+esc(need)+'<br>成品：'+esc(r.output.name)+(r.output.quantity>1?" ×"+r.output.quantity:"")+(missing?'<br><small>缺少：'+esc(missing)+'</small>':"")+'</p><button class="primary" data-craft-id="'+esc(r.id)+'" '+(r.craftable?"":"disabled")+'>製作</button></div>';
  }).join("")||'<div class="lore-item"><p>你尚未學會任何配方。</p></div>')+'</div>';
 }
 openModal('<div class="eyebrow">INVENTORY & CRAFTING</div><h2>背包</h2><p class="muted">所有使用、製作、展示與交付都會先經 AI 行動合理性判定，再由 Engine 驗證。</p>'+tabs+body);
 qsa("#modalContent [data-inventory-mode]").forEach(b=>b.onclick=()=>openInventoryUI(state,openModal,persist,runAction,{category,mode:b.dataset.inventoryMode}));
 qsa("#modalContent [data-item-category]").forEach(b=>b.onclick=()=>openInventoryUI(state,openModal,persist,runAction,{category:b.dataset.itemCategory,mode:"items"}));
 qsa("#modalContent [data-item-use]").forEach(b=>b.onclick=async()=>{const item=state.inventory.find(x=>x.id===b.dataset.itemUse);if(item){document.querySelector("#modal")?.classList.add("hidden");await runAction("free","使用「"+item.name+"」")}});
 qsa("#modalContent [data-craft-id]").forEach(b=>b.onclick=async()=>{const r=state.crafting.recipes.find(x=>x.id===b.dataset.craftId);if(r){document.querySelector("#modal")?.classList.add("hidden");await runAction("free","製作「"+r.name+"」")}});
 qsa("#modalContent [data-item-equip]").forEach(b=>b.onclick=async()=>{const item=state.inventory.find(x=>x.id===b.dataset.itemEquip);if(!item)return;if(!item.equipped&&state.inventory.filter(x=>x.equipped===true).length>=2){alert("最多同時裝備 2 件具判定加成的工具。");return}item.equipped=!item.equipped;await persist();openInventoryUI(state,openModal,persist,runAction,{category,mode:"items"})});
 qsa("#modalContent [data-item-show]").forEach(b=>b.onclick=async()=>{const item=state.inventory.find(x=>x.id===b.dataset.itemShow),npc=ensureWorldRegistry(state).npcs.find(x=>x.id===b.dataset.npcId);if(item&&npc){document.querySelector("#modal")?.classList.add("hidden");await runAction("free","向「"+npc.name+"」展示「"+item.name+"」")}});
 qsa("#modalContent [data-item-give]").forEach(b=>b.onclick=async()=>{const item=state.inventory.find(x=>x.id===b.dataset.itemGive),npc=ensureWorldRegistry(state).npcs.find(x=>x.id===b.dataset.npcId);if(item&&npc&&confirm("確定把「"+item.name+"」交給「"+npc.name+"」？交付後會從背包扣除 1 件。")){document.querySelector("#modal")?.classList.add("hidden");await runAction("free","把「"+item.name+"」交給「"+npc.name+"」")}})
}

export async function openSaveManagerUI(state,openModal,{onLoad,onImport}={}){
 const saves=await listWorldSaves().catch(()=>[]);
 const byId=new Map(saves.map(x=>[x.id,x]));
 let rows="";
 for(let n=1;n<=3;n++){
  const id="slot-"+n,s=byId.get(id);
  rows+='<div class="lore-item"><small>SLOT '+n+'</small><h3>'+(s?esc(s.saveLabel||("手動存檔 "+n)):"空存檔槽")+'</h3><p>'+(s?(esc(s.worldName)+" · Day "+s.day+" · "+esc(s.location)+"<br><small>"+esc(s.savedAt)+"</small>"):"尚未保存")+'</p><div class="settings-actions"><button class="primary" data-save-slot="'+n+'">保存</button>'+(s?'<button class="secondary" data-load-slot="'+n+'">讀取</button><button class="ghost danger-ghost" data-delete-slot="'+n+'">刪除</button>':"")+'</div></div>';
 }
 const auto=byId.get("autosave");
 openModal('<div class="eyebrow">SAVE SYSTEM · LOCAL FIRST</div><h2>存檔管理</h2><p class="muted">遊戲仍會自動存檔；另外提供 3 個手動存檔槽。每個存檔包含角色狀態、任務、筆記、背包、配方、世界地圖與 Canon。</p><div class="lore-list"><div class="lore-item"><small>AUTOSAVE</small><h3>'+(auto?esc(auto.worldName):"尚無自動存檔")+'</h3><p>'+(auto?("Day "+auto.day+" · "+esc(auto.location)+"<br><small>"+esc(auto.savedAt)+"</small>"):"—")+'</p></div>'+rows+'<div class="lore-item"><div class="settings-actions"><button id="exportBtn" class="secondary">匯出 .elyndra</button><button id="importBtn" class="secondary">匯入 .elyndra</button></div></div></div>');
 qsa("#modalContent [data-save-slot]").forEach(b=>b.onclick=async()=>{const n=Number(b.dataset.saveSlot),label=prompt("存檔名稱","手動存檔 "+n);if(label==null)return;await saveWorldSlot(state,n,label);await openSaveManagerUI(state,openModal,{onLoad,onImport})});
 qsa("#modalContent [data-load-slot]").forEach(b=>b.onclick=async()=>{const loaded=await loadWorldSlot(Number(b.dataset.loadSlot));if(loaded&&onLoad)await onLoad(loaded)});
 qsa("#modalContent [data-delete-slot]").forEach(b=>b.onclick=async()=>{if(!confirm("確定刪除這個手動存檔？"))return;await deleteWorldSlot(Number(b.dataset.deleteSlot));await openSaveManagerUI(state,openModal,{onLoad,onImport})});
 $("#exportBtn")?.addEventListener("click",()=>state&&exportWorld(state));
 $("#importBtn")?.addEventListener("click",()=>onImport&&onImport())
}
