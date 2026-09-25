from pathlib import Path

p=Path(__file__).resolve().parents[1]/"src/player-experience.js"
s=p.read_text(encoding="utf-8")
old='return uniq(out.filter(x=>!previous.includes(x)&&!isSuggestionRecursion(state,x)),4)'
new='return uniq(out.filter(x=>!previous.includes(x)&&!hasNestedSuggestionQuotes(x)),4)'
if old not in s:
    raise SystemExit("recursion output filter not found")
p.write_text(s.replace(old,new),encoding="utf-8")
