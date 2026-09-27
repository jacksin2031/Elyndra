from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding="utf-8")
def write(path,text): (ROOT/path).write_text(text,encoding="utf-8")
def rep(path,old,new,count=1):
    text=read(path)
    if old not in text: raise SystemExit(f"missing pattern in {path}: {old[:180]!r}")
    text=text.replace(old,new,count)
    write(path,text)

# Free-text social actions must use Social Conflict 2.0 rather than legacy generic trust rewards.
rep("src/game-engine.js",'import {adjustNpcRelationship} from "./npc-cognition.js?v=57025";','import {resolveSocialAction} from "./social-conflict-engine.js?v=60002";')
old='''function localNarrative(state,label,roll,profile,effects={}){
 const loc=playerVisibleLocationName(state)||"目前位置",rel=effects.npcRelationship,npc=rel?.npcId?(state.world?.registry?.npcs||[]).find(x=>x.id===rel.npcId):null,who=npc?playerVisibleNpcName(state,npc):"對方",changes=rel?.changes||{};
 if(profile?.kind==="SOCIAL"&&rel){
  const trust=Number(changes.trust)||0,respect=Number(changes.respect)||0;
  if(trust>0||respect>0)return `${who}沒有避開這次交涉，態度出現了可確認的正向變化。是否得到新資訊或推進任務，仍只以實際對話與世界狀態為準。`;
  if(trust<0||respect<0)return `${who}讓你把事情做完，但態度明顯變得更差。行動判定成功不代表關係改善。`;
 }
 if(roll.grade==="CRITICAL_SUCCESS")return `你在${loc}完成了「${label}」，結果十分順利。只有眼前實際出現的變化才算作後續資訊。`;
 if(roll.grade==="CRITICAL_FAILURE")return `你在${loc}嘗試「${label}」時出了明顯差錯，現場局勢變得更不利。`;
 if(roll.success)return `你在${loc}完成了「${label}」。現場若沒有新的可觀察變化，就不額外推斷線索、信任或任務進展。是否出現新的可確認資訊，仍以實際觀察與世界狀態為準。`;
 return `你在${loc}嘗試「${label}」，但沒有達到目標。眼前沒有憑空出現新線索，你仍可以改用其他可行做法。`
}'''
new='''function localNarrative(state,label,roll,profile,effects={}){
 const loc=playerVisibleLocationName(state)||"目前位置",social=effects.npcRelationship;
 if(profile?.kind==="SOCIAL"&&social?.summary)return social.summary;
 if(roll.grade==="CRITICAL_SUCCESS")return `你在${loc}完成了「${label}」，結果比預期更順利。`;
 if(roll.grade==="CRITICAL_FAILURE")return `你在${loc}嘗試「${label}」時出了明顯差錯，現場局勢變得更不利。`;
 if(roll.success)return `你在${loc}完成了「${label}」。`;
 return `你在${loc}嘗試「${label}」，但沒有達到原本的目的；局勢仍在變化，你可以換一種做法。`
}'''
rep("src/game-engine.js",old,new)
old='''function applyLocalNpcRelationshipOutcome(state,interaction,roll,kind,label){
 if(!interaction?.npcId||String(kind||"").toUpperCase()!=="SOCIAL"||!roll)return null;
 const npc=(state.world?.registry?.npcs||[]).find(x=>x?.id===interaction.npcId);if(!npc)return null;
 const grade=String(roll.grade||"").toUpperCase();let changes=null;
 if(grade==="CRITICAL_SUCCESS")changes={trust:6,respect:4,fear:-1};
 else if(grade==="SUCCESS")changes={trust:2,respect:1};
 else if(grade==="CRITICAL_FAILURE")changes={trust:-2,respect:-1,fear:2};
 if(!changes)return null;
 const relationship=adjustNpcRelationship(state,npc,{changes,reason:`玩家社交行動「${clean(label,100)}」由 Engine 判定為 ${grade}。`});
 return {npcId:npc.id,grade,changes,relationship,reason:`玩家社交行動「${clean(label,100)}」由 Engine 判定為 ${grade}。`,source:"ENGINE_LOCAL_SOCIAL"}
}'''
new='''function applyLocalNpcRelationshipOutcome(state,interaction,resolution,kind,label,assessment=null){
 if(!interaction?.npcId||String(kind||"").toUpperCase()!=="SOCIAL"||!resolution)return null;
 const npc=(state.world?.registry?.npcs||[]).find(x=>x?.id===interaction.npcId);if(!npc)return null;
 const intent={...(assessment?.actionIntent||{}),raw:clean(label,180)};
 return resolveSocialAction(state,npc,intent,resolution,{combat:false})
}'''
rep("src/game-engine.js",old,new)
rep("src/game-engine.js",'const npcRelationship=applyLocalNpcRelationshipOutcome(state,npcInteraction,roll,profile.kind,label);','const npcRelationship=applyLocalNpcRelationshipOutcome(state,npcInteraction,resolution,profile.kind,label,assessment);')

# Each resolved combat turn becomes a player-facing beat so Story Rhythm can see combat fatigue before victory.
old='function awardEnemy(state,e){if(e.xpGranted)return null;e.xpGranted=true;const xp=Math.max(5,e.level*5);grantXp(state,xp);let loot=null;if(e.loot){loot={id:id(),name:e.loot,description:"從 "+e.name+" 留下的戰利品。它需要透過市場、委託或製作系統轉化成價值。",identified:true,source:"COMBAT"};if(!state.inventory.some(i=>i.name===loot.name))state.inventory.push(loot)}return {loot,xp}}'
new=old+'\nfunction recordPlayerCombatBeat(state,kind,intent,resolution,target,summary){state.events??=[];const ev={id:id(),type:"COMBAT_ACTION_RESOLVED",visibility:"PLAYER_KNOWN",combatAction:kind,targetId:target?.id||null,targetName:target?.name||null,intent:{intent:intent?.intent||"",approach:intent?.approach||"",goal:intent?.goal||""},resolutionTier:resolution?.tier||"",summary:String(summary||"戰鬥局勢繼續推進。").slice(0,220),day:state.world?.state?.day||1,at:Date.now()};state.events.push(ev);return ev}'
rep("src/combat-engine.js",old,new)
rep("src/combat-engine.js",'if(target)phaseShift(state,target);\n const early={','if(target)phaseShift(state,target);\n if(!summary)summary=resolution.goalAchieved?"你的行動改變了戰場局勢。":"主要目的沒有達成，但戰鬥局勢繼續推進。";recordPlayerCombatBeat(state,kind,intent,resolution,target,summary);\n const early={')
rep("src/combat-engine.js",'}else tickWorld(state);if(!summary)summary=resolution.goalAchieved?"你的行動改變了戰場局勢。":"主要目的沒有達成，但戰鬥局勢繼續推進。";\n return {...early,','}else tickWorld(state);\n return {...early,')
rep("src/combat-engine.js",'`你試圖使用道具，但 Engine 無法套用效果（${itemResult.reason}）。`','`你試圖使用道具，但沒有產生可用效果（${itemResult.reason}）。`')

# Browser cache closure for changed direct modules.
rep("app.js",'./src/game-engine.js?v=60005','./src/game-engine.js?v=60006')
rep("app.js",'./src/combat-engine.js?v=60005','./src/combat-engine.js?v=60006')
rep("src/adventure-engine.js",'./combat-engine.js?v=60005','./combat-engine.js?v=60006')
rep("test/combat-v0601.test.js",'combat-engine\\.js\\?v=60005','combat-engine\\.js\\?v=60006')
