import {currentWeather} from "./weather-engine.js?v=274";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function currentLocation(state){const name=String(state.player?.location||"");return (state.world?.registry?.locations||[]).find(x=>x.name===name)||null}
export function ensureSurvival(state){
 state.player.survival??={hunger:0,fatigue:0,exposure:0,injury:0,conditions:[],lastMinute:Number(state.world?.state?.clock?.totalMinutes)||0};
 const s=state.player.survival;for(const k of ["hunger","fatigue","exposure","injury"])s[k]=clamp(Number(s[k])||0,0,100);s.conditions=Array.isArray(s.conditions)?s.conditions:[];s.lastMinute=Number.isFinite(s.lastMinute)?s.lastMinute:Number(state.world?.state?.clock?.totalMinutes)||0;return s
}
function refreshConditions(s){const out=[];if(s.hunger>=65)out.push("飢餓");if(s.fatigue>=65)out.push("疲勞");if(s.exposure>=65)out.push("環境暴露");if(s.injury>=55)out.push("傷勢");s.conditions=out}
export function tickSurvival(state,minutes,{kind="",rest=false}={}){
 const s=ensureSurvival(state),m=Math.max(0,Number(minutes)||0),loc=currentLocation(state),weather=currentWeather(state),shelter=clamp(((Number(loc?.worldState?.safety)||50)+(Number(loc?.worldState?.infrastructure)||50))/200,0,1),danger=clamp(Number(weather?.danger)||0,0,5);
 if(rest){
  s.fatigue=clamp(s.fatigue-m/6,0,100);s.exposure=clamp(s.exposure-m/12*(.5+shelter),0,100);s.injury=clamp(s.injury-m/24*(.4+shelter),0,100);s.hunger=clamp(s.hunger+m/720,0,100)
 }else{
  s.hunger=clamp(s.hunger+m/360,0,100);s.fatigue=clamp(s.fatigue+m/(String(kind).toUpperCase()==="TRAVEL"?90:150),0,100);
  s.exposure=clamp(s.exposure+(m/180)*Math.max(0,danger-1)*(1-shelter*.7),0,100)
 }
 const hp=Number(state.player?.hp)||0,max=Math.max(1,Number(state.player?.maxHp)||1);s.injury=Math.max(s.injury,clamp((1-hp/max)*70,0,100));
 refreshConditions(s);s.lastMinute=Number(state.world?.state?.clock?.totalMinutes)||s.lastMinute;
 if([s.hunger,s.fatigue,s.exposure].some(v=>v>=95)){state.player.hp=Math.max(1,(Number(state.player.hp)||1)-1)}
 return s
}
export function survivalModifier(state,kind){
 const s=ensureSurvival(state);let n=0;if(s.hunger>=80)n--;if(s.fatigue>=75)n--;if(s.injury>=65&&["TRAVEL","RISKY"].includes(kind))n--;if(s.exposure>=75&&["OBSERVE","TRAVEL","RISKY"].includes(kind))n--;return clamp(n,-3,0)
}
export function consumeSupply(state,itemName){
 const name=String(itemName||"").trim(),i=(state.inventory||[]).findIndex(x=>x.name===name);if(i<0)return false;state.inventory.splice(i,1);const s=ensureSurvival(state);s.hunger=clamp(s.hunger-25,0,100);s.exposure=clamp(s.exposure-5,0,100);refreshConditions(s);return true
}
export function survivalSnapshot(state){const s=ensureSurvival(state);return {hunger:Math.round(s.hunger),fatigue:Math.round(s.fatigue),exposure:Math.round(s.exposure),injury:Math.round(s.injury),conditions:[...s.conditions]}}

export function resolveSurvivalAction(state,label,roll){
 const q=String(label||"");if(roll?.success===false||!/食用|進食|吃|喝|飲用|eat|drink/i.test(q))return null;
 const loc=(state.world?.registry?.locations||[]).find(x=>x.name===state.player?.location),foods=new Set((loc?.culture?.food||[]).map(String));
 const item=(state.inventory||[]).find(x=>q.includes(x.name)&&(foods.has(x.name)||x.consumable===true));if(!item)return {handled:true,ok:false,reason:"NO_EDIBLE_SUPPLY"};
 const before=ensureSurvival(state).hunger,ok=consumeSupply(state,item.name);return {handled:true,ok,itemName:item.name,hungerBefore:before,hungerAfter:ensureSurvival(state).hunger}
}
