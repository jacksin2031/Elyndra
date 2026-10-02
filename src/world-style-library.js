import { WORLD_STYLE_PRESETS, getWorldStylePreset } from "./world-style-presets.js?v=60032";
import { loadLocale, normalizeLocale, uiText } from "./locale-runtime.js?v=60010";
import { localizedStaticText } from "./v0594-static-i18n.js?v=59010";
import {
  WORLD_STYLE_LIBRARY_ADVANCED_FIELDS,
  WORLD_STYLE_LIBRARY_ARTS,
  WORLD_STYLE_LIBRARY_SETTING_FIELDS,
  deleteWorldStyle,
  loadWorldStyleLibrary,
  saveWorldStyle
} from "./world-style-library-store.js?v=61001";
import {
  WORLD_STYLE_ART_CATALOG,
  WORLD_STYLE_CUSTOM_CANONICAL_NAME,
  getWorldStyleArt,
  getTemplateStyleLabel,
  worldStyleArtUrl
} from "./world-style-art.js?v=61002";

const BUILTIN_WORLD_STYLE_NAMES = Object.freeze(Object.keys(WORLD_STYLE_ART_CATALOG));
const TAG_FIELDS = Object.freeze(["requiredElements", "allowedElements", "forbiddenElements"]);
const MODE_FIELDS = Object.keys(WORLD_STYLE_LIBRARY_ADVANCED_FIELDS).filter((key) => WORLD_STYLE_LIBRARY_ADVANCED_FIELDS[key].mode);
const FOCUSABLE = "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[href],[tabindex]:not([tabindex='-1'])";

