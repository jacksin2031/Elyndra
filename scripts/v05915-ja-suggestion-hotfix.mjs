import {readFileSync,writeFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8"),write=(p,s)=>writeFileSync(p,s,"utf8");
function rep(path,from,to,label=String(from).slice(0,100)){
 let s=read(path);if(!s.includes(from))throw new Error(`PATCH_MISS ${path}: ${label}`);s=s.replace(from,to);write(path,s)
}

// Locale-aware contextual suggestion sanitation. Keep deterministic Engine templates
// on their canonical zh-Hant source channel, while validating AI suggestions against
// the actual runtime locale instead of the old zh-Hant-only runtime guard.
rep("src/contextual-actions.js",
'import {sanitizePlayerText} from "./runtime-guard.js?v=57029";\nimport {validateSuggestionProvenance} from "./scene-provenance.js?v=57025";',
'import {sanitizePlayerText,stripSystemLabels} from "./runtime-guard.js?v=57029";\nimport {validateSuggestionProvenance} from "./scene-provenance.js?v=57025";\nimport {hasLocaleLeak} from "./locale-runtime.js?v=59010";');
rep("src/contextual-actions.js",
'const clean=(v,max=180)=>typeof v==="string"?v.normalize("NFC").replace(/[\\u0000-\\u001f\\u007f]/g,"").trim().slice(0,max):"";\nconst list=(v,max=8,maxLen=100)=>Array.isArray(v)?[...new Set(v.map(x=>clean(x,maxLen)).filter(Boolean))].slice(0,max):[];',
`const clean=(v,max=180)=>typeof v==="string"?v.normalize("NFC").replace(/[\\u0000-\\u001f\\u007f]/g,"").trim().slice(0,max):"";\nconst CONTEXTUAL_LOCALES=new Set(["zh-Hant","zh-Hans","en","ja"]);\nfunction contextualLocale(state=null,explicit=""){const raw=String(explicit||state?.localization?.displayLocale||globalThis.ELYNDRA_LOCALE||"zh-Hant");return CONTEXTUAL_LOCALES.has(raw)?raw:"zh-Hant"}\nfunction sanitizeContextualText(value,max=180,{state=null,locale="",source="AI"}={}){\n const sourceKind=String(source||"AI").toUpperCase();\n if(sourceKind==="ENGINE")return sanitizePlayerText(value,max,"");\n const id=contextualLocale(state,locale);if(id==="zh-Hant")return sanitizePlayerText(value,max,"");\n const s=clean(stripSystemLabels(value,max),max);if(!s||hasLocaleLeak(s,id))return "";\n if(id==="ja"){const foreign=(s.match(/[\\uac00-\\ud7af\\u0400-\\u04ff]/gu)||[]).length,kana=(s.match(/[\\u3040-\\u30ff]/gu)||[]).length,han=(s.match(/[\\u3400-\\u9fff]/gu)||[]).length,latin=(s.match(/[A-Za-z]/g)||[]).length;if(foreign)return "";if(s.length>=24&&kana+han<4&&latin>12)return ""}\n else if(id==="zh-Hans"&&/[\\u3040-\\u30ff\\uac00-\\ud7af\\u0400-\\u04ff]/u.test(s))return "";\n else if(id==="en"&&/[\\u3040-\\u30ff\\u3400-\\u9fff\\uac00-\\ud7af\\u0400-\\u04ff]/u.test(s))return "";\n return s\n}\nconst list=(v,max=8,maxLen=100)=>Array.isArray(v)?[...new Set(v.map(x=>clean(x,maxLen)).filter(Boolean))].slice(0,max):[];`);
rep("src/contextual-actions.js",
`export function normalizeContextualSuggestion(row={}){\n if(typeof row==="string")row={label:row,action:row};\n if(!row||typeof row!=="object"||Array.isArray(row))return null;\n const label=sanitizePlayerText(row.label||row.action,120,""),action=sanitizePlayerText(row.action||row.label,180,"");if(!label||!action||PLAYER_META_TEXT.test(label+" "+action)||DECISION_WORDS.test(label+" "+action))return null;`,
`export function normalizeContextualSuggestion(row={},options={}){\n if(typeof row==="string")row={label:row,action:row};\n if(!row||typeof row!=="object"||Array.isArray(row))return null;\n const source=clean(row.source,30)||"AI",textOptions={state:options?.state||null,locale:options?.locale||"",source};\n const label=sanitizeContextualText(row.label||row.action,120,textOptions),action=sanitizeContextualText(row.action||row.label,180,textOptions);if(!label||!action||PLAYER_META_TEXT.test(label+" "+action)||DECISION_WORDS.test(label+" "+action))return null;`);
rep("src/contextual-actions.js",'  skillHint:sanitizePlayerText(row.skillHint,70,"")||null,\n  consequenceHint:sanitizePlayerText(row.consequenceHint,90,"")||null,\n  causalBasis:sanitizePlayerText(row.causalBasis,180,"")||null,','  skillHint:sanitizeContextualText(row.skillHint,70,textOptions)||null,\n  consequenceHint:sanitizeContextualText(row.consequenceHint,90,textOptions)||null,\n  causalBasis:sanitizeContextualText(row.causalBasis,180,textOptions)||null,');
rep("src/contextual-actions.js",'  source:clean(row.source,30)||"AI",','  source,');
rep("src/contextual-actions.js",'function canonicalSuggestion(state,row){\n const x=normalizeContextualSuggestion(row);if(!x)return null;','function canonicalSuggestion(state,row){\n const x=normalizeContextualSuggestion(row,{state,locale:contextualLocale(state)});if(!x)return null;');
rep("src/contextual-actions.js",'export function evaluateSuggestionRequirements(state,row={}){\n const x=normalizeContextualSuggestion(row);if(!x)return {ok:false,reasons:["INVALID_SUGGESTION"]};','export function evaluateSuggestionRequirements(state,row={}){\n const x=normalizeContextualSuggestion(row,{state,locale:contextualLocale(state)});if(!x)return {ok:false,reasons:["INVALID_SUGGESTION"]};');

// Release bump and browser cache entry points.
rep("src/version.js",'APP_VERSION="0.59.14"','APP_VERSION="0.59.15"');
rep("package.json",'"version": "0.59.14"','"version": "0.59.15"');
rep("app.js",'./src/version.js?v=59014','./src/version.js?v=59015');
rep("app.js",'./src/contextual-actions.js?v=57029','./src/contextual-actions.js?v=59015');
rep("index.html",'app.js?v=59014','app.js?v=59015');

// Release assertions.
for(const path of ["test/version-ui.test.js","test/version-0551-release.test.js","test/v05901-i18n-coverage.test.js"]){let s=read(path);s=s.replaceAll("v0.59.14","v0.59.15").replaceAll("0.59.14","0.59.15").replaceAll("0\\.59\\.14","0\\.59\\.15").replaceAll("app\\.js\\?v=59014","app\\.js\\?v=59015").replaceAll("app.js?v=59014","app.js?v=59015").replaceAll("version\\.js\\?v=59014","version\\.js\\?v=59015").replaceAll("version.js?v=59014","version.js?v=59015");if(path==="test/version-0551-release.test.js")s=s.replace('"59013","59014"','"59013","59014","59015"');write(path,s)}

console.log("v0.59.15 Japanese suggestion locale hotfix applied");
