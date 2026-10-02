import {evaluateOriginOpeningCompliance} from "./origin-opening-compliance.js?v=61002";

const obj=value=>value&&typeof value==="object"&&!Array.isArray(value);
const list=value=>Array.isArray(value)?value:[];
const text=(value,max=800)=>typeof value==="string"?value.trim().slice(0,max):"";
const countValue=value=>Number(value&&typeof value==="object"?value.value:value)||0;
const unique=values=>[...new Set(values.map(value=>text(value,160)).filter(Boolean))];
const countKinds=(rows,kind)=>list(rows).filter(row=>String(row?.kind||"").toUpperCase()===kind).length;
const EXPECTED_HISTORY_FLOOR=Object.freeze({YOUNG:3,ESTABLISHED:4,ANCIENT:6,DEEP_TIME:8});
const EXPECTED_MYSTERY_FLOOR=Object.freeze({LOW:1,STANDARD:2,HIGH:3,EXTREME:4});
const SHAPE_EVIDENCE=Object.freeze({
 CONTINENTAL:/大陸|大陆|內陸|内陆|洲域|continental/i,
 INNER_SEA:/內海|内海|環海|环海|海灣|海湾|內海沿岸|inner[ -]?sea/i,
 ARCHIPELAGO:/群島|群岛|島鏈|岛链|島嶼|岛屿|海島|海岛|浮島|浮岛|archipelago/i,
 FRACTURED:/破碎|斷裂|断裂|裂谷|裂島|裂岛|碎裂|fractured/i,
 LAYERED:/多層|多层|上層|上层|下層|下层|垂直|雲上|云上|layered/i,
 WILD_FRONTIER:/荒野|邊境|边境|拓荒|未開|未开|前沿|frontier/i
});
const ROUTE_PATHS=[
 value=>value?.routes,
 value=>value?.travelNetwork?.routes,
 value=>value?.worldRoutes,
 value=>value?.worldMap?.routes,
 value=>value?.topology?.routes,
 value=>value?.worldBible?.routes,
 value=>value?.worldBible?.topology?.routes,
 value=>value?.generation?.routes
];
function fullBlueprint(input){
 return input?.blueprint||input?.creationV2?.blueprint||input?.creation?.blueprint||input||{};
}
function advanced(blueprint){return blueprint?.advanced||blueprint?.blueprintProfile||blueprint?.creationV2?.blueprintProfile||blueprint||{}}
function genesisSettings(blueprint){
 const b=fullBlueprint(blueprint),g=b?.genesis||b?.blueprintProfile?.genesis||b?.creationV2?.blueprintProfile?.genesis||{};
 return {
  worldShape:String(g.worldShape||"AUTO").toUpperCase(),routeDensity:String(g.routeDensity||"NORMAL").toUpperCase(),
  historicalDepth:String(g.historicalDepth||"ESTABLISHED").toUpperCase(),volatility:String(g.volatility||g.worldVolatility||"DYNAMIC").toUpperCase(),
  ancientPowers:Math.max(0,Number(g.ancientPowers??g.ancientPowerCount)||0),nomadicPowers:Math.max(0,Number(g.nomadicPowers??g.nomadicPowerCount)||0),
  independentInstitutions:Math.max(0,Number(g.independentInstitutions??g.independentInstitutionCount)||0),lostCivilizations:Math.max(0,Number(g.lostCivilizations??g.lostCivilizationCount)||0),
  mysteryDensity:String(g.mysteryDensity||"STANDARD").toUpperCase(),crisisIntensity:String(g.crisisIntensity||"STANDARD").toUpperCase(),playerCentrality:String(g.playerCentrality||"LOW").toUpperCase()
 };
}
function profileCounts(blueprint){
 const a=advanced(fullBlueprint(blueprint));
 return {civilizations:countValue(a.civilizationCount),species:countValue(a.speciesCount),languages:countValue(a.languageCount)};
}
function requestedOrigin(originProfile,candidate){
 return originProfile||candidate?.originProfile||candidate?.blueprintProfile?.origin||candidate?.worldBible?.blueprintProfile?.origin||{};
}
function candidateRoutes(candidate){
 for(const path of ROUTE_PATHS){const rows=path(candidate);if(Array.isArray(rows))return rows}
 return [];
}
function normalized(value){return String(value||"").normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu,"")}
function hiddenLeak(candidate){
 const visible=[text(candidate?.openingHook,1800),...list(candidate?.publicFacts).map(x=>text(x,600))].join("\n"),visibleNorm=normalized(visible);
 for(const secret of list(candidate?.hiddenFacts).map(x=>text(x,600)).filter(Boolean)){
  const key=normalized(secret);
  if(key.length>=8&&visibleNorm.includes(key))return secret;
 }
 return "";
}
function validHistoryRefs(candidate){
 const ids=new Set(list(candidate?.worldHistory).map(row=>text(row?.id,120)).filter(Boolean)),refs=[];
 const visit=(row,path)=>{for(const id of list(row?.historyRefs))refs.push({id:text(id,120),path})};
 for(const [index,row] of list(candidate?.generation?.locations).entries())visit(row,`generation.locations[${index}]`);
 for(const [index,row] of list(candidate?.generation?.npcs).entries())visit(row,`generation.npcs[${index}]`);
 for(const [index,row] of list(candidate?.generation?.factions).entries())visit(row,`generation.factions[${index}]`);
 for(const [index,row] of list(candidate?.generation?.sideQuests).entries())visit(row,`generation.sideQuests[${index}]`);
 for(const [index,row] of list(candidate?.worldTimeline).entries())visit(row?.links,`worldTimeline[${index}]`);
 return {ids,refs,invalid:refs.filter(ref=>!ids.has(ref.id))};
}
function identitySeed(origin={}){
 const id=String(origin.id||origin.type||"UNKNOWN").replace(/^WC2_/i,"").toUpperCase();
 return {id,knowledgePolicy:String(origin.knowledgePolicy||"UNKNOWN").toUpperCase(),languagePolicy:String(origin.languagePolicy||"UNKNOWN").toUpperCase()};
}
function dimensionStatus(checks){return checks.some(x=>x.status==="FAIL")?"FAIL":checks.some(x=>x.status==="PARTIAL")?"PARTIAL":"PASS"}

