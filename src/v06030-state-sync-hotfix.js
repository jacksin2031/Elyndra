import * as base from "./state-sync.js?v=57025&base=1";
export * from "./state-sync.js?v=57025&base=1";

const clean=(value,max=500)=>String(value??"").normalize("NFC").trim().slice(0,max);
const OBSERVE_WORD=/(?:觀察|查看|檢查|搜尋|調查|聆聽|閱讀|確認|痕跡|足跡|observe|inspect|search|listen|観察|調べ|確認|探す|見回す|見渡す|痕跡|足跡|様子を見る|耳を澄ます|聞き耳|確かめ|見比べ|記録)/iu;
const PROGRESS_OPS=new Set(["DISCOVER_FACT","REVEAL_ENTITY"]);

function observationTurn(context={}){
 if(context?.roll?.success!==true)return false;
 const kind=String(context?.roll?.profile?.kind||context?.actionKind||"").toUpperCase();
 if(kind)return kind==="OBSERVE";
 return OBSERVE_WORD.test(String(context?.action||""));
}
function currentLocation(state){
 const rows=state?.world?.registry?.locations||[],player=clean(state?.player?.location,160),world=clean(state?.world?.state?.location,160);
 return rows.find(x=>clean(x?.name,160)===player)||rows.find(x=>clean(x?.name,160)===world)||null;
}
function locationAlreadyRecorded(state,loc){
 const sourceId=String(loc?.id||loc?.name||"");if(!sourceId)return true;
 return (Array.isArray(state?.knowledge)?state.knowledge:[]).some(row=>{
  const ref=row?.sourceRef||{};return String(ref?.kind||row?.sourceKind||"").toUpperCase()==="LOCATION"&&String(ref?.id||row?.sourceId||"")===sourceId;
 });
}
function presentHiddenNpc(state,loc){
 if(!loc)return null;
 return (state?.world?.registry?.npcs||[]).find(n=>n?.alive!==false&&n?.known!==true&&String(n?.locationId||"")===String(loc?.id||""))||null;
}
function localeTitle(loc){
 const name=clean(loc?.name,80)||"current location",locale=String(globalThis.ELYNDRA_LOCALE||stateLocale(loc)||"zh-Hant");
 if(locale==="ja")return `${name}で確認できる環境`;
 if(locale==="en")return `Observable details at ${name}`;
 if(locale==="zh-Hans")return `${name}可确认的环境`;
 return `${name}可確認的環境`;
}
function stateLocale(loc){return ""}

export function deterministicObservationFallback(state,context={}){
 if(!observationTurn(context))return null;
 const loc=currentLocation(state);if(!loc)return null;
 if(loc.known!==true&&loc.id)return {op:"REVEAL_ENTITY",kind:"location",id:String(loc.id),__v06030Reason:"CURRENT_LOCATION_REVEALED"};
 const npc=presentHiddenNpc(state,loc);if(npc?.id)return {op:"REVEAL_ENTITY",kind:"npc",id:String(npc.id),__v06030Reason:"PRESENT_NPC_REVEALED"};
 const description=clean(loc.description,500);
 if(description&&!locationAlreadyRecorded(state,loc))return {op:"DISCOVER_FACT",title:localeTitle(loc),text:description,factId:"",evidenceType:"OBSERVED",sourceKind:"LOCATION",sourceId:String(loc.id||loc.name),__v06030Reason:"CURRENT_LOCATION_CANON_RECORDED"};
 return null;
}

function hasProgress(result){return (result?.patch?.operations||[]).some(op=>PROGRESS_OPS.has(String(op?.op||"").toUpperCase()))||Boolean(result?.deferredEvidence?.length)}
function mergeGrounded(primary,fallback){
 if(!fallback?.patch?.operations?.length)return primary;
 const next={...primary,patch:structuredClone(primary.patch||{}),rejected:[...(primary.rejected||[])],deferredEvidence:[...(primary.deferredEvidence||[])]};
 next.patch.operations=[...(primary.patch?.operations||[]),...fallback.patch.operations];
 next.rejected.push(...(fallback.rejected||[]));next.deferredEvidence.push(...(fallback.deferredEvidence||[]));
 next.observationFallback=fallback.patch.operations[0]?.__v06030Reason||"GROUNDABLE_CANON_PROGRESS";
 return next;
}

export function groundStatePatch(state,patch={},context={}){
 const grounded=base.groundStatePatch(state,patch,context);
 if(String(context?.evidencePhase||"").toUpperCase()!=="STATE_PENDING"||!observationTurn(context)||hasProgress(grounded))return grounded;
 const operation=deterministicObservationFallback(state,context);if(!operation)return grounded;
 const fallback=base.groundStatePatch(state,{baseRevision:grounded?.patch?.baseRevision??patch?.baseRevision,operations:[operation]},context);
 return mergeGrounded(grounded,fallback);
}

export const __v06030={OBSERVE_WORD,observationTurn,currentLocation,locationAlreadyRecorded,presentHiddenNpc};