const UI = Object.freeze({
  "zh-Hant": {
    open: "風格圖鑑", title: "世界風格圖鑑", subtitle: "查看預設風格，或建立可重用的自訂世界樣板。",
    close: "關閉圖鑑", search: "搜尋世界風格", searchPlaceholder: "輸入名稱或描述",
    builtins: "內建世界風格", saved: "已儲存樣板", create: "建立自訂樣板", noSaved: "尚未儲存自訂樣板。",
    select: "選擇世界風格", selected: "已選擇", useBuiltin: "套用此風格", useCustom: "套用此樣板",
    edit: "編輯", remove: "刪除", artReference: "參考插畫", artOriginal: "專屬插畫",
    builtInDetails: "世界特徵", blueprint: "風格預設參數", blueprintNote: "以下數值是風格的預設傾向，不代表已生成世界的結果。",
    editorNew: "建立自訂樣板", editorEdit: "編輯自訂樣板", editorIntro: "樣板只保存世界設定，不會保存角色、起源、難度、遊玩時間或目前世界。",
    back: "返回圖鑑", name: "樣板名稱", art: "封面圖片", description: "自訂世界描述", prompt: "自訂異世界", story: "故事偏好",
    scale: "世界規模", tags: "世界元素規則", required: "必須存在", allowed: "可以存在", forbidden: "禁止出現",
    tagHelp: "每行一項，最多 20 項；同一標籤只能放在一組。", advanced: "進階世界設定",
    save: "儲存樣板", cancel: "取消", saving: "正在儲存…", savedOk: "樣板已儲存。", applied: "已套用樣板。",
    builtinApplied: "已套用世界風格。", confirmDeleteTitle: "刪除這個樣板？", confirmDeleteBody: "這項操作會移除本機儲存的樣板。",
    confirmDelete: "確認刪除", keep: "保留樣板", deleted: "樣板已刪除。", emptySearch: "沒有符合搜尋條件的風格。",
    emptyDescription: "此風格沒有額外描述。", storeUnavailable: "無法讀取本機樣板儲存空間。請檢查瀏覽器儲存設定。",
    corruptJson: "樣板資料格式損壞，已保留原資料，沒有覆寫。", corruptSchema: "樣板資料結構無效，已保留原資料，沒有覆寫。",
    quota: "儲存空間不足，樣板沒有儲存。請刪除本機不需要的資料後重試。", writeFailed: "無法儲存樣板，請稍後重試。",
    duplicate: "已有同名樣板，請更改名稱。", notFound: "找不到這個樣板；請重新整理圖鑑。", invalidName: "請輸入 1 至 60 字的樣板名稱。",
    invalidSettings: "設定值無效，請檢查進階參數及標籤。", conflictingTags: "同一標籤不能同時屬於多個規則組。",
    libraryFull: "本機樣板已達上限，請先刪除不需要的樣板。", genericError: "操作未完成，請檢查輸入後重試。",
    artNames: ["王道奇幻", "黑暗奇幻", "東方幻想", "蒸汽魔法", "末日異世界", "低魔政治奇幻", "神話洪荒", "浮空群島", "魔導都市", "巨獸共生", "永夜寒境"],
    world: "世界風格介紹", civilization: "文明與社會", supernatural: "超自然規則", conflicts: "衝突方向", environment: "環境與探索", narrative: "敘事原則",
    number: "數量", percent: "百分比", outOfTen: "十分制", defaultTendency: "預設傾向", applyHint: "套用內建風格只會更改世界風格；其他目前設定會保留。"
  },
  "zh-Hans": {
    open: "风格图鉴", title: "世界风格图鉴", subtitle: "查看预设风格，或建立可重复使用的自定义世界模板。",
    close: "关闭图鉴", search: "搜索世界风格", searchPlaceholder: "输入名称或描述",
    builtins: "内置世界风格", saved: "已保存模板", create: "建立自定义模板", noSaved: "尚未保存自定义模板。",
    select: "选择世界风格", selected: "已选择", useBuiltin: "应用此风格", useCustom: "应用此模板",
    edit: "编辑", remove: "删除", artReference: "参考插画", artOriginal: "专属插画",
    builtInDetails: "世界特征", blueprint: "风格预设参数", blueprintNote: "以下数值是风格的预设倾向，不代表已生成世界的结果。",
    editorNew: "建立自定义模板", editorEdit: "编辑自定义模板", editorIntro: "模板只保存世界设定，不会保存角色、起源、难度、游戏时间或当前世界。",
    back: "返回图鉴", name: "模板名称", art: "封面图片", description: "自定义世界描述", prompt: "自定义异世界", story: "故事偏好",
    scale: "世界规模", tags: "世界元素规则", required: "必须存在", allowed: "可以存在", forbidden: "禁止出现",
    tagHelp: "每行一项，最多 20 项；同一标签只能放在一组。", advanced: "进阶世界设定",
    save: "保存模板", cancel: "取消", saving: "正在保存…", savedOk: "模板已保存。", applied: "已应用模板。",
    builtinApplied: "已应用世界风格。", confirmDeleteTitle: "删除这个模板？", confirmDeleteBody: "此操作会移除本机保存的模板。",
    confirmDelete: "确认删除", keep: "保留模板", deleted: "模板已删除。", emptySearch: "没有符合搜索条件的风格。",
    emptyDescription: "此风格没有额外描述。", storeUnavailable: "无法读取本机模板存储空间。请检查浏览器存储设置。",
    corruptJson: "模板数据格式损坏，已保留原数据，没有覆盖。", corruptSchema: "模板数据结构无效，已保留原数据，没有覆盖。",
    quota: "存储空间不足，模板没有保存。请删除本机不需要的数据后重试。", writeFailed: "无法保存模板，请稍后重试。",
    duplicate: "已有同名模板，请更改名称。", notFound: "找不到这个模板；请刷新图鉴。", invalidName: "请输入 1 至 60 字的模板名称。",
    invalidSettings: "设置值无效，请检查进阶参数及标签。", conflictingTags: "同一标签不能同时属于多个规则组。",
    libraryFull: "本机模板已达上限，请先删除不需要的模板。", genericError: "操作未完成，请检查输入后重试。",
    artNames: ["王道奇幻", "黑暗奇幻", "东方幻想", "蒸汽魔法", "末日异世界", "低魔政治奇幻", "神话洪荒", "浮空群岛", "魔导都市", "巨兽共生", "永夜寒境"],
    world: "世界风格介绍", civilization: "文明与社会", supernatural: "超自然规则", conflicts: "冲突方向", environment: "环境与探索", narrative: "叙事原则",
    number: "数量", percent: "百分比", outOfTen: "十分制", defaultTendency: "预设倾向", applyHint: "应用内置风格只会更改世界风格；其他当前设置会保留。"
  },
  en: {
    open: "Style Gallery", title: "World Style Gallery", subtitle: "Explore built-in styles or create reusable world templates.",
    close: "Close gallery", search: "Search world styles", searchPlaceholder: "Search names or descriptions",
    builtins: "Built-in styles", saved: "Saved templates", create: "Create custom template", noSaved: "No custom templates saved yet.",
    select: "Select a world style", selected: "Selected", useBuiltin: "Apply this style", useCustom: "Apply this template",
    edit: "Edit", remove: "Delete", artReference: "Illustrative reference", artOriginal: "Style artwork",
    builtInDetails: "World characteristics", blueprint: "Style blueprint defaults", blueprintNote: "These values describe preset tendencies; they are not claims about a generated world.",
    editorNew: "Create custom template", editorEdit: "Edit custom template", editorIntro: "Templates save world settings only. They do not save a character, origin, difficulty, play time, or current world.",
    back: "Back to gallery", name: "Template name", art: "Cover image", description: "Custom world description", prompt: "World prompt", story: "Story preferences",
    scale: "World scale", tags: "World element rules", required: "Required", allowed: "Allowed", forbidden: "Forbidden",
    tagHelp: "One item per line, up to 20 per group. A tag can belong to only one group.", advanced: "Advanced world settings",
    save: "Save template", cancel: "Cancel", saving: "Saving…", savedOk: "Template saved.", applied: "Template applied.",
    builtinApplied: "World style applied.", confirmDeleteTitle: "Delete this template?", confirmDeleteBody: "This removes the template saved in this browser.",
    confirmDelete: "Delete template", keep: "Keep template", deleted: "Template deleted.", emptySearch: "No styles match this search.",
    emptyDescription: "No additional description is available.", storeUnavailable: "Local template storage could not be read. Check your browser storage settings.",
    corruptJson: "Template data is malformed. The original data was kept and not overwritten.", corruptSchema: "Template data has an invalid structure. The original data was kept and not overwritten.",
    quota: "There is not enough storage space. The template was not saved. Remove unneeded local data and try again.", writeFailed: "The template could not be saved. Try again.",
    duplicate: "A template with this name already exists.", notFound: "This template could not be found. Refresh the gallery.", invalidName: "Enter a template name between 1 and 60 characters.",
    invalidSettings: "A setting is invalid. Check the advanced values and tags.", conflictingTags: "A tag cannot be in more than one rule group.",
    libraryFull: "The local template limit has been reached. Delete a template before adding another.", genericError: "The action could not be completed. Check the fields and try again.",
    artNames: ["Classic fantasy", "Dark fantasy", "Eastern fantasy", "Steam magic", "Post-apocalyptic", "Low-magic politics", "Mythic primordial", "Floating islands", "Arcane metropolis", "Beast symbiosis", "Endless winter"],
    world: "Style overview", civilization: "Civilization and society", supernatural: "Supernatural rules", conflicts: "Conflict directions", environment: "Environment and exploration", narrative: "Narrative principles",
    number: "Count", percent: "Percent", outOfTen: "out of 10", defaultTendency: "Preset tendency", applyHint: "Applying a built-in style changes only the world style; your other current settings stay as they are."
  },
  ja: {
    open: "スタイル図鑑", title: "世界スタイル図鑑", subtitle: "既定スタイルを確認し、再利用できる世界テンプレートを作成できます。",
    close: "図鑑を閉じる", search: "世界スタイルを検索", searchPlaceholder: "名前または説明を入力",
    builtins: "既定の世界スタイル", saved: "保存済みテンプレート", create: "カスタムテンプレートを作成", noSaved: "カスタムテンプレートはまだありません。",
    select: "世界スタイルを選択", selected: "選択中", useBuiltin: "このスタイルを適用", useCustom: "このテンプレートを適用",
    edit: "編集", remove: "削除", artReference: "イメージ参考画像", artOriginal: "専用イラスト",
    builtInDetails: "世界の特徴", blueprint: "スタイルの初期傾向", blueprintNote: "数値はスタイルの初期傾向です。生成済みの世界について示すものではありません。",
    editorNew: "カスタムテンプレートを作成", editorEdit: "カスタムテンプレートを編集", editorIntro: "保存されるのは世界設定だけです。キャラクター、出自、難易度、プレイ時間、現在の世界は保存されません。",
    back: "図鑑へ戻る", name: "テンプレート名", art: "カバー画像", description: "カスタム世界の説明", prompt: "世界への希望", story: "物語の好み",
    scale: "世界の規模", tags: "世界要素のルール", required: "必須", allowed: "存在してよい", forbidden: "禁止",
    tagHelp: "1行に1項目、各グループ20件まで。同じタグを複数のグループに入れることはできません。", advanced: "詳細な世界設定",
    save: "テンプレートを保存", cancel: "キャンセル", saving: "保存中…", savedOk: "テンプレートを保存しました。", applied: "テンプレートを適用しました。",
    builtinApplied: "世界スタイルを適用しました。", confirmDeleteTitle: "このテンプレートを削除しますか？", confirmDeleteBody: "このブラウザーに保存されたテンプレートを削除します。",
    confirmDelete: "削除する", keep: "残す", deleted: "テンプレートを削除しました。", emptySearch: "検索に一致するスタイルはありません。",
    emptyDescription: "追加の説明はありません。", storeUnavailable: "ローカルのテンプレート保存領域を読み込めません。ブラウザーの保存設定を確認してください。",
    corruptJson: "テンプレートデータの形式が壊れています。元のデータは上書きせずに保持しました。", corruptSchema: "テンプレートデータの構造が無効です。元のデータは上書きせずに保持しました。",
    quota: "保存領域が不足しています。テンプレートは保存されていません。不要なローカルデータを削除して再試行してください。", writeFailed: "テンプレートを保存できませんでした。もう一度お試しください。",
    duplicate: "同じ名前のテンプレートがあります。名前を変更してください。", notFound: "テンプレートが見つかりません。図鑑を更新してください。", invalidName: "1〜60文字のテンプレート名を入力してください。",
    invalidSettings: "設定値が無効です。詳細設定とタグを確認してください。", conflictingTags: "同じタグを複数のルールグループに登録することはできません。",
    libraryFull: "ローカルテンプレートの上限です。不要なテンプレートを削除してください。", genericError: "処理を完了できませんでした。入力内容を確認して再試行してください。",
    artNames: ["王道ファンタジー", "ダークファンタジー", "東方幻想", "スチームマジック", "終末異世界", "低魔法の政治劇", "神話の原初世界", "浮遊群島", "魔導都市", "巨獣との共生", "終わらない冬"],
    world: "スタイル概要", civilization: "文明と社会", supernatural: "超自然のルール", conflicts: "対立の方向性", environment: "環境と探索", narrative: "物語の原則",
    number: "数", percent: "割合", outOfTen: " / 10", defaultTendency: "既定の傾向", applyHint: "既定スタイルを適用すると世界スタイルだけが変わり、現在の他の設定は維持されます。"
  }
});

