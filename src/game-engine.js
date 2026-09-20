import {d20,discover} from "./world-engine.js";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
export function performAction(state,action){
 const rules={forest:[14,2],road:[10,1],coin:[12,3],lia:[8,2]},[dc,bonus]=rules[action]||[10,0],roll=d20(dc,bonus);
 if(action==="forest"||action==="road")state.world.state.day++;
 let text="";
 if(action==="forest"){if(roll.success){text="你撥開濕冷枝葉，在倒塌石碑下發現一枚軍徽。莉亞看到它時，神情僵了一瞬。";discover(state,{id:"K-legion",title:"帝國第三軍團",status:"PARTIAL",text:"軍徽與短劍似乎屬於同一個早已消失的軍事組織。",factId:null,sources:["forest-relic"]},4)}else text="霧越來越濃。你踩空跌進淺溝，遠處傳來不像野獸的低吼聲。"}
 if(action==="road")text=roll.success?"你找到覆滿車轍的石路。黃昏前，一座陌生城牆出現在霧後，門上的文字你完全看不懂。":"道路在岔口消失。你只能折返，但泥地裡留有近期拖運重物的痕跡。";
 if(action==="coin"){if(roll.success){text="銅幣邊緣有七道規律刻痕，中央徽記像一輪被劃開的太陽。";discover(state,{id:"K-seven",title:"七道刻痕",status:"UNKNOWN",text:"銅幣邊緣存在七道人工刻痕，意義未知。",sources:["strange-coin"]},5)}else text="你只能確認這枚銅幣十分古老，文字與你熟悉的任何語言都不同。"}
 if(action==="lia"){text="「這裡是北境。」莉亞停了幾秒。「至少……現在的人這樣叫它。」她沒有正面回答國家的問題。";discover(state,{id:"K-north",title:"北境",status:"PARTIAL",text:"莉亞稱這一帶為『北境』，但沒有說明所屬國家。",factId:"F-north",sources:["NPC-lia"]},3);state.npcs.lia.memories.push({id:id(),type:"conversation",summary:"玩家詢問北境所在地",day:state.world.state.day})}
 state.narrative=text;state.events.push({id:id(),type:"PLAYER_ACTION",action,roll,day:state.world.state.day,at:Date.now()});return {roll,text};
}
