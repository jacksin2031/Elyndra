export const SUPPORTED_LOCALES=Object.freeze({
 "zh-Hant":{label:"繁體中文",htmlLang:"zh-Hant",aiName:"Traditional Chinese"},
 "zh-Hans":{label:"简体中文",htmlLang:"zh-Hans",aiName:"Simplified Chinese"},
 en:{label:"English",htmlLang:"en",aiName:"English"},
 ja:{label:"日本語",htmlLang:"ja",aiName:"Japanese"}
});
export const DEFAULT_LOCALE="zh-Hant";
const STORAGE_KEY="elyndra.locale.v1";

export function normalizeLocale(value){return Object.hasOwn(SUPPORTED_LOCALES,value)?value:DEFAULT_LOCALE}
export function loadLocale(){try{return normalizeLocale(localStorage.getItem(STORAGE_KEY)||DEFAULT_LOCALE)}catch{return DEFAULT_LOCALE}}
export function saveLocale(locale){const next=normalizeLocale(locale);try{localStorage.setItem(STORAGE_KEY,next)}catch{};globalThis.ELYNDRA_LOCALE=next;return next}
export function localeMeta(locale=loadLocale()){return SUPPORTED_LOCALES[normalizeLocale(locale)]}
export function languageContract(locale=loadLocale()){
 const id=normalizeLocale(locale);
 if(id==="zh-Hant")return "All player-visible natural-language output must be Traditional Chinese (繁體中文/正體字). Do not output Simplified Chinese except inside immutable quoted source text. JSON keys, IDs and enums stay unchanged.";
 if(id==="zh-Hans")return "All player-visible natural-language output must be Simplified Chinese (简体中文). Do not mix Traditional Chinese except inside immutable quoted source text. JSON keys, IDs and enums stay unchanged.";
 if(id==="ja")return "All player-visible natural-language output must be natural Japanese. Do not mix Chinese or English prose except immutable proper nouns or quoted source text. JSON keys, IDs and enums stay unchanged.";
 return "All player-visible natural-language output must be natural English. Do not mix Chinese or Japanese prose except immutable proper nouns or quoted source text. JSON keys, IDs and enums stay unchanged.";
}

