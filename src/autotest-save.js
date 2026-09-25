const encoder=new TextEncoder();
const hex=buffer=>Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,"0")).join("");
const artifactBytes=artifact=>encoder.encode(String(artifact?.body||"")).byteLength;
const extensionOf=filename=>{const m=String(filename||"").match(/(\.[A-Za-z0-9_-]+)$/);return m?m[1]:".json"};
const pickerTypes=artifact=>{const mime=String(artifact?.mime||"application/json").split(";")[0]||"application/json",ext=extensionOf(artifact?.filename);return [{description:ext===".elyndra"?"Elyndra world":"JSON data",accept:{[mime]:[ext]}}]};
const cancelled=error=>error?.name==="AbortError"||/abort|cancel/i.test(String(error?.message||""));
async function sha256Bytes(bytes,cryptoImpl){if(!cryptoImpl?.subtle?.digest)throw new Error("AUTOTEST_SAVE_SHA256_UNAVAILABLE");return hex(await cryptoImpl.subtle.digest("SHA-256",bytes))}
function shareCapability(env=globalThis){const navigatorImpl=env?.navigator||env,FileImpl=env?.File||globalThis.File;if(typeof navigatorImpl?.share!=="function"||typeof navigatorImpl?.canShare!=="function"||typeof FileImpl!=="function")return false;try{const probe=new FileImpl([new Uint8Array([123,125])],"elyndra-autotest.json",{type:"application/json"});return navigatorImpl.canShare({files:[probe]})===true}catch{return false}}
export function autotestSaveCapability(env=globalThis){return {filePicker:typeof env?.showSaveFilePicker==="function",directoryPicker:typeof env?.showDirectoryPicker==="function",fileShare:shareCapability(env),secureContext:env?.isSecureContext!==false}}
export async function saveAutotestArtifactWithPicker(artifact,{showSaveFilePickerImpl=globalThis.showSaveFilePicker}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_SAVE_ARTIFACT_INVALID");
 if(typeof showSaveFilePickerImpl!=="function")return {status:"unsupported",method:"file-picker",filename:artifact.filename,bytes:artifactBytes(artifact)};
 let handle;
 try{handle=await showSaveFilePickerImpl({suggestedName:artifact.filename,types:pickerTypes(artifact),excludeAcceptAllOption:false})}
 catch(error){if(cancelled(error))return {status:"cancelled",method:"file-picker",filename:artifact.filename,bytes:artifactBytes(artifact)};throw error}
 const raw=encoder.encode(String(artifact.body||"")),writable=await handle.createWritable(),blob=new Blob([raw],{type:String(artifact.mime||"application/octet-stream")});
 try{await writable.write(blob);await writable.close()}catch(error){try{await writable.abort?.()}catch{}throw error}
 return {status:"saved",method:"file-picker",filename:handle.name||artifact.filename,bytes:blob.size}
}
export async function shareAutotestArtifact(artifact,{navigatorImpl=globalThis.navigator,FileImpl=globalThis.File,cryptoImpl=globalThis.crypto,nowImpl=Date.now}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_SHARE_ARTIFACT_INVALID");
 const filename=String(artifact.filename),mime=String(artifact.mime||"application/octet-stream"),raw=encoder.encode(String(artifact.body||""));
 if(typeof navigatorImpl?.share!=="function"||typeof navigatorImpl?.canShare!=="function"||typeof FileImpl!=="function")return {status:"unsupported",method:"web-share-file",filename,bytes:raw.byteLength,sha256:await sha256Bytes(raw,cryptoImpl)};
 const file=new FileImpl([raw],filename,{type:mime,lastModified:Number(typeof nowImpl==="function"?nowImpl():Date.now())||Date.now()});
 let supported=false;try{supported=navigatorImpl.canShare({files:[file]})===true}catch{}
 if(!supported)return {status:"unsupported",method:"web-share-file",filename,bytes:raw.byteLength,sha256:await sha256Bytes(raw,cryptoImpl)};
 const shaPromise=sha256Bytes(raw,cryptoImpl);let sharePromise;
 try{sharePromise=navigatorImpl.share({files:[file],title:`Elyndra AutoTest · ${filename}`})}
 catch(error){if(cancelled(error))return {status:"cancelled",method:"web-share-file",filename,bytes:raw.byteLength,sha256:await shaPromise};throw error}
 try{await sharePromise}catch(error){if(cancelled(error))return {status:"cancelled",method:"web-share-file",filename,bytes:raw.byteLength,sha256:await shaPromise};throw error}
 if(Number(file.size)!==raw.byteLength)throw new Error("AUTOTEST_SHARE_FILE_SIZE_MISMATCH");
 return {status:"shared",method:"web-share-file",filename:file.name||filename,bytes:Number(file.size)||raw.byteLength,sha256:await shaPromise}
}
export async function saveAutotestArtifactsToDirectory(artifacts,{showDirectoryPickerImpl=globalThis.showDirectoryPicker}={}){
 const rows=Object.values(artifacts||{}).filter(Boolean);
 if(!rows.length)throw new Error("AUTOTEST_SAVE_ARTIFACTS_EMPTY");
 if(typeof showDirectoryPickerImpl!=="function")return {status:"unsupported",method:"directory-picker",files:[]};
 let dir;
 try{dir=await showDirectoryPickerImpl({mode:"readwrite",id:"elyndra-autotest-export"})}
 catch(error){if(cancelled(error))return {status:"cancelled",method:"directory-picker",files:[]};throw error}
 const files=[];
 for(const artifact of rows){const handle=await dir.getFileHandle(artifact.filename,{create:true}),writable=await handle.createWritable(),raw=encoder.encode(String(artifact.body||"")),blob=new Blob([raw],{type:String(artifact.mime||"application/octet-stream")});try{await writable.write(blob);await writable.close()}catch(error){try{await writable.abort?.()}catch{}throw error}files.push({filename:handle.name||artifact.filename,bytes:blob.size})}
 return {status:"saved",method:"directory-picker",files}
}
