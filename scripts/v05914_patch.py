from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def rep(s,old,new,label):
    if old not in s: raise SystemExit(f'missing pattern: {label}')
    return s.replace(old,new)

# Release/cache epoch.
for p in list(ROOT.rglob('*.js'))+list(ROOT.rglob('*.html'))+list(ROOT.rglob('*.json')):
    if '.git' in p.parts or 'node_modules' in p.parts: continue
    s=p.read_text(encoding='utf-8')
    s=s.replace('0.59.13','0.59.14').replace('59013','59014')
    p.write_text(s,encoding='utf-8')

# index.html: move player identity from sidebar into the narration HUD and bump UI stylesheet caches.
p='index.html'; s=read(p)
s=s.replace('styles.css?v=59010','styles.css?v=59014').replace('world-surfaces.css?v=59011','world-surfaces.css?v=59014')
s=s.replace('./src/origin-runtime.js?v=59011','./src/origin-runtime.js?v=59014')
player='<div class="player-summary"><div id="playerInitial" class="player-sigil">?</div><div><small>旅人</small><strong id="playerNameStat">無名者</strong><span id="levelStat">Lv.1</span></div></div>\n'
if s.count(player)!=1: raise SystemExit(f'player summary count={s.count(player)}')
s=s.replace(player,'',1)
needle='<div class="narrative-panel" aria-live="polite"><div id="activityStatus" class="activity-status" hidden><span class="loading-sigil" aria-hidden="true"></span><strong id="activityLabel"></strong><span id="activityElapsed" aria-hidden="true"></span></div><p id="narrative" tabindex="0"></p></div>'
replacement='<div class="narrative-panel" aria-live="polite"><div id="activityStatus" class="activity-status" hidden><span class="loading-sigil" aria-hidden="true"></span><strong id="activityLabel"></strong><span id="activityElapsed" aria-hidden="true"></span></div><p id="narrative" tabindex="0"></p><div class="player-summary narrative-player-summary"><div id="playerInitial" class="player-sigil">?</div><div><small>旅人</small><strong id="playerNameStat">無名者</strong><span id="levelStat">Lv.1</span></div></div></div>'
s=rep(s,needle,replacement,'narrative player HUD')
write(p,s)

# world-surfaces.css: narration-right identity card layout. Existing containment rules remain valid.
p='world-surfaces.css'; s=read(p)
s += '''\n/* v0.59.14 narration HUD: player identity belongs beside the narration, not in the left sidebar. */\n#game .narrative-panel{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(150px,190px)!important;gap:12px!important;align-items:end!important}\n#game .narrative-panel #activityStatus{grid-column:1/-1!important}\n#game .narrative-panel #narrative{grid-column:1!important;min-width:0!important;margin:0!important}\n#game .narrative-player-summary{grid-column:2!important;align-self:end!important;justify-self:stretch!important;margin:0!important;min-height:58px!important;padding:10px 12px!important;display:flex!important;align-items:center!important;gap:10px!important;border:1px solid rgba(215,179,106,.22)!important;border-radius:12px!important;background-color:rgba(7,12,21,.92)!important;box-shadow:0 8px 28px rgba(0,0,0,.24)!important}\n#game .narrative-player-summary>div:last-child{display:grid!important;gap:2px!important;min-width:0!important}\n#game .narrative-player-summary small{font-size:10px!important;color:var(--muted)!important}\n#game .narrative-player-summary strong{font-size:13px!important}\n#game .narrative-player-summary #levelStat{font-size:11px!important;color:var(--gold)!important}\n@media(max-width:720px){\n #game .narrative-panel{grid-template-columns:1fr!important}\n #game .narrative-player-summary{grid-column:1!important;justify-self:end!important;width:min(190px,72%)!important}\n}\n'''
write(p,s)

# origin-runtime: reincarnation gets only local-evidence common knowledge; no automatic global calendar grant.
p='src/origin-runtime.js'; s=read(p)
s=rep(s,'PARTIAL_LOCAL:{factLimit:3,worldName:true,calendar:true,spokenCommon:true,readCommon:true,identitySignal:"LOCAL_OR_UNKNOWN",equipmentPolicy:"WORLD_LOCAL_BASIC",spawnPolicy:"LOCAL_LIFE",openingMode:"PARTIAL_LOCAL"}',
      'PARTIAL_LOCAL:{factLimit:3,worldName:true,calendar:false,spokenCommon:true,readCommon:true,identitySignal:"LOCAL_OR_UNKNOWN",equipmentPolicy:"WORLD_LOCAL_BASIC",spawnPolicy:"LOCAL_LIFE",openingMode:"PARTIAL_LOCAL"}','partial local calendar')
