const uid=p=>p+"-"+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
const clean=(v,max=1200)=>typeof v==="string"?v.trim().slice(0,max):"";
export function ensureNotes(state){state.notes=Array.isArray(state.notes)?state.notes:[];return state.notes}
export function addNote(state,{title="",text=""}={}){
 ensureNotes(state);const body=clean(text,2000),name=clean(title,120)||"旅途筆記";if(!body)return {ok:false,reason:"NOTE_EMPTY"};
 const note={id:uid("NOTE"),title:name,text:body,createdAt:Date.now(),updatedAt:Date.now(),day:state.world?.state?.day||1,location:String(state.player?.location||"")};state.notes.push(note);state.notes=state.notes.slice(-200);return {ok:true,note}
}
export function updateNote(state,id,{title,text}={}){
 const n=ensureNotes(state).find(x=>x.id===id);if(!n)return {ok:false,reason:"NOTE_NOT_FOUND"};const body=clean(text??n.text,2000),name=clean(title??n.title,120);if(!body)return {ok:false,reason:"NOTE_EMPTY"};n.title=name||"旅途筆記";n.text=body;n.updatedAt=Date.now();return {ok:true,note:n}
}
export function deleteNote(state,id){const notes=ensureNotes(state),i=notes.findIndex(x=>x.id===id);if(i<0)return false;notes.splice(i,1);return true}
export function notesSnapshot(state){return ensureNotes(state).slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(x=>({...x}))}
