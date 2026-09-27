import {normalizeActionIntent,inferActionKind} from "./action-intent.js?v=57025";
import {playerVisibleLocationName} from "./player-location-visibility.js?v=57025";
import {playerVisibleNpcName,redactUnknownNpcNames} from "./player-entity-visibility.js?v=57029";
import {sanitizePlayerText,stripSystemLabels} from "./runtime-guard.js?v=57029";
import {validateSuggestionProvenance} from "./scene-provenance.js?v=57025";
import {hasLocaleLeak} from "./locale-runtime.js?v=60009";
import {rhythmSuggestionBias} from "./story-rhythm-engine.js?v=60006";

const clean=(v,max=180)=>typeof v==="string"?v.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,max):"";
const CONTEXTUAL_LOCALES=new Set(["zh-Hant","zh-Hans","en","ja"]);
function contextualLocale(state=null,explicit=""){const raw=String(explicit||state?.localization?.displayLocale||globalThis.ELYNDRA_LOCALE||"zh-Hant");return CONTEXTUAL_LOCALES.has(raw)?raw:"zh-Hant"}
function sanitizeContextualText(value,max=180,{state=null,locale="",source="AI"}={}){
 const sourceKind=String(source||"AI").toUpperCase();
 if(sourceKind==="ENGINE")return clean(stripSystemLabels(value,max),max);
 const id=contextualLocale(state,locale);if(id==="zh-Hant")return sanitizePlayerText(value,max,"");
 const s=clean(stripSystemLabels(value,max),max);if(!s||hasLocaleLeak(s,id))return "";
 if(id==="ja"){const foreign=(s.match(/[\uac00-\ud7af\u0400-\u04ff]/gu)||[]).length,kana=(s.match(/[\u3040-\u30ff]/gu)||[]).length,han=(s.match(/[\u3400-\u9fff]/gu)||[]).length,latin=(s.match(/[A-Za-z]/g)||[]).length;if(foreign)return "";if(s.length>=24&&kana+han<4&&latin>12)return ""}
 else if(id==="zh-Hans"&&/[\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff]/u.test(s))return "";
 else if(id==="en"&&/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0400-\u04ff]/u.test(s))return "";
 return s
}
const list=(v,max=8,maxLen=100)=>Array.isArray(v)?[...new Set(v.map(x=>clean(x,maxLen)).filter(Boolean))].slice(0,max):[];
const PRESENTATION_LABELS=Object.freeze({
 "zh-Hant":{risk:{LOW:"低風險",MEDIUM:"有風險",HIGH:"危險",EXTREME:"極高風險",UNKNOWN:""},approach:{STEADY:"穩健",SOCIAL:"社交",BOLD:"冒險",CREATIVE:"創意"},skill:{"感知 / 觀察":"感知 / 觀察","交涉":"交涉","應變":"應變","敏捷 / 體能":"敏捷 / 體能","生存 / 移動":"生存 / 移動","魔法":"魔法"}},
 "zh-Hans":{risk:{LOW:"低风险",MEDIUM:"有风险",HIGH:"危险",EXTREME:"极高风险",UNKNOWN:""},approach:{STEADY:"稳健",SOCIAL:"社交",BOLD:"冒险",CREATIVE:"创意"},skill:{"感知 / 觀察":"感知 / 观察","交涉":"交涉","應變":"应变","敏捷 / 體能":"敏捷 / 体能","生存 / 移動":"生存 / 移动","魔法":"魔法"}},
 en:{risk:{LOW:"Low risk",MEDIUM:"Risky",HIGH:"Dangerous",EXTREME:"Extreme risk",UNKNOWN:""},approach:{STEADY:"Steady",SOCIAL:"Social",BOLD:"Bold",CREATIVE:"Creative"},skill:{"感知 / 觀察":"Perception / Observation","交涉":"Social","應變":"Adaptation","敏捷 / 體能":"Agility / Athletics","生存 / 移動":"Survival / Travel","魔法":"Magic"}},
 ja:{risk:{LOW:"低リスク",MEDIUM:"リスクあり",HIGH:"危険",EXTREME:"極めて危険",UNKNOWN:""},approach:{STEADY:"堅実",SOCIAL:"対話",BOLD:"大胆",CREATIVE:"創意"},skill:{"感知 / 觀察":"知覚 / 観察","交涉":"交渉","應變":"対応力","敏捷 / 體能":"敏捷 / 体力","生存 / 移動":"生存 / 移動","魔法":"魔法"}}
});
function presentationLabels(state){return PRESENTATION_LABELS[contextualLocale(state)]||PRESENTATION_LABELS["zh-Hant"]}
const CONSEQUENCE_LABELS=Object.freeze({
 ja:{"可能引起注意":"周囲の注意を引く可能性","可能受傷或暴露位置":"負傷したり位置が露見したりする可能性"},
 en:{"可能引起注意":"May attract attention","可能受傷或暴露位置":"May cause injury or reveal your position"},
 "zh-Hans":{"可能引起注意":"可能引起注意","可能受傷或暴露位置":"可能受伤或暴露位置"}
});
function presentationSkill(state,value){const raw=clean(value,70);if(!raw)return "";return presentationLabels(state).skill[raw]||raw}
function presentationConsequence(state,value){const raw=clean(value,90),id=contextualLocale(state);if(!raw)return "";return CONSEQUENCE_LABELS[id]?.[raw]||((id!=="zh-Hant"&&hasLocaleLeak(raw,id))?"":raw)}
const VALID_KINDS=new Set(["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"]);
const VALID_RISKS=new Set(["LOW","MEDIUM","HIGH","EXTREME","UNKNOWN"]);
const VALID_APPROACHES=new Set(["STEADY","SOCIAL","BOLD","CREATIVE"]);
const DECISION_WORDS=/原諒(?:他|她|對方)?|相信(?:他|她|對方)|愛上|憎恨|效忠|宣誓忠誠|決定信任|決定原諒/;
const PROGRESSION_EVENT_TYPES=new Set(["WORLD_EVENT","WORLD_CONSEQUENCE","WORLD_CONSEQUENCE_DISCOVERED","RUMOR_SPREAD","PLAYER_RECOGNITION","FACTION_PLAYER_REACTION","WEATHER_CHANGED","FUTURE_EVENT_TRIGGERED","NPC_CLUE_CONFIRMED"]);
const OBSERVABLE_PROGRESS_CUE=/(?:看見|看到|聽見|聽到|傳來|響起|發出|散發|留下|出現|消失|停止|恢復|打開|關閉|封鎖|開放|移動|離開|靠近|遠去|倒下|破損|坍塌|燃燒|閃爍|震動|逐漸|變得|嗡鳴|敲擊|腳步|痕跡|足跡|裂痕|血跡|煙|火光|霧|雨|雪|符號|輪廓)/;
const QUEST_PROGRESS_META=/(?:任務|主線|支線|目標|階段|委託|進度|建立第一段關係|完成條件)/;
const POSSESSION_ITEM=/從(?:口袋|背包|行囊|隨身物品|身上).{0,18}?(?:取出|拿出|掏出|抽出)\s*([^，。；、,.;!?！？]{2,36})/i;
const SPECIAL_POWER=/(?:利用|使用|施展|啟動|釋放|透過|以)\s*(靈能感知|靈能操控|魔力感知|魔法感知|精神感知|心靈感應|透視|讀心|念動|telepathy|clairvoyance|psychic sense)/i;
const GENERIC_MAGIC_USE=/(?:運用|使用|施展|釋放|凝聚|抽取|引導|操控|催動|調動|注入|集中|感知).{0,14}(?:靈息|靈能|魔力|魔法|法術|咒力|mana|magic|spell|psychic)|(?:靈息|靈能|魔力|魔法|法術|咒力|mana|magic|spell|psychic).{0,14}(?:施展|釋放|凝聚|抽取|操控|催動|調動|注入)/i;
const PLAYER_META_TEXT=/(?:玩家在當前場景主動嘗試|玩家[:：].{0,120}(?:\/|NPC|對方)|NPC_INTERACTION|NPC_CONVERSATION|PLAYER_ACTION|內部分類|系統分類|SYSTEM|DEBUG|STATE(?:_SYNC)?)/i;
function playerFacingEventSummary(event){const summary=sanitizePlayerText(event?.playerSummary||event?.visibleSummary||event?.summary,220,"");return summary&&!PLAYER_META_TEXT.test(summary)?summary:""}

