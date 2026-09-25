import {roleplayFallbackSuggestions} from "./player-experience.js?v=57023";
import {playerVisibleLocationName} from "./player-location-visibility.js?v=57023";
const clean=(v,max=1200)=>String(v??"").normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").replace(/\uFFFD/g,"").trim().slice(0,max);
const SYSTEM_LINE=/^\s*(?:\[|【)\s*(?:世界動向|世界改變|世界開始記住你|系統|SYSTEM|WORLD\s*(?:EVENT|UPDATE)|DEBUG|STATE)\s*(?:\]|】)\s*[:：-]?\s*/i;
const ROLE_LINE=/^\s*(?:narrative|scene|assistant|system|敘事|旁白)\s*[:：]\s*/i;
const FOREIGN=/[\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff]/g;
const HAN=/[\u3400-\u9fff]/g;
const LATIN=/[A-Za-z]/g;
const SIMPLIFIED_MARKER=/[这转询问当视现节轻触锋锐属边缘测试温质闭仪监为从发确认记录状态细详标围环参见续验证获长设仅报断体统网络灵气区门进观点线导级结构开关与动无处应术觉话资对轮]/g;
const SAFE_TRADITIONAL_MAP=Object.freeze({"对":"對","轮":"輪"});
const ENGLISH_PROSE_MARKER=/\b(?:previously|before|after|toward|towards|through|around|where|there|follow|trace|check|inspect|investigate|search|find|look|wall|area|point|direction)\b/i;
export function normalizePlayerFacingLocale(value,max=1600){return clean(value,max).replace(/[对轮]/g,ch=>SAFE_TRADITIONAL_MAP[ch]||ch).replace(/\bpreviously\b/gi,"先前")}

export function stripSystemLabels(value,max=1200){
 let s=clean(value,max);
 s=s.replace(/^\`\`\`(?:json|text|markdown)?\s*/i,"").replace(/\`\`\`$/,"").trim();
 const lines=s.split(/\r?\n/).map(x=>x.replace(SYSTEM_LINE,"").replace(ROLE_LINE,"").trim()).filter(Boolean);
 return lines.join("\n").replace(SYSTEM_LINE,"").replace(ROLE_LINE,"").trim().slice(0,max)
}
export function isPlayerFacingLanguageSafe(value,{allowShortName=false}={}){
 const s=normalizePlayerFacingLocale(value,1600);if(!s)return false;
 const foreign=(s.match(FOREIGN)||[]).length;if(foreign>Math.max(1,Math.floor(s.length*.03)))return false;
 if((s.match(SIMPLIFIED_MARKER)||[]).length)return false;
 const han=(s.match(HAN)||[]).length,latin=(s.match(LATIN)||[]).length;
 if(han>=2&&ENGLISH_PROSE_MARKER.test(s))return false;
 if(allowShortName&&s.length<=24)return foreign===0;
 if(s.length>=24&&han<4&&latin>12)return false;
 if(latin>Math.max(30,han*1.2))return false;
 return true
}
export function sanitizePlayerText(value,max=1200,fallback=""){
 const s=normalizePlayerFacingLocale(stripSystemLabels(value,max),max);
 return s&&isPlayerFacingLanguageSafe(s)?s:normalizePlayerFacingLocale(fallback,max)
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
 const label=clean(action,100)||"這次嘗試";
 if(roll?.grade==="CRITICAL_SUCCESS")return `這次「${label}」明確奏效。後續只依眼前實際出現的變化判斷，不額外補寫未確認資訊。`;
 if(roll?.grade==="CRITICAL_FAILURE")return `這次「${label}」不但沒有奏效，現場還出現了可觀察的負面後果；下一步應以眼前實際變化為準。`;
 if(roll?.success)return `這次「${label}」奏效。若現場沒有新的可觀察變化，就不額外推斷資訊、信任或任務進展。`;
 return `這次「${label}」沒有奏效。現場不會因此憑空出現新線索；你仍可從眼前可見的人、物或路徑改換做法。`
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
 const s=normalizePlayerFacingLocale(value,120).replace(/[\r\n\t]/g," ").replace(/[{}\[\]\"\\]/g,"").replace(/\s+/g," ").trim();
 if(!s||!isPlayerFacingLanguageSafe(s,{allowShortName:true}))return "";
 return s
}

export function deriveSceneTitle(state={},action=""){
 if(state.combat?.active&&state.combat.enemy?.name)return `應對${sanitizePlayerText(state.combat.enemy.name,32,"眼前敵人")}`;
 const objective=sanitizePlayerText(state.quests?.main?.objectives?.[0],60,"").replace(/[。！？!?]+$/,"").trim();
 if(objective)return objective;
 const crisis=state.world?.state?.crisis?.stage,loc=sanitizeLocationName(playerVisibleLocationName(state))||"目前地點";
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
