import {readFileSync,writeFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8"),write=(p,s)=>writeFileSync(p,s,"utf8");
const patches={
 "app.js":[
  ["./src/lazy-generation.js?v=57025","./src/lazy-generation.js?v=59014"],
  ["./src/quest-engine.js?v=57025","./src/quest-engine.js?v=59014"],
  ["./src/adventure-engine.js?v=57029","./src/adventure-engine.js?v=59014"],
  ["./src/game-engine.js?v=57029","./src/game-engine.js?v=59014"],
  ["./src/npc-conversation.js?v=57029","./src/npc-conversation.js?v=59014"],
  ["./src/progression-ui.js?v=57025","./src/progression-ui.js?v=59014"],
  ["./src/storage.js?v=57025","./src/storage.js?v=59014"],
  ["./src/world-engine.js?v=57029","./src/world-engine.js?v=59014"],
  ["./src/item-engine.js?v=57025","./src/item-engine.js?v=59014"],
  ["./src/combat-engine.js?v=57029","./src/combat-engine.js?v=59014"]
 ],
 "src/ai-client.js":[["./lazy-generation.js?v=57025","./lazy-generation.js?v=59014"]],
 "src/causal-integrity.js":[["./lazy-generation.js?v=57025","./lazy-generation.js?v=59014"]],
 "src/causal-world-core.js":[
  ["./lazy-generation.js?v=57025","./lazy-generation.js?v=59014"],
  ["./causal-integrity.js?v=57025","./causal-integrity.js?v=59014"]
 ],
 "src/adventure-engine.js":[
  ["./quest-engine.js?v=57025","./quest-engine.js?v=59014"],
  ["./item-engine.js?v=57025","./item-engine.js?v=59014"],
  ["./combat-engine.js?v=57029","./combat-engine.js?v=59014"]
 ],
 "src/game-engine.js":[
  ["./quest-engine.js?v=57025","./quest-engine.js?v=59014"],
  ["./world-engine.js?v=57029","./world-engine.js?v=59014"],
  ["./item-engine.js?v=57025","./item-engine.js?v=59014"]
 ],
 "src/npc-conversation.js":[
  ["./quest-engine.js?v=57025","./quest-engine.js?v=59014"],
  ["./npc-quest-interaction.js?v=57025","./npc-quest-interaction.js?v=59014"]
 ],
 "src/npc-dialogue-engine.js":[
  ["./quest-engine.js?v=57025","./quest-engine.js?v=59014"],
  ["./npc-quest-interaction.js?v=57025","./npc-quest-interaction.js?v=59014"]
 ],
 "src/item-engine.js":[["./npc-quest-interaction.js?v=57025","./npc-quest-interaction.js?v=59014"]],
 "src/progression-ui.js":[
  ["./quest-engine.js?v=57025","./quest-engine.js?v=59014"],
  ["./storage.js?v=57025","./storage.js?v=59014"],
  ["./item-engine.js?v=57025","./item-engine.js?v=59014"]
 ],
 "src/storage.js":[
  ["./causal-world-core.js?v=57025","./causal-world-core.js?v=59014"],
  ["./item-engine.js?v=57025","./item-engine.js?v=59014"]
 ],
 "src/world-engine.js":[["./causal-world-core.js?v=57025","./causal-world-core.js?v=59014"]],
 "src/combat-engine.js":[["./world-engine.js?v=57029","./world-engine.js?v=59014"]]
};
let changed=0;
for(const [path,replacements] of Object.entries(patches)){
 let s=read(path),before=s;
 for(const [from,to] of replacements){if(!s.includes(from))throw new Error(`CACHE_PATCH_MISS ${path}: ${from}`);s=s.split(from).join(to)}
 if(s!==before){write(path,s);changed++}
}
console.log(`v0.59.14 cache propagation updated ${changed} files`);
