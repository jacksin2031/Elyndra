from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def once(path,old,new,label):
    text=path.read_text(encoding='utf-8')
    n=text.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    path.write_text(text.replace(old,new,1),encoding='utf-8')

def bump():
    paths=[ROOT/'app.js',ROOT/'index.html',ROOT/'package.json',*sorted((ROOT/'src').glob('*.js')),*sorted((ROOT/'test').glob('*.test.js'))]
    for path in paths:
        if path.exists():
            text=path.read_text(encoding='utf-8').replace('0.57.14','0.57.15').replace('57014','57015')
            path.write_text(text,encoding='utf-8')

def patch_contextual():
    path=ROOT/'src/contextual-actions.js'
    old='export function buildContextualActionSet(state,input=[]){\n const recent=recentPlayerActions(state),isFresh=x=>freshSuggestion(recent,x);'
    new=r'''function suggestionExclusionSet(rows=[]){
 const out=new Set();
 for(const row of Array.isArray(rows)?rows:[]){
  if(typeof row==="string"){const v=clean(row,180);if(v)out.add(v);continue}
  if(!row||typeof row!=="object")continue;
  for(const value of [row.action,row.label,row.originalAction,row.customText]){const v=clean(value,180);if(v)out.add(v)}
 }
 return out
}
function reachableKnownLocations(state){
 const locations=Array.isArray(state?.world?.registry?.locations)?state.world.registry.locations:[],currentName=String(state?.player?.location||state?.world?.state?.location||""),current=locations.find(x=>x?.name===currentName||x?.id===currentName);
 if(!current)return [];
 const byId=new Map(locations.filter(x=>x?.known===true).map(x=>[String(x.id||""),x])),routes=Array.isArray(state?.world?.travel?.routes)?state.world.travel.routes:[],out=[];
 for(const route of routes){
  if(!route||route.open===false)continue;let id="";
  if(String(route.fromId||"")===String(current.id||""))id=String(route.toId||"");else if(String(route.toId||"")===String(current.id||""))id=String(route.fromId||"");else continue;
  const target=byId.get(id);if(!target||target===current||Array.isArray(target.accessRequirements)&&target.accessRequirements.length)continue;
  if(!out.some(x=>String(x.id||"")===String(target.id||"")))out.push(target)
 }
 return out.slice(0,5)
}
function suggestionRefreshCandidates(state){
 const rows=[],loc=currentLocation(state),objective=clean(state.quests?.main?.aiHint||state.quests?.main?.objectives?.[0],100),event=recentVisibleEvent(state);
 if(event?.summary)rows.push(normalizeContextualSuggestion({label:`換一條線索追查「${clean(event.summary,40)}」`,action:`停止沿用上一批建議，從最近已知事件「${clean(event.summary,100)}」的另一個可觀察影響重新追查一項具體證據`,kind:"OBSERVE",risk:"LOW",approach:"STEADY",progression:true,causalBasis:"最近玩家已知事件仍有不同角度可直接追查",requirementsSatisfied:true,source:"ENGINE"}));
 else if(objective)rows.push(normalizeContextualSuggestion({label:"從另一個可驗證角度推進目前目標",action:`在${loc}避開剛才的做法，改從另一個可直接觀察的跡象驗證「${objective}」下一步`,kind:"OBSERVE",risk:"LOW",approach:"STEADY",progression:true,causalBasis:"目前主線目標仍未完成且當前場景可觀察",requirementsSatisfied:true,source:"ENGINE"}));
 for(const target of reachableKnownLocations(state))rows.push(normalizeContextualSuggestion({label:`改往「${clean(target.name,50)}」尋找新線索`,action:`沿已確認可通行路線前往「${clean(target.name,70)}」，到達後先確認當地與目前目標直接相關的可見變化`,kind:"TRAVEL",risk:"LOW",approach:"STEADY",targetId:String(target.id||""),progression:Boolean(objective),causalBasis:"該地點已知且與目前位置之間存在開放路線",requirementsSatisfied:true,source:"ENGINE"}));
 for(const npc of presentNpcs(state))rows.push(normalizeContextualSuggestion({label:`換個問題詢問${clean(npc.name,50)}`,action:`向${clean(npc.name,50)}改問一項尚未重複、而且對方可憑親身觀察回答的具體細節`,kind:"SOCIAL",risk:"LOW",approach:"SOCIAL",targetId:String(npc.id||""),progression:Boolean(objective),causalBasis:"NPC 目前在可互動範圍內",requirementsSatisfied:true,source:"ENGINE"}));
 for(const item of inventoryRows(state).slice(0,4)){
  const name=clean(item?.name||item?.id,50),id=clean(item?.id||item?.name,100);if(!name||!id)continue;
  rows.push(normalizeContextualSuggestion({label:`重新檢查「${name}」能提供甚麼線索`,action:`取出「${name}」，只根據目前已知用途與可見特徵檢查它是否能協助判斷眼前局勢，不消耗或交出物品`,kind:"OBSERVE",risk:"LOW",approach:"CREATIVE",requiredItemIds:[id],causalBasis:"物品目前確實在玩家持有清單內",requirementsSatisfied:true,source:"ENGINE"}))
 }
 rows.push(normalizeContextualSuggestion({label:"改查場景中先前忽略的細節",action:`在${loc}刻意避開上一批建議所指向的位置與對象，檢查另一處可直接看到的出入口、痕跡或環境變化`,kind:"OBSERVE",risk:"LOW",approach:"STEADY",progression:Boolean(objective),causalBasis:"當前場景仍可直接觀察",requirementsSatisfied:true,source:"ENGINE"}));
 rows.push(normalizeContextualSuggestion({label:"用不同方式測試現場反應",action:`只利用${loc}目前可見的人流、聲音或遮蔽物，以不消耗未知資源的另一種方式測試環境反應`,kind:"GENERAL",risk:"MEDIUM",approach:"CREATIVE",causalBasis:"只使用玩家目前可直接感知的環境",requirementsSatisfied:true,source:"ENGINE"}));
 return uniq(rows.filter(Boolean),20)
}
export function buildContextualActionSet(state,input=[],options={}){
 const recent=recentPlayerActions(state),excluded=suggestionExclusionSet(options?.exclude),isFresh=x=>freshSuggestion(recent,x)&&!excluded.has(clean(x?.action,180))&&!excluded.has(clean(x?.label,180));'''
    once(path,old,new,'contextual build signature')
    old2=' return {primary:selected.filter(x=>!["HIGH","EXTREME"].includes(x.risk)).slice(0,3),highRisk:selected.filter(x=>["HIGH","EXTREME"].includes(x.risk)).slice(0,1),all:selected}\n}\nfunction trustedSuggestionHasKnownDestination'
    new2=r''' return {primary:selected.filter(x=>!["HIGH","EXTREME"].includes(x.risk)).slice(0,3),highRisk:selected.filter(x=>["HIGH","EXTREME"].includes(x.risk)).slice(0,1),all:selected}
}
export function regenerateContextualActionSet(state,{exclude=[]}={}){
 const set=buildContextualActionSet(state,suggestionRefreshCandidates(state),{exclude}),primary=set.primary.filter(x=>x?.prevalidated===true&&evaluateSuggestionRequirements(state,x).ok).slice(0,3);
 return {primary,highRisk:[],all:primary}
}
function trustedSuggestionHasKnownDestination'''
    once(path,old2,new2,'contextual regenerate export')

