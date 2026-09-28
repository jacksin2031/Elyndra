import * as base from "./world-registry.js?v=57025&base=1";
import {normalizeLore} from "./lore-engine.js?v=57025";
export * from "./world-registry.js?v=57025&base=1";

function repairOptionalNpcLore(generation){
 if(!generation||typeof generation!=="object"||Array.isArray(generation)||!Array.isArray(generation.npcs))return generation;
 let changed=false;
 const npcs=generation.npcs.map(row=>{
  if(!row||typeof row!=="object"||Array.isArray(row)||row.lore==null||normalizeLore(row.lore))return row;
  changed=true;const next={...row};delete next.lore;return next
 });
 return changed?{...generation,npcs}:generation
}

export function validateGeneration(generation){return base.validateGeneration(repairOptionalNpcLore(generation))}
export function canonizeGeneration(state,generation){return base.canonizeGeneration(state,repairOptionalNpcLore(generation))}

export const __v06023={repairOptionalNpcLore};
