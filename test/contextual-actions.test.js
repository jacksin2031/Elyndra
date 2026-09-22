import test from "node:test";
import assert from "node:assert/strict";
import {buildContextualActionSet,trustedSuggestionAssessment,suggestionPresentation,normalizeContextualSuggestion,groundedSuggestionFailForward} from "../src/contextual-actions.js";

function state(overrides={}){
 return {
  world:{id:"WORLD-1",state:{day:3},registry:{locations:[{id:"L1",name:"舊城",known:true}],npcs:[{id:"N1",name:"守衛",known:true,alive:true,locationId:"L1"}],sideQuests:[]},creation:{blueprint:{difficulty:"normal"}}},
  player:{location:"舊城",status:"ACTIVE",difficulty:"normal",skills:{OBSERVE:3,SOCIAL:1,TRAVEL:0,RISKY:0},magic:{knownSpells:[]}},
  quests:{main:{title:"追查失蹤事件",objectives:["找出昨晚失蹤者最後出現的位置"],status:"ACTIVE"}},
  events:[],
  ...overrides
 }
}

test("contextual action set always has three primary suggestions and one progression route",()=>{
 const s=state();
 const set=buildContextualActionSet(s,[
  {label:"先觀察附近有沒有守衛",action:"觀察巷口與屋頂有沒有守衛",kind:"OBSERVE",risk:"LOW",approach:"STEADY",requirementsSatisfied:true,causalBasis:"巷口可見"},
  {label:"製造一點聲響引開注意",action:"利用附近雜物製造聲響，再觀察誰先反應",kind:"GENERAL",risk:"MEDIUM",approach:"CREATIVE",requirementsSatisfied:true,causalBasis:"附近有可利用雜物"},
  {label:"直接翻過後牆",action:"趁空隙直接翻過後牆進入院內",kind:"RISKY",risk:"HIGH",approach:"BOLD",requirementsSatisfied:true,causalBasis:"後牆可攀越"}
 ]);
 assert.equal(set.primary.length,3);
 assert.ok(set.primary.some(x=>x.progression===true));
 assert.equal(set.highRisk.length,1);
 assert.equal(set.highRisk[0].risk,"HIGH");
 assert.ok(set.all.every(x=>x.prevalidated===true));
 assert.ok(set.primary.every(x=>!["HIGH","EXTREME"].includes(x.risk)))
});

test("AI progression suggestion is preserved and Engine does not add a generic replacement",()=>{
 const s=state(),set=buildContextualActionSet(s,[
  {label:"沿著血跡找失蹤者",action:"沿著地面血跡追查失蹤者最後移動方向",kind:"OBSERVE",risk:"MEDIUM",approach:"STEADY",progression:true,requirementsSatisfied:true,causalBasis:"地面血跡已被玩家看到"},
  {label:"問守衛昨晚誰進過巷子",action:"向守衛詢問昨晚進出巷子的人",kind:"SOCIAL",risk:"LOW",approach:"SOCIAL",requirementsSatisfied:true,causalBasis:"守衛在場"},
  {label:"繞到屋後找另一個入口",action:"沿外牆繞到屋後尋找不顯眼入口",kind:"TRAVEL",risk:"MEDIUM",approach:"CREATIVE",requirementsSatisfied:true,causalBasis:"屋外可繞行"},
  {label:"直接撞開後門",action:"直接撞開後門進入屋內",kind:"RISKY",risk:"HIGH",approach:"BOLD",requirementsSatisfied:true,causalBasis:"後門可直接接觸"}
 ]);
 assert.ok(set.primary.some(x=>x.label==="沿著血跡找失蹤者"&&x.progression));
});


