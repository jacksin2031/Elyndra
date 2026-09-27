import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {localizedStaticText} from "../src/v0594-static-i18n.js";

test("world creation preset labels are deterministic in all supported locales",()=>{
 assert.equal(localizedStaticText("魔法學院","en"),"Magic Academy");
 assert.equal(localizedStaticText("魔法學院","ja"),"魔法学院");
 assert.equal(localizedStaticText("魔法學院","zh-Hans"),"魔法学院");
 assert.equal(localizedStaticText("魔法學院","zh-Hant"),"魔法學院");
 assert.equal(localizedStaticText("氛圍與限制","en"),"Tone & Constraints");
 assert.equal(localizedStaticText("氛圍與限制","ja"),"雰囲気・制約");
});

test("v0.59.4 creator uses stable canonical category values and localized labels",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/const ALL_RULE_TAGS="__all__"/);
 assert.match(app,/value="\$\{esc\(value\)\}"/);
 assert.match(app,/localizedStaticText\(tag,activeLocale\)/);
 assert.match(app,/category===ALL_RULE_TAGS\|\|name===category/);
});

test("first game reveal preserves localization without blocking post-creation UI",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/refresh\(\{skipRenderedLocale:true\}\)/);
 assert.match(app,/void ensureRenderedLocale\("post_creation_game",\$\("#game"\)\)/);
 assert.match(app,/ensureRenderedLocale\("continue_game",\$\("#game"\)\)/);
 assert.match(app,/localizedActionText\(p\.label,x\.kind\)/);
 assert.doesNotMatch(app,/activeLocale==="zh-Hant"\|\|await ensureRenderedLocale\("post_creation_game"/);
});
