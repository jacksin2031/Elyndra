import {EXTRA_UI} from "./ui-translations-extra.js?v=59001";
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
 "完全隨機":row("完全隨機","完全随机","Fully Random","完全ランダム"),
 "AI 正在思考…":row("AI 正在思考…","AI 正在思考…","AI is thinking…","AIが思考中…"),
 "AI 正在處理你的行動…":row("AI 正在處理你的行動…","AI 正在处理你的行动…","AI is processing your action…","AIが行動を処理中…"),
 "STATE SYNC：完成後即可繼續行動":row("STATE SYNC：完成後即可繼續行動","STATE SYNC：完成后即可继续行动","STATE SYNC: actions resume when synchronization finishes","STATE SYNC：同期完了後に行動できます"),
 "已選行動 · AI 處理中":row("已選行動 · AI 處理中","已选行动 · AI 处理中","Selected action · AI processing","選択した行動 · AI処理中"),
 "正在鎖定這次行動，完成後才會更新下一批可選行動":row("正在鎖定這次行動，完成後才會更新下一批可選行動","正在锁定本次行动，完成后才会更新下一批可选行动","Locking this action; new choices appear when it finishes.","この行動を確定中です。完了後に次の選択肢を更新します。"),
 "處理目前行動":row("處理目前行動","处理当前行动","Processing current action","現在の行動を処理中"),
 "正在處理已選行動…":row("正在處理已選行動…","正在处理已选行动…","Processing selected action…","選択した行動を処理中…"),
 "AI 回應較慢，必要時會自動切換 Engine 備援":row("AI 回應較慢，必要時會自動切換 Engine 備援","AI 响应较慢，必要时会自动切换 Engine 备用","AI is responding slowly; Engine fallback will be used if needed","AIの応答が遅いため、必要ならEngineフォールバックへ切り替えます"),
 "仍在等待 AI 回應":row("仍在等待 AI 回應","仍在等待 AI 响应","Still waiting for AI","AIの応答を待っています"),
 "對方正在回應……":row("對方正在回應……","对方正在回应……","They are responding…","相手が応答中…"),
 "對方正等待你開口。":row("對方正等待你開口。","对方正在等你开口。","They are waiting for you to speak.","相手はあなたが話すのを待っています。"),
 "送出":row("送出","发送","Send","送信"),
 "人物":row("人物","人物","Person","人物"),
 "遠距":row("遠距","远程","Remote","遠隔"),
 "就在附近":row("就在附近","就在附近","Nearby","すぐ近く"),
 "你從這段對話中確認到可推進任務的新線索。":row("你從這段對話中確認到可推進任務的新線索。","你从这段对话中确认了可推进任务的新线索。","You confirmed a new clue that can advance the quest.","この会話から任務を進められる新しい手掛かりを確認した。"),
 "戰鬥局勢發生了變化。":row("戰鬥局勢發生了變化。","战斗局势发生了变化。","The battle situation has changed.","戦況が変化した。"),
 "戰鬥結束":row("戰鬥結束","战斗结束","Battle ended","戦闘終了"),
 "能力":row("能力","能力","Ability","能力"),
 "技能":row("技能","技能","Skill","技能"),
 "裝備":row("裝備","装备","Equipment","装備"),
 "夥伴":row("夥伴","伙伴","Companion","仲間"),
 "關係修正":row("關係修正","关系修正","Relationship","関係補正"),
 "情境":row("情境","情境","Situation","状況"),
 "天氣":row("天氣","天气","Weather","天候"),
 "信任":row("信任","信任","Trust","信頼"),
 "尊重":row("尊重","尊重","Respect","尊敬"),
 "畏懼":row("畏懼","畏惧","Fear","畏怖"),
 "義務":row("義務","义务","Obligation","義務"),
 "難度":row("難度","难度","Difficulty","難易度"),
 "互動後":row("互動後","互动后","After interaction","交流後"),
 "技能提升至":row("技能提升至","技能提升至","Skill increased to","技能上昇"),
 "AI 場景內容與目前地點／人物狀態不一致；已保留 Engine 結果並重新建立當前場景建議。":row("AI 場景內容與目前地點／人物狀態不一致；已保留 Engine 結果並重新建立當前場景建議。","AI 场景内容与当前地点／人物状态不一致；已保留 Engine 结果并重新建立当前场景建议。","AI scene content conflicted with the current location or character state; the Engine result was kept and current suggestions were rebuilt.","AIの場面内容が現在地／人物状態と一致しないため、Engine結果を保持して現在の提案を再構築しました。"),
 "AI 行動判定暫時不可用；已切換 Engine 備援並繼續本回合。":row("AI 行動判定暫時不可用；已切換 Engine 備援並繼續本回合。","AI 行动判定暂时不可用；已切换 Engine 备用并继续本回合。","AI action assessment is temporarily unavailable; Engine fallback is continuing this turn.","AIの行動判定が一時的に利用できないため、Engineフォールバックでこのターンを続行します。"),
 "AI 世界狀態同步暫時失敗；已保留 Engine 結果並恢復控制。":row("AI 世界狀態同步暫時失敗；已保留 Engine 結果並恢復控制。","AI 世界状态同步暂时失败；已保留 Engine 结果并恢复控制。","AI world-state synchronization temporarily failed; the Engine result was kept and control was restored.","AIの世界状態同期が一時的に失敗したため、Engine結果を保持して操作を復帰しました。"),
 "AI 場景敘述未完成；已保留 Engine 的可見結果。":row("AI 場景敘述未完成；已保留 Engine 的可見結果。","AI 场景叙述未完成；已保留 Engine 的可见结果。","AI scene narration did not finish; the visible Engine result was kept.","AIの場面描写が完了しなかったため、Engineの可視結果を保持しました。"),
 "選單":row("選單","菜单","Menu","メニュー"),
 "旅程設定":row("旅程設定","旅程设置","Journey Settings","旅の設定"),
 "一般冒險期間把系統設定收起，避免打斷場景。":row("一般冒險期間把系統設定收起，避免打斷場景。","普通冒险期间收起系统设置，避免打断场景。","System settings stay tucked away during normal play so they do not interrupt the scene.","通常の冒険中は場面を妨げないようシステム設定をまとめています。"),
 "開發者 · AI 自動測試":row("開發者 · AI 自動測試","开发者 · AI 自动测试","Developer · AI Autotest","開発者 · AI自動テスト"),
 "世界留下的痕跡":row("世界留下的痕跡","世界留下的痕迹","World Traces","世界に残した痕跡"),
 "準備完成":row("準備完成","准备完成","Ready","準備完了"),
 "正在穿越…":row("正在穿越…","正在穿越…","Crossing over…","転移中…"),
 "世界生成完成":row("世界生成完成","世界生成完成","World generation complete","世界生成完了"),
 "世界已編譯完成；請先確認世界契約，再決定是否穿越。":row("世界已編譯完成；請先確認世界契約，再決定是否穿越。","世界已编译完成；请先确认世界契约，再决定是否穿越。","World compilation is complete. Review the world contract before crossing over.","世界のコンパイルが完了しました。転移する前に世界契約を確認してください。"),
 "已返回修改":row("已返回修改","已返回修改","Returned to editing","編集に戻りました"),
 "這次編譯結果尚未建立正式存檔；修改設定後可重新生成。":row("這次編譯結果尚未建立正式存檔；修改設定後可重新生成。","本次编译结果尚未建立正式存档；修改设置后可重新生成。","This compilation has not created a permanent save. Adjust the settings and generate again.","今回のコンパイル結果は正式保存されていません。設定を変更して再生成できます。"),
 "正在建立正式存檔":row("正在建立正式存檔","正在建立正式存档","Creating permanent save","正式セーブを作成中"),
 "正在準備冒險介面":row("正在準備冒險介面","正在准备冒险界面","Preparing adventure interface","冒険画面を準備中"),
 "載入第一個場景":row("載入第一個場景","载入第一个场景","Loading the first scene","最初の場面を読み込み中"),
 "世界生成失敗":row("世界生成失敗","世界生成失败","World generation failed","世界生成失敗")
};
Object.assign(UI,EXTRA_UI);
const REVERSE=new Map();
for(const [source,translations] of Object.entries(UI)){REVERSE.set(source,source);for(const value of Object.values(translations))REVERSE.set(value,source)}
const NODE_SOURCE=new WeakMap(),ATTR_SOURCE=new WeakMap();
const RUNTIME_LOCALIZED=new Map();
const JA_CHINESE_LEAK=/(?:[這詢剛牆從讓與對說處覺為應們]|內容|當地|暫無|具體的|附近|已選行動|位置、人物或事件|眼前的|你的|這個|這些|這是|目前|當前|尚未|仍然|啟用|預設|不使用|世界真正|主要勢力真正|未知區域|故事傾向|文明程度|科技\s*\d|智慧種族約|政治統一|宗教影響|世界危險|生存強度|可自由存檔|飢餓系統|疲勞系統|負面狀態|標準語言障礙|玩家選擇|不包含|穿越到這個世界|返回修改)/u;
const HANT_SIMPLIFIED_LEAK=/[这与为从对会让还开启关闭选择难险饿劳态语种实预设应无]/u;
const HANS_TRADITIONAL_LEAK=/[這與為從對會讓還開啟關閉選擇難險餓勞態語種實預設應無]/u;
export function hasLocaleLeak(value,locale=loadLocale()){
 const text=String(value??'').trim(),id=normalizeLocale(locale);if(!text)return false;
 if(id==='en')return /[\u3040-\u30ff\u3400-\u9fff]/u.test(text);
 if(id==='ja')return JA_CHINESE_LEAK.test(text);
 if(id==='zh-Hans')return HANS_TRADITIONAL_LEAK.test(text);
 if(id==='zh-Hant')return HANT_SIMPLIFIED_LEAK.test(text);
 return false
}
export function canonicalUiKey(value){return REVERSE.get(String(value??"").trim())||String(value??"").trim()}
export function uiText(source,locale=loadLocale()){const key=canonicalUiKey(source),id=normalizeLocale(locale);return UI[key]?.[id]??String(source??"")}
const FORMAT={
 npcWait:row("正在等待 {name} 的回應…","正在等待 {name} 的回应…","Waiting for {name} to respond…","{name} の応答を待っています…"),
 npcRemoteContact:row("正在建立與 {name} 的遠距聯絡…","正在建立与 {name} 的远程联络…","Establishing remote contact with {name}…","{name} との遠隔連絡を確立中…"),
 npcNoInfo:row("{name}沒有提供更多可以確認的資訊。","{name}没有提供更多可以确认的信息。","{name} did not provide any more verifiable information.","{name} からこれ以上確認できる情報は得られなかった。"),
 npcSay:row("對{name}說些甚麼……","对{name}说些什么……","Say something to {name}…","{name} に話しかける…"),
 validationFailed:row("存檔世界完整性驗證失敗：{error}","存档世界完整性验证失败：{error}","Saved world integrity validation failed: {error}","セーブ世界の整合性検証に失敗しました：{error}"),
 worldCompileFailed:row("世界編譯失敗：{error}","世界编译失败：{error}","World compilation failed: {error}","世界のコンパイルに失敗しました：{error}"),
 providerFixedModel:row("{provider} · Elyndra 固定模型：{model}","{provider} · Elyndra 固定模型：{model}","{provider} · Elyndra fixed model: {model}","{provider} · Elyndra固定モデル：{model}"),
 tagCount:row("{count} 個標籤","{count} 个标签","{count} tags","{count}個のタグ")
};
export function uiFormat(key,vars={},locale=loadLocale()){const id=normalizeLocale(locale);let out=FORMAT[key]?.[id]??String(key??"");for(const [name,value] of Object.entries(vars||{}))out=out.replaceAll(`{${name}}`,String(value??""));return out}
export function registerLocalizedOutput(value,locale=loadLocale()){
 const id=normalizeLocale(locale),set=RUNTIME_LOCALIZED.get(id)??new Set();RUNTIME_LOCALIZED.set(id,set);
 const add=v=>{if(v==null)return;if(typeof v==="string"){const raw=v.trim();if(raw){if(!hasLocaleLeak(raw,id))set.add(translationKey(raw));try{const parsed=JSON.parse(raw);if(parsed&&typeof parsed==="object")add(parsed)}catch{}}return}if(Array.isArray(v)){for(const x of v)add(x);return}if(typeof v==="object")for(const x of Object.values(v))add(x)};add(value);return set.size
}
export function isRuntimeLocalized(value,locale=loadLocale()){const text=String(value??"").trim(),id=normalizeLocale(locale);return !text||(!hasLocaleLeak(text,id)&&Boolean(RUNTIME_LOCALIZED.get(id)?.has(translationKey(text))))}
export function applyDocumentLocale(locale=loadLocale(),root=document){
 const id=normalizeLocale(locale),meta=localeMeta(id);globalThis.ELYNDRA_LOCALE=id;if(typeof document!=="undefined")document.documentElement.lang=meta.htmlLang;
 const base=root.body||root;if(!base?.ownerDocument&&!base?.querySelectorAll)return id;
 const doc=base.ownerDocument||root,title=doc.querySelector?.("title");if(title){const source=canonicalUiKey(title.textContent);const next=UI[source]?.[id];if(next&&next!==title.textContent)title.textContent=next}
 const filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;const source=NODE_SOURCE.get(node)||canonicalUiKey(trim);if(!UI[source])continue;NODE_SOURCE.set(node,source);const next=UI[source][id];if(next!==trim)node.nodeValue=raw.replace(trim,next)}
 for(const el of base.querySelectorAll?.("[placeholder],[aria-label],[title]")||[]){let sourceMap=ATTR_SOURCE.get(el);if(!sourceMap){sourceMap={};ATTR_SOURCE.set(el,sourceMap)}for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(!raw)continue;const source=sourceMap[attr]||canonicalUiKey(raw);if(!UI[source])continue;sourceMap[attr]=source;const next=UI[source][id];if(next!==raw)el.setAttribute(attr,next)}}
 const selector=base.querySelector?.("#languageSelect")||doc.querySelector?.("#languageSelect");if(selector)selector.value=id;return id
}

