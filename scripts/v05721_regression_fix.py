from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding="utf-8")
def write(p,s): (ROOT/p).write_text(s,encoding="utf-8")

# Provenance must validate the Engine-inferred movement semantics, not stale AI kind metadata.
p=Path("src/contextual-actions.js"); s=read(p)
old='function suggestionMatchesCurrentScene(state,row){return validateSuggestionProvenance(row,contextualSuggestionProvenanceScope(state)).valid}'
new='function suggestionMatchesCurrentScene(state,row){const inferred=inferActionKind(row?.action||row?.label||"");const effective=inferred==="TRAVEL"&&String(row?.kind||"").toUpperCase()!=="TRAVEL"?{...row,kind:"TRAVEL"}:row;return validateSuggestionProvenance(effective,contextualSuggestionProvenanceScope(state)).valid}'
if old not in s: raise SystemExit("suggestion provenance helper not found")
s=s.replace(old,new,1)
write(p,s)

# Preserve the established hard-stall contract: after seven stagnant turns, do not select another button.
# Rotate several grounded travel recoveries instead of repeating the old single hard-coded sentence.
p=Path("src/ai-autotest.js"); s=read(p)
start=s.index("function deterministicRecoveryCandidates(")
end=s.index("export function normalizeAutotestDecision",start)
block='''function deterministicRecoveryCandidates(snapshot={},recentActions=[]){\n const recent=normalizedRecent(recentActions),loc=text(snapshot?.world?.location||"目前位置",100)||"目前位置",objective=text(snapshot?.quest?.objectives?.[0]||snapshot?.quest?.title||"目前目標",100),observe=[\n  {action:`檢查${loc}附近與剛才不同的地面、牆面或出口，確認是否有新的可驗證痕跡`,kind:"OBSERVE",targetId:null,progression:true},\n  {action:`搜尋${loc}另一側可安全接近的區域，確認是否出現新人物、物件或通道`,kind:"OBSERVE",targetId:null,progression:true},\n  {action:`觀察${loc}目前最明顯的人流、聲音或環境變化，選一項此前未追查的線索`,kind:"OBSERVE",targetId:null,progression:true},\n  {action:`檢查${loc}可見出口與附近物件的位置關係，選一條與剛才不同的方向再確認`,kind:"OBSERVE",targetId:null,progression:true}\n ],travel=[\n  {action:`沿${loc}目前可見且可安全接近的出口或通道移動一小段，尋找能推進「${objective}」的新人物或可驗證線索`,kind:"TRAVEL",targetId:null,progression:true},\n  {action:`離開${loc}剛才反覆互動的位置，沿另一條可見出口或通道前進一小段，再確認「${objective}」相關線索`,kind:"TRAVEL",targetId:null,progression:true},\n  {action:`從${loc}改走另一個可安全接近的出口或通道，先移動到新的可觀察位置再追查「${objective}」`,kind:"TRAVEL",targetId:null,progression:true},\n  {action:`沿${loc}尚未嘗試的可見通道移動一小段，避開剛才的互動循環並尋找「${objective}」的新證據`,kind:"TRAVEL",targetId:null,progression:true}\n ],fresh=rows=>rows.filter(x=>!recent.has(text(x.action,180).toLowerCase()));\n return {observe,travel,observeFresh:fresh(observe),travelFresh:fresh(travel)}\n}\nexport function deterministicAutotestDecision(snapshot={},recentActions=[],reason="AI fallback"){\n const combat=snapshot?.combat?.active===true,suggestions=list(snapshot?.suggestions),recent=normalizedRecent(recentActions),stall=consecutiveAutotestStall(recentActions),last=list(recentActions).filter(x=>x&&typeof x==="object").at(-1)||{},lastKind=String(last.kind||"").toUpperCase(),lastTarget=String(last.targetId||"");\n if(combat)return {mode:"combat",combatAction:"attack",action:"attack",suggestionIndex:null,reason,goalReached:false,goalEvidence:"",fallback:true};\n const scored=suggestions.map((x,i)=>{const kind=String(x?.kind||"").toUpperCase(),targetId=String(x?.targetId||""),fresh=!recent.has(text(x?.action||x?.label,180).toLowerCase()),sameKind=Boolean(kind&&kind===lastKind),sameTarget=Boolean(lastTarget&&targetId&&targetId===lastTarget);let score=0;if(fresh)score+=30;if(x?.progression===true)score+=28;if(!["OBSERVE","GENERAL"].includes(kind))score+=stall>=2?20:5;if(stall>=3&&kind&&kind!==lastKind)score+=24;if(stall>=3&&lastTarget&&targetId&&targetId!==lastTarget)score+=24;if(stall>=3&&sameTarget)score-=45;if(stall>=5&&sameKind)score-=35;if(stall>=5&&kind==="TRAVEL")score+=40;if(stall>=5&&["RISKY","SOCIAL"].includes(kind)&&kind!==lastKind)score+=10;if(["HIGH","EXTREME"].includes(String(x?.risk||"").toUpperCase()))score-=stall<5?10:0;return {x,i,score,kind,targetId,sameKind,sameTarget,fresh}}).sort((a,b)=>b.score-a.score||a.i-b.i);\n let chosen=scored[0]||null;if(stall>=3){const diverse=scored.find(row=>row.fresh&&!row.sameKind&&(!lastTarget||!row.targetId||row.targetId!==lastTarget));chosen=diverse||scored.find(row=>row.fresh)||null}\n if(chosen?.x&&chosen.fresh&&stall<7)return {mode:"suggestion",suggestionIndex:chosen.i,action:text(chosen.x.action||chosen.x.label,180),kind:text(chosen.x.kind||"",30),progression:chosen.x.progression===true,targetId:chosen.x.targetId||null,combatAction:null,reason:`${reason}; deterministic recovery stall=${stall}`,goalReached:false,goalEvidence:"",fallback:true};\n const recovery=deterministicRecoveryCandidates(snapshot,recentActions),hard=stall>=5,pool=hard?(recovery.travelFresh.length?recovery.travelFresh:recovery.travel):(recovery.observeFresh.length?recovery.observeFresh:recovery.observe),index=pool.length?Math.abs((stall+list(recentActions).length)%pool.length):0,candidate=pool[index]||{action:"檢查目前位置附近最新出現的可見變化",kind:"OBSERVE",targetId:null,progression:true};\n return {mode:"free",suggestionIndex:null,action:text(candidate.action,180),kind:candidate.kind,progression:candidate.progression===true,targetId:candidate.targetId||null,combatAction:null,reason:`${reason}; deterministic grounded recovery stall=${stall}`,goalReached:false,goalEvidence:"",fallback:true}\n}\n'''
s=s[:start]+block+s[end:]
write(p,s)

