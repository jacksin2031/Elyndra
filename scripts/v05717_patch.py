from pathlib import Path
import re

ROOT=Path('.')

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def replace(path,old,new,count=None):
    text=read(path)
    if old not in text: raise SystemExit(f'MISSING PATTERN {path}: {old[:120]!r}')
    text2=text.replace(old,new) if count is None else text.replace(old,new,count)
    write(path,text2)

# Player-visible NPC identity projection.
write('src/player-entity-visibility.js', r'''const clean=(v,max=180)=>typeof v==="string"?v.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,max):"";
const uid=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
function unknownAlias(npc){
 const explicit=clean(npc?.observableAlias||npc?.playerAlias,80);if(explicit)return explicit;
 return "眼前的陌生人"
}
export function npcNameKnown(state,npc){
 if(!npc)return false;
 if(npc.nameKnown===true||npc.companion?.status==="ACTIVE")return true;
 return (state?.events||[]).some(e=>e?.type==="NPC_NAME_REVEALED"&&String(e.npcId||"")===String(npc.id||""))
}
export function playerVisibleNpcName(state,npc){
 if(!npc)return "陌生人";
 return npcNameKnown(state,npc)?(clean(npc.name,80)||"熟悉的人"):unknownAlias(npc)
}
export function revealNpcNameFromEvidence(state,npc,{answer="",reason="NPC_SELF_IDENTIFICATION"}={}){
 const name=clean(npc?.name,80);if(!state||!npc||!name||npcNameKnown(state,npc))return false;
 if(!String(answer||"").includes(name))return false;
 npc.nameKnown=true;state.events??=[];
 state.events.push({id:"EV-"+uid(),type:"NPC_NAME_REVEALED",visibility:"PLAYER_KNOWN",npcId:npc.id,reason,summary:`你確認對方的稱呼是「${name}」。`,day:Number(state.world?.state?.day)||1,at:Date.now()});
 return true
}
export function redactUnknownNpcNames(state,value=""){
 let out=String(value||"");for(const npc of state?.world?.registry?.npcs||[]){const name=clean(npc?.name,80);if(name&&!npcNameKnown(state,npc))out=out.split(name).join(playerVisibleNpcName(state,npc))}return out
}
export function projectPlayerVisibleRegistry(state,registry={}){
 const canonical=state?.world?.registry?.npcs||[];
 return {...registry,npcs:(registry?.npcs||[]).map(row=>{const npc=canonical.find(x=>String(x.id||"")===String(row.id||""))||row;return {...row,name:playerVisibleNpcName(state,npc),description:redactUnknownNpcNames(state,row.description||"")}})}
}
''')

