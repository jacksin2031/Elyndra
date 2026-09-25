from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def write(rel,text): (ROOT/rel).write_text(text,encoding='utf-8')
def once(text,old,new,label):
    if old not in text: raise SystemExit(f'MISSING_ANCHOR:{label}')
    return text.replace(old,new,1)

# Player-facing locale: normalize an observed English leak and reject common English prose
# without banning short acronyms or arbitrary canonical proper nouns globally.
s=read('src/runtime-guard.js')
s=once(s,
'const SAFE_TRADITIONAL_MAP=Object.freeze({"对":"對","轮":"輪"});\nexport function normalizePlayerFacingLocale(value,max=1600){return clean(value,max).replace(/[对轮]/g,ch=>SAFE_TRADITIONAL_MAP[ch]||ch)}',
'const SAFE_TRADITIONAL_MAP=Object.freeze({"对":"對","轮":"輪"});\nconst ENGLISH_PROSE_MARKER=/\\b(?:previously|before|after|toward|towards|through|around|where|there|follow|trace|check|inspect|investigate|search|find|look|wall|area|point|direction)\\b/i;\nexport function normalizePlayerFacingLocale(value,max=1600){return clean(value,max).replace(/[对轮]/g,ch=>SAFE_TRADITIONAL_MAP[ch]||ch).replace(/\\bpreviously\\b/gi,"先前")}',
'locale-english-guard')
s=once(s,
' const han=(s.match(HAN)||[]).length,latin=(s.match(LATIN)||[]).length;\n if(allowShortName&&s.length<=24)return foreign===0;',
' const han=(s.match(HAN)||[]).length,latin=(s.match(LATIN)||[]).length;\n if(han>=2&&ENGLISH_PROSE_MARKER.test(s))return false;\n if(allowShortName&&s.length<=24)return foreign===0;',
'locale-prose-reject')
write('src/runtime-guard.js',s)

# Suggestion event provenance + fresh NPC clue priority.
s=read('src/contextual-actions.js')
s=once(s,
'const PROGRESSION_EVENT_TYPES=new Set(["WORLD_EVENT","WORLD_CONSEQUENCE","WORLD_CONSEQUENCE_DISCOVERED","RUMOR_SPREAD","PLAYER_RECOGNITION","FACTION_PLAYER_REACTION","WEATHER_CHANGED","FUTURE_EVENT_TRIGGERED","MAIN_QUEST_STAGE_CHANGED"]);',
'const PROGRESSION_EVENT_TYPES=new Set(["WORLD_EVENT","WORLD_CONSEQUENCE","WORLD_CONSEQUENCE_DISCOVERED","RUMOR_SPREAD","PLAYER_RECOGNITION","FACTION_PLAYER_REACTION","WEATHER_CHANGED","FUTURE_EVENT_TRIGGERED","MAIN_QUEST_STAGE_CHANGED","NPC_CLUE_CONFIRMED"]);',
'clue-event-type')
old='function recentVisibleEvent(state){return (state.events||[]).filter(e=>e?.visibility!=="INTERNAL"&&PROGRESSION_EVENT_TYPES.has(String(e.type||""))).map(e=>({...e,summary:playerFacingEventSummary(e)})).filter(e=>e.summary).slice(-8).reverse()[0]||null}'
new='function eventMatchesCurrentScope(state,event){const currentWorld=String(state.world?.id||""),eventWorld=String(event?.worldId||"");if(eventWorld&&currentWorld&&eventWorld!==currentWorld)return false;const worldCreated=Number(state.world?.createdAt)||0,eventAt=Number(event?.at)||0;if(!eventWorld&&worldCreated&&eventAt&&eventAt<worldCreated)return false;const loc=currentLocationRecord(state),scope=String(event?.locationId||event?.location||"");if(scope){const allowed=new Set([String(state.player?.location||""),String(loc?.id||""),String(loc?.name||"")].filter(Boolean));if(!allowed.has(scope))return false}return true}\nfunction recentVisibleEvent(state){return (state.events||[]).filter(e=>e?.visibility!=="INTERNAL"&&PROGRESSION_EVENT_TYPES.has(String(e.type||""))&&eventMatchesCurrentScope(state,e)).map(e=>({...e,summary:playerFacingEventSummary(e)})).filter(e=>e.summary).slice(-8).reverse()[0]||null}\nfunction recentNpcClue(state){return (state.events||[]).filter(e=>String(e?.type||"")==="NPC_CLUE_CONFIRMED"&&e?.visibility!=="INTERNAL"&&eventMatchesCurrentScope(state,e)).map(e=>({...e,summary:playerFacingEventSummary(e)})).filter(e=>e.summary).slice(-6).reverse()[0]||null}'
s=once(s,old,new,'scoped-recent-event')
old=' const q=state.quests?.main,objective=clean(q?.aiHint||q?.objectives?.[0],100),npc=presentNpcs(state)[0],event=recentVisibleEvent(state),loc=currentLocation(state),recentRows='
new=' const q=state.quests?.main,objective=clean(q?.aiHint||q?.objectives?.[0],100),npc=presentNpcs(state)[0],clue=recentNpcClue(state),event=recentVisibleEvent(state),loc=currentLocation(state),recentRows='
s=once(s,old,new,'progression-clue-var')
anchor=' if(npc&&objective&&sameNpcAttempts<2)return normalizeContextualSuggestion({label:`問${clean(visibleNpcName(state,npc),50)}目前目標最直接的線索`'
insert=' if(clue?.summary)return normalizeContextualSuggestion({label:"沿著剛取得的線索繼續查證",action:`在${loc}沿著「${clean(clue.summary,100)}」指向的可見方向、聲音、痕跡或符號查證下一個具體證據`,kind:"OBSERVE",risk:"LOW",skillHint:"感知 / 觀察",approach:"STEADY",progression:true,causalBasis:"當前世界與當前場景中剛確認的 NPC 線索",requirementsSatisfied:true,source:"ENGINE"});\n'+anchor
s=once(s,anchor,insert,'clue-priority')
write('src/contextual-actions.js',s)

