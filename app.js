import {newGame,validateWorld,applyWorldCandidate,WORLD_CONSTITUTION} from "./src/world-engine.js";\nimport {aiHealth,narrate,generateWorldCandidate,talkToNpc} from "./src/ai-client.js";
import {performAction} from "./src/game-engine.js";
import {saveWorld,loadWorld,hasWorld,deleteWorld,exportWorld,importWorld} from "./src/storage.js";

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let gameState=null;\nlet aiStatus={ok:false,aiConfigured:false};

function show(id){$$(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active")}
async function refresh(){
 const exists=await hasWorld().catch(()=>false);$("#continueBtn").disabled=!exists;
 if(!gameState)return;
 $("#worldName").textContent=gameState.world.name;
 $("#worldMeta").textContent=`Day ${gameState.world.state.day} · World v${gameState.world.version}`;
 $("#knowledgePct").textContent=`${gameState.player.knowledgeScore}%`;
 $("#narrative").textContent=gameState.narrative;
}
async function persist(){if(gameState)await saveWorld(gameState)}

$("#newWorldBtn").onclick=()=>show("creator");
$("#continueBtn").onclick=async()=>{gameState=await loadWorld();if(!gameState)return;const report=validateWorld(gameState.world);if(!report.valid)return alert("存檔世界完整性驗證失敗："+report.errors.join(", "));aiStatus=await aiHealth();\nawait refresh();show("game")};
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));

$("#generateBtn").onclick=async()=>{
 const seed={genre:$("#genre").value,theme:$("#theme").value,scale:$("#scale").value,danger:+$("#danger").value,magic:+$("#magic").value,politics:+$("#politics").value,prompt:$("#prompt").value.trim()};
 try{gameState=newGame(seed);\n  if(aiStatus.aiConfigured){try{const candidate=await generateWorldCandidate(seed,WORLD_CONSTITUTION);applyWorldCandidate(gameState,candidate)}catch(e){console.warn("AI world fallback",e)}}\n  await persist();await refresh();show("game")}catch(e){alert("世界編譯失敗："+e.message)}
};

$$("[data-action]").forEach(b=>b.onclick=async()=>{
 if(!gameState)return;
 const action=b.dataset.action;\n const {roll,text:localText}=performAction(gameState,action);\n if(aiStatus.aiConfigured){try{gameState.narrative=await narrate(gameState,action,roll)}catch(e){gameState.narrative=localText}}
 $("#d20").textContent=roll.natural;
 $("#rollLabel").textContent=`D20 ${roll.natural} + ${roll.bonus} = ${roll.total} / DC ${roll.dc}`;
 $("#rollResult").textContent=roll.grade.replaceAll("_"," ");
 await persist();await refresh();
});

function openModal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden")}
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#modal").onclick=e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden")};

$("#journalBtn").onclick=()=>openModal(`
 <div class="eyebrow">WORLD JOURNAL</div><h2>世界手帳</h2>
 <p style="color:#9da7bb">只顯示玩家實際發現的情報；隱藏 Canon 不會洩漏給玩家。</p>
 <div class="lore-list">${gameState.knowledge.map(x=>`<div class="lore-item"><small>${x.status}</small><h3>${x.title}</h3><p>${x.text}</p></div>`).join("")}</div>`);

$("#inventoryBtn").onclick=()=>openModal(`
 <div class="eyebrow">INVENTORY</div><h2>背包</h2>
 <div class="lore-list">${gameState.inventory.map(x=>`<div class="lore-item"><small>${x.identified?"IDENTIFIED":"UNKNOWN"}</small><h3>${x.name}</h3><p>物品可作為 Knowledge Fragment 的證據來源。</p></div>`).join("")}</div>`);

$("#saveToolsBtn").onclick=async()=>{
 const exists=await hasWorld();
 openModal(`<div class="eyebrow">LOCAL FIRST</div><h2>存檔管理</h2>
 <p style="color:#9da7bb">正式遊戲狀態保存在 IndexedDB。你亦可把整個世界匯出成 .elyndra 檔案。</p>
 <div class="lore-list">
  <button id="exportBtn" class="secondary" ${!exists?"disabled":""}>匯出 .elyndra</button>
  <button id="importBtn" class="secondary">匯入 .elyndra</button>
  <div class="lore-item"><small>WORLD INTEGRITY</small><h3>${gameState?.integrity?.score??"-"} / 100</h3><p>載入時會再次驗證 Canon 與 World Constitution。</p></div>
 </div>`);
 $("#exportBtn")?.addEventListener("click",()=>gameState&&exportWorld(gameState));
 $("#importBtn").onclick=()=>$("#importFile").click();
};
$("#importFile").onchange=async e=>{try{gameState=await importWorld(e.target.files[0]);await refresh();$("#modal").classList.add("hidden");show("game")}catch(err){alert(err.message)}finally{e.target.value=""}};

$("#game .companion").onclick=async()=>{\n if(!gameState)return;\n const q=prompt("想對莉亞說什麼？");if(!q)return;\n let answer="莉亞看了你一眼，似乎還沒有打算回答更多。";\n if(aiStatus.aiConfigured){try{answer=await talkToNpc(gameState,"lia",q)}catch(e){console.warn("NPC fallback",e)}}\n gameState.npcs.lia.memories.push({id:crypto.randomUUID?.()||String(Date.now()),type:"conversation",summary:`玩家：${q} / 莉亞：${answer}`,day:gameState.world.state.day});\n await persist();openModal(`<div class="eyebrow">AI COMPANION</div><h2>莉亞</h2><p>${answer.replaceAll("<","&lt;")}</p>`);\n};\n\n$("#resetBtn").onclick=async()=>{if(confirm("確定要刪除目前的本地世界嗎？")){await deleteWorld();gameState=null;await refresh();show("landing")}};

await refresh();