test("high-risk progression never replaces the required primary progression route",()=>{
 const s=state(),set=buildContextualActionSet(s,[
  {label:"直接闖入禁區找人",action:"直接闖入禁區追查失蹤者",kind:"RISKY",risk:"HIGH",approach:"BOLD",progression:true,requirementsSatisfied:true,causalBasis:"禁區入口就在眼前"},
  {label:"先看入口有誰值守",action:"觀察禁區入口值守與人流",kind:"OBSERVE",risk:"LOW",approach:"STEADY",requirementsSatisfied:true,causalBasis:"入口可見"}
 ]);
 assert.ok(set.primary.some(x=>x.progression===true));
 assert.ok(set.primary.every(x=>!["HIGH","EXTREME"].includes(x.risk)));
 assert.ok(set.highRisk.some(x=>x.label==="直接闖入禁區找人"))
});

test("legacy string suggestions are not trusted as AI causal validation",()=>{
 const s=state(),set=buildContextualActionSet(s,["探索","對話","繼續"]);
 assert.equal(set.primary.length,3);
 assert.ok(set.all.every(x=>x.source==="ENGINE"));
 assert.ok(set.all.every(x=>x.prevalidated===true))
});

test("prevalidated suggested action skips AI feasibility while its scene seal remains current",()=>{
 const s=state(),row=buildContextualActionSet(s,[{label:"問守衛昨晚發生甚麼",action:"向守衛詢問昨晚巷子發生的異常",kind:"SOCIAL",risk:"LOW",approach:"SOCIAL",requirementsSatisfied:true,causalBasis:"守衛就在現場"}]).all.find(x=>x.label==="問守衛昨晚發生甚麼");
 const assessment=trustedSuggestionAssessment(s,row);
 assert.equal(assessment.verdict,"ALLOW");
 assert.equal(assessment.source,"AI_SUGGESTION_PREVALIDATED");
 assert.equal(assessment.confidence,96);
 assert.ok(assessment.actionIntent)
});


test("internal background events do not invalidate a prevalidated action button",()=>{
 const s=state(),row=buildContextualActionSet(s,[{
  label:"沿著血跡繼續追查",action:"沿著眼前血跡追查下一個轉角",kind:"OBSERVE",risk:"LOW",approach:"STEADY",
  progression:true,requirementsSatisfied:true,causalBasis:"玩家目前看得到血跡"
 }]).all.find(x=>x.label==="沿著血跡繼續追查");
 assert.ok(row);
 assert.ok(trustedSuggestionAssessment(s,row));
 s.events.push({id:"BG-1",type:"WORLD_EVOLUTION_BACKGROUND_STARTED",visibility:"INTERNAL"});
 const assessment=trustedSuggestionAssessment(s,row);
 assert.equal(assessment?.source,"AI_SUGGESTION_PREVALIDATED");
 assert.equal(buildContextualActionSet(s,[row]).all.some(x=>x.label==="沿著血跡繼續追查"),true)
});

test("scene seal expires locally and refresh never renews the stale AI suggestion",()=>{
 const s=state(),row=buildContextualActionSet(s,[{
  label:"沿著血跡繼續追查",action:"沿著眼前血跡追查下一個轉角",kind:"OBSERVE",risk:"LOW",approach:"STEADY",
  progression:true,requirementsSatisfied:true,causalBasis:"玩家目前看得到血跡"
 }]).all.find(x=>x.label==="沿著血跡繼續追查");
 assert.ok(row);
 assert.ok(trustedSuggestionAssessment(s,row));
 const originalSeal=structuredClone(row.validatedContext);
 s.events.push({id:"E1",type:"WORLD_EVENT"});
 assert.equal(trustedSuggestionAssessment(s,row),null);
 const refreshed=buildContextualActionSet(s,[row]);
 assert.equal(refreshed.all.some(x=>x.label==="沿著血跡繼續追查"),false);
 assert.ok(refreshed.all.every(x=>x.source==="ENGINE"));
 assert.deepEqual(row.validatedContext,originalSeal)
});

test("requirementsSatisfied false candidates are never exposed as buttons",()=>{
 const s=state(),set=buildContextualActionSet(s,[{label:"用不存在的鑰匙開門",action:"用銀鑰匙開門",kind:"GENERAL",risk:"LOW",requirementsSatisfied:false,causalBasis:"缺少鑰匙"}]);
 assert.equal(set.all.some(x=>x.label.includes("不存在的鑰匙")),false)
});

