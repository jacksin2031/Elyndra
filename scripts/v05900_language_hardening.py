from pathlib import Path


def patch(path, old, new, count=1):
    p=Path(path); text=p.read_text(encoding='utf-8'); found=text.count(old)
    if found < count: raise SystemExit(f'{path}: expected >= {count} matches, found {found}: {old[:100]!r}')
    p.write_text(text.replace(old,new,count),encoding='utf-8')

def append_ui_entries():
    p=Path('src/locale-runtime.js'); text=p.read_text(encoding='utf-8')
    anchor=' "完全隨機":row("完全隨機","完全随机","Fully Random","完全ランダム")\n};'
    if anchor not in text: raise SystemExit('locale UI tail anchor missing')
    entries=''' "完全隨機":row("完全隨機","完全随机","Fully Random","完全ランダム"),
 "AI 正在思考…":row("AI 正在思考…","AI 正在思考…","AI is thinking…","AIが思考中…"),
 "AI 正在處理你的行動…":row("AI 正在處理你的行動…","AI 正在处理你的行动…","AI is processing your action…","AIが行動を処理中…"),
 "STATE SYNC：完成後即可繼續行動":row("STATE SYNC：完成後即可繼續行動","STATE SYNC：完成后即可继续行动","STATE SYNC: actions resume when synchronization finishes","STATE SYNC：同期完了後に行動できます"),
 "正在處理已選行動…":row("正在處理已選行動…","正在处理已选行动…","Processing selected action…","選択した行動を処理中…"),
 "AI 回應較慢，必要時會自動切換 Engine 備援":row("AI 回應較慢，必要時會自動切換 Engine 備援","AI 响应较慢，必要时会自动切换 Engine 备用","AI is responding slowly; Engine fallback will be used if needed","AIの応答が遅いため、必要ならEngineフォールバックへ切り替えます"),
 "仍在等待 AI 回應":row("仍在等待 AI 回應","仍在等待 AI 响应","Still waiting for AI","AIの応答を待っています"),
 "對方正在回應……":row("對方正在回應……","对方正在回应……","They are responding…","相手が応答中…"),
 "對方正等待你開口。":row("對方正等待你開口。","对方正在等你开口。","They are waiting for you to speak.","相手はあなたが話すのを待っています。"),
 "送出":row("送出","发送","Send","送信"),
 "人物":row("人物","人物","Person","人物"),
 "遠距":row("遠距","远程","Remote","遠隔"),
 "就在附近":row("就在附近","就在附近","Nearby","すぐ近く"),
 "你從這段對話中確認到可推進任務的新線索。":row("你從這段對話中確認到可推進任務的新線索。","你从这段对话中确认了可推进任务的新线索。","You confirmed a new clue that can advance the quest.","この会話から任務を進められる新しい手掛かりを確認した。"),
 "戰鬥局勢發生了變化。":row("戰鬥局勢發生了變化。","战斗局势发生了变化。","The battle situation has changed.","戦況が変化した。"),
 "戰鬥結束":row("戰鬥結束","战斗结束","Battle ended","戦闘終了"),
 "能力":row("能力","能力","Ability","能力"),
 "技能":row("技能","技能","Skill","技能"),
 "裝備":row("裝備","装备","Equipment","装備"),
 "夥伴":row("夥伴","伙伴","Companion","仲間"),
 "關係修正":row("關係修正","关系修正","Relationship","関係補正"),
 "情境":row("情境","情境","Situation","状況"),
 "天氣":row("天氣","天气","Weather","天候"),
 "信任":row("信任","信任","Trust","信頼"),
 "尊重":row("尊重","尊重","Respect","尊敬"),
 "畏懼":row("畏懼","畏惧","Fear","畏怖"),
 "義務":row("義務","义务","Obligation","義務"),
 "難度":row("難度","难度","Difficulty","難易度"),
 "互動後":row("互動後","互动后","After interaction","交流後"),
 "技能提升至":row("技能提升至","技能提升至","Skill increased to","技能上昇"),
 "AI 場景內容與目前地點／人物狀態不一致；已保留 Engine 結果並重新建立當前場景建議。":row("AI 場景內容與目前地點／人物狀態不一致；已保留 Engine 結果並重新建立當前場景建議。","AI 场景内容与当前地点／人物状态不一致；已保留 Engine 结果并重新建立当前场景建议。","AI scene content conflicted with the current location or character state; the Engine result was kept and current suggestions were rebuilt.","AIの場面内容が現在地／人物状態と一致しないため、Engine結果を保持して現在の提案を再構築しました。"),
 "AI 行動判定暫時不可用；已切換 Engine 備援並繼續本回合。":row("AI 行動判定暫時不可用；已切換 Engine 備援並繼續本回合。","AI 行动判定暂时不可用；已切换 Engine 备用并继续本回合。","AI action assessment is temporarily unavailable; Engine fallback is continuing this turn.","AIの行動判定が一時的に利用できないため、Engineフォールバックでこのターンを続行します。"),
 "AI 世界狀態同步暫時失敗；已保留 Engine 結果並恢復控制。":row("AI 世界狀態同步暫時失敗；已保留 Engine 結果並恢復控制。","AI 世界状态同步暂时失败；已保留 Engine 结果并恢复控制。","AI world-state synchronization temporarily failed; the Engine result was kept and control was restored.","AIの世界状態同期が一時的に失敗したため、Engine結果を保持して操作を復帰しました。"),
 "AI 場景敘述未完成；已保留 Engine 的可見結果。":row("AI 場景敘述未完成；已保留 Engine 的可見結果。","AI 场景叙述未完成；已保留 Engine 的可见结果。","AI scene narration did not finish; the visible Engine result was kept.","AIの場面描写が完了しなかったため、Engineの可視結果を保持しました。"),
 "選單":row("選單","菜单","Menu","メニュー"),
 "旅程設定":row("旅程設定","旅程设置","Journey Settings","旅の設定"),
 "一般冒險期間把系統設定收起，避免打斷場景。":row("一般冒險期間把系統設定收起，避免打斷場景。","普通冒险期间收起系统设置，避免打断场景。","System settings stay tucked away during normal play so they do not interrupt the scene.","通常の冒険中は場面を妨げないようシステム設定をまとめています。"),
 "開發者 · AI 自動測試":row("開發者 · AI 自動測試","开发者 · AI 自动测试","Developer · AI Autotest","開発者 · AI自動テスト"),
 "世界留下的痕跡":row("世界留下的痕跡","世界留下的痕迹","World Traces","世界に残した痕跡"),
 "準備完成":row("準備完成","准备完成","Ready","準備完了"),
 "正在穿越…":row("正在穿越…","正在穿越…","Crossing over…","転移中…"),
 "世界生成完成":row("世界生成完成","世界生成完成","World generation complete","世界生成完了"),
 "世界已編譯完成；請先確認世界契約，再決定是否穿越。":row("世界已編譯完成；請先確認世界契約，再決定是否穿越。","世界已编译完成；请先确认世界契约，再决定是否穿越。","World compilation is complete. Review the world contract before crossing over.","世界のコンパイルが完了しました。転移する前に世界契約を確認してください。"),
 "已返回修改":row("已返回修改","已返回修改","Returned to editing","編集に戻りました"),
 "這次編譯結果尚未建立正式存檔；修改設定後可重新生成。":row("這次編譯結果尚未建立正式存檔；修改設定後可重新生成。","本次编译结果尚未建立正式存档；修改设置后可重新生成。","This compilation has not created a permanent save. Adjust the settings and generate again.","今回のコンパイル結果は正式保存されていません。設定を変更して再生成できます。"),
 "正在建立正式存檔":row("正在建立正式存檔","正在建立正式存档","Creating permanent save","正式セーブを作成中"),
 "正在準備冒險介面":row("正在準備冒險介面","正在准备冒险界面","Preparing adventure interface","冒険画面を準備中"),
 "載入第一個場景":row("載入第一個場景","载入第一个场景","Loading the first scene","最初の場面を読み込み中"),
 "世界生成失敗":row("世界生成失敗","世界生成失败","World generation failed","世界生成失敗")
};'''
    p.write_text(text.replace(anchor,entries,1),encoding='utf-8')

