from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

def read(path):
    return (ROOT/path).read_text(encoding="utf-8")

def write(path,text):
    (ROOT/path).write_text(text,encoding="utf-8")

# 1) Engine-level danger pacing / newbie protection.
world_pacing='''const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PRESSURE_CAP={1:3,2:6,3:10,4:15,5:20};
const INTENSITY_CAP={1:25,2:40,3:60,4:80,5:100};
const FUTURE_PRESSURE_CAP={1:25,2:45,3:65,4:85,5:100};

export function pacingPhase(state){
 const pacing=state.world?.timelinePacing||{},day=Math.max(1,Number(state.world?.state?.day)||1),horizon=Math.max(1,Number(pacing.horizonDays)||1);
 const lateFrom=Math.max(2,Number(pacing.phases?.late?.fromDay)||Math.round(horizon*.65)),middleFrom=Math.max(2,Number(pacing.phases?.middle?.fromDay)||Math.round(horizon*.25));
 return {phase:day>=lateFrom?"LATE":day>=middleFrom?"MIDDLE":"EARLY",day,horizon,progress:clamp(day/horizon,0,1),middleFrom,lateFrom}
}

export function eventDangerProfile(state){
 const p=pacingPhase(state),seedDanger=clamp(Math.round(Number(state.world?.seedContract?.danger)||3),1,5),newbieProtection=p.day<=1;
 const progress=clamp((p.day-1)/Math.max(1,p.horizon-1),0,1);
 const rampTier=newbieProtection?1:progress<.25?2:progress<.5?3:progress<.75?4:5;
 const maxDanger=Math.min(seedDanger,rampTier);
 return {...p,seedDanger,newbieProtection,rampTier,maxDanger,pressureCap:PRESSURE_CAP[maxDanger],intensityCap:INTENSITY_CAP[maxDanger],futurePressureCap:FUTURE_PRESSURE_CAP[maxDanger]}
}

export function eventDangerTier(event={}){
 const pressure=Math.max(0,Number(event.pressure??event.effectivePressure)||0),intensity=Math.max(0,Number(event.intensity)||0),scope=String(event.impactScope||event.scope||"LOCAL").toUpperCase(),category=String(event.category||event.kind||event.subtype||"").toUpperCase();
 let tier=pressure<=3?1:pressure<=6?2:pressure<=10?3:pressure<=15?4:5;
 tier=Math.max(tier,intensity<=25?1:intensity<=40?2:intensity<=60?3:intensity<=80?4:5);
 tier=Math.max(tier,scope==="WORLD"?5:scope==="CONTINENTAL"?4:scope==="NATIONAL"?3:scope==="REGIONAL"?2:1);
 if(/ENDGAME|APOCAL|EXTINCTION|WORLD_WAR/.test(category))tier=5;
 else if(/WAR|PLAGUE|SIEGE|INVASION|COLLAPSE|DISASTER/.test(category))tier=Math.max(tier,3);
 return clamp(tier,1,5)
}

export function eventAllowedByPacing(state,event){return eventDangerTier(event)<=eventDangerProfile(state).maxDanger}
export function clampWorldEventPressure(state,amount){const p=eventDangerProfile(state);return clamp(Math.round(Math.max(0,Number(amount)||0)),0,p.pressureCap)}
export function clampWorldEventIntensity(state,amount){const p=eventDangerProfile(state);return clamp(Math.round(Math.max(0,Number(amount)||0)),0,p.intensityCap)}

export function endgameWindowOpen(state){
 const timeline=Array.isArray(state.world?.timeline)?state.world.timeline:[];if(!timeline.length)return true;
 const phase=pacingPhase(state),triggered=timeline.filter(x=>x.status==="TRIGGERED").length,ratio=triggered/timeline.length;
 return phase.phase==="LATE"||ratio>=.65
}

export function pacedTimelinePressure(state,amount){
 const p=pacingPhase(state),profile=eventDangerProfile(state),n=Math.max(0,Number(amount)||0),factor=p.phase==="EARLY"?.65:p.phase==="MIDDLE"?1:1.15;
 return clamp(Math.round(n*factor),0,profile.pressureCap)
}

export function pacingSnapshot(state){
 const p=pacingPhase(state),profile=eventDangerProfile(state),timeline=Array.isArray(state.world?.timeline)?state.world.timeline:[],triggered=timeline.filter(x=>x.status==="TRIGGERED").length;
 return {...p,newbieProtection:profile.newbieProtection,maxDanger:profile.maxDanger,seedDanger:profile.seedDanger,pressureCap:profile.pressureCap,intensityCap:profile.intensityCap,triggeredEvents:triggered,totalEvents:timeline.length,endgameWindowOpen:endgameWindowOpen(state)}
}
'''
write(Path('src/world-pacing.js'),world_pacing)

