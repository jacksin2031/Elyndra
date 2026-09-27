import {groundedTravelDestination} from "./contextual-actions.js?v=60010";
import {travelTo,locationAccessStatus} from "./travel-engine.js?v=57025";

const clean=(v,max=220)=>typeof v==="string"?v.trim().slice(0,max):"";
const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const PERMISSION_REQUEST=/(?:通行許可|許可|通行証|通行證|入港|入場|立入|通して|通れる|permit|permission|access|pass\b|允許|允许)/iu;

export function currentProjectionLocation(state){
 const token=String(state?.player?.location||state?.world?.state?.location||"");
 return (state?.world?.registry?.locations||[]).find(x=>String(x?.id||"")===token||String(x?.name||"")===token)||null
}
function intentOf(assessment={}){return assessment?.actionIntent||{}}
function canonicalTravelTarget(state,label,roll,assessment={}){
 const intent=intentOf(assessment),targetId=clean(intent?.targetId||assessment?.targetId,120),rows=state?.world?.registry?.locations||[],current=currentProjectionLocation(state);
 const explicitById=targetId?rows.find(x=>String(x?.id||"")===targetId||String(x?.name||"")===targetId):null;if(explicitById&&explicitById!==current)return explicitById;
 const explicitByName=rows.filter(x=>x&&x!==current&&x.name&&String(label||"").includes(String(x.name))).sort((a,b)=>String(b.name).length-String(a.name).length)[0]||null;if(explicitByName)return explicitByName;
 return groundedTravelDestination(state,label,roll,intent)
}
export function projectSuccessfulTravel(state,label,result,assessment={},formatText=v=>String(v??"")){
 if(!state||!result||result.deterministic||result.ruleEffects?.travel||result.roll?.success!==true)return null;
 const intent=intentOf(assessment),kind=String(intent?.kind||result.actionKind||result.roll?.profile?.kind||"").toUpperCase(),semantic=String(intent?.intent||"").toUpperCase();
 if(kind!=="TRAVEL"&&semantic!=="TRAVEL"&&String(result.actionKind||"").toUpperCase()!=="TRAVEL")return null;
 const before=currentProjectionLocation(state),target=canonicalTravelTarget(state,label,result.roll,assessment);if(!before||!target||target===before)return null;
 const moved=travelTo(state,target,{roll:result.roll,actionKind:"TRAVEL",baseMinutes:Math.max(0,Number(result.minutes)||45)});if(!moved.ok)return null;
 result.ruleEffects??={};result.ruleEffects.travel=moved;result.travelProjected=true;const arrival=formatText(`你沿著可通行路線抵達 ${target.name}。`);result.text=[clean(result.text,1200),arrival].filter(Boolean).join("\n");state.narrative=result.text;return moved
}
function adjacentLocations(state){
 const here=currentProjectionLocation(state),rows=state?.world?.registry?.locations||[],routes=state?.world?.travel?.routes||[];if(!here)return [];
 const byId=new Map(rows.map(x=>[String(x?.id||""),x])),out=[];
 for(const route of routes){if(!route||route.open===false)continue;let other="";if(String(route.fromId||"")===String(here.id||""))other=String(route.toId||"");else if(String(route.toId||"")===String(here.id||""))other=String(route.fromId||"");else continue;const loc=byId.get(other);if(loc&&loc!==here&&!out.includes(loc))out.push(loc)}return out
}
function presentNpc(state,assessment={}){
 const rows=state?.world?.registry?.npcs||[],here=currentProjectionLocation(state),targetId=clean(intentOf(assessment)?.targetId||assessment?.targetId,120),present=n=>Boolean(n&&n.alive!==false&&(n.companion?.status==="ACTIVE"||(here&&String(n.locationId||"")===String(here.id||""))));
 const explicit=targetId?rows.find(n=>String(n?.id||"")===targetId||String(n?.name||"")===targetId):null;if(present(explicit))return explicit;const candidates=rows.filter(present);return candidates.length===1?candidates[0]:null
}
export function projectPermissionGrant(state,label,result,assessment={},formatText=v=>String(v??"")){
 if(!state||result?.roll?.success!==true||!PERMISSION_REQUEST.test(String(label||"")))return null;
 const intent=intentOf(assessment),kind=String(intent?.kind||result.actionKind||"").toUpperCase(),semantic=String(intent?.intent||"").toUpperCase();if(kind!=="SOCIAL"&&!['TALK','PERSUADE'].includes(semantic))return null;
 const npc=presentNpc(state,assessment);if(!npc)return null;
 const candidates=adjacentLocations(state).filter(loc=>loc?.known===true).map(loc=>({loc,status:locationAccessStatus(state,loc)})).filter(x=>x.status.missing.length===1&&String(x.status.missing[0]?.type||"").toUpperCase()==="EVENT_OCCURRED");
 const named=candidates.filter(x=>x.loc?.name&&String(label||"").includes(String(x.loc.name))),chosen=named.length===1?named[0]:candidates.length===1?candidates[0]:null;if(!chosen)return null;
 const requirement=chosen.status.missing[0],eventType=clean(requirement.id,120);if(!eventType)return null;state.events??=[];
 if(!state.events.some(e=>String(e?.type||"")===eventType))state.events.push({id:uid("EV"),type:eventType,canonicalType:"TRAVEL_PERMISSION_GRANTED",visibility:"PLAYER_KNOWN",npcId:npc.id,destinationId:chosen.loc.id,summary:formatText(`你取得了前往「${chosen.loc.name}」的通行許可。`),day:state.world?.state?.day||1,at:Date.now()});
 if(!locationAccessStatus(state,chosen.loc).allowed)return null;
 const grant={npcId:npc.id,destinationId:chosen.loc.id,destinationName:chosen.loc.name,requirementId:eventType};result.ruleEffects??={};result.ruleEffects.accessGrant=grant;result.text=[clean(result.text,1200),formatText(`你取得了前往「${chosen.loc.name}」的通行許可。`)].filter(Boolean).join("\n");state.narrative=result.text;return grant
}
