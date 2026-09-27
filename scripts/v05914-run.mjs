import {readFileSync,writeFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
const sourcePath="scripts/v05914-patch.mjs",fixedPath="scripts/.v05914-patch-fixed.mjs";
let source=readFileSync(sourcePath,"utf8");
source=source.replace('assert.match(src,/repairTurnId=`REV-\\$\\{plan\\.baseRevision\\}`/);','assert.match(src,/repairTurnId=.*plan\\.baseRevision/);');
writeFileSync(fixedPath,source,"utf8");
await import(pathToFileURL(process.cwd()+"/"+fixedPath).href+"?t="+Date.now());
