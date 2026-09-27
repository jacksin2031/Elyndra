import {readFileSync,writeFileSync,appendFileSync} from "node:fs";

const read=p=>readFileSync(p,"utf8");
const write=(p,s)=>writeFileSync(p,s,"utf8");
function replace(p,from,to,label=from.slice(0,80)){
 const s=read(p);if(!s.includes(from))throw new Error(`PATCH_MISS ${p}: ${label}`);write(p,s.replace(from,to));
}
function replaceAll(p,from,to,label=from.slice(0,80)){
 const s=read(p);if(!s.includes(from))throw new Error(`PATCH_MISS ${p}: ${label}`);write(p,s.split(from).join(to));
}
function appendOnce(p,marker,content){const s=read(p);if(s.includes(marker))return;appendFileSync(p,"\n"+content+"\n","utf8")}

// Release version/cache.
replace("package.json","\"version\": \"0.59.13\"","\"version\": \"0.59.14\"");
replace("src/version.js","APP_VERSION=\"0.59.13\"","APP_VERSION=\"0.59.14\"");
replace("index.html","styles.css?v=59010","styles.css?v=59014");
replace("index.html","app.js?v=59013","app.js?v=59014");
replace("index.html","\"./src/origin-runtime.js?v=57025\":\"./src/origin-runtime.js?v=59011\"","\"./src/origin-runtime.js?v=57025\":\"./src/origin-runtime.js?v=59014\"");
replace("app.js","./src/version.js?v=59013","./src/version.js?v=59014");
replace("app.js","./src/ai-client.js?v=59013","./src/ai-client.js?v=59014");

// NPC dock: remove it from the sidebar and place it directly under the dice panel.
replace("index.html","<div id=\"npcDock\" class=\"npc-dock hidden\"><small class=\"eyebrow\">人物</small><div id=\"knownNpcList\"></div></div></aside>","</aside>","sidebar npc dock");
const dice='<div class="dice-box" id="diceBox" aria-live="polite"><div class="dice-stage" aria-hidden="true"><div class="d20" id="d20">20</div></div><div class="dice-copy"><span class="eyebrow">命運判定</span><strong id="rollLabel">等待你的行動</strong><p id="rollResult">世界會記住重要結果。</p></div></div>';
replace("index.html",dice,`<div class="decision-side">${dice}<div id="npcDock" class="npc-dock hidden"><small class="eyebrow">人物</small><div id="knownNpcList"></div></div></div>`,"dice box");
appendOnce("styles.css","v0.59.14 NPC dialogue dock placement",`/* v0.59.14 NPC dialogue dock placement: NPC interaction belongs below dice, never in the sidebar. */
#game .decision-side{display:flex;flex-direction:column;gap:12px;min-width:0;align-self:stretch}
#game .decision-side .dice-box{width:100%;min-width:0}
#game .decision-side .npc-dock{margin-top:0!important;width:100%;min-width:0;max-width:100%;overflow:hidden}
#game .decision-side #knownNpcList{min-width:0;max-height:220px;overflow:auto}
#game .decision-side .npc-mini{min-width:0}
#game .decision-side .npc-mini>div{min-width:0;overflow:hidden}
#game .decision-side .npc-mini strong,#game .decision-side .npc-mini small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:720px){#game .decision-side{gap:10px}#game .decision-side .npc-dock{position:relative!important;inset:auto!important;margin:0!important}#game .decision-side #knownNpcList{max-height:none}}`);

