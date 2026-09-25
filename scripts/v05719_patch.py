from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def replace_once(text,old,new,label):
    if old not in text: raise SystemExit(f'MISSING_ANCHOR:{label}')
    return text.replace(old,new,1)

# Runtime locale guard: normalize only unambiguous observed Simplified variants, then keep residual rejection.
p=Path('src/runtime-guard.js'); s=read(p)
s=replace_once(s,
'const SIMPLIFIED_MARKER=/[这转询问当视现节轻触锋锐属边缘测试温质闭仪监为从发确认记录状态细详标围环参见续验证获长设仅报断体统网络灵气区门进观点线导级结构开关与动无处应术觉话资]/g;\n',
'const SIMPLIFIED_MARKER=/[这转询问当视现节轻触锋锐属边缘测试温质闭仪监为从发确认记录状态细详标围环参见续验证获长设仅报断体统网络灵气区门进观点线导级结构开关与动无处应术觉话资对轮]/g;\nconst SAFE_TRADITIONAL_MAP=Object.freeze({"对":"對","轮":"輪"});\nexport function normalizePlayerFacingLocale(value,max=1600){return clean(value,max).replace(/[对轮]/g,ch=>SAFE_TRADITIONAL_MAP[ch]||ch)}\n', 'locale-map')
s=replace_once(s,' const s=clean(value,1600);if(!s)return false;',' const s=normalizePlayerFacingLocale(value,1600);if(!s)return false;','language-safe-normalize')
s=replace_once(s,' const s=stripSystemLabels(value,max);\n return s&&isPlayerFacingLanguageSafe(s)?s:clean(fallback,max)',' const s=normalizePlayerFacingLocale(stripSystemLabels(value,max),max);\n return s&&isPlayerFacingLanguageSafe(s)?s:normalizePlayerFacingLocale(fallback,max)','sanitize-normalize')
s=replace_once(s,' const s=clean(value,120).replace(/[\\r\\n\\t]/g," ")',' const s=normalizePlayerFacingLocale(value,120).replace(/[\\r\\n\\t]/g," ")','location-normalize')
write(p,s)

