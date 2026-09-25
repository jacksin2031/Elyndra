from pathlib import Path

p=Path('test/ai-autotest-world-transition.test.js')
s=p.read_text(encoding='utf-8')
old='assert.match(finalize,/fastTransition=developerAutotest\\.worldIndex<Math\\.max\\(1,Number\\(config\\.worldCount\\)\\|\\|1\\)/);'
new='assert.match(finalize,/fastTransition=developerAutotest\\.worldIndex<Math\\.max\\(1,Number\\(config\\.totalWorldCount\\|\\|config\\.worldCount\\)\\|\\|1\\)/);'
if old not in s: raise SystemExit('transition assertion anchor missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')

p=Path('test/version-0551-release.test.js')
s=p.read_text(encoding='utf-8')
s=s.replace('0\\.57\\.15','0\\.57\\.16').replace('Official v0.57.15 release contract','Official v0.57.16 release contract')
p.write_text(s,encoding='utf-8')
print('v0.57.16 test-contract refinement applied')