append_ui_entries()

# Runtime format templates for interpolated player-visible messages.
p=Path('src/locale-runtime.js'); text=p.read_text(encoding='utf-8')
anchor='export function uiText(source,locale=loadLocale()){const key=canonicalUiKey(source),id=normalizeLocale(locale);return UI[key]?.[id]??String(source??"")}\n'
if 'export function uiFormat(' not in text:
    block='''const FORMAT={
 npcWait:row("正在等待 {name} 的回應…","正在等待 {name} 的回应…","Waiting for {name} to respond…","{name} の応答を待っています…"),
 npcRemoteContact:row("正在建立與 {name} 的遠距聯絡…","正在建立与 {name} 的远程联络…","Establishing remote contact with {name}…","{name} との遠隔連絡を確立中…"),
 npcNoInfo:row("{name}沒有提供更多可以確認的資訊。","{name}没有提供更多可以确认的信息。","{name} did not provide any more verifiable information.","{name} からこれ以上確認できる情報は得られなかった。"),
 npcSay:row("對{name}說些甚麼……","对{name}说些什么……","Say something to {name}…","{name} に話しかける…"),
 validationFailed:row("存檔世界完整性驗證失敗：{error}","存档世界完整性验证失败：{error}","Saved world integrity validation failed: {error}","セーブ世界の整合性検証に失敗しました：{error}"),
 worldCompileFailed:row("世界編譯失敗：{error}","世界编译失败：{error}","World compilation failed: {error}","世界のコンパイルに失敗しました：{error}")
};
export function uiFormat(key,vars={},locale=loadLocale()){const id=normalizeLocale(locale);let out=FORMAT[key]?.[id]??String(key??"");for(const [name,value] of Object.entries(vars||{}))out=out.replaceAll(`{${name}}`,String(value??""));return out}
'''
    if anchor not in text: raise SystemExit('uiText anchor missing')
    text=text.replace(anchor,anchor+block,1)