old='''function rankFacts(state,rows){\n const keys=[state.world?.bible?.startingLocation,state.world?.bible?.startingSettlement,state.world?.bible?.startingRegion].map(x=>clean(x,120)).filter(Boolean);\n return [...rows].sort((a,b)=>{\n  const as=keys.some(k=>String(a.text).includes(k))?1:0,bs=keys.some(k=>String(b.text).includes(k))?1:0;\n  if(as!==bs)return bs-as;return String(a.id).localeCompare(String(b.id))\n })\n}\n'''
new='''function originLocalKeys(state){return [state.world?.bible?.startingLocation,state.world?.bible?.startingSettlement,state.world?.bible?.startingRegion,state.player?.location].map(x=>clean(x,120)).filter(Boolean)}\nfunction localPublicFacts(state){const keys=originLocalKeys(state);if(!keys.length)return [];return publicFacts(state).filter(f=>keys.some(k=>String(f?.text||"").includes(k)||String(f?.title||"").includes(k)))}\nfunction rankFacts(state,rows){\n const keys=originLocalKeys(state);\n return [...rows].sort((a,b)=>{\n  const as=keys.some(k=>String(a.text).includes(k))?1:0,bs=keys.some(k=>String(b.text).includes(k))?1:0;\n  if(as!==bs)return bs-as;return String(a.id).localeCompare(String(b.id))\n })\n}\n'''
s=rep(s,old,new,'origin local fact helpers')
s=rep(s,'const rows=rankFacts(state,publicFacts(state)).slice(0,Math.max(0,rules.factLimit)),granted=[];',
      'const factSource=rules.knowledgePolicy==="PARTIAL_LOCAL"?localPublicFacts(state):publicFacts(state),rows=rankFacts(state,factSource).slice(0,Math.max(0,rules.factLimit)),granted=[];','origin fact source')
write(p,s)

# contextual-actions: opening grace, stronger possession checks, and stale/absent social target rejection.
p='src/contextual-actions.js'; s=read(p)
s=rep(s,'const POSSESSION_ITEM=/從(?:口袋|背包|行囊|隨身物品|身上).{0,18}?(?:取出|拿出|掏出|抽出)\\s*([^，。；、,.;!?！？]{2,36})/i;',
'''const POSSESSION_ITEM=/從(?:口袋|背包|行囊|隨身物品|身上).{0,18}?(?:取出|拿出|掏出|抽出)\\s*([^，。；、,.;!?！？]{2,36})/i;\nconst ASSUMED_POSSESSION=/(?:戴著|佩戴|穿著|手持|握著|拿著|攜帶|持有|展示|出示|舉起)\\s*([^，。；、,.;!?！？]{1,36})/i;''','possession regex')
s=rep(s,'const m=String(action||"").match(POSSESSION_ITEM);return clean(m?.[1]||m?.[2]||"",50).replace(/^(?:那|這)(?:一)?(?:個|枚|片|件|瓶|把|本|張|塊|顆|粒)?/i,"").trim()',
      'const raw=String(action||""),m=raw.match(POSSESSION_ITEM)||raw.match(ASSUMED_POSSESSION);return clean(m?.[1]||m?.[2]||"",50).replace(/^(?:那|這)(?:一)?(?:個|枚|片|件|瓶|把|本|張|塊|顆|粒)?/i,"").trim()','implied inventory')
