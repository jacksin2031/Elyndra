const SIMPLIFIED_CHINESE_RE=/[严为争仅仪会冻则剧动区压发变听响围垄垒声夹夺实对导尘尝层属峡币废异弃录战抢换断无机来桥检气济浓涟温灭点烧狭现离称竞筑纳线经给绝维绿缘缝缴网肤脉舱节蚀补视记语财货贸边过运进连钉铁铆铜锁锈镇门阀随雾须颗风驱鸣齿]/;
export const WORLD_TRADITIONAL_CHINESE_CONTRACT="所有中文文字欄位一律使用繁體中文（正體字）。JSON key、ID、enum、既有專有代碼保持原樣；人物名、地名、世界名、描述、歷史、社會、任務與建議中的中文不得使用簡體字。";

export function simplifiedChineseLeak(value){
 let found=null;
 const walk=(v,path="$")=>{
  if(found||v==null)return;
  if(typeof v==="string"){
   const match=v.match(SIMPLIFIED_CHINESE_RE);
   if(match)found={character:match[0],path,sample:v.slice(Math.max(0,match.index-20),Math.min(v.length,match.index+21))};
   return
  }
  if(Array.isArray(v)){for(let i=0;i<v.length;i++)walk(v[i],`${path}[${i}]`);return}
  if(typeof v==="object")for(const [k,x] of Object.entries(v))walk(x,`${path}.${k}`)
 };
 walk(value);return found
}
export function hasSimplifiedChineseLeak(value){return Boolean(simplifiedChineseLeak(value))}
