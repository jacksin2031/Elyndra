import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {evaluateVersionPolicy,isProductChange,normalizeRepoPath} from "./version-policy.mjs";

const pkg=JSON.parse(readFileSync("package.json","utf8"));
const versionSource=readFileSync("src/version.js","utf8");
const match=versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
if(!match)throw new Error("APP_VERSION_NOT_FOUND");
const appVersion=match[1];
if(pkg.version!==appVersion)throw new Error(`VERSION_MISMATCH: package.json=${pkg.version} APP_VERSION=${appVersion}`);

function git(...args){
 return execFileSync("git",args,{encoding:"utf8"}).trim()
}
function baseRevision(value){
 const ref=String(value||"").trim();
 if(!ref)return "";
 if(/^[0-9a-f]{7,40}$/i.test(ref)||ref.startsWith("origin/"))return ref;
 return `origin/${ref}`
}
function showFile(revision,path){
 try{return execFileSync("git",["show",`${revision}:${path}`],{encoding:"utf8"})}
 catch{return null}
}

if(process.env.GITHUB_EVENT_NAME==="pull_request"){
 const base=baseRevision(process.env.GITHUB_BASE_REF||"main");
 let basePkg;
 try{basePkg=JSON.parse(execFileSync("git",["show",`${base}:package.json`],{encoding:"utf8"}))}
 catch(e){throw new Error("VERSION_BASE_READ_FAILED: "+e.message)}

 let changed;
 try{
  changed=git("diff","--name-only",`${base}...HEAD`).split(/\r?\n/).map(normalizeRepoPath).filter(Boolean)
 }catch(e){
  throw new Error("VERSION_BASE_DIFF_FAILED: "+e.message)
 }

 const productChanges=[];
 for(const path of changed){
  const before=showFile(base,path);
  const after=showFile("HEAD",path);
  if(isProductChange({path,before,after}))productChanges.push(path)
 }

 const policy=evaluateVersionPolicy({currentVersion:pkg.version,baseVersion:basePkg.version,productChanges});
 if(!policy.ok){
  if(policy.code==="VERSION_REGRESSION")throw new Error(`VERSION_REGRESSION: PR version ${pkg.version} must not be lower than ${basePkg.version}`);
  if(policy.code==="VERSION_NOT_BUMPED")throw new Error(`VERSION_NOT_BUMPED: product changes require a version greater than ${basePkg.version}: ${productChanges.join(", ")}`);
  if(policy.code==="VERSION_BUMP_WITHOUT_PRODUCT_CHANGE")throw new Error(`VERSION_BUMP_WITHOUT_PRODUCT_CHANGE: ${pkg.version} > ${basePkg.version}, but the PR only changes CI/tests/docs/tooling/version/cache metadata`);
 }
 console.log(`Version PR policy OK: ${policy.code}; product changes=${productChanges.join(", ")||"none"}`)
}
console.log(`Version contract OK: v${pkg.version}`);
