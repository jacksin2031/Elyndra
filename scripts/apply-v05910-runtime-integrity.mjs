import fs from "node:fs";
import path from "node:path";

const EXPECTED_TOKEN="59009";
const changed=new Set();

function read(file){return fs.readFileSync(file,"utf8")}
function write(file,text){fs.writeFileSync(file,text,"utf8");changed.add(file.replaceAll("\\","/"))}
function replaceOnce(file,oldText,newText){
 const text=read(file),count=text.split(oldText).length-1;
 if(count===0&&text.includes(newText))return false;
 if(count!==1)throw new Error(`${file}: expected exactly one match, got ${count}: ${oldText.slice(0,100)}`);
 write(file,text.replace(oldText,newText));return true
}
function replaceAllGuarded(file,oldText,newText,min=1){
 const text=read(file),count=text.split(oldText).length-1;
 if(count===0&&text.includes(newText))return false;
 if(count<min)throw new Error(`${file}: expected at least ${min} matches, got ${count}: ${oldText}`);
 write(file,text.split(oldText).join(newText));return true
}

// 1. Deferred state work must remain bound to the revision where it originated.
replaceOnce("src/state-sync.js",
 'const REBASE_SAFE=new Set(["NPC_RELATIONSHIP_SIGNAL","FACTION_REPUTATION_SIGNAL","QUEST_HINT","COMPANION_SIGNAL"]);',
 'const REBASE_SAFE=new Set(["NPC_RELATIONSHIP_SIGNAL","FACTION_REPUTATION_SIGNAL","QUEST_HINT","COMPANION_SIGNAL"]);\nexport const MAX_DEFERRED_REBASE_GAP=4;'
);
replaceOnce("src/state-sync.js",
 `export function deferredPlanFrom(plan={},baseRevision=0){\n return {...plan,mode:"DEFERRED",blocking:false,deferred:true,requiresStateAI:(plan.deferredCapabilities||[]).length>0,capabilities:[...(plan.deferredCapabilities||[])],dirty:[...(plan.deferredDirty||[])],baseRevision:Number(baseRevision)||0}\n}`,
 `export function deferredPlanFrom(plan={},baseRevision=0){\n const current=Math.max(0,Number(baseRevision)||0),rawOrigin=Number(plan?.originRevision??plan?.baseRevision),origin=Number.isFinite(rawOrigin)&&rawOrigin>=0?rawOrigin:current,revisionGap=Math.max(0,current-origin);\n return {...plan,mode:"DEFERRED",blocking:false,deferred:true,requiresStateAI:(plan.deferredCapabilities||[]).length>0,capabilities:[...(plan.deferredCapabilities||[])],dirty:[...(plan.deferredDirty||[])],baseRevision:origin,originRevision:origin,currentRevision:current,revisionGap,expired:revisionGap>MAX_DEFERRED_REBASE_GAP}\n}`
);
replaceOnce("src/state-sync.js",
 `export function assessPatchRevision(state,patch,plan={}){\n const current=currentStateRevision(state),base=Number(patch?.baseRevision);\n if(base===current)return {ok:true,rebased:false,currentRevision:current};\n const ops=Array.isArray(patch?.operations)?patch.operations:[],safe=plan.mode==="DEFERRED"&&ops.length>0&&ops.every(x=>REBASE_SAFE.has(String(x?.op||"").toUpperCase()));\n return safe?{ok:true,rebased:true,rebasedFrom:base,currentRevision:current}:{ok:false,stale:true,currentRevision:current,baseRevision:base}\n}`,
 `export function assessPatchRevision(state,patch,plan={}){\n const current=currentStateRevision(state),base=Number(patch?.baseRevision),rawOrigin=Number(plan?.originRevision??plan?.baseRevision),origin=Number.isFinite(rawOrigin)?rawOrigin:base,originGap=Math.max(0,current-origin);\n if(plan.mode==="DEFERRED"&&originGap>MAX_DEFERRED_REBASE_GAP)return {ok:false,stale:true,expired:true,currentRevision:current,baseRevision:base,originRevision:origin,revisionGap:originGap};\n if(base===current)return {ok:true,rebased:false,currentRevision:current};\n const ops=Array.isArray(patch?.operations)?patch.operations:[],gap=Math.max(0,current-base),safe=plan.mode==="DEFERRED"&&gap>0&&gap<=MAX_DEFERRED_REBASE_GAP&&ops.length>0&&ops.every(x=>REBASE_SAFE.has(String(x?.op||"").toUpperCase()));\n return safe?{ok:true,rebased:true,rebasedFrom:base,currentRevision:current,revisionGap:gap}:{ok:false,stale:true,currentRevision:current,baseRevision:base,revisionGap:gap}\n}`
);

