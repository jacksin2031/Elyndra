import {normalizeLore,revealStoredLore} from "./lore-engine.js?v=276";
import {crisisSnapshot} from "./crisis-engine.js?v=276";
import {graphSnapshot,causalContext} from "./knowledge-graph.js?v=276";
import {factionSnapshot,changeReputation} from "./faction-engine.js?v=276";
import {ensureWorldRegistry,registrySnapshot,directorRegistrySnapshot,revealRegistryEntities,validateGeneration,canonizeGeneration,resolvePlayerLocation,canInteractWithNpc} from "./world-registry.js?v=320";
import {tokenBudgetSnapshot} from "./context-manager.js?v=276";
import {startCombat,canStartEncounter} from "./combat-engine.js?v=44000";
import {evaluateQuestEvidence,tickMainQuest} from "./quest-engine.js?v=320";
import {playerVisibleEvents} from "./event-visibility.js?v=44000";
import {companionSnapshot,applyCompanionChange} from "./npc-engine.js?v=35000";
import {directorTimelineSnapshot} from "./world-timeline.js?v=37000";
import {validateImpactCandidate,applyWorldImpacts,impactSnapshot} from "./world-impact.js?v=39000";
import {recognitionSnapshot} from "./recognition-engine.js?v=276";
import {checkProfileSnapshot,normalizeCheckBonuses} from "./check-engine.js?v=320";
import {sanitizePlayerText,sanitizeSuggestions,fallbackNarrative,fallbackSuggestions,sanitizeLocationName,sanitizeSceneTitle} from "./runtime-guard.js?v=35000";
import {directorHistorySnapshot} from "./world-history.js?v=276";
import {travelSnapshot} from "./travel-engine.js?v=276";
import {survivalSnapshot} from "./survival-engine.js?v=320";
import {cultureSnapshot} from "./culture-engine.js?v=276";
import {magicSnapshot,learnSpell} from "./magic-engine.js?v=276";
import {marketSnapshot} from "./economy-engine.js?v=276";
import {dungeonSnapshot} from "./dungeon-engine.js?v=276";
import {pacingSnapshot} from "./world-pacing.js?v=276";
import {talentSnapshot} from "./talent-engine.js?v=276";
import {playerWeatherSnapshot,directorWeatherSnapshot} from "./weather-engine.js?v=276";
import {playerOriginSnapshot} from "./player-origin.js?v=320";
import {originRuntimeSnapshot} from "./origin-runtime.js?v=45000";
import {normalizeSuggestionIntents} from "./turn-compiler.js?v=44000";
import {buildKnowledgeLayers} from "./knowledge-layers.js?v=37000";
import {buildContextualActionSet} from "./contextual-actions.js?v=38003";
import {addInventoryItem,learnRecipe,craftingSnapshot} from "./item-engine.js?v=43000";
import {currentStateRevision} from "./state-sync.js?v=41000";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const text=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const EVIDENCE_TYPES=new Set(["OBSERVED","HEARD","READ","EXAMINED"]);
const RELATION_EFFECTS=new Set(["NONE","MINOR_POSITIVE","POSITIVE","MAJOR_POSITIVE","MINOR_NEGATIVE","NEGATIVE","MAJOR_NEGATIVE"]);
function legacyRelationEffect(value,max=5){
 const n=Math.max(-max,Math.min(max,Math.round(Number(value)||0)));if(!n)return "NONE";const sign=n>0?"POSITIVE":"NEGATIVE",a=Math.abs(n);
 if(a<=1)return "MINOR_"+sign;if(a>=Math.max(3,max-1))return "MAJOR_"+sign;return sign
}
function relationEffect(row,key,legacyKey,max){const raw=String(row?.[key]||"").toUpperCase();return RELATION_EFFECTS.has(raw)?raw:legacyRelationEffect(row?.[legacyKey],max)}
function relationDelta(effect,domain,roll=null){
 const e=String(effect||"NONE").toUpperCase();if(e==="NONE")return 0;const negative=e.includes("NEGATIVE"),major=e.startsWith("MAJOR_"),minor=e.startsWith("MINOR_"),max=domain==="FACTION"?5:3;
 let amount=domain==="FACTION"?(major?5:minor?1:3):(major?3:minor?1:2);
 if(roll?.success===false&&!negative)return 0;
 const grade=String(roll?.grade||"");if(grade==="CRITICAL_SUCCESS"&&!negative)amount=Math.min(max,amount+1);if(grade==="CRITICAL_FAILURE"&&negative)amount=Math.min(max,amount+1);
 return negative?-amount:amount
}
function relationShapeValid(row,key,legacyKey,max){
 if(row?.[key]!=null)return RELATION_EFFECTS.has(String(row[key]).toUpperCase());
 if(row?.[legacyKey]!=null)return Number.isInteger(row[legacyKey])&&row[legacyKey]>=-max&&row[legacyKey]<=max;
 return true
}
function registerDiscovery(state,d,context={}){
 const title=sanitizePlayerText(d?.title,100,""),body=sanitizePlayerText(d?.text,500,"");if(!title||!body||state.knowledge.some(k=>k.title===title))return null;
 const factId=typeof d?.factId==="string"?d.factId:"",fact=(state.world?.canon?.facts||[]).find(f=>f.id===factId),evidenceType=String(d?.evidenceType||"").toUpperCase();
 const verified=Boolean(fact&&String(fact.visibility||"").toLowerCase()==="public"&&EVIDENCE_TYPES.has(evidenceType)&&context.roll?.success!==false);
 const entry={id:id(),title,status:verified?"VERIFIED":"OBSERVATION",text:verified?fact.text:body,factId:verified?fact.id:null,evidenceType:verified?evidenceType:"UNVERIFIED",sources:[verified?"CANON_EVIDENCE":"AI_OBSERVATION"],score:verified?2:0};
 state.knowledge.push(entry);if(verified)state.player.knowledgeScore=Math.min(100,state.player.knowledgeScore+entry.score);return entry
}
export function buildSnapshot(state){
 const recentEvents=playerVisibleEvents(state,12).map(e=>({day:e.day,action:e.customText||e.action,type:e.type,summary:text(e.summary,220)}));
 return tokenBudgetSnapshot({stateRevision:currentStateRevision(state),world:{name:state.player?.worldNameKnown?state.world.name:"UNKNOWN",summary:state.world.summary||"",day:state.world.state.day,clock:state.world.state.clock||null,simulation:state.world.state.simulation||null,lastWorldEvent:state.world.state.lastWorldEvent||null,location:state.player.location,seedContract:state.world.seedContract||state.world.seed,creation:state.world.creation?{schemaVersion:state.world.creation.schemaVersion,blueprint:state.world.creation.blueprint,role:state.world.creation.role,difficultyRules:state.world.creation.difficultyRules}:null},weather:playerWeatherSnapshot(state),directorWeather:directorWeatherSnapshot(state),directorHistory:directorHistorySnapshot(state,8),directorCanon:(state.world?.canon?.facts||[]).slice(-40).map(f=>({id:f.id,type:f.type,visibility:f.visibility,text:f.text})),player:{name:state.player.name||"無名者",hp:state.player.hp,knowledgeScore:state.player.knowledgeScore,wallet:state.player.wallet||{},calendarKnown:state.player.calendarKnown===true,origin:playerOriginSnapshot(state.player),originRuntime:originRuntimeSnapshot(state,{director:false}),checks:checkProfileSnapshot(state)},knownFacts:state.world.canon.facts.filter(f=>state.knowledge.some(k=>k.status==="VERIFIED"&&k.factId===f.id)).map(f=>f.text).slice(-30),knowledge:state.knowledge.slice(-20).map(k=>({title:k.title,text:k.text})),inventory:state.inventory.slice(-20).map(i=>({id:i.id,name:i.name,category:i.category,quantity:i.quantity,description:i.description,identified:i.identified!==false,equipped:i.equipped===true,useEffects:i.useEffects||[],craftingTags:i.craftingTags||[],evidenceFactId:i.evidenceFactId||null})),crafting:craftingSnapshot(state),quest:state.quests?.main,recentEvents,runtimeSummary:state.runtimeSummary||"",crisis:crisisSnapshot(state),knowledgeGraph:graphSnapshot(state),causalContext:causalContext(state),factions:factionSnapshot(state,{visibleOnly:true}),registry:registrySnapshot(state,{visibleOnly:true}),companions:companionSnapshot(state),directorRegistry:directorRegistrySnapshot(state),directorTimeline:directorTimelineSnapshot(state,4),worldImpact:impactSnapshot(state,{director:true}),travel:travelSnapshot(state,{director:true}),survival:survivalSnapshot(state),culture:cultureSnapshot(state),magic:magicSnapshot(state),market:marketSnapshot(state),dungeon:dungeonSnapshot(state,{director:true}),pacing:pacingSnapshot(state),talents:talentSnapshot(state),recognition:recognitionSnapshot(state,{director:true}),priorSuggestions:(state.suggestions||[]).slice(0,4),priorSuggestionIntents:(state.suggestionIntents||[]).slice(0,4),knowledgeLayers:buildKnowledgeLayers(state),hiddenFacts:[]})
}
export function validateTurnCandidate(c){
 const errors=[];if(!c||typeof c!=="object"||Array.isArray(c))return {valid:false,errors:["CANDIDATE_INVALID"]};
 if(!text(c.narrative,1200))errors.push("NARRATIVE_REQUIRED");
 if(c.location!=null&&typeof c.location!=="string")errors.push("LOCATION_INVALID");if(c.sceneTitle!=null&&typeof c.sceneTitle!=="string")errors.push("SCENE_TITLE_INVALID");
 if(c.worldNameKnown!=null&&typeof c.worldNameKnown!=="boolean")errors.push("WORLD_NAME_KNOWLEDGE_INVALID");if(c.calendarKnown!=null&&typeof c.calendarKnown!=="boolean")errors.push("CALENDAR_KNOWLEDGE_INVALID");
 if(c.discoveries!=null&&!Array.isArray(c.discoveries))errors.push("DISCOVERIES_INVALID");
 if(c.items!=null&&!Array.isArray(c.items))errors.push("ITEMS_INVALID");if(c.recipes!=null&&!Array.isArray(c.recipes))errors.push("RECIPES_INVALID");
 if(c.magicLearning!=null&&!Array.isArray(c.magicLearning))errors.push("MAGIC_LEARNING_INVALID");
 if(c.npcChanges!=null&&!Array.isArray(c.npcChanges))errors.push("NPC_CHANGES_INVALID");
 if(c.factionChanges!=null&&!Array.isArray(c.factionChanges))errors.push("FACTION_CHANGES_INVALID");if(c.companionChanges!=null&&!Array.isArray(c.companionChanges))errors.push("COMPANION_CHANGES_INVALID");
 if(c.suggestions!=null&&!Array.isArray(c.suggestions))errors.push("SUGGESTIONS_INVALID");if(c.suggestionIntents!=null&&!Array.isArray(c.suggestionIntents))errors.push("SUGGESTION_INTENTS_INVALID");
 if(c.entityReveals!=null&&!Array.isArray(c.entityReveals))errors.push("ENTITY_REVEALS_INVALID");
 if(c.quest!=null&&(typeof c.quest!=="object"||Array.isArray(c.quest)))errors.push("QUEST_INVALID");
 if(c.encounter!=null){const e=c.encounter;if(!e||typeof e!=="object"||Array.isArray(e)||e.type!=="combat"||!e.enemy||typeof e.enemy!=="object"||!text(e.enemy.name,80))errors.push("ENCOUNTER_INVALID")}
 const iv=validateImpactCandidate(c.worldImpacts);if(!iv.valid)errors.push(...iv.errors);
 const gv=validateGeneration(c.generation);if(!gv.valid)errors.push(...gv.errors);
 for(const d of c.discoveries||[])if(!d||typeof d.title!=="string"||typeof d.text!=="string")errors.push("DISCOVERY_SHAPE_INVALID");
 for(const i of c.items||[])if(!i||typeof i.name!=="string"||(i.evidenceFactId!=null&&typeof i.evidenceFactId!=="string"))errors.push("ITEM_SHAPE_INVALID");else if(i.lore!=null&&!normalizeLore(i.lore))errors.push("ITEM_LORE_INVALID");
 for(const r of c.recipes||[])if(!r||typeof r.name!=="string"||!Array.isArray(r.inputs)||!r.output||typeof r.output.name!=="string")errors.push("RECIPE_SHAPE_INVALID");
 for(const m of c.magicLearning||[])if(!m||typeof m.name!=="string"||typeof m.sourceFactId!=="string"||!m.sourceFactId)errors.push("MAGIC_LEARNING_SHAPE_INVALID");
 for(const n of c.npcChanges||[])if(!n||typeof n.npcId!=="string"||!relationShapeValid(n,"trustEffect","trustDelta",2))errors.push("NPC_CHANGE_SHAPE_INVALID");
 for(const f of c.factionChanges||[])if(!f||typeof f.factionId!=="string"||!relationShapeValid(f,"reputationEffect","reputationDelta",5))errors.push("FACTION_CHANGE_SHAPE_INVALID");for(const x of c.companionChanges||[])if(!x||typeof x.npcId!=="string"||!["OFFER","LEAVE"].includes(String(x.action||"").toUpperCase()))errors.push("COMPANION_CHANGE_SHAPE_INVALID");
 for(const s of c.suggestions||[])if(typeof s!=="string")errors.push("SUGGESTION_SHAPE_INVALID");for(const x of c.suggestionIntents||[])if(!x||typeof x!=="object"||typeof x.label!=="string"||typeof x.action!=="string")errors.push("SUGGESTION_INTENT_SHAPE_INVALID");
 for(const x of c.entityReveals||[])if(!x||!["location","npc","faction","sideQuest"].includes(x.kind)||typeof x.id!=="string")errors.push("ENTITY_REVEAL_SHAPE_INVALID");
 return {valid:!errors.length,errors:[...new Set(errors)]}
}
export function validateDeferredTurnEffects(c){
 const errors=[];if(!c||typeof c!=="object"||Array.isArray(c))return {valid:false,errors:["DEFERRED_INVALID"]};
 if(c.recipes!=null&&!Array.isArray(c.recipes))errors.push("RECIPES_INVALID");
 if(c.magicLearning!=null&&!Array.isArray(c.magicLearning))errors.push("MAGIC_LEARNING_INVALID");
 if(c.factionChanges!=null&&!Array.isArray(c.factionChanges))errors.push("FACTION_CHANGES_INVALID");
 if(c.companionChanges!=null&&!Array.isArray(c.companionChanges))errors.push("COMPANION_CHANGES_INVALID");
 const iv=validateImpactCandidate(c.worldImpacts);if(!iv.valid)errors.push(...iv.errors);
 const gv=validateGeneration(c.generation);if(!gv.valid)errors.push(...gv.errors);
 for(const r of c.recipes||[])if(!r||typeof r.name!=="string"||!Array.isArray(r.inputs)||!r.output||typeof r.output.name!=="string")errors.push("RECIPE_SHAPE_INVALID");
 for(const m of c.magicLearning||[])if(!m||typeof m.name!=="string"||typeof m.sourceFactId!=="string"||!m.sourceFactId)errors.push("MAGIC_LEARNING_SHAPE_INVALID");
 for(const f of c.factionChanges||[])if(!f||typeof f.factionId!=="string"||!relationShapeValid(f,"reputationEffect","reputationDelta",5))errors.push("FACTION_CHANGE_SHAPE_INVALID");
 for(const x of c.companionChanges||[])if(!x||typeof x.npcId!=="string"||!["OFFER","LEAVE"].includes(String(x.action||"").toUpperCase()))errors.push("COMPANION_CHANGE_SHAPE_INVALID");
 return {valid:!errors.length,errors:[...new Set(errors)]}
}
export function applyDeferredTurnEffects(state,c,context={}){
 const v=validateDeferredTurnEffects(c);if(!v.valid)throw new Error(v.errors.join(","));
 const rollSucceeded=context.roll?.success!==false,registry=ensureWorldRegistry(state);
 if(rollSucceeded)for(const recipe of (c.recipes||[]).slice(0,2))learnRecipe(state,recipe,{source:"DEFERRED_TURN"});
 if(rollSucceeded)for(const spell of (c.magicLearning||[]).slice(0,1))learnSpell(state,spell);
 for(const f of (c.factionChanges||[]).slice(0,2)){const delta=Math.round(Number(f.reputationDelta)||0);if((rollSucceeded||delta<0)&&registry.factions.some(x=>x.id===f.factionId&&x.known===true))changeReputation(state,f.factionId,delta)}
 for(const x of (c.companionChanges||[]).slice(0,2)){const npc=registry.npcs.find(n=>n.id===x.npcId),action=String(x.action||"").toUpperCase();if((rollSucceeded||action==="LEAVE")&&(canInteractWithNpc(state,npc)||npc?.companion?.status==="ACTIVE"))applyCompanionChange(state,x)}
 const generation=c.generation?structuredClone(c.generation):c.generation;
 if(!rollSucceeded&&generation)for(const key of ["locations","npcs","factions","sideQuests"])for(const x of generation[key]||[])x.known=false;
 canonizeGeneration(state,generation);
 applyWorldImpacts(state,c.worldImpacts,context);
 state.events??=[];state.events.push({id:id(),type:"DEFERRED_TURN_APPLIED",visibility:"INTERNAL",action:sanitizePlayerText(context.action,180,""),day:state.world.state.day,at:Date.now()});
 return state
}
export function applyTurnCandidate(state,c,context={}){
 const v=validateTurnCandidate(c);if(!v.valid)throw new Error(v.errors.join(","));
 const previousSuggestions=[...(state.suggestions||[])],rollSucceeded=context.roll?.success!==false;
 const safeNarrative=sanitizePlayerText(c.narrative,1200,fallbackNarrative(context.action,context.roll));state.narrative=safeNarrative||fallbackNarrative(context.action,context.roll);
 if(rollSucceeded&&c.worldNameKnown===true)state.player.worldNameKnown=true;if(rollSucceeded&&c.calendarKnown===true)state.player.calendarKnown=true;
 const verifiedDiscoveries=[];for(const d of (c.discoveries||[]).slice(0,2)){const entry=registerDiscovery(state,d,context);if(entry?.status==="VERIFIED")verifiedDiscoveries.push(entry)}
 const acquiredItems=[];for(const item of (rollSucceeded?(c.items||[]):[]).slice(0,2)){const name=sanitizePlayerText(item.name,100,""),evidenceFactId=verifiedDiscoveries.some(d=>d.factId===item.evidenceFactId)?item.evidenceFactId:null;if(name){const stored=addInventoryItem(state,{...item,name,description:sanitizePlayerText(item.description,300,""),identified:item.identified!==false,lore:normalizeLore(item.lore),checkBonuses:normalizeCheckBonuses(item.checkBonuses),equipped:false,source:"AI_TURN",evidenceFactId},{source:"AI_TURN"});if(stored)acquiredItems.push(stored)}}
 if(rollSucceeded)for(const recipe of (c.recipes||[]).slice(0,2))learnRecipe(state,recipe,{source:"AI_TURN"});
 const generation=c.generation?structuredClone(c.generation):c.generation;
 if(!rollSucceeded&&generation)for(const key of ["locations","npcs","factions","sideQuests"])for(const x of generation[key]||[])x.known=false;
 canonizeGeneration(state,generation);
 if(rollSucceeded)for(const spell of (c.magicLearning||[]).slice(0,1))learnSpell(state,spell);
 const requestedLocation=sanitizeLocationName(c.location);if(requestedLocation&&!resolvePlayerLocation(state,requestedLocation,{...context,actionKind:context.roll?.profile?.kind||""})){state.events.push({id:id(),type:"LOCATION_CANDIDATE_REJECTED",visibility:"INTERNAL",day:state.world.state.day,summary:requestedLocation,at:Date.now()})}
 if(rollSucceeded)revealRegistryEntities(state,c.entityReveals,{...context,enforceCausality:true,actionKind:context.roll?.profile?.kind||"",verifiedEvidenceCount:verifiedDiscoveries.length});
 for(const d of verifiedDiscoveries)evaluateQuestEvidence(state,d.title+" "+d.text,{factId:d.factId,source:"CANON_EVIDENCE"});for(const item of acquiredItems)if(item.evidenceFactId)evaluateQuestEvidence(state,item.name+" "+item.description,{itemName:item.name,factId:item.evidenceFactId,source:"ITEM"});
 const registry=ensureWorldRegistry(state);
 for(const n of (c.npcChanges||[]).slice(0,3)){const npc=registry.npcs.find(x=>x.id===n.npcId),effect=relationEffect(n,"trustEffect","trustDelta",2),delta=relationDelta(effect,"NPC",context.roll);if(canInteractWithNpc(state,npc)&&delta!==0&&(rollSucceeded||delta<0))npc.trust=Math.max(0,Math.min(100,(npc.trust??0)+delta))}
 for(const f of (c.factionChanges||[]).slice(0,2)){const effect=relationEffect(f,"reputationEffect","reputationDelta",5),delta=relationDelta(effect,"FACTION",context.roll);if(delta!==0&&(rollSucceeded||delta<0)&&registry.factions.some(x=>x.id===f.factionId&&x.known===true))changeReputation(state,f.factionId,delta)}
 for(const x of (c.companionChanges||[]).slice(0,2)){const npc=registry.npcs.find(n=>n.id===x.npcId),action=String(x.action||"").toUpperCase();if((rollSucceeded||action==="LEAVE")&&(canInteractWithNpc(state,npc)||npc?.companion?.status==="ACTIVE"))applyCompanionChange(state,x)}
 applyWorldImpacts(state,c.worldImpacts,context)
 if(c.quest&&state.quests?.main){const hint=sanitizePlayerText(c.quest.objective||c.quest.title,180,"");if(hint)state.quests.main.aiHint=hint}tickMainQuest(state)
 revealStoredLore(state);
 if(c.encounter?.type==="combat"&&!state.combat?.active){if(canStartEncounter(state,c.encounter.enemy,{...context,actionKind:context.roll?.profile?.kind||""}))startCombat(state,c.encounter.enemy,{...context,enforceCausality:true,actionKind:context.roll?.profile?.kind||""});else state.events.push({id:id(),type:"ENCOUNTER_CANDIDATE_REJECTED",visibility:"INTERNAL",summary:sanitizePlayerText(c.encounter.enemy?.name,80,""),day:state.world.state.day,at:Date.now()})}state.sceneTitle=sanitizeSceneTitle(c.sceneTitle,state,context.action);
 const freshIntents=normalizeSuggestionIntents(c.suggestionIntents?.length?c.suggestionIntents:c.suggestions,state.suggestionIntents?.length?state.suggestionIntents:previousSuggestions),fresh=freshIntents.length?freshIntents:sanitizeSuggestions(c.suggestions,previousSuggestions);const contextual=buildContextualActionSet(state,fresh.length?fresh:fallbackSuggestions(state,context));state.suggestionIntents=contextual.all;state.suggestions=contextual.all.map(x=>x.label);
 state.events.push({id:id(),type:"AI_TURN_APPLIED",visibility:"INTERNAL",directorMode:c.directorMode||"DEEP",day:state.world.state.day,at:Date.now()});
 return state
}