const BUILTIN_COPY = Object.freeze({
  en: Object.freeze({
    "王道奇幻": { title: "Classic Fantasy", description: "A world of settled communities and broad wilderness, with room for hope, growth, and discovery. Supernatural forces are common enough to matter, but each needs a source, rules, limits, and a cost.", traits: ["Adventure and mystery", "Civilization beside the unknown", "Growth through choices"] },
    "黑暗奇幻": { title: "Dark Fantasy", description: "Order is fragile under scarcity, fear, hierarchy, and corruption. Supernatural power carries consequences, while knowledge and choices still let people change local outcomes.", traits: ["High survival pressure", "Morally difficult choices", "Hope with a cost"] },
    "東方幻想": { title: "Eastern Fantasy", description: "Regional beliefs, family or lineage, local powers, and the living natural world shape society. Spirits, cultivation, rituals, contracts, and geography follow rules made for this world rather than copied from real dynasties.", traits: ["Place and tradition", "Human and spirit pacts", "Distinct local orders"] },
    "蒸汽魔法": { title: "Steam Magic", description: "Industry, machinery, and supernatural engineering shape daily life. Energy, transport, supply chains, technical monopolies, and class relations create practical pressure across the world.", traits: ["Industry and wonder", "Energy and transport", "Technology has a cost"] },
    "低魔政治奇幻": { title: "Low-Magic Political Fantasy", description: "The supernatural is real but scarce. Land, armies, contracts, class, religion, trade, and intelligence drive society, so political and economic consequences tend to outweigh magical spectacle.", traits: ["Rare magic", "Competing institutions", "Law, supply, and influence"] },
    "神話洪荒": { title: "Mythic Primordial World", description: "Civilization is young beside ancient landscapes, colossal creatures, divine powers, taboos, and natural orders. Settlements survive by adapting to forces with deeper histories than any present kingdom.", traits: ["Ancient natural orders", "Fragile settlements", "Awe and danger"] },
    "浮空群島": { title: "Sky Archipelago", description: "Separated sky islands, vertical regions, and dangerous routes define the world. Travel capacity directly shapes trade, information, military reach, and political influence.", traits: ["Aerial exploration", "Route control", "Isolated island cultures"] },
    "魔導都市": { title: "Magitech Metropolis", description: "Magic functions as specialized urban infrastructure for services such as light, transport, medicine, identity, finance, or public safety. It needs energy, maintenance, qualifications, oversight, and ways to fail.", traits: ["Institutionalized magic", "Dense urban systems", "Prosperity with weak points"] },
    "巨獸共生": { title: "Beast Symbiosis", description: "Colossal creatures belong to the ecology, transport, faith, resources, and settlement patterns of the world. Communities balance dependence with risk instead of treating every beast as a disposable enemy.", traits: ["Ecological wonder", "Dependence and risk", "Conservation and exploitation"] },
    "永夜寒境": { title: "Endless Night", description: "Long darkness, extreme cold, and scarce resources are ordinary conditions. Energy, food, warmth, safe settlements, and passable routes determine whether communities can endure.", traits: ["Cold isolation", "Resource pressure", "Fragile safe havens"] },
    "末日異世界": { title: "Apocalyptic Otherworld", description: "Civilization is badly damaged or fragmented. Survival, migration, scarce resources, unknown disasters, and lost information matter more than intact national institutions.", traits: ["Broken order", "Survival and rebuilding", "Truth pieced from remnants"] }
  }),
  ja: Object.freeze({
    "王道奇幻": { title: "王道ファンタジー", description: "安定した集落と広大な未知の地が共存し、希望、成長、探索の余地があります。超自然の力は身近ですが、起源、規則、制限、代償が必要です。", traits: ["冒険と謎", "文明と未知の境界", "選択を通じた成長"] },
    "黑暗奇幻": { title: "ダークファンタジー", description: "資源不足、恐怖、階級、腐敗によって秩序は揺らぎます。超自然の力には代償が伴い、知識と選択によって局所の結果を変える余地も残ります。", traits: ["厳しい生存環境", "道徳的に難しい選択", "代償を伴う希望"] },
    "東方幻想": { title: "東方幻想", description: "地域信仰、家系や師弟関係、地方権力、自然との結びつきが社会を形作ります。精霊、修行、儀式、契約、地理には、この世界独自の規則があります。", traits: ["土地と伝統", "人と精霊の契約", "地域ごとに異なる秩序"] },
    "蒸汽魔法": { title: "スチームマジック", description: "産業、機械、超自然の技術が文明を形作ります。エネルギー、輸送、供給網、技術の独占、階級関係が現実的な圧力を生みます。", traits: ["産業の驚異", "エネルギーと輸送", "技術には代償がある"] },
    "低魔政治奇幻": { title: "ローマジック政治ファンタジー", description: "超自然の力は実在しますが希少です。土地、軍隊、契約、階級、宗教、交易、情報が社会を動かし、魔法の見せ場より政治と経済の帰結が重視されます。", traits: ["希少な魔法", "制度間の競争", "法と補給と影響力"] },
    "神話洪荒": { title: "神話的原初世界", description: "文明は、古い大地、巨獣、神性、禁忌、自然の秩序に比べれば若い存在です。現在の王国より長い歴史を持つ力に適応して、集落は生き延びます。", traits: ["古い自然の秩序", "脆い集落", "畏怖と危険"] },
    "浮空群島": { title: "浮遊群島", description: "空に浮かぶ島々、垂直に広がる地域、危険な航路が世界を定義します。移動手段が交易、情報、軍事力、政治的影響力を左右します。", traits: ["空の探索", "航路の支配", "孤立した島の文化"] },
    "魔導都市": { title: "魔導都市", description: "魔法は照明、交通、医療、身分、金融、治安などを支える都市インフラとして専門化されています。エネルギー、保守、資格、監督、故障への備えが必要です。", traits: ["制度化された魔法", "密集した都市システム", "繁栄の弱点"] },
    "巨獸共生": { title: "巨獣共生", description: "巨大な生物は生態系、交通、信仰、資源、集落の一部です。人々は依存と危険の間で均衡を探り、すべての獣を使い捨ての敵として扱うわけではありません。", traits: ["生態の驚異", "依存と危険", "保護と利用の対立"] },
    "永夜寒境": { title: "永夜の寒境", description: "長い夜、極寒、乏しい資源が日常です。エネルギー、食料、防寒、安全な集落、通行できる道が共同体の存続を決めます。", traits: ["寒冷と孤立", "資源の圧力", "脆い安全圏"] },
    "末日異世界": { title: "終末異世界", description: "文明の秩序は深く損なわれ、各地で分断されています。完全な国家制度より、生存、移住、資源不足、未知の災害、失われた情報が重要です。", traits: ["崩れた秩序", "生存と再建", "残された痕跡から真相へ"] }
  })
});

