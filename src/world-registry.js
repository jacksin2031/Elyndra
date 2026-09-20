const uid=(p)=>p+"-"+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
export function ensureWorldRegistry(state){
 state.world.registry??={locations:[],npcs:[],factions:[],sideQuests:[]};
 const r=state.world.registry;
 r.locations??=[];r.npcs??=[];r.factions??=[];r.sideQuests??=[];return r
}
export function registrySnapshot(state){
 const r=ensureWorldRegistry(state);
 return {locations:r.locations.slice(-20).map(({id,name,type,region,description})=>({id,name,type,region,description})),npcs:r.npcs.slice(-20).map(({id,name,role,locationId,factionId,description,personality,goal,trust})=>({id,name,role,locationId,factionId,description,personality,goal,trust})),factions:r.factions.slice(-12).map(({id,name,goal,description,resources,influence,playerReputation,relations})=>({id,name,goal,description,resources,influence,playerReputation,relations})),sideQuests:r.sideQuests.filter(q=>q.status!=="COMPLETED").slice(-12).map(({id,title,objective,status})=>({id,title,objective,status}))}
}
export function validateGeneration(g){
 if(g==null)return {valid:true,errors:[]};const e=[];
 if(typeof g!=="object"||Array.isArray(g))return {valid:false,errors:["GENERATION_INVALID"]};
 for(const k of ["locations","npcs","factions","sideQuests"])if(g[k]!=null&&!Array.isArray(g[k]))e.push(k.toUpperCase()+"_INVALID");
 for(const x of g.locations||[])if(!clean(x?.name,80)||!clean(x?.description,400))e.push("LOCATION_SHAPE_INVALID");
 for(const x of g.npcs||[])if(!clean(x?.name,80)||!clean(x?.role,100))e.push("NPC_SHAPE_INVALID");
 for(const x of g.factions||[])if(!clean(x?.name,80)||!clean(x?.goal,200))e.push("FACTION_SHAPE_INVALID");
 for(const x of g.sideQuests||[])if(!clean(x?.title,100)||!clean(x?.objective,240))e.push("SIDE_QUEST_SHAPE_INVALID");
 return {valid:e.length===0,errors:[...new Set(e)]}
}
export function canonizeGeneration(state,g){
 const v=validateGeneration(g);if(!v.valid)throw new Error(v.errors.join(","));const r=ensureWorldRegistry(state),added={locations:[],npcs:[],factions:[],sideQuests:[]};
 const byName=(arr,name)=>arr.some(x=>x.name.toLowerCase()===name.toLowerCase());const locIds=new Set(r.locations.map(x=>x.id)),facIds=new Set(r.factions.map(x=>x.id));
 for(const x of (g?.locations||[]).slice(0,2)){const name=clean(x.name,80);if(byName(r.locations,name))continue;const o={id:uid("LOC"),name,type:clean(x.type,60)||"未知地點",region:clean(x.region,80)||state.player.location,description:clean(x.description,400),canonical:true,discoveredDay:state.world.state.day};r.locations.push(o);added.locations.push(o)}
 for(const x of (g?.factions||[]).slice(0,1)){const name=clean(x.name,80);if(byName(r.factions,name))continue;const o={id:uid("FAC"),name,goal:clean(x.goal,200),description:clean(x.description,400),resources:50,influence:25,playerReputation:0,relations:{},lastActionMinute:state.world.state.clock?.totalMinutes||0,canonical:true};r.factions.push(o);added.factions.push(o)}
 for(const x of (g?.npcs||[]).slice(0,2)){const name=clean(x.name,80);if(byName(r.npcs,name)||name==="莉亞")continue;const requestedLoc=clean(x.locationId,120),requestedFac=clean(x.factionId,120);const o={id:uid("NPC"),name,role:clean(x.role,100),description:clean(x.description,400),personality:clean(x.personality,240)||"對陌生人保持謹慎",goal:clean(x.goal,240)||"維持自己的生活與安全",locationId:locIds.has(requestedLoc)?requestedLoc:null,factionId:facIds.has(requestedFac)?requestedFac:null,knowledgeScope:Array.isArray(x.knowledgeScope)?x.knowledgeScope.filter(v=>typeof v==="string"&&state.world.canon.facts.some(f=>f.id===v)).slice(0,12):[],alive:true,trust:0,memories:[],lastActionMinute:state.world.state.clock?.totalMinutes||0,canonical:true};r.npcs.push(o);added.npcs.push(o)}
 for(const x of (g?.sideQuests||[]).slice(0,1)){const title=clean(x.title,100);if(r.sideQuests.some(q=>q.title.toLowerCase()===title.toLowerCase()))continue;const o={id:uid("SQ"),title,objective:clean(x.objective,240),status:"ACTIVE",createdDay:state.world.state.day,canonical:true};r.sideQuests.push(o);added.sideQuests.push(o)}
 if(Object.values(added).some(a=>a.length)){state.world.version++;state.events.push({id:uid("EV"),type:"WORLD_CANON_EXPANDED",day:state.world.state.day,summary:Object.entries(added).filter(([,a])=>a.length).map(([k,a])=>`${k} +${a.length}`).join(" · "),at:Date.now()})}
 return added
}