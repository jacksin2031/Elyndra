const clean=(v,max=120)=>typeof v==="string"?v.trim().slice(0,max):"";
const iconFor=type=>({ITEM:"🎒",KNOWLEDGE:"✦",LOCATION:"⌖",NPC:"◉",QUEST:"◆"}[type]||"•");
export function deriveAcquisitionNotifications(prev,next){
 if(!prev||!next)return [];const out=[];
 for(const [id,item] of Object.entries(next.inventory||{})){const before=prev.inventory?.[id],delta=(Number(item.quantity)||0)-(Number(before?.quantity)||0);if(delta>0)out.push({type:"ITEM",title:"取得道具",name:clean(item.name)||id,detail:`×${delta}`})}
 for(const [id,row] of Object.entries(next.knowledge||{}))if(!prev.knowledge?.[id])out.push({type:"KNOWLEDGE",title:"獲得知識",name:clean(row.title)||id,detail:row.status==="VERIFIED"?"已驗證":"未確認"});
 for(const [id,row] of Object.entries(next.locations||{}))if(row.known&&(!prev.locations?.[id]||!prev.locations[id].known))out.push({type:"LOCATION",title:"發現地點",name:clean(row.name)||id,detail:clean(row.region)});
 for(const [id,row] of Object.entries(next.npcs||{}))if(row.encountered&&(!prev.npcs?.[id]||!prev.npcs[id].encountered))out.push({type:"NPC",title:"遇見人物",name:clean(row.name)||id,detail:clean(row.role)});
 const a=prev.mainQuest||{},b=next.mainQuest||{};if(a.stage!==b.stage||a.status!==b.status||a.objective!==b.objective)out.push({type:"QUEST",title:"任務更新",name:clean(b.title)||"主線任務",detail:clean(b.objective,160)});
 return out.slice(0,8)
}
function host(){if(typeof document==="undefined")return null;let el=document.getElementById("gainToastStack");if(el)return el;el=document.createElement("div");el.id="gainToastStack";el.className="gain-toast-stack";el.setAttribute("aria-live","polite");el.setAttribute("aria-atomic","false");document.body.appendChild(el);return el}
export function pushAcquisitionNotification(row){
 const root=host();if(!root||!row)return;while(root.children.length>=4)root.firstElementChild?.remove();
 const el=document.createElement("div");el.className=`gain-toast gain-toast-${String(row.type||"GENERIC").toLowerCase()}`;
 const icon=document.createElement("div");icon.className="gain-toast-icon";icon.textContent=iconFor(row.type);
 const copy=document.createElement("div");copy.className="gain-toast-copy";
 const label=document.createElement("small");label.textContent=clean(row.title,40);const name=document.createElement("strong");name.textContent=clean(row.name,100);copy.append(label,name);
 if(row.detail){const detail=document.createElement("span");detail.textContent=clean(row.detail,160);copy.appendChild(detail)}el.append(icon,copy);root.appendChild(el);
 requestAnimationFrame(()=>el.classList.add("show"));setTimeout(()=>{el.classList.remove("show");setTimeout(()=>el.remove(),260)},3000)
}
export function notifyGameplayAcquisitions(prev,next){for(const row of deriveAcquisitionNotifications(prev,next))pushAcquisitionNotification(row)}
