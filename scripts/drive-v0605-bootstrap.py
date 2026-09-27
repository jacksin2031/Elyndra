from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding="utf-8")
def write(path,text): (ROOT/path).write_text(text,encoding="utf-8")
def rep(path,old,new,count=None):
    text=read(path)
    if old not in text: raise SystemExit(f"missing pattern in {path}: {old[:140]!r}")
    text=text.replace(old,new) if count is None else text.replace(old,new,count)
    write(path,text)

# Keep mystery signals evidence-bounded: a clue event helps ranking but cannot progress an unrelated mystery by itself.
rep("src/drive-engine.js",'if(type==="MYSTERY"&&eventType==="NPC_CLUE_CONFIRMED")score+=2;','if(type==="MYSTERY"&&eventType==="NPC_CLUE_CONFIRMED")score+=.75;')

# Quest scaffold remains deterministic world pacing; player Drives are a separate authority surface.
quest=read("src/quest-engine.js")
needle='import {adjustNpcRelationship,recordNpcMemory,resolveNpcCommitment} from "./npc-cognition.js?v=57025";\n'
if needle not in quest: raise SystemExit("quest import anchor missing")
quest=quest.replace(needle,needle+'import {abandonPlayerDrive,createPlayerDrive,driveSnapshot,ensurePlayerDrives,fulfillPlayerDrive,setFocusedDrive,syncPlayerDrivesFromEvents} from "./drive-engine.js?v=60005";\n',1)
old='q.status=q.stage===MAIN.length-1?"CLIMAX":"ACTIVE";return q}'
new='q.status=q.stage===MAIN.length-1?"CLIMAX":"ACTIVE";q.role="WORLD_CAMPAIGN_SCAFFOLD";q.playerMainQuest=false;return q}'
if old not in quest: raise SystemExit("ensureMainQuest anchor missing")
quest=quest.replace(old,new,1)
old='export function ensureQuestProgress(state){for(const q of ensureWorldRegistry(state).sideQuests){'
new='export function ensureQuestProgress(state){ensurePlayerDrives(state);syncPlayerDrivesFromEvents(state);for(const q of ensureWorldRegistry(state).sideQuests){'
if old not in quest: raise SystemExit("ensureQuestProgress anchor missing")
quest=quest.replace(old,new,1)
old='export function questSnapshot(state){const r=ensureWorldRegistry(state);ensureQuestProgress(state);tickMainQuest(state);return {main:state.quests.main,side:r.sideQuests.filter(q=>q.known===true&&!['+"'HIDDEN','DISCOVERABLE'"+'].includes(q.status)).slice(-12).map(q=>({id:q.id,title:q.title,objective:q.objective,status:q.status,progress:q.progress,target:q.target,conditions:q.conditions?.length||0,issuerNpcId:q.issuerNpcId||null,dueDay:q.dueDay??null}))}}'
new='export function questSnapshot(state){const r=ensureWorldRegistry(state);ensureQuestProgress(state);tickMainQuest(state);const drives=driveSnapshot(state),scaffold={...state.quests.main,role:"WORLD_CAMPAIGN_SCAFFOLD",playerMainQuest:false};return {main:scaffold,scaffold,drives,side:r.sideQuests.filter(q=>q.known===true&&!['+"'HIDDEN','DISCOVERABLE'"+'].includes(q.status)).slice(-12).map(q=>({id:q.id,title:q.title,objective:q.objective,status:q.status,progress:q.progress,target:q.target,conditions:q.conditions?.length||0,issuerNpcId:q.issuerNpcId||null,dueDay:q.dueDay??null}))}}'
if old not in quest: raise SystemExit("questSnapshot anchor missing")
quest=quest.replace(old,new,1)
if 'export {abandonPlayerDrive,createPlayerDrive,fulfillPlayerDrive,setFocusedDrive};' not in quest:
    quest+='\nexport {abandonPlayerDrive,createPlayerDrive,fulfillPlayerDrive,setFocusedDrive};\n'
write("src/quest-engine.js",quest)

# Every direct browser consumer follows the changed quest module.
for path in ["src/game-engine.js","src/npc-conversation.js","src/npc-dialogue-engine.js","src/adventure-engine.js"]:
    rep(path,'./quest-engine.js?v=59014','./quest-engine.js?v=60005')

