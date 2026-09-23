from pathlib import Path
import re, json

ROOT=Path('.')
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def replace_once(s,old,new,label):
    if old not in s: raise SystemExit(f'missing patch anchor: {label}')
    return s.replace(old,new,1)

# 1) Semantic classifier: movement can override abandoned/negated social clauses.
p=Path('src/action-intent.js'); s=read(p)
start=s.index('export function inferActionKind(action=""){')
end=s.index('export function inferActionIntent',start)
new_kind='''const RISKY_ACTION=/攀|跳|破壞|偷|竊|闖|攻擊|潛入|撬|climb|jump|break|steal|attack|sneak|lockpick/;
const SOCIAL_ACTION=/說|問|詢問|交談|對話|展示|出示|交給|贈送|說服|威脅|talk|ask|question|show|give|persuade|threat/;
const TRAVEL_ACTION=/前往|走到|走出|離開|移動|旅行|穿越|跟隨|跟上|踏出|進入|深入|前進|後退|退到|朝.+前進|沿著.+前進|循著.+(?:走|前進)|travel|go to|walk|move|follow/;
const ABANDONED_SOCIAL=/(?:不再|停止|放棄|結束)(?:繼續)?(?:追問|詢問|提問|交談|對話|問)|(?:不再|停止|放棄).{0,24}(?:問|詢問).{0,36}(?:轉身|離開|跟上|前進|移動|踏出)/;
const OBSERVE_ACTION=/觀察|查看|檢查|搜尋|尋找|調查|聆聽|閱讀|比對|痕跡|目擊|誰會.*反應|測試.*反應|找出.*(?:線索|證據|異常|人物)|observe|inspect|search|listen|read|trace|witness|reaction/;
export function inferActionKind(action=""){
 const q=clean(action).toLowerCase();
 if(RISKY_ACTION.test(q))return "RISKY";
 const travel=TRAVEL_ACTION.test(q),social=SOCIAL_ACTION.test(q);
 if(travel&&(!social||ABANDONED_SOCIAL.test(q)))return "TRAVEL";
 if(social)return "SOCIAL";
 if(travel)return "TRAVEL";
 if(OBSERVE_ACTION.test(q))return "OBSERVE";
 return "GENERAL"
}
'''
s=s[:start]+new_kind+s[end:]
write(p,s)

# 2) Contextual grounded travel target. Never guess when multiple exits exist.
p=Path('src/contextual-actions.js'); s=read(p)
s=s.replace('./action-intent.js?v=54008','./action-intent.js?v=54016')
anchor='export function groundedSuggestionFailForward(state,row,roll={}){'
helper='''export function groundedTravelDestination(state,action="",roll={},intent={}){
 if(roll?.success!==true)return null;
 const inferred=inferActionKind(action),kind=String(intent?.kind||inferred).toUpperCase(),semantic=String(intent?.intent||"").toUpperCase();
 if(kind!=="TRAVEL"&&semantic!=="TRAVEL"&&inferred!=="TRAVEL")return null;
 const locations=Array.isArray(state?.world?.registry?.locations)?state.world.registry.locations:[],currentName=String(state?.player?.location||state?.world?.state?.location||""),current=locations.find(x=>x?.name===currentName||x?.id===currentName);
 if(!current)return null;
 const byId=new Map(locations.filter(Boolean).map(x=>[String(x.id||""),x])),routes=Array.isArray(state?.world?.travel?.routes)?state.world.travel.routes:[],adjacent=[];
 for(const route of routes){
  if(!route||route.open===false)continue;let id="";
  if(String(route.fromId||"")===String(current.id||""))id=String(route.toId||"");else if(String(route.toId||"")===String(current.id||""))id=String(route.fromId||"");else continue;
  const target=byId.get(id);if(!target||target===current||Array.isArray(target.accessRequirements)&&target.accessRequirements.length)continue;
  if(!adjacent.some(x=>String(x.id)===String(target.id)))adjacent.push(target)
 }
 const q=String(action||"");
 const explicit=adjacent.find(x=>x?.name&&q.includes(String(x.name)));if(explicit)return explicit;
 return adjacent.length===1?adjacent[0]:null
}

'''
s=replace_once(s,anchor,helper+anchor,'contextual travel helper')
write(p,s)