const UI={
 "繁體中文":{"zh-Hant":"繁體中文","zh-Hans":"繁体中文",en:"Traditional Chinese",ja:"繁体字中国語"},
 "简体中文":{"zh-Hant":"簡體中文","zh-Hans":"简体中文",en:"Simplified Chinese",ja:"簡体字中国語"},
 "English":{"zh-Hant":"英文","zh-Hans":"英文",en:"English",ja:"英語"},
 "日本語":{"zh-Hant":"日文","zh-Hans":"日文",en:"Japanese",ja:"日本語"},
 "語言":{"zh-Hant":"語言","zh-Hans":"语言",en:"Language",ja:"言語"},
 "AI 設定":{"zh-Hant":"AI 設定","zh-Hans":"AI 设置",en:"AI Settings",ja:"AI設定"},
 "存檔管理":{"zh-Hant":"存檔管理","zh-Hans":"存档管理",en:"Save Manager",ja:"セーブ管理"},
 "開發者":{"zh-Hant":"開發者","zh-Hans":"开发者",en:"Developer",ja:"開発者"},
 "重置世界":{"zh-Hant":"重置世界","zh-Hans":"重置世界",en:"Reset World",ja:"世界をリセット"},
 "開始轉生":{"zh-Hant":"開始轉生","zh-Hans":"开始转生",en:"Begin Reincarnation",ja:"転生を始める"},
 "繼續冒險":{"zh-Hant":"繼續冒險","zh-Hans":"继续冒险",en:"Continue Adventure",ja:"冒険を続ける"},
 "未知之地":{"zh-Hant":"未知之地","zh-Hans":"未知之地",en:"Unknown Place",ja:"未知の地"},
 "時序未知":{"zh-Hant":"時序未知","zh-Hans":"时序未知",en:"Time Unknown",ja:"時刻不明"},
 "未知世界":{"zh-Hant":"未知世界","zh-Hans":"未知世界",en:"Unknown World",ja:"未知の世界"},
 "無名者":{"zh-Hant":"無名者","zh-Hans":"无名者",en:"Nameless",ja:"名もなき者"},
 "旅人":{"zh-Hant":"旅人","zh-Hans":"旅人",en:"Traveler",ja:"旅人"},
 "生命":{"zh-Hant":"生命","zh-Hans":"生命",en:"HP",ja:"生命"},
 "狀態":{"zh-Hant":"狀態","zh-Hans":"状态",en:"Status",ja:"状態"},
 "飽食度":{"zh-Hant":"飽食度","zh-Hans":"饱食度",en:"Satiety",ja:"満腹度"},
 "疲勞":{"zh-Hant":"疲勞","zh-Hans":"疲劳",en:"Fatigue",ja:"疲労"},
 "魔法負荷":{"zh-Hant":"魔法負荷","zh-Hans":"魔法负荷",en:"Magic Strain",ja:"魔法負荷"},
 "知識":{"zh-Hant":"知識","zh-Hans":"知识",en:"Knowledge",ja:"知識"},
 "影響":{"zh-Hant":"影響","zh-Hans":"影响",en:"Impact",ja:"影響"},
 "名聲":{"zh-Hant":"名聲","zh-Hans":"名声",en:"Renown",ja:"名声"},
 "資產":{"zh-Hant":"資產","zh-Hans":"资产",en:"Assets",ja:"資産"},
 "目前目標":{"zh-Hant":"目前目標","zh-Hans":"当前目标",en:"Current Goal",ja:"現在の目標"},
 "冒險":{"zh-Hant":"冒險","zh-Hans":"冒险",en:"Adventure",ja:"冒険"},
 "角色":{"zh-Hant":"角色","zh-Hans":"角色",en:"Character",ja:"キャラクター"},
 "世界":{"zh-Hant":"世界","zh-Hans":"世界",en:"World",ja:"世界"},
 "手帳":{"zh-Hant":"手帳","zh-Hans":"手帐",en:"Journal",ja:"手帳"},
 "背包":{"zh-Hant":"背包","zh-Hans":"背包",en:"Inventory",ja:"持ち物"},
 "更多":{"zh-Hant":"更多","zh-Hans":"更多",en:"More",ja:"その他"},
 "你的行動":{"zh-Hant":"你的行動","zh-Hans":"你的行动",en:"Your Actions",ja:"あなたの行動"},
 "這些是此刻真正可做的事，不是功能選單":{"zh-Hant":"這些是此刻真正可做的事，不是功能選單","zh-Hans":"这些是此刻真正可做的事，不是功能菜单",en:"These are actions you can actually take now, not a feature menu.",ja:"これは機能メニューではなく、今この場で実際に取れる行動です。"},
 "命運判定":{"zh-Hant":"命運判定","zh-Hans":"命运判定",en:"Fate Check",ja:"運命判定"},
 "等待你的行動":{"zh-Hant":"等待你的行動","zh-Hans":"等待你的行动",en:"Waiting for your action",ja:"行動を待っています"},
 "世界會記住重要結果。":{"zh-Hant":"世界會記住重要結果。","zh-Hans":"世界会记住重要结果。",en:"The world remembers important outcomes.",ja:"世界は重要な結果を記憶します。"},
 "主要建議":{"zh-Hant":"主要建議","zh-Hans":"主要建议",en:"Suggested Actions",ja:"主な提案"},
 "高風險行動":{"zh-Hant":"高風險行動","zh-Hans":"高风险行动",en:"High-risk Actions",ja:"高リスク行動"},
 "自由行動":{"zh-Hant":"自由行動","zh-Hans":"自由行动",en:"Free Action",ja:"自由行動"},
 "我想做其他事情…":{"zh-Hant":"我想做其他事情…","zh-Hans":"我想做其他事情…",en:"I want to do something else…",ja:"別のことをしたい…"},
 "↻ 重新產生建議行動":{"zh-Hant":"↻ 重新產生建議行動","zh-Hans":"↻ 重新生成建议行动",en:"↻ Regenerate Suggestions",ja:"↻ 提案を再生成"},
 "自由行動：描述你想做的事……":{"zh-Hant":"自由行動：描述你想做的事……","zh-Hans":"自由行动：描述你想做的事……",en:"Free action: describe what you want to do…",ja:"自由行動：したいことを入力…"},
 "正在翻譯世界…":{"zh-Hant":"正在翻譯世界…","zh-Hans":"正在翻译世界…",en:"Translating world…",ja:"世界を翻訳中…"},
 "翻譯完成，可以繼續遊玩。":{"zh-Hant":"翻譯完成，可以繼續遊玩。","zh-Hans":"翻译完成，可以继续游玩。",en:"Translation complete. You can continue playing.",ja:"翻訳が完了しました。プレイを続けられます。"},
 "需要 AI 才能把目前世界切換到所選語言。":{"zh-Hant":"需要 AI 才能把目前世界切換到所選語言。","zh-Hans":"需要 AI 才能把当前世界切换到所选语言。",en:"AI is required to switch the current world to the selected language.",ja:"現在の世界を選択した言語へ切り替えるにはAIが必要です。"}
};