old=''' if(x.targetId){const npc=(state.world?.registry?.npcs||[]).find(n=>n.id===x.targetId);if(npc&&!(npc.known===true&&npc.alive!==false))reasons.push("TARGET_UNAVAILABLE")}\n return {ok:reasons.length===0,reasons,impliedItem:implied||null,impliedCapability:special||null}'''
new=''' if(x.targetId){const npc=(state.world?.registry?.npcs||[]).find(n=>n.id===x.targetId);if(npc&&!(npc.known===true&&npc.alive!==false))reasons.push("TARGET_UNAVAILABLE");else if(npc&&x.kind==="SOCIAL"&&!presentNpcs(state).some(n=>n.id===x.targetId))reasons.push("TARGET_NOT_PRESENT")}\n return {ok:reasons.length===0,reasons,impliedItem:implied||null,impliedCapability:special||null}'''
s=rep(s,old,new,'social target presence')
old='''function progressionSuggestion(state){\n const q=state.quests?.main,objective=clean(q?.aiHint||q?.objectives?.[0],100),npc=presentNpcs(state)[0],clue=recentNpcClue(state),event=recentVisibleEvent(state),loc=currentLocation(state),recentRows=(state.events||[]).filter(e=>["PLAYER_ACTION","PLAYER_ITEM_ACTION","PLAYER_ECONOMY_ACTION"].includes(String(e?.type||""))).slice(-4),recentText=recentRows.map(e=>clean(e.customText||e.action||e.originalAction,180)).join("\\n"),npcLabel=npc?visibleNpcName(state,npc):"",sameNpcAttempts=npcLabel?(recentText.split(npcLabel).length-1):0;\n if(clue?.summary)return'''
new='''function progressionSuggestion(state){\n const q=state.quests?.main,objective=clean(q?.aiHint||q?.objectives?.[0],100),npc=presentNpcs(state)[0],clue=recentNpcClue(state),event=recentVisibleEvent(state),loc=currentLocation(state),recentRows=(state.events||[]).filter(e=>["PLAYER_ACTION","PLAYER_ITEM_ACTION","PLAYER_ECONOMY_ACTION"].includes(String(e?.type||""))).slice(-4),recentText=recentRows.map(e=>clean(e.customText||e.action||e.originalAction,180)).join("\\n"),npcLabel=npc?visibleNpcName(state,npc):"",sameNpcAttempts=npcLabel?(recentText.split(npcLabel).length-1):0,openingTurn=recentRows.length===0;\n if(openingTurn)return normalizeContextualSuggestion({label:"先確認眼前環境",action:`在${loc}先確認可見的出入口、聲音、光線與立即危險，不主動接觸尚未建立遭遇的人物`,kind:"OBSERVE",risk:"LOW",approach:"STEADY",progression:true,causalBasis:"第一回合先建立玩家能親自感知的環境基準，陌生 NPC 必須由後續 grounded encounter 才進入互動",requirementsSatisfied:true,source:"ENGINE"});\n if(clue?.summary)return'''
s=rep(s,old,new,'opening grace')
write(p,s)