# 3) Model JSON: repair a response truncated only by missing final closers.
p=Path('src/model-json.js'); s=read(p)
anchor='export function parseModelJSON(raw){'
helper='''function closeUnfinishedModelJSON(value){
 let inString=false,escaped=false,stack=[];
 for(const ch of value){
  if(inString){if(escaped)escaped=false;else if(ch==="\\\\")escaped=true;else if(ch==='"')inString=false;continue}
  if(ch==='"'){inString=true;continue}
  if(ch==='{')stack.push('}');else if(ch==='[')stack.push(']');else if(ch==='}'||ch===']'){if(stack.at(-1)!==ch)return value;stack.pop()}
 }
 if(inString||!stack.length||stack.length>4)return value;
 return value+[...stack].reverse().join('')
}

'''
s=replace_once(s,anchor,helper+anchor,'model json closer helper')
old='''  const properties=insertMissingPropertyCommas(structural);
  if(properties!==structural)try{return JSON.parse(properties)}catch(error){lastError=error}
 }'''
new='''  const properties=insertMissingPropertyCommas(structural);
  if(properties!==structural)try{return JSON.parse(properties)}catch(error){lastError=error}
  const closed=closeUnfinishedModelJSON(properties);
  if(closed!==properties)try{return JSON.parse(closed)}catch(error){lastError=error}
 }'''
s=replace_once(s,old,new,'model json parse tail')
write(p,s)

# 4) App: import grounded travel target and commit deterministic safe fallbacks.
p=Path('app.js'); s=read(p)
s=s.replace('buildContextualActionSet,trustedSuggestionAssessment,suggestionPresentation,groundedSuggestionFailForward','buildContextualActionSet,trustedSuggestionAssessment,suggestionPresentation,groundedSuggestionFailForward,groundedTravelDestination')
anchor='function commitGroundedPickupFallback(state,plan,context={}){'
helper='''function commitGroundedTravelFallback(state,plan,context={}){
 if(context.roll?.success!==true||!(plan?.capabilities||[]).includes("MOVE_PLAYER"))return {applied:false};
 const current=String(state?.player?.location||state?.world?.state?.location||"");if(context.fromLocation&&current!==String(context.fromLocation))return {applied:false};
 const target=groundedTravelDestination(state,context.action,context.roll,context.intent||{});if(!target)return {applied:false};
 const operations=[];if((plan?.capabilities||[]).includes("REVEAL_ENTITY")&&target.id)operations.push({op:"REVEAL_ENTITY",kind:"location",id:String(target.id)});operations.push({op:"MOVE_PLAYER",location:String(target.name)});
 const effectivePlan={...plan,baseRevision:currentStateRevision(state)},patch={baseRevision:currentStateRevision(state),operations},committed=commitStatePatch(state,patch,effectivePlan,context);
 if(committed.applied)recordDebug("ENGINE_GROUNDED_TRAVEL_APPLIED",{action:String(context.action||"").slice(0,180),from:current,to:String(target.name),revision:committed.revision});
 return committed
}
'''
s=replace_once(s,anchor,helper+anchor,'app grounded travel helper')

# Grounded progression should also commit for successful ENGINE_ONLY progression suggestions.
old=''' const syncPlan={...planStateSync({action:effective,intent:assessment?.actionIntent||{},roll,snapshot:turnSnapshot,ruleEffects:actionResult.ruleEffects}),baseRevision};
 recordDebug("STATE_SYNC_PLAN",{action:effective,mode:syncPlan.mode,baseRevision,dirtyFlags:syncPlan.dirtyFlags,immediateCapabilities:syncPlan.immediateCapabilities,deferredCapabilities:syncPlan.deferredCapabilities,blocking:syncPlan.blocking});'''