// 2. Generated suggestions that claim possession must resolve to canonical inventory.
replaceOnce("src/contextual-actions.js",
 'const POSSESSION_ITEM=/從(?:口袋|背包|行囊|隨身物品|身上).{0,18}?(?:取出|拿出|掏出|抽出)\\s*([^，。；、,.;!?！？]{2,36})/i;',
 `const POSSESSION_ITEM_PATTERNS=[\n /從(?:口袋|背包|行囊|隨身(?:物品|攜帶(?:物)?)?|身上).{0,18}?(?:取出|拿出|掏出|抽出|摸出)\\s*([^，。；,.;!?！？]{2,60})/gi,\n /(?:取出|拿出|掏出|抽出|摸出|舉起|展示|交出|遞出|使用|安裝|套入|卡入)\\s*(?:手中|隨身|身上|剛取得的|先前取得的|目前持有的)?\\s*([^，。；,.;!?！？]{2,60})/gi,\n /(?:將|把)\\s*(?:(?:手中|隨身|身上)(?:的)?|搜出的|剛取得的|先前取得的)\\s*([^，。；,.;!?！？]{2,60}?)(?:舉起|展示|交出|遞出|放入|置於|套入|卡入|安裝|使用|打開|傾斜|收回)/gi\n];\nconst POSSESSION_CAUSAL_PATTERNS=[\n /([^，。；,.;!?！？]{2,50})(?:為|是)(?:剛|先前|目前)?(?:取得|持有|攜帶|收起|搜出|獲得)的?(?:關鍵)?物品/gi,\n /(?:你|玩家)?(?:身上|隨身)?(?:持有|攜帶|帶著|擁有)\\s*(?:該|這|那)?\\s*([^，。；,.;!?！？]{2,60})/gi\n];`
);
replaceOnce("src/contextual-actions.js",
 `function impliedInventoryItem(action=""){\n const m=String(action||"").match(POSSESSION_ITEM);return clean(m?.[1]||m?.[2]||"",50).replace(/^(?:那|這)(?:一)?(?:個|枚|片|件|瓶|把|本|張|塊|顆|粒)?/i,"").trim()\n}`,
 `function normalizeClaimedItem(value=""){\n return clean(value,70).replace(/^(?:(?:手中|隨身|身上)(?:的)?|(?:剛|先前|目前)取得的|搜出的|該|那|這)\\s*/,"").replace(/^(?:一)?(?:小|大)?(?:個|枚|片|件|瓶|把|本|張|塊|顆|粒)?\\s*/,"").replace(/(?:給(?:眼前|身旁|旁邊|對方|他|她|那名|這名)|向(?:眼前|身旁|旁邊|對方|他|她)|以便|來(?:確認|檢查|觀察)).*$/,"").trim()\n}\nfunction possessionItemClaims(row={}){\n const out=[];for(const value of [String(row?.action||row||""),String(row?.causalBasis||"")])for(const pattern of [...POSSESSION_ITEM_PATTERNS,...POSSESSION_CAUSAL_PATTERNS])for(const match of value.matchAll(pattern)){for(const part of String(match?.[1]||"").split(/\\s*(?:與|和|及|、)\\s*/)){const item=normalizeClaimedItem(part);if(item&&!out.includes(item))out.push(item)}}return out.slice(0,8)\n}\nfunction inventoryClaimGrounded(state,claim){\n const compact=value=>clean(value,90).replace(/的/g,"").replace(/\\s+/g,""),target=compact(claim);if(!target)return false;return inventoryRows(state).some(item=>{const id=String(item?.id||""),name=compact(item?.name||"");return (id&&target===id)||(name&&Math.min(name.length,target.length)>=2&&(name===target||name.includes(target)||target.includes(name)))})\n}`
);
replaceOnce("src/contextual-actions.js",
 ` const implied=impliedInventoryItem(x.action);\n if(implied&&!inventoryRows(state).some(item=>[item?.id,item?.name].some(v=>v&&String(v)===implied)))reasons.push("IMPLIED_ITEM_MISSING:"+implied);`,
 ` const claims=possessionItemClaims(x),implied=claims[0]||null;\n for(const claim of claims)if(!inventoryClaimGrounded(state,claim))reasons.push("IMPLIED_ITEM_MISSING:"+claim);`
);