# Contextual suggestions: reject meta/transcript text, sanitize locale, and always project visible NPC names.
p=Path('src/contextual-actions.js'); s=read(p)
s=replace_once(s,'import {playerVisibleNpcName} from "./player-entity-visibility.js?v=57018";\n','import {playerVisibleNpcName} from "./player-entity-visibility.js?v=57018";\nimport {sanitizePlayerText} from "./runtime-guard.js?v=57018";\n','actions-import')
s=replace_once(s,'const GENERIC_MAGIC_USE=/(?:運用|使用|施展|釋放|凝聚|抽取|引導|操控|催動|調動|注入|集中|感知).{0,14}(?:靈息|靈能|魔力|魔法|法術|咒力|mana|magic|spell|psychic)|(?:靈息|靈能|魔力|魔法|法術|咒力|mana|magic|spell|psychic).{0,14}(?:施展|釋放|凝聚|抽取|操控|催動|調動|注入)/i;\n','const GENERIC_MAGIC_USE=/(?:運用|使用|施展|釋放|凝聚|抽取|引導|操控|催動|調動|注入|集中|感知).{0,14}(?:靈息|靈能|魔力|魔法|法術|咒力|mana|magic|spell|psychic)|(?:靈息|靈能|魔力|魔法|法術|咒力|mana|magic|spell|psychic).{0,14}(?:施展|釋放|凝聚|抽取|操控|催動|調動|注入)/i;\nconst PLAYER_META_TEXT=/(?:玩家在當前場景主動嘗試|玩家[:：].{0,120}(?:\\/|NPC|對方)|NPC_INTERACTION|NPC_CONVERSATION|PLAYER_ACTION|內部分類|系統分類|SYSTEM|DEBUG|STATE(?:_SYNC)?)/i;\nfunction playerFacingEventSummary(event){const summary=sanitizePlayerText(event?.playerSummary||event?.visibleSummary||event?.summary,220,"");return summary&&!PLAYER_META_TEXT.test(summary)?summary:""}\n','meta-guard')
old=' const label=clean(row.label||row.action,120),action=clean(row.action||row.label,180);if(!label||!action||DECISION_WORDS.test(label+" "+action))return null;'
new=' const label=sanitizePlayerText(row.label||row.action,120,""),action=sanitizePlayerText(row.action||row.label,180,"");if(!label||!action||PLAYER_META_TEXT.test(label+" "+action)||DECISION_WORDS.test(label+" "+action))return null;'
s=replace_once(s,old,new,'normalize-visible-text')
s=s.replace('  skillHint:clean(row.skillHint,70)||null,\n  consequenceHint:clean(row.consequenceHint,90)||null,\n  causalBasis:clean(row.causalBasis,180)||null,','  skillHint:sanitizePlayerText(row.skillHint,70,"")||null,\n  consequenceHint:sanitizePlayerText(row.consequenceHint,90,"")||null,\n  causalBasis:sanitizePlayerText(row.causalBasis,180,"")||null,')
old='function recentVisibleEvent(state){return (state.events||[]).filter(e=>e?.visibility!=="INTERNAL"&&PROGRESSION_EVENT_TYPES.has(String(e.type||""))&&clean(e.summary||e.action,220)).slice(-8).reverse()[0]||null}'
new='function recentVisibleEvent(state){return (state.events||[]).filter(e=>e?.visibility!=="INTERNAL"&&PROGRESSION_EVENT_TYPES.has(String(e.type||""))).map(e=>({...e,summary:playerFacingEventSummary(e)})).filter(e=>e.summary).slice(-8).reverse()[0]||null}'
s=replace_once(s,old,new,'safe-event-summary')
s=s.replace('label:`換個問題詢問${clean(npc.name,50)}`,action:`向${clean(npc.name,50)}改問一項尚未重複、而且對方可憑親身觀察回答的具體細節`','label:`換個問題詢問${clean(visibleNpcName(state,npc),50)}`,action:`向${clean(visibleNpcName(state,npc),50)}改問一項尚未重複、而且對方可憑親身觀察回答的具體細節`')
write(p,s)

# Canonical NPC self-name correction only after the player already knows the canonical name.
p=Path('src/player-entity-visibility.js'); s=read(p)
insert='''\nfunction nearCanonicalName(candidate,canonical){const a=[...clean(candidate,24)],b=[...clean(canonical,24)];if(a.length!==b.length||a.length<2||a.length>8)return false;let diff=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i]&&++diff>1)return false;return diff===1}\nexport function canonicalizeNpcIdentityText(state,npc,value=""){\n let out=String(value||"");const canonical=clean(npc?.name,80);if(!canonical||!npcNameKnown(state,npc))return out;\n out=out.replace(/((?:我叫|我是|叫我|稱呼我(?:為)?|我的名字是|名字是)\\s*[「『\"“]?)([\\u3400-\\u9fff·・\\-]{2,12})/g,(all,prefix,candidate)=>nearCanonicalName(candidate,canonical)?prefix+canonical:all);\n out=out.replace(/^([\\u3400-\\u9fff·・\\-]{2,12})(?=[：:])/,(all,candidate)=>nearCanonicalName(candidate,canonical)?canonical:all);\n return out\n}\n'''
s=replace_once(s,'export function redactUnknownNpcNames(state,value=""){',insert+'export function redactUnknownNpcNames(state,value=""){','identity-canonicalizer')
write(p,s)