new=''' const syncPlan={...planStateSync({action:effective,intent:assessment?.actionIntent||{},roll,snapshot:turnSnapshot,ruleEffects:actionResult.ruleEffects}),baseRevision};
 if(syncPlan.mode==="ENGINE_ONLY"&&roll?.success===true&&preboundFailForward){
  const groundedPlan={...syncPlan,capabilities:["DISCOVER_FACT"],immediateCapabilities:["DISCOVER_FACT"],baseRevision:currentStateRevision(gameState)},grounded=commitGroundedProgressionFallback(gameState,preboundFailForward,groundedPlan,{action:effective,roll});
  recordDebug("STATE_SYNC_ENGINE_ONLY_GROUNDED",{action:effective,applied:Boolean(grounded.applied),reused:Boolean(grounded.reused),revision:currentStateRevision(gameState)})
 }
 recordDebug("STATE_SYNC_PLAN",{action:effective,mode:syncPlan.mode,baseRevision,dirtyFlags:syncPlan.dirtyFlags,immediateCapabilities:syncPlan.immediateCapabilities,deferredCapabilities:syncPlan.deferredCapabilities,blocking:syncPlan.blocking});'''
s=replace_once(s,old,new,'engine only grounded progress')

# Record location before State AI; use deterministic travel fallback on failed/empty State Sync.
old='''  recordDebug("TURN_DUAL_AI_STARTED",{action:effective,directorMode:syncPlan.mode,transport:jobs.transport,playerActionTask:"scene_nonblocking",stateSyncTask:syncPlan.mode,baseRevision});
  const stateResult=await stateSyncResult;'''
new='''  recordDebug("TURN_DUAL_AI_STARTED",{action:effective,directorMode:syncPlan.mode,transport:jobs.transport,playerActionTask:"scene_nonblocking",stateSyncTask:syncPlan.mode,baseRevision});
  const locationBeforeSync=String(gameState.player?.location||gameState.world?.state?.location||"");
  const stateResult=await stateSyncResult;'''
s=replace_once(s,old,new,'state sync location baseline')

old='''   const pickup=commitGroundedPickupFallback(gameState,syncPlan,{action:effective,roll}),fallback=commitGroundedProgressionFallback(gameState,roll?.success===true?preboundFailForward:null,syncPlan,{action:effective,roll});
   recordDebug("STATE_SYNC_FAST_EMPTY_FALLBACK",{action:effective,revision:currentStateRevision(gameState),groundedProgress:Boolean(fallback.applied||fallback.reused),groundedPickup:Boolean(pickup.applied||pickup.reused)})'''
new='''   const travel=commitGroundedTravelFallback(gameState,syncPlan,{action:effective,roll,intent:assessment?.actionIntent,fromLocation:locationBeforeSync}),pickup=commitGroundedPickupFallback(gameState,syncPlan,{action:effective,roll}),fallback=commitGroundedProgressionFallback(gameState,roll?.success===true?preboundFailForward:null,{...syncPlan,baseRevision:currentStateRevision(gameState)},{action:effective,roll});
   recordDebug("STATE_SYNC_FAST_EMPTY_FALLBACK",{action:effective,revision:currentStateRevision(gameState),groundedProgress:Boolean(fallback.applied||fallback.reused),groundedPickup:Boolean(pickup.applied||pickup.reused),groundedTravel:Boolean(travel.applied)})'''
s=replace_once(s,old,new,'failed state sync grounded travel')