function uniq(rows,max=8){
 const out=[];
 for(const x of rows||[]){if(!x?.action||out.some(y=>y.action===x.action||y.label===x.label))continue;out.push(x);if(out.length>=max)break}
 return out
}
function currentLocation(state){return clean(playerVisibleLocationName(state),80)||"眼前這個地方"}
function visibleNpcName(state,npc){return clean(playerVisibleNpcName(state,npc),80)||"眼前的陌生人"}
function presentNpcs(state){
 const loc=(state.world?.registry?.locations||[]).find(x=>x.name===state.player?.location),locId=loc?.id;
 return (state.world?.registry?.npcs||[]).filter(n=>n?.known===true&&n?.alive!==false&&(n?.companion?.status==="ACTIVE"||n?.locationId===locId)).slice(0,5)
}
function currentLocationRecord(state){
 const name=String(state.player?.location||""),rows=state.world?.registry?.locations||[];
 return rows.find(x=>x?.name===name||x?.id===name)||null
}
function inferSuggestionTarget(state,row){
 if(row?.targetId)return row.targetId;
 if(String(row?.kind||"").toUpperCase()!=="SOCIAL")return null;
 const action=String(row?.action||row?.label||"");
 const matches=presentNpcs(state).filter(n=>action.includes(visibleNpcName(state,n))).sort((a,b)=>visibleNpcName(state,b).length-visibleNpcName(state,a).length);
 return matches.length===1?String(matches[0].id):null
}
function observableAffordance(state,row){
 const kind=inferActionKind(row?.action||row?.label||""),event=recentVisibleEvent(state),loc=currentLocationRecord(state);
 if(kind==="OBSERVE"&&event?.id)return {sourceKind:"EVENT",sourceId:String(event.id),evidenceType:"OBSERVED",title:"已知事件仍可追查",text:clean(event.summary||event.action,300)};
 if(kind==="OBSERVE"&&loc){const visible=currentLocation(state);return {sourceKind:"LOCATION",sourceId:String(loc.id||loc.name),evidenceType:"OBSERVED",title:`${visible||"目前位置"}的可觀察環境`,text:clean(loc.description,300).split(String(loc.name||"")).join("")||`你確認${visible||"目前位置"}仍提供可直接觀察的地形、出入口或活動基準，可用來縮窄下一步調查範圍。`}};
 if(kind==="SOCIAL"&&row?.targetId){
  const npc=presentNpcs(state).find(n=>n.id===row.targetId);if(npc)return {sourceKind:"NPC",sourceId:String(npc.id),evidenceType:"HEARD",title:`${clean(visibleNpcName(state,npc),60)}可被直接詢問`,text:`你確認「${clean(visibleNpcName(state,npc),80)}」目前就在可互動範圍內，可作為後續詢問的既有來源。`}
 }
 return null
}
function eventMatchesCurrentScope(state,event){const currentWorld=String(state.world?.id||""),eventWorld=String(event?.worldId||"");if(eventWorld&&currentWorld&&eventWorld!==currentWorld)return false;const worldCreated=Number(state.world?.createdAt)||0,eventAt=Number(event?.at)||0;if(!eventWorld&&worldCreated&&eventAt&&eventAt<worldCreated)return false;const loc=currentLocationRecord(state),scope=String(event?.locationId||event?.location||"");if(scope){const allowed=new Set([String(state.player?.location||""),String(loc?.id||""),String(loc?.name||"")].filter(Boolean));if(!allowed.has(scope))return false}return true}
function eventHasCurrentSceneProvenance(state,event){const loc=currentLocationRecord(state),scope=String(event?.locationId||event?.location||"");if(!scope)return false;const allowed=new Set([String(state.player?.location||""),String(loc?.id||""),String(loc?.name||"")].filter(Boolean));return allowed.has(scope)}
function questReferenceTexts(state){const main=state.quests?.main||{},side=state.world?.registry?.sideQuests||[];return [main.title,main.aiHint,...(main.objectives||[]),...side.flatMap(q=>[q?.title,q?.objective])].map(x=>clean(x,180)).filter(x=>x.length>=6)}
function summaryLooksLikeQuestProgress(state,summary){const text=clean(summary,220);if(!text)return true;if(QUEST_PROGRESS_META.test(text))return true;return questReferenceTexts(state).some(ref=>text===ref||text.startsWith(ref+"：")||text.startsWith(ref+":")||text.startsWith(ref+"。"))}
function eventHasConcreteObservableContent(state,event,summary){if(!eventHasCurrentSceneProvenance(state,event))return false;if(String(event?.type||"")==="NPC_CLUE_CONFIRMED")return Boolean(summary);if(summaryLooksLikeQuestProgress(state,summary))return false;return OBSERVABLE_PROGRESS_CUE.test(summary)}
function recentVisibleEvent(state){return (state.events||[]).filter(e=>e?.visibility!=="INTERNAL"&&PROGRESSION_EVENT_TYPES.has(String(e.type||""))&&eventMatchesCurrentScope(state,e)).map(e=>({...e,summary:playerFacingEventSummary(e)})).filter(e=>e.summary&&eventHasConcreteObservableContent(state,e,e.summary)).slice(-8).reverse()[0]||null}
function recentNpcClue(state){return (state.events||[]).filter(e=>String(e?.type||"")==="NPC_CLUE_CONFIRMED"&&e?.visibility!=="INTERNAL"&&eventMatchesCurrentScope(state,e)&&eventHasCurrentSceneProvenance(state,e)).map(e=>({...e,summary:playerFacingEventSummary(e)})).filter(e=>e.summary).slice(-6).reverse()[0]||null}
function recentPlayerActions(state,limit=8){
 const rows=(state.events||[]).filter(e=>["PLAYER_ACTION","PLAYER_ITEM_ACTION","PLAYER_ECONOMY_ACTION"].includes(String(e?.type||""))).slice(-Math.max(1,limit));
 return new Set(rows.flatMap(e=>[clean(e.customText||e.action,180),clean(e.originalAction,180)]).filter(Boolean))
}
function freshSuggestion(recent,row){return Boolean(row?.action&&!recent.has(clean(row.action,180)))}
function inferApproach(row){
 const a=String(row?.approach||"").toUpperCase();if(VALID_APPROACHES.has(a))return a;
 if(row?.kind==="SOCIAL")return "SOCIAL";
 if(["HIGH","EXTREME"].includes(row?.risk))return "BOLD";
 if(/製造|引開|佯裝|假裝|利用|組合|誘導|聲東擊西|繞路/.test(row?.action||""))return "CREATIVE";
 return "STEADY"
}
export function normalizeContextualSuggestion(row={},options={}){
 if(typeof row==="string")row={label:row,action:row};
 if(!row||typeof row!=="object"||Array.isArray(row))return null;
 const source=clean(row.source,30)||"AI",textOptions={state:options?.state||null,locale:options?.locale||"",source};
 const label=sanitizeContextualText(row.label||row.action,120,textOptions),action=sanitizeContextualText(row.action||row.label,180,textOptions);if(!label||!action||PLAYER_META_TEXT.test(label+" "+action)||DECISION_WORDS.test(label+" "+action))return null;
 const kind=VALID_KINDS.has(String(row.kind||"").toUpperCase())?String(row.kind).toUpperCase():"GENERAL";
 const risk=VALID_RISKS.has(String(row.risk||"").toUpperCase())?String(row.risk).toUpperCase():"UNKNOWN";
 const approach=inferApproach({...row,kind,risk});
 return {
  label,action,kind,risk,approach,
  progression:row.progression===true,
  targetId:clean(row.targetId,100)||null,
  skillHint:sanitizeContextualText(row.skillHint,70,textOptions)||null,
  consequenceHint:sanitizeContextualText(row.consequenceHint,90,textOptions)||null,
  causalBasis:sanitizeContextualText(row.causalBasis,180,textOptions)||null,
  requirementsSatisfied:row.requirementsSatisfied===true,
  requiredItemIds:list(row.requiredItemIds),requiredCapabilities:list(row.requiredCapabilities,8,70),
  affordance:row.affordance&&typeof row.affordance==="object"?{
   sourceKind:clean(row.affordance.sourceKind,20).toUpperCase(),sourceId:clean(row.affordance.sourceId,120),
   evidenceType:clean(row.affordance.evidenceType,20).toUpperCase(),title:clean(row.affordance.title,100),text:clean(row.affordance.text,500)
  }:null,
  source,
  prevalidated:row.prevalidated===true,
  validatedContext:row.validatedContext&&typeof row.validatedContext==="object"?{
   worldId:String(row.validatedContext.worldId||""),
   location:String(row.validatedContext.location||""),
   day:Number(row.validatedContext.day)||1,
   eventCount:Math.max(0,Number(row.validatedContext.eventCount)||0),
   targetId:clean(row.validatedContext.targetId,100)||null,
   inventorySeal:clean(row.validatedContext.inventorySeal,900)
  }:null
 }
}
function progressionSuggestion(state){
 const q=state.quests?.main,objective=clean(q?.aiHint||q?.objectives?.[0],100),npc=presentNpcs(state)[0],clue=recentNpcClue(state),event=recentVisibleEvent(state),loc=currentLocation(state),recentRows=(state.events||[]).filter(e=>["PLAYER_ACTION","PLAYER_ITEM_ACTION","PLAYER_ECONOMY_ACTION"].includes(String(e?.type||""))).slice(-4),recentText=recentRows.map(e=>clean(e.customText||e.action||e.originalAction,180)).join("\n"),npcLabel=npc?visibleNpcName(state,npc):"",sameNpcAttempts=npcLabel?(recentText.split(npcLabel).length-1):0;
 if(clue?.summary)return normalizeContextualSuggestion({label:"沿著剛取得的線索繼續查證",action:`在${loc}沿著「${clean(clue.summary,100)}」指向的可見方向、聲音、痕跡或符號查證下一個具體證據`,kind:"OBSERVE",risk:"LOW",skillHint:"感知 / 觀察",approach:"STEADY",progression:true,causalBasis:"當前世界與當前場景中剛確認的 NPC 線索",requirementsSatisfied:true,source:"ENGINE"});
 if(npc&&objective&&sameNpcAttempts<2)return normalizeContextualSuggestion({label:`問${clean(visibleNpcName(state,npc),50)}目前目標最直接的線索`,action:`向${clean(visibleNpcName(state,npc),50)}詢問目前目標下一個可親眼確認的具體線索，只問對方親身知道或能指出的位置、人物或事件`,kind:"SOCIAL",risk:"LOW",targetId:npc.id,skillHint:"交涉",approach:"SOCIAL",progression:true,causalBasis:"目前可互動 NPC 與未完成目標同時存在",requirementsSatisfied:true,source:"ENGINE"});
 if(event?.summary)return normalizeContextualSuggestion({label:`追查「${clean(event.summary,44)}」留下的下一條線索`,action:`沿著最近事件「${clean(event.summary,100)}」造成的可見影響，找出一項能繼續追查的具體證據`,kind:"OBSERVE",risk:"LOW",skillHint:"感知 / 觀察",approach:"STEADY",progression:true,causalBasis:sameNpcAttempts>=2?"連續詢問同一人物後切換到可觀察證據":"最近玩家已知事件可被繼續調查",requirementsSatisfied:true,source:"ENGINE"});
 if(objective)return normalizeContextualSuggestion({label:"找出能推進目前目標的具體證據",action:`在${loc}尋找一項可以直接驗證、並能指出下一步去向的具體線索`,kind:"OBSERVE",risk:"LOW",skillHint:"感知 / 觀察",approach:"STEADY",progression:true,causalBasis:sameNpcAttempts>=2?"避免連續向同一 NPC 重複追問":"目前主線目標仍未完成",requirementsSatisfied:true,source:"ENGINE"});
 return normalizeContextualSuggestion({label:`在${loc}找出最值得繼續追查的新線索`,action:`在${loc}檢查最近出現的異常、痕跡或人物反應，找出一項可以實際追查的下一步線索`,kind:"OBSERVE",risk:"LOW",skillHint:"感知 / 觀察",approach:"STEADY",progression:true,causalBasis:"目前場景允許建立下一個可驗證目標",requirementsSatisfied:true,source:"ENGINE"})
}
function personalizedSuggestion(state){
 const spell=state.player?.magic?.knownSpells?.[0],loc=currentLocation(state);
 if(spell?.name)return normalizeContextualSuggestion({label:`用「${clean(spell.name,36)}」檢查眼前異常`,action:`在不超出「${clean(spell.name,60)}」已知效果的前提下，用它檢查${loc}最明顯的異常來源`,kind:"OBSERVE",risk:"MEDIUM",skillHint:clean(spell.school,40)||"魔法",approach:"CREATIVE",causalBasis:"玩家已學會這個法術",requirementsSatisfied:true,source:"ENGINE"});
 const skills=state.player?.skills||{},top=Object.entries(skills).filter(([k])=>["OBSERVE","SOCIAL","TRAVEL","RISKY"].includes(k)).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0))[0];
 if(!top||Number(top[1])<3)return null;
 const [kind]=top,npc=presentNpcs(state)[0];
 if(kind==="OBSERVE")return normalizeContextualSuggestion({label:`用熟練觀察比對${loc}的新痕跡`,action:`運用已累積的觀察經驗，在${loc}比對痕跡的新舊、方向與不自然之處`,kind:"OBSERVE",risk:"LOW",skillHint:"感知 / 觀察",approach:"STEADY",causalBasis:"OBSERVE 技能已達熟練等級",requirementsSatisfied:true,source:"ENGINE"});
 if(kind==="SOCIAL"&&npc)return normalizeContextualSuggestion({label:`試探${clean(visibleNpcName(state,npc),50)}略過的細節`,action:`用較熟練的交涉方式向${clean(visibleNpcName(state,npc),50)}追問前後不一致或刻意略過的細節，但不預設對方正在說謊`,kind:"SOCIAL",risk:"MEDIUM",targetId:npc.id,skillHint:"交涉",approach:"SOCIAL",causalBasis:"SOCIAL 技能已達熟練等級且 NPC 在場",requirementsSatisfied:true,source:"ENGINE"});
 if(kind==="TRAVEL")return normalizeContextualSuggestion({label:`先找出${loc}最安全有效的進退路線`,action:`利用熟練的旅行判斷，在${loc}比較可見通道、地形與人流，找出一條能繼續前進又保留退路的路線`,kind:"TRAVEL",risk:"LOW",skillHint:"生存 / 移動",approach:"STEADY",causalBasis:"TRAVEL 技能已達熟練等級",requirementsSatisfied:true,source:"ENGINE"});
 return normalizeContextualSuggestion({label:"用熟練的危境判斷測試眼前阻礙",action:`在${loc}選擇一個可以撤退的位置，先用最小代價測試眼前最明顯的危險或阻礙`,kind:"RISKY",risk:"MEDIUM",skillHint:"敏捷 / 體能",approach:"BOLD",causalBasis:"RISKY 技能已達熟練等級",requirementsSatisfied:true,source:"ENGINE"})
}
function fallbackByApproach(state,approach){
 const npc=presentNpcs(state)[0],loc=currentLocation(state);
 if(approach==="SOCIAL"&&npc)return normalizeContextualSuggestion({label:`問${clean(visibleNpcName(state,npc),50)}剛才最在意的是哪件事`,action:`向${clean(visibleNpcName(state,npc),50)}詢問剛才最值得注意的變化，要求對方只說自己能確認的部分`,kind:"SOCIAL",risk:"LOW",targetId:npc.id,skillHint:"交涉",approach:"SOCIAL",causalBasis:"NPC 目前在場",requirementsSatisfied:true,source:"ENGINE"});
 if(approach==="CREATIVE")return normalizeContextualSuggestion({label:"利用現場環境製造一個觀察機會",action:`利用${loc}現有的人流、遮蔽物或聲音製造一個小干擾，藉機觀察誰會對異常作出反應`,kind:"GENERAL",risk:"MEDIUM",skillHint:"應變",approach:"CREATIVE",consequenceHint:"可能引起注意",causalBasis:"只使用當前可見環境，不依賴未知資源",requirementsSatisfied:true,source:"ENGINE"});
 if(approach==="BOLD")return normalizeContextualSuggestion({label:"冒險靠近最明顯的危險源",action:`直接靠近${loc}目前最明顯的危險或阻礙，嘗試在被迫撤退前確認它後面是否有可利用的通路或線索`,kind:"RISKY",risk:"HIGH",skillHint:"敏捷 / 體能",approach:"BOLD",consequenceHint:"可能受傷或暴露位置",causalBasis:"玩家可以選擇主動承擔場景風險",requirementsSatisfied:true,source:"ENGINE"});
 return normalizeContextualSuggestion({label:`先觀察${loc}的出入口與新痕跡`,action:`保持可撤退距離，觀察${loc}的出入口、人流與最新痕跡，先確認哪個方向最值得行動`,kind:"OBSERVE",risk:"LOW",skillHint:"感知 / 觀察",approach:"STEADY",causalBasis:"當前位置可直接觀察",requirementsSatisfied:true,source:"ENGINE"})
}
function sceneEventCount(state){return (state.events||[]).filter(e=>e?.visibility!=="INTERNAL").length}
function inventoryQuantity(row){if(row?.quantity===undefined||row?.quantity===null)return 1;const n=Number(row.quantity);return Number.isFinite(n)?n:0}
function inventorySeal(state){return (state.inventory||[]).filter(x=>inventoryQuantity(x)>0).map(x=>`${String(x?.id||x?.name||"")}:${inventoryQuantity(x)}`).sort().join("|").slice(0,900)}
function inventoryRows(state){return (state.inventory||[]).filter(x=>inventoryQuantity(x)>0)}
function requiredItemsAvailable(state,row){const required=Array.isArray(row?.requiredItemIds)?row.requiredItemIds:[];if(!required.length)return true;const have=new Set(inventoryRows(state).flatMap(x=>[String(x?.id||""),String(x?.name||"")]).filter(Boolean));return required.every(x=>have.has(String(x)))}
function impliedInventoryItem(action=""){
 const m=String(action||"").match(POSSESSION_ITEM);return clean(m?.[1]||m?.[2]||"",50).replace(/^(?:那|這)(?:一)?(?:個|枚|片|件|瓶|把|本|張|塊|顆|粒)?/i,"").trim()
}
function playerCapabilityLabels(state){
 const p=state.player||{},magic=p.magic||{},out=[];
 for(const [key,value] of Object.entries(p.skills||{}))if(Number(value)>0)out.push(key);
 for(const row of magic.knownSpells||[])out.push(row?.id,row?.name,row?.school);
 for(const row of magic.attunements||[])out.push(typeof row==="string"?row:row?.id,typeof row==="string"?row:row?.name);
 for(const row of p.talents||[])out.push(typeof row==="string"?row:row?.id,typeof row==="string"?row:row?.name);
 for(const row of p.capabilities||[])out.push(typeof row==="string"?row:row?.id,typeof row==="string"?row:row?.name);
 return [...new Set(out.map(x=>clean(x,80)).filter(Boolean))]
}
function capabilityAvailable(state,required){
 const q=clean(required,80).toLowerCase();if(!q)return true;
 return playerCapabilityLabels(state).some(x=>{const v=x.toLowerCase();return v===q||v.includes(q)||q.includes(v)})
}
function genericMagicAvailable(state){
 const p=state.player||{},magic=p.magic||{};
 if((magic.knownSpells||[]).length||(magic.attunements||[]).length)return true;
 return [...(p.capabilities||[]),...(p.talents||[])].some(row=>/magic|mana|spell|cast|靈息|靈能|魔力|魔法|法術|施法/i.test(String(typeof row==="string"?row:row?.id||row?.name||"")))
}
export function evaluateSuggestionRequirements(state,row={}){
 const x=normalizeContextualSuggestion(row,{state,locale:contextualLocale(state)});if(!x)return {ok:false,reasons:["INVALID_SUGGESTION"]};
 const reasons=[];
 if(!requiredItemsAvailable(state,x))reasons.push("REQUIRED_ITEM_MISSING");
 const implied=impliedInventoryItem(x.action);
 if(implied&&!inventoryRows(state).some(item=>[item?.id,item?.name].some(v=>v&&String(v)===implied)))reasons.push("IMPLIED_ITEM_MISSING:"+implied);
 for(const required of x.requiredCapabilities)if(!capabilityAvailable(state,required))reasons.push("REQUIRED_CAPABILITY_MISSING:"+required);
 const special=x.action.match(SPECIAL_POWER)?.[1];if(special&&!capabilityAvailable(state,special))reasons.push("IMPLIED_CAPABILITY_MISSING:"+special);
 const genericMagic=GENERIC_MAGIC_USE.test(x.action);if(genericMagic&&!genericMagicAvailable(state))reasons.push("IMPLIED_CAPABILITY_MISSING:MAGIC_USE");
 if(x.targetId){const npc=(state.world?.registry?.npcs||[]).find(n=>n.id===x.targetId);if(npc&&!(npc.known===true&&npc.alive!==false))reasons.push("TARGET_UNAVAILABLE")}
 return {ok:reasons.length===0,reasons,impliedItem:implied||null,impliedCapability:special||null}
}
function contextSealCurrent(state,v){
 if(!v)return false;
 return String(v.worldId||"")===String(state.world?.id||"")
  &&String(v.location||"")===String(state.player?.location||"")
  &&Number(v.day)===(Number(state.world?.state?.day)||1)
  &&Number(v.eventCount)===sceneEventCount(state)
  &&(!v.inventorySeal||String(v.inventorySeal)===inventorySeal(state))
}
function canonicalTravelTarget(state,row={}){
 const current=String(state.player?.location||""),locations=(state.world?.registry?.locations||[]).filter(loc=>loc?.known===true&&String(loc?.name||"")!==current&&String(loc?.id||"")!==current);
 const target=clean(row?.targetId,100);if(target){const byId=locations.find(loc=>String(loc?.id||"")===target||String(loc?.name||"")===target);if(byId)return byId}
 const action=String(row?.action||row?.label||"");return locations.find(loc=>loc?.name&&action.includes(String(loc.name)))||null
}
function canonicalSuggestion(state,row){
 const x=normalizeContextualSuggestion(row,{state,locale:contextualLocale(state)});if(!x)return null;
 const targetId=inferSuggestionTarget(state,x);let y=targetId&&!x.targetId?{...x,targetId}:x;
 y={...y,label:redactUnknownNpcNames(state,y.label),action:redactUnknownNpcNames(state,y.action)};
 if(y.kind==="TRAVEL"&&!canonicalTravelTarget(state,y)){const observe=trustedSuggestionObservationDominant(y.action);y={...y,kind:observe?"OBSERVE":"GENERAL",targetId:null}}
 return y
}
function seal(state,row){
 const x=canonicalSuggestion(state,row);if(!x||(x.source==="AI"&&!x.causalBasis))return null;
 const requirements=evaluateSuggestionRequirements(state,x);if(!requirements.ok)return null;
 if(x.prevalidated&&x.validatedContext)return contextSealCurrent(state,x.validatedContext)?{...x,requirementsSatisfied:true}:null;
 const affordance=observableAffordance(state,x);
 return {...x,requirementsSatisfied:true,affordance,prevalidated:true,validatedContext:{worldId:String(state.world?.id||""),location:String(state.player?.location||""),day:Number(state.world?.state?.day)||1,eventCount:sceneEventCount(state),targetId:x.targetId||null,inventorySeal:inventorySeal(state)}}
}
function suggestionExclusionSet(rows=[]){
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
 for(const npc of presentNpcs(state))rows.push(normalizeContextualSuggestion({label:`換個問題詢問${clean(visibleNpcName(state,npc),50)}`,action:`向${clean(visibleNpcName(state,npc),50)}改問一項尚未重複、而且對方可憑親身觀察回答的具體細節`,kind:"SOCIAL",risk:"LOW",approach:"SOCIAL",targetId:String(npc.id||""),progression:Boolean(objective),causalBasis:"NPC 目前在可互動範圍內",requirementsSatisfied:true,source:"ENGINE"}));
 for(const item of inventoryRows(state).slice(0,4)){
  const name=clean(item?.name||item?.id,50),id=clean(item?.id||item?.name,100);if(!name||!id)continue;
  rows.push(normalizeContextualSuggestion({label:`重新檢查「${name}」能提供甚麼線索`,action:`取出「${name}」，只根據目前已知用途與可見特徵檢查它是否能協助判斷眼前局勢，不消耗或交出物品`,kind:"OBSERVE",risk:"LOW",approach:"CREATIVE",requiredItemIds:[id],causalBasis:"物品目前確實在玩家持有清單內",requirementsSatisfied:true,source:"ENGINE"}))
 }
 rows.push(normalizeContextualSuggestion({label:"改查場景中先前忽略的細節",action:`在${loc}刻意避開上一批建議所指向的位置與對象，檢查另一處可直接看到的出入口、痕跡或環境變化`,kind:"OBSERVE",risk:"LOW",approach:"STEADY",progression:Boolean(objective),causalBasis:"當前場景仍可直接觀察",requirementsSatisfied:true,source:"ENGINE"}));
 rows.push(normalizeContextualSuggestion({label:"用不同方式測試現場反應",action:`只利用${loc}目前可見的人流、聲音或遮蔽物，以不消耗未知資源的另一種方式測試環境反應`,kind:"GENERAL",risk:"MEDIUM",approach:"CREATIVE",causalBasis:"只使用玩家目前可直接感知的環境",requirementsSatisfied:true,source:"ENGINE"}));
 return uniq(rows.filter(Boolean),20)
}
function contextualSuggestionProvenanceScope(state){const registry=state?.world?.registry||{},locations=Array.isArray(registry.locations)?registry.locations:[],npcs=Array.isArray(registry.npcs)?registry.npcs:[],raw=String(state?.player?.location||state?.world?.state?.location||""),location=locations.find(x=>String(x?.id||"")===raw||String(x?.name||"")===raw)||null,locId=String(location?.id||""),present=npcs.filter(n=>n?.alive!==false&&(n?.companion?.status==="ACTIVE"||(locId&&String(n?.locationId||"")===locId))),worldId=String(state?.world?.id||""),allowed=new Set([raw,locId,String(location?.name||"")].filter(Boolean));return {worldId,currentLocation:String(playerVisibleLocationName(state)||raw||""),locationDescription:String(location?.description||""),presentNpcNames:present.map(n=>String(playerVisibleNpcName(state,n)||"")).filter(Boolean),allNpcNames:npcs.map(n=>String(n?.name||"")).filter(Boolean),knownLocations:locations.filter(x=>x?.known===true||x===location).map(x=>String(x?.name||"")).filter(Boolean),visibleEventTexts:(state?.events||[]).filter(e=>e?.visibility!=="INTERNAL"&&(!e?.worldId||String(e.worldId)===worldId)&&(!e?.locationId&&!e?.location||allowed.has(String(e.locationId||e.location)))).slice(-8).map(e=>String(e?.playerSummary||e?.visibleSummary||e?.summary||e?.text||"")).filter(Boolean)}}
function suggestionMatchesCurrentScene(state,row){const inferred=inferActionKind(row?.action||row?.label||"");const effective=inferred==="TRAVEL"&&String(row?.kind||"").toUpperCase()!=="TRAVEL"?{...row,kind:"TRAVEL"}:row;return validateSuggestionProvenance(effective,contextualSuggestionProvenanceScope(state)).valid}
export function buildContextualActionSet(state,input=[],options={}){
 const recent=recentPlayerActions(state),excluded=suggestionExclusionSet(options?.exclude),isFresh=x=>freshSuggestion(recent,x)&&!excluded.has(clean(x?.action,180))&&!excluded.has(clean(x?.label,180));
 const raw=uniq((Array.isArray(input)?input:[]).map(x=>canonicalSuggestion(state,x)).filter(x=>x&&suggestionMatchesCurrentScene(state,x)&&isFresh(x)&&x.requirementsSatisfied===true&&(x.source!=="AI"||Boolean(x.causalBasis))&&(!x.prevalidated||!x.validatedContext||contextSealCurrent(state,x.validatedContext))&&evaluateSuggestionRequirements(state,x).ok),8).sort((a,b)=>rhythmSuggestionBias(state,b)-rhythmSuggestionBias(state,a));
 let progression=raw.find(x=>x.progression&&!["HIGH","EXTREME"].includes(x.risk));
 if(!progression){const candidate=progressionSuggestion(state);if(isFresh(candidate))progression=candidate}
 const personalized=personalizedSuggestion(state);
 const main=[];
 if(progression)main.push(progression);
 if(personalized&&isFresh(personalized)&&!main.some(x=>x.action===personalized.action))main.push(personalized);
 const preferred=["STEADY","SOCIAL","CREATIVE"];
 for(const approach of preferred){
  const x=raw.find(r=>r.approach===approach&&!["HIGH","EXTREME"].includes(r.risk)&&!main.some(m=>m.action===r.action));
  if(x)main.push(x);
  if(main.length>=3)break
 }
 for(const x of raw){if(main.length>=3)break;if(!["HIGH","EXTREME"].includes(x.risk)&&!main.some(m=>m.action===x.action))main.push(x)}
 for(const approach of preferred){if(main.length>=3)break;const x=fallbackByApproach(state,approach);if(x&&isFresh(x)&&!main.some(m=>m.action===x.action))main.push(x)}
 const genericFill=[
  normalizeContextualSuggestion({label:"檢查眼前最不自然的新痕跡",action:`在${currentLocation(state)}比較最新痕跡與周圍環境，找出最不自然的一處`,kind:"OBSERVE",risk:"LOW",skillHint:"感知 / 觀察",approach:"STEADY",causalBasis:"當前場景可直接觀察",requirementsSatisfied:true,source:"ENGINE"}),
  normalizeContextualSuggestion({label:"找一個能提供現場資訊的人",action:`在${currentLocation(state)}尋找目前可接觸、並可能親眼看過剛才變化的人詢問`,kind:"SOCIAL",risk:"LOW",skillHint:"交涉",approach:"SOCIAL",causalBasis:"公開場景允許尋找目擊者",requirementsSatisfied:true,source:"ENGINE"}),
  normalizeContextualSuggestion({label:"換一個角度測試眼前局勢",action:`利用${currentLocation(state)}可見的遮蔽物、人流或聲音，換一個不需要未知資源的方法測試誰會作出反應`,kind:"GENERAL",risk:"MEDIUM",skillHint:"應變",approach:"CREATIVE",causalBasis:"只使用當前可見環境",requirementsSatisfied:true,source:"ENGINE"})
 ];
 for(const x of genericFill.sort((a,b)=>rhythmSuggestionBias(state,b)-rhythmSuggestionBias(state,a))){if(main.length>=3)break;if(x&&isFresh(x)&&!main.some(m=>m.action===x.action))main.push(x)}
 if(!main.some(x=>x.progression&&!["HIGH","EXTREME"].includes(x.risk))){const fallbackProgression=progressionSuggestion(state);if(isFresh(fallbackProgression))main.unshift(fallbackProgression)}
 main.splice(3);
 const high=raw.find(x=>["HIGH","EXTREME"].includes(x.risk))||(()=>{const x=fallbackByApproach(state,"BOLD");return isFresh(x)?x:null})();
 const selected=uniq([...main.slice(0,3),high],4).map(x=>seal(state,x)).filter(Boolean);
 return {primary:selected.filter(x=>!["HIGH","EXTREME"].includes(x.risk)).slice(0,3),highRisk:selected.filter(x=>["HIGH","EXTREME"].includes(x.risk)).slice(0,1),all:selected}
}
export function regenerateContextualActionSet(state,{exclude=[]}={}){
 const set=buildContextualActionSet(state,suggestionRefreshCandidates(state),{exclude}),primary=set.primary.filter(x=>x?.prevalidated===true&&evaluateSuggestionRequirements(state,x).ok).slice(0,3);
 return {primary,highRisk:[],all:primary}
}
function trustedSuggestionHasKnownDestination(state,action){
 const current=String(state.player?.location||"");
 return (state.world?.registry?.locations||[]).some(loc=>loc?.known===true&&loc?.name&&String(loc.name)!==current&&String(action||"").includes(String(loc.name)))
}
function trustedSuggestionObservationDominant(action){return /觀察|查看|檢查|搜尋|尋找|調查|辨識|比對|比較|確認|探索|描摹|記錄|線索|證據|痕跡|observe|inspect|search|investigate|compare|trace|explore|confirm/i.test(String(action||""))}
export function trustedSuggestionAssessment(state,row){
 const x=canonicalSuggestion(state,row),v=row?.validatedContext;
 if(!x||row?.prevalidated!==true||!v)return null;
 const requirements=evaluateSuggestionRequirements(state,x);
 if(!contextSealCurrent(state,v)||!requirements.ok)return null;
 if(state.combat?.active||state.player?.status==="DOWNED")return null;
 if(x.targetId){
  const npc=(state.world?.registry?.npcs||[]).find(n=>n.id===x.targetId);
  if(npc&&!(npc.known===true&&npc.alive!==false))return null
 }
 const engineKind=inferActionKind(x.action),destination=canonicalTravelTarget(state,x),travelLike=x.kind==="TRAVEL"||engineKind==="TRAVEL",localTravel=travelLike&&!destination,localObserve=localTravel&&trustedSuggestionObservationDominant(x.action),kind=localTravel?(localObserve?"OBSERVE":"GENERAL"):(engineKind==="GENERAL"?x.kind:engineKind);
 let actionIntent=normalizeActionIntent({targetId:x.targetId,method:x.approach,subActions:[x.action]},x.action,kind,{registry:state.world?.registry||{}});
 if(localTravel)actionIntent={...actionIntent,kind,intent:kind==="OBSERVE"?"OBSERVE":"GENERAL",targetId:null};
 const corrected=kind!==x.kind;
 return {verdict:"ALLOW",kind:actionIntent.kind,normalizedAction:x.action,reason:corrected?"Engine 已重新分類 AI 建議的語義種類，再進入規則判定。":"建議已由 Engine 重新驗證需求、場景前提、語義種類與目標。",requirements:[],confidence:corrected?90:96,source:corrected?"AI_SUGGESTION_ENGINE_RECLASSIFIED":"AI_SUGGESTION_PREVALIDATED",actionIntent}
}
export function suggestionPresentation(state,row){
 const x=canonicalSuggestion(state,row);if(!x)return {label:"",meta:""};
 const difficulty=String(state.player?.difficulty||state.world?.creation?.blueprint?.difficulty||"normal"),labels=presentationLabels(state),risk=labels.risk[x.risk]||"",skill=presentationSkill(state,x.skillHint);
 if(difficulty==="realistic")return {label:x.label,meta:"",approach:labels.approach[x.approach]||""};
 if(difficulty==="hard")return {label:x.label,meta:risk,approach:labels.approach[x.approach]||""};
 const parts=[skill,risk,presentationConsequence(state,x.consequenceHint)].filter(Boolean);
 return {label:x.label,meta:parts.join(" · "),approach:labels.approach[x.approach]||""}
}

