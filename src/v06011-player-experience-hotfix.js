import * as base from "./player-experience.js?v=57028&base=1";
import {safePlayerVisibleText} from "./v06011-locale-runtime-hotfix.js?v=60011";
export * from "./player-experience.js?v=57028&base=1";

const clean=(v,max=320)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=(rows,max=4)=>[...new Set((Array.isArray(rows)?rows:[]).map(x=>clean(x,180)).filter(Boolean))].slice(0,max);
const locale=()=>String(globalThis.ELYNDRA_LOCALE||"zh-Hant");
function currentLocation(state){return clean(state?.player?.location||state?.world?.state?.location,100)}
function presentNpc(state){
 const loc=currentLocation(state),rows=state?.world?.registry?.locations||[],record=rows.find(x=>x?.name===loc||x?.id===loc),id=record?.id;
 return (state?.world?.registry?.npcs||[]).find(n=>n?.known===true&&n?.alive!==false&&(n?.companion?.status==="ACTIVE"||(id&&n?.locationId===id)))||null
}
function jaFallbackSuggestions(state={},context={}){
 const out=[],npc=presentNpc(state),loc=currentLocation(state),action=clean(context?.action,120),previous=new Set((state?.suggestions||[]).map(x=>clean(typeof x==="string"?x:x?.label,180)).filter(Boolean));
 if(npc?.name)out.push(`${clean(npc.name,60)}に、さっき何を最も気にしていたか尋ねる`);
 if(action)out.push("先ほどの行動に関係した場所や物を調べ、具体的な変化がないか確認する");
 if(loc)out.push(`${loc}で人の流れと出入口を見渡せる位置から観察する`);
 out.push("地面や周囲の物に残った新しい痕跡を調べる","人混みを避けている人物に、さっき何を見たか尋ねる","最も新しい痕跡を少しだけ追い、どこへ続くか確かめる");
 return uniq(out.filter(x=>!previous.has(x)),4)
}
export function roleplayFallbackSuggestions(state={},context={}){return locale()==="ja"?jaFallbackSuggestions(state,context):base.roleplayFallbackSuggestions(state,context)}
export function projectObservableWorldChanges(state,narrative=""){
 const result=base.projectObservableWorldChanges(state,narrative);if(locale()!=="ja")return result;
 result.narrative=safePlayerVisibleText(result.narrative,"ja");
 if(Array.isArray(result.projected))for(const row of result.projected)if(typeof row?.summary==="string")row.summary=safePlayerVisibleText(row.summary,"ja");
 return result
}
export function sessionCheckpoint(state,reason=""){
 const result=base.sessionCheckpoint(state,reason);if(locale()!=="ja"||!result)return result;
 if(typeof result.summary==="string")result.summary=safePlayerVisibleText(result.summary,"ja");
 if(Array.isArray(result.worldChanges))result.worldChanges=result.worldChanges.map(x=>safePlayerVisibleText(x,"ja"));
 const event=(state?.events||[]).findLast?.(e=>e?.type==="SESSION_CHECKPOINT");if(event?.summary)event.summary=safePlayerVisibleText(event.summary,"ja");
 return result
}
