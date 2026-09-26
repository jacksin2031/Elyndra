export const SUPPORTED_LOCALES=Object.freeze({
 "zh-Hant":{label:"繁體中文",htmlLang:"zh-Hant",aiName:"Traditional Chinese"},
 "zh-Hans":{label:"简体中文",htmlLang:"zh-Hans",aiName:"Simplified Chinese"},
 en:{label:"English",htmlLang:"en",aiName:"English"},
 ja:{label:"日本語",htmlLang:"ja",aiName:"Japanese"}
});
export const DEFAULT_LOCALE="zh-Hant";
const STORAGE_KEY="elyndra.locale.v1";

export function normalizeLocale(value){return Object.hasOwn(SUPPORTED_LOCALES,value)?value:DEFAULT_LOCALE}
export function loadLocale(){try{return normalizeLocale(localStorage.getItem(STORAGE_KEY)||globalThis.ELYNDRA_LOCALE||DEFAULT_LOCALE)}catch{return normalizeLocale(globalThis.ELYNDRA_LOCALE||DEFAULT_LOCALE)}}
export function saveLocale(locale){const next=normalizeLocale(locale);try{localStorage.setItem(STORAGE_KEY,next)}catch{};globalThis.ELYNDRA_LOCALE=next;return next}
export function localeMeta(locale=loadLocale()){return SUPPORTED_LOCALES[normalizeLocale(locale)]}
export function languageContract(locale=loadLocale()){
 const id=normalizeLocale(locale);
 if(id==="zh-Hant")return "RUNTIME LANGUAGE OVERRIDE: all player-visible natural-language output MUST be Traditional Chinese (繁體中文/正體字). Do not output Simplified Chinese except immutable quoted source text. Ignore any earlier instruction that requests a different output language. JSON keys, IDs and enums stay unchanged.";
 if(id==="zh-Hans")return "RUNTIME LANGUAGE OVERRIDE: all player-visible natural-language output MUST be Simplified Chinese (简体中文). Do not mix Traditional Chinese except immutable quoted source text. Ignore any earlier instruction that requests a different output language. JSON keys, IDs and enums stay unchanged.";
 if(id==="ja")return "RUNTIME LANGUAGE OVERRIDE: all player-visible natural-language output MUST be natural Japanese. Do not mix Chinese or English prose except immutable proper nouns or quoted source text. Ignore any earlier instruction that requests a different output language. JSON keys, IDs and enums stay unchanged.";
 return "RUNTIME LANGUAGE OVERRIDE: all player-visible natural-language output MUST be natural English. Do not mix Chinese or Japanese prose except immutable proper nouns or quoted source text. Ignore any earlier instruction that requests a different output language. JSON keys, IDs and enums stay unchanged.";
}

