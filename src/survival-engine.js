import {currentWeather} from "./weather-engine.js?v=276";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function currentLocation(state){const name=String(state.player?.location||"");return (state.world?.registry?.locations||[]).find(x=>x.name===name)||null}
export function ensureSurvival(state){
 state.player.survival??={satiety:100,fatigue:0,exposure:0,injury:0,conditions:[],lastMinute:Number(state.world?.state?.clock?.totalMinutes)||0};
 const s=state.player.survival;if(!Number.isFinite(Number(s.satiety))&&Number.isFinite(Number(s.hunger)))s.satiety=100-clamp(Number(s.hunger),0,100);delete s.hunger;for(const k of ["satiety","fatigue","exposure","injury"])s[k]=clamp(Number(s[k])||0,0,100);s.conditions=Array.isArray(s.conditions)?s.conditions:[];s.lastMinute=Number.isFinite(s.lastMinute)?s.lastMinute:Number(state.world?.state?.clock?.totalMinutes)||0;return s
}
function refreshConditions(s){const out=[];if(s.satiety<=35)out.push("飢餓");if(s.fatigue>=65)out.push("疲勞");if(s.exposure>=65)out.push("環境暴露");if(s.injury>=55)out.push("傷勢");s.conditions=out}
export function tickSurvival(state,minutes,{kind="",rest=false}={}){
 const s=ensureSurvival(state),m=Math.max(0,Number(minutes)||0),loc=currentLocation(state),weather=currentWeather(state),shelter=clamp(((Number(loc?.worldState?.safety)||50)+(Number(loc?.worldState?.infrastructure)||50))/200,0,1),danger=clamp(Number(weather?.danger)||0,0,5);
 if(rest){
  s.fatigue=clamp(s.fatigue-m/6,0,100);s.exposure=clamp(s.exposure-m/12*(.5+shelter),0,100);s.injury=clamp(s.injury-m/24*(.4+shelter),0,100);s.satiety=clamp(s.satiety-m/720,0,100)
 }else{
  s.satiety=clamp(s.satiety-m/360,0,100);s.fatigue=clamp(s.fatigue+m/(String(kind).toUpperCase()==="TRAVEL"?90:150),0,100);
  s.exposure=clamp(s.exposure+(m/180)*Math.max(0,danger-1)*(1-shelter*.7),0,100)
 }
 const hp=Number(state.player?.hp)||0,max=Math.max(1,Number(state.player?.maxHp)||1);s.injury=Math.max(s.injury,clamp((1-hp/max)*70,0,100));
 refreshConditions(s);s.lastMinute=Number(state.world?.state?.clock?.totalMinutes)||s.lastMinute;
 if(s.satiety<=5||s.fatigue>=95||s.exposure>=95){state.player.hp=Math.max(1,(Number(state.player.hp)||1)-1)}
 return s
}
export function survivalModifier(state,kind){
 const s=ensureSurvival(state);let n=0;if(s.satiety<=20)n--;if(s.fatigue>=75)n--;if(s.injury>=65&&["TRAVEL","RISKY"].includes(kind))n--;if(s.exposure>=75&&["OBSERVE","TRAVEL","RISKY"].includes(kind))n--;return clamp(n,-3,0)
}
export function survivalActionGate(state,kind){
 const s=ensureSurvival(state),k=String(kind||"").toUpperCase();
 if(["TRAVEL","RISKY"].includes(k)&&s.fatigue>=95)return {ok:false,reason:"TOO_FATIGUED",message:"你已經過度疲勞，無法安全進行這個行動。先休息會比較好。"};
 if(["TRAVEL","RISKY"].includes(k)&&s.satiety<=5)return {ok:false,reason:"TOO_HUNGRY",message:"你已經極度飢餓，無法安全進行這個行動。先補充食物會比較好。"};
 if(k==="TRAVEL"&&s.injury>=90)return {ok:false,reason:"TOO_INJURED",message:"目前傷勢太重，無法繼續長距離移動。"};
 return {ok:true}
}
export function consumeSupply(state,itemName){
 const name=String(itemName||"").trim(),i=(state.inventory||[]).findIndex(x=>x.name===name);if(i<0)return false;state.inventory.splice(i,1);const s=ensureSurvival(state);s.satiety=clamp(s.satiety+25,0,100);s.exposure=clamp(s.exposure-5,0,100);refreshConditions(s);return true
}
export function survivalSnapshot(state){const s=ensureSurvival(state);return {satiety:Math.round(s.satiety),fatigue:Math.round(s.fatigue),exposure:Math.round(s.exposure),injury:Math.round(s.injury),conditions:[...s.conditions]}}

export function resolveSurvivalAction(state,label,roll){
 const q=String(label||"");if(roll?.success===false||!/食用|進食|吃|喝|飲用|eat|drink/i.test(q))return null;
 const loc=(state.world?.registry?.locations||[]).find(x=>x.name===state.player?.location),foods=new Set((loc?.culture?.food||[]).map(String));
 const item=(state.inventory||[]).find(x=>q.includes(x.name)&&(foods.has(x.name)||x.consumable===true));if(!item)return {handled:true,ok:false,reason:"NO_EDIBLE_SUPPLY"};
 const before=ensureSurvival(state).satiety,ok=consumeSupply(state,item.name);return {handled:true,ok,itemName:item.name,satietyBefore:before,satietyAfter:ensureSurvival(state).satiety}
}