# 2) Timeline cancellation semantics + danger gate.
path=Path('src/world-timeline.js')
text=read(path)
if not text.startswith('import {eventAllowedByPacing}'):
    text='import {eventAllowedByPacing,eventDangerTier} from "./world-pacing.js?v=54018p1";\n'+text
text=text.replace('const conditions=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>clean(x,160)).filter(Boolean))].slice(0,8);',
'''const conditions=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>clean(x,160)).filter(Boolean))].slice(0,8);\nconst cancelConditions=v=>conditions(v).map(x=>/^NOT:(EVENT|FLAG|FACT|LOCATION):/i.test(x)?x.slice(4):x);''')
text=text.replace('cancelConditions:conditions(x.cancelConditions)', 'cancelConditions:cancelConditions(x.cancelConditions)')
old='for(const event of timeline.filter(x=>x.status==="SCHEDULED")){const c=timelineConditionSnapshot(state,event);if(c.cancelMet){event.status="CANCELLED";event.cancelledDay=day;event.cancelReason="CANCEL_CONDITIONS_MET"}}'
new='for(const event of timeline.filter(x=>x.status==="SCHEDULED")){const earliest=Math.max(1,Number(event.earliestDay)||1);if(day<earliest)continue;const c=timelineConditionSnapshot(state,event);if(c.cancelMet){event.status="CANCELLED";event.cancelledDay=day;event.cancelReason="CANCEL_CONDITIONS_MET"}}'
if old not in text: raise SystemExit('world-timeline cancellation loop anchor missing')
text=text.replace(old,new,1)
old='const due=timeline.filter(x=>x.status==="SCHEDULED"&&day>=effectiveTriggerDay(x)&&timelineConditionSnapshot(state,x).activationMet)'
new='const due=timeline.filter(x=>x.status==="SCHEDULED"&&day>=effectiveTriggerDay(x)&&timelineConditionSnapshot(state,x).activationMet&&eventAllowedByPacing(state,x))'
if old not in text: raise SystemExit('world-timeline due filter anchor missing')
text=text.replace(old,new,1)
text=text.replace('playerCanPrevent:x.playerCanPrevent!==false,playerCanAccelerate:x.playerCanAccelerate!==false,playerCanMitigate:x.playerCanMitigate!==false,playerCanRedirect:x.playerCanRedirect!==false,conditionState:timelineConditionSnapshot(state,x)}))',
                  'playerCanPrevent:x.playerCanPrevent!==false,playerCanAccelerate:x.playerCanAccelerate!==false,playerCanMitigate:x.playerCanMitigate!==false,playerCanRedirect:x.playerCanRedirect!==false,dangerTier:eventDangerTier(x),conditionState:timelineConditionSnapshot(state,x)}))')
write(path,text)

# 3) World simulation consumes the same curve.
path=Path('src/world-simulation.js')
text=read(path)
text=text.replace('import {triggerDueTimelineEvents,effectiveTimelinePressure} from "./world-timeline.js?v=54018";', 'import {triggerDueTimelineEvents,effectiveTimelinePressure} from "./world-timeline.js?v=54018p1";')
text=text.replace('import {pacedTimelinePressure} from "./world-pacing.js?v=54018";', 'import {pacedTimelinePressure,eventDangerProfile,clampWorldEventPressure} from "./world-pacing.js?v=54018p1";')
text=text.replace('import {advanceFutureSimulation} from "./future-runtime.js?v=54018";', 'import {advanceFutureSimulation} from "./future-runtime.js?v=54018p1";')
old='const danger=Math.max(1,Math.min(5,Number(state.world?.seedContract?.danger)||3)),elapsedSinceTick=Math.max(0,clock.totalMinutes-sim.lastTickMinute),steps=Math.floor(elapsedSinceTick/30);'
new='const dangerProfile=eventDangerProfile(state),danger=dangerProfile.maxDanger,elapsedSinceTick=Math.max(0,clock.totalMinutes-sim.lastTickMinute),steps=Math.floor(elapsedSinceTick/30);'
if old not in text: raise SystemExit('world-simulation danger anchor missing')
text=text.replace(old,new,1)
old='if(sim.tension>=18&&roll<.35)event={kind:"RUMOR",summary:"從可觀察的痕跡與零碎動靜中，你察覺周遭的風險正在上升。",pressure:2};\n else if(sim.tension>=30&&roll<.55)event={kind:"ACTIVITY_SHIFT",summary:"附近出現更多來源不明的活動痕跡，但你仍無法確認背後是誰。",pressure:5};\n else if(sim.tension>=45&&roll<.7)event={kind:"WORLD_PRESSURE",summary:"周遭環境出現一種不尋常的變化，像是某個正在累積的危機開始影響到你能感知的範圍。",pressure:12};'
new='if(sim.tension>=18&&roll<.35)event={kind:"RUMOR",summary:"從可觀察的痕跡與零碎動靜中，你察覺周遭的風險正在上升。",pressure:1};\n else if(dangerProfile.maxDanger>=2&&sim.tension>=30&&roll<.55)event={kind:"ACTIVITY_SHIFT",summary:"附近出現更多來源不明的活動痕跡，但你仍無法確認背後是誰。",pressure:5};\n else if(dangerProfile.maxDanger>=3&&sim.tension>=45&&roll<.7)event={kind:"WORLD_PRESSURE",summary:"周遭環境出現一種不尋常的變化，像是某個正在累積的危機開始影響到你能感知的範圍。",pressure:12};'
if old not in text: raise SystemExit('world-simulation ambient event anchor missing')
text=text.replace(old,new,1)
text=text.replace('addCrisisPressure(state,event.pressure,event.summary);', 'addCrisisPressure(state,clampWorldEventPressure(state,event.pressure),event.summary);')
write(path,text)