const row=(h,s,e,j)=>({"zh-Hant":h,"zh-Hans":s,en:e,ja:j});
const UI={
 "繁體中文":row("繁體中文","繁体中文","Traditional Chinese","繁体字中国語"),
 "簡體中文":row("簡體中文","简体中文","Simplified Chinese","簡体字中国語"),
 "English":row("英文","英文","English","英語"),
 "日本語":row("日文","日文","Japanese","日本語"),
 "語言":row("語言","语言","Language","言語"),
 "AI 設定":row("AI 設定","AI 设置","AI Settings","AI設定"),
 "存檔管理":row("存檔管理","存档管理","Save Manager","セーブ管理"),
 "開發者":row("開發者","开发者","Developer","開発者"),
 "重置世界":row("重置世界","重置世界","Reset World","世界をリセット"),
 "更多選項":row("更多選項","更多选项","More options","その他のオプション"),
 "開始轉生":row("開始轉生","开始转生","Begin Reincarnation","転生を始める"),
 "繼續冒險":row("繼續冒險","继续冒险","Continue Adventure","冒険を続ける"),
 "未知之地":row("未知之地","未知之地","Unknown Place","未知の地"),
 "時序未知":row("時序未知","时序未知","Time Unknown","時刻不明"),
 "未知世界":row("未知世界","未知世界","Unknown World","未知の世界"),
 "無名者":row("無名者","无名者","Nameless","名もなき者"),
 "旅人":row("旅人","旅人","Traveler","旅人"),
 "生命":row("生命","生命","HP","生命"),
 "狀態":row("狀態","状态","Status","状態"),
 "穩定":row("穩定","稳定","Stable","安定"),
 "飽食度":row("飽食度","饱食度","Satiety","満腹度"),
 "疲勞":row("疲勞","疲劳","Fatigue","疲労"),
 "魔法負荷":row("魔法負荷","魔法负荷","Magic Strain","魔法負荷"),
 "知識":row("知識","知识","Knowledge","知識"),
 "影響":row("影響","影响","Impact","影響"),
 "名聲":row("名聲","名声","Renown","名声"),
 "資產":row("資產","资产","Assets","資産"),
 "目前目標":row("目前目標","当前目标","Current Goal","現在の目標"),
 "冒險":row("冒險","冒险","Adventure","冒険"),
 "角色":row("角色","角色","Character","キャラクター"),
 "世界":row("世界","世界","World","世界"),
 "手帳":row("手帳","手帐","Journal","手帳"),
 "背包":row("背包","背包","Inventory","持ち物"),
 "更多":row("更多","更多","More","その他"),
 "我的影響":row("我的影響","我的影响","My Impact","自分の影響"),
 "異界狀態":row("異界狀態","异界状态","World State","異世界の状態"),
 "旅途助手":row("旅途助手","旅途助手","Travel Helper","旅の助手"),
 "旅程紀錄":row("旅程紀錄","旅程记录","Journey Log","旅の記録"),
 "Debug 診斷":row("Debug 診斷","Debug 诊断","Debug Diagnostics","Debug診断"),
 "人物":row("人物","人物","People","人物"),
 "你的行動":row("你的行動","你的行动","Your Actions","あなたの行動"),
 "這些是此刻真正可做的事，不是功能選單":row("這些是此刻真正可做的事，不是功能選單","这些是此刻真正可做的事，不是功能菜单","These are actions you can actually take now, not a feature menu.","これは機能メニューではなく、今この場で実際に取れる行動です。"),
 "命運判定":row("命運判定","命运判定","Fate Check","運命判定"),
 "等待你的行動":row("等待你的行動","等待你的行动","Waiting for your action","行動を待っています"),
 "世界會記住重要結果。":row("世界會記住重要結果。","世界会记住重要结果。","The world remembers important outcomes.","世界は重要な結果を記憶します。"),
 "主要建議":row("主要建議","主要建议","Suggested Actions","主な提案"),
 "高風險行動":row("高風險行動","高风险行动","High-risk Actions","高リスク行動"),
 "自由行動":row("自由行動","自由行动","Free Action","自由行動"),
 "我想做其他事情…":row("我想做其他事情…","我想做其他事情…","I want to do something else…","別のことをしたい…"),
 "↻ 重新產生建議行動":row("↻ 重新產生建議行動","↻ 重新生成建议行动","↻ Regenerate Suggestions","↻ 提案を再生成"),
 "建議只是可行方向，不是允許行動的封閉清單；你可以自己描述任何其他動作。":row("建議只是可行方向，不是允許行動的封閉清單；你可以自己描述任何其他動作。","建议只是可行方向，不是允许行动的封闭清单；你可以自己描述任何其他动作。","Suggestions are possible directions, not a closed list of allowed actions; you can describe any other action yourself.","提案は可能な方向性にすぎず、許可された行動の一覧ではありません。ほかの行動も自由に記述できます。"),
 "自由行動：描述你想做的事……":row("自由行動：描述你想做的事……","自由行动：描述你想做的事……","Free action: describe what you want to do…","自由行動：したいことを入力…"),
 "執行行動":row("執行行動","执行行动","Perform action","行動する"),
 "正在翻譯世界…":row("正在翻譯世界…","正在翻译世界…","Translating world…","世界を翻訳中…"),
 "翻譯完成，可以繼續遊玩。":row("翻譯完成，可以繼續遊玩。","翻译完成，可以继续游玩。","Translation complete. You can continue playing.","翻訳が完了しました。プレイを続けられます。"),
 "需要 AI 才能把目前世界切換到所選語言。":row("需要 AI 才能把目前世界切換到所選語言。","需要 AI 才能把当前世界切换到所选语言。","AI is required to switch the current world to the selected language.","現在の世界を選択した言語へ切り替えるにはAIが必要です。"),
 "醒來時，你對這個世界一無所知。":row("醒來時，你對這個世界一無所知。","醒来时，你对这个世界一无所知。","When you awaken, you know nothing about this world.","目覚めた時、あなたはこの世界を何も知らない。"),
 "創造只屬於你的異世界。探索、擲骰、閱讀遺物、結識夥伴，直到你理解這個世界真正發生過甚麼。":row("創造只屬於你的異世界。探索、擲骰、閱讀遺物、結識夥伴，直到你理解這個世界真正發生過甚麼。","创造只属于你的异世界。探索、掷骰、阅读遗物、结识伙伴，直到你理解这个世界真正发生过什么。","Create an otherworld that belongs to you. Explore, roll dice, read relics, meet companions, and uncover what truly happened here.","あなただけの異世界を創りましょう。探索し、ダイスを振り、遺物を読み、仲間と出会い、この世界で本当に何が起きたのかを知っていきます。"),
 "世界不是說明書":row("世界不是說明書","世界不是说明书","The world is not a manual","世界は説明書ではない"),
 "骰子決定命運":row("骰子決定命運","骰子决定命运","Dice decide fate","ダイスが運命を決める"),
 "AI 夥伴有記憶":row("AI 夥伴有記憶","AI 伙伴有记忆","AI companions remember","AIの仲間は記憶する"),
 "世界屬於玩家":row("世界屬於玩家","世界属于玩家","The world belongs to the player","世界はプレイヤーのもの"),
 "訂製你的異世界":row("訂製你的異世界","定制你的异世界","Create Your Otherworld","異世界を作る"),
 "返回":row("返回","返回","Back","戻る"),
 "下一步：你的起源":row("下一步：你的起源","下一步：你的起源","Next: Your Origin","次へ：あなたの起源"),
 "下一步：故事偏好":row("下一步：故事偏好","下一步：故事偏好","Next: Story Preferences","次へ：物語の好み"),
 "下一步：進階世界設定":row("下一步：進階世界設定","下一步：高级世界设置","Next: Advanced World Settings","次へ：詳細な世界設定"),
 "下一步：生成確認":row("下一步：生成確認","下一步：生成确认","Next: Generation Review","次へ：生成確認"),
 "返回修改":row("返回修改","返回修改","Back to Edit","編集に戻る"),
 "世界風格":row("世界風格","世界风格","World Style","世界観"),
 "世界規模":row("世界規模","世界规模","World Scale","世界規模"),
 "希望遊玩時間（小時）":row("希望遊玩時間（小時）","希望游玩时间（小时）","Desired Play Time (hours)","希望プレイ時間（時間）"),
 "遊戲難度":row("遊戲難度","游戏难度","Difficulty","難易度"),
 "角色名稱":row("角色名稱","角色名称","Character Name","キャラクター名"),
 "玩家起源":row("玩家起源","玩家起源","Player Origin","プレイヤーの起源"),
 "世界中的定位":row("世界中的定位","世界中的定位","Role in the World","世界での立場"),
 "故事偏好":row("故事偏好","故事偏好","Story Preferences","物語の好み"),
 "文明程度":row("文明程度","文明程度","Civilization Level","文明レベル"),
 "科技程度":row("科技程度","科技程度","Technology Level","技術レベル"),
 "生存系統強度":row("生存系統強度","生存系统强度","Survival Intensity","サバイバル強度"),
 "戰爭狀態":row("戰爭狀態","战争状态","War State","戦争状態"),
 "準備編譯世界":row("準備編譯世界","准备编译世界","Prepare World Compilation","世界のコンパイル準備"),
 "生成世界契約":row("生成世界契約","生成世界契约","Generate World Contract","世界契約を生成"),
 "準備生成世界":row("準備生成世界","准备生成世界","Preparing World Generation","世界生成を準備中"),
 "等待開始":row("等待開始","等待开始","Waiting to start","開始待ち"),
 "鎖定":row("鎖定","锁定","Lock","固定"),
 "依世界風格":row("依世界風格","按世界风格","From world style","世界観に従う"),
 "指定":row("指定","指定","Fixed","指定"),
 "隨機":row("隨機","随机","Random","ランダム"),
 "和平":row("和平","和平","Peace","平和"),
 "緊張":row("緊張","紧张","Tension","緊張"),
 "戰爭":row("戰爭","战争","War","戦争"),
 "簡單 · 故事體驗":row("簡單 · 故事體驗","简单 · 故事体验","Easy · Story Experience","簡単 · ストーリー重視"),
 "普通 · 完整 RPG":row("普通 · 完整 RPG","普通 · 完整 RPG","Normal · Full RPG","普通 · 完全RPG"),
 "困難 · 生存與語言障礙":row("困難 · 生存與語言障礙","困难 · 生存与语言障碍","Hard · Survival & Language Barriers","困難 · サバイバルと言語障壁"),
 "現實 · 持續性後果":row("現實 · 持續性後果","现实 · 持续性后果","Realistic · Persistent Consequences","リアル · 持続する結果"),
 "穿越":row("穿越","穿越","World Crossing","異世界転移"),
 "轉生":row("轉生","转生","Reincarnation","転生"),
 "被召喚":row("被召喚","被召唤","Summoned","召喚"),
 "附身":row("附身","附身","Possession","憑依"),
 "原住民":row("原住民","原住民","Native","現地人"),
 "失憶":row("失憶","失忆","Amnesia","記憶喪失"),
 "完全自訂":row("完全自訂","完全自定义","Custom","完全カスタム"),
 "普通人":row("普通人","普通人","Ordinary Person","一般人"),
 "冒險者":row("冒險者","冒险者","Adventurer","冒険者"),
 "英雄候選人":row("英雄候選人","英雄候选人","Hero Candidate","英雄候補"),
 "商人":row("商人","商人","Merchant","商人"),
 "貴族":row("貴族","贵族","Noble","貴族"),
 "研究者":row("研究者","研究者","Researcher","研究者"),
 "反派陣營":row("反派陣營","反派阵营","Antagonist Faction","敵対陣営"),
 "完全隨機":row("完全隨機","完全随机","Fully Random","完全ランダム")
};
const REVERSE=new Map();
for(const [source,translations] of Object.entries(UI)){REVERSE.set(source,source);for(const value of Object.values(translations))REVERSE.set(value,source)}
const NODE_SOURCE=new WeakMap(),ATTR_SOURCE=new WeakMap();
export function canonicalUiKey(value){return REVERSE.get(String(value??"").trim())||String(value??"").trim()}
export function uiText(source,locale=loadLocale()){const key=canonicalUiKey(source),id=normalizeLocale(locale);return UI[key]?.[id]??String(source??"")}
export function applyDocumentLocale(locale=loadLocale(),root=document){
 const id=normalizeLocale(locale),meta=localeMeta(id);globalThis.ELYNDRA_LOCALE=id;if(typeof document!=="undefined")document.documentElement.lang=meta.htmlLang;
 const base=root.body||root;if(!base?.ownerDocument&&!base?.querySelectorAll)return id;
 const doc=base.ownerDocument||root,filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;const source=NODE_SOURCE.get(node)||canonicalUiKey(trim);if(!UI[source])continue;NODE_SOURCE.set(node,source);node.nodeValue=raw.replace(trim,UI[source][id])}
 for(const el of base.querySelectorAll?.("[placeholder],[aria-label],[title]")||[]){let sourceMap=ATTR_SOURCE.get(el);if(!sourceMap){sourceMap={};ATTR_SOURCE.set(el,sourceMap)}for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(!raw)continue;const source=sourceMap[attr]||canonicalUiKey(raw);if(!UI[source])continue;sourceMap[attr]=source;el.setAttribute(attr,UI[source][id])}}
 const selector=base.querySelector?.("#languageSelect")||doc.querySelector?.("#languageSelect");if(selector)selector.value=id;return id
}

