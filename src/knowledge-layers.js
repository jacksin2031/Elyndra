const text=(v,max=160)=>typeof v==="string"?v.trim().slice(0,max):"";
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>text(x,120)).filter(Boolean))];

export function buildKnowledgeLayers(state={}){
 const facts=state.world?.canon?.facts||[],history=state.world?.history||[],timeline=state.world?.timeline||[],registry=state.world?.registry||{},knowledge=state.knowledge||[];
 const verified=knowledge.filter(x=>x?.status==="VERIFIED");
 return {
  version:1,
  canonTruth:{
   facts:facts.slice(-60).map(x=>({id:text(x.id),type:text(x.type,60),visibility:text(x.visibility,40)||"hidden"})),
   historyIds:uniq(history.map(x=>x?.id)).slice(-30),
   timelineIds:uniq(timeline.map(x=>x?.id)).slice(-30)
  },
  directorKnowledge:{
   factIds:uniq(facts.map(x=>x?.id)).slice(-60),
   hiddenFactIds:uniq(facts.filter(x=>String(x?.visibility||"").toLowerCase()!=="public").map(x=>x?.id)).slice(-40),
   scheduledTimelineIds:uniq(timeline.filter(x=>x?.status==="SCHEDULED").map(x=>x?.id)).slice(-20),
   entityIds:{
    locations:uniq((registry.locations||[]).map(x=>x?.id)).slice(-40),
    npcs:uniq((registry.npcs||[]).map(x=>x?.id)).slice(-40),
    factions:uniq((registry.factions||[]).map(x=>x?.id)).slice(-30)
   }
  },
  playerKnowledge:{
   verifiedFactIds:uniq(verified.map(x=>x?.factId)).slice(-40),
   entries:knowledge.slice(-30).map(x=>({id:text(x.id),status:text(x.status,40),factId:text(x.factId)||null,historyId:text(x.historyId)||null,title:text(x.title,100)}))
  }
 }
}
export function playerKnowledgeLayer(layers={}){return {version:layers.version||1,playerKnowledge:structuredClone(layers.playerKnowledge||{verifiedFactIds:[],entries:[]})}}
