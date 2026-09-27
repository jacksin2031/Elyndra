// Deterministic repair gate for model-produced structured output.
// This module MUST NOT invent Canon. It may normalize syntax/shape, bind values to
// existing engine-owned entities, or remove unsupported claims.

const text=(value,max=500)=>String(value??"").normalize("NFC").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,max);
const list=value=>Array.isArray(value)?value:[];
const plain=value=>value&&typeof value==="object"&&!Array.isArray(value);
const norm=value=>text(value,180).normalize("NFKC").toLowerCase().replace(/[\s\u3000]+/g,"").replace(/[「」『』“”\"'`，,。.!！?？:：;；、()（）\[\]【】]/g,"");
const ENTITY_EDGE=/^[\s「」『』“”\"'`，,。.!！?？:：;；、()（）\[\]【】]+|[\s「」『』“”\"'`，,。.!！?？:：;；、()（）\[\]【】]+$/g;
const VALID_SCENE_OUTCOME=new Set(["SUCCESS","FAILURE"]);
const VALID_SUGGESTION_KIND=new Set(["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"]);
const VALID_RISK=new Set(["LOW","MEDIUM","HIGH","EXTREME","UNKNOWN"]);
const VALID_APPROACH=new Set(["STEADY","SOCIAL","BOLD","CREATIVE"]);

export function sanitizeAiEntityName(value,max=120){
 return text(value,max).replace(ENTITY_EDGE,"").replace(/\s{2,}/g," ").trim().slice(0,max)
}

function registryRows(snapshot={},kind=""){
 const registry=snapshot?.registry||snapshot?.world?.registry||{};
 if(kind==="npc")return list(registry.npcs);
 if(kind==="faction")return list(registry.factions);
 if(kind==="location")return list(registry.locations);
 if(kind==="sideQuest")return list(registry.sideQuests);
 return []
}
function canonicalEntity(snapshot,kind,value){
 const raw=text(value,140);if(!raw)return null;
 const rows=registryRows(snapshot,kind),exact=rows.find(x=>String(x?.id||"")===raw);if(exact)return exact;
 const key=norm(raw);if(!key)return null;
 const matches=rows.filter(x=>[x?.id,x?.name,x?.title].some(v=>v&&norm(v)===key));
 return matches.length===1?matches[0]:null
}
function canonicalFact(snapshot,value){
 const raw=text(value,140);if(!raw)return null;
 const facts=list(snapshot?.directorCanon||snapshot?.world?.canon?.facts||snapshot?.canon?.facts);
 const exact=facts.find(x=>String(x?.id||"")===raw);if(exact)return exact;
 const key=norm(raw),matches=facts.filter(x=>[x?.id,x?.title,x?.text].some(v=>v&&norm(v)===key));
 return matches.length===1?matches[0]:null
}
function capabilitySet(plan={}){return new Set(list(plan?.capabilities).map(x=>String(x||"").toUpperCase()).filter(Boolean))}
const OP_CAPABILITY=Object.freeze({
 DISCOVER_FACT:"DISCOVER_FACT",SET_WORLD_NAME_KNOWN:"SET_WORLD_NAME_KNOWN",SET_CALENDAR_KNOWN:"SET_CALENDAR_KNOWN",REVEAL_ENTITY:"REVEAL_ENTITY",MOVE_PLAYER:"MOVE_PLAYER",ACQUIRE_ITEM:"ACQUIRE_ITEM",START_ENCOUNTER:"START_ENCOUNTER",NPC_RELATIONSHIP_SIGNAL:"NPC_RELATIONSHIP_SIGNAL",FACTION_REPUTATION_SIGNAL:"FACTION_REPUTATION_SIGNAL",QUEST_HINT:"QUEST_HINT",COMPANION_SIGNAL:"COMPANION_SIGNAL",LEARN_RECIPE:"LEARN_RECIPE",LEARN_MAGIC:"LEARN_MAGIC",GENERATE_CONTENT:"GENERATE_CONTENT",WORLD_IMPACT_SIGNAL:"WORLD_IMPACT_SIGNAL",TIMELINE_SIGNAL:"TIMELINE_SIGNAL"
});

export function repairStatePatchCandidate(raw,{plan={},snapshot={}}={}){
 const reasons=[],dropped=[];if(!plain(raw))return {value:{baseRevision:Number(plan?.baseRevision)||0,operations:[]},changed:true,reasons:["PATCH_NOT_OBJECT"],dropped};
 const allowed=capabilitySet(plan),operations=[];
 for(const [index,input] of list(raw.operations).entries()){
  if(!plain(input)){dropped.push({index,reason:"OP_NOT_OBJECT"});continue}
  const op=String(input.op||"").trim().toUpperCase(),cap=OP_CAPABILITY[op];
  if(!cap||!allowed.has(cap)){dropped.push({index,op,reason:"OP_NOT_AUTHORIZED"});continue}
  let row={...input,op};
  if(op==="NPC_RELATIONSHIP_SIGNAL"||op==="COMPANION_SIGNAL"){
   const entity=canonicalEntity(snapshot,"npc",row.npcId);if(!entity?.id){dropped.push({index,op,reason:"NPC_NOT_CANONICAL"});continue}row.npcId=String(entity.id)
  }
  if(op==="FACTION_REPUTATION_SIGNAL"){
   const entity=canonicalEntity(snapshot,"faction",row.factionId);if(!entity?.id){dropped.push({index,op,reason:"FACTION_NOT_CANONICAL"});continue}row.factionId=String(entity.id)
  }
  if(op==="REVEAL_ENTITY"){
   const kind=String(row.kind||"").trim(),entity=canonicalEntity(snapshot,kind,row.id);if(!entity?.id){dropped.push({index,op,reason:"REVEAL_ENTITY_NOT_CANONICAL"});continue}row.id=String(entity.id)
  }
  if(op==="DISCOVER_FACT"&&String(row.sourceKind||"").toUpperCase()==="CANON"){
   const fact=canonicalFact(snapshot,row.factId||row.sourceId);if(!fact?.id){dropped.push({index,op,reason:"FACT_NOT_CANONICAL"});continue}row.factId=String(fact.id);row.sourceId=String(fact.id);row.sourceKind="CANON"
  }
  if(op==="ACQUIRE_ITEM"&&plain(row.item))row.item={...row.item,name:sanitizeAiEntityName(row.item.name,100)};
  if(op==="START_ENCOUNTER"&&plain(row.enemy))row.enemy={...row.enemy,name:sanitizeAiEntityName(row.enemy.name,100)};
  operations.push(row)
 }
 const baseRevision=Number(plan?.baseRevision);const value={...raw,baseRevision:Number.isFinite(baseRevision)?baseRevision:Number(raw.baseRevision)||0,operations};
 if(Number(raw.baseRevision)!==value.baseRevision)reasons.push("BASE_REVISION_REBOUND");if(dropped.length)reasons.push("INVALID_OPERATIONS_DROPPED");
 return {value,changed:reasons.length>0||operations.length!==list(raw.operations).length,reasons,dropped}
}

function repairSuggestion(row,index){
 if(typeof row==="string")row={label:row,action:row};if(!plain(row))return {value:null,reason:"SUGGESTION_NOT_OBJECT",index};
 const label=text(row.label||row.action,120),action=text(row.action||row.label,220);if(!label||!action)return {value:null,reason:"SUGGESTION_EMPTY",index};
 const kind=String(row.kind||"GENERAL").toUpperCase(),risk=String(row.risk||"UNKNOWN").toUpperCase(),approach=String(row.approach||"STEADY").toUpperCase();
 return {value:{...row,label,action,kind:VALID_SUGGESTION_KIND.has(kind)?kind:"GENERAL",risk:VALID_RISK.has(risk)?risk:"UNKNOWN",approach:VALID_APPROACH.has(approach)?approach:"STEADY",targetId:text(row.targetId,120)||null,requiredItemIds:list(row.requiredItemIds).map(x=>text(x,120)).filter(Boolean).slice(0,8),requiredCapabilities:list(row.requiredCapabilities).map(x=>text(x,80)).filter(Boolean).slice(0,8),requirementsSatisfied:row.requirementsSatisfied===true,progression:row.progression===true},reason:null,index}
}
export function repairSceneCandidate(raw,{expectedOutcome=""}={}){
 const reasons=[],dropped=[];if(!plain(raw))return {value:null,changed:true,reasons:["SCENE_NOT_OBJECT"],dropped};
 const value={...raw};
 value.sceneTitle=text(raw.sceneTitle,160);value.narrative=text(raw.narrative,1800);
 const expected=String(expectedOutcome||"").toUpperCase();if(VALID_SCENE_OUTCOME.has(expected)&&String(raw.outcome||"").toUpperCase()!==expected){value.outcome=expected;reasons.push("OUTCOME_REBOUND")}
 else value.outcome=VALID_SCENE_OUTCOME.has(String(raw.outcome||"").toUpperCase())?String(raw.outcome).toUpperCase():expected||"FAILURE";
 const suggestions=[];for(const [index,row] of list(raw.suggestions).entries()){const fixed=repairSuggestion(row,index);if(fixed.value)suggestions.push(fixed.value);else dropped.push({index,reason:fixed.reason})}value.suggestions=suggestions.slice(0,4);
 if(dropped.length)reasons.push("INVALID_SUGGESTIONS_DROPPED");
 return {value,changed:reasons.length>0||suggestions.length!==list(raw.suggestions).length,reasons,dropped}
}

function cleanEntityObject(row,kind){
 if(!plain(row))return row;const next={...row};
 if("name" in next)next.name=sanitizeAiEntityName(next.name,120);
 if(kind==="sideQuest"&&"title" in next)next.title=sanitizeAiEntityName(next.title,140);
 return next
}
export function repairWorldStageCandidate(stage,raw){
 if(!plain(raw))return {value:raw,changed:false,reasons:[],dropped:[]};
 const value=structuredClone(raw),reasons=[];let changed=false;
 const fixArray=(container,key,kind)=>{if(!plain(container)||!Array.isArray(container[key]))return;container[key]=container[key].map(row=>{const fixed=cleanEntityObject(row,kind);if(JSON.stringify(fixed)!==JSON.stringify(row))changed=true;return fixed})};
 fixArray(value,"npcs","npc");fixArray(value,"locations","location");fixArray(value,"factions","faction");fixArray(value,"sideQuests","sideQuest");
 if(plain(value.generation)){fixArray(value.generation,"npcs","npc");fixArray(value.generation,"locations","location");fixArray(value.generation,"factions","faction");fixArray(value.generation,"sideQuests","sideQuest")}
 if(plain(value.faction)){const fixed=cleanEntityObject(value.faction,"faction");if(JSON.stringify(fixed)!==JSON.stringify(value.faction)){value.faction=fixed;changed=true}}
 if(changed)reasons.push("ENTITY_NAMES_SANITIZED");
 return {value,changed,reasons,dropped:[],stage:String(stage||"").toUpperCase()}
}

export function repairAiOutput(kind,raw,context={}){
 const type=String(kind||"").toUpperCase();
 if(type==="STATE_PATCH")return repairStatePatchCandidate(raw,context);
 if(type==="SCENE")return repairSceneCandidate(raw,context);
 if(type==="WORLD_STAGE")return repairWorldStageCandidate(context?.stage,raw);
 return {value:raw,changed:false,reasons:[],dropped:[]}
}
