import {d20} from "./world-engine.js?v=59014";
import {buildActionCheck,trainActionSkill,ensureCheckProfile} from "./check-engine.js?v=60004";
import {advanceTime,ensureClock} from "./world-clock.js?v=57025";
import {tickWorld} from "./world-simulation.js?v=57028";
import {ensureSurvival,tickSurvival,survivalActionGate} from "./survival-engine.js?v=57025";
import {applyCultureAction} from "./culture-engine.js?v=57025";
import {resolveEconomyAction} from "./economy-engine.js?v=57025";
import {resolveMagicAction,recoverMagic} from "./magic-engine.js?v=57025";
import {tickMainQuest,evaluateQuestState} from "./quest-engine.js?v=59014";
import {exploreDungeon} from "./dungeon-engine.js?v=57025";
import {resolveTalentAction} from "./talent-engine.js?v=60004";
import {buildResolutionOutcome} from "./resolution-engine.js?v=60000";
import {mitigateTravelFailureWithTalent,useImprovisedToolTalent} from "./talent-rules.js?v=60004";
import {resolveItemAction,ensureItemRuntime} from "./item-engine.js?v=59014";
import {findTravelPlan,locationAccessStatus,travelTo} from "./travel-engine.js?v=57025";
import {isNpcPresent} from "./world-registry.js?v=57025";
import {markEntityObserved} from "./visibility-lock.js?v=57025";
import {playerVisibleLocationName} from "./player-location-visibility.js?v=57025";
import {playerVisibleNpcName} from "./player-entity-visibility.js?v=57029";
import {adjustNpcRelationship} from "./npc-cognition.js?v=57025";
const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const AMBIGUOUS_MUTATION=/(?:不想|不要|不打算|不會|別|並非要|不是要|沒有要|無意|如果|假如|若果|若|除非|是否|能否|可否|要不要|[?？]|[「」『』])/i;
function explicitMutationCommand(value){const q=clean(value,180);return Boolean(q)&&!AMBIGUOUS_MUTATION.test(q)}
function explicitRestCommand(value){const q=clean(value,180);return explicitMutationCommand(q)&&/^(?:請)?(?:休息|睡眠|睡覺|紮營|露營|rest|sleep|camp)(?:一下|一會兒|一陣|吧)?[。.!！]?$/i.test(q)}
function explicitTravelCommand(value,name){const q=clean(value,180),target=clean(name,120);if(!target||!explicitMutationCommand(q))return false;const normalized=q.replace(/[「」『』"']/g,"").replace(/[。.!！]+$/g,"").trim(),lower=normalized.toLowerCase(),t=target.toLowerCase();return normalized===`前往${target}`||normalized===`移動到${target}`||normalized===`走到${target}`||normalized===`去${target}`||normalized===`請前往${target}`||lower===`travel to ${t}`||lower===`go to ${t}`||lower===`walk to ${t}`}
const PROFILES={
 OBSERVE:{dc:10,minutes:15},
 SOCIAL:{dc:11,minutes:20},
 TRAVEL:{dc:12,minutes:45},
 RISKY:{dc:14,minutes:30},
 GENERAL:{dc:12,minutes:30}
};
export function actionProfile(input=""){
 const q=clean(input).toLowerCase();
 if(explicitRestCommand(q)||(/住宿|旅店|投宿|lodging|inn/.test(q)&&explicitMutationCommand(q)))return {kind:"GENERAL",dc:7,minutes:240,rest:true};
 if(/施法|魔法|術式|咒|spell|cast|magic/.test(q))return {kind:"RISKY",dc:13,minutes:20,magic:true};
 if(/購買|買下|出售|賣掉|賣出|buy|sell/.test(q))return {kind:"SOCIAL",dc:9,minutes:20,economy:true};
 if(/觀察|查看|檢查|搜尋|調查|聆聽|閱讀|inspect|search|observe|listen/.test(q))return {kind:"OBSERVE",...PROFILES.OBSERVE};
 if(/交談|詢問|說服|談判|打招呼|對話|talk|ask|persuade|negotiate/.test(q))return {kind:"SOCIAL",...PROFILES.SOCIAL};
 if(/前往|移動|探索|穿越|攀爬|跟隨|travel|move|explore|climb|follow/.test(q))return {kind:"TRAVEL",...PROFILES.TRAVEL};
 if(/攻擊|破壞|闖入|偷|強行|冒險|attack|break|steal|force/.test(q))return {kind:"RISKY",...PROFILES.RISKY};
 return {kind:"GENERAL",...PROFILES.GENERAL}
}
function ensure(state){
 ensureClock(state);
 state.quests??={main:{id:"Q-main",title:"在陌生世界活下來",stage:0,status:"ACTIVE",objectives:["理解自己身處何地","尋找安全的落腳處","找到第一個可以交流的人"]}};
 state.discoveries??=0;ensureCheckProfile(state);ensureItemRuntime(state)
}
function localNarrative(state,label,roll,profile,effects={}){
 const loc=playerVisibleLocationName(state)||"目前位置",rel=effects.npcRelationship,npc=rel?.npcId?(state.world?.registry?.npcs||[]).find(x=>x.id===rel.npcId):null,who=npc?playerVisibleNpcName(state,npc):"對方",changes=rel?.changes||{};
 if(profile?.kind==="SOCIAL"&&rel){
  const trust=Number(changes.trust)||0,respect=Number(changes.respect)||0;
  if(trust>0||respect>0)return `${who}沒有避開這次交涉，態度出現了可確認的正向變化。是否得到新資訊或推進任務，仍只以實際對話與世界狀態為準。`;
  if(trust<0||respect<0)return `${who}讓你把事情做完，但態度明顯變得更差。行動判定成功不代表關係改善。`;
 }
 if(roll.grade==="CRITICAL_SUCCESS")return `你在${loc}完成了「${label}」，結果十分順利。只有眼前實際出現的變化才算作後續資訊。`;
 if(roll.grade==="CRITICAL_FAILURE")return `你在${loc}嘗試「${label}」時出了明顯差錯，現場局勢變得更不利。`;
 if(roll.success)return `你在${loc}完成了「${label}」。現場若沒有新的可觀察變化，就不額外推斷線索、信任或任務進展。是否出現新的可確認資訊，仍以實際觀察與世界狀態為準。`;
 return `你在${loc}嘗試「${label}」，但沒有達到目標。眼前沒有憑空出現新線索，你仍可以改用其他可行做法。`
}
function localNpcActionTarget(state,label,assessment=null){
 const intent=String(assessment?.actionIntent?.intent||assessment?.intent||"").toUpperCase(),targetId=clean(assessment?.actionIntent?.targetId||assessment?.targetId,120),rows=state?.world?.registry?.npcs||[];
 const socialIntent=["TALK","PERSUADE","THREATEN","GIVE_ITEM","SHOW_ITEM"].includes(intent)||/詢問|請教|交談|對話|攀談|告訴|回答|talk|ask|speak|tell/i.test(label);
 if(!socialIntent)return null;
 const npc=rows.find(x=>x?.id===targetId||x?.name===targetId)||rows.find(x=>x?.name&&label.includes(x.name));
 return npc&&isNpcPresent(state,npc)?npc:null
}
function markLocalNpcInteraction(state,label,assessment=null){
 const npc=localNpcActionTarget(state,label,assessment);if(!npc)return null;
 const firstEncounter=npc.encountered!==true;npc.known=true;npc.encountered=true;markEntityObserved(state,"npc",npc.id,{reason:"PLAYER_LOCAL_SOCIAL_ACTION"});
 npc.memories??=[];const minute=Number(state?.world?.state?.clock?.totalMinutes)||0,summary=`玩家在當前場景主動嘗試與${playerVisibleNpcName(state,npc)}互動：「${clean(label,140)}」`;
 npc.memories.push({id:id(),type:"interaction",summary,day:state?.world?.state?.day||1,minute,mode:"LOCAL",grounded:true});npc.memories=npc.memories.slice(-12);npc.lastActionMinute=minute;
 state.events??=[];state.events.push({id:id(),type:"NPC_INTERACTION",visibility:"PLAYER_KNOWN",npcId:npc.id,firstEncounter,summary,day:state?.world?.state?.day||1,minute,at:Date.now()});
 return {npcId:npc.id,firstEncounter}
}
function applyLocalNpcRelationshipOutcome(state,interaction,roll,kind,label){
 if(!interaction?.npcId||String(kind||"").toUpperCase()!=="SOCIAL"||!roll)return null;
 const npc=(state.world?.registry?.npcs||[]).find(x=>x?.id===interaction.npcId);if(!npc)return null;
 const grade=String(roll.grade||"").toUpperCase();let changes=null;
 if(grade==="CRITICAL_SUCCESS")changes={trust:6,respect:4,fear:-1};
 else if(grade==="SUCCESS")changes={trust:2,respect:1};
 else if(grade==="CRITICAL_FAILURE")changes={trust:-2,respect:-1,fear:2};
 if(!changes)return null;
 const relationship=adjustNpcRelationship(state,npc,{changes,reason:`玩家社交行動「${clean(label,100)}」由 Engine 判定為 ${grade}。`});
 return {npcId:npc.id,grade,changes,relationship,reason:`玩家社交行動「${clean(label,100)}」由 Engine 判定為 ${grade}。`,source:"ENGINE_LOCAL_SOCIAL"}
}
export function resolveEngineFeasibility(state,label,assessment=null){
 const q=clean(label,180),intent=String(assessment?.actionIntent?.intent||assessment?.intent||"").toUpperCase(),targetId=String(assessment?.actionIntent?.targetId||assessment?.targetId||"");
 if(state.player?.status==="DOWNED")return {verdict:"BLOCK",reason:"你目前失去行動能力。",requirements:["先恢復可行動狀態"],source:"ENGINE_AUTHORITY"};
 const inventory=Array.isArray(state.inventory)?state.inventory:[],itemVerb=/使用|食用|進食|吃|喝|飲用|服用|展示|出示|交給|交出|贈送|裝備|穿上|卸下|脫下|use|eat|drink|show|give|equip|unequip/i;
 if(itemVerb.test(q)&&!inventory.some(x=>x?.name&&q.includes(x.name)))return {verdict:"BLOCK",reason:"Engine 無法在背包中確認你指定的物品。",requirements:["需要先擁有並明確指定該物品"],source:"ENGINE_AUTHORITY"};
 if(/飛上天空|直接飛行|瞬間移動|傳送到|teleport|fly into the sky/i.test(q)){
  const spells=state.player?.magic?.knownSpells||[],supported=spells.some(s=>/飛|傳送|移動|teleport|flight/i.test(String(s?.name||"")+" "+String(s?.effect||"")));
  if(!supported)return {verdict:"BLOCK",reason:"Engine 找不到能支援這種超常移動的已學能力。",requirements:["需要相應能力、魔法或工具"],source:"ENGINE_AUTHORITY"}
 }
 const registry=state.world?.registry||{};
 if(targetId){
  const npc=(registry.npcs||[]).find(x=>x.id===targetId||x.name===targetId);
  if(npc&&["TALK","PERSUADE","THREATEN","GIVE_ITEM","SHOW_ITEM"].includes(intent)&&!isNpcPresent(state,npc))return {verdict:"BLOCK",reason:"目標 NPC 目前不在可互動位置。",requirements:["目標 NPC 必須在場或可透過既有通訊方式聯絡"],source:"ENGINE_AUTHORITY"};
  const loc=(registry.locations||[]).find(x=>x.id===targetId||x.name===targetId);
  if(loc&&intent==="TRAVEL"){
   if(loc.known!==true)return {verdict:"BLOCK",reason:"這個地點目前尚未成為玩家可直接前往的已知目的地。",requirements:["先發現或取得可到達資訊"],source:"ENGINE_AUTHORITY"};
   const access=locationAccessStatus(state,loc);if(!access.allowed)return {verdict:"BLOCK",reason:"前往條件尚未滿足。",requirements:access.missing.map(x=>x.hint||x.id||x.type).filter(Boolean).slice(0,4),source:"ENGINE_AUTHORITY"};
   if(!findTravelPlan(state,loc.id))return {verdict:"BLOCK",reason:"目前沒有可用的 Canon 路線連接到該地點。",requirements:["需要先建立可通行路線"],source:"ENGINE_AUTHORITY"}
  }
 }
 return {verdict:"ALLOW",reason:"Engine 沒有發現硬性阻擋條件；AI 只提供語義理解，最終可嘗試性由 Engine 決定。",requirements:[],source:"ENGINE_AUTHORITY",aiProposal:String(assessment?.verdict||"NONE")}
}
function deterministicInfoAction(state,label){
 const q=clean(label,180),survival=ensureSurvival(state);
 if(/^(?:查看|打開|檢查)?(?:我的)?(?:背包|物品|inventory)$/i.test(q)){
  const rows=(state.inventory||[]).slice(0,16).map(x=>x.name+" ×"+(Number(x.quantity)||1));return {handled:true,text:rows.length?"背包："+rows.join("、"):"背包目前是空的。",kind:"INVENTORY"}
 }
 if(/^(?:查看|檢查)?(?:我的)?(?:角色狀態|狀態|能力狀態|character status|status)$/i.test(q))return {handled:true,text:`目前狀態：HP ${Number(state.player?.hp)||0}/${Number(state.player?.maxHp)||0}；飽食度 ${Math.round(survival.satiety)}；疲勞 ${Math.round(survival.fatigue)}；傷勢 ${Math.round(survival.injury)}。`,kind:"STATUS"};
 if(/^(?:查看|檢查)?(?:目前)?(?:任務|任務列表|quest|quests)$/i.test(q)){
  const main=state.quests?.main,side=(state.world?.registry?.sideQuests||[]).filter(x=>x.known===true&&x.status!=="COMPLETED");const parts=[];if(main)parts.push("主線："+(main.objectives?.[0]||main.title||"目前沒有明確目標"));if(side.length)parts.push("支線："+side.slice(0,6).map(x=>x.title).join("、"));return {handled:true,text:parts.join("\n")||"目前沒有已知任務。",kind:"QUEST"}
 }
 if(/^(?:查看|打開|檢查)?(?:世界)?(?:地圖|已知地點|map)$/i.test(q)){
  const names=(state.world?.registry?.locations||[]).filter(x=>x.known===true).map(x=>x.name).filter(Boolean).slice(0,20);return {handled:true,text:names.length?"已知地點："+names.join("、"):"目前沒有已知地點。",kind:"MAP"}
 }
 return null
}
function deterministicRestAction(state,label){
 const q=clean(label,180);if(!explicitRestCommand(q))return null;
 const minutes=/睡眠|睡覺|sleep/i.test(q)?480:/紮營|露營|camp/i.test(q)?60:120;advanceTime(state,minutes);const survival=tickSurvival(state,minutes,{kind:"GENERAL",rest:true});recoverMagic(state,Math.max(8,Math.round(minutes/20)));const worldEvent=tickWorld(state);tickMainQuest(state);
 return {handled:true,minutes,survival,worldEvent,text:`你休息了 ${minutes} 分鐘。身體狀態按時間與環境條件恢復。`}
}
function deterministicKnownTravel(state,label){
 const q=clean(label,180),target=(state.world?.registry?.locations||[]).find(x=>x.known===true&&x.name&&q.includes(x.name));if(!target||!explicitTravelCommand(q,target.name))return null;
 const gate=survivalActionGate(state,"TRAVEL");if(!gate.ok)return {handled:true,blocked:true,text:gate.message,reason:gate.reason};
 const access=locationAccessStatus(state,target);if(!access.allowed)return {handled:true,blocked:true,text:access.missing.map(x=>x.hint||"尚未滿足進入條件").join(" · "),reason:"ACCESS_REQUIREMENT_MISSING"};
 const plan=findTravelPlan(state,target.id);if(!plan)return {handled:true,blocked:true,text:"目前沒有可用的 Canon 路線前往 "+target.name+"。",reason:"NO_CANON_ROUTE"};
 if(plan.routes.some(r=>r.open===false||Number(r.hazard||0)>2))return null;
 const moved=travelTo(state,target,{roll:{success:true,profile:{kind:"TRAVEL"}},actionKind:"TRAVEL",baseMinutes:0});if(!moved.ok)return {handled:true,blocked:true,text:"目前無法前往 "+target.name+"。",reason:moved.reason};
 const worldEvent=tickWorld(state);const questProgress=evaluateQuestState(state);tickMainQuest(state);return {handled:true,minutes:plan.minutes,worldEvent,questProgress,text:"你沿著已知且可安全通行的路線抵達 "+target.name+"。",travel:moved}
}
export function performAction(state,action="free",customText="",assessment=null){
 ensure(state);
 const originalLabel=clean(customText||action)||"觀察目前環境",proposedLabel=clean(assessment?.normalizedAction,180)||originalLabel,engineFeasibility=resolveEngineFeasibility(state,proposedLabel,assessment);
 if(engineFeasibility.verdict==="BLOCK"){
  const reason=engineFeasibility.reason,requirements=engineFeasibility.requirements||[],text=requirements.length?`${reason}\n需要先滿足：${requirements.join("、")}`:reason;
  state.narrative=text;state.events.push({id:id(),type:"PLAYER_ACTION_REJECTED",visibility:"PLAYER_KNOWN",action:"free",customText:originalLabel,reason,requirements,authority:"ENGINE",aiProposal:assessment?.verdict||null,day:state.world.state.day,at:Date.now()});
  return {blocked:true,feasibilityBlocked:true,roll:null,text,minutes:0,actionKind:String(assessment?.kind||"GENERAL"),check:null,training:null,ruleEffects:{assessment,engineFeasibility}}
 }
 const label=assessment?.verdict==="ADJUST"&&proposedLabel?proposedLabel:originalLabel,npcInteraction=markLocalNpcInteraction(state,label,assessment);
 const info=deterministicInfoAction(state,label);if(info){state.narrative=info.text;state.events.push({id:id(),type:"PLAYER_UTILITY_ACTION",visibility:"PLAYER_KNOWN",utilityKind:info.kind,customText:label,day:state.world.state.day,at:Date.now()});return {deterministic:true,roll:null,text:info.text,minutes:0,actionKind:"GENERAL",check:null,training:null,ruleEffects:{utility:info,npcInteraction,engineFeasibility}}}
 const baseProfile=actionProfile(label),assessedKind=["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"].includes(String(assessment?.kind||"").toUpperCase())?String(assessment.kind).toUpperCase():baseProfile.kind;
 const profile={...baseProfile,kind:baseProfile.kind==="RISKY"?"RISKY":assessedKind},mutationFastPath=explicitMutationCommand(label),directItem=mutationFastPath?resolveItemAction(state,label,{success:true}):null;
 if(directItem?.handled){
  const minutes=Math.max(1,Math.round(Number(directItem.minutes)||2));advanceTime(state,minutes);const survival=tickSurvival(state,minutes,{kind:"GENERAL"}),questProgress=evaluateQuestState(state);
  const text=directItem.ok?(directItem.summary||directItem.output?`${directItem.summary||`你完成了「${directItem.recipe?.name||label}」，取得「${directItem.output?.name||""}」。`}`:directItem.effects?`你使用了「${directItem.itemName}」。`:`你完成了「${label}」。`):directItem.reason==="MATERIALS_MISSING"?"材料不足，無法完成這項合成。":directItem.reason==="ITEM_NOT_USABLE"?"這件物品目前沒有可以直接使用的效果。":directItem.reason==="ITEM_NOT_OWNED"?"你目前沒有指定的物品。":directItem.reason==="NPC_NOT_PRESENT"?"對方目前不在你身邊，無法展示或交付物品。":directItem.reason==="ITEM_EQUIPPED"?"這件物品目前正在裝備，先卸下才可以交出去。":"目前無法完成這個物品操作。";
  state.narrative=text;state.events.push({id:id(),type:"PLAYER_ITEM_ACTION",visibility:"PLAYER_KNOWN",action:"item",customText:label,reason:directItem.reason||"",day:state.world.state.day,minutes,at:Date.now()});
  const worldEvent=tickWorld(state);tickMainQuest(state);return {deterministic:true,roll:null,text,minutes,worldEvent,actionKind:"GENERAL",check:null,training:null,ruleEffects:{item:directItem,npcInteraction,survival,questProgress,engineFeasibility}}
 }
 const directEconomy=mutationFastPath?resolveEconomyAction(state,label,{success:true}):null;if(directEconomy?.handled){
  const lodging=/住宿|旅店|投宿|lodging|inn|stay overnight/i.test(label),minutes=lodging&&directEconomy.ok?240:20;advanceTime(state,minutes);const survival=tickSurvival(state,minutes,{kind:"GENERAL",rest:lodging&&directEconomy.ok===true});if(lodging&&directEconomy.ok)recoverMagic(state,Math.max(8,Math.round(minutes/20)));const worldEvent=tickWorld(state);tickMainQuest(state);
  const text=directEconomy.ok?(lodging?"你完成住宿付款並休息。":"交易完成。"):"交易無法完成："+String(directEconomy.reason||"條件不足");state.narrative=text;state.events.push({id:id(),type:"PLAYER_ECONOMY_ACTION",visibility:"PLAYER_KNOWN",customText:label,ok:directEconomy.ok===true,reason:directEconomy.reason||"",day:state.world.state.day,minutes,at:Date.now()});
  return {deterministic:true,roll:null,text,minutes,worldEvent,actionKind:"GENERAL",check:null,training:null,ruleEffects:{economy:directEconomy,npcInteraction,survival,engineFeasibility}}
 }
 const directRest=deterministicRestAction(state,label);if(directRest){state.narrative=directRest.text;state.events.push({id:id(),type:"PLAYER_REST",visibility:"PLAYER_KNOWN",customText:label,minutes:directRest.minutes,day:state.world.state.day,at:Date.now()});return {deterministic:true,roll:null,text:directRest.text,minutes:directRest.minutes,worldEvent:directRest.worldEvent,actionKind:"GENERAL",check:null,training:null,ruleEffects:{survival:directRest.survival,npcInteraction,engineFeasibility}}}
 const directTravel=deterministicKnownTravel(state,label);if(directTravel?.handled){state.narrative=directTravel.text;return {deterministic:!directTravel.blocked,blocked:Boolean(directTravel.blocked),roll:null,text:directTravel.text,minutes:directTravel.minutes||0,worldEvent:directTravel.worldEvent||null,actionKind:"TRAVEL",check:null,training:null,ruleEffects:{travel:directTravel.travel||null,questProgress:directTravel.questProgress||null,npcInteraction,engineFeasibility}}}
 const gate=survivalActionGate(state,profile.kind);
 if(!gate.ok){state.narrative=gate.message;state.events.push({id:id(),type:"PLAYER_ACTION_BLOCKED",visibility:"PLAYER_KNOWN",action:"free",customText:label,actionKind:profile.kind,reason:gate.reason,day:state.world.state.day,at:Date.now()});return {blocked:true,roll:null,text:gate.message,minutes:0,actionKind:profile.kind,check:null,training:null,ruleEffects:{gate,npcInteraction}}}
 const check=buildActionCheck(state,label,profile),improvised=useImprovisedToolTalent(state,{label});if(improvised.applied){check.modifiers.talentRule=Number(improvised.checkBonus)||1;check.bonus=Math.max(-6,Math.min(10,Number(check.bonus||0)+check.modifiers.talentRule))}
 const roll=d20(check.dc,check.bonus);Object.assign(roll,{profile:{kind:check.kind,attribute:check.attribute,skill:check.skill,skillLabel:check.skillLabel},modifiers:check.modifiers,baseDC:check.baseDC,difficulty:check.difficulty});
 const actionIntent={...(assessment?.actionIntent||{}),kind:profile.kind,raw:label},resolution=buildResolutionOutcome({roll,intent:actionIntent,snapshot:state}),travelMitigation=profile.kind==="TRAVEL"&&!resolution.goalAchieved?mitigateTravelFailureWithTalent(state,{baseMinutes:profile.minutes,resolution}):{applied:false},effectiveMinutes=profile.minutes+(travelMitigation.applied?Number(travelMitigation.extraMinutes)||0:0);
 if(travelMitigation.applied){resolution.costs=[...(resolution.costs||[]),{type:"TIME",severity:"MODERATE",source:"TALENT_RULE",committed:true,minutes:travelMitigation.extraMinutes}];resolution.talentRule={talentId:"TAL-SURVIVAL-3",effect:"DANGER_TO_TIME"}}
 const training=trainActionSkill(state,check.kind,roll);if(training.rankUp)roll.skillUp=training;
 const npcRelationship=applyLocalNpcRelationshipOutcome(state,npcInteraction,roll,profile.kind,label);
 advanceTime(state,effectiveMinutes);
 const economy=resolveEconomyAction(state,label,roll),paidLodging=/住宿|旅店|投宿|lodging|inn|stay overnight/i.test(label),restGranted=profile.rest===true&&roll.success&&(!paidLodging||economy?.ok===true);
 const survival=tickSurvival(state,effectiveMinutes,{kind:profile.kind,rest:restGranted});if(restGranted)recoverMagic(state,Math.max(8,Math.round(effectiveMinutes/20)));
 const culture=applyCultureAction(state,label,roll),magic=resolveMagicAction(state,label,roll),talent=resolveTalentAction(state,label),dungeon=exploreDungeon(state,label,roll);
 const baseText=localNarrative(state,label,roll,profile,{npcRelationship}),text=[baseText,improvised.applied?improvised.summary:"",travelMitigation.applied?travelMitigation.summary:""].filter(Boolean).join("\n");
 state.narrative=text;
 state.events.push({id:id(),type:"PLAYER_ACTION",visibility:"PLAYER_KNOWN",action:"free",customText:label,originalAction:originalLabel,actionAssessment:assessment?{verdict:assessment.verdict,kind:assessment.kind,reason:assessment.reason,confidence:assessment.confidence}:null,actionKind:profile.kind,roll,resolutionTier:resolution.tier,day:state.world.state.day,time:`${String(state.world.state.clock.hour).padStart(2,"0")}:${String(state.world.state.clock.minute).padStart(2,"0")}`,minutes:effectiveMinutes,at:Date.now()});
 const worldEvent=tickWorld(state);const questProgress=evaluateQuestState(state);tickMainQuest(state);
 return {roll,resolution,text,minutes:effectiveMinutes,worldEvent,actionKind:profile.kind,check,training,ruleEffects:{survival,culture,economy,magic,talent,talentRule:{improvised,travelMitigation},dungeon,questProgress,npcInteraction,npcRelationship,engineFeasibility}}
}