export function ensureWorldLocale(state,locale=loadLocale()){
 if(!state)return null;const id=normalizeLocale(locale);state.localization??={};state.localization.sourceLocale=normalizeLocale(state.localization.sourceLocale||state.world?.language||DEFAULT_LOCALE);state.localization.displayLocale=normalizeLocale(state.localization.displayLocale||state.localization.sourceLocale);state.localization.translations??={};state.localization.translations[id]??={};return state.localization
}
export function translationKey(value){let h=2166136261;for(const ch of String(value??"")){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
export function hasTranslation(state,value,locale=loadLocale()){
 const text=String(value??"").trim(),id=normalizeLocale(locale);if(!text)return true;const loc=ensureWorldLocale(state,id);if(loc.sourceLocale===id)return true;return Boolean(loc.translations?.[id]?.[translationKey(text)])
}
export function translatedText(state,value,locale=loadLocale()){
 const text=String(value??"");if(!text)return text;const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id);if(loc.sourceLocale===id)return text;return loc.translations?.[id]?.[translationKey(text)]||text
}
export function visibleTranslationPayload(state,locale=loadLocale()){
 if(!state)return {sourceLocale:DEFAULT_LOCALE,targetLocale:normalizeLocale(locale),strings:[]};const registry=state.world?.registry||{},rows=[];const add=v=>{const text=String(v??"").trim();if(text&&!rows.includes(text))rows.push(text)};
 add(state.world?.name);add(state.sceneTitle);add(state.narrative);add(state.quests?.main?.title);for(const x of state.quests?.main?.objectives||[])add(x);for(const x of state.suggestions||[])add(typeof x==="string"?x:x?.label);
 for(const npc of registry.npcs||[]){if(npc?.known===true){add(npc.name);add(npc.role);add(npc.description)}}
 for(const loc of registry.locations||[]){if(loc?.known===true){add(loc.name);add(loc.description)}}
 for(const item of state.inventory||[]){add(item.name);add(item.description)}
 for(const note of state.notes?.entries||state.notes||[]){add(note?.title);add(note?.text||note?.content)}
 const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id);return {sourceLocale:loc.sourceLocale,targetLocale:id,strings:rows.slice(0,220)}
}
export function missingVisibleTranslations(state,locale=loadLocale()){
 const payload=visibleTranslationPayload(state,locale);if(payload.sourceLocale===payload.targetLocale)return {...payload,strings:[]};return {...payload,strings:payload.strings.filter(text=>!hasTranslation(state,text,payload.targetLocale))}
}
export function applyTranslationBundle(state,targetLocale,bundle){
 const id=normalizeLocale(targetLocale),loc=ensureWorldLocale(state,id),table=loc.translations[id]??={};const rows=Array.isArray(bundle?.translations)?bundle.translations:[];
 for(const item of rows){const source=String(item?.source??"").trim(),translated=String(item?.translated??"").trim();if(source&&translated)table[translationKey(source)]=translated}
 loc.displayLocale=id;loc.translatedAt=Date.now();return rows.length
}
export function needsWorldTranslation(state,targetLocale=loadLocale()){return missingVisibleTranslations(state,targetLocale).strings.length>0}
