import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("v0.57.12 trusted retry keeps the download attribute on the same-origin HTTP bridge",async()=>{
 const source=await readFile(new URL("../src/autotest-download.js",import.meta.url),"utf8");
 const start=source.indexOf("function installTrustedRetryUpgrade");
 assert.ok(start>=0);
 const block=source.slice(start);
 assert.match(block,/anchor\.href=autotestDownloadHttpUrl/);
 assert.match(block,/anchor\.setAttribute\?\.\("download",filename\)/);
 assert.doesNotMatch(block,/anchor\.removeAttribute\("download"\)/);
 assert.match(block,/service-worker-http-download/);
});
