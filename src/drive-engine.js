const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const TYPES=new Set(["PERSONAL","RELATIONSHIP","WORLD","MYSTERY"]);
const STATUSES=new Set(["ACTIVE","READY","FULFILLED","ABANDONED"]);
const SIGNAL_EVENTS=new Set(["PLAYER_ACTION","NPC_CONVERSATION","NPC_CLUE_CONFIRMED","COMBAT_WON","COMBAT_RETREAT","QUEST_COMPLETED","MAIN_QUEST_STAGE_CHANGED","WORLD_IMPACT_RECORDED","GAME_LOCATION_DISCOVERED"]);
const STOP_WORDS=new Set(["the","and","for","with","from","that","this","into","your","you","我想","我要","希望","想要","目前","現在","自己","事情","關於","以及","這個","那個","する","した","して","こと","ため","から","まで","自分"]);
const clean=(v,max=240)=>String(v??"").normalize("NFKC").trim().slice(0,max);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function runtime(state){
 if(Array.isArray(state.drives))state.drives={version:1,focusId:null,entries:state.drives,cursor:Array.isArray(state.events)?state.events.length:0};
 const existed=Boolean(state.drives&&typeof state.drives==="object");state.drives??={version:1,focusId:null,entries:[],cursor:Array.isArray(state.events)?state.events.length:0};const r=state.drives;
 r.version=1;r.entries=Array.isArray(r.entries)?r.entries:[];if(!existed||!Number.isFinite(Number(r.cursor)))r.cursor=Array.isArray(state.events)?state.events.length:0;
 r.entries=r.entries.map((raw,i)=>normalizeDrive(raw,i)).filter(Boolean).slice(-16);if(r.focusId&&!r.entries.some(x=>x.id===r.focusId&&["ACTIVE","READY"].includes(x.status)))r.focusId=null;return r
}
function normalizeDrive(raw,i=0){
 if(!raw||typeof raw!=="object")return null;const title=clean(raw.title,120);if(!title)return null;const type=TYPES.has(String(raw.type||"").toUpperCase())?String(raw.type).toUpperCase():"PERSONAL",status=STATUSES.has(String(raw.status||"").toUpperCase())?String(raw.status).toUpperCase():"ACTIVE",target=clamp(Math.round(Number(raw.target)||4),2,8),progress=clamp(Math.round(Number(raw.progress)||0),0,target);
 return {id:clean(raw.id,100)||`DRV-${i+1}`,type,title,description:clean(raw.description,360),targetId:clean(raw.targetId,120),status:progress>=target&&status==="ACTIVE"?"READY":status,progress,target,momentum:clamp(Math.round(Number(raw.momentum)||0),0,99),evidence:(Array.isArray(raw.evidence)?raw.evidence:[]).map(x=>({eventId:clean(x?.eventId,120),eventType:clean(x?.eventType,60),summary:clean(x?.summary,220),day:Math.max(1,Number(x?.day)||1),at:Number(x?.at)||Date.now()})).filter(x=>x.summary).slice(-12),createdDay:Math.max(1,Number(raw.createdDay)||1),createdAt:Number(raw.createdAt)||Date.now(),updatedAt:Number(raw.updatedAt)||Number(raw.createdAt)||Date.now()}
}
function pushEvent(state,type,drive,extra={}){state.events??=[];state.events.push({id:id(),type,visibility:"PLAYER_KNOWN",driveId:drive.id,driveType:drive.type,title:drive.title,summary:extra.summary||drive.title,day:state.world?.state?.day||1,at:Date.now(),...extra})}
export function ensurePlayerDrives(state){return runtime(state)}
export function createPlayerDrive(state,input={}){
 const r=runtime(state),title=clean(input.title,120),description=clean(input.description,360),type=TYPES.has(String(input.type||"").toUpperCase())?String(input.type).toUpperCase():"PERSONAL";if(title.length<2)return {ok:false,reason:"TITLE_REQUIRED"};
 const duplicate=r.entries.find(x=>["ACTIVE","READY"].includes(x.status)&&x.title.toLowerCase()===title.toLowerCase());if(duplicate)return {ok:false,reason:"DUPLICATE",drive:duplicate};if(r.entries.filter(x=>["ACTIVE","READY"].includes(x.status)).length>=8)return {ok:false,reason:"ACTIVE_LIMIT"};
 const drive=normalizeDrive({id:id(),type,title,description,targetId:input.targetId,target:input.target,status:"ACTIVE",progress:0,momentum:0,evidence:[],createdDay:state.world?.state?.day||1,createdAt:Date.now()});r.entries.push(drive);if(!r.focusId||input.focus===true)r.focusId=drive.id;pushEvent(state,"PLAYER_DRIVE_CREATED",drive,{summary:`新的牽掛：${drive.title}`});r.cursor=state.events.length;return {ok:true,drive}
}
export function setFocusedDrive(state,driveId){const r=runtime(state),drive=r.entries.find(x=>x.id===driveId&&["ACTIVE","READY"].includes(x.status));if(!drive)return false;r.focusId=drive.id;drive.updatedAt=Date.now();pushEvent(state,"PLAYER_DRIVE_FOCUSED",drive,{summary:`目前最在意：${drive.title}`});r.cursor=state.events.length;return true}
export function abandonPlayerDrive(state,driveId){const r=runtime(state),drive=r.entries.find(x=>x.id===driveId&&["ACTIVE","READY"].includes(x.status));if(!drive)return false;drive.status="ABANDONED";drive.updatedAt=Date.now();if(r.focusId===drive.id)r.focusId=r.entries.find(x=>x.id!==drive.id&&["ACTIVE","READY"].includes(x.status))?.id||null;pushEvent(state,"PLAYER_DRIVE_ABANDONED",drive,{summary:`你決定暫時放下：${drive.title}`});r.cursor=state.events.length;return true}
}
export function fulfillPlayerDrive(state,driveId){const r=runtime(state),drive=r.entries.find(x=>x.id===driveId&&["ACTIVE","READY"].includes(x.status));if(!drive)return {ok:false,reason:"NOT_FOUND"};if(drive.progress<drive.target)return {ok:false,reason:"NOT_READY",drive};drive.status="FULFILLED";drive.updatedAt=Date.now();if(r.focusId===drive.id)r.focusId=r.entries.find(x=>x.id!==drive.id&&["ACTIVE","READY"].includes(x.status))?.id||null;pushEvent(state,"PLAYER_DRIVE_FULFILLED",drive,{summary:`你確認這段追求已經告一段落：${drive.title}`});r.cursor=state.events.length;return {ok:true,drive}
}
function normalizeText(v){return clean(v,1200).toLowerCase().replace(/\s+/g," ")}
function terms(value){
 const text=normalizeText(value),out=new Set();for(const word of text.match(/[a-z0-9][a-z0-9_-]{2,}/g)||[])if(!STOP_WORDS.has(word))out.add(word);
 for(const chunk of text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{2,}/gu)||[]){if(chunk.length<=6&&!STOP_WORDS.has(chunk))out.add(chunk);for(let i=0;i<chunk.length-1;i++){const bi=chunk.slice(i,i+2);if(!STOP_WORDS.has(bi))out.add(bi)}}return [...out].slice(0,48)
}
function eventText(event){return normalizeText([event?.summary,event?.action,event?.customText,event?.enemy,Array.isArray(event?.enemies)?event.enemies.join(" "):"",event?.location,event?.npcName].filter(Boolean).join(" "))}
function relevance(drive,event,focusId){
 const hay=eventText(event);if(!hay)return {score:0,matches:[]};const sourceTerms=terms(`${drive.title} ${drive.description}`),matches=sourceTerms.filter(x=>hay.includes(x)).slice(0,8);let score=matches.length;
 const entityIds=[event?.npcId,event?.enemyId,event?.targetId,event?.locationId,...(Array.isArray(event?.entityIds)?event.entityIds:[])].filter(Boolean).map(String);if(drive.targetId&&entityIds.includes(drive.targetId))score+=4;
 if(hay.includes(normalizeText(drive.title)))score+=4;
 const type=drive.type,eventType=String(event?.type||"");if(type==="RELATIONSHIP"&&eventType==="NPC_CONVERSATION")score+=1;if(type==="MYSTERY"&&eventType==="NPC_CLUE_CONFIRMED")score+=2;if(type==="WORLD"&&["MAIN_QUEST_STAGE_CHANGED","WORLD_IMPACT_RECORDED","COMBAT_WON","QUEST_COMPLETED"].includes(eventType))score+=1;if(drive.id===focusId)score+=.25;
 return {score,matches}
}
function applyEvent(state,event){
 const r=runtime(state),candidates=r.entries.filter(x=>x.status==="ACTIVE");if(!candidates.length||!SIGNAL_EVENTS.has(String(event?.type||""))||event?.visibility==="INTERNAL")return null;
 const ranked=candidates.map(d=>({drive:d,...relevance(d,event,r.focusId)})).sort((a,b)=>b.score-a.score||Number(b.drive.id===r.focusId)-Number(a.drive.id===r.focusId));const best=ranked[0];if(!best||best.score<2)return null;
 const drive=best.drive,summary=clean(event?.summary||event?.customText||event?.action||"你做了一件與這份牽掛有關的事。",220);if(!summary||drive.evidence.some(x=>x.eventId&&x.eventId===event.id))return null;
 drive.progress=clamp(drive.progress+1,0,drive.target);drive.momentum=clamp(drive.momentum+1,0,99);drive.updatedAt=Date.now();drive.evidence.push({eventId:clean(event.id,120),eventType:clean(event.type,60),summary,day:Math.max(1,Number(event.day)||Number(state.world?.state?.day)||1),at:Number(event.at)||Date.now()});drive.evidence=drive.evidence.slice(-12);pushEvent(state,"PLAYER_DRIVE_PROGRESS",drive,{sourceEventId:event.id||null,matches:best.matches,progress:drive.progress,target:drive.target,summary:`${drive.title}：${drive.progress}/${drive.target}`});if(drive.progress>=drive.target){drive.status="READY";pushEvent(state,"PLAYER_DRIVE_READY",drive,{summary:`「${drive.title}」已累積足夠經歷，可以由你決定是否告一段落。`})}return drive
}
export function syncPlayerDrivesFromEvents(state){
 const r=runtime(state),events=Array.isArray(state.events)?state.events:[],start=clamp(Math.round(Number(r.cursor)||0),0,events.length),end=events.length,progressed=[];for(let i=start;i<end;i++){const drive=applyEvent(state,events[i]);if(drive)progressed.push(drive.id)}r.cursor=state.events?.length||end;return [...new Set(progressed)]
}
export function driveSnapshot(state){const r=runtime(state);return {version:1,focusId:r.focusId,active:r.entries.filter(x=>["ACTIVE","READY"].includes(x.status)).map(x=>({...x,focused:x.id===r.focusId})),archive:r.entries.filter(x=>["FULFILLED","ABANDONED"].includes(x.status)).slice(-8).map(x=>({...x,focused:false}))}}
