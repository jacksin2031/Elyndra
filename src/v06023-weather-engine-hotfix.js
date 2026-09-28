import * as base from "./weather-engine.js?v=57025&base=1";
import {loadLocale} from "./locale-runtime.js?v=60010";
import {localizeV06015JapaneseVisibleText} from "./v06015-ja-visible-text.js?v=60018";
export * from "./weather-engine.js?v=57025&base=1";

const JA=new Map([
 ["穩定天象","安定した天候"],
 ["天空與氣流相對平穩","空と気流は比較的穏やかだ"],
 ["世界環境暫時處於較穩定狀態。","周囲の環境は一時的に安定している。"],
 ["周圍沒有明顯的天候異常。","周囲に目立った天候異常はない。"],
 ["環境擾動","環境擾乱"],
 ["周圍出現明顯環境擾動","周囲に明らかな環境擾乱が生じている"],
 ["風、能量或大氣條件出現足以影響活動的變化。","風・エネルギー・大気条件に、行動へ影響するほどの変化が生じている。"],
 ["空氣與遠方景象變得不穩定。","空気と遠景が不安定に揺らいでいる。"],
 ["低能見現象","低視界現象"],
 ["視野被流動介質遮蔽","流動する物質によって視界が遮られている"],
 ["世界中的懸浮物、霧狀能量或其他介質降低能見度。","浮遊物、霧状のエネルギー、その他の媒体によって視界が低下している。"],
 ["遠處輪廓逐漸變得模糊。","遠くの輪郭が徐々にぼやけていく。"],
 ["異常天象","異常天候"],
 ["天空與環境出現不尋常異象","空と周囲の環境に異常な現象が現れている"],
 ["由這個世界自身法則造成的罕見天氣異常。","この世界固有の法則によって生じる、まれな天候異常。"],
 ["光線、聲音或空氣質感出現不尋常變化。","光や音、空気の質感に異常な変化が現れる。"],
 ["天氣由世界自身環境法則與時間變化共同形成。","天候は、この世界固有の環境法則と時間変化によって形成される。"],
 ["世界環境與能量循環","世界環境とエネルギー循環"],
 ["天候會隨世界時間與地區逐步轉變。","天候は世界時間と地域に応じて徐々に変化する。"]
]);
const japanese=()=>loadLocale()==="ja";
function jaText(value){
 const raw=String(value??"");if(!raw||!japanese())return raw;
 const exact=JA.get(raw)||raw;
 return localizeV06015JapaneseVisibleText(exact)
}
function projectPhenomenon(p){
 if(!p||!japanese())return p;
 return {...p,name:jaText(p.name),observableName:jaText(p.observableName),description:jaText(p.description),sensoryCue:jaText(p.sensoryCue)}
}
function projectSystem(sys){
 if(!sys||!japanese())return sys;
 return {...sys,identity:jaText(sys.identity),source:jaText(sys.source),cycle:jaText(sys.cycle),phenomena:(sys.phenomena||[]).map(projectPhenomenon)}
}
function projectEvent(event){
 if(event&&japanese()&&event.summary)event.summary=jaText(event.summary);
 return event
}

export function normalizeWeatherSystem(input={},seed={}){return projectSystem(base.normalizeWeatherSystem(input,seed))}
export function currentWeather(state){return projectPhenomenon(base.currentWeather(state))}
export function tickWeather(state,options={}){return projectEvent(base.tickWeather(state,options))}
export function retargetWeather(state){return projectEvent(base.retargetWeather(state))}
export function playerWeatherSnapshot(state){
 const snap=base.playerWeatherSnapshot(state);if(!japanese())return snap;
 return {...snap,observableName:jaText(snap.observableName),sensoryCue:jaText(snap.sensoryCue)}
}
export function weatherUiSnapshot(state){
 const snap=base.weatherUiSnapshot(state);if(!japanese())return snap;
 return {...snap,observableName:jaText(snap.observableName),sensoryCue:jaText(snap.sensoryCue)}
}
export function directorWeatherSnapshot(state){
 const snap=base.directorWeatherSnapshot(state);if(!japanese())return snap;
 return {...snap,current:projectPhenomenon(snap.current),system:projectSystem(snap.system)}
}

export const __v06023={jaText,projectPhenomenon,projectSystem};
