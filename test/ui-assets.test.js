import test from "node:test";
import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";

test("generated UI artwork is split into live frame background and icon layers",async()=>{
 const assets=[
  "assets/ui/frames/scene-frame.webp",
  "assets/ui/frames/panel-frame.webp",
  "assets/ui/frames/command-frame.webp",
  "assets/ui/backgrounds/scene-bg-atlas.webp",
  "assets/ui/icons/nav-icons.webp"
 ];
 for(const path of assets){
  const info=await stat(new URL("../"+path,import.meta.url));
  assert.ok(info.size>100,path+" should contain binary artwork");
 }
 const [css,html]=await Promise.all([
  readFile(new URL("../styles.css",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8")
 ]);
 assert.match(html,/data-ui="asset-layered-v3"/);
 for(const path of assets)assert.ok(css.includes(path),path+" should be referenced by live CSS");
 assert.match(css,/--ely-scene-position/);
 assert.match(css,/background-size:100% 100%,500% 100%/);
});
