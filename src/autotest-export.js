const DB_NAME="elyndra-autotest-exports-v1",STORE_NAME="snapshots",SLOT="last",LOCAL_KEY="elyndra:autotest-export:last:v1",LOCAL_LIMIT=4_000_000;
const encoder=new TextEncoder();
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const safeStorage=()=>{try{return globalThis.localStorage||null}catch{return null}};
const cleanMode=value=>["debug","world","both"].includes(value)?value:"both";
const safeStamp=value=>String(value||new Date().toISOString()).replace(/[:.]/g,"-");
function normalizeSnapshot(snapshot={}){
 const out=clone(snapshot)||{};
 out.schema="elyndra-autotest-export-v2";out.appVersion=String(out.appVersion||"");out.createdAt=String(out.createdAt||new Date().toISOString());out.stamp=safeStamp(out.stamp||out.createdAt);out.exportMode=cleanMode(out.exportMode);
 out.debugPayload=out.debugPayload&&typeof out.debugPayload==="object"?out.debugPayload:{};out.worlds=Array.isArray(out.worlds)?out.worlds:[];
 out.downloadArtifacts=out.downloadArtifacts&&typeof out.downloadArtifacts==="object"&&!Array.isArray(out.downloadArtifacts)?out.downloadArtifacts:{};
 return out
}
export function buildAutotestExportSnapshot({appVersion="",report={},results=[],telemetry=[],startedAt=0,exportMode="both",createdAt=new Date().toISOString()}={}){
 const rows=Array.isArray(results)?results:[],runTelemetry=(Array.isArray(telemetry)?telemetry:[]).filter(e=>Number(e?.at)>=Number(startedAt||0));
 const debugPayload={...clone(report),telemetry:clone(runTelemetry),actions:rows.map(r=>({index:r.index,status:r.status,stopReason:r.stopReason,actions:clone(r.actions||[])}))};
 const worlds=rows.filter(r=>r?.world).map(r=>({index:r.index,status:r.status,stopReason:r.stopReason,summary:clone(r.summary),world:clone(r.world)}));
 return normalizeSnapshot({appVersion,createdAt,stamp:safeStamp(createdAt),exportMode:cleanMode(exportMode),debugPayload,worlds})
}
export function buildAutotestExportArtifacts(snapshot={}){
 const s=normalizeSnapshot(snapshot),debugEnabled=s.exportMode!=="world",worldEnabled=s.exportMode!=="debug",artifacts={debug:null,world:null,recovery:null};
 if(debugEnabled)artifacts.debug={kind:"debug",filename:`Elyndra-autotest-debug-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify(s.debugPayload,null,2)};
 if(worldEnabled&&s.worlds.length===1)artifacts.world={kind:"world",filename:`Elyndra-autotest-world-v${s.appVersion}-${s.stamp}.elyndra`,mime:"application/octet-stream",body:JSON.stringify(s.worlds[0].world,null,2)};
 else if(worldEnabled&&s.worlds.length)artifacts.world={kind:"world",filename:`Elyndra-autotest-worlds-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify({schema:"elyndra-autotest-worlds-v1",appVersion:s.appVersion,createdAt:s.createdAt,worlds:s.worlds},null,2)};
 if(artifacts.debug&&artifacts.world)artifacts.recovery={kind:"recovery",filename:`Elyndra-autotest-recovery-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify({schema:"elyndra-autotest-recovery-v1",appVersion:s.appVersion,createdAt:s.createdAt,debug:s.debugPayload,worlds:s.worlds},null,2)};
 return artifacts
}
export function buildPersistedAutotestDownloadArtifacts(snapshot={}){
 const artifacts=buildAutotestExportArtifacts(snapshot),out={};
 for(const kind of ["debug","world"]){const artifact=artifacts[kind];if(!artifact)continue;const body=String(artifact.body??""),raw=encoder.encode(body);out[artifact.filename]={kind,filename:artifact.filename,mime:String(artifact.mime||"application/octet-stream"),body,bytes:raw.byteLength}}
 return out
}
function openDb(indexedDBImpl){
 return new Promise((resolve,reject)=>{const req=indexedDBImpl.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:"slot"})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("AUTOTEST_EXPORT_DB_OPEN_FAILED"))})
}
function idbPut(db,value){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readwrite");tx.objectStore(STORE_NAME).put(value);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error("AUTOTEST_EXPORT_DB_WRITE_FAILED"));tx.onabort=()=>reject(tx.error||new Error("AUTOTEST_EXPORT_DB_WRITE_ABORTED"))})}
function idbGet(db){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readonly"),req=tx.objectStore(STORE_NAME).get(SLOT);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||new Error("AUTOTEST_EXPORT_DB_READ_FAILED"))})}
export async function saveLastAutotestExportSnapshot(snapshot,{indexedDBImpl=globalThis.indexedDB,storage=safeStorage()}={}){
 const normalized=normalizeSnapshot(snapshot);normalized.downloadArtifacts=buildPersistedAutotestDownloadArtifacts(normalized);let indexedError="";
 if(indexedDBImpl){try{const db=await openDb(indexedDBImpl);try{await idbPut(db,{slot:SLOT,...normalized})}finally{db.close?.()}return {backend:"indexeddb",persisted:true,downloadArtifacts:Object.keys(normalized.downloadArtifacts).length}}catch(error){indexedError=String(error?.message||error||"INDEXEDDB_FAILED")}}
 const fallback=clone(normalized);fallback.downloadArtifacts={};const text=JSON.stringify(fallback);
 if(storage&&text.length<=LOCAL_LIMIT){storage.setItem(LOCAL_KEY,text);return {backend:"localStorage",persisted:true,warning:indexedError||null,downloadArtifacts:0}}
 throw new Error(indexedError?`AUTOTEST_EXPORT_PERSIST_FAILED: ${indexedError}`:"AUTOTEST_EXPORT_PERSIST_FAILED")
}
export async function loadLastAutotestExportSnapshot({indexedDBImpl=globalThis.indexedDB,storage=safeStorage()}={}){
 if(indexedDBImpl){try{const db=await openDb(indexedDBImpl);try{const row=await idbGet(db);if(row){const {slot,...snapshot}=row;return normalizeSnapshot(snapshot)}}finally{db.close?.()}}catch{}}
 try{const raw=storage?.getItem(LOCAL_KEY);return raw?normalizeSnapshot(JSON.parse(raw)):null}catch{return null}
}