def patch_app():
    path=ROOT/'app.js'
    once(path,'import {buildContextualActionSet,trustedSuggestionAssessment,suggestionPresentation,groundedSuggestionFailForward,groundedTravelDestination} from "./src/contextual-actions.js?v=57015";','import {buildContextualActionSet,regenerateContextualActionSet,trustedSuggestionAssessment,suggestionPresentation,groundedSuggestionFailForward,groundedTravelDestination} from "./src/contextual-actions.js?v=57015";','app import')
    once(path,'const playerActionFlight={active:false,label:"",startedAt:0};','const playerActionFlight={active:false,label:"",startedAt:0};\nconst suggestionRefresh={message:"",error:false,rejected:[],exclude:[]};','refresh state')
    old='function renderSuggestions(){\n const box=$("#choices");if(!box)return;'
    new=r'''function rememberRejectedSuggestion(action){
 const value=String(action||"").trim();if(!value)return;
 suggestionRefresh.rejected=[...suggestionRefresh.rejected.filter(x=>x!==value),value].slice(-8)
}
function refreshSuggestedActions(){
 if(!gameState||gameState.combat?.active||aiBusy||turnSyncBusy||playerActionFlight.active)return;
 const previousIntents=structuredClone(gameState.suggestionIntents||[]),previousSuggestions=[...(gameState.suggestions||[])],exclude=[...previousIntents,...previousSuggestions.map(x=>({label:String(x||""),action:String(x||"")})),...suggestionRefresh.rejected.map(x=>({label:x,action:x}))];
 try{
  const set=regenerateContextualActionSet(gameState,{exclude});
  if(set.primary.length!==3)throw new Error("SUGGESTION_REFRESH_INSUFFICIENT");
  gameState.suggestionIntents=set.all;gameState.suggestions=set.all.map(x=>x.label);suggestionRefresh.exclude=exclude;suggestionRefresh.error=false;suggestionRefresh.message="已重新產生 3 個新的可執行建議。";
  recordDebug("SUGGESTIONS_REFRESHED",{count:set.primary.length,excluded:exclude.length,location:gameState.player?.location||""})
 }catch(error){
  gameState.suggestionIntents=previousIntents;gameState.suggestions=previousSuggestions;suggestionRefresh.exclude=[];suggestionRefresh.error=true;suggestionRefresh.message="未能產生 3 個新的可執行建議；已保留原本建議。";
  recordDebug("SUGGESTIONS_REFRESH_FAILED",{error:error?.message||String(error),preserved:previousSuggestions.length})
 }
 renderSuggestions()
}
function renderSuggestions(){
 const box=$("#choices");if(!box)return;'''
    once(path,old,new,'render helper')
    once(path,'const source=(gameState?.suggestionIntents?.length?gameState.suggestionIntents:(gameState?.suggestions?.length?gameState.suggestions:fallbackActionButtons())),set=buildContextualActionSet(gameState,source);','const source=(gameState?.suggestionIntents?.length?gameState.suggestionIntents:(gameState?.suggestions?.length?gameState.suggestions:fallbackActionButtons())),set=buildContextualActionSet(gameState,source,{exclude:suggestionRefresh.exclude});','render exclusion')
    old_html='box.innerHTML=`<div class="action-group main-actions"><div class="action-group-title">主要建議</div><div class="action-grid">${set.primary.map(card).join("")}</div></div>${set.highRisk.length?`<div class="action-group risk-actions"><div class="action-group-title">高風險行動</div><div class="action-grid risk-grid">${set.highRisk.map(card).join("")}</div></div>`:""}<div class="action-group free-choice"><div class="action-group-title">自由行動</div><button type="button" id="otherActionBtn" class="other-action-btn">我想做其他事情…</button></div>`;'
    new_html='box.innerHTML=`<div class="action-group main-actions"><div class="action-group-title">主要建議</div><div class="action-grid">${set.primary.map(card).join("")}</div><div class="settings-actions"><button type="button" id="refreshSuggestionsBtn" class="secondary">↻ 重新產生建議行動</button><small id="suggestionRefreshStatus" class="muted" role="${suggestionRefresh.error?"alert":"status"}" aria-live="polite">${esc(suggestionRefresh.message)}</small></div></div>${set.highRisk.length?`<div class="action-group risk-actions"><div class="action-group-title">高風險行動</div><div class="action-grid risk-grid">${set.highRisk.map(card).join("")}</div></div>`:""}<div class="action-group free-choice"><div class="action-group-title">自由行動</div><button type="button" id="otherActionBtn" class="other-action-btn">我想做其他事情…</button></div>`;'
    once(path,old_html,new_html,'refresh UI')
    once(path,'box.querySelectorAll("[data-suggestion-index]").forEach(b=>b.onclick=()=>{const x=set.all[Number(b.dataset.suggestionIndex)];if(x)runAction("free",x.action,{suggestion:x})});\n $("#otherActionBtn")?.addEventListener','box.querySelectorAll("[data-suggestion-index]").forEach(b=>b.onclick=()=>{const x=set.all[Number(b.dataset.suggestionIndex)];if(x)runAction("free",x.action,{suggestion:x})});\n $("#refreshSuggestionsBtn")?.addEventListener("click",refreshSuggestedActions);\n $("#otherActionBtn")?.addEventListener','refresh listener')
    once(path,'if(!gameState)return;const actionState=gameState,actionSession=captureStateSession();markForegroundActivity();preemptBackgroundAI();','if(!gameState)return;suggestionRefresh.exclude=[];suggestionRefresh.message="";suggestionRefresh.error=false;const actionState=gameState,actionSession=captureStateSession();markForegroundActivity();preemptBackgroundAI();','clear refresh on action')
    once(path,' if(actionResult.blocked||actionResult.deterministic){',' if(actionResult.blocked)rememberRejectedSuggestion(effective);\n if(actionResult.blocked||actionResult.deterministic){','remember rejection')