export function uiText(source,locale=loadLocale()){const id=normalizeLocale(locale);return UI[source]?.[id]??source}
export function applyDocumentLocale(locale=loadLocale(),root=document){
 const id=normalizeLocale(locale),meta=localeMeta(id);globalThis.ELYNDRA_LOCALE=id;document.documentElement.lang=meta.htmlLang;
 const walker=document.createTreeWalker(root.body||root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const raw=node.nodeValue,trim=raw.trim();if(!trim||!UI[trim])continue;node.nodeValue=raw.replace(trim,uiText(trim,id))}
 for(const el of root.querySelectorAll?.("[placeholder],[aria-label],[title]")||[]){for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(raw&&UI[raw])el.setAttribute(attr,uiText(raw,id))}}
 const selector=root.querySelector?.("#languageSelect");if(selector)selector.value=id;
 return id
}

export function ensureWorldLocale(state,locale=loadLocale()){
 if(!state)return null;const id=normalizeLocale(locale);state.localization??={};state.localization.sourceLocale=normalizeLocale(state.localization.sourceLocale||state.world?.language||DEFAULT_LOCALE);state.localization.displayLocale=normalizeLocale(state.localization.displayLocale||id);state.localization.translations??={};state.localization.translations[id]??={};return state.localization
}
export function translationKey(value){let h=2166136261;for(const ch of String(value??"")){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
export function translatedText(state,value,locale=loadLocale()){
 const text=String(value??"");if(!text)return text;const loc=ensureWorldLocale(state,locale);if(loc.sourceLocale===normalizeLocale(locale))return text;return loc.translations?.[normalizeLocale(locale)]?.[translationKey(text)]||text
}
export function visibleTranslationPayload(state){
 if(!state)return {strings:[]};const registry=state.world?.registry||{},rows=[];const add=v=>{const text=String(v??"").trim();if(text&&!rows.includes(text))rows.push(text)};
 add(state.world?.name);add(state.sceneTitle);add(state.narrative);add(state.quests?.main?.title);for(const x of state.quests?.main?.objectives||[])add(x);for(const x of state.suggestions||[])add(x);
 for(const npc of registry.npcs||[]){if(npc?.known===true){add(npc.name);add(npc.role);add(npc.description)}}
 for(const loc of registry.locations||[]){if(loc?.known===true){add(loc.name);add(loc.description)}}
 for(const item of state.inventory||[]){add(item.name);add(item.description)}
 return {sourceLocale:ensureWorldLocale(state).sourceLocale,strings:rows.slice(0,180)}
}
export function applyTranslationBundle(state,targetLocale,bundle){
 const id=normalizeLocale(targetLocale),loc=ensureWorldLocale(state,id),table=loc.translations[id]??={};const rows=Array.isArray(bundle?.translations)?bundle.translations:[];
 for(const row of rows){const source=String(row?.source??"").trim(),translated=String(row?.translated??"").trim();if(source&&translated)table[translationKey(source)]=translated}
 loc.displayLocale=id;loc.translatedAt=Date.now();return rows.length
}
export function needsWorldTranslation(state,targetLocale=loadLocale()){
 if(!state)return false;const id=normalizeLocale(targetLocale),loc=ensureWorldLocale(state,id);return loc.sourceLocale!==id&&loc.displayLocale!==id
}
