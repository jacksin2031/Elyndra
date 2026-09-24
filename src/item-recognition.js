import {recordKnowledgeEvidence,recomputeCorroboration} from "./knowledge-model.js?v=57000";
import {advanceItemKnowledge,ensureItemStory,itemStorySnapshot} from "./item-heritage.js?v=57000";

const clean=(v,max=300)=>typeof v==="string"?v.trim().slice(0,max):"";
const smith=/鐵匠|鍛造|工匠|鑄|smith|forge|artisan|crafter/i,scholar=/學者|史家|研究|考古|圖書|scholar|historian|research|archaeolog|librar/i,soldier=/老兵|士兵|騎士|守衛|軍|傭兵|veteran|soldier|knight|guard|mercenar/i;
function overlap(a=[],b=[]){const x=new Set(a);return b.filter(v=>x.has(v))}
export function npcItemRecognition(state,itemOrId,npcOrId){
 const item=typeof itemOrId==="string"?(state.inventory||[]).find(x=>x.id===itemOrId||x.name===itemOrId):itemOrId;
 const npc=typeof npcOrId==="string"?(state.world?.registry?.npcs||[]).find(x=>x.id===npcOrId):npcOrId;
 if(!item||!npc)return {recognized:false,level:"NONE",confidence:"NONE",reasons:[],allowedClaims:[]};ensureItemStory(state,item);
 const p=item.heritage.provenance,scope=new Set(Array.isArray(npc.knowledgeScope)?npc.knowledgeScope:[]),npcHistory=npc.historyRefs||[],reasons=[],claims=[];
 const directFacts=Boolean(item.evidenceFactId&&scope.has(item.evidenceFactId)),hist=overlap(p.historyRefs,npcHistory),personal=overlap(p.personalLinks,[npc.id,...(npc.memories||[]).map(x=>x.id)]),faction=Boolean(p.originalFactionId&&p.originalFactionId===npc.factionId),role=String(npc.role||"")+" "+String(npc.description||"");
 let rank=0;
 if(smith.test(role)){rank=Math.max(rank,2);reasons.push("OCCUPATION_CRAFT");claims.push("TYPE","CRAFT_ORIGIN")}
 if(scholar.test(role)){rank=Math.max(rank,3);reasons.push("OCCUPATION_SCHOLAR");claims.push("TYPE","ERA","HISTORY")}
 if(soldier.test(role)){rank=Math.max(rank,2);reasons.push("OCCUPATION_MILITARY");claims.push("TYPE","FACTION_MARK")}
 if(directFacts){rank=Math.max(rank,4);reasons.push("KNOWLEDGE_SCOPE");claims.push("FACT_LINK")}
 if(hist.length){rank=Math.max(rank,4);reasons.push("HISTORY_REF");claims.push("HISTORY")}
 if(faction){rank=Math.max(rank,4);reasons.push("FACTION_LINK");claims.push("FACTION_MARK","HISTORY")}
 if(personal.length){rank=5;reasons.push("PERSONAL_LINK");claims.push("PROVENANCE","PERSONAL_MEMORY")}
 const level=["NONE","NOTICED","TYPE","ORIGIN","HISTORY","PROVENANCE"][rank],confidence=rank>=4?"HIGH":rank>=2?"MEDIUM":rank===1?"LOW":"NONE";
 return {recognized:rank>0,level,confidence,reasons:[...new Set(reasons)],allowedClaims:[...new Set(claims)],mayMisidentify:rank>0&&rank<4,mayWithhold:Boolean(faction||personal.length),historyRefs:hist,personalLinks:personal}
}
export function recordNpcItemTestimony(state,itemId,npcId,{text="",withheld=false,misidentified=false}={}){
 const item=(state.inventory||[]).find(x=>x.id===itemId||x.name===itemId),npc=(state.world?.registry?.npcs||[]).find(x=>x.id===npcId);if(!item||!npc)return {ok:false,reason:"ITEM_OR_NPC_NOT_FOUND"};
 const recognition=npcItemRecognition(state,item,npc);if(!recognition.recognized)return {ok:false,reason:"NPC_DOES_NOT_RECOGNIZE",recognition};
 const snapshot=itemStorySnapshot(state,item.id,{director:true}),claimText=clean(text,500)||(
  recognition.level==="PROVENANCE"?"對方聲稱這件物品與自己熟悉的人或事件有直接關係。":
  recognition.level==="HISTORY"?"對方認為這件物品與一段自己知道的歷史有關。":
  recognition.level==="ORIGIN"?"對方從年代、製法或標記推測了它的來源。":"對方辨認出了這件物品的類型或製法。"
 );
 const row=recordKnowledgeEvidence(state,{title:npc.name+" 對「"+item.name+"」的說法",text:withheld?"對方明顯有所保留，只透露："+claimText:claimText,historyId:recognition.historyRefs[0]||null,claimKey:"item:"+item.id+":provenance",evidenceType:"TESTIMONY",sourceRef:{npcId:npc.id,itemId:item.id},sourceIndependence:.5,verifiedByEngine:false});
 row.disputes=misidentified===true;const corroboration=recomputeCorroboration(state,row.claimKey);
 advanceItemKnowledge(state,item.id,{method:"NPC_TESTIMONY",evidenceRef:row.id});
 return {ok:true,recognition,testimonyId:row.id,beliefState:corroboration.beliefState,canonChanged:false,playerView:itemStorySnapshot(state,item.id),directorView:snapshot}
}