# 4) Future pressure cannot jump straight to endgame during early pacing.
path=Path('src/future-runtime.js')
text=read(path)
if 'import {eventDangerProfile}' not in text:
    text=text.replace('import {seedHistoryLegacy} from "./history-legacy.js?v=54018";', 'import {seedHistoryLegacy} from "./history-legacy.js?v=54018";\nimport {eventDangerProfile} from "./world-pacing.js?v=54018p1";')
old='if(event?.type==="WORLD_EVENT"&&event?.subtype==="TIMELINE_EVENT"){future.activatedDay=Math.max(1,Number(event.day)||Number(state.world?.state?.day)||1);return Math.max(0,80-Number(future.pressure||0))}'
new='if(event?.type==="WORLD_EVENT"&&event?.subtype==="TIMELINE_EVENT"){future.activatedDay=Math.max(1,Number(event.day)||Number(state.world?.state?.day)||1);const cap=eventDangerProfile(state).futurePressureCap;return Math.max(0,Math.min(cap,80)-Number(future.pressure||0))}'
if old not in text: raise SystemExit('future-runtime timeline delta anchor missing')
text=text.replace(old,new,1)
old='for(const future of futures){recomputeFutureStage(state,future);if(future.activatedDay&&future.stage!=="RESOLVED"&&Number(future.pressure||0)>=80)future.stage="ACTIVE";const signal=emitForeshadowing(state,future,rt);if(signal)signals.push(signal)}'
new='for(const future of futures){future.pressure=Math.min(Math.max(0,Number(future.pressure)||0),eventDangerProfile(state).futurePressureCap);recomputeFutureStage(state,future);if(future.activatedDay&&future.stage!=="RESOLVED"&&Number(future.pressure||0)>=80)future.stage="ACTIVE";const signal=emitForeshadowing(state,future,rt);if(signal)signals.push(signal)}'
if old not in text: raise SystemExit('future-runtime stage loop anchor missing')
text=text.replace(old,new,1)
write(path,text)

# 5) SOCIAL/TALK must never be swallowed by local lore inspection.
path=Path('app.js')
text=read(path)
old=''' if(assessment?.verdict!=="BLOCK"){
  const localLore=resolveLocalLoreAction(gameState,effective);
  if(localLore){gameState.narrative=localLore.text;gameState.sceneTitle=deriveSceneTitle(gameState,effective);gameState.suggestions=fallbackActionButtons(effective);gameState.suggestionIntents=[];gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"PLAYER_ACTION_ASSESSED",visibility:"INTERNAL",action:requested,normalizedAction:effective,assessment,day:gameState.world?.state?.day||1,at:Date.now()});bumpStateRevision(gameState,"LOCAL_LORE_ACTION");finishPlayerActionFlight(effective,"local_engine");await persist();await refresh();return}
 }'''
