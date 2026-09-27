const id=prefix=>prefix+"-"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clean=(v,max=240)=>typeof v==="string"?v.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,max):"";
const MODES=Object.freeze(["COMBAT","SOCIAL","EXPLORATION","MYSTERY","DOWNTIME","PAYOFF"]);
const MODE_SET=new Set(MODES);
const PAYOFF_TYPES=new Set(["QUEST_COMPLETED","PLAYER_DRIVE_READY","PLAYER_DRIVE_FULFILLED","MAIN_QUEST_STAGE_CHANGED","WORLD_IMPACT","WORLD_IMPACT_RECORDED","PLAYER_RECOGNITION","FUTURE_INTERVENTION","COMBAT_WON"]);
const HARD_SCENE_END=new Set(["COMBAT_WON","COMBAT_RETREAT","QUEST_COMPLETED","PLAYER_DRIVE_FULFILLED","SESSION_CHECKPOINT"]);
const SESSION_BOUNDARY=new Set(["SESSION_CHECKPOINT"]);
const ARC_BOUNDARY=new Set(["PLAYER_DRIVE_FULFILLED","MAIN_QUEST_STAGE_CHANGED"]);
const MYSTERY_RE=/(KNOWLEDGE|DISCOVER|CLUE|DOCUMENT|HISTORY|LORE|EVIDENCE|MYSTERY)/i;
const SOCIAL_RE=/(NPC|SOCIAL|RELATION|COMPANION|PROMISE|GRUDGE|DIALOGUE|CONVERSATION)/i;
const COMBAT_RE=/(COMBAT|BATTLE|ENCOUNTER|ATTACK|DAMAGE|DEFEAT)/i;
const EXPLORATION_RE=/(TRAVEL|LOCATION|EXPLORE|WEATHER|ROUTE|JOURNEY|PLAYER_ACTION)/i;
const DOWNTIME_TEXT=/(休息|睡眠|睡覺|紮營|露營|住宿|吃飯|用餐|整理|購物|交易|製作|鍛造|修理|療傷|rest|sleep|camp|downtime|shop|craft|repair|heal)/i;
const COMBAT_TEXT=/(攻擊|戰鬥|迎擊|射擊|斬|砍|刺|格擋|敵人|撤退|attack|fight|battle|strike|shoot|retreat)/i;
const MYSTERY_TEXT=/(線索|證據|謎|調查|追查|秘密|真相|失蹤|異常|clue|evidence|mystery|investigat|secret)/i;
const SOCIAL_TEXT=/(詢問|交談|說服|威嚇|談判|道歉|承諾|拜託|對話|ask|talk|persuad|threat|negotia|apolog|promise)/i;
const HIGH_TENSION_TYPES=/(CRISIS|WORLD_CONSEQUENCE|FUTURE_EVENT_TRIGGERED|NPC_HOSTILE|DAMAGE|PLAYER_DOWNED)/i;
const PROGRESS_TYPES=/(PROGRESS|DISCOVER|CLUE|KNOWLEDGE|QUEST|DRIVE|IMPACT|RECOGNITION)/i;

