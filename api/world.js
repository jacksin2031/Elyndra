import {json,methodGuard,safeBody,callModel} from "./_ai.js";
export default async function handler(req,res){
 if(!methodGuard(req,res))return;
 try{
  const {seed,constitution}=safeBody(req);if(!seed)return json(res,400,{error:"INVALID_REQUEST"});
  const system="你是 Elyndra World Architect。輸出嚴格 JSON，不要 Markdown。玩家開局對世界知識為 0，不知道世界名、地名、勢力、歷史、魔法規則或自己位置名稱；openingHook 與 suggestions 只能使用當下能直接感知的資訊。seed.playerName 有值時原樣保留，否則由你決定玩家名稱。生成內容必須服從 constitution，避免自相矛盾。只生成候選內容，最終 Canon 由 Game Engine 驗證。";
  const user=JSON.stringify({seed,constitution,required:{worldName:"string",playerName:"string",summary:"string",worldBible:{era:"string",centralConflict:"string",magicCost:"string",startingRegion:"string",startingSettlement:"string",startingLocation:"string",ancientTruth:"string",currentCrisis:"string",tone:"string"},publicFacts:["string"],hiddenFacts:["string"],openingHook:"string",suggestions:["3-4 immediate player actions"],generation:{locations:[{name:"string",type:"string",region:"string",description:"string",known:false,lore:{story:"generated once",unlockKeywords:["clue"],minMatches:1}}],npcs:[{name:"string",role:"string",description:"string",known:false,lore:{story:"generated once",unlockKeywords:["clue"],minMatches:1}}],factions:[{name:"string",goal:"string",description:"string",known:false,lore:{story:"generated once",unlockKeywords:["clue"],minMatches:1}}],sideQuests:[]}}});
  const raw=await callModel({system,user,temperature:.8});let candidate;try{candidate=JSON.parse(raw)}catch{return json(res,422,{error:"INVALID_MODEL_JSON"})}
  if(!candidate.summary||!Array.isArray(candidate.publicFacts)||!Array.isArray(candidate.hiddenFacts)||!candidate.openingHook)return json(res,422,{error:"INVALID_WORLD_CANDIDATE"});
  return json(res,200,{candidate});
 }catch(e){return json(res,e.code==="AI_NOT_CONFIGURED"?503:502,{error:e.code||e.message})}
}