# ai-output-repair: strict scene shape + deterministic zh-Hant normalization.
p='src/ai-output-repair.js'; s=read(p)
anchor='const ENTITY_EDGE=/^[\\s「」『』“”\\"\'`，,。.!！?？:：;；、()（）\\[\\]【】]+|[\\s「」『』“”\\"\'`，,。.!！?？:：;；、()（）\\[\\]【】]+$/g;'
if anchor not in s: raise SystemExit('missing ENTITY_EDGE anchor')
insert=anchor+'''\nconst ZH_HANT_MAP=Object.freeze({严:"嚴",为:"為",争:"爭",仅:"僅",仪:"儀",会:"會",冻:"凍",则:"則",剧:"劇",动:"動",区:"區",压:"壓",发:"發",变:"變",听:"聽",响:"響",围:"圍",声:"聲",夹:"夾",夺:"奪",实:"實",对:"對",导:"導",尘:"塵",尝:"嘗",层:"層",属:"屬",峡:"峽",币:"幣",废:"廢",异:"異",弃:"棄",录:"錄",战:"戰",抢:"搶",换:"換",断:"斷",无:"無",机:"機",来:"來",桥:"橋",检:"檢",气:"氣",济:"濟",浓:"濃",涟:"漣",温:"溫",灭:"滅",点:"點",烧:"燒",狭:"狹",现:"現",离:"離",称:"稱",竞:"競",筑:"築",纳:"納",线:"線",经:"經",给:"給",绝:"絕",维:"維",绿:"綠",缘:"緣",缝:"縫",缴:"繳",网:"網",肤:"膚",脉:"脈",舱:"艙",节:"節",蚀:"蝕",补:"補",视:"視",记:"記",语:"語",财:"財",货:"貨",贸:"貿",边:"邊",过:"過",运:"運",进:"進",连:"連",钉:"釘",铁:"鐵",铆:"鉚",铜:"銅",锁:"鎖",锈:"鏽",镇:"鎮",门:"門",阀:"閥",随:"隨",雾:"霧",须:"須",颗:"顆",风:"風",驱:"驅",鸣:"鳴",齿:"齒",频:"頻",该:"該",饰:"飾",挂:"掛",艺:"藝",试:"試",图:"圖",后:"後",从:"從",个:"個",还:"還",将:"將",处:"處",这:"這",与:"與",开:"開",闭:"閉",险:"險",际:"際",体:"體",应:"應",确:"確",认:"認",类:"類",级:"級",写:"寫",标:"標",权:"權",术:"術",伤:"傷",护:"護",备:"備",虑:"慮",达:"達",转:"轉",质:"質",问:"問",况:"況",扩:"擴",缩:"縮",步:"步",侧:"側",踪:"蹤",划:"劃",产:"產",资:"資",源:"源"});\nfunction normalizeZhHant(value){const fix=v=>typeof v==="string"?[...v].map(ch=>ZH_HANT_MAP[ch]||ch).join(""):Array.isArray(v)?v.map(fix):plain(v)?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,fix(x)])):v;return fix(value)}\nfunction localeRepair(value,locale,issues){if(String(locale||"")!=="zh-Hant"||value==null)return value;const fixed=normalizeZhHant(value);if(!same(fixed,value))issues.push(issue("PLAYER_TEXT_TRADITIONALIZED",REPAIR_DISPOSITION.NORMALIZED,REPAIR_SEVERITY.CONTRACT_VIOLATION));return fixed}\n'''
s=s.replace(anchor,insert,1)
# state patch locale normalization after value creation
old=''' const baseRevision=Number(plan?.baseRevision),rawRevision=Number(raw.baseRevision),value={...raw,baseRevision:Number.isFinite(baseRevision)?baseRevision:rawRevision||0,operations};\n if(Number.isFinite(baseRevision)&&rawRevision!==baseRevision)issues.push(issue("BASE_REVISION_REBOUND",REPAIR_DISPOSITION.BOUND,REPAIR_SEVERITY.CONTRACT_VIOLATION));else if(raw.baseRevision!==value.baseRevision)issues.push(issue("BASE_REVISION_NORMALIZED",REPAIR_DISPOSITION.NORMALIZED,REPAIR_SEVERITY.RECOVERABLE));\n return finalize(value,raw,issues,dropped)'''
new=''' const baseRevision=Number(plan?.baseRevision),rawRevision=Number(raw.baseRevision);let value={...raw,baseRevision:Number.isFinite(baseRevision)?baseRevision:rawRevision||0,operations};\n if(Number.isFinite(baseRevision)&&rawRevision!==baseRevision)issues.push(issue("BASE_REVISION_REBOUND",REPAIR_DISPOSITION.BOUND,REPAIR_SEVERITY.CONTRACT_VIOLATION));else if(raw.baseRevision!==value.baseRevision)issues.push(issue("BASE_REVISION_NORMALIZED",REPAIR_DISPOSITION.NORMALIZED,REPAIR_SEVERITY.RECOVERABLE));\n value=localeRepair(value,arguments[1]?.locale,issues);\n return finalize(value,raw,issues,dropped)'''
s=rep(s,old,new,'state patch locale repair')
old='''export function repairSceneCandidate(raw,{expectedOutcome=""}={}){\n const issues=[],dropped=[];if(!plain(raw))return finalize(null,raw,[issue("SCENE_NOT_OBJECT",REPAIR_DISPOSITION.REJECTED,REPAIR_SEVERITY.HARD_REJECT)]);\n const value={...raw,narrative:text(raw.narrative,1800)};'''
new='''export function repairSceneCandidate(raw,{expectedOutcome="",locale=""}={}){\n const issues=[],dropped=[];if(!plain(raw))return finalize(null,raw,[issue("SCENE_NOT_OBJECT",REPAIR_DISPOSITION.REJECTED,REPAIR_SEVERITY.HARD_REJECT)]);\n if(typeof raw.narrative!=="string"||!Array.isArray(raw.suggestions))return finalize(null,raw,[issue("SCENE_SHAPE_INVALID",REPAIR_DISPOSITION.REJECTED,REPAIR_SEVERITY.HARD_REJECT)]);\n let value={...raw,narrative:text(raw.narrative,1800)};'''
s=rep(s,old,new,'scene strict shape')
s=rep(s,'value.suggestions=suggestions.slice(0,4);if(list(raw.suggestions).length>4)issues.push(issue("SUGGESTION_LIMIT_NORMALIZED",REPAIR_DISPOSITION.NORMALIZED,REPAIR_SEVERITY.RECOVERABLE));if(dropped.length)issues.push(issue("INVALID_SUGGESTIONS_DROPPED",REPAIR_DISPOSITION.DROPPED,REPAIR_SEVERITY.HARD_REJECT));return finalize(value,raw,issues,dropped)',
      'value.suggestions=suggestions.slice(0,4);if(list(raw.suggestions).length>4)issues.push(issue("SUGGESTION_LIMIT_NORMALIZED",REPAIR_DISPOSITION.NORMALIZED,REPAIR_SEVERITY.RECOVERABLE));if(dropped.length)issues.push(issue("INVALID_SUGGESTIONS_DROPPED",REPAIR_DISPOSITION.DROPPED,REPAIR_SEVERITY.HARD_REJECT));value=localeRepair(value,locale,issues);return finalize(value,raw,issues,dropped)','scene locale repair')
