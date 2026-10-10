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
  architectureVersion:2,
  coreFantasy:"20-60字；玩家實際會感受到的核心幻想",
  worldHook:"20-80字；只屬於這個世界的一句高概念",
  themeQuestion:"這個世界反覆迫使角色面對的核心問題",
  coreDifference:"如果移除就會令文明根本變成另一個世界的結構性差異",
  laws:[
   {rule:"硬規則",cost:"限制／代價",observableEffect:"居民可觀察後果"},
   {rule:"第二條硬規則",cost:"限制／代價",observableEffect:"可觀察後果"}
  ],
  consequenceChains:[
   {cause:"規則或稀缺",consequences:["直接後果","社會適應","二階後果"],institution:"因此形成的制度",conflict:"制度造成或無法解決的利益衝突"},
   {cause:"第二個原因",consequences:["直接後果","社會適應","二階後果"],institution:"另一制度",conflict:"另一衝突"}
  ],
  dailyLifeImpacts:["至少3項；必須涵蓋不同生活領域"],
  resourceLoops:[
   {resource:"文明重要資源",controller:"主要控制者",dependency:"誰依賴它以及為何",conflict:"稀缺或分配造成的衝突"},
   {resource:"第二項重要資源",controller:"主要控制者",dependency:"依賴關係",conflict:"利益衝突"}
  ],
  storyEngines:[
   {pressure:"會自行發展的壓力",actors:["至少2種利益方"],escalation:"玩家不介入時如何惡化",playerLevers:["至少2種不同介入方式"]},
   {pressure:"第二個壓力",actors:["利益方1","利益方2"],escalation:"惡化方式",playerLevers:["介入方式1","介入方式2"]}
  ],
  worldWithoutPlayer:{ongoingProcesses:["至少2項即使玩家不存在仍會持續的進程"],nextEscalations:["至少1項沒有介入就會發生的下一步"]},
  mysteryLayers:{surfaceBelief:"居民通常相信甚麼",contradiction:"可逐步發現的矛盾",hiddenMechanism:"Director-level 深層機制；不可自動成為玩家知識"},
  mysteryArchitecture:{question:"長期核心謎題",trueAnswer:"生成時即固定的 Director 真相",falseExplanations:["至少1個合理錯誤解釋"],stakeholders:["至少2個利益相關者"],evidenceSeeds:[{clue:"預置線索",initialInterpretation:"初見時可能理解",trueMeaning:"真相揭曉後的真正意義"},{clue:"第二線索",initialInterpretation:"初始理解",trueMeaning:"真正意義"},{clue:"第三線索",initialInterpretation:"初始理解",trueMeaning:"真正意義"}],revealConditions:["至少1個合理揭露條件"]},
  narrativeContract:{entryProblem:"開局立即問題",immediateDesire:"玩家自然會產生的近期具體目標，不替玩家決定價值觀",advantage:"起源或情境提供的特殊優勢",limitation:"優勢或處境的限制",cost:"使用力量／追求目標會承受的代價",informationGap:"知道甚麼／誤解甚麼／不知道甚麼",anchorPromise:"可能逐漸成為家的地方或群體",relationshipPromise:"至少一段值得投入的重要關係方向",irreversibleRisk:"可能留下永久後果的風險",identityQuestion:"角色身份將被迫面對的問題",belongingQuestion:"歸屬問題",escalationPath:["PERSONAL","INSTITUTIONAL","WORLD"]},
  campaignArchitecture:{premise:"Director-only 長線故事骨架；不是強制玩家主線",centralQuestion:"故事反覆逼近但不替玩家回答的問題",stages:[
   {key:"SURVIVE",pressure:"開局生存／立即壓力",directorGoal:"這一階段要讓哪些世界因果變得可玩",turningConditions:["可驗證的升階條件"],failureEscalation:"玩家不介入時世界如何繼續"},
   {key:"ORIENT",pressure:"地方規則與立足點",directorGoal:"讓制度／資源因果進入玩法",turningConditions:["升階條件"],failureEscalation:"忽略後的自然後果"},
   {key:"CONTACT",pressure:"人物／群體利益開始碰撞",directorGoal:"建立可持續關係與選擇成本",turningConditions:["升階條件"],failureEscalation:"關係與計畫自行推進"},
   {key:"INVESTIGATE",pressure:"已知事實出現矛盾",directorGoal:"以多源證據接近固定真相但不提前揭露",turningConditions:["升階條件"],failureEscalation:"錯誤理解或壓力如何擴大"},
   {key:"CRISIS",pressure:"制度／勢力／世界壓力交會",directorGoal:"讓玩家此前關係與任務結果改變可用選項",turningConditions:["升階條件"],failureEscalation:"不介入時不可逆風險如何增加"},
   {key:"CLIMAX",pressure:"既有後果集中到不可逆選擇",directorGoal:"回收已播種證據與關係，不新增憑空最終真相",turningConditions:["收束條件"],failureEscalation:"世界仍依其因果繼續"}
  ],resolutionPrinciples:["回收先前任務結果","至少提供兩種因果上成立的處理方向","結果改變世界而非重置世界"]},
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
 if(Number(d.architectureVersion)!==2)issues.push("ARCHITECTURE_VERSION_2_REQUIRED");
 if(clean(d.coreFantasy,160).length<8)issues.push("CORE_FANTASY_WEAK");
 if(clean(d.worldHook,240).length<12)issues.push("WORLD_HOOK_WEAK");
 if(clean(d.themeQuestion,240).length<12)issues.push("THEME_QUESTION_WEAK");
 if(clean(d.coreDifference,360).length<16)issues.push("CORE_DIFFERENCE_WEAK");
 const laws=list(d.laws).filter(obj);
 if(laws.length<2)issues.push("LAWS_MIN_2");
 for(const [i,x] of laws.entries())if(!clean(x.rule,240)||!clean(x.cost,240)||!clean(x.observableEffect,240))issues.push(`LAW_${i+1}_INCOMPLETE`);
 const chains=list(d.consequenceChains).filter(obj);
 if(chains.length<2)issues.push("CONSEQUENCE_CHAINS_MIN_2");
 for(const [i,x] of chains.entries()){
  if(!clean(x.cause,240)||uniq(x.consequences).length<3||!clean(x.institution,240)||!clean(x.conflict,300))issues.push(`CHAIN_${i+1}_INCOMPLETE`)
 }
 if(uniq(d.dailyLifeImpacts).length<3)issues.push("DAILY_LIFE_IMPACTS_MIN_3");
 const resources=list(d.resourceLoops).filter(obj);
 if(resources.length<2)issues.push("RESOURCE_LOOPS_MIN_2");
 for(const [i,x] of resources.entries())if(!clean(x.resource,180)||!clean(x.controller,180)||!clean(x.dependency,260)||!clean(x.conflict,260))issues.push(`RESOURCE_LOOP_${i+1}_INCOMPLETE`);
 const engines=list(d.storyEngines).filter(obj);
 if(engines.length<2)issues.push("STORY_ENGINES_MIN_2");
 for(const [i,x] of engines.entries())if(!clean(x.pressure,240)||uniq(x.actors).length<2||!clean(x.escalation,300)||uniq(x.playerLevers).length<2)issues.push(`STORY_ENGINE_${i+1}_INCOMPLETE`);
 const mystery=d.mysteryLayers;
 if(!obj(mystery)||![mystery.surfaceBelief,mystery.contradiction,mystery.hiddenMechanism].every(x=>clean(x,300).length>=8))issues.push("MYSTERY_LAYERS_INCOMPLETE");
 const w=d.worldWithoutPlayer;
 if(!obj(w)||uniq(w.ongoingProcesses).length<2||uniq(w.nextEscalations).length<1)issues.push("WORLD_WITHOUT_PLAYER_INCOMPLETE");
 const ma=d.mysteryArchitecture;
 if(!obj(ma)||clean(ma.question,300).length<8||clean(ma.trueAnswer,500).length<8||list(ma.evidenceSeeds).filter(x=>obj(x)&&clean(x.clue,240)&&clean(x.trueMeaning,300)).length<3)issues.push("MYSTERY_ARCHITECTURE_INCOMPLETE");
 const nc=d.narrativeContract,storyFields=["entryProblem","immediateDesire","advantage","limitation","cost","informationGap","anchorPromise","relationshipPromise","irreversibleRisk","identityQuestion","belongingQuestion"];
 if(!obj(nc)||storyFields.some(k=>clean(nc?.[k],300).length<6)||uniq(nc?.escalationPath).length<3)issues.push("NARRATIVE_CONTRACT_INCOMPLETE");
 return [...new Set(issues)]
}
export function fallbackWorldDesignLogic(identity={},blueprintProfile={}){
 const theme=clean(identity.worldTheme,160)||"失序世界規則",magic=Math.max(1,Math.min(5,Number(identity.magic)||3)),danger=Math.max(1,Math.min(5,Number(identity.danger)||3));
 const required=uniq(blueprintProfile?.mustExist).slice(0,3),req=required.length?required.join("、"):"地方資源與舊文明遺產";
 return {
  architectureVersion:2,
  coreFantasy:`在「${theme}」支配的世界中，以觀察、適應與選擇逐步取得生存與影響力。`,
  worldHook:`${theme}會留下可被居民利用、恐懼與誤解的現實後果，文明因此形成互相衝突的生存制度。`,
  themeQuestion:`當「${theme}」迫使人們用制度交換安全與自由時，個人應該接受多少代價？`,
  coreDifference:`「${theme}」不是裝飾性魔法，而是直接改變資源取得、制度資格、日常避險與權力分配的文明級規則。`,
  laws:[
   {rule:`${theme}具有穩定但不完全被理解的可觀察規律。`,cost:magic>=4?"使用或干預世界力量會累積個人代價，不能無限制施展。":"理解與利用異常需要時間、工具與風險承擔。",observableEffect:"居民能從環境、身體或設施變化判斷規律正在作用。"},
   {rule:`${req}的取得與維持受地理和制度限制。`,cost:danger>=4?"錯誤分配會迅速造成安全與生存危機。":"錯誤分配會造成供應、身份或地方秩序壓力。",observableEffect:"不同聚落會出現不同配給、交易、禁忌與保護措施。"}
  ],
  consequenceChains:[
   {cause:`${theme}持續影響生活`,consequences:["居民先建立辨識與避險方法","方法被職業、法律或習俗固定","掌握方法的人取得新的權力"],institution:"地方形成專門管理異常與風險的制度",conflict:"制度保護多數人的同時，也限制沒有資格、資源或身份的人。"},
   {cause:`${req}並非所有地方都同樣充足`,consequences:["聚落發展不同交換與保存方式","交通與資訊路線成為戰略資產","供應中斷會迫使勢力重新談判或爭奪"],institution:"資源分配與跨區交換制度",conflict:"地方生存需求、掌控者利益與外來者需求無法同時滿足。"}
  ],
  dailyLifeImpacts:["家庭與工作會依異常風險安排時間與路線。","交易價格會隨可安全取得的地方資源與交通狀況變動。","教育、信仰或師徒制度會保存辨識世界規則的方法。"],
  resourceLoops:[
   {resource:req,controller:"掌握主要取得路線與保存技術的地方組織",dependency:"聚落的生存、交通與基本交易依賴穩定供應",conflict:"控制者希望維持資格與價格，居民則要求更公平的分配。"},
   {resource:`能安全利用「${theme}」的知識與工具`,controller:"保存辨識方法、工具與舊紀錄的專門群體",dependency:"居民需要它降低工作、旅行與施術風險",conflict:"知識公開能提高整體安全，卻會削弱既有專業群體的權力。"}
  ],
  storyEngines:[
   {pressure:"維持既有制度的成本正在上升",actors:["依賴舊制度的人","要求改變分配方式的人"],escalation:"若沒有人處理，供應與信任下降，地方開始採取更強制的措施。",playerLevers:["協助修復或重分配資源","揭露替代方案或促成新的利益交換"]},
   {pressure:"居民對世界規則的共同理解出現矛盾",actors:["維持官方解釋的群體","掌握反常證據的群體"],escalation:"新證據累積後會造成恐慌、壓制或派系分裂。",playerLevers:["調查證據並控制公開節奏","利用不同群體的需求建立合作或對抗"]}
  ],
  worldWithoutPlayer:{ongoingProcesses:["地方組織繼續爭奪資源分配權並調整限制。","掌握異常證據的人持續累積資料並與官方解釋產生摩擦。"],nextEscalations:["若沒有外力介入，供應與信任危機會迫使其中一方採取更強制的控制手段。"]},
  mysteryLayers:{surfaceBelief:`居民以現有制度解釋「${theme}」，並相信其基本秩序可靠。`,contradiction:"某些可重複觀察的現象無法被現行解釋完整說明。",hiddenMechanism:`當前危機與「${theme}」真正運作方式之間存在被歷史遮蔽的直接因果。`},
  mysteryArchitecture:{question:`「${theme}」真正的運作方式為何與官方理解出現偏差？`,trueAnswer:`當前危機與「${theme}」的深層機制本來就是同一套舊世界系統的兩種表現，現有制度只理解其中可利用的表層。`,falseExplanations:["居民普遍認為異常只是周期性災害。"],stakeholders:["維持既有制度的人","掌握反常證據的人"],evidenceSeeds:[{clue:"同類異常在不同制度區域留下相同物理痕跡",initialInterpretation:"可能只是巧合或共同災害",trueMeaning:"異常來自同一個更底層機制"},{clue:"舊紀錄的禁忌與現代安全規程使用相同條件",initialInterpretation:"後人沿用古老迷信",trueMeaning:"兩者都源於曾被理解過的真實規則"},{clue:"資源短缺與異常強度在時間上同步",initialInterpretation:"危機令供應惡化",trueMeaning:"資源系統與異常機制共享同一原因"}],revealConditions:["玩家必須取得至少三類相互獨立的可驗證證據後才可完整推論。"]},
  narrativeContract:{entryProblem:"玩家抵達時立即面對一個可感知、可行動而未解決的異常。",immediateDesire:"先確保安全並理解眼前環境，而不是被預設成救世主。",advantage:"外來視角能注意居民已習以為常但互相矛盾的規則痕跡。",limitation:"缺乏本地身份、關係與完整背景知識，不能把外來常識視為答案。",cost:"取得力量、情報或影響力都需要承擔時間、信譽、資源或世界規則的實際代價。",informationGap:"玩家會知道少量可感知事實、對部分現象形成可能誤解，並保留大量 Director 真相未知。",anchorPromise:"開局聚落與逐步建立的關係可以成為值得保護、也可能被玩家選擇離開的生活錨點。",relationshipPromise:"至少一名有自己生活與界線的角色會因共同後果與玩家建立持續關係。",irreversibleRisk:"玩家的公開技術、承諾、背叛、救援或制度介入可能永久改變人物與地方。",identityQuestion:"當世界開始以某種身份看待玩家時，玩家是否接受、拒絕或重新定義那個身份？",belongingQuestion:"當原本的外來者逐漸擁有需要守護的人與地方時，哪裡才算自己的世界？",escalationPath:["PERSONAL","INSTITUTIONAL","WORLD"]},
  campaignArchitecture:{premise:`玩家在「${theme}」造成的地方壓力中先求生與理解，再透過人物、制度與證據逐步決定如何介入；所有後段衝突必須回收前段任務與關係結果。`,centralQuestion:`當理解「${theme}」的代價逐漸增加時，玩家願意用甚麼換取安全、影響力與歸屬？`,stages:[
   {key:"SURVIVE",pressure:"立即可感知的安全與資源問題",directorGoal:"讓玩家以行動確認第一批可靠世界事實",turningConditions:["確認可行動的安全條件","取得第一條可靠線索"],failureEscalation:"地方風險與資源壓力照常惡化"},
   {key:"ORIENT",pressure:"地方制度、路線與資源限制",directorGoal:"讓世界規則透過日常生活而非說明書被理解",turningConditions:["確認一項地方制度因果","掌握至少一條可靠路線或資源來源"],failureEscalation:"既有制度加強限制或供應壓力"},
   {key:"CONTACT",pressure:"人物與勢力有彼此衝突的需求",directorGoal:"建立至少一段會保留承諾與後果的關係",turningConditions:["形成可持續人物關係","看見兩種利益不能同時滿足"],failureEscalation:"NPC 與勢力按自己的計畫繼續行動"},
   {key:"INVESTIGATE",pressure:"可靠證據與常見解釋產生矛盾",directorGoal:"以多來源線索逼近固定真相",turningConditions:["取得至少兩類獨立證據","辨識一個既有解釋的漏洞"],failureEscalation:"誤解、壓制或派系分裂加深"},
   {key:"CRISIS",pressure:"資源、制度、關係與真相壓力同時升高",directorGoal:"讓此前任務的完成、失敗與承諾實際改變可用方案",turningConditions:["玩家選擇具持久代價的介入方式","危機核心進入可直接影響範圍"],failureEscalation:"不可逆損失擴大但不強迫玩家成為救世主"},
   {key:"CLIMAX",pressure:"既有因果集中到不可逆選擇",directorGoal:"只回收已播種真相、人物與制度衝突，不臨時創造終局設定",turningConditions:["核心衝突產生持久結果"],failureEscalation:"世界依既有計畫與後果繼續"}
  ],resolutionPrinciples:["前置任務結果必須改變終局資源、關係或情報","至少保留兩種因果成立的處理方向","失敗也必須留下可繼續遊玩的世界狀態"]},
  tropeAudit:[]
 }
}

