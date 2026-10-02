const MODERN_EARTH_COMMON_KNOWLEDGE=[
 "知道基礎衛生概念：飲用水、食物腐敗、傷口清潔與感染風險。",
 "知道基礎科學常識：重力、燃燒、電、簡單機械、天氣與人體基本需求。",
 "知道現代常見工具與材料概念，但不會自動懂異世界工藝、魔法器具或地方技術。",
 "知道基本急救概念，例如止血、固定傷肢、休息與避免不必要移動，但不等於專業醫療能力。",
 "知道現代城市生活、交通、貨幣交易、契約、身份與公共規則等一般概念，但不假設異世界採用相同制度。"
];
const MODERN_EARTH_VALUES=[
 "優先保護自己與他人的生命安全。",
 "傾向尊重個人自主、同意與基本尊嚴，不把奴役、強迫或任意暴力視為理所當然。",
 "遇到未知現象時先觀察、驗證，再決定是否相信傳聞或超自然解釋。",
 "傾向避免沒有必要的殺戮、折磨與高風險行為，但玩家明確選擇仍可覆蓋這種預設傾向。",
 "會用現代人的公平、交換、承諾與責任觀念理解事件，但會逐步學習當地文化，而不是要求異世界必須等同現代地球。"
];
export function modernEarthOriginProfile(){
 return {
  id:"MODERN_EARTH_ORDINARY",
  label:"現代地球普通人",
  era:"contemporary",
  originWorld:"Earth",
  background:"沒有預設專業職業、戰鬥訓練或超自然知識的普通現代成年人。",
  commonKnowledge:[...MODERN_EARTH_COMMON_KNOWLEDGE],
  defaultValues:[...MODERN_EARTH_VALUES],
  initialAssumptions:[
   "醒來後第一優先是確認安全、身體狀態、時間與周圍環境。",
   "不會因為看見陌生服飾、建築或異常現象就立即知道其名稱、用途或世界規則。",
   "會嘗試用地球常識解釋現象；只有證據不足時才保留多種可能。",
   "知道自己原本來自現代地球，但不知道為甚麼來到這個世界。"
  ],
  worldKnowledgeBoundary:"對 Elyndra 異世界 Canon 的初始知識為零；現代地球常識不等於異世界事實。"
 }
}
export function ensurePlayerOrigin(player){
 player.origin??=modernEarthOriginProfile();
 const d=modernEarthOriginProfile();
 player.origin={...d,...player.origin,commonKnowledge:Array.isArray(player.origin.commonKnowledge)?player.origin.commonKnowledge:d.commonKnowledge,defaultValues:Array.isArray(player.origin.defaultValues)?player.origin.defaultValues:d.defaultValues,initialAssumptions:Array.isArray(player.origin.initialAssumptions)?player.origin.initialAssumptions:d.initialAssumptions,narrativeIdentity:player.origin.narrativeIdentity&&typeof player.origin.narrativeIdentity==="object"&&!Array.isArray(player.origin.narrativeIdentity)?structuredClone(player.origin.narrativeIdentity):(d.narrativeIdentity||null)};
 return player.origin
}
export function playerOriginSnapshot(player){
 const o=ensurePlayerOrigin(player);return {id:o.id,label:o.label,background:o.background,commonKnowledge:o.commonKnowledge.slice(0,8),defaultValues:o.defaultValues.slice(0,8),initialAssumptions:o.initialAssumptions.slice(0,8),worldKnowledgeBoundary:o.worldKnowledgeBoundary,legalStatus:o.legalStatus||null,languagePolicy:o.languagePolicy||null,knowledgePolicy:o.knowledgePolicy||null,openingBias:o.openingBias||null,narrativeIdentity:o.narrativeIdentity?structuredClone(o.narrativeIdentity):null}
}
