import {currentWeather} from "./weather-engine.js?v=54018";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const runtimeStateReady=state=>Boolean(state&&typeof state==="object"&&state.player&&state.world);
const neutralSurvival=()=>({satiety:100,fatigue:0,exposure:0,injury:0,conditions:[]});
function currentLocation(state){if(!runtimeStateReady(state))return null;const name=String(state.player?.location||"");return (state.world?.registry?.locations||[]).find(x=>x.name===name)||null}
export function survivalRules(state){
 const rules=state?.world?.creation?.difficultyRules||{};
 return {hunger:rules.hunger!==false,fatigue:rules.fatigue!==false,statusEffects:rules.statusEffects!==false}
}
export function ensureSurvival(state){
 if(!runtimeStateReady(state))return null;
 state.player.survival??={satiety:100,fatigue:0,exposure:0,injury:0,conditions:[],lastMinute:Number(state.world?.state?.clock?.totalMinutes)||0};
 const s=state.player.survival;if(!Number.isFinite(Number(s.satiety))&&Number.isFinite(Number(s.hunger)))s.satiety=100-clamp(Number(s.hunger),0,100);delete s.hunger;for(const k of ["satiety","fatigue","exposure","injury"])s[k]=clamp(Number(s[k])||0,0,100);s.conditions=Array.isArray(s.conditions)?s.conditions:[];s.lastMinute=Number.isFinite(s.lastMinute)?s.lastMinute:Number(state.world?.state?.clock?.totalMinutes)||0;
 const rules=survivalRules(state);if(!rules.hunger)s.satiety=100;if(!rules.fatigue)s.fatigue=0;if(!rules.statusEffects)s.conditions=[];return s
}
function refreshConditions(state,s){
 const rules=survivalRules(state);if(!rules.statusEffects){s.conditions=[];return}
 const out=[];if(rules.hunger&&s.satiety<=35)out.push("飢餓");if(rules.fatigue&&s.fatigue>=65)out.push("疲勞");if(s.exposure>=65)out.push("環境暴露");if(s.injury>=55)out.push("傷勢");s.conditions=out
}
export function tickSurvival(state,minutes,{kind="",rest=false}={}){
 const s=ensureSurvival(state);if(!s)return null;const rules=survivalRules(state),m=Math.max(0,Number(minutes)||0),loc=currentLocation(state),weather=currentWeather(state),shelter=clamp(((Number(loc?.worldState?.safety)||50)+(Number(loc?.worldState?.infrastructure)||50))/200,0,1),danger=clamp(Number(weather?.danger)||0,0,5);
 if(rest){
  s.fatigue=rules.fatigue?clamp(s.fatigue-m/6,0,100):0;s.exposure=clamp(s.exposure-m/12*(.5+shelter),0,100);s.injury=clamp(s.injury-m/24*(.4+shelter),0,100);s.satiety=rules.hunger?clamp(s.satiety-m/720,0,100):100
 }else{
  s.satiety=rules.hunger?clamp(s.satiety-m/360,0,100):100;s.fatigue=rules.fatigue?clamp(s.fatigue+m/(String(kind).toUpperCase()==="TRAVEL"?90:150),0,100):0;
  s.exposure=clamp(s.exposure+(m/180)*Math.max(0,danger-1)*(1-shelter*.7),0,100)
 }
 const hp=Number(state.player?.hp)||0,max=Math.max(1,Number(state.player?.maxHp)||1);s.injury=Math.max(s.injury,clamp((1-hp/max)*70,0,100));
 refreshConditions(state,s);s.lastMinute=Number(state.world?.state?.clock?.totalMinutes)||s.lastMinute;
 if((rules.hunger&&s.satiety<=5)||(rules.fatigue&&s.fatigue>=95)||s.exposure>=95){state.player.hp=Math.max(1,(Number(state.player.hp)||1)-1)}
 return s
}
export function survivalModifier(state,kind){
 const s=ensureSurvival(state);if(!s)return 0;const rules=survivalRules(state);let n=0;if(rules.hunger&&s.satiety<=20)n--;if(rules.fatigue&&s.fatigue>=75)n--;if(s.injury>=65&&["TRAVEL","RISKY"].includes(kind))n--;if(s.exposure>=75&&["OBSERVE","TRAVEL","RISKY"].includes(kind))n--;return clamp(n,-3,0)
}
export function survivalActionGate(state,kind){
 const s=ensureSurvival(state),rules=survivalRules(state),k=String(kind||"").toUpperCase();if(!s)return {ok:true};
 if(rules.fatigue&&["TRAVEL","RISKY"].includes(k)&&s.fatigue>=95)return {ok:false,reason:"TOO_FATIGUED",message:"你已經過度疲勞，無法安全進行這個行動。先休息會比較好。"};
 if(rules.hunger&&["TRAVEL","RISKY"].includes(k)&&s.satiety<=5)return {ok:false,reason:"TOO_HUNGRY",message:"你已經極度飢餓，無法安全進行這個行動。先補充食物會比較好。"};
 if(k==="TRAVEL"&&s.injury>=90)return {ok:false,reason:"TOO_INJURED",message:"目前傷勢太重，無法繼續長距離移動。"};
 return {ok:true}
}
export function consumeSupply(state,itemName){
 if(!runtimeStateReady(state))return false;
 const name=String(itemName||"").trim(),i=(state.inventory||[]).findIndex(x=>x.name===name);if(i<0)return false;state.inventory.splice(i,1);const s=ensureSurvival(state),rules=survivalRules(state);s.satiety=rules.hunger?clamp(s.satiety+25,0,100):100;s.exposure=clamp(s.exposure-5,0,100);refreshConditions(state,s);return true
}
export function survivalSnapshot(state){const s=ensureSurvival(state);if(!s)return neutralSurvival();return {satiety:Math.round(s.satiety),fatigue:Math.round(s.fatigue),exposure:Math.round(s.exposure),injury:Math.round(s.injury),conditions:[...s.conditions]}}

export function resolveSurvivalAction(state,label,roll){
 if(!runtimeStateReady(state))return null;
 const q=String(label||"");if(roll?.success===false||!/食用|進食|吃|喝|飲用|eat|drink/i.test(q))return null;
 const loc=(state.world?.registry?.locations||[]).find(x=>x.name===state.player?.location),foods=new Set((loc?.culture?.food||[]).map(String));
 const item=(state.inventory||[]).find(x=>q.includes(x.name)&&(foods.has(x.name)||x.consumable===true));if(!item)return {handled:true,ok:false,reason:"NO_EDIBLE_SUPPLY"};
 const before=ensureSurvival(state).satiety,ok=consumeSupply(state,item.name);return {handled:true,ok,itemName:item.name,satietyBefore:before,satietyAfter:ensureSurvival(state).satiety}
}