// 3. Player-visible NPC labels are display data; trim generation punctuation pollution at that boundary.
replaceOnce("src/player-entity-visibility.js",
 'const clean=(v,max=180)=>typeof v==="string"?v.normalize("NFC").replace(/[\\u0000-\\u001f\\u007f]/g,"").trim().slice(0,max):"";',
 'const clean=(v,max=180)=>typeof v==="string"?v.normalize("NFC").replace(/[\\u0000-\\u001f\\u007f]/g,"").trim().slice(0,max):"";\nconst entityLabel=(v,max=80)=>clean(v,max).replace(/^[\\s\\"\'“”‘’「」『』，,。！？!?；;：:]+|[\\s\\"\'“”‘’「」『』，,。！？!?；;：:]+$/g,"").trim();'
);
replaceAllGuarded("src/player-entity-visibility.js",'clean(npc?.observableAlias||npc?.playerAlias,80)','entityLabel(npc?.observableAlias||npc?.playerAlias,80)');
replaceAllGuarded("src/player-entity-visibility.js",'clean(npc.name,80)','entityLabel(npc.name,80)');
replaceAllGuarded("src/player-entity-visibility.js",'clean(npc?.name,80)','entityLabel(npc?.name,80)');

// 4. Scene provenance hard-rejects newly acquired items that do not exist in canonical inventory.
replaceOnce("src/scene-provenance.js",
 'const clean=(value,max=500)=>String(value??"").trim().slice(0,max);\nconst list=value=>Array.isArray(value)?value:[];',
 'const clean=(value,max=500)=>String(value??"").trim().slice(0,max);\nconst entityName=(value,max=120)=>clean(value,max).replace(/^[\\s\\"\'“”‘’「」『』，,。！？!?；;：:]+|[\\s\\"\'“”‘’「」『』，,。！？!?；;：:]+$/g,"").trim();\nconst list=value=>Array.isArray(value)?value:[];'
);
replaceOnce("src/scene-provenance.js",
 'function names(values=[]){return [...new Set(list(values).map(x=>clean(x,120)).filter(Boolean))]}',
 'function names(values=[]){return [...new Set(list(values).map(x=>entityName(x,120)).filter(Boolean))]}'
);
replaceOnce("src/scene-provenance.js",
 'function foreignNpcIssues(value,scope={}){const text=String(value||""),present=new Set(names(scope.presentNpcNames)),issues=[];for(const name of names(scope.allNpcNames)){if(name&&!present.has(name)&&text.includes(name))issues.push({type:"NPC_NOT_PRESENT",value:name})}return issues}',
 'const ACQUIRED_ITEM=/(?:取得|獲得|拾起|撿起|拿到|取走|收下|順手帶出)\\s*([^。！？\\n]{2,90})/g;\nfunction normalizeItemClaim(value=""){return clean(value,90).replace(/^(?:同時|再|又)?\\s*/,"").replace(/^(?:那|這)?(?:一)?(?:小|大)?(?:個|枚|片|件|瓶|把|本|張|塊|顆|粒)?\\s*/,"").trim()}\nfunction acquiredItemClaims(value=""){const out=[];for(const match of String(value||"").matchAll(ACQUIRED_ITEM))for(const part of String(match?.[1]||"").split(/\\s*(?:與|和|及|、)\\s*/)){const item=normalizeItemClaim(part);if(item&&!out.includes(item))out.push(item)}return out}\nfunction inventoryClaimGrounded(claim,scope={}){const compact=value=>entityName(value,120).replace(/的/g,"").replace(/\\s+/g,""),target=compact(claim);if(!target)return true;return names(scope.inventoryNames).some(name=>{const known=compact(name);return known&&Math.min(known.length,target.length)>=2&&(known===target||known.includes(target)||target.includes(known))})}\nfunction foreignInventoryIssues(value,scope={}){return acquiredItemClaims(value).filter(claim=>!inventoryClaimGrounded(claim,scope)).map(claim=>({type:"SCENE_ITEM_NOT_CANONICAL",value:claim}))}\nfunction foreignNpcIssues(value,scope={}){const text=String(value||""),present=new Set(names(scope.presentNpcNames)),issues=[];for(const name of names(scope.allNpcNames)){if(name&&!present.has(name)&&text.includes(name))issues.push({type:"NPC_NOT_PRESENT",value:name})}return issues}'
);
replaceOnce("src/scene-provenance.js",
 'issues.push(...foreignNpcIssues(narrative+"\\n"+sceneTitle,scope));for(const speaker of speakerPrefixes(narrative))',
 'issues.push(...foreignNpcIssues(narrative+"\\n"+sceneTitle,scope));issues.push(...foreignInventoryIssues(narrative,scope));for(const speaker of speakerPrefixes(narrative))'
);

