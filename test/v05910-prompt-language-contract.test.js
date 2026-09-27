import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {CANONICAL_PROMPT_CONTRACT,composePromptLanguageContract} from "../src/prompt-language-contract.js";

// Release-level regression: source/control prompt language must never become the runtime output language.
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("v0.59.10 prompt contract treats source prompt language as control-only",()=>{
 assert.match(CANONICAL_PROMPT_CONTRACT,/control data only/i);
 assert.match(CANONICAL_PROMPT_CONTRACT,/Never imitate the language of examples/i);
 assert.match(CANONICAL_PROMPT_CONTRACT,/JSON keys, IDs, enum values/i);
 assert.match(CANONICAL_PROMPT_CONTRACT,/player-facing human-readable values/i);
});

test("v0.59.10 composer removes stale language overrides and keeps runtime locale authoritative",()=>{
 const previous="Task rules in Chinese.\n\nRUNTIME LANGUAGE OVERRIDE: old language. JSON keys stay unchanged.";
 const runtime="RUNTIME LANGUAGE OVERRIDE: all player-visible natural-language output MUST be natural Japanese. JSON keys, IDs and enums stay unchanged.";
 const out=composePromptLanguageContract(previous,runtime);
 assert.equal((out.match(/RUNTIME LANGUAGE OVERRIDE:/g)||[]).length,1);
 assert.match(out,/Task rules in Chinese/);
 assert.ok(out.endsWith(runtime));
});

test("v0.59.10 direct and server AI share the canonical composer",async()=>{
 const [direct,server]=await Promise.all([read("../src/ai-settings.js"),read("../api/_ai.js")]);
 assert.match(direct,/prompt-language-contract\.js\?v=59010/);
 assert.match(direct,/system:composePromptLanguageContract\(args\?\.system,runtimeLanguage\)/);
 assert.doesNotMatch(direct,/Provider 在 .* 秒內未完成回應/);
 assert.match(server,/prompt-language-contract\.js/);
 assert.match(server,/system=composePromptLanguageContract\(system,languageContract\(normalizeLocale\(locale\)\)\)/);
});