old='''    const pickup=!committed.applied&&roll?.success===true?commitGroundedPickupFallback(gameState,syncPlan,{action:effective,roll}):{applied:false},fallback=!committed.applied&&roll?.success===true?commitGroundedProgressionFallback(gameState,preboundFailForward,syncPlan,{action:effective,roll}):{applied:false};
    recordDebug("STATE_SYNC_AI_COMPLETED",{action:effective,directorMode:syncPlan.mode,elapsedMs:Date.now()-debugTurnStarted,transport:jobs.transport,operations:committed.operations??0,rejectedGrounding:committed.rejected??0,groundedProgress:Boolean(fallback.applied||fallback.reused),groundedPickup:Boolean(pickup.applied||pickup.reused),revision:currentStateRevision(gameState),rebased:committed.rebased===true})'''
new='''    const travel=roll?.success===true?commitGroundedTravelFallback(gameState,syncPlan,{action:effective,roll,intent:assessment?.actionIntent,fromLocation:locationBeforeSync}):{applied:false},pickup=!committed.applied&&roll?.success===true?commitGroundedPickupFallback(gameState,{...syncPlan,baseRevision:currentStateRevision(gameState)},{action:effective,roll}):{applied:false},fallback=!committed.applied&&roll?.success===true?commitGroundedProgressionFallback(gameState,preboundFailForward,{...syncPlan,baseRevision:currentStateRevision(gameState)},{action:effective,roll}):{applied:false};
    recordDebug("STATE_SYNC_AI_COMPLETED",{action:effective,directorMode:syncPlan.mode,elapsedMs:Date.now()-debugTurnStarted,transport:jobs.transport,operations:committed.operations??0,rejectedGrounding:committed.rejected??0,groundedProgress:Boolean(fallback.applied||fallback.reused),groundedPickup:Boolean(pickup.applied||pickup.reused),groundedTravel:Boolean(travel.applied),revision:currentStateRevision(gameState),rebased:committed.rebased===true})'''
s=replace_once(s,old,new,'successful state sync grounded travel')
write(p,s)

# 5) Release version/cache root.
for path,old,new in [
 ('src/version.js','APP_VERSION="0.54.15"','APP_VERSION="0.54.16"'),
 ('package.json','"version": "0.54.15"','"version": "0.54.16"'),
 ('index.html','app.js?v=54015','app.js?v=54016'),
 ('api/health.js','version:"0.54.15"','version:"0.54.16"')]:
    p=Path(path); x=read(p); x=replace_once(x,old,new,path); write(p,x)
# all root browser imports move together
p=Path('app.js'); s=read(p).replace('?v=54015','?v=54016'); write(p,s)
# browser importers of modified action-intent
for path in ['src/turn-outcome.js']:
    p=Path(path); x=read(p).replace('action-intent.js?v=54008','action-intent.js?v=54016'); write(p,x)

