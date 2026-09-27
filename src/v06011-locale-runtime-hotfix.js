import * as base from "./locale-runtime.js?v=60010&base=1";
export * from "./locale-runtime.js?v=60010&base=1";

const JA_EXACT=new Map([
 ["AI 行動判定暫時不可用；已切換 Engine 備援並繼續本回合。","AIの行動判定を一時的に利用できないため、Engineの代替処理へ切り替えてこのターンを続行しました。"],
 ["AI 世界狀態同步暫時失敗；已保留 Engine 結果並恢復控制。","AIによる世界状態の同期に失敗しました。Engineの確定結果を保持し、操作を再開しました。"],
 ["AI 場景內容與目前地點／人物狀態不一致；已保留 Engine 結果並重新建立當前場景建議。","AIの場面内容が現在地または人物状態と一致しなかったため、Engineの確定結果を保持して現在の場面に合う提案を作り直しました。"],
 ["AI 場景敘述未完成；已保留 Engine 的可見結果並重建安全行動。","AIの場面描写が完了しなかったため、Engineで確定した見える結果を保持し、安全な行動候補を作り直しました。"],
 ["行動可行性判定暫時失敗，因此這次行動沒有執行，也沒有消耗時間。","行動可能性の判定に一時的に失敗したため、この行動は実行されず、時間も経過していません。"],
 ["敵人仍在眼前。請使用攻擊、防禦或撤退來處理這場戰鬥。","敵はまだ目の前にいます。攻撃、防御、撤退のいずれかで戦闘に対応してください。"],
 ["你在失去意識後醒來。傷勢尚未痊癒，但你仍保留已確認的世界知識。","意識を失ったあとに目を覚ましました。傷はまだ治っていませんが、確認済みの世界知識は保持されています。"],
 ["戰鬥局勢發生了變化。","戦況が変化しました。"],
 ["戰鬥結束","戦闘終了"],
 ["未知地點","不明な場所"],
 ["目前位置","現在地"],
 ["目前沒有已知地點。","既知の場所はまだありません。"],
 ["目前沒有已知任務。","既知のクエストはまだありません。"],
 ["背包目前是空的。","持ち物は空です。"],
 ["交易完成。","取引が完了しました。"],
 ["你完成住宿付款並休息。","宿泊代を支払い、休息しました。"],
 ["材料不足，無法完成這項合成。","素材が足りないため、作成できません。"],
 ["這件物品目前沒有可以直接使用的效果。","このアイテムには現在、直接使用できる効果がありません。"],
 ["你目前沒有指定的物品。","指定したアイテムを所持していません。"],
 ["對方目前不在你身邊，無法展示或交付物品。","相手が近くにいないため、アイテムを見せたり渡したりできません。"],
 ["這件物品目前正在裝備，先卸下才可以交出去。","このアイテムは装備中です。渡す前に外してください。"],
 ["目前無法完成這個物品操作。","現在このアイテム操作は実行できません。"],
 ["Engine 無法在背包中確認你指定的物品。","指定したアイテムを持ち物内で確認できません。"],
 ["需要先擁有並明確指定該物品","先にそのアイテムを所持し、明確に指定する必要があります"],
 ["Engine 找不到能支援這種超常移動的已學能力。","この超常的な移動を可能にする習得済み能力を確認できません。"],
 ["需要相應能力、魔法或工具","対応する能力、魔法、または道具が必要です"],
 ["目標 NPC 目前不在可互動位置。","対象NPCは現在、交流できる場所にいません。"],
 ["目標 NPC 必須在場或可透過既有通訊方式聯絡","対象NPCがその場にいるか、既存の通信手段で連絡できる必要があります"],
 ["這個地點目前尚未成為玩家可直接前往的已知目的地。","この場所はまだ直接移動できる既知の目的地ではありません。"],
 ["先發現或取得可到達資訊","先に発見するか、到達方法の情報を得る必要があります"],
 ["前往條件尚未滿足。","移動条件をまだ満たしていません。"],
 ["目前沒有可用的 Canon 路線連接到該地點。","その場所へ接続する利用可能なCanon経路がありません。"],
 ["需要先建立可通行路線","先に通行可能な経路を確立する必要があります"],
 ["Engine 沒有發現硬性阻擋條件；AI 只提供語義理解，最終可嘗試性由 Engine 決定。","Engine上の強制的な阻害条件は確認されませんでした。AIは意味理解のみを補助し、最終的な実行可否はEngineが決定します。"]
]);

const EXTRA_JA_LEAK=/(?:這|这|們|们|為|为|與|与|從|从|讓|让|對|对|說|说|處|处|覺|觉|應|应|還|还|暫|暂|無法|无法|目前|尚未|已經|已经|場景|场景|敘述|叙述|選擇|选择|建議|建议|確認現場|确认现场|有沒有|有没有|新的具體變化|新的具体变化|恢復操作|恢复操作|保留\s*Engine\s*結果|保留\s*Engine\s*结果)/u;
const chineseRatioLeak=text=>{
 const chars=[...String(text||"")],han=chars.filter(ch=>/[\u3400-\u9fff]/u.test(ch)).length,kana=chars.filter(ch=>/[\u3040-\u30ff]/u.test(ch)).length;
 return chars.length>=12&&han>=6&&kana===0&&/[，；：]|(?:你|這|这|目前|已|未|沒有|没有|可以|需要|世界|場景|场景)/u.test(text)
};
function jaLeak(value){const text=String(value??"").trim();return Boolean(text)&&(base.hasLocaleLeak(text,"ja")||EXTRA_JA_LEAK.test(text)||chineseRatioLeak(text))}
const after=(text,prefix)=>String(text||"").startsWith(prefix)?String(text).slice(prefix.length):String(text||"");

