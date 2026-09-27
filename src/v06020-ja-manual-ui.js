import {localizeV06015JapaneseVisibleText} from "./v06015-ja-visible-text.js?v=60018";
import {hasLocaleLeak} from "./locale-runtime.js?v=60010";

const EXACT=new Map([
 ["WORLD CAMPAIGN SCAFFOLD · 世界は自律的に進行します","世界キャンペーン進行枠 · 世界は自律的に進行します"],
 ["WORLD CAMPAIGN SCAFFOLD · 世界會自行推進","世界キャンペーン進行枠 · 世界は自律的に進行します"],
 ["既知の地點","既知の地点"],
 ["霧鎖荷台、路途受阻","霧に閉ざされた荷台、道は塞がれている"],
 ["遊玩診斷","プレイ診断"],
 ["最近遊戲事件","最近のゲームイベント"],
 ["重新整理","再読み込み"],
 ["清除 Debug 紀錄","Debug 記録を消去"],
 ["匯出 Debug JSON","Debug JSON を書き出す"],
 ["匯出摘要 TXT","要約 TXT を書き出す"],
 ["尚未有事件","イベントはまだありません"],
 ["尚未有 AI request telemetry","AI リクエストのテレメトリはまだありません"],
 ["尚未有 gameplay state telemetry","ゲーム状態のテレメトリはまだありません"]
]);
const STRONG_ZH=/(?:這|这|們|们|為|为|與|与|從|从|讓|让|對|对|處|处|觀察|观察|冒險|冒险|危險|危险|繼續|继续|移動到|地點|狀態|當|鎖|路途|受阻|現場環境|製造一個|最明顯|靠近)/u;

export function localizeV06020JapaneseVisibleText(value){
 const raw=String(value??"");if(!raw)return raw;
 const base=localizeV06015JapaneseVisibleText(raw),trimmed=base.trim(),exact=EXACT.get(trimmed);let text=exact?base.replace(trimmed,exact):base;
 return text
  .replaceAll("目の當たり","目の当たり")
  .replaceAll("隠された狀態","隠された状態")
  .replaceAll("既知の地點","既知の地点")
  .replaceAll("地點","地点")
  .replaceAll("狀態","状態")
  .replaceAll("當たり","当たり")
  .replaceAll("WORLD CAMPAIGN SCAFFOLD","世界キャンペーン進行枠")
  .replace(/\bPLAYER ACTION\b/g,"プレイヤー行動")
  .replace(/\bSTATE SYNC\b/g,"状態同期")
  .replace(/\bAI THINKING\b/g,"AI処理中")
}
export function hasV06020JapaneseLeak(value){const text=String(value??"");return Boolean(text&&(STRONG_ZH.test(text)||hasLocaleLeak(text,"ja")))}
export function sanitizeV06020JapaneseSceneTitle(value){const text=localizeV06020JapaneseVisibleText(value).trim();if(!text)return "";return hasV06020JapaneseLeak(text)?"現在の状況":text}
export function v06020JapaneseDebugEventDetail(type,raw=""){
 const key=String(type||""),text=String(raw||"").trim();
 const label={NPC_AUTONOMOUS_ACTION:"NPCの自律行動（内部テレメトリ）",NPC_MOVED:"NPCの移動（内部テレメトリ）",FACTION_ACTION:"勢力の自律行動（内部テレメトリ）",WORLD_EVENT:"世界イベント（内部テレメトリ）"}[key];
 if(!label)return localizeV06020JapaneseVisibleText(text);return !text||hasV06020JapaneseLeak(text)?label:localizeV06020JapaneseVisibleText(text)
}
export function v06020RestNoRollState(narrative="",rollLabel=""){
 const text=String(narrative||"").trim(),label=String(rollLabel||"").trim();
 if(label!=="今回の判定を処理中")return null;
 if(!/(?:\d+分ほど休み、身体を整えました。|として休息しました。)/u.test(text))return null;
 return {d20:"—",label:"D20判定なし",result:"休息はEngineの決定論的処理で解決しました。"}
}