const BLUEPRINT_LABELS = Object.freeze({
  "zh-Hant": { civilization: "文明程度", technology: "科技程度", magic: "魔法普及", politicalUnity: "政治統一", religion: "宗教影響", resources: "資源豐富", danger: "世界危險", survival: "生存強度", unknownRatio: "未知區域" },
  "zh-Hans": { civilization: "文明程度", technology: "科技程度", magic: "魔法普及", politicalUnity: "政治统一", religion: "宗教影响", resources: "资源丰富", danger: "世界危险", survival: "生存强度", unknownRatio: "未知区域" },
  en: { civilization: "Civilization", technology: "Technology", magic: "Magic", politicalUnity: "Political unity", religion: "Religion", resources: "Resources", danger: "World danger", survival: "Survival", unknownRatio: "Unknown areas" },
  ja: { civilization: "文明", technology: "技術", magic: "魔法", politicalUnity: "政治統一", religion: "宗教", resources: "資源", danger: "世界の危険度", survival: "生存強度", unknownRatio: "未知の地域" }
});

const MODE_LABELS = Object.freeze({
  "zh-Hant": { style: "依世界風格", fixed: "指定", random: "隨機", lock: "鎖定" },
  "zh-Hans": { style: "按世界风格", fixed: "指定", random: "随机", lock: "锁定" },
  en: { style: "From style", fixed: "Fixed", random: "Random", lock: "Locked" },
  ja: { style: "スタイルに従う", fixed: "指定", random: "ランダム", lock: "固定" }
});
const BLUEPRINT_SETTING_FIELDS = Object.freeze({
  civilization: "civilizationLevel", technology: "technologyLevel", magic: "magicLevel",
  politicalUnity: "politicalUnity", religion: "religionInfluence", resources: "resourceAbundance",
  danger: "worldDanger", survival: "survivalIntensity", unknownRatio: "unknownRatio"
});

function localeText(key, locale = loadLocale()) {
  return (UI[normalizeLocale(locale)] || UI["zh-Hant"])[key] || key;
}

function make(tag, className, text, doc = document) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function button(text, action, className = "", doc = document) {
  const node = make("button", className, text, doc);
  node.type = "button";
  node.dataset.action = action;
  return node;
}

function localizeCanonical(value, locale) {
  if (locale === "zh-Hant") return value;
  if (locale === "zh-Hans") return localizedStaticText(value, locale);
  const translated = uiText(value, locale);
  return translated === value ? localizedStaticText(value, locale) : translated;
}

function styleCopy(name, locale) {
  const preset = getWorldStylePreset(name);
  const id = normalizeLocale(locale);
  if (id === "zh-Hant" || id === "zh-Hans") {
    const convert = (text) => localizeCanonical(text, id);
    const features = [
      { label: localeText("civilization", id), text: preset.civilization },
      { label: localeText("supernatural", id), text: preset.supernatural },
      { label: localeText("conflicts", id), text: preset.conflictBias.join("、") },
      { label: localeText("environment", id), text: preset.environmentBias.join("、") },
      { label: localeText("narrative", id), text: preset.narrativeRules.join("；") }
    ];
    return {
      title: convert(name), description: convert(preset.foundation), traits: preset.tone.map(convert),
      features: features.map((feature) => ({ label: feature.label, text: convert(feature.text) }))
    };
  }
  const translated = BUILTIN_COPY[id]?.[name];
  if (!translated) return { title: name, description: preset.foundation, traits: preset.tone, features: [] };
  return {
    title: translated.title,
    description: translated.description,
    traits: translated.traits,
    features: []
  };
}

function allowedArtForGenre(genre) {
  return getWorldStyleArt(genre);
}

function creatorTextSettings() {
  const settings = {};
  for (const key of WORLD_STYLE_LIBRARY_SETTING_FIELDS) {
    const source = document.getElementById(key);
    if (!source) return null;
    if (TAG_FIELDS.includes(key)) {
      settings[key] = String(source.value || "").split(/[\n,，;；]+/u).map((tag) => tag.trim()).filter(Boolean);
    } else if (source.type === "checkbox") settings[key] = source.checked === true;
    else if (source.type === "number" || source.type === "range") settings[key] = Number(source.value);
    else settings[key] = source.value;
  }
  return settings;
}

function parseTagTextarea(value) {
  const tags = String(value || "").split(/[\n,，;；]+/u).map((tag) => tag.trim().replace(/\s+/gu, " ")).filter(Boolean);
  if (tags.length > 20 || tags.some((tag) => tag.length > 60)) return null;
  return tags;
}

function storeErrorMessage(error, locale) {
  const key = ({
    storage_unavailable: "storeUnavailable", corrupt_json: "corruptJson", corrupt_schema: "corruptSchema",
    quota_exceeded: "quota", storage_write_failed: "writeFailed", duplicate_name: "duplicate",
    style_not_found: "notFound", invalid_name: "invalidName", invalid_settings: "invalidSettings",
    conflicting_tags: "conflictingTags", library_full: "libraryFull"
  })[error] || "genericError";
  return localeText(key, locale);
}

function copySettings(settings) {
  if (!settings) return null;
  const copy = { ...settings };
  for (const key of TAG_FIELDS) copy[key] = [...(settings[key] || [])];
  return copy;
}

function cloneAdvancedControls(doc, locale, initialSettings) {
  const sourceGrid = doc.querySelector(".advanced-world-grid");
  if (!sourceGrid) return null;
  const target = make("div", "wsl-advanced-grid", undefined, doc);
  const mapping = new Map();
  const sourceSettings = sourceGrid.querySelectorAll(".advanced-setting");
  for (const sourceSetting of sourceSettings) {
    const clone = sourceSetting.cloneNode(true);
    const nodes = [clone, ...clone.querySelectorAll("*")];
    const idMap = new Map();
    for (const node of nodes) {
      if (!node.id) continue;
      const oldId = node.id;
      const nextId = "wslEditor_" + oldId;
      idMap.set(oldId, nextId);
      node.id = nextId;
      if (node.matches("input,select,textarea")) {
        node.dataset.wslField = oldId;
        mapping.set(oldId, node);
      }
    }
    for (const node of nodes) {
      for (const attr of ["for", "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns"]) {
        const raw = node.getAttribute(attr);
        if (!raw) continue;
        node.setAttribute(attr, raw.split(/\s+/u).map((token) => idMap.get(token) || token).join(" "));
      }
    }
    for (const selector of ["input", "select", "textarea"]) {
      const sourceControls = sourceSetting.querySelectorAll(selector);
      const cloneControls = clone.querySelectorAll(selector);
      sourceControls.forEach((source, index) => {
        const destination = cloneControls[index];
        if (!destination) return;
        if (source.type === "checkbox" || source.type === "radio") destination.checked = source.checked;
        else destination.value = source.value;
        destination.disabled = source.disabled;
      });
    }
    sourceSetting.querySelectorAll("output").forEach((source, index) => {
      const destination = clone.querySelectorAll("output")[index];
      if (destination) destination.textContent = source.textContent;
    });
    translateTree(clone, locale);
    target.append(clone);
  }
  for (const [key, control] of mapping) {
    if (Object.hasOwn(initialSettings || {}, key)) {
      const value = initialSettings[key];
      if (control.type === "checkbox") control.checked = value === true;
      else control.value = String(value);
    }
  }
  const syncModes = () => {
    for (const key of MODE_FIELDS) {
      const value = mapping.get(key);
      const mode = mapping.get(key + "Mode");
      if (value && mode) value.disabled = mode.value !== "fixed";
    }
  };
  const syncOutputs = () => {
    for (const key of ["civilizationLevel", "technologyLevel", "magicLevel", "politicalUnity", "religionInfluence", "resourceAbundance", "worldDanger", "survivalIntensity"]) {
      const input = mapping.get(key);
      const output = target.querySelector("[id='wslEditor_" + key + "Value']");
      if (input && output) output.textContent = input.value;
    }
  };
  target.addEventListener("change", (event) => {
    if (event.target.matches("select[id$='Mode']")) syncModes();
  });
  target.addEventListener("input", (event) => {
    if (event.target.matches("input[type='range']")) syncOutputs();
  });
  syncModes();
  syncOutputs();
  return { node: target, mapping };
}

