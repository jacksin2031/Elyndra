from pathlib import Path
import re

path=Path('app.js')
s=path.read_text(encoding='utf-8')

def one(old,new,label):
    global s
    count=s.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    s=s.replace(old,new,1)

locale_import='import {SUPPORTED_LOCALES,loadLocale,saveLocale,normalizeLocale,uiText,uiFormat,applyDocumentLocale,ensureWorldLocale,translatedText,missingVisibleTranslations,applyTranslationBundle,applyWorldLocaleToDocument,applySessionTranslationBundle,applySessionLocaleToDocument,documentTranslationCandidates} from "./src/locale-runtime.js?v=59003";'
if 'from "./src/v0594-static-i18n.js?v=59004"' not in s:
    one(locale_import,locale_import+'\nimport {localizedStaticText} from "./src/v0594-static-i18n.js?v=59004";','static i18n import')

anchor='let activeLocale=saveLocale(loadLocale()),localeTransitionBusy=false;globalThis.ELYNDRA_LOCALE=activeLocale;const lt=value=>gameState?translatedText(gameState,value,activeLocale):String(value??"");'
if 'const ALL_RULE_TAGS="__all__"' not in s:
    helper=anchor+'\nconst ALL_RULE_TAGS="__all__";\nconst staticText=value=>localizedStaticText(value,activeLocale);\nconst ruleCategoryText=value=>value===ALL_RULE_TAGS?(activeLocale==="en"?"All":activeLocale==="ja"?"すべて":"全部"):localizedStaticText(value,activeLocale);\nconst ruleTagCountText=count=>activeLocale==="en"?`${count} tags`:activeLocale==="ja"?`${count}件のタグ`:activeLocale==="zh-Hans"?`${count} 个标签`:`${count} 個標籤`;'
    one(anchor,helper,'locale helper')

start=s.index('function renderSelectedRuleTags(){')
end=s.index('function syncDegreeOutputs(){',start)
new_block='''function renderSelectedRuleTags(){
 for(const target of ["required","allowed","forbidden"]){
  const box=creatorField(target+"TagCloud");if(!box)continue;
  box.innerHTML=ruleValues[target].map(tag=>{const label=localizedStaticText(tag,activeLocale);return `<span class="world-tag selected-${target}">${esc(label)}<button type="button" data-remove-rule-tag="${target}" data-tag="${esc(tag)}" aria-label="${esc(staticText("移除"))} ${esc(label)}">×</button></span>`}).join("")||`<span class="muted">${esc(staticText("尚未加入標籤"))}</span>`
 }
 qsa("[data-remove-rule-tag]").forEach(b=>b.onclick=()=>{const t=b.dataset.removeRuleTag,tag=b.dataset.tag;ruleValues[t]=ruleValues[t].filter(x=>x!==tag);syncRuleHidden();renderRuleTagBuilder();renderCreatorReview()})
}
function addRuleTag(target,raw){
 const tag=cleanRuleTag(raw);if(!tag||!ruleValues[target])return;
 for(const key of Object.keys(ruleValues))ruleValues[key]=ruleValues[key].filter(x=>x!==tag);
 ruleValues[target].push(tag);syncRuleHidden();renderRuleTagBuilder();renderCreatorReview()
}
function renderRuleTagPresets(){
 const box=creatorField("ruleTagPresets"),category=creatorField("ruleTagCategory")?.value||ALL_RULE_TAGS,query=String(creatorField("ruleTagSearch")?.value||"").trim().toLowerCase();if(!box)return;
 const entries=Object.entries(RULE_TAG_LIBRARY).filter(([name])=>category===ALL_RULE_TAGS||name===category).flatMap(([,tags])=>tags),unique=[...new Set(entries)].filter(tag=>{if(!query)return true;const localized=localizedStaticText(tag,activeLocale).toLowerCase();return tag.toLowerCase().includes(query)||localized.includes(query)});
 box.innerHTML=unique.map(tag=>{const owner=Object.keys(ruleValues).find(k=>ruleValues[k].includes(tag)),label=localizedStaticText(tag,activeLocale);return `<button type="button" class="world-tag ${owner?"selected-"+owner:""}" data-preset-rule-tag="${esc(tag)}">${esc(label)}</button>`}).join("")||`<span class="muted">${esc(staticText("沒有符合的預設標籤"))}</span>`;
 const count=creatorField("ruleTagCount");if(count)count.textContent=ruleTagCountText(unique.length);
 qsa("[data-preset-rule-tag]").forEach(b=>b.onclick=()=>addRuleTag(activeRuleTarget,b.dataset.presetRuleTag))
}
function renderRuleTagBuilder(){renderSelectedRuleTags();renderRuleTagPresets();qsa("[data-rule-target]").forEach(b=>b.classList.toggle("active",b.dataset.ruleTarget===activeRuleTarget));qsa("[data-rule-bucket]").forEach(b=>b.classList.toggle("active",b.dataset.ruleBucket===activeRuleTarget))}
function initRuleTagBuilder(){
 const category=creatorField("ruleTagCategory");if(category){const current=category.value||ALL_RULE_TAGS;category.innerHTML=[{value:ALL_RULE_TAGS,label:ALL_RULE_TAGS},...Object.keys(RULE_TAG_LIBRARY).map(value=>({value,label:value}))].map(({value,label})=>`<option value="${esc(value)}">${esc(ruleCategoryText(label))}</option>`).join("");category.value=[ALL_RULE_TAGS,...Object.keys(RULE_TAG_LIBRARY)].includes(current)?current:ALL_RULE_TAGS;category.onchange=renderRuleTagPresets}
 creatorField("ruleTagSearch")?.addEventListener("input",renderRuleTagPresets);
 qsa("[data-rule-target]").forEach(b=>b.onclick=()=>{activeRuleTarget=b.dataset.ruleTarget;renderRuleTagBuilder()});
 qsa("[data-rule-bucket]").forEach(b=>b.onclick=e=>{if(e.target.closest("button,input"))return;activeRuleTarget=b.dataset.ruleBucket;renderRuleTagBuilder()});
 qsa("[data-add-custom-tag]").forEach(b=>b.onclick=()=>{const target=b.dataset.addCustomTag,input=creatorField(target+"TagInput");addRuleTag(target,input?.value);if(input)input.value=""});
 for(const target of ["required","allowed","forbidden"])creatorField(target+"TagInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addRuleTag(target,e.currentTarget.value);e.currentTarget.value=""}});
 renderRuleTagBuilder()
}
'''
s=s[:start]+new_block+s[end:]

