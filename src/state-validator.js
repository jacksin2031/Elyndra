const obj=v=>v&&typeof v==="object"&&!Array.isArray(v);
export function validateSaveState(s){
 const errors=[];
 if(!obj(s))return {valid:false,errors:["STATE_INVALID"]};
 if(!obj(s.world)||!s.world.id||!s.world.name)errors.push("WORLD_INVALID");
 if(!obj(s.world?.state)||!Number.isFinite(s.world?.state?.day)||s.world.state.day<1)errors.push("WORLD_STATE_INVALID");
 if(!Array.isArray(s.world?.canon?.facts))errors.push("CANON_INVALID");
 if(!obj(s.player)||!Number.isFinite(s.player.hp)||!Number.isFinite(s.player.maxHp)||!Number.isFinite(s.player.gold)||!Number.isFinite(s.player.knowledgeScore)||typeof s.player.location!=="string")errors.push("PLAYER_INVALID");
 if(s.player?.hp<0||s.player?.hp>s.player?.maxHp)errors.push("PLAYER_HP_INVALID");if(s.player?.level!=null&&(!Number.isInteger(s.player.level)||s.player.level<1))errors.push("PLAYER_LEVEL_INVALID");if(!Array.isArray(s.inventory))errors.push("INVENTORY_INVALID");
 if(!Array.isArray(s.knowledge))errors.push("KNOWLEDGE_INVALID");
 if(!Array.isArray(s.events))errors.push("EVENTS_INVALID");
 if(!obj(s.npcs)||!obj(s.npcs.lia)||!Array.isArray(s.npcs.lia.memories))errors.push("NPC_INVALID");
 if(!obj(s.quests)||!obj(s.quests.main)||!Array.isArray(s.quests.main.objectives))errors.push("QUEST_INVALID");
 if(typeof s.narrative!=="string")errors.push("NARRATIVE_INVALID");
 return {valid:errors.length===0,errors};
}
export function assertSaveState(s){const r=validateSaveState(s);if(!r.valid)throw new Error("SAVE_INTEGRITY_FAILED: "+r.errors.join(","));return s}