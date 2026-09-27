from pathlib import Path

app_path=Path("app.js")
app=app_path.read_text(encoding="utf-8")
app=app.replace('import {APP_VERSION} from "./src/version.js?v=60000";','import {APP_VERSION} from "./src/version.js?v=60001";')
app=app.replace('import {ensureCharacter,combatAction,recoverFromDefeat,xpNeeded} from "./src/combat-engine.js?v=59014";','import {ensureCharacter,combatAction,combatSnapshot,recoverFromDefeat,xpNeeded} from "./src/combat-engine.js?v=60001";')

start=app.index('async function runCombatAction(action){')
end=app.index('\nfunction signed(',start)
run_combat='''async function runCombatAction(action,rawAction=""){markForegroundActivity();preemptBackgroundAI();if(!gameState?.combat?.active)return;const label=String(rawAction||action||"").trim()||String(action||"attack");if(turnSyncBusy){recordDebug("PLAYER_COMBAT_ACTION_BLOCKED_STATE_SYNC",{action:label});return}if(aiBusy)return;const r=combatAction(gameState,label);bumpStateRevision(gameState,"COMBAT_ACTION");gameState.narrative=r.summary||uiText("戰鬥局勢發生了變化。",activeLocale);gameState.sceneTitle=deriveSceneTitle(gameState,label);recordDebug("COMBAT_ACTION_RESOLVED",{action:label,intent:r.intent?.intent||null,combatAction:r.intent?.combatAction||null,resolution:r.resolution?.tier||null,enemyTurns:r.enemyTurns?.length||0,encounterRound:r.encounter?.round||null});renderRoll(r.roll);if(!gameState.combat?.active){gameState.suggestions=fallbackActionButtons(uiText("戰鬥結束",activeLocale))}await persist();await refresh()}'''
app=app[:start]+run_combat+app[end:]

start=app.index(' if(gameState?.combat?.active){box.innerHTML=`<div class="action-group main-actions">')
end=app.index('\n const source=',start)
combat_ui=''' if(gameState?.combat?.active){
 const snap=combatSnapshot(gameState),rows=snap?.combatants||[],activeObjectives=(snap?.objectives||[]).filter(x=>x.status==="ACTIVE"),availableEnvironment=(snap?.environment||[]).filter(x=>x.interactable&&!x.used);
 const enemyStatus=rows.map(x=>`${esc(x.name)} · HP ${Number(x.hp)}/${Number(x.maxHp)} · ${esc(x.zone||"NEAR")} · ${esc(localizedStaticText("士氣",activeLocale))} ${Math.round(Number(x.morale)||0)}${x.combatState&&x.combatState!=="ACTIVE"?` · ${esc(x.combatState)}`:""}`).join("<br>");
 const objectiveText=activeObjectives.map(x=>lt(x.description)).join(" · "),environmentText=availableEnvironment.slice(0,4).map(x=>lt(x.name)).join("、");
 box.innerHTML=`<div class="action-group main-actions"><div class="action-group-title">${esc(localizedStaticText("戰鬥行動",activeLocale))} · Round ${Number(snap?.round||gameState.combat.round||1)}</div><small class="action-meta">${enemyStatus}</small>${objectiveText?`<small class="action-meta">${esc(localizedStaticText("目標",activeLocale))}：${esc(objectiveText)}</small>`:""}${environmentText?`<small class="action-meta">${esc(localizedStaticText("可利用環境",activeLocale))}：${esc(environmentText)}</small>`:""}<div class="action-grid"><button type="button" data-combat-action="attack">${esc(localizedStaticText("攻擊",activeLocale))}</button><button type="button" data-combat-action="technique">${esc(localizedStaticText("戰技",activeLocale))}</button><button type="button" data-combat-action="move">${esc(localizedStaticText("移動",activeLocale))}</button><button type="button" data-combat-action="defend">${esc(localizedStaticText("防禦",activeLocale))}</button><button type="button" data-combat-action="interact">${esc(localizedStaticText("利用環境",activeLocale))}</button><button type="button" data-combat-action="assist">${esc(localizedStaticText("協助",activeLocale))}</button><button type="button" data-combat-action="social">${esc(localizedStaticText("交涉",activeLocale))}</button><button type="button" data-combat-action="retreat">${esc(localizedStaticText("撤退",activeLocale))}</button></div><div class="settings-actions"><button type="button" id="combatOtherActionBtn" class="secondary">${esc(localizedStaticText("自由戰鬥行動…",activeLocale))}</button></div><small class="muted">${esc(localizedStaticText("你也可以描述具體攻擊方式、站位、道具、施法、環境互動或交涉；Engine 會解析 Action Intent 後結算。",activeLocale))}</small></div>`;
 box.querySelectorAll("[data-combat-action]").forEach(b=>b.onclick=()=>runCombatAction(b.dataset.combatAction));
 $("#combatOtherActionBtn")?.addEventListener("click",()=>{const form=$("#freeActionForm"),free=$("#freeAction");form?.classList.remove("hidden");if(free){free.disabled=false;free.placeholder=localizedStaticText("自由戰鬥行動：例如「假攻左側，再絆倒弓手」",activeLocale);free.focus()}});
 const combatLocked=aiBusy||turnSyncBusy||playerActionFlight.active;setPlayerActionControlsLocked(combatLocked,playerActionFlight.active?"正在處理已選行動…":turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"");const free=$("#freeAction");if(free){free.disabled=combatLocked;free.placeholder=combatLocked?(turnSyncBusy?"STATE SYNC：完成後即可繼續行動":"正在處理戰鬥行動…"):localizedStaticText("自由戰鬥行動：描述攻擊方式、移動、環境、道具、施法、協助或交涉…",activeLocale)}return}'''