# Translation cache must win even when sourceLocale == targetLocale. This lets
# non-default locales normalize deterministic Engine strings without rewriting Canon.
old='if(loc.sourceLocale===id||isRuntimeLocalized(text,id))return true;return Boolean(loc.translations?.[id]?.[translationKey(text)])'
new='if(isRuntimeLocalized(text,id))return true;return Boolean(loc.translations?.[id]?.[translationKey(text)])'
if old not in text: raise SystemExit('hasTranslation anchor missing')
text=text.replace(old,new,1)
old='if(loc.sourceLocale===id||isRuntimeLocalized(text,id))return text;return loc.translations?.[id]?.[translationKey(text)]||text'
new='if(isRuntimeLocalized(text,id))return text;return loc.translations?.[id]?.[translationKey(text)]||text'
if old not in text: raise SystemExit('translatedText anchor missing')
text=text.replace(old,new,1)

# Add a volatile subset: narration/title/suggestions can be generated by deterministic
# Engine fallbacks and therefore must be language-normalized even in a world authored
# in the same non-default locale.
old='if(!state)return {sourceLocale:DEFAULT_LOCALE,targetLocale:normalizeLocale(locale),strings:[]};const registry=state.world?.registry||{},rows=[];const add=v=>{const text=String(v??"").trim();if(text&&!rows.includes(text))rows.push(text)};\n add(state.world?.name);add(state.sceneTitle);add(state.narrative);add(state.quests?.main?.title);for(const x of state.quests?.main?.objectives||[])add(x);for(const x of state.suggestions||[])add(typeof x==="string"?x:x?.label);'
new='if(!state)return {sourceLocale:DEFAULT_LOCALE,targetLocale:normalizeLocale(locale),strings:[],volatileStrings:[]};const registry=state.world?.registry||{},rows=[],volatile=[];const add=v=>{const text=String(v??"").trim();if(text&&!rows.includes(text))rows.push(text);return text};const addVolatile=v=>{const text=add(v);if(text&&!volatile.includes(text))volatile.push(text)};\n add(state.world?.name);addVolatile(state.sceneTitle);addVolatile(state.narrative);add(state.quests?.main?.title);for(const x of state.quests?.main?.objectives||[])add(x);for(const x of state.suggestions||[])addVolatile(typeof x==="string"?x:x?.label);'
if old not in text: raise SystemExit('visible payload prefix anchor missing')
text=text.replace(old,new,1)
old='const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id);return {sourceLocale:loc.sourceLocale,targetLocale:id,strings:rows.slice(0,220)}'
new='const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id);return {sourceLocale:loc.sourceLocale,targetLocale:id,strings:rows.slice(0,220),volatileStrings:volatile.slice(0,80)}'
if old not in text: raise SystemExit('visible payload return anchor missing')
text=text.replace(old,new,1)
old='const payload=visibleTranslationPayload(state,locale);if(payload.sourceLocale===payload.targetLocale)return {...payload,strings:[]};return {...payload,strings:payload.strings.filter(text=>!hasTranslation(state,text,payload.targetLocale))}'
new='const payload=visibleTranslationPayload(state,locale);if(payload.sourceLocale===payload.targetLocale&&payload.targetLocale===DEFAULT_LOCALE)return {...payload,strings:[]};const candidates=payload.sourceLocale===payload.targetLocale?payload.volatileStrings:payload.strings;return {...payload,strings:candidates.filter(text=>!hasTranslation(state,text,payload.targetLocale))}'
if old not in text: raise SystemExit('missing translations anchor missing')
text=text.replace(old,new,1)
old='const text=String(value??"");if(!state||!text)return text;const exact=translatedText(state,text,locale);if(exact!==text)return exact;const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id);if(loc.sourceLocale===id)return text;const table='
new='const text=String(value??"");if(!state||!text)return text;const exact=translatedText(state,text,locale);if(exact!==text)return exact;const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id);const table='
if old not in text: raise SystemExit('composite source guard anchor missing')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

