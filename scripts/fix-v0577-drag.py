from pathlib import Path

p=Path('src/autotest-drag-export.js')
s=p.read_text(encoding='utf-8')
old='return new FileImpl([new Blob([String(payload?.body??"")],{type:String(payload?.mime||"application/json;charset=utf-8")})],String(payload?.filename||"Elyndra-autotest.json"),{type:String(payload?.mime||"application/json;charset=utf-8")})'
new='return new FileImpl([String(payload?.body??"")],String(payload?.filename||"Elyndra-autotest.json"),{type:String(payload?.mime||"application/json;charset=utf-8")})'
if old in s:
    s=s.replace(old,new,1)
# Current staged generator may already emit the direct string form; in that case this script is intentionally idempotent.
p.write_text(s,encoding='utf-8')

# Lock the generated product contract: native File payload must use the actual UTF-8 JSON text, not stringify a Blob object in test doubles.
p=Path('test/autotest-iab-drag-v0577.test.js')
t=p.read_text(encoding='utf-8')
old='class FakeFile {constructor(parts,name,options={}){this.name=name;this.type=options.type||"";this._bytes=new TextEncoder().encode(parts.join(""));this.size=this._bytes.length}async arrayBuffer(){return this._bytes.buffer.slice(this._bytes.byteOffset,this._bytes.byteOffset+this._bytes.byteLength)}}'
new='class FakeFile {constructor(parts,name,options={}){this.name=name;this.type=options.type||"";const text=parts.map(part=>typeof part==="string"?part:String(part)).join("");this._bytes=new TextEncoder().encode(text);this.size=this._bytes.length}async arrayBuffer(){return this._bytes.buffer.slice(this._bytes.byteOffset,this._bytes.byteOffset+this._bytes.byteLength)}}'
if old in t:
    t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')
