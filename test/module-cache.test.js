import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";

test("every browser module import is explicitly cache-versioned",async()=>{
 const files=(await readdir(new URL("../src/",import.meta.url))).filter(x=>x.endsWith(".js"));
 for(const file of files){
  const source=await readFile(new URL("../src/"+file,import.meta.url),"utf8");
  for(const match of source.matchAll(/from\s+"(\.\/[^"]+\.js)([^"]*)";/g))assert.match(match[2],/^\?v=\d+$/,file+" missing cache version for "+match[1])
 }
});

test("v0.37.1 reloads changed world creation modules without invalidating unchanged runtime modules",async()=>{
 const [html,app,client,adventure,worldEngine,worldSimulation,worldImpact,gameEngine,npcConversation]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-simulation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-impact.js",import.meta.url),"utf8"),
  readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/npc-conversation.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=37000/);assert.match(html,/creator\.css\?v=37000/);
 for(const path of ["version","world-engine","ai-client","turn-compiler","adventure-engine","game-engine","world-simulation","npc-conversation","world-style-presets","world-creation","world-impact"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replace("-","\\-")+"\\.js\\?v=37000"),path);
 for(const path of ["seed-contract","world-compiler","turn-compiler","world-timeline","action-intent","turn-outcome","ai-runtime-contracts"])assert.match(client,new RegExp("\\.\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=37000"),path);
 for(const path of ["world-timeline","world-impact","turn-compiler","knowledge-layers"])assert.match(adventure,new RegExp("\\.\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=37000"),path);
 assert.match(worldEngine,/\.\/seed-contract\.js\?v=37000/);assert.match(worldEngine,/\.\/world-timeline\.js\?v=37000/);
 assert.match(worldSimulation,/\.\/world-timeline\.js\?v=37000/);assert.match(worldSimulation,/\.\/world-impact\.js\?v=37000/);
 assert.match(worldImpact,/\.\/world-timeline\.js\?v=37000/);
 assert.match(gameEngine,/\.\/world-engine\.js\?v=37000/);assert.match(gameEngine,/\.\/world-simulation\.js\?v=37000/);
 assert.match(npcConversation,/\.\/world-simulation\.js\?v=37000/)
});