write(p,s)

# ai-client: supply runtime locale to deterministic repair calls.
p='src/ai-client.js'; s=read(p)
s=s.replace('{expectedOutcome:kernel.result?.success===true?"SUCCESS":"FAILURE"}', '{expectedOutcome:kernel.result?.success===true?"SUCCESS":"FAILURE",locale:normalizeLocale(loadLocale())}')
s=s.replace('{plan,snapshot}).value', '{plan,snapshot,locale:normalizeLocale(loadLocale())}).value')
s=s.replace('{plan:resolved,snapshot}).value', '{plan:resolved,snapshot,locale:normalizeLocale(loadLocale())}).value')
write(p,s)

# Prompt contract: separate kind vs approach and request concise suggestion payloads.
p='src/ai-runtime-contracts.js'; s=read(p)
s=rep(s,'return `你是 Elyndra Scene Narrator。一般回合 narrative',
      'return `你是 Elyndra Scene Narrator。suggestions.kind 只能是 OBSERVE|SOCIAL|TRAVEL|RISKY|GENERAL；STEADY|SOCIAL|BOLD|CREATIVE 只可放在 approach，絕不能當 kind。每個 suggestion 的 label/action/skillHint/consequenceHint/causalBasis 必須精簡，避免因輸出過長截斷 JSON。一般回合 narrative','scene schema distinction')
write(p,s)

# ai-autotest: semantic progress excludes clock/event bookkeeping; recovery avoids immediate location ping-pong.
p='src/ai-autotest.js'; s=read(p)
s=rep(s,'function firstButtonRecoveryDestination(state={}){', 'function firstButtonRecoveryDestination(state={},recentActions=[]){','recovery signature')
s=rep(s,'const routes=list(ensureTravelNetwork(state)?.routes),byId=new Map(locations.map(x=>[String(x?.id||""),x]).filter(([id])=>id));let unexplored=null;',
      'const routes=list(ensureTravelNetwork(state)?.routes),byId=new Map(locations.map(x=>[String(x?.id||""),x]).filter(([id])=>id)),recentLocations=new Set(list(recentActions).slice(-4).map(x=>String(x?.location||"")).filter(Boolean));let unexplored=null;','recent locations')
s=rep(s,'if(target.known===true)return {...target,target,known:true};if(!unexplored)unexplored={...target,target,known:false}',
      'if(recentLocations.has(String(target.name||"")))continue;if(target.known===true)return {...target,target,known:true};if(!unexplored)unexplored={...target,target,known:false}','avoid pingpong')
s=s.replace('firstButtonRecoveryDestination(state)', 'firstButtonRecoveryDestination(state,recentActions)')
s=s.replace('action:`前往${destination.name}`', 'action:autotestTravelAction(destination.target,destination.known)')
needle='export function autotestStateFingerprint(state={}){'
if needle not in s: raise SystemExit('missing autotest fingerprint')
insert='''export function autotestProgressFingerprint(state={}){const full=JSON.parse(autotestStateFingerprint(state));delete full.totalMinutes;delete full.eventCount;return JSON.stringify(full)}\n'''
pos=s.index(needle)
s=s[:pos]+insert+s[pos:]
write(p,s)