// Traditional Chinese deterministic conversion shared by repair; keep JSON keys/IDs untouched by only converting string values.
write("src/traditional-chinese-guard.js",`const SIMPLIFIED_TO_TRADITIONAL=Object.freeze({
 "严":"嚴","为":"為","争":"爭","仅":"僅","仪":"儀","会":"會","冻":"凍","则":"則","剧":"劇","动":"動","区":"區","压":"壓","发":"發","变":"變","听":"聽","响":"響","围":"圍","垄":"壟","垒":"壘","声":"聲","夹":"夾","夺":"奪","实":"實","对":"對","导":"導","尘":"塵","尝":"嘗","层":"層","属":"屬","峡":"峽","币":"幣","废":"廢","异":"異","弃":"棄","录":"錄","战":"戰","抢":"搶","换":"換","断":"斷","无":"無","机":"機","来":"來","桥":"橋","检":"檢","气":"氣","济":"濟","浓":"濃","涟":"漣","温":"溫","灭":"滅","点":"點","烧":"燒","狭":"狹","现":"現","离":"離","称":"稱","竞":"競","筑":"築","纳":"納","线":"線","经":"經","给":"給","绝":"絕","维":"維","绿":"綠","缘":"緣","缝":"縫","缴":"繳","网":"網","肤":"膚","脉":"脈","舱":"艙","节":"節","蚀":"蝕","补":"補","视":"視","记":"記","语":"語","财":"財","货":"貨","贸":"貿","边":"邊","过":"過","运":"運","进":"進","连":"連","钉":"釘","铁":"鐵","铆":"鉚","铜":"銅","锁":"鎖","锈":"鏽","镇":"鎮","门":"門","阀":"閥","随":"隨","雾":"霧","须":"須","颗":"顆","风":"風","驱":"驅","鸣":"鳴","齿":"齒",
 "这":"這","转":"轉","询":"詢","问":"問","当":"當","轻":"輕","触":"觸","锋":"鋒","锐":"銳","缘":"緣","测":"測","质":"質","闭":"閉","监":"監","从":"從","确":"確","认":"認","详":"詳","标":"標","环":"環","参":"參","见":"見","续":"續","验":"驗","证":"證","获":"獲","长":"長","设":"設","报":"報","体":"體","统":"統","络":"絡","灵":"靈","观":"觀","级":"級","开":"開","关":"關","处":"處","应":"應","术":"術","觉":"覺","话":"話","资":"資","轮":"輪","暂":"暫","时":"時","栅":"柵","紧":"緊","简":"簡","后":"後","频":"頻","该":"該","侧":"側","试":"試","图":"圖","饰":"飾","艺":"藝","踪":"蹤","辆":"輛","摆":"擺","间":"間","带":"帶","并":"並","细":"細","击":"擊","积":"積","响":"響","远":"遠","内":"內","写":"寫","读":"讀","签":"簽","钟":"鐘","伤":"傷","号":"號","从":"從","复":"復","变":"變","准":"準"
});
const SIMPLIFIED_CHINESE_RE=new RegExp("["+Object.keys(SIMPLIFIED_TO_TRADITIONAL).join("")+"]");
const SIMPLIFIED_CHINESE_GLOBAL_RE=new RegExp("["+Object.keys(SIMPLIFIED_TO_TRADITIONAL).join("")+ "]","g");
export const WORLD_TRADITIONAL_CHINESE_CONTRACT="所有中文文字欄位一律使用繁體中文（正體字）。JSON key、ID、enum、既有專有代碼保持原樣；人物名、地名、世界名、描述、歷史、社會、任務與建議中的中文不得使用簡體字。";
export function traditionalizeChineseText(value){return String(value??"").replace(SIMPLIFIED_CHINESE_GLOBAL_RE,ch=>SIMPLIFIED_TO_TRADITIONAL[ch]||ch)}
export function simplifiedChineseLeak(value){
 let found=null;
 const walk=(v,path="$" )=>{if(found||v==null)return;if(typeof v==="string"){const match=v.match(SIMPLIFIED_CHINESE_RE);if(match)found={character:match[0],path,sample:v.slice(Math.max(0,match.index-20),Math.min(v.length,match.index+21))};return}if(Array.isArray(v)){for(let i=0;i<v.length;i++)walk(v[i],\`${'${path}'}[\${i}]\`);return}if(typeof v==="object")for(const [k,x] of Object.entries(v))walk(x,\`${'${path}'}.\${k}\`)};
 walk(value);return found
}
export function hasSimplifiedChineseLeak(value){return Boolean(simplifiedChineseLeak(value))}
`);

