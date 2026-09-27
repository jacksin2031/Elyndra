const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const uniq=(rows,max=8)=>[...new Set((Array.isArray(rows)?rows:[]).map(x=>clean(x,120)).filter(Boolean))].slice(0,max);
const KINDS=new Set(["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"]);
const INTENTS=new Set(["OBSERVE","TALK","TRAVEL","STEAL","ATTACK","DEFEND","MOVE","ASSIST","SOCIAL","MANIPULATE","USE_ITEM","GIVE_ITEM","SHOW_ITEM","CAST","CRAFT","REST","EAT","INTERACT","PERSUADE","THREATEN","SNEAK","GENERAL"]);
const APPROACHES=new Set(["FORCE","FINESSE","STEALTH","DECEPTION","PERSUASION","INTIMIDATION","KNOWLEDGE","INSTINCT","MAGIC","CREATIVE"]);
const RISKS=new Set(["LOW","MEDIUM","HIGH","EXTREME","UNKNOWN"]);
const RISKY_ACTION=/攀|跳|破壞|偷|竊|闖|攻擊|潛入|撬|climb|jump|break|steal|attack|sneak|lockpick/;
const SOCIAL_ACTION=/說|問|詢問|交談|對話|展示|出示|交給|贈送|說服|威脅|talk|ask|question|show|give|persuade|threat/;
const TRAVEL_ACTION=/前往|走到|走出|離開|移動|旅行|穿越|跟隨|跟上|踏出|進入|深入|前進|後退|退到|朝.+前進|沿著.+前進|循著.+(?:走|前進)|travel|go to|walk|move|follow/;
const ABANDONED_SOCIAL=/(?:不再|停止|放棄|結束)(?:繼續)?(?:追問|詢問|提問|交談|對話|問)|(?:不再|停止|放棄).{0,24}(?:問|詢問).{0,36}(?:轉身|離開|跟上|前進|移動|踏出)/;
const OBSERVE_ACTION=/觀察|查看|檢查|搜尋|尋找|調查|聆聽|閱讀|比對|痕跡|目擊|誰會.*反應|測試.*反應|找出.*(?:線索|證據|異常|人物)|observe|inspect|search|listen|read|trace|witness|reaction/;
const GENERIC_NPC_REFERENCE=/護衛|守衛|士兵|陌生人|傷者|男人|女人|居民|店員|商人|引路人|那個人|那人|對方|那名人物|那名人|guard|stranger|soldier|merchant|resident/i;
const NEGATED_CLAUSE=/(?:不想|不要|不打算|不會|別|並非要|不是要|沒有要|無意)[^，,。；;!?！？]{0,80}/gi;
function positiveIntentText(action=""){return clean(action).replace(NEGATED_CLAUSE," ").trim()}
export function inferActionKind(action=""){
 const q=positiveIntentText(action).toLowerCase();
 if(RISKY_ACTION.test(q))return "RISKY";
 const travel=TRAVEL_ACTION.test(q),social=SOCIAL_ACTION.test(q);
 if(travel&&(!social||ABANDONED_SOCIAL.test(q)))return "TRAVEL";
 if(social)return "SOCIAL";
 if(travel)return "TRAVEL";
 if(OBSERVE_ACTION.test(q))return "OBSERVE";
 return "GENERAL"
}
export function inferActionIntent(action="",kind=""){
 const rawQ=clean(action),q=positiveIntentText(rawQ),k=KINDS.has(String(kind).toUpperCase())?String(kind).toUpperCase():inferActionKind(q);
 let intent="GENERAL";
 if(/防禦|格擋|架盾|招架|defend|block|parry/i.test(q))intent="DEFEND";
 else if(/協助|支援|幫助|掩護|assist|help|support/i.test(q))intent="ASSIST";
 else if(/偷|竊|steal/i.test(q))intent="STEAL";
 else if(/攻擊|打|斬|砍|刺|射擊|attack|strike|slash|shoot/i.test(q))intent="ATTACK";
 else if(/施法|魔法|術式|咒|cast|spell|magic/i.test(q))intent="CAST";
 else if(/製作|打造|合成|craft/i.test(q))intent="CRAFT";
 else if(/休息|睡眠|紮營|露營|住宿|rest|sleep|camp/i.test(q))intent="REST";
 else if(/食用|進食|吃|喝|飲用|eat|drink/i.test(q))intent="EAT";
 else if(/交給|交出|贈送|give/i.test(q))intent="GIVE_ITEM";
 else if(/展示|出示|show/i.test(q))intent="SHOW_ITEM";
 else if(/使用|use/i.test(q))intent="USE_ITEM";
 else if(/說服|勸說|談判|persuade|negotiate/i.test(q))intent="PERSUADE";
 else if(/威脅|恐嚇|threat|intimidat/i.test(q))intent="THREATEN";
 else if(/潛入|躲避|偷偷|匿蹤|sneak|hide|stealth/i.test(q))intent="SNEAK";
 else if(/引誘|誘導|設陷阱|牽制|lure|bait|trap/i.test(q))intent="MANIPULATE";
 else if(k==="OBSERVE")intent="OBSERVE";
 else if(k==="SOCIAL")intent="TALK";
 else if(k==="TRAVEL")intent="TRAVEL";
 else if(/互動|打開|推開|拉動|觸碰|interact|open|push|pull/i.test(q))intent="INTERACT";
 return {intent,k}
}
export function inferActionApproach(action="",intent="GENERAL",kind="GENERAL"){
 const q=positiveIntentText(action).toLowerCase(),i=String(intent||"GENERAL").toUpperCase(),k=String(kind||"GENERAL").toUpperCase();
 if(/施法|魔法|術式|咒|cast|spell|magic/.test(q)||i==="CAST")return "MAGIC";
 if(/欺騙|謊|假裝|冒充|偽裝|騙|deceiv|lie|pretend|disguise/.test(q))return "DECEPTION";
 if(/威脅|恐嚇|逼迫|threat|intimidat/.test(q)||i==="THREATEN")return "INTIMIDATION";
 if(/說服|談判|勸說|禮貌|請求|persuade|negotiate|convince/.test(q)||i==="PERSUADE")return "PERSUASION";
 if(/潛入|偷偷|躲藏|匿蹤|扒竊|順手牽羊|sneak|stealth|hide|pickpocket/.test(q)||["STEAL","SNEAK"].includes(i))return "STEALTH";
 if(/引誘|誘導|利用.+(?:環境|地形|物件)|吊燈|陷阱|聲東擊西|就地取材|lure|bait|trap|environment|improvise/.test(q)||i==="MANIPULATE")return "CREATIVE";
 if(/分析|研究|閱讀|辨識|推理|比對|檢查|調查|analy|research|read|inspect|deduc/.test(q)||i==="OBSERVE")return "KNOWLEDGE";
 if(/滑|翻滾|閃避|平衡|精準|輕手輕腳|dodge|slide|roll under|balance|precis|finesse/.test(q))return "FINESSE";
 if(/砸|撞|推倒|抓住|壓制|強行|猛攻|力量|smash|ram|grapple|force|overpower/.test(q)||["ATTACK","DEFEND"].includes(i))return "FORCE";
 if(/感覺|直覺|聆聽|嗅|追跡|sense|instinct|listen|track/.test(q))return "INSTINCT";
 if(k==="SOCIAL")return "PERSUASION";
 if(k==="TRAVEL")return "FINESSE";
 if(k==="RISKY")return "FORCE";
 if(k==="OBSERVE")return "KNOWLEDGE";
 return "INSTINCT"
}
export function inferActionRisk(action="",kind="GENERAL"){
 const q=positiveIntentText(action).toLowerCase(),k=String(kind||"GENERAL").toUpperCase();
 if(/搏命|不惜一切|以命相搏|極度危險|致命|suicidal|all or nothing|lethal/.test(q))return "EXTREME";
 if(/強行|冒險|危險|攻擊|偷|潛入|闖|破壞|high risk|dangerous|attack|steal|sneak|break/.test(q))return "HIGH";
 if(/小心|謹慎|低調|慢慢|先觀察|careful|cautious|quietly|low risk/.test(q))return "LOW";
 if(k==="RISKY")return "HIGH";
 return "UNKNOWN"
}
export function inferActionGoal(intent="GENERAL"){
 const i=String(intent||"GENERAL").toUpperCase();
 return ({OBSERVE:"gain_observable_information",TALK:"exchange_information",TRAVEL:"reach_destination",STEAL:"acquire_target_without_permission",ATTACK:"overcome_or_harm_target",DEFEND:"reduce_or_redirect_harm",MOVE:"change_position",ASSIST:"improve_ally_position",SOCIAL:"change_social_position",MANIPULATE:"change_situation_indirectly",USE_ITEM:"apply_item_effect",GIVE_ITEM:"transfer_item",SHOW_ITEM:"present_item_as_evidence_or_signal",CAST:"apply_magic_effect",CRAFT:"create_or_modify_item",REST:"recover_capacity",EAT:"consume_resource",INTERACT:"change_object_or_environment",PERSUADE:"gain_voluntary_cooperation",THREATEN:"gain_compliance_through_pressure",SNEAK:"avoid_detection",GENERAL:"change_current_situation"})[i]||"change_current_situation"
}
function targetRows(snapshot={}){
 const npcs=Array.isArray(snapshot?.registry?.npcs)?snapshot.registry.npcs:Array.isArray(snapshot?.knowledge?.nearbyNpcs)?snapshot.knowledge.nearbyNpcs:[];
 const locations=Array.isArray(snapshot?.knowledge?.knownLocations)?snapshot.knowledge.knownLocations:Array.isArray(snapshot?.registry?.locations)?snapshot.registry.locations:[];
 const combatants=Array.isArray(snapshot?.combat?.combatants)?snapshot.combat.combatants:Array.isArray(snapshot?.encounter?.combatants)?snapshot.encounter.combatants:[];
 const enemy=snapshot?.combat?.enemy&&typeof snapshot.combat.enemy==="object"?snapshot.combat.enemy:null;
 return {npcs,locations,combatants:enemy?[...combatants,enemy]:combatants}
}
function canonicalTargetById(targetId,snapshot={}){
 const id=clean(targetId,100);if(!id)return null;
 const {npcs,locations,combatants}=targetRows(snapshot),npc=npcs.find(x=>clean(x?.id,100)===id);if(npc)return {targetId:id,target:clean(npc?.name,120)||null};
 const loc=locations.find(x=>typeof x!=="string"&&clean(x?.id,100)===id);if(loc)return {targetId:id,target:clean(loc?.name,120)||null};
 const combatant=combatants.find(x=>clean(x?.id,100)===id);if(combatant)return {targetId:id,target:clean(combatant?.name,120)||null};
 return null
}
function targetFromSnapshot(action,snapshot={}){
 const q=clean(action),{npcs,locations,combatants}=targetRows(snapshot);
 for(const n of [...combatants,...npcs]){const name=clean(n?.name,80);if(name&&q.includes(name))return {targetId:clean(n?.id,100)||null,target:name}}
 for(const n of npcs){const role=clean(n?.role,80);if(role&&role.length>=2&&q.includes(role))return {targetId:clean(n?.id,100)||null,target:clean(n?.name,80)||role}}
 for(const l of locations){const name=clean(typeof l==="string"?l:l?.name,100);if(name&&q.includes(name))return {targetId:clean(typeof l==="string"?"":l?.id,100)||null,target:name}}
 if(npcs.length===1&&GENERIC_NPC_REFERENCE.test(q)){const n=npcs[0];return {targetId:clean(n?.id,100)||null,target:clean(n?.name,80)||clean(n?.role,80)||null}}
 return {targetId:null,target:null}
}
function itemRows(snapshot={}){return Array.isArray(snapshot?.inventory)?snapshot.inventory:Array.isArray(snapshot?.player?.inventory)?snapshot.player.inventory:[]}
function canonicalToolById(toolId,snapshot={}){
 const id=clean(toolId,100);if(!id)return null;const item=itemRows(snapshot).find(x=>clean(x?.id,100)===id);return item?{toolId:id,tool:clean(item?.name,120)||null}:null
}
function toolFromSnapshot(action,snapshot={}){
 const q=clean(action);for(const item of itemRows(snapshot)){const name=clean(item?.name,100);if(name&&q.includes(name))return {toolId:clean(item?.id,100)||null,tool:name}}return {toolId:null,tool:null}
}
export function normalizeActionIntent(raw={},action="",kind="",snapshot={}){
 const q=clean(action),base=inferActionIntent(q,kind),r=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{},candidate=String(r.intent||base.intent).toUpperCase(),resolvedIntent=INTENTS.has(candidate)?candidate:base.intent,resolvedKind=KINDS.has(String(r.kind||base.k).toUpperCase())?String(r.kind||base.k).toUpperCase():base.k;
 const canonical=canonicalTargetById(r.targetId,snapshot),inferred=canonical||targetFromSnapshot(`${q} ${clean(r.target,120)}`,snapshot),targetRowsNormalized=[];
 for(const id of Array.isArray(r.targetIds)?r.targetIds:[]){const found=canonicalTargetById(id,snapshot);if(found)targetRowsNormalized.push(found)}
 if(inferred?.targetId&&!targetRowsNormalized.some(x=>x.targetId===inferred.targetId))targetRowsNormalized.unshift(inferred);
 const targetIds=uniq(targetRowsNormalized.map(x=>x.targetId),6),targetId=targetIds[0]||inferred?.targetId||null,target=targetRowsNormalized.find(x=>x.targetId===targetId)?.target||inferred?.target||clean(r.target,120)||null;
 const explicitTool=canonicalToolById(r.toolId,snapshot),inferredTool=explicitTool||toolFromSnapshot(`${q} ${clean(r.tool,120)}`,snapshot),toolRowsNormalized=[];
 for(const id of Array.isArray(r.toolIds)?r.toolIds:[]){const found=canonicalToolById(id,snapshot);if(found)toolRowsNormalized.push(found)}
 if(inferredTool?.toolId&&!toolRowsNormalized.some(x=>x.toolId===inferredTool.toolId))toolRowsNormalized.unshift(inferredTool);
 const toolIds=uniq(toolRowsNormalized.map(x=>x.toolId),6),toolId=toolIds[0]||inferredTool?.toolId||null,tool=toolRowsNormalized.find(x=>x.toolId===toolId)?.tool||inferredTool?.tool||clean(r.tool,120)||null;
 const subs=(Array.isArray(r.subActions)?r.subActions:[]).map(x=>clean(x,120)).filter(Boolean).slice(0,5),approachCandidate=String(r.approach||"").toUpperCase(),approach=APPROACHES.has(approachCandidate)?approachCandidate:inferActionApproach(q,resolvedIntent,resolvedKind),riskCandidate=String(r.risk||"").toUpperCase(),risk=RISKS.has(riskCandidate)?riskCandidate:inferActionRisk(q,resolvedKind),goal=clean(r.goal,180)||inferActionGoal(resolvedIntent),rawStakes=r.stakes&&typeof r.stakes==="object"&&!Array.isArray(r.stakes)?r.stakes:{},desiredOutcome=clean(rawStakes.desiredOutcome,180)||goal,acceptedRisk=clean(rawStakes.acceptedRisk,180)||null,n=Number(r.confidence),confidence=Number.isFinite(n)?clamp(Math.round(n),0,100):(resolvedIntent==="GENERAL"?45:70);
 return {
  raw:q,
  intent:resolvedIntent,
  kind:resolvedKind,
  approach,
  goal,
  risk,
  targetId,
  targetIds,
  target,
  toolId,
  toolIds,
  tool,
  method:clean(r.method,120)||null,
  stakes:{desiredOutcome,acceptedRisk},
  confidence,
  subActions:subs.length?subs:[q].filter(Boolean)
 }
}
export function actionIntentFromAssessment(assessment={},action="",snapshot={}){
 return normalizeActionIntent(assessment?.actionIntent||assessment,assessment?.normalizedAction||action,assessment?.kind,snapshot)
}
export const ACTION_INTENT_SCHEMA='{"intent":"OBSERVE|TALK|TRAVEL|STEAL|ATTACK|DEFEND|MOVE|ASSIST|SOCIAL|MANIPULATE|USE_ITEM|GIVE_ITEM|SHOW_ITEM|CAST|CRAFT|REST|EAT|INTERACT|PERSUADE|THREATEN|SNEAK|GENERAL","approach":"FORCE|FINESSE|STEALTH|DECEPTION|PERSUASION|INTIMIDATION|KNOWLEDGE|INSTINCT|MAGIC|CREATIVE","goal":"玩家想直接達成甚麼，不是敘事結果","risk":"LOW|MEDIUM|HIGH|EXTREME|UNKNOWN","targetId":null,"targetIds":[],"target":null,"toolId":null,"toolIds":[],"tool":null,"method":null,"stakes":{"desiredOutcome":"直接目的","acceptedRisk":null},"confidence":0,"subActions":["1-5個語義子步驟"]}';