// Supply canonical inventory to the provenance validator without changing scene rendering semantics.
replaceOnce("app.js",
 'return {worldId,currentLocation:String(playerVisibleLocationName(state)||rawLocation||""),locationDescription:String(location?.description||""),presentNpcNames:present.map(n=>String(playerVisibleNpcName(state,n)||"")).filter(Boolean),allNpcNames:npcs.map(n=>String(n?.name||"")).filter(Boolean),knownLocations:locations.filter(x=>x?.known===true||x===location).map(x=>String(x?.name||"")).filter(Boolean),visibleEventTexts}',
 'return {worldId,currentLocation:String(playerVisibleLocationName(state)||rawLocation||""),locationDescription:String(location?.description||""),presentNpcNames:present.map(n=>String(playerVisibleNpcName(state,n)||"")).filter(Boolean),allNpcNames:npcs.map(n=>String(playerVisibleNpcName(state,n)||n?.name||"")).filter(Boolean),knownLocations:locations.filter(x=>x?.known===true||x===location).map(x=>String(x?.name||"")).filter(Boolean),inventoryNames:(state.inventory||[]).filter(x=>x?.quantity===undefined||x?.quantity===null||Number(x.quantity)>0).map(x=>String(x?.name||"")).filter(Boolean),visibleEventTexts}'
);

// 5. Scene narrator may render evidence, but may not independently invent inventory or definitive item comparison facts.
replaceOnce("src/ai-runtime-contracts.js",
 '不得無中生有新線索。嚴守玩家 POV 與名稱知識邊界',
 '不得無中生有新線索。玩家取得、持有、拿出、展示、交出、安裝或使用的物品，只能來自 snapshot.inventory 或 kernel.allowedVisibleFacts 明確列出的本回合取得物；禁止為了豐富敘事順手增加配給券、瓶子、材料、掉落物或其他不存在物件。物件比對、來源、匹配與否若未出現在 kernel.allowedVisibleFacts，不得自行下肯定或否定結論。嚴守玩家 POV 與名稱知識邊界'
);
replaceOnce("src/ai-runtime-contracts.js",
 '每個 suggestion 都必須先基於 snapshot 確認因果與必要前提，填 causalBasis 並令 requirementsSatisfied=true；如果前提未滿足就不要輸出該 suggestion。',
 '每個 suggestion 都必須先基於 snapshot 確認因果與必要前提，填 causalBasis 並令 requirementsSatisfied=true；若 action 涉及拿出、使用、展示、交出、安裝或消耗既有物品，requiredItemIds 必須逐一列出 snapshot.inventory 中對應的 canonical id，找不到 id 就不要輸出候選，禁止用 causalBasis 宣稱玩家擁有 snapshot.inventory 不存在的物品；如果前提未滿足就不要輸出該 suggestion。'
);