// Repair: reject truncated scene fragments, normalize zh-Hant strings deterministically,
// resolve canonical entities against directorRegistry as well, and hide opening CAST NPCs until Engine reveal.
let repair=read("src/ai-output-repair.js");
repair=repair.replace('import {createPipelineTrace,REPAIR_DISPOSITION,REPAIR_SEVERITY} from "./runtime-observability.js?v=59013";','import {createPipelineTrace,REPAIR_DISPOSITION,REPAIR_SEVERITY} from "./runtime-observability.js?v=59013";\nimport {traditionalizeChineseText} from "./traditional-chinese-guard.js?v=59014";');
repair=repair.replace('function registryRows(snapshot={},kind=""){const registry=snapshot?.registry||snapshot?.world?.registry||{};if(kind==="npc")return list(registry.npcs);if(kind==="faction")return list(registry.factions);if(kind==="location")return list(registry.locations);if(kind==="sideQuest")return list(registry.sideQuests);return []}',`function registryRows(snapshot={},kind=""){
 const player=snapshot?.registry||snapshot?.world?.registry||{},director=snapshot?.directorRegistry||{},key=kind==="sideQuest"?"sideQuests":kind==="npc"?"npcs":kind==="faction"?"factions":kind==="location"?"locations":"";if(!key)return [];
 const out=[],seen=new Set();for(const row of [...list(player[key]),...list(director[key])]){const seal=String(row?.id||"")+"|"+String(row?.name||row?.title||"");if(!seal||seen.has(seal))continue;seen.add(seal);out.push(row)}return out
}`);
repair=repair.replace('export function repairSceneCandidate(raw,{expectedOutcome=""}={}){\n const issues=[],dropped=[];if(!plain(raw))return finalize(null,raw,[issue("SCENE_NOT_OBJECT",REPAIR_DISPOSITION.REJECTED,REPAIR_SEVERITY.HARD_REJECT)]);\n const value={...raw,narrative:text(raw.narrative,1800)};if("sceneTitle" in raw)value.sceneTitle=text(raw.sceneTitle,160);const expected=String(expectedOutcome||"").toUpperCase(),actual=String(raw.outcome||"").toUpperCase();',`function transformStringValues(value,fn){if(typeof value==="string")return fn(value);if(Array.isArray(value))return value.map(x=>transformStringValues(x,fn));if(plain(value)){const out={};for(const [k,v] of Object.entries(value))out[k]=transformStringValues(v,fn);return out}return value}
export function repairSceneCandidate(raw,{expectedOutcome="",locale=""}={}){
 const issues=[],dropped=[];if(!plain(raw))return finalize(null,raw,[issue("SCENE_NOT_OBJECT",REPAIR_DISPOSITION.REJECTED,REPAIR_SEVERITY.HARD_REJECT)]);
 if(!String(raw.outcome||"").trim()||!String(raw.narrative||"").trim()||!Array.isArray(raw.suggestions))return finalize(null,raw,[issue("SCENE_SHAPE_INCOMPLETE",REPAIR_DISPOSITION.REJECTED,REPAIR_SEVERITY.HARD_REJECT)]);
 const source=String(locale||"")==="zh-Hant"?transformStringValues(raw,traditionalizeChineseText):raw;if(!same(source,raw))issues.push(issue("LANGUAGE_TRADITIONALIZED",REPAIR_DISPOSITION.NORMALIZED,REPAIR_SEVERITY.RECOVERABLE));
 const value={...source,narrative:text(source.narrative,1800)};if("sceneTitle" in source)value.sceneTitle=text(source.sceneTitle,160);const expected=String(expectedOutcome||"").toUpperCase(),actual=String(source.outcome||"").toUpperCase();`);
