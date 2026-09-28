import * as base from "./v06024-ai-client-hotfix.js?v=60026&base=1";
import {canonizeGeneration} from "./world-registry.js?v=57025";
import {saveWorld} from "./storage.js?v=60029";
import {evolutionBackoff,noteEvolutionFailure,clearEvolutionFailure} from "./v06030-background-backoff.js?v=60029";
export * from "./v06024-ai-client-hotfix.js?v=60026&base=1";

const clean=(value,max=1200)=>String(value??"").normalize("NFC").trim().slice(0,max);
const OBSERVE=/(?:観察|調べ|確認|探す|見回す|見渡す|痕跡|足跡|様子を見る|耳を澄ます|聞き耳|確かめ|見比べ|記録)/u;
const WEAK_OBSERVE_NARRATIVE=[/Engineで確定した結果が反映されました/u,/Engineで確定した判定結果を保持しています/u,/(?:^|。)(?:.+?で)?「.+?」を達成(?:しました|し、予想以上に順調な結果になりました)。?$/u,/観察判定は成功しましたが、新しい具体的な発見内容/u];
const UNKNOWN_LOCATION=/^(?:未知|未知地點|未知地点|不明|unknown|unidentified|未確認|未特定)/iu;
const japanese=()=>String(globalThis.ELYNDRA_LOCALE||"")==="ja";
const persistBackgroundState=async state=>{try{await saveWorld(state);return true}catch{return false}};

export function v06025ObservationNoDetailNarrative(action=""){const requested=clean(action,220)||"この観察";return `「${requested}」の観察判定は成功しましたが、今回の場面結果から新しい具体的な発見内容は確定できませんでした。方向・人数・時刻などは推測せず、確認済みの事実だけを扱います。`}
export function v06025WeakObservationNarrative(value=""){const text=clean(value);if(!text)return true;return WEAK_OBSERVE_NARRATIVE.some(pattern=>pattern.test(text))}
export function v06025RefineObservationScene(scene,action="",roll={}){if(roll?.success!==true||!OBSERVE.test(String(action||"")))return scene;const source=scene&&typeof scene==="object"&&!Array.isArray(scene)?scene:{};if(!v06025WeakObservationNarrative(source.narrative))return scene;return {...source,narrative:v06025ObservationNoDetailNarrative(action),outcome:"SUCCESS"}}

export function v06030RepairSparseWorldAnchor(state){
 const world=state?.world,registry=world?.registry;if(!world||!registry||!Array.isArray(registry.locations))return {applied:false,reason:"REGISTRY_UNAVAILABLE",added:0};
 if(registry.locations.length)return {applied:false,reason:"ANCHOR_PRESENT",added:0};
 const bible=world.bible||{},candidates=[{value:state?.player?.location,known:true,source:"PLAYER_LOCATION"},{value:world.state?.location,known:true,source:"WORLD_STATE_LOCATION"},{value:bible.startingLocation,known:false,source:"BIBLE_STARTING_LOCATION"},{value:bible.startingSettlement,known:false,source:"BIBLE_STARTING_SETTLEMENT"}],candidate=candidates.map(x=>({...x,name:clean(x.value,160)})).find(x=>x.name&&!UNKNOWN_LOCATION.test(x.name));
 if(!candidate)return {applied:false,reason:"CANONICAL_ANCHOR_UNAVAILABLE",added:0};
 const description=clean(state?.narrative,400)||clean(world.summary,400)||candidate.name,generation={locations:[{name:candidate.name,type:"START_ANCHOR",description,region:clean(bible.startingRegion||world.state?.region,120),known:candidate.known,historyRefs:[]}],npcs:[],factions:[],sideQuests:[],definitions:[]};
 const added=canonizeGeneration(state,generation),count=Array.isArray(added?.locations)?added.locations.length:0;
 if(count){state.events??=[];state.events.push({id:globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_SPARSE_ANCHOR_REPAIRED",visibility:"INTERNAL",locationName:candidate.name,source:candidate.source,day:Number(world.state?.day)||1,at:Date.now()})}
 return {applied:count>0,reason:count?"CANONICAL_START_ANCHOR":"NO_CHANGE",added:count,name:candidate.name,known:candidate.known,source:candidate.source}
}

export async function generateRegionExpansion(state,reason,options={}){
 const anchor=v06030RepairSparseWorldAnchor(state);if(anchor.applied)await persistBackgroundState(state);
 const guard=evolutionBackoff(state);if(guard.active){const error=new Error(`WORLD_EVOLUTION_BACKOFF_ACTIVE:${guard.retryAt}`);error.code="WORLD_EVOLUTION_BACKOFF";error.retryAt=guard.retryAt;throw error}
 try{const result=await base.generateRegionExpansion(state,reason,options);clearEvolutionFailure(state);return result}
 catch(error){const backoff=noteEvolutionFailure(state,error);if(backoff.applied){state.events??=[];state.events.push({id:globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2),type:"WORLD_EVOLUTION_PROVIDER_BACKOFF",visibility:"INTERNAL",reason:backoff.lastError,retryAt:backoff.nextRetryAt,backoffMs:backoff.backoffMs,day:Number(state?.world?.state?.day)||1,at:Date.now()});await persistBackgroundState(state)}throw error}
}

export function startTurnAIJobs(action,roll,snapshot,options={}){const jobs=base.startTurnAIJobs(action,roll,snapshot,options);if(!japanese()||!jobs?.playerAction||roll?.success!==true||!OBSERVE.test(String(action||"")))return jobs;const playerAction=Promise.resolve(jobs.playerAction).then(scene=>v06025RefineObservationScene(scene,action,roll));return {...jobs,playerAction}}
export const __v06025={OBSERVE,WEAK_OBSERVE_NARRATIVE};
