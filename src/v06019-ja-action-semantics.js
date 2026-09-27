const clean=(value,max=220)=>String(value??"").trim().slice(0,max);

const JA_REST=/(?:^|[、。！？!?,\s])(?:少し|ちょっと|短く|しばらく|一度|ここで)?(?:休む|休み|休んで|休憩(?:する|して)?|一休み(?:する|して)?|眠る|寝る|仮眠(?:する|して)?|野営(?:する|して)?|キャンプ(?:する|して)?)(?:[。！？!]?|$)/u;
const JA_SLEEP=/(?:眠る|寝る|睡眠|仮眠)/u;
const JA_CAMP=/(?:野営|キャンプ)/u;
const JA_SOCIAL=/(?:人|人物|相手|彼|彼女|住民|店員|商人|衛兵|守衛|兵士|船員|港|受付|案内人|NPC).{0,36}(?:に|へ).{0,20}(?:聞く|尋ねる|質問する|話しかける|声をかける|教えてもらう|案内を頼む)|(?:聞く|尋ねる|質問する|話しかける|声をかける|教えてもらう|案内を頼む).{0,36}(?:人|人物|相手|彼|彼女|住民|店員|商人|衛兵|守衛|兵士|船員|港|受付|案内人|NPC)/u;
const JA_PERSUADE=/(?:説得|交渉|許可を(?:求める|頼む|もらう)|通行(?:許可|の許可)|頼み込む)/u;
const JA_OBSERVE=/(?:観察|確認|調べる|調査|探す|見回す|見渡す|痕跡|手掛かり|手がかり)/u;

export function explicitJapaneseActionSemantics(action=""){
 const text=clean(action);if(!text)return null;
 if(JA_REST.test(text))return {kind:"GENERAL",intent:"REST",engineAction:JA_SLEEP.test(text)?"睡眠":JA_CAMP.test(text)?"露營":"休息一下",confidence:1,source:"JA_EXPLICIT_REST"};
 if(JA_SOCIAL.test(text)||JA_PERSUADE.test(text))return {kind:"SOCIAL",intent:JA_PERSUADE.test(text)?"PERSUADE":"TALK",engineAction:null,confidence:.99,source:"JA_EXPLICIT_SOCIAL"};
 if(JA_OBSERVE.test(text))return {kind:"OBSERVE",intent:"OBSERVE",engineAction:null,confidence:.96,source:"JA_EXPLICIT_OBSERVE"};
 return null
}

export function applyJapaneseActionSemantics(assessment,action="",{engine=false}={}){
 const presented=clean(action),semantic=explicitJapaneseActionSemantics(presented);if(!semantic||!assessment)return assessment;
 const intent=assessment.actionIntent&&typeof assessment.actionIntent==="object"&&!Array.isArray(assessment.actionIntent)?assessment.actionIntent:{};
 const nextIntent={...intent,kind:semantic.kind,intent:semantic.intent,raw:presented};
 if(Array.isArray(intent.subActions)&&intent.subActions.length<=1)nextIntent.subActions=[presented];
 assessment.kind=semantic.kind;assessment.intent=semantic.intent;assessment.actionIntent=nextIntent;assessment.playerVisibleAction=presented||assessment.playerVisibleAction;
 if(engine&&semantic.engineAction)assessment.normalizedAction=semantic.engineAction;
 else if(presented)assessment.normalizedAction=presented;
 assessment.semanticOverride=semantic.source;
 return assessment
}

export function japaneseFastAssessment(action=""){
 const presented=clean(action),semantic=explicitJapaneseActionSemantics(presented);if(!semantic||semantic.intent!=="REST")return null;
 return {verdict:"ALLOW",normalizedAction:presented,playerVisibleAction:presented,kind:semantic.kind,intent:semantic.intent,reason:"Explicit Japanese rest command handled deterministically by Engine.",requirements:[],confidence:1,source:"ENGINE_FASTPATH_JA",actionIntent:{intent:semantic.intent,kind:semantic.kind,raw:presented,subActions:[presented]},semanticOverride:semantic.source}
}