# app.js: unify location projection, player-visible NPC names, free-action copy, and relationship trace.
app='app.js'
text=read(app)
text=text.replace('import {playerVisibleLocationName} from "./src/player-location-visibility.js?v=57016";', 'import {playerVisibleLocationName} from "./src/player-location-visibility.js?v=57016";\nimport {playerVisibleNpcName} from "./src/player-entity-visibility.js?v=57016";')
text=text.replace('if($("#topLocation"))$("#topLocation").textContent=gameState.player.location||"未知之地";', 'if($("#topLocation"))$("#topLocation").textContent=playerVisibleLocationName(gameState);')
text=text.replace('<div class="action-group free-choice"><div class="action-group-title">自由行動</div><button type="button" id="otherActionBtn" class="other-action-btn">我想做其他事情…</button></div>', '<div class="action-group free-choice"><div class="action-group-title">自由行動</div><small class="muted">建議只是可行方向，不是允許行動的封閉清單；你可以自己描述任何其他動作。</small><button type="button" id="otherActionBtn" class="other-action-btn">我想做其他事情…</button></div>')
# NPC dock/panels/chat only reveal canonical names after grounded evidence.
text=text.replace('box.innerHTML=npcs.map(n=>{const tag=companionLabel(n),mode=npcInteractionMode(gameState,n),where=mode==="REMOTE"?`遠距 · ${comm.name}`:"附近";return `<button type="button" class="npc-mini" data-npc-id="${esc(n.id)}"><span>${esc((n.name||"?").slice(0,1))}</span><div><strong>${esc(n.name)}</strong>', 'box.innerHTML=npcs.map(n=>{const tag=companionLabel(n),mode=npcInteractionMode(gameState,n),where=mode==="REMOTE"?`遠距 · ${comm.name}`:"附近",visibleName=playerVisibleNpcName(gameState,n);return `<button type="button" class="npc-mini" data-npc-id="${esc(n.id)}"><span>${esc((visibleName||"?").slice(0,1))}</span><div><strong>${esc(visibleName)}</strong>')
text=text.replace('function openNpcPanel(npcId,answer=""){const npc=findNpc(gameState,npcId);if(!npc||npc.known!==true)return;const status=', 'function openNpcPanel(npcId,answer=""){const npc=findNpc(gameState,npcId);if(!npc||npc.known!==true)return;const visibleName=playerVisibleNpcName(gameState,npc),status=')
text=text.replace('<h2>${esc(npc.name)}</h2>', '<h2>${esc(visibleName)}</h2>')
text=text.replace('function openNpcConversation(npcId){if(!gameState)return;const npc=findNpc(gameState,npcId),mode=npcInteractionMode(gameState,npc);if(!npc||!mode)return;const messages=', 'function openNpcConversation(npcId){if(!gameState)return;const npc=findNpc(gameState,npcId),mode=npcInteractionMode(gameState,npc);if(!npc||!mode)return;const visibleName=playerVisibleNpcName(gameState,npc),messages=')
text=text.replace('${esc((npc.name||"?").slice(0,1))}</div><div><strong>${esc(npc.name)}</strong>', '${esc((visibleName||"?").slice(0,1))}</div><div><strong>${esc(visibleName)}</strong>')
text=text.replace('placeholder="對${esc(npc.name)}說些甚麼……"', 'placeholder="對${esc(visibleName)}說些甚麼……"')
text=text.replace('const parts=[["能力",m.attribute],["技能",m.skill],["裝備",m.equipment],["夥伴",m.companion],["關係",m.relationship],["情境",m.situation],["天氣",m.weather]]', 'const parts=[["能力",m.attribute],["技能",m.skill],["裝備",m.equipment],["夥伴",m.companion],["關係修正",m.relationship],["情境",m.situation],["天氣",m.weather]]')
text=text.replace('function renderRoll(roll){', 'function renderRoll(roll,relationshipOutcome=null){')
text=text.replace('$("#rollResult").textContent=`${roll.grade.replaceAll("_"," ")}${roll.profile?.skillLabel?` · ${roll.profile.skillLabel}`:""}${detail?` · ${detail}`:""}${Number(roll.difficulty)?` · 難度 ${signed(roll.difficulty)}`:""}${roll.skillUp?` · 技能提升至 ${roll.skillUp.after}`:""}`;', 'const relationChanges=relationshipOutcome?.changes||{},relationDetail=[["信任",relationChanges.trust],["尊重",relationChanges.respect],["畏懼",relationChanges.fear],["義務",relationChanges.obligation]].filter(([,v])=>Number(v)).map(([k,v])=>`${k} ${signed(v)}`).join(" · ");$("#rollResult").textContent=`${roll.grade.replaceAll("_"," ")}${roll.profile?.skillLabel?` · ${roll.profile.skillLabel}`:""}${detail?` · ${detail}`:""}${Number(roll.difficulty)?` · 難度 ${signed(roll.difficulty)}`:""}${relationDetail?` · 互動後：${relationDetail}`:""}${roll.skillUp?` · 技能提升至 ${roll.skillUp.after}`:""}`;')
text=text.replace('recordDebug("ENGINE_ACTION_RESULT",{action:effective,blocked:Boolean(actionResult.blocked),deterministic:Boolean(actionResult.deterministic),revision:currentStateRevision(actionState),roll:roll?{natural:roll.natural,total:roll.total,dc:roll.dc,grade:roll.grade,success:roll.success,kind:roll.profile?.kind}:null,elapsedMs:Date.now()-debugTurnStarted});', 'recordDebug("ENGINE_ACTION_RESULT",{action:effective,blocked:Boolean(actionResult.blocked),deterministic:Boolean(actionResult.deterministic),revision:currentStateRevision(actionState),roll:roll?{natural:roll.natural,total:roll.total,dc:roll.dc,grade:roll.grade,success:roll.success,kind:roll.profile?.kind,modifiers:roll.modifiers,difficulty:roll.difficulty}:null,npcRelationship:actionResult.ruleEffects?.npcRelationship||null,elapsedMs:Date.now()-debugTurnStarted});')
text=text.replace(' renderRoll(roll);\n actionState.sceneTitle=', ' renderRoll(roll,actionResult.ruleEffects?.npcRelationship||null);\n actionState.sceneTitle=')
write(app,text)

