import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {v06025ObservationSuccessNarrative,v06025RefineObservationEngineText} from "../src/v06025-game-engine-hotfix.js";
import {v06025ObservationNoDetailNarrative,v06025WeakObservationNarrative,v06025RefineObservationScene} from "../src/v06025-ai-client-hotfix.js";

const action="足跡を観察し、どちらへ続くか確かめる";

test("v0.60.25 successful OBSERVE engine fallback no longer claims a generic achievement as a concrete finding",()=>{
 const generic=`塩霧の崖道で「${action}」を達成しました。`;
 const out=v06025RefineObservationEngineText(generic,action,{success:true,grade:"SUCCESS"});
 assert.match(out,/観察判定は成功しました/);
 assert.match(out,/新しい具体的な発見内容までは確定していません/);
 assert.match(out,/推測で補わず/);
 assert.doesNotMatch(out,/達成しました/);
});

test("v0.60.25 critical observation uses the same no-fabrication boundary",()=>{
 const generic=`塩霧の崖道で「${action}」を達成し、予想以上に順調な結果になりました。`;
 const out=v06025RefineObservationEngineText(generic,action,{success:true,grade:"CRITICAL_SUCCESS"});
 assert.match(out,/観察判定は大成功しました/);
 assert.match(out,/確認できた事実だけ/);
});

test("v0.60.25 weak successful observation scene is made explicit instead of inventing footprints",()=>{
 const weak={narrative:`塩霧の崖道で「${action}」を達成しました。`,outcome:"SUCCESS",sceneTitle:"足跡を見る",suggestions:[]};
 assert.equal(v06025WeakObservationNarrative(weak.narrative),true);
 const out=v06025RefineObservationScene(weak,action,{success:true,grade:"SUCCESS"});
 assert.match(out.narrative,/新しい具体的な発見内容は確定できませんでした/);
 assert.match(out.narrative,/方向・人数・時刻などは推測せず/);
 assert.equal(out.outcome,"SUCCESS");
});

test("v0.60.26 compare-and-record Japanese observation wording is protected by the successful-observation scene guard",()=>{
 const compareAction="金色の光が消える瞬間と霧の流れを見比べ、変化が起きる条件を記録する。";
 const weak={narrative:`塩霧の崖道で「${compareAction}」を達成しました。`,outcome:"SUCCESS",sceneTitle:"変化を記録する",suggestions:[]};
 const out=v06025RefineObservationScene(weak,compareAction,{success:true,grade:"SUCCESS"});
 assert.match(out.narrative,/観察判定は成功しました/);
 assert.match(out.narrative,/新しい具体的な発見内容は確定できませんでした/);
 assert.doesNotMatch(out.narrative,/達成しました/);
});

test("v0.60.25 concrete grounded observation narration is preserved",()=>{
 const concrete={narrative:"濡れた石の上に、すでに画面上で確認済みの足跡が途切れず残っている。",outcome:"SUCCESS",sceneTitle:"足跡を見る",suggestions:[]};
 assert.equal(v06025WeakObservationNarrative(concrete.narrative),false);
 assert.equal(v06025RefineObservationScene(concrete,action,{success:true,grade:"SUCCESS"}),concrete);
});

test("v0.60.25 failure narration is not rewritten by the successful-observation guard",()=>{
 const scene={narrative:"霧が濃く、足跡を十分に追えなかった。",outcome:"FAILURE"};
 assert.equal(v06025RefineObservationScene(scene,action,{success:false,grade:"FAILURE"}),scene);
 assert.match(v06025ObservationSuccessNarrative(action),/Engineで確認できた範囲/);
 assert.match(v06025ObservationNoDetailNarrative(action),/確認済みの事実だけ/);
});

test("v0.60.26 release wiring keeps v0.60.24 stale-turn, weather and Japanese projections while retaining v0.60.25 observation guards",async()=>{
 const [html,pkgText,version,workflow,game,client,client24]=await Promise.all([
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../package.json",import.meta.url),"utf8"),
  readFile(new URL("../src/version.js",import.meta.url),"utf8"),
  readFile(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8"),
  readFile(new URL("../src/v06025-game-engine-hotfix.js",import.meta.url),"utf8"),
  readFile(new URL("../src/v06025-ai-client-hotfix.js",import.meta.url),"utf8"),
  readFile(new URL("../src/v06024-ai-client-hotfix.js",import.meta.url),"utf8")
 ]);
 assert.equal(JSON.parse(pkgText).version,"0.60.26");
 assert.match(version,/APP_VERSION="0\.60\.26"/);
 assert.match(html,/"\.\/src\/version\.js\?v=60010":"\.\/src\/version\.js\?v=60026"/);
 assert.match(html,/"\.\/src\/game-engine\.js\?v=60006":"\.\/src\/v06025-game-engine-hotfix\.js\?v=60025"/);
 assert.match(html,/"\.\/src\/ai-client\.js\?v=60010":"\.\/src\/v06025-ai-client-hotfix\.js\?v=60026"/);
 assert.match(html,/v06024-runtime-ui-hotfix\.js\?v=60024/);
 assert.match(html,/"\.\/src\/weather-engine\.js\?v=57025":"\.\/src\/v06024-weather-engine-hotfix\.js\?v=60024"/);
 assert.match(html,/"\.\/src\/talent-engine\.js\?v=60004":"\.\/src\/v06024-talent-engine-hotfix\.js\?v=60024"/);
 assert.match(html,/"\.\/src\/v06015-ja-visible-text\.js\?v=60018":"\.\/src\/v06024-ja-visible-text-hotfix\.js\?v=60024"/);
 assert.match(game,/v06019-game-engine-hotfix\.js\?v=60019/);
 assert.match(client,/v06024-ai-client-hotfix\.js\?v=60026/);
 assert.match(client24,/v06019-ai-client-hotfix\.js\?v=60026/);
 assert.match(workflow,/Focused v0\.60\.26 regressions/);
 assert.match(workflow,/version\.js\?v=60026/);
 assert.match(workflow,/v0\\\.60\\\.26/);
});
