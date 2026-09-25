const clean=(value,max=500)=>String(value??"").trim().slice(0,max);
const list=value=>Array.isArray(value)?value:[];
const GENERIC_SPEAKERS=new Set(["旁白","系統","玩家","你","我","陌生人","女子","男子","少年","少女","老人","孩子","商人","店員","守衛","旅人","對方"]);

function names(values=[]){return [...new Set(list(values).map(x=>clean(x,120)).filter(Boolean))]}
function speakerPrefixes(value=""){
 const out=[];
 const re=/(?:^|[\n。！？!?])\s*([\u3400-\u9fff·]{1,12})\s*[：:]/g;
 let match;
 while((match=re.exec(String(value||""))))out.push(match[1]);
 return [...new Set(out)]
}

export function validateSceneProvenance(scene={},scope={}){
 const narrative=clean(scene?.narrative,1600),sceneTitle=clean(scene?.sceneTitle,160),explicitLocation=clean(scene?.location,160);
 const currentLocation=clean(scope?.currentLocation,160),presentNpcNames=names(scope?.presentNpcNames),allNpcNames=names(scope?.allNpcNames),knownLocations=names(scope?.knownLocations);
 const present=new Set(presentNpcNames),issues=[];
 if(explicitLocation&&currentLocation&&explicitLocation!==currentLocation)issues.push({type:"LOCATION_MISMATCH",value:explicitLocation,currentLocation});
 for(const name of allNpcNames){if(!name||present.has(name))continue;if(narrative.includes(name)||sceneTitle.includes(name))issues.push({type:"NPC_NOT_PRESENT",value:name})}
 for(const speaker of speakerPrefixes(narrative)){
  if(GENERIC_SPEAKERS.has(speaker)||present.has(speaker))continue;
  issues.push({type:"UNKNOWN_SPEAKER",value:speaker})
 }
 if(currentLocation){
  for(const location of knownLocations){
   if(!location||location===currentLocation)continue;
   if(sceneTitle===location||sceneTitle.startsWith(location+" · "))issues.push({type:"SCENE_TITLE_LOCATION_MISMATCH",value:location,currentLocation})
  }
 }
 return {valid:issues.length===0,issues,currentLocation,presentNpcNames}
}