# Contextual suggestions must use player-visible NPC labels.
path='src/contextual-actions.js'; text=read(path)
text=text.replace('import {playerVisibleLocationName} from "./player-location-visibility.js?v=57016";', 'import {playerVisibleLocationName} from "./player-location-visibility.js?v=57016";\nimport {playerVisibleNpcName} from "./player-entity-visibility.js?v=57016";')
text=text.replace('function currentLocation(state){return clean(playerVisibleLocationName(state),80)||"眼前這個地方"}', 'function currentLocation(state){return clean(playerVisibleLocationName(state),80)||"眼前這個地方"}\nfunction visibleNpcName(state,npc){return clean(playerVisibleNpcName(state,npc),80)||"眼前的陌生人"}')
text=text.replace('const matches=presentNpcs(state).filter(n=>n?.name&&action.includes(String(n.name))).sort((a,b)=>String(b.name).length-String(a.name).length);', 'const matches=presentNpcs(state).filter(n=>action.includes(visibleNpcName(state,n))).sort((a,b)=>visibleNpcName(state,b).length-visibleNpcName(state,a).length);')
text=text.replace('title:`${clean(npc.name,60)}可被直接詢問`,text:`你確認「${clean(npc.name,80)}」目前就在可互動範圍內', 'title:`${clean(visibleNpcName(state,npc),60)}可被直接詢問`,text:`你確認「${clean(visibleNpcName(state,npc),80)}」目前就在可互動範圍內')
text=text.replace('sameNpcAttempts=npc?.name?(recentText.split(String(npc.name)).length-1):0;', 'npcLabel=npc?visibleNpcName(state,npc):"",sameNpcAttempts=npcLabel?(recentText.split(npcLabel).length-1):0;')
text=text.replace('`問${clean(npc.name,50)}目前目標最直接的線索`', '`問${clean(visibleNpcName(state,npc),50)}目前目標最直接的線索`')
text=text.replace('`向${clean(npc.name,50)}詢問目前目標下一個可親眼確認的具體線索', '`向${clean(visibleNpcName(state,npc),50)}詢問目前目標下一個可親眼確認的具體線索')
text=text.replace('`試探${clean(npc.name,50)}略過的細節`', '`試探${clean(visibleNpcName(state,npc),50)}略過的細節`')
text=text.replace('`用較熟練的交涉方式向${clean(npc.name,50)}追問', '`用較熟練的交涉方式向${clean(visibleNpcName(state,npc),50)}追問')
write(path,text)

# Adventure/Narrator snapshots hide NPC canonical names and trace AI relationship mutations.
path='src/adventure-engine.js'; text=read(path)
text=text.replace('import {playerVisibleLocationName} from "./player-location-visibility.js?v=57016";', 'import {playerVisibleLocationName} from "./player-location-visibility.js?v=57016";\nimport {projectPlayerVisibleRegistry,redactUnknownNpcNames} from "./player-entity-visibility.js?v=57016";\nimport {adjustNpcRelationship} from "./npc-cognition.js?v=57016";')
text=text.replace('const recentEvents=playerVisibleEvents(state,12).map(e=>({day:e.day,action:e.customText||e.action,type:e.type,summary:text(e.summary,220)}));', 'const recentEvents=playerVisibleEvents(state,12).map(e=>({day:e.day,action:redactUnknownNpcNames(state,e.customText||e.action||""),type:e.type,summary:redactUnknownNpcNames(state,text(e.summary,220))}));')
text=text.replace('registry:registrySnapshot(state,{visibleOnly:true}),companions:', 'registry:projectPlayerVisibleRegistry(state,registrySnapshot(state,{visibleOnly:true})),companions:')
old='for(const n of (c.npcChanges||[]).slice(0,3)){const npc=registry.npcs.find(x=>x.id===n.npcId),effect=relationEffect(n,"trustEffect","trustDelta",2),delta=relationDelta(effect,"NPC",context.roll);if(canInteractWithNpc(state,npc)&&delta!==0&&(rollSucceeded||delta<0))npc.trust=Math.max(0,Math.min(100,(npc.trust??0)+delta))}'
new='for(const n of (c.npcChanges||[]).slice(0,3)){const npc=registry.npcs.find(x=>x.id===n.npcId),effect=relationEffect(n,"trustEffect","trustDelta",2),delta=relationDelta(effect,"NPC",context.roll);if(canInteractWithNpc(state,npc)&&delta!==0&&(rollSucceeded||delta<0)){const reason=sanitizePlayerText(n.reason,180,"")||`Scene consequence ${effect} after ${String(context.roll?.grade||"NO_ROLL")}`;adjustNpcRelationship(state,npc,{changes:{trust:delta},reason});state.events.push({id:id(),type:"NPC_RELATIONSHIP_CHANGED",visibility:"PLAYER_KNOWN",npcId:npc.id,delta,effect,rollGrade:String(context.roll?.grade||""),source:"SCENE_TURN",reason,day:state.world.state.day,at:Date.now()})}}'
if old not in text: raise SystemExit('missing adventure npcChanges loop')
text=text.replace(old,new)
write(path,text)

