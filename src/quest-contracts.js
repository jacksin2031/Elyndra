const clean=(value,max=240)=>typeof value==="string"?value.trim().slice(0,max):"";
const list=value=>Array.isArray(value)?value:[];
const uniq=(value,max=8)=>[...new Set(list(value).map(x=>clean(x,160)).filter(Boolean))].slice(0,max);

export const QUEST_CONTINUITY_MODES=Object.freeze(["NEW_THREAD","FOLLOW_UP","CONSEQUENCE","ESCALATION","PAYOFF"]);
export const QUEST_CONDITION_TYPES=Object.freeze(["FACT_KNOWN","ITEM_OWNED","ITEM_USED","ITEM_SHOWN","ITEM_GIVEN","ENTITY_KNOWN","EVENT_OCCURRED","LOCATION_STATE","NPC_STATE","FACTION_STATE","PLAYER_STATE"]);
export const QUEST_TERMINAL_STATUSES=Object.freeze(["COMPLETED","FAILED","ABANDONED","DECLINED","EXPIRED"]);
const conditionTypes=new Set(QUEST_CONDITION_TYPES),continuityModes=new Set(QUEST_CONTINUITY_MODES);

export function normalizeQuestCondition(input){
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const type=String(input.type||"").toUpperCase();if(!conditionTypes.has(type))return null;
 const id=clean(input.id,140),field=clean(input.field,80),op=String(input.op||"GTE").toUpperCase();
 const needsId=type!=="PLAYER_STATE";
 if(needsId&&!id)return null;
 if(["LOCATION_STATE","NPC_STATE","FACTION_STATE","PLAYER_STATE"].includes(type)&&!field)return null;
 if(!["GTE","LTE","EQ","NEQ"].includes(op))return null;
 return {type,id,field,op,value:input.value,description:clean(input.description,180)}
}

