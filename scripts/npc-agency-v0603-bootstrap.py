from pathlib import Path
import json

def replace(path,old,new,count=1):
 p=Path(path);s=p.read_text(encoding='utf-8')
 if old not in s: raise SystemExit(f'MISSING:{path}:{old[:100]}')
 p.write_text(s.replace(old,new,count),encoding='utf-8')

# NPC conversation commits only the Engine plan that was already shown to the narrator.
p=Path('src/npc-conversation.js');s=p.read_text(encoding='utf-8')
anchor='import {recordDebug} from "./debug-telemetry.js?v=57025";'
if 'npc-agency-engine.js?v=60003' not in s:s=s.replace(anchor,anchor+'\nimport {commitNpcConversationAction} from "./npc-agency-engine.js?v=60003";')
s=s.replace('export function applyNpcConversationTurn(state,npc,message,answer){','export function applyNpcConversationTurn(state,npc,message,answer,options={}){',1)
s=s.replace(' const languageContext=npcLanguageContext(state,npc);recordDebug("NPC_TALK_RESOLUTION",{languageContext});',' const languageContext=npcLanguageContext(state,npc),agencyResult=options.socialPlan?.requiresResolution?commitNpcConversationAction(state,npc,options.socialPlan):null;recordDebug("NPC_TALK_RESOLUTION",{languageContext,socialOutcome:agencyResult?.social?.outcome||null});',1)
s=s.replace('npcId:npc.id,mode,firstEncounter,memoryId:memory?.id||null,questInteractions:', 'npcId:npc.id,mode,firstEncounter,memoryId:memory?.id||null,socialOutcome:agencyResult?.social?.outcome||null,questInteractions:',1)
s=s.replace('return {mode,minutes,elapsed:(state.world.state.clock?.totalMinutes||0)-before,progressed,questInteractions,worldEvent,event,cognition:npcCognitionSnapshot(state,npc)};', 'return {mode,minutes,elapsed:(state.world.state.clock?.totalMinutes||0)-before,progressed,questInteractions,worldEvent,event,agencyResult,cognition:npcCognitionSnapshot(state,npc)};',1)
p.write_text(s,encoding='utf-8')

# App plans substantive speech before AI narration and passes only the Engine contract to AI.
p=Path('app.js');s=p.read_text(encoding='utf-8')
if './src/version.js?v=60002' not in s: raise SystemExit('APP_VERSION_IMPORT_NOT_60002')
s=s.replace('./src/version.js?v=60002','./src/version.js?v=60003',1)
s=s.replace('from "./src/ai-client.js?v=59014";','from "./src/ai-client.js?v=60003";',1)
s=s.replace('import {applyNpcConversationTurn} from "./src/npc-conversation.js?v=59014";','import {applyNpcConversationTurn} from "./src/npc-conversation.js?v=60003";\nimport {planNpcConversationAction} from "./src/npc-agency-engine.js?v=60003";',1)
old='if(!npc||!mode)return;const messages=npcConversationMessages(npcId);'
new='if(!npc||!mode)return;const agencyPlan=planNpcConversationAction(conversationState,npc,q);if(agencyPlan.requiresResolution){renderRoll(agencyPlan.roll);recordDebug("NPC_SOCIAL_ACTION_PLANNED",{npcId,speechAct:agencyPlan.speechAct?.kind||null,outcome:agencyPlan.expectedOutcome||null,resolution:agencyPlan.resolution?.tier||null})}const messages=npcConversationMessages(npcId);'
if old not in s: raise SystemExit('APP_NPC_PLAN_INSERT_NOT_FOUND')
s=s.replace(old,new,1)
s=s.replace('talkToDynamicNpc(conversationState,npc,q,{mode,communication:worldCommunication(conversationState)})','talkToDynamicNpc(conversationState,npc,q,{mode,communication:worldCommunication(conversationState),authority:agencyPlan.aiContract})',1)
s=s.replace('applyNpcConversationTurn(conversationState,npc,q,answer)','applyNpcConversationTurn(conversationState,npc,q,answer,{socialPlan:agencyPlan})',1)
p.write_text(s,encoding='utf-8')