# AI NPC responses: exact canonical-name instruction + deterministic post-processing + non-leaking fallback.
p=Path('src/ai-client.js'); s=read(p)
s=replace_once(s,'import {validateLazyGenerationCandidate} from "./lazy-generation.js?v=57018";\n','import {validateLazyGenerationCandidate} from "./lazy-generation.js?v=57018";\nimport {playerVisibleNpcName,canonicalizeNpcIdentityText} from "./player-entity-visibility.js?v=57018";\n','ai-identity-import')
pat=r'export async function talkToDynamicNpc\(state,npc,message,contact=\{\}\)\{.*?\}\nexport const turnDirectorMode=sharedTurnDirectorMode;'
m=re.search(pat,s,re.S)
if not m: raise SystemExit('MISSING_ANCHOR:talkToDynamicNpc')
replacement='''export async function talkToDynamicNpc(state,npc,message,contact={}){\n const knownFacts=npcKnownFacts(state,npc),recognition=recognitionForNpc(state,npc),behavior=npcBehaviorSnapshot(npc),originContext=originNpcContext(state,npc),visibleName=playerVisibleNpcName(state,npc),payload={message,npc:{id:npc.id,name:npc.name,role:npc.role,description:npc.description,personality:npc.personality,goal:npc.goal,behavior},knownFacts,memories:(npc.memories||[]).slice(-12),recognition,originContext,contact:{mode:contact.mode||"LOCAL",communication:contact.communication||null},scene:{day:state.world.state.day,clock:state.world.state.clock,location:state.player.location,weather:playerWeatherSnapshot(state)}};\n const identityRule=`你的 canonical 姓名精確為「${npc.name}」。若回答內需要自稱或寫出自己的名字，必須逐字使用這個字串，不得音譯、近音改字或自行改拼法。`;\n let raw="";\n if(hasDirectAI())raw=await directChat({aiTask:"npc",timeoutMs:45000,system:`你扮演 Elyndra NPC「${npc.name}」。${identityRule} 保持 personality、goal、behavior 與既有 memories 一致。只能使用 knownFacts、memories 與 recognition.knownDeeds；public Canon 並不代表你自動知道。behavior 是玩家可感受到的一致人格：回答時自然體現其中一項 mannerism、speechPattern、habit、value、fear 或 contradiction，但不要每句都重複同一習慣，也不要把欄位名稱唸出來。若 memories 或 behavior.promises / grudges 與玩家本次說話有關，必須記得並以行為或措辭反映；不要說出 trust 數值或任何內部關係數值。recognition.knownDeeds 是這名 NPC 合理聽過的玩家事蹟，可以自然影響稱呼、語氣與態度；如果為空就不可突然認識玩家的名聲。originContext 是 Engine 根據玩家 Origin 計算的身份與語言邊界：reaction 只影響演出語氣，不能自行修改 trust；languageMode=GESTURE 時不可讓雙方突然流利理解語言，只能用姿勢、表情、指向與極少量可推斷意思；FRAGMENTED 時可表現詞彙／理解不完整。若 contact.mode=REMOTE，必須自然反映 payload.contact.communication 所定義的世界內通訊媒介與限制，但不要自行發明更高階技術。不知道的事不可捏造。只使用繁體中文1-5句；除既有專有名詞外不要切換其他語言，不要輸出系統標籤。`,user:JSON.stringify(payload)});\n else raw=(await post("/api/npc",payload)).text;\n const safe=sanitizePlayerText(raw,700,`${visibleName}暫時沒有再補充更多資訊。`);return canonicalizeNpcIdentityText(state,npc,safe)\n}\nexport const turnDirectorMode=sharedTurnDirectorMode;'''
s=s[:m.start()]+replacement+s[m.end():]
write(p,s)

p=Path('api/npc.js'); s=read(p)
s=replace_once(s,'保持角色性格，繁體中文，1-4句。`;','你的 canonical 姓名精確為「${npc.name}」；若回答內需要自稱或寫出自己的名字，必須逐字使用這個字串，不得音譯、近音改字或自行改拼法。保持角色性格，繁體中文，1-4句。`;','api-name-rule')
write(p,s)