repair=repair.replace('const suggestions=[];for(const [index,row] of list(raw.suggestions).entries()){','const suggestions=[];for(const [index,row] of list(source.suggestions).entries()){');
repair=repair.replace('}value.suggestions=suggestions.slice(0,4);if(list(raw.suggestions).length>4)', '}value.suggestions=suggestions.slice(0,4);if(list(source.suggestions).length>4)');
repair=repair.replace('export function repairWorldStageCandidate(stage,raw){if(!plain(raw))return finalize(raw,raw);const value=structuredClone(raw),issues=[],fixArray=',`export function repairWorldStageCandidate(stage,raw,context={}){if(!plain(raw))return finalize(raw,raw);const localized=String(context?.locale||"")==="zh-Hant"?transformStringValues(raw,traditionalizeChineseText):raw,value=structuredClone(localized),issues=[];if(!same(localized,raw))issues.push(issue("LANGUAGE_TRADITIONALIZED",REPAIR_DISPOSITION.NORMALIZED,REPAIR_SEVERITY.RECOVERABLE));const fixArray=`);
repair=repair.replace('if(plain(value.faction))value.faction=cleanEntityObject(value.faction,"faction",issues);const out=finalize(value,raw,issues,[]);out.stage=String(stage||"").toUpperCase();return out}',`if(plain(value.faction))value.faction=cleanEntityObject(value.faction,"faction",issues);const stageId=String(stage||"").toUpperCase();if(stageId==="CAST"){
 const npcs=[...list(value.npcs),...list(value.generation?.npcs)],names=npcs.map(x=>String(x?.name||"")).filter(Boolean);for(const npc of npcs)if(npc?.known===true){npc.known=false;issues.push(issue("OPENING_NPC_VISIBILITY_DEFERRED",REPAIR_DISPOSITION.BOUND,REPAIR_SEVERITY.CONTRACT_VIOLATION))}
 if(Array.isArray(value.suggestions)){const before=value.suggestions.length,valueText=x=>String(typeof x==="string"?x:(x?.action||x?.label||"")),blocked=x=>{const s=valueText(x);return names.some(n=>n&&s.includes(n))||/(?:眼前的陌生人|陌生人|stranger|unknown person|見知らぬ人|知らない人)/i.test(s)};value.suggestions=value.suggestions.filter(x=>!blocked(x));if(value.suggestions.length!==before)issues.push(issue("OPENING_NPC_SUGGESTION_DROPPED",REPAIR_DISPOSITION.DROPPED,REPAIR_SEVERITY.CONTRACT_VIOLATION))}
 }
 const out=finalize(value,raw,issues,[]);out.stage=stageId;return out}`);
repair=repair.replace('if(type==="WORLD_STAGE")return repairWorldStageCandidate(context?.stage,raw);','if(type==="WORLD_STAGE")return repairWorldStageCandidate(context?.stage,raw,context);');
write("src/ai-output-repair.js",repair);