test("suggestions do not decide player personality or values",()=>{
 assert.equal(normalizeContextualSuggestion({label:"原諒她",action:"我決定原諒她",kind:"SOCIAL",risk:"LOW"}),null);
 assert.ok(normalizeContextualSuggestion({label:"聽她解釋",action:"聽她把事情解釋完再追問矛盾之處",kind:"SOCIAL",risk:"LOW"}))
});

test("difficulty controls secondary information without changing the action",()=>{
 const s=state(),row=normalizeContextualSuggestion({label:"翻過倒塌的圍牆",action:"翻過倒塌圍牆",kind:"RISKY",risk:"MEDIUM",skillHint:"敏捷",consequenceHint:"可能受傷"});
 assert.match(suggestionPresentation(s,row).meta,/敏捷/);
 s.player.difficulty="hard";
 assert.equal(suggestionPresentation(s,row).meta,"有風險");
 s.player.difficulty="realistic";
 assert.equal(suggestionPresentation(s,row).meta,"")
});

test("experienced characters receive build-specific suggestions",()=>{
 const s=state(),set=buildContextualActionSet(s,[]);
 assert.ok(set.primary.some(x=>/熟練|觀察經驗/.test(x.label+" "+x.action)))
});


test("recently executed fallback actions are not immediately recycled as fresh choices",()=>{
 const repeated="利用舊城現有的人流、遮蔽物或聲音製造一個小干擾，藉機觀察誰會對異常作出反應";
 const s=state({events:[
  {id:"CP-1",type:"SESSION_CHECKPOINT",visibility:"PLAYER_KNOWN",summary:"旅程小結：剛才只是再次觀察同一處"},
  {id:"PA-1",type:"PLAYER_ACTION",visibility:"PLAYER_KNOWN",customText:repeated,originalAction:repeated}
 ]});
 const set=buildContextualActionSet(s,[]);
 assert.equal(set.all.some(x=>x.action===repeated),false);
 assert.equal(set.all.some(x=>(x.action||"").includes("旅程小結")),false)
});


test("Engine reclassifies misleading GENERAL suggestion metadata before prevalidation",()=>{
 const s=state(),action="利用舊城可見的遮蔽物、人流或聲音，測試誰會作出反應";
 const row=buildContextualActionSet(s,[{label:"換角度測試",action,kind:"GENERAL",risk:"MEDIUM",approach:"CREATIVE",requirementsSatisfied:true,causalBasis:"只使用當前可見環境"}]).all.find(x=>x.action===action);
 assert.ok(row);const assessment=trustedSuggestionAssessment(s,row);
 assert.equal(assessment.kind,"OBSERVE");assert.equal(assessment.actionIntent.kind,"OBSERVE");assert.equal(assessment.source,"AI_SUGGESTION_ENGINE_RECLASSIFIED");assert.equal(assessment.confidence,90)
});

test("successful progression fail-forward is bound only to an existing observable source",()=>{
 const s=state({events:[{id:"EV-1",type:"WORLD_EVENT",visibility:"OBSERVABLE",summary:"遠近聲音次序出現異常"}]});
 const row=buildContextualActionSet(s,[{label:"追查聲音異常",action:"沿著聲音異常留下的痕跡繼續觀察",kind:"OBSERVE",risk:"LOW",approach:"STEADY",progression:true,requirementsSatisfied:true,causalBasis:"異常事件已被玩家看到"}]).all.find(x=>x.label==="追查聲音異常");
 assert.ok(row?.affordance);const d=groundedSuggestionFailForward(s,row,{success:true});
 assert.equal(d.sourceKind,"EVENT");assert.equal(d.sourceId,"EV-1");assert.match(d.text,/聲音次序/);
 assert.equal(groundedSuggestionFailForward(s,row,{success:false}),null)
});
