from pathlib import Path

for p in Path('test').glob('*.test.js'):
    text=p.read_text()
    text=text.replace('0\\.57\\.2','0\\.57\\.3')
    text=text.replace('v0\\.57\\.2','v0\\.57\\.3')
    p.write_text(text)
