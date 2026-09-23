from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

def read(path): return (ROOT/path).read_text(encoding="utf-8")
def write(path,text): (ROOT/path).write_text(text,encoding="utf-8")

p=Path("src/player-experience.js")
t=read(p)
anchor='''function openingSuggestions(narrative=""){
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
'''
insert='''function openingSuggestions(narrative=""){
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

function hanNgrams(value,size=4){
 const text=clean(value,1400).replace(/[^\\u3400-\\u9fff]/g,"");const out=new Set();
 for(let i=0;i+size<=text.length;i++)out.add(text.slice(i,i+size));
 return out
}
function openingFutureOverlap(state,narrative){
 const opening=hanNgrams(narrative);if(!opening.size)return null;
 for(const event of state.world?.timeline||[]){
  if(event?.status!=="SCHEDULED")continue;
  const future=hanNgrams(event.observableEffect);let shared=0;
  for(const gram of future){if(opening.has(gram)&&++shared>=2)return event}
 }
 return null
}
function severeOpening(value=""){return /(?:大規模|全面)(?:戰爭|屠殺|攻擊)|攻城|屠殺|處決|大量死亡|遍地屍體|瘟疫爆發|城市崩塌|末日|滅絕|軍隊正在攻擊|靈性暴走/.test(clean(value,1200))}
function safeOpeningHook(state){
 const cue=currentWeatherCue(state)||"遠處傳來一陣你還無法辨認來源的環境聲";
 return `${cue}。聲音突然停了一瞬；附近有人也停下手上的工作，朝同一個方向看了一眼，隨即避開你的視線。你可以先確認出入口、觀察對方正在注意甚麼，或者用最簡單的方式試著交談。`
}
export function sanitizeOpeningForPacing(state,narrative=""){
 const text=clean(narrative,1200),day=Math.max(1,Number(state.world?.state?.day)||1);if(day>1)return {narrative:text,replaced:false,reason:"",timelineId:null};
 const overlap=openingFutureOverlap(state,text),severe=severeOpening(text);if(!overlap&&!severe)return {narrative:text,replaced:false,reason:"",timelineId:null};
 return {narrative:safeOpeningHook(state),replaced:true,reason:overlap?"FUTURE_OVERLAP":"NEWBIE_DANGER",timelineId:overlap?.id||null}
}
'''
if anchor not in t: raise SystemExit("opening suggestions anchor missing")
t=t.replace(anchor,insert,1)
old='''export function applyOpeningExperience(state,narrative="",suggestions=[]){
 const x=ensurePlayerExperience(state),base=clean(narrative,1200),quality=openingHookQuality(base);
 let next=base;
'''
new='''export function applyOpeningExperience(state,narrative="",suggestions=[]){
 const x=ensurePlayerExperience(state),guard=sanitizeOpeningForPacing(state,narrative),base=guard.narrative,quality=openingHookQuality(base);
 let next=base;
'''
if old not in t: raise SystemExit("applyOpeningExperience anchor missing")
t=t.replace(old,new,1)
old=''' const merged=uniq([...incoming.filter(x=>!generic.test(x)),...roleplay],4);
 if(x&&!x.opening.hookPresented){
'''
new=''' const merged=uniq([...incoming.filter(x=>!generic.test(x)),...roleplay],4);
 if(guard.replaced){state.events??=[];state.events.push({id:uid("EV"),type:"OPENING_HOOK_DECONFLICTED",visibility:"INTERNAL",reason:guard.reason,timelineId:guard.timelineId,day:Number(state.world?.state?.day)||1,at:Date.now()})}
 if(x&&!x.opening.hookPresented){
'''
if old not in t: raise SystemExit("opening event anchor missing")
t=t.replace(old,new,1)
write(p,t)

# Fresh browser identity for every importer of the changed opening guard.
for p in [ROOT/"app.js",*(ROOT/"src").glob("*.js")]:
    text=p.read_text(encoding="utf-8")
    text=text.replace('./player-experience.js?v=54018"','./player-experience.js?v=540181"')
    p.write_text(text,encoding="utf-8")

p=Path("test/newbie-protection-v05418.test.js")
t=read(p)
t=t.replace('import {sceneNarratorSystem} from "../src/ai-runtime-contracts.js";','import {sceneNarratorSystem} from "../src/ai-runtime-contracts.js";\nimport {applyOpeningExperience} from "../src/player-experience.js";')
t += '''\n\ntest("opening hook cannot pre-play an untriggered Future during newbie protection",()=>{\n const s=state(1,5);s.world.timeline=[{id:"TL-FUTURE",status:"SCHEDULED",observableEffect:"石牆滲出黑血，霧中傳來木槌擊地聲，赤足孩童逃竄。"}];\n const out=applyOpeningExperience(s,"石壁裂縫滲出黑血，霧中傳來木槌擊地聲，赤足孩子正朝外逃走。周圍的人還未理解發生了甚麼。",[]);\n assert.doesNotMatch(out.narrative,/滲出黑血|木槌擊地|赤足孩/);assert.match(out.narrative,/聲音突然停/);assert.ok(s.events.some(e=>e.type==="OPENING_HOOK_DECONFLICTED"&&e.reason==="FUTURE_OVERLAP"&&e.timelineId==="TL-FUTURE"))\n});\n\ntest("newbie opening downgrades severe world-driven catastrophe into a low-risk actionable hook",()=>{\n const s=state(1,5);const out=applyOpeningExperience(s,"王城正在全面戰爭，軍隊正在攻擊居民，街上遍地屍體，城門已經進入攻城狀態。",[]);\n assert.doesNotMatch(out.narrative,/全面戰爭|遍地屍體|攻城/);assert.ok(s.events.some(e=>e.type==="OPENING_HOOK_DECONFLICTED"&&e.reason==="NEWBIE_DANGER"))\n});\n'''
write(p,t)
print("patched opening hook future deconflict and newbie danger guard")
