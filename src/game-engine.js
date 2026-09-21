import {d20} from "./world-engine.js?v=270";
import {buildActionCheck,trainActionSkill,ensureCheckProfile} from "./check-engine.js?v=270";
import {advanceTime,ensureClock} from "./world-clock.js?v=270";
import {tickWorld} from "./world-simulation.js?v=270";
import {tickSurvival,resolveSurvivalAction} from "./survival-engine.js?v=270";
import {applyCultureAction} from "./culture-engine.js?v=270";
import {resolveEconomyAction} from "./economy-engine.js?v=270";
import {resolveMagicAction,recoverMagic} from "./magic-engine.js?v=270";
import {tickMainQuest,evaluateQuestState} from "./quest-engine.js?v=270";
import {exploreDungeon} from "./dungeon-engine.js?v=270";
import {resolveTalentAction} from "./talent-engine.js?v=270";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const PROFILES={
 OBSERVE:{dc:10,minutes:15},
 SOCIAL:{dc:11,minutes:20},
 TRAVEL:{dc:12,minutes:45},
 RISKY:{dc:14,minutes:30},
 GENERAL:{dc:12,minutes:30}
};
export function actionProfile(input=""){
 const q=clean(input).toLowerCase();
 if(/休息|睡眠|紮營|露營|住宿|旅店|投宿|rest|sleep|camp|lodging|inn/.test(q))return {kind:"GENERAL",dc:7,minutes:240,rest:true};
 if(/施法|魔法|術式|咒|spell|cast|magic/.test(q))return {kind:"RISKY",dc:13,minutes:20,magic:true};
 if(/購買|買下|出售|賣掉|賣出|buy|sell/.test(q))return {kind:"SOCIAL",dc:9,minutes:20,economy:true};
 if(/觀察|查看|檢查|搜尋|調查|聆聽|閱讀|inspect|search|observe|listen/.test(q))return {kind:"OBSERVE",...PROFILES.OBSERVE};
 if(/交談|詢問|說服|談判|打招呼|對話|talk|ask|persuade|negotiate/.test(q))return {kind:"SOCIAL",...PROFILES.SOCIAL};
 if(/前往|移動|探索|穿越|攀爬|跟隨|travel|move|explore|climb|follow/.test(q))return {kind:"TRAVEL",...PROFILES.TRAVEL};
 if(/攻擊|破壞|闖入|偷|強行|冒險|attack|break|steal|force/.test(q))return {kind:"RISKY",...PROFILES.RISKY};
 return {kind:"GENERAL",...PROFILES.GENERAL}
}
function ensure(state){
 ensureClock(state);
 state.quests??={main:{id:"Q-main",title:"在陌生世界活下來",stage:0,status:"ACTIVE",objectives:["理解自己身處何地","尋找安全的落腳處","找到第一個可以交流的人"]}};
 state.discoveries??=0;ensureCheckProfile(state)
}
function localNarrative(label,roll,profile){
 if(roll.grade==="CRITICAL_SUCCESS")return `你嘗試「${label}」。結果比預期更順利；你取得了明確而可驗證的進展。`;
 if(roll.grade==="CRITICAL_FAILURE")return `你嘗試「${label}」，但結果比預期更差，眼前局勢因此變得更棘手。`;
 if(roll.success)return `你完成了「${label}」，並取得可以直接確認的進展。`;
 return `你嘗試「${label}」，但這次沒有達成預期目的。從眼前反應看來，換一個方法會更有機會。`
}
export function performAction(state,action="free",customText=""){
 ensure(state);
 const label=clean(customText||action)||"觀察目前環境",profile=actionProfile(label),check=buildActionCheck(state,label,profile),roll=d20(check.dc,check.bonus);Object.assign(roll,{profile:{kind:check.kind,attribute:check.attribute,skill:check.skill,skillLabel:check.skillLabel},modifiers:check.modifiers,baseDC:check.baseDC,difficulty:check.difficulty});
 const training=trainActionSkill(state,check.kind,roll);if(training.rankUp)roll.skillUp=training;
 advanceTime(state,profile.minutes);
 const economy=resolveEconomyAction(state,label,roll),paidLodging=/住宿|旅店|投宿|lodging|inn|stay overnight/i.test(label),restGranted=profile.rest===true&&roll.success&&(!paidLodging||economy?.ok===true);
 const survival=tickSurvival(state,profile.minutes,{kind:profile.kind,rest:restGranted});if(restGranted)recoverMagic(state,Math.max(8,Math.round(profile.minutes/20)));
 const culture=applyCultureAction(state,label,roll),magic=resolveMagicAction(state,label,roll),supply=resolveSurvivalAction(state,label,roll),talent=resolveTalentAction(state,label),dungeon=exploreDungeon(state,label,roll);
 const text=localNarrative(label,roll,profile);
 state.narrative=text;
 state.events.push({id:id(),type:"PLAYER_ACTION",visibility:"PLAYER_KNOWN",action:"free",customText:label,actionKind:profile.kind,roll,day:state.world.state.day,time:`${String(state.world.state.clock.hour).padStart(2,"0")}:${String(state.world.state.clock.minute).padStart(2,"0")}`,minutes:profile.minutes,at:Date.now()});
 const worldEvent=tickWorld(state);const questProgress=evaluateQuestState(state);tickMainQuest(state);
 return {roll,text,minutes:profile.minutes,worldEvent,actionKind:profile.kind,check,training,ruleEffects:{survival,culture,economy,magic,supply,talent,dungeon,questProgress}}
}