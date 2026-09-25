from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def rewrite_block(path, pattern, replacement, label):
    p = ROOT / path
    source = p.read_text(encoding="utf-8")
    output, count = re.subn(pattern, lambda _m: replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, got {count}")
    p.write_text(output, encoding="utf-8")


# Sequential quest progression: prove the same engine states across distinct world-time points.
quest_test = r'''test("main quest advances through engine states instead of AI title rewrites",()=>{
 const s=game();canonizeGeneration(s,{locations:[{name:"起點鎮",type:"城鎮",region:"中央",description:"起點",known:true}],npcs:[{name:"米亞",role:"居民",description:"第一個接觸者",known:true,locationName:"起點鎮"}]});s.player.location="起點鎮";s.world.state.location="起點鎮";s.world.registry.npcs[0].encountered=true;assert.equal(tickMainQuest(s).stage,1);
 s.world.state.clock.totalMinutes=20;assert.equal(tickMainQuest(s).stage,2);
 for(let i=1;i<=3;i++){const id="FACT-Q"+i;s.world.canon.facts.push({id,type:"public",visibility:"public",text:"已驗證世界規則 "+i+" 的完整說明。",canonical:true});s.knowledge.push({id:"KQ"+i,title:"規則"+i,text:"已驗證世界規則 "+i+" 的完整說明。",factId:id,status:"VERIFIED",score:4})}
 s.world.state.clock.totalMinutes=40;assert.equal(tickMainQuest(s).stage,3);s.world.state.crisis={stage:"CRISIS",pressure:70,history:[]};s.world.state.clock.totalMinutes=60;assert.equal(tickMainQuest(s).stage,4);s.world.state.crisis.stage="ENDGAME";s.world.state.clock.totalMinutes=80;assert.equal(tickMainQuest(s).stage,5);assert.equal(s.quests.main.status,"CLIMAX")
});'''
rewrite_block(
    "test/isekai-runtime-v11.test.js",
    r'test\("main quest advances through engine states instead of AI title rewrites",\(\)=>\{.*?\n\}\);',
    quest_test,
    "ISEKAI_QUEST_SEQUENTIAL",
)

# The old v0.57.6 regression encoded the bug seen in the real 2x30 trace. Replace it with recovery behavior.
stall_test = r'''test("v0.57.13 FIRST_BUTTON switches strategy after five stagnant turns",()=>{
 const s=actionState();s.world.registry.locations.push({id:"L2",name:"灰樺鎮蒸汽調節節點",known:true,visibilityLock:"KNOWN"});s.world.travel={routes:[{id:"R1",fromId:"L1",toId:"L2",open:true}]};s.suggestionIntents=[{label:"再問一次",action:"再問閥-04一次",kind:"SOCIAL",progression:true,targetId:"N1"}];
 const recent=Array.from({length:5},(_,i)=>({turn:i+1,progressed:false,action:"再問一次",kind:"SOCIAL"})),decision=firstButtonAutotestDecision(s,recent);
 assert.equal(decision.firstButton,true);assert.equal(decision.firstButtonOverride,true);assert.equal(decision.reason,"FIRST_BUTTON_STALL_RECOVERY");assert.equal(decision.suggestionIndex,null);assert.equal(decision.kind,"TRAVEL");assert.match(decision.action,/停止重複目前互動/)
});'''
rewrite_block(
    "test/v0552-runtime-regressions.test.js",
    r'test\("v0\.57\.6 FIRST_BUTTON stays pinned to the first visible button after five stagnant turns",\(\)=>\{.*?\n\}\);',
    stall_test,
    "V0552_STALL_RECOVERY",
)

# A successful SOCIAL action now records both the grounded interaction and a relationship-change memory.
# The compatibility contract is that the interaction memory persists, not that it must remain the last row.
interaction_test = r'''test("generic local TALK action persists encounter and grounded interaction memory",()=>{
 const state=localNpcState(),npc=state.world.registry.npcs[0];
 performAction(state,"free","向轉生官·阿爾卑斯詢問壁爐的運作方法",{verdict:"ALLOW",kind:"SOCIAL",intent:"TALK",targetId:"NPC-ALP",actionIntent:{intent:"TALK",targetId:"NPC-ALP"}});
 assert.equal(npc.encountered,true);
 assert.ok(npc.memories.length>=1);
 const interaction=npc.memories.find(x=>x.type==="interaction");
 assert.ok(interaction);
 assert.equal(interaction.grounded,true);
 assert.ok(state.events.some(e=>e.type==="NPC_INTERACTION"&&e.npcId==="NPC-ALP"));
});'''
rewrite_block(
    "test/runtime-progression-grounding-v05418.test.js",
    r'test\("generic local TALK action persists encounter and grounded interaction memory",\(\)=>\{.*?\n\}\);',
    interaction_test,
    "NPC_INTERACTION_MEMORY_COMPAT",
)

version_ui = ROOT / "test/version-ui.test.js"
source = version_ui.read_text(encoding="utf-8")
source = source.replace("// v0.57.12 release contract", "// v0.57.13 release contract")
source = source.replace('assert.equal(pkg.version,"0.57.12")', 'assert.equal(pkg.version,"0.57.13")')
source = source.replace("after v0.57.12 session/checkpoint hardening", "after v0.57.13 progression/continuity hardening")
version_ui.write_text(source, encoding="utf-8")

print("stale non-download expectations updated")
