export function v06024PendingRollState(action=""){
 const a=String(action||"").trim();
 return {d20:"—",label:"今回の判定を処理中",result:a?`「${a}」の新しい結果を待っています。前回の判定結果は引き継ぎません。`:"新しい結果を待っています。前回の判定結果は引き継ぎません。"}
}
export function v06024UnresolvedRollState(action=""){
 const a=String(action||"").trim();
 return {d20:"—",label:"今回の判定は未確定",result:a?`「${a}」は処理期限内に新しい判定結果が確定しませんでした。前回の結果はこの行動の結果として表示しません。`:"処理期限内に新しい判定結果が確定しませんでした。前回の結果は引き継ぎません。",narrative:a?`「${a}」は処理期限内に新しい結果が確定しませんでした。直前のターンの結果を今回の結果として扱わず、次の行動を選べます。`:"新しい結果が確定しませんでした。直前のターンの結果を今回の結果として扱わず、次の行動を選べます。"}
}
