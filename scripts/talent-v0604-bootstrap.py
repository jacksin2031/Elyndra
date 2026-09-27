from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding="utf-8")
def write(path,text): (ROOT/path).write_text(text,encoding="utf-8")
def rep(path,old,new,count=None):
    text=read(path)
    if old not in text: raise SystemExit(f"missing pattern in {path}: {old[:120]!r}")
    if count is None: text=text.replace(old,new)
    else: text=text.replace(old,new,count)
    write(path,text)

# Talent definitions: these four are rules, not permanent +1 modifiers.
rep("src/talent-engine.js",'{id:"TAL-INTEL-2",path:"INTEL",tier:2,name:"讀懂弦外之音",kind:"SOCIAL",bonus:1,description:"長期與不同人物周旋後，更容易察覺迴避、保留與真正底線。"}',
    '{id:"TAL-INTEL-2",path:"INTEL",tier:2,name:"讀懂弦外之音",kind:"SOCIAL",bonus:0,rule:{type:"INFORMATION",trigger:"NPC_INSIGHT",scope:"NPC_SCENE",effect:"EVIDENCE_BOUNDED_INTENT_CLUE"},description:"每個 NPC 場景一次，可主動讀取一條只基於 Engine 已知態度、承諾與行動傾向的弦外線索；不會揭露隱藏 Canon。"}')
rep("src/talent-engine.js",'{id:"TAL-SURVIVAL-3",path:"SURVIVAL",tier:3,name:"追跡者視野",kind:"OBSERVE",bonus:1,description:"會把地面、路標、人流與環境變化當成同一條路線線索閱讀。"}',
    '{id:"TAL-SURVIVAL-3",path:"SURVIVAL",tier:3,name:"追跡者視野",kind:"OBSERVE",bonus:0,rule:{type:"MITIGATION",trigger:"TRAVEL_FAILURE",scope:"SCENE",effect:"DANGER_TO_TIME"},description:"每個場景一次，旅行失敗時可把直接危險／失位代價轉成額外時間；失敗本身不會被改寫成成功。"}')
rep("src/talent-engine.js",'{id:"TAL-VANGUARD-2",path:"VANGUARD",tier:2,name:"迎擊姿態",kind:"RISKY",bonus:1,description:"面對明確威脅時不急於退讓，能更穩定地把壓力正面接住。"}',
    '{id:"TAL-VANGUARD-2",path:"VANGUARD",tier:2,name:"迎擊姿態",kind:"RISKY",bonus:0,rule:{type:"REACTION",trigger:"COMPANION_HARM",scope:"ROUND",effect:"INTERCEPT_REDUCE_SEVERITY"},description:"每個戰鬥回合一次，同行者將受傷時可迎上攻勢：部分傷害轉到自己，並把剩餘衝擊降低一階。"}')
rep("src/talent-engine.js",'{id:"TAL-ADAPT-2",path:"ADAPT",tier:2,name:"就地取材",kind:"GENERAL",bonus:1,description:"在工具、情報或時間不足時，仍能用手上已有資源拼出可行方案。"}',
    '{id:"TAL-ADAPT-2",path:"ADAPT",tier:2,name:"就地取材",kind:"GENERAL",bonus:0,rule:{type:"PERMISSION",trigger:"IMPROVISE_TOOL",scope:"SCENE",effect:"ORDINARY_ENVIRONMENT_AS_TOOL"},description:"每個場景一次，明確就地取材時可把普通環境物件視為本次行動的合適臨時工具。"}')
rep("src/talent-engine.js",'owned:snap.owned.map(x=>({id:x.id,name:x.name,path:x.path,tier:x.tier,kind:x.kind,bonus:x.bonus}))',
    'owned:snap.owned.map(x=>({id:x.id,name:x.name,path:x.path,tier:x.tier,kind:x.kind,bonus:x.bonus,rule:x.rule?{...x.rule}:null}))')
