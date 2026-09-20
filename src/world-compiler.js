export function normalizeWorldCoreCandidate(core){
 if(!core||typeof core!=="object"||Array.isArray(core))return core;
 const theme=String(core.worldTheme||"").trim();
 if(!theme)return core;
 core.worldTheme=theme;
 const row=core.seedCompliance?.theme;
 if(row&&typeof row==="object"&&!Array.isArray(row))row.value=theme;
 return core
}