# 6) Tests matching the exact v0.54.15 findings.
test='''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {inferActionKind} from "../src/action-intent.js";
import {groundedTravelDestination} from "../src/contextual-actions.js";
import {parseModelJSON} from "../src/model-json.js";

test("v0.54.16 travel semantics beat abandoned social clauses and embedded observation",()=>{
 assert.equal(inferActionKind("閉上眼睛，依靠嗅覺追蹤那股金屬味最濃的方向，謹慎地踏出碎石堆，嘗試尋找味道的源頭。"),"TRAVEL");
 assert.equal(inferActionKind("不再繼續追問引路人的問題，轉身跟上他急促的步伐，朝斷崖谷邊緣指定的深處前進"),"TRAVEL");
 assert.equal(inferActionKind("停止繼續詢問，轉而以實體移動來測試，沿著引路人所指的擴散方向，小心踏出一步"),"TRAVEL");
 assert.equal(inferActionKind("走到守衛面前詢問他出口在哪"),"SOCIAL");
});

test("v0.54.16 grounded travel only resolves a unique or explicitly named adjacent canon destination",()=>{
 const a={id:"L-A",name:"起點",known:true},b={id:"L-B",name:"裂隙觀測台",known:false,accessRequirements:[]},c={id:"L-C",name:"山門",known:false,accessRequirements:[]};
 const state={player:{location:"起點"},world:{state:{location:"起點"},registry:{locations:[a,b]},travel:{routes:[{id:"R1",fromId:"L-A",toId:"L-B",open:true}]}}};
 assert.equal(groundedTravelDestination(state,"沿著指定方向前進",{success:true},{kind:"TRAVEL",intent:"TRAVEL"})?.name,"裂隙觀測台");
 state.world.registry.locations.push(c);state.world.travel.routes.push({id:"R2",fromId:"L-A",toId:"L-C",open:true});
 assert.equal(groundedTravelDestination(state,"沿著指定方向前進",{success:true},{kind:"TRAVEL",intent:"TRAVEL"}),null);
 assert.equal(groundedTravelDestination(state,"前往裂隙觀測台",{success:true},{kind:"TRAVEL",intent:"TRAVEL"})?.name,"裂隙觀測台");
 assert.equal(groundedTravelDestination(state,"前往裂隙觀測台",{success:false},{kind:"TRAVEL",intent:"TRAVEL"}),null);
});

test("v0.54.16 model JSON repairs only unfinished tail closers",()=>{
 assert.deepEqual(parseModelJSON('{"sceneTitle":"測試","suggestions":[{"label":"前進","requirementsSatisfied":true}]'),{sceneTitle:"測試",suggestions:[{label:"前進",requirementsSatisfied:true}]});
 assert.throws(()=>parseModelJSON('{"worldBible":{"era":"潮紀",,"tone":"灰暗"}}'),/INVALID_MODEL_JSON/);
});

test("v0.54.16 app commits grounded progression for ENGINE_ONLY and grounded travel after empty State Sync",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/STATE_SYNC_ENGINE_ONLY_GROUNDED/);
 assert.match(app,/function commitGroundedTravelFallback/);
 assert.match(app,/ENGINE_GROUNDED_TRAVEL_APPLIED/);
 assert.match(app,/locationBeforeSync/);
 assert.match(app,/groundedTravel:Boolean\(travel\.applied\)/);
});
'''
write(Path('test/v05416-regressions.test.js'),test)

# Release-contract tests only; preserve historical cache tokens used by unchanged internals.
for path in ['test/version-ui.test.js','test/ai-settings.test.js']:
    p=Path(path); x=read(p).replace('0.54.15','0.54.16').replace('54015','54016'); write(p,x)
p=Path('test/module-cache.test.js'); x=read(p)
x=x.replace('v0.54.15','v0.54.16').replace('app\\.js\\?v=54015','app\\.js\\?v=54016').replace('x==="54015"','x==="54016"')
# Keep 54015 in internal allowlists and add 54016.
x=x.replace('["54012","54013","54015"]','["54012","54013","54015","54016"]')
# Explicit changed edges.
x=x.replace('action-intent\\.js\\?v=54008','action-intent\\.js\\?v=54016')
write(p,x)

# README release note.
p=Path('README.md'); s=read(p)
if '### v0.54.16 — Grounded Travel & Progress Recovery' not in s:
    s+='''\n\n### v0.54.16 — Grounded Travel & Progress Recovery\n\n- 修正複合行動中的 TRAVEL 語義：`停止詢問／不再追問` 後實際離開或前進，不再因舊社交字詞被錯分為 SOCIAL；同地點觀察仍保持 OBSERVE。\n- 成功 TRAVEL 若行動明確點名相鄰 Canon 地點，或當前只有唯一一條可通行相鄰 Canon 路線，Engine 會在 State Sync 空回應／失敗時安全落實移動；多出口時絕不替玩家猜路。\n- 成功且標記 progression 的預驗證行動，即使 State Sync 判定 ENGINE_ONLY，也會把既有 Location／Event／NPC affordance 轉成 grounded Knowledge，避免只有 Scene 敘事而 state fingerprint 長期不變。\n- Model JSON parser 可安全補回最多四層「只缺尾端 closing brace/bracket」的截斷輸出；內部結構錯誤仍然拒絕。\n'''
write(p,s)

print('v0.54.16 patch applied')
