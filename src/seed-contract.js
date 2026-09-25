import {getWorldStylePreset,applyWorldStyleBase} from "./world-style-presets.js?v=57014";
import {createTimelinePacing} from "./world-timeline.js?v=57014";
const text=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const level=v=>Math.max(1,Math.min(5,Math.round(Number(v)||1)));
const scaleValue=v=>["小型","中型","大型"].includes(v)?v:"中型";
const rowValue=(c,key)=>c?.[key]?.value;
const evidence=(c,key)=>text(c?.[key]?.evidence,500);
export function createWorldSeedContract(seed={}){
 const random=["ai","random"].includes(seed.worldviewMode),styled=applyWorldStyleBase(seed),preset=random?null:getWorldStylePreset(styled.genre),blueprintProfile=seed.blueprintProfile||seed.creationV2?.blueprintProfile||null,customFoundation=styled.genre==="自訂世界"?text(blueprintProfile?.customStyleDescription,500):"";
 return {
  worldviewMode:random?"ai":"style",
  genre:random?"AI_DECIDES":text(styled.genre,80),
  theme:"AI_DECIDES",
  scale:random?"AI_DECIDES":scaleValue(styled.scale),
  danger:random?null:level(styled.danger),
  magic:random?null:level(styled.magic),
  politics:random?null:level(styled.politics),
  prompt:text(seed.prompt,800),
  targetPlayHours:createTimelinePacing(seed.playHours).targetPlayHours,
  styleFoundation:random?"由 AI 自行建立完整世界觀基礎":(customFoundation||text(preset?.foundation,500)),
  blueprintProfile:blueprintProfile?structuredClone(blueprintProfile):null
 }
}
function chosenValue(c,key,expected){
 const v=rowValue(c,key);
 if(key==="danger"||key==="magic"||key==="politics")return Number.isFinite(Number(v))?level(v):null;
 return text(v,key==="theme"?160:80)
}
export function validateSeedCompliance(seed,candidate){
 const base=createWorldSeedContract(seed),c=candidate?.seedCompliance,errors=[];
 if(!c||typeof c!=="object"||Array.isArray(c))return {valid:false,errors:["SEED_COMPLIANCE_REQUIRED"],expected:base};
 const resolved={...base};
 for(const key of ["genre","theme","scale","danger","magic","politics"]){
  const row=c[key];
  if(!row||typeof row!=="object"||Array.isArray(row)){errors.push(`SEED_${key.toUpperCase()}_MISSING`);continue}
  const chosen=chosenValue(c,key,base[key]);
  if(key==="theme"){
   if(!chosen)errors.push("SEED_THEME_MISSING");else resolved.theme=chosen
  }else if(base.worldviewMode==="ai"){
   if((key==="danger"||key==="magic"||key==="politics")&&chosen==null)errors.push(`SEED_${key.toUpperCase()}_INVALID`);
   else if(key==="scale"&&!["小型","中型","大型"].includes(chosen))errors.push("SEED_SCALE_INVALID");
   else if(!chosen)errors.push(`SEED_${key.toUpperCase()}_INVALID`);
   else resolved[key]=chosen
  }else if(String(chosen)!==String(base[key]))errors.push(`SEED_${key.toUpperCase()}_MISMATCH`);
  if(evidence(c,key).length<8)errors.push(`SEED_${key.toUpperCase()}_EVIDENCE_MISSING`)
 }
 if(!candidate?.worldTheme||text(candidate.worldTheme,160)!==resolved.theme)errors.push("WORLD_THEME_MISMATCH");
 const p=c.prompt;
 if(base.prompt){
  if(!p||typeof p!=="object"||Array.isArray(p))errors.push("SEED_PROMPT_MISSING");
  else{
   if(text(p.value,800)!==base.prompt)errors.push("SEED_PROMPT_MISMATCH");
   if(text(p.evidence,500).length<8)errors.push("SEED_PROMPT_EVIDENCE_MISSING")
  }
 }
 const evidenceRows=["genre","theme","scale","danger","magic","politics",...(base.prompt?["prompt"]:[])].map(k=>evidence(c,k)).filter(Boolean);
 if(new Set(evidenceRows).size<Math.min(5,evidenceRows.length))errors.push("SEED_EVIDENCE_NOT_SPECIFIC");
 const bible=candidate?.worldBible;
 if(!bible||typeof bible!=="object"||Array.isArray(bible))errors.push("SEED_WORLD_BIBLE_REQUIRED");
 else for(const key of ["era","centralConflict","magicCost","startingRegion","startingSettlement","startingLocation","ancientTruth","currentCrisis","tone"])if(!text(bible[key],600))errors.push(`SEED_WORLD_BIBLE_${key.toUpperCase()}_MISSING`);
 if(resolved.politics>=4&&(candidate?.generation?.factions?.length||0)<1)errors.push("SEED_POLITICS_STRUCTURE_MISSING");
 if(resolved.danger>=4&&text(bible?.currentCrisis,600).length<12)errors.push("SEED_DANGER_STRUCTURE_WEAK");
 if(text(bible?.magicCost,600).length<12)errors.push("SEED_MAGIC_STRUCTURE_WEAK");
 return {valid:errors.length===0,errors:[...new Set(errors)],expected:resolved}
}
export function localSeedCompliance(seed){
 const s=createWorldSeedContract(seed),pick=(key,fallback)=>s[key]==="AI_DECIDES"||s[key]==null?fallback:s[key],theme=text(seed.theme,120)||"AI生成主題",make=(value,msg)=>({value,evidence:msg});
 const genre=pick("genre","奇幻異世界"),scale=pick("scale","中型"),danger=pick("danger",3),magic=pick("magic",3),politics=pick("politics",3);
 return {
  genre:make(genre,`世界以「${genre}」作為整體風格基礎。`),
  theme:make(theme,`世界核心主題由 World Architect 決定為「${theme}」。`),
  scale:make(scale,`世界採用「${scale}」規模並保留 lazy generation 空間。`),
  danger:make(danger,`危險度採用 ${danger}/5 並影響生存壓力與事件風險。`),
  magic:make(magic,`魔法普及度採用 ${magic}/5 並影響社會與施法規則。`),
  politics:make(politics,`政治複雜度採用 ${politics}/5 並影響勢力與利益關係。`),
  ...(s.prompt?{prompt:make(s.prompt,"玩家自訂要求被視為不可忽略的世界生成條件。")}:{})
 }
}
export function seedDirective(seed){
 const s=createWorldSeedContract(seed),random=s.worldviewMode==="ai";
 const timelinePacing=createTimelinePacing(s.targetPlayHours);
 return {
  contract:s,
  timelinePacing,
  styleFoundation:random?null:{...getWorldStylePreset(s.genre),foundation:s.styleFoundation},
  blueprintProfile:s.blueprintProfile,
  randomEntropy:text(seed.worldviewEntropy,120),
  rules:[
   random
    ?"AI 必須自行隨機決定 genre、theme、scale、danger、magic、politics，六項要互相形成有因果的世界觀；不要固定回到王道奇幻或常見模板"
    :s.genre==="自訂世界"?`genre=自訂世界；styleFoundation 是玩家直接提供的風格描述，禁止回退到任何內建 preset：${s.styleFoundation}`:`genre=${s.genre} 是世界基礎風格；必須遵守 styleFoundation，並在此基礎上創造獨特世界`,
   "theme 必須由 AI 自行創造，不可從 UI 固定清單選擇；theme 要成為 centralConflict、歷史、危機或世界真相的核心因果",
   ...(s.blueprintProfile?["blueprintProfile 是 Engine 已解析並鎖定的 World Blueprint；USER / STYLE / RANDOM 的 resolved value 都不得被 AI 改寫，AI 只可補充具體世界表現"]:[]),
   "不得把現實地球的公曆年份、國家制度、現代法幣或全球通用金幣當作預設；世界必須有自己的時間稱呼與文明規則",
   "每個首次生成的城鎮、地區或勢力都要建立自己的 culture 與 trade；可以因政治或歷史共享制度，但必須有世界內因果，不能假設全世界同一貨幣與文化",
   `希望遊玩時間約 ${s.targetPlayHours} 小時；世界大事件必須依 timelinePacing 分布，短篇更密集、長篇保留更長伏筆與中後期轉折`,
   ...(random?[]:[
    `danger=${s.danger}/5 必須影響生存壓力、敵對環境與風險密度`,
    `magic=${s.magic}/5 必須影響魔法可見度、取得難度、社會用途與代價`,
    `politics=${s.politics}/5 必須影響勢力數量感、利益衝突與政治關係複雜度`,
    `scale=${s.scale} 控制世界整體範圍，但開局仍只生成最小可玩區域`
   ]),
   ...(s.prompt?[`custom prompt 必須被視為硬性世界要求：${s.prompt}`]:[])
  ]
 }
}