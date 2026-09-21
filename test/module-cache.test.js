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

test("v0.40.0 causal core refreshes changed browser entrypoints",async()=>{
 const [html,app,client,adventure,game,simulation,npcConversation,npcDialogue,progression]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../src/ai-client.js",import.meta.url),"utf8"),
  readFile(new URL("../src/adventure-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/game-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/world-simulation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/npc-conversation.js",import.meta.url),"utf8"),
  readFile(new URL("../src/npc-dialogue-engine.js",import.meta.url),"utf8"),
  readFile(new URL("../src/progression-ui.js",import.meta.url),"utf8")
 ]);
 assert.match(html,/app\.js\?v=40000/);
 assert.match(html,/styles\.css\?v=38001/);
 assert.match(app,/\.\/src\/version\.js\?v=40000/);
 assert.match(app,/\.\/src\/world-engine\.js\?v=40000/);
 assert.match(app,/\.\/src\/storage\.js\?v=40000/);\n for(const path of ["ai-client","adventure-engine","game-engine","world-simulation","npc-conversation","world-impact","item-engine","progression-ui"])assert.match(app,new RegExp("\\.\\/src\\/"+path.replaceAll("-","\\-")+"\\.js\\?v=39000"),path);
 assert.match(client,/\.\/ai-runtime-contracts\.js\?v=39000/);
 assert.match(adventure,/\.\/world-impact\.js\?v=39000/);assert.match(adventure,/\.\/item-engine\.js\?v=39000/);
 assert.match(game,/\.\/world-simulation\.js\?v=39000/);assert.match(game,/\.\/item-engine\.js\?v=39000/);
 assert.match(simulation,/\.\/world-impact\.js\?v=39000/);
 assert.match(npcConversation,/\.\/world-simulation\.js\?v=39000/);
 assert.match(npcDialogue,/\.\/world-simulation\.js\?v=39000/);
 assert.match(progression,/\.\/item-engine\.js\?v=39000/);
 assert.match(app,/\.\/src\/world-creation\.js\?v=37001/);
 assert.match(client,/\.\/world-compiler\.js\?v=38001/);
 assert.match(app,/\.\/src\/contextual-actions\.js\?v=38003/)
});
