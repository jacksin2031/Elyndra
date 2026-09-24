const artifactBytes=artifact=>new Blob([String(artifact?.body||"")],{type:String(artifact?.mime||"application/octet-stream")}).size;
const extensionOf=filename=>{const m=String(filename||"").match(/(\.[A-Za-z0-9_-]+)$/);return m?m[1]:".json"};
const pickerTypes=artifact=>{const mime=String(artifact?.mime||"application/json").split(";")[0]||"application/json",ext=extensionOf(artifact?.filename);return [{description:ext===".elyndra"?"Elyndra world":"JSON data",accept:{[mime]:[ext]}}]};
const cancelled=error=>error?.name==="AbortError"||/abort|cancel/i.test(String(error?.message||""));
export function autotestSaveCapability(env=globalThis){return {filePicker:typeof env?.showSaveFilePicker==="function",directoryPicker:typeof env?.showDirectoryPicker==="function",secureContext:env?.isSecureContext!==false}}
export async function saveAutotestArtifactWithPicker(artifact,{showSaveFilePickerImpl=globalThis.showSaveFilePicker}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_SAVE_ARTIFACT_INVALID");
 if(typeof showSaveFilePickerImpl!=="function")return {status:"unsupported",method:"file-picker",filename:artifact.filename,bytes:artifactBytes(artifact)};
 let handle;
 try{
  const pickerPromise=showSaveFilePickerImpl({suggestedName:artifact.filename,types:pickerTypes(artifact),excludeAcceptAllOption:false});
  handle=await pickerPromise
 }catch(error){if(cancelled(error))return {status:"cancelled",method:"file-picker",filename:artifact.filename,bytes:artifactBytes(artifact)};throw error}
 const writable=await handle.createWritable(),blob=new Blob([String(artifact.body||"")],{type:String(artifact.mime||"application/octet-stream")});
 try{await writable.write(blob);await writable.close()}catch(error){try{await writable.abort?.()}catch{}throw error}
 return {status:"saved",method:"file-picker",filename:handle.name||artifact.filename,bytes:blob.size}
}
export async function saveAutotestArtifactsToDirectory(artifacts,{showDirectoryPickerImpl=globalThis.showDirectoryPicker}={}){
 const rows=Object.values(artifacts||{}).filter(Boolean);
 if(!rows.length)throw new Error("AUTOTEST_SAVE_ARTIFACTS_EMPTY");
 if(typeof showDirectoryPickerImpl!=="function")return {status:"unsupported",method:"directory-picker",files:[]};
 let dir;
 try{
  const pickerPromise=showDirectoryPickerImpl({mode:"readwrite",id:"elyndra-autotest-export"});
  dir=await pickerPromise
 }catch(error){if(cancelled(error))return {status:"cancelled",method:"directory-picker",files:[]};throw error}
 const files=[];
 for(const artifact of rows){const handle=await dir.getFileHandle(artifact.filename,{create:true}),writable=await handle.createWritable(),blob=new Blob([String(artifact.body||"")],{type:String(artifact.mime||"application/octet-stream")});try{await writable.write(blob);await writable.close()}catch(error){try{await writable.abort?.()}catch{}throw error}files.push({filename:handle.name||artifact.filename,bytes:blob.size})}
 return {status:"saved",method:"directory-picker",files}
}
