const SIMPLIFIED_TO_TRADITIONAL=Object.freeze({
 "严":"嚴","为":"為","争":"爭","仅":"僅","仪":"儀","会":"會","冻":"凍","则":"則","剧":"劇","动":"動","区":"區","压":"壓","发":"發","变":"變","听":"聽","响":"響","围":"圍","垄":"壟","垒":"壘","声":"聲","夹":"夾","夺":"奪","实":"實","对":"對","导":"導","尘":"塵","尝":"嘗","层":"層","属":"屬","峡":"峽","币":"幣","废":"廢","异":"異","弃":"棄","录":"錄","战":"戰","抢":"搶","换":"換","断":"斷","无":"無","机":"機","来":"來","桥":"橋","检":"檢","气":"氣","济":"濟","浓":"濃","涟":"漣","温":"溫","灭":"滅","点":"點","烧":"燒","狭":"狹","现":"現","离":"離","称":"稱","竞":"競","筑":"築","纳":"納","线":"線","经":"經","给":"給","绝":"絕","维":"維","绿":"綠","缘":"緣","缝":"縫","缴":"繳","网":"網","肤":"膚","脉":"脈","舱":"艙","节":"節","蚀":"蝕","补":"補","视":"視","记":"記","语":"語","财":"財","货":"貨","贸":"貿","边":"邊","过":"過","运":"運","进":"進","连":"連","钉":"釘","铁":"鐵","铆":"鉚","铜":"銅","锁":"鎖","锈":"鏽","镇":"鎮","门":"門","阀":"閥","随":"隨","雾":"霧","须":"須","颗":"顆","风":"風","驱":"驅","鸣":"鳴","齿":"齒",
 "这":"這","转":"轉","询":"詢","问":"問","当":"當","轻":"輕","触":"觸","锋":"鋒","锐":"銳","缘":"緣","测":"測","质":"質","闭":"閉","监":"監","从":"從","确":"確","认":"認","详":"詳","标":"標","环":"環","参":"參","见":"見","续":"續","验":"驗","证":"證","获":"獲","长":"長","设":"設","报":"報","体":"體","统":"統","络":"絡","灵":"靈","观":"觀","级":"級","开":"開","关":"關","处":"處","应":"應","术":"術","觉":"覺","话":"話","资":"資","轮":"輪","暂":"暫","时":"時","栅":"柵","紧":"緊","简":"簡","后":"後","频":"頻","该":"該","显":"顯","侧":"側","试":"試","图":"圖","饰":"飾","艺":"藝","踪":"蹤","辆":"輛","摆":"擺","间":"間","带":"帶","并":"並","细":"細","击":"擊","积":"積","响":"響","远":"遠","内":"內","写":"寫","读":"讀","签":"簽","钟":"鐘","伤":"傷","号":"號","从":"從","复":"復","变":"變","准":"準"
});
const SIMPLIFIED_CHINESE_RE=new RegExp("["+Object.keys(SIMPLIFIED_TO_TRADITIONAL).join("")+"]");
const SIMPLIFIED_CHINESE_GLOBAL_RE=new RegExp("["+Object.keys(SIMPLIFIED_TO_TRADITIONAL).join("")+ "]","g");
export const WORLD_TRADITIONAL_CHINESE_CONTRACT="所有中文文字欄位一律使用繁體中文（正體字）。JSON key、ID、enum、既有專有代碼保持原樣；人物名、地名、世界名、描述、歷史、社會、任務與建議中的中文不得使用簡體字。";
export function traditionalizeChineseText(value){return String(value??"").replace(SIMPLIFIED_CHINESE_GLOBAL_RE,ch=>SIMPLIFIED_TO_TRADITIONAL[ch]||ch)}
export function simplifiedChineseLeak(value){
 let found=null;
 const walk=(v,path="$" )=>{if(found||v==null)return;if(typeof v==="string"){const match=v.match(SIMPLIFIED_CHINESE_RE);if(match)found={character:match[0],path,sample:v.slice(Math.max(0,match.index-20),Math.min(v.length,match.index+21))};return}if(Array.isArray(v)){for(let i=0;i<v.length;i++)walk(v[i],`${path}[${i}]`);return}if(typeof v==="object")for(const [k,x] of Object.entries(v))walk(x,`${path}.${k}`)};
 walk(value);return found
}
export function hasSimplifiedChineseLeak(value){return Boolean(simplifiedChineseLeak(value))}
