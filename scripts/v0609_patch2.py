from pathlib import Path


def replace(path, old, new, count=1):
    p=Path(path); s=p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'anchor missing: {path}: {old[:140]!r}')
    p.write_text(s.replace(old,new,count),encoding='utf-8')

# One locale-runtime module identity across the browser graph; the file changed in v0.60.9.
for p in [Path('app.js'), *Path('src').glob('*.js')]:
    s=p.read_text(encoding='utf-8')
    s=s.replace('locale-runtime.js?v=59010','locale-runtime.js?v=60009')
    p.write_text(s,encoding='utf-8')

# contextual-actions changed in v0.60.9 and must not be served from the v0.60.6 browser cache.
p=Path('app.js'); s=p.read_text(encoding='utf-8').replace('contextual-actions.js?v=60006','contextual-actions.js?v=60009'); p.write_text(s,encoding='utf-8')

# Preserve useful deterministic Japanese labels instead of degrading every rejected Chinese fallback to one generic action.
replace('app.js',
'''function localizedActionText(value,kind="GENERAL"){const source=String(value??"").trim(),translated=String(lt(source)||"").trim();if(activeLocale==="zh-Hant"||translated&&translated!==source&&!actionLocaleLeak(translated))return translated||source;if(translated&&!actionLocaleLeak(translated))return translated;const table=ACTION_LOCALE_FALLBACK[activeLocale];return table?.[String(kind||"GENERAL").toUpperCase()]||table?.GENERAL||translated||source}''',
'''const ACTION_EXACT_LOCALIZATION=Object.freeze({\n ja:Object.freeze({"利用現場環境製造一個觀察機會":"周囲の環境を利用して観察の機会を作る","冒險靠近最明顯的危險源":"最も目立つ危険源へあえて近づく","檢查眼前最不自然的新痕跡":"目の前で最も不自然な新しい痕跡を調べる","找一個能提供現場資訊的人":"現場の情報を得られそうな人を探す","換一個角度測試眼前局勢":"別の角度から目の前の状況を試す"})\n});\nfunction localizedActionText(value,kind="GENERAL"){const source=String(value??"").trim(),exact=ACTION_EXACT_LOCALIZATION[activeLocale]?.[source];if(exact)return exact;const translated=String(lt(source)||"").trim();if(activeLocale==="zh-Hant"||translated&&translated!==source&&!actionLocaleLeak(translated))return translated||source;if(translated&&!actionLocaleLeak(translated))return translated;const table=ACTION_LOCALE_FALLBACK[activeLocale];return table?.[String(kind||"GENERAL").toUpperCase()]||table?.GENERAL||translated||source}\nconst VISIBLE_TEXT_FALLBACK=Object.freeze({\n ja:{world:"未知の世界",location:"目の前の見知らぬ場所",scene:"目の前の状況",questTitle:"現在の目標",questText:"周囲の状況を確認し、次に取れる行動を判断する",generic:"表示内容を確認中"},\n en:{world:"Unknown world",location:"An unfamiliar place",scene:"Current situation",questTitle:"Current objective",questText:"Assess the surroundings and decide what you can do next",generic:"Content pending"},\n "zh-Hans":{world:"未知世界",location:"眼前的陌生地点",scene:"眼前的状况",questTitle:"当前目标",questText:"确认周围状况并判断下一步可以采取的行动",generic:"内容确认中"}\n});\nfunction normalizeJaVisibleOrthography(text){return String(text||"").replaceAll("狀態","状態").replaceAll("判斷","判断").replaceAll("觀察","観察").replaceAll("荷降し場","荷降ろし場").replaceAll("體能","体力")}\nfunction safeVisibleText(value,kind="generic"){const raw=String(value??"").trim();let candidate=String(lt(raw)||raw).trim();if(activeLocale==="ja")candidate=normalizeJaVisibleOrthography(candidate);if(activeLocale==="zh-Hant"||candidate&&!hasLocaleLeak(candidate,activeLocale))return candidate;const table=VISIBLE_TEXT_FALLBACK[activeLocale];return table?.[kind]||table?.generic||candidate||raw}''')

# Player-facing opening HUD must fail closed instead of exposing mixed locale strings while translation repair is unavailable.
replacements={
'$("#worldName").textContent=gameState.player?.worldNameKnown?lt(gameState.world.name):uiText("未知世界",activeLocale);':'$("#worldName").textContent=gameState.player?.worldNameKnown?safeVisibleText(gameState.world.name,"world"):uiText("未知世界",activeLocale);',
'if($("#topLocation"))$("#topLocation").textContent=lt(playerVisibleLocationName(gameState));':'if($("#topLocation"))$("#topLocation").textContent=safeVisibleText(playerVisibleLocationName(gameState),"location");',
'$("#location").textContent=lt(playerVisibleLocationName(gameState));':'$("#location").textContent=safeVisibleText(playerVisibleLocationName(gameState),"location");',
'$("#sceneTitle").textContent=lt(gameState.sceneTitle||deriveSceneTitle(gameState));':'$("#sceneTitle").textContent=safeVisibleText(gameState.sceneTitle||deriveSceneTitle(gameState),"scene");',
'$("#questTitle").textContent=lt(gameState.quests.main.title);':'$("#questTitle").textContent=safeVisibleText(gameState.quests.main.title,"questTitle");',
'$("#questText").textContent=lt(gameState.quests.main.objectives[0]||"");':'$("#questText").textContent=safeVisibleText(gameState.quests.main.objectives[0]||"","questText");'
}
for old,new in replacements.items(): replace('app.js',old,new)

