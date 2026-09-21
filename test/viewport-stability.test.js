import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("desktop game stage scales as one fixed logical canvas",async()=>{
 const [css,app]=await Promise.all([
  readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8")
 ]);
 assert.match(css,/--ely-stage-width:1720px/);
 assert.match(css,/--ely-stage-height:860px/);
 assert.match(css,/transform:translate\(-50%,-50%\) scale\(var\(--ely-game-scale,1\)\)/);
 assert.match(css,/@media\(min-width:901px\)/);
 assert.match(app,/function fitGameStage\(\)/);
 assert.match(app,/availableWidth\/1720/);
 assert.match(app,/availableHeight\/860/);
 assert.match(app,/window\.visualViewport\?\.addEventListener\("resize",scheduleGameStageFit/);
});

test("generated ornamental frames use 9-slice borders instead of full-image stretching",async()=>{
 const css=await readFile(new URL("../styles.css",import.meta.url),"utf8");
 assert.match(css,/border-image-source:var\(--ely-frame-scene\)!important/);
 assert.match(css,/border-image-slice:18% 12%!important/);
 assert.match(css,/border-image-source:var\(--ely-frame-panel\)!important/);
 assert.match(css,/border-image-source:var\(--ely-frame-command\)!important/);
 assert.match(css,/background-size:100% 100%,500% auto!important/);
});
