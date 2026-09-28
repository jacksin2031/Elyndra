import * as base from "./world-quality.js?v=57025&base=1";
export * from "./world-quality.js?v=57025&base=1";

export function backgroundQualityNeed(state){
 const bg=state?.world?.quality?.background,current=Number(state?.world?.version)||1;
 if(bg?.running===true)return {required:false,reason:"RUNNING"};
 if(bg?.error){
  const reviewed=Number(bg?.reviewedWorldVersion)||0;
  if(current>=reviewed)return {required:true,reason:"RETRY_AFTER_FAILURE"}
 }
 return base.backgroundQualityNeed(state)
}

export function recordBackgroundQualityReview(state,{evaluation=null,repair=null,error=""}={}){
 const prior=state?.world?.quality?.background&&typeof state.world.quality.background==="object"?structuredClone(state.world.quality.background):{};
 const row=base.recordBackgroundQualityReview(state,{evaluation,repair,error});
 if(evaluation||!String(error||"").trim())return row;
 const attemptAt=Number(row?.reviewedAt)||Date.now(),attemptVersion=Number(row?.reviewedWorldVersion)||Number(state?.world?.version)||1;
 row.lastAttemptAt=attemptAt;
 row.lastAttemptWorldVersion=attemptVersion;
 row.lastError=String(error||"").trim().slice(0,300);
 row.reviewedAt=Number(prior?.reviewedAt)||0;
 row.reviewedWorldVersion=Number(prior?.reviewedWorldVersion)||0;
 return row
}
