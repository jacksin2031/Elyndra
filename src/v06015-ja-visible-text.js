const EXACT_JA=new Map([
 ["保留現代地球的一般生活、衛生與基礎科學常識。","現代地球の一般的な生活・衛生・基礎科学の常識を保持しています。"],
 ["現代常識不等於異世界 Canon。","現代の常識は異世界のCanonと同一ではありません。"],
 ["尚未形成固定路線；第一次選擇天賦會確立主要成長方向。","まだ固定された成長ルートはありません。最初の才能選択で主な成長方向が定まります。"],
 ["目前沒有具判定加成的装備","判定に補正を与える装備は現在ありません。"],
 ["人物關係","人物関係"],
 ["你還沒有指定自己的長期牽掛。世界會繼續運作，但不會自動替你決定人生主線。","まだ長期目標を指定していません。世界は進み続けますが、あなたの人生の主軸を自動で決めることはありません。"],
 ["WORLD CAMPAIGN SCAFFOLD · 世界會自行推進","WORLD CAMPAIGN SCAFFOLD · 世界は自律的に進行します"],
 ["理解自己身處何地，先確保能夠行動。這不是你的強制主線；你可以介入、忽略、延後或以其他目標生活。","自分がどこにいるかを理解し、まず行動できる状態を確保します。これは強制的なメインストーリーではありません。介入せずに進む、後回しにする、別の目標で生きることもできます。"],
 ["AI 正在解析 Action Intent 並判斷必要前提…","AIが行動意図と必要条件を解析しています…"],
 ["AI 正在處理你的行動…","AIがあなたの行動を処理しています…"],
 ["STATE SYNC：完成後即可繼續行動","STATE SYNC：完了後に次の行動へ進めます"],
 ["找出能推進目前目標的具體證據","現在の目標を進められる具体的な証拠を探す"],
 ["Player Action AI 正在背景生成玩家可見結果","Player Action AI：プレイヤー向け結果をバックグラウンド生成中"],
 ["正在處理已選行動…","選択した行動を処理中…"],
 ["AI World Compiler 正在分段建立世界…","AI World Compiler が世界を段階的に構築しています…"],
 ["旅途助手正在整理你已知的情報…","旅の助手が既知の情報を整理しています…"],
 ["AI 場景敘述未完成；已保留 Engine 的可見結果並重建安全行動。","AIの場面描写が完了しなかったため、Engineで確定した可視結果を保持し、安全な行動候補を再構築しました。"],
 ["AI 行動判定暫時不可用；已切換 Engine 備援並繼續本回合。","AIの行動判定を一時的に利用できないため、Engineのフォールバックに切り替えてこのターンを続行しました。"],
 ["Harbor_District","港湾地区"],
 ["港湾區域","港湾区域"],
 ["冷たい霧狀の細雨","冷たい霧状の細雨"]
]);

const SCENE_FALLBACK_PATTERNS=[
 /日本語表示を準備できなかったため/u,
 /AI 場景敘述未完成/u,
 /場景敘述未完成/u,
 /AIの場面描写が完了しなかったため/u
];

export function localizeV06015JapaneseVisibleText(value){
 const text=String(value??"");if(!text)return text;
 const trimmed=text.trim(),exact=EXACT_JA.get(trimmed);if(exact)return text.replace(trimmed,exact);
 return text
  .replace(/Harbor_District/g,"港湾地区")
  .replace(/港湾區域/g,"港湾区域")
  .replace(/霧狀/g,"霧状")
  .replace(/人物關係/g,"人物関係")
  .replace(/目前沒有具判定加成的装備/g,"判定に補正を与える装備は現在ありません。")
  .replace(/AI 正在解析 Action Intent 並判斷必要前提…/g,"AIが行動意図と必要条件を解析しています…")
  .replace(/AI 正在處理你的行動…/g,"AIがあなたの行動を処理しています…")
  .replace(/STATE SYNC：完成後即可繼續行動/g,"STATE SYNC：完了後に次の行動へ進めます")
  .replace(/正在處理已選行動…/g,"選択した行動を処理中…")
  .replace(/AI World Compiler 正在分段建立世界…/g,"AI World Compiler が世界を段階的に構築しています…")
  .replace(/旅途助手正在整理你已知的情報…/g,"旅の助手が既知の情報を整理しています…")
  .replace(/([^\n]{1,80}) 正在對你展示的物品作出反應…/g,"$1が提示されたアイテムに反応しています…")
  .replace(/找出能推進目前目標的具體證據/g,"現在の目標を進められる具体的な証拠を探す");
}

export function isV06015JapaneseSceneFallback(value){
 const text=String(value??"").trim();return Boolean(text&&SCENE_FALLBACK_PATTERNS.some(re=>re.test(text)))
}

export function v06015JapaneseFallbackNarrative(){
 return "Engineで確定した判定結果を保持しています。現在の状態を基準に、次の行動を選べます。"
}