# Conversation events now carry world/scene provenance and emit a dedicated confirmed clue.
s=read('src/npc-conversation.js')
s=once(s,'import {deriveSceneTitle} from "./runtime-guard.js?v=57019";','import {deriveSceneTitle,sanitizePlayerText} from "./runtime-guard.js?v=57019";','npc-runtime-import')
s=once(s,
'const event={id:id(),type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",npcId:npc.id,mode,firstEncounter,memoryId:memory?.id||null,questInteractions:questInteractions.map(x=>({questId:x.questId,action:x.action})),summary,day:state.world.state.day,time:String(state.world.state.clock.hour).padStart(2,"0")+":"+String(state.world.state.clock.minute).padStart(2,"0"),minutes,at:Date.now()};\n state.events.push(event);',
'const event={id:id(),type:"NPC_CONVERSATION",visibility:"PLAYER_KNOWN",worldId:state.world?.id||null,location:state.player?.location||state.world?.state?.location||null,npcId:npc.id,mode,firstEncounter,memoryId:memory?.id||null,questInteractions:questInteractions.map(x=>({questId:x.questId,action:x.action})),summary,day:state.world.state.day,time:String(state.world.state.clock.hour).padStart(2,"0")+":"+String(state.world.state.clock.minute).padStart(2,"0"),minutes,at:Date.now()};\n state.events.push(event);\n const clueText=progressed?.length?sanitizePlayerText(answer,220,""):"";if(clueText)state.events.push({id:id(),type:"NPC_CLUE_CONFIRMED",visibility:"PLAYER_KNOWN",worldId:state.world?.id||null,location:state.player?.location||state.world?.state?.location||null,npcId:npc.id,sourceEventId:event.id,summary:clueText,day:state.world.state.day,at:Date.now()});',
'npc-clue-provenance')
write('src/npc-conversation.js',s)

# State replacement must reset state-bound UI caches; NPC async response must not write across sessions.
s=read('app.js')
old='function replaceGameState(next,reason="STATE_REPLACED"){cancelStateBoundWork(reason);gameState=next??null;stateSession.replace(gameState);gameplayDebugSnapshot=null;npcChatHistory=new Map();recordDebug("STATE_SESSION_REPLACED",{reason,epoch:stateSession.epoch,worldId:gameState?.world?.id||null});return gameState}'
new='function replaceGameState(next,reason="STATE_REPLACED"){cancelStateBoundWork(reason);const cacheBefore={helperHistory:helperHistory.length,rejected:suggestionRefresh.rejected.length,excluded:suggestionRefresh.exclude.length,npcChats:npcChatHistory.size};gameState=next??null;stateSession.replace(gameState);gameplayDebugSnapshot=null;helperHistory=[];npcChatHistory=new Map();suggestionRefresh.message="";suggestionRefresh.error=false;suggestionRefresh.rejected=[];suggestionRefresh.exclude=[];recordDebug("STATE_BOUND_UI_CACHE_RESET",{reason,...cacheBefore});recordDebug("STATE_SESSION_REPLACED",{reason,epoch:stateSession.epoch,worldId:gameState?.world?.id||null});return gameState}'
s=once(s,old,new,'replace-state-cache-reset')
pat=r'async function submitNpcConversation\(npcId,q\)\{.*?\}\nfunction bindNpcLinks\(\)'
m=re.search(pat,s,re.S)
if not m: raise SystemExit('MISSING_ANCHOR:submit-npc-conversation')
replacement='''async function submitNpcConversation(npcId,q){markForegroundActivity();preemptBackgroundAI();if(!gameState||!q)return;if(turnSyncBusy){recordDebug("PLAYER_NPC_ACTION_BLOCKED_STATE_SYNC",{npcId,q:String(q||"").slice(0,180)});return}if(aiBusy)return;const conversationState=gameState,conversationSession=captureStateSession(),npc=findNpc(conversationState,npcId),mode=npcInteractionMode(conversationState,npc);if(!npc||!mode)return;const messages=npcConversationMessages(npcId);messages.push({role:"player",text:q});openNpcConversation(npcId);const visibleName=playerVisibleNpcName(conversationState,npc);setAIThinking(true,`${mode==="REMOTE"?"正在建立遠距聯絡":"正在等待"} ${visibleName} 的回應…`);const status=$("#npcChatStatus");if(status)status.textContent="對方正在回應……";let answer=`${visibleName}沒有提供更多可以確認的資訊。`;try{if(aiStatus.aiConfigured)answer=await talkToDynamicNpc(conversationState,npc,q,{mode,communication:worldCommunication(conversationState)});if(!isCurrentStateSession(conversationSession)){recordDebug("NPC_CONVERSATION_STALE_DISCARDED",{npcId,worldId:conversationState.world?.id||null});return}const turn=applyNpcConversationTurn(conversationState,npc,q,answer);bumpStateRevision(conversationState,"NPC_CONVERSATION");const suffix=turn.progressed?.length?"\\n\\n你從這段對話中確認到可推進任務的新線索。":"";messages.push({role:"npc",text:answer+suffix});await persist(conversationState,conversationSession);if(isCurrentStateSession(conversationSession))await refresh()}catch(e){console.warn("NPC fallback",e);if(isCurrentStateSession(conversationSession))messages.push({role:"npc",text:answer})}finally{setAIThinking(false);if(isCurrentStateSession(conversationSession))openNpcConversation(npcId)}}\nfunction bindNpcLinks()'''
s=s[:m.start()]+replacement+s[m.end():]
old='replaceGameState(generated.state,"AUTOTEST_WORLD_READY");const firstButtonFast='
new='replaceGameState(generated.state,"AUTOTEST_WORLD_READY");recordDebug("AUTOTEST_WORLD_SCOPE_READY",{index:i,worldId:gameState?.world?.id||null,eventCount:gameState?.events?.length||0,suggestionCount:gameState?.suggestions?.length||0,location:gameState?.player?.location||null});const firstButtonFast='
s=once(s,old,new,'autotest-scope-trace')
write('app.js',s)

