import {readdirSync,statSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {join} from "node:path";

function walk(dir){
 const out=[];
 for(const name of readdirSync(dir)){
  const path=join(dir,name),stat=statSync(path);
  if(stat.isDirectory())out.push(...walk(path));
  else if(path.endsWith(".js")||path.endsWith(".mjs"))out.push(path)
 }
 return out
}
const files=["app.js",...walk("api"),...walk("src"),...walk("scripts")].filter(x=>!x.endsWith("check-js.mjs"));
for(const file of files)execFileSync(process.execPath,["--check",file],{stdio:"inherit"});
console.log("JavaScript syntax contract OK: "+files.length+" files");