// Regression coverage copied from the exact v0.59.8 failure shapes.
const testPath="test/v05910-runtime-integrity.test.js";
if(!fs.existsSync(testPath)){
 write(testPath,`import test from "node:test";\nimport assert from "node:assert/strict";\nimport {readFile} from "node:fs/promises";\nimport {deferredPlanFrom,assessPatchRevision,MAX_DEFERRED_REBASE_GAP} from "../src/state-sync.js";\nimport {evaluateSuggestionRequirements} from "../src/contextual-actions.js";\nimport {validateSceneProvenance} from "../src/scene-provenance.js";\nimport {playerVisibleNpcName} from "../src/player-entity-visibility.js";\nimport {sceneNarratorSystem} from "../src/ai-runtime-contracts.js";\n\nfunction baseState(inventory=[]){return {world:{id:"W",state:{day:1},registry:{locations:[{id:"L1",name:"礦道入口",known:true}],npcs:[{id:"N1",name:"斷脈礦工”，",known:true,nameKnown:true,alive:true,locationId:"L1"}],sideQuests:[]},creation:{blueprint:{difficulty:"normal"}}},player:{location:"礦道入口",status:"ACTIVE",difficulty:"normal",skills:{OBSERVE:1,SOCIAL:1},magic:{knownSpells:[]}},quests:{main:{title:"追查規則",objectives:["找出下一個可驗證線索"],status:"ACTIVE"}},events:[],inventory,stateSync:{revision:10,lastCommitAt:0,lastReason:"",history:[]}}}\n\ntest("old Deferred state work expires instead of rebasing into the current world",()=>{const plan=deferredPlanFrom({mode:"DEFERRED",baseRevision:2,deferredCapabilities:["NPC_RELATIONSHIP_SIGNAL"],deferredDirty:["npcRelation"]},10);assert.equal(MAX_DEFERRED_REBASE_GAP,4);assert.equal(plan.originRevision,2);assert.equal(plan.revisionGap,8);assert.equal(plan.expired,true);const stale=assessPatchRevision({stateSync:{revision:10}},{baseRevision:10,operations:[{op:"NPC_RELATIONSHIP_SIGNAL",npcId:"N1",effect:"POSITIVE"}]},plan);assert.equal(stale.ok,false);assert.equal(stale.expired,true);const nearPlan=deferredPlanFrom({mode:"DEFERRED",baseRevision:8,deferredCapabilities:["NPC_RELATIONSHIP_SIGNAL"],deferredDirty:["npcRelation"]},10),near=assessPatchRevision({stateSync:{revision:10}},{baseRevision:8,operations:[{op:"NPC_RELATIONSHIP_SIGNAL",npcId:"N1",effect:"POSITIVE"}]},nearPlan);assert.equal(near.ok,true);assert.equal(near.rebased,true)});\n\ntest("suggestions cannot smuggle hallucinated inventory through empty requiredItemIds",()=>{const s=baseState([{id:"ITEM-GEAR",name:"磨損黃銅齒輪",quantity:1}]);const rows=[{action:"從隨身攜帶中取出一小塊可確認的生物能源",causalBasis:"用已有物品測試",requirementsSatisfied:true,requiredItemIds:[]},{action:"拿出礦區配給券與黃銅齒輪給眼前的陌生人看",causalBasis:"展示持有物",requirementsSatisfied:true,requiredItemIds:[]},{action:"傾斜無標玻璃瓶，觀察液體變化",causalBasis:"玻璃瓶為剛取得的關鍵物品",requirementsSatisfied:true,requiredItemIds:[]}];for(const row of rows){const result=evaluateSuggestionRequirements(s,row);assert.equal(result.ok,false,row.action);assert.ok(result.reasons.some(x=>x.startsWith("IMPLIED_ITEM_MISSING:")),JSON.stringify(result))}const valid=evaluateSuggestionRequirements(s,{action:"拿出磨損黃銅齒輪給眼前的陌生人看",causalBasis:"背包內已有該齒輪",requirementsSatisfied:true,requiredItemIds:["ITEM-GEAR"]});assert.equal(valid.ok,true,JSON.stringify(valid))});\n\ntest("dirty NPC display punctuation is removed without changing canonical identity",()=>{const s=baseState(),npc=s.world.registry.npcs[0];assert.equal(playerVisibleNpcName(s,npc),"斷脈礦工");assert.equal(npc.id,"N1");assert.equal(npc.name,"斷脈礦工”，")});\n\ntest("scene provenance rejects invented acquisitions but accepts the canonical pickup",()=>{const scope={currentLocation:"礦道入口",locationDescription:"閘門旁的礦道入口",presentNpcNames:["斷脈礦工"],allNpcNames:["斷脈礦工”，"],knownLocations:["礦道入口"],inventoryNames:["磨損黃銅齒輪"],visibleEventTexts:[]};const bad=validateSceneProvenance({sceneTitle:"取走齒輪",narrative:"你夾起那枚磨損的黃銅齒輪，同時順手帶出一張泛黃的礦區配給券與一個無標玻璃瓶。斷脈礦工看著你。"},scope);assert.equal(bad.valid,false);assert.ok(bad.issues.some(x=>x.type==="SCENE_ITEM_NOT_CANONICAL"),JSON.stringify(bad.issues));assert.equal(bad.issues.some(x=>x.type==="NPC_NOT_PRESENT"),false);const good=validateSceneProvenance({sceneTitle:"取走齒輪",narrative:"你取得那枚磨損的黃銅齒輪。斷脈礦工看著你。"},scope);assert.equal(good.valid,true,JSON.stringify(good.issues))});\n\ntest("scene narrator contract forbids unsupported item facts and requires canonical item ids",()=>{const prompt=sceneNarratorSystem();assert.match(prompt,/snapshot\\.inventory/);assert.match(prompt,/requiredItemIds/);assert.match(prompt,/物件比對、來源、匹配與否/);assert.match(prompt,/找不到 id 就不要輸出候選/)});\n\ntest("app passes canonical inventory names into scene provenance",async()=>{const app=await readFile(new URL("../app.js",import.meta.url),"utf8");assert.match(app,/inventoryNames:\\(state\\.inventory\\|\\|\\[\\]\\)/)});\n`)
}

// Keep the repository's browser cache-bust invariant: changed dependency importers inherit the current token.
function jsFiles(dir){const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.posix.join(dir,entry.name);if(entry.isDirectory())out.push(...jsFiles(full));else if(entry.isFile()&&entry.name.endsWith(".js"))out.push(full)}return out}
const browserFiles=["app.js",...jsFiles("src")];
const importRe=/(from\\s+["'])(\\.{1,2}\\/[^"']+?\\.js)\\?v=(\\d+)(["'])/g;
let progress=true;
while(progress){progress=false;for(const importer of browserFiles){const source=read(importer);let touched=false;const updated=source.replace(importRe,(full,prefix,spec,token,suffix)=>{const target=path.posix.normalize(path.posix.join(path.posix.dirname(importer),spec));if(changed.has(target)&&token!==EXPECTED_TOKEN){touched=true;return `${prefix}${spec}?v=${EXPECTED_TOKEN}${suffix}`}return full});if(touched){write(importer,updated);progress=true}}}

if(!read("index.html").includes(`app.js?v=${EXPECTED_TOKEN}`))throw new Error(`index.html does not expose app.js?v=${EXPECTED_TOKEN}`);
console.log(JSON.stringify({changed:[...changed].sort()},null,2));
