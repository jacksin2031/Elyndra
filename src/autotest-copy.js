const chars=value=>String(value??"").length;
export async function copyAutotestText(value,{clipboard=globalThis.navigator?.clipboard,documentRef=globalThis.document}={}){
 const text=String(value??"");if(!text)return {status:"empty",method:"none",chars:0};
 let clipboardError=null;
 if(typeof clipboard?.writeText==="function"){
  try{await clipboard.writeText(text);return {status:"copied",method:"clipboard",chars:chars(text)}}catch(error){clipboardError=error}
 }
 if(documentRef?.body&&typeof documentRef.createElement==="function"&&typeof documentRef.execCommand==="function"){
  const area=documentRef.createElement("textarea");area.value=text;area.setAttribute?.("readonly","");area.style.position="fixed";area.style.opacity="0";area.style.pointerEvents="none";area.style.left="-9999px";documentRef.body.appendChild(area);
  try{area.focus?.();area.select?.();area.setSelectionRange?.(0,text.length);const ok=documentRef.execCommand("copy");if(ok)return {status:"copied",method:"selection-fallback",chars:chars(text),clipboardError:clipboardError?.message||null}}
  finally{area.remove?.()}
 }
 return {status:"unsupported",method:"none",chars:chars(text),clipboardError:clipboardError?.message||null}
}