// Opening world generation no longer guarantees an NPC in front of the player.
let client=read("src/ai-client.js");
client=client.replace('repairAiOutput("WORLD_STAGE",parsed,{stage}).value','repairAiOutput("WORLD_STAGE",parsed,{stage,locale}).value');
client=client.replace('repairAiOutput("WORLD_STAGE",candidate,{stage:"WORLD_SERVER_CANDIDATE"}).value','repairAiOutput("WORLD_STAGE",candidate,{stage:"WORLD_SERVER_CANDIDATE",locale:normalizeLocale(loadLocale())}).value');
client=client.replace('openingHook:`冰冷而潮濕的地面貼著背脊。遠處傳來一聲延遲的金屬鳴響，${cue}；霧後似乎有腳步靠近，但你無法判斷方向與距離。`','openingHook:`冰冷而潮濕的地面貼著背脊。遠處傳來一聲延遲的金屬鳴響，${cue}；一段老舊管路忽然出現不規則震動，附近的檢修燈隨即熄滅。`');
client=client.replace('historyRefs:[history?.[0]?.id||"HIST-1"],known:true,companionProfile:', 'historyRefs:[history?.[0]?.id||"HIST-1"],known:false,companionProfile:');
client=client.replace('suggestions:["循著剛才的異常聲音找出來源","檢查附近地面有沒有新留下的腳印或拖痕","找一個能看清出入口的人，問他剛才發生了甚麼"]','suggestions:["循著剛才的異常聲音找出來源","檢查附近地面或管路有沒有新留下的痕跡","確認哪一個出入口仍然可以安全通行"]');
client=client.replace('openingHook 必須在第一幕就包含一個可見或可聽見、立即、可採取行動、尚未解決的具體異常，例如有人逃跑、鐘聲突然停止、傷者求助、入口封閉、追逐或突發破壞；玩家必須能立刻想到至少三種不同反應，不能只有神秘氣氛。','openingHook 必須在第一幕就包含一個可見或可聽見、立即、可採取行動、尚未解決的具體異常；優先使用環境、物件、道路、機械、天候或聲音異常，例如鐘聲突然停止、入口封閉、設備故障或突發破壞。禁止模板式地在第一回合自動安排可交談的陌生 NPC；只有 playerOrigin / originOpening 明確要求他人在場時才可把人物作為開場異常。玩家必須能立刻想到至少三種不同反應，不能只有神秘氣氛。');
client=client.replace('這名附近 NPC 位於玩家開局現場、可直接看見，因此 known 必須為 true；這只公開人物存在與外觀，不代表玩家知道其 lore、秘密或知識。','這名 NPC 是開局區域的 canonical 候選人物，不代表第一幕已碰面。known 必須為 false，Engine 之後只有在玩家真的觀察、接觸或事件明確揭露時才可設為 known / encountered。不得因 CAST 階段本身把 NPC 當成「眼前的陌生人」。');
client=client.replace('suggestions 必須直接回應 openingHook 裡的具體人物、聲音、痕跡、入口或異常，禁止「觀察四周」「繼續探索」「確認狀態」等 UI 指令。','suggestions 必須直接回應 openingHook 裡已經可感知的聲音、痕跡、入口、物件或異常；不得引用本階段剛生成但尚未由 Engine reveal 的 NPC 姓名／身份，也不得假定「眼前有陌生人」。禁止「觀察四周」「繼續探索」「確認狀態」等 UI 指令。');
client=client.replace('historyRefs:["0-2個 HIST id"],known:true,chronology:', 'historyRefs:["0-2個 HIST id"],known:false,chronology:');
const planLine=' const plan={...basePlan,baseRevision:Number(options?.baseRevision??snapshot?.stateRevision)||0},directorMode=plan.mode,stateMode=plan.mode,immediateStateAI=plan.mode==="FAST"||plan.mode==="DEEP";';
client=client.replace(planLine,planLine+'\n const repairLocale=normalizeLocale(loadLocale()),repairTurnId=`REV-${plan.baseRevision}`;');
client=client.replace('.then(raw=>repairAiOutput("SCENE",parseJSON(raw),{expectedOutcome:kernel.result?.success===true?"SUCCESS":"FAILURE"}).value);','.then(raw=>{const fixed=repairAiOutput("SCENE",parseJSON(raw),{expectedOutcome:kernel.result?.success===true?"SUCCESS":"FAILURE",locale:repairLocale,turnId:repairTurnId});if(!fixed.value)throw new Error("AI_SCENE_REJECTED:"+(fixed.reasons||[]).join(","));return fixed.value});');
client=client.replace('repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(rawPatch),{plan,snapshot}).value','repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(rawPatch),{plan,snapshot,turnId:repairTurnId}).value');
client=client.replace('repairAiOutput("SCENE",x.scene,{expectedOutcome:kernel.result?.success===true?"SUCCESS":"FAILURE"}).value','(()=>{const fixed=repairAiOutput("SCENE",x.scene,{expectedOutcome:kernel.result?.success===true?"SUCCESS":"FAILURE",locale:repairLocale,turnId:repairTurnId});if(!fixed.value)throw new Error("AI_SCENE_REJECTED:"+(fixed.reasons||[]).join(","));return fixed.value})()');
client=client.replace('repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(x.patch),{plan,snapshot}).value','repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(x.patch),{plan,snapshot,turnId:repairTurnId}).value');
client=client.replace('repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(parseJSON(raw)),{plan:resolved,snapshot}).value','repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(parseJSON(raw)),{plan:resolved,snapshot,turnId:`REV-${resolved.baseRevision}`}).value');
client=client.replace('repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(response.patch),{plan:resolved,snapshot}).value','repairAiOutput("STATE_PATCH",normalizeGeneratedStatePatch(response.patch),{plan:resolved,snapshot,turnId:`REV-${resolved.baseRevision}`}).value');
write("src/ai-client.js",client);

// Reincarnation gets local evidence only; it no longer gets a world-wide calendar by policy.
let origin=read("src/origin-runtime.js");
origin=origin.replace('PARTIAL_LOCAL:{factLimit:3,worldName:true,calendar:true,spokenCommon:true,readCommon:true','PARTIAL_LOCAL:{factLimit:3,worldName:true,calendar:false,spokenCommon:true,readCommon:true');
origin=origin.replace('function rankFacts(state,rows){\n const keys=[state.world?.bible?.startingLocation,state.world?.bible?.startingSettlement,state.world?.bible?.startingRegion].map(x=>clean(x,120)).filter(Boolean);',`function localOriginFacts(state,rows,rules){
 if(String(rules?.knowledgePolicy||"")!=="PARTIAL_LOCAL")return rows;
 const keys=[state.world?.bible?.startingLocation,state.world?.bible?.startingSettlement,state.world?.bible?.startingRegion].map(x=>clean(x,120)).filter(Boolean);
 return rows.filter(f=>f?.originKnown===true||String(f?.originScope||"").toUpperCase()==="LOCAL"||keys.some(k=>k&&String(f?.text||"").includes(k)))
}
function rankFacts(state,rows){
 const keys=[state.world?.bible?.startingLocation,state.world?.bible?.startingSettlement,state.world?.bible?.startingRegion].map(x=>clean(x,120)).filter(Boolean);`);
