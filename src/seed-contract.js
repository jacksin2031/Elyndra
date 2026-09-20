const text=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const level=v=>Math.max(1,Math.min(5,Math.round(Number(v)||1)));
export function createWorldSeedContract(seed={}){
 return {
  genre:text(seed.genre,80),
  theme:text(seed.theme,120),
  scale:text(seed.scale,40),
  danger:level(seed.danger),
  magic:level(seed.magic),
  politics:level(seed.politics),
  prompt:text(seed.prompt,800)
 }
}
const exact=(actual,expected)=>String(actual??"")===String(expected??"");
export function validateSeedCompliance(seed,candidate){
 const expected=createWorldSeedContract(seed),c=candidate?.seedCompliance,errors=[];
 if(!c||typeof c!=="object"||Array.isArray(c))return {valid:false,errors:["SEED_COMPLIANCE_REQUIRED"],expected};
 for(const key of ["genre","theme","scale","danger","magic","politics"]){
  const row=c[key];
  if(!row||typeof row!=="object"||Array.isArray(row))errors.push(`SEED_${key.toUpperCase()}_MISSING`);
  else{
   if(!exact(row.value,expected[key]))errors.push(`SEED_${key.toUpperCase()}_MISMATCH`);
   if(text(row.evidence,500).length<8)errors.push(`SEED_${key.toUpperCase()}_EVIDENCE_MISSING`)
  }
 }
 const p=c.prompt;
 if(expected.prompt){
  if(!p||typeof p!=="object"||Array.isArray(p))errors.push("SEED_PROMPT_MISSING");
  else{
   if(text(p.value,800)!==expected.prompt)errors.push("SEED_PROMPT_MISMATCH");
   if(text(p.evidence,500).length<8)errors.push("SEED_PROMPT_EVIDENCE_MISSING")
  }
 }
 const evidenceRows=["genre","theme","scale","danger","magic","politics",...(expected.prompt?["prompt"]:[])].map(k=>text(c?.[k]?.evidence,500)).filter(Boolean);
 if(new Set(evidenceRows).size<Math.min(5,evidenceRows.length))errors.push("SEED_EVIDENCE_NOT_SPECIFIC");
 const bible=candidate?.worldBible;
 if(!bible||typeof bible!=="object"||Array.isArray(bible))errors.push("SEED_WORLD_BIBLE_REQUIRED");
 else for(const key of ["era","centralConflict","magicCost","startingRegion","startingSettlement","startingLocation","ancientTruth","currentCrisis","tone"])if(text(bible[key],600).length<3)errors.push(`SEED_WORLD_BIBLE_${key.toUpperCase()}_MISSING`);
 if(expected.politics>=4&&(candidate?.generation?.factions?.length||0)<1)errors.push("SEED_POLITICS_STRUCTURE_MISSING");
 if(expected.danger>=4&&text(bible?.currentCrisis,600).length<12)errors.push("SEED_DANGER_STRUCTURE_WEAK");
 if(text(bible?.magicCost,600).length<12)errors.push("SEED_MAGIC_STRUCTURE_WEAK");
 return {valid:errors.length===0,errors:[...new Set(errors)],expected}
}
export function localSeedCompliance(seed){
 const s=createWorldSeedContract(seed),row=(value,evidence)=>({value,evidence});
 return {
  genre:row(s.genre,`本地 Canon 以「${s.genre}」作為敘事與世界結構風格。`),
  theme:row(s.theme,`本地 Canon 將「${s.theme}」固定為世界核心主題。`),
  scale:row(s.scale,`世界採用「${s.scale}」規模並保留 lazy generation 空間。`),
  danger:row(s.danger,`危險度固定為 ${s.danger}/5，供事件與生存壓力系統使用。`),
  magic:row(s.magic,`魔法普及度固定為 ${s.magic}/5，供魔法規則與社會設定使用。`),
  politics:row(s.politics,`政治複雜度固定為 ${s.politics}/5，供勢力與關係網生成使用。`),
  ...(s.prompt?{prompt:row(s.prompt,`玩家自訂世界要求已寫入不可忽略的 World Seed Contract。`)}:{})
 }
}
export function seedDirective(seed){
 const s=createWorldSeedContract(seed);
 return {
  contract:s,
  rules:[
   `genre=${s.genre} 必須實際影響 tone、環境、文化與事件風格`,
   `theme=${s.theme} 必須成為 centralConflict、歷史或危機的核心因果，而非裝飾詞`,
   `danger=${s.danger}/5 必須影響生存壓力、敵對環境與風險密度`,
   `magic=${s.magic}/5 必須影響魔法可見度、取得難度、社會用途與代價；低值不可生成遍地日常魔法，高值不可把魔法寫成極罕見`,
   `politics=${s.politics}/5 必須影響勢力數量感、利益衝突與政治關係複雜度；低值保持簡單，高值需要多層利益與立場`,
   `scale=${s.scale} 控制世界的整體範圍，但開局仍只生成最小可玩區域並採 lazy generation`,
   ...(s.prompt?[`custom prompt 必須被視為硬性世界要求：${s.prompt}`]:[])
  ]
 }
}