function jaDynamic(text){
 let m=text.match(/^你在(.+?)完成了「(.+?)」，結果比預期更順利。$/u);if(m)return `${m[1]}で「${m[2]}」を達成し、予想以上に順調な結果になりました。`;
 m=text.match(/^你在(.+?)完成了「(.+?)」。$/u);if(m)return `${m[1]}で「${m[2]}」を達成しました。`;
 m=text.match(/^你在(.+?)嘗試「(.+?)」時出了明顯差錯，現場局勢變得更不利。$/u);if(m)return `${m[1]}で「${m[2]}」を試みましたが、明確な失敗が起き、状況はさらに不利になりました。`;
 m=text.match(/^你在(.+?)嘗試「(.+?)」，但沒有達到原本的目的；局勢仍在變化，你可以換一種做法。$/u);if(m)return `${m[1]}で「${m[2]}」を試みましたが、目的は達成できませんでした。状況は動いているため、別の方法を試せます。`;
 m=text.match(/^目前狀態：HP ([^；]+)；飽食度 ([^；]+)；疲勞 ([^；]+)；傷勢 ([^。]+)。$/u);if(m)return `現在の状態：HP ${m[1]}；満腹度 ${m[2]}；疲労 ${m[3]}；負傷 ${m[4]}。`;
 m=text.match(/^你休息了 (\d+) 分鐘。/u);if(m)return `${m[1]}分間休息しました。`;
 m=text.match(/^你沿著已知且可安全通行的路線抵達 (.+)。$/u);if(m)return `既知の安全な経路を通って${m[1]}に到着しました。`;
 m=text.match(/^目前沒有可用的 Canon 路線前往 (.+)。$/u);if(m)return `${m[1]}へ向かう利用可能なCanon経路がありません。`;
 m=text.match(/^目前無法前往 (.+)。$/u);if(m)return `現在は${m[1]}へ移動できません。`;
 if(text.startsWith("背包："))return "持ち物："+after(text,"背包：");
 if(text.startsWith("已知地點："))return "既知の場所："+after(text,"已知地點：");
 if(text.startsWith("主線："))return "メイン："+after(text,"主線：").replace(/^目前沒有明確目標$/u,"現在、明確な目標はありません");
 if(text.startsWith("支線："))return "サブ："+after(text,"支線：");
 if(text.startsWith("交易無法完成："))return "取引を完了できません："+after(text,"交易無法完成：");
 if(text.startsWith("你很快察覺到先前的選擇已留下具體痕跡："))return "先ほどの選択が具体的な痕跡を残したことに気づきます："+after(text,"你很快察覺到先前的選擇已留下具體痕跡：");
 if(text.startsWith("從旁人的語氣與反應中，你開始察覺："))return "周囲の人々の口調や反応から、次のことに気づき始めます："+after(text,"從旁人的語氣與反應中，你開始察覺：");
 if(text.startsWith("這個變化已經直接進入你的日常行動範圍："))return "この変化は、すでにあなたの日常の行動範囲へ直接影響しています："+after(text,"這個變化已經直接進入你的日常行動範圍：");
 if(text.startsWith("眼前已出現一項可以直接確認的改變："))return "目の前に直接確認できる変化が現れています："+after(text,"眼前已出現一項可以直接確認的改變：");
 return "日本語表示を準備できなかったため、確定済みのゲーム結果のみ保持しています。"
}
export function safePlayerVisibleText(value,locale=base.loadLocale()){
 const id=base.normalizeLocale(locale),text=String(value??"");if(id!=="ja"||!text)return text;
 const exact=JA_EXACT.get(text);if(exact)return exact;
 return jaLeak(text)?jaDynamic(text):text
}
export function hasLocaleLeak(value,locale=base.loadLocale()){const id=base.normalizeLocale(locale);return id==="ja"?jaLeak(value):base.hasLocaleLeak(value,id)}
export function uiText(key,locale=base.loadLocale()){const id=base.normalizeLocale(locale),source=String(key??"");if(id==="ja"&&JA_EXACT.has(source))return JA_EXACT.get(source);return safePlayerVisibleText(base.uiText(source,id),id)}
export function uiFormat(key,vars={},locale=base.loadLocale()){return safePlayerVisibleText(base.uiFormat(key,vars,locale),locale)}
export function translatedText(state,value,locale=base.loadLocale()){return safePlayerVisibleText(base.translatedText(state,value,locale),locale)}
export function sessionTranslatedText(value,locale=base.loadLocale()){return safePlayerVisibleText(base.sessionTranslatedText(value,locale),locale)}