old_nav='$("#newWorldBtn").onclick=()=>show("creator");$("#continueBtn").onclick=async()=>{replaceGameState(migrate(await loadWorld()),"CONTINUE_AUTOSAVE");if(!gameState)return;const report=validateWorld(gameState.world);if(!report.valid)return alert(uiFormat("validationFailed",{error:report.errors.join(", ")},activeLocale));aiStatus=await aiHealth();const ready=await refresh();if(!ready)return alert(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));show("game");scheduleWorldQualityCritic("continue_world",1200);scheduleHistoryDeepening("continue_world",1500)};qsa("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));\nconst languageSelect=$("#languageSelect");if(languageSelect){languageSelect.value=activeLocale;languageSelect.onchange=async()=>{const previous=activeLocale,next=normalizeLocale(languageSelect.value);if(next===previous)return;activeLocale=saveLocale(next);applyDocumentLocale(activeLocale);helperHistory=[];npcChatHistory.clear();closeModal();recordDebug("LOCALE_SWITCH_REQUESTED",{from:previous,to:next,worldId:gameState?.world?.id||null});if(!gameState){applyDocumentLocale(activeLocale);return}aiStatus=await aiHealth();const ready=await ensureGameplayLocale("language_switch");if(!ready){activeLocale=saveLocale(previous);languageSelect.value=previous;applyDocumentLocale(previous);await refresh({skipLocale:true});alert(uiText("需要 AI 才能把目前世界切換到所選語言。",previous));return}await saveWorld(gameState);await refresh({skipLocale:true});recordDebug("LOCALE_SWITCH_APPLIED",{from:previous,to:next})}}'
new_nav='$("#newWorldBtn").onclick=()=>{renderRuleTagBuilder();show("creator")};$("#continueBtn").onclick=async()=>{replaceGameState(migrate(await loadWorld()),"CONTINUE_AUTOSAVE");if(!gameState)return;const report=validateWorld(gameState.world);if(!report.valid)return alert(uiFormat("validationFailed",{error:report.errors.join(", ")},activeLocale));aiStatus=await aiHealth();const ready=await refresh();if(!ready)return alert(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));const gameLocaleReady=activeLocale==="zh-Hant"||await ensureRenderedLocale("continue_game",$("#game"));if(!gameLocaleReady)return alert(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));show("game");scheduleWorldQualityCritic("continue_world",1200);scheduleHistoryDeepening("continue_world",1500)};qsa("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));\nconst languageSelect=$("#languageSelect");if(languageSelect){languageSelect.value=activeLocale;languageSelect.onchange=async()=>{const previous=activeLocale,next=normalizeLocale(languageSelect.value);if(next===previous)return;activeLocale=saveLocale(next);applyDocumentLocale(activeLocale);if(document.body.dataset.screen==="creator"){initRuleTagBuilder();renderCreatorReview()}helperHistory=[];npcChatHistory.clear();closeModal();recordDebug("LOCALE_SWITCH_REQUESTED",{from:previous,to:next,worldId:gameState?.world?.id||null});if(!gameState){applyDocumentLocale(activeLocale);return}aiStatus=await aiHealth();const ready=await ensureGameplayLocale("language_switch");if(!ready){activeLocale=saveLocale(previous);languageSelect.value=previous;applyDocumentLocale(previous);if(document.body.dataset.screen==="creator"){initRuleTagBuilder();renderCreatorReview()}await refresh({skipLocale:true});alert(uiText("需要 AI 才能把目前世界切換到所選語言。",previous));return}await saveWorld(gameState);await refresh({skipLocale:true});recordDebug("LOCALE_SWITCH_APPLIED",{from:previous,to:next})}}'
one(old_nav,new_nav,'new/continue/language handlers')

