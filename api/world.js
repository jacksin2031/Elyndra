import {json,methodGuard,safeBody,callModel} from "./_ai.js";
import {seedDirective} from "../src/seed-contract.js";
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {seed,constitution}=safeBody(req);if(!seed)return json(res,400,{error:"INVALID_REQUEST"});
  const directive=seedDirective(seed),auto=directive.contract.worldviewMode==="ai",expected=directive.contract,chosen=v=>v==="AI_DECIDES"||v==null?"AI 必須自行決定並回傳具體值":v;
  const system="你是 Elyndra World Architect。世界主題永遠由你自行創造，不可從固定主題清單選擇。worldviewMode=style 時，玩家選擇的 genre/scale/danger/magic/politics 與 styleFoundation 是硬性世界基礎；worldviewMode=ai 時，genre/theme/scale/danger/magic/politics 全部由你自行決定並形成一致的因果世界觀。seedCompliance 必須回傳實際採用的具體值與不同 evidence，禁止把 AI_DECIDES 當成答案。不得採用現實地球公曆、現實國家制度或全世界統一金幣作預設；世界要有自己的曆法，每個首次生成地點／勢力要有 culture 與 trade。玩家開局世界知識為 0，openingHook 與 suggestions 只能使用當下能直接感知的資訊，且 suggestions 不可使用固定預設按鈕。只生成開局所需最小世界，後續採 lazy generation。輸出嚴格 JSON，不要 Markdown。";
  const user=JSON.stringify({seed,seedDirective:directive,constitution,required:{
   worldName:"string",worldTheme:"AI 自行創造的具體核心主題",playerName:"string",summary:"string",
   seedCompliance:{
    genre:{value:chosen(expected.genre),evidence:"string"},
    theme:{value:"AI 自行創造的具體核心主題，與 worldTheme 完全相同",evidence:"string"},
    scale:{value:chosen(expected.scale),evidence:"string"},
    danger:{value:auto?"AI 自行選擇 1-5 整數":expected.danger,evidence:"string"},
    magic:{value:auto?"AI 自行選擇 1-5 整數":expected.magic,evidence:"string"},
    politics:{value:auto?"AI 自行選擇 1-5 整數":expected.politics,evidence:"string"},
    ...(expected.prompt?{prompt:{value:expected.prompt,evidence:"string"}}:{})
   },
   worldCalendar:{name:"string",epochName:"string",dayTerm:"string",cycleTerm:"string",longCycleTerm:"string",daysPerCycle:"3-60",cyclesPerLongCycle:"3-30",cycles:["string"],periods:[{name:"string",fromMinute:0,toMinute:359}]},worldTimeline:Array.from({length:directive.timelinePacing.majorEventCount},(_,i)=>({title:`大事件${i+1}`,category:"string",earliestDay:"internal day",latestDay:"internal day",directorTruth:"hidden cause",observableEffect:"player-observable effect without secret",pressure:"0-15"})),worldBible:{era:"世界自己的時代稱呼",centralConflict:"string",magicCost:"string",startingRegion:"string",startingSettlement:"string",startingLocation:"string",ancientTruth:"string",currentCrisis:"string",tone:"string"},
   publicFacts:["string"],hiddenFacts:["string"],openingHook:"string",suggestions:["3-4 AI-generated immediate actions based only on visible scene"],
   generation:{locations:[{name:"string",type:"string",region:"string",description:"string",known:false,culture:{identity:"string",etiquette:[],taboos:[],food:[],beliefs:[],architecture:[],clothing:[],hospitality:[],namingStyle:"string",languageNotes:[]},trade:{mode:"currency|barter|mixed|ration|token",currencies:[{id:"stable id",name:"string",symbol:"",issuer:"string",description:"string"}],commonBarter:[],foreignAcceptance:[],priceCulture:"string",questReward:0,combatReward:0},lore:{story:"generated once",unlockKeywords:["clue"],minMatches:1}}],npcs:[{name:"string",role:"string",description:"string",knowledgeScope:["public fact full text or fact id"],known:false,companionProfile:{joinThreshold:35,leaveThreshold:10,motives:[],boundaries:[]},lore:{story:"generated once",unlockKeywords:["clue"],minMatches:1}}],factions:[{name:"string",goal:"string",description:"string",known:false,culture:{identity:"string"},trade:{mode:"currency|barter|mixed|ration|token",currencies:[],commonBarter:[],foreignAcceptance:[],priceCulture:"string",questReward:0,combatReward:0},lore:{story:"generated once",unlockKeywords:["clue"],minMatches:1}}],sideQuests:[{title:"string",objective:"string",known:false,evidenceKeywords:["2-5 concrete clue keywords"],target:3}]}
  }});
  const raw=await callModel({system,user,temperature:.8,timeoutMs:120000});let candidate;try{candidate=JSON.parse(raw)}catch{return json(res,422,{error:"INVALID_MODEL_JSON"})}
  if(!candidate.summary||!candidate.seedCompliance||!candidate.worldTheme||!candidate.worldCalendar||!Array.isArray(candidate.worldTimeline)||!Array.isArray(candidate.publicFacts)||!Array.isArray(candidate.hiddenFacts)||!candidate.openingHook||!Array.isArray(candidate.suggestions)||candidate.suggestions.length<2)return json(res,422,{error:"INVALID_WORLD_CANDIDATE"});
  return json(res,200,{candidate});
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}