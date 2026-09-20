const obj=v=>v&&typeof v==="object"&&!Array.isArray(v);
const arr=v=>Array.isArray(v);
const finite=v=>Number.isFinite(v);
const bounded=(v,a=0,b=100)=>finite(v)&&v>=a&&v<=b;
const validEntity=(x,nameKey="name")=>obj(x)&&typeof x.id==="string"&&x.id&&typeof x[nameKey]==="string"&&x[nameKey].trim();
const SCOPES=new Set(["PERSONAL","LOCAL","REGIONAL","FACTION","WORLD"]);
const TARGETS=new Set(["location","npc","faction","world"]);
const VISIBILITY=new Set(["PLAYER_KNOWN","OBSERVABLE","RUMOR","INTERNAL","DIRECTOR_ONLY"]);
const QUEUE_STATUS=new Set(["SCHEDULED","TRIGGERED","CANCELLED"]);
const RECORD_TYPES=new Set(["PLAYER_IMPACT","CONSEQUENCE"]);
const LOCATION_FIELDS=new Set(["safety","prosperity","supply","infrastructure","stability"]);
const FACTION_FIELDS=new Set(["resources","influence","stability"]);
const NPC_FIELDS=new Set(["trust"]);
const WORLD_FIELDS=new Set(["tension","crisisPressure"]);
const STRUCTURE_STATES=new Set(["ACTIVE","OPEN","RESTORED","STABILIZED","DAMAGED","DESTROYED","CLOSED","FLOODED","ABANDONED","CORRUPTED","TRANSFORMED"]);
function validMutation(kind,m){
 if(!obj(m))return false;const op=String(m.op||"").toUpperCase(),field=String(m.field||"");
 if(op==="STRUCTURE"){const x=m.value;return ["location","faction","world"].includes(kind)&&field==="structure"&&obj(x)&&typeof x.id==="string"&&Boolean(x.id)&&typeof x.label==="string"&&Boolean(x.label)&&STRUCTURE_STATES.has(String(x.state||"").toUpperCase())}
 if(["ADD_TAG","REMOVE_TAG"].includes(op))return field==="statusTag"&&typeof m.value==="string"&&Boolean(m.value.trim());
 const fields=kind==="location"?LOCATION_FIELDS:kind==="faction"?FACTION_FIELDS:kind==="npc"?NPC_FIELDS:kind==="world"?WORLD_FIELDS:null;
 return op==="DELTA"&&Boolean(fields?.has(field))&&finite(Number(m.value))&&Number(m.value)!==0
}
function validWorldState(x,kind){
 if(!obj(x)||!arr(x.statusTags||[])||(x.statusTags||[]).some(t=>typeof t!=="string")||!arr(x.structures||[])||(x.structures||[]).some(s=>!obj(s)||typeof s.id!=="string"||typeof s.label!=="string"||!STRUCTURE_STATES.has(String(s.state||"").toUpperCase())))return false;
 if(kind==="location"&&[...LOCATION_FIELDS].some(k=>!bounded(Number(x[k]))))return false;
 if(kind==="faction"&&!bounded(Number(x.stability)))return false;
 return true
}
function validImpactRecord(x){
 return obj(x)&&typeof x.id==="string"&&RECORD_TYPES.has(x.type)&&SCOPES.has(x.scope)&&TARGETS.has(x.targetKind)&&typeof x.targetId==="string"&&VISIBILITY.has(x.visibility)&&arr(x.changes||[])
}
function validImpactQueue(x){
 return obj(x)&&typeof x.id==="string"&&typeof x.parentImpactId==="string"&&SCOPES.has(x.scope)&&TARGETS.has(x.targetKind)&&typeof x.targetId==="string"&&QUEUE_STATUS.has(x.status)&&finite(x.dueMinute)&&x.dueMinute>=0&&arr(x.mutations)&&x.mutations.length>0&&x.mutations.every(m=>validMutation(x.targetKind,m))&&arr(x.observableAtLocationIds||[])&&(x.observableAtLocationIds||[]).every(id=>typeof id==="string")&&(x.revealedAtMinute==null||finite(x.revealedAtMinute))
}
export function validateSaveState(s){
 const errors=[];
 if(!obj(s))return {valid:false,errors:["STATE_INVALID"]};
 if(!obj(s.world)||!s.world.id||!s.world.name)errors.push("WORLD_INVALID");
 if(!obj(s.world?.state)||!finite(s.world?.state?.day)||s.world.state.day<1)errors.push("WORLD_STATE_INVALID");
 const clock=s.world?.state?.clock;if(clock!=null&&(!obj(clock)||!finite(clock.totalMinutes)||clock.totalMinutes<0||!Number.isInteger(clock.day)||clock.day<1||!Number.isInteger(clock.hour)||clock.hour<0||clock.hour>23||!Number.isInteger(clock.minute)||clock.minute<0||clock.minute>59))errors.push("CLOCK_INVALID");
 const sim=s.world?.state?.simulation;if(sim!=null&&(!obj(sim)||!bounded(sim.tension)||!finite(sim.lastEventMinute)||!finite(sim.lastTickMinute??0)||!Number.isInteger(sim.npcCursor??0)||!Number.isInteger(sim.factionCursor??0)||!obj(sim.flags||{})))errors.push("SIMULATION_INVALID");
 const crisis=s.world?.state?.crisis;if(crisis!=null&&(!obj(crisis)||!["DORMANT","RUMORS","ESCALATING","CRISIS","ENDGAME"].includes(crisis.stage)||!bounded(crisis.pressure)||!arr(crisis.history)))errors.push("CRISIS_INVALID");
 if(!arr(s.world?.canon?.facts)||s.world.canon.facts.some(f=>!obj(f)||typeof f.id!=="string"||typeof f.text!=="string"))errors.push("CANON_INVALID");
 const contract=s.world?.seedContract;if(contract!=null&&(!obj(contract)||typeof contract.genre!=="string"||typeof contract.theme!=="string"||typeof contract.scale!=="string"||![contract.danger,contract.magic,contract.politics].every(v=>finite(v)&&v>=1&&v<=5)))errors.push("SEED_CONTRACT_INVALID");
 const calendar=s.world?.calendar;if(calendar!=null&&(!obj(calendar)||typeof calendar.name!=="string"||!arr(calendar.cycles)||!arr(calendar.periods)))errors.push("CALENDAR_INVALID");
 const timeline=s.world?.timeline;if(timeline!=null&&(!arr(timeline)||timeline.some(x=>!obj(x)||typeof x.id!=="string"||!["SCHEDULED","TRIGGERED"].includes(x.status)||!finite(x.triggerDay)||!finite(x.baseTriggerDay??x.triggerDay)||!finite(x.impactOffsetDays??0)||!finite(x.intensityModifier??0)||!finite(x.earliestDay)||!finite(x.latestDay)||x.earliestDay>x.latestDay)))errors.push("TIMELINE_INVALID");
 const weather=s.world?.weather;if(weather!=null&&(!obj(weather)||typeof weather.currentId!=="string"||!finite(weather.startedMinute)||!finite(weather.nextChangeMinute)||typeof weather.locationKey!=="string"||!Number.isInteger(weather.sequence)||!arr(weather.history||[])||(weather.legacyNeutral!=null&&typeof weather.legacyNeutral!=="boolean")))errors.push("WEATHER_INVALID");
 const travel=s.world?.travel;if(travel!=null&&(!obj(travel)||!arr(travel.routes)||travel.routes.some(r=>!obj(r)||typeof r.id!=="string"||typeof r.fromId!=="string"||typeof r.toId!=="string"||!finite(r.distanceKm)||r.distanceKm<0||!finite(r.baseMinutes)||r.baseMinutes<0||!finite(r.hazard)||r.hazard<0||r.hazard>5))errors.push("TRAVEL_INVALID");
 const dungeons=s.world?.dungeons;if(dungeons!=null&&(!obj(dungeons)||!arr(dungeons.sites)||dungeons.sites.some(site=>!obj(site)||typeof site.id!=="string"||typeof site.locationId!=="string"||!arr(site.rooms)||site.rooms.some(room=>!obj(room)||typeof room.id!=="string"||!arr(room.connections||[])||!finite(room.hazard)||room.hazard<1||room.hazard>5))))errors.push("DUNGEON_INVALID");
 const magicWorld=s.world?.magic;if(magicWorld!=null&&(!obj(magicWorld)||!arr(magicWorld.laws||[])||!arr(magicWorld.schools||[])||!arr(magicWorld.anomalies||[])))errors.push("MAGIC_WORLD_INVALID");
 const impact=s.world?.impact;
 if(impact!=null){
  const inf=impact?.influence,infBad=!obj(inf)||["personal","local","regional","faction","world"].some(k=>!finite(inf[k])||inf[k]<0);
  if(!obj(impact)||infBad||!arr(impact.records)||!arr(impact.queue)||impact.records.some(x=>!validImpactRecord(x))||impact.queue.some(x=>!validImpactQueue(x)))errors.push("IMPACT_INVALID")
 }
 const recognition=s.world?.recognition;if(recognition!=null&&(!obj(recognition)||!finite(recognition.renown)||!finite(recognition.notoriety)||typeof recognition.tier!=="string"||!arr(recognition.deeds)||!arr(recognition.rumors)||!arr(recognition.titles)||!arr(recognition.marks)||!arr(recognition.reactions)||!obj(recognition.factionAttention||{})||!arr(recognition.processedImpactIds)))errors.push("RECOGNITION_INVALID");
 const registry=s.world?.registry;if(registry!=null){if(!obj(registry)||!["locations","npcs","factions","sideQuests"].every(k=>arr(registry[k])))errors.push("REGISTRY_INVALID");else{
  if(registry.locations.some(x=>!validEntity(x)))errors.push("LOCATION_REGISTRY_INVALID");
  if(registry.locations.some(x=>x.worldState!=null&&!validWorldState(x.worldState,"location")))errors.push("LOCATION_WORLD_STATE_INVALID");
  if(registry.locations.some(x=>x.weatherProfile!=null&&(!obj(x.weatherProfile)||!arr(x.weatherProfile.affinities||[])||!arr(x.weatherProfile.suppressions||[]))))errors.push("LOCATION_WEATHER_INVALID");
  if(registry.npcs.some(x=>!validEntity(x)))errors.push("NPC_REGISTRY_INVALID");
  if(registry.npcs.some(x=>x.companion!=null&&(!obj(x.companion)||!["NONE","OFFERED","ACTIVE","LEFT"].includes(x.companion.status))))errors.push("NPC_COMPANION_INVALID");
  if(registry.npcs.some(x=>x.worldState!=null&&!validWorldState(x.worldState,"npc")))errors.push("NPC_WORLD_STATE_INVALID");
  if(registry.npcs.some(x=>x.trust!=null&&!bounded(Number(x.trust))))errors.push("NPC_TRUST_INVALID");
  if(registry.factions.some(x=>!validEntity(x)))errors.push("FACTION_REGISTRY_INVALID");
  if(registry.factions.some(x=>x.worldState!=null&&!validWorldState(x.worldState,"faction")))errors.push("FACTION_WORLD_STATE_INVALID");
  if(registry.factions.some(x=>x.resources!=null&&!bounded(Number(x.resources))||x.influence!=null&&!bounded(Number(x.influence))))errors.push("FACTION_STATE_INVALID");
  if(registry.sideQuests.some(x=>!validEntity(x,"title")))errors.push("QUEST_REGISTRY_INVALID")
 }}
 const graph=s.world?.graph;if(graph!=null&&(!obj(graph)||!arr(graph.nodes)||!arr(graph.edges)||!arr(graph.expansions)))errors.push("GRAPH_INVALID");
 if(!obj(s.player)||typeof s.player.name!=="string"||!s.player.name.trim()||typeof s.player.worldNameKnown!=="boolean"||typeof s.player.calendarKnown!=="boolean"||!finite(s.player.hp)||!finite(s.player.maxHp)||!finite(s.player.gold)||!finite(s.player.knowledgeScore)||typeof s.player.location!=="string"||!obj(s.player.wallet||{}))errors.push("PLAYER_INVALID");
 if(s.player?.hp<0||s.player?.hp>s.player?.maxHp)errors.push("PLAYER_HP_INVALID");
 if(s.player?.level!=null&&(!Number.isInteger(s.player.level)||s.player.level<1))errors.push("PLAYER_LEVEL_INVALID");
 const survival=s.player?.survival;if(survival!=null&&(!obj(survival)||!["hunger","fatigue","exposure","injury"].every(k=>bounded(Number(survival[k])))||!arr(survival.conditions||[])||!finite(survival.lastMinute)))errors.push("PLAYER_SURVIVAL_INVALID");
 const magic=s.player?.magic;if(magic!=null&&(!obj(magic)||!finite(magic.capacity)||magic.capacity<1||!finite(magic.strain)||magic.strain<0||magic.strain>magic.capacity||!arr(magic.knownSpells||[])||!arr(magic.attunements||[])))errors.push("PLAYER_MAGIC_INVALID");
 if(s.player?.cultureStanding!=null&&!obj(s.player.cultureStanding))errors.push("PLAYER_CULTURE_INVALID");
 if(s.player?.talents!=null&&!arr(s.player.talents))errors.push("PLAYER_TALENTS_INVALID");if(s.player?.talentPoints!=null&&(!finite(s.player.talentPoints)||s.player.talentPoints<0))errors.push("PLAYER_TALENT_POINTS_INVALID");
 const stats=s.player?.stats;if(stats!=null&&(!obj(stats)||!["strength","agility","mind","presence","instinct"].every(k=>finite(stats[k])&&stats[k]>=0&&stats[k]<=20)))errors.push("PLAYER_STATS_INVALID");
 const skills=s.player?.skills,skillProgress=s.player?.skillProgress;if(skills!=null&&(!obj(skills)||!["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"].every(k=>Number.isInteger(skills[k])&&skills[k]>=0&&skills[k]<=5)))errors.push("PLAYER_SKILLS_INVALID");if(skillProgress!=null&&(!obj(skillProgress)||!["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"].every(k=>finite(skillProgress[k])&&skillProgress[k]>=0)))errors.push("PLAYER_SKILL_PROGRESS_INVALID");
 if(!arr(s.inventory)||s.inventory.some(x=>!obj(x)||typeof x.name!=="string"))errors.push("INVENTORY_INVALID");
 if(!arr(s.knowledge)||s.knowledge.some(x=>!obj(x)||typeof x.id!=="string"||typeof x.title!=="string"||typeof x.text!=="string"))errors.push("KNOWLEDGE_INVALID");
 if(!arr(s.events)||s.events.some(x=>!obj(x)||typeof x.type!=="string"))errors.push("EVENTS_INVALID");
 if(!obj(s.npcs))errors.push("NPC_INVALID");else for(const npc of Object.values(s.npcs)){if(!obj(npc)||!arr(npc.memories||[]))errors.push("NPC_INVALID")}
 if(!obj(s.quests)||!obj(s.quests.main)||!arr(s.quests.main.objectives))errors.push("QUEST_INVALID");
 if(!arr(s.suggestions)||s.suggestions.some(x=>typeof x!=="string"))errors.push("SUGGESTIONS_INVALID");
 if(typeof s.narrative!=="string")errors.push("NARRATIVE_INVALID");
 if(s.combat!=null){const c=s.combat;if(!obj(c)||typeof c.active!=="boolean"||!obj(c.enemy)||typeof c.enemy.name!=="string"||!finite(c.enemy.hp)||!finite(c.enemy.maxHp)||c.enemy.hp<0||c.enemy.hp>c.enemy.maxHp)errors.push("COMBAT_INVALID")}
 return {valid:errors.length===0,errors:[...new Set(errors)]}
}
export function assertSaveState(s){const r=validateSaveState(s);if(!r.valid)throw new Error("SAVE_INTEGRITY_FAILED: "+r.errors.join(","));return s}
