const freezePreset=(preset)=>Object.freeze({...preset,blueprint:Object.freeze({...preset.blueprint}),tone:Object.freeze([...preset.tone]),conflictBias:Object.freeze([...preset.conflictBias]),environmentBias:Object.freeze([...preset.environmentBias]),narrativeRules:Object.freeze([...preset.narrativeRules])});

const WORLD_STYLE_PRESETS=Object.freeze({
 "王道奇幻":freezePreset({
  danger:3,magic:4,politics:3,scale:"中型",
  blueprint:{civilization:6,technology:4,magic:8,civilizationCount:4,speciesCount:4,languageCount:5,politicalUnity:4,religion:6,resources:6,danger:6,survival:4,unknownRatio:55,warState:"TENSION",scale:"中型"},
  foundation:"以可探索的大陸、城鎮與未知區域構成的冒險世界；文明與荒野並存，超自然力量普遍但有規則與代價。",
  tone:["冒險","未知","成長","希望與危機並存"],
  civilization:"存在穩定聚落、交通與地方勢力，但世界仍保留大量未探索區域與被遺忘的歷史。",
  supernatural:"魔法可見且有社會用途，但每種力量都必須有來源、限制、代價與取得途徑。",
  conflictBias:["地方危機","勢力競爭","古代遺產","未知威脅"],
  environmentBias:["城鎮與荒野交界","遺跡","多樣地形","可拓展邊境"],
  narrativeRules:["不得預設固定救世主劇情","未知真相必須經探索取得","角色成長來自選擇與經歷而不是開局授權"]
 }),
 "黑暗奇幻":freezePreset({
  danger:5,magic:3,politics:4,scale:"中型",
  blueprint:{civilization:6,technology:4,magic:6,civilizationCount:4,speciesCount:4,languageCount:5,politicalUnity:4,religion:8,resources:4,danger:10,survival:8,unknownRatio:65,warState:"TENSION",scale:"中型"},
  foundation:"秩序在匱乏、恐懼、階級與腐化中勉強維持；超自然力量真實而危險，選擇通常帶有代價。",
  tone:["壓迫","殘酷","不確定","微弱希望"],
  civilization:"聚落與制度仍然存在，但資源、信任與安全都不是理所當然；權力常透過壟斷與恐懼維持。",
  supernatural:"力量伴隨污染、犧牲、契約、風險或不可逆後果，不可成為無成本解題工具。",
  conflictBias:["生存與道德代價","宗教或制度壓迫","腐化與異變","稀缺資源"],
  environmentBias:["衰敗聚落","危險荒野","禁忌遺跡","受污染區域"],
  narrativeRules:["黑暗不等於所有人都邪惡","危機必須有世界內因果","仍需保留玩家透過知識與選擇改善局部結果的空間"]
 }),
 "東方幻想":freezePreset({
  danger:3,magic:4,politics:4,scale:"中型",
  blueprint:{civilization:6,technology:4,magic:8,civilizationCount:5,speciesCount:4,languageCount:6,politicalUnity:6,religion:8,resources:6,danger:6,survival:4,unknownRatio:60,warState:"TENSION",scale:"中型"},
  foundation:"地方信仰、家族或師承、自然地景與地方權力共同構成世界；文化與超自然規則必須屬於此世界本身。",
  tone:["靈性","地域差異","傳統與變化","人與自然互動"],
  civilization:"聚落、家族、門派、地方政權與信仰共同形成多層社會，地域差異比單一全球制度更重要。",
  supernatural:"超自然可與地脈、契約、修行、祭祀、精怪或因果相關，但必須由本世界自行建立規則。",
  conflictBias:["傳統與變化","地方秩序衝突","人與超自然存在的契約","門派或家族利益"],
  environmentBias:["山川地脈","古城與村落","禁地與靈性場所"],
  narrativeRules:["不可直接套用現實中國／日本朝代","文化細節必須服務於本世界因果","避免把所有超自然都簡化成戰鬥能力"]
 }),
 "蒸汽魔法":freezePreset({
  danger:3,magic:3,politics:4,scale:"大型",
  blueprint:{civilization:8,technology:8,magic:6,civilizationCount:5,speciesCount:3,languageCount:5,politicalUnity:6,religion:4,resources:8,danger:6,survival:4,unknownRatio:45,warState:"TENSION",scale:"大型"},
  foundation:"工業、機械與超自然技術共同塑造文明；資源、運輸、技術壟斷與階級關係會影響世界。",
  tone:["工業奇觀","擴張","技術與代價"],
  civilization:"城市、交通與生產系統高度依賴某種能源／技術體系，技術控制權會產生社會階級。",
  supernatural:"魔法與工程存在可驗證的交互規則，不能只是機械外觀加普通魔法。",
  conflictBias:["能源與資源","工業階級","技術壟斷","交通與殖民"],
  environmentBias:["工業城市","鐵路與空港","礦區","機械遺構"],
  narrativeRules:["技術必須有維護與供應成本","交通能力應實際影響政治與經濟","避免全世界共享同一工業水平"]
 }),
 "低魔政治奇幻":freezePreset({
  danger:3,magic:1,politics:5,scale:"大型",
  blueprint:{civilization:7,technology:4,magic:2,civilizationCount:5,speciesCount:3,languageCount:6,politicalUnity:3,religion:7,resources:6,danger:6,survival:5,unknownRatio:45,warState:"TENSION",scale:"大型"},
  foundation:"超自然確實存在但非常稀少；土地、軍隊、契約、階級、宗教、商路與情報網才是大多數權力的真正來源。",
  tone:["政治角力","低魔","制度現實","灰色利益"],
  civilization:"多個王國、封臣、城邦、教團或商業勢力彼此制衡；合法性、糧食、稅收、軍力與外交具有持久後果。",
  supernatural:"魔法使用者與超自然事件罕見，因此每次出現都具有政治、軍事、宗教或情報價值；不得把魔法當日常萬能科技。",
  conflictBias:["王位與合法性","外交與密約","宗教權威","土地與補給","情報戰"],
  environmentBias:["邊境領地","要塞與關隘","港口與商路","宗教領地"],
  narrativeRules:["政治行動必須受制度與資源限制","NPC 不因玩家身分自動效忠","魔法稀有性必須反映在社會反應與取得難度"]
 }),
 "神話洪荒":freezePreset({
  danger:5,magic:5,politics:2,scale:"大型",
  blueprint:{civilization:3,technology:2,magic:10,civilizationCount:3,speciesCount:6,languageCount:4,politicalUnity:2,religion:9,resources:8,danger:9,survival:8,unknownRatio:85,warState:"TENSION",scale:"大型"},
  foundation:"文明仍年輕，而大地、巨獸、神性存在、禁忌與自然秩序遠比任何現代王國古老；人類聚落只是洪荒世界中的局部適應者。",
  tone:["原初神話","巨大尺度","敬畏","生存"],
  civilization:"聚落稀疏且地方化，社會依賴部族、祭儀、季節與地理知識；廣域統治很難凌駕於自然和古老存在之上。",
  supernatural:"神性、巨獸、靈脈或原初力量極強，但必須遵守禁忌、領域、祭儀、交換或自然法則，不能任意服務玩家。",
  conflictBias:["人與原初秩序","部族生存","神性契約","禁忌破壞","古老存在甦醒"],
  environmentBias:["巨型地貌","原始森林與荒海","神聖禁地","巨獸遷徙路線"],
  narrativeRules:["古老力量不可等同普通高級怪物","文明不得無條件控制整個自然系統","世界真相應透過神話、遺跡與實際證據逐步揭露"]
 }),
 "浮空群島":freezePreset({
  danger:4,magic:4,politics:4,scale:"大型",
  blueprint:{civilization:6,technology:6,magic:7,civilizationCount:6,speciesCount:5,languageCount:7,politicalUnity:3,religion:6,resources:5,danger:7,survival:6,unknownRatio:75,warState:"TENSION",scale:"中型"},
  foundation:"世界由彼此分離的浮空島、垂直地形與危險航路構成；能否跨越天空直接決定貿易、情報、軍事投射與政治影響力。",
  tone:["天空探索","孤島文化","航路競爭","垂直世界"],
  civilization:"島嶼因地理隔離形成不同文化與制度，空運能力、港口與導航知識是跨島文明的核心基礎設施。",
  supernatural:"浮力、風脈、空域生態或魔法航行必須有一致規則；飛行並不代表任何人都能安全自由跨越世界。",
  conflictBias:["航路控制","空港與資源島","隔離文化接觸","天候與空域危機"],
  environmentBias:["浮空島鏈","雲海","垂直遺跡","高空生態","危險航道"],
  narrativeRules:["旅行成本必須有實際影響","未知島嶼不可在未探索前自動成為常識","不同島群應保留文化與制度差異"]
 }),
 "魔導都市":freezePreset({
  danger:3,magic:4,politics:4,scale:"中型",
  blueprint:{civilization:9,technology:8,magic:7,civilizationCount:4,speciesCount:4,languageCount:5,politicalUnity:6,religion:4,resources:8,danger:5,survival:3,unknownRatio:35,warState:"TENSION",scale:"中型"},
  foundation:"魔法已專業化為都市基礎設施，支撐照明、交通、醫療、身分、金融、治安或通訊；繁榮依賴能源、維護、資格與監督制度。",
  tone:["高密度都市","制度化魔法","繁榮與脆弱點","社會分層"],
  civilization:"人口密集、制度成熟，公共與私人機構高度專業化；服務可及性、資格、費用與基礎設施故障會造成真實社會差異。",
  supernatural:"魔法像複雜基礎設施而非無限資源，必須有供能、維修、故障、監管與使用門檻。",
  conflictBias:["基礎設施控制","資格與階級","城市治理","能源與維修","地下市場"],
  environmentBias:["多層都市","魔導交通網","學院與工坊","基礎設施節點","舊城地下空間"],
  narrativeRules:["城市便利不能消除資源與制度限制","系統故障需有因果與可追蹤狀態","不得把整個世界自動視為同一座高科技城市"]
 }),
 "巨獸共生":freezePreset({
  danger:4,magic:3,politics:3,scale:"大型",
  blueprint:{civilization:5,technology:5,magic:6,civilizationCount:5,speciesCount:7,languageCount:5,politicalUnity:3,religion:7,resources:6,danger:8,survival:7,unknownRatio:70,warState:"TENSION",scale:"大型"},
  foundation:"巨大生物是生態、交通、信仰、資源與聚落形態的一部分；文明在依賴與危險之間建立共生、保護、馴養或利用關係。",
  tone:["生態奇觀","共生","依賴與風險","巨大尺度"],
  civilization:"聚落位置、產業、季節與交通會受到巨獸行為影響，不同社群對巨獸可能採取共生、敬畏、保護、狩獵或利用等不同制度。",
  supernatural:"巨獸能力與生態作用必須有身體、生境、食物鏈或超自然機制，不可只是任意放大的戰鬥數值。",
  conflictBias:["保護與利用","棲地衝突","巨獸遷徙","共生契約","資源依賴"],
  environmentBias:["巨獸棲地","遷徙通道","依附巨獸的聚落","巨型生態遺跡"],
  narrativeRules:["不是所有巨獸都是敵人","傷害或失去巨獸應產生生態與社會後果","共生關係必須建立在可持續的世界規則上"]
 }),
 "永夜寒境":freezePreset({
  danger:5,magic:2,politics:3,scale:"大型",
  blueprint:{civilization:4,technology:5,magic:4,civilizationCount:4,speciesCount:4,languageCount:5,politicalUnity:4,religion:6,resources:3,danger:9,survival:10,unknownRatio:70,warState:"TENSION",scale:"大型"},
  foundation:"漫長黑夜、極寒與資源稀缺是世界常態；能源、食物、保暖、安全聚落與可通行路線直接決定共同體能否延續。",
  tone:["寒冷孤立","生存","微光文明","資源壓力"],
  civilization:"人口集中在少數可供暖與補給的安全區，遠行需要準備與路線知識；聚落之間的能源與補給關係具有政治重量。",
  supernatural:"超自然力量若存在，必須與寒冷、黑夜、能源、光源或環境適應形成具體規則，而非無條件抵消生存壓力。",
  conflictBias:["能源與糧食","避難地控制","寒潮與路線中斷","人口遷移","光源與安全區"],
  environmentBias:["永夜雪原","冰層遺跡","供暖聚落","地下熱源","危險冰路"],
  narrativeRules:["寒冷與補給必須進入實際生存系統","安全地點仍需有維持成本","不能用一次魔法描述永久取消整個環境威脅"]
 }),
 "末日異世界":freezePreset({
  danger:5,magic:2,politics:2,scale:"中型",
  blueprint:{civilization:4,technology:6,magic:4,civilizationCount:3,speciesCount:4,languageCount:5,politicalUnity:2,religion:6,resources:2,danger:10,survival:10,unknownRatio:75,warState:"TENSION",scale:"大型"},
  foundation:"文明秩序已嚴重受損或分裂，生存、遷徙、資源、未知災害與失落資訊比完整國家制度更重要。",
  tone:["生存","廢墟","重建","未知災害"],
  civilization:"倖存聚落各自發展制度與交易方式，舊世界技術或知識並不代表目前仍可普遍使用。",
  supernatural:"異變、災害或失控力量必須留下可觀察規則與後果，不能只是隨機懲罰。",
  conflictBias:["資源短缺","倖存者勢力","災害循環","失落知識"],
  environmentBias:["廢墟","危險區","孤立聚落","被遺棄的基礎設施"],
  narrativeRules:["末日原因不得開局全知","舊文明資訊需透過證據恢復","重建成果必須持久寫入世界狀態"]
 }),
 "自訂世界":freezePreset({
  danger:3,magic:3,politics:3,scale:"中型",
  blueprint:{civilization:5,technology:5,magic:5,civilizationCount:4,speciesCount:4,languageCount:5,politicalUnity:5,religion:5,resources:5,danger:5,survival:5,unknownRatio:60,warState:"TENSION",scale:"中型"},
  foundation:"以玩家的自訂風格描述作為唯一主要風格基礎；未指定部分才由 World Blueprint 與 Seed 補完。",
  tone:["由玩家描述決定"],
  civilization:"文明結構必須從玩家描述與進階設定推導，不得偷偷回退成王道奇幻模板。",
  supernatural:"超自然規則依玩家描述與 Blueprint 建立；未指定時才由世界自行補完。",
  conflictBias:["由玩家描述與世界因果決定"],
  environmentBias:["由玩家描述與世界因果決定"],
  narrativeRules:["玩家明確描述優先於內建風格預設","仍須遵守 World Constitution 與知識邊界","未指定不等於可任意覆寫已鎖定設定"]
 })
});

export {WORLD_STYLE_PRESETS};
export const WORLD_STYLE_NAMES=Object.freeze(Object.keys(WORLD_STYLE_PRESETS));
export function getWorldStylePreset(name){return WORLD_STYLE_PRESETS[name]||WORLD_STYLE_PRESETS["王道奇幻"]}
export function worldStyleNames({includeCustom=true}={}){return WORLD_STYLE_NAMES.filter(name=>includeCustom||name!=="自訂世界")}
export function getWorldStyleBlueprint(style){return structuredClone(getWorldStylePreset(style).blueprint)}
export function applyWorldStyleBase(seed={}){
 if(["ai","random"].includes(seed.worldviewMode))return {...seed,genre:"",scale:"",danger:null,magic:null,politics:null};
 const p=getWorldStylePreset(seed.genre),genre=WORLD_STYLE_PRESETS[seed.genre]?seed.genre:"王道奇幻";
 return {...seed,genre,scale:seed.scale||p.scale,danger:Number.isFinite(Number(seed.danger))?Number(seed.danger):p.danger,magic:Number.isFinite(Number(seed.magic))?Number(seed.magic):p.magic,politics:Number.isFinite(Number(seed.politics))?Number(seed.politics):p.politics}
}
