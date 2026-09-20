import {normalizeLore,revealStoredLore} from "./lore-engine.js";
import {crisisSnapshot} from "./crisis-engine.js";
import {graphSnapshot,causalContext} from "./knowledge-graph.js";
import {factionSnapshot,changeReputation} from "./faction-engine.js";
import {ensureWorldRegistry,registrySnapshot,directorRegistrySnapshot,revealRegistryEntities,validateGeneration,canonizeGeneration} from "./world-registry.js";
import {tokenBudgetSnapshot} from "./context-manager.js";
import {startCombat} from "./combat-engine.js";
import {evaluateQuestEvidence} from "./quest-engine.js";
import {playerVisibleEvents} from "./event-visibility.js";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const text=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
export function buildSnapshot(state){
 const recentEvents=playerVisibleEvents(state,12).map(e=>({day:e.day,action:e.customText||e.action,type:e.type,summary:text(e.summary,220)}));
 return tokenBudgetSnapshot({world:{name:state.player?.worldNameKnown?state.world.name:"UNKNOWN",summary:state.world.summary||"",day:state.world.state.day,clock:state.world.state.clock||null,simulation:state.world.state.simulation||null,lastWorldEvent:state.world.state.lastWorldEvent||null,location:state.player.location,seedContract:state.world.seedContract||state.world.seed,economy:state.world.economy||null},player:{name:state.player.name||"無名者",hp:state.player.hp,gold:state.player.gold,knowledgeScore:state.player.knowledgeScore},knownFacts:state.world.canon.facts.filter(f=>state.knowledge.some(k=>k.factId===f.id)).map(f=>f.text).slice(-30),knowledge:state.knowledge.slice(-20).map(k=>({title:k.title,text:k.text})),inventory:state.inventory.slice(-20).map(i=>i.name),quest:state.quests?.main,recentEvents,runtimeSummary:state.runtimeSummary||"",crisis:crisisSnapshot(state),knowledgeGraph:graphSnapshot(state),causalContext:causalContext(state),factions:factionSnapshot(state,{visibleOnly:true}),registry:registrySnapshot(state,{visibleOnly:true}),directorRegistry:directorRegistrySnapshot(state),hiddenFacts:[]})
}
export function validateTurnCandidate(c){
 const errors=[];if(!c||typeof c!=="object"||Array.isArray(c))return {valid:false,errors:["CANDIDATE_INVALID"]};
 if(!text(c.narrative,1200))errors.push("NARRATIVE_REQUIRED");
 if(c.location!=null&&typeof c.location!=="string")errors.push("LOCATION_INVALID");
 if(c.worldNameKnown!=null&&typeof c.worldNameKnown!=="boolean")errors.push("WORLD_NAME_KNOWLEDGE_INVALID");
 if(c.discoveries!=null&&!Array.isArray(c.discoveries))errors.push("DISCOVERIES_INVALID");
 if(c.items!=null&&!Array.isArray(c.items))errors.push("ITEMS_INVALID");
 if(c.npcChanges!=null&&!Array.isArray(c.npcChanges))errors.push("NPC_CHANGES_INVALID");
 if(c.factionChanges!=null&&!Array.isArray(c.factionChanges))errors.push("FACTION_CHANGES_INVALID");
 if(c.suggestions!=null&&!Array.isArray(c.suggestions))errors.push("SUGGESTIONS_INVALID");
 if(c.entityReveals!=null&&!Array.isArray(c.entityReveals))errors.push("ENTITY_REVEALS_INVALID");
 if(c.quest!=null&&(typeof c.quest!=="object"||Array.isArray(c.quest)))errors.push("QUEST_INVALID");
 if(c.encounter!=null){const e=c.encounter;if(!e||typeof e!=="object"||Array.isArray(e)||e.type!=="combat"||!e.enemy||typeof e.enemy!=="object"||!text(e.enemy.name,80))errors.push("ENCOUNTER_INVALID")}
 const gv=validateGeneration(c.generation);if(!gv.valid)errors.push(...gv.errors);
 for(const d of c.discoveries||[])if(!d||typeof d.title!=="string"||typeof d.text!=="string")errors.push("DISCOVERY_SHAPE_INVALID");
 for(const i of c.items||[])if(!i||typeof i.name!=="string")errors.push("ITEM_SHAPE_INVALID");else if(i.lore!=null&&!normalizeLore(i.lore))errors.push("ITEM_LORE_INVALID");
 for(const n of c.npcChanges||[])if(!n||typeof n.npcId!=="string"||!Number.isInteger(n.trustDelta)||n.trustDelta < -2||n.trustDelta > 2)errors.push("NPC_CHANGE_SHAPE_INVALID");
 for(const f of c.factionChanges||[])if(!f||typeof f.factionId!=="string"||!Number.isInteger(f.reputationDelta)||f.reputationDelta < -5||f.reputationDelta > 5)errors.push("FACTION_CHANGE_SHAPE_INVALID");
 for(const s of c.suggestions||[])if(typeof s!=="string")errors.push("SUGGESTION_SHAPE_INVALID");
 for(const x of c.entityReveals||[])if(!x||!["location","npc","faction","sideQuest"].includes(x.kind)||typeof x.id!=="string")errors.push("ENTITY_REVEAL_SHAPE_INVALID");
 return {valid:!errors.length,errors:[...new Set(errors)]}
}
export function applyTurnCandidate(state,c){
 const v=validateTurnCandidate(c);if(!v.valid)throw new Error(v.errors.join(","));state.narrative=text(c.narrative,1200);
 if(text(c.location,120)){state.player.location=text(c.location,120);state.world.state.location=state.player.location}
 if(c.worldNameKnown===true)state.player.worldNameKnown=true;
 for(const d of (c.discoveries||[]).slice(0,2)){const title=text(d.title,100),body=text(d.text,500);if(title&&body&&!state.knowledge.some(k=>k.title===title)){state.knowledge.push({id:id(),title,status:"PARTIAL",text:body,sources:["AI_TURN"]});state.player.knowledgeScore=Math.min(100,state.player.knowledgeScore+2)}}
 for(const item of (c.items||[]).slice(0,1)){const name=text(item.name,100);if(name&&!state.inventory.some(i=>i.name===name))state.inventory.push({id:id(),name,description:text(item.description,300),identified:true,lore:normalizeLore(item.lore)})}
 revealRegistryEntities(state,c.entityReveals);canonizeGeneration(state,c.generation);for(const d of (c.discoveries||[]).slice(0,2))evaluateQuestEvidence(state,`${text(d.title,100)} ${text(d.text,500)}`);for(const item of (c.items||[]).slice(0,1))evaluateQuestEvidence(state,`${text(item.name,100)} ${text(item.description,300)}`);
 const registry=ensureWorldRegistry(state);
 for(const n of (c.npcChanges||[]).slice(0,3)){const npc=registry.npcs.find(x=>x.id===n.npcId&&x.known===true);if(npc)npc.trust=Math.max(0,Math.min(100,(npc.trust??0)+n.trustDelta))}
 for(const f of (c.factionChanges||[]).slice(0,2)){if(registry.factions.some(x=>x.id===f.factionId&&x.known===true))changeReputation(state,f.factionId,f.reputationDelta)}
 if(c.quest&&state.quests?.main){if(text(c.quest.title,120))state.quests.main.title=text(c.quest.title,120);if(text(c.quest.objective,180))state.quests.main.objectives=[text(c.quest.objective,180)]}
 revealStoredLore(state);
 if(c.encounter?.type==="combat"&&!state.combat?.active)startCombat(state,c.encounter.enemy);
 const suggestions=(c.suggestions||[]).map(x=>text(x,120)).filter(Boolean).slice(0,4);if(suggestions.length)state.suggestions=suggestions;
 state.events.push({id:id(),type:"AI_TURN_APPLIED",visibility:"INTERNAL",day:state.world.state.day,at:Date.now()});
 return state
}