import {validateSaveState} from "./state-validator.js?v=61009";
const list=value=>Array.isArray(value)?value:[];
const SUCCESS_ONLY_OPS=new Set(["MOVE_PLAYER","ACQUIRE_ITEM","SET_WORLD_NAME_KNOWN","SET_CALENDAR_KNOWN","LEARN_RECIPE","LEARN_MAGIC"]);
function stable(value){if(value==null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return "["+value.map(stable).join(",")+"]";return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stable(value[k])).join(",")+"}"}
export function integrityFingerprint(value){let h=2166136261,s=stable(value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,"0")}
function rows(state,kind){const r=state?.world?.registry||{};return list(r[kind])}
function hasEntity(state,kind,id){const key=String(id||"");return rows(state,kind).some(x=>String(x?.id||"")===key||String(x?.name||x?.title||"")===key)}
function opExistsAfter(state,op){const type=String(op?.op||"").toUpperCase();if(type==="NPC_RELATIONSHIP_SIGNAL"||type==="COMPANION_SIGNAL")return hasEntity(state,"npcs",op.npcId);if(type==="FACTION_REPUTATION_SIGNAL")return hasEntity(state,"factions",op.factionId);if(type==="REVEAL_ENTITY"){const map={npc:"npcs",location:"locations",faction:"factions",sideQuest:"sideQuests"};return !map[op.kind]||hasEntity(state,map[op.kind],op.id)}if(type==="MOVE_PLAYER")return hasEntity(state,"locations",op.location);return true}
export function auditStateTransition(before,after,{patch={},plan={},context={}}={}){
 const issues=[],beforeRevision=Math.max(0,Number(before?.stateSync?.revision)||0),afterRevision=Math.max(0,Number(after?.stateSync?.revision)||0),operations=list(patch?.operations),allowed=new Set(list(plan?.capabilities).map(x=>String(x||"").toUpperCase()));
 const add=(code,details={})=>issues.push({code,...details});
 if(afterRevision!==beforeRevision+1)add("REVISION_NOT_MONOTONIC",{beforeRevision,afterRevision,expected:beforeRevision+1});
 const canonBefore=integrityFingerprint(before?.world?.canon??null),canonAfter=integrityFingerprint(after?.world?.canon??null);if(canonBefore!==canonAfter)add("IMMUTABLE_CANON_CHANGED",{before:canonBefore,after:canonAfter});
 for(const [index,op] of operations.entries()){
  const type=String(op?.op||"").toUpperCase();if(!type)continue;
  if(!allowed.has(type))add("UNAUTHORIZED_OPERATION_APPLIED",{index,op:type});
  if(!opExistsAfter(after,op))add("DANGLING_REFERENCE_AFTER_APPLY",{index,op:type});
  if(context?.roll?.success===false&&SUCCESS_ONLY_OPS.has(type))add("FAILED_OUTCOME_SUCCESS_SIDE_EFFECT",{index,op:type});
 }
 const previousErrors=new Set(validateSaveState(before).errors);
 for(const code of validateSaveState(after).errors)if(!previousErrors.has(code))add("SAVE_STATE_INVARIANT",{validationCode:code});
 const previousDay=Number(before?.world?.state?.day),currentDay=Number(after?.world?.state?.day);
 if(Number.isFinite(previousDay)&&Number.isFinite(currentDay)&&currentDay<previousDay)add("WORLD_DAY_REGRESSED",{previousDay,currentDay});
 const previousMinutes=Number(before?.world?.state?.clock?.totalMinutes),currentMinutes=Number(after?.world?.state?.clock?.totalMinutes);
 if(before?.world?.state?.clock&&after?.world?.state?.clock&&Number.isFinite(previousMinutes)&&Number.isFinite(currentMinutes)&&currentMinutes<previousMinutes)add("WORLD_TIME_REGRESSED",{previousMinutes,currentMinutes});
 for(const kind of ["locations","npcs","factions","sideQuests"]){const ids=rows(after,kind).map(x=>String(x?.id||"")).filter(Boolean);if(new Set(ids).size!==ids.length)add("DUPLICATE_ENTITY_IDS",{kind})}
 const loc=String(after?.player?.locationId||"");if(loc&&rows(after,"locations").length&&!hasEntity(after,"locations",loc))add("PLAYER_LOCATION_DANGLING",{locationId:loc});
 if(after?.player?.status==="DEAD"&&after?.combat?.active)add("DEAD_PLAYER_COMBAT_ACTIVE");
 for(const npc of rows(after,"npcs"))if(npc?.alive===false&&npc?.companion?.status==="ACTIVE")add("DEAD_NPC_ACTIVE_COMPANION",{npcId:npc.id});
 return {ok:issues.length===0,issues,beforeRevision,afterRevision,canonBefore,canonAfter,operationCount:operations.length};
}
export function restoreStateSnapshot(target,snapshot){for(const key of Object.keys(target||{}))delete target[key];Object.assign(target,structuredClone(snapshot));return target}
