from pathlib import Path


def replace_once(path, old, new):
    p=Path(path); text=p.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected 1 match, found {count}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Scene Narrator: conditional dialogue is allowed only when grounded in the current action/outcome.
path=Path('src/ai-runtime-contracts.js')
text=path.read_text(encoding='utf-8')
needle='嚴守玩家 POV 與名稱知識邊界：snapshot 只給你的名稱才可使用；未知人名、未知 canonical 地名與 hidden Canon 不得補全，陌生地點只用可觀察描述。全程使用自然繁體中文'
insert='嚴守玩家 POV 與名稱知識邊界：snapshot 只給你的名稱才可使用；未知人名、未知 canonical 地名與 hidden Canon 不得補全，陌生地點只用可觀察描述。對白是可選的，不是每回合必需。只有 payload.action／intent 明確包含說話意圖，或 snapshot.recentEvents／kernel.allowedVisibleFacts 明確表示當下 NPC 已作出回應時，narrative 才可穿插最多一句自然、簡短、能推進情境的對白。引用玩家話語時，只可逐字引用 payload.action 已明確說出的內容，或作忠實且不增加立場、承諾、問題、資訊或決定的轉述；不得替玩家發明台詞。NPC 台詞必須符合 snapshot.registry.npcs 中該 NPC 的 role、description、trust 與當下可見關係，只能引用 kernel.allowedVisibleFacts、snapshot.knowledgeLayers.playerKnowledge、snapshot.recentEvents 中已證實而且該 NPC 當下合理可知的內容；不得讓 NPC 說出 hidden Canon、未知人名／地名、未 commit 的 State Director 結果或其不可能知道的資訊。任何對白都不得反轉 kernel.confirmedOutcome：FAILURE 不得藉台詞寫成主要目的成功，SUCCESS 也不得額外宣稱 NPC 關係、任務、知識或物品已改變。純 OBSERVE、TRAVEL，或沒有說話意圖且沒有 NPC 回應證據的回合，保持純場景旁白，不要硬塞對白。全程使用自然繁體中文'
if text.count(needle)!=1:
    raise SystemExit(f'ai-runtime-contracts dialogue anchor count={text.count(needle)}')
path.write_text(text.replace(needle,insert,1),encoding='utf-8')

# Release bump. Only the browser entry edge needs a new cache token because the changed narrator contract is server-side.
replace_once('package.json','"version": "0.57.29"','"version": "0.57.30"')
replace_once('src/version.js','APP_VERSION="0.57.29"','APP_VERSION="0.57.30"')
replace_once('app.js','./src/version.js?v=57029','./src/version.js?v=57030')
replace_once('index.html','app.js?v=57029','app.js?v=57030')

# Current-version UI/release contracts.
p=Path('test/version-ui.test.js'); t=p.read_text(encoding='utf-8'); t=t.replace('v0.57.29','v0.57.30').replace('"0.57.29"','"0.57.30"'); p.write_text(t,encoding='utf-8')
p=Path('test/version-0551-release.test.js'); t=p.read_text(encoding='utf-8')
t=t.replace('v0.57.29','v0.57.30').replace('"0.57.29"','"0.57.30"').replace('0\\.57\\.29','0\\.57\\.30')
t=t.replace('app\\.js\\?v=57029','app\\.js\\?v=57030')
t=t.replace('["57025","57026","57028","57029"]','["57025","57026","57028","57029","57030"]')
t=t.replace('./src/version\\.js\\?v=57029','./src/version\\.js\\?v=57030')
t=t.replace('assert.ok(tokens.includes("57026"));assert.ok(tokens.includes("57029"));','assert.ok(tokens.includes("57026"));assert.ok(tokens.includes("57030"));')
p.write_text(t,encoding='utf-8')

# Focused non-download regression for dialogue attribution, POV, NPC knowledge/relationship, and outcome consistency.
Path('test/v05730-scene-dialogue-contract.test.js').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import {sceneNarratorSystem} from "../src/ai-runtime-contracts.js";
import {sceneTurnSnapshot} from "../src/turn-compiler.js";

test("v0.57.30 scene dialogue is conditional rather than mandatory",()=>{
 const prompt=sceneNarratorSystem();
 assert.match(prompt,/對白是可選的，不是每回合必需/);
 assert.match(prompt,/只有 payload\.action／intent 明確包含說話意圖/);
 assert.match(prompt,/最多一句自然、簡短、能推進情境的對白/);
 assert.match(prompt,/純 OBSERVE、TRAVEL/);
 assert.match(prompt,/不要硬塞對白/);
});

test("v0.57.30 narrator cannot invent player speech or commitments",()=>{
 const prompt=sceneNarratorSystem();
 assert.match(prompt,/逐字引用 payload\.action 已明確說出的內容/);
 assert.match(prompt,/忠實且不增加立場、承諾、問題、資訊或決定的轉述/);
 assert.match(prompt,/不得替玩家發明台詞/);
});

test("v0.57.30 NPC dialogue is bounded by visible knowledge relationship and outcome",()=>{
 const prompt=sceneNarratorSystem();
 assert.match(prompt,/NPC 台詞必須符合 snapshot\.registry\.npcs 中該 NPC 的 role、description、trust/);
 assert.match(prompt,/kernel\.allowedVisibleFacts、snapshot\.knowledgeLayers\.playerKnowledge、snapshot\.recentEvents/);
 assert.match(prompt,/不得讓 NPC 說出 hidden Canon、未知人名／地名、未 commit 的 State Director 結果/);
 assert.match(prompt,/任何對白都不得反轉 kernel\.confirmedOutcome/);
 assert.match(prompt,/SUCCESS 也不得額外宣稱 NPC 關係、任務、知識或物品已改變/);
});

test("v0.57.30 Scene snapshot exposes grounded NPC relationship cues without director-only knowledge",()=>{
 const scene=sceneTurnSnapshot({
  world:{name:"測試世界",location:"石橋"},player:{location:"石橋"},knownFacts:[],knowledge:[],inventory:[],quest:null,recentEvents:[],factions:[],companions:[],recognition:{},
  registry:{locations:[],sideQuests:[],npcs:[{id:"N1",name:"眼前的陌生人",role:"守衛",description:"說話簡短而戒備",trust:-12,present:true,knowledgeScope:["SECRET-1"],goal:"隱藏目的"}]}
 });
 assert.deepEqual(scene.registry.npcs[0],{id:"N1",name:"眼前的陌生人",role:"守衛",description:"說話簡短而戒備",trust:-12,companionStatus:undefined,present:true});
 assert.equal(JSON.stringify(scene).includes("SECRET-1"),false);
 assert.equal(JSON.stringify(scene).includes("隱藏目的"),false);
});
''',encoding='utf-8')

Path('docs/releases/v0.57.30.md').write_text('''# Elyndra v0.57.30\n\n- Scene Narrator may use one short, natural line of dialogue only when the current action contains speech intent or grounded visible evidence shows an NPC response.\n- Player dialogue may only quote or faithfully paraphrase what the player actually expressed; it may not invent commitments, positions, questions, or decisions.\n- NPC dialogue is bounded by player-visible facts, current role/description/trust, and the Engine-confirmed outcome; hidden Canon and unknown names remain unavailable.\n- Pure observation/travel turns remain dialogue-free unless there is grounded NPC response evidence.\n- Validation remains non-download only.\n''',encoding='utf-8')
