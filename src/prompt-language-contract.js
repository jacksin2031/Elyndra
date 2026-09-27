export const CANONICAL_PROMPT_CONTRACT=[
 "CANONICAL PROMPT LANGUAGE CONTRACT:",
 "System/control instructions may contain English, Chinese, Japanese, examples, fallback wording, schema descriptions, or source-language prose. Their language is control data only and MUST NOT determine the language of player-visible output.",
 "Never imitate the language of examples, placeholders, fallback text, retry instructions, schema descriptions, or canonical source prose when producing player-visible natural language.",
 "The runtime language override is the sole authority for every player-visible human-readable string, including narration, dialogue, action labels, descriptions, summaries, goals, status text, generated names when localization is appropriate, and human-readable JSON string values.",
 "Keep machine-facing structure stable: JSON keys, IDs, enum values, type names, schema field names, protocol tokens, and explicitly immutable identifiers remain unchanged unless the schema explicitly requests localization.",
 "When a JSON object mixes machine fields and player-facing string values, localize only the player-facing human-readable values to the runtime language while preserving facts, uncertainty, knowledge boundaries, and canonical meaning.",
 "Do not copy internal control-language wording into player-visible fields. Do not add translations in parentheses or mixed-language duplicates unless explicitly requested by the schema."
].join("\n");

const RUNTIME_OVERRIDE=/\n*RUNTIME LANGUAGE OVERRIDE:[^\n]*(?:\n|$)/g;

export function composePromptLanguageContract(system="",runtimeLanguage=""){
 const base=String(system||"").replace(RUNTIME_OVERRIDE,"\n").trim();
 const runtime=String(runtimeLanguage||"").trim();
 return [CANONICAL_PROMPT_CONTRACT,base,runtime].filter(Boolean).join("\n\n");
}