# Align stale structural regressions with the same semantics after the v0.57.21 refactor.
p=Path("test/background-world-evolution.test.js"); s=read(p)
old='assert.match(app,/if\\(on\\)preemptBackgroundAI\\(\\)/);'
new='assert.match(app,/if\\(on\\)\\{?preemptBackgroundAI\\(\\)/);'
if old not in s: raise SystemExit("background preemption assertion not found")
s=s.replace(old,new,1); write(p,s)

p=Path("test/first-button-stall-recovery-v05419.test.js"); s=read(p)
repls={
 'assert.match(app,/const forcedRecovery=reason==="FIRST_BUTTON_STALL_RECOVERY"/);':'assert.match(app,/const forcedRecovery=\\/STALL_RECOVERY\\/\\.test\\(String\\(reason\\|\\|""\\)\\)/);',
 'assert.match(app,/else if\\(firstButtonFast\\)\\{const stall=autotestRecentStallCount\\(recentActions\\),expansionNeeded=needsExpansion\\(gameState\\)/);':'assert.match(app,/const firstButtonFast=config\\.playStrategy==="FIRST_BUTTON",stall=autotestRecentStallCount\\(recentActions\\),expansionNeeded=needsExpansion\\(gameState\\)/);',
 'assert.match(app,/if\\(stall>=3\\)firstButtonExpansionReason="FIRST_BUTTON_STALL_RECOVERY"/);':'assert.match(app,/if\\(stall>=3\\)expansionReason=firstButtonFast\\?"FIRST_BUTTON_STALL_RECOVERY":"AUTOTEST_STALL_RECOVERY"/);',
 'assert.match(app,/else if\\(expansionNeeded&&sparseWorld\\)firstButtonExpansionReason="FIRST_BUTTON_SPARSE_WORLD"/);':'assert.match(app,/else if\\(expansionNeeded&&\\(firstButtonFast\\?sparseWorld:true\\)\\)expansionReason=firstButtonFast\\?"FIRST_BUTTON_SPARSE_WORLD":"WORLD_EDGE_UNDERDEFINED"/);'
}
for old,new in repls.items():
 if old not in s: raise SystemExit("first-button structural assertion not found: "+old)
 s=s.replace(old,new,1)
