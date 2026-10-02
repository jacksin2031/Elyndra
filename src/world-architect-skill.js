const obj=v=>v&&typeof v==="object"&&!Array.isArray(v);
const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const list=v=>Array.isArray(v)?v:[];
const uniq=v=>[...new Set(list(v).map(x=>clean(x,180)).filter(Boolean))];

export const WORLD_ARCHITECT_PATTERNS=Object.freeze([
 Object.freeze({id:"LAW_TO_SOCIETY",name:"Rule → Society Cascade",principle:"世界硬規則必須產生日常、制度與權力後果。"}),
 Object.freeze({id:"SCARCITY_TO_CONFLICT",name:"Scarcity → Conflict",principle:"稀缺資源或能力限制必須形成利益衝突，而非只作背景設定。"}),
 Object.freeze({id:"INSTITUTIONAL_RESPONSE",name:"Institutional Response",principle:"文明會建立法律、職業、宗教或市場去回應長期世界壓力。"}),
 Object.freeze({id:"LAYERED_TRUTH",name:"Layered World Truth",principle:"公開認知、矛盾線索與深層真相必須分層，避免第一幕直接解說世界秘密。"}),
 Object.freeze({id:"DAILY_LIFE_PROOF",name:"Daily-Life Proof",principle:"重大設定必須至少改變食物、交通、教育、醫療、工作、家庭或交易其中數項。"}),
 Object.freeze({id:"STORY_ENGINE",name:"Persistent Story Engine",principle:"衝突來源必須能在沒有主角介入時繼續發展，並提供多種玩家介入槓桿。"}),
 Object.freeze({id:"TROPE_CAUSALITY",name:"Trope Requires Cause",principle:"公會、勇者、魔王、等級等常見元素只能在有世界內因果時存在。"}),
 Object.freeze({id:"ORIGIN_ALIGNMENT",name:"Origin Alignment",principle:"世界設計必須容納玩家起源，但不能因此提前授權玩家知道 Hidden Canon。"})
]);
export const WORLD_ARCHITECT_SKILL_DIRECTIVE=`你同時使用 Elyndra World Architect Skill。只使用抽象世界設計原理，不複製作品人物、專名、情節或文風。生成順序：核心幻想與 Hook → 世界硬規則 → 可觀察代價 → 因果鏈 → 文明制度 → 日常生活 → 利益衝突 → Mystery layers → 可持續 Story Engines。每個重要制度都必須能追溯到規則或歷史壓力；每個 Story Engine 都必須能在玩家不介入時自行發展，並保留至少兩種介入方式。常見類型元素不可當成預設；若使用，必須提供 world-internal causal basis 與本世界特有變形。世界差異必須改變制度、生活方式與決策，而不只是替換名詞。`;
export function worldArchitectRequiredSchema(){
 return {
  coreFantasy:"20-60字；玩家實際會感受到的核心幻想",
  worldHook:"20-80字；只屬於這個世界的一句高概念",
  laws:[
   {rule:"硬規則",cost:"限制／代價",observableEffect:"居民可觀察後果"},
   {rule:"第二條硬規則",cost:"限制／代價",observableEffect:"可觀察後果"}
  ],
  consequenceChains:[
   {cause:"規則或稀缺",consequences:["直接後果","社會適應","二階後果"],institution:"因此形成的制度",conflict:"制度造成或無法解決的利益衝突"},
   {cause:"第二個原因",consequences:["直接後果","社會適應","二階後果"],institution:"另一制度",conflict:"另一衝突"}
  ],
  dailyLifeImpacts:["至少3項；必須涵蓋不同生活領域"],
  storyEngines:[
   {pressure:"會自行發展的壓力",actors:["至少2種利益方"],escalation:"玩家不介入時如何惡化",playerLevers:["至少2種不同介入方式"]},
   {pressure:"第二個壓力",actors:["利益方"],escalation:"惡化方式",playerLevers:["介入方式1","介入方式2"]}
  ],
  mysteryLayers:{surfaceBelief:"居民通常相信甚麼",contradiction:"可逐步發現的矛盾",hiddenMechanism:"Director-level 深層機制；不可自動成為玩家知識"},
  tropeAudit:[{trope:"若使用常見類型元素才填",causalBasis:"它為何在此世界合理存在",twist:"它如何因本世界規則而不同"}]
 }
}

