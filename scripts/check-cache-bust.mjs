import {readFileSync,readdirSync} from "node:fs";
import {execFileSync} from "node:child_process";
import path from "node:path";

export function cacheToken(version){
 const m=String(version||"").match(/^(\d+)\.(\d+)\.(\d+)$/);
 if(!m)throw new Error("CACHE_VERSION_INVALID: "+version);
 const [,major,minor,patch]=m.map(Number);
 if([major,minor,patch].some(x=>x<0||x>=1000))throw new Error("CACHE_VERSION_RANGE_INVALID: "+version);
 return String(major*1_000_000+minor*1_000+patch)
}

const root=process.cwd();
const pkg=JSON.parse(readFileSync(path.join(root,"package.json"),"utf8"));
const expected=cacheToken(pkg.version);
const base=process.env.CACHE_BASE_REF||process.env.GITHUB_BASE_REF||"";

if(!base){
 console.log(`Cache contract skipped outside PR/base comparison (expected token ${expected}).`);
 process.exit(0)
}

function git(...args){
 return execFileSync("git",args,{encoding:"utf8"}).trim()
}
function normalizeRepoPath(value){
 return value.split(path.sep).join("/").replace(/^\.\//,"")
}
function baseRevision(value){
 const ref=String(value||"").trim();if(!ref)return "";if(/^[0-9a-f]{7,40}$/i.test(ref)||ref.startsWith("origin/"))return ref;return `origin/${ref}`
}
function listSrcModules(dir="src"){
 const abs=path.join(root,dir),out=[];
 for(const name of readdirSync(abs,{withFileTypes:true})){
  const rel=normalizeRepoPath(path.join(dir,name.name));
  if(name.isDirectory())out.push(...listSrcModules(rel));
  else if(name.isFile()&&name.name.endsWith(".js"))out.push(rel)
 }
 return out
}
function moduleEdges(importer){
 const source=readFileSync(path.join(root,importer),"utf8"),edges=[];
 const patterns=[
  /(?:from\s+|import\s+)["'](\.{1,2}\/[^"'?]+\.js)(?:\?v=(\d+))?["']/g,
  /import\(\s*["'](\.{1,2}\/[^"'?]+\.js)(?:\?v=(\d+))?["']\s*\)/g
 ];
 for(const pattern of patterns)for(const m of source.matchAll(pattern)){
  const target=normalizeRepoPath(path.relative(root,path.resolve(path.dirname(path.join(root,importer)),m[1])));
  edges.push({importer,target,token:m[2]||null,specifier:m[1]})
 }
 return edges
}

let changed;
try{
 changed=git("diff","--name-only",`${baseRevision(base)}...HEAD`).split(/\r?\n/).map(normalizeRepoPath).filter(Boolean)
}catch(e){
 throw new Error("CACHE_BASE_DIFF_FAILED: "+e.message)
}

const html=readFileSync(path.join(root,"index.html"),"utf8");
const importMapImports={};
for(const m of html.matchAll(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi)){
 try{Object.assign(importMapImports,JSON.parse(m[1])?.imports||{})}catch{}
}
function edgeImportMapKey(edge,token){
 const importerDir=path.posix.dirname(normalizeRepoPath(edge.importer));
 const target=path.posix.normalize(path.posix.join(importerDir,edge.specifier));
 return `./${target.replace(/^\.\//,"")}?v=${token}`
}
function edgeHasExpectedImportMapOverride(edge){
 if(!edge?.token)return false;
 const from=edgeImportMapKey(edge,edge.token),to=String(importMapImports[from]||"");
 return to===edgeImportMapKey(edge,expected)
}

const modules=["app.js",...listSrcModules()];
const moduleSet=new Set(modules);
const edges=modules.flatMap(moduleEdges);
const reverse=new Map();
for(const edge of edges){
 if(!reverse.has(edge.target))reverse.set(edge.target,[]);
 reverse.get(edge.target).push(edge)
}

const impacted=new Set(changed.filter(x=>moduleSet.has(x)));
const queue=[...impacted],violations=[];
while(queue.length){
 const target=queue.shift();
 for(const edge of reverse.get(target)||[]){
  const remapped=edgeHasExpectedImportMapOverride(edge);
  if(edge.token!==expected&&!remapped)violations.push(`${edge.importer} -> ${target} uses v=${edge.token||"MISSING"}, expected v=${expected}`);
  if(remapped)continue;
  if(!impacted.has(edge.importer)){impacted.add(edge.importer);queue.push(edge.importer)}
 }
}

if(impacted.has("app.js")){
 const m=html.match(/<script\b[^>]*\bsrc=["']app\.js\?v=(\d+)["']/i);
 if(!m||m[1]!==expected)violations.push(`index.html -> app.js uses v=${m?.[1]||"MISSING"}, expected v=${expected}`)
}
const linkedStyles=[...html.matchAll(/<link\b[^>]*\bhref=["']([^"'?]+\.css)(?:\?v=(\d+))?["']/gi)];
for(const stylesheet of ["styles.css","creator.css","world-surfaces.css"]){
 if(!changed.includes(stylesheet))continue;
 const link=linkedStyles.find(m=>m[1]===stylesheet);
 if(!link||link[2]!==expected)violations.push(`index.html -> ${stylesheet} uses v=${link?.[2]||"MISSING"}, expected v=${expected}`)
}

if(violations.length){
 throw new Error("CACHE_BUST_STALE:\n"+[...new Set(violations)].map(x=>" - "+x).join("\n"))
}
console.log(`Cache contract OK: v${pkg.version} token=${expected}; changed browser modules=${[...impacted].sort().join(", ")||"none"}`);