# app.js: use semantic progress for stall detection, hide unencountered NPC dock entries, bump changed-module cache tokens.
p='app.js'; s=read(p)
s=s.replace('buildAutotestReport,autotestExportSelection,autotestPlayStrategy,autotestDifficultyPlan}', 'buildAutotestReport,autotestExportSelection,autotestPlayStrategy,autotestDifficultyPlan,autotestProgressFingerprint}')
s=s.replace('./src/contextual-actions.js?v=57029','./src/contextual-actions.js?v=59014')
s=s.replace('npcs.filter(x=>canInteractWithNpc(gameState,x)).slice(-6)', 'npcs.filter(x=>(x.encountered===true||x.originKnown===true||x.companion?.status==="ACTIVE")&&canInteractWithNpc(gameState,x)).slice(-6)')
old='const beforeFingerprint=autotestStateFingerprint(gameState),turnStartedAt=Date.now(),row={worldIndex:i,turn,beforeFingerprint,afterFingerprint:"",decision:null,error:"",durationMs:0};'
new='const beforeFingerprint=autotestStateFingerprint(gameState),beforeProgressFingerprint=autotestProgressFingerprint(gameState),turnStartedAt=Date.now(),row={worldIndex:i,turn,beforeFingerprint,afterFingerprint:"",beforeProgressFingerprint,afterProgressFingerprint:"",decision:null,error:"",durationMs:0};'
s=rep(s,old,new,'autotest before semantic fingerprint')
old='row.afterFingerprint=autotestStateFingerprint(gameState);row.durationMs=Date.now()-turnStartedAt;result.actions.push(row);result.turns=turn;recentActions.push({action:decision.action||decision.combatAction||"",mode:decision.mode,kind:decision.kind||"",progression:decision.progression===true,targetId:decision.targetId||null,progressed:row.beforeFingerprint!==row.afterFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0});'
new='row.afterFingerprint=autotestStateFingerprint(gameState);row.afterProgressFingerprint=autotestProgressFingerprint(gameState);row.durationMs=Date.now()-turnStartedAt;result.actions.push(row);result.turns=turn;recentActions.push({action:decision.action||decision.combatAction||"",mode:decision.mode,kind:decision.kind||"",progression:decision.progression===true,targetId:decision.targetId||null,progressed:row.beforeProgressFingerprint!==row.afterProgressFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0});'
s=rep(s,old,new,'autotest semantic progressed')
s=s.replace('stateChanged:row.beforeFingerprint!==row.afterFingerprint,action:', 'stateChanged:row.beforeFingerprint!==row.afterFingerprint,semanticProgress:row.beforeProgressFingerprint!==row.afterProgressFingerprint,action:')
old='row.error=e?.message||String(e);row.durationMs=Date.now()-turnStartedAt;row.afterFingerprint=autotestStateFingerprint(gameState);result.actions.push(row);result.turns=turn;recentActions.push({action:row.decision?.action||row.decision?.combatAction||"",mode:row.decision?.mode||"",kind:row.decision?.kind||"",progression:row.decision?.progression===true,targetId:row.decision?.targetId||null,progressed:row.beforeFingerprint!==row.afterFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0});'
new='row.error=e?.message||String(e);row.durationMs=Date.now()-turnStartedAt;row.afterFingerprint=autotestStateFingerprint(gameState);row.afterProgressFingerprint=autotestProgressFingerprint(gameState);result.actions.push(row);result.turns=turn;recentActions.push({action:row.decision?.action||row.decision?.combatAction||"",mode:row.decision?.mode||"",kind:row.decision?.kind||"",progression:row.decision?.progression===true,targetId:row.decision?.targetId||null,progressed:row.beforeProgressFingerprint!==row.afterProgressFingerprint,location:gameState?.player?.location||"",questStage:Number(gameState?.quests?.main?.stage)||0});'
s=rep(s,old,new,'autotest semantic catch')
write(p,s)

