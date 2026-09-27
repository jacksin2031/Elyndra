from pathlib import Path
import re, json

ROOT=Path('.')

def load(path):
    return (ROOT/path).read_text(encoding='utf-8')

def save(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

def rep(path,old,new,count=1):
    s=load(path)
    n=s.count(old)
    if n < count:
        raise SystemExit(f'{path}: expected >= {count} occurrences, found {n}: {old[:100]!r}')
    s=s.replace(old,new,count)
    save(path,s)

def append_once(path,marker,block):
    s=load(path)
    if marker not in s:
        s += ('\n' if not s.endswith('\n') else '') + block.rstrip() + '\n'
        save(path,s)

# 1) Origin prompts are canonical control data and are injected through seedDirective.
path='src/seed-contract.js'
s=load(path)
if 'originPromptDirective' not in s:
    s='import {originPromptDirective} from "./origin-prompts.js?v=59011";\n'+s
s=s.replace('const s=createWorldSeedContract(seed),random=s.worldviewMode==="ai";\n const timelinePacing=createTimelinePacing(s.targetPlayHours);',
'''const s=createWorldSeedContract(seed),random=s.worldviewMode==="ai",originDirective=originPromptDirective(seed?.creationV2?.blueprint?.player?.origin||seed?.creationV2?.draft?.player?.origin||{});\n const timelinePacing=createTimelinePacing(s.targetPlayHours);''')
s=s.replace('randomEntropy:text(seed.worldviewEntropy,120),\n  rules:[', 'randomEntropy:text(seed.worldviewEntropy,120),\n  originDirective,\n  rules:[\n   ...(originDirective?[originDirective]:[]),')
save(path,s)

# 2) Make the per-origin prompt a first-class input to the world opening stages.
path='src/ai-client.js'; s=load(path)
s=s.replace('user:JSON.stringify({identity,seedContract:expected,blueprintProfile:directive.blueprintProfile,required:{summary:',
'user:JSON.stringify({identity,seedContract:expected,blueprintProfile:directive.blueprintProfile,originContract:directive.originDirective,required:{summary:')
s=s.replace('出生位置亦必須符合 blueprintProfile.origin：crossing 應像無登記的突然抵達；summoned 應合理接近召喚方可接觸的位置；native/reincarnation 應像既有地方生活的一部分；possession 應符合 host 身份；amnesia 要支援記憶缺口。',
'出生位置亦必須符合 blueprintProfile.origin，並逐條遵守 payload.originContract：crossing 應像無登記的突然抵達；summoned 應合理接近召喚方可接觸的位置；native/reincarnation 應像既有地方生活的一部分；possession 應符合 host 身份；amnesia 要支援記憶缺口。')
s=s.replace('user:JSON.stringify({anchor,playerOrigin:seed.creationV2?.originProfile||null,originOpening,required:{openingHook:',
'user:JSON.stringify({anchor,playerOrigin:seed.creationV2?.originProfile||null,originContract:directive.originDirective,originOpening,required:{openingHook:')
s=s.replace('openingHook 的玩家起源只以 payload.playerOrigin 與 payload.originOpening 為權威；',
'openingHook 的玩家起源只以 payload.playerOrigin、payload.originOpening 與 payload.originContract 為權威；payload.originContract 是該起源的獨立硬性 prompt contract；')
save(path,s)

# 3) Reincarnation/local origins receive bounded local knowledge, never arbitrary global public facts.
path='src/origin-runtime.js'; s=load(path)
s=s.replace('PARTIAL_LOCAL:{factLimit:3,worldName:true,calendar:true,spokenCommon:true,readCommon:true,identitySignal:"LOCAL_OR_UNKNOWN",equipmentPolicy:"WORLD_LOCAL_BASIC",spawnPolicy:"LOCAL_LIFE",openingMode:"PARTIAL_LOCAL"}',
'PARTIAL_LOCAL:{factLimit:2,worldName:true,calendar:false,spokenCommon:true,readCommon:true,identitySignal:"LOCAL_OR_UNKNOWN",equipmentPolicy:"WORLD_LOCAL_BASIC",spawnPolicy:"LOCAL_LIFE",openingMode:"PARTIAL_LOCAL",knowledgeScope:"LOCAL_UPBRINGING"}')
s=s.replace('LOCAL_BASELINE:{factLimit:6,worldName:true,calendar:true,spokenCommon:true,readCommon:true,identitySignal:"LOCAL",equipmentPolicy:"WORLD_LOCAL_BASIC",spawnPolicy:"LOCAL_HOME_OR_DUTY",openingMode:"LOCAL_BASELINE"}',
'LOCAL_BASELINE:{factLimit:4,worldName:true,calendar:true,spokenCommon:true,readCommon:true,identitySignal:"LOCAL",equipmentPolicy:"WORLD_LOCAL_BASIC",spawnPolicy:"LOCAL_HOME_OR_DUTY",openingMode:"LOCAL_BASELINE",knowledgeScope:"LOCAL_LIVED"}')
needle='''function rankFacts(state,rows){\n const keys=[state.world?.bible?.startingLocation,state.world?.bible?.startingSettlement,state.world?.bible?.startingRegion].map(x=>clean(x,120)).filter(Boolean);\n return [...rows].sort((a,b)=>{\n  const as=keys.some(k=>String(a.text).includes(k))?1:0,bs=keys.some(k=>String(b.text).includes(k))?1:0;\n  if(as!==bs)return bs-as;return String(a.id).localeCompare(String(b.id))\n })\n}\n'''
insert=needle+'''function localKnowledgeAnchors(state){\n const loc=startingLocationRecord(state),values=[state.world?.bible?.startingLocation,state.world?.bible?.startingSettlement,state.world?.bible?.startingRegion,state.player?.location,state.world?.state?.location,loc?.id,loc?.name,loc?.region];\n return [...new Set(values.map(x=>clean(x,120)).filter(Boolean))]\n}\nfunction factIsLocal(state,fact){\n const anchors=localKnowledgeAnchors(state);if(!anchors.length)return false;const textValue=String(fact?.text||""),meta=[fact?.locationId,fact?.regionId,fact?.region,fact?.scopeId,fact?.sourceId].map(x=>clean(x,120)).filter(Boolean);return anchors.some(anchor=>textValue.includes(anchor)||meta.includes(anchor))\n}\nfunction originFacts(state,rules){const rows=publicFacts(state);return ["PARTIAL_LOCAL","LOCAL_BASELINE"].includes(rules.knowledgePolicy)?rows.filter(f=>factIsLocal(state,f)):rows}\nfunction boundReincarnationVisibility(state){\n const registry=state.world?.registry||{},loc=startingLocationRecord(state),locId=String(loc?.id||"");\n for(const row of registry.locations||[])if(row!==loc&&row?.originKnown!==true){row.known=false;if(row.visibilityLock!=="KNOWN")row.visibilityLock="UNSEEN"}\n for(const npc of registry.npcs||[])if(npc?.originKnown!==true&&!(locId&&String(npc?.locationId||"")===locId)){npc.known=false;if(npc.visibilityLock!=="KNOWN")npc.visibilityLock="UNSEEN"}\n for(const row of registry.factions||[])if(row?.originKnown!==true){row.known=false;if(row.visibilityLock!=="KNOWN")row.visibilityLock="UNSEEN"}\n for(const row of registry.sideQuests||[])if(row?.originKnown!==true){row.known=false;if(row.visibilityLock!=="KNOWN")row.visibilityLock="UNSEEN"}\n}\n'''
if 'function localKnowledgeAnchors' not in s:
    if needle not in s: raise SystemExit('origin-runtime rankFacts anchor not found')
    s=s.replace(needle,insert,1)
s=s.replace('const rows=rankFacts(state,publicFacts(state)).slice(0,Math.max(0,rules.factLimit)),granted=[];',
'''if(rules.knowledgePolicy==="PARTIAL_LOCAL")boundReincarnationVisibility(state);\n const rows=rankFacts(state,originFacts(state,rules)).slice(0,Math.max(0,rules.factLimit)),granted=[];''')
s=s.replace('openingMode:rules.openingMode,', 'openingMode:rules.openingMode,knowledgeScope:rules.knowledgeScope||rules.knowledgePolicy,')
save(path,s)

# 4) Sanitize generated entity names at the canonical registry boundary.
path='src/world-registry.js'; s=load(path)
if 'function cleanEntityName' not in s:
    s=s.replace('const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";',
'''const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";\nfunction cleanEntityName(v,max=80){return clean(String(v??"").normalize("NFKC"),max).replace(/^[\\s\\"'“”‘’「」『』，,。；;：:]+|[\\s\\"'“”‘’「」『』，,。；;：:]+$/gu,"").trim()}''')
s=s.replace('const name=clean(x.name,80);if(byName(r.locations,name))continue;', 'const name=cleanEntityName(x.name,80);if(!name||byName(r.locations,name))continue;')
s=s.replace('const name=clean(x.name,80);if(byName(r.factions,name))continue;', 'const name=cleanEntityName(x.name,80);if(!name||byName(r.factions,name))continue;')
s=s.replace('const name=clean(x.name,80);if(byName(r.npcs,name))continue;', 'const name=cleanEntityName(x.name,80);if(!name||byName(r.npcs,name))continue;')
save(path,s)

# 5) Suggestions that imply inventory use must resolve every named item to canonical inventory.
path='src/contextual-actions.js'; s=load(path)
s=s.replace('const POSSESSION_ITEM=/從(?:口袋|背包|行囊|隨身物品|身上).{0,18}?(?:取出|拿出|掏出|抽出)\\s*([^，。；、,.;!?！？]{2,36})/i;',
'''const POSSESSION_ITEM=/(?:從(?:口袋|背包|行囊|隨身物品|身上).{0,18}?)?(?:取出|拿出|掏出|抽出|使用|展示|交出|遞出|安裝|裝入|消耗|丟棄)\\s*[「『“\"]?([^。；;!?！？\\n]{2,90})/i;''')
old='''function impliedInventoryItem(action=""){\n const m=String(action||"").match(POSSESSION_ITEM);return clean(m?.[1]||m?.[2]||"",50).replace(/^(?:那|這)(?:一)?(?:個|枚|片|件|瓶|把|本|張|塊|顆|粒)?/i,"").trim()\n}\n'''
new='''function impliedInventoryItems(action=""){\n const m=String(action||"").match(POSSESSION_ITEM);if(!m)return [];let body=clean(m[1],90).replace(/[」』”\"]+$/u,"");body=body.split(/(?:給|向|對|來|以便|用來|並且|然後|再|後再)/u)[0];return [...new Set(body.split(/(?:與|和|以及|、|，|,)/u).map(x=>clean(x,50).replace(/^(?:那|這)?(?:一)?(?:個|枚|片|件|瓶|把|本|張|塊|顆|粒|份|支)?(?:泛黃的|磨損的|無標的|隨身的)?/u,"").trim()).filter(x=>x.length>=2))].slice(0,5)\n}\nfunction impliedInventoryItem(action=""){return impliedInventoryItems(action)[0]||""}\n'''
if old not in s: raise SystemExit('contextual impliedInventoryItem anchor not found')
s=s.replace(old,new,1)
s=s.replace(''' const implied=impliedInventoryItem(x.action);\n if(implied&&!inventoryRows(state).some(item=>[item?.id,item?.name].some(v=>v&&String(v)===implied)))reasons.push("IMPLIED_ITEM_MISSING:"+implied);''',
''' const impliedRows=impliedInventoryItems(x.action),have=inventoryRows(state).flatMap(item=>[item?.id,item?.name]).map(v=>String(v||"")).filter(Boolean);\n for(const implied of impliedRows)if(!have.some(v=>v===implied||v.includes(implied)||implied.includes(v)))reasons.push("IMPLIED_ITEM_MISSING:"+implied);\n const implied=impliedRows[0]||"";''')
save(path,s)

# 6) Scene/suggestion provenance rejects invented acquisitions and unowned item use.
path='src/scene-provenance.js'; s=load(path)
if 'function itemGroundingIssues' not in s:
    anchor='function foreignContainerIssues(value,scope={},kind=""){const text=String(value||""),anchors=sceneAnchorText(scope),known=names(scope.knownLocations),travelTarget=String(kind||"").toUpperCase()==="TRAVEL"?knownLocationMention(text,known):"",issues=[];for(const cue of containerCues(text)){if(anchors.includes(cue))continue;if(travelTarget&&travelTarget.includes(cue))continue;issues.push({type:"SCENE_CONTAINER_UNGROUNDED",value:cue,currentLocation:clean(scope.currentLocation,160)})}return issues}\n'
    extra='''function itemGroundingIssues(value,scope={},suggestion=false){const text=String(value||""),inventory=names(scope.inventoryNames),action=String(scope.action||""),issues=[],re=/(?:取出|拿出|掏出|抽出|帶出|拿走|取走|收起|收入|收進|放入(?:口袋|背包)?|使用|展示|交出|遞出|安裝|裝入|消耗|丟棄)\\s*[「『“\"]?([^。；;!?！？\\n]{2,90})/giu;let m;while((m=re.exec(text))){let body=clean(m[1],90).replace(/[」』”\"]+$/u,"").split(/(?:給|向|對|來|以便|用來|並且|然後|再|後再)/u)[0];for(let candidate of body.split(/(?:與|和|以及|、|，|,)/u)){candidate=clean(candidate,60).replace(/^(?:那|這)?(?:一)?(?:個|枚|片|件|瓶|把|本|張|塊|顆|粒|份|支)?(?:泛黃的|磨損的|無標的|隨身的)?/u,"").trim();if(candidate.length<2||/^(?:口袋|背包|行囊)$/.test(candidate))continue;const owned=inventory.some(name=>name===candidate||name.includes(candidate)||candidate.includes(name)),actionGrounded=!suggestion&&action&&(action.includes(candidate)||inventory.some(name=>action.includes(name)&&(name.includes(candidate)||candidate.includes(name))));if(!owned&&!actionGrounded)issues.push({type:suggestion?"SUGGESTION_ITEM_NOT_OWNED":"SCENE_ITEM_ACQUISITION_UNGROUNDED",value:candidate})}}return issues}\n'''
    if anchor not in s: raise SystemExit('scene provenance anchor not found')
    s=s.replace(anchor,anchor+extra,1)
s=s.replace('issues.push(...foreignContainerIssues(narrative+"\\n"+sceneTitle,scope,"OBSERVE"));', 'issues.push(...foreignContainerIssues(narrative+"\\n"+sceneTitle,scope,"OBSERVE"));issues.push(...itemGroundingIssues(narrative+"\\n"+sceneTitle,scope,false));')
s=s.replace('issues.push(...foreignContainerIssues(action+"\\n"+label,scope,kind));return {valid:issues.length===0,issues,action,kind}', 'issues.push(...foreignContainerIssues(action+"\\n"+label,scope,kind));issues.push(...itemGroundingIssues(action+"\\n"+label,scope,true));return {valid:issues.length===0,issues,action,kind}')
save(path,s)

# 7) State discovery schema is explicit about observation provenance and deferred rebasing has a small TTL.
path='src/state-sync.js'; s=load(path)
s=s.replace('sourceId":"既有且本回合可觀察的 id 或唯一名稱"}', 'sourceId":"既有且本回合可觀察的 id 或唯一名稱","observationEventId":"如有本回合可見事件，必須填既有 event id；沒有時留空"}')
s=s.replace('return safe?{ok:true,rebased:true,rebasedFrom:base,currentRevision:current}:{ok:false,stale:true,currentRevision:current,baseRevision:base}',
'''const ttl=Math.max(0,Math.min(3,Number(plan?.ttlRevisions??2)));const age=Math.max(0,current-base);\n if(safe&&age<=ttl)return {ok:true,rebased:true,rebasedFrom:base,currentRevision:current,age,ttl};\n return {ok:false,stale:true,currentRevision:current,baseRevision:base,age,ttl,reason:age>ttl?"DEFERRED_TTL_EXPIRED":"REVISION_STALE"}''')
save(path,s)

# 8) Scene and State prompts share one evidence boundary; no independent factual interpretation.
path='src/ai-runtime-contracts.js'; s=load(path)
s=s.replace('DISCOVER_FACT 必須指出 sourceKind/sourceId，而且 sourceId 必須是 snapshot 中本回合真正可觀察的既有 Canon fact、目前地點、可互動 NPC、玩家可見事件或玩家持有物品；',
'DISCOVER_FACT 必須指出 sourceKind/sourceId，並在 snapshot 有本回合可見事件時填 observationEventId；它只能把 payload.kernel.allowedVisibleFacts 或 snapshot 已存在且可觀察的 evidence materialize 成 fact，不得自行推導「吻合／不吻合」「某物就是某機關部件」等新結論；sourceId 必須是 snapshot 中本回合真正可觀察的既有 Canon fact、目前地點、可互動 NPC、玩家可見事件或玩家持有物品；')
s=s.replace('特別重要：若某個物件狀態、人物動作、身份或環境細節沒有出現在 kernel.allowedVisibleFacts 或 snapshot 的既有玩家可知資料，你不得自行把它寫成「是」或「不是」、存在或不存在、正在或沒有正在；',
'特別重要：Scene 與 State 共用 kernel.allowedVisibleFacts 作唯一 TurnEvidence；若某個物件狀態、人物動作、身份、比較結果（包括匹配／不匹配）或環境細節沒有逐字或等義出現在 kernel.allowedVisibleFacts 或 snapshot 的既有玩家可知資料，你不得自行把它寫成「是」或「不是」、存在或不存在、正在或沒有正在；敘事不得宣稱玩家取得、收入口袋或持有 snapshot.inventory 與本回合 action 明確取得目標之外的任何物品；')
s=s.replace('discoveries 只有成功取得證據時才可升格已驗證 Canon。', 'discoveries 只有 payload.kernel.allowedVisibleFacts、玩家可見 observation event 或既有可觀察 source 明確支持時才可升格已驗證 Canon；不得與 Scene 平行發明比較結論。')
save(path,s)

# 9) NPC conversation memory is explicitly grounded to the conversation event.
path='src/npc-conversation.js'; s=load(path)
s=s.replace('source:"CONVERSATION",day:state.world.state.day,minute:state.world.state.clock.totalMinutes', 'source:"CONVERSATION",grounded:true,mode,day:state.world.state.day,minute:state.world.state.clock.totalMinutes')
save(path,s)

# 10) Canonical progress fingerprint ignores clock/event churn and drives FIRST_BUTTON recovery.
path='src/ai-autotest.js'; s=load(path)
anchor='export function autotestStateFingerprint(state={}){'
if 'export function autotestProgressFingerprint' not in s:
    idx=s.find(anchor)
    if idx<0: raise SystemExit('autotest fingerprint anchor missing')
    block='''export function autotestProgressFingerprint(state={}){const main=state.quests?.main||{},registry=state.world?.registry||{};return JSON.stringify({location:state.player?.location||"",questStage:Number(main.stage)||0,questStatus:main.status||"",objective:list(main.objectives)[0]||"",knowledge:list(state.knowledge).filter(x=>String(x?.status||"").toUpperCase()==="VERIFIED").map(x=>text(x?.factId||x?.id,100)).filter(Boolean).sort(),inventory:list(state.inventory).filter(x=>(Number(x?.quantity)||1)>0).map(x=>[text(x?.id||x?.name,100),Math.max(0,Number(x?.quantity)||1)]).sort(),knownNpcs:list(registry.npcs).filter(x=>x?.known===true).map(x=>text(x?.id||x?.name,100)).sort(),knownLocations:list(registry.locations).filter(x=>x?.known===true).map(x=>text(x?.id||x?.name,100)).sort(),knownSideQuests:list(registry.sideQuests).filter(x=>x?.known===true&&x?.status!=="COMPLETED").map(x=>[text(x?.id||x?.title,100),text(x?.status,30),Number(x?.progress)||0]).sort(),level:Number(state.player?.level)||1,xp:Number(state.player?.xp)||0,discoveries:Number(state.discoveries)||0})}\n'''
    s=s[:idx]+block+s[idx:]
s=s.replace('function runtimeRecoveryFailed(world={}){let stagnant=0;for(const row of list(world.actions)){if(row?.beforeFingerprint&&row.beforeFingerprint===row.afterFingerprint)stagnant++;else stagnant=0;if(stagnant>=7)return true}return false}',
'function runtimeRecoveryFailed(world={}){let stagnant=0;for(const row of list(world.actions)){const before=row?.beforeProgressFingerprint||row?.beforeFingerprint,after=row?.afterProgressFingerprint||row?.afterFingerprint;if(before&&before===after)stagnant++;else stagnant=0;if(stagnant>=7)return true}return false}')
s=s.replace('if(row.beforeFingerprint&&row.beforeFingerprint===row.afterFingerprint)stagnant++;else stagnant=0;', 'const progressBefore=row.beforeProgressFingerprint||row.beforeFingerprint,progressAfter=row.afterProgressFingerprint||row.afterFingerprint;if(progressBefore&&progressBefore===progressAfter)stagnant++;else stagnant=0;')
s=s.replace('"3 consecutive turns produced the same state fingerprint; recovery should switch strategy."', '"3 consecutive turns produced no canonical quest/location/entity/fact progress; recovery should switch strategy."')
s=s.replace('"5 consecutive turns produced the same state fingerprint; recovery should switch target/action class."', '"5 consecutive turns produced no canonical progress; recovery should switch target/action class and request expansion."')
s=s.replace('"7 consecutive turns produced the same state fingerprint; forced recovery did not create progress."', '"7 consecutive turns produced no canonical progress; forced recovery did not create progress."')
save(path,s)

# 11) Provider-level queue: Agnes is serialized; gameplay tasks outrank deferred/quality work.
path='src/ai-settings.js'; s=load(path)
if 'PROVIDER_SCHEDULER_KEY' not in s:
    marker='const PLAYER_CRITICAL_TASKS=new Set(["action","scene","turn_state_fast","turn_state_deep"]);\n'
    block='''const PLAYER_CRITICAL_TASKS=new Set(["action","scene","turn_state_fast","turn_state_deep"]);\nconst PROVIDER_SCHEDULER_KEY="__ELYNDRA_PROVIDER_SCHEDULER__";\nconst PROVIDER_TASK_PRIORITY=Object.freeze({turn_state_deep:100,turn_state_fast:95,scene:90,action:85,npc:80,narration:75,turn_deferred:60,runtime_expansion:50,history_deepening:35,runtime_quality:20,quality:10,quality_repair:10,runtime_repair:10});\nfunction providerScheduler(provider){const root=globalThis[PROVIDER_SCHEDULER_KEY]??=(Object.create(null));return root[provider]??=( {active:0,queue:[],sequence:0} )}\nfunction dispatchProviderQueue(provider){const row=providerScheduler(provider),limit=provider==="agnes"?1:2;while(row.active<limit&&row.queue.length){row.queue.sort((a,b)=>b.priority-a.priority||a.sequence-b.sequence);const next=row.queue.shift();if(next.cancelled)continue;row.active++;next.cleanup?.();next.resolve({release:()=>{if(next.released)return;next.released=true;row.active=Math.max(0,row.active-1);dispatchProviderQueue(provider)}})}}\nfunction acquireProviderSlot(provider,task,parentSignals=[]){const row=providerScheduler(provider),priority=PROVIDER_TASK_PRIORITY[String(task||"").toLowerCase()]||40;return new Promise((resolve,reject)=>{const req={priority,sequence:++row.sequence,cancelled:false,released:false,resolve,reject,cleanup:null};const listeners=[];const cancel=()=>{if(req.cancelled)return;req.cancelled=true;row.queue=row.queue.filter(x=>x!==req);for(const [signal,fn] of listeners)signal.removeEventListener?.("abort",fn);reject(providerAbortError())};for(const signal of [...new Set(parentSignals.filter(Boolean))]){if(signal.aborted){cancel();return}const fn=()=>cancel();signal.addEventListener?.("abort",fn,{once:true});listeners.push([signal,fn])}req.cleanup=()=>{for(const [signal,fn] of listeners)signal.removeEventListener?.("abort",fn)};row.queue.push(req);dispatchProviderQueue(provider)})}\n'''
    if marker not in s: raise SystemExit('ai-settings player critical marker missing')
    s=s.replace(marker,block,1)
s=s.replace('const AI_TASK_TIMEOUT_FLOORS={future:70000};', 'const AI_TASK_TIMEOUT_FLOORS={future:70000,quality:70000,quality_repair:70000,runtime_quality:60000,runtime_repair:60000};')
old='''  const ctrl=new AbortController(),visibility=abortProviderWhenHidden(ctrl);\n  try{const call=s.provider==="gemini"?gemini:openAICompatible,pending=Promise.resolve().then(()=>call(s,{...args,signal:ctrl.signal}));const result=await hardProviderDeadline(pending,{controller:ctrl,timeoutMs,parentSignals});visibility.cleanup();const rate=rateLimitState(s.provider);'''
new='''  const ctrl=new AbortController(),visibility=abortProviderWhenHidden(ctrl);\n  try{const slot=await acquireProviderSlot(s.provider,args?.aiTask,parentSignals);let result;try{const call=s.provider==="gemini"?gemini:openAICompatible,pending=Promise.resolve().then(()=>call(s,{...args,signal:ctrl.signal}));result=await hardProviderDeadline(pending,{controller:ctrl,timeoutMs,parentSignals})}finally{slot.release()}visibility.cleanup();const rate=rateLimitState(s.provider);'''
if old not in s: raise SystemExit('ai-settings directChat call anchor missing')
s=s.replace(old,new,1)
save(path,s)

# 12) App: deferred TTL/context, inventory provenance scope, and actual canonical AutoTest progress.
path='app.js'; s=load(path)
s=s.replace('autotestStateFingerprint,autotestWorldSummary', 'autotestStateFingerprint,autotestProgressFingerprint,autotestWorldSummary')
s=s.replace('return {worldId,currentLocation:String(playerVisibleLocationName(state)||rawLocation||""),locationDescription:String(location?.description||""),presentNpcNames:present.map(n=>String(playerVisibleNpcName(state,n)||"")).filter(Boolean),allNpcNames:npcs.map(n=>String(n?.name||"")).filter(Boolean),knownLocations:locations.filter(x=>x?.known===true||x===location).map(x=>String(x?.name||"")).filter(Boolean),visibleEventTexts}',
'return {worldId,currentLocation:String(playerVisibleLocationName(state)||rawLocation||""),locationDescription:String(location?.description||""),presentNpcNames:present.map(n=>String(playerVisibleNpcName(state,n)||"")).filter(Boolean),allNpcNames:npcs.map(n=>String(n?.name||"")).filter(Boolean),knownLocations:locations.filter(x=>x?.known===true||x===location).map(x=>String(x?.name||"")).filter(Boolean),inventoryNames:(state.inventory||[]).filter(x=>(Number(x?.quantity)||1)>0).map(x=>String(x?.name||"")).filter(Boolean),visibleEventTexts}')
s=s.replace('sceneCheck=validateSceneProvenance(preview,scope);', 'sceneCheck=validateSceneProvenance(preview,{...scope,action});')
s=s.replace('checked=filterSuggestionProvenance(source,scope);', 'checked=filterSuggestionProvenance(source,{...scope,action});')
s=s.replace('const queued={...task,id:task.id||crypto.randomUUID?.()||Math.random().toString(36).slice(2),attempts:Number(task.attempts)||0,queuedAt:task.queuedAt||Date.now()};',
'''const queued={...task,id:task.id||crypto.randomUUID?.()||Math.random().toString(36).slice(2),attempts:Number(task.attempts)||0,queuedAt:task.queuedAt||Date.now(),originRevision:Number(task.originRevision??currentStateRevision(gameState))||0,originTurn:Number(task.originTurn??developerAutotest.turn)||0,originLocation:String(task.originLocation??gameState.player?.location??gameState.world?.state?.location??""),originTargetId:String(task.originTargetId??task.intent?.targetId??""),ttlRevisions:Math.max(1,Math.min(3,Number(task.ttlRevisions)||2))};''')
old=''' const task=deferredDirector.queue[0],state=gameState,sessionToken=captureStateSession(),worldId=gameState.world?.id,ctrl=new AbortController(),debugStarted=Date.now();\n deferredDirector.running=true;deferredDirector.controller=ctrl;'''
new=''' const task=deferredDirector.queue[0],state=gameState,sessionToken=captureStateSession(),worldId=gameState.world?.id,ctrl=new AbortController(),debugStarted=Date.now(),revisionAge=Math.max(0,currentStateRevision(state)-Math.max(0,Number(task.originRevision)||0)),locationChanged=Boolean(task.originLocation&&String(state.player?.location||state.world?.state?.location||"")!==String(task.originLocation));\n if(revisionAge>Math.max(1,Math.min(3,Number(task.ttlRevisions)||2))||locationChanged){deferredDirector.queue.shift();removePersistedDeferredTurn(task.id);state.events??=[];state.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"DEFERRED_TURN_DROPPED_STALE",visibility:"INTERNAL",action:task.action,originRevision:task.originRevision,currentRevision:currentStateRevision(state),revisionAge,locationChanged,day:state.world?.state?.day||1,at:Date.now()});recordDebug("DEFERRED_TURN_DROPPED_STALE",{action:task.action,originRevision:task.originRevision,currentRevision:currentStateRevision(state),revisionAge,locationChanged});if(deferredDirector.queue.length)scheduleDeferredDirector(deferredDirector.queue[0],350,{persistTask:false});return}\n deferredDirector.running=true;deferredDirector.controller=ctrl;'''
if old not in s: raise SystemExit('app deferred task anchor missing')
s=s.replace(old,new,1)
s=s.replace('plan=deferredPlanFrom(basePlan,currentStateRevision(state));', 'plan={...deferredPlanFrom(basePlan,Number(task.originRevision)||currentStateRevision(state)),ttlRevisions:Math.max(1,Math.min(3,Number(task.ttlRevisions)||2)),originTurn:Number(task.originTurn)||0,originLocation:String(task.originLocation||"")};')
s=s.replace('scheduleDeferredDirector({action:effective,roll,intent:assessment?.actionIntent,plan:syncPlan,queuedAt:Date.now()},1200);', 'scheduleDeferredDirector({action:effective,roll,intent:assessment?.actionIntent,plan:syncPlan,queuedAt:Date.now(),originRevision:currentStateRevision(actionState),originTurn:developerAutotest.turn||0,originLocation:String(actionState.player?.location||actionState.world?.state?.location||""),originTargetId:String(assessment?.actionIntent?.targetId||""),ttlRevisions:2},1200);')
s=s.replace('const beforeFingerprint=autotestStateFingerprint(gameState),turnStartedAt=Date.now(),row={worldIndex:i,turn,beforeFingerprint,afterFingerprint:"",decision:null,error:"",durationMs:0};', 'const beforeFingerprint=autotestStateFingerprint(gameState),beforeProgressFingerprint=autotestProgressFingerprint(gameState),turnStartedAt=Date.now(),row={worldIndex:i,turn,beforeFingerprint,afterFingerprint:"",beforeProgressFingerprint,afterProgressFingerprint:"",actualProgress:false,decision:null,error:"",durationMs:0};')
s=s.replace('row.afterFingerprint=autotestStateFingerprint(gameState);row.durationMs=Date.now()-turnStartedAt;result.actions.push(row);result.turns=turn;recentActions.push({action:decision.action||decision.combatAction||"",mode:decision.mode,kind:decision.kind||"",progression:decision.progression===true,targetId:decision.targetId||null,progressed:row.beforeFingerprint!==row.afterFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0});',
'row.afterFingerprint=autotestStateFingerprint(gameState);row.afterProgressFingerprint=autotestProgressFingerprint(gameState);row.actualProgress=row.beforeProgressFingerprint!==row.afterProgressFingerprint;row.durationMs=Date.now()-turnStartedAt;result.actions.push(row);result.turns=turn;recentActions.push({action:decision.action||decision.combatAction||"",mode:decision.mode,kind:decision.kind||"",progression:decision.progression===true,targetId:decision.targetId||null,progressed:row.actualProgress,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0});')
s=s.replace('stateChanged:row.beforeFingerprint!==row.afterFingerprint,action:', 'stateChanged:row.beforeFingerprint!==row.afterFingerprint,actualProgress:row.actualProgress,action:')
s=s.replace('row.error=e?.message||String(e);row.durationMs=Date.now()-turnStartedAt;row.afterFingerprint=autotestStateFingerprint(gameState);result.actions.push(row);result.turns=turn;recentActions.push({action:row.decision?.action||row.decision?.combatAction||"",mode:row.decision?.mode||"",kind:row.decision?.kind||"",progression:row.decision?.progression===true,targetId:row.decision?.targetId||null,progressed:row.beforeFingerprint!==row.afterFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0});',
'row.error=e?.message||String(e);row.durationMs=Date.now()-turnStartedAt;row.afterFingerprint=autotestStateFingerprint(gameState);row.afterProgressFingerprint=autotestProgressFingerprint(gameState);row.actualProgress=row.beforeProgressFingerprint!==row.afterProgressFingerprint;result.actions.push(row);result.turns=turn;recentActions.push({action:row.decision?.action||row.decision?.combatAction||"",mode:row.decision?.mode||"",kind:row.decision?.kind||"",progression:row.decision?.progression===true,targetId:row.decision?.targetId||null,progressed:row.actualProgress,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0});')
save(path,s)

# 13) Sidebar player + current-goal UI stability. Final overrides intentionally win over older generated rules.
append_once('styles.css','/* v0.59.11 sidebar HUD stability */',r'''/* v0.59.11 sidebar HUD stability */
#game .sidebar{gap:14px!important;min-width:0}
#game .player-summary,#game .quest-card{box-sizing:border-box!important;min-width:0!important;max-width:100%!important;overflow:hidden!important;flex:0 0 auto!important}
#game .player-summary{display:grid!important;grid-template-columns:46px minmax(0,1fr)!important;align-items:center!important;column-gap:12px!important;min-height:72px!important;padding:11px 12px!important}
#game .player-sigil{width:46px!important;height:46px!important;min-width:46px!important;flex:0 0 46px!important}
#game .player-summary>div:last-child{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto!important;align-items:center!important;gap:3px 8px!important;min-width:0!important}
#game .player-summary small{grid-column:1/-1!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#game .player-summary strong{grid-column:1!important;min-width:0!important;font-size:15px!important;line-height:1.3!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#game .player-summary #levelStat{grid-column:2!important;justify-self:end!important;white-space:nowrap!important;font-size:11px!important}
#game .quest-card{display:block!important;padding:13px 14px!important;min-height:86px!important}
#game .quest-card small{display:block!important;line-height:1.25!important;margin-bottom:7px!important}
#game .quest-card strong{display:block!important;min-width:0!important;margin:0 0 6px!important;font-size:15px!important;line-height:1.4!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important}
#game .quest-card p{display:block!important;min-width:0!important;margin:0!important;font-size:12px!important;line-height:1.55!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important}
@media(min-width:721px){#game .sidebar{display:flex!important;flex-direction:column!important;align-items:stretch!important;overflow-y:auto!important;overflow-x:hidden!important}#game .player-summary,#game .quest-card{position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;width:100%!important}}
@media(max-width:720px){#game .player-summary{grid-template-columns:42px minmax(0,1fr)!important;min-height:64px!important}#game .player-sigil{width:42px!important;height:42px!important;min-width:42px!important}#game .quest-card{min-height:0!important;margin-top:8px!important;padding:12px 13px!important}#game .quest-card strong{font-size:14px!important}#game .quest-card p{font-size:12px!important}}
''')

# 14) Release v0.59.11 and cache-propagate every changed module only.
rep('src/version.js','APP_VERSION="0.59.10"','APP_VERSION="0.59.11"')
package=json.loads(load('package.json'));package['version']='0.59.11';save('package.json',json.dumps(package,ensure_ascii=False,indent=2)+'\n')
changed_modules=['origin-prompts.js','seed-contract.js','ai-client.js','origin-runtime.js','world-registry.js','contextual-actions.js','scene-provenance.js','state-sync.js','ai-runtime-contracts.js','npc-conversation.js','ai-autotest.js','ai-settings.js']
for file in [Path('app.js'),*Path('src').glob('*.js')]:
    text=file.read_text(encoding='utf-8');before=text
    for module in changed_modules:
        text=re.sub(r'(["\'](?:\.\.?/)?(?:src/)?'+re.escape(module)+r')\?v=\d+(["\'])',r'\1?v=59011\2',text)
    if text!=before:file.write_text(text,encoding='utf-8')
index=load('index.html');index=re.sub(r'(styles\.css|creator\.css|world-surfaces\.css|app\.js)\?v=\d+',lambda m:m.group(1)+'?v=59011',index);save('index.html',index)

# Current release tests only; preserve historical v0.59.10 behavior tests.
for test in ['test/version-ui.test.js','test/version-0551-release.test.js','test/v05901-i18n-coverage.test.js']:
    if Path(test).exists():
        t=load(test).replace('0.59.10','0.59.11').replace('59010','59011');save(test,t)

# Regression coverage for this patch.
Path('test/v05911-origin-runtime-hardening.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {originPromptContract,ORIGIN_PROMPTS} from "../src/origin-prompts.js";
import {createWorldCreationDraft,compileWorldCreation,applyWorldCreationState} from "../src/world-creation.js";
import {newGame} from "../src/world-engine.js";
import {applyOriginRuntime} from "../src/origin-runtime.js";
import {canonizeGeneration} from "../src/world-registry.js";
import {evaluateSuggestionRequirements} from "../src/contextual-actions.js";
import {validateSceneProvenance} from "../src/scene-provenance.js";
import {autotestProgressFingerprint} from "../src/ai-autotest.js";

test("v0.59.11 defines a distinct prompt contract for every origin",()=>{assert.deepEqual(Object.keys(ORIGIN_PROMPTS).sort(),["amnesia","crossing","custom","native","possession","reincarnation","summoned"]);for(const id of Object.keys(ORIGIN_PROMPTS)){const row=originPromptContract({type:id});assert.equal(row.id,id);assert.ok(row.prompt.length>120)}assert.match(originPromptContract({type:"reincarnation"}).prompt,/distant geography|secret history|hidden canon/)});

test("reincarnation only receives local public facts and hides remote registry",()=>{const seed=compileWorldCreation(createWorldCreationDraft({originType:"reincarnation",playerRole:"ordinary",worldStyle:"王道奇幻",masterSeed:"v05911-reincarnation"})),s=newGame(seed);applyWorldCreationState(s,seed);s.world.bible={...(s.world.bible||{}),startingRegion:"本地區",startingSettlement:"本地鎮",startingLocation:"本地家"};s.world.canon.facts=[{id:"LOCAL",text:"本地家位於本地鎮。",visibility:"public"},{id:"REMOTE",text:"遙遠帝國的皇室秘密廣為流傳。",visibility:"public"}];canonizeGeneration(s,{locations:[{name:"本地家",description:"家",region:"本地區",known:true},{name:"遙遠王都",description:"王都",region:"遠方",known:true}],npcs:[{name:"鄰居",role:"居民",locationName:"本地家",known:true},{name:"遠方國王",role:"國王",locationName:"遙遠王都",known:true}]});s.player.location="本地家";s.world.state.location="本地家";applyOriginRuntime(s,{phase:"POST_CANON"});assert.equal(s.player.calendarKnown,false);assert.ok(s.knowledge.some(x=>x.factId==="LOCAL"));assert.ok(!s.knowledge.some(x=>x.factId==="REMOTE"));assert.equal(s.world.registry.locations.find(x=>x.name==="遙遠王都").known,false);assert.equal(s.world.registry.npcs.find(x=>x.name==="遠方國王").known,false)});

test("inventory hallucinations fail suggestion and scene provenance",()=>{const state={inventory:[{id:"I1",name:"黃銅齒輪",quantity:1}],player:{},world:{registry:{npcs:[],locations:[]}}};const req=evaluateSuggestionRequirements(state,{label:"展示物品",action:"拿出礦區配給券與黃銅齒輪給對方看",kind:"GENERAL",requirementsSatisfied:true});assert.equal(req.ok,false);assert.ok(req.reasons.some(x=>x.includes("礦區配給券")));const scene=validateSceneProvenance({narrative:"你帶出礦區配給券與無標玻璃瓶，將兩者收進口袋。",sceneTitle:"檢查結果"},{inventoryNames:["黃銅齒輪"],action:"取走黃銅齒輪",currentLocation:"礦道",knownLocations:["礦道"],presentNpcNames:[],allNpcNames:[],visibleEventTexts:[]});assert.equal(scene.valid,false);assert.ok(scene.issues.some(x=>x.type==="SCENE_ITEM_ACQUISITION_UNGROUNDED"))});

test("canonical progress fingerprint ignores clock/event churn",()=>{const base={player:{location:"A",level:1,xp:0},world:{state:{clock:{totalMinutes:10}},registry:{npcs:[],locations:[{id:"A",name:"A",known:true}],sideQuests:[]}},quests:{main:{stage:1,status:"ACTIVE",objectives:["x"]}},events:[{id:"e1"}],knowledge:[],inventory:[],discoveries:0};const before=autotestProgressFingerprint(base),after=autotestProgressFingerprint({...base,world:{...base.world,state:{clock:{totalMinutes:80}}},events:[...base.events,{id:"e2"}]});assert.equal(before,after)});

test("v0.59.11 sidebar HUD has final player and current-goal stability overrides",async()=>{const css=await readFile(new URL("../styles.css",import.meta.url),"utf8");assert.match(css,/v0\.59\.11 sidebar HUD stability/);assert.match(css,/#game \.player-summary\{display:grid!important/);assert.match(css,/#game \.quest-card strong\{display:block!important/)});
''',encoding='utf-8')

print('v0.59.11 patch staged')