# Mutation-driven DOM translation errors need backoff; without this, a rejected translation can be retried on each render mutation.
replace('app.js','let renderedLocaleBusy=false;','let renderedLocaleBusy=false;const renderedLocaleRepairCooldown=new Map();')
replace('app.js',
'''async function ensureRenderedLocale(reason="render",root=document){\n applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);if(activeLocale==="zh-Hant")return true;if(playerActionFlight.active){recordDebug("UI_TRANSLATION_DEFERRED_FOR_ACTION",{reason,targetLocale:activeLocale});return true}const pending=documentTranslationCandidates(gameState,activeLocale,root);if(!pending.strings.length)return true;if(!aiStatus.aiConfigured){recordDebug("UI_TRANSLATION_DEFERRED",{reason,targetLocale:activeLocale,pending:pending.strings.length});return false}if(renderedLocaleBusy)return true;renderedLocaleBusy=true;try{const bundle=await translateVisibleWorld(pending,activeLocale);applySessionTranslationBundle(activeLocale,bundle);if(gameState)applyTranslationBundle(gameState,activeLocale,bundle);applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);if(gameState)await saveWorld(gameState);recordDebug("UI_TRANSLATION_READY",{reason,targetLocale:activeLocale,count:bundle.translations?.length||0});return true}catch(error){recordDebug("UI_TRANSLATION_FAILED",{reason,targetLocale:activeLocale,error:error?.message||String(error)});return false}finally{renderedLocaleBusy=false}}''',
'''async function ensureRenderedLocale(reason="render",root=document){\n applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);if(activeLocale==="zh-Hant")return true;if(playerActionFlight.active){recordDebug("UI_TRANSLATION_DEFERRED_FOR_ACTION",{reason,targetLocale:activeLocale});return true}const pending=documentTranslationCandidates(gameState,activeLocale,root);if(!pending.strings.length){renderedLocaleRepairCooldown.delete(activeLocale);return true}if(!aiStatus.aiConfigured){recordDebug("UI_TRANSLATION_DEFERRED",{reason,targetLocale:activeLocale,pending:pending.strings.length});return false}const cooldownUntil=Number(renderedLocaleRepairCooldown.get(activeLocale)||0);if(Date.now()<cooldownUntil){recordDebug("UI_TRANSLATION_BACKOFF",{reason,targetLocale:activeLocale,pending:pending.strings.length,retryInMs:cooldownUntil-Date.now()});return false}if(renderedLocaleBusy)return true;renderedLocaleBusy=true;try{const bundle=await translateVisibleWorld(pending,activeLocale);applySessionTranslationBundle(activeLocale,bundle);if(gameState)applyTranslationBundle(gameState,activeLocale,bundle);applyDocumentLocale(activeLocale,root);applySessionLocaleToDocument(activeLocale,root);if(gameState)applyWorldLocaleToDocument(gameState,activeLocale,root);if(gameState)await saveWorld(gameState);renderedLocaleRepairCooldown.delete(activeLocale);recordDebug("UI_TRANSLATION_READY",{reason,targetLocale:activeLocale,count:bundle.translations?.length||0});return true}catch(error){const message=error?.message||String(error),delay=/429|RATE_LIMIT|BACKPRESSURE/i.test(message)?30000:10000;renderedLocaleRepairCooldown.set(activeLocale,Date.now()+delay);recordDebug("UI_TRANSLATION_FAILED",{reason,targetLocale:activeLocale,error:message,retryInMs:delay});return false}finally{renderedLocaleBusy=false}}''')

# Known Engine consequence hints in the action cards must be localized too.
p='src/contextual-actions.js'
replace(p,
'''function presentationSkill(state,value){const raw=clean(value,70);if(!raw)return "";return presentationLabels(state).skill[raw]||raw}''',
'''const CONSEQUENCE_LABELS=Object.freeze({\n ja:{"可能引起注意":"周囲の注意を引く可能性","可能受傷或暴露位置":"負傷したり位置が露見したりする可能性"},\n en:{"可能引起注意":"May attract attention","可能受傷或暴露位置":"May cause injury or reveal your position"},\n "zh-Hans":{"可能引起注意":"可能引起注意","可能受傷或暴露位置":"可能受伤或暴露位置"}\n});\nfunction presentationSkill(state,value){const raw=clean(value,70);if(!raw)return "";return presentationLabels(state).skill[raw]||raw}\nfunction presentationConsequence(state,value){const raw=clean(value,90),id=contextualLocale(state);if(!raw)return "";return CONSEQUENCE_LABELS[id]?.[raw]||((id!=="zh-Hant"&&hasLocaleLeak(raw,id))?"":raw)}''')
replace(p,
'const parts=[skill,risk,x.consequenceHint].filter(Boolean);',
'const parts=[skill,risk,presentationConsequence(state,x.consequenceHint)].filter(Boolean);')

# Strengthen v0.60.9 regression with the dynamic opening HUD/cache/backoff contracts.
p='test/v0609-ja-turn-export-regression.test.js'
s=Path(p).read_text(encoding='utf-8')
s=s.replace(''' assert.match(app,/PLAYER_ACTION_STALE_CONTINUATION_DISCARDED/);\n assert.match(app,/foregroundAiLease\\+=1/)''',''' assert.match(app,/PLAYER_ACTION_STALE_CONTINUATION_DISCARDED/);\n assert.match(app,/foregroundAiLease\\+=1/);\n assert.match(app,/safeVisibleText\\(playerVisibleLocationName\\(gameState\\),"location"\\)/);\n assert.match(app,/UI_TRANSLATION_BACKOFF/);\n assert.match(app,/locale-runtime\\.js\\?v=60009/);\n assert.match(app,/contextual-actions\\.js\\?v=60009/)''')
Path(p).write_text(s,encoding='utf-8')
