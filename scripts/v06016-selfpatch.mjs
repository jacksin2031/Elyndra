import {readFileSync,writeFileSync} from "node:fs";

const releaseReady=readFileSync("index.html","utf8").includes('"./src/version.js?v=60010":"./src/version.js?v=60016"');
if(releaseReady){console.log("v0.60.16 release wiring already finalized; no changes required.");process.exit(0)}

function patch(path,replacements){
 let text=readFileSync(path,"utf8");
 for(const [from,to] of replacements){
  if(!text.includes(from))throw new Error(`PATCH_ANCHOR_MISSING:${path}:${from}`);
  text=text.replaceAll(from,to)
 }
 writeFileSync(path,text)
}

patch("index.html",[
 ['"./src/version.js?v=60010":"./src/version.js?v=60015"','"./src/version.js?v=60010":"./src/version.js?v=60016"'],
 ['"./src/game-engine.js?v=60006":"./src/v06011-game-engine-hotfix.js?v=60015"','"./src/game-engine.js?v=60006":"./src/v06011-game-engine-hotfix.js?v=60016"'],
 ['./src/v06015-runtime-ui-hotfix.js?v=60015','./src/v06015-runtime-ui-hotfix.js?v=60016']
]);

patch("test/version-ui.test.js",[
 ["// v0.60.15 release contract","// v0.60.16 release contract"],
 ['assert.equal(pkg.version,"0.60.15")','assert.equal(pkg.version,"0.60.16")'],
 ['v06015-runtime-ui-hotfix\\.js\\?v=60015','v06015-runtime-ui-hotfix\\.js\\?v=60016'],
 ['version\\.js\\?v=60015','version\\.js\\?v=60016'],
 ['v06011-game-engine-hotfix\\.js\\?v=60015','v06011-game-engine-hotfix\\.js\\?v=60016']
]);

patch("test/version-0551-release.test.js",[
 ["// Official v0.60.15 release contract; this file also anchors the final Pages deployment check.","// Official v0.60.16 release contract; this file also anchors the final Pages deployment check."],
 ['test("v0.60.15 is the canonical app and browser cache release"','test("v0.60.16 is the canonical app and browser cache release"'],
 ['assert.equal(pkg.version,"0.60.15")','assert.equal(pkg.version,"0.60.16")'],
 ['APP_VERSION="0\\.60\\.15"','APP_VERSION="0\\.60\\.16"'],
 ['v06015-runtime-ui-hotfix\\.js\\?v=60015','v06015-runtime-ui-hotfix\\.js\\?v=60016'],
 ['version\\.js\\?v=60015','version\\.js\\?v=60016'],
 ['v06011-game-engine-hotfix\\.js\\?v=60015','v06011-game-engine-hotfix\\.js\\?v=60016']
]);

patch("test/v06015-ja-live-regressions.test.js",[
 ['assert.equal(JSON.parse(pkg).version,"0.60.15")','assert.equal(JSON.parse(pkg).version,"0.60.16")'],
 ['APP_VERSION="0\\.60\\.15"','APP_VERSION="0\\.60\\.16"'],
 ['v06015-runtime-ui-hotfix\\.js\\?v=60015','v06015-runtime-ui-hotfix\\.js\\?v=60016'],
 ['version\\.js\\?v=60015','version\\.js\\?v=60016'],
 ['v06011-game-engine-hotfix\\.js\\?v=60015','v06011-game-engine-hotfix\\.js\\?v=60016'],
 ['v06015-ja-visible-text\\.js\\?v=60015','v06015-ja-visible-text\\.js\\?v=60016']
]);

patch("test/v06015-action-ui-coherence.test.js",[
 ['assert.match(engine,/normalizedAction:presented/)','assert.match(engine,/assessment\\.normalizedAction=presented/);assert.match(engine,/assessment\\.actionIntent=next/)']
]);