function translateTree(root, locale) {
  const walker = root.ownerDocument.createTreeWalker(root, root.ownerDocument.defaultView.NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const raw = node.nodeValue || "";
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const translated = uiText(trimmed, locale);
    if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
  }
  for (const element of root.querySelectorAll("[aria-label],[placeholder],[title]")) {
    for (const attr of ["aria-label", "placeholder", "title"]) {
      const raw = element.getAttribute(attr);
      if (raw) element.setAttribute(attr, uiText(raw, locale));
    }
  }
}

function readEditorSettings(editor, controls) {
  const settings = {};
  for (const key of WORLD_STYLE_LIBRARY_SETTING_FIELDS) {
    if (TAG_FIELDS.includes(key)) {
      const textarea = editor.querySelector("[data-field='" + key + "']");
      const tags = parseTagTextarea(textarea?.value);
      if (!tags) return { ok: false, error: "invalid_settings" };
      settings[key] = tags;
    } else if (controls.has(key)) {
      const control = controls.get(key);
      if (control.type === "checkbox") settings[key] = control.checked === true;
      else if (control.type === "number" || control.type === "range") settings[key] = Number(control.value);
      else settings[key] = control.value;
    } else if (["scale", "customWorldStyle", "prompt", "storyPreferences"].includes(key)) {
      const control = editor.querySelector("[data-field='" + key + "']");
      if (!control) return { ok: false, error: "invalid_settings" };
      settings[key] = control.value;
    } else return { ok: false, error: "invalid_settings" };
  }
  const seen = new Set();
  for (const field of TAG_FIELDS) {
    for (const tag of settings[field]) {
      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) return { ok: false, error: "conflicting_tags" };
      seen.add(key);
    }
  }
  return { ok: true, settings };
}

function makeField(doc, labelText, control, key, help = "") {
  const label = make("label", "wsl-field", undefined, doc);
  const title = make("span", "wsl-field-label", labelText, doc);
  if (control.id) title.htmlFor = control.id;
  label.append(title, control);
  if (help) label.append(make("small", "wsl-field-help", help, doc));
  if (key) control.dataset.field = key;
  return label;
}

function textControl(doc, tag, id, maxLength, value, rows = 4) {
  const control = make(tag, "wsl-input", undefined, doc);
  control.id = id;
  control.maxLength = maxLength;
  if (tag === "textarea") control.rows = rows;
  control.value = value || "";
  return control;
}

function snapshotFromEditor(editor, controlMap) {
  const result = readEditorSettings(editor, controlMap);
  if (!result.ok) return result;
  const name = editor.querySelector("[data-field='name']")?.value.trim() || "";
  const art = editor.querySelector("input[name='wslArtChoice']:checked")?.value || "";
  return { ...result, name, art };
}

function featureSection(doc, label, text) {
  const section = make("div", "wsl-feature");
  section.append(make("h4", "", label), make("p", "", text));
  return section;
}

function createBlueprintRows(doc, blueprint, locale, settings = null) {
  const rows = make("div", "wsl-blueprint-bars", undefined, doc);
  for (const [key, value] of Object.entries(blueprint || {})) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) continue;
    const row = make("div", "wsl-blueprint-row", undefined, doc);
    const label = make("span", "wsl-blueprint-label", BLUEPRINT_LABELS[locale][key] || key, doc);
    const bar = make("span", "wsl-blueprint-track", undefined, doc);
    const fill = make("span", "wsl-blueprint-fill", undefined, doc);
    const field = BLUEPRINT_SETTING_FIELDS[key];
    const spec = field ? WORLD_STYLE_LIBRARY_ADVANCED_FIELDS[field] : null;
    const locked = Boolean(settings && spec?.mode && settings[field + "Locked"] === true);
    const mode = settings && spec?.mode ? settings[field + "Mode"] : "fixed";
    const variable = Boolean(settings && spec?.mode && !locked && mode !== "fixed");
    const max = key === "unknownRatio" ? 100 : 10;
    const percent = variable ? 0 : Math.max(0, Math.min(100, numeric / max * 100));
    fill.style.width = percent + "%";
    if (variable) {
      row.dataset.variable = "true";
      bar.setAttribute("aria-hidden", "true");
    } else {
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-label", label.textContent);
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", String(max));
      bar.setAttribute("aria-valuenow", String(numeric));
    }
    const modeLabels = MODE_LABELS[locale] || MODE_LABELS["zh-Hant"];
    const valueText = key === "unknownRatio" ? numeric + "%" : numeric + "/10";
    const shown = variable ? modeLabels[mode] : valueText + (locked ? " · " + modeLabels.lock : "");
    row.append(label, bar, make("strong", "wsl-blueprint-value", shown, doc));
    bar.append(fill);
    rows.append(row);
  }
  return rows;
}

