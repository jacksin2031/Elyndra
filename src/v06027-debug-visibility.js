const JA=Object.freeze({internalWorld:"内部Canon世界",playerView:"プレイヤー表示",world:"世界",location:"現在地",baselineInternal:"baseline（内部状態）",unknownWorld:"未知の世界",unknownLocation:"未知の場所"});
const ZH=Object.freeze({internalWorld:"內部 Canon 世界",playerView:"玩家可見",world:"世界",location:"目前位置",baselineInternal:"baseline（內部狀態）",unknownWorld:"未知世界",unknownLocation:"未知地點"});
const EN=Object.freeze({internalWorld:"Internal canon world",playerView:"Player view",world:"World",location:"Location",baselineInternal:"baseline (internal state)",unknownWorld:"Unknown world",unknownLocation:"Unknown location"});
export function v06027DebugBoundaryLabels(locale="zh-Hant"){return locale==="ja"?JA:locale==="en"?EN:ZH}
export function v06027DebugPlayerView({locale="zh-Hant",world="",location=""}={}){const t=v06027DebugBoundaryLabels(locale);return {heading:t.playerView,worldLabel:t.world,locationLabel:t.location,world:String(world||t.unknownWorld),location:String(location||t.unknownLocation)}}
