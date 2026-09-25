import {readdirSync,readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";
const dir=path.resolve("test");
const related=/(?:\bdownload\b|autotest-(?:download|iab|save|export|copy|transfer|drag))/i;
const candidates=readdirSync(dir).filter(x=>x.endsWith(".test.js")).sort();
const run=[],skipped=[];
for(const name of candidates){const file=path.join("test",name),source=readFileSync(file,"utf8");if(related.test(name+"\n"+source))skipped.push(file);else run.push(file)}
console.log(`Non-download suite: ${run.length} test files; explicitly skipped ${skipped.length} download/IAB/export/save/transfer-related files.`);
console.log("Skipped by policy:\n"+skipped.map(x=>" - "+x).join("\n"));
if(!run.length)process.exit(2);
const result=spawnSync(process.execPath,["--test",...run],{stdio:"inherit"});
process.exit(result.status??1);
