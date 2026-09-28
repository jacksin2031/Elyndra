import * as base from "./v06019-game-engine-hotfix.js?v=60019&base=1";
export * from "./v06019-game-engine-hotfix.js?v=60019&base=1";

const japanese=()=>String(globalThis.ELYNDRA_LOCALE||"")==="ja";
const clean=(value,max=220)=>String(value??"").trim().slice(0,max);
const GENERIC_OBSERVE_SUCCESS=/^(?:.+?で)?「.+?」を達成(?:しました|し、予想以上に順調な結果になりました)。?$/u;

export function v06025ObservationSuccessNarrative(action="",{critical=false}={}){
 const requested=clean(action)||"この観察";
 const lead=critical?"観察判定は大成功しました。":"観察判定は成功しました。";
 return `「${requested}」の${lead}ただし、Engineで確認できた範囲では、新しい具体的な発見内容までは確定していません。方向・人数・時刻などを推測で補わず、後続の場面描写で確認できた事実だけを扱います。`;
}

export function v06025RefineObservationEngineText(text="",action="",roll={}){
 const raw=String(text??""),lines=raw.split(/\r?\n/),first=String(lines[0]||"").trim();
 if(roll?.success!==true||!GENERIC_OBSERVE_SUCCESS.test(first))return raw;
 const replacement=v06025ObservationSuccessNarrative(action,{critical:String(roll?.grade||"")==="CRITICAL_SUCCESS"});
 return [replacement,...lines.slice(1).filter(Boolean)].join("\n");
}

export function performAction(state,action="free",customText="",assessment=null){
 const result=base.performAction(state,action,customText,assessment);
 if(!japanese()||!result||result.blocked||String(result.actionKind||"").toUpperCase()!=="OBSERVE"||result.roll?.success!==true)return result;
 const requested=clean(assessment?.playerVisibleAction||assessment?.normalizedAction||customText||action)||"この観察";
 const refined=v06025RefineObservationEngineText(result.text,requested,result.roll);
 if(refined!==result.text){result.text=refined;if(state)state.narrative=refined}
 return result;
}

export const __v06025={GENERIC_OBSERVE_SUCCESS};
