from pathlib import Path

p = Path("src/ai-client.js")
s = p.read_text(encoding="utf-8")
old = "支線必須以 locationName、npcName、factionName 或 historyRefs 至少一項連回前兩波內容。Future Timeline 只代表尚未觸發的可能事件："
new = "支線必須以 locationName、npcName、factionName 或 historyRefs 至少一項連回前兩波內容。若 NPC 的 historyRefs 指向百年以上的歷史，不可把 NPC 寫成該時代仍存活至今的初代／始祖／創建本人，除非 anchor 或 NPC 明確提供長壽、延命、休眠、時間停滯等足以解釋跨度的機制；否則必須寫成後代、傳承者、繼承人、記錄持有人或其他合理的現代身份。Future Timeline 只代表尚未觸發的可能事件："
count = s.count(old)
if count != 1:
    raise SystemExit(f"expected exactly one Cast prompt anchor, found {count}")
p.write_text(s.replace(old, new, 1), encoding="utf-8")