# Runtime fallback and scene title projection.
path='src/runtime-guard.js'; text=read(path)
text=text.replace('import {roleplayFallbackSuggestions} from "./player-experience.js?v=57016";', 'import {roleplayFallbackSuggestions} from "./player-experience.js?v=57016";\nimport {playerVisibleLocationName} from "./player-location-visibility.js?v=57016";')
start=text.index('export function fallbackNarrative('); end=text.index('\nexport function fallbackSuggestions',start)
text=text[:start]+'''export function fallbackNarrative(action="",roll={}){\n const label=clean(action,100)||"這次嘗試";\n if(roll?.grade==="CRITICAL_SUCCESS")return `這次「${label}」明確奏效。後續只依眼前實際出現的變化判斷，不額外補寫未確認資訊。`;\n if(roll?.grade==="CRITICAL_FAILURE")return `這次「${label}」不但沒有奏效，現場還出現了可觀察的負面後果；下一步應以眼前實際變化為準。`;\n if(roll?.success)return `這次「${label}」奏效。若現場沒有新的可觀察變化，就不額外推斷資訊、信任或任務進展。`;\n return `這次「${label}」沒有奏效。現場不會因此憑空出現新線索；你仍可從眼前可見的人、物或路徑改換做法。`\n}'''+text[end:]
text=text.replace('const crisis=state.world?.state?.crisis?.stage,loc=sanitizeLocationName(state.player?.location||state.world?.state?.location)||"目前地點";', 'const crisis=state.world?.state?.crisis?.stage,loc=sanitizeLocationName(playerVisibleLocationName(state))||"目前地點";')
write(path,text)

# Turn compiler: do not discard a concrete failure narration when it agrees with Engine outcome.
path='src/turn-compiler.js'; text=read(path)
old='''function guardedSceneNarrative(scene,roll={},action=""){\n const fallback=fallbackNarrative(action,roll),candidate=sanitizePlayerText(scene?.narrative,1200,"");\n if(roll?.success===false)return {narrative:fallback,outcome:"FAILURE",narrativeRejected:Boolean(candidate)};\n if(roll?.success===true&&String(scene?.outcome||"SUCCESS").toUpperCase()!=="SUCCESS")return {narrative:fallback,outcome:"SUCCESS",narrativeRejected:Boolean(candidate)};\n return {narrative:candidate||fallback,outcome:roll?.success===true?"SUCCESS":null,narrativeRejected:false}\n}'''
new='''function guardedSceneNarrative(scene,roll={},action=""){\n const fallback=fallbackNarrative(action,roll),candidate=sanitizePlayerText(scene?.narrative,1200,""),declared=String(scene?.outcome||"").toUpperCase();\n if(roll?.success===false){const consistent=!declared||declared==="FAILURE"||declared==="CRITICAL_FAILURE";return {narrative:consistent&&candidate?candidate:fallback,outcome:"FAILURE",narrativeRejected:Boolean(candidate&&!consistent)}}\n if(roll?.success===true&&declared&&declared!=="SUCCESS"&&declared!=="CRITICAL_SUCCESS")return {narrative:fallback,outcome:"SUCCESS",narrativeRejected:Boolean(candidate)};\n return {narrative:candidate||fallback,outcome:roll?.success===true?"SUCCESS":null,narrativeRejected:false}\n}'''
if old not in text: raise SystemExit('missing guardedSceneNarrative')
text=text.replace(old,new)
text=text.replace('const narrative=roll?.success===false?fallback:(state?.encounter?.type==="combat"?(stateText||guarded.narrative||fallback):(guarded.narrative||stateText||fallback));', 'const narrative=state?.encounter?.type==="combat"?(stateText||guarded.narrative||fallback):(guarded.narrative||stateText||fallback);')
write(path,text)