function emptyCounts(){return Object.fromEntries(MODES.map(x=>[x,0]))}
function eventText(event){return clean([event?.summary,event?.playerSummary,event?.visibleSummary,event?.action,event?.customText,event?.reason].filter(Boolean).join(" "),900)}
function eventDay(state,event){return Math.max(1,Number(event?.day)||Number(state?.world?.state?.day)||1)}
function playerFacing(event){return event&&event.visibility!=="INTERNAL"}
function normalizeBeat(raw={}){const mode=MODE_SET.has(raw.mode)?raw.mode:"EXPLORATION",narrativeFunction=clean(raw.narrativeFunction,50)||"NONE";return {id:clean(raw.id,100)||id("BEAT"),eventId:clean(raw.eventId,120),eventType:clean(raw.eventType,70),mode,narrativeFunction,tags:Array.isArray(raw.tags)?[...new Set(raw.tags.filter(MODE_SET.has.bind(MODE_SET)))].slice(0,4):[mode],tensionBefore:clamp(Math.round(Number(raw.tensionBefore)||0),0,100),tensionAfter:clamp(Math.round(Number(raw.tensionAfter)||0),0,100),summary:clean(raw.summary,220),day:Math.max(1,Number(raw.day)||1),at:Number(raw.at)||Date.now()}}
function defaultHierarchy(day=1){return {
 scene:{id:id("SCENE"),index:1,beatCount:0,dominant:"EXPLORATION",counts:emptyCounts(),tensionStart:20,startedDay:day},
 sequence:{id:id("SEQ"),index:1,sceneCount:0,counts:emptyCounts(),startedDay:day},
 session:{id:id("SESSION"),index:1,sequenceCount:0,sceneCount:0,counts:emptyCounts(),startedDay:day},
 arc:{id:id("ARC"),index:1,sessionCount:0,sceneCount:0,counts:emptyCounts(),startedDay:day,phase:"SETUP"},
 campaign:{id:id("CAMPAIGN"),index:1,arcCount:1,sessionCount:0,sceneCount:0,beatCount:0,counts:emptyCounts(),startedDay:day}
}}
function runtime(state){
 if(!state?.world)return null;const events=Array.isArray(state.events)?state.events:[],day=Math.max(1,Number(state.world?.state?.day)||1),fresh=!state.world.storyRhythm;
 state.world.storyRhythm??={version:1,cursor:events.length,tension:20,progressDebt:0,lastPayoffBeat:0,recent:[],history:{scenes:[],sequences:[],sessions:[],arcs:[]},hierarchy:defaultHierarchy(day)};
 const r=state.world.storyRhythm;r.version=1;r.cursor=clamp(Math.round(Number(r.cursor)||0),0,events.length);if(fresh)r.cursor=events.length;r.tension=clamp(Math.round(Number(r.tension)||20),0,100);r.progressDebt=clamp(Math.round(Number(r.progressDebt)||0),0,20);r.lastPayoffBeat=Math.max(0,Number(r.lastPayoffBeat)||0);r.recent=(Array.isArray(r.recent)?r.recent:[]).map(normalizeBeat).slice(-24);r.history??={scenes:[],sequences:[],sessions:[],arcs:[]};for(const key of ["scenes","sequences","sessions","arcs"])r.history[key]=Array.isArray(r.history[key])?r.history[key].slice(-20):[];
 r.hierarchy??=defaultHierarchy(day);for(const [key,value] of Object.entries(defaultHierarchy(day)))r.hierarchy[key]??=value;return r
}
function classifyEvent(event){
 const type=String(event?.type||"").toUpperCase(),text=eventText(event),tags=[];
 if(PAYOFF_TYPES.has(type)||/FULFILLED|COMPLETED|WON|PAYOFF|REWARD/.test(type))tags.push("PAYOFF");
 if(COMBAT_RE.test(type)||COMBAT_TEXT.test(text))tags.push("COMBAT");
 if(SOCIAL_RE.test(type)||SOCIAL_TEXT.test(text))tags.push("SOCIAL");
 if(MYSTERY_RE.test(type)||MYSTERY_TEXT.test(text))tags.push("MYSTERY");
 if(DOWNTIME_TEXT.test(text)||/REST|DOWNTIME|CRAFT|SHOP/.test(type))tags.push("DOWNTIME");
 if(EXPLORATION_RE.test(type)||(!tags.length&&type))tags.push("EXPLORATION");
 const unique=[...new Set(tags)].filter(MODE_SET.has.bind(MODE_SET));if(!unique.length)return null;
 const priority=["PAYOFF","COMBAT","DOWNTIME","SOCIAL","MYSTERY","EXPLORATION"],mode=priority.find(x=>unique.includes(x))||unique[0],narrativeFunction=unique.includes("PAYOFF")?"PAYOFF":unique.includes("MYSTERY")?"MYSTERY_PROGRESS":PROGRESS_TYPES.test(type)?"PROGRESS":unique.includes("DOWNTIME")?"RECOVERY":unique.includes("SOCIAL")?"SOCIAL_CHANGE":unique.includes("COMBAT")?"THREAT":"EXPLORATION";return {mode,narrativeFunction,tags:unique,text,type}
}
function tensionDelta(event,classification){
 const type=classification.type,text=classification.text;let delta=0;
 if(classification.tags.includes("COMBAT"))delta+=20;if(classification.tags.includes("MYSTERY"))delta+=8;if(classification.tags.includes("SOCIAL"))delta+=/威嚇|脅迫|敵對|threat|hostile/i.test(text)?10:2;if(classification.tags.includes("EXPLORATION"))delta+=3;if(classification.tags.includes("DOWNTIME"))delta-=22;if(classification.tags.includes("PAYOFF"))delta-=18;
 if(HIGH_TENSION_TYPES.test(type))delta+=15;if(/CRITICAL_FAILURE|DOWNED|危機|受傷|追擊|爆炸|collapse|danger/i.test(text))delta+=10;return clamp(delta,-35,35)
}
function dominant(counts){return MODES.slice().sort((a,b)=>(Number(counts?.[b])||0)-(Number(counts?.[a])||0))[0]||"EXPLORATION"}
function snapshotUnit(unit={}){return {id:unit.id||"",index:Number(unit.index)||1,beatCount:Number(unit.beatCount)||0,sceneCount:Number(unit.sceneCount)||0,sequenceCount:Number(unit.sequenceCount)||0,sessionCount:Number(unit.sessionCount)||0,dominant:unit.dominant||dominant(unit.counts),counts:{...emptyCounts(),...(unit.counts||{})},phase:unit.phase||undefined,startedDay:Number(unit.startedDay)||1}}
function addCount(unit,mode){unit.counts??=emptyCounts();unit.counts[mode]=(Number(unit.counts[mode])||0)+1;unit.dominant=dominant(unit.counts)}
function closeScene(state,r,reason="RHYTHM_BOUNDARY"){
 const h=r.hierarchy,scene=h.scene;if(!scene||!scene.beatCount)return false;const closed={...snapshotUnit(scene),endedDay:Number(state.world?.state?.day)||1,endedTension:r.tension,reason};r.history.scenes.push(closed);r.history.scenes=r.history.scenes.slice(-20);h.sequence.sceneCount=(Number(h.sequence.sceneCount)||0)+1;h.session.sceneCount=(Number(h.session.sceneCount)||0)+1;h.arc.sceneCount=(Number(h.arc.sceneCount)||0)+1;h.campaign.sceneCount=(Number(h.campaign.sceneCount)||0)+1;addCount(h.sequence,scene.dominant);addCount(h.session,scene.dominant);addCount(h.arc,scene.dominant);h.scene={id:id("SCENE"),index:(Number(scene.index)||1)+1,beatCount:0,dominant:"EXPLORATION",counts:emptyCounts(),tensionStart:r.tension,startedDay:Number(state.world?.state?.day)||1};return true
}
function closeSequence(state,r,reason="SEQUENCE_COMPLETE"){
 const h=r.hierarchy,seq=h.sequence;if(!(Number(seq.sceneCount)||0))return false;const closed={...snapshotUnit(seq),endedDay:Number(state.world?.state?.day)||1,reason};r.history.sequences.push(closed);r.history.sequences=r.history.sequences.slice(-20);h.session.sequenceCount=(Number(h.session.sequenceCount)||0)+1;h.sequence={id:id("SEQ"),index:(Number(seq.index)||1)+1,sceneCount:0,counts:emptyCounts(),startedDay:Number(state.world?.state?.day)||1};return true
}
function closeSession(state,r,reason="SESSION_COMPLETE"){
 const h=r.hierarchy;closeScene(state,r,reason);closeSequence(state,r,reason);const session=h.session;if(!(Number(session.sceneCount)||0))return false;const closed={...snapshotUnit(session),endedDay:Number(state.world?.state?.day)||1,reason};r.history.sessions.push(closed);r.history.sessions=r.history.sessions.slice(-20);h.arc.sessionCount=(Number(h.arc.sessionCount)||0)+1;h.campaign.sessionCount=(Number(h.campaign.sessionCount)||0)+1;h.session={id:id("SESSION"),index:(Number(session.index)||1)+1,sequenceCount:0,sceneCount:0,counts:emptyCounts(),startedDay:Number(state.world?.state?.day)||1};return true
}
function closeArc(state,r,reason="ARC_COMPLETE"){
 const h=r.hierarchy;closeSession(state,r,reason);const arc=h.arc;if(!(Number(arc.sceneCount)||0))return false;const closed={...snapshotUnit(arc),endedDay:Number(state.world?.state?.day)||1,reason};r.history.arcs.push(closed);r.history.arcs=r.history.arcs.slice(-12);h.campaign.arcCount=(Number(h.campaign.arcCount)||1)+1;h.arc={id:id("ARC"),index:(Number(arc.index)||1)+1,sessionCount:0,sceneCount:0,counts:emptyCounts(),startedDay:Number(state.world?.state?.day)||1,phase:"SETUP"};return true
}
function maybeBoundaryBefore(state,r,event,classification){const h=r.hierarchy,day=eventDay(state,event),scene=h.scene;if(day!==Number(scene.startedDay)&&scene.beatCount){closeSession(state,r,"NEW_DAY");return}if(scene.beatCount>=5){closeScene(state,r,"BEAT_CAP");if(h.sequence.sceneCount>=3)closeSequence(state,r,"SCENE_CAP");return}if(scene.beatCount>=3&&scene.dominant!==classification.mode){closeScene(state,r,"MODE_SHIFT");if(h.sequence.sceneCount>=3)closeSequence(state,r,"SCENE_CAP")}}
function updateArcPhase(r){const h=r.hierarchy,arc=h.arc,recent=r.recent.slice(-8),hasRecentPayoff=recent.slice(-3).some(x=>x.mode==="PAYOFF");if(hasRecentPayoff)arc.phase="RECOVERY";else if(r.tension>=75)arc.phase="CLIMAX";else if(r.progressDebt>=4)arc.phase="PAYOFF";else if((Number(arc.sceneCount)||0)<=1)arc.phase="SETUP";else arc.phase="RISING"}
function applyBeat(state,r,event,classification){
 maybeBoundaryBefore(state,r,event,classification);const before=r.tension,after=clamp(before+tensionDelta(event,classification),0,100),summary=clean(event?.summary||event?.playerSummary||event?.visibleSummary||event?.customText||event?.action||classification.type,220),beat=normalizeBeat({id:id("BEAT"),eventId:event?.id||"",eventType:classification.type,mode:classification.mode,narrativeFunction:classification.narrativeFunction,tags:classification.tags,tensionBefore:before,tensionAfter:after,summary,day:eventDay(state,event),at:event?.at||Date.now()});r.tension=after;r.recent.push(beat);r.recent=r.recent.slice(-24);const h=r.hierarchy;h.scene.beatCount=(Number(h.scene.beatCount)||0)+1;addCount(h.scene,beat.mode);h.campaign.beatCount=(Number(h.campaign.beatCount)||0)+1;addCount(h.campaign,beat.mode);
 if(classification.mode==="PAYOFF"){r.progressDebt=0;r.lastPayoffBeat=h.campaign.beatCount}else if(PROGRESS_TYPES.test(classification.type)||classification.narrativeFunction==="MYSTERY_PROGRESS")r.progressDebt=clamp(r.progressDebt+1,0,20);
 if(HARD_SCENE_END.has(classification.type)){closeScene(state,r,classification.type);if(h.sequence.sceneCount>=3||classification.mode==="PAYOFF")closeSequence(state,r,classification.type)}
 if(SESSION_BOUNDARY.has(classification.type))closeSession(state,r,classification.type);if(ARC_BOUNDARY.has(classification.type)&&(Number(h.arc.sessionCount)||0)>=1)closeArc(state,r,classification.type);updateArcPhase(r);return beat
}
export function ensureStoryRhythm(state){return runtime(state)}
export function syncStoryRhythm(state){
 const r=runtime(state);if(!r)return [];const events=Array.isArray(state.events)?state.events:[],start=clamp(Number(r.cursor)||0,0,events.length),end=events.length,beats=[];for(let i=start;i<end;i++){const event=events[i];if(!playerFacing(event))continue;const c=classifyEvent(event);if(!c)continue;beats.push(applyBeat(state,r,event,c))}r.cursor=end;return beats
}
function streak(recent=[]){if(!recent.length)return {mode:null,length:0};const mode=recent.at(-1).mode;let length=0;for(let i=recent.length-1;i>=0&&recent[i].mode===mode;i--)length++;return {mode,length}}
function rhythmDirectiveFrom(r){
 const recent=r.recent.slice(-10),counts=emptyCounts();for(const beat of recent)counts[beat.mode]++;const s=streak(recent),reasons=[],favor=[],avoid=[];let mode="STEADY";
 const lastPayoffDistance=(Number(r.hierarchy.campaign.beatCount)||0)-Number(r.lastPayoffBeat||0),noRelease=recent.slice(-6).every(x=>!["DOWNTIME","PAYOFF"].includes(x.mode));
 if(r.progressDebt>=4&&lastPayoffDistance>=4){mode="PAYOFF";favor.push("PAYOFF","SOCIAL","MYSTERY");reasons.push("PROGRESS_WITHOUT_PAYOFF")}
 else if(r.tension>=72&&noRelease){mode="RELEASE";favor.push("DOWNTIME","SOCIAL","PAYOFF");avoid.push("COMBAT");reasons.push("SUSTAINED_HIGH_TENSION")}
 else if(s.length>=3){mode="DIVERSIFY";avoid.push(s.mode);for(const candidate of ["SOCIAL","EXPLORATION","MYSTERY","DOWNTIME"])if(candidate!==s.mode)favor.push(candidate);reasons.push("MODE_STREAK_"+s.mode)}
 else if(r.tension<=24&&recent.length>=3){mode="BUILD";favor.push("MYSTERY","EXPLORATION","SOCIAL");reasons.push("LOW_TENSION")}
 if(counts.COMBAT>=3&&!avoid.includes("COMBAT"))avoid.push("COMBAT");if(counts.DOWNTIME>=3&&!avoid.includes("DOWNTIME"))avoid.push("DOWNTIME");return {mode,favor:[...new Set(favor)].slice(0,4),avoid:[...new Set(avoid)].slice(0,3),reasons,tension:r.tension,progressDebt:r.progressDebt,recentCounts:counts,streak:s}
}
export function storyRhythmSnapshot(state,{sync=true}={}){const r=runtime(state);if(!r)return null;if(sync)syncStoryRhythm(state);const h=r.hierarchy;return {version:1,tension:r.tension,progressDebt:r.progressDebt,hierarchy:{scene:snapshotUnit(h.scene),sequence:snapshotUnit(h.sequence),session:snapshotUnit(h.session),arc:snapshotUnit(h.arc),campaign:snapshotUnit(h.campaign)},recent:r.recent.slice(-10).map(x=>({...x})),directive:rhythmDirectiveFrom(r)}}
function suggestionMode(row={}){const kind=String(row?.kind||"").toUpperCase(),text=clean(row?.action||row?.label,300);if(DOWNTIME_TEXT.test(text))return "DOWNTIME";if(COMBAT_TEXT.test(text)||kind==="RISKY"&&/攻|敵|武器|fight|attack/i.test(text))return "COMBAT";if(kind==="SOCIAL"||SOCIAL_TEXT.test(text))return "SOCIAL";if(row?.progression===true&&(kind==="OBSERVE"||MYSTERY_TEXT.test(text)))return "MYSTERY";if(kind==="TRAVEL"||kind==="OBSERVE")return "EXPLORATION";return "EXPLORATION"}
export function rhythmSuggestionBias(state,row={}){const snap=storyRhythmSnapshot(state,{sync:false}),mode=suggestionMode(row),d=snap?.directive;if(!d)return 0;let score=0;if(d.favor.includes(mode))score+=3;if(d.avoid.includes(mode))score-=4;if(row?.progression===true)score+=1;return score}
export function closeRhythmSession(state,reason="PLAYER_SESSION_BOUNDARY"){const r=runtime(state);if(!r)return false;const changed=closeSession(state,r,clean(reason,80)||"PLAYER_SESSION_BOUNDARY");updateArcPhase(r);return changed}
export {MODES as STORY_RHYTHM_MODES};
