import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {applyDocumentLocale,uiText} from "../src/locale-runtime.js";

test("translating implicit option labels preserves their canonical template value",()=>{
 const textNode={nodeValue:"小型"},attributes=new Map(),option={
  get value(){return attributes.get("value")??textNode.nodeValue;},
  setAttribute(key,value){attributes.set(key,String(value));}
 };
 const doc={querySelector:()=>null,createTreeWalker:()=>{
  let visited=false;return {currentNode:null,nextNode(){if(visited)return false;visited=true;this.currentNode=textNode;return true;}};
 }};
 const root={ownerDocument:doc,querySelector:()=>null,querySelectorAll:selector=>selector==="option:not([value])"&&!attributes.has("value")?[option]:[]};
 applyDocumentLocale("ja",root);
 assert.equal(textNode.nodeValue,"小規模");assert.equal(option.value,"小型");
 applyDocumentLocale("en",root);assert.equal(textNode.nodeValue,"Small");assert.equal(option.value,"小型");
 applyDocumentLocale("zh-Hant",root);assert.equal(textNode.nodeValue,"小型");assert.equal(option.value,"小型");
});

test("restored Genesis labels translate without altering the form option values",()=>{
 for(const [key,ja,en] of [["世界形狀","世界の形状","World shape"],["歷史縱深","歴史の深さ","Historical depth"],["玩家中心性","プレイヤーの中心性","Player centrality"],["失落文明數量","失われた文明の数","Lost civilizations"]]){
  assert.equal(uiText(key,"ja"),ja);assert.equal(uiText(key,"en"),en);
 }
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8"),scale=html.match(/<select id="scale">([\s\S]*?)<\/select>/)[1];
 for(const value of ["小型","中型","大型"])assert.ok(scale.includes(`value="${value}"`));
 assert.match(html,/<option value="FRACTURED">裂隙群陸<\/option>/);
});

test("programmatic creator changes refresh the live preview and the localized Genesis review",()=>{
 const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const review=source.slice(source.indexOf("function renderCreatorReview(){"),source.indexOf("function syncAdvancedCreatorModes(){"));
 const element={innerHTML:""},calls=[],fields={genre:"浮遊群島",scale:"小規模",worldShape:"裂隙群陸",historicalDepth:"深時古史",routeDensity:"密集",crisisIntensity:"高"};
 runInNewContext(review+"\nrenderCreatorReview();",{
  activeLocale:"ja",syncCustomWorldStyle(){},
  creatorRaw:()=>({requiredElements:"",forbiddenElements:"",storyPreferences:"",worldStyle:"浮空群島",worldScale:"小型",targetPlayHours:8,playerName:"旅人"}),
  $:()=>element,creatorField:id=>({selectedOptions:[{textContent:fields[id]||id}],dataset:{}}),
  creatorReviewText:()=>({hours:"時間",aiName:"旅人",items:"項目",none:"なし",tendency:"傾向",must:"必須",forbid:"禁止",contract:"憲章"}),
  esc:value=>String(value).replaceAll("<","&lt;"),localizedStaticText:value=>"ja:"+value,
  syncCreatorConsolePreview:locale=>calls.push(locale)
 });
 assert.deepEqual(calls,["ja"]);
 assert.equal((element.innerHTML.match(/creator-review-card/g)||[]).length,5);
 for(const label of Object.values(fields))assert.ok(element.innerHTML.includes("ja:"+label));
 assert.equal(element.innerHTML.includes("ja:浮空群島"),false,"review uses the translated option label instead of the canonical genre value");
 assert.equal(element.innerHTML.includes("ja:小型"),false,"review uses the translated scale label while preserving its canonical value");
 assert.ok(element.innerHTML.includes("WORLD GENESIS"));
});
