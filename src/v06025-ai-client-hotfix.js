import * as base from "./v06024-ai-client-hotfix.js?v=60024&base=1";
export * from "./v06024-ai-client-hotfix.js?v=60024&base=1";

const clean=(value,max=1200)=>String(value??"").normalize("NFC").trim().slice(0,max);
const OBSERVE=/(?:観察|調べ|確認|探す|見回す|見渡す|痕跡|足跡|様子を見る|耳を澄ます|聞き耳|確かめ|見比べ|記録)/u;
const WEAK_OBSERVE_NARRATIVE=[
 /Engineで確定した結果が反映されました/u,
 /Engineで確定した判定結果を保持しています/u,
 /(?:^|。)(?:.+?で)?「.+?」を達成(?:しました|し、予想以上に順調な結果になりました)。?$/u,
 /観察判定は成功しましたが、新しい具体的な発見内容/u
];
const japanese=()=>String(globalThis.ELYNDRA_LOCALE||"")==="ja";

export function v06025ObservationNoDetailNarrative(action=""){
 const requested=clean(action,220)||"この観察";
 return `「${requested}」の観察判定は成功しましたが、今回の場面結果から新しい具体的な発見内容は確定できませんでした。方向・人数・時刻などは推測せず、確認済みの事実だけを扱います。`;
}

export function v06025WeakObservationNarrative(value=""){
 const text=clean(value);if(!text)return true;
 return WEAK_OBSERVE_NARRATIVE.some(pattern=>pattern.test(text));
}

export function v06025RefineObservationScene(scene,action="",roll={}){
 if(roll?.success!==true||!OBSERVE.test(String(action||"")))return scene;
 const source=scene&&typeof scene==="object"&&!Array.isArray(scene)?scene:{};
 if(!v06025WeakObservationNarrative(source.narrative))return scene;
 return {...source,narrative:v06025ObservationNoDetailNarrative(action),outcome:"SUCCESS"};
}

export function startTurnAIJobs(action,roll,snapshot,options={}){
 const jobs=base.startTurnAIJobs(action,roll,snapshot,options);
 if(!japanese()||!jobs?.playerAction||roll?.success!==true||!OBSERVE.test(String(action||"")))return jobs;
 const playerAction=Promise.resolve(jobs.playerAction).then(scene=>v06025RefineObservationScene(scene,action,roll));
 return {...jobs,playerAction};
}

export const __v06025={OBSERVE,WEAK_OBSERVE_NARRATIVE};
