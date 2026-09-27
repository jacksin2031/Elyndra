import * as base from "./v06011-game-engine-hotfix.js?v=60018";
export * from "./v06011-game-engine-hotfix.js?v=60018";
const clean=v=>String(v??"").trim().slice(0,220);
const restPattern=/(?:少し|短く|しばらく|一度)?(?:休む|休もう|休み|休憩|一休み|腰を下ろ|眠る|睡眠|野営|キャンプ)/u;
function japanese(){return String(globalThis.ELYNDRA_LOCALE||"")==="ja"}
export function performAction(state,action="free",customText="",assessment=null){
 const requested=clean(customText||action)||"休む",intent=String(assessment?.actionIntent?.intent||"").toUpperCase(),isRest=japanese()&&(intent==="REST"||restPattern.test(requested));
 const next=isRest?{...(assessment||{}),verdict:"ADJUST",kind:"GENERAL",normalizedAction:requested,playerVisibleAction:requested,engineNormalizedAction:"休息",actionIntent:{...(assessment?.actionIntent||{}),kind:"GENERAL",intent:"REST",raw:requested,subActions:[requested]}}:assessment;
 const result=base.performAction(state,action,customText,next);
 if(isRest&&result&&!result.blocked){const minutes=Math.max(0,Number(result.minutes)||0);result.text=minutes?`${minutes}分ほど休み、身体を整えました。`:`「${requested}」として休息しました。`;if(state)state.narrative=result.text}
 return result
}
