import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const scenes=[
 "royal-fantasy-2560x1440.svg",
 "dark-fantasy-2560x1440.svg",
 "eastern-fantasy-2560x1440.svg",
 "steam-magic-2560x1440.svg",
 "apocalypse-2560x1440.svg"
];

test("every live scene master is at least 1920x1080",async()=>{
 for(const file of scenes){
  const source=await readFile(new URL("../assets/ui/backgrounds/"+file,import.meta.url),"utf8");
  const width=Number(source.match(/width="(\d+)"/)?.[1]||0);
  const height=Number(source.match(/height="(\d+)"/)?.[1]||0);
  assert.ok(width>=1920,file+" width must be at least 1920");
  assert.ok(height>=1080,file+" height must be at least 1080");
  assert.match(source,/viewBox="0 0 2560 1440"/);
 }
});

test("live scene CSS selects HD masters by world genre",async()=>{
 const css=await readFile(new URL("../styles.css",import.meta.url),"utf8");
 for(const file of scenes)assert.ok(css.includes(file),file+" should be referenced by live CSS");
 assert.match(css,/--ely-scene-bg:/);
 assert.match(css,/background-size:100% 100%,cover!important/);
 assert.doesNotMatch(css,/var\(--ely-scene-bg\).*500%/);
});