origin=origin.replace('const rows=rankFacts(state,publicFacts(state)).slice(0,Math.max(0,rules.factLimit)),granted=[];','const rows=rankFacts(state,localOriginFacts(state,publicFacts(state),rules)).slice(0,Math.max(0,rules.factLimit)),granted=[];');
write("src/origin-runtime.js",origin);

// Origin-granted knowledge does not count as newly investigated evidence for main quest stage 3.
let quest=read("src/quest-engine.js");
quest=quest.replace('function verifiedKnowledgeCount(state){const canon=new Set((state.world?.canon?.facts||[]).map(f=>f.id)),history=new Set((state.world?.history||[]).map(h=>h.id));return (state.knowledge||[]).filter(k=>(k.factId&&canon.has(k.factId))||(k.historyId&&history.has(k.historyId))).length}',`function verifiedKnowledgeCount(state,{excludeOrigin=false}={}){const canon=new Set((state.world?.canon?.facts||[]).map(f=>f.id)),history=new Set((state.world?.history||[]).map(h=>h.id));return (state.knowledge||[]).filter(k=>(!excludeOrigin||String(k?.sourceRef?.kind||"").toUpperCase()!=="ORIGIN")&&((k.factId&&canon.has(k.factId))||(k.historyId&&history.has(k.historyId)))).length}`);
quest=quest.replace('contact=r.npcs.some(n=>n.encountered===true),verified=verifiedKnowledgeCount(state),crisis=', 'contact=r.npcs.some(n=>n.encountered===true),verified=verifiedKnowledgeCount(state),investigatedVerified=verifiedKnowledgeCount(state,{excludeOrigin:true}),crisis=');
quest=quest.replace('if(contact&&(Math.max(0,Number(state.discoveries)||0)>=3||verified>=1))candidate=3;', 'if(contact&&(Math.max(0,Number(state.discoveries)||0)>=3||investigatedVerified>=1))candidate=3;');
write("src/quest-engine.js",quest);

// If a Scene is rejected/failed, rebuild current Engine-grounded actions so stale NPC suggestions cannot survive.
let app=read("app.js");
app=app.replace('.catch(e=>{if(!ctrl.signal.aborted)recordDebug("PLAYER_ACTION_AI_FAILED",{action,mode:plan.mode,error:e?.message||String(e),elapsedMs:Date.now()-startedAt})}).finally(',`.catch(async e=>{if(!ctrl.signal.aborted&&isCurrentStateSession(sessionToken)){const safe=buildContextualActionSet(state,[]);state.suggestionIntents=safe.all;state.suggestions=safe.all.map(x=>x.label);recordDebug("PLAYER_ACTION_AI_FAILED",{action,mode:plan.mode,error:e?.message||String(e),elapsedMs:Date.now()-startedAt});recordDebug("PLAYER_ACTION_FALLBACK_REBUILT",{action,reason:"SCENE_AI_FAILED",suggestions:safe.all.length});await persist(state,sessionToken)}}).finally(`);
app=app.replace('}else{recordDebug("PLAYER_ACTION_AI_FAILED",{action:effective,mode:syncPlan.mode,error:playerResult.reason?.message||String(playerResult.reason),elapsedMs:Date.now()-debugTurnStarted});showActionRecoveryNotice("AI 場景敘述未完成；已保留 Engine 的可見結果。");await refresh()}',`}else{const safe=buildContextualActionSet(actionState,[]);actionState.suggestionIntents=safe.all;actionState.suggestions=safe.all.map(x=>x.label);recordDebug("PLAYER_ACTION_AI_FAILED",{action:effective,mode:syncPlan.mode,error:playerResult.reason?.message||String(playerResult.reason),elapsedMs:Date.now()-debugTurnStarted});recordDebug("PLAYER_ACTION_FALLBACK_REBUILT",{action:effective,reason:"SCENE_AI_FAILED",suggestions:safe.all.length});showActionRecoveryNotice("AI 場景敘述未完成；已保留 Engine 的可見結果並重建安全行動。");await persist(actionState,actionSession);await refresh()}`);
write("app.js",app);

