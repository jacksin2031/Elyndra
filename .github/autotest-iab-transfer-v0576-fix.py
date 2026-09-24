from pathlib import Path

# Applied after the main v0.57.6 staging patch. This only aligns the generated UI/tests
# with the intended IAB-first behavior; it does not alter the underlying snapshot data.

p=Path('app.js')
text=p.read_text()
old=' · UTF-8 raw concat</p><p class="muted">此路徑不呼叫 File Picker、navigator.clipboard 或下載管理器。'
new=' · encoding = utf-8-raw-concat</p><p class="muted">此路徑不呼叫 File Picker、navigator.clipboard 或下載管理器。'
if old not in text:
    raise SystemExit('missing transfer encoding label anchor')
text=text.replace(old,new,1)

old='''${exportArtifacts.debug?'<button id="autotestSaveDebug" class="ghost">Save Picker：Debug</button>':""}${exportArtifacts.world?'<button id="autotestSaveWorld" class="ghost">Save Picker：世界</button>':""}${exportArtifacts.recovery?'<button id="autotestSaveRecovery" class="ghost">Save Picker：Recovery</button>':""}'''
new='''${exportArtifacts.debug?'<button id="autotestSaveDebug" class="ghost">Save Picker：Debug</button><button id="autotestCopyDebug" class="ghost">Browser Clipboard：Debug</button>':""}${exportArtifacts.world?'<button id="autotestSaveWorld" class="ghost">Save Picker：世界</button><button id="autotestCopyWorld" class="ghost">Browser Clipboard：世界</button>':""}${exportArtifacts.recovery?'<button id="autotestSaveRecovery" class="ghost">Save Picker：Recovery</button>':""}'''
if old not in text:
    raise SystemExit('missing browser fallback button anchor')
text=text.replace(old,new,1)
p.write_text(text)

p=Path('test/autotest-iab-transfer-v0576.test.js')
text=p.read_text()
old='Array.from({length:80}'
new='Array.from({length:800}'
if old not in text:
    raise SystemExit('missing transfer test fixture length anchor')
p.write_text(text.replace(old,new,1))