# Journal: Drives are player-authored; the old main quest is shown separately as world pressure/scaffold.
p="src/progression-ui.js";text=read(p)
text=text.replace('import {questSnapshot} from "./quest-engine.js?v=59014";','import {abandonPlayerDrive,createPlayerDrive,fulfillPlayerDrive,questSnapshot,setFocusedDrive} from "./quest-engine.js?v=60005";',1)
start=text.find(' if(section==="quests"){')
end=text.find(' }else if(section==="mysteries"){',start)
if start<0 or end<0: raise SystemExit("journal quest block anchors missing")
block=''' if(section==="quests"){
  const side=qs.side||[],drives=qs.drives?.active||[],archive=qs.drives?.archive||[],typeLabel={PERSONAL:"個人追求",RELATIONSHIP:"人物關係",WORLD:"世界立場",MYSTERY:"未解之謎"};
  const driveCards=drives.map(d=>'<div class="lore-item"><small>'+esc(typeLabel[d.type]||d.type)+(d.focused?' · FOCUS':'')+' · '+d.progress+'/'+d.target+'</small><h3>'+esc(d.title)+'</h3><p>'+esc(d.description||"這是你自己決定要追下去的事情。")+'</p>'+(d.evidence?.length?'<small>最近進展：'+esc(d.evidence.at(-1).summary)+'</small>':'<small>還沒有足夠相關的經歷形成進展。</small>')+'<div class="settings-actions"><button class="'+(d.focused?'primary':'ghost')+'" data-drive-focus="'+esc(d.id)+'" '+(d.focused?'disabled':'')+'>'+(d.focused?'目前聚焦':'設為聚焦')+'</button><button class="secondary" data-drive-fulfill="'+esc(d.id)+'" '+(d.status==="READY"?'':'disabled')+'>確認告一段落</button><button class="ghost danger-ghost" data-drive-abandon="'+esc(d.id)+'">暫時放下</button></div></div>').join("");
  const archiveCards=archive.slice().reverse().slice(0,4).map(d=>'<div class="lore-item"><small>'+(d.status==="FULFILLED"?'已告一段落':'已放下')+' · '+esc(typeLabel[d.type]||d.type)+'</small><h3>'+esc(d.title)+'</h3></div>').join("");
  body='<form id="driveForm" class="settings-grid"><label>牽掛類型<select id="driveType"><option value="PERSONAL">個人追求</option><option value="RELATIONSHIP">人物關係</option><option value="WORLD">世界立場</option><option value="MYSTERY">未解之謎</option></select></label><label>你想追求甚麼<input id="driveTitle" maxlength="120" required placeholder="例如：找到失蹤的妹妹"></label><label class="full">為甚麼／要怎樣才算有進展<textarea id="driveDescription" maxlength="360" placeholder="用你自己的話記下這份牽掛"></textarea></label><button class="primary" type="submit">加入我的牽掛</button></form>';
  body+='<div class="lore-list">'+(driveCards||'<div class="lore-item"><p>你還沒有指定自己的長期牽掛。世界會繼續運作，但不會自動替你決定人生主線。</p></div>');
  body+='<div class="lore-item"><small>WORLD CAMPAIGN SCAFFOLD · 世界會自行推進</small><h3>'+esc(qs.scaffold?.title||qs.main.title)+'</h3><p>'+((qs.scaffold?.objectives||qs.main.objectives||[]).map(esc).join("<br>")||"世界目前沒有明顯危機壓力。")+'</p><small>這不是你的強制主線；你可以介入、忽略、延後或以其他目標生活。</small></div>';
  body+=side.map(q=>'<div class="lore-item"><small>'+esc(questProgressLabel(q))+'</small><h3>'+esc(q.title)+'</h3><p>'+esc(q.objective||"")+'</p></div>').join("");
  if(!side.length)body+='<div class="lore-item"><p>目前沒有其他已答應處理的事情。</p></div>';
  if(archiveCards)body+='<details><summary>已收束／已放下的牽掛</summary>'+archiveCards+'</details>';
  body+='</div>';
'''
text=text[:start]+block+text[end:]
anchor=' qsa("#modalContent [data-journal-section]").forEach(b=>b.onclick=()=>openJournalUI(state,openModal,persist,b.dataset.journalSection));\n'
if anchor not in text: raise SystemExit("journal handler anchor missing")
handlers=''' qsa("#modalContent [data-journal-section]").forEach(b=>b.onclick=()=>openJournalUI(state,openModal,persist,b.dataset.journalSection));
 $("#driveForm")?.addEventListener("submit",async e=>{e.preventDefault();const r=createPlayerDrive(state,{type:$("#driveType")?.value,title:$("#driveTitle")?.value,description:$("#driveDescription")?.value,focus:true});if(!r.ok){alert(r.reason==="DUPLICATE"?"這份牽掛已經在進行中。":r.reason==="ACTIVE_LIMIT"?"同時最多保留 8 份進行中的牽掛。":"請先寫下你真正想追求的事情。");return}await persist();openJournalUI(state,openModal,persist,"quests")});
 qsa("#modalContent [data-drive-focus]").forEach(b=>b.onclick=async()=>{if(setFocusedDrive(state,b.dataset.driveFocus)){await persist();openJournalUI(state,openModal,persist,"quests")}});
 qsa("#modalContent [data-drive-fulfill]").forEach(b=>b.onclick=async()=>{const r=fulfillPlayerDrive(state,b.dataset.driveFulfill);if(r.ok){await persist();openJournalUI(state,openModal,persist,"quests")}});
 qsa("#modalContent [data-drive-abandon]").forEach(b=>b.onclick=async()=>{if(!confirm("暫時放下這份牽掛？它不會被刪除，仍會保留在旅途紀錄。"))return;if(abandonPlayerDrive(state,b.dataset.driveAbandon)){await persist();openJournalUI(state,openModal,persist,"quests")}});
'''
text=text.replace(anchor,handlers,1)
write(p,text)