// Release assertions.
for(const p of ["test/version-ui.test.js","test/v05901-i18n-coverage.test.js"]){let s=read(p);s=s.split("0.59.13").join("0.59.14").split("0\\.59\\.13").join("0\\.59\\.14").split("app\\.js\\?v=59013").join("app\\.js\\?v=59014").split("version\\.js\\?v=59013").join("version\\.js\\?v=59014");if(p.endsWith("version-ui.test.js"))s=s.split("ai-client\\.js\\?v=59013").join("ai-client\\.js\\?v=59014");write(p,s)}
let release=read("test/version-0551-release.test.js");release=release.replaceAll?.call?release:release;
release=release.split("v0.59.13").join("v0.59.14").split("0.59.13").join("0.59.14").split("0\\.59\\.13").join("0\\.59\\.14").split("app\\.js\\?v=59013").join("app\\.js\\?v=59014").split("styles\\.css\\?v=59010").join("styles\\.css\\?v=59014").split("version\\.js\\?v=59013").join("version\\.js\\?v=59014");
release=release.replace('"59012","59013"].includes(x)','"59012","59013","59014"].includes(x)');write("test/version-0551-release.test.js",release);
let old=read("test/v05911-origin-hud-regressions.test.js");old=old.replace(/app\\\.js\\\?v=59013/g,'app\\.js\\?v=59014').replace(/world-surfaces\\\.css\\\?v=59011/g,'world-surfaces\\.css\\?v=59011').replace(/59011\"\/\)/g,'59014"\\/)');
// use direct literals for the current file to avoid regex ambiguity
old=old.split('app\\.js\\?v=59013').join('app\\.js\\?v=59014').split('origin-runtime\\.js\\?v=59011').join('origin-runtime\\.js\\?v=59014');write("test/v05911-origin-hud-regressions.test.js",old);
let repairTest=read("test/v05912-ai-output-repair.test.js");repairTest=repairTest.split('ai-output-repair\\.js\\?v=59013').join('ai-output-repair\\.js\\?v=59014');write("test/v05912-ai-output-repair.test.js",repairTest);