# Translation services must normalize same-locale deterministic text too.
patch('src/ai-client.js',' if(!strings.length)return {translations:[]};if(source===target)return {translations:strings.map(source=>({source,translated:source}))};',' if(!strings.length)return {translations:[]};')
patch('src/ai-client.js','Translate each input string into the target language. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries.','Translate or normalize each input string into the target language. If a string is already in the target language, preserve its wording whenever possible. Preserve facts, names, numbers, uncertainty, gameplay state, and knowledge boundaries.')
patch('api/translate.js','  if(sourceLocale===targetLocale)return json(res,200,{translations:strings.map(source=>({source,translated:source}))});\n','')
patch('api/translate.js','Translate every input string into the target language while preserving factual meaning','Translate or normalize every input string into the target language; if already in the target language preserve its wording whenever possible, while preserving factual meaning')

# App runtime: localized dynamic gameplay UI.
p=Path('app.js'); text=p.read_text(encoding='utf-8')
text=text.replace('normalizeLocale,uiText,applyDocumentLocale','normalizeLocale,uiText,uiFormat,applyDocumentLocale',1)
text=text.replace('hint=elapsed>=20?" · AI 回應較慢，必要時會自動切換 Engine 備援":elapsed>=8?" · 仍在等待 AI 回應":""','hint=elapsed>=20?` · ${uiText("AI 回應較慢，必要時會自動切換 Engine 備援",activeLocale)}`:elapsed>=8?` · ${uiText("仍在等待 AI 回應",activeLocale)}`:""',1)
text=text.replace('function setAIThinking(on,label="AI 正在思考…")','function setAIThinking(on,label=uiText("AI 正在思考…",activeLocale))',1)
text=text.replace('on?"AI 正在處理你的行動…":turnSyncBusy?"STATE SYNC：完成後即可繼續行動":playerActionFlight.active?"正在處理已選行動…":""','on?uiText("AI 正在處理你的行動…",activeLocale):turnSyncBusy?uiText("STATE SYNC：完成後即可繼續行動",activeLocale):playerActionFlight.active?uiText("正在處理已選行動…",activeLocale):""',1)
text=text.replace('const text=String(message||"").trim();if(!text)return;','const text=uiText(String(message||"").trim(),activeLocale);if(!text)return;',1)

