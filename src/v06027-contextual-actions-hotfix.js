import * as base from "./v06021-contextual-actions-hotfix.js?v=60021";
export * from "./v06021-contextual-actions-hotfix.js?v=60021";

const clean=(value,max=260)=>String(value??"").normalize("NFC").trim().slice(0,max);
const PLAYER_ACTION_TYPES=new Set(["PLAYER_ACTION","PLAYER_ITEM_ACTION","PLAYER_ECONOMY_ACTION"]);
const japanese=()=>String(globalThis.ELYNDRA_LOCALE||"")==="ja";

function recentPlayerEvents(state,limit=8){
 return (Array.isArray(state?.events)?state.events:[]).filter(event=>PLAYER_ACTION_TYPES.has(String(event?.type||""))).slice(-Math.max(1,limit));
}

export function v06027RecentSuggestionExclusions(state,rows=[]){
 const events=recentPlayerEvents(state),visible=new Set(),out=new Set();
 for(const event of events){
  for(const value of [event?.customText,event?.originalAction,event?.playerVisibleAction]){const text=clean(value,180);if(text)visible.add(text)}
  const engine=clean(event?.engineAction,180);if(engine)out.add(engine)
 }
 for(const row of Array.isArray(rows)?rows:[]){
  if(!row||typeof row!=="object")continue;
  const shown=[row.action,row.label,row.playerVisibleAction].map(value=>clean(value,180)).filter(Boolean);
  if(shown.some(value=>visible.has(value))){const engine=clean(row.engineAction,180);if(engine)out.add(engine)}
 }
 return [...out]
}

function withRecentExclusions(state,rows,options={}){
 const explicit=Array.isArray(options?.exclude)?options.exclude:[],recent=v06027RecentSuggestionExclusions(state,rows);
 return {...options,exclude:[...explicit,...recent]}
}

const EXACT_ENGINE_LABELS=[
 [/尋找一項可以直接驗證、並能指出下一步去向的具體線索/u,"現在の目標を進められる具体的な証拠を探す"],
 [/保持可撤退距離，觀察.+的出入口、人流與最新痕跡/u,"退路を確保しながら出入口と新しい痕跡を観察する"],
 [/現有的人流、遮蔽物或聲音製造一個小干擾/u,"人の流れ・遮蔽物・音を利用して周囲の反応を観察する"],
 [/比較最新痕跡與周圍環境/u,"新しい痕跡と周囲の環境を見比べる"],
 [/尋找目前可接觸、並可能親眼看過剛才變化的人詢問/u,"現場を見た可能性のある相手を探して尋ねる"],
 [/換一個不需要未知資源的方法測試誰會作出反應/u,"未知の道具を使わず別の方法で周囲の反応を試す"],
 [/避開剛才的做法，改從另一個可直接觀察的跡象驗證/u,"さっきとは別の観察方法で現在の目標を確かめる"],
 [/刻意避開上一批建議所指向的位置與對象/u,"前の提案とは別の場所や痕跡を調べる"],
 [/另一種方式測試環境反應/u,"別の方法で周囲の反応を確かめる"],
 [/直接靠近.+目前最明顯的危險或阻礙/u,"最も目立つ危険や障害へ慎重に近づく"]
];

export function v06027JapaneseSuggestionLabel(row={}){
 if(!japanese())return clean(row?.action||row?.label,180);
 const engine=clean(row?.engineAction||row?.action,220);
 for(const [pattern,label] of EXACT_ENGINE_LABELS)if(pattern.test(engine))return label;
 const current=clean(row?.action||row?.label,180);
 if(current&&current!=="目の前で確認できることを一つ試す")return current;
 const kind=String(row?.kind||"").toUpperCase(),approach=String(row?.approach||"").toUpperCase();
 if(row?.progression===true)return "別の手掛かりから現在の目標を確かめる";
 if(kind==="OBSERVE")return "別の角度から目の前の状況を観察する";
 if(kind==="SOCIAL")return "現場で確認できる相手から情報を集める";
 if(kind==="TRAVEL")return "確認済みの経路から別の進路を試す";
 if(["HIGH","EXTREME"].includes(String(row?.risk||"").toUpperCase())||kind==="RISKY")return "危険を承知で別の手掛かりを確かめる";
 if(approach==="CREATIVE")return "別の方法で周囲の反応を確かめる";
 return "目の前の状況を別の方法で確かめる"
}

export function projectV06027ContextualSet(set={}){
 const cache=new Map(),project=row=>{
  if(!row||!japanese())return row;
  if(cache.has(row))return cache.get(row);
  const visible=v06027JapaneseSuggestionLabel(row)||"目の前の状況を別の方法で確かめる";
  const projected={...row,engineAction:clean(row.engineAction||row.action,180)||visible,action:visible,label:visible,playerVisibleAction:visible};
  cache.set(row,projected);return projected
 };
 const primary=(set.primary||[]).map(project),highRisk=(set.highRisk||[]).map(project),all=(set.all||[]).map(project);
 return {primary,highRisk,all}
}

export function buildContextualActionSet(state,rows=[],options={}){
 return projectV06027ContextualSet(base.buildContextualActionSet(state,rows,withRecentExclusions(state,rows,options)))
}
export function regenerateContextualActionSet(state,options={}){
 return projectV06027ContextualSet(base.regenerateContextualActionSet(state,withRecentExclusions(state,[],options)))
}
export function trustedSuggestionAssessment(state,row){return base.trustedSuggestionAssessment(state,row)}
export function suggestionPresentation(state,row){const presentation=base.suggestionPresentation(state,row);return row?.action?{...presentation,label:row.action,canonicalAction:row.action}:presentation}