export function buildWorldArchitectBrief({identity,seedContract,blueprintProfile,styleFoundation}={}){
 return {
  version:1,
  doctrine:WORLD_ARCHITECT_PATTERNS.map(x=>({id:x.id,principle:x.principle})),
  identity:identity||null,
  hardConstraints:{seedContract:seedContract||null,blueprintProfile:blueprintProfile||null,styleFoundation:styleFoundation||null},
  required:worldArchitectRequiredSchema()
 }
}
export function worldDesignLogicIssues(value){
 const d=obj(value?.worldBible?.designLogic)?value.worldBible.designLogic:obj(value?.designLogic)?value.designLogic:null,issues=[];
 if(!d)return ["DESIGN_LOGIC_REQUIRED"];
 if(clean(d.coreFantasy,160).length<8)issues.push("CORE_FANTASY_WEAK");
 if(clean(d.worldHook,240).length<12)issues.push("WORLD_HOOK_WEAK");
 const laws=list(d.laws).filter(obj);
 if(laws.length<2)issues.push("LAWS_MIN_2");
 for(const [i,x] of laws.entries())if(!clean(x.rule,240)||!clean(x.cost,240)||!clean(x.observableEffect,240))issues.push(`LAW_${i+1}_INCOMPLETE`);
 const chains=list(d.consequenceChains).filter(obj);
 if(chains.length<2)issues.push("CONSEQUENCE_CHAINS_MIN_2");
 for(const [i,x] of chains.entries()){
  if(!clean(x.cause,240)||uniq(x.consequences).length<3||!clean(x.institution,240)||!clean(x.conflict,300))issues.push(`CHAIN_${i+1}_INCOMPLETE`)
 }
 if(uniq(d.dailyLifeImpacts).length<3)issues.push("DAILY_LIFE_IMPACTS_MIN_3");
 const engines=list(d.storyEngines).filter(obj);
 if(engines.length<2)issues.push("STORY_ENGINES_MIN_2");
 for(const [i,x] of engines.entries())if(!clean(x.pressure,240)||uniq(x.actors).length<2||!clean(x.escalation,300)||uniq(x.playerLevers).length<2)issues.push(`STORY_ENGINE_${i+1}_INCOMPLETE`);
 const mystery=d.mysteryLayers;
 if(!obj(mystery)||![mystery.surfaceBelief,mystery.contradiction,mystery.hiddenMechanism].every(x=>clean(x,300).length>=8))issues.push("MYSTERY_LAYERS_INCOMPLETE");
 return [...new Set(issues)]
}
export function fallbackWorldDesignLogic(identity={},blueprintProfile={}){
 const theme=clean(identity.worldTheme,160)||"失序世界規則",magic=Math.max(1,Math.min(5,Number(identity.magic)||3)),danger=Math.max(1,Math.min(5,Number(identity.danger)||3));
 const required=uniq(blueprintProfile?.mustExist).slice(0,3),req=required.length?required.join("、"):"地方資源與舊文明遺產";
 return {
  coreFantasy:`在「${theme}」支配的世界中，以觀察、適應與選擇逐步取得生存與影響力。`,
  worldHook:`${theme}會留下可被居民利用、恐懼與誤解的現實後果，文明因此形成互相衝突的生存制度。`,
  laws:[
   {rule:`${theme}具有穩定但不完全被理解的可觀察規律。`,cost:magic>=4?"使用或干預世界力量會累積個人代價，不能無限制施展。":"理解與利用異常需要時間、工具與風險承擔。",observableEffect:"居民能從環境、身體或設施變化判斷規律正在作用。"},
   {rule:`${req}的取得與維持受地理和制度限制。`,cost:danger>=4?"錯誤分配會迅速造成安全與生存危機。":"錯誤分配會造成供應、身份或地方秩序壓力。",observableEffect:"不同聚落會出現不同配給、交易、禁忌與保護措施。"}
  ],
  consequenceChains:[
   {cause:`${theme}持續影響生活`,consequences:["居民先建立辨識與避險方法","方法被職業、法律或習俗固定","掌握方法的人取得新的權力"],institution:"地方形成專門管理異常與風險的制度",conflict:"制度保護多數人的同時，也限制沒有資格、資源或身份的人。"},
   {cause:`${req}並非所有地方都同樣充足`,consequences:["聚落發展不同交換與保存方式","交通與資訊路線成為戰略資產","供應中斷會迫使勢力重新談判或爭奪"],institution:"資源分配與跨區交換制度",conflict:"地方生存需求、掌控者利益與外來者需求無法同時滿足。"}
  ],
  dailyLifeImpacts:["家庭與工作會依異常風險安排時間與路線。","交易價格會隨可安全取得的地方資源與交通狀況變動。","教育、信仰或師徒制度會保存辨識世界規則的方法。"],
  storyEngines:[
   {pressure:"維持既有制度的成本正在上升",actors:["依賴舊制度的人","要求改變分配方式的人"],escalation:"若沒有人處理，供應與信任下降，地方開始採取更強制的措施。",playerLevers:["協助修復或重分配資源","揭露替代方案或促成新的利益交換"]},
   {pressure:"居民對世界規則的共同理解出現矛盾",actors:["維持官方解釋的群體","掌握反常證據的群體"],escalation:"新證據累積後會造成恐慌、壓制或派系分裂。",playerLevers:["調查證據並控制公開節奏","利用不同群體的需求建立合作或對抗"]}
  ],
  mysteryLayers:{surfaceBelief:`居民以現有制度解釋「${theme}」，並相信其基本秩序可靠。`,contradiction:"某些可重複觀察的現象無法被現行解釋完整說明。",hiddenMechanism:`當前危機與「${theme}」真正運作方式之間存在被歷史遮蔽的直接因果。`},
  tropeAudit:[]
 }
}