old='const visibleName=lt(playerVisibleNpcName(gameState,npc)),messages=npcConversationMessages(npcId),comm=worldCommunication(gameState),where=mode==="REMOTE"?"遠距 · "+comm.name:"就在附近";'
new='const visibleName=lt(playerVisibleNpcName(gameState,npc)),messages=npcConversationMessages(npcId),comm=worldCommunication(gameState),where=mode==="REMOTE"?uiText("遠距",activeLocale)+" · "+lt(comm.name):uiText("就在附近",activeLocale);'
if old not in text: raise SystemExit('npc modal preamble anchor missing')
text=text.replace(old,new,1)
text=text.replace('esc(npc.role||"人物")','esc(lt(npc.role||uiText("人物",activeLocale)))',1)
text=text.replace('esc(npc.description||npc.role||"對方正等待你開口。")','esc(lt(npc.description||npc.role||uiText("對方正等待你開口。",activeLocale)))',1)
text=text.replace('placeholder="對${esc(visibleName)}說些甚麼……"','placeholder="${esc(uiFormat("npcSay",{name:visibleName},activeLocale))}"',1)
text=text.replace('aria-label="送出"','aria-label="${esc(uiText("送出",activeLocale))}"',1)
text=text.replace('setAIThinking(true,`${mode==="REMOTE"?"正在建立遠距聯絡":"正在等待"} ${visibleName} 的回應…`);','setAIThinking(true,mode==="REMOTE"?uiFormat("npcRemoteContact",{name:visibleName},activeLocale):uiFormat("npcWait",{name:visibleName},activeLocale));',1)
text=text.replace('if(status)status.textContent="對方正在回應……";let answer=`${visibleName}沒有提供更多可以確認的資訊。`;','if(status)status.textContent=uiText("對方正在回應……",activeLocale);let answer=uiFormat("npcNoInfo",{name:visibleName},activeLocale);',1)
text=text.replace('const suffix=turn.progressed?.length?"\\n\\n你從這段對話中確認到可推進任務的新線索。":"";','const suffix=turn.progressed?.length?"\\n\\n"+uiText("你從這段對話中確認到可推進任務的新線索。",activeLocale):"";',1)
text=text.replace('gameState.narrative=r.summary||"戰鬥局勢發生了變化。";','gameState.narrative=r.summary||uiText("戰鬥局勢發生了變化。",activeLocale);',1)
text=text.replace('fallbackActionButtons("戰鬥結束")','fallbackActionButtons(uiText("戰鬥結束",activeLocale))',1)

