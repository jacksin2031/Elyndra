const encoder=new TextEncoder();
const hex=buffer=>Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,"0")).join("");
const clampChunk=value=>Math.max(16384,Math.min(262144,Math.round(Number(value)||131072)));
async function sha256Text(value,cryptoImpl=globalThis.crypto){if(!cryptoImpl?.subtle?.digest)throw new Error("AUTOTEST_CODEX_SHA256_UNAVAILABLE");return hex(await cryptoImpl.subtle.digest("SHA-256",encoder.encode(String(value??""))))}
function splitText(value,chunkChars){const text=String(value??""),out=[];let at=0;while(at<text.length){let end=Math.min(text.length,at+chunkChars);if(end<text.length){const a=text.charCodeAt(end-1),b=text.charCodeAt(end);if(a>=0xD800&&a<=0xDBFF&&b>=0xDC00&&b<=0xDFFF)end--}if(end<=at)end=Math.min(text.length,at+chunkChars);out.push(text.slice(at,end));at=end}return out}
export async function buildAutotestCodexTransfer(artifact,{chunkChars=131072,cryptoImpl=globalThis.crypto}={}){
 if(!artifact?.filename)throw new Error("AUTOTEST_CODEX_ARTIFACT_INVALID");
 const body=String(artifact.body??""),limit=clampChunk(chunkChars),parts=splitText(body,limit),chunks=[];
 for(let i=0;i<parts.length;i++){const text=parts[i];chunks.push({index:i+1,total:parts.length,text,chars:text.length,bytes:encoder.encode(text).length,sha256:await sha256Text(text,cryptoImpl)})}
 return {schema:"elyndra-autotest-codex-transfer-v1",filename:String(artifact.filename),mime:String(artifact.mime||"application/json;charset=utf-8"),encoding:"utf-8-raw-concat",chars:body.length,bytes:encoder.encode(body).length,sha256:await sha256Text(body,cryptoImpl),chunkChars:limit,totalChunks:chunks.length,chunks}
}
export function codexTransferManifest(transfer={}){return {schema:String(transfer.schema||"elyndra-autotest-codex-transfer-v1"),filename:String(transfer.filename||""),mime:String(transfer.mime||""),encoding:String(transfer.encoding||"utf-8-raw-concat"),chars:Number(transfer.chars)||0,bytes:Number(transfer.bytes)||0,sha256:String(transfer.sha256||""),chunkChars:Number(transfer.chunkChars)||0,totalChunks:Number(transfer.totalChunks)||0,chunks:(Array.isArray(transfer.chunks)?transfer.chunks:[]).map(x=>({index:Number(x.index)||0,chars:Number(x.chars)||0,bytes:Number(x.bytes)||0,sha256:String(x.sha256||"")}))}}
export function reconstructAutotestCodexTransfer(transfer={}){return (Array.isArray(transfer.chunks)?transfer.chunks:[]).slice().sort((a,b)=>Number(a.index)-Number(b.index)).map(x=>String(x.text??"")).join("")}
export async function verifyAutotestCodexText(transfer,text,{cryptoImpl=globalThis.crypto}={}){const body=String(text??""),actual=await sha256Text(body,cryptoImpl);return {ok:actual===String(transfer?.sha256||"")&&encoder.encode(body).length===Number(transfer?.bytes||0),sha256:actual,expectedSha256:String(transfer?.sha256||""),bytes:encoder.encode(body).length,expectedBytes:Number(transfer?.bytes)||0}}
export function installAutotestCodexBridge(artifactProvider,{globalImpl=globalThis,cryptoImpl=globalThis.crypto,chunkChars=131072}={}){
 if(typeof artifactProvider!=="function")throw new Error("AUTOTEST_CODEX_PROVIDER_REQUIRED");
 const cache=new Map();
 const load=async kind=>{const artifact=await artifactProvider(String(kind||""));if(!artifact?.filename)throw new Error(`AUTOTEST_CODEX_ARTIFACT_NOT_READY:${kind}`);const key=[kind,artifact.filename,String(artifact.body??"").length].join(":");if(cache.get(kind)?.key===key)return cache.get(kind).transfer;const transfer=await buildAutotestCodexTransfer(artifact,{chunkChars,cryptoImpl});cache.set(kind,{key,transfer});return transfer};
 const api={
  schema:"elyndra-autotest-codex-bridge-v1",
  instructions:"Call manifest(kind), then read(kind,index) for 1..totalChunks, concatenate text with no separator, write exact UTF-8 bytes, and verify the local SHA-256 against manifest.sha256.",
  async manifest(kind){return codexTransferManifest(await load(kind))},
  async read(kind,index){const transfer=await load(kind),i=Math.max(1,Math.min(transfer.totalChunks,Math.floor(Number(index)||1))),chunk=transfer.chunks[i-1];return {...chunk,text:String(chunk?.text??""),filename:transfer.filename,fullSha256:transfer.sha256,fullBytes:transfer.bytes}},
  async readAll(kind){const transfer=await load(kind);return {filename:transfer.filename,mime:transfer.mime,encoding:transfer.encoding,bytes:transfer.bytes,sha256:transfer.sha256,text:reconstructAutotestCodexTransfer(transfer)}},
  async verifyText(kind,text){return verifyAutotestCodexText(await load(kind),text,{cryptoImpl})},
  clear(){cache.clear();return true}
 };
 globalImpl.__ELYNDRA_AUTOTEST_CODEX__=api;return api
}