export function groundedTravelDestination(state,action="",roll={},intent={}){
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

export function groundedSuggestionFailForward(state,row,roll={}){
 const x=canonicalSuggestion(state,row),v=row?.validatedContext,a=x?.affordance;
 if(!x||row?.prevalidated!==true||!v||!contextSealCurrent(state,v)||!evaluateSuggestionRequirements(state,x).ok||roll?.success!==true||x.progression!==true||!a?.sourceKind||!a?.sourceId||!a?.text)return null;
 if(a.sourceKind==="EVENT"){
  const event=(state.events||[]).find(e=>String(e?.id)===a.sourceId&&e?.visibility!=="INTERNAL");if(!event)return null
 }else if(a.sourceKind==="LOCATION"){
  const loc=currentLocationRecord(state);if(!loc||![String(loc.id||""),String(loc.name||"")].includes(a.sourceId))return null
 }else if(a.sourceKind==="NPC"){
  if(!presentNpcs(state).some(n=>String(n.id)===a.sourceId))return null
 }else return null;
 return {title:a.title||"成功觀察到的既有線索",text:a.text,factId:"",evidenceType:["OBSERVED","HEARD","READ","EXAMINED"].includes(a.evidenceType)?a.evidenceType:"OBSERVED",sourceKind:a.sourceKind,sourceId:a.sourceId}
}