rep("src/talent-engine.js",'available:snap.available.filter(x=>x.available).slice(0,5).map(x=>({id:x.id,name:x.name,path:x.path,tier:x.tier,kind:x.kind,cost:x.cost}))',
    'available:snap.available.filter(x=>x.available).slice(0,5).map(x=>({id:x.id,name:x.name,path:x.path,tier:x.tier,kind:x.kind,cost:x.cost,rule:x.rule?{...x.rule}:null}))')

# check-engine must fetch the v0.60.4 talent module rather than stale browser cache.
rep("src/check-engine.js",'from "./talent-engine.js?v=57025"','from "./talent-engine.js?v=60004"')

# Game action pipeline: Engine applies permission/mitigation around the normal check.
rep("src/game-engine.js",'import {buildActionCheck,trainActionSkill,ensureCheckProfile} from "./check-engine.js?v=57025";',
    'import {buildActionCheck,trainActionSkill,ensureCheckProfile} from "./check-engine.js?v=60004";')
rep("src/game-engine.js",'import {resolveTalentAction} from "./talent-engine.js?v=57025";',
    'import {resolveTalentAction} from "./talent-engine.js?v=60004";\nimport {buildResolutionOutcome} from "./resolution-engine.js?v=60000";\nimport {mitigateTravelFailureWithTalent,useImprovisedToolTalent} from "./talent-rules.js?v=60004";')