# New non-download regression tests.
p=Path('test/v05719-player-facing-consistency.test.js')
write(p,'''import test from "node:test";\nimport assert from "node:assert/strict";\nimport {sanitizeSuggestion,sanitizePlayerText} from "../src/runtime-guard.js";\nimport {normalizeContextualSuggestion,regenerateContextualActionSet} from "../src/contextual-actions.js";\nimport {canonicalizeNpcIdentityText,playerVisibleNpcName} from "../src/player-entity-visibility.js";\n\nfunction state(){return {world:{id:"W1",state:{day:1},registry:{locations:[{id:"L1",name:"石橋",known:true}],npcs:[],sideQuests:[]},creation:{blueprint:{difficulty:"normal"}}},player:{location:"石橋",difficulty:"normal",skills:{OBSERVE:1,SOCIAL:1,TRAVEL:0,RISKY:0},magic:{knownSpells:[]}},quests:{main:{title:"",objectives:[],status:"ACTIVE"}},events:[]}}\n\ntest("v0.57.19 player-facing locale normalizes observed Simplified variants",()=>{\n assert.equal(sanitizeSuggestion("沿著模糊轮廓对此繼續追查"),"沿著模糊輪廓對此繼續追查");\n assert.equal(sanitizePlayerText("先看轮廓，再对此作出判斷",120,""),"先看輪廓，再對此作出判斷")\n});\n\ntest("v0.57.19 meta interaction classification never becomes a player suggestion",()=>{\n const leaked="沿著『玩家在當前場景主動嘗試與眼前的陌生人互動：詢問道路』留下的影響追查下去";\n assert.equal(normalizeContextualSuggestion({label:leaked,action:leaked,kind:"OBSERVE",risk:"LOW",requirementsSatisfied:true,causalBasis:"最近事件"}),null);\n const s=state();s.events.push({id:"E1",type:"WORLD_CONSEQUENCE",visibility:"PLAYER_KNOWN",summary:"玩家在當前場景主動嘗試與眼前的陌生人互動：「詢問道路」"});\n const set=regenerateContextualActionSet(s);assert.equal(set.primary.length,3);for(const row of set.all)assert.doesNotMatch(row.label+" "+row.action,/玩家在當前場景主動嘗試|NPC_INTERACTION|PLAYER_ACTION/)\n});\n\ntest("v0.57.19 refresh suggestions use player-visible NPC identity",()=>{\n const s=state(),npc={id:"N1",name:"瑟琳",known:true,nameKnown:false,alive:true,locationId:"L1"};s.world.registry.npcs.push(npc);\n const set=regenerateContextualActionSet(s);assert.equal(playerVisibleNpcName(s,npc),"眼前的陌生人");for(const row of set.all)assert.doesNotMatch(row.label+" "+row.action,/瑟琳/)\n});\n\ntest("v0.57.19 known NPC self-name near-variant is canonicalized without revealing hidden names",()=>{\n const known=state(),npc={id:"N1",name:"瑟琳",known:true,nameKnown:true};known.world.registry.npcs.push(npc);\n assert.equal(canonicalizeNpcIdentityText(known,npc,"賽琳：我知道一條路。"),"瑟琳：我知道一條路。");\n assert.equal(canonicalizeNpcIdentityText(known,npc,"我是賽琳，你可以跟著我。"),"我是瑟琳，你可以跟著我。");\n const hidden=state(),hiddenNpc={id:"N2",name:"瑟琳",known:true,nameKnown:false};hidden.world.registry.npcs.push(hiddenNpc);\n assert.equal(canonicalizeNpcIdentityText(hidden,hiddenNpc,"我是賽琳。"),"我是賽琳。")\n});\n''')

# Release/cache bump.
for path in list(ROOT.glob('*.js'))+list((ROOT/'src').glob('*.js'))+list((ROOT/'api').glob('*.js'))+[ROOT/'index.html']:
    text=path.read_text(encoding='utf-8').replace('57018','57019')
    path.write_text(text,encoding='utf-8')
for rel in ['package.json','src/version.js','test/version-0551-release.test.js']:
    path=ROOT/rel;text=path.read_text(encoding='utf-8').replace('0.57.18','0.57.19');path.write_text(text,encoding='utf-8')

release=ROOT/'docs/releases/v0.57.19.md'
release.write_text('''# Elyndra v0.57.19\n\nPlayer-facing consistency hardening.\n\n- Reject internal interaction/transcript/meta text from contextual suggestions.\n- Normalize observed Simplified-Chinese leakage in player-facing text and retain residual locale rejection.\n- Route refreshed NPC suggestions through the player-visible name projection.\n- Lock known NPC self-identification to the canonical registry name without revealing hidden names.\n- Non-download regressions cover all three behaviors.\n''',encoding='utf-8')
print('v0.57.19 patch applied')
