import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.54.4 Developer Autotest exposes export selection and timeout cancellation controls",async()=>{
 const [app,settings]=await Promise.all([
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-settings.js",import.meta.url),"utf8")
 ]);
 assert.match(app,/id="autotestExportMode"/);
 assert.match(app,/value="debug">只傳出 Debug/);
 assert.match(app,/value="world">只傳出世界/);
 assert.match(app,/id="autotestDisableTimeout"/);
 assert.match(app,/setDirectAIRuntimeControl\(\{disableTimeout:config\.disableTimeout===true,signal:developerAutotest\.batchController\.signal\}\)/);
 assert.match(app,/developerAutotest\.batchController\?\.abort/);
 assert.match(app,/clearDirectAIRuntimeControl\(\)/);
 assert.match(settings,/const runtime=directAIRuntimeControl\(\),timeoutDisabled=args\?\.disableTimeout===true\|\|runtime\.disableTimeout===true/);
 assert.match(settings,/parentSignals=\[args\?\.signal,runtime\.signal\]/);
 assert.match(settings,/useTimeout=Number\.isFinite\(rawMs\)&&rawMs>0/)
});

test("v0.54.4 export path only downloads selected artifact classes",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("function exportDeveloperAutotestResults"),end=app.indexOf("async function startDeveloperAutotest",start),block=app.slice(start,end);
 assert.match(block,/autotestExportSelection/);
 assert.match(block,/if\(selection\.debug\)autotestDownload/);
 assert.match(block,/if\(selection\.world&&worlds\.length===1\)autotestDownload/);
 assert.match(block,/else if\(selection\.world&&worlds\.length\)autotestDownload/)
});


test("v0.54.6 autotest rechecks foreground idle at the timeout boundary",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const start=app.indexOf("function autotestForegroundIdle"),end=app.indexOf("function cancelAutotestBackgroundWork",start),block=app.slice(start,end);
 assert.match(block,/if\(autotestForegroundIdle\(\)\)return true/);
 assert.match(app,/if\(firstButtonFast\)await waitForAutotestActionReady\(config\.disableTimeout===true\?90000:38000\);else await waitForAutotestIdle\(config\.disableTimeout===true\?90000:38000\)/)
});


test("v0.54.7 isolates autotest from quality, evolution and history background AI",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 for(const name of ["scheduleWorldQualityCritic","runBackgroundWorldQualityCritic","scheduleWorldEvolution","runBackgroundWorldEvolution","scheduleHistoryDeepening","runBackgroundHistoryDeepening"]){
  const start=app.indexOf((name.startsWith("run")?"async function ":"function ")+name);assert.ok(start>=0,name+" missing");
  const block=app.slice(start,start+280);assert.match(block,/developerAutotestActive/,name+" must gate during autotest")
 }
 assert.match(app,/scheduleWorldEvolution\("post_autotest_restore",BACKGROUND_IDLE_GRACE_MS\)/)
});