old=''' const check=buildActionCheck(state,label,profile),roll=d20(check.dc,check.bonus);Object.assign(roll,{profile:{kind:check.kind,attribute:check.attribute,skill:check.skill,skillLabel:check.skillLabel},modifiers:check.modifiers,baseDC:check.baseDC,difficulty:check.difficulty});
 const training=trainActionSkill(state,check.kind,roll);if(training.rankUp)roll.skillUp=training;
 const npcRelationship=applyLocalNpcRelationshipOutcome(state,npcInteraction,roll,profile.kind,label);
 advanceTime(state,profile.minutes);
 const economy=resolveEconomyAction(state,label,roll),paidLodging=/住宿|旅店|投宿|lodging|inn|stay overnight/i.test(label),restGranted=profile.rest===true&&roll.success&&(!paidLodging||economy?.ok===true);
 const survival=tickSurvival(state,profile.minutes,{kind:profile.kind,rest:restGranted});if(restGranted)recoverMagic(state,Math.max(8,Math.round(profile.minutes/20)));
 const culture=applyCultureAction(state,label,roll),magic=resolveMagicAction(state,label,roll),talent=resolveTalentAction(state,label),dungeon=exploreDungeon(state,label,roll);
 const text=localNarrative(state,label,roll,profile,{npcRelationship});
 state.narrative=text;
 state.events.push({id:id(),type:"PLAYER_ACTION",visibility:"PLAYER_KNOWN",action:"free",customText:label,originalAction:originalLabel,actionAssessment:assessment?{verdict:assessment.verdict,kind:assessment.kind,reason:assessment.reason,confidence:assessment.confidence}:null,actionKind:profile.kind,roll,day:state.world.state.day,time:`${String(state.world.state.clock.hour).padStart(2,"0")}:${String(state.world.state.clock.minute).padStart(2,"0")}`,minutes:profile.minutes,at:Date.now()});
 const worldEvent=tickWorld(state);const questProgress=evaluateQuestState(state);tickMainQuest(state);
 return {roll,text,minutes:profile.minutes,worldEvent,actionKind:profile.kind,check,training,ruleEffects:{survival,culture,economy,magic,talent,dungeon,questProgress,npcInteraction,npcRelationship,engineFeasibility}}
'''
new=''' const check=buildActionCheck(state,label,profile),improvised=useImprovisedToolTalent(state,{label});if(improvised.applied){check.modifiers.talentRule=Number(improvised.checkBonus)||1;check.bonus=Math.max(-6,Math.min(10,Number(check.bonus||0)+check.modifiers.talentRule))}
 const roll=d20(check.dc,check.bonus);Object.assign(roll,{profile:{kind:check.kind,attribute:check.attribute,skill:check.skill,skillLabel:check.skillLabel},modifiers:check.modifiers,baseDC:check.baseDC,difficulty:check.difficulty});
 const actionIntent={...(assessment?.actionIntent||{}),kind:profile.kind,raw:label},resolution=buildResolutionOutcome({roll,intent:actionIntent,snapshot:state}),travelMitigation=profile.kind==="TRAVEL"&&!resolution.goalAchieved?mitigateTravelFailureWithTalent(state,{baseMinutes:profile.minutes,resolution}):{applied:false},effectiveMinutes=profile.minutes+(travelMitigation.applied?Number(travelMitigation.extraMinutes)||0:0);
 if(travelMitigation.applied){resolution.costs=[...(resolution.costs||[]),{type:"TIME",severity:"MODERATE",source:"TALENT_RULE",committed:true,minutes:travelMitigation.extraMinutes}];resolution.talentRule={talentId:"TAL-SURVIVAL-3",effect:"DANGER_TO_TIME"}}
 const training=trainActionSkill(state,check.kind,roll);if(training.rankUp)roll.skillUp=training;
 const npcRelationship=applyLocalNpcRelationshipOutcome(state,npcInteraction,roll,profile.kind,label);
 advanceTime(state,effectiveMinutes);
 const economy=resolveEconomyAction(state,label,roll),paidLodging=/住宿|旅店|投宿|lodging|inn|stay overnight/i.test(label),restGranted=profile.rest===true&&roll.success&&(!paidLodging||economy?.ok===true);
 const survival=tickSurvival(state,effectiveMinutes,{kind:profile.kind,rest:restGranted});if(restGranted)recoverMagic(state,Math.max(8,Math.round(effectiveMinutes/20)));
 const culture=applyCultureAction(state,label,roll),magic=resolveMagicAction(state,label,roll),talent=resolveTalentAction(state,label),dungeon=exploreDungeon(state,label,roll);
 const baseText=localNarrative(state,label,roll,profile,{npcRelationship}),text=[baseText,improvised.applied?improvised.summary:"",travelMitigation.applied?travelMitigation.summary:""].filter(Boolean).join("\\n");
 state.narrative=text;
 state.events.push({id:id(),type:"PLAYER_ACTION",visibility:"PLAYER_KNOWN",action:"free",customText:label,originalAction:originalLabel,actionAssessment:assessment?{verdict:assessment.verdict,kind:assessment.kind,reason:assessment.reason,confidence:assessment.confidence}:null,actionKind:profile.kind,roll,resolutionTier:resolution.tier,day:state.world.state.day,time:`${String(state.world.state.clock.hour).padStart(2,"0")}:${String(state.world.state.clock.minute).padStart(2,"0")}`,minutes:effectiveMinutes,at:Date.now()});
 const worldEvent=tickWorld(state);const questProgress=evaluateQuestState(state);tickMainQuest(state);
 return {roll,resolution,text,minutes:effectiveMinutes,worldEvent,actionKind:profile.kind,check,training,ruleEffects:{survival,culture,economy,magic,talent,talentRule:{improvised,travelMitigation},dungeon,questProgress,npcInteraction,npcRelationship,engineFeasibility}}
'''
rep("src/game-engine.js",old,new)

# Combat reaction: intercept companion harm before NPC Engine applies injury/downed effects.
rep("src/combat-engine.js",'import {buildActionCheck,trainActionSkill} from "./check-engine.js?v=57025";','import {buildActionCheck,trainActionSkill} from "./check-engine.js?v=60004";')
rep("src/combat-engine.js",'import {grantTalentPoint,ensureTalents} from "./talent-engine.js?v=57025";','import {grantTalentPoint,ensureTalents} from "./talent-engine.js?v=60004";\nimport {interceptCompanionHarmWithTalent} from "./talent-rules.js?v=60004";')
old=''' const turns=enemyResponses(state,reduction+support.guard),enemyDamage=turns.reduce((n,x)=>n+(Number(x.damage)||0),0),statuses=turns.map(x=>x.status).filter(Boolean);let companionHit=null;if(enemyDamage>=8&&support.events.length)companionHit=damageCompanion(state,Math.max(1,Math.floor(enemyDamage/3)));
 advanceEncounterRound(state.combat);'''
