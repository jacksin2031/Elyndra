from pathlib import Path
p=Path('app.js')
t=p.read_text(encoding='utf-8')
# Clarify that relationship is a pre-roll modifier, not a post-action trust mutation.
t=t.replace('["關係",m.relationship]','["關係修正",m.relationship]')
# Keep every player-facing NPC label behind the same identity projection.
t=t.replace('setAIThinking(true,`${mode==="REMOTE"?"正在建立遠距聯絡":"正在等待"} ${npc.name} 的回應…`);', 'const visibleName=playerVisibleNpcName(gameState,npc);setAIThinking(true,`${mode==="REMOTE"?"正在建立遠距聯絡":"正在等待"} ${visibleName} 的回應…`);')
t=t.replace('let answer=`${npc.name}沒有提供更多可以確認的資訊。`;', 'let answer=`${visibleName}沒有提供更多可以確認的資訊。`;')
t=t.replace('setAIThinking(true,`${npc.name} 正在對你展示的物品作出反應…`);', 'setAIThinking(true,`${playerVisibleNpcName(actionState,npc)} 正在對你展示的物品作出反應…`);')
t=t.replace('${npcs.map(x=>`<button class="npc-link" data-npc-id="${esc(x.id)}">${esc(x.name)} · ${esc(x.role)}</button>`', '${npcs.map(x=>`<button class="npc-link" data-npc-id="${esc(x.id)}">${esc(playerVisibleNpcName(gameState,x))} · ${esc(x.role)}</button>`')
# Companion UI messages should not reveal a canonical name before it is learned.
t=t.replace('message=r.accepted?npc.name+" 接受了同行邀請。":npc.name+" 暫時沒有接受同行邀請。"', 'message=r.accepted?visibleName+" 接受了同行邀請。":visibleName+" 暫時沒有接受同行邀請。"')
t=t.replace('message=acceptCompanionOffer(gameState,npc.id)?npc.name+" 正式加入旅程。":"這個同行提議已經失效。"', 'message=acceptCompanionOffer(gameState,npc.id)?visibleName+" 正式加入旅程。":"這個同行提議已經失效。"')
t=t.replace('message=dismissCompanion(gameState,npc.id)?npc.name+" 暫時離開了隊伍。":"目前無法離隊。"', 'message=dismissCompanion(gameState,npc.id)?visibleName+" 暫時離開了隊伍。":"目前無法離隊。"')
p.write_text(t,encoding='utf-8')
# Release contract contains an escaped semantic-version regex that the broad bump does not rewrite.
release=Path('test/version-0551-release.test.js')
r=release.read_text(encoding='utf-8').replace('0\\.57\\.16','0\\.57\\.17')
release.write_text(r,encoding='utf-8')
print('v0.57.17 refinement applied')