export function ensureWorldLocale(state,locale=loadLocale()){
 if(!state)return null;const id=normalizeLocale(locale);if(!state.localization||typeof state.localization!=="object"||Array.isArray(state.localization))state.localization={};state.localization.sourceLocale=normalizeLocale(state.localization.sourceLocale||state.world?.language||DEFAULT_LOCALE);state.localization.displayLocale=normalizeLocale(state.localization.displayLocale||state.localization.sourceLocale);if(!state.localization.translations||typeof state.localization.translations!=="object"||Array.isArray(state.localization.translations))state.localization.translations={};if(!state.localization.translations[id]||typeof state.localization.translations[id]!=="object"||Array.isArray(state.localization.translations[id]))state.localization.translations[id]={};return state.localization
}
export function translationKey(value){let h=2166136261;for(const ch of String(value??"")){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
const SESSION_TRANSLATIONS=new Map();
function sessionLocale(locale=loadLocale()){const id=normalizeLocale(locale);let row=SESSION_TRANSLATIONS.get(id);if(!row){row={table:{},sources:{}};SESSION_TRANSLATIONS.set(id,row)}return row}
export function applySessionTranslationBundle(targetLocale,bundle){const id=normalizeLocale(targetLocale),row=sessionLocale(id),items=Array.isArray(bundle?.translations)?bundle.translations:[];for(const item of items){const source=String(item?.source??"").trim(),translated=String(item?.translated??"").trim();if(!source||!translated)continue;const key=translationKey(source);row.table[key]=translated;row.sources[key]=source;registerLocalizedOutput(translated,id)}return items.length}
export function sessionTranslatedText(value,locale=loadLocale()){const text=String(value??"");if(!text)return text;const id=normalizeLocale(locale),mapped=sessionLocale(id).table[translationKey(text)];if(mapped&&!hasLocaleLeak(mapped,id))return mapped;if(isRuntimeLocalized(text,id)&&!hasLocaleLeak(text,id))return text;return text}
function sessionCompositeText(value,locale=loadLocale()){const text=String(value??"");if(!text)return text;const exact=sessionTranslatedText(text,locale);if(exact!==text)return exact;const row=sessionLocale(locale);let out=text;const entries=Object.entries(row.sources).map(([key,source])=>[source,row.table[key]]).filter(([source,target])=>source&&target&&source!==target).sort((a,b)=>b[0].length-a[0].length);for(const [source,target] of entries)if(source.length>1&&out.includes(source))out=out.split(source).join(target);return out}
export function hasTranslation(state,value,locale=loadLocale()){
 const text=String(value??"").trim(),id=normalizeLocale(locale);if(!text)return true;const loc=ensureWorldLocale(state,id),mapped=loc.translations?.[id]?.[translationKey(text)];if(mapped)return !hasLocaleLeak(mapped,id);if(hasLocaleLeak(text,id))return false;return isRuntimeLocalized(text,id)
}
export function translatedText(state,value,locale=loadLocale()){
 const text=String(value??"");if(!text)return text;const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id),mapped=loc.translations?.[id]?.[translationKey(text)];if(mapped&&!hasLocaleLeak(mapped,id))return mapped;if(isRuntimeLocalized(text,id)&&!hasLocaleLeak(text,id))return text;return text
}
export function visibleTranslationPayload(state,locale=loadLocale()){
 if(!state)return {sourceLocale:DEFAULT_LOCALE,targetLocale:normalizeLocale(locale),strings:[],volatileStrings:[]};const registry=state.world?.registry||{},rows=[],volatile=[];const add=v=>{const text=String(v??"").trim();if(text&&!rows.includes(text))rows.push(text);return text};const addVolatile=v=>{const text=add(v);if(text&&!volatile.includes(text))volatile.push(text)};
 add(state.world?.name);add(state.player?.location);addVolatile(state.sceneTitle);addVolatile(state.narrative);add(state.quests?.main?.title);for(const x of state.quests?.main?.objectives||[])add(x);for(const x of state.suggestions||[])addVolatile(typeof x==="string"?x:x?.label);for(const x of state.suggestionIntents||[])addVolatile(x?.label)
 for(const key of ["label","background","worldKnowledgeBoundary","legalStatus","languagePolicy","knowledgePolicy","openingBias"])add(state.player?.origin?.[key]);for(const npc of registry.npcs||[]){if(npc?.known===true){add(npc.name);add(npc.role);add(npc.description)}}
 for(const loc of registry.locations||[]){if(loc?.known===true){add(loc.name);add(loc.description)}}
 for(const item of state.inventory||[]){add(item.name);add(item.description)}
 const noteRows=Array.isArray(state.notes)?state.notes:(Array.isArray(state.notes?.entries)?state.notes.entries:[]);for(const note of noteRows){add(note?.title);add(note?.text||note?.content)}
 const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id);return {sourceLocale:loc.sourceLocale,targetLocale:id,strings:rows.slice(0,220),volatileStrings:volatile.slice(0,80)}
}
export function missingVisibleTranslations(state,locale=loadLocale()){
 const payload=visibleTranslationPayload(state,locale);if(payload.sourceLocale===payload.targetLocale&&payload.targetLocale===DEFAULT_LOCALE)return {...payload,strings:[]};const candidates=payload.sourceLocale===payload.targetLocale?[...new Set([...payload.volatileStrings,...payload.strings.filter(text=>hasLocaleLeak(text,payload.targetLocale))])]:payload.strings;return {...payload,strings:candidates.filter(text=>!hasTranslation(state,text,payload.targetLocale))}
}
export function applyTranslationBundle(state,targetLocale,bundle){
 const id=normalizeLocale(targetLocale),loc=ensureWorldLocale(state,id),table=loc.translations[id]??={},sources=loc.translationSources??={};loc.translationSources=sources;sources[id]??={};const rows=Array.isArray(bundle?.translations)?bundle.translations:[];
 for(const item of rows){const source=String(item?.source??"").trim(),translated=String(item?.translated??"").trim();if(source&&translated){const key=translationKey(source);table[key]=translated;sources[id][key]=source;registerLocalizedOutput(translated,id)}}
 loc.displayLocale=id;loc.translatedAt=Date.now();return rows.length
}
export function needsWorldTranslation(state,targetLocale=loadLocale()){return missingVisibleTranslations(state,targetLocale).strings.length>0}