new=''' const turns=enemyResponses(state,reduction+support.guard),enemyDamage=turns.reduce((n,x)=>n+(Number(x.damage)||0),0),statuses=turns.map(x=>x.status).filter(Boolean);let companionHit=null,talentReaction=null;if(enemyDamage>=8&&support.events.length){const intended=Math.max(1,Math.floor(enemyDamage/3));talentReaction=interceptCompanionHarmWithTalent(state,{damage:intended});if(talentReaction.applied){state.player.hp=Math.max(0,state.player.hp-(Number(talentReaction.redirectedToPlayer)||0));if(talentReaction.companionDamage>0)companionHit=damageCompanion(state,talentReaction.companionDamage);summary+=(summary?" ":"")+talentReaction.summary}else companionHit=damageCompanion(state,intended)}
 advanceEncounterRound(state.combat);'''
rep("src/combat-engine.js",old,new)
rep("src/combat-engine.js",'return {...early,enemyDamage,enemyTurns:turns,status:statuses[0]||null,statuses,companionHit,defeated:state.player.hp===0,summary,encounter:encounterSnapshot(state)}',
    'return {...early,enemyDamage,enemyTurns:turns,status:statuses[0]||null,statuses,companionHit,talentReaction,defeated:state.player.hp===0,summary,encounter:encounterSnapshot(state)}')

# NPC insight is planned before narration and consumed only when the conversation turn commits.
rep("src/npc-agency-engine.js",'import {buildActionCheck,trainActionSkill} from "./check-engine.js?v=57025";','import {buildActionCheck,trainActionSkill} from "./check-engine.js?v=60004";')
rep("src/npc-agency-engine.js",'import {ensureNpcCognition,npcCommitmentSnapshot,npcPlannerSnapshot,npcRelationshipSnapshot} from "./npc-cognition.js?v=57025";',
    'import {ensureNpcCognition,npcCommitmentSnapshot,npcPlannerSnapshot,npcRelationshipSnapshot} from "./npc-cognition.js?v=57025";\nimport {commitNpcInsightTalent,planNpcInsightTalent} from "./talent-rules.js?v=60004";')
rep("src/npc-agency-engine.js",'const speechAct=classifyNpcSpeechAct(message),agency=npcAgencySnapshot(state,npc);if(!speechAct.substantive)return {version:2,requiresResolution:false,speechAct,agency,aiContract:{authority:"ENGINE",mode:"CHAT",directive:"ROLEPLAY_ONLY_NO_STATE_CONCESSION",disposition:agency.disposition,policy:agency.policy,mustFollow:true}};',
    'const speechAct=classifyNpcSpeechAct(message),agency=npcAgencySnapshot(state,npc),talentInsight=planNpcInsightTalent(state,{npcId:npc?.id||npc?.name||"npc",message,agency});if(talentInsight)return {version:3,requiresResolution:false,requiresCommit:true,speechAct,agency,talentInsight,aiContract:{authority:"ENGINE",mode:"CHAT",directive:"ROLEPLAY_WITH_ENGINE_APPROVED_INSIGHT_ONLY",approvedInsight:talentInsight.clue,insightPolicy:talentInsight.evidencePolicy,disposition:agency.disposition,policy:agency.policy,mustFollow:true}};if(!speechAct.substantive)return {version:3,requiresResolution:false,speechAct,agency,aiContract:{authority:"ENGINE",mode:"CHAT",directive:"ROLEPLAY_ONLY_NO_STATE_CONCESSION",disposition:agency.disposition,policy:agency.policy,mustFollow:true}};')
