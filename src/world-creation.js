import {applyOriginRuntime} from "./origin-runtime.js?v=57025";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const list=v=>Array.isArray(v)?v.map(x=>clean(x,120)).filter(Boolean):clean(v,1200).split(/[\n,，;；]+/).map(x=>clean(x,120)).filter(Boolean);
const uniq=v=>[...new Set(v)];
const hash=s=>{let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const rng=seed=>{let x=hash(seed)||0x9e3779b9;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
const pick=(r,rows)=>rows[Math.min(rows.length-1,Math.floor(r()*rows.length))];
const toLegacyLevel10=v=>clamp(Math.ceil(clamp(v,1,10)/2),1,5);
export const BLUEPRINT_SOURCES=Object.freeze({USER:"USER",STYLE:"STYLE",RANDOM:"RANDOM",AI_INFERRED:"AI_INFERRED"});

export const DIFFICULTY_PRESETS=Object.freeze({
 easy:Object.freeze({id:"easy",label:"簡單",hunger:false,fatigue:false,statusEffects:false,hpFloor:1,savePolicy:"FREE",languageBarrier:"LOW",injuryRecovery:"FAST",carryWeight:"RELAXED",environment:"RELAXED",permadeath:false}),
 normal:Object.freeze({id:"normal",label:"普通",hunger:true,fatigue:true,statusEffects:true,hpFloor:0,savePolicy:"FREE",languageBarrier:"STANDARD",injuryRecovery:"STANDARD",carryWeight:"STANDARD",environment:"STANDARD",permadeath:false}),
 hard:Object.freeze({id:"hard",label:"困難",hunger:true,fatigue:true,statusEffects:true,hpFloor:0,savePolicy:"AUTO_ONLY",languageBarrier:"HIGH",injuryRecovery:"SLOW",carryWeight:"STRICT",environment:"HARSH",permadeath:false}),
 realistic:Object.freeze({id:"realistic",label:"現實",hunger:true,fatigue:true,statusEffects:true,hpFloor:0,savePolicy:"AUTO_ONLY",languageBarrier:"HIGH",injuryRecovery:"REALISTIC",carryWeight:"REALISTIC",environment:"REALISTIC",persistentConsequences:true,permadeath:false})
});

export const ORIGIN_PRESETS=Object.freeze({
 crossing:{id:"crossing",label:"穿越",legalStatus:"NONE",knowledgePolicy:"EARTH_ONLY",languagePolicy:"UNKNOWN",openingBias:"ARRIVAL_ANOMALY"},
 reincarnation:{id:"reincarnation",label:"轉生",legalStatus:"LOCAL_OR_UNKNOWN",knowledgePolicy:"PARTIAL_LOCAL",languagePolicy:"ORIGIN_DEPENDENT",openingBias:"NEW_LIFE"},
 summoned:{id:"summoned",label:"被召喚",legalStatus:"SPONSOR_DEPENDENT",knowledgePolicy:"BRIEFED_PARTIAL",languagePolicy:"SUMMONER_DEPENDENT",openingBias:"SUMMONING_EVENT"},
 possession:{id:"possession",label:"附身",legalStatus:"HOST_IDENTITY",knowledgePolicy:"HOST_FRAGMENTED",languagePolicy:"HOST_DEPENDENT",openingBias:"IDENTITY_CONFLICT"},
 native:{id:"native",label:"原住民",legalStatus:"LOCAL",knowledgePolicy:"LOCAL_BASELINE",languagePolicy:"NATIVE",openingBias:"LOCAL_LIFE"},
 amnesia:{id:"amnesia",label:"失憶",legalStatus:"HIDDEN",knowledgePolicy:"AMNESIA",languagePolicy:"FRAGMENTED",openingBias:"MEMORY_GAP"},
 custom:{id:"custom",label:"完全自訂",legalStatus:"CUSTOM",knowledgePolicy:"CUSTOM",languagePolicy:"CUSTOM",openingBias:"CUSTOM"}
});

export const ROLE_PRESETS=Object.freeze({
 ordinary:{id:"ordinary",label:"普通人",bias:{heroicOpportunity:1,factionAttention:1,highRiskExposure:1}},
 adventurer:{id:"adventurer",label:"冒險者",bias:{heroicOpportunity:1.1,factionAttention:1.05,highRiskExposure:1.15}},
 hero_candidate:{id:"hero_candidate",label:"英雄候選人",bias:{heroicOpportunity:1.35,factionAttention:1.2,highRiskExposure:1.15}},
 merchant:{id:"merchant",label:"商人",bias:{tradeOpportunity:1.4,factionAttention:1.05,highRiskExposure:.9}},
 noble:{id:"noble",label:"貴族",bias:{politicalOpportunity:1.4,factionAttention:1.35,highRiskExposure:1}},
 researcher:{id:"researcher",label:"研究者",bias:{knowledgeOpportunity:1.5,ancientMysteryExposure:1.3,highRiskExposure:.95}},
 antagonist:{id:"antagonist",label:"反派陣營",bias:{conflictOpportunity:1.35,factionAttention:1.35,highRiskExposure:1.2}},
 random:{id:"random",label:"完全隨機",bias:{}},
 custom:{id:"custom",label:"完全自訂",bias:{}}
});

const STYLE_BASE={
 "王道奇幻":{civilization:6,technology:4,magic:8,politicalUnity:4,religion:6,resources:6,danger:6,survival:4,unknownRatio:55},
 "黑暗奇幻":{civilization:6,technology:4,magic:6,politicalUnity:4,religion:8,resources:4,danger:10,survival:8,unknownRatio:65},
 "東方幻想":{civilization:6,technology:4,magic:8,politicalUnity:6,religion:8,resources:6,danger:6,survival:4,unknownRatio:60},
 "蒸汽魔法":{civilization:8,technology:8,magic:6,politicalUnity:6,religion:4,resources:8,danger:6,survival:4,unknownRatio:45},
 "末日異世界":{civilization:4,technology:6,magic:4,politicalUnity:2,religion:6,resources:2,danger:10,survival:10,unknownRatio:75},
 "自訂世界":{civilization:5,technology:5,magic:5,politicalUnity:5,religion:5,resources:5,danger:5,survival:5,unknownRatio:60}
};

function field(value,mode="style",locked=false){return {mode:["fixed","random","style"].includes(mode)?mode:"style",value,locked:locked===true}}
function numberField(raw,key,fallback,min=1,max=5){const n=Number(raw?.[key]);return field(Number.isFinite(n)?clamp(n,min,max):fallback,raw?.[key+"Mode"],raw?.[key+"Locked"])}
function stringField(raw,key,fallback){return field(clean(raw?.[key],80)||fallback,raw?.[key+"Mode"],raw?.[key+"Locked"])}

export function createWorldCreationDraft(raw={}){
 const style=clean(raw.worldStyle||raw.genre,80)||"王道奇幻";
 const difficulty=DIFFICULTY_PRESETS[raw.difficulty]?raw.difficulty:"normal";
 const originId=ORIGIN_PRESETS[raw.originType]?raw.originType:"crossing";
 const roleId=ROLE_PRESETS[raw.playerRole]?raw.playerRole:"ordinary";
 return {
  schemaVersion:2,
  masterSeed:clean(raw.masterSeed,120)||("elyndra-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10)),
  basic:{
   worldStyle:field(style,raw.worldStyleMode||"fixed",raw.worldStyleLocked),
   worldScale:field(["小型","中型","大型"].includes(raw.worldScale||raw.scale)?(raw.worldScale||raw.scale):"中型",raw.worldScaleMode||"fixed",raw.worldScaleLocked),
   targetPlayHours:Number.isFinite(Number(raw.targetPlayHours??raw.playHours))?clamp(raw.targetPlayHours??raw.playHours,2,100):15,
   difficulty,
   customStyleDescription:clean(raw.customWorldStyle,600)
  },
  advanced:{
   civilizationLevel:numberField(raw,"civilizationLevel",5,1,10),
   technologyLevel:numberField(raw,"technologyLevel",4,1,10),
   magicLevel:numberField(raw,"magicLevel",7,1,10),
   civilizationCount:numberField(raw,"civilizationCount",4,1,12),
   speciesCount:numberField(raw,"speciesCount",4,1,12),
   languageCount:numberField(raw,"languageCount",5,1,16),
   politicalUnity:numberField(raw,"politicalUnity",4,1,10),
   religionInfluence:numberField(raw,"religionInfluence",5,1,10),
   resourceAbundance:numberField(raw,"resourceAbundance",5,1,10),
   worldDanger:numberField(raw,"worldDanger",5,1,10),
   warState:stringField(raw,"warState","TENSION"),
   unknownRatio:numberField(raw,"unknownRatio",60,10,95),
   survivalIntensity:numberField(raw,"survivalIntensity",5,1,10)
  },
  player:{
   name:clean(raw.playerName,40),
   origin:{type:originId,custom:clean(raw.originCustom,400)},
   role:{type:roleId,custom:clean(raw.roleCustom,300)}
  },
  customWorldDescription:clean(raw.customWorldDescription||raw.prompt,1200),
  storyPreferences:uniq(list(raw.storyPreferences)).slice(0,12),
  rules:{
   required:uniq(list(raw.requiredElements)).slice(0,20),
   allowed:uniq(list(raw.allowedElements)).slice(0,20),
   forbidden:uniq(list(raw.forbiddenElements)).slice(0,20)
  }
 }
}

function resolveField(f,key,styleBase,r,opts={}){
 const mode=f?.mode||"style",min=opts.min??1,max=opts.max??10,locked=f?.locked===true;
 let value=f?.value,source=locked||mode==="fixed"?BLUEPRINT_SOURCES.USER:mode==="random"?BLUEPRINT_SOURCES.RANDOM:BLUEPRINT_SOURCES.STYLE;
 if(!locked&&mode==="style"&&styleBase?.[key]!=null)value=styleBase[key];
 if(!locked&&mode==="random"){
  if(opts.values)value=pick(r,opts.values);
  else value=Math.round(min+r()*(max-min))
 }
 if(opts.values&&!opts.values.includes(value))value=opts.values[0];
 else if(!opts.values)value=clamp(value,min,max);
 return {value,source,locked}
}

function explicitMagicLevel(draft){
 const source=[draft?.basic?.customStyleDescription,draft?.customWorldDescription,...(Array.isArray(draft?.storyPreferences)?draft.storyPreferences:[])].filter(Boolean).join("\n").normalize("NFKC"),lower=source.toLowerCase();
 if(!source.trim())return null;
 if(/(?:魔法|魔術|魔力)(?:は|が)?(?:希少|稀少)(?:ではない|じゃない)/u.test(source))return null;
 if(/(?:魔法|魔術|魔力)(?:は|が|の存在は)?(?:ほぼ|ほとんど)?(?:存在しない|ない|無い|禁止)|(?:無魔法|无魔法|沒有魔法|没有魔法)|\b(?:no|without)\s+magic\b/i.test(source))return 1;
 if(/(?:魔法|魔術|魔力)(?:は|が|の存在は)?(?:非常に|とても|かなり)?(?:希少|稀少|珍しい|少ない|めったにない|滅多にない)|(?:希少|稀少|rare|scarce)(?:な|の|\s+)(?:魔法|魔術|魔力|magic)|(?:魔法|魔术|魔力)(?:非常)?(?:稀有|稀少|罕見|罕见|很少|少見|少见)|\bmagic\s+is\s+(?:very\s+)?(?:rare|scarce)\b|\b(?:rare|scarce)[ -]?magic\b/i.test(source)||/(?:magic).{0,8}(?:rare|scarce)/i.test(lower))return 2;
 if(/(?:魔法|魔術|魔力)(?:は|が)?(?:限定的|限られている)|\blow[ -]?magic\b/i.test(source))return 3;
 if(/(?:魔法|魔術|魔力)(?:は|が)?(?:非常に|とても)?(?:普遍|豊富|豊か|日常的|ありふれている)|(?:魔法|魔术|魔力)(?:普遍|丰富|豐富|常見|常见)|\b(?:high|common|abundant)[ -]?magic\b|\bmagic\s+is\s+(?:common|abundant)\b/i.test(source))return 8;
 return null
}

export function resolveWorldBlueprint(draft){
 const d=draft?.schemaVersion===2?draft:createWorldCreationDraft(draft),r=rng(d.masterSeed),style=d.basic.worldStyle.value,base=STYLE_BASE[style]||STYLE_BASE["王道奇幻"];
 const scale=resolveField(d.basic.worldScale,"scale",base,r,{values:["小型","中型","大型"]});
 const a=d.advanced,promptMagic=explicitMagicLevel(d);let magicLevel=resolveField(a.magicLevel,"magic",base,r,{min:1,max:10});
 if(promptMagic!=null&&a.magicLevel?.mode==="style"&&a.magicLevel?.locked!==true)magicLevel={...magicLevel,value:promptMagic,source:BLUEPRINT_SOURCES.USER};
 const resolved={
  civilizationLevel:resolveField(a.civilizationLevel,"civilization",base,r,{min:1,max:10}),
  technologyLevel:resolveField(a.technologyLevel,"technology",base,r,{min:1,max:10}),
  magicLevel,
  civilizationCount:resolveField(a.civilizationCount,"civilizationCount",base,r,{min:1,max:12}),
  speciesCount:resolveField(a.speciesCount,"speciesCount",base,r,{min:1,max:12}),
  languageCount:resolveField(a.languageCount,"languageCount",base,r,{min:1,max:16}),
  politicalUnity:resolveField(a.politicalUnity,"politicalUnity",base,r,{min:1,max:10}),
  religionInfluence:resolveField(a.religionInfluence,"religion",base,r,{min:1,max:10}),
  resourceAbundance:resolveField(a.resourceAbundance,"resources",base,r,{min:1,max:10}),
  worldDanger:resolveField(a.worldDanger,"danger",base,r,{min:1,max:10}),
  warState:resolveField(a.warState,"warState",base,r,{values:["PEACE","TENSION","WAR"]}),
  unknownRatio:resolveField(a.unknownRatio,"unknownRatio",base,r,{min:10,max:95}),
  survivalIntensity:resolveField(a.survivalIntensity,"survival",base,r,{min:1,max:10})
 };
 return {
  schemaVersion:2,
  masterSeed:d.masterSeed,
  style:{value:style,source:d.basic.worldStyle.locked===true||d.basic.worldStyle.mode==="fixed"?BLUEPRINT_SOURCES.USER:d.basic.worldStyle.mode==="random"?BLUEPRINT_SOURCES.RANDOM:BLUEPRINT_SOURCES.STYLE,locked:d.basic.worldStyle.locked===true},
  scale,
  targetPlayHours:d.basic.targetPlayHours,
  difficulty:d.basic.difficulty,
  customStyleDescription:d.basic.customStyleDescription||"",
  advanced:resolved,
  player:structuredClone(d.player),
  customWorldDescription:d.customWorldDescription,
  storyPreferences:[...d.storyPreferences],
  rules:structuredClone(d.rules)
 }
}

export function buildWorldConstitution(blueprint){
 const b=blueprint,hardRules=[],softRules=[];
 let i=1;
 for(const term of b.rules.required)hardRules.push({id:"WC2-REQ-"+i++,kind:"REQUIRE",term,text:`必須存在：${term}`});
 i=1;for(const term of b.rules.forbidden)hardRules.push({id:"WC2-FORBID-"+i++,kind:"FORBID",term,text:`禁止出現：${term}`});
 i=1;for(const term of b.rules.allowed)softRules.push({id:"WC2-MAY-"+i++,kind:"ALLOW",term,text:`可以存在但不是必須：${term}`});
 i=1;for(const preference of b.storyPreferences)softRules.push({id:"WC2-DESTINY-"+i++,kind:"DESTINY_TENDENCY",weight:.6,text:preference});
 hardRules.push({id:"WC2-CIVILIZATION_COUNT",kind:"COUNT_REQUIREMENT",target:"CIVILIZATION",minimum:Math.max(1,Number(b.advanced.civilizationCount.value)||1),text:`主要文明／部落至少 ${Math.max(1,Number(b.advanced.civilizationCount.value)||1)} 個`});
 hardRules.push({id:"WC2-SPECIES_COUNT",kind:"COUNT_REQUIREMENT",target:"SPECIES",minimum:Math.max(1,Number(b.advanced.speciesCount.value)||1),text:`智慧種族至少 ${Math.max(1,Number(b.advanced.speciesCount.value)||1)} 個`});
 hardRules.push({id:"WC2-LANGUAGE_COUNT",kind:"COUNT_REQUIREMENT",target:"LANGUAGE",minimum:Math.max(1,Number(b.advanced.languageCount.value)||1),text:`語言至少 ${Math.max(1,Number(b.advanced.languageCount.value)||1)} 個`});
 hardRules.push({id:"WC2-DIFFICULTY",kind:"DIFFICULTY",text:`難度規則：${DIFFICULTY_PRESETS[b.difficulty].label}`});
 hardRules.push({id:"WC2-ORIGIN",kind:"ORIGIN",text:`玩家起源：${ORIGIN_PRESETS[b.player.origin.type]?.label||"自訂"}`});
 return {version:2,hardRules,softRules}
}

function originProfile(origin){
 const p=ORIGIN_PRESETS[origin.type]||ORIGIN_PRESETS.custom,custom=clean(origin.custom,400);
 const earth=p.knowledgePolicy==="EARTH_ONLY";
 return {
  id:"WC2_"+p.id.toUpperCase(),label:p.label,era:earth?"contemporary":"world_defined",originWorld:earth?"Earth":"world_defined",
  background:custom||(`${p.label}起源；具體身份、開局位置與因果由 World Compiler 依 World Constitution 建立。`),
  commonKnowledge:earth?["保留現代地球的一般生活、衛生與基礎科學常識。","現代常識不等於異世界 Canon。"]:["只保留符合起源的合理常識；未經 World Compiler 建立的世界資訊不可憑空知道。"],
  defaultValues:[],
  initialAssumptions:[`合法身份：${p.legalStatus}`,`語言起點：${p.languagePolicy}`,`知識邊界：${p.knowledgePolicy}`],
  worldKnowledgeBoundary:`World Creation 2.0 origin policy=${p.knowledgePolicy}; 不得把 hidden/director truth 當成玩家已知資訊。`,
  legalStatus:p.legalStatus,languagePolicy:p.languagePolicy,knowledgePolicy:p.knowledgePolicy,openingBias:p.openingBias
 }
}

export function worldBlueprintProfile(blueprint){
 const b=blueprint,d=DIFFICULTY_PRESETS[b.difficulty]||DIFFICULTY_PRESETS.normal,a=b.advanced,origin=ORIGIN_PRESETS[b.player.origin.type]||ORIGIN_PRESETS.custom,role=ROLE_PRESETS[b.player.role.type]||ROLE_PRESETS.custom;
 const row=x=>({value:x?.value,source:x?.source||BLUEPRINT_SOURCES.AI_INFERRED,locked:x?.locked===true});
 return {
  version:1,
  origin:{type:origin.id,source:BLUEPRINT_SOURCES.USER,knowledgePolicy:origin.knowledgePolicy,languagePolicy:origin.languagePolicy},
  playerRole:{type:role.id,source:BLUEPRINT_SOURCES.USER},
  difficulty:{value:b.difficulty,source:BLUEPRINT_SOURCES.USER},
  civilizationLevel:row(a.civilizationLevel),
  technologyLevel:row(a.technologyLevel),
  magicLevel:row(a.magicLevel),
  civilizationCount:row(a.civilizationCount),
  speciesCount:row(a.speciesCount),
  languageCount:row(a.languageCount),
  politicalUnity:row(a.politicalUnity),
  religionInfluence:row(a.religionInfluence),
  resourceAbundance:row(a.resourceAbundance),
  worldDanger:row(a.worldDanger),
  warState:row(a.warState),
  unknownRatio:row(a.unknownRatio),
  survivalIntensity:row(a.survivalIntensity),
  languageDifficulty:{value:d.languageBarrier,source:BLUEPRINT_SOURCES.USER},
  survivalRules:{hunger:d.hunger,fatigue:d.fatigue,statusEffects:d.statusEffects,hpFloor:d.hpFloor,injuryRecovery:d.injuryRecovery,carryWeight:d.carryWeight,environment:d.environment,permadeath:d.permadeath},
  mustExist:[...b.rules.required],mayExist:[...b.rules.allowed],forbidden:[...b.rules.forbidden],storyTendencies:[...b.storyPreferences],
  inspiration:clean(b.customWorldDescription,500),customStyleDescription:clean(b.customStyleDescription,500),targetPlayHours:b.targetPlayHours
 }
}

export function compileWorldCreation(draft){
 const blueprint=resolveWorldBlueprint(draft),constitution=buildWorldConstitution(blueprint),difficultyRules=structuredClone(DIFFICULTY_PRESETS[blueprint.difficulty]),role=ROLE_PRESETS[blueprint.player.role.type]||ROLE_PRESETS.custom;
 const advanced=blueprint.advanced;
 const clauses=[
  blueprint.rules.required.length&&`硬性必須存在：${blueprint.rules.required.join("、")}`,
  blueprint.rules.forbidden.length&&`硬性禁止出現：${blueprint.rules.forbidden.join("、")}`,
  `起源：${ORIGIN_PRESETS[blueprint.player.origin.type]?.label||"自訂"}；定位：${role.label}`,
  blueprint.style.value==="自訂世界"&&blueprint.customStyleDescription&&`自訂世界風格：${clean(blueprint.customStyleDescription,260)}`,
  `文明${advanced.civilizationLevel.value}/10、科技${advanced.technologyLevel.value}/10、魔法${advanced.magicLevel.value}/10、文明數${advanced.civilizationCount.value}、種族${advanced.speciesCount.value}、語言${advanced.languageCount.value}、政治統一${advanced.politicalUnity.value}/10、宗教${advanced.religionInfluence.value}/10、資源${advanced.resourceAbundance.value}/10、危險${advanced.worldDanger.value}/10、生存${advanced.survivalIntensity.value}/10、戰爭=${advanced.warState.value}、未知區域${advanced.unknownRatio.value}%`,
  blueprint.rules.allowed.length&&`可以存在：${blueprint.rules.allowed.join("、")}`,
  blueprint.storyPreferences.length&&`故事傾向：${clean(blueprint.storyPreferences.join("；"),220)}`,
  blueprint.customWorldDescription&&`世界願望：${clean(blueprint.customWorldDescription,320)}`
 ].filter(Boolean);
 const blueprintProfile=worldBlueprintProfile(blueprint),creationV2={schemaVersion:2,draft:structuredClone(draft),blueprint,blueprintProfile,constitution,difficultyRules,originProfile:originProfile(blueprint.player.origin),role:{id:role.id,label:role.label,custom:blueprint.player.role.custom,bias:structuredClone(role.bias)},contract:null};
 return {
  playerName:blueprint.player.name,
  worldviewMode:"style",
  genre:blueprint.style.value,
  scale:blueprint.scale.value,
  danger:toLegacyLevel10(advanced.worldDanger.value),
  magic:toLegacyLevel10(advanced.magicLevel.value),
  politics:toLegacyLevel10(11-advanced.politicalUnity.value),
  playHours:blueprint.targetPlayHours,
  prompt:clean(clauses.join("\n"),800),
  worldCreationSeed:blueprint.masterSeed,
  blueprintProfile,
  creationV2
 }
}

const REQUIRED_TERM_ALIASES=Object.freeze({
 "人工智慧":["人工智慧","人工智能","artificial intelligence"],
 "網絡通訊":["網絡通訊","網路通訊","網絡通信","網路通信","通訊網絡","通訊網路","通信網絡","通信網路","network communication","network communications"]
});
function normalizeRequirementText(value){
 return String(value||"").normalize("NFKC").toLocaleLowerCase().replace(/[「」『』【】〈〉《》"'\`´’‘“”·・\\/\s_\-—–、，,。.!！？?：:；;（）()\[\]{}]+/g,"")
}
function requiredElementMentioned(source,term){
 const raw=String(source||""),canonical=normalizeRequirementText(term);if(!canonical)return false;
 const normalized=normalizeRequirementText(raw);
 if(normalized.includes(canonical))return true;
 const aliases=REQUIRED_TERM_ALIASES[String(term||"").trim()]||[];
 if(aliases.some(alias=>normalized.includes(normalizeRequirementText(alias))))return true;
 if(canonical==="人工智慧"&&/(^|[^a-z0-9])a\.?i\.?([^a-z0-9]|$)/i.test(raw))return true;
 return false
}
function positiveMention(source,term){
 const s=String(source||"").normalize("NFKC").toLocaleLowerCase(),t=String(term||"").normalize("NFKC").toLocaleLowerCase();if(!t)return false;
 let at=s.indexOf(t);
 while(at>=0){
  const before=s.slice(Math.max(0,at-28),at),after=s.slice(at+t.length,Math.min(s.length,at+t.length+24)),around=before+"<TERM>"+after;
  const negated=/(?:沒有|不存在|並不存在|從未存在|禁止|不得|不可|不會|未發展|排除|無法使用|不使用|無此|並無|without|forbid|prohibit|does not exist|do not exist|doesn't exist|never existed|no\s*$)/i.test(before)||/^(?:並)?(?:不存在|沒有|並無|不會存在|被禁止|is absent|does not exist|is forbidden)/i.test(after.trim())||/(?:不存在|沒有|並無).{0,8}<TERM>/i.test(around);
  if(!negated)return true;
  at=s.indexOf(t,at+t.length)
 }
 return false
}
function positiveRequiredMention(source,term){
 const variants=[String(term||"").trim(),...(REQUIRED_TERM_ALIASES[String(term||"").trim()]||[])].filter(Boolean);
 if(variants.some(v=>positiveMention(source,v)))return true;
 return normalizeRequirementText(term)==="人工智慧"&&/(?:^|[^a-z0-9])a\.?i\.?(?:[^a-z0-9]|$)/i.test(String(source||""))&&!/(?:沒有|不存在|禁止|不得|without|no)\s*.{0,12}a\.?i\.?/i.test(String(source||""))
}
const WORLD_TEMPLATE_PLACEHOLDER=/^\s*(?:\d+\s*-\s*\d+\s*字|地點類型|簡短|可空或穩定ID)(?:\s*[:：]|$)|\bnearby\b/i;
function semanticCandidateErrors(candidate){
 const errors=[],locations=Array.isArray(candidate?.generation?.locations)?candidate.generation.locations:[];
 for(const loc of locations){const p=loc?.weatherProfile||{},a=new Set((Array.isArray(p.affinities)?p.affinities:[]).map(String)),s=new Set((Array.isArray(p.suppressions)?p.suppressions:[]).map(String));if([...a].some(id=>s.has(id)))errors.push("WC2_WEATHER_PROFILE_CONFLICT:"+(String(loc?.name||loc?.id||"location").slice(0,80)))}
 let leaked=false;const walk=v=>{if(leaked||v==null)return;if(typeof v==="string"){if(WORLD_TEMPLATE_PLACEHOLDER.test(v))leaked=true;return}if(Array.isArray(v)){for(const x of v)walk(x);return}if(typeof v==="object")for(const x of Object.values(v))walk(x)};walk({openingHook:candidate?.openingHook||"",generation:candidate?.generation||{}});if(leaked)errors.push("WC2_TEMPLATE_LEAK");
 return errors
}
export function validateWorldCreationCandidate(seed,candidate){
 const creation=seed?.creationV2,errors=[];if(!creation)return {valid:true,errors,compliance:{}};
 const rules=creation.blueprint?.rules||{required:[],forbidden:[]},expected=creation.blueprintProfile||worldBlueprintProfile(creation.blueprint),actual=candidate?.worldBible?.blueprintProfile;
 const bible={...(candidate?.worldBible||{})};delete bible.blueprintProfile;
 const searchable=JSON.stringify({
  worldTheme:candidate?.worldTheme||"",summary:candidate?.summary||"",worldBible:bible,
  publicFacts:candidate?.publicFacts||[],hiddenFacts:candidate?.hiddenFacts||[],worldHistory:candidate?.worldHistory||[],
  worldTimeline:candidate?.worldTimeline||[],generation:candidate?.generation||{}
 });
 for(const term of rules.required||[])if(term&&!positiveRequiredMention(searchable,term))errors.push("WC2_REQUIRED_MISSING:"+term);
 const generated=JSON.stringify({
  theme:candidate?.worldTheme||"",summary:candidate?.summary||"",worldBible:bible,openingHook:candidate?.openingHook||"",
  facts:[...(candidate?.publicFacts||[]),...(candidate?.hiddenFacts||[])],history:candidate?.worldHistory||[],timeline:candidate?.worldTimeline||[],generation:candidate?.generation||{}
 });
 for(const term of rules.forbidden||[])if(term&&positiveMention(generated,term))errors.push("WC2_FORBIDDEN_PRESENT:"+term);
 errors.push(...semanticCandidateErrors(candidate));
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),pass=(ok,evidence)=>({status:ok?"PASS":"FAIL",evidence});
 const originOk=same(actual?.origin,expected.origin),techOk=same(actual?.technologyLevel,expected.technologyLevel),civOk=same(actual?.civilizationLevel,expected.civilizationLevel)&&same(actual?.civilizationCount,expected.civilizationCount),difficultyOk=same(actual?.difficulty,expected.difficulty)&&same(actual?.languageDifficulty,expected.languageDifficulty)&&same(actual?.survivalRules,expected.survivalRules);
 if(!actual)errors.push("BLUEPRINT_PROFILE_REQUIRED");
 else{
  if(!originOk)errors.push("BLUEPRINT_ORIGIN_MISMATCH");
  if(!techOk)errors.push("BLUEPRINT_TECH_MISMATCH");
  if(!civOk)errors.push("BLUEPRINT_CIVILIZATION_MISMATCH");
  if(!difficultyOk)errors.push("BLUEPRINT_DIFFICULTY_MISMATCH")
 }
 const forbiddenOk=!errors.some(x=>x.startsWith("WC2_FORBIDDEN_PRESENT:")),mustOk=!errors.some(x=>x.startsWith("WC2_REQUIRED_MISSING:")),semanticOk=!errors.some(x=>x.startsWith("WC2_WEATHER_PROFILE_CONFLICT:")||x==="WC2_TEMPLATE_LEAK");
 const compliance={
  ORIGIN_COMPLIANCE:pass(originOk,`origin=${expected.origin.type}`),
  TECH_COMPLIANCE:pass(techOk,`technologyLevel=${expected.technologyLevel.value}; source=${expected.technologyLevel.source}`),
  CIVILIZATION_COMPLIANCE:pass(civOk,`civilizationLevel=${expected.civilizationLevel.value}; count=${expected.civilizationCount.value}`),
  DIFFICULTY_COMPLIANCE:pass(difficultyOk,`difficulty=${expected.difficulty.value}; language=${expected.languageDifficulty.value}`),
  MUST_EXIST_COMPLIANCE:pass(mustOk,`required=${expected.mustExist.join("、")||"none"}`),
  FORBIDDEN_CONTENT_COMPLIANCE:pass(forbiddenOk,`forbidden=${expected.forbidden.join("、")||"none"}`),
  SEMANTIC_CLEANLINESS_COMPLIANCE:pass(semanticOk,semanticOk?"no generation template/weather conflicts":"semantic generation defect detected")
 };
 return {valid:errors.length===0,errors:[...new Set(errors)],compliance}
}

export function applyWorldCreationState(state,seed){
 const creation=seed?.creationV2;if(!state||!creation)return state;
 state.world.creation=structuredClone(creation);
 state.world.seed={...state.world.seed,worldCreationSeed:seed.worldCreationSeed,creationV2:structuredClone(creation)};
 const dynamic=[...creation.constitution.hardRules,...creation.constitution.softRules].map(x=>({...x}));
 const ids=new Set((state.world.constitution||[]).map(x=>x.id));
 state.world.constitution=[...(state.world.constitution||[]),...dynamic.filter(x=>!ids.has(x.id))];
 state.player.origin=structuredClone(creation.originProfile);
 state.player.role=structuredClone(creation.role);
 state.player.difficulty=creation.difficultyRules.id;applyOriginRuntime(state,{phase:"PRE_WORLD"});
 return state
}

export function buildWorldContract(state){
 const c=state?.world?.creation,b=c?.blueprint;if(!b)return null;
 const a=b.advanced,d=c.difficultyRules,o=ORIGIN_PRESETS[b.player.origin.type]||ORIGIN_PRESETS.custom;
 return {
  version:2,
  title:"世界契約",
  worldStyle:b.style.value,
  worldScale:b.scale.value,
  targetPlayHours:b.targetPlayHours,
  difficulty:d.label,
  origin:o.label,
  role:c.role.label,
  metrics:{civilization:a.civilizationLevel.value,technology:a.technologyLevel.value,magic:a.magicLevel.value,civilizations:a.civilizationCount.value,species:a.speciesCount.value,languages:a.languageCount.value,politicalUnity:a.politicalUnity.value,religion:a.religionInfluence.value,resources:a.resourceAbundance.value,danger:a.worldDanger.value,survival:a.survivalIntensity.value,unknownRatio:a.unknownRatio.value,warState:a.warState.value},
  difficultyFlags:{hunger:d.hunger,fatigue:d.fatigue,statusEffects:d.statusEffects,savePolicy:d.savePolicy,languageBarrier:d.languageBarrier,permadeath:d.permadeath},
  structure:[
   `文明程度 ${a.civilizationLevel.value}/10 · 科技 ${a.technologyLevel.value}/10 · 魔法 ${a.magicLevel.value}/10`,
   `主要文明／部落約 ${a.civilizationCount.value} · 智慧種族約 ${a.speciesCount.value} · 語言約 ${a.languageCount.value}`,
   `政治統一 ${a.politicalUnity.value}/10 · 宗教影響 ${a.religionInfluence.value}/10 · 資源 ${a.resourceAbundance.value}/10`,
   `世界危險 ${a.worldDanger.value}/10 · 生存強度 ${a.survivalIntensity.value}/10 · 未知區域約 ${a.unknownRatio.value}% · ${a.warState.value}`
  ],
  difficultyRules:[
   d.hunger?"飢餓系統啟用":"不消耗飽食度",
   d.fatigue?"疲勞系統啟用":"沒有疲勞消耗",
   d.statusEffects?"負面狀態啟用":"不產生一般負面狀態",
   d.savePolicy==="AUTO_ONLY"?"只允許自動存檔":"可自由存檔",
   d.languageBarrier==="HIGH"?"高語言／文字理解障礙":d.languageBarrier==="LOW"?"低語言障礙":"標準語言障礙",
   d.permadeath?"永久死亡啟用":"預設不使用永久死亡"
  ],
  storyPreferences:[...b.storyPreferences],
  required:[...b.rules.required],
  allowed:[...b.rules.allowed],
  forbidden:[...b.rules.forbidden],
  unknown:["世界真正歷史","主要勢力真正目的","尚未探索區域與文明","隱藏世界真相","故事傾向是否、何時以及如何發生"],
  customWorldDescription:b.customWorldDescription
 }
}

export function worldContractHtml(contract){
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const locale=["zh-Hant","zh-Hans","en","ja"].includes(globalThis.ELYNDRA_LOCALE)?globalThis.ELYNDRA_LOCALE:"zh-Hant";
 const text={
  "zh-Hant":{title:"世界契約",intro:"這是玩家選擇與 Engine 約束的公開摘要，不包含 Hidden World State。",world:"世界",difficulty:"難度",origin:"起源",role:"定位",structure:"世界結構",rules:"難度規則",story:"故事偏好（只作傾向，不保證發生）",required:"必須存在",allowed:"可以存在",forbidden:"禁止出現",unknown:"仍然未知",edit:"返回修改",accept:"穿越到這個世界",civilization:"文明程度",technology:"科技",magic:"魔法",civilizations:"主要文明／部落約",species:"智慧種族約",languages:"語言約",politics:"政治統一",religion:"宗教影響",resources:"資源",danger:"世界危險",survival:"生存強度",unknownArea:"未知區域約",hungerOn:"飢餓系統啟用",hungerOff:"不消耗飽食度",fatigueOn:"疲勞系統啟用",fatigueOff:"沒有疲勞消耗",statusOn:"負面狀態啟用",statusOff:"不產生一般負面狀態",autoSave:"只允許自動存檔",freeSave:"可自由存檔",langHigh:"高語言／文字理解障礙",langLow:"低語言障礙",langStd:"標準語言障礙",deathOn:"永久死亡啟用",deathOff:"預設不使用永久死亡",unknownRows:["世界真正歷史","主要勢力真正目的","尚未探索區域與文明","隱藏世界真相","故事傾向是否、何時以及如何發生"]},
  "zh-Hans":{title:"世界契约",intro:"这是玩家选择与 Engine 约束的公开摘要，不包含 Hidden World State。",world:"世界",difficulty:"难度",origin:"起源",role:"定位",structure:"世界结构",rules:"难度规则",story:"故事偏好（仅作为倾向，不保证发生）",required:"必须存在",allowed:"可以存在",forbidden:"禁止出现",unknown:"仍然未知",edit:"返回修改",accept:"穿越到这个世界",civilization:"文明程度",technology:"科技",magic:"魔法",civilizations:"主要文明／部落约",species:"智慧种族约",languages:"语言约",politics:"政治统一",religion:"宗教影响",resources:"资源",danger:"世界危险",survival:"生存强度",unknownArea:"未知区域约",hungerOn:"饥饿系统启用",hungerOff:"不消耗饱食度",fatigueOn:"疲劳系统启用",fatigueOff:"没有疲劳消耗",statusOn:"负面状态启用",statusOff:"不产生一般负面状态",autoSave:"只允许自动存档",freeSave:"可自由存档",langHigh:"高语言／文字理解障碍",langLow:"低语言障碍",langStd:"标准语言障碍",deathOn:"永久死亡启用",deathOff:"默认不使用永久死亡",unknownRows:["世界真实历史","主要势力真实目的","尚未探索的区域与文明","隐藏的世界真相","故事倾向是否、何时以及如何发生"]},
  en:{title:"World Contract",intro:"This is a public summary of player choices and Engine constraints. Hidden World State is not included.",world:"World",difficulty:"Difficulty",origin:"Origin",role:"Role",structure:"World Structure",rules:"Difficulty Rules",story:"Story Preferences (tendencies only; not guaranteed)",required:"Required",allowed:"May Exist",forbidden:"Forbidden",unknown:"Still Unknown",edit:"Back to Edit",accept:"Enter This World",civilization:"Civilization",technology:"Technology",magic:"Magic",civilizations:"Major civilizations/tribes ≈",species:"Sapient species ≈",languages:"Languages ≈",politics:"Political unity",religion:"Religious influence",resources:"Resources",danger:"World danger",survival:"Survival intensity",unknownArea:"Unexplored regions ≈",hungerOn:"Hunger system enabled",hungerOff:"Satiety is not consumed",fatigueOn:"Fatigue system enabled",fatigueOff:"No fatigue consumption",statusOn:"Negative status effects enabled",statusOff:"Standard negative status effects disabled",autoSave:"Autosave only",freeSave:"Free saving allowed",langHigh:"High language/literacy barrier",langLow:"Low language barrier",langStd:"Standard language barrier",deathOn:"Permadeath enabled",deathOff:"Permadeath disabled by default",unknownRows:["The world's true history","The true goals of major powers","Unexplored regions and civilizations","Hidden truths of the world","Whether, when, and how story tendencies occur"]},
  ja:{title:"世界契約",intro:"これはプレイヤーの選択と Engine 制約の公開概要です。Hidden World State は含まれません。",world:"世界",difficulty:"難易度",origin:"起源",role:"立場",structure:"世界構造",rules:"難易度ルール",story:"物語の傾向（傾向のみで、発生は保証されません）",required:"必須要素",allowed:"存在可能",forbidden:"禁止要素",unknown:"まだ不明",edit:"編集に戻る",accept:"この世界へ渡る",civilization:"文明度",technology:"技術",magic:"魔法",civilizations:"主要文明／部族 約",species:"知的種族 約",languages:"言語 約",politics:"政治統一度",religion:"宗教影響",resources:"資源",danger:"世界危険度",survival:"生存強度",unknownArea:"未探索地域 約",hungerOn:"空腹システム有効",hungerOff:"満腹度を消費しない",fatigueOn:"疲労システム有効",fatigueOff:"疲労消費なし",statusOn:"負の状態異常が有効",statusOff:"通常の負の状態異常なし",autoSave:"オートセーブのみ",freeSave:"自由にセーブ可能",langHigh:"高い言語／識字障壁",langLow:"低い言語障壁",langStd:"標準的な言語障壁",deathOn:"永久死亡あり",deathOff:"永久死亡は標準で無効",unknownRows:["世界の真の歴史","主要勢力の真の目的","未探索の地域と文明","隠された世界の真実","物語の傾向が発生するか、いつ、どのように発生するか"]}
 }[locale];
 const enums={
  "王道奇幻":{"zh-Hant":"王道奇幻","zh-Hans":"王道奇幻",en:"High Fantasy",ja:"王道ファンタジー"},"黑暗奇幻":{"zh-Hant":"黑暗奇幻","zh-Hans":"黑暗奇幻",en:"Dark Fantasy",ja:"ダークファンタジー"},"東方幻想":{"zh-Hant":"東方幻想","zh-Hans":"东方幻想",en:"Eastern Fantasy",ja:"東方幻想"},"蒸汽魔法":{"zh-Hant":"蒸汽魔法","zh-Hans":"蒸汽魔法",en:"Steam Magic",ja:"スチームマジック"},"末日異世界":{"zh-Hant":"末日異世界","zh-Hans":"末日异世界",en:"Apocalyptic Otherworld",ja:"終末異世界"},"小型":{"zh-Hant":"小型","zh-Hans":"小型",en:"Small",ja:"小規模"},"中型":{"zh-Hant":"中型","zh-Hans":"中型",en:"Medium",ja:"中規模"},"大型":{"zh-Hant":"大型","zh-Hans":"大型",en:"Large",ja:"大規模"},"簡單":{"zh-Hant":"簡單","zh-Hans":"简单",en:"Easy",ja:"簡単"},"普通":{"zh-Hant":"普通","zh-Hans":"普通",en:"Normal",ja:"普通"},"困難":{"zh-Hant":"困難","zh-Hans":"困难",en:"Hard",ja:"困難"},"現實":{"zh-Hant":"現實","zh-Hans":"现实",en:"Realistic",ja:"リアル"},"穿越":{"zh-Hant":"穿越","zh-Hans":"穿越",en:"World Crossing",ja:"異世界転移"},"轉生":{"zh-Hant":"轉生","zh-Hans":"转生",en:"Reincarnation",ja:"転生"},"被召喚":{"zh-Hant":"被召喚","zh-Hans":"被召唤",en:"Summoned",ja:"召喚"},"附身":{"zh-Hant":"附身","zh-Hans":"附身",en:"Possession",ja:"憑依"},"原住民":{"zh-Hant":"原住民","zh-Hans":"原住民",en:"Native",ja:"現地人"},"失憶":{"zh-Hant":"失憶","zh-Hans":"失忆",en:"Amnesia",ja:"記憶喪失"},"完全自訂":{"zh-Hant":"完全自訂","zh-Hans":"完全自定义",en:"Custom",ja:"完全カスタム"},"普通人":{"zh-Hant":"普通人","zh-Hans":"普通人",en:"Ordinary Person",ja:"一般人"},"冒險者":{"zh-Hant":"冒險者","zh-Hans":"冒险者",en:"Adventurer",ja:"冒険者"},"英雄候選人":{"zh-Hant":"英雄候選人","zh-Hans":"英雄候选人",en:"Hero Candidate",ja:"英雄候補"},"商人":{"zh-Hant":"商人","zh-Hans":"商人",en:"Merchant",ja:"商人"},"貴族":{"zh-Hant":"貴族","zh-Hans":"贵族",en:"Noble",ja:"貴族"},"研究者":{"zh-Hant":"研究者","zh-Hans":"研究者",en:"Researcher",ja:"研究者"},"反派陣營":{"zh-Hant":"反派陣營","zh-Hans":"反派阵营",en:"Antagonist Faction",ja:"敵対陣営"}
 };
 const war={PEACE:{"zh-Hant":"和平","zh-Hans":"和平",en:"Peace",ja:"平和"},TENSION:{"zh-Hant":"緊張","zh-Hans":"紧张",en:"Tension",ja:"緊張"},WAR:{"zh-Hant":"戰爭","zh-Hans":"战争",en:"War",ja:"戦争"}};const local=v=>war[String(v)]?.[locale]??enums[String(v)]?.[locale]??String(v??"");
 const lines=(title,rows)=>rows?.length?`<div class="contract-group"><small>${esc(title)}</small><p>${rows.map(esc).join("<br>")}</p></div>`:"";
 const m=contract.metrics,f=contract.difficultyFlags;
 const structure=m?[`${text.civilization} ${m.civilization}/10 · ${text.technology} ${m.technology}/10 · ${text.magic} ${m.magic}/10`,`${text.civilizations} ${m.civilizations} · ${text.species} ${m.species} · ${text.languages} ${m.languages}`,`${text.politics} ${m.politicalUnity}/10 · ${text.religion} ${m.religion}/10 · ${text.resources} ${m.resources}/10`,`${text.danger} ${m.danger}/10 · ${text.survival} ${m.survival}/10 · ${text.unknownArea} ${m.unknownRatio}% · ${local(m.warState)}`]:contract.structure;
 const rules=f?[f.hunger?text.hungerOn:text.hungerOff,f.fatigue?text.fatigueOn:text.fatigueOff,f.statusEffects?text.statusOn:text.statusOff,f.savePolicy==="AUTO_ONLY"?text.autoSave:text.freeSave,f.languageBarrier==="HIGH"?text.langHigh:f.languageBarrier==="LOW"?text.langLow:text.langStd,f.permadeath?text.deathOn:text.deathOff]:contract.difficultyRules;
 const unknown=m?text.unknownRows:contract.unknown;
 return `<div class="eyebrow">WORLD CREATION 2.0</div><h2>${esc(text.title)}</h2><p class="muted">${esc(text.intro)}</p><div class="contract-summary"><div><small>${esc(text.world)}</small><strong>${esc(local(contract.worldStyle))} · ${esc(local(contract.worldScale))}</strong></div><div><small>${esc(text.difficulty)}</small><strong>${esc(local(contract.difficulty))}</strong></div><div><small>${esc(text.origin)}</small><strong>${esc(local(contract.origin))}</strong></div><div><small>${esc(text.role)}</small><strong>${esc(local(contract.role))}</strong></div></div>${lines(text.structure,structure)}${lines(text.rules,rules)}${lines(text.story,contract.storyPreferences)}${lines(text.required,contract.required)}${lines(text.allowed,contract.allowed)}${lines(text.forbidden,contract.forbidden)}${lines(text.unknown,unknown)}<div class="contract-actions"><button id="editWorldContract" class="secondary" type="button">${esc(text.edit)}</button><button id="acceptWorldContract" class="primary" type="button">${esc(text.accept)}</button></div>`
}
