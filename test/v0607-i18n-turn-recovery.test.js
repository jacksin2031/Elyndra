import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("v0.60.7 suggestion execution uses the same localized action players see",async()=>{
 const app=await read("../app.js");
 assert.match(app,/sessionTranslatedText/);
 assert.match(app,/function localizedActionText/);
 assert.match(app,/runAction\("free",localizedActionText\(x\.action,x\.kind\),\{suggestion:x\}\)/);
 assert.match(app,/requested=options\?\.suggestion\?localizedActionText\(rawRequested,options\.suggestion\?\.kind\):rawRequested/);
});

test("v0.60.7 first game reveal no longer blocks on a second DOM translation call",async()=>{
 const app=await read("../app.js");
 assert.match(app,/refresh\(\{skipRenderedLocale:true\}\)/);
 assert.match(app,/INITIAL_SCENE_PRESENTED/);
 assert.match(app,/void ensureRenderedLocale\("post_creation_game",\$\("#game"\)\)/);
 assert.doesNotMatch(app,/activeLocale==="zh-Hant"\|\|await ensureRenderedLocale\("post_creation_game"/);
});

test("v0.60.7 rate limit and slow scene paths release player control deterministically",async()=>{
 const app=await read("../app.js");
 assert.match(app,/TURN_RATE_LIMIT_FAST_FALLBACK/);
 assert.match(app,/foregroundSceneCtrl\.abort\(\)/);
 assert.match(app,/PLAYER_ACTION_SCENE_DEADLINE_FALLBACK/);
 assert.match(app,/deadlineMs:18000/);
 assert.match(app,/rate_limit_fallback/);
});