write("test/v05914-opening-scene-npc-dock-debug-regressions.test.js",`import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {repairSceneCandidate,repairStatePatchCandidate,repairWorldStageCandidate} from "../src/ai-output-repair.js";
import {newGame} from "../src/world-engine.js";
import {createWorldCreationDraft,compileWorldCreation,applyWorldCreationState} from "../src/world-creation.js";
import {applyOriginRuntime} from "../src/origin-runtime.js";
import {tickMainQuest} from "../src/quest-engine.js";

function reincarnationState(){const seed=compileWorldCreation(createWorldCreationDraft({worldStyle:"王道奇幻",worldScale:"中型",targetPlayHours:12,difficulty:"normal",originType:"reincarnation",playerRole:"ordinary",masterSeed:"v05914-origin"}));const s=newGame(seed);applyWorldCreationState(s,seed);s.world.bible={...(s.world.bible||{}),startingLocation:"出生村",startingSettlement:"出生村",startingRegion:"北境",weatherSystem:{phenomena:[]}};s.world.state.location="出生村";s.player.location="出生村";s.world.registry={locations:[{id:"L-HOME",name:"出生村",known:true}],npcs:[],factions:[],sideQuests:[]};s.world.canon.facts=[{id:"F-LOCAL",visibility:"public",type:"public",text:"出生村的水井每天清晨開放。"},{id:"F-GLOBAL",visibility:"public",type:"public",text:"遙遠帝都的皇室掌握世界級秘密。"}];return s}

test("v0.59.14 opening CAST never auto-exposes its generated NPC",()=>{const out=repairWorldStageCandidate("CAST",{npcs:[{name:"米拉",known:true}],suggestions:["向眼前的陌生人問路","檢查破裂管道","確認出口"]},{locale:"zh-Hant"});assert.equal(out.value.npcs[0].known,false);assert.equal(out.value.suggestions.some(x=>String(x).includes("陌生人")),false);assert.ok(out.reasons.includes("OPENING_NPC_VISIBILITY_DEFERRED"))});

test("v0.59.14 truncated suggestion fragment is not accepted as a Scene",()=>{const out=repairSceneCandidate({label:"觀察門口",action:"觀察門口",kind:"OBSERVE"},{expectedOutcome:"SUCCESS",locale:"zh-Hant"});assert.equal(out.value,null);assert.ok(out.reasons.includes("SCENE_SHAPE_INCOMPLETE"))});

test("v0.59.14 zh-Hant scene repair deterministically removes Simplified leakage",()=>{const out=repairSceneCandidate({outcome:"SUCCESS",narrative:"机械声的频率变化很明显。",suggestions:[{label:"观察机械声",action:"观察机械声的变化",kind:"OBSERVE",risk:"LOW",approach:"STEADY"}]},{expectedOutcome:"SUCCESS",locale:"zh-Hant"});assert.equal(out.value.narrative,"機械聲的頻率變化很明顯。");assert.match(out.value.suggestions[0].action,/觀察機械聲的變化/);assert.ok(out.reasons.includes("LANGUAGE_TRADITIONALIZED"))});

test("v0.59.14 StatePatch canonical binding can use hidden director registry",()=>{const out=repairStatePatchCandidate({baseRevision:4,operations:[{op:"REVEAL_ENTITY",kind:"location",id:"隱藏工房"}]},{plan:{baseRevision:4,capabilities:["REVEAL_ENTITY"]},snapshot:{registry:{locations:[]},directorRegistry:{locations:[{id:"LOC-HIDDEN",name:"隱藏工房"}]}}});assert.equal(out.value.operations.length,1);assert.equal(out.value.operations[0].id,"LOC-HIDDEN");assert.equal(out.hardRejects??0,0)});

test("v0.59.14 reincarnation receives local facts only and no automatic full calendar",()=>{const s=reincarnationState();applyOriginRuntime(s,{phase:"POST_CANON"});assert.equal(s.player.calendarKnown,false);assert.ok(s.knowledge.some(k=>k.factId==="F-LOCAL"));assert.equal(s.knowledge.some(k=>k.factId==="F-GLOBAL"),false)});

test("v0.59.14 origin knowledge alone cannot skip main quest investigation",()=>{const s=reincarnationState();applyOriginRuntime(s,{phase:"POST_CANON"});s.world.registry.npcs=[{id:"NPC-1",name:"居民",known:true,encountered:true,alive:true,companion:{status:"NONE"},memories:[],trust:0}];s.world.state.clock.totalMinutes=1;tickMainQuest(s);s.world.state.clock.totalMinutes=2;tickMainQuest(s);assert.equal(s.quests.main.stage,2);s.world.state.clock.totalMinutes=3;tickMainQuest(s);assert.equal(s.quests.main.stage,2);s.knowledge.push({id:"K-NEW",factId:"F-GLOBAL",status:"VERIFIED",sourceRef:{kind:"NPC",id:"NPC-1"}});s.world.state.clock.totalMinutes=4;tickMainQuest(s);assert.equal(s.quests.main.stage,3)});

test("v0.59.14 NPC dialogue dock is below dice and not inside sidebar",async()=>{const [html,css]=await Promise.all([readFile(new URL("../index.html",import.meta.url),"utf8"),readFile(new URL("../styles.css",import.meta.url),"utf8")]);const sidebar=html.slice(html.indexOf('<aside class="sidebar">'),html.indexOf('</aside>')+8);assert.doesNotMatch(sidebar,/id="npcDock"/);assert.ok(html.indexOf('id="npcDock"')>html.indexOf('id="diceBox"'));assert.match(html,/class="decision-side"/);assert.match(css,/v0\.59\.14 NPC dialogue dock placement/);assert.match(css,/#game \.decision-side \.npc-dock\{margin-top:0!important/)});

test("v0.59.14 opening compiler no longer forces visible stranger and scene repair carries turn correlation",async()=>{const src=await readFile(new URL("../src/ai-client.js",import.meta.url),"utf8");assert.doesNotMatch(src,/可直接看見，因此 known 必須為 true/);assert.match(src,/known 必須為 false/);assert.match(src,/repairTurnId=.*plan\.baseRevision/);assert.match(src,/AI_SCENE_REJECTED/)});
`);

console.log("v0.59.14 patch applied");
