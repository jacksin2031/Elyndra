import {roleplayFallbackSuggestions} from "./player-experience.js?v=54018";
const clean=(v,max=1200)=>String(v??"").normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").replace(/\uFFFD/g,"").trim().slice(0,max);
const SYSTEM_LINE=/^\s*(?:\[|【)\s*(?:世界動向|世界改變|世界開始記住你|系統|SYSTEM|WORLD\s*(?:EVENT|UPDATE)|DEBUG|STATE)\s*(?:\]|】)\s*[:：-]?\s*/i;
const ROLE_LINE=/^\s*(?:narrative|scene|assistant|system|敘事|旁白)\s*[:：]\s*/i;
const FOREIGN=/[\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff]/g;
const HAN=/[\u3400-\u9fff]/g;
const LATIN=/[A-Za-z]/g;

export function stripSystemLabels(value,max=1200){
 let s=clean(value,max);
 s=s.replace(/^\`\`\`(?:json|text|markdown)?\s*/i,"").replace(/\`\`\`$/,"").trim();
 const lines=s.split(/\r?\n/).map(x=>x.replace(SYSTEM_LINE,"").replace(ROLE_LINE,"").trim()).filter(Boolean);
 return lines.join("\n").replace(SYSTEM_LINE,"").replace(ROLE_LINE,"").trim().slice(0,max)
}
export function isPlayerFacingLanguageSafe(value,{allowShortName=false}={}){
 const s=clean(value,1600);if(!s)return false;
 const foreign=(s.match(FOREIGN)||[]).length;if(foreign>Math.max(1,Math.floor(s.length*.03)))return false;
 const han=(s.match(HAN)||[]).length,latin=(s.match(LATIN)||[]).length;
 if(allowShortName&&s.length<=24)return foreign===0;
 if(s.length>=24&&han<4&&latin>12)return false;
 if(latin>Math.max(30,han*1.2))return false;
 return true
}
export function sanitizePlayerText(value,max=1200,fallback=""){
 const s=stripSystemLabels(value,max);
 return s&&isPlayerFacingLanguageSafe(s)?s:clean(fallback,max)
}
export function sanitizeSuggestion(value,max=120){
 const s=sanitizePlayerText(value,max,"").replace(/^[\-•·\d.)、\s]+/,"").trim();
 return s.length>=2?s:""
}
export function sanitizeSuggestions(input,previous=[]){
 const out=[];for(const raw of Array.isArray(input)?input:[]){const s=sanitizeSuggestion(raw);if(s&&!out.includes(s))out.push(s);if(out.length>=4)break}
 const before=(Array.isArray(previous)?previous:[]).map(x=>sanitizeSuggestion(x)).filter(Boolean);
 const same=out.length===before.length&&out.length>0&&out.every((x,i)=>x===before[i]);
 return same?[]:out
}
export function fallbackNarrative(action="",roll={}){
 const label=clean(action,100)||"這次行動";
 if(roll?.grade==="CRITICAL_SUCCESS")return `「${label}」取得了非常明確的成果，眼前局勢亦因此出現新的可利用變化。`;
 if(roll?.grade==="CRITICAL_FAILURE")return `「${label}」沒有達成目的，而且局勢因此向前惡化：你暴露了自己的意圖、位置或弱點，但同時也看清了原本無法確認的限制。`;
 if(roll?.success)return `「${label}」取得了可確認的進展。你可以根據眼前的新變化繼續行動。`;
 return `「${label}」沒有達成預期目的，但失敗已經令一項限制、代價或對方的底線變得清楚；局面不是回到原點，而是出現了新的處理方向。`
}
export function fallbackSuggestions(state={},context={}){
 if(state.combat?.active)return ["攻擊","防禦","撤退"];
 const contextual=roleplayFallbackSuggestions(state,context).map(x=>sanitizeSuggestion(x)).filter(Boolean);
 if(contextual.length>=3)return contextual.slice(0,4);
 const pool=["檢查地面與附近物件上最新留下的痕跡","找一個正在避開人群的人，問他剛才看見了甚麼","沿著最明顯的新鮮痕跡走一小段，確認它通往哪裡","找一個能看見出入口的位置，觀察誰正在離開","挑一個眼前最不尋常的細節，靠近確認它的來源"];
 const previous=(state.suggestions||[]).map(x=>sanitizeSuggestion(x)).filter(Boolean),seed=Math.abs(Number(state.world?.state?.clock?.totalMinutes)||0)+(String(context.action||"").length||0);
 const out=[...contextual];for(let i=0;i<pool.length*2&&out.length<4;i++){const x=pool[(seed+i)%pool.length];if(!previous.includes(x)&&!out.includes(x))out.push(x)}
 return out.slice(0,4)
}
export function sanitizeLocationName(value){
 const s=clean(value,120).replace(/[\r\n\t]/g," ").replace(/[{}\[\]\"\\]/g,"").replace(/\s+/g," ").trim();
 if(!s||!isPlayerFacingLanguageSafe(s,{allowShortName:true}))return "";
 return s
}

export function deriveSceneTitle(state={},action=""){
 if(state.combat?.active&&state.combat.enemy?.name)return `應對${sanitizePlayerText(state.combat.enemy.name,32,"眼前敵人")}`;
 const objective=sanitizePlayerText(state.quests?.main?.objectives?.[0],60,"").replace(/[。！？!?]+$/,"").trim();
 if(objective)return objective;
 const crisis=state.world?.state?.crisis?.stage,loc=sanitizeLocationName(state.player?.location||state.world?.state?.location)||"目前地點";
 if(crisis==="ENDGAME")return `處理${loc}的最後危機`.slice(0,60);
 if(crisis==="CRISIS")return `調查${loc}正在逼近的危機`.slice(0,60);
 const a=sanitizeSuggestion(action,40);if(a)return a;
 return `探索${loc}`.slice(0,60)
}
export function sanitizeSceneTitle(value,state={},action=""){
 if(state.combat?.active)return deriveSceneTitle(state,action);
 const s=sanitizePlayerText(value,60,"").replace(/[。！？!?]+$/,"").trim();
 return s||deriveSceneTitle(state,action)
}
