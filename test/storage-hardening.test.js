import test from "node:test";
import assert from "node:assert/strict";
import {parseImportEnvelope,safeSaveFilename} from "../src/storage.js";

test("save import rejects oversized and malformed JSON before migration",()=>{
 assert.throws(()=>parseImportEnvelope("{}",16*1024*1024+1),/SAVE_FILE_TOO_LARGE/);
 assert.throws(()=>parseImportEnvelope("{"),/SAVE_JSON_INVALID/);
 assert.throws(()=>parseImportEnvelope("[]"),/SAVE_ENVELOPE_INVALID/)
});

test("save import enforces UTF-8 byte size even without a trustworthy declared file size",()=>{
 const huge="界".repeat(6_000_000);
 assert.throws(()=>parseImportEnvelope(huge,0),/SAVE_FILE_TOO_LARGE/)
});

test("export filename removes path and reserved characters while keeping a readable world name",()=>{
 assert.equal(safeSaveFilename('  星界/王國:*?"<>|  '),"星界 王國.elyndra");
 assert.equal(safeSaveFilename("..."),"world.elyndra");
 assert.equal(safeSaveFilename("A".repeat(120)),"A".repeat(80)+".elyndra")
});
