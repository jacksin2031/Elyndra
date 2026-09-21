import test from "node:test";
import assert from "node:assert/strict";
import {parseModelJSON} from "../src/model-json.js";

test("model JSON parser accepts fenced JSON and surrounding prose",()=>{
 assert.deepEqual(parseModelJSON('```json\n{"ok":true}\n```'),{ok:true});
 assert.deepEqual(parseModelJSON('result follows: {"stage":"CORE_RULES"} done'),{stage:"CORE_RULES"})
});

test("model JSON parser normalizes native JSON syntax errors",()=>{
 assert.throws(
  ()=>parseModelJSON('{"worldBible":{"era":"潮紀" "tone":"灰暗"}}'),
  /INVALID_MODEL_JSON:.*Expected/
 )
});
