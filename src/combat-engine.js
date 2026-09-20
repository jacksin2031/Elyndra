import {d20} from "./world-engine.js?v=268";
import {advanceTime} from "./world-clock.js?v=268";
import {tickWorld} from "./world-simulation.js?v=268";
import {localCurrencyReward} from "./world-locality.js?v=268";
import {buildActionCheck,trainActionSkill} from "./check-engine.js?v=268";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function ensureCharacter(state){const p=state.player;p.level??=1;p.xp??=0;p.stats??={strength:2,agility:2,mind:2,presence:2,instinct:2};p.stats.presence??=2;p.stats.instinct??=2;p.defense??=10;p.status??="ALIVE";p.equipment??={weapon:null};return p}
export function xpNeeded(level){return 40+Math.max(1,Number(level)||1)*30}
export function grantXp(state,xp){const p=ensureCharacter(state);p.xp+=Math.max(0,Math.round(Number(xp)||0));while(p.xp>=xpNeeded(p.level)){p.xp-=xpNeeded(p.level);p.level++;p.maxHp+=8;p.hp=p.maxHp;p.stats.strength++;if(p.level%2===0)p.stats.agility++;if(p.level%3===0)p.stats.mind++;if(p.level%4===0)p.stats.presence++;if(p.level%2===0)p.stats.instinct++}return p}
export function recoverFromDefeat(state){const p=ensureCharacter(state);if(p.status!=="DOWNED")return false;p.status="ALIVE";p.hp=Math.max(1,Math.ceil(p.maxHp*.35));state.combat=null;return true}
export function startCombat(state,enemy){
 ensureCharacter(state);
 const hp=clamp(Number(enemy?.hp)||20,1,200);
 state.combat={active:true,enemy:{id:id(),name:String(enemy?.name||"未知威脅").slice(0,80),level:clamp(Number(enemy?.level)||ensureCharacter(state).level,1,99),hp,maxHp:hp,defense:clamp(Number(enemy?.defense)||11,5,20),damage:clamp(Number(enemy?.damage)||6,1,30),loot:String(enemy?.loot||"").slice(0,80)},round:1};
 return state.combat
}
export function combatAction(state,action="attack"){
 if(!state.combat?.active)throw new Error("NO_ACTIVE_COMBAT");
 const e=state.combat.enemy,kind=action==="retreat"?"TRAVEL":"RISKY",label=action==="attack"?`攻擊${e.name}`:action==="defend"?`防禦${e.name}的攻擊`:`撤離${e.name}`,check=buildActionCheck(state,label,{kind,dc:e.defense}),roll=d20(check.dc,check.bonus);Object.assign(roll,{profile:{kind:check.kind,attribute:check.attribute,skill:check.skill,skillLabel:check.skillLabel},modifiers:check.modifiers,baseDC:check.baseDC,difficulty:check.difficulty});const training=trainActionSkill(state,kind,roll);if(training.rankUp)roll.skillUp=training;advanceTime(state,2);let damage=0;
 if(action==="retreat"&&roll.success){state.combat.active=false;state.events.push({id:id(),type:"COMBAT_RETREAT",visibility:"PLAYER_KNOWN",enemy:e.name,summary:"你成功從 "+e.name+" 面前撤退。",day:state.world.state.day,at:Date.now()});tickWorld(state);return {roll,damage:0,won:false,retreated:true,enemyDamage:0,summary:"成功撤退。"}}
 if(action==="attack"&&roll.success){damage=Math.max(1,Math.floor(4+roll.natural/4));e.hp=Math.max(0,e.hp-damage)}
 if(e.hp===0){
  state.combat.active=false;grantXp(state,Math.max(5,e.level*5));
  const reward=localCurrencyReward(state,"combatReward");
  let loot=null;if(e.loot){loot={id:id(),name:e.loot,description:"從 "+e.name+" 身上取得的物品。",identified:true,source:"COMBAT"};if(!state.inventory.some(i=>i.name===loot.name))state.inventory.push(loot)}
  const parts=["擊敗 "+e.name];if(loot)parts.push("取得 "+loot.name);if(reward)parts.push("獲得 "+reward.amount+" "+reward.currency.name);
  const ev={id:id(),type:"COMBAT_WON",visibility:"PLAYER_KNOWN",enemy:e.name,summary:parts.join("，")+"。",day:state.world.state.day,at:Date.now()};state.events.push(ev);tickWorld(state);return {roll,damage,won:true,loot,reward,enemyDamage:0,summary:ev.summary}
 }
 const reduction=action==="defend"?(roll.grade==="CRITICAL_SUCCESS"?6:roll.success?4:roll.grade==="CRITICAL_FAILURE"?0:2):0,enemyDamage=Math.max(1,e.damage-Math.floor(Math.random()*3)-reduction);state.player.hp=Math.max(0,state.player.hp-enemyDamage);state.combat.round++;
 if(state.player.hp===0){state.player.status="DOWNED";state.combat.active=false;tickWorld(state)}
 return {roll,damage,won:false,enemyDamage,defeated:state.player.hp===0,summary:action==="defend"?"你採取防禦姿態，減輕了傷害。":"戰鬥仍在持續。"}
}