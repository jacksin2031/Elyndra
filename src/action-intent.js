const clean=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const KINDS=new Set(["OBSERVE","SOCIAL","TRAVEL","RISKY","GENERAL"]);
const INTENTS=new Set(["OBSERVE","TALK","TRAVEL","STEAL","ATTACK","USE_ITEM","GIVE_ITEM","SHOW_ITEM","CAST","CRAFT","REST","EAT","INTERACT","PERSUADE","THREATEN","SNEAK","GENERAL"]);
const RISKY_ACTION=/攀|跳|破壞|偷|竊|闖|攻擊|潛入|撬|climb|jump|break|steal|attack|sneak|lockpick/;
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
export function inferActionIntent(action="",kind=""){
 const q=clean(action),k=KINDS.has(String(kind).toUpperCase())?String(kind).toUpperCase():inferActionKind(q);
 let intent="GENERAL";
 if(/偷|竊|steal/.test(q))intent="STEAL";
 else if(/攻擊|打|斬|attack/.test(q))intent="ATTACK";
 else if(/施法|魔法|術式|咒|cast|spell|magic/.test(q))intent="CAST";
 else if(/製作|打造|合成|craft/.test(q))intent="CRAFT";
 else if(/休息|睡眠|紮營|露營|住宿|rest|sleep|camp/.test(q))intent="REST";
 else if(/食用|進食|吃|喝|飲用|eat|drink/.test(q))intent="EAT";
 else if(/交給|交出|贈送|give/.test(q))intent="GIVE_ITEM";
 else if(/展示|出示|show/.test(q))intent="SHOW_ITEM";
 else if(/使用|use/.test(q))intent="USE_ITEM";
 else if(/說服|persuade/.test(q))intent="PERSUADE";
 else if(/威脅|恐嚇|threat/.test(q))intent="THREATEN";
 else if(/潛入|躲避|偷偷|sneak/.test(q))intent="SNEAK";
 else if(k==="OBSERVE")intent="OBSERVE";
 else if(k==="SOCIAL")intent="TALK";
 else if(k==="TRAVEL")intent="TRAVEL";
 else if(/互動|打開|推開|拉動|觸碰|interact|open|push|pull/.test(q))intent="INTERACT";
 return {intent,k}
}
function targetFromSnapshot(action,snapshot={}){
 const q=clean(action),npcs=snapshot?.registry?.npcs||snapshot?.knowledge?.nearbyNpcs||[],locations=snapshot?.knowledge?.knownLocations||snapshot?.registry?.locations||[];
 for(const n of npcs){const name=clean(n?.name,80);if(name&&q.includes(name))return {targetId:clean(n?.id,100)||null,target:name}}
 for(const l of locations){const name=clean(typeof l==="string"?l:l?.name,100);if(name&&q.includes(name))return {targetId:clean(l?.id,100)||null,target:name}}
 return {targetId:null,target:null}
}
export function normalizeActionIntent(raw={},action="",kind="",snapshot={}){
 const q=clean(action),base=inferActionIntent(q,kind),r=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{},candidate=String(r.intent||base.intent).toUpperCase(),resolvedIntent=INTENTS.has(candidate)?candidate:base.intent,resolvedKind=KINDS.has(String(r.kind||base.k).toUpperCase())?String(r.kind||base.k).toUpperCase():base.k,t=targetFromSnapshot(q,snapshot);
 const subs=(Array.isArray(r.subActions)?r.subActions:[]).map(x=>clean(x,120)).filter(Boolean).slice(0,5);
 return {
  raw:q,
  intent:resolvedIntent,
  kind:resolvedKind,
  targetId:clean(r.targetId,100)||t.targetId,
  target:clean(r.target,120)||t.target,
  method:clean(r.method,120)||null,
  tool:clean(r.tool,120)||null,
  subActions:subs.length?subs:[q].filter(Boolean)
 }
}
export function actionIntentFromAssessment(assessment={},action="",snapshot={}){
 return normalizeActionIntent(assessment?.actionIntent||assessment,assessment?.normalizedAction||action,assessment?.kind,snapshot)
}
export const ACTION_INTENT_SCHEMA='{"intent":"OBSERVE|TALK|TRAVEL|STEAL|ATTACK|USE_ITEM|GIVE_ITEM|SHOW_ITEM|CAST|CRAFT|REST|EAT|INTERACT|PERSUADE|THREATEN|SNEAK|GENERAL","targetId":null,"target":null,"method":null,"tool":null,"subActions":["1-5個語義子步驟"]}';
