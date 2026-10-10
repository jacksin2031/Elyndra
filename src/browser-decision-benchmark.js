export const BROWSER_ACTION_BENCHMARK=Object.freeze([
 {action:"查看背包裡有甚麼",expected:"LOCAL",lang:"zh-Hant"},
 {action:"檢查我的角色能力與目前狀態",expected:"LOCAL",lang:"zh-Hant"},
 {action:"打開旅程紀錄看看之前發生過甚麼",expected:"LOCAL",lang:"zh-Hant"},
 {action:"看看我身上有哪些物品",expected:"LOCAL",lang:"zh-Hant"},
 {action:"インベントリを確認する",expected:"LOCAL",lang:"ja"},
 {action:"キャラクターの能力値と状態を見る",expected:"LOCAL",lang:"ja"},
 {action:"旅の記録を読み返す",expected:"LOCAL",lang:"ja"},
 {action:"open my inventory and inspect my items",expected:"LOCAL",lang:"en"},
 {action:"check my character status and abilities",expected:"LOCAL",lang:"en"},
 {action:"read the journey log",expected:"LOCAL",lang:"en"},
 {action:"拔劍攻擊眼前的魔物",expected:"COMBAT",lang:"zh-Hant"},
 {action:"架起盾牌防禦敵人的下一擊",expected:"COMBAT",lang:"zh-Hant"},
 {action:"嘗試從這場戰鬥撤退",expected:"COMBAT",lang:"zh-Hant"},
 {action:"向敵人射箭",expected:"COMBAT",lang:"zh-Hant"},
 {action:"目の前の敵を剣で攻撃する",expected:"COMBAT",lang:"ja"},
 {action:"盾を構えて敵の攻撃を防ぐ",expected:"COMBAT",lang:"ja"},
 {action:"この戦闘から撤退する",expected:"COMBAT",lang:"ja"},
 {action:"attack the enemy with my sword",expected:"COMBAT",lang:"en"},
 {action:"defend against the next enemy attack",expected:"COMBAT",lang:"en"},
 {action:"retreat from this combat",expected:"COMBAT",lang:"en"},
 {action:"觀察周圍並尋找可疑的痕跡",expected:"ADVENTURE",lang:"zh-Hant"},
 {action:"向旅店老闆詢問附近的傳聞",expected:"ADVENTURE",lang:"zh-Hant"},
 {action:"沿著北面的道路前往已知城鎮",expected:"ADVENTURE",lang:"zh-Hant"},
 {action:"調查那座古老石碑上的文字",expected:"ADVENTURE",lang:"zh-Hant"},
 {action:"周囲を探索して手掛かりを探す",expected:"ADVENTURE",lang:"ja"},
 {action:"酒場の主人に最近の噂を聞く",expected:"ADVENTURE",lang:"ja"},
 {action:"北の道を通って町へ向かう",expected:"ADVENTURE",lang:"ja"},
 {action:"古い遺跡を詳しく調べる",expected:"ADVENTURE",lang:"ja"},
 {action:"explore the area and look for clues",expected:"ADVENTURE",lang:"en"},
 {action:"ask the innkeeper about local rumors",expected:"ADVENTURE",lang:"en"},
 {action:"travel along the northern road to town",expected:"ADVENTURE",lang:"en"},
 {action:"investigate the ancient ruins",expected:"ADVENTURE",lang:"en"}
]);
export function summarizeBrowserDecisionBenchmark(result={}){
 const rows=Array.isArray(result?.results)?result.results:[],byLanguage={};
 rows.forEach((row,index)=>{const source=BROWSER_ACTION_BENCHMARK[index],lang=source?.lang||"unknown",bucket=byLanguage[lang]||{cases:0,correct:0};bucket.cases++;if(row?.ok)bucket.correct++;byLanguage[lang]=bucket});
 for(const bucket of Object.values(byLanguage))bucket.accuracy=bucket.cases?bucket.correct/bucket.cases:0;
 return {...result,byLanguage}
}