rep("src/npc-agency-engine.js",'return {version:2,requiresResolution:true,speechAct,agency,intent,dc,roll,resolution,expectedOutcome:social.outcome,expectedSummary:social.summary,aiContract:',
    'return {version:3,requiresResolution:true,speechAct,agency,intent,dc,roll,resolution,expectedOutcome:social.outcome,expectedSummary:social.summary,aiContract:')
rep("src/npc-agency-engine.js",'if(!plan?.requiresResolution)return {committed:false,reason:"CHAT_ONLY",agency:npcAgencySnapshot(state,npc)};const social=',
    'if(plan?.talentInsight?.pendingUse){const talentInsight=commitNpcInsightTalent(state,plan.talentInsight);return {committed:talentInsight.applied,talentInsight,agency:npcAgencySnapshot(state,npc)}}if(!plan?.requiresResolution)return {committed:false,reason:"CHAT_ONLY",agency:npcAgencySnapshot(state,npc)};const social=')

rep("src/npc-conversation.js",'from "./npc-agency-engine.js?v=60003"','from "./npc-agency-engine.js?v=60004"')
rep("src/npc-conversation.js",'const languageContext=npcLanguageContext(state,npc),agencyResult=options.socialPlan?.requiresResolution?commitNpcConversationAction(state,npc,options.socialPlan):null;recordDebug("NPC_TALK_RESOLUTION",{languageContext,socialOutcome:agencyResult?.social?.outcome||null});',
    'const languageContext=npcLanguageContext(state,npc),agencyResult=(options.socialPlan?.requiresResolution||options.socialPlan?.requiresCommit)?commitNpcConversationAction(state,npc,options.socialPlan):null;recordDebug("NPC_TALK_RESOLUTION",{languageContext,socialOutcome:agencyResult?.social?.outcome||null,talentInsight:agencyResult?.talentInsight?.applied===true});')
rep("src/npc-conversation.js",'socialOutcome:agencyResult?.social?.outcome||null,questInteractions:',
    'socialOutcome:agencyResult?.social?.outcome||null,talentInsightUsed:agencyResult?.talentInsight?.applied===true,questInteractions:')

# Narrators may voice only the explicitly approved insight, never infer a deeper secret.
rep("src/ai-client.js",'CHAT/ROLEPLAY_ONLY_NO_STATE_CONCESSION 只可自然交談，不可自行創造承諾、物品轉移、任務完成或關係數值變化。不要向玩家說出 authority、directive 或內部數值。',
    'CHAT/ROLEPLAY_ONLY_NO_STATE_CONCESSION 只可自然交談，不可自行創造承諾、物品轉移、任務完成或關係數值變化。若 directive=ROLEPLAY_WITH_ENGINE_APPROVED_INSIGHT_ONLY，只可自然呈現 authority.approvedInsight 這一條 Engine 批准的可觀察線索，不得延伸成更深秘密、新 Canon 或額外事實。不要向玩家說出 authority、directive 或內部數值。')
rep("api/npc.js",'CHAT 模式不可自行創造承諾、物品轉移、任務完成或關係數值變化。不要把 authority、directive 或內部數值說給玩家。',
    'CHAT 模式不可自行創造承諾、物品轉移、任務完成或關係數值變化。若 directive=ROLEPLAY_WITH_ENGINE_APPROVED_INSIGHT_ONLY，只能自然表現 authority.approvedInsight 指定的可觀察線索，不得延伸成更深秘密、新 Canon 或額外事實。不要把 authority、directive 或內部數值說給玩家。')

