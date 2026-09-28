import * as base from "./world-creation.js?v=60010&base=1";
export * from "./world-creation.js?v=60010&base=1";

const clean=(v,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const toLegacyLevel10=v=>clamp(Math.ceil(clamp(v,1,10)/2),1,5);
const nfkc=v=>String(v??"").normalize("NFKC");

function rareMagicRequirement(term){
 const s=nfkc(term).toLowerCase();
 const magic=/(?:魔法|魔術|魔力|magic)/i.test(s);
 const rare=/(?:希少|稀少|珍し(?:い|く)|稀有|罕見|罕见|rare|scarce)/i.test(s);
 return magic&&rare
}
function ratio20Requirement(term){
 const s=nfkc(term).toLowerCase();
 return /(?:二割|2\s*割|20\s*%|五分の一|1\s*\/\s*5|one[- ]?fifth|one in five)/i.test(s)
}
function rareMagicPopulation20Requirement(term){return rareMagicRequirement(term)&&ratio20Requirement(term)}
function rareMagicEvidence(source){
 const s=nfkc(source).toLowerCase();
 const rare="(?:希少|稀少|珍し(?:い|く)|限られて|稀有|罕見|罕见|rare|scarce)";
 const magic="(?:魔法|魔術|魔力|magic)";
 return new RegExp(`${magic}.{0,32}${rare}|${rare}.{0,32}${magic}`,"isu").test(s)
}
function population20Evidence(source){
 const s=nfkc(source).toLowerCase();
 const people="(?:人口|住民|人々|人びと|使い手|術者|魔法使い|魔術師|施術者|使用者|人口中|居民|施法者|magic\\s*users?|magic\\s*practitioners?|practitioners?|population|people)";
 const ratio="(?:約|およそ|ほぼ|大約|大概|约|around|roughly|about)?\\s*(?:二割|2\\s*割|20\\s*%|五分の一|1\\s*\\/\\s*5|one[- ]?fifth|one in five)";
 return new RegExp(`${people}.{0,48}${ratio}|${ratio}.{0,48}${people}`,"isu").test(s)
}
function semanticRequiredMentioned(candidate,term){
 if(!rareMagicPopulation20Requirement(term))return false;
 const bible={...(candidate?.worldBible||{})};delete bible.blueprintProfile;
 const searchable=JSON.stringify({worldTheme:candidate?.worldTheme||"",summary:candidate?.summary||"",worldBible:bible,publicFacts:candidate?.publicFacts||[],hiddenFacts:candidate?.hiddenFacts||[],worldHistory:candidate?.worldHistory||[],worldTimeline:candidate?.worldTimeline||[],generation:candidate?.generation||{}});
 return rareMagicEvidence(searchable)&&population20Evidence(searchable)
}
function requiredMagicLevel(draft){
 const required=Array.isArray(draft?.rules?.required)?draft.rules.required:[];
 return required.some(rareMagicRequirement)?2:null
}

export function resolveWorldBlueprint(draft){
 const blueprint=base.resolveWorldBlueprint(draft),forced=requiredMagicLevel(draft);
 if(forced==null)return blueprint;
 const setting=draft?.advanced?.magicLevel;
 if(setting?.locked===true||setting?.mode==="fixed")return blueprint;
 return {...blueprint,advanced:{...blueprint.advanced,magicLevel:{...blueprint.advanced.magicLevel,value:forced,source:base.BLUEPRINT_SOURCES.USER}}}
}

export function compileWorldCreation(draft){
 const blueprint=resolveWorldBlueprint(draft),constitution=base.buildWorldConstitution(blueprint),difficultyRules=structuredClone(base.DIFFICULTY_PRESETS[blueprint.difficulty]),role=base.ROLE_PRESETS[blueprint.player.role.type]||base.ROLE_PRESETS.custom,advanced=blueprint.advanced;
 const clauses=[
  blueprint.rules.required.length&&`硬性必須存在：${blueprint.rules.required.join("、")}`,
  blueprint.rules.forbidden.length&&`硬性禁止出現：${blueprint.rules.forbidden.join("、")}`,
  `起源：${base.ORIGIN_PRESETS[blueprint.player.origin.type]?.label||"自訂"}；定位：${role.label}`,
  blueprint.style.value==="自訂世界"&&blueprint.customStyleDescription&&`自訂世界風格：${clean(blueprint.customStyleDescription,260)}`,
  `文明${advanced.civilizationLevel.value}/10、科技${advanced.technologyLevel.value}/10、魔法${advanced.magicLevel.value}/10、文明數${advanced.civilizationCount.value}、種族${advanced.speciesCount.value}、語言${advanced.languageCount.value}、政治統一${advanced.politicalUnity.value}/10、宗教${advanced.religionInfluence.value}/10、資源${advanced.resourceAbundance.value}/10、危險${advanced.worldDanger.value}/10、生存${advanced.survivalIntensity.value}/10、戰爭=${advanced.warState.value}、未知區域${advanced.unknownRatio.value}%`,
  blueprint.rules.allowed.length&&`可以存在：${blueprint.rules.allowed.join("、")}`,
  blueprint.storyPreferences.length&&`故事傾向：${clean(blueprint.storyPreferences.join("；"),220)}`,
  blueprint.customWorldDescription&&`世界願望：${clean(blueprint.customWorldDescription,320)}`
 ].filter(Boolean);
 const blueprintProfile=base.worldBlueprintProfile(blueprint),creationV2={schemaVersion:2,draft:structuredClone(draft),blueprint,blueprintProfile,constitution,difficultyRules,originProfile:base.originProfile?base.originProfile(blueprint.player.origin):null,role:{id:role.id,label:role.label,custom:blueprint.player.role.custom,bias:structuredClone(role.bias)},contract:null};
 if(!creationV2.originProfile){
  const p=base.ORIGIN_PRESETS[blueprint.player.origin.type]||base.ORIGIN_PRESETS.custom,earth=p.knowledgePolicy==="EARTH_ONLY",custom=clean(blueprint.player.origin.custom,400);
  creationV2.originProfile={id:"WC2_"+p.id.toUpperCase(),label:p.label,era:earth?"contemporary":"world_defined",originWorld:earth?"Earth":"world_defined",background:custom||(`${p.label}起源；具體身份、開局位置與因果由 World Compiler 依 World Constitution 建立。`),commonKnowledge:earth?["保留現代地球的一般生活、衛生與基礎科學常識。","現代常識不等於異世界 Canon。"]:["只保留符合起源的合理常識；未經 World Compiler 建立的世界資訊不可憑空知道。"],defaultValues:[],initialAssumptions:[`合法身份：${p.legalStatus}`,`語言起點：${p.languagePolicy}`,`知識邊界：${p.knowledgePolicy}`],worldKnowledgeBoundary:`World Creation 2.0 origin policy=${p.knowledgePolicy}; 不得把 hidden/director truth 當成玩家已知資訊。`,legalStatus:p.legalStatus,languagePolicy:p.languagePolicy,knowledgePolicy:p.knowledgePolicy,openingBias:p.openingBias}
 }
 return {playerName:blueprint.player.name,worldviewMode:"style",genre:blueprint.style.value,scale:blueprint.scale.value,danger:toLegacyLevel10(advanced.worldDanger.value),magic:toLegacyLevel10(advanced.magicLevel.value),politics:toLegacyLevel10(11-advanced.politicalUnity.value),playHours:blueprint.targetPlayHours,prompt:clean(clauses.join("\n"),800),worldCreationSeed:blueprint.masterSeed,blueprintProfile,creationV2}
}

export function validateWorldCreationCandidate(seed,candidate){
 const report=base.validateWorldCreationCandidate(seed,candidate),errors=(report.errors||[]).filter(error=>{
  if(!String(error).startsWith("WC2_REQUIRED_MISSING:"))return true;
  const term=String(error).slice("WC2_REQUIRED_MISSING:".length);
  return !semanticRequiredMentioned(candidate,term)
 });
 const compliance={...(report.compliance||{})};
 if(compliance.MUST_EXIST_COMPLIANCE&&!errors.some(x=>String(x).startsWith("WC2_REQUIRED_MISSING:")))compliance.MUST_EXIST_COMPLIANCE={...compliance.MUST_EXIST_COMPLIANCE,status:"PASS"};
 return {...report,valid:errors.length===0,errors,compliance}
}

export const __v06022={rareMagicPopulation20Requirement,rareMagicEvidence,population20Evidence,semanticRequiredMentioned};
