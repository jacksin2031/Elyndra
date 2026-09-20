import {d20} from "./world-engine.js?v=231";
import {advanceTime,ensureClock} from "./world-clock.js?v=231";
import {tickWorld} from "./world-simulation.js?v=231";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const PROFILES={
 OBSERVE:{dc:10,bonus:2,minutes:15},
 SOCIAL:{dc:11,bonus:1,minutes:20},
 TRAVEL:{dc:12,bonus:1,minutes:45},
 RISKY:{dc:14,bonus:0,minutes:30},
 GENERAL:{dc:12,bonus:1,minutes:30}
};
export function actionProfile(input=""){
 const q=clean(input).toLowerCase();
 if(/觀察|查看|檢查|搜尋|調查|聆聽|閱讀|inspect|search|observe|listen/.test(q))return {kind:"OBSERVE",...PROFILES.OBSERVE};
 if(/交談|詢問|說服|談判|打招呼|對話|talk|ask|persuade|negotiate/.test(q))return {kind:"SOCIAL",...PROFILES.SOCIAL};
 if(/前往|移動|探索|穿越|攀爬|跟隨|travel|move|explore|climb|follow/.test(q))return {kind:"TRAVEL",...PROFILES.TRAVEL};
 if(/攻擊|破壞|闖入|偷|強行|冒險|attack|break|steal|force/.test(q))return {kind:"RISKY",...PROFILES.RISKY};
 return {kind:"GENERAL",...PROFILES.GENERAL}
}
function ensure(state){
 ensureClock(state);
 state.quests??={main:{id:"Q-main",title:"在陌生世界活下來",stage:0,status:"ACTIVE",objectives:["理解自己身處何地","尋找安全的落腳處","找到第一個可以交流的人"]}};
 state.discoveries??=0
}
function localNarrative(label,roll,profile){
 if(roll.grade==="CRITICAL_SUCCESS")return `你嘗試「${label}」。結果比預期更順利；你取得了明確而可驗證的進展。`;
 if(roll.grade==="CRITICAL_FAILURE")return `你嘗試「${label}」，但行動明顯失敗，而且局勢因此變得更不利。你沒有獲得任何未經確認的新情報。`;
 if(roll.success)return `你嘗試「${label}」。行動取得了可確認的進展，但世界沒有因此自動揭露你尚未發現的真相。`;
 return `你嘗試「${label}」，但目前條件不足。這次沒有取得足以確認的新資訊。`
}
export function performAction(state,action="free",customText=""){
 ensure(state);
 const label=clean(customText||action)||"觀察目前環境",profile=actionProfile(label),roll=d20(profile.dc,profile.bonus);
 advanceTime(state,profile.minutes);
 const text=localNarrative(label,roll,profile);
 state.narrative=text;
 state.events.push({id:id(),type:"PLAYER_ACTION",visibility:"PLAYER_KNOWN",action:"free",customText:label,actionKind:profile.kind,roll,day:state.world.state.day,time:`${String(state.world.state.clock.hour).padStart(2,"0")}:${String(state.world.state.clock.minute).padStart(2,"0")}`,minutes:profile.minutes,at:Date.now()});
 const worldEvent=tickWorld(state);
 return {roll,text,minutes:profile.minutes,worldEvent,actionKind:profile.kind}
}