# Regression test.
p='test/v05914-runtime-locale-semantic-opening.test.js'
write(p,r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {repairAiOutput,verifyRepairIdempotence} from "../src/ai-output-repair.js";
import {evaluateSuggestionRequirements} from "../src/contextual-actions.js";
import {autotestStateFingerprint,autotestProgressFingerprint} from "../src/ai-autotest.js";

test("v0.59.14 malformed nested suggestion can never masquerade as a scene",()=>{
 const raw={label:"x",action:"y",kind:"OBSERVE",risk:"LOW",approach:"STEADY"};
 const repaired=repairAiOutput("SCENE",raw,{expectedOutcome:"SUCCESS",locale:"zh-Hant"});
 assert.equal(repaired.value,null);assert.ok(repaired.issues.some(x=>x.code==="SCENE_SHAPE_INVALID"&&x.severity==="HARD_REJECT"));
});

test("v0.59.14 zh-Hant player-facing repair is deterministic and idempotent",()=>{
 const raw={outcome:"SUCCESS",sceneTitle:"机械声",narrative:"机械声的频率发生变化。",suggestions:[{label:"继续观察",action:"维持距离观察齿轮",kind:"OBSERVE",risk:"LOW",approach:"STEADY",requirementsSatisfied:true,requiredItemIds:[],requiredCapabilities:[]}]};
 const r=repairAiOutput("SCENE",raw,{expectedOutcome:"SUCCESS",locale:"zh-Hant"});
 assert.match(r.value.narrative,/機械聲/);assert.doesNotMatch(JSON.stringify(r.value),/[机声频变维齿]/);assert.ok(r.issues.some(x=>x.code==="PLAYER_TEXT_TRADITIONALIZED"));
 assert.equal(verifyRepairIdempotence("SCENE",r.value,{expectedOutcome:"SUCCESS",locale:"zh-Hant"}).ok,true);
});

test("v0.59.14 suggestion requirements reject invented worn items and absent social targets",()=>{
 const state={player:{location:"A"},inventory:[],world:{registry:{locations:[{id:"L1",name:"A"}],npcs:[{id:"N1",name:"某人",known:true,alive:true,locationId:"L2"}]}}};
 const item=evaluateSuggestionRequirements(state,{label:"摸鍋爐",action:"伸出戴著手套的手觸摸鍋爐",kind:"OBSERVE",risk:"LOW",approach:"STEADY",requirementsSatisfied:true,requiredItemIds:[],requiredCapabilities:[]});
 assert.equal(item.ok,false);assert.ok(item.reasons.some(x=>x.startsWith("IMPLIED_ITEM_MISSING:")));
 const npc=evaluateSuggestionRequirements(state,{label:"問某人",action:"詢問某人",kind:"SOCIAL",risk:"LOW",approach:"SOCIAL",targetId:"N1",requirementsSatisfied:true,requiredItemIds:[],requiredCapabilities:[]});
 assert.equal(npc.ok,false);assert.ok(npc.reasons.includes("TARGET_NOT_PRESENT"));
});

test("v0.59.14 semantic AutoTest progress ignores clock/event bookkeeping",()=>{
 const base={world:{id:"W",state:{clock:{totalMinutes:0}},registry:{npcs:[],locations:[],sideQuests:[]}},player:{location:"A",hp:100,status:"ALIVE",level:1,xp:0,knowledgeScore:0},quests:{main:{stage:1,status:"ACTIVE",objectives:["x"]}},events:[],knowledge:[],inventory:[],discoveries:0,combat:{active:false}};
 const later=structuredClone(base);later.world.state.clock.totalMinutes=30;later.events.push({type:"PLAYER_ACTION"});
 assert.notEqual(autotestStateFingerprint(base),autotestStateFingerprint(later));assert.equal(autotestProgressFingerprint(base),autotestProgressFingerprint(later));
});

test("v0.59.14 opening and HUD regressions stay explicit",async()=>{
 const [context,index,css,origin]=await Promise.all([readFile(new URL("../src/contextual-actions.js",import.meta.url),"utf8"),readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../world-surfaces.css",import.meta.url),"utf8"),readFile(new URL("../src/origin-runtime.js",import.meta.url),"utf8")]);
 assert.match(context,/openingTurn=recentRows\.length===0/);assert.match(context,/第一回合先建立玩家能親自感知的環境基準/);
 assert.ok(index.indexOf('id="narrative"')<index.indexOf('class="player-summary narrative-player-summary"'));assert.ok(index.indexOf('class="player-summary narrative-player-summary"')<index.indexOf('class="decision-panel"'));
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(150px,190px\)/);assert.match(origin,/PARTIAL_LOCAL:\{factLimit:3,worldName:true,calendar:false/);assert.match(origin,/localPublicFacts/);
});
''')

print('v0.59.14 patch applied')
