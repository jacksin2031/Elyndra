import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";

const pkg=JSON.parse(readFileSync("package.json","utf8"));
const versionSource=readFileSync("src/version.js","utf8");
const match=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
if(!match)throw new Error("APP_VERSION_NOT_FOUND");
const appVersion=match[1];
if(pkg.version!==appVersion)throw new Error(`VERSION_MISMATCH: package.json=${pkg.version} APP_VERSION=${appVersion}`);

function parse(v){
 const m=String(v).match(/^(\d+)\.(\d+)\.(\d+)$/);
 if(!m)throw new Error("INVALID_SEMVER: "+v);
 return m.slice(1).map(Number)
}
function greater(a,b){
 const x=parse(a),y=parse(b);
 for(let i=0;i<3;i++){if(x[i]>y[i])return true;if(x[i]<y[i])return false}
 return false
}
if(process.env.GITHUB_EVENT_NAME==="pull_request"){
 const base=process.env.GITHUB_BASE_REF||"main";
 let basePkg;
 try{basePkg=JSON.parse(execFileSync("git",["show",`origin/${base}:package.json`],{encoding:"utf8"}))}
 catch(e){throw new Error("VERSION_BASE_READ_FAILED: "+e.message)}
 if(!greater(pkg.version,basePkg.version))throw new Error(`VERSION_NOT_BUMPED: PR version ${pkg.version} must be greater than ${basePkg.version}`);
}
console.log(`Version contract OK: v${pkg.version}`);