# Game engine: redact unknown NPC name, improve local narration, and keep relationship reason explicit.
path='src/game-engine.js'; text=read(path)
text=text.replace('import {markEntityObserved} from "./visibility-lock.js?v=57016";', 'import {markEntityObserved} from "./visibility-lock.js?v=57016";\nimport {playerVisibleLocationName} from "./player-location-visibility.js?v=57016";\nimport {playerVisibleNpcName} from "./player-entity-visibility.js?v=57016";')
start=text.index('function localNarrative('); end=text.index('\nfunction localNpcActionTarget',start)
text=text[:start]+'''function localNarrative(state,label,roll,profile,effects={}){\n const loc=playerVisibleLocationName(state)||"目前位置",rel=effects.npcRelationship,npc=rel?.npcId?(state.world?.registry?.npcs||[]).find(x=>x.id===rel.npcId):null,who=npc?playerVisibleNpcName(state,npc):"對方",changes=rel?.changes||{};\n if(profile?.kind==="SOCIAL"&&rel){\n  const trust=Number(changes.trust)||0,respect=Number(changes.respect)||0;\n  if(trust>0||respect>0)return `${who}沒有避開這次交涉，態度出現了可確認的正向變化。是否得到新資訊或推進任務，仍只以實際對話與世界狀態為準。`;\n  if(trust<0||respect<0)return `${who}讓你把事情做完，但態度明顯變得更差。行動判定成功不代表關係改善。`;\n }\n if(roll.grade==="CRITICAL_SUCCESS")return `你在${loc}完成了「${label}」，結果十分順利。只有眼前實際出現的變化才算作後續資訊。`;\n if(roll.grade==="CRITICAL_FAILURE")return `你在${loc}嘗試「${label}」時出了明顯差錯，現場局勢變得更不利。`;\n if(roll.success)return `你在${loc}完成了「${label}」。現場若沒有新的可觀察變化，就不額外推斷線索、信任或任務進展。`;\n return `你在${loc}嘗試「${label}」，但沒有達到目標。眼前沒有憑空出現新線索，你仍可以改用其他可行做法。`\n}'''+text[end:]
text=text.replace('summary=`玩家在當前場景主動嘗試與${npc.name}互動：「${clean(label,140)}」`;', 'summary=`玩家在當前場景主動嘗試與${playerVisibleNpcName(state,npc)}互動：「${clean(label,140)}」`;')
text=text.replace('return {npcId:npc.id,grade,changes,relationship}', 'return {npcId:npc.id,grade,changes,relationship,reason:`玩家社交行動「${clean(label,100)}」由 Engine 判定為 ${grade}。`,source:"ENGINE_LOCAL_SOCIAL"}')
text=text.replace('const text=localNarrative(label,roll,profile);', 'const text=localNarrative(state,label,roll,profile,{npcRelationship});')
write(path,text)

# NPC conversation only promotes canonical name when the response itself supplies that evidence.
path='src/npc-conversation.js'; text=read(path)
text=text.replace('import {markEntityObserved} from "./visibility-lock.js?v=57016";', 'import {markEntityObserved} from "./visibility-lock.js?v=57016";\nimport {playerVisibleNpcName,revealNpcNameFromEvidence} from "./player-entity-visibility.js?v=57016";')
text=text.replace('const minutes=npcConversationMinutes(state,mode),before=state.world.state.clock?.totalMinutes||0;', 'const minutes=npcConversationMinutes(state,mode),before=state.world.state.clock?.totalMinutes||0;revealNpcNameFromEvidence(state,npc,{answer,reason:"NPC_CONVERSATION_EVIDENCE"});const visibleName=playerVisibleNpcName(state,npc);')
text=text.replace('const summary="玩家："+String(message||"").slice(0,180)+" / "+npc.name+"："+String(answer||"").slice(0,360);', 'const summary="玩家："+String(message||"").slice(0,180)+" / "+visibleName+"："+String(answer||"").slice(0,360);')
text=text.replace('state.sceneTitle=deriveSceneTitle(state,"與"+npc.name+"交談");', 'state.sceneTitle=deriveSceneTitle(state,"與"+visibleName+"交談");')
text=text.replace('"追問"+npc.name+"剛才刻意略過的細節"', '"追問"+visibleName+"剛才刻意略過的細節"')
text=text.replace('roleplayFallbackSuggestions(state,{action:"與"+npc.name+"交談"})', 'roleplayFallbackSuggestions(state,{action:"與"+visibleName+"交談"})')
write(path,text)

