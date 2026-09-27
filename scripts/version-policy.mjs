const NON_PRODUCT_PREFIXES=[".github/","docs/","scripts/","test/"];
const NON_PRODUCT_FILES=new Set([
 ".env.example",
 ".gitignore",
 "README.md",
 "package.json",
 "src/version.js"
]);

export function normalizeRepoPath(value){
 return String(value||"").replace(/\\/g,"/").replace(/^\.\//,"")
}

export function isNonProductPath(value){
 const path=normalizeRepoPath(value);
 return NON_PRODUCT_FILES.has(path)||NON_PRODUCT_PREFIXES.some(prefix=>path.startsWith(prefix))
}

export function normalizeReleaseMetadata(value,content){
 const path=normalizeRepoPath(value);
 if(content==null)return null;
 let normalized=String(content).replace(/\?v=\d+/g,"?v=<CACHE>");
 if(path==="src/version.js")normalized=normalized.replace(/APP_VERSION\s*=\s*["'][^"']+["']/g,'APP_VERSION="<VERSION>"');
 return normalized
}

export function isProductChange({path,before,after}){
 const normalizedPath=normalizeRepoPath(path);
 if(isNonProductPath(normalizedPath))return false;
 if(before==null||after==null)return before!==after;
 return normalizeReleaseMetadata(normalizedPath,before)!==normalizeReleaseMetadata(normalizedPath,after)
}

export function parseSemver(value){
 const match=String(value).match(/^(\d+)\.(\d+)\.(\d+)$/);
 if(!match)throw new Error("INVALID_SEMVER: "+value);
 return match.slice(1).map(Number)
}

export function compareSemver(a,b){
 const left=parseSemver(a),right=parseSemver(b);
 for(let i=0;i<3;i++){
  if(left[i]>right[i])return 1;
  if(left[i]<right[i])return -1
 }
 return 0
}

export function evaluateVersionPolicy({currentVersion,baseVersion,productChanges=[]}){
 const comparison=compareSemver(currentVersion,baseVersion);
 if(comparison<0)return {ok:false,code:"VERSION_REGRESSION"};
 if(productChanges.length&&comparison<=0)return {ok:false,code:"VERSION_NOT_BUMPED"};
 if(!productChanges.length&&comparison>0)return {ok:false,code:"VERSION_BUMP_WITHOUT_PRODUCT_CHANGE"};
 return {ok:true,code:productChanges.length?"PRODUCT_VERSION_BUMP_OK":"NON_PRODUCT_VERSION_STABLE"}
}