export function repairWorldDesignLogic(value,identity={},blueprintProfile={}){
 const source=obj(value?.worldBible?.designLogic)?value.worldBible.designLogic:obj(value?.designLogic)?value.designLogic:null,fallback=fallbackWorldDesignLogic(identity,blueprintProfile);
 if(!source)return {value:structuredClone(fallback),repairedFields:["designLogic"],issuesBefore:["DESIGN_LOGIC_REQUIRED"],issuesAfter:[]};
 const out=structuredClone(source),issuesBefore=worldDesignLogicIssues({designLogic:out}),repairedFields=[],repair=(key)=>{out[key]=structuredClone(fallback[key]);if(!repairedFields.includes(key))repairedFields.push(key)};
 if(Number(out.architectureVersion)!==2){out.architectureVersion=2;repairedFields.push("architectureVersion")}
 if(clean(out.coreFantasy,160).length<8)repair("coreFantasy");
 if(clean(out.worldHook,240).length<12)repair("worldHook");
 if(clean(out.themeQuestion,240).length<12)repair("themeQuestion");
 if(clean(out.coreDifference,360).length<16)repair("coreDifference");
 const laws=list(out.laws).filter(obj);if(laws.length<2||laws.some(x=>!clean(x.rule,240)||!clean(x.cost,240)||!clean(x.observableEffect,240)))repair("laws");
 const chains=list(out.consequenceChains).filter(obj);if(chains.length<2||chains.some(x=>!clean(x.cause,240)||list(x.consequences).filter(Boolean).length<3||!clean(x.institution,240)||!clean(x.conflict,240)))repair("consequenceChains");
 if(list(out.dailyLifeImpacts).filter(x=>clean(x,240)).length<3)repair("dailyLifeImpacts");
 const loops=list(out.resourceLoops).filter(obj);if(loops.length<2||loops.some(x=>!clean(x.resource,180)||!clean(x.controller,240)||!clean(x.dependency,240)||!clean(x.conflict,240)))repair("resourceLoops");
 const engines=list(out.storyEngines).filter(obj);if(engines.length<2||engines.some(x=>!clean(x.pressure,240)||list(x.actors).length<2||!clean(x.escalation,320)||list(x.playerLevers).length<2))repair("storyEngines");
 if(!obj(out.worldWithoutPlayer)||list(out.worldWithoutPlayer.ongoingProcesses).length<2||list(out.worldWithoutPlayer.nextEscalations).length<1)repair("worldWithoutPlayer");
 if(!obj(out.mysteryLayers)||!clean(out.mysteryLayers.surfaceBelief,300)||!clean(out.mysteryLayers.contradiction,300)||!clean(out.mysteryLayers.hiddenMechanism,400))repair("mysteryLayers");
 const ma=out.mysteryArchitecture;if(!obj(ma)||clean(ma.question,300).length<8||clean(ma.trueAnswer,500).length<8||list(ma.evidenceSeeds).filter(x=>obj(x)&&clean(x.clue,240)&&clean(x.trueMeaning,300)).length<3)repair("mysteryArchitecture");
 const nc=out.narrativeContract;if(!obj(nc)||["entryProblem","immediateDesire","advantage","limitation","cost","informationGap","anchorPromise","relationshipPromise","irreversibleRisk","identityQuestion","belongingQuestion"].some(k=>clean(nc?.[k],400).length<4)||list(nc?.escalationPath).length<3)repair("narrativeContract");
 if(!obj(out.campaignArchitecture)||list(out.campaignArchitecture.stages).length<6)repair("campaignArchitecture");
 if(!Array.isArray(out.tropeAudit)){out.tropeAudit=[];repairedFields.push("tropeAudit")}
 return {value:out,repairedFields,issuesBefore,issuesAfter:worldDesignLogicIssues({designLogic:out})}
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
