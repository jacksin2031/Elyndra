import {ensurePlayerExperience} from "./player-experience.js?v=57014";

const clean=(v,max=320)=>typeof v==="string"?v.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,max):"";
const uniq=(xs,max=8)=>[...new Set((Array.isArray(xs)?xs:[]).map(x=>clean(String(x||""),180)).filter(Boolean))].slice(0,max);
const uid=p=>p+"-"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
const OBSERVABLE_EVENT_TYPES=new Set(["WORLD_IMPACT","WORLD_CONSEQUENCE","WORLD_CONSEQUENCE_DISCOVERED","RUMOR_SPREAD","PLAYER_RECOGNITION","FACTION_PLAYER_REACTION","FUTURE_FORESHADOW","FUTURE_INTERVENTION","MAIN_QUEST_STAGE_CHANGED","QUEST_COMPLETED"]);
const runtimeStateReady=state=>Boolean(state&&typeof state==="object"&&state.player&&state.world);

function ensureJourneySession(state){
 if(!runtimeStateReady(state))return null;
 const x=ensurePlayerExperience(state),events=Array.isArray(state.events)?state.events:[];
 x.session??={lastCheckpointDay:Number(state.world?.state?.day)||1,checkpoints:[]};
 x.session.lastCheckpointDay=Math.max(1,Number(x.session.lastCheckpointDay)||Number(state.world?.state?.day)||1);
 x.session.lastCheckpointLocation=clean(x.session.lastCheckpointLocation,100)||clean(state.player?.location,100);
 x.session.eventCursor=Math.max(0,Math.min(events.length,Number(x.session.eventCursor)||0));
 x.session.boundaryEventIds=uniq(x.session.boundaryEventIds,80);
 x.session.checkpoints=Array.isArray(x.session.checkpoints)?x.session.checkpoints.slice(-20):[];
 return x.session
}

export function createJourneyCheckpoint(state,reason="",options={}){
 const session=ensureJourneySession(state),why=clean(reason,80);if(!session||!why)return null;
 const events=Array.isArray(state.events)?state.events:[],start=Math.max(0,Math.min(events.length,Number(session.eventCursor)||0));
 const recent=events.slice(start).filter(e=>e.visibility!=="INTERNAL"&&e.type!=="SESSION_CHECKPOINT"&&clean(e.summary||e.action||e.customText,220)).slice(-12);
 if(recent.length<2&&!options.force)return null;
 const changes=recent.filter(e=>OBSERVABLE_EVENT_TYPES.has(e.type)).slice(-3);
 const discoveries=recent.filter(e=>/KNOWLEDGE|DISCOVER|CLUE|DOCUMENT|IDENTIF|HISTORY/i.test(String(e.type||""))).map(e=>clean(e.summary||e.action||e.customText,140)).filter(Boolean).slice(-3);
 const people=recent.filter(e=>/NPC|COMPANION/i.test(String(e.type||""))).map(e=>clean(e.summary||e.action||e.customText,140)).filter(Boolean).slice(-3);
 const unresolved=[],main=state.quests?.main?.objectives?.[0];if(main)unresolved.push(clean(main,140));
 for(const q of state.world?.registry?.sideQuests||[])if(q.known===true&&q.status!=="COMPLETED"&&q.objective)unresolved.push(clean(q.objective,140));
 const summaries=recent.slice(-4).map(e=>clean(e.summary||e.customText||e.action,100)).filter(Boolean),summary=(summaries.join("；")||"這段旅程暫時沒有新的可見事件。").slice(0,420);
 const recap={id:uid("SESSION"),day:Number(state.world?.state?.day)||1,reason:why,location:clean(state.player?.location,100),summary,worldChanges:changes.map(e=>clean(e.summary||e.action,140)).filter(Boolean),discoveries,people,unresolved:uniq(unresolved,4),sourceEventId:clean(options.sourceEventId,120)||null,at:Date.now()};
 session.checkpoints.push(recap);session.checkpoints=session.checkpoints.slice(-20);session.lastCheckpointDay=recap.day;session.lastCheckpointLocation=recap.location;session.eventCursor=events.length;
 if(recap.sourceEventId)session.boundaryEventIds=uniq([...(session.boundaryEventIds||[]),recap.sourceEventId],80);
 state.events??=[];state.events.push({id:uid("EV"),type:"SESSION_CHECKPOINT",visibility:"PLAYER_KNOWN",summary:"旅程小結："+recap.summary,day:recap.day,at:Date.now()});
 return recap
}

export function maybeJourneyCheckpoint(state){
 const session=ensureJourneySession(state);if(!session)return null;
 const events=Array.isArray(state.events)?state.events:[],used=new Set(session.boundaryEventIds||[]),day=Number(state.world?.state?.day)||1,location=clean(state.player?.location,100);
 if(day>Number(session.lastCheckpointDay||day))return createJourneyCheckpoint(state,"新的一天",{force:true});
 const boundaryTypes=new Map([["QUEST_COMPLETED","完成一段委託"],["MAIN_QUEST_STAGE_CHANGED","旅程進入新階段"],["FUTURE_INTERVENTION","改變了一件正在形成的大事"],["COMBAT_ENDED","危機暫告一段落"]]);
 for(const e of [...events].reverse().slice(0,12)){if(!e?.id||used.has(e.id))continue;const reason=boundaryTypes.get(e.type);if(reason)return createJourneyCheckpoint(state,reason,{sourceEventId:e.id,force:true})}
 const recentAction=[...events].reverse().find(e=>e?.visibility!=="INTERNAL"&&clean(e.action||e.customText,180));
 if(recentAction?.id&&!used.has(recentAction.id)&&/休息|睡眠|紮營|露營|住宿|rest|sleep|camp/i.test(String(recentAction.action||recentAction.customText||"")))return createJourneyCheckpoint(state,"停下來休息",{sourceEventId:recentAction.id,force:true});
 if(location&&session.lastCheckpointLocation&&location!==session.lastCheckpointLocation&&events.length-Number(session.eventCursor||0)>=2)return createJourneyCheckpoint(state,"抵達新的地方",{sourceEventId:recentAction?.id||"",force:true});
 return null
}

export function recentJourneyCheckpoints(state,limit=10){
 const session=ensureJourneySession(state);return session?(session.checkpoints||[]).slice(-Math.max(1,limit)):[]
}
