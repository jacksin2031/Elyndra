const id=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const explicitPlayerVisible=v=>["PLAYER_KNOWN","OBSERVABLE","RUMOR"].includes(v);
const EXPANSION_PROVIDER_BACKOFF_MS=120000;
export function ensureKnowledgeGraph(state){state.world.graph??={nodes:[],edges:[],expansions:[]};return state.world.graph}
function addEdge(g,from,to,type){if(from&&to&&!g.edges.some(e=>e.from===from&&e.to===to&&e.type===type))g.edges.push({from,to,type})}
export function bootstrapKnowledgeGraph(state){
 const g=ensureKnowledgeGraph(state),b=state.world.bible||{};
 const add=(type,label,visibility="hidden")=>{
  const value=clean(label);if(!value)return null;
  let n=g.nodes.find(x=>x.type===type&&x.label===value);
  if(!n){n={id:id(),type,label:value,visibility,canonical:true};g.nodes.push(n)}
  else if(!n.visibility)n.visibility=visibility;
  return n
 };
 const conflict=add("conflict",b.centralConflict,"discoverable"),truth=add("secret",b.ancientTruth,"hidden"),crisis=add("crisis",b.currentCrisis,"discoverable"),magic=add("rule",b.magicCost,"discoverable");
 addEdge(g,truth?.id,crisis?.id,"CAUSES");addEdge(g,conflict?.id,crisis?.id,"PRESSURES");addEdge(g,magic?.id,conflict?.id,"CONSTRAINS");
 return g
}
function visibleNodeIds(state,g){
 const verified=(state.knowledge||[]).filter(k=>k?.status==="VERIFIED");
 const factIds=new Set(verified.map(k=>k.factId).filter(Boolean));
 const graphIds=new Set(verified.map(k=>k.graphNodeId).filter(Boolean));
 return new Set(g.nodes.filter(n=>n.visibility==="public"||graphIds.has(n.id)||(n.factId&&factIds.has(n.factId))).map(n=>n.id))
}
export function graphSnapshot(state){
 const g=bootstrapKnowledgeGraph(state),visible=visibleNodeIds(state,g);
 return {
  nodes:g.nodes.filter(n=>visible.has(n.id)).slice(-12).map(({id,type,label})=>({id,type,label})),
  edges:g.edges.filter(e=>visible.has(e.from)&&visible.has(e.to)).slice(-16),
  expansions:[]
 }
}
export function recordExpansion(state,region,reason){const g=ensureKnowledgeGraph(state);if(g.expansions.some(x=>x.region===region))return false;g.expansions.push({id:id(),region:clean(region,120),reason:clean(reason,240),day:state.world.state.day});return true}
function hasPendingExpansionCheckpoint(state){return Boolean((state.world?.lazyGeneration?.plans||[]).some(plan=>plan?.status==="PLANNED"&&plan?.checkpoint?.stage))}
function recentProviderExpansionAbort(state,now=Date.now()){
 const plans=Array.isArray(state.world?.lazyGeneration?.plans)?state.world.lazyGeneration.plans:[];
 return plans.slice().reverse().find(plan=>{
  if(plan?.status!=="ABORTED")return false;
  const at=Number(plan.abortedAt)||0;if(!at||now-at>=EXPANSION_PROVIDER_BACKOFF_MS)return false;
  return /AI_TIMEOUT|AI_HTTP_(?:429|5\d\d)|Failed to fetch|fetch failed|NetworkError|ERR_NETWORK|Load failed|network request failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|connection (?:reset|closed|refused)|PROVIDER/i.test(String(plan.abortReason||""))
 })||null
}
export function needsExpansion(state){
 const g=ensureKnowledgeGraph(state),r=state.world.registry;if(!state.world.bible)return false;
 if(hasPendingExpansionCheckpoint(state))return true;
 if(recentProviderExpansionAbort(state))return false;
 return r.locations.length<2||Boolean(state.world.state.flags?.requestExpansion)&&g.expansions.length<12
}
export function recordCausalEvent(state,event,options={}){
 const graph=ensureKnowledgeGraph(state),causeIds=options.causeIds||[],entityIds=options.entityIds||[],visibility=explicitPlayerVisible(event?.visibility)?"public":"hidden";
 const node={id:"EVN-"+event.id,type:"event",label:clean(event.summary||event.type,300),visibility,eventId:event.id,day:event.day,canonical:true};
 if(!graph.nodes.some(n=>n.id===node.id))graph.nodes.push(node);
 for(const cause of causeIds.slice(0,4))if(graph.nodes.some(n=>n.id===cause))addEdge(graph,cause,node.id,"CAUSES");
 for(const entity of entityIds.slice(0,4))if(graph.nodes.some(n=>n.id===entity))addEdge(graph,entity,node.id,"PARTICIPATES");
 graph.nodes=graph.nodes.slice(-80);const ids=new Set(graph.nodes.map(n=>n.id));graph.edges=graph.edges.filter(e=>ids.has(e.from)&&ids.has(e.to)).slice(-140);return node
}
export function causalContext(state,limit=6){
 const graph=bootstrapKnowledgeGraph(state),visible=visibleNodeIds(state,graph);
 return graph.edges.filter(e=>visible.has(e.from)&&visible.has(e.to)).slice(-limit).map(e=>({from:e.from,to:e.to,type:e.type}))
}
