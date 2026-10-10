const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const list=v=>Array.isArray(v)?v.map(x=>clean(typeof x==="string"?x:x?.signal||x?.id||x?.name,120)).filter(Boolean):[];
const normStatus=v=>{const raw=typeof v==="string"?v:v?.status,x=String(raw||"UNKNOWN").trim().toUpperCase();return ["PASS","FAIL","PARTIAL","PRESENT","ABSENT","NOT_PRESENT","UNKNOWN"].includes(x)?x:"UNKNOWN"};
export function normalizeOriginNarrativeIdentity(value={}){
 const v=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
 return {coreTension:clean(v.coreTension,120)||"CUSTOM_DEFINED",requiredSignals:list(v.requiredSignals),forbiddenSignals:list(v.forbiddenSignals),proseContract:v.proseContract&&typeof v.proseContract==="object"&&!Array.isArray(v.proseContract)?structuredClone(v.proseContract):{}}
}
function semanticBody(reported={}){let nested=reported&&typeof reported==="object"&&!Array.isArray(reported)?reported:{};for(const key of ["contract","openingHookCheck","narrativeIdentity"]){const next=nested?.[key];if(next&&typeof next==="object"&&!Array.isArray(next))nested=next}return nested||{}}
function signalRows(value){
 if(Array.isArray(value))return value;
 if(value&&typeof value==="object"&&Array.isArray(value.rows))return value.rows;
 if(value&&typeof value==="object")return Object.entries(value).map(([signal,row])=>typeof row==="string"?{signal,status:row}:{signal,...row});
 return []
}
function semanticSignal(value,key,forbidden=false){
 const row=signalRows(value).find(x=>clean(x?.signal||x?.id||x?.name,120)===key),status=normStatus(row),evidence=clean(row?.evidence,360);
 const violation=forbidden?!["PASS","ABSENT","NOT_PRESENT"].includes(status):status!=="PASS";
 return {signal:key,status,evidence,violation}
}
export function originComplianceSchema(originOpening={}){
 const n=normalizeOriginNarrativeIdentity(originOpening?.narrativeIdentity||{});
 return {coreTension:{type:n.coreTension,status:"PASS|FAIL|PARTIAL",evidence:"第一幕如何具體呈現核心張力"},requiredSignals:n.requiredSignals.map(signal=>({signal,status:"PASS|FAIL|PARTIAL",evidence:"第一幕中的直接證據"})),forbiddenSignals:n.forbiddenSignals.map(signal=>({signal,status:"PASS|PRESENT|ABSENT",evidence:"若出現，指出直接證據"})),notes:["只評估敘事語義，不改寫 Canon 或 Opening"]}
}
export function fallbackOriginCompliance(originOpening={},error="SEMANTIC_EVALUATOR_UNAVAILABLE"){
 const n=normalizeOriginNarrativeIdentity(originOpening?.narrativeIdentity||{});
 return {coreTension:{type:n.coreTension,status:"PARTIAL",evidence:"semantic evaluator unavailable"},requiredSignals:n.requiredSignals.map(signal=>({signal,status:"PARTIAL",evidence:"semantic evaluator unavailable"})),forbiddenSignals:n.forbiddenSignals.map(signal=>({signal,status:"UNKNOWN",evidence:"semantic evaluator unavailable"})),notes:[error],semanticSource:"FALLBACK",semanticError:error}
}
export function evaluateOriginOpeningCompliance({openingHook="",originOpening={},playerOrigin={},anchor={},reported=null,semanticSource="",semanticError=""}={}){
 const opening=clean(openingHook,1800),n=normalizeOriginNarrativeIdentity(originOpening?.narrativeIdentity||playerOrigin?.narrativeIdentity||{}),semantic=semanticBody(reported),errors=[],knowledgeLeakCodes=[];
 if(originOpening?.worldNameKnown!==true&&anchor?.worldName&&opening.includes(String(anchor.worldName)))knowledgeLeakCodes.push("WORLD_NAME_LEAK");
 for(const hidden of Array.isArray(anchor?.hiddenFacts)?anchor.hiddenFacts:[])if(hidden&&opening.includes(String(hidden)))knowledgeLeakCodes.push("HIDDEN_CANON_LEAK");
 const epistemicOverride=knowledgeLeakCodes.length>0;
 const worldStateIssues=[];if(!originOpening?.spawnPolicy)worldStateIssues.push("SPAWN_POLICY_MISSING");if(!originOpening?.equipmentPolicy)worldStateIssues.push("EQUIPMENT_POLICY_MISSING");
 const openingIssues=[];if(opening.length<30)openingIssues.push("OPENING_TOO_THIN");
 const coreRaw=semantic?.coreTension,coreStatus=normStatus(coreRaw),coreEvidence=clean(coreRaw?.evidence,360),coreType=clean(coreRaw?.type,120)||n.coreTension;
 const requiredRows=n.requiredSignals.map(signal=>semanticSignal(semantic?.requiredSignals,signal,false)),forbiddenRows=n.forbiddenSignals.map(signal=>semanticSignal(semantic?.forbiddenSignals,signal,true));
 const requiredPassed=requiredRows.filter(x=>x.status==="PASS").length,forbiddenViolations=forbiddenRows.filter(x=>x.violation&&!["UNKNOWN","PARTIAL"].includes(x.status)).length;
 const semanticPartial=coreStatus==="PARTIAL"||coreStatus==="UNKNOWN"||requiredRows.some(x=>["PARTIAL","UNKNOWN"].includes(x.status))||forbiddenRows.some(x=>["PARTIAL","UNKNOWN"].includes(x.status));
 if(epistemicOverride)errors.push(...knowledgeLeakCodes.map(x=>"EPISTEMIC:"+x));
 errors.push(...worldStateIssues.map(x=>"WORLD_STATE:"+x),...openingIssues.map(x=>"OPENING_LEGALITY:"+x));
 if(coreStatus==="FAIL")errors.push("NARRATIVE_CORE_TENSION:"+n.coreTension);
 for(const row of requiredRows)if(row.status==="FAIL")errors.push("NARRATIVE_REQUIRED_SIGNAL:"+row.signal+":"+row.status);
 for(const row of forbiddenRows)if(row.violation&&!["UNKNOWN","PARTIAL"].includes(row.status))errors.push("NARRATIVE_FORBIDDEN_SIGNAL:"+row.signal+":"+row.status);
 const openingOverride=worldStateIssues.length>0||openingIssues.length>0,narrativeAuthorityOverride=coreType!==n.coreTension;
 if(narrativeAuthorityOverride)errors.push("NARRATIVE_AUTHORITY:CORE_TENSION_MISMATCH");
 const hardFail=errors.length>0,source=clean(semanticSource,40)||clean(reported?.semanticSource,40)||"AI",semError=clean(semanticError,500)||clean(reported?.semanticError,500);
 const degraded=semanticPartial||source==="FALLBACK"||Boolean(semError),status=hardFail?"FAIL":degraded?"PARTIAL":"PASS";
 return {status,valid:status!=="FAIL",errors,coreTension:{type:n.coreTension,status:coreStatus==="UNKNOWN"&&source==="FALLBACK"?"PARTIAL":coreStatus,evidence:coreEvidence},requiredSignals:{passed:requiredPassed,total:requiredRows.length,rows:requiredRows},forbiddenSignals:{violations:forbiddenViolations,total:forbiddenRows.length,rows:forbiddenRows},epistemicOverride,openingOverride,narrativeAuthorityOverride,knowledgeLeakCodes,semanticSource:source,semanticError:semError,notes:Array.isArray(semantic?.notes)?semantic.notes.map(x=>clean(x,300)).filter(Boolean):[]}
}
