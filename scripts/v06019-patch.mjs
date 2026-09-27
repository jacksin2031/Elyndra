import fs from "node:fs";

function read(path){return fs.readFileSync(path,"utf8")}
function write(path,text){fs.writeFileSync(path,text)}
function one(path,from,to){const text=read(path),count=text.split(from).length-1;console.log(`${path}: ${JSON.stringify(from.slice(0,80))} -> ${count}`);if(count<1)throw new Error(`missing anchor ${path}: ${from}`);write(path,text.replace(from,to))}
function all(path,replacements){let text=read(path);for(const [from,to] of replacements){const count=text.split(from).length-1;console.log(`${path}: ${JSON.stringify(from.slice(0,80))} -> ${count}`);if(count<1)throw new Error(`missing anchor ${path}: ${from}`);text=text.replaceAll(from,to)}write(path,text)}

const pkg=JSON.parse(read("package.json"));pkg.version="0.60.19";write("package.json",JSON.stringify(pkg,null,2)+"\n");
one("src/version.js","APP_VERSION=\"0.60.18\"","APP_VERSION=\"0.60.19\"");
all("index.html",[
 ["\"./src/version.js?v=60010\":\"./src/version.js?v=60018\"","\"./src/version.js?v=60010\":\"./src/version.js?v=60019\""],
 ["\"./src/ai-client.js?v=60010\":\"./src/v06017-ai-client-hotfix.js?v=60017\"","\"./src/ai-client.js?v=60010\":\"./src/v06019-ai-client-hotfix.js?v=60019\""],
 ["\"./src/game-engine.js?v=60006\":\"./src/v06011-game-engine-hotfix.js?v=60018\"","\"./src/game-engine.js?v=60006\":\"./src/v06019-game-engine-hotfix.js?v=60019\""],
 ["\"./src/contextual-actions.js?v=60010\":\"./src/v06015-contextual-actions-hotfix.js?v=60015\"","\"./src/contextual-actions.js?v=60010\":\"./src/v06019-contextual-actions-hotfix.js?v=60019\""],
 ["./src/v06015-runtime-ui-hotfix.js?v=60018","./src/v06019-runtime-ui-hotfix.js?v=60019"]
]);
one("app.js","const effective=assessment?.verdict===\"ADJUST\"&&assessment.normalizedAction?assessment.normalizedAction:requested;","const effective=assessment?.playerVisibleAction||requested;");
one("app.js","worldId:state.world?.id||null,clock:gameplayDebugClock(state),location:String(state.player?.location||state.world?.state?.location||\"\"),","worldId:state.world?.id||null,clock:gameplayDebugClock(state),location:String(state.player?.location||state.world?.state?.location||\"\"),playerVitals:{hp:Number(state.player?.hp)||0,maxHp:Number(state.player?.maxHp)||0,satiety:Number(state.player?.survival?.satiety??100),fatigue:Number(state.player?.survival?.fatigue??0),exposure:Number(state.player?.survival?.exposure??0),injury:Number(state.player?.survival?.injury??0),magicStrain:Number(state.player?.magic?.strain??0)},");
one("app.js","if(prev.location!==next.location)recordDebug(\"GAME_LOCATION_CHANGED\",{...meta,from:prev.location,to:next.location});","if(prev.location!==next.location)recordDebug(\"GAME_LOCATION_CHANGED\",{...meta,from:prev.location,to:next.location});\n for(const field of [\"hp\",\"maxHp\",\"satiety\",\"fatigue\",\"exposure\",\"injury\",\"magicStrain\"]){const before=prev.playerVitals?.[field],after=next.playerVitals?.[field];if(Number(before)!==Number(after))recordDebug(\"GAME_PLAYER_STATE_CHANGED\",{...meta,field,from:before,to:after,delta:Number(after)-Number(before)})}");
one("app.js","function gameplayDebugDetail(entry){\n const d=entry?.data||{};","function gameplayDebugDetail(entry){\n const d=entry?.data||{};\n if(entry.type===\"GAME_PLAYER_STATE_CHANGED\")return String(d.field||\"state\")+\" · \"+String(d.from??\"?\")+\" → \"+String(d.to??\"?\")+(Number.isFinite(Number(d.delta))?\" · Δ\"+(Number(d.delta)>0?\"+\":\"\")+String(d.delta):\"\");");
one("app.js","function openDebugPanel(){","function debugEventDetail(event){const raw=String(event?.action||event?.reason||event?.summary||event?.mode||\"\");if(activeLocale!==\"ja\"||!raw||!hasLocaleLeak(raw,\"ja\"))return raw;return ({NPC_AUTONOMOUS_ACTION:\"NPCの自律行動（内部テレメトリ）\",FACTION_ACTION:\"勢力の自律行動（内部テレメトリ）\",WORLD_EVENT:\"世界イベント（内部テレメトリ）\"})[String(event?.type||\"\")]||\"内部テレメトリ（日本語表示）\"}\nfunction openDebugPanel(){");
one("app.js","esc(e.action||e.reason||e.summary||e.mode||\"\")","esc(debugEventDetail(e))");

for(const path of ["test/version-0551-release.test.js","test/version-ui.test.js"]){let text=read(path);text=text.replaceAll("0.60.18","0.60.19").replaceAll("v06015-runtime-ui-hotfix","v06019-runtime-ui-hotfix").replaceAll("v06011-game-engine-hotfix","v06019-game-engine-hotfix").replaceAll("v06017-ai-client-hotfix","v06019-ai-client-hotfix").replaceAll("v06015-contextual-actions-hotfix","v06019-contextual-actions-hotfix").replaceAll("60018","60019").replaceAll("60017","60019");if(path.endsWith("version-0551-release.test.js"))text=text.replaceAll("60015","60019");write(path,text)}
console.log("v0.60.19 patch complete");
