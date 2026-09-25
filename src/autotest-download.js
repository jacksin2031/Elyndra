const encoder=new TextEncoder();
const BRIDGE_ENDPOINT="__elyndra_autotest_download__";
const bridgeState={status:"idle",controlled:false,scriptUrl:"",scope:"",error:""};
const hex=buffer=>Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,"0")).join("");
async function sha256Bytes(bytes,cryptoImpl){if(!cryptoImpl?.subtle?.digest)throw new Error("AUTOTEST_DOWNLOAD_SHA256_UNAVAILABLE");return hex(await cryptoImpl.subtle.digest("SHA-256",bytes))}
export async function buildAutotestDownloadPayload(artifact,{cryptoImpl=globalThis.crypto}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_DOWNLOAD_ARTIFACT_INVALID");
 const body=String(artifact.body??""),filename=String(artifact.filename),mime=String(artifact.mime||"application/json;charset=utf-8"),raw=encoder.encode(body),sha256=await sha256Bytes(raw,cryptoImpl);
 return {schema:"elyndra-autotest-download-v1",filename,mime,body,chars:body.length,bytes:raw.length,sha256}
}
export function autotestDownloadHttpUrl(artifact,{baseHref=globalThis.location?.href,nonce=Date.now()}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_DOWNLOAD_ARTIFACT_INVALID");
 if(!baseHref)throw new Error("AUTOTEST_DOWNLOAD_BASE_URL_UNAVAILABLE");
 const url=new URL(BRIDGE_ENDPOINT,String(baseHref));url.searchParams.set("filename",String(artifact.filename));url.searchParams.set("v","57021");url.searchParams.set("n",String(nonce));return url.href
}
export function createAutotestDownloadLease(payload,{BlobImpl=globalThis.Blob,URLImpl=globalThis.URL,navigatorImpl=globalThis.navigator,locationImpl=globalThis.location,nowImpl=Date.now}={}){
 const controlled=Boolean(navigatorImpl?.serviceWorker?.controller&&locationImpl?.href);
 if(controlled){const url=autotestDownloadHttpUrl(payload,{baseHref:locationImpl.href,nonce:typeof nowImpl==="function"?nowImpl():Date.now()});return {url,filename:String(payload?.filename||""),bytes:Number(payload?.bytes)||0,sha256:String(payload?.sha256||""),method:"service-worker-http",revoke(){}}}
 if(typeof BlobImpl!=="function"||typeof URLImpl?.createObjectURL!=="function"||typeof URLImpl?.revokeObjectURL!=="function")throw new Error("AUTOTEST_DOWNLOAD_OBJECT_URL_UNAVAILABLE");
 const blob=new BlobImpl([String(payload?.body??"")],{type:String(payload?.mime||"application/octet-stream")});if(Number(blob.size)!==Number(payload?.bytes))throw new Error("AUTOTEST_DOWNLOAD_BLOB_SIZE_MISMATCH");
 const url=URLImpl.createObjectURL(blob);let active=true;return {url,filename:String(payload?.filename||""),bytes:Number(blob.size)||0,sha256:String(payload?.sha256||""),method:"blob-url",revoke(){if(!active)return;active=false;URLImpl.revokeObjectURL(url)}}
}
export async function verifyAutotestDownloadedFile(file,payload,{cryptoImpl=globalThis.crypto}={}){
 if(!file)throw new Error("AUTOTEST_DOWNLOAD_FILE_MISSING");const raw=new Uint8Array(await file.arrayBuffer()),actual=await sha256Bytes(raw,cryptoImpl),expected=String(payload?.sha256||""),filename=String(payload?.filename||"");
 return {ok:String(file.name||"")===filename&&Number(file.size)===Number(payload?.bytes)&&actual===expected,filename:String(file.name||""),expectedFilename:filename,bytes:Number(file.size)||0,expectedBytes:Number(payload?.bytes)||0,sha256:actual,expectedSha256:expected}
}
function waitForController(sw,timeoutMs=8000){if(sw?.controller)return Promise.resolve(true);return new Promise(resolve=>{let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);sw?.removeEventListener?.("controllerchange",onchange);resolve(value)},onchange=()=>finish(Boolean(sw?.controller)),timer=setTimeout(()=>finish(Boolean(sw?.controller)),Math.max(0,Number(timeoutMs)||0));sw?.addEventListener?.("controllerchange",onchange)})}
export async function ensureAutotestDownloadBridge({navigatorImpl=globalThis.navigator,scriptUrl="./autotest-export-sw.js?v=57021",scope="./",timeoutMs=8000}={}){
 const sw=navigatorImpl?.serviceWorker;if(!sw?.register){Object.assign(bridgeState,{status:"unsupported",controlled:false,scriptUrl,scope,error:"SERVICE_WORKER_UNAVAILABLE"});return {...bridgeState}}
 Object.assign(bridgeState,{status:"registering",controlled:Boolean(sw.controller),scriptUrl,scope,error:""});
 try{const registration=await sw.register(scriptUrl,{scope,updateViaCache:"none"});await sw.ready;const controlled=Boolean(sw.controller)||await waitForController(sw,timeoutMs);Object.assign(bridgeState,{status:controlled?"ready":"waiting-control",controlled,scriptUrl,scope:registration?.scope||scope,error:""});return {...bridgeState}}
 catch(error){Object.assign(bridgeState,{status:"error",controlled:Boolean(sw?.controller),scriptUrl,scope,error:error?.message||String(error)});return {...bridgeState}}
}
export function autotestDownloadBridgeState(){return {...bridgeState}}
function nativeNavigate(url,locationImpl,documentImpl){
 if(typeof locationImpl?.assign==="function"){locationImpl.assign(url);return}
 const host=documentImpl?.body||documentImpl?.documentElement;if(!host||typeof documentImpl?.createElement!=="function")throw new Error("AUTOTEST_DOWNLOAD_DOCUMENT_UNAVAILABLE");const a=documentImpl.createElement("a");a.href=url;a.rel="noopener";if(a.style)a.style.display="none";host.appendChild(a);try{a.click()}finally{a.remove?.()}
}
export function requestAutotestBrowserDownload(artifact,{BlobImpl=globalThis.Blob,URLImpl=globalThis.URL,documentImpl=globalThis.document,setTimeoutImpl=globalThis.setTimeout,nowImpl=Date.now,revokeDelayMs=60000,navigatorImpl=globalThis.navigator,locationImpl=globalThis.location,preferHttp=true}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_DOWNLOAD_ARTIFACT_INVALID");const body=String(artifact.body??""),filename=String(artifact.filename),mime=String(artifact.mime||"application/octet-stream"),controlled=Boolean(preferHttp&&navigatorImpl?.serviceWorker?.controller&&locationImpl?.href);let method="",blob=null;
 if(controlled){const url=autotestDownloadHttpUrl(artifact,{baseHref:locationImpl.href,nonce:typeof nowImpl==="function"?nowImpl():Date.now()});method="service-worker-http-navigation";nativeNavigate(url,locationImpl,documentImpl)}
 else{const host=documentImpl?.body||documentImpl?.documentElement;if(!host||typeof documentImpl?.createElement!=="function")throw new Error("AUTOTEST_DOWNLOAD_DOCUMENT_UNAVAILABLE");if(typeof BlobImpl!=="function"||typeof URLImpl?.createObjectURL!=="function"||typeof URLImpl?.revokeObjectURL!=="function")throw new Error("AUTOTEST_DOWNLOAD_OBJECT_URL_UNAVAILABLE");blob=new BlobImpl([body],{type:mime});const url=URLImpl.createObjectURL(blob),a=documentImpl.createElement("a");a.href=url;a.download=filename;a.rel="noopener";if(a.style)a.style.display="none";host.appendChild(a);try{a.click()}finally{a.remove?.();const revoke=()=>{try{URLImpl.revokeObjectURL(url)}catch{}};if(typeof setTimeoutImpl==="function")setTimeoutImpl(revoke,Math.max(1000,Number(revokeDelayMs)||60000));else revoke()}method="blob-url"}
 return {status:"requested",method,requestedAt:Number(typeof nowImpl==="function"?nowImpl():Date.now()),filename,mime,bytes:blob?Number(blob.size)||encoder.encode(body).length:encoder.encode(body).length,chars:body.length,bridgeControlled:controlled}
}
function installTrustedRetryUpgrade(documentImpl=globalThis.document,navigatorImpl=globalThis.navigator,locationImpl=globalThis.location){
 if(!documentImpl?.addEventListener)return;documentImpl.addEventListener("click",event=>{const anchor=event.target?.closest?.("#autotestDownloadAnchor");if(!anchor||!navigatorImpl?.serviceWorker?.controller||!locationImpl?.href)return;const filename=String(anchor.getAttribute("download")||anchor.download||"");if(!filename)return;anchor.href=autotestDownloadHttpUrl({filename},{baseHref:locationImpl.href});anchor.removeAttribute?.("download");anchor.target="_blank";anchor.rel="noopener";anchor.dataset.elyndraNativeDownload="service-worker-http-isolated-navigation"},true)
}
if(typeof window!=="undefined"&&globalThis.navigator?.serviceWorker){installTrustedRetryUpgrade();Promise.resolve().then(()=>ensureAutotestDownloadBridge()).catch(()=>{})}
