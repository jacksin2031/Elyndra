import * as base from "./v06019-ai-client-hotfix.js?v=60019&base=1";
export * from "./v06019-ai-client-hotfix.js?v=60019&base=1";
import {helperSnapshot} from "./helper-context.js?v=57029";
import {directChat,hasDirectAI} from "./ai-settings.js?v=60010";
import {hasLocaleLeak} from "./locale-runtime.js?v=60010";
const WEATHER_QUERY=/(?:天気|天候|空模様|気象|現在.*天|天氣|天气|weather)/iu;
const LOCATION_QUERY=/(?:現在地|ここはどこ|どこにいる|場所|所在|現在.*(?:哪|どこ)|where\s+am\s+i)/iu;
const japanese=()=>String(globalThis.ELYNDRA_LOCALE||"")==="ja";
const clean=(v,max=700)=>String(v??"").normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").replace(/\uFFFD/g,"").trim().slice(0,max);
export function v06024JapaneseHelperGroundedAnswer(question,snapshot){const q=String(question||""),world=snapshot?.world||{};if(WEATHER_QUERY.test(q)){const weather=world.weather||{},name=clean(weather.observableName,180),cue=clean(weather.sensoryCue,260);if(!name||name==="天候の詳細は未確認")return "現時点では、確認できる天候情報が不足しています。";return cue?`現在確認できる天候は「${name}」です。観測できる兆候は「${cue}」です。`:`現在確認できる天候は「${name}」です。`}if(LOCATION_QUERY.test(q)){const loc=world.currentLocation||{},name=clean(loc.name,180),description=clean(loc.description,320);if(!name)return "現時点では、現在地を特定できる情報が不足しています。";return description?`現在地は「${name}」です。確認できている範囲では、${description}`:`現在地は「${name}」です。`}return ""}
export async function askTravelHelper(state,question){if(!japanese())return base.askTravelHelper(state,question);const q=clean(question,300),snapshot=helperSnapshot(state),grounded=v06024JapaneseHelperGroundedAnswer(q,snapshot);if(grounded)return grounded;if(!hasDirectAI())return base.askTravelHelper(state,q);const system=`あなたは Elyndra の旅の助手です。必ず日本語だけで答えてください。与えられた snapshot に含まれるプレイヤー既知情報だけを使い、隠し Canon や未確認情報を推測しないでください。天候について聞かれた場合は world.weather だけを根拠にし、world.currentLocation.description を天候として扱ってはいけません。現在地について聞かれた場合は world.currentLocation を使ってください。ゲーム状態、時間、HP、所持品、クエスト、NPC関係、Canon を変更してはいけません。2〜6文で簡潔に答えてください。`;const out=await directChat({aiTask:"helper",system,user:JSON.stringify({question:q,snapshot}),temperature:.2,maxOutputTokens:700,timeoutMs:9000,retryOnTimeout:false}),answer=clean(out,1200);return answer&&!hasLocaleLeak(answer,"ja")?answer:"現時点では確認できる情報が不足しています。"}
export const __v06024={WEATHER_QUERY,LOCATION_QUERY};
