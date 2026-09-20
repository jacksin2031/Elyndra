export const WORLD_STYLE_PRESETS={
 "王道奇幻":{
  danger:3,magic:4,politics:3,scale:"中型",
  foundation:"冒險感較強；文明與荒野並存；世界容許希望、成長與廣泛探索。",
  tone:["冒險","神秘","希望與危機並存"],
  civilization:"存在相對穩定的聚落、交通與社會制度，但文明邊界外仍有大量未知區域。",
  supernatural:"超自然力量較常見，但必須有來源、規則、限制與代價。",
  conflictBias:["文明與未知世界的摩擦","不同價值與勢力的競爭","被掩埋歷史重新影響現在"],
  environmentBias:["城鎮與荒野交錯","遺跡與未知地域","多樣地貌"],
  narrativeRules:["避免單純善惡二元模板","成長必須由經歷與選擇取得","未知世界資訊仍需玩家實際發現"]
 },
 "黑暗奇幻":{
  danger:5,magic:3,politics:4,scale:"中型",
  foundation:"生存成本高；道德選擇偏灰暗；權力與超自然力量都可能帶來腐化或代價。",
  tone:["壓迫","危險","有限希望"],
  civilization:"秩序存在但不可靠，制度往往受到資源、恐懼、階級或腐敗扭曲。",
  supernatural:"超自然力量不是免費工具，使用或接觸通常帶來身體、精神、社會或因果代價。",
  conflictBias:["生存與道德衝突","權力腐化","禁忌知識","文明內部壓力"],
  environmentBias:["衰敗聚落","危險荒野","被污染或扭曲的遺跡"],
  narrativeRules:["避免為黑暗而黑暗","代價要有因果","玩家仍能透過知識與選擇改變局部結果"]
 },
 "東方幻想":{
  danger:3,magic:4,politics:4,scale:"中型",
  foundation:"以東方神話式世界感、地域信仰、家族／門派／地方權力與自然靈性為基底，但不直接複製真實歷史國家。",
  tone:["含蓄","神秘","人與天地秩序互相影響"],
  civilization:"社會重視地域、血緣、師承、儀式或傳統秩序，不同地方可有完全不同規範。",
  supernatural:"超自然可與地脈、契約、修行、祭祀、精怪或因果相關，但必須由本世界自行建立規則。",
  conflictBias:["傳統與變化","地方秩序衝突","人與超自然存在的契約","門派或家族利益"],
  environmentBias:["山川地脈","古城與村落","禁地與靈性場所"],
  narrativeRules:["不可直接套用現實中國／日本朝代","文化細節必須服務於本世界因果","避免把所有超自然都簡化成戰鬥能力"]
 },
 "蒸汽魔法":{
  danger:3,magic:3,politics:4,scale:"大型",
  foundation:"工業、機械與超自然技術共同塑造文明；資源、運輸、技術壟斷與階級關係會影響世界。",
  tone:["工業奇觀","擴張","技術與代價"],
  civilization:"城市、交通與生產系統高度依賴某種能源／技術體系，技術控制權會產生社會階級。",
  supernatural:"魔法與工程存在可驗證的交互規則，不能只是機械外觀加普通魔法。",
  conflictBias:["能源與資源控制","技術壟斷","工業化代價","城市與邊境利益"],
  environmentBias:["大型城市","工業帶","交通網","資源產地與廢墟"],
  narrativeRules:["技術必須有供應鏈與成本","交通與經濟應實際影響政治","不要把所有問題都交給超級發明解決"]
 },
 "末日異世界":{
  danger:5,magic:2,politics:2,scale:"中型",
  foundation:"文明秩序已嚴重受損；資源、生存、遷徙、未知災變與失落資訊比完整國家政治更重要。",
  tone:["孤立","生存","重建或衰亡"],
  civilization:"大型制度多數失效或破碎，倖存社群規模較小且彼此資訊不完整。",
  supernatural:"異常現象可存在，但應保持難以取得、危險或不穩定，而不是便利的日常工具。",
  conflictBias:["資源短缺","安全區爭奪","災變真相","不同生存策略"],
  environmentBias:["廢棄文明","危險遷徙路線","零散安全區","未知災害區"],
  narrativeRules:["資源限制必須有實際影響","不應隨意生成完整繁榮帝國","世界真相主要從殘留物與倖存者資訊逐步拼合"]
 }
};
export const WORLD_STYLE_NAMES=Object.freeze(Object.keys(WORLD_STYLE_PRESETS));
export function getWorldStylePreset(name){return WORLD_STYLE_PRESETS[name]||WORLD_STYLE_PRESETS["王道奇幻"]}
export function applyWorldStyleBase(seed={}){
 if(["ai","random"].includes(seed.worldviewMode))return {...seed,genre:"",scale:"",danger:null,magic:null,politics:null};
 const p=getWorldStylePreset(seed.genre);
 return {...seed,genre:WORLD_STYLE_PRESETS[seed.genre]?seed.genre:"王道奇幻",scale:seed.scale||p.scale,danger:Number.isFinite(Number(seed.danger))?Number(seed.danger):p.danger,magic:Number.isFinite(Number(seed.magic))?Number(seed.magic):p.magic,politics:Number.isFinite(Number(seed.politics))?Number(seed.politics):p.politics}
}