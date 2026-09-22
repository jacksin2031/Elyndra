import {d20} from "./world-engine.js?v=54001";
import {advanceTime} from "./world-clock.js?v=276";
import {tickWorld} from "./world-simulation.js?v=54001";
import {buildActionCheck,trainActionSkill} from "./check-engine.js?v=53000";
import {applyCompanionCombatSupport,damageCompanion} from "./npc-engine.js?v=53000";
import {grantTalentPoint,ensureTalents} from "./talent-engine.js?v=49000";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ABILITY_KINDS=new Set(["ATTACK","HEAVY","STATUS","HEAL"]);
const ELEMENTS=new Set(["PHYSICAL","FIRE","ICE","LIGHTNING","POISON","ARCANE","HOLY","SHADOW","NATURE","PSYCHIC","NONE"]);
function normalizeList(v,max=5){return Array.isArray(v)?[...new Set(v.map(x=>String(x||"").trim().toUpperCase()).filter(Boolean))].slice(0,max):[]}
function normalizeAbility(a,i){const kind=ABILITY_KINDS.has(String(a?.kind||"").toUpperCase())?String(a.kind).toUpperCase():"ATTACK";return {id:String(a?.id||"ABL-"+(i+1)).slice(0,80),name:String(a?.name||"特殊攻擊").slice(0,80),kind,power:clamp(Math.round(Number(a?.power)||5),1,30),element:ELEMENTS.has(String(a?.element||"").toUpperCase())?String(a.element).toUpperCase():"PHYSICAL",cooldown:clamp(Math.round(Number(a?.cooldown)||0),0,5),status:String(a?.status||"").slice(0,60),lastUsedRound:-99}}
function normalizeEnemy(enemy,state){
 const hp=clamp(Number(enemy?.hp)||20,1,300),element=ELEMENTS.has(String(enemy?.element||"").toUpperCase())?String(enemy.element).toUpperCase():"PHYSICAL",abilities=(Array.isArray(enemy?.abilities)?enemy.abilities:[]).slice(0,4).map(normalizeAbility);
 return {id:id(),name:String(enemy?.name||"未知威脅").slice(0,80),level:clamp(Number(enemy?.level)||ensureCharacter(state).level,1,99),hp,maxHp:hp,defense:clamp(Number(enemy?.defense)||11,5,22),damage:clamp(Number(enemy?.damage)||6,1,35),element,weaknesses:normalizeList(enemy?.weaknesses),resistances:normalizeList(enemy?.resistances),abilities,statuses:[],phase:1,loot:String(enemy?.loot||"").slice(0,80),description:String(enemy?.description||"").slice(0,220)}
}
export function ensureCharacter(state){const p=state.player;p.level??=1;p.xp??=0;p.stats??={strength:2,agility:2,mind:2,presence:2,instinct:2};p.stats.presence??=2;p.stats.instinct??=2;p.defense??=10;p.status??="ALIVE";p.equipment??={weapon:null};ensureTalents(state);p.combatStatuses=Array.isArray(p.combatStatuses)?p.combatStatuses:[];return p}
export function xpNeeded(level){return 40+Math.max(1,Number(level)||1)*30}
export function grantXp(state,xp){const p=ensureCharacter(state);p.xp+=Math.max(0,Math.round(Number(xp)||0));while(p.xp>=xpNeeded(p.level)){p.xp-=xpNeeded(p.level);p.level++;p.maxHp+=6;p.hp=p.maxHp;grantTalentPoint(state)}return p}
export function recoverFromDefeat(state){const p=ensureCharacter(state);if(p.status!=="DOWNED")return false;p.status="ALIVE";p.hp=Math.max(1,Math.ceil(p.maxHp*.35));p.combatStatuses=[];state.combat=null;return true}
export function canStartEncounter(state,enemy,context={}){
 if(state.combat?.active||!enemy?.name)return false;const kind=String(context.actionKind||context.roll?.profile?.kind||"").toUpperCase(),action=String(context.action||"");
 if(kind==="RISKY"||/攻擊|襲擊|挑釁|闖入|破壞|戰鬥|attack|fight|provoke|break in/i.test(action))return true;
 const loc=(state.world?.registry?.locations||[]).find(x=>x.name===state.player?.location),unsafe=Number(loc?.worldState?.safety??50)<=35,crisis=["ESCALATING","CRISIS","ENDGAME"].includes(state.world?.state?.crisis?.stage);
 if(context.roll?.success===false&&["TRAVEL","OBSERVE"].includes(kind)&&(unsafe||crisis))return true;
 return false
}
export function startCombat(state,enemy,context={}){
 ensureCharacter(state);const enforce=context.enforceCausality===true;if(enforce&&!context.force&&!canStartEncounter(state,enemy,context))return null;
 state.combat={active:true,enemy:normalizeEnemy(enemy,state),round:1,log:[],startedAtLocationId:(state.world?.registry?.locations||[]).find(x=>x.name===state.player?.location)?.id||null};
 return state.combat
}
function playerElement(state){
 const weapon=(state.inventory||[]).find(x=>x.equipped===true||state.player?.equipment?.weapon===x.id||state.player?.equipment?.weapon===x.name);const e=String(weapon?.element||"PHYSICAL").toUpperCase();return ELEMENTS.has(e)?e:"PHYSICAL"
}
function elementalMultiplier(enemy,element){return enemy.weaknesses.includes(element)?1.5:enemy.resistances.includes(element)?.5:1}
function chooseAbility(enemy,round){
 const usable=enemy.abilities.filter(a=>round-a.lastUsedRound>a.cooldown);if(!usable.length)return null;
 const phase=enemy.phase||1;return usable[(round+phase+enemy.name.length)%usable.length]
}
function enemyTurn(state,e,defendReduction=0){
 const a=chooseAbility(e,state.combat.round);let damage=e.damage,status=null,summary="";
 if(a){a.lastUsedRound=state.combat.round;if(a.kind==="HEAL"){const before=e.hp;e.hp=Math.min(e.maxHp,e.hp+a.power);return {damage:0,status:null,summary:e.name+" 使用「"+a.name+"」，恢復了 "+(e.hp-before)+" 點生命。"}}
  damage=a.kind==="HEAVY"?Math.round(e.damage+a.power*.55):a.kind==="STATUS"?Math.max(1,Math.round(e.damage*.6)):Math.max(e.damage,Math.round(a.power*.7));status=a.kind==="STATUS"&&a.status?a.status:null;summary=e.name+" 使用「"+a.name+"」。"
 }
 const variance=(state.combat.round+e.level)%3,final=Math.max(1,damage-variance-defendReduction);state.player.hp=Math.max(0,state.player.hp-final);
 if(status&&!state.player.combatStatuses.includes(status))state.player.combatStatuses.push(status);
 return {damage:final,status,summary:summary||e.name+" 發動攻擊。"}
}
export function combatAction(state,action="attack"){
 if(!state.combat?.active)throw new Error("NO_ACTIVE_COMBAT");
 const e=state.combat.enemy,kind=action==="retreat"?"TRAVEL":"RISKY",label=action==="attack"?"攻擊"+e.name:action==="defend"?"防禦"+e.name+"的攻擊":"撤離"+e.name,check=buildActionCheck(state,label,{kind,dc:e.defense}),roll=d20(check.dc,check.bonus);Object.assign(roll,{profile:{kind:check.kind,attribute:check.attribute,skill:check.skill,skillLabel:check.skillLabel},modifiers:check.modifiers,baseDC:check.baseDC,difficulty:check.difficulty});const training=trainActionSkill(state,kind,roll);if(training.rankUp)roll.skillUp=training;advanceTime(state,2);let damage=0;
 if(action==="retreat"&&roll.success){state.combat.active=false;state.events.push({id:id(),type:"COMBAT_RETREAT",visibility:"PLAYER_KNOWN",enemy:e.name,summary:"你成功從 "+e.name+" 面前撤退。",day:state.world.state.day,at:Date.now()});tickWorld(state);return {roll,damage:0,won:false,retreated:true,enemyDamage:0,summary:"成功撤退。"}}
 const support=applyCompanionCombatSupport(state,e,action);
 if(action==="attack"&&roll.success&&e.hp>0){const element=playerElement(state),mult=elementalMultiplier(e,element),critical=roll.grade==="CRITICAL_SUCCESS"?1.5:1;damage=Math.max(1,Math.round((4+roll.natural/4+ensureCharacter(state).level*.25)*mult*critical));e.hp=Math.max(0,e.hp-damage)}
 if(e.hp<=Math.ceil(e.maxHp*.5)&&e.phase===1){e.phase=2;e.defense=clamp(e.defense+1,5,22);e.damage=clamp(e.damage+1,1,35);state.combat.log.push(e.name+" 的戰鬥方式發生變化。")}
 if(e.hp===0){
  state.combat.active=false;grantXp(state,Math.max(5,e.level*5));let loot=null;if(e.loot){loot={id:id(),name:e.loot,description:"從 "+e.name+" 留下的戰利品。它需要透過市場、委託或製作系統轉化成價值。",identified:true,source:"COMBAT"};if(!state.inventory.some(i=>i.name===loot.name))state.inventory.push(loot)}
  const parts=["擊敗 "+e.name];if(loot)parts.push("取得 "+loot.name);const ev={id:id(),type:"COMBAT_WON",visibility:"PLAYER_KNOWN",enemy:e.name,summary:parts.join("，")+"。",day:state.world.state.day,at:Date.now()};state.events.push(ev);tickWorld(state);return {roll,damage:damage+support.damage,companionDamage:support.damage,won:true,loot,enemyDamage:0,summary:ev.summary}
 }
 const reduction=action==="defend"?(roll.grade==="CRITICAL_SUCCESS"?7:roll.success?5:roll.grade==="CRITICAL_FAILURE"?0:2):0,turn=enemyTurn(state,e,reduction+support.guard);let companionHit=null;if(turn.damage>=8&&support.events.length)companionHit=damageCompanion(state,Math.max(1,Math.floor(turn.damage/3)));
 state.combat.round++;state.combat.log.push(...support.events,turn.summary);state.combat.log=state.combat.log.slice(-12);
 if(state.player.hp===0){state.player.status="DOWNED";state.combat.active=false;tickWorld(state)}else tickWorld(state);
 return {roll,damage:damage+support.damage,companionDamage:support.damage,won:false,enemyDamage:turn.damage,status:turn.status,companionHit,defeated:state.player.hp===0,phase:e.phase,summary:action==="defend"?"你與同行者採取防禦姿態，試圖減輕攻勢。":"戰鬥仍在持續。"}
}
