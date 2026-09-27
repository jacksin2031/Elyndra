from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(path): return (ROOT/path).read_text(encoding="utf-8")
def write(path,text): (ROOT/path).write_text(text,encoding="utf-8")
def rep(path,old,new,count=None):
    text=read(path)
    if old not in text: raise SystemExit(f"missing pattern in {path}: {old[:160]!r}")
    text=text.replace(old,new) if count is None else text.replace(old,new,count)
    write(path,text)

# Session maintenance: rhythm observes player-facing events before event compaction.
rep("src/session-maintenance.js",'import {compactNpcMemories,compactEvents} from "./context-manager.js?v=57025";\n',
    'import {compactNpcMemories,compactEvents} from "./context-manager.js?v=57025";\nimport {syncStoryRhythm} from "./story-rhythm-engine.js?v=60006";\n')
rep("src/session-maintenance.js",'export function maintainSession(state){\n if(state.events.length>40)',
    'export function maintainSession(state){\n syncStoryRhythm(state);\n if(state.events.length>40)')

# AI snapshot receives a compact rhythm directive, without changing Canon authority.
rep("src/adventure-engine.js",'import {pacingSnapshot} from "./world-pacing.js?v=57025";\n',
    'import {pacingSnapshot} from "./world-pacing.js?v=57025";\nimport {storyRhythmSnapshot} from "./story-rhythm-engine.js?v=60006";\n')
rep("src/adventure-engine.js",'dungeon:dungeonSnapshot(state,{director:true}),pacing:pacingSnapshot(state),talents:talentContextSnapshot(state)',
    'dungeon:dungeonSnapshot(state,{director:true}),pacing:pacingSnapshot(state),storyRhythm:storyRhythmSnapshot(state),talents:talentContextSnapshot(state)')
rep("src/adventure-engine.js",'./contextual-actions.js?v=59015','./contextual-actions.js?v=60006')

# Contextual suggestions keep all existing provenance/requirement gates; rhythm only reorders valid rows.
rep("src/contextual-actions.js",'import {hasLocaleLeak} from "./locale-runtime.js?v=59010";\n',
    'import {hasLocaleLeak} from "./locale-runtime.js?v=59010";\nimport {rhythmSuggestionBias} from "./story-rhythm-engine.js?v=60006";\n')
old=''' const raw=uniq((Array.isArray(input)?input:[]).map(x=>canonicalSuggestion(state,x)).filter(x=>x&&suggestionMatchesCurrentScene(state,x)&&isFresh(x)&&x.requirementsSatisfied===true&&(x.source!=="AI"||Boolean(x.causalBasis))&&(!x.prevalidated||!x.validatedContext||contextSealCurrent(state,x.validatedContext))&&evaluateSuggestionRequirements(state,x).ok),8);
 let progression=raw.find(x=>x.progression&&!["HIGH","EXTREME"].includes(x.risk));'''
new=''' const raw=uniq((Array.isArray(input)?input:[]).map(x=>canonicalSuggestion(state,x)).filter(x=>x&&suggestionMatchesCurrentScene(state,x)&&isFresh(x)&&x.requirementsSatisfied===true&&(x.source!=="AI"||Boolean(x.causalBasis))&&(!x.prevalidated||!x.validatedContext||contextSealCurrent(state,x.validatedContext))&&evaluateSuggestionRequirements(state,x).ok),8).sort((a,b)=>rhythmSuggestionBias(state,b)-rhythmSuggestionBias(state,a));
 let progression=raw.find(x=>x.progression&&!["HIGH","EXTREME"].includes(x.risk));'''
rep("src/contextual-actions.js",old,new)
rep("src/contextual-actions.js",' for(const x of genericFill){if(main.length>=3)break;if(x&&isFresh(x)&&!main.some(m=>m.action===x.action))main.push(x)}',
    ' for(const x of genericFill.sort((a,b)=>rhythmSuggestionBias(state,b)-rhythmSuggestionBias(state,a))){if(main.length>=3)break;if(x&&isFresh(x)&&!main.some(m=>m.action===x.action))main.push(x)}')

# Browser entry cache tokens for changed direct modules.
rep("app.js",'./src/version.js?v=60005','./src/version.js?v=60006')
rep("app.js",'./src/adventure-engine.js?v=60005','./src/adventure-engine.js?v=60006')
rep("app.js",'./src/session-maintenance.js?v=57025','./src/session-maintenance.js?v=60006')
rep("app.js",'./src/contextual-actions.js?v=59015','./src/contextual-actions.js?v=60006')

# Canonical v0.60.6 release.
rep("package.json",'"version": "0.60.5"','"version": "0.60.6"')
rep("src/version.js",'APP_VERSION="0.60.5"','APP_VERSION="0.60.6"')
rep("index.html",'app.js?v=60005','app.js?v=60006')

# Release/UI contracts.
rep("test/version-ui.test.js",'// v0.60.5 release contract','// v0.60.6 release contract')
rep("test/version-ui.test.js",'assert.equal(pkg.version,"0.60.5")','assert.equal(pkg.version,"0.60.6")')
rep("test/version-ui.test.js",'assert.match(html,/app\\.js\\?v=60005/);assert.match(app,/import \\{APP_VERSION\\} from "\\.\\/src\\/version\\.js\\?v=60005"/)','assert.match(html,/app\\.js\\?v=60006/);assert.match(app,/import \\{APP_VERSION\\} from "\\.\\/src\\/version\\.js\\?v=60006"/)')

rep("test/version-0551-release.test.js",'// Official v0.60.5 release contract','// Official v0.60.6 release contract')
rep("test/version-0551-release.test.js",'test("v0.60.5 is the canonical app and browser cache release"','test("v0.60.6 is the canonical app and browser cache release"')
rep("test/version-0551-release.test.js",'assert.equal(pkg.version,"0.60.5")','assert.equal(pkg.version,"0.60.6")')
rep("test/version-0551-release.test.js",'APP_VERSION="0\\.60\\.5"','APP_VERSION="0\\.60\\.6"')
rep("test/version-0551-release.test.js",'app\\.js\\?v=60005','app\\.js\\?v=60006',1)
rep("test/version-0551-release.test.js",'"60004","60005"].includes(x)','"60004","60005","60006"].includes(x)')
rep("test/version-0551-release.test.js",'src\\/version\\.js\\?v=60005','src\\/version\\.js\\?v=60006')
rep("test/version-0551-release.test.js",'assert.ok(tokens.includes("60004"));assert.ok(tokens.includes("60005"));','assert.ok(tokens.includes("60004"));assert.ok(tokens.includes("60005"));assert.ok(tokens.includes("60006"));')
