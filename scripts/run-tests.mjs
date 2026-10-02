import {readdirSync} from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";

const dir=path.resolve("test");
const files=readdirSync(dir).filter(name=>name.endsWith(".test.js")).sort().map(name=>path.join("test",name));
if(!files.length){console.error("No test files found in ./test");process.exit(2)}
console.log(`Elyndra suite: ${files.length} canonical test files from ./test (generated output snapshots excluded).`);
const result=spawnSync(process.execPath,["--test",...files],{stdio:"inherit"});
process.exit(result.status??1);