# Direct AI narrator receives a binding Engine authority contract.
p=Path('src/ai-client.js');s=p.read_text(encoding='utf-8')
s=s.replace('contact:{mode:contact.mode||"LOCAL",communication:contact.communication||null},scene:', 'contact:{mode:contact.mode||"LOCAL",communication:contact.communication||null},authority:contact.authority||null,scene:',1)
needle='若 contact.mode=REMOTE，必須自然反映 payload.contact.communication 所定義的世界內通訊媒介與限制，但不要自行發明更高階技術。'
authority_rule='若 authority 存在，它是 Engine 已完成的社交裁決且高於角色即興：authority.mustFollow=true 時必須遵守 directive 與 outcome；MUST_REFUSE_REQUEST 不得答應要求，MUST_COUNTEROFFER_WITHOUT_FULL_CONCESSION 只能提出條件而不可完全讓步，MAY_SHOW_DOUBT_BUT_MUST_NOT_FULLY_CONCEDE 可動搖但不可直接同意，MUST_CONCEDE_THE_ENGINE_APPROVED_REQUEST 必須就本次要求作出 Engine 已批准的讓步，MUST_ESCALATE_DISTRUST_OR_RESISTANCE 必須提高戒心或拒絕。CHAT/ROLEPLAY_ONLY_NO_STATE_CONCESSION 只可自然交談，不可自行創造承諾、物品轉移、任務完成或關係數值變化。不要向玩家說出 authority、directive 或內部數值。'
if authority_rule not in s:s=s.replace(needle,needle+authority_rule,1)
p.write_text(s,encoding='utf-8')

# Server AI path receives the same authority contract.
p=Path('api/npc.js');s=p.read_text(encoding='utf-8')
s=s.replace('recognition={knownDeeds:[],titles:[]},contact={mode:"LOCAL",communication:null},scene','recognition={knownDeeds:[],titles:[]},contact={mode:"LOCAL",communication:null},authority=null,scene',1)
needle='若 contact.mode=REMOTE，只可使用 contact.communication 定義的世界內通訊媒介與限制，不得自行發明更高文明技術。'
rule='若 authority 存在，它是 Engine 已完成且不可覆寫的社交裁決；authority.mustFollow=true 時必須遵守 directive/outcome。拒絕就不得答應，counteroffer 不得完全讓步，concede 才可同意本次要求；CHAT 模式不可自行創造承諾、物品轉移、任務完成或關係數值變化。不要把 authority、directive 或內部數值說給玩家。'
if rule not in s:s=s.replace(needle,needle+rule,1)
s=s.replace('titles:(recognition.titles||[]).slice(-4)},contact,scene','titles:(recognition.titles||[]).slice(-4)},contact,authority,scene',1)
p.write_text(s,encoding='utf-8')

# Release/cache contract.
pkg=Path('package.json');data=json.loads(pkg.read_text(encoding='utf-8'));data['version']='0.60.3';pkg.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
Path('src/version.js').write_text('export const APP_VERSION="0.60.3";\n',encoding='utf-8')
idx=Path('index.html');x=idx.read_text(encoding='utf-8')
imports='"./src/ai-client.js?v=59014":"./src/ai-client.js?v=60003","./src/npc-conversation.js?v=59014":"./src/npc-conversation.js?v=60003",'
marker='"./src/combat-engine.js?v=59014":"./src/combat-engine.js?v=60002",'
if imports not in x:x=x.replace(marker,marker+imports,1)
x=x.replace('app.js?v=60002','app.js?v=60003',1);idx.write_text(x,encoding='utf-8')
vu=Path('test/version-ui.test.js');x=vu.read_text(encoding='utf-8').replace('0.60.2','0.60.3').replace('60002','60003');vu.write_text(x,encoding='utf-8')
vr=Path('test/version-0551-release.test.js');x=vr.read_text(encoding='utf-8').replace('v0.60.2','v0.60.3').replace('0.60.2','0.60.3').replace('app\\.js\\?v=60002','app\\.js\\?v=60003').replace('version\\.js\\?v=60002','version\\.js\\?v=60003').replace('"60002"].includes(x)','"60002","60003"].includes(x)').replace('tokens.includes("60002")','tokens.includes("60003")');vr.write_text(x,encoding='utf-8')