# Browser entrypoint cache tokens for every changed browser module.
for path,old,new in [
 ("app.js","./src/version.js?v=60003","./src/version.js?v=60004"),
 ("app.js","./src/ai-client.js?v=60003","./src/ai-client.js?v=60004"),
 ("app.js","./src/game-engine.js?v=59014","./src/game-engine.js?v=60004"),
 ("app.js","./src/npc-conversation.js?v=60003","./src/npc-conversation.js?v=60004"),
 ("app.js","./src/npc-agency-engine.js?v=60003","./src/npc-agency-engine.js?v=60004"),
 ("app.js","./src/combat-engine.js?v=60002","./src/combat-engine.js?v=60004"),
 ("app.js","./src/check-engine.js?v=57025","./src/check-engine.js?v=60004"),
 ("app.js","./src/talent-engine.js?v=57025","./src/talent-engine.js?v=60004"),
]: rep(path,old,new)
rep("index.html",'"./src/combat-engine.js?v=59014":"./src/combat-engine.js?v=60002"','"./src/combat-engine.js?v=59014":"./src/combat-engine.js?v=60004"')
rep("index.html",'"./src/ai-client.js?v=59014":"./src/ai-client.js?v=60003"','"./src/ai-client.js?v=59014":"./src/ai-client.js?v=60004"')
rep("index.html",'"./src/npc-conversation.js?v=59014":"./src/npc-conversation.js?v=60003"','"./src/npc-conversation.js?v=59014":"./src/npc-conversation.js?v=60004"')
rep("index.html",'</script></head>',' ,"./src/check-engine.js?v=57025":"./src/check-engine.js?v=60004","./src/talent-engine.js?v=57025":"./src/talent-engine.js?v=60004","./src/npc-agency-engine.js?v=60003":"./src/npc-agency-engine.js?v=60004"}</script></head>')
# Repair the importmap brace insertion above: replace the original final braces plus inserted prefix into valid JSON.
text=read("index.html")
text=text.replace('"./src/ai-runtime-contracts.js?v=59000":"./src/ai-runtime-contracts.js?v=60000"}} ,"./src/check-engine.js?v=57025"', '"./src/ai-runtime-contracts.js?v=59000":"./src/ai-runtime-contracts.js?v=60000","./src/check-engine.js?v=57025"')
write("index.html",text)

# Canonical release version.
pkg=json.loads(read("package.json"));pkg["version"]="0.60.4";write("package.json",json.dumps(pkg,ensure_ascii=False,indent=2)+"\n")
write("src/version.js",'export const APP_VERSION="0.60.4";\n')

# Release/UI contracts move to the canonical 0.60.4 cache token.
for path in ["test/version-0551-release.test.js","test/version-ui.test.js"]:
    text=read(path).replace("0.60.3","0.60.4").replace("0\\.60\\.3","0\\.60\\.4").replace("60003","60004")
    if path.endswith("version-0551-release.test.js") and '"60004"].includes' in text and '"60003","60004"' not in text:
        text=text.replace('"60002","60004"].includes','"60002","60003","60004"].includes')
    write(path,text)

# Static integration assertions: these protect wiring, not just helper behavior.
test_path="test/talent-rules-v0604.test.js"
text=read(test_path)
if "Talent 2.0 is wired into game, combat and NPC conversation authority" not in text:
    text += '''\nimport {readFile} from "node:fs/promises";\n\ntest("Talent 2.0 is wired into game, combat and NPC conversation authority",async()=>{\n const [game,combat,agency,conversation,client,pages]=await Promise.all([\n  readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/combat-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/npc-agency-engine.js",import.meta.url),"utf8"),readFile(new URL("../src/npc-conversation.js",import.meta.url),"utf8"),readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),readFile(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8")\n ]);\n assert.match(game,/useImprovisedToolTalent/);assert.match(game,/mitigateTravelFailureWithTalent/);assert.match(game,/buildResolutionOutcome/);\n assert.match(combat,/interceptCompanionHarmWithTalent/);assert.match(agency,/ROLEPLAY_WITH_ENGINE_APPROVED_INSIGHT_ONLY/);assert.match(conversation,/requiresCommit/);assert.match(client,/approvedInsight/);\n assert.match(pages,/talent-rules-v0604\\.test\\.js/);\n});\n'''
    write(test_path,text)