const TROPE_RX=/冒險者公會|冒険者ギルド|魔王|勇者|等級制度|等級系統|技能系統|狀態面板|轉生特典|全能教會|全球通用貨幣|adventurer guild|demon king|chosen hero|level system|status screen/i;
export function worldArchitectQualityFindings(candidate){
 const issues=worldDesignLogicIssues(candidate),findings=[];
 if(issues.length)findings.push({severity:"HIGH",targetType:"CAUSAL_DEPTH",problem:"世界設計邏輯不完整："+issues.join(", "),recommendation:"補齊硬規則、至少兩條三階因果鏈、日常後果、Mystery layers 與可持續 Story Engines。",requiresRegeneration:true});
 const corpus=JSON.stringify({theme:candidate?.worldTheme,bible:candidate?.worldBible,history:candidate?.worldHistory,generation:candidate?.generation});
 if(TROPE_RX.test(corpus)){
  const audit=list(candidate?.worldBible?.designLogic?.tropeAudit).filter(x=>clean(x?.causalBasis,300)&&clean(x?.twist,300));
  if(!audit.length)findings.push({severity:"MEDIUM",targetType:"ANTI_CLICHE",problem:"世界使用常見異世界類型元素，但沒有記錄它們的世界內成因與本世界變形。",recommendation:"不要直接移除類型元素；先解釋其形成的資源、法律、歷史或魔法原因，再讓其制度形態因本世界規則而不同。",requiresRegeneration:true})
 }
 return findings
}