old='const m=roll.modifiers||{},parts=[["能力",m.attribute],["技能",m.skill],["裝備",m.equipment],["夥伴",m.companion],["關係修正",m.relationship],["情境",m.situation],["天氣",m.weather]].filter(([,v])=>Number(v));'
new='const m=roll.modifiers||{},parts=[[uiText("能力",activeLocale),m.attribute],[uiText("技能",activeLocale),m.skill],[uiText("裝備",activeLocale),m.equipment],[uiText("夥伴",activeLocale),m.companion],[uiText("關係修正",activeLocale),m.relationship],[uiText("情境",activeLocale),m.situation],[uiText("天氣",activeLocale),m.weather]].filter(([,v])=>Number(v));'
if old not in text: raise SystemExit('roll parts anchor missing')
text=text.replace(old,new,1)
old='const relationChanges=relationshipOutcome?.changes||{},relationDetail=[["信任",relationChanges.trust],["尊重",relationChanges.respect],["畏懼",relationChanges.fear],["義務",relationChanges.obligation]].filter(([,v])=>Number(v)).map(([k,v])=>`${k} ${signed(v)}`).join(" · ");'
new='const relationChanges=relationshipOutcome?.changes||{},relationDetail=[[uiText("信任",activeLocale),relationChanges.trust],[uiText("尊重",activeLocale),relationChanges.respect],[uiText("畏懼",activeLocale),relationChanges.fear],[uiText("義務",activeLocale),relationChanges.obligation]].filter(([,v])=>Number(v)).map(([k,v])=>`${k} ${signed(v)}`).join(" · ");'
if old not in text: raise SystemExit('roll relationship anchor missing')
text=text.replace(old,new,1)
text=text.replace('` · 難度 ${signed(roll.difficulty)}`','` · ${uiText("難度",activeLocale)} ${signed(roll.difficulty)}`',1)
text=text.replace('` · 互動後：${relationDetail}`','` · ${uiText("互動後",activeLocale)}：${relationDetail}`',1)
text=text.replace('` · 技能提升至 ${roll.skillUp.after}`','` · ${uiText("技能提升至",activeLocale)} ${roll.skillUp.after}`',1)
text=text.replace('if(!report.valid)return alert("存檔世界完整性驗證失敗："+report.errors.join(", "));','if(!report.valid)return alert(uiFormat("validationFailed",{error:report.errors.join(", ")},activeLocale));',1)
text=text.replace('function worldProgress(value,label,detail=""){const box=$("#worldGenProgress"),bar=$("#worldGenBar"),pct=$("#worldGenPct"),text=$("#worldGenText"),sub=$("#worldGenDetail");box.classList.remove("hidden");bar.style.width=value+"%";pct.textContent=value+"%";text.textContent=label;sub.textContent=detail}','function worldProgress(value,label,detail=""){const box=$("#worldGenProgress"),bar=$("#worldGenBar"),pct=$("#worldGenPct"),text=$("#worldGenText"),sub=$("#worldGenDetail");box.classList.remove("hidden");bar.style.width=value+"%";pct.textContent=value+"%";text.textContent=uiText(label,activeLocale);sub.textContent=uiText(detail,activeLocale)}',1)
text=text.replace('alert("世界編譯失敗："+e.message)','alert(uiFormat("worldCompileFailed",{error:e.message},activeLocale))',1)
p.write_text(text,encoding='utf-8')

# Harden regression tests so the runtime-language guard cannot regress.
p=Path('test/v05900-multilingual-runtime.test.js'); text=p.read_text(encoding='utf-8')
insert='''\ntest("v0.59.0 normalizes deterministic volatile gameplay text in non-default locales",()=>{\n const state={world:{name:"English World",registry:{npcs:[],locations:[]}},sceneTitle:"理解眼前狀況",narrative:"戰鬥局勢發生了變化。",quests:{main:{title:"Main Quest",objectives:["Survive"]}},suggestions:["觀察四周"],inventory:[],localization:{sourceLocale:"en",displayLocale:"en",translations:{en:{}}}};\n const missing=missingVisibleTranslations(state,"en").strings;assert.ok(missing.includes("戰鬥局勢發生了變化。"));assert.ok(missing.includes("理解眼前狀況"));assert.ok(missing.includes("觀察四周"));\n applyTranslationBundle(state,"en",{translations:missing.map(source=>({source,translated:`EN:${source}`}))});assert.equal(translatedText(state,"戰鬥局勢發生了變化。","en"),"EN:戰鬥局勢發生了變化。");\n const traditional={...state,localization:{sourceLocale:"zh-Hant",displayLocale:"zh-Hant",translations:{"zh-Hant":{}}}};assert.equal(missingVisibleTranslations(traditional,"zh-Hant").strings.length,0);\n});\n'''
anchor='\ntest("v0.59.0 narrator is structurally above the action panel",async()=>{'
if insert.strip() not in text:
    if anchor not in text: raise SystemExit('multilingual test anchor missing')
    text=text.replace(anchor,insert+anchor,1)
text=text.replace('assert.match(app,/ensureGameplayLocale/);','assert.match(app,/ensureGameplayLocale/);assert.match(app,/uiFormat\\("npcWait"/);assert.match(app,/uiText\\("能力"/);')
p.write_text(text,encoding='utf-8')
print('v0.59.0 runtime language hardening applied')