/**
 * Compile Blueprint settings into a deterministic realization contract.
 * This creates planning metadata only; it does not invent or Canonize world facts.
 * Provenance: RECONSTRUCTED from the existing creationV2 Blueprint fields and
 * the prior v0.61.0 seven-dimension Genesis requirements summary.
 */
export function compileWorldGenesis(blueprintInput={},originProfile={}){
 const blueprint=fullBlueprint(blueprintInput),g=genesisSettings(blueprint),counts=profileCounts(blueprint),origin=identitySeed(requestedOrigin(originProfile,{}));
 const shape=Object.hasOwn(SHAPE_EVIDENCE,g.worldShape)?g.worldShape:"AUTO";
 const floor=EXPECTED_HISTORY_FLOOR[g.historicalDepth]||EXPECTED_HISTORY_FLOOR.ESTABLISHED;
 const mysteryFloor=EXPECTED_MYSTERY_FLOOR[g.mysteryDensity]||EXPECTED_MYSTERY_FLOOR.STANDARD;
 return {
  version:1,provenance:"RECONSTRUCTED",
  topology:{worldShape:shape,routeDensity:g.routeDensity,anchor:{region:"BLUEPRINT_STARTING_REGION",location:"BLUEPRINT_STARTING_LOCATION"},routeTargets:{SPARSE:1,NORMAL:2,DENSE:3}[g.routeDensity]||2},
  civilization:{levels:{civilization:countValue(advanced(blueprint).civilizationLevel),technology:countValue(advanced(blueprint).technologyLevel),magic:countValue(advanced(blueprint).magicLevel)},targetCounts:counts,deferredUntilRealized:true},
  politicalGraph:{targetGroups:g.ancientPowers+g.nomadicPowers+g.independentInstitutions,ancientPowers:g.ancientPowers,nomadicPowers:g.nomadicPowers,independentInstitutions:g.independentInstitutions,requireRelations:g.independentInstitutions>1||g.ancientPowers+g.nomadicPowers>1},
  originCompatibility:{originId:origin.id,knowledgePolicy:origin.knowledgePolicy,languagePolicy:origin.languagePolicy,preserveUnknownWorldName:true},
  history:{depth:g.historicalDepth,openingHistoryMinimum:3,realizationFloor:floor,lostCivilizationTarget:g.lostCivilizations},
  mystery:{density:g.mysteryDensity,openingHiddenFactFloor:mysteryFloor,keepHiddenFactsOutOfOpening:true},
  progressiveRealization:{volatility:g.volatility,crisisIntensity:g.crisisIntensity,playerCentrality:g.playerCentrality,initialEntityCaps:{locations:1,npcs:1,factions:1,sideQuests:1},deferredScopes:["ROUTE_NETWORK","CIVILIZATION_CATALOG","POLITICAL_RELATIONS","HISTORY_DEEPENING","MYSTERY_EVIDENCE"]},
  milestones:{bootstrap:["WORLD_IDENTITY","STARTING_REGION","STARTING_LOCATION","ORIGIN_OPENING","HISTORY_SKELETON"],deferred:["ROUTE_NETWORK","REMAINING_BLUEPRINT_COUNTS","POLITICAL_GRAPH","HISTORY_DEEPENING","MYSTERY_EVIDENCE"]}
 };
}

