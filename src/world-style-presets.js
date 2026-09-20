export const WORLD_STYLE_PRESETS={
 "王道奇幻":{danger:3,magic:4,politics:3,scale:"中型",foundation:"冒險感較強；文明與荒野並存；魔法較常見但仍有規則與代價；適合清晰成長、探索與多樣地域。"},
 "黑暗奇幻":{danger:5,magic:3,politics:4,scale:"中型",foundation:"生存成本高；道德選擇較灰暗；權力結構容易腐化；超自然力量危險且帶代價；希望與安全都需要付出成本。"},
 "東方幻想":{danger:3,magic:4,politics:4,scale:"中型",foundation:"世界觀以東方神話、地域信仰、宗族或門派式社會結構為基底；超自然與日常文化互相影響，但不可直接套用現實國家歷史。"},
 "蒸汽魔法":{danger:3,magic:3,politics:4,scale:"大型",foundation:"工業、機械與超自然技術共同塑造社會；資源、階級、交通與技術壟斷會成為重要矛盾；魔法與工程需要明確成本。"},
 "末日異世界":{danger:5,magic:2,politics:2,scale:"中型",foundation:"文明秩序已嚴重受損；資源、生存、遷徙與未知災變比完整國家政治更重要；安全區域稀少，世界真相需要從殘留痕跡中拼合。"}
};
export const WORLD_STYLE_NAMES=Object.freeze(Object.keys(WORLD_STYLE_PRESETS));
export function getWorldStylePreset(name){return WORLD_STYLE_PRESETS[name]||WORLD_STYLE_PRESETS["王道奇幻"]}
export function applyWorldStyleBase(seed={}){
 if(seed.worldviewMode==="random")return {...seed,genre:"",scale:"",danger:null,magic:null,politics:null};
 const p=getWorldStylePreset(seed.genre);
 return {...seed,genre:WORLD_STYLE_PRESETS[seed.genre]?seed.genre:"王道奇幻",scale:seed.scale||p.scale,danger:Number.isFinite(Number(seed.danger))?Number(seed.danger):p.danger,magic:Number.isFinite(Number(seed.magic))?Number(seed.magic):p.magic,politics:Number.isFinite(Number(seed.politics))?Number(seed.politics):p.politics}
}
