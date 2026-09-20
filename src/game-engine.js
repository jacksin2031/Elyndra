import {d20,discover} from "./world-engine.js";
import {advanceTime,ensureClock} from "./world-clock.js";
import {tickWorld} from "./world-simulation.js";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const RULES={forest:[14,2,90],road:[10,1,120],coin:[12,3,25],lia:[8,2,20],free:[12,1,45]};
function ensure(state){ensureClock(state);state.quests??={main:{id:"Q-main",title:"找到前往文明聚落的方法",stage:0,status:"ACTIVE",objectives:["理解自己身處何地","找到安全的聚落","查明陌生銅幣的來源"]}};state.discoveries??=0}
function progress(state,action,success){const q=state.quests.main;if(!success)return;if(action==="road"&&q.stage<1){q.stage=1;q.title="進入霧門城";q.objectives=["找到可以進城的方法","了解北境的統治者"]}if((action==="coin"||action==="forest")&&q.stage===1){q.stage=2;q.title="追查消失的第三軍團";q.objectives=["找出軍徽與銅幣的關係","詢問莉亞她隱瞞了甚麼"]}}
export function performAction(state,action,customText=""){ensure(state);const [dc,bonus,minutes]=RULES[action]||RULES.free,roll=d20(dc,bonus);advanceTime(state,minutes);let text="";
 if(action==="forest"){if(roll.success){text="你撥開濕冷枝葉，在倒塌石碑下發現一枚軍徽。莉亞看到它時，神情僵了一瞬。";discover(state,{id:"K-legion",title:"帝國第三軍團",status:"PARTIAL",text:"軍徽與短劍似乎屬於同一個早已消失的軍事組織。",sources:["forest-relic"]},4)}else text="霧越來越濃。你踩空跌進淺溝，遠處傳來不像野獸的低吼聲。"}
 if(action==="road")text=roll.success?"你找到覆滿車轍的石路。黃昏前，一座陌生城牆出現在霧後。守門人用你聽不懂的語言喝止你。":"道路在岔口消失。你只能折返，但泥地裡留有近期拖運重物的痕跡。";
 if(action==="coin"){if(roll.success){text="銅幣邊緣有七道規律刻痕，中央徽記像一輪被劃開的太陽。";discover(state,{id:"K-seven",title:"七道刻痕",status:"UNKNOWN",text:"銅幣邊緣存在七道人工刻痕，意義未知。",sources:["strange-coin"]},5)}else text="你只能確認這枚銅幣十分古老，文字與你熟悉的任何語言都不同。"}
 if(action==="lia"){const lia=state.npcs?.lia;if(lia){text="「這裡是北境。」莉亞停了幾秒。「至少……現在的人這樣叫它。」她沒有正面回答國家的問題。";discover(state,{id:"K-north",title:"北境",status:"PARTIAL",text:"莉亞稱這一帶為『北境』，但沒有說明所屬國家。",factId:"F-north",sources:["NPC-lia"]},3);lia.memories??=[];lia.memories.push({id:id(),type:"conversation",summary:"玩家詢問北境所在地",day:state.world.state.day})}else{text="你下意識想向某人詢問北境，但身邊沒有任何同伴。只有風聲穿過霧林。"}}
 if(action==="free"){text=roll.success?`你嘗試「${customText}」。你的判斷奏效了；雖然沒有立刻得到完整答案，但你找到了一個值得繼續追查的線索。`:`你嘗試「${customText}」，但目前的線索不足。這次行動沒有得到可靠答案。`}
 progress(state,action,roll.success);state.narrative=text;state.events.push({id:id(),type:"PLAYER_ACTION",action,customText:customText||undefined,roll,day:state.world.state.day,time:`${String(state.world.state.clock.hour).padStart(2,"0")}:${String(state.world.state.clock.minute).padStart(2,"0")}`,minutes,at:Date.now()});const worldEvent=tickWorld(state);return {roll,text,minutes,worldEvent};
}