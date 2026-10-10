const KEY="elyndra:browser-decision-settings:v1";
export const BROWSER_DECISION_MODEL=Object.freeze({
 id:"Xenova/paraphrase-multilingual-MiniLM-L12-v2",
 revision:"2c4055b12046f11709e9df2c122e59ffbdc2f900",
 webgpuDtype:"fp16",
 wasmDtype:"q8"
});
export const BROWSER_DECISION_SETTINGS_DEFAULT=Object.freeze({
 enabled:false,
 mode:"SHADOW_ONLY",
 minConfidence:.65,
 model:BROWSER_DECISION_MODEL
});
const storage=()=>{try{return globalThis.localStorage||null}catch{return null}};
export function loadBrowserDecisionSettings(){
 try{
  const raw=JSON.parse(storage()?.getItem(KEY)||"{}"),model=raw?.model&&typeof raw.model==="object"?raw.model:{};
  return {...BROWSER_DECISION_SETTINGS_DEFAULT,...raw,enabled:Boolean(raw?.enabled),mode:"SHADOW_ONLY",minConfidence:Math.max(.5,Math.min(.95,Number(raw?.minConfidence)||.65)),model:{...BROWSER_DECISION_MODEL,...model}};
 }catch{return {...BROWSER_DECISION_SETTINGS_DEFAULT,model:{...BROWSER_DECISION_MODEL}}}
}
export function saveBrowserDecisionSettings(value={}){
 const current=loadBrowserDecisionSettings(),next={...current,...value,enabled:Boolean(value?.enabled??current.enabled),mode:"SHADOW_ONLY",minConfidence:Math.max(.5,Math.min(.95,Number(value?.minConfidence??current.minConfidence)||.65)),model:{...BROWSER_DECISION_MODEL,...(current.model||{}),...(value?.model||{})}};
 storage()?.setItem(KEY,JSON.stringify(next));return next
}