export function initWorldStyleLibrary({ onApply } = {}) {
  if (typeof document === "undefined" || typeof onApply !== "function") return null;
  const genre = document.getElementById("genre");
  const creator = document.getElementById("creator") || genre?.closest("form") || genre?.closest(".creator-console");
  if (!genre || !creator) return null;
  const previous = document.getElementById("worldStyleLibraryDialog");
  if (previous) previous.remove();

  const label = genre.closest("label");
  if (!label) return null;
  const doc = label.ownerDocument;
  label.classList.add("wsl-genre-launch-label");
  const openButton = button(localeText("open"), "open", "wsl-trigger", doc);
  openButton.setAttribute("aria-haspopup", "dialog");
  openButton.setAttribute("aria-controls", "worldStyleLibraryDialog");
  const row = make("div", "wsl-genre-row", undefined, doc);
  genre.parentNode.insertBefore(row, genre);
  row.append(genre, openButton);

  const dialog = make("dialog", "wsl-dialog", undefined, doc);
  dialog.id = "worldStyleLibraryDialog";
  dialog.setAttribute("aria-labelledby", "wslDialogTitle");
  dialog.setAttribute("aria-describedby", "wslDialogSubtitle");
  const shell = make("div", "wsl-shell", undefined, doc);
  const header = make("header", "wsl-header", undefined, doc);
  const headingGroup = make("div", "wsl-header-copy", undefined, doc);
  const heading = make("h1", "", localeText("title"), doc);
  heading.id = "wslDialogTitle";
  const subtitle = make("p", "", localeText("subtitle"), doc);
  subtitle.id = "wslDialogSubtitle";
  headingGroup.append(heading, subtitle);
  const headerActions = make("div", "wsl-header-actions", undefined, doc);
  const newButton = button(localeText("create"), "new", "wsl-button wsl-button-primary", doc);
  const closeButton = button("×", "close", "wsl-button wsl-close", doc);
  closeButton.setAttribute("aria-label", localeText("close"));
  headerActions.append(newButton, closeButton);
  header.append(headingGroup, headerActions);
  const status = make("p", "wsl-status", "", doc);
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const gallery = make("main", "wsl-gallery-view", undefined, doc);
  const editorView = make("main", "wsl-editor-view", undefined, doc);
  editorView.hidden = true;
  shell.append(header, status, gallery, editorView);
  dialog.append(shell);
  doc.body.append(dialog);

  const state = { query: "", selection: null, library: [], editor: null, pendingDelete: null, returnFocus: openButton };

  const setStatus = (text, error = false) => {
    status.textContent = text || "";
    status.classList.toggle("is-error", error);
    status.classList.toggle("is-success", Boolean(text) && !error);
  };

  const reloadLibrary = () => {
    const result = loadWorldStyleLibrary();
    state.library = result.ok ? result.styles : [];
    if (!result.ok) setStatus(storeErrorMessage(result.error, loadLocale()), true);
    return result;
  };

  const setView = (view) => {
    const isEditor = view === "editor";
    gallery.hidden = isEditor;
    editorView.hidden = !isEditor;
    newButton.hidden = isEditor;
    if (isEditor) editorView.querySelector("[data-field='name']")?.focus();
    else gallery.querySelector("input[type='search']")?.focus();
  };

  const renderCard = (name, art, description, selected, kind, docRef) => {
    const card = make("button", "wsl-card", undefined, docRef);
    card.type = "button";
    card.dataset.action = "select";
    card.dataset.kind = kind;
    card.dataset.selection = name;
    card.setAttribute("aria-pressed", selected ? "true" : "false");
    const image = make("img", "wsl-card-image", undefined, docRef);
    image.src = worldStyleArtUrl(art);
    image.alt = "";
    image.loading = "lazy";
    const info = make("span", "wsl-card-info", undefined, docRef);
    const title = kind === "custom" ? getTemplateStyleLabel(name, normalizeLocale(loadLocale())) : name;
    info.append(make("strong", "wsl-card-title", title), make("span", "wsl-card-description", description || localeText("emptyDescription")));
    card.append(image, info);
    return card;
  };

  const showConfirm = (style) => {
    state.pendingDelete = style;
    renderGallery();
    const cancel = dialog.querySelector("[data-action='cancel-delete']");
    cancel?.focus();
  };

  const renderDetail = (docRef) => {
    const detail = make("aside", "wsl-detail", undefined, docRef);
    const selected = state.selection;
    if (!selected) {
      detail.append(make("h2", "", localeText("select")));
      return detail;
    }
    if (selected.kind === "builtin") {
      const preset = WORLD_STYLE_PRESETS[selected.name];
      if (!preset) return detail;
      const copy = styleCopy(selected.name, loadLocale());
      const art = allowedArtForGenre(selected.name);
      const image = make("img", "wsl-detail-image", undefined, docRef);
      image.src = worldStyleArtUrl(art);
      image.alt = "";
      image.loading = "lazy";
      detail.append(image);
      const titleLine = make("div", "wsl-detail-title-row", undefined, docRef);
      titleLine.append(make("h2", "", copy.title));
      titleLine.append(make("span", "wsl-detail-type", localeText("defaultTendency")));
      detail.append(titleLine, make("p", "wsl-detail-description", copy.description));
      const featureHeading = make("h3", "wsl-section-heading", localeText("builtInDetails"), docRef);
      detail.append(featureHeading);
      const traits = make("div", "wsl-traits", undefined, docRef);
      for (const trait of copy.traits) traits.append(make("span", "wsl-trait", trait));
      detail.append(traits);
      const features = make("div", "wsl-features", undefined, docRef);
      for (const feature of copy.features) features.append(featureSection(docRef, feature.label, feature.text));
      detail.append(features);
      detail.append(make("h3", "wsl-section-heading", localeText("blueprint"), docRef));
      detail.append(createBlueprintRows(docRef, preset.blueprint, normalizeLocale(loadLocale())));
      detail.append(make("p", "wsl-note", localeText("blueprintNote"), docRef));
      const actions = make("div", "wsl-detail-actions", undefined, docRef);
      actions.append(button(localeText("useBuiltin"), "apply-builtin", "wsl-button wsl-button-primary", docRef));
      detail.append(actions, make("p", "wsl-apply-hint", localeText("applyHint"), docRef));
      return detail;
    }

    const style = state.library.find((entry) => entry.id === selected.id);
    if (!style) {
      detail.append(make("h2", "", localeText("select")));
      return detail;
    }
    const image = make("img", "wsl-detail-image", undefined, docRef);
    image.src = worldStyleArtUrl(style.art);
    image.alt = "";
    image.loading = "lazy";
    detail.append(image);
    const titleLine = make("div", "wsl-detail-title-row", undefined, docRef);
    titleLine.append(make("h2", "", getTemplateStyleLabel(style.name, normalizeLocale(loadLocale()))), make("span", "wsl-detail-type", localeText("saved")));
    detail.append(titleLine, make("p", "wsl-detail-description", style.settings.customWorldStyle || localeText("emptyDescription")));
    detail.append(make("h3", "wsl-section-heading", localeText("builtInDetails"), docRef));
    const traits = make("div", "wsl-traits", undefined, docRef);
    for (const trait of [localeText("scale") + " · " + localizeCanonical(style.settings.scale, loadLocale()), ...style.settings.requiredElements.slice(0, 3)]) traits.append(make("span", "wsl-trait", trait));
    detail.append(traits, make("h3", "wsl-section-heading", localeText("blueprint"), docRef));
    const blueprint = Object.fromEntries(Object.entries(BLUEPRINT_SETTING_FIELDS).map(([key, field]) => [key, style.settings[field]]));
    detail.append(createBlueprintRows(docRef, blueprint, normalizeLocale(loadLocale()), style.settings));
    detail.append(make("p", "wsl-note", localeText("blueprintNote"), docRef));
    const actions = make("div", "wsl-detail-actions", undefined, docRef);
    actions.append(button(localeText("useCustom"), "apply-custom", "wsl-button wsl-button-primary", docRef));
    actions.append(button(localeText("edit"), "edit", "wsl-button", docRef));
    actions.append(button(localeText("remove"), "delete", "wsl-button wsl-button-danger", docRef));
    detail.append(actions);
    if (state.pendingDelete?.id === style.id) {
      const confirm = make("section", "wsl-confirm", undefined, docRef);
      confirm.setAttribute("role", "alertdialog");
      confirm.setAttribute("aria-labelledby", "wslDeleteTitle");
      confirm.setAttribute("aria-describedby", "wslDeleteBody");
      const confirmTitle = make("h3", "", localeText("confirmDeleteTitle"), docRef);
      confirmTitle.id = "wslDeleteTitle";
      const confirmBody = make("p", "", localeText("confirmDeleteBody"), docRef);
      confirmBody.id = "wslDeleteBody";
      confirm.append(confirmTitle, confirmBody, button(localeText("confirmDelete"), "confirm-delete", "wsl-button wsl-button-danger", docRef), button(localeText("keep"), "cancel-delete", "wsl-button", docRef));
      detail.append(confirm);
    }
    return detail;
  };

  function renderGallery() {
    const locale = normalizeLocale(loadLocale());
    const copy = UI[locale] || UI["zh-Hant"];
    heading.textContent = copy.title;
    subtitle.textContent = copy.subtitle;
    openButton.textContent = copy.open;
    newButton.textContent = copy.create;
    closeButton.setAttribute("aria-label", copy.close);
    const root = make("div", "wsl-content", undefined, doc);
    const browse = make("section", "wsl-browse", undefined, doc);
    const toolbar = make("div", "wsl-toolbar", undefined, doc);
    const search = make("input", "wsl-search", undefined, doc);
    search.type = "search";
    search.setAttribute("aria-label", copy.search);
    search.placeholder = copy.searchPlaceholder;
    search.value = state.query;
    const refreshSearch = () => { state.query = search.value; renderGallery(); const nextSearch = gallery.querySelector("input[type='search']"); nextSearch?.focus(); nextSearch?.setSelectionRange?.(state.query.length, state.query.length); };
    search.addEventListener("input", (event) => { if (event.isComposing) return; refreshSearch(); });
    search.addEventListener("compositionend", refreshSearch);
    toolbar.append(make("h2", "wsl-section-heading", copy.builtins, doc), search);
    browse.append(toolbar);
    const builtinGrid = make("div", "wsl-card-grid", undefined, doc);
    const query = state.query.trim().toLocaleLowerCase();
    let shown = 0;
    for (const name of BUILTIN_WORLD_STYLE_NAMES) {
      const style = WORLD_STYLE_PRESETS[name];
      const localized = styleCopy(name, locale);
      if (query && !(localized.title + " " + localized.description + " " + name).toLocaleLowerCase().includes(query)) continue;
      const selected = state.selection?.kind === "builtin" && state.selection.name === name;
      builtinGrid.append(renderCard(localized.title, allowedArtForGenre(name), localized.description, selected, "builtin", doc));
      const card = builtinGrid.lastElementChild;
      card.dataset.selection = name;
      shown++;
    }
    if (!shown) builtinGrid.append(make("p", "wsl-empty", copy.emptySearch, doc));
    browse.append(builtinGrid);

    const savedHead = make("div", "wsl-toolbar wsl-saved-head", undefined, doc);
    savedHead.append(make("h2", "wsl-section-heading", copy.saved, doc));
    const savedGrid = make("div", "wsl-card-grid wsl-saved-grid", undefined, doc);
    if (!state.library.length) savedGrid.append(make("p", "wsl-empty", copy.noSaved, doc));
    else {
      for (const style of state.library) {
        if (query && !(style.name + " " + style.settings.customWorldStyle + " " + style.settings.prompt).toLocaleLowerCase().includes(query)) continue;
        savedGrid.append(renderCard(style.name, style.art, style.settings.customWorldStyle || style.settings.prompt, state.selection?.kind === "custom" && state.selection.id === style.id, "custom", doc));
        savedGrid.lastElementChild.dataset.selection = style.id;
      }
    }
    browse.append(savedHead, savedGrid);
    const detail = renderDetail(doc);
    root.append(browse, detail);
    gallery.replaceChildren(root);
  }

  function openEditor(existing = null) {
    const locale = normalizeLocale(loadLocale());
    const copy = UI[locale] || UI["zh-Hant"];
    const creatorSnapshot = creatorTextSettings();
    if (!creatorSnapshot) {
      setStatus(localeText("genericError", locale), true);
      return;
    }
    const templateName = existing?.name || creator.dataset.styleTemplateName || "";
    const initial = copySettings(existing?.settings || creatorSnapshot);
    const artValue = existing?.art || creator.dataset.styleTemplateArt || allowedArtForGenre(genre.value);
    state.editor = existing ? { id: existing.id } : { id: null };
    const form = make("form", "wsl-editor-form", undefined, doc);
    form.noValidate = false;
    const intro = make("p", "wsl-editor-intro", localeText("editorIntro", locale), doc);
    const top = make("div", "wsl-editor-top", undefined, doc);
    const title = make("h2", "", localeText(existing ? "editorEdit" : "editorNew", locale), doc);
    const back = button(localeText("back", locale), "back", "wsl-button", doc);
    top.append(title, back);
    const nameInput = textControl(doc, "input", "wslTemplateName", 60, templateName);
    nameInput.type = "text";
    nameInput.required = true;
    nameInput.autocomplete = "off";
    nameInput.dataset.field = "name";
    const nameField = make("label", "wsl-field", undefined, doc);
    const nameLabel = make("span", "wsl-field-label", localeText("name", locale), doc);
    nameLabel.htmlFor = nameInput.id;
    nameField.append(nameLabel, nameInput);
    const artField = make("fieldset", "wsl-art-field", undefined, doc);
    const artLegend = make("legend", "wsl-field-label", localeText("art", locale), doc);
    artField.append(artLegend);
    const artGrid = make("div", "wsl-art-grid", undefined, doc);
    WORLD_STYLE_LIBRARY_ARTS.forEach((art, index) => {
      const item = make("label", "wsl-art-choice", undefined, doc);
      const radio = make("input", "", undefined, doc);
      radio.type = "radio";
      radio.name = "wslArtChoice";
      radio.value = art;
      radio.checked = art === artValue;
      if (index === 0) radio.required = true;
      const image = make("img", "", undefined, doc);
      image.src = worldStyleArtUrl(art);
      image.alt = "";
      image.loading = "lazy";
      item.append(radio, image, make("span", "", copy.artNames[index], doc));
      artGrid.append(item);
    });
    artField.append(artGrid);

    const description = textControl(doc, "textarea", "wslTemplateDescription", 600, initial.customWorldStyle, 4);
    const descriptionField = makeField(doc, localeText("description", locale), description, "customWorldStyle");
    const prompt = textControl(doc, "textarea", "wslTemplatePrompt", 1200, initial.prompt, 4);
    const promptField = makeField(doc, localeText("prompt", locale), prompt, "prompt");
    const story = textControl(doc, "textarea", "wslTemplateStory", 900, initial.storyPreferences, 4);
    const storyField = makeField(doc, localeText("story", locale), story, "storyPreferences");
    const scale = make("select", "wsl-input", undefined, doc);
    scale.id = "wslTemplateScale";
    for (const value of ["小型", "中型", "大型"]) {
      const option = make("option", "", localizeCanonical(value, locale), doc);
      option.value = value;
      option.selected = value === initial.scale;
      scale.append(option);
    }
    const scaleField = makeField(doc, localeText("scale", locale), scale, "scale");

    const tagsHeading = make("h3", "wsl-section-heading", localeText("tags", locale), doc);
    const tagsHelp = make("p", "wsl-note", localeText("tagHelp", locale), doc);
    const tagGroup = make("div", "wsl-tag-grid", undefined, doc);
    for (const [key, titleText] of [["requiredElements", localeText("required", locale)], ["allowedElements", localeText("allowed", locale)], ["forbiddenElements", localeText("forbidden", locale)]]) {
      const textarea = textControl(doc, "textarea", "wslTag_" + key, 1400, (initial[key] || []).join("\n"), 5);
      textarea.dataset.field = key;
      textarea.setAttribute("aria-label", titleText);
      textarea.placeholder = locale === "en" ? "One tag per line" : locale === "ja" ? "1行に1項目" : locale === "zh-Hans" ? "每行一项" : "每行一項";
      tagGroup.append(makeField(doc, titleText, textarea, key));
    }

    const advancedDetails = make("details", "wsl-advanced-details", undefined, doc);
    const advancedSummary = make("summary", "", localeText("advanced", locale), doc);
    const advanced = cloneAdvancedControls(doc, locale, initial);
    if (!advanced) {
      setStatus(localeText("genericError", locale), true);
      return;
    }
    advancedDetails.append(advancedSummary, advanced.node);
    const editorStatus = make("p", "wsl-editor-status", "", doc);
    editorStatus.setAttribute("role", "alert");
    const actions = make("div", "wsl-editor-actions", undefined, doc);
    const cancel = button(localeText("cancel", locale), "back", "wsl-button", doc);
    const save = make("button", "wsl-button wsl-button-primary", localeText("save", locale), doc);
    save.type = "submit";
    actions.append(cancel, save);
    form.append(top, intro, nameField, artField, descriptionField, promptField, storyField, scaleField, tagsHeading, tagsHelp, tagGroup, advancedDetails, editorStatus, actions);
    editorView.replaceChildren(form);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!nameInput.value.trim()) {
        editorStatus.textContent = localeText("invalidName", locale);
        nameInput.focus();
        return;
      }
      const data = snapshotFromEditor(form, advanced.mapping);
      if (!data.ok) {
        editorStatus.textContent = storeErrorMessage(data.error || "invalid_settings", locale);
        return;
      }
      if (!data.art) {
        editorStatus.textContent = storeErrorMessage("invalid_settings", locale);
        return;
      }
      editorStatus.textContent = localeText("saving", locale);
      const result = saveWorldStyle({ id: state.editor?.id || undefined, name: data.name, art: data.art, settings: data.settings });
      if (!result.ok) {
        editorStatus.textContent = storeErrorMessage(result.error, locale);
        return;
      }
      state.library = result.styles;
      state.selection = { kind: "custom", id: result.style.id };
      state.editor = null;
      setStatus(localeText("savedOk", locale));
      renderGallery();
      setView("gallery");
      dialog.querySelector("[data-action='edit']")?.focus();
    });
    editorView.hidden = false;
    gallery.hidden = true;
    newButton.hidden = true;
    nameInput.focus();
  }

  const applySelected = () => {
    const selected = state.selection;
    if (!selected) return;
    if (selected.kind === "builtin") {
      onApply({ kind: "builtin", genre: selected.name });
      setStatus(localeText("builtinApplied", loadLocale()));
      dialog.close();
      return;
    }
    const style = state.library.find((entry) => entry.id === selected.id);
    if (!style) {
      setStatus(localeText("notFound", loadLocale()), true);
      reloadLibrary();
      renderGallery();
      return;
    }
    onApply({ kind: "custom", id: style.id, name: style.name, art: style.art, settings: copySettings(style.settings) });
    setStatus(localeText("applied", loadLocale()));
    dialog.close();
  };

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "close") dialog.close();
    else if (action === "new") openEditor();
    else if (action === "back") { state.editor = null; setStatus(""); renderGallery(); setView("gallery"); }
    else if (action === "select") {
      state.selection = target.dataset.kind === "builtin" ? { kind: "builtin", name: target.dataset.selection } : { kind: "custom", id: target.dataset.selection };
      state.pendingDelete = null;
      setStatus("");
      renderGallery();
      gallery.querySelector(".wsl-detail-actions [data-action='apply-builtin'],.wsl-detail-actions [data-action='apply-custom']")?.focus();
    } else if (action === "apply-builtin" || action === "apply-custom") {
      try { applySelected(); } catch { setStatus(localeText("genericError", loadLocale()), true); }
    } else if (action === "edit") {
      const style = state.library.find((entry) => entry.id === state.selection?.id);
      if (style) openEditor(style);
    } else if (action === "delete") {
      const style = state.library.find((entry) => entry.id === state.selection?.id);
      if (style) showConfirm(style);
    } else if (action === "cancel-delete") {
      state.pendingDelete = null;
      renderGallery();
      gallery.querySelector("[data-action='delete']")?.focus();
    } else if (action === "confirm-delete") {
      const result = deleteWorldStyle(state.pendingDelete?.id);
      state.pendingDelete = null;
      if (!result.ok) {
        setStatus(storeErrorMessage(result.error, loadLocale()), true);
        reloadLibrary();
      } else {
        state.library = result.styles;
        state.selection = { kind: "builtin", name: BUILTIN_WORLD_STYLE_NAMES[0] };
        setStatus(localeText("deleted", loadLocale()));
      }
      renderGallery();
      gallery.querySelector("input[type='search']")?.focus();
    }
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll(FOCUSABLE)].filter((item) => !item.hidden && item.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (doc.activeElement === first || !dialog.contains(doc.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  dialog.addEventListener("close", () => {
    state.pendingDelete = null;
    state.editor = null;
    if (state.returnFocus?.isConnected) state.returnFocus.focus();
  });
  openButton.addEventListener("click", () => {
    state.returnFocus = openButton;
    state.query = "";
    reloadLibrary();
    const templateId = creator.dataset.styleTemplateId;
    const appliedTemplate = templateId && state.library.some((style) => style.id === templateId);
    const selectedBuiltin = genre.value !== WORLD_STYLE_CUSTOM_CANONICAL_NAME && BUILTIN_WORLD_STYLE_NAMES.includes(genre.value);
    state.selection = appliedTemplate
      ? { kind: "custom", id: templateId }
      : { kind: "builtin", name: selectedBuiltin ? genre.value : BUILTIN_WORLD_STYLE_NAMES[0] };
    if (!dialog.open) dialog.showModal();
    renderGallery();
    setView("gallery");
  });
  const languageSelect = doc.getElementById("languageSelect");
  languageSelect?.addEventListener("change", () => {
    const locale = normalizeLocale(loadLocale());
    openButton.textContent = localeText("open", locale);
    if (dialog.open && gallery.hidden) return;
    if (dialog.open) renderGallery();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "elyndra.world-style-library.v1" && dialog.open) {
      reloadLibrary();
      renderGallery();
    }
  });

  return {
    dialog,
    open: () => openButton.click(),
    destroy: () => { dialog.remove(); openButton.remove(); row.replaceWith(genre); label.classList.remove("wsl-genre-launch-label"); }
  };
}
