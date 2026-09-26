from pathlib import Path

p=Path('src/world-creation.js')
s=p.read_text(encoding='utf-8')
p.write_text(s.rstrip()+"\n",encoding='utf-8')
print('v0.59.3 generated source whitespace normalized')
