export * from "./world-timeline-base.js?v=59008";
import * as base from "./world-timeline-base.js?v=59008";

const clean=(v,max=600)=>typeof v==="string"?v.trim().slice(0,max):"";
function slotFallback(slot,index){return {id:`TL-FALLBACK-${slot.slot}`,title:`世界局勢變化 ${slot.slot}`,category:"WORLD_EVENT",directorTruth:`既有世界矛盾在第 ${slot.slot} 個時間節點累積到足以改變局勢的程度。`,observableEffect:`玩家可從人物行動、資源流動或環境變化觀察到第 ${slot.slot} 個局勢轉折。`,pressure:Math.min(15,3+index),impactScope:"REGIONAL",intensity:Math.min(100,30+index*5),domains:["SECURITY"],activationConditions:[],cancelConditions:[],escalationConditions:[],playerCanPrevent:true,playerCanAccelerate:true,playerCanMitigate:true,playerCanRedirect:true}}

export function bindTimelineAuthoringSlots(input=[],pacing=base.createTimelinePacing()){
 const slots=base.timelineAuthoringSlots(pacing),rows=Array.isArray(input)?input:[];
 return slots.map((slot,i)=>{
  const row=rows[i]&&typeof rows[i]==="object"?rows[i]:{},fallback=slotFallback(slot,i),validTitle=clean(row.title,120),validTruth=clean(row.directorTruth,600),validEffect=clean(row.observableEffect,500);
  return {...fallback,...row,title:validTitle||fallback.title,directorTruth:validTruth.length>=8?row.directorTruth:fallback.directorTruth,observableEffect:validEffect.length>=8?row.observableEffect:fallback.observableEffect,earliestDay:slot.earliestDay,latestDay:slot.latestDay}
 })
}