export function normalizeQuestConditions(input,max=5){
 return list(input).map(normalizeQuestCondition).filter(Boolean).slice(0,max)
}
function entityLabel(row){return clean(row?.name||row?.title,120)}
function entityAliases(row){const label=entityLabel(row),rows=[label,...label.split(/[·・|｜\/／:：()（）\[\]【】\s]+/u)];return [...new Set(rows.map(x=>clean(x,120)).filter(x=>x.length>=2))]}
function entityPool(context={},type="ENTITY_KNOWN"){
 const rows={LOCATION_STATE:list(context.locations),NPC_STATE:list(context.npcs),FACTION_STATE:list(context.factions)};
 return type==="ENTITY_KNOWN"?[...list(context.locations),...list(context.npcs),...list(context.factions),...list(context.sideQuests)]:rows[type]||[]
}
function mentionedEntity(condition,pool){const description=clean(condition?.description,180).normalize("NFKC").toLocaleLowerCase(),matches=pool.filter(row=>entityAliases(row).some(alias=>description.includes(alias.normalize("NFKC").toLocaleLowerCase())));return matches.length===1?matches[0]:null}
export function questConditionReferenceIssues(input={},context={}){
 const conditions=normalizeQuestConditions(input?.conditions??input,5),issues=[];
 for(let i=0;i<conditions.length;i++){
  const c=conditions[i];
  if(["ENTITY_KNOWN","LOCATION_STATE","NPC_STATE","FACTION_STATE"].includes(c.type)){const pool=entityPool(context,c.type),target=pool.find(row=>String(row?.id||"")===c.id);if(!target){issues.push(`QUEST_CONDITION_ENTITY_UNKNOWN:${i}:${c.type}:${c.id}`);continue}const mentioned=mentionedEntity(c,pool);if(mentioned&&String(mentioned.id||"")!==c.id)issues.push(`QUEST_CONDITION_ENTITY_SEMANTIC_MISMATCH:${i}:${c.id}->${mentioned.id}`);continue}
  if(c.type==="FACT_KNOWN"&&!list(context.facts).some(row=>String(row?.id||row?.factId||"")===c.id))issues.push(`QUEST_CONDITION_REFERENCE_UNKNOWN:${i}:${c.type}:${c.id}`);
  if(["ITEM_OWNED","ITEM_USED","ITEM_SHOWN","ITEM_GIVEN"].includes(c.type)&&!list(context.items).some(row=>String(row?.id||"")===c.id))issues.push(`QUEST_CONDITION_REFERENCE_UNKNOWN:${i}:${c.type}:${c.id}`);
  if(c.type==="EVENT_OCCURRED"&&!list(context.events).some(row=>String(row?.id||"")===c.id||String(row?.type||"")===c.id))issues.push(`QUEST_CONDITION_REFERENCE_UNKNOWN:${i}:${c.type}:${c.id}`)
 }
 return [...new Set(issues)]
}
export function repairQuestConditionEntityBindings(input={},context={}){
 return normalizeQuestConditions(input?.conditions??input,5).map(c=>{if(!["ENTITY_KNOWN","LOCATION_STATE","NPC_STATE","FACTION_STATE"].includes(c.type))return c;const pool=entityPool(context,c.type),mentioned=mentionedEntity(c,pool);return mentioned&&String(mentioned.id||"")!==c.id?{...c,id:String(mentioned.id)}:c})
}
export function normalizeQuestContinuity(input={}){
 const raw=String(input.continuityMode||"NEW_THREAD").toUpperCase(),continuityMode=continuityModes.has(raw)?raw:"NEW_THREAD";
 const predecessorQuestIds=continuityMode==="NEW_THREAD"?[]:uniq(input.predecessorQuestIds,3);
 const requestedDepth=Math.round(Number(input.chainDepth));
 return {
  continuityMode,
  predecessorQuestIds,
  arcId:clean(input.arcId,120),
  chainDepth:Number.isFinite(requestedDepth)?Math.max(0,Math.min(12,requestedDepth)):0,
  motivation:clean(input.motivation,320),
  stakes:clean(input.stakes,320),
  completionConsequences:uniq(input.completionConsequences,4),
  failureConsequences:uniq(input.failureConsequences,4)
 }
}

export function questContinuityIssues(input={},existingQuests=[]){
 const c=normalizeQuestContinuity(input),issues=[],byId=new Map(list(existingQuests).map(x=>[String(x?.id||""),x]));
 if(c.continuityMode==="NEW_THREAD"&&list(input.predecessorQuestIds).length)issues.push("QUEST_NEW_THREAD_HAS_PREDECESSOR");
 if(c.continuityMode!=="NEW_THREAD"&&!c.predecessorQuestIds.length)issues.push("QUEST_CONTINUITY_PREDECESSOR_REQUIRED");
 for(const id of c.predecessorQuestIds){const prior=byId.get(id);if(!prior){issues.push("QUEST_PREDECESSOR_UNKNOWN:"+id);continue}if(!QUEST_TERMINAL_STATUSES.includes(String(prior.status||"").toUpperCase()))issues.push("QUEST_PREDECESSOR_NOT_TERMINAL:"+id)}
 return [...new Set(issues)]
}

export function pendingQuestContinuity(existingQuests=[],limit=3){
 const rows=list(existingQuests),claimed=new Set(rows.flatMap(q=>list(q?.predecessorQuestIds).map(String).filter(Boolean))),terminal=new Set(QUEST_TERMINAL_STATUSES);
 return rows.filter(q=>{
  const id=String(q?.id||""),status=String(q?.status||"").toUpperCase(),mode=String(q?.continuityMode||"NEW_THREAD").toUpperCase();if(!id||!terminal.has(status)||mode==="PAYOFF"||claimed.has(id))return false;
  const consequences=status==="COMPLETED"?list(q?.completionConsequences):list(q?.failureConsequences);return consequences.some(x=>clean(x,160))
 }).slice(-Math.max(1,Math.min(8,Number(limit)||3))).reverse()
}