app=app[:start]+combat_ui+app[end:]

marker='const free=$("#freeAction");if(free){free.disabled=aiBusy||turnSyncBusy||playerActionFlight.active||Boolean(gameState.combat?.active);'
start=app.index(marker)
end=app.index('if(document.body.dataset.screen==="game"',start)
free_refresh='''const free=$("#freeAction");if(free){free.disabled=aiBusy||turnSyncBusy||playerActionFlight.active;free.placeholder=gameState.combat?.active?localizedStaticText("自由戰鬥行動：描述攻擊方式、移動、環境、道具、施法、協助或交涉…",activeLocale):playerActionFlight.active?"正在處理：「"+playerActionFlight.label+"」":turnSyncBusy?"STATE SYNC：同步完成後即可繼續行動":"自由行動：例如「我想仔細檢查眼前可見的物件」"}'''
app=app[:start]+free_refresh+app[end:]

start=app.index('$("#freeActionForm").onsubmit=async e=>{')
end=app.index('\nfunction debugRuntimeSnapshot(',start)
form_submit='''$("#freeActionForm").onsubmit=async e=>{e.preventDefault();const input=$("#freeAction"),value=input.value.trim();if(!value)return;input.value="";if(gameState?.combat?.active)await runCombatAction(value,value);else await runAction("free",value)};'''
app=app[:start]+form_submit+app[end:]
app_path.write_text(app,encoding="utf-8")

Path("src/version.js").write_text('export const APP_VERSION="0.60.1";\n',encoding="utf-8")
index_path=Path("index.html")
index=index_path.read_text(encoding="utf-8").replace("app.js?v=60000","app.js?v=60001")
index_path.write_text(index,encoding="utf-8")

test_path=Path("test/combat-v0601.test.js")
test=test_path.read_text(encoding="utf-8")
if "Combat 2.0 UI exposes expanded tactical actions" not in test:
    test='import {readFileSync} from "node:fs";\n'+test+'''\n\ntest("Combat 2.0 UI exposes expanded tactical actions and routes freeform input through combatAction",()=>{\n const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");\n assert.match(app,/combatSnapshot\\(gameState\\)/);\n for(const action of ["attack","technique","move","defend","interact","assist","social","retreat"])assert.match(app,new RegExp(`data-combat-action="${action}"`));\n assert.match(app,/gameState\\?\\.combat\\?\\.active\\)await runCombatAction\\(value,value\\)/);\n assert.doesNotMatch(app,/free\\.disabled=aiBusy\\|\\|turnSyncBusy\\|\\|playerActionFlight\\.active\\|\\|Boolean\\(gameState\\.combat\\?\\.active\\)/);\n assert.match(app,/combat-engine\\.js\\?v=60001/);\n});\n'''
    test_path.write_text(test,encoding="utf-8")
