const stateKey="elyndra_save_v01";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

const defaultState={
  worldName:"艾斯特拉",
  day:1,
  knowledge:3,
  discovered:[
    {title:"陌生銅幣",status:"PARTIAL",text:"銅幣上的文字尚未能解讀。"},
    {title:"莉亞",status:"PARTIAL",text:"自稱旅行者，但似乎刻意避開談論自己的出身。"}
  ],
  inventory:["生鏽短劍","陌生銅幣"],
  log:[]
};

let gameState=loadState()||structuredClone(defaultState);

function saveState(){localStorage.setItem(stateKey,JSON.stringify(gameState));}
function loadState(){try{return JSON.parse(localStorage.getItem(stateKey));}catch{return null}}
function show(id){$$(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");}
function refresh(){
  $("#worldName").textContent=gameState.worldName;
  $("#worldMeta").textContent=`Day ${gameState.day} · 未知年代`;
  $("#knowledgePct").textContent=`${gameState.knowledge}%`;
  $("#continueBtn").disabled=!localStorage.getItem(stateKey);
}

$("#newWorldBtn").onclick=()=>show("creator");
$("#continueBtn").onclick=()=>{refresh();show("game")};
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));

$("#generateBtn").onclick=()=>{
  const genre=$("#genre").value,theme=$("#theme").value,scale=$("#scale").value;
  const names=["艾斯特拉","諾爾海姆","瑟雷恩","阿爾維亞","伊瑟蘭","露米納"];
  const idx=Math.floor(Math.random()*names.length);
  gameState=structuredClone(defaultState);
  gameState.worldName=names[idx];
  gameState.seed={
    genre,theme,scale,
    danger:+$("#danger").value,
    magic:+$("#magic").value,
    politics:+$("#politics").value,
    prompt:$("#prompt").value.trim()
  };
  gameState.log.push({type:"world_created",at:Date.now(),seed:gameState.seed});
  saveState();refresh();show("game");
};

function roll(dc,bonus=0){
  const n=1+Math.floor(Math.random()*20);
  const total=n+bonus;
  $("#d20").textContent=n;
  $("#rollLabel").textContent=`D20 ${n} + ${bonus} = ${total} / DC ${dc}`;
  const result=n===20?"CRITICAL SUCCESS":n===1?"CRITICAL FAILURE":total>=dc?"SUCCESS":"FAILURE";
  $("#rollResult").textContent=result;
  return {n,total,result,success:n!==1&&(n===20||total>=dc)};
}

const outcomes={
  forest(){
    const r=roll(14,2);
    gameState.day++;
    if(r.success){
      $("#narrative").textContent="你撥開濕冷的枝葉，在倒塌石碑下發現一枚刻著相同紋章的軍徽。莉亞看到它時，神情明顯僵了一瞬。";
      unlock("帝國第三軍團","PARTIAL","軍徽與你身上的短劍似乎屬於同一個早已消失的軍事組織。",4);
    }else{
      $("#narrative").textContent="霧越來越濃。你踩空跌進淺溝，只找到幾截腐朽木材。遠處傳來不像野獸的低吼聲。";
    }
  },
  road(){
    const r=roll(10,1);
    gameState.day++;
    $("#narrative").textContent=r.success
      ?"你找到一條覆滿車轍的石路。黃昏前，一座沒有標在任何記憶中的城牆出現在霧後。門上的文字，你完全看不懂。"
      :"道路在岔口消失。你不得不折返，但在泥地裡發現了有人近期拖運重物的痕跡。";
  },
  coin(){
    const r=roll(12,3);
    if(r.success){
      $("#narrative").textContent="你注意到銅幣並非普通貨幣。邊緣有七道規律刻痕，而中央徽記像是一輪被劃開的太陽。";
      unlock("七道刻痕","UNKNOWN","銅幣邊緣存在七道人工刻痕，意義未知。",5);
    }else{
      $("#narrative").textContent="你只能確認這枚銅幣十分古老。文字與你熟悉的任何語言都不同。";
    }
  },
  lia(){
    roll(8,2);
    $("#narrative").textContent="「這裡是北境。」莉亞停了幾秒才回答。「至少……現在的人這樣叫它。」她沒有正面回答你關於國家的問題。";
    unlock("北境","PARTIAL","莉亞稱這一帶為『北境』，但沒有說明所屬國家。",3);
  }
};

$$("[data-action]").forEach(b=>b.onclick=()=>{
  outcomes[b.dataset.action]();
  gameState.log.push({type:"action",action:b.dataset.action,at:Date.now()});
  saveState();refresh();
});

function unlock(title,status,text,plus){
  if(!gameState.discovered.some(x=>x.title===title)){
    gameState.discovered.push({title,status,text});
    gameState.knowledge=Math.min(100,gameState.knowledge+plus);
  }
}

function openModal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden")}
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#modal").onclick=e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden")};

$("#journalBtn").onclick=()=>openModal(`
  <div class="eyebrow">WORLD JOURNAL</div><h2>世界手帳</h2>
  <p style="color:#9da7bb">你不是在閱讀世界設定，而是在逐步建立自己的理解。</p>
  <div class="lore-list">${gameState.discovered.map(x=>`<div class="lore-item"><small>${x.status}</small><h3>${x.title}</h3><p>${x.text}</p></div>`).join("")}</div>
`);

$("#inventoryBtn").onclick=()=>openModal(`
  <div class="eyebrow">INVENTORY</div><h2>背包</h2>
  <div class="lore-list">${gameState.inventory.map(x=>`<div class="lore-item"><h3>${x}</h3><p>這件物品可能隱藏與世界相關的情報。</p></div>`).join("")}</div>
`);

$("#resetBtn").onclick=()=>{
  if(confirm("確定要刪除目前的本地存檔嗎？")){
    localStorage.removeItem(stateKey);
    gameState=structuredClone(defaultState);
    refresh();show("landing");
  }
};

refresh();
