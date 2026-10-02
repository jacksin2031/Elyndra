import {cpSync,mkdirSync,existsSync,readdirSync,statSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

export function buildPagesArtifact({root=process.cwd(),destination=path.join(root,".pages-artifact")}={}){
 const output=path.resolve(destination);
 if(existsSync(output)&&readdirSync(output).length)throw new Error("PAGES_ARTIFACT_DESTINATION_NOT_EMPTY");
 mkdirSync(output,{recursive:true});
 const files=["index.html","app.js","autotest-export-sw.js",...readdirSync(root).filter(name=>name.endsWith(".css"))];
 for(const name of files){const source=path.join(root,name);if(existsSync(source)&&statSync(source).isFile())cpSync(source,path.join(output,name))}
 const assetExtensions=new Set([".avif",".webp",".png",".jpg",".jpeg",".gif",".svg",".ico",".json",".woff",".woff2",".ttf",".otf",".mp3",".wav",".ogg",".mp4",".webm",".wasm"]);
 for(const name of ["src","assets"])cpSync(path.join(root,name),path.join(output,name),{recursive:true,filter:source=>statSync(source).isDirectory()||(name==="src"?[".js",".json",".wasm"].includes(path.extname(source)):assetExtensions.has(path.extname(source)))});
 return output
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log("Pages runtime artifact: "+buildPagesArtifact());
