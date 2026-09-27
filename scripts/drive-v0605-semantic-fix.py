from pathlib import Path
# Temporary fail-closed integration helper; removed before the stacked PR.
p=Path(__file__).resolve().parents[1]/"src/drive-engine.js"
text=p.read_text(encoding="utf-8")
old='r.entries=r.entries.map((raw,i)=>normalizeDrive(raw,i)).filter(Boolean).slice(-16);'
new='r.entries=r.entries.map((raw,i)=>{const normalized=normalizeDrive(raw,i);if(!normalized)return null;Object.assign(raw,normalized);return raw}).filter(Boolean).slice(-16);'
if old not in text: raise SystemExit("drive identity anchor missing")
text=text.replace(old,new,1)
old='for(const chunk of text.match(/[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}]{2,}/gu)||[]){if(chunk.length<=6&&!STOP_WORDS.has(chunk))out.add(chunk);for(let i=0;i<chunk.length-1;i++){const bi=chunk.slice(i,i+2);if(!STOP_WORDS.has(bi))out.add(bi)}}return [...out].slice(0,48)'
new='for(const chunk of text.match(/[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}]{2,}/gu)||[]){if(chunk.length<=6&&!STOP_WORDS.has(chunk))out.add(chunk);for(let i=0;i<chunk.length-1;i++){const bi=chunk.slice(i,i+2);if(!STOP_WORDS.has(bi))out.add(bi)}}return [...out].slice(0,48)'
# The source already contains the bigram loop for all chunk lengths; keep this guard explicit.
if old not in text: raise SystemExit("drive CJK term anchor missing")
# Re-write identically here so this script fails closed if the tokenizer shape drifts.
text=text.replace(old,new,1)
p.write_text(text,encoding="utf-8")