write(p,s)

# This fixture explicitly addresses the NPC by canonical name, so the name must already be player-known.
p=Path("test/contextual-actions.test.js"); s=read(p)
old=' const s=state(),row=buildContextualActionSet(s,[{label:"問守衛昨晚發生甚麼",action:"向守衛詢問昨晚巷子發生的異常",kind:"SOCIAL",risk:"LOW",approach:"SOCIAL",requirementsSatisfied:true,causalBasis:"守衛就在現場"}]).all.find(x=>x.label==="問守衛昨晚發生甚麼");'
new=' const s=state();s.world.registry.npcs[0].nameKnown=true;const row=buildContextualActionSet(s,[{label:"問守衛昨晚發生甚麼",action:"向守衛詢問昨晚巷子發生的異常",kind:"SOCIAL",risk:"LOW",approach:"SOCIAL",requirementsSatisfied:true,causalBasis:"守衛就在現場"}]).all.find(x=>x.label==="問守衛昨晚發生甚麼");'
if old not in s: raise SystemExit("contextual canonical-name fixture not found")
s=s.replace(old,new,1); write(p,s)

# v0.57.21 should rotate hard-stall travel recoveries while preserving the older seven-turn escape invariant.
p=Path("test/v05721-runtime-recovery.test.js"); s=read(p)
start=s.index('test("v0.57.21 deterministic AutoTest recovery rotates grounded fast-path actions"')
end=s.index('\n\ntest("v0.57.21 Codex bridge',start)
new='''test("v0.57.21 deterministic AutoTest recovery rotates grounded hard-stall travel actions",()=>{\n const snapshot={world:{location:"眼前的裂隙"},quest:{objectives:["理解目前異常"]},suggestions:[],combat:{active:false}};\n const recent=Array.from({length:7},()=>({action:"停止重複目前互動，沿眼前的裂隙尋找新人物或可驗證線索",kind:"GENERAL",progressed:false,targetId:null}));\n const first=deterministicAutotestDecision(snapshot,recent,"test fallback");\n assert.equal(first.mode,"free");\n assert.equal(first.kind,"TRAVEL");\n assert.doesNotMatch(first.action,/停止重複目前互動/);\n assert.match(first.action,/出口|通道/);\n const second=deterministicAutotestDecision(snapshot,[...recent,{action:first.action,kind:first.kind,progressed:false,targetId:null}],"test fallback");\n assert.equal(second.mode,"free");assert.equal(second.kind,"TRAVEL");\n assert.notEqual(second.action,first.action);\n assert.match(second.action,/出口|通道/);\n});'''
s=s[:start]+new+s[end:]
write(p,s)
