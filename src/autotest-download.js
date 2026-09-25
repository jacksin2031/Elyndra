const encoder=new TextEncoder();
const hex=buffer=>Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,"0")).join("");
async function sha256Bytes(bytes,cryptoImpl){if(!cryptoImpl?.subtle?.digest)throw new Error("AUTOTEST_DOWNLOAD_SHA256_UNAVAILABLE");return hex(await cryptoImpl.subtle.digest("SHA-256",bytes))}
export async function buildAutotestDownloadPayload(artifact,{cryptoImpl=globalThis.crypto}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_DOWNLOAD_ARTIFACT_INVALID");
 const body=String(artifact.body??""),filename=String(artifact.filename),mime=String(artifact.mime||"application/json;charset=utf-8"),raw=encoder.encode(body),sha256=await sha256Bytes(raw,cryptoImpl);
 return {schema:"elyndra-autotest-download-v1",filename,mime,body,chars:body.length,bytes:raw.length,sha256}
}
export function createAutotestDownloadLease(payload,{BlobImpl=globalThis.Blob,URLImpl=globalThis.URL}={}){
 if(typeof BlobImpl!=="function"||typeof URLImpl?.createObjectURL!=="function"||typeof URLImpl?.revokeObjectURL!=="function")throw new Error("AUTOTEST_DOWNLOAD_OBJECT_URL_UNAVAILABLE");
 const blob=new BlobImpl([String(payload?.body??"")],{type:String(payload?.mime||"application/octet-stream")});
 if(Number(blob.size)!==Number(payload?.bytes))throw new Error("AUTOTEST_DOWNLOAD_BLOB_SIZE_MISMATCH");
 const url=URLImpl.createObjectURL(blob);let active=true;
 return {url,filename:String(payload?.filename||""),bytes:Number(blob.size)||0,sha256:String(payload?.sha256||""),revoke(){if(!active)return;active=false;URLImpl.revokeObjectURL(url)}}
}
export async function verifyAutotestDownloadedFile(file,payload,{cryptoImpl=globalThis.crypto}={}){
 if(!file)throw new Error("AUTOTEST_DOWNLOAD_FILE_MISSING");
 const raw=new Uint8Array(await file.arrayBuffer()),actual=await sha256Bytes(raw,cryptoImpl),expected=String(payload?.sha256||""),filename=String(payload?.filename||"");
 return {ok:String(file.name||"")===filename&&Number(file.size)===Number(payload?.bytes)&&actual===expected,filename:String(file.name||""),expectedFilename:filename,bytes:Number(file.size)||0,expectedBytes:Number(payload?.bytes)||0,sha256:actual,expectedSha256:expected}
}