/** Deterministic, no-provider Genesis evaluation over the actual candidate payload. */
export function evaluateWorldGenesis({candidate={},blueprint={},originProfile=null}={}){
 const b=fullBlueprint(blueprint),g=genesisSettings(b),targets=profileCounts(b),origin=requestedOrigin(originProfile,candidate),plan=compileWorldGenesis(b,origin),checks=[],hardErrors=[],partialRealization=[];
 const add=(dimension,code,status,evidence,reason="",hard=false)=>{
  const row={dimension,code,status,evidence:text(evidence,480),provenance:"RECONSTRUCTED"};checks.push(row);
  if(status==="FAIL"&&hard)hardErrors.push(code+(reason?":"+reason:""));
  if(status==="PARTIAL")partialRealization.push({dimension,code,reason:text(reason||evidence,240)});
  return row;
 };
 const gen=obj(candidate?.generation)?candidate.generation:{};
 const bible=obj(candidate?.worldBible)?candidate.worldBible:{};
 const startName=text(bible.startingLocation,120),startRegion=text(bible.startingRegion,120),locations=list(gen.locations);
 const startRow=locations.find(row=>text(row?.name,120)===startName)||null;
 const locMatch=Boolean(startName&&startRegion&&startRow&&(!text(startRow.region,120)||text(startRow.region,120)===startRegion));
 add("TOPOLOGY","TOPOLOGY_START_ANCHOR",locMatch?"PASS":"FAIL",`Bible=${startRegion||"<missing>"}/${startName||"<missing>"}; generatedLocation=${text(startRow?.name,120)||"<missing>"}`,"開局地區、地點與首個 generation location 必須一致。",true);
 const shapeKey=Object.hasOwn(SHAPE_EVIDENCE,g.worldShape)?g.worldShape:"AUTO",geoCorpus=JSON.stringify({summary:candidate.summary,theme:candidate.worldTheme,bible,locations});
 const shapeRegex=SHAPE_EVIDENCE[shapeKey],shapeStatus=shapeKey==="AUTO"?"PARTIAL":shapeRegex?.test(geoCorpus)?"PASS":"PARTIAL";
 add("TOPOLOGY","TOPOLOGY_SHAPE_EVIDENCE",shapeStatus,`requested=${shapeKey}; evidence=${shapeStatus==="PASS"?"matching topology cues present":"no explicit topology evidence"}`,"世界敘述尚未明確落實所選骨架；需由地理階段提供可核對的地形證據。",false);
 const routes=candidateRoutes(candidate),routeTarget=plan.topology.routeTargets,routeStatus=routes.length>=routeTarget?"PASS":routes.length?"PARTIAL":"PARTIAL";
 add("TOPOLOGY","TOPOLOGY_ROUTE_DENSITY",routeStatus,`requested=${g.routeDensity} targetEdges=${routeTarget} actualEdges=${routes.length}`,"候選尚未包含足夠的明確路網；把剩餘路網列為 lazy realization，不推定路線已存在。",false);

 const civ=bible.civilization||{},civFields=[civ.level,civ.stage,civ.infrastructure,civ.literacy,civ.mobility],civOk=civFields.every(value=>value!==undefined&&value!==null&&String(value).trim()!=="");
 add("CIVILIZATION","CIVILIZATION_PROFILE_COMPLETE",civOk?"PASS":"FAIL",`present=${civFields.filter(value=>value!==undefined&&value!==null&&String(value).trim()!=="").length}/5`,`文明 profile 欄位應保留現有 World Bible 契約。`,true);
 const defs=list(gen.definitions),countRows={civilizations:countKinds(defs,"CIVILIZATION"),species:countKinds(defs,"SPECIES"),languages:countKinds(defs,"LANGUAGE")};
 const countEvidence=Object.keys(targets).map(key=>`${key}=${countRows[key]}/${targets[key]}`).join("; "),countsComplete=Object.keys(targets).every(key=>targets[key]===0||countRows[key]>=targets[key]);
 add("CIVILIZATION","CIVILIZATION_BLUEPRINT_COUNTS",countsComplete?"PASS":"PARTIAL",countEvidence,"尚未實現的文明／種族／語言目標保留為延後 realization，不能視為已達成。",false);
 const cultures=unique([...locations.map(x=>x?.culture?.identity),...list(gen.factions).map(x=>x?.culture?.identity)]),cultureStatus=cultures.length>=2?"PASS":"PARTIAL";
 add("CIVILIZATION","CIVILIZATION_LOCAL_VARIATION",cultureStatus,`distinctCultureIdentities=${cultures.length}`,"現有開局樣本未能證明多個地方制度或文化差異。",false);

 const factionRows=list(gen.factions),politicalTarget=plan.politicalGraph.targetGroups;
 add("POLITICAL_GRAPH","POLITICAL_POWER_TARGETS",factionRows.length>=politicalTarget?"PASS":"PARTIAL",`configuredGroups=${politicalTarget}; openingFactions=${factionRows.length}`,"Blueprint 所需政治群體仍未全部具體化；列為 deferred scope。",false);
 const edges=list(candidate?.politicalGraph?.edges).length+list(bible?.politicalGraph?.edges).length+factionRows.reduce((n,row)=>n+(obj(row?.relations)?Object.keys(row.relations).length:0),0);
 add("POLITICAL_GRAPH","POLITICAL_RELATIONS",edges>0?"PASS":"PARTIAL",`explicitRelationEdges=${edges}`,"尚無可驗證的勢力關係邊；需要在後續社會／政治 realization 建立。",false);
 const timeline=list(candidate?.worldTimeline),crisis=text(bible.currentCrisis,500),pressureLinked=Boolean(crisis&&timeline.some(row=>text(row?.directorTruth,500)&&text(row?.observableEffect,500)&&(list(row?.domains).some(x=>/POLITICS|SECURITY|SUPPLY|MIGRATION|LAW/i.test(String(x)))||Number(row?.pressure)>0)));
 add("POLITICAL_GRAPH","POLITICAL_PRESSURE_LINK",pressureLinked?"PASS":"PARTIAL",`crisis=${Boolean(crisis)}; linkedTimelinePressure=${pressureLinked}`,"目前危機與可演化事件尚未形成可驗證的制度／政治連結。",false);

 let originReport=null;
 if(candidate?.originOpening&&candidate?.openingHook){
  originReport=evaluateOriginOpeningCompliance({openingHook:candidate.openingHook,originOpening:candidate.originOpening,playerOrigin:origin,anchor:{worldName:candidate.worldName,hiddenFacts:candidate.hiddenFacts},reported:candidate.originOpeningCompliance,semanticSource:candidate.originOpeningCompliance?.semanticSource,semanticError:candidate.originOpeningCompliance?.semanticError});
 }else if(candidate?.originOpeningCompliance&&obj(candidate.originOpeningCompliance))originReport=candidate.originOpeningCompliance;
 const originStatus=String(originReport?.status||"UNKNOWN").toUpperCase();
 add("ORIGIN_COMPATIBILITY","ORIGIN_FOUR_LAYER_COMPLIANCE",originStatus==="PASS"?"PASS":originStatus==="FAIL"?"FAIL":"PARTIAL",`status=${originStatus}; errors=${list(originReport?.errors).join(",")||"none"}`,"Origin 四層 opening contract 未取得完整 PASS 證據。",originStatus==="FAIL");
 const originId=identitySeed(origin).id,originPolicy=identitySeed(origin).knowledgePolicy,openingPolicy=String(candidate?.originOpening?.spawnPolicy||"").toUpperCase(),spawnPresent=Boolean(openingPolicy&&candidate?.originOpening?.equipmentPolicy);
 const originAnchorOk=Boolean(startName&&startRow&&(!originId||originId!=="UNKNOWN")&&spawnPresent);
 add("ORIGIN_COMPATIBILITY","ORIGIN_SPAWN_ANCHOR",originAnchorOk?"PASS":"PARTIAL",`origin=${originId||"UNKNOWN"}; knowledgePolicy=${originPolicy}; spawnPolicy=${openingPolicy||"<missing>"}; anchor=${startRow?.name||"<missing>"}`,"需要確認開局地點存在且 World Opening 明列起源生成／裝備政策；不因此公開地點 Canon 名稱。",false);

 const leak=hiddenLeak(candidate);
 add("PROGRESSIVE_REALIZATION","PROGRESSIVE_HIDDEN_FACT_SEPARATION",leak?"FAIL":"PASS",leak?`hidden fact overlaps opening/public text: ${leak}`:"no exact hidden-fact disclosure found in opening or public facts",leak?"Hidden Canon 疑似進入開場或公開事實。":"Hidden facts 與開場／公開事實保持分離。",Boolean(leak));
 const cap={locations:1,npcs:1,factions:1,sideQuests:1},overCap=Object.entries(cap).filter(([key,max])=>list(gen[key]).length>max);
 add("PROGRESSIVE_REALIZATION","PROGRESSIVE_BOOTSTRAP_SCOPE",overCap.length?"PARTIAL":"PASS",`openingCounts=${Object.keys(cap).map(key=>`${key}:${list(gen[key]).length}`).join(",")}; targetCaps=${Object.entries(cap).map(([key,value])=>`${key}:${value}`).join(",")}`,overCap.length?"開局候選超出建議 bootstrap cap；需要確認額外內容不會一次揭露未知世界。":"開局實體規模符合漸進實現上限。",false);
 const playerCentrality=String(g.playerCentrality||"LOW").toUpperCase(),design=JSON.stringify({summary:candidate.summary,bible,publicFacts:candidate.publicFacts,hiddenFacts:candidate.hiddenFacts,generation:gen});
 const heroClaim=/唯一(?:救世|能拯救|預言中的主角)|只有你(?:能|可以)(?:拯救|阻止)|the only one who can|chosen one/i.test(design);
 const centralityStatus=playerCentrality==="NONE"&&heroClaim?"FAIL":playerCentrality==="NARRATIVE"&&list(bible?.designLogic?.storyEngines).length>=1?"PASS":playerCentrality==="NARRATIVE"?"PARTIAL":heroClaim?"PARTIAL":"PASS";
 add("PROGRESSIVE_REALIZATION","PROGRESSIVE_PLAYER_CENTRALITY",centralityStatus,`requested=${playerCentrality}; exclusiveHeroClaim=${heroClaim}; storyEngines=${list(bible?.designLogic?.storyEngines).length}`,"玩家中心性設定與候選敘述／可持續 Story Engine 尚未充分對齊。",playerCentrality==="NONE"&&heroClaim);

 const hist=list(candidate?.worldHistory),historyFloor=plan.history.realizationFloor,depthStatus=hist.length>=historyFloor?"PASS":"PARTIAL";
 add("HISTORY_INTEGRATION","HISTORY_DEPTH_REALIZATION",depthStatus,`requested=${g.historicalDepth}; records=${hist.length}; reconstructedFloor=${historyFloor}`,"歷史深度低於重建的 Blueprint realization floor；尚未深化部分應保持為可延後內容。",false);
 const refs=validHistoryRefs(candidate),refStatus=refs.invalid.length?"FAIL":refs.refs.length?"PASS":"PARTIAL";
 add("HISTORY_INTEGRATION","HISTORY_REFERENCE_INTEGRITY",refStatus,refs.invalid.length?refs.invalid.map(x=>`${x.path}:${x.id}`).join("; "): `historyIds=${refs.ids.size}; referencedIds=${refs.refs.length}`,"generation 與 Timeline 的 historyRefs 必須指向本候選既有 HIST ID。",refs.invalid.length>0);

 const hiddenFacts=list(candidate?.hiddenFacts).filter(x=>text(x,600)),mysteryFloor=plan.mystery.openingHiddenFactFloor;
 const mysteryCountStatus=hiddenFacts.length>=mysteryFloor?"PASS":"PARTIAL";
 add("MYSTERY_INTEGRITY","MYSTERY_DENSITY_REALIZATION",mysteryCountStatus,`requested=${g.mysteryDensity}; hiddenFacts=${hiddenFacts.length}; reconstructedFloor=${mysteryFloor}`,"Hidden mystery inventory 尚未達到 Blueprint 建議的初始 floor。",false);
 const publicSet=new Set(list(candidate?.publicFacts).map(normalized).filter(Boolean)),hiddenDuplicate=hiddenFacts.find(item=>{const key=normalized(item);return key.length>=8&&publicSet.has(key)});
 const mysterySplitStatus=hiddenDuplicate?"FAIL":hiddenFacts.length&&list(candidate?.publicFacts).length?"PASS":"PARTIAL";
 add("MYSTERY_INTEGRITY","MYSTERY_PUBLIC_HIDDEN_SPLIT",mysterySplitStatus,hiddenDuplicate?`hidden/public duplicate=${text(hiddenDuplicate,180)}`:`publicFacts=${list(candidate?.publicFacts).length}; hiddenFacts=${hiddenFacts.length}`,"公開與隱藏 Canon 必須分欄且不得重複曝露同一完整事實。",Boolean(hiddenDuplicate));

 const byDimension={};
 for(const row of checks)(byDimension[row.dimension]??=[]).push(row);
 const dimensions=Object.fromEntries(Object.entries(byDimension).map(([id,rows])=>[id,{status:dimensionStatus(rows),score:Math.round(rows.reduce((n,row)=>n+(row.status==="PASS"?1:row.status==="PARTIAL"?.5:0),0)/rows.length*100),checks:rows}]));
 const pass=checks.filter(row=>row.status==="PASS").length,partial=checks.filter(row=>row.status==="PARTIAL").length,fail=checks.filter(row=>row.status==="FAIL").length;
 const findings=checks.filter(row=>row.status!=="PASS").map(row=>({code:row.code,dimension:row.dimension,severity:hardErrors.some(error=>error.startsWith(row.code))?"CRITICAL":row.status==="FAIL"?"HIGH":"MEDIUM",status:row.status,evidence:row.evidence,problem:row.status==="PARTIAL"?"Blueprint scope is not fully realized yet.":"Genesis contract has a deterministic validation failure.",recommendation:row.status==="PARTIAL"?"Keep this item explicitly deferred and realize it through the existing pipeline when its dependencies are available.":"Repair the candidate without changing locked Blueprint, Origin, or Canon facts.",requiresRegeneration:row.status==="FAIL"}));
 const status=hardErrors.length||fail?"FAIL":partial?"PARTIAL":"PASS";
 return {version:1,provenance:"RECONSTRUCTED",status,valid:fail===0,score:Math.round((pass+partial*.5)/checks.length*100),summary:{total:checks.length,pass,partial,fail},dimensions,checks,findings,hardErrors,partialRealization,blueprintPlan:plan};
}

export function attachWorldGenesis(candidate,{blueprint={},originProfile=null}={}){
 const source=obj(candidate)?structuredClone(candidate):{},blueprintPlan=compileWorldGenesis(blueprint,originProfile||requestedOrigin(originProfile,source)),evaluation=evaluateWorldGenesis({candidate:source,blueprint,originProfile});
 return {...source,worldGenesisPlan:blueprintPlan,worldGenesisEvaluation:evaluation};
}