new=''' if(assessment?.verdict!=="BLOCK"){
  const socialAction=assessment?.intent==="TALK"||assessment?.kind==="SOCIAL"||/(詢問|請教|交談|對話|攀談|問(?:他|她|對方|.+?怎樣|.+?如何)|告訴|回答|talk|ask|speak|tell)/i.test(effective);
  if(!socialAction){
   const localLore=resolveLocalLoreAction(gameState,effective);
   if(localLore){gameState.narrative=localLore.text;gameState.sceneTitle=deriveSceneTitle(gameState,effective);gameState.suggestions=fallbackActionButtons(effective);gameState.suggestionIntents=[];gameState.events??=[];gameState.events.push({id:crypto.randomUUID?.()||Math.random().toString(36).slice(2),type:"PLAYER_ACTION_ASSESSED",visibility:"INTERNAL",action:requested,normalizedAction:effective,assessment,day:gameState.world?.state?.day||1,at:Date.now()});bumpStateRevision(gameState,"LOCAL_LORE_ACTION");finishPlayerActionFlight(effective,"local_engine");await persist();await refresh();return}
  }
 }'''
if old not in text: raise SystemExit('app local lore block anchor missing')
text=text.replace(old,new,1)
text=text.replace('./src/world-simulation.js?v=54018"','./src/world-simulation.js?v=54018p1"')
text=text.replace('./src/world-quality.js?v=54018"','./src/world-quality.js?v=54018p1"')
write(path,text)

# 6) Scene chronology guard: scheduled futures are not current facts.
path=Path('src/ai-runtime-contracts.js')
text=read(path)
anchor='若 State Director 可能建立新地點／實體，你在並行階段只能描寫不帶正式名稱的感官線索，不得先替它 Canonize。'
addition='未觸發的 timeline／future 只屬 Director 未來可能性，不得把其 observableEffect、傷亡、災變、封鎖、攻擊或其他結果提前寫成當前已發生事實；尤其開局／新手期只可使用低危、可立即感知而且不等同於未來事件正式爆發的鉤子。'
if addition not in text:
    if anchor not in text: raise SystemExit('scene narrator chronology anchor missing')
    text=text.replace(anchor,anchor+addition,1)
write(path,text)

# 7) Fallback quality critic catches glaring non-contextual lexical generation errors.
path=Path('src/world-quality.js')
text=read(path)
anchor=''' if(remoteHistory&&legacyWitness&&!longevity){score-=8;findings.push({severity:"MEDIUM",targetType:"CHARACTERS",problem:`角色「${clean(legacyWitness.name,80)||"未命名角色"}」被描述為遙遠歷史時期的第一代／創建人物，但世界或角色設定沒有交代壽命、延命、休眠或其他時間跨度機制。`,recommendation:"補充角色壽命／延命機制，或把角色改為後代、傳承者、記錄持有人，避免年代矛盾。",requiresRegeneration:true})}
'''
addition=''' const lexicalCorpus=JSON.stringify({bible:candidate?.worldBible||{},generation:candidate?.generation||{},history:candidate?.worldHistory||[]}),sexualContext=/性文化|生殖|繁殖|性交|性儀式|sexual|reproduction/i.test(lexicalCorpus);
 if(/精液/.test(lexicalCorpus)&&!sexualContext){score-=6;findings.push({severity:"MEDIUM",targetType:"LEXICAL_SANITY",problem:"世界文本出現與上下文不相符的生理詞彙，可能是生成模型選詞錯誤。",recommendation:"保持原設定含義，改用符合語境的詞彙，例如凝液、髓液、結晶液或其他世界內術語。",requiresRegeneration:true})}
'''
if addition not in text:
    if anchor not in text: raise SystemExit('world quality chronology anchor missing')
    text=text.replace(anchor,anchor+addition,1)
write(path,text)

# 8) Bump direct importers for changed browser modules; keep APP_VERSION at 0.54.18.
for p in (ROOT/'src').glob('*.js'):
    t=p.read_text(encoding='utf-8')
    before=t
    for module in ['world-pacing','world-timeline','world-simulation','future-runtime','world-quality','ai-runtime-contracts']:
        t=t.replace(f'./{module}.js?v=54018"',f'./{module}.js?v=54018p1"')
    if t!=before:p.write_text(t,encoding='utf-8')
index=read(Path('index.html')).replace('app.js?v=54018"','app.js?v=54018p1"')
write(Path('index.html'),index)

