const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const clean=(v,max=160)=>typeof v==="string"?v.trim().slice(0,max):"";
export const COMBAT_ZONES=Object.freeze(["ENGAGED","NEAR","FAR"]);
export const COMBAT_ACTIONS=Object.freeze(["ATTACK","TECHNIQUE","MOVE","DEFEND","INTERACT","USE_ITEM","CAST","ASSIST","SOCIAL","RETREAT"]);
function zone(v,fallback="NEAR"){const x=String(v||"").toUpperCase();return COMBAT_ZONES.includes(x)?x:fallback}
function normalizeEnvironment(row,i){return {id:clean(row?.id,80)||`ENV-${i+1}`,name:clean(row?.name,80)||`環境物件 ${i+1}`,tags:Array.isArray(row?.tags)?row.tags.map(x=>clean(x,40).toUpperCase()).filter(Boolean).slice(0,6):[],cover:clamp(row?.cover,0,5),hazardPower:clamp(row?.hazardPower,0,20),interactable:row?.interactable!==false,used:Boolean(row?.used)}}
function normalizeObjective(row,i){return {id:clean(row?.id,80)||`OBJ-${i+1}`,type:clean(row?.type,50).toUpperCase()||"DEFEAT_OR_ESCAPE",description:clean(row?.description,180)||"擊退威脅或安全脫離戰鬥。",status:["ACTIVE","COMPLETED","FAILED"].includes(String(row?.status||"").toUpperCase())?String(row.status).toUpperCase():"ACTIVE"}}
function threatOf(c){return Math.max(1,Math.round((Number(c?.level)||1)*2+(Number(c?.damage)||1)+(Number(c?.defense)||10)/2))}
export function createEncounterFrame(combatants=[],context={}){
 const rows=(Array.isArray(combatants)?combatants:[]).filter(Boolean),positions={PLAYER:zone(context?.playerZone,"NEAR")},byCombatant={},threat={};
 for(const c of rows){positions[c.id]=zone(c?.zone||context?.enemyZone,"NEAR");byCombatant[c.id]=clamp(c?.morale??100,0,100);threat[c.id]=threatOf(c)}
 const environment=(Array.isArray(context?.environment)?context.environment:[]).slice(0,8).map(normalizeEnvironment),objectives=(Array.isArray(context?.objectives)&&context.objectives.length?context.objectives:[{type:"DEFEAT_OR_ESCAPE",description:"擊退威脅或安全脫離戰鬥。"}]).slice(0,6).map(normalizeObjective);
 return {id:clean(context?.encounterId,100)||uid("ENC"),version:2,round:1,combatantIds:rows.map(x=>x.id),positions,environment,objectives,morale:{party:100,enemies:100,byCombatant},threat:{total:Object.values(threat).reduce((a,b)=>a+b,0),byCombatant:threat},initiative:["PLAYER",...rows.map(x=>x.id)],lastAction:null}
}
export function ensureEncounterFrame(combat){
 if(!combat||typeof combat!=="object")return null;
 combat.combatants=Array.isArray(combat.combatants)&&combat.combatants.length?combat.combatants:(combat.enemy?[combat.enemy]:[]);
 if(!combat.encounter||Number(combat.encounter.version)<2)combat.encounter=createEncounterFrame(combat.combatants,{environment:combat.environment,objectives:combat.objectives});
 const frame=combat.encounter;frame.round=Math.max(1,Number(combat.round)||Number(frame.round)||1);frame.combatantIds=combat.combatants.map(x=>x.id);frame.positions??={PLAYER:"NEAR"};frame.positions.PLAYER=zone(frame.positions.PLAYER,"NEAR");frame.morale??={party:100,enemies:100,byCombatant:{}};frame.morale.byCombatant??={};frame.threat??={total:0,byCombatant:{}};frame.threat.byCombatant??={};
 for(const c of combat.combatants){frame.positions[c.id]=zone(frame.positions[c.id]||c.zone,"NEAR");if(!Number.isFinite(Number(frame.morale.byCombatant[c.id])))frame.morale.byCombatant[c.id]=100;if(!Number.isFinite(Number(frame.threat.byCombatant[c.id])))frame.threat.byCombatant[c.id]=threatOf(c)}
 frame.morale.enemies=enemyMorale(combat);frame.threat.total=activeEnemies(combat).reduce((n,c)=>n+(Number(frame.threat.byCombatant[c.id])||threatOf(c)),0);combat.round=frame.round;
 const primary=activeEnemies(combat).find(x=>x.id===combat.enemy?.id)||activeEnemies(combat)[0]||combat.combatants[0]||null;if(primary)combat.enemy=primary;return frame
}
export function activeEnemies(combat){return (Array.isArray(combat?.combatants)?combat.combatants:combat?.enemy?[combat.enemy]:[]).filter(x=>Number(x?.hp)>0&&!['RETREATED','SURRENDERED','DEFEATED'].includes(String(x?.combatState||"").toUpperCase()))}
export function selectCombatTarget(combat,intent={}){
 ensureEncounterFrame(combat);const rows=activeEnemies(combat),ids=Array.isArray(intent?.targetIds)?intent.targetIds:[],wanted=[...ids,intent?.targetId].filter(Boolean).map(String),byId=rows.find(x=>wanted.includes(String(x.id)));if(byId)return byId;const label=String(intent?.target||intent?.raw||"");const byName=rows.find(x=>x?.name&&label.includes(x.name));if(byName)return byName;return rows.find(x=>x.id===combat?.enemy?.id)||rows[0]||null
}
export function setPrimaryEnemy(combat,target){if(target&&combat)combat.enemy=target;return target}
export function playerZone(combat){return ensureEncounterFrame(combat)?.positions?.PLAYER||"NEAR"}
export function movePlayerZone(combat,direction="MOVE",raw=""){
 const frame=ensureEncounterFrame(combat);if(!frame)return null;const q=String(raw||"").toLowerCase(),current=playerZone(combat);let next=current;
 if(/後退|拉開|遠離|退到|撤開|back|away|distance|far/.test(q))next=current==="ENGAGED"?"NEAR":"FAR";
 else if(/靠近|接近|貼近|衝向|上前|close|approach|engage|toward/.test(q))next=current==="FAR"?"NEAR":"ENGAGED";
 else if(String(direction).toUpperCase()==="RETREAT")next="FAR";
 else next=current==="ENGAGED"?"NEAR":current==="FAR"?"NEAR":"ENGAGED";
 frame.positions.PLAYER=next;return {from:current,to:next}
}
export function usableEnvironment(combat,intent={}){const frame=ensureEncounterFrame(combat),q=String(intent?.raw||"");if(!frame)return null;return frame.environment.find(x=>x.interactable&&!x.used&&(q.includes(x.name)||x.tags.some(t=>q.toUpperCase().includes(t))))||frame.environment.find(x=>x.interactable&&!x.used)||null}
export function consumeEnvironment(combat,row){if(!row)return null;row.used=true;ensureEncounterFrame(combat).lastAction={type:"ENVIRONMENT",environmentId:row.id};return row}
export function applyEnemyMorale(combat,target,delta,reason=""){
 const frame=ensureEncounterFrame(combat);if(!frame||!target)return null;const before=clamp(frame.morale.byCombatant[target.id]??100,0,100),after=clamp(before+Number(delta||0),0,100);frame.morale.byCombatant[target.id]=after;frame.morale.enemies=enemyMorale(combat);if(after<=10&&Number(target.hp)>0)target.combatState="BROKEN";return {targetId:target.id,before,after,delta:after-before,reason:clean(reason,160),broken:target.combatState==="BROKEN"}
}
export function enemyMorale(combat){const frame=combat?.encounter,rows=activeEnemies(combat);if(!rows.length)return 0;const values=rows.map(x=>clamp(frame?.morale?.byCombatant?.[x.id]??100,0,100));return Math.round(values.reduce((a,b)=>a+b,0)/values.length)}
export function markEnemyDefeated(combat,target){if(!target)return null;target.combatState="DEFEATED";target.hp=0;const frame=ensureEncounterFrame(combat);if(frame){frame.morale.byCombatant[target.id]=0;for(const other of activeEnemies(combat))if(other.id!==target.id)applyEnemyMorale(combat,other,-15,"ally_defeated")}return target}
export function completeEncounterObjectives(combat,status="COMPLETED"){const frame=ensureEncounterFrame(combat);if(!frame)return [];for(const o of frame.objectives)if(o.status==="ACTIVE")o.status=status;return frame.objectives}
export function advanceEncounterRound(combat){const frame=ensureEncounterFrame(combat);if(!frame)return 0;frame.round++;combat.round=frame.round;return frame.round}
export function recordEncounterAction(combat,action){const frame=ensureEncounterFrame(combat);if(frame)frame.lastAction={...action,round:frame.round};return frame?.lastAction||null}
export function encounterSnapshot(state){const combat=state?.combat;if(!combat?.active)return null;const frame=ensureEncounterFrame(combat);return {version:2,id:frame.id,round:frame.round,combatants:combat.combatants.map(x=>({id:x.id,name:x.name,hp:x.hp,maxHp:x.maxHp,defense:x.defense,phase:x.phase,statuses:[...(x.statuses||[])],combatState:x.combatState||"ACTIVE",zone:frame.positions[x.id],morale:frame.morale.byCombatant[x.id]})),playerZone:frame.positions.PLAYER,environment:frame.environment.map(x=>({...x})),objectives:frame.objectives.map(x=>({...x})),morale:{party:frame.morale.party,enemies:frame.morale.enemies},threat:{total:frame.threat.total,byCombatant:{...frame.threat.byCombatant}},initiative:[...frame.initiative],lastAction:frame.lastAction?{...frame.lastAction}:null}}