export function translatedCompositeText(state,value,locale=loadLocale()){
 const text=String(value??"");if(!state||!text)return text;const exact=translatedText(state,text,locale);if(exact!==text)return exact;const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id);const table=loc.translations?.[id]||{},sources=loc.translationSources?.[id]||{};let out=text;const entries=Object.entries(sources).map(([key,source])=>[source,table[key]]).filter(([source,target])=>source&&target&&source!==target).sort((a,b)=>b[0].length-a[0].length);for(const [source,target] of entries)if(source.length>1&&out.includes(source))out=out.split(source).join(target);return out
}
export function applyWorldLocaleToDocument(state,locale=loadLocale(),root=document){
 if(!state||typeof document==="undefined")return;const base=root.body||root,doc=base.ownerDocument||root,filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|TEXTAREA|OPTION|CODE|PRE)$/.test(parent.tagName))continue;const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;const localized=translatedCompositeText(state,trim,locale);if(localized!==trim)node.nodeValue=raw.replace(trim,localized)}for(const el of base.querySelectorAll?.("[placeholder],[aria-label],[title]")||[])for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(!raw)continue;const localized=translatedCompositeText(state,raw,locale);if(localized!==raw)el.setAttribute(attr,localized)}
}
export function applySessionLocaleToDocument(locale=loadLocale(),root=document){
 if(typeof document==="undefined")return;const base=root.body||root,doc=base.ownerDocument||root,filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|TEXTAREA|OPTION|CODE|PRE)$/.test(parent.tagName))continue;const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;const localized=sessionCompositeText(trim,locale);if(localized!==trim)node.nodeValue=raw.replace(trim,localized)}for(const el of base.querySelectorAll?.("[placeholder],[aria-label],[title]")||[])for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(!raw)continue;const localized=sessionCompositeText(raw,locale);if(localized!==raw)el.setAttribute(attr,localized)}
}
export function documentTranslationCandidates(state,locale=loadLocale(),root=document){
 const id=normalizeLocale(locale);if(id===DEFAULT_LOCALE||typeof document==="undefined")return {sourceLocale:state?.localization?.sourceLocale||DEFAULT_LOCALE,targetLocale:id,strings:[]};const base=root.body||root,doc=base.ownerDocument||root,rows=[];const add=value=>{const text=String(value??"").trim();if(!text||rows.includes(text))return;const suspicious=id==="en"?/[\u3040-\u30ff\u3400-\u9fff]/u.test(text):hasLocaleLeak(text,id);if(!suspicious)return;const canonical=canonicalUiKey(text);if(UI[canonical]||isRuntimeLocalized(text,id)||sessionTranslatedText(text,id)!==text)return;if(state&&translatedCompositeText(state,text,id)!==text)return;rows.push(text)};const filter=doc.defaultView?.NodeFilter?.SHOW_TEXT??4,walker=doc.createTreeWalker(base,filter);while(walker.nextNode()){const node=walker.currentNode,parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|TEXTAREA|OPTION|CODE|PRE)$/.test(parent.tagName))continue;add(node.nodeValue)}for(const el of base.querySelectorAll?.("[placeholder],[aria-label],[title]")||[])for(const attr of ["placeholder","aria-label","title"]){const raw=el.getAttribute(attr);if(raw)add(raw)}return {sourceLocale:state?.localization?.sourceLocale||DEFAULT_LOCALE,targetLocale:id,strings:rows.slice(0,120)}
}