# Version/cache generation bump across product text files and release contracts.
for p in list(ROOT.glob('*.js'))+list((ROOT/'src').glob('*.js'))+list((ROOT/'test').glob('*.js'))+[ROOT/'package.json',ROOT/'package-lock.json']:
    if not p.exists(): continue
    t=p.read_text(encoding='utf-8')
    t=t.replace('0.57.16','0.57.17').replace('57016','57017')
    p.write_text(t,encoding='utf-8')

# Focused non-download regressions.
write('test/v05717-visibility-narrator-trace.test.js', r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {playerVisibleNpcName,revealNpcNameFromEvidence,projectPlayerVisibleRegistry} from "../src/player-entity-visibility.js";
import {sceneTurnPreview} from "../src/turn-compiler.js";
import {fallbackNarrative} from "../src/runtime-guard.js";

function state(){return {world:{state:{day:1},registry:{npcs:[{id:"N1",name:"裂-7",known:true,encountered:false,description:"貨櫃旁的人影"}],locations:[]}},player:{location:"未知地點"},events:[]}}

test("v0.57.17 NPC canonical name stays hidden until grounded evidence reveals it",()=>{
 const s=state(),npc=s.world.registry.npcs[0];
 assert.equal(playerVisibleNpcName(s,npc),"眼前的陌生人");
 assert.equal(projectPlayerVisibleRegistry(s,{npcs:[{id:"N1",name:"裂-7"}]}).npcs[0].name,"眼前的陌生人");
 assert.equal(revealNpcNameFromEvidence(s,npc,{answer:"我不打算告訴你名字。"}),false);
 assert.equal(playerVisibleNpcName(s,npc),"眼前的陌生人");
 assert.equal(revealNpcNameFromEvidence(s,npc,{answer:"你可以叫我裂-7。"}),true);
 assert.equal(playerVisibleNpcName(s,npc),"裂-7");
});

test("v0.57.17 concrete Engine-consistent failure narration survives scene guard",()=>{
 const narrative="你伸手扳動貨櫃門鎖，鏽死的鎖舌只發出一聲乾澀摩擦，門沒有打開。";
 const out=sceneTurnPreview({narrative,outcome:"FAILURE"},{success:false,grade:"FAILURE"},{action:"打開貨櫃"});
 assert.equal(out.narrative,narrative);
 assert.doesNotMatch(fallbackNarrative("打開貨櫃",{success:false,grade:"FAILURE"}),/沒有達成預期目的|換一個方法會更有機會/);
});

test("v0.57.17 main UI uses one location projection and keeps free action alongside suggestions",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/topLocation[^\n]+playerVisibleLocationName\(gameState\)/);
 assert.doesNotMatch(app,/topLocation[^\n]+gameState\.player\.location\|\|"未知之地"/);
 assert.match(app,/重新產生建議行動/);
 assert.match(app,/我想做其他事情…/);
 assert.match(app,/建議只是可行方向，不是允許行動的封閉清單/);
 assert.match(app,/id="freeActionForm"|#freeActionForm/);
});

test("v0.57.17 relationship modifier and mutation outcome are distinct and traced",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),game=await readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),adventure=await readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8");
 assert.match(app,/關係修正/);assert.match(app,/互動後：/);assert.match(app,/npcRelationship:actionResult\.ruleEffects\?\.npcRelationship/);
 assert.match(game,/SUCCESS"\)changes=\{trust:2,respect:1\}/);assert.match(game,/source:"ENGINE_LOCAL_SOCIAL"/);
 assert.match(adventure,/NPC_RELATIONSHIP_CHANGED/);assert.match(adventure,/source:"SCENE_TURN"/);assert.match(adventure,/adjustNpcRelationship/);
});

test("v0.57.17 suggestions project NPC names instead of treating known entity as known name",async()=>{
 const actions=await readFile(new URL("../src/contextual-actions.js",import.meta.url),"utf8"),adv=await readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8");
 assert.match(actions,/playerVisibleNpcName/);assert.match(actions,/visibleNpcName\(state,npc\)/);
 assert.match(adv,/projectPlayerVisibleRegistry/);
});
''')

print('v0.57.17 patch applied')
