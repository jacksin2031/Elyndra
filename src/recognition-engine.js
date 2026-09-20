const uid=p=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const clean=(v,max=320)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SCOPES=["PERSONAL","LOCAL","REGIONAL","FACTION","WORLD"];
const RANK=Object.fromEntries(SCOPES.map((x,i)=>[x,i]));
const RENOWN_POINTS={PERSONAL:1,LOCAL:4,REGIONAL:10,FACTION:15,WORLD:25};
const NEGATIVE_TONES=new Set(["FEAR","RESENT","SUSPICIOUS"]);
const TONES=new Set(["NEUTRAL","RESPECT","ADMIRE","FEAR","RESENT","SUSPICIOUS","MIXED"]);
const MARK_KINDS=new Set(["MEMORIAL","NOTICE","SCAR","INSTITUTION","CUSTOM"]);
const DELAYS={PERSONAL:0,LOCAL:0,REGIONAL:180,FACTION:360,WORLD:720};

function tierFor(renown){
 if(renown>=60)return "LEGEND";
 if(renown>=30)return "MAJOR_FIGURE";
 if(renown>=12)return "REGIONAL_FIGURE";
 if(renown>=4)return "LOCAL_NAME";
 return "UNKNOWN"
}
function normalizeScope(v,fallback="LOCAL"){
 const x=String(v||fallback).toUpperCase();return SCOPES.includes(x)?x:fallback
}
function maxSpread(requested,scope){
 const r=normalizeScope(requested,scope);return RANK[r]<=RANK[scope]?r:scope
}
export function ensureRecognition(state){
 state.world.recognition??={version:1,renown:0,notoriety:0,tier:"UNKNOWN",deeds:[],rumors:[],titles:[],marks:[],reactions:[],factionAttention:{},processedImpactIds:[]};
 const x=state.world.recognition;x.version=1;x.renown=Math.max(0,Math.round(Number(x.renown)||0));x.notoriety=Math.max(0,Math.round(Number(x.notoriety)||0));x.tier=tierFor(x.renown);
 for(const key of ["deeds","rumors","titles","marks","reactions","processedImpactIds"])x[key]=Array.isArray(x[key])?x[key]:[];
 x.factionAttention=x.factionAttention&&typeof x.factionAttention==="object"&&!Array.isArray(x.factionAttention)?x.factionAttention:{};
 return x
}
export function validateRecognitionCandidate(input){
 if(input==null)return {valid:true,errors:[]};const errors=[];
 if(typeof input!=="object"||Array.isArray(input))return {valid:false,errors:["RECOGNITION_INVALID"]};
 if(input.publicLabel!=null&&clean(input.publicLabel,80).length<2)errors.push("RECOGNITION_LABEL_INVALID");
 if(input.rumor!=null&&clean(input.rumor,400).length<8)errors.push("RECOGNITION_RUMOR_INVALID");
 if(input.tone!=null&&!TONES.has(String(input.tone).toUpperCase()))errors.push("RECOGNITION_TONE_INVALID");
 if(input.spread!=null&&!SCOPES.includes(String(input.spread).toUpperCase()))errors.push("RECOGNITION_SPREAD_INVALID");
 if(input.legacyMark!=null){
  const m=input.legacyMark;
  if(!m||typeof m!=="object"||Array.isArray(m)||!MARK_KINDS.has(String(m.kind||"").toUpperCase())||clean(m.label,160).length<3)errors.push("RECOGNITION_MARK_INVALID")
 }
 return {valid:errors.length===0,errors:[...new Set(errors)]}
}
function targetRegion(state,record){
 if(record.targetKind!=="location")return "";
 const loc=(state.world.registry?.locations||[]).find(x=>x.id===record.targetId);return clean(loc?.region,80)
}
function rumorRelevantToNpc(state,rumor,npc){
 if(rumor.status!=="ACTIVE")return false;
 if(rumor.spread==="WORLD")return true;
 if(rumor.targetKind==="npc"&&rumor.targetId===npc.id)return true;
 if(rumor.targetKind==="faction"&&npc.factionId===rumor.targetId)return true;
 if(rumor.targetKind==="location"){
  if(npc.locationId===rumor.targetId)return true;
  if(rumor.spread==="REGIONAL"){
   const source=(state.world.registry?.locations||[]).find(x=>x.id===rumor.targetId),home=(state.world.registry?.locations||[]).find(x=>x.id===npc.locationId);
   return Boolean(source?.region&&home?.region&&source.region===home.region)
  }
 }
 return false
}
function rumorRelevantToFaction(rumor,faction){
 if(rumor.status!=="ACTIVE")return false;
 if(rumor.spread==="WORLD")return true;
 return rumor.targetKind==="faction"&&rumor.targetId===faction.id
}
export function registerImpactRecognition(state,record,input={}){
 const r=ensureRecognition(state);if(!record?.id||r.processedImpactIds.includes(record.id))return null;
 const v=validateRecognitionCandidate(input);if(!v.valid)throw new Error(v.errors.join(","));
 const scope=normalizeScope(record.scope,"LOCAL"),tone=TONES.has(String(input?.tone||"").toUpperCase())?String(input.tone).toUpperCase():"NEUTRAL",spread=maxSpread(input?.spread,scope),points=RENOWN_POINTS[scope]||1,now=state.world.state.clock?.totalMinutes||0;
 const deed={id:uid("DEED"),impactId:record.id,scope,targetKind:record.targetKind,targetId:record.targetId,targetName:record.targetName,title:record.title,summary:record.summary,tone,day:record.day,region:targetRegion(state,record)};
 r.deeds.push(deed);r.deeds=r.deeds.slice(-80);r.renown+=points;if(NEGATIVE_TONES.has(tone))r.notoriety+=Math.max(1,Math.ceil(points/2));r.tier=tierFor(r.renown);
 const rumorText=clean(input?.rumor,400)||clean(record.summary,400);
 const rumor={id:uid("RUM"),deedId:deed.id,impactId:record.id,scope,spread,tone,targetKind:record.targetKind,targetId:record.targetId,targetName:record.targetName,text:rumorText,availableMinute:now+(DELAYS[spread]||0),createdDay:state.world.state.day,status:(DELAYS[spread]||0)===0?"ACTIVE":"SPREADING"};
 r.rumors.push(rumor);r.rumors=r.rumors.slice(-100);
 const label=clean(input?.publicLabel,80);
 if(label&&RANK[scope]>=RANK.LOCAL&&!r.titles.some(x=>x.label===label)){r.titles.push({id:uid("TITLE"),label,scope,impactId:record.id,day:state.world.state.day});r.titles=r.titles.slice(-12)}
 const mark=input?.legacyMark;
 if(mark&&RANK[scope]>=RANK.LOCAL){const labelText=clean(mark.label,160);if(labelText&&!r.marks.some(x=>x.label===labelText&&x.targetId===record.targetId)){r.marks.push({id:uid("MARK"),kind:String(mark.kind||"CUSTOM").toUpperCase(),label:labelText,targetKind:record.targetKind,targetId:record.targetId,targetName:record.targetName,impactId:record.id,day:state.world.state.day});r.marks=r.marks.slice(-24)}}
 r.processedImpactIds.push(record.id);r.processedImpactIds=r.processedImpactIds.slice(-160);
 if(rumor.status==="ACTIVE")state.events.push({id:uid("EV"),type:"PLAYER_RECOGNITION",visibility:"PLAYER_KNOWN",recognitionId:rumor.id,summary:"你的事蹟開始被人談論："+rumor.text,day:state.world.state.day,at:Date.now()});
 return {deed,rumor,tier:r.tier,title:label||null}
}
function reactionKey(factionId,type){return factionId+"|"+type}
function factionReactionType(faction,attention){
 const rep=Number(faction.playerReputation)||0;
 if(attention>=6&&rep>=20)return "SEEK_AUDIENCE";
 if(attention>=6&&rep<=-20)return "HOSTILE_NOTICE";
 if(attention>=10)return "WATCHING";
 return null
}
export function processRecognition(state){
 const r=ensureRecognition(state),now=state.world.state.clock?.totalMinutes||0,out=[];
 for(const rumor of r.rumors.filter(x=>x.status==="SPREADING"&&x.availableMinute<=now).slice(0,6)){
  rumor.status="ACTIVE";rumor.activatedDay=state.world.state.day;
  const ev={id:uid("EV"),type:"RUMOR_SPREAD",visibility:"OBSERVABLE",recognitionId:rumor.id,summary:"關於你的事蹟開始傳到更遠的地方："+rumor.text,day:state.world.state.day,at:Date.now()};state.events.push(ev);out.push(ev)
 }
 for(const faction of (state.world.registry?.factions||[]).filter(x=>x.known===true)){
  const attention=r.rumors.filter(x=>rumorRelevantToFaction(x,faction)).reduce((n,x)=>n+(RENOWN_POINTS[x.scope]||1),0);
  r.factionAttention[faction.id]=attention;const type=factionReactionType(faction,attention);if(!type)continue;
  const key=reactionKey(faction.id,type);if(r.reactions.some(x=>x.key===key))continue;
  const summary=type==="SEEK_AUDIENCE"?faction.name+" 因為你的事蹟而主動要求與你接觸。":type==="HOSTILE_NOTICE"?faction.name+" 已開始公開把你視為需要防範的對象。":faction.name+" 已開始特別留意你的行動。";
  const reaction={id:uid("REACT"),key,type,factionId:faction.id,factionName:faction.name,attention,summary,day:state.world.state.day};r.reactions.push(reaction);r.reactions=r.reactions.slice(-40);const ev={id:uid("EV"),type:"FACTION_PLAYER_REACTION",visibility:"PLAYER_KNOWN",factionId:faction.id,summary,day:state.world.state.day,at:Date.now()};state.events.push(ev);out.push(ev)
 }
 return out
}
export function recognitionForNpc(state,npc){
 const r=ensureRecognition(state),rumors=r.rumors.filter(x=>rumorRelevantToNpc(state,x,npc)).slice(-6);
 return {tier:r.tier,renown:r.renown,notoriety:r.notoriety,titles:r.titles.slice(-4).map(x=>x.label),knownDeeds:rumors.map(x=>({tone:x.tone,text:x.text,targetName:x.targetName,scope:x.scope}))}
}
export function recognitionForFaction(state,faction){
 const r=ensureRecognition(state),rumors=r.rumors.filter(x=>rumorRelevantToFaction(x,faction)).slice(-6),attention=Number(r.factionAttention[faction.id])||0;
 return {tier:r.tier,renown:r.renown,attention,titles:r.titles.slice(-4).map(x=>x.label),knownDeeds:rumors.map(x=>({tone:x.tone,text:x.text,scope:x.scope})),reactions:r.reactions.filter(x=>x.factionId===faction.id).slice(-4)}
}
export function recognitionSnapshot(state,{director=false}={}){
 const r=ensureRecognition(state),base={renown:r.renown,notoriety:r.notoriety,tier:r.tier,titles:r.titles.slice(-8),activeRumors:r.rumors.filter(x=>x.status==="ACTIVE").slice(-12).map(x=>({id:x.id,scope:x.scope,spread:x.spread,tone:x.tone,targetKind:x.targetKind,targetId:x.targetId,targetName:x.targetName,text:x.text})),marks:r.marks.slice(-12),reactions:r.reactions.slice(-12)};
 if(director)base.spreadingRumors=r.rumors.filter(x=>x.status==="SPREADING").slice(-8).map(x=>({id:x.id,scope:x.scope,spread:x.spread,tone:x.tone,targetKind:x.targetKind,targetId:x.targetId,targetName:x.targetName,text:x.text,availableMinute:x.availableMinute}));
 return base
}
