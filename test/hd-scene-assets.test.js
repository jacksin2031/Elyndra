import test from "node:test";
import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";

const sceneNames=[
 "royal-fantasy-2560x1440",
 "dark-fantasy-2560x1440",
 "eastern-fantasy-2560x1440",
 "steam-magic-2560x1440",
 "apocalypse-2560x1440"
];

function avifDimensions(buffer){
 const marker=Buffer.from("ispe");
 const i=buffer.indexOf(marker);
 if(i<0)return {width:0,height:0};
 return {width:buffer.readUInt32BE(i+8),height:buffer.readUInt32BE(i+12)};
}

test("every live raster scene master is a real 2560x1440 AVIF",async()=>{
 for(const name of sceneNames){
  const url=new URL("../assets/ui/backgrounds/"+name+".avif",import.meta.url);
  const [buffer,info]=await Promise.all([readFile(url),stat(url)]);
  const dims=avifDimensions(buffer);
  assert.equal(dims.width,2560,name+" AVIF width");
  assert.equal(dims.height,1440,name+" AVIF height");
  assert.ok(info.size>60000,name+" should contain detailed raster artwork");
  assert.equal(buffer.subarray(4,8).toString("ascii"),"ftyp");
  assert.equal(buffer.subarray(8,12).toString("ascii"),"avif");
 }
});

test("SVG scene masters remain as fallback while AVIF is the live primary layer",async()=>{
 const css=await readFile(new URL("../styles.css",import.meta.url),"utf8");
 for(const name of sceneNames){
  assert.ok(css.includes(name+".avif"),name+" AVIF should be referenced");
  assert.ok(css.includes(name+".svg"),name+" SVG fallback should remain");
 }
 assert.match(css,/--ely-scene-raster:/);
 assert.match(css,/--ely-scene-fallback:/);
 assert.match(css,/var\(--ely-scene-raster\),\s*\n\s*var\(--ely-scene-fallback\)/);
 assert.match(css,/background-size:100% 100%,100% 100%,cover,cover!important/);
});