# Extend focused regressions with English-mixed UI and cross-world/current-scene isolation.
s=read('test/v05719-player-facing-consistency.test.js')
s=s.replace('assert.equal(sanitizePlayerText("先看轮廓，再对此作出判斷",120,""),"先看輪廓，再對此作出判斷")', 'assert.equal(sanitizePlayerText("先看轮廓，再对此作出判斷",120,""),"先看輪廓，再對此作出判斷");\n assert.equal(sanitizeSuggestion("將手掌緊貼牆面 previously 觸摸過的區域"),"將手掌緊貼牆面 先前 觸摸過的區域");\n assert.equal(sanitizeSuggestion("沿著 wall trace 繼續找證據"),"")')
s=s.replace('assert.equal(selfIntro,"我是瑟琳，你可以叫我賽琳。");','assert.equal(selfIntro,"我是瑟琳，你可以叫我瑟琳。");')
s += '''\n\ntest("v0.57.19 suggestions ignore prior-world and wrong-scene events while preferring the current NPC clue",()=>{\n const s=state();s.world.id="WORLD-B";s.world.createdAt=2000;s.player.location="石橋";\n s.events=[\n  {id:"OLD",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",worldId:"WORLD-A",location:"裂隙",summary:"遠處輪廓逐漸變得模糊。",at:2500},\n  {id:"OLD-UNSCOPED",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",summary:"眼前的裂隙持續擴張。",at:1500},\n  {id:"OTHER-SCENE",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",worldId:"WORLD-B",location:"L2",summary:"另一區域的鐘聲突然停止。",at:2600},\n  {id:"CLUE",type:"NPC_CLUE_CONFIRMED",visibility:"PLAYER_KNOWN",worldId:"WORLD-B",location:"石橋",npcId:"N2",summary:"聽準頻率轉調的那個點，順著嗡鳴消失的方向走，你會找到我上次卡住的符號。",at:2700}\n ];\n const set=regenerateContextualActionSet(s),text=set.all.map(x=>x.label+" "+x.action).join("\\n");\n assert.match(text,/嗡鳴消失|剛取得的線索/);\n assert.doesNotMatch(text,/遠處輪廓|眼前的裂隙|另一區域的鐘聲/)\n});\n\ntest("v0.57.19 app resets world-bound caches and discards stale NPC async responses",async()=>{\n const {readFile}=await import("node:fs/promises"),app=await readFile(new URL("../app.js",import.meta.url),"utf8");\n assert.match(app,/STATE_BOUND_UI_CACHE_RESET/);assert.match(app,/helperHistory=\[\]/);assert.match(app,/suggestionRefresh\.rejected=\[\]/);assert.match(app,/suggestionRefresh\.exclude=\[\]/);\n assert.match(app,/NPC_CONVERSATION_STALE_DISCARDED/);assert.match(app,/isCurrentStateSession\(conversationSession\)/);assert.match(app,/AUTOTEST_WORLD_SCOPE_READY/)\n});\n'''
write('test/v05719-player-facing-consistency.test.js',s)
print('v0.57.19 world scope refine applied')