def add_test():
    (ROOT/'test'/'v05715-suggestion-refresh.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {regenerateContextualActionSet} from "../src/contextual-actions.js";

function baseState(overrides={}){
 const state={world:{id:"W1",state:{day:2,location:"起點"},travel:{routes:[{id:"R1",fromId:"L1",toId:"L2",open:true}]},registry:{locations:[{id:"L1",name:"起點",known:true},{id:"L2",name:"河岸",known:true},{id:"L3",name:"封閉塔樓",known:true}],npcs:[{id:"N1",name:"巡路人",known:true,alive:true,locationId:"L1"}],sideQuests:[]},creation:{blueprint:{difficulty:"normal"}}},player:{location:"起點",status:"ACTIVE",difficulty:"normal",skills:{OBSERVE:0,SOCIAL:0,TRAVEL:0,RISKY:0},magic:{knownSpells:[]}},quests:{main:{title:"找出異常來源",objectives:["確認河谷異常的可驗證來源"],status:"ACTIVE"}},inventory:[{id:"I1",name:"觀測筆記",quantity:1,category:"DOCUMENT"}],events:[],suggestions:[],suggestionIntents:[]};
 return Object.assign(state,overrides)
}

test("suggestion refresh returns exactly three grounded alternatives without mutating world state",()=>{
 const s=baseState(),before=structuredClone(s),old=[{label:"舊建議",action:"在起點觀察同一塊石頭"}],set=regenerateContextualActionSet(s,{exclude:old});
 assert.equal(set.primary.length,3);assert.equal(set.all.length,3);assert.equal(set.highRisk.length,0);assert.equal(new Set(set.all.map(x=>x.action)).size,3);assert.ok(set.all.every(x=>x.prevalidated===true&&x.requirementsSatisfied===true));assert.equal(set.all.some(x=>x.action===old[0].action||x.label===old[0].label),false);assert.deepEqual(s,before)
});

test("refresh candidates use only reachable locations, present NPCs and owned items",()=>{
 const routeOnly=baseState({quests:{main:{objectives:[],status:"ACTIVE"}},inventory:[]});routeOnly.world.registry.npcs=[];const travel=regenerateContextualActionSet(routeOnly).all.find(x=>x.kind==="TRAVEL");assert.equal(travel?.targetId,"L2");assert.match(travel?.action||"",/河岸/);assert.doesNotMatch(travel?.action||"",/封閉塔樓/);
 const npcOnly=baseState({quests:{main:{objectives:[],status:"ACTIVE"}},inventory:[]});npcOnly.world.travel.routes=[];const social=regenerateContextualActionSet(npcOnly).all.find(x=>x.kind==="SOCIAL");assert.equal(social?.targetId,"N1");assert.match(social?.action||"",/巡路人/);
 const itemOnly=baseState({quests:{main:{objectives:[],status:"ACTIVE"}}});itemOnly.world.travel.routes=[];itemOnly.world.registry.npcs=[];const item=regenerateContextualActionSet(itemOnly).all.find(x=>(x.requiredItemIds||[]).includes("I1"));assert.ok(item);assert.match(item.action,/觀測筆記/)
});

test("UI refresh preserves free action and does not execute or advance a turn",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),start=app.indexOf("function refreshSuggestedActions"),end=app.indexOf("function renderSuggestions",start),block=app.slice(start,end);
 assert.ok(start>=0&&end>start);assert.match(app,/id="refreshSuggestionsBtn"/);assert.match(app,/重新產生建議行動/);assert.match(app,/id="otherActionBtn"/);assert.match(block,/previousIntents=structuredClone/);assert.match(block,/已保留原本建議/);assert.match(block,/gameState\.suggestionIntents=previousIntents/);
 for(const forbidden of ["runAction(","performAction(","combatAction(","bumpStateRevision(","persist(","advanceTime("])assert.equal(block.includes(forbidden),false,forbidden)
});

test("rejected action is remembered for the next refresh exclusion set",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.match(app,/if\(actionResult\.blocked\)rememberRejectedSuggestion\(effective\)/);assert.match(app,/suggestionRefresh\.rejected/);assert.match(app,/regenerateContextualActionSet\(gameState,\{exclude\}\)/)
});
''',encoding='utf-8')

def main():
    bump();patch_contextual();patch_app();add_test()

if __name__=='__main__': main()