# 9) Regression coverage.
test='''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createTimelinePacing,normalizeWorldTimeline,triggerDueTimelineEvents} from "../src/world-timeline.js";
import {eventDangerProfile,eventDangerTier,eventAllowedByPacing,pacedTimelinePressure} from "../src/world-pacing.js";
import {sceneNarratorSystem} from "../src/ai-runtime-contracts.js";

function state(day=1,danger=5){
 const pacing=createTimelinePacing(15);
 return {world:{seedContract:{danger},timelinePacing:pacing,state:{day,clock:{day,hour:8,minute:0,totalMinutes:(day-1)*1440},flags:{}},timeline:[]},player:{location:"起點"},knowledge:[],events:[]}
}

test("newbie protection caps world-driven danger on day 1 and ramps upward",()=>{
 const s=state(1,5),d1=eventDangerProfile(s);assert.equal(d1.newbieProtection,true);assert.equal(d1.maxDanger,1);assert.equal(d1.pressureCap,3);
 s.world.state.day=2;const d2=eventDangerProfile(s);assert.ok(d2.maxDanger>=1&&d2.maxDanger<=2);
 s.world.state.day=Math.max(3,s.world.timelinePacing.phases.middle.fromDay);const mid=eventDangerProfile(s);assert.ok(mid.maxDanger>=d2.maxDanger);
 s.world.state.day=s.world.timelinePacing.horizonDays;const late=eventDangerProfile(s);assert.equal(late.maxDanger,5)
});

test("high-danger timeline events wait until the danger curve allows them",()=>{
 const s=state(2,5),p=s.world.timelinePacing;
 const event=normalizeWorldTimeline([{title:"王都全面戰爭",category:"WAR",directorTruth:"兩軍準備全面交戰並波及整個國家。",observableEffect:"大批軍隊封鎖道路並開始攻城。",pressure:15,intensity:85,impactScope:"NATIONAL",activationConditions:["DAY>=2"],cancelConditions:[]}],{...p,majorEventCount:1})[0];
 event.triggerDay=2;event.baseTriggerDay=2;s.world.timeline=[event];
 assert.ok(eventDangerTier(event)>=4);assert.equal(eventAllowedByPacing(s,event),false);assert.equal(triggerDueTimelineEvents(s),null);assert.equal(event.status,"SCHEDULED");
 s.world.state.day=p.horizonDays;assert.equal(eventAllowedByPacing(s,event),true);assert.equal(triggerDueTimelineEvents(s)?.id,event.id)
});

test("negative cancel authoring is normalized into a positive cancellation condition",()=>{
 const p=createTimelinePacing(15),event=normalizeWorldTimeline([{title:"儀式潰散",directorTruth:"節點逐步失衡。",observableEffect:"儀式場出現不穩定震動。",cancelConditions:["NOT:EVENT:RITUAL_REPAIR","NOT:FLAG:temple_retreat"]}],{...p,majorEventCount:1})[0];
 assert.deepEqual(event.cancelConditions,["EVENT:RITUAL_REPAIR","FLAG:temple_retreat"])
});

test("timeline cancellation is not evaluated before its earliest day",()=>{
 const s=state(1,5),p=s.world.timelinePacing,event=normalizeWorldTimeline([{title:"邊境騷動",directorTruth:"地方衝突可能擴大。",observableEffect:"道路巡查增加。",earliestDay:2,latestDay:4,cancelConditions:["EVENT:PEACE_TREATY"]}],{...p,majorEventCount:1})[0];
 s.world.timeline=[event];s.events.push({type:"PEACE_TREATY"});triggerDueTimelineEvents(s);assert.equal(event.status,"SCHEDULED");
 s.world.state.day=2;triggerDueTimelineEvents(s);assert.equal(event.status,"CANCELLED")
});

test("SOCIAL/TALK actions bypass local lore fast path",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/const socialAction=assessment\?\.intent==="TALK"\|\|assessment\?\.kind==="SOCIAL"/);
 assert.match(app,/if\(!socialAction\)\{\s*const localLore=resolveLocalLoreAction/)
});

test("scene narrator keeps untriggered futures out of the opening scene",()=>{
 assert.match(sceneNarratorSystem(),/未觸發的 timeline／future/);assert.match(sceneNarratorSystem(),/新手期/)
});

test("early timeline pressure is capped by the same danger profile",()=>{
 const s=state(1,5);assert.ok(pacedTimelinePressure(s,20)<=3);s.world.state.day=s.world.timelinePacing.horizonDays;assert.ok(pacedTimelinePressure(s,20)>3)
});

test("non-contextual lexical anomalies are covered by fallback quality review",async()=>{
 const source=await readFile(new URL("../src/world-quality.js",import.meta.url),"utf8");assert.match(source,/LEXICAL_SANITY/);assert.match(source,/凝液、髓液、結晶液/)
});
'''
write(Path('test/newbie-protection-v05418.test.js'),test)

# Update release cache-token expectations if present.
for p in (ROOT/'test').glob('*.test.js'):
    t=p.read_text(encoding='utf-8')
    if 'app.js\\?v=54018' in t:
        t=t.replace('app.js\\?v=54018','app.js\\?v=54018p1')
        p.write_text(t,encoding='utf-8')

print('patched v0.54.18 newbie protection + prior runtime issues')