old_post='await persist();worldProgress(98,"正在準備冒險介面","載入第一個場景");await refresh();worldProgress(100,"準備完成","正在穿越…");await new Promise(r=>setTimeout(r,250));show("game");scheduleWorldQualityCritic("post_creation",1000);scheduleHistoryDeepening("post_creation",1500)'
new_post='await persist();worldProgress(98,"正在準備冒險介面","載入第一個場景");const refreshed=await refresh();if(!refreshed)throw new Error(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));const gameLocaleReady=activeLocale==="zh-Hant"||await ensureRenderedLocale("post_creation_game",$("#game"));if(!gameLocaleReady)throw new Error(uiText("需要 AI 才能把目前世界切換到所選語言。",activeLocale));worldProgress(100,"準備完成","正在穿越…");await new Promise(r=>setTimeout(r,250));show("game");scheduleWorldQualityCritic("post_creation",1000);scheduleHistoryDeepening("post_creation",1500)'
one(old_post,new_post,'post creation locale gate')

one('setPlayerActionControlsLocked(true,"正在處理已選行動…");return','setPlayerActionControlsLocked(true,uiText("正在處理已選行動…",activeLocale));return','pending action lock')
old_combat='if(gameState?.combat?.active){box.innerHTML=\'<div class="action-group main-actions"><div class="action-group-title">戰鬥行動</div><div class="action-grid"><button type="button" data-combat-action="attack">攻擊</button><button type="button" data-combat-action="defend">防禦</button><button type="button" data-combat-action="retreat">撤退</button></div></div>\';'
new_combat='if(gameState?.combat?.active){box.innerHTML=`<div class="action-group main-actions"><div class="action-group-title">${esc(localizedStaticText("戰鬥行動",activeLocale))}</div><div class="action-grid"><button type="button" data-combat-action="attack">${esc(localizedStaticText("攻擊",activeLocale))}</button><button type="button" data-combat-action="defend">${esc(localizedStaticText("防禦",activeLocale))}</button><button type="button" data-combat-action="retreat">${esc(localizedStaticText("撤退",activeLocale))}</button></div></div>`;'
one(old_combat,new_combat,'combat buttons')
one('esc(lt(p.label))','esc(localizedStaticText(lt(p.label),activeLocale))','suggestion label')
one('esc(lt(p.meta))','esc(localizedStaticText(lt(p.meta),activeLocale))','suggestion meta')
one('esc(lt(p.approach))','esc(localizedStaticText(lt(p.approach),activeLocale))','suggestion approach')

# Always normalize creator tags after opening the creator via generic navigation too.
s=s.replace('qsa("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));','qsa("[data-go]").forEach(b=>b.onclick=()=>{if(b.dataset.go==="creator")renderRuleTagBuilder();show(b.dataset.go)});',1)

path.write_text(s,encoding='utf-8')
print('v0.59.4 creator/locale patch applied')
