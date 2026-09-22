const clean=(v,max=320)=>typeof v==="string"?v.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,max):"";
const uniq=(xs,max=8)=>[...new Set((Array.isArray(xs)?xs:[]).map(x=>clean(String(x||""),180)).filter(Boolean))].slice(0,max);
const uid=p=>p+"-"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
const hashText=s=>{let h=2166136261;for(const ch of String(s||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

const MANNERISMS=[
 "緊張時會下意識整理袖口或衣角",
 "說到不願觸碰的話題時會短暫移開視線",
 "思考時會先看向出入口，再回答問題",
 "遇到意外時習慣先壓低聲音再靠近確認",
 "不安時會反覆摸索手邊最熟悉的物件",
 "真正生氣時反而會把說話速度放慢"
];
const SPEECH_PATTERNS=[
 "很少直接說「不知道」，通常會先說自己能確認到哪一步",
 "習慣先給結論，再補一句自己的理由",
 "談到自己在意的人或地方時，句子會明顯變短",
 "面對陌生人時避免誇張承諾，傾向留下退路",
 "受到質疑時會重述對方的關鍵字，再作回應",
 "願意幫忙時通常不會直接說熱心話，而是先提出具體做法"
];
const HABITS=[
 "每天會固定確認一次自己的工具或隨身物",
 "到陌生地方後會先記住出口與人流方向",
 "習慣把重要事情留到人少時才說",
 "完成答應別人的事後會主動回來交代結果",
 "對熟悉環境的小變化特別敏感",
 "休息前會回想當天仍未處理完的事情"
];
const FEARS=[
 "害怕因自己的判斷讓身邊的人承受代價",
 "害怕失去目前僅有的安全生活",
 "害怕被迫在承諾與自身利益之間二選一",
 "害怕自己掌握的資訊落到不可信的人手上"
];
const CONTRADICTIONS=[
 "討厭別人說謊，自己卻會為了保護重要的人隱瞞真相",
 "希望事情保持可控，卻又會被強烈好奇心推著冒險",
 "重視承諾，但面對現實風險時會先保護自己的生活圈",
 "表面上不喜歡欠人情，實際上會把別人的幫助記很久"
];
const OBSERVABLE_EVENT_TYPES=new Set(["WORLD_IMPACT","WORLD_CONSEQUENCE","WORLD_CONSEQUENCE_DISCOVERED","RUMOR_SPREAD","PLAYER_RECOGNITION","FACTION_PLAYER_REACTION"]);

function normalizeCommitments(input=[]){
 return (Array.isArray(input)?input:[]).slice(-8).map(x=>{
  if(typeof x==="string")return {text:clean(x,220),status:"OPEN"};
  if(!x||typeof x!=="object")return null;
  const text=clean(x.text||x.promise||x.summary,220);if(!text)return null;
  return {text,status:["OPEN","KEPT","BROKEN","EXPIRED"].includes(String(x.status||"").toUpperCase())?String(x.status).toUpperCase():"OPEN",createdDay:Number.isFinite(x.createdDay)?x.createdDay:null,dueDay:Number.isFinite(x.dueDay)?x.dueDay:null}
 }).filter(Boolean)
}

export function ensurePlayerExperience(state){
 if(!state?.world)return null;
 const initialEventCount=Array.isArray(state.events)?state.events.length:0;
 state.world.experience??={
  version:1,
  opening:{hookPresented:false,hookEngaged:false,hookId:"",presentedDay:null,engagedDay:null},
  projection:{cursor:initialEventCount,projectedEventIds:[]},
  session:{lastCheckpointDay:Number(state.world?.state?.day)||1,checkpoints:[]}
 };
 const x=state.world.experience;x.version=1;
 x.opening??={hookPresented:false,hookEngaged:false,hookId:"",presentedDay:null,engagedDay:null};
 x.projection??={cursor:initialEventCount,projectedEventIds:[]};
 x.projection.cursor=Math.max(0,Math.min(initialEventCount,Number(x.projection.cursor)||0));
 x.projection.projectedEventIds=uniq(x.projection.projectedEventIds,120);
 x.session??={lastCheckpointDay:Number(state.world?.state?.day)||1,checkpoints:[]};
 x.session.checkpoints=Array.isArray(x.session.checkpoints)?x.session.checkpoints.slice(-20):[];
 return x
}

export function ensureNpcBehaviorProfile(npc){
 if(!npc||typeof npc!=="object")return null;
 const seed=hashText((npc.id||"")+"|"+(npc.name||"")+"|"+(npc.role||"")+"|"+(npc.personality||""));
 const p=npc.behaviorProfile&&typeof npc.behaviorProfile==="object"&&!Array.isArray(npc.behaviorProfile)?npc.behaviorProfile:{};
 const pick=(arr,offset)=>arr[(seed+offset)%arr.length];
 const goal=clean(npc.goal,220),personality=clean(npc.personality,220),role=clean(npc.role,100);
 const values=uniq(p.values,4);
 if(!values.length){
  if(/守|護|醫|照顧|家|居民/.test(role+" "+goal))values.push("保護自己認定需要照顧的人");
  if(/商|交易|工|匠|學|研究|記錄/.test(role+" "+goal))values.push("重視可靠資訊與可兌現的交換");
  if(!values.length)values.push("維持自己的生活與選擇權");
 }
 const profile={
  mannerisms:uniq(p.mannerisms,4).length?uniq(p.mannerisms,4):[pick(MANNERISMS,3)],
  speechPatterns:uniq(p.speechPatterns,4).length?uniq(p.speechPatterns,4):[pick(SPEECH_PATTERNS,11)],
  habits:uniq(p.habits,4).length?uniq(p.habits,4):[pick(HABITS,19)],
  values:values.slice(0,4),
  fears:uniq(p.fears,4).length?uniq(p.fears,4):[pick(FEARS,29)],
  contradictions:uniq(p.contradictions,3).length?uniq(p.contradictions,3):[pick(CONTRADICTIONS,37)],
  promises:normalizeCommitments(p.promises),
  grudges:normalizeCommitments(p.grudges)
 };
 if(personality&&!profile.speechPatterns.includes(personality)&&profile.speechPatterns.length<2)profile.speechPatterns.push("說話方式會持續反映這項性格："+personality.slice(0,120));
 npc.behaviorProfile=profile;return profile
}

export function npcBehaviorSnapshot(npc){
 const p=ensureNpcBehaviorProfile(npc)||{};
 return {
  mannerisms:(p.mannerisms||[]).slice(0,3),
  speechPatterns:(p.speechPatterns||[]).slice(0,3),
  habits:(p.habits||[]).slice(0,3),
  values:(p.values||[]).slice(0,3),
  fears:(p.fears||[]).slice(0,2),
  contradictions:(p.contradictions||[]).slice(0,2),
  promises:(p.promises||[]).slice(-4),
  grudges:(p.grudges||[]).slice(-4)
 }
}

export function openingHookQuality(value=""){
 const s=clean(value,1200),sensory=/突然|忽然|聲|腳步|鐘|血|煙|火|撞|倒|跑|追|封|關|喊|叫|求救|武器|碎|震|異常|停止|中斷/.test(s),actor=/有人|陌生人|守衛|居民|孩子|男人|女人|人群|商隊|傷者|身影/.test(s),urgent=/逃|追|求救|受傷|封閉|關閉|倒下|衝|躲|抓|失蹤|危險|威脅|中斷|停止/.test(s);
 const score=(s.length>=80?1:0)+(sensory?1:0)+(actor?1:0)+(urgent?1:0);
 return {score,strong:score>=3,sensory,actor,urgent}
}

function currentWeatherCue(state){
 const sys=state.world?.bible?.weatherSystem?.phenomena||[],current=state.world?.weather?.currentId,weather=sys.find(x=>x.id===current)||sys[0];
 return clean(weather?.sensoryCue||weather?.observableName,160)
}

function openingSuggestions(narrative=""){
 const s=clean(narrative,1200),out=[];
 if(/腳步|逃|追|身影/.test(s)){out.push("沿著急促腳步消失的方向追上去","先躲到能看清出入口的位置，觀察是誰在逃")}
 if(/鐘|鳴|敲/.test(s))out.push("朝聲音最後傳來的方向靠近，確認為甚麼突然停下");
 if(/血|受傷|倒下|求救/.test(s))out.push("先確認倒下的人是否仍能回應，再問發生了甚麼");
 if(/城門|大門|封閉|關門|封鎖/.test(s))out.push("問正在封鎖入口的人剛才出了甚麼事","趁封鎖完成前觀察還有哪些人正在離開");
 if(/煙|火|爆|碎|震/.test(s))out.push("找出煙塵或震動的來源，但先保持能撤退的距離");
 if(/霧|看不清|聲音/.test(s))out.push("利用附近固定物辨認聲音真正來自哪個方向");
 out.push("檢查地面、牆角與附近物件有沒有剛留下的痕跡","先找一個能看見周圍動靜又不容易被注意的位置");
 return uniq(out,4)
}

export function applyOpeningExperience(state,narrative="",suggestions=[]){
 const x=ensurePlayerExperience(state),base=clean(narrative,1200),quality=openingHookQuality(base);
 let next=base;
 if(!quality.strong){
  const cue=currentWeatherCue(state)||"遠處突然傳來一聲短促的金屬撞擊";
  const intrusion=`${cue}。緊接著，附近響起一串急促腳步；有人像是在逃離甚麼，聲音卻突然停在看不見的轉角後。你現在可以立刻追上去、躲起來觀察，或先確認對方留下的痕跡。`;
  next=(base?base+"\n\n":"")+intrusion
 }
 const roleplay=openingSuggestions(next),incoming=uniq(suggestions,4),generic=/觀察四周|繼續探索|確認自己|目前目標|查看周圍|探索周圍/;
 const merged=uniq([...incoming.filter(x=>!generic.test(x)),...roleplay],4);
 if(x&&!x.opening.hookPresented){
  const hookId=uid("HOOK");x.opening={...x.opening,hookPresented:true,hookId,presentedDay:Number(state.world?.state?.day)||1};
  state.events??=[];state.events.push({id:uid("EV"),type:"OPENING_HOOK_PRESENTED",visibility:"INTERNAL",hookId,summary:"開局事件已進入玩家可直接感知的場景。",day:Number(state.world?.state?.day)||1,at:Date.now()})
 }
 return {narrative:next,suggestions:merged,quality:openingHookQuality(next)}
}

export function markOpeningEngaged(state,action=""){
 const x=ensurePlayerExperience(state);if(!x?.opening?.hookPresented||x.opening.hookEngaged)return false;
 const text=clean(action,180);if(!text)return false;
 x.opening.hookEngaged=true;x.opening.engagedDay=Number(state.world?.state?.day)||1;
 state.events??=[];state.events.push({id:uid("EV"),type:"OPENING_HOOK_ENGAGED",visibility:"INTERNAL",hookId:x.opening.hookId,action:text,day:Number(state.world?.state?.day)||1,at:Date.now()});
 return true
}

function presentNpc(state){
 const loc=(state.world?.registry?.locations||[]).find(x=>x.name===state.player?.location),id=loc?.id;
 return (state.world?.registry?.npcs||[]).find(n=>n.known===true&&n.alive!==false&&(n.companion?.status==="ACTIVE"||n.locationId===id))||null
}

export function roleplayFallbackSuggestions(state={},context={}){
 const out=[],npc=presentNpc(state),loc=clean(state.player?.location,80),action=clean(context.action,100);
 const recent=(state.events||[]).filter(e=>e.visibility!=="INTERNAL"&&clean(e.summary,220)).slice(-6).reverse()[0];
 if(npc)out.push(`問${clean(npc.name,60)}剛才最在意的是哪件事`);
 if(recent?.summary)out.push(`沿著「${clean(recent.summary,48)}」留下的影響追查下去`);
 if(action)out.push(`回頭檢查「${action.slice(0,42)}」之後現場多了甚麼變化`);
 if(loc)out.push(`在${loc}找一個能看清人流與出入口的位置觀察`);
 out.push("檢查地面與附近物件上最新留下的痕跡","找一個正在避開人群的人，問他剛才看見了甚麼","沿著最明顯的新鮮痕跡走一小段，確認它通往哪裡");
 const previous=(state.suggestions||[]).map(x=>clean(x,120));
 return uniq(out.filter(x=>!previous.includes(x)),4)
}

export function projectObservableWorldChanges(state,narrative=""){
 const x=ensurePlayerExperience(state);if(!x)return {narrative:clean(narrative,1600),projected:[]};
 const events=Array.isArray(state.events)?state.events:[],start=Math.max(0,Math.min(events.length,Number(x.projection.cursor)||0)),fresh=events.slice(start);
 x.projection.cursor=events.length;
 const seen=new Set(x.projection.projectedEventIds||[]),eligible=fresh.filter(e=>e?.id&&!seen.has(e.id)&&e.visibility!=="INTERNAL"&&OBSERVABLE_EVENT_TYPES.has(e.type)&&clean(e.summary,400)).slice(-2);
 if(!eligible.length)return {narrative:typeof narrative==="string"?narrative.normalize("NFC").replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/g,"").trim().slice(0,1600):"",projected:[]};
 const parts=[];
 for(const e of eligible){
  seen.add(e.id);const summary=clean(e.summary,360);
  if(e.type==="WORLD_CONSEQUENCE"||e.type==="WORLD_CONSEQUENCE_DISCOVERED")parts.push("你很快察覺到先前的選擇已留下具體痕跡："+summary);
  else if(e.type==="RUMOR_SPREAD"||e.type==="PLAYER_RECOGNITION")parts.push("從旁人的語氣與反應中，你開始察覺："+summary);
  else if(e.type==="FACTION_PLAYER_REACTION")parts.push("這個變化已經直接進入你的日常行動範圍："+summary);
  else parts.push("眼前已出現一項可以直接確認的改變："+summary)
 }
 x.projection.projectedEventIds=[...seen].slice(-120);
 const base=typeof narrative==="string"?narrative.normalize("NFC").replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/g,"").trim().slice(0,1600):"",append=parts.join("\n\n");
 return {narrative:(base?base+"\n\n":"")+append,projected:eligible.map(e=>({id:e.id,type:e.type,summary:clean(e.summary,360)}))}
}

export function sessionCheckpoint(state,reason=""){
 const x=ensurePlayerExperience(state),why=clean(reason,80);if(!x||!why)return null;
 const recent=(state.events||[]).filter(e=>e.visibility!=="INTERNAL"&&e.type!=="SESSION_CHECKPOINT"&&clean(e.summary||e.action,220)).slice(-6);
 if(recent.length<2)return null;
 const changes=recent.filter(e=>OBSERVABLE_EVENT_TYPES.has(e.type)).slice(-2),summary=recent.slice(-3).map(e=>clean(e.summary||e.action,100)).join("；");
 const recap={id:uid("SESSION"),day:Number(state.world?.state?.day)||1,reason:why,summary:summary.slice(0,320),worldChanges:changes.map(e=>clean(e.summary,140)).filter(Boolean),at:Date.now()};
 x.session.checkpoints.push(recap);x.session.checkpoints=x.session.checkpoints.slice(-20);x.session.lastCheckpointDay=recap.day;
 state.events??=[];state.events.push({id:uid("EV"),type:"SESSION_CHECKPOINT",visibility:"PLAYER_KNOWN",summary:"本次旅程暫告一段落："+recap.summary,day:recap.day,at:Date.now()});
 return recap
}