# Browser cache graph: direct dependents of changed modules.
rep("app.js",'./src/version.js?v=60004','./src/version.js?v=60005')
rep("app.js",'./src/adventure-engine.js?v=60004','./src/adventure-engine.js?v=60005')
rep("app.js",'./src/game-engine.js?v=60004','./src/game-engine.js?v=60005')
rep("app.js",'./src/npc-conversation.js?v=60004','./src/npc-conversation.js?v=60005')
rep("app.js",'./src/quest-engine.js?v=59014','./src/quest-engine.js?v=60005')
rep("app.js",'./src/progression-ui.js?v=60004','./src/progression-ui.js?v=60005')

# Canonical v0.60.5 release.
rep("package.json",'"version": "0.60.4"','"version": "0.60.5"')
rep("src/version.js",'APP_VERSION="0.60.4"','APP_VERSION="0.60.5"')
rep("index.html",'app.js?v=60004','app.js?v=60005')

# Permanent Pages gate and focused regression set.
rep(".github/workflows/pages.yml",'Focused v0.60.4 regressions','Focused v0.60.5 regressions')
rep(".github/workflows/pages.yml",'run: node --test test/talent-rules-v0604.test.js','run: node --test test/drive-engine-v0605.test.js test/talent-rules-v0604.test.js')

# Release/UI contracts: only canonical app/version tokens move; v0.60.4 subsystem tokens remain valid where unchanged.
rep("test/version-ui.test.js",'// v0.60.4 release contract','// v0.60.5 release contract')
rep("test/version-ui.test.js",'assert.equal(pkg.version,"0.60.4")','assert.equal(pkg.version,"0.60.5")')
rep("test/version-ui.test.js",'assert.match(html,/app\\.js\\?v=60004/);assert.match(app,/import \\{APP_VERSION\\} from "\\.\\/src\\/version\\.js\\?v=60004"/)','assert.match(html,/app\\.js\\?v=60005/);assert.match(app,/import \\{APP_VERSION\\} from "\\.\\/src\\/version\\.js\\?v=60005"/)')

rep("test/version-0551-release.test.js",'// Official v0.60.4 release contract','// Official v0.60.5 release contract')
rep("test/version-0551-release.test.js",'test("v0.60.4 is the canonical app and browser cache release"','test("v0.60.5 is the canonical app and browser cache release"')
rep("test/version-0551-release.test.js",'assert.equal(pkg.version,"0.60.4")','assert.equal(pkg.version,"0.60.5")')
rep("test/version-0551-release.test.js",'APP_VERSION="0\\.60\\.4"','APP_VERSION="0\\.60\\.5"')
rep("test/version-0551-release.test.js",'app\\.js\\?v=60004','app\\.js\\?v=60005',1)
rep("test/version-0551-release.test.js",'"60003","60004"].includes(x)','"60003","60004","60005"].includes(x)')
rep("test/version-0551-release.test.js",'src\\/version\\.js\\?v=60004','src\\/version\\.js\\?v=60005')
rep("test/version-0551-release.test.js",'src\\/npc-conversation\\.js\\?v=60004','src\\/npc-conversation\\.js\\?v=60005')
rep("test/version-0551-release.test.js",'assert.ok(tokens.includes("60004"));','assert.ok(tokens.includes("60004"));assert.ok(tokens.includes